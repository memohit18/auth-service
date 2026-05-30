import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { SessionsModule } from './sessions/sessions.module';
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    EmailModule,
    SessionsModule,
    RefreshTokensModule,
  ],
})
export class AppModule {}
