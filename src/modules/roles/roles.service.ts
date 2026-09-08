import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { Prisma } from '../../generated/prisma/client';
@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}
  async findByName(name: string) {
    return this.rolesRepository.findByName(name);
  }
  async assignRoleToUser(userId: string, roleName: string) {
    const role = await this.rolesRepository.findByName(roleName);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    try {
      return await this.rolesRepository.assignRoleToUser(userId, role.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Role is already assigned to this user');
      }
      throw error;
    }
  }
}
