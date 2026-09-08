import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PassportModule } from '@nestjs/passport';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, PermissionsGuard],
  exports: [UsersService],
})
export class UsersModule {}
