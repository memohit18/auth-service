import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersRepository } from './users.repository';

@Global()
@Module({
  providers: [PrismaService, UsersRepository],
  exports: [PrismaService, UsersRepository],
})
export class PrismaModule {}