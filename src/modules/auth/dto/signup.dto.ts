import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '../decorators/roles.decorator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @Matches(/^\d{6,15}$/, {
    message: 'phone must be 6–15 digits without spaces or symbols',
  })
  phone: string;

  @IsString()
  @Matches(/^\+\d{1,4}$/, {
    message: 'countryCode must be a dial code such as +91',
  })
  countryCode: string;

  @IsEnum(Role, { message: 'role must be either user or admin' })
  @IsOptional()
  role?: Role;
}
