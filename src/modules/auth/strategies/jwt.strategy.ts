import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from '../../../prisma/users.repository';
import { PiiCryptoService } from '../../../common/crypto/pii-crypto.service';
import { AUTH_COOKIE_NAME } from '../utils/auth-cookie.util';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtUser } from '../interfaces/jwt-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly piiCrypto: PiiCryptoService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.cookies?.[AUTH_COOKIE_NAME] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    const user = await this.usersRepository.findById(payload.sub);

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    return {
      userId: user.id,
      name: user.name,
      email: this.piiCrypto.resolveEmail(user.email),
      phone: this.piiCrypto.resolvePhone(user.phone),
      countryCode: user.countryCode,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
  }
}
