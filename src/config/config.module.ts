import { Global, Module } from '@nestjs/common';
import configuration from './configuration';

export const APP_CONFIG = Symbol('APP_CONFIG');

export type AppConfig = ReturnType<typeof configuration>;

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: configuration,
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
