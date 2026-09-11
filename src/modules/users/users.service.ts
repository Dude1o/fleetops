import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { UsersRepository } from './users.repository';
import { RolesService } from '../roles/roles.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UserRolesResponseDto } from './dto/user-roles-response.to';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService,
  ) {}

  async findById(id: string) {
    return this.usersRepository.findByid(id);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async createUser(dto: CreateUserDto) {
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.usersRepository.create({
      ...dto,
      password: hashedPassword,
    });
  }

  async findByIdWithRoles(id: string) {
    return this.usersRepository.findByIdWithRoles(id);
  }

  async assignRole(userId: string, roleName: string) {
    const user = await this.usersRepository.findByid(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return this.rolesService.assignRoleToUser(userId, roleName);
  }

  async getUserRoles(userId: string): Promise<UserRolesResponseDto> {
    const user = await this.usersRepository.findByIdWithRoles(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.id,
      roles: user.roles.map((userRole) => ({
        name: userRole.role.name,

        permissions: userRole.role.permissions.map(
          (rolePermission) => rolePermission.permission.name,
        ),
      })),
    };
  }
}
