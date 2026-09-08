import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthguard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorstors/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequiredPermission } from '../../common/decorstors/permissions.decorators';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.usersService.createUser(dto);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthguard, PermissionsGuard)
  @RequiredPermission('jobs:read')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
