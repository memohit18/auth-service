import { Injectable } from '@nestjs/common';
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
    return this.prisma.user.create({
      data,
    });
  }
}
