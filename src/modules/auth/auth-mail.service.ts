import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { PiiCryptoService } from '../../common/crypto/pii-crypto.service';

@Injectable()
export class AuthMailService {
  private readonly logger = new Logger(AuthMailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly piiCrypto: PiiCryptoService,
  ) {}

  async sendVerificationEmail(
    toEmail: string,
    verificationToken: string,
  ): Promise<void> {
    const mailHost = this.configService.get<string>('MAIL_HOST');

    if (!mailHost) {
      this.logger.warn(
        'MAIL_HOST is not set — skipping verification email (configure .env to enable)',
      );
      return;
    }

    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3300';
    const port = this.configService.get<number>('port') ?? 3300;
    const baseUrl = appUrl.includes('://')
      ? appUrl.replace(/\/$/, '')
      : `http://localhost:${port}`;

    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

    try {
      await this.mailerService.sendMail({
        to: toEmail,
        subject: 'Verify Your Email',
        html: `
          <h2>Email Verification</h2>
          <p>Click below to verify your email:</p>
          <a href="${verificationUrl}">Verify Email</a>
          <p>Or copy this link: ${verificationUrl}</p>
        `,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${this.piiCrypto.normalizeEmail(toEmail)}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
