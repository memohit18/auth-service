import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG } from '../../config/config.module';
import type { AppConfig } from '../../config/config.module';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: string;
};

export type RefreshTokenPayload = {
  sub: string;
};

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async generateAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
  }) {
    return this.jwtService.signAsync(payload, {
      secret: this.config.jwt.accessSecret,
      expiresIn: '15m',
    });
  }

  async generateRefreshToken(payload: { sub: string }) {
    return this.jwtService.signAsync(payload, {
      secret: this.config.jwt.refreshSecret,
      expiresIn: '30d',
    });
  }

  async verifyRefreshToken(token: string) {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.config.jwt.refreshSecret,
    });
  }
}
