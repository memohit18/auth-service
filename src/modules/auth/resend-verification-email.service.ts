import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PiiCryptoService } from '../../common/crypto/pii-crypto.service';

/** Sends verification email via Resend from `signup` and `POST /auth/resend-verification` only. */
@Injectable()
export class ResendVerificationEmailService {
  private readonly logger = new Logger(ResendVerificationEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly piiCrypto: PiiCryptoService,
  ) {}

  async sendVerificationEmail(
    toEmail: string,
    verificationToken: string,
  ): Promise<void> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const from = this.configService.get<string>('MAIL_FROM');

    if (!apiKey || !from?.trim()) {
      this.logger.warn(
        'RESEND_API_KEY or MAIL_FROM unset — skipping verification email',
      );
      return;
    }

    const frontendBase =
      this.configService.get<string>('frontendVerificationUrl') ??
      'http://localhost:3000';
    const base = frontendBase.replace(/\/$/, '');
    const verificationUrl = `${base}/verify-email?token=${verificationToken}`;
    const apiBase =
      this.configService.get<string>('appUrl')?.replace(/\/$/, '') ??
      `http://localhost:${this.configService.get<number>('port') ?? 3300}`;

    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: from.trim(),
        to: [toEmail],
        subject: 'Verify your email',
        html: `
          <h2>Email verification</h2>
          <p><a href="${verificationUrl}">Open verification link</a> (opens your app)</p>
          <p>Use that page to call your API:</p>
          <p><code>POST ${apiBase}/auth/verify-email</code> with body <code>{ "token": "&lt;value from URL&gt;" }</code></p>
        `,
      });
    } catch (error) {
      this.logger.error(
        `Resend verification email failed (${this.piiCrypto.normalizeEmail(toEmail)})`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
