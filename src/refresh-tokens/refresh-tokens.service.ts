import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokensService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, refreshToken: string, expiresAt: Date) {
    const hash = await argon2.hash(refreshToken);

    return this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hash,
        expiresAt,
      },
    });
  }

  async find(userId: string, refreshToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    for (const token of tokens) {
      const match = await argon2.verify(token.tokenHash, refreshToken);
      if (match) {
        return token;
      }
    }

    return null;
  }

  async delete(id: string) {
    return this.prisma.refreshToken.delete({
      where: { id },
    });
  }

  async rotate(
    userId: string,
    oldRefreshToken: string,
    newRefreshToken: string,
    expiresAt: Date,
  ) {
    const existing = await this.find(userId, oldRefreshToken);
    if (!existing) {
      return null;
    }

    await this.delete(existing.id);
    return this.create(userId, newRefreshToken, expiresAt);
  }
}
