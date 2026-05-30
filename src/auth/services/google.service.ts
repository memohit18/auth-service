import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { APP_CONFIG } from '../../config/config.module';
import type { AppConfig } from '../../config/config.module';

export type GoogleUserProfile = {
  email: string;
  name: string;
  picture?: string;
  sub: string;
};

@Injectable()
export class GoogleService {
  private readonly client: OAuth2Client;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.client = new OAuth2Client(this.config.google.clientId);
  }

  async verifyGoogleToken(idToken: string): Promise<GoogleUserProfile> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.config.google.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return {
      email: payload.email,
      name: payload.name ?? payload.email,
      picture: payload.picture,
      sub: payload.sub,
    };
  }
}
