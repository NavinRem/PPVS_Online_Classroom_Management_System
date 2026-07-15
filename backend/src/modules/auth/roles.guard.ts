import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private firebaseService: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.uid) {
      throw new ForbiddenException(
        'Access Denied: Missing user authentication.',
      );
    }

    // 1. Check customClaims first if present on user token
    let userRole = user.role;

    // 2. If not in claims, check the users collection in Firestore
    if (!userRole) {
      try {
        const userDoc = await this.firebaseService.firestore
          .collection('users')
          .doc(user.uid)
          .get();

        if (userDoc.exists) {
          userRole = userDoc.data()?.role;
          request.user.role = userRole; // Cache on request
        }
      } catch (error) {
        console.error('🔥 ROLES GUARD ERROR (fetching user role):', error);
      }
    }

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Access Denied: Required role (${requiredRoles.join(', ')}). Your role is ${userRole || 'unassigned'}.`,
      );
    }

    return true;
  }
}
