import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend = new Resend(
    process.env.RESEND_API_KEY,
  );

  async sendVerificationEmail(
    email: string,
    token: string,
  ) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Verify your email',
        html: `
        <p>Click <a href="http://localhost:3000/verify-email?token=${token}">here</a> to verify your email</p>
        `,
      });
    }
    catch (error) {
      throw new Error('Failed to send verification email');
    }
  }
}