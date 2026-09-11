import { Test, TestingModule } from '@nestjs/testing';

import { JobsService } from './jobs.service.js';
import { JobsRepository } from './jobs.repository.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';

describe('JobsService', () => {
  let service: JobsService;

  let jobsRepository: {
    findById: jest.Mock;
    create: jest.Mock;
    updateStatus: jest.Mock;
  };

  let prismaService: {
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    jobsRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };

    prismaService = {
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: JobsRepository,
          useValue: jobsRepository,
        },
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    describe('findById', () => {
      it('should return the job when it exists', async () => {
        const job = {
          id: 'job-1',
          status: 'AVAILABLE',
        };

        jobsRepository.findById.mockResolvedValue(job);

        const result = await service.findById('job-1');

        expect(result).toEqual(job);
        expect(jobsRepository.findById).toHaveBeenCalledWith('job-1');
      });

      it('should throw NotFoundException when the job does not exist', async () => {
        jobsRepository.findById.mockResolvedValue(null);

        await expect(service.findById('job-1')).rejects.toThrow(
          'Job not found',
        );

        expect(jobsRepository.findById).toHaveBeenCalledWith('job-1');
      });
    });
  });
});
