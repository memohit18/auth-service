import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { LoginDto, SignupDto } from './dto';
import { JwtTokenService } from './services/jwt-token.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
    private jwtTokenService: JwtTokenService,
  ) {}

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

    return {
      accessToken,
      refreshToken,
    };
  }
}
