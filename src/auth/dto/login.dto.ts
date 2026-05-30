import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  @IsIn(['web', 'mobile'])
  deviceType?: 'web' | 'mobile';

  @IsOptional()
  @IsString()
  deviceName?: string;
}
