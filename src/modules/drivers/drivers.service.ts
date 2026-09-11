import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DriversRepository } from './drivers.repository';

import { UsersService } from '../users/users.service';

import { CreateDriverDto } from './dto/create-driver.dto';

import { DriverStatus } from '../../generated/prisma/client';

import { DRIVER_STATUS_TRANSITIONS } from './constants/driver-status-transitions';

@Injectable()
export class DriversService {
  constructor(
    private readonly driversRepository: DriversRepository,
    private readonly usersService: UsersService,
  ) {}

  async findById(id: string) {
    return this.driversRepository.findById(id);
  }

  async createDriver(dto: CreateDriverDto) {
    const user = await this.usersService.findById(dto.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingDriver = await this.driversRepository.findByUserId(
      dto.userId,
    );

    if (existingDriver) {
      throw new ConflictException('User is already a driver');
    }

    const existingLicense = await this.driversRepository.findByLicenseNumber(
      dto.licenseNumber,
    );

    if (existingLicense) {
      throw new ConflictException('License number already exists');
    }

    return this.driversRepository.create(dto);
  }

  async updateStatus(driverId: string, newStatus: DriverStatus) {
    const driver = await this.driversRepository.findById(driverId);

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.status === newStatus) {
      return driver;
    }

    if (!DRIVER_STATUS_TRANSITIONS[driver.status].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid driver status transition: ${driver.status}`,
      );
    }

    return this.driversRepository.updateStatus(driverId, newStatus);
  }
}
