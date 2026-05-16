import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role, Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('users')
  listUsers() {
    return this.profilesService.listUsers();
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.profilesService.getUserById(id);
  }
}
