import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { CryptoModule } from './common/crypto/crypto.module';
import appConfig from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { LogsModule } from './modules/logs/logs.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mailHost = configService.get<string>('MAIL_HOST');

        return {
          transport: mailHost
            ? {
                host: mailHost,
                port: configService.get<number>('MAIL_PORT') ?? 587,
                auth: {
                  user: configService.get<string>('MAIL_USER'),
                  pass: configService.get<string>('MAIL_PASS'),
                },
              }
            : { jsonTransport: true },
          defaults: {
            from:
              configService.get<string>('MAIL_FROM') ??
              '"Auth Service" <no-reply@example.com>',
          },
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('mongodbUri'),
      }),
      inject: [ConfigService],
    }),
    CryptoModule,
    PrismaModule,
    AuthModule,
    DatabaseModule,
    HealthModule,
    LogsModule,
    ProfilesModule,
  ],
})
export class AppModule {}
