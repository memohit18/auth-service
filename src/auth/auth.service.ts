import { BadRequestException, Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private emailService: EmailService,
    ){}

    async signup(dto: SignupDto) {
        const { name, email, password } = dto;
        const user = await this.usersService.findByEmail(email);
        if (user) {
            throw new BadRequestException('User already exists');
        }
        const token = crypto.randomUUID();
        const newUser = await this.usersService.createUser({ name, email, password, emailVerificationToken: token });
        await this.emailService.sendVerificationEmail(email, newUser.emailVerificationToken ?? '');
        return newUser;
    }

    async verifyEmail(token: string) {
        const user = await this.usersService.findByVerificationToken(token);
        if (!user) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        await this.usersService.markEmailVerified(user.id);

        return { message: 'Email verified successfully' };
    }
}
