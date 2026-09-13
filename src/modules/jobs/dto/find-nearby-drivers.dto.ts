import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindNearbyDriversDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(50000)
  radius = 5000;
}
