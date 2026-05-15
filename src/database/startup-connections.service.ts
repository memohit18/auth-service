import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StartupConnectionsService implements OnModuleInit {
  private readonly logger = new Logger('DatabaseConnections');

  constructor(
    private readonly prisma: PrismaService,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  async onModuleInit() {
    await this.logPostgresConnection();
    await this.logMongoConnection();
  }

  private async logPostgresConnection() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('PostgreSQL: connected');
    } catch (error) {
      this.logger.error(
        `PostgreSQL: connection failed — ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async logMongoConnection() {
    try {
      if (this.mongoConnection.readyState !== 1) {
        await new Promise<void>((resolve, reject) => {
          const onConnected = () => {
            cleanup();
            resolve();
          };
          const onError = (err: Error) => {
            cleanup();
            reject(err);
          };
          const cleanup = () => {
            this.mongoConnection.off('connected', onConnected);
            this.mongoConnection.off('error', onError);
          };
          this.mongoConnection.once('connected', onConnected);
          this.mongoConnection.once('error', onError);
        });
      }

      await this.mongoConnection.db?.admin().command({ ping: 1 });
      this.logger.log(
        `MongoDB: connected (database: ${this.mongoConnection.db?.databaseName ?? 'unknown'})`,
      );
    } catch (error) {
      this.logger.error(
        `MongoDB: connection failed — ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
