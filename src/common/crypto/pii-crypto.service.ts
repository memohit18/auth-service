import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac } from 'crypto';

@Injectable()
export class PiiCryptoService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.getOrThrow<string>('ENCRYPTION_KEY');

    if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate: openssl rand -hex 32',
      );
    }

    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  encryptEmail(email: string): string {
    return this.encryptDeterministic(this.normalizeEmail(email));
  }

  encryptPhone(phone: string): string {
    return this.encryptDeterministic(this.normalizePhone(phone));
  }

  private encryptDeterministic(plainText: string): string {
    const iv = createHmac('sha256', this.encryptionKey)
      .update(plainText)
      .digest()
      .subarray(0, 12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private decrypt(cipherText: string): string {
    const payload = Buffer.from(cipherText, 'base64');
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').trim();
  }

  isEncrypted(value: string): boolean {
    try {
      this.decrypt(value);
      return true;
    } catch {
      return false;
    }
  }

  resolveEmail(storedEmail: string): string {
    return this.isEncrypted(storedEmail)
      ? this.decrypt(storedEmail)
      : storedEmail;
  }

  resolvePhone(storedPhone: string): string {
    return this.isEncrypted(storedPhone)
      ? this.decrypt(storedPhone)
      : storedPhone;
  }
}
