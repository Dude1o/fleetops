import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { DriverStatus, Prisma } from '../../generated/prisma/client';

@Injectable()
export class DriversRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.driver.findUnique({
      where: {
        id,
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.driver.findUnique({
      where: {
        userId,
      },
    });
  }

  async findByLicenseNumber(licenseNumber: string) {
    return this.prisma.driver.findUnique({
      where: {
        licenseNumber,
      },
    });
  }

  async create(data: { userId: string; licenseNumber: string }) {
    return this.prisma.driver.create({
      data,
    });
  }

  async updateStatus(id: string, status: DriverStatus) {
    return this.prisma.driver.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }
}
