import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByName(name: string) {
    return this.prismaService.permission.findUnique({
      where: {
        name,
      },
    });
  }

  async findByNames(names: string[]) {
    return this.prismaService.permission.findMany({
      where: {
        name: {
          in: names,
        },
      },
    });
  }

  async createPermission(dto: { name: string; description?: string }) {
    return this.prismaService.permission.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }
}
