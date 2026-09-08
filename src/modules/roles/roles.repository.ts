import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByName(name: string) {
    return this.prisma.role.findUnique({
      where: {
        name,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async assignRoleToUser(userId: string, roleId: string) {
    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  }
}
