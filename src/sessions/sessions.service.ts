import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSessionDto) {
    return this.prisma.session.create({
      data: {
        userId: dto.userId,
        deviceType: dto.deviceType,
        deviceName: dto.deviceName,
        ipAddress: dto.ipAddress,
        lastSeenAt: new Date(),
      },
    });
  }

  async delete(id: string) {
    return this.prisma.session.delete({
      where: { id },
    });
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async updateLastSeen(id: string) {
    return this.prisma.session.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }

  async deleteLatestForUser(userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });

    if (!session) {
      return null;
    }

    return this.delete(session.id);
  }
}
