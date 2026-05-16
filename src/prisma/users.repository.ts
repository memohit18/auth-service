import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from './prisma.service';

/**
 * Data access for the `users` table (`User` model, @@map("users")).
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });
  }

  findByEncryptedEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByPlainEmailCandidates(emails: string[]): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { OR: emails.map((email) => ({ email })) },
    });
  }

  findManyEmailIds(): Promise<Pick<User, 'id' | 'email'>[]> {
    return this.prisma.user.findMany({
      select: { id: true, email: true },
    });
  }

  findAllOrderByNewest(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
