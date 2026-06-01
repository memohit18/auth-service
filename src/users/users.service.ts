import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

export type UpdateUserData = {
  name?: string;
  phone?: string;
  countryCode?: string;
  avatar?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { isDeleted: false },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
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

  async syncGoogleProfile(
    userId: string,
    data: { name: string; avatar?: string; providerId: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        avatar: data.avatar,
        providerId: data.providerId,
        isEmailVerified: true,
      },
    });
  }

  toPublicProfile(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    countryCode: string | null;
    avatar: string | null;
    role: string;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      countryCode: user.countryCode,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, data: UpdateUserData) {
    const user = await this.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    if (data.phone && data.phone !== user.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Phone number already in use');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.toPublicProfile(updated);
  }

  async createUser(data: {
    name: string;
    email: string;
    password?: string;
    provider?: string;
    providerId?: string;
    emailVerificationToken?: string;
    avatar?: string;
    isEmailVerified?: boolean;
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
