import { IsIn, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  idToken: string;

  @IsOptional()
  @IsString()
  @IsIn(['web', 'mobile'])
  deviceType?: 'web' | 'mobile';

  @IsOptional()
  @IsString()
  deviceName?: string;
}
