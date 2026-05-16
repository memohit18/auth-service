import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User as UserRecord } from '.prisma/client';
import * as bcrypt from 'bcrypt';
import { PiiCryptoService } from '../../common/crypto/pii-crypto.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailService } from './auth-mail.service';
import { Role } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  generateVerificationToken,
  hashVerificationToken,
  verifiedUserToken,
} from './utils/verification-token.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly piiCrypto: PiiCryptoService,
    private readonly authMailService: AuthMailService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.findExistingByEmailOrPhone(dto.email, dto.phone);

    if (existing) {
      throw new ConflictException('Email or phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = generateVerificationToken();
    const hashedVerificationToken = hashVerificationToken(verificationToken);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: this.piiCrypto.encryptEmail(dto.email),
        password: hashedPassword,
        phone: this.piiCrypto.encryptPhone(dto.phone),
        countryCode: dto.countryCode,
        role: dto.role ?? Role.User,
        isEmailVerified: false,
        emailVerificationToken: hashedVerificationToken,
      },
    });

    await this.authMailService.sendVerificationEmail(
      dto.email,
      verificationToken,
    );

    return {
      success: true,
      message:
        'Account created. Please check your email to verify your account before logging in.',
      user: this.toPublicUser(user, dto.email, dto.phone),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.findUserForLogin(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isDeleted) {
      throw new UnauthorizedException('Account is no longer available');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const email = this.piiCrypto.resolveEmail(user.email);
    const phone = this.piiCrypto.resolvePhone(user.phone);

    return this.buildAuthResponse(user, email, phone);
  }

  async verifyEmail(token: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Verification token is required');
    }

    const hashedToken = hashVerificationToken(token.trim());

    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: hashedToken },
    });

    if (!user || user.isDeleted) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: verifiedUserToken(user.id),
      },
    });

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  private async findExistingByEmailOrPhone(
    email: string,
    phone: string,
  ): Promise<UserRecord | null> {
    const encryptedEmail = this.piiCrypto.encryptEmail(email);
    const encryptedPhone = this.piiCrypto.encryptPhone(phone);

    const directMatch = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: encryptedEmail }, { phone: encryptedPhone }],
      },
    });

    if (directMatch) {
      return directMatch;
    }

    const normalizedEmail = this.piiCrypto.normalizeEmail(email);
    const normalizedPhone = this.piiCrypto.normalizePhone(phone);

    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, phone: true },
    });

    const legacyMatch = users.find((user) => {
      const resolvedEmail = this.piiCrypto.normalizeEmail(
        this.piiCrypto.resolveEmail(user.email),
      );
      const resolvedPhone = this.piiCrypto.normalizePhone(
        this.piiCrypto.resolvePhone(user.phone),
      );

      return (
        resolvedEmail === normalizedEmail || resolvedPhone === normalizedPhone
      );
    });

    if (!legacyMatch) {
      return null;
    }

    return this.prisma.user.findUnique({ where: { id: legacyMatch.id } });
  }

  private async findUserForLogin(email: string): Promise<UserRecord | null> {
    const normalizedEmail = this.piiCrypto.normalizeEmail(email);
    const encryptedEmail = this.piiCrypto.encryptEmail(email);

    let user =
      (await this.prisma.user.findUnique({ where: { email: encryptedEmail } })) ??
      (await this.prisma.user.findFirst({
        where: {
          OR: [{ email: normalizedEmail }, { email: email.trim() }],
        },
      }));

    if (!user) {
      const users = await this.prisma.user.findMany({
        select: { id: true, email: true },
      });

      const legacyMatch = users.find(
        (candidate) =>
          this.piiCrypto.normalizeEmail(
            this.piiCrypto.resolveEmail(candidate.email),
          ) === normalizedEmail,
      );

      if (!legacyMatch) {
        return null;
      }

      user = await this.prisma.user.findUnique({
        where: { id: legacyMatch.id },
      });
    }

    if (!user) {
      return null;
    }

    return this.ensureUserPiiEncrypted(user);
  }

  private async ensureUserPiiEncrypted(user: UserRecord): Promise<UserRecord> {
    const emailPlain = this.piiCrypto.resolveEmail(user.email);
    const phonePlain = this.piiCrypto.resolvePhone(user.phone);

    const encryptedEmail = this.piiCrypto.encryptEmail(emailPlain);
    const encryptedPhone = this.piiCrypto.encryptPhone(phonePlain);

    if (user.email === encryptedEmail && user.phone === encryptedPhone) {
      return user;
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: encryptedEmail,
        phone: encryptedPhone,
      },
    });
  }

  private toPublicUser(
    user: UserRecord,
    email: string,
    phone: string,
  ) {
    return {
      id: user.id,
      name: user.name,
      email,
      phone,
      countryCode: user.countryCode,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
  }

  private buildAuthResponse(
    user: {
      id: string;
      name: string;
      countryCode: string;
      role: string;
      isEmailVerified: boolean;
    },
    email: string,
    phone: string,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email,
        phone,
        countryCode: user.countryCode,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }
}
