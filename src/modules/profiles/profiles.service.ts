import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PiiCryptoService } from '../../common/crypto/pii-crypto.service';
import { UsersRepository } from '../../prisma/users.repository';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly piiCrypto: PiiCryptoService,
  ) {}

  async listUsers() {
    const users = await this.usersRepository.findAllOrderByNewest();

    return users.map((user) => this.toPublicProfile(user));
  }

  async getUserById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicProfile(user);
  }

  private toPublicProfile(user: User) {
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
