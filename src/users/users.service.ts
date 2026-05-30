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
