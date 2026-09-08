import { IsString, MaxLength, MinLength } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  role: string;
}
