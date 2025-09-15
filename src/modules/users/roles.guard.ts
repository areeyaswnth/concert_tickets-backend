import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@common/enum/user-role.enum';
import { SetMetadata } from '@nestjs/common';
import { UsersService } from './services/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly usersService: UsersService, 
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('No user info in request');

    const dbUser = await this.usersService.findOne(user.userId);
    if (!dbUser || !requiredRoles.includes(dbUser.role)) {
      throw new ForbiddenException('You do not have permission (role)');
    }

    return true;
  }
}

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
