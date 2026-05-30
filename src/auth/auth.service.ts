import { BadRequestException, Injectable } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { UsersService } from 'src/users/users.service';
import { SignupDto } from './signup.dto';
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
}
