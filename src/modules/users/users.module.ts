import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

import { RolesModule } from '../roles/roles.module';

import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), RolesModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, PermissionsGuard],
  exports: [UsersService],
})
export class UsersModule {}
