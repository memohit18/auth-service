import { Test, TestingModule } from '@nestjs/testing';
import { APP_CONFIG } from '../config/config.module';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: APP_CONFIG,
          useValue: {
            resend: {
              apiKey: 'test-key',
              from: 'test@example.com',
            },
            app: {
              verifyEmailUrl: 'http://localhost:3000/verify-email',
            },
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
