import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesRepository } from './roles.repository';

@Module({
  imports: [PermissionsModule],
  providers: [RolesRepository, RolesService],
  exports: [RolesService],
})
export class RolesModule {}
