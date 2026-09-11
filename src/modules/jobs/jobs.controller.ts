import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorstors/permissions.decorators';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { AssignJobDto } from './dto/assign-job.dto';
import { CurrentUser } from '../../common/decorstors/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('jobs:create')
  async create(@Body() dto: CreateJobDto) {
    return this.jobsService.createJob(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('jobs:read')
  async findById(@Param('id') id: string) {
    return this.jobsService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('jobs:assign')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateJobStatusDto) {
    return this.jobsService.updateStatus(id, dto.status);
  }

  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('jobs:assign')
  async assign(@Param('id') id: string, @Body() dto: AssignJobDto) {
    return this.jobsService.assignJob(id, dto.driverId);
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('jobs:claim')
  async claim(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobsService.claimJob(id, user.userId);
  }
}
