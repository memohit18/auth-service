import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ACTIVITY_LOG_MODEL,
  ActivityLogDocument,
} from '../../../db-schema/mongodb/schemas/activity-log.schema';

@Injectable()
export class LogsSchemaInitializer implements OnModuleInit {
  constructor(
    @InjectModel(ACTIVITY_LOG_MODEL)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  async onModuleInit() {
    await this.activityLogModel.createCollection();
    await this.activityLogModel.syncIndexes();
  }
}
