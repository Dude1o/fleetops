import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { JobsRepository } from './jobs.repository';

import {
  DriverStatus,
  JobPriority,
  JobStatus,
} from '../../generated/prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { JOB_STATUS_TRANSITIONS } from './constants/job-status-transitions';

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepository: JobsRepository,
    private readonly prismaService: PrismaService,
  ) {}

  async findById(id: string) {
    const job = await this.jobsRepository.findById(id);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async createJob(data: {
    customerName: string;
    customerPhone: string;
    pickupAddress: string;
    deliveryAddress: string;
    notes?: string;
    priority?: JobPriority;
  }) {
    return this.jobsRepository.create(data);
  }

  async updateStatus(jobId: string, newStatus: JobStatus) {
    const job = await this.jobsRepository.findById(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status === newStatus) {
      return job;
    }

    if (!JOB_STATUS_TRANSITIONS[job.status].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid job status transition: ${job.status} → ${newStatus}`,
      );
    }

    return this.jobsRepository.updateStatus(jobId, newStatus);
  }

  async assignJob(jobId: string, driverId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.AVAILABLE) {
        throw new BadRequestException(
          `Job cannot be assigned while status is ${job.status}`,
        );
      }

      const driver = await this.jobsRepository.findDriverByIdForUpdate(
        tx,
        driverId,
      );

      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      if (driver.status !== DriverStatus.AVAILABLE) {
        throw new BadRequestException('Driver is not available');
      }

      const assignment = await this.jobsRepository.createAssignment(tx, {
        jobId,
        driverId,
      });

      await this.jobsRepository.updateJobStatus(tx, jobId, JobStatus.ASSIGNED);

      await this.jobsRepository.updateDriverStatus(
        tx,
        driverId,
        DriverStatus.BUSY,
      );

      return assignment;
    });
  }

  async claimJob(jobId: string, userId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.AVAILABLE) {
        throw new BadRequestException(
          `Job cannot be claimed while status is ${job.status}`,
        );
      }

      const driver = await this.jobsRepository.findDriverByUserIdForUpdate(
        tx,
        userId,
      );

      if (!driver) {
        throw new NotFoundException('Driver profile not found');
      }

      if (driver.status !== DriverStatus.AVAILABLE) {
        throw new BadRequestException('Driver is not available');
      }

      const assignment = await this.jobsRepository.createAssignment(tx, {
        jobId,
        driverId: driver.id,
      });

      await this.jobsRepository.updateJobStatus(tx, jobId, JobStatus.ASSIGNED);

      await this.jobsRepository.updateDriverStatus(
        tx,
        driver.id,
        DriverStatus.BUSY,
      );

      return assignment;
    });
  }

  async pickupJob(jobId: string, userId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.ASSIGNED) {
        throw new BadRequestException(
          `Job cannot be picked up while status is ${job.status}`,
        );
      }

      const assignment = await this.jobsRepository.findAssignmentByJobAndUser(
        tx,
        jobId,
        userId,
      );

      if (!assignment) {
        throw new BadRequestException('You are not assigned to this job');
      }

      return this.jobsRepository.updateJobStatus(
        tx,
        jobId,
        JobStatus.PICKED_UP,
      );
    });
  }

  async startTransitJob(jobId: string, userId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.PICKED_UP) {
        throw new BadRequestException(
          `Job cannot start transit while status is ${job.status}`,
        );
      }

      const assignment = await this.jobsRepository.findAssignmentByJobAndUser(
        tx,
        jobId,
        userId,
      );

      if (!assignment) {
        throw new BadRequestException('You are not assigned to this job');
      }

      return this.jobsRepository.updateJobStatus(
        tx,
        jobId,
        JobStatus.IN_TRANSIT,
      );
    });
  }

  async deliverJob(jobId: string, userId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.IN_TRANSIT) {
        throw new BadRequestException(
          `Job cannot be delivered while status is ${job.status}`,
        );
      }

      const assignment = await this.jobsRepository.findAssignmentByJobAndUser(
        tx,
        jobId,
        userId,
      );

      if (!assignment) {
        throw new BadRequestException('You are not assigned to this job');
      }

      await this.jobsRepository.updateJobStatus(tx, jobId, JobStatus.DELIVERED);

      await this.jobsRepository.completeAssignment(tx, assignment.id);

      await this.jobsRepository.updateDriverStatus(
        tx,
        assignment.driverId,
        DriverStatus.AVAILABLE,
      );

      return {
        jobId,
        status: JobStatus.DELIVERED,
        assignmentId: assignment.id,
        driverId: assignment.driverId,
      };
    });
  }

  async cancelJob(jobId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (!JOB_STATUS_TRANSITIONS[job.status].includes(JobStatus.CANCELLED)) {
        throw new BadRequestException(
          `Job cannot be cancelled while status is ${job.status}`,
        );
      }

      const assignment = await this.jobsRepository.findActiveAssignmentByJobId(
        tx,
        jobId,
      );

      await this.jobsRepository.updateJobStatus(tx, jobId, JobStatus.CANCELLED);

      if (assignment) {
        await this.jobsRepository.updateDriverStatus(
          tx,
          assignment.driverId,
          DriverStatus.AVAILABLE,
        );
      }

      return {
        jobId,
        status: JobStatus.CANCELLED,
      };
    });
  }
}
