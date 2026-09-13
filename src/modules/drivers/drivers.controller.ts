import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorstors/permissions.decorators';
import { FindNearbyDriversDto } from './dto/find-nearby-drivers.dto';
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}
  @Post() create(@Body() dto: CreateDriverDto) {
    return this.driversService.createDriver(dto);
  }

  @Get('nearby')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('drivers:read')
  async findNearby(@Query() query: FindNearbyDriversDto) {
    return this.driversService.findNearestAvailableDrivers(
      query.latitude,
      query.longitude,
      query.radius,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('drivers:read')
  async findById(@Param('id') id: string) {
    const driver = await this.driversService.findById(id);
    if (!driver) {
      throw new NotFoundException('User not found');
    }

    return driver;
  }
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('drivers:update')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.driversService.updateStatus(id, dto.status);
  }
  @Patch(':id/location')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('drivers:update')
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    return this.driversService.updateLocation(id, dto.latitude, dto.longitude);
  }
}
