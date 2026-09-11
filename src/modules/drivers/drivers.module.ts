import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../users/users.module';

import { DriversController } from './drivers.controller';
import { DriversRepository } from './drivers.repository';
import { DriversService } from './drivers.service';

import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [
    UsersModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],

  controllers: [DriversController],

  providers: [DriversRepository, DriversService, PermissionsGuard],

  exports: [DriversService],
})
export class DriversModule {}
