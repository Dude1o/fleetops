import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { DriverStatus, Prisma } from '../../generated/prisma/client';
import { randomUUID } from 'crypto';

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

  async updateLocation(driverId: string, latitude: number, longitude: number) {
    const locationId = randomUUID();
    await this.prisma.$executeRaw`
  INSERT INTO "DriverLocation" (
    "id",
    "driverId",
    "latitude",
    "longitude",
    "location",
    "updatedAt"
  )
  VALUES (
    ${locationId},
    ${driverId},
    ${latitude},
    ${longitude},
    ST_SetSRID(
      ST_MakePoint(${longitude}, ${latitude}),
      4326
    )::geography,
    NOW()
  )
  ON CONFLICT ("driverId")
  DO UPDATE SET
    "latitude" = EXCLUDED."latitude",
    "longitude" = EXCLUDED."longitude",
    "location" = EXCLUDED."location",
    "updatedAt" = NOW();
`;

    return this.prisma.driverLocation.findUnique({
      where: {
        driverId,
      },
    });
  }

  async findNearestAvailableDrivers(
    latitude: number,
    longitude: number,
    radius: number,
  ) {
    type NearbyDriver = {
      id: string;
      userId: string;
      status: DriverStatus;
      latitude: number;
      longitude: number;
      distanceMeters: number;
    };
    return this.prisma.$queryRaw<NearbyDriver[]>`
  SELECT
    d."id",
    d."userId",
    d."status",
    dl."latitude"::double precision AS "latitude",
    dl."longitude"::double precision AS "longitude",
    ST_Distance(
      dl."location",
      ST_SetSRID(
        ST_MakePoint(${longitude}, ${latitude}),
        4326
      )::geography
    ) AS "distanceMeters"
  FROM "Driver" d
  INNER JOIN "DriverLocation" dl
    ON dl."driverId" = d."id"
  WHERE d."status" = 'AVAILABLE'
    AND ST_DWithin(
      dl."location",
      ST_SetSRID(
        ST_MakePoint(${longitude}, ${latitude}),
        4326
      )::geography,
      ${radius}
    )
  ORDER BY "distanceMeters" ASC;
`;
  }
}
