import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UsersService } from '../../modules/users/users.service';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { PERMISSIONS_KEY } from '../decorstors/permissions.decorators';
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const user = request.user as AuthenticatedUser;

    const userWithRoles = await this.usersService.findByIdWithRoles(
      user.userId,
    );

    if (!userWithRoles) {
      throw new ForbiddenException();
    }

    const userPermissions = new Set(
      userWithRoles.roles.flatMap((userRole) =>
        userRole.role.permissions.map(
          (rolePermission) => rolePermission.permission.name,
        ),
      ),
    );

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
