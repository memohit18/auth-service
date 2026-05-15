import { Module } from '@nestjs/common';
import { StartupConnectionsService } from './startup-connections.service';

@Module({
  providers: [StartupConnectionsService],
})
export class DatabaseModule {}
