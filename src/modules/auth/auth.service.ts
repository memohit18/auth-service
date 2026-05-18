import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PiiCryptoService } from '../../common/crypto/pii-crypto.service';
import { UsersRepository } from '../../prisma/users.repository';
import { ResendVerificationEmailService } from './resend-verification-email.service';
import { Role } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { generateVerificationToken } from './utils/verification-token.util';

const RESEND_VERIFICATION_SENT =
  'If an account exists and is awaiting verification, a new email may have been sent.';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly piiCrypto: PiiCryptoService,
    private readonly resendVerificationEmail: ResendVerificationEmailService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.findUserForLogin(dto.email);

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const encryptedPhone = this.piiCrypto.encryptPhone(dto.phone);
    const existingPhone =
      await this.usersRepository.findByEncryptedPhone(encryptedPhone);

    if (existingPhone) {
      throw new ConflictException('Phone number is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = generateVerificationToken();

    const user = await this.usersRepository.create({
      name: dto.name,
      email: this.piiCrypto.encryptEmail(dto.email),
      password: hashedPassword,
      phone: encryptedPhone,
      countryCode: dto.countryCode.trim(),
      role: dto.role ?? Role.User,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
    });

    await this.resendVerificationEmail.sendVerificationEmail(
      dto.email,
      verificationToken,
    );

    return {
      success: true,
      message:
        'Account created. Check your email to verify before logging in.',
      user: {
        id: user.id,
        name: user.name,
        email: dto.email,
        phone: dto.phone,
        countryCode: user.countryCode,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
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
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const access_token = this.signSessionToken(user.id);
    return { access_token };
  }

  async verifyEmail(token: string) {
    const value = token?.trim();

    if (!value) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.usersRepository.findByEmailVerificationToken(value);

    if (!user || user.isDeleted) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.usersRepository.updateById(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
    });

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  /**
   * Does not disclose whether email exists (except via timing); always same message when plausible.
   */
  async resendVerificationEmailSafe(emailRaw: string) {
    const user = await this.findUserForLogin(emailRaw.trim());

    if (!user?.emailVerificationToken || user.isDeleted) {
      return { success: true, message: RESEND_VERIFICATION_SENT };
    }

    if (user.isEmailVerified) {
      return { success: true, message: RESEND_VERIFICATION_SENT };
    }

    const newToken = generateVerificationToken();

    await this.usersRepository.updateById(user.id, {
      emailVerificationToken: newToken,
    });

    await this.resendVerificationEmail.sendVerificationEmail(
      this.piiCrypto.resolveEmail(user.email),
      newToken,
    );

    return { success: true, message: RESEND_VERIFICATION_SENT };
  }

  private async findUserForLogin(email: string): Promise<User | null> {
    const normalizedEmail = this.piiCrypto.normalizeEmail(email);
    const encryptedEmail = this.piiCrypto.encryptEmail(email);

    let user =
      (await this.usersRepository.findByEncryptedEmail(encryptedEmail)) ??
      (await this.usersRepository.findByPlainEmailCandidates([
        normalizedEmail,
        email.trim(),
      ]));

    if (!user) {
      const users = await this.usersRepository.findManyEmailIds();

      const legacyMatch = users.find(
        (candidate) =>
          this.piiCrypto.normalizeEmail(
            this.piiCrypto.resolveEmail(candidate.email),
          ) === normalizedEmail,
      );

      if (!legacyMatch) {
        return null;
      }

      user = await this.usersRepository.findById(legacyMatch.id);
    }

    if (!user) {
      return null;
    }

    return this.ensureUserPiiEncrypted(user);
  }

  private async ensureUserPiiEncrypted(user: User): Promise<User> {
    const emailPlain = this.piiCrypto.resolveEmail(user.email);
    const phonePlain = this.piiCrypto.resolvePhone(user.phone);

    const encryptedEmail = this.piiCrypto.encryptEmail(emailPlain);
    const encryptedPhone = this.piiCrypto.encryptPhone(phonePlain);

    if (user.email === encryptedEmail && user.phone === encryptedPhone) {
      return user;
    }

    return this.usersRepository.updateById(user.id, {
      email: encryptedEmail,
      phone: encryptedPhone,
    });
  }

  private signSessionToken(userId: string): string {
    const payload: JwtPayload = { sub: userId };
    return this.jwtService.sign(payload);
  }
}
