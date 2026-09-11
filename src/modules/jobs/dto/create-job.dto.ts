import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JobPriority } from '../../../generated/prisma/client';

export class CreateJobDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  customerName: string;

  @IsString()
  @MinLength(5)
  @MaxLength(30)
  customerPhone: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  pickupAddress: string;

  @IsString()
  @MinLength(5)
  @MaxLength(100)
  deliveryAddress: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;
}
