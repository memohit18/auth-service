import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';
import { RefreshTokensService } from '../refresh-tokens/refresh-tokens.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { LoginDto, SignupDto } from './dto';
import { JwtTokenService } from './services/jwt-token.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
    private jwtTokenService: JwtTokenService,
    private refreshTokensService: RefreshTokensService,
    private sessionsService: SessionsService,
  ) {}

  private getRefreshTokenExpiry() {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    return expiryDate;
  }

  async signup(dto: SignupDto) {
    const { name, email, password } = dto;
    const user = await this.usersService.findByEmail(email);
    if (user) {
      throw new BadRequestException('User already exists');
    }
    const token = crypto.randomUUID();
    const newUser = await this.usersService.createUser({
      name,
      email,
      password,
      emailVerificationToken: token,
    });
    await this.emailService.sendVerificationEmail(
      email,
      newUser.emailVerificationToken ?? '',
    );
    return newUser;
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersService.markEmailVerified(user.id);

    return { message: 'Email verified successfully' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new BadRequestException('Email not verified');
    }

    const valid = await argon2.verify(user.password!, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken =
      await this.jwtTokenService.generateAccessToken(payload);

    const refreshToken = await this.jwtTokenService.generateRefreshToken({
      sub: user.id,
    });

    const expiryDate = this.getRefreshTokenExpiry();

    await this.refreshTokensService.create(
      user.id,
      refreshToken,
      expiryDate,
    );

    await this.sessionsService.create({
      userId: user.id,
      deviceType: 'web',
      deviceName: 'Chrome',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwtTokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken = await this.refreshTokensService.find(
      user.id,
      refreshToken,
    );
    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.jwtTokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = await this.jwtTokenService.generateRefreshToken({
      sub: user.id,
    });

    await this.refreshTokensService.delete(storedToken.id);

    await this.refreshTokensService.create(
      user.id,
      newRefreshToken,
      this.getRefreshTokenExpiry(),
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwtTokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken = await this.refreshTokensService.find(
      payload.sub,
      refreshToken,
    );
    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokensService.delete(storedToken.id);
    await this.sessionsService.deleteLatestForUser(payload.sub);

    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}
