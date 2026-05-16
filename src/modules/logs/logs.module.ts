import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  ACTIVITY_LOG_MODEL,
  ActivityLogSchema,
} from '../../../db-schema/mongodb/schemas/activity-log.schema';
import { LogsSchemaInitializer } from './logs-schema.initializer';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ACTIVITY_LOG_MODEL,
        schema: ActivityLogSchema,
      },
    ]),
  ],
  providers: [LogsSchemaInitializer],
})
export class LogsModule {}
