import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { isDeleted: false },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email, isDeleted: false },
    });
  }

  async findByVerificationToken(token: string) {
    return this.prisma.user.findUnique({
      where: {
        emailVerificationToken: token,
      },
    });
  }

  async markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    password?: string;
    provider?: string;
    providerId?: string;
    emailVerificationToken?: string;
  }) {
    const { password, ...rest } = data;

    return this.prisma.user.create({
      data: {
        ...rest,
        ...(password !== undefined && {
          password: await argon2.hash(password),
        }),
      },
    });
  }
}
