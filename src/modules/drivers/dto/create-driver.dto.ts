import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDriverDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  licenseNumber: string;
}
