import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  token: string;
}
