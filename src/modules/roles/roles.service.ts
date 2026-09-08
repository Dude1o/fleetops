import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RolesRepository } from './roles.repository';
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
      throw new ConflictException('Role is already assigned to this user');
    }
  }
}
