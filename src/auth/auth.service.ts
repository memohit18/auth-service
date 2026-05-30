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
import { GoogleLoginDto, LoginDto, SignupDto } from './dto';
import { GoogleService } from './services/google.service';
import { JwtTokenService } from './services/jwt-token.service';

type DeviceInfo = {
  deviceType: 'web' | 'mobile';
  deviceName?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
    private jwtTokenService: JwtTokenService,
    private refreshTokensService: RefreshTokensService,
    private sessionsService: SessionsService,
    private googleService: GoogleService,
  ) {}

  private resolveDevice(dto: {
    deviceType?: 'web' | 'mobile';
    deviceName?: string;
  }): DeviceInfo {
    const deviceType = dto.deviceType ?? 'web';
    const deviceName =
      dto.deviceName ?? (deviceType === 'mobile' ? 'Mobile App' : 'Chrome');

    return { deviceType, deviceName };
  }

  private async issueTokens(
    user: { id: string; email: string; role: string },
    device: DeviceInfo,
  ) {
    const accessToken = await this.jwtTokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await this.jwtTokenService.generateRefreshToken({
      sub: user.id,
    });

    const session = await this.sessionsService.create({
      userId: user.id,
      deviceType: device.deviceType,
      deviceName: device.deviceName,
    });

    await this.refreshTokensService.create(
      user.id,
      refreshToken,
      this.getRefreshTokenExpiry(),
      session.id,
    );

    return { accessToken, refreshToken };
  }

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

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isEmailVerified: newUser.isEmailVerified,
      createdAt: newUser.createdAt,
    };
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

    return this.issueTokens(user, this.resolveDevice(dto));
  }

  async googleLogin(dto: GoogleLoginDto) {
    const googleUser = await this.googleService.verifyGoogleToken(dto.idToken);

    let user = await this.usersService.findByEmail(googleUser.email);

    if (!user) {
      user = await this.usersService.createUser({
        name: googleUser.name,
        email: googleUser.email,
        provider: 'google',
        providerId: googleUser.sub,
        avatar: googleUser.picture,
        isEmailVerified: true,
      });
    }

    return this.issueTokens(user, this.resolveDevice(dto));
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
      storedToken.deviceId ?? undefined,
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

    if (storedToken.deviceId) {
      await this.sessionsService.delete(storedToken.deviceId);
    }

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
