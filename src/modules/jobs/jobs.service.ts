import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  DriverStatus,
  JobPriority,
  JobStatus,
} from '../../generated/prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { JobsRepository } from './jobs.repository';

import { validateJobStatusTransition } from './job-status-transitions';

@Injectable()
export class JobsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jobsRepository: JobsRepository,
    private readonly redisService: RedisService,
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

  async updateStatus(id: string, status: JobStatus) {
    const job = await this.jobsRepository.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    validateJobStatusTransition(job.status, status);

    const updatedJob = await this.jobsRepository.updateStatus(id, status);

    await this.invalidateAvailableJobsCache();

    return updatedJob;
  }

  async findAvailableJobs() {
    const cacheKey = 'jobs:available';
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const jobs = await this.jobsRepository.findAvailableJobs();

    await this.redisService.set(cacheKey, JSON.stringify(jobs), 30);

    return jobs;
  }

  async assignJob(jobId: string, driverId: string) {
    const result = await this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      validateJobStatusTransition(job.status, JobStatus.ASSIGNED);

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

    await this.invalidateAvailableJobsCache();

    return result;
  }

  async claimJob(jobId: string, userId: string) {
    const assignment = await this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      validateJobStatusTransition(job.status, JobStatus.ASSIGNED);

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

      const newAssignment = await this.jobsRepository.createAssignment(tx, {
        jobId,
        driverId: driver.id,
        claimedAt: new Date(),
      });

      await this.jobsRepository.updateJobStatus(tx, jobId, JobStatus.ASSIGNED);

      await this.jobsRepository.updateDriverStatus(
        tx,
        driver.id,
        DriverStatus.BUSY,
      );

      return newAssignment;
    });

    await this.invalidateAvailableJobsCache();

    return assignment;
  }

  async pickupJob(jobId: string, userId: string) {
    const result = await this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      validateJobStatusTransition(job.status, JobStatus.PICKED_UP);

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

    await this.invalidateAvailableJobsCache();

    return result;
  }

  async startTransitJob(jobId: string, userId: string) {
    const result = await this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      validateJobStatusTransition(job.status, JobStatus.IN_TRANSIT);

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

    await this.invalidateAvailableJobsCache();

    return result;
  }

  async deliverJob(jobId: string, userId: string) {
    const result = await this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      validateJobStatusTransition(job.status, JobStatus.DELIVERED);

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
      };
    });

    await this.invalidateAvailableJobsCache();

    return result;
  }

  async cancelJob(jobId: string) {
    const result = await this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      validateJobStatusTransition(job.status, JobStatus.CANCELLED);

      const assignment = await this.jobsRepository.findActiveAssignmentByJobId(
        tx,
        jobId,
      );

      await this.jobsRepository.updateJobStatus(tx, jobId, JobStatus.CANCELLED);

      if (assignment) {
        await this.jobsRepository.completeAssignment(tx, assignment.id);

        await this.jobsRepository.updateDriverStatus(
          tx,
          assignment.driverId,
          DriverStatus.AVAILABLE,
        );
      }

      return {
        jobId,
        status: JobStatus.CANCELLED,
        cancelledAssignmentId: assignment?.id ?? null,
        driverId: assignment?.driverId ?? null,
      };
    });

    await this.invalidateAvailableJobsCache();

    return result;
  }

  async releaseJob(jobId: string) {
    const result = await this.prismaService.$transaction(async (tx) => {
      const job = await this.jobsRepository.findByIdForUpdate(tx, jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.ASSIGNED) {
        throw new BadRequestException(
          `Job cannot be released while status is ${job.status}`,
        );
      }

      const assignment = await this.jobsRepository.findActiveAssignmentByJobId(
        tx,
        jobId,
      );
      if (!assignment) {
        throw new BadRequestException(
          'Assigned job does not have an active assignment',
        );
      }

      await this.jobsRepository.completeAssignment(tx, assignment.id);

      await this.jobsRepository.updateDriverStatus(
        tx,
        assignment.driverId,
        DriverStatus.AVAILABLE,
      );

      await this.jobsRepository.updateJobStatus(tx, jobId, JobStatus.AVAILABLE);

      return {
        jobId,
        status: JobStatus.AVAILABLE,
        releasedAssignmentId: assignment.id,
        driverId: assignment.driverId,
      };
    });

    await this.invalidateAvailableJobsCache();

    return result;
  }

  private async invalidateAvailableJobsCache() {
    await this.redisService.del('jobs:available');
  }
}
