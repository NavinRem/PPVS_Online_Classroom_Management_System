import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('Auth Module RolesGuard (Unit & Integration)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let firebaseService: FirebaseService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [RolesGuard, Reflector],
    }).compile();

    await module.init();
    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    firebaseService = module.get<FirebaseService>(FirebaseService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('RBAC Verification (`canActivate`)', () => {
    const runId = Date.now();
    const mockUid = `auth_guard_user_${runId}`;

    const createMockContext = (
      user: Record<string, unknown> | null,
      handlerRoles: string[] = ['admin', 'teacher'],
    ): ExecutionContext => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(handlerRoles);
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as unknown as ExecutionContext;
    };

    it('should allow access if no required roles are defined on the handler', async () => {
      const context = createMockContext({ uid: mockUid, role: 'student' }, []);
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should allow access when user role matches required roles (`user.role`)', async () => {
      const context = createMockContext({ uid: mockUid, role: 'teacher' }, [
        'admin',
        'teacher',
      ]);
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should throw ForbiddenException when user role does not match required roles', async () => {
      const context = createMockContext({ uid: mockUid, role: 'student' }, [
        'admin',
        'teacher',
      ]);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if request has no authenticated user object', async () => {
      const context = createMockContext(null, ['admin']);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should fallback to checking Firestore users collection if user token lacks role claim', async () => {
      await firebaseService.firestore.collection('users').doc(mockUid).set({
        email: 'mock.admin@ppvs.edu.kh',
        role: 'admin',
        createdAt: new Date().toISOString(),
      });

      const reqObj = { user: { uid: mockUid } as Record<string, unknown> };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => reqObj,
        }),
      } as unknown as ExecutionContext;

      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(reqObj.user.role).toBe('admin');
    });
  });
});
