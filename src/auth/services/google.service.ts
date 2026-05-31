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
  private readonly audiences: string[];

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.audiences = [
      this.config.google.clientId,
      this.config.google.iosClientId,
    ].filter((clientId): clientId is string => Boolean(clientId));

    if (this.audiences.length === 0) {
      throw new Error(
        'At least one Google client ID must be configured (GOOGLE_CLIENT_ID or GOOGLE_IOS_CLIENT_ID)',
      );
    }

    this.client = new OAuth2Client(this.config.google.clientId);
  }

  async verifyGoogleToken(idToken: string): Promise<GoogleUserProfile> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.audiences,
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
