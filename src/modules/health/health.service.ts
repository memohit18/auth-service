import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  private getIndiaTimestamp(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '';

    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+05:30`;
  }

  async check() {
    const timestamp = this.getIndiaTimestamp();
    const server = 'up';
    const postgresql = await this.checkPostgres();
    const mongodb = await this.checkMongo();

    const status =
      postgresql === 'up' && mongodb === 'up' ? 'ok' : 'degraded';

    return {
      status,
      server,
      postgresql,
      mongodb,
      timestamp,
    };
  }

  private async checkPostgres(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.prisma.$queryRaw`SELECT 1 FROM "users" LIMIT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkMongo(): Promise<'up' | 'down'> {
    try {
      if (this.mongoConnection.readyState !== 1) {
        return 'down';
      }
      await this.mongoConnection.db?.admin().command({ ping: 1 });
      return 'up';
    } catch {
      return 'down';
    }
  }
}
