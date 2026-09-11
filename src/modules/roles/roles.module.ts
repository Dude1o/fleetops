import { Module } from '@nestjs/common';

import { RolesService } from './roles.service';
import { RolesRepository } from './roles.repository';

import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  providers: [RolesRepository, RolesService],
  exports: [RolesService],
})
export class RolesModule {}
