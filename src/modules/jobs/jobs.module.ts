import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';

import { UsersModule } from '../users/users.module';

import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    UsersModule,
  ],

  controllers: [JobsController],

  providers: [JobsRepository, JobsService, PermissionsGuard],

  exports: [JobsService],
})
export class JobsModule {}
