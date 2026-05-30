import { Controller, Post } from '@nestjs/common';
import { Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {
  }
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }
}
