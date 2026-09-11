import { Injectable } from '@nestjs/common';

import {
  DriverStatus,
  JobPriority,
  JobStatus,
  Prisma,
} from '../../generated/prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.job.findUnique({
      where: {
        id,
      },
    });
  }

  async create(data: {
    customerName: string;
    customerPhone: string;
    pickupAddress: string;
    deliveryAddress: string;
    notes?: string;
    priority?: JobPriority;
  }) {
    return this.prisma.job.create({
      data: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        pickupAddress: data.pickupAddress,
        deliveryAddress: data.deliveryAddress,
        notes: data.notes,
        priority: data.priority,
      },
    });
  }

  async updateStatus(id: string, status: JobStatus) {
    return this.prisma.job.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }

  async createAssignment(
    client: Prisma.TransactionClient,
    data: {
      jobId: string;
      driverId: string;
      claimedAt?: Date;
    },
  ) {
    return client.jobAssignment.create({
      data,
    });
  }

  async updateJobStatus(
    client: Prisma.TransactionClient,
    jobId: string,
    status: JobStatus,
  ) {
    return client.job.update({
      where: {
        id: jobId,
      },
      data: {
        status,
      },
    });
  }

  async updateDriverStatus(
    client: Prisma.TransactionClient,
    driverId: string,
    status: DriverStatus,
  ) {
    return client.driver.update({
      where: {
        id: driverId,
      },
      data: {
        status,
      },
    });
  }

  async findByIdForUpdate(client: Prisma.TransactionClient, jobId: string) {
    const jobs = await client.$queryRaw<Prisma.JobGetPayload<{}>[]>`
    SELECT "id", "status", "priority", "customerName", "customerPhone", "pickupAddress", "deliveryAddress", "notes", "createdAt", "updatedAt" FROM "Job" WHERE "id" = ${jobId} FOR UPDATE;
    `;

    return jobs[0] ?? null;
  }

  async findDriverByIdForUpdate(
    client: Prisma.TransactionClient,
    driverId: string,
  ) {
    const drivers = await client.$queryRaw<Prisma.DriverGetPayload<{}>[]>`
     SELECT "id", "userId", "status", "licenseNumber", "createdAt", "updatedAt" FROM "Driver" WHERE "id" = ${driverId} FOR UPDATE;
    `;
    return drivers[0] ?? null;
  }

  async findDriverByUserIdForUpdate(
    client: Prisma.TransactionClient,
    userId: string,
  ) {
    const drivers = await client.$queryRaw<Prisma.DriverGetPayload<{}>[]>`
    SELECT "id", "userId", "status", "licenseNumber", "createdAt", "updatedAt" FROM "Driver" WHERE "userId" = ${userId} FOR UPDATE;
    `;
    return drivers[0] ?? null;
  }

  async findAssignmentByJobAndUser(
    client: Prisma.TransactionClient,
    jobId: string,
    userId: string,
  ) {
    return client.jobAssignment.findFirst({
      where: {
        jobId,
        driver: {
          userId,
        },
        completedAt: null,
      },
      include: {
        driver: true,
      },
    });
  }

  async completeAssignment(
    client: Prisma.TransactionClient,
    assignmentId: string,
  ) {
    return client.jobAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        completedAt: new Date(),
      },
    });
  }

  async findActiveAssignmentByJobId(
    client: Prisma.TransactionClient,
    jobId: string,
  ) {
    return client.jobAssignment.findFirst({
      where: {
        jobId,
        completedAt: null,
      },
    });
  }
}
