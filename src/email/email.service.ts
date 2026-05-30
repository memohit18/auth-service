import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Resend } from 'resend';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/config.module';

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.resend = new Resend(this.config.resend.apiKey);
  }

  async sendVerificationEmail(email: string, token: string) {
    if (!this.config.resend.apiKey) {
      throw new InternalServerErrorException('Email service is not configured');
    }

    const verifyUrl = `${this.config.app.verifyEmailUrl}?token=${encodeURIComponent(token)}`;

    try {
      const { error } = await this.resend.emails.send({
        from: this.config.resend.from,
        to: email,
        subject: 'Verify your email',
        html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email</p>`,
      });

      if (error) {
        throw new InternalServerErrorException(
          `Failed to send verification email: ${error.message}`,
        );
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to send verification email');
    }
  }
}
