import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { isUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import {
  GoogleLoginDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  SignupDto,
  UpdateUserDto,
  VerifyEmailDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  verifyEmailErrorPage,
  verifyEmailSuccessPage,
} from './verify-email.page';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Get('verify-email')
  async verifyEmailPage(
    @Query('token') token: string | undefined,
    @Res() res: Response,
  ) {
    if (!token || !isUUID(token)) {
      return res
        .status(400)
        .type('text/html')
        .send(
          verifyEmailErrorPage('Invalid or missing verification token.'),
        );
    }

    try {
      await this.authService.verifyEmail(token);
      return res.type('text/html').send(verifyEmailSuccessPage());
    } catch (error) {
      const message = this.getVerifyEmailErrorMessage(error);
      return res
        .status(400)
        .type('text/html')
        .send(verifyEmailErrorPage(message));
    }
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  private getVerifyEmailErrorMessage(error: unknown) {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }

      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response &&
        typeof response.message === 'string'
      ) {
        return response.message;
      }
    }

    if (error instanceof HttpException) {
      return 'Verification failed. Please request a new verification email.';
    }

    return 'Verification failed. Please try again later.';
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getMe(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.authService.updateMe(user.userId, dto);
  }
}
