import { Injectable, NotFoundException } from '@nestjs/common';
import { PiiCryptoService } from '../../common/crypto/pii-crypto.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly piiCrypto: PiiCryptoService,
  ) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toPublicProfile(user));
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicProfile(user);
  }

  private toPublicProfile(user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    role: string;
    isEmailVerified: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: this.piiCrypto.resolveEmail(user.email),
      phone: this.piiCrypto.resolvePhone(user.phone),
      countryCode: user.countryCode,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isDeleted: user.isDeleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
