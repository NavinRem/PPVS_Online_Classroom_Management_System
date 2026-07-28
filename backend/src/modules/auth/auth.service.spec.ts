import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ParentsService } from '../parents/parents.service';
import { StudentsService } from '../students/students.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FirebaseService } from '../../config/firebase/firebase.service';

// ─────────────────────────────────────────────────────────────
// RolesGuard (Pure Unit – mocked FirebaseService, no emulator)
// ─────────────────────────────────────────────────────────────
describe('RolesGuard (Unit)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockFirebaseService: { firestore: { collection: jest.Mock } };

  beforeEach(async () => {
    mockFirebaseService = {
      firestore: {
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: 'admin' }),
            }),
          }),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        Reflector,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

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

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no required roles are defined on the handler', async () => {
    const context = createMockContext({ uid: 'u1', role: 'student' }, []);
    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('should allow access when user role matches required roles', async () => {
    const context = createMockContext({ uid: 'u1', role: 'teacher' }, [
      'admin',
      'teacher',
    ]);
    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('should throw ForbiddenException when user role does not match required roles', async () => {
    const context = createMockContext({ uid: 'u1', role: 'student' }, [
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

  it('should throw ForbiddenException if user has no uid', async () => {
    const context = createMockContext({ role: 'admin' }, ['admin']);
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should fallback to checking Firestore users collection if user token lacks role claim', async () => {
    const reqObj = { user: { uid: 'test_uid_123' } as Record<string, unknown> };
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
    expect(mockFirebaseService.firestore.collection).toHaveBeenCalledWith(
      'users',
    );
  });

  it('should throw ForbiddenException when Firestore lookup returns a non-matching role', async () => {
    mockFirebaseService.firestore.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ role: 'student' }),
        }),
      }),
    });

    const reqObj = {
      user: { uid: 'test_uid_456' } as Record<string, unknown>,
    };
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => reqObj,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when user doc does not exist in Firestore', async () => {
    mockFirebaseService.firestore.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: false,
          data: () => undefined,
        }),
      }),
    });

    const reqObj = {
      user: { uid: 'nonexistent_uid' } as Record<string, unknown>,
    };
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => reqObj,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when Firestore lookup throws an error', async () => {
    mockFirebaseService.firestore.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Network error')),
      }),
    });

    const reqObj = {
      user: { uid: 'error_uid' } as Record<string, unknown>,
    };
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => reqObj,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow admin role to access admin-only endpoints', async () => {
    const context = createMockContext({ uid: 'a1', role: 'admin' }, ['admin']);
    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('should allow when requiredRoles is null (no @Roles decorator)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { uid: 'u1', role: 'student' } }),
      }),
    } as unknown as ExecutionContext;

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// AuthService (Pure Unit – all dependencies mocked)
// ─────────────────────────────────────────────────────────────
describe('AuthService (Unit)', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findByPhoneNumber: jest.Mock;
    findByUid: jest.Mock;
    createOrUpdateUser: jest.Mock;
  };
  let parentsService: { createOrUpdateProfile: jest.Mock };
  let studentsService: { create: jest.Mock };
  let auditLogsService: { logAction: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByPhoneNumber: jest.fn(),
      findByUid: jest.fn(),
      createOrUpdateUser: jest.fn().mockResolvedValue({ id: 'test_uid' }),
    };
    parentsService = {
      createOrUpdateProfile: jest.fn().mockResolvedValue({ id: 'test_uid' }),
    };
    studentsService = {
      create: jest.fn().mockResolvedValue({ id: 'test_uid' }),
    };
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit_id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: ParentsService, useValue: parentsService },
        { provide: StudentsService, useValue: studentsService },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  // ──────────────────────────────
  // login()
  // ──────────────────────────────
  describe('login()', () => {
    // Email login
    it('should login successfully with valid email credentials', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'user_123',
        email: 'parent@ppvs.edu.kh',
        role: 'parent',
      });
      const result = await authService.login({
        loginType: 'email',
        email: 'parent@ppvs.edu.kh',
        password: 'password123',
      });
      expect(result).toHaveProperty('accessToken', 'user_123_jwt_token');
      expect(result.user).toHaveProperty('email', 'parent@ppvs.edu.kh');
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'parent@ppvs.edu.kh',
      );
    });

    it('should throw BadRequestException when email is missing for email login', async () => {
      await expect(authService.login({ loginType: 'email' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.login({ loginType: 'email' })).rejects.toThrow(
        'Email is required for email login',
      );
    });

    it('should throw UnauthorizedException when email is not found', async () => {
      usersService.findByEmail.mockRejectedValue(new Error('NotFound'));
      await expect(
        authService.login({
          loginType: 'email',
          email: 'unknown@ppvs.edu.kh',
        }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.login({
          loginType: 'email',
          email: 'unknown@ppvs.edu.kh',
        }),
      ).rejects.toThrow('Access Denied: Invalid email or credentials.');
    });

    it('should use uid field as fallback when id is not present on user record', async () => {
      usersService.findByEmail.mockResolvedValue({
        uid: 'uid_fallback_99',
        email: 'test@ppvs.edu.kh',
        role: 'student',
      });
      const result = await authService.login({
        loginType: 'email',
        email: 'test@ppvs.edu.kh',
      });
      expect(result.accessToken).toBe('uid_fallback_99_jwt_token');
    });

    it('should use "unknown" when neither id nor uid exists on user record', async () => {
      usersService.findByEmail.mockResolvedValue({
        email: 'nouid@ppvs.edu.kh',
        role: 'parent',
      });
      const result = await authService.login({
        loginType: 'email',
        email: 'nouid@ppvs.edu.kh',
      });
      expect(result.accessToken).toBe('unknown_jwt_token');
    });

    // Phone login
    it('should login successfully with valid phone and matching PIN', async () => {
      usersService.findByPhoneNumber.mockResolvedValue({
        id: 'user_456',
        phoneNumber: '012345678',
        pin: '9999',
        role: 'student',
      });
      const result = await authService.login({
        loginType: 'phone',
        phoneNumber: '012345678',
        pin: '9999',
      });
      expect(result).toHaveProperty('accessToken', 'user_456_jwt_token');
      expect(usersService.findByPhoneNumber).toHaveBeenCalledWith('012345678');
    });

    it('should login with phone when PIN is the bypass code 1234', async () => {
      usersService.findByPhoneNumber.mockResolvedValue({
        id: 'user_bypass',
        phoneNumber: '099999999',
        pin: '5678',
        role: 'parent',
      });
      const result = await authService.login({
        loginType: 'phone',
        phoneNumber: '099999999',
        pin: '1234',
      });
      expect(result.accessToken).toBe('user_bypass_jwt_token');
    });

    it('should login with phone when no PIN is provided (phone-only auth)', async () => {
      usersService.findByPhoneNumber.mockResolvedValue({
        id: 'user_no_pin',
        phoneNumber: '0111111',
        role: 'parent',
      });
      const result = await authService.login({
        loginType: 'phone',
        phoneNumber: '0111111',
      });
      expect(result.accessToken).toBe('user_no_pin_jwt_token');
    });

    it('should throw BadRequestException when phoneNumber is missing for phone login', async () => {
      await expect(authService.login({ loginType: 'phone' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(authService.login({ loginType: 'phone' })).rejects.toThrow(
        'Phone number is required for phone login',
      );
    });

    it('should throw UnauthorizedException when phone number is not found', async () => {
      usersService.findByPhoneNumber.mockRejectedValue(new Error('NotFound'));
      await expect(
        authService.login({
          loginType: 'phone',
          phoneNumber: '000000000',
          pin: '1111',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when PIN does not match and is not bypass', async () => {
      usersService.findByPhoneNumber.mockResolvedValue({
        id: 'user_wrong_pin',
        phoneNumber: '012345678',
        pin: '9999',
        role: 'student',
      });
      await expect(
        authService.login({
          loginType: 'phone',
          phoneNumber: '012345678',
          pin: '0000',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    // Invalid login type
    it('should throw BadRequestException for invalid login type', async () => {
      await expect(
        authService.login({ loginType: 'sms' as 'email' | 'phone' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        authService.login({ loginType: 'sms' as 'email' | 'phone' }),
      ).rejects.toThrow('Invalid login type specified.');
    });
  });

  // ──────────────────────────────
  // loginWithGoogle()
  // ──────────────────────────────
  describe('loginWithGoogle()', () => {
    it('should authenticate with mock Google OAuth token when teacher email exists', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'google_user_01',
        email: 'navin.teacher@ppvs.edu.kh',
        role: 'teacher',
      });
      const result = await authService.loginWithGoogle({
        idToken: 'mock_google_oauth_id_token',
      });
      expect(result).toHaveProperty('accessToken', 'google_user_01_jwt_token');
      expect(result.user).toHaveProperty('email', 'navin.teacher@ppvs.edu.kh');
    });

    it('should lookup custom email when provider contains @ in mock mode', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'custom_google_01',
        email: 'custom@ppvs.edu.kh',
        role: 'parent',
      });
      const result = await authService.loginWithGoogle({
        idToken: 'mock_google_oauth_id_token',
        provider: 'custom@ppvs.edu.kh',
      });
      expect(result.accessToken).toBe('custom_google_01_jwt_token');
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'custom@ppvs.edu.kh',
      );
    });

    it('should lookup parent email when provider is "parent" in mock mode', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'parent_google_01',
        email: 'parent.google@ppvs.edu.kh',
        role: 'parent',
      });
      const result = await authService.loginWithGoogle({
        idToken: 'mock_google_oauth_id_token',
        provider: 'parent',
      });
      expect(result.accessToken).toBe('parent_google_01_jwt_token');
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'parent.google@ppvs.edu.kh',
      );
    });

    it('should lookup student email when provider is "student" in mock mode', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'student_google_01',
        email: 'student.google@ppvs.edu.kh',
        role: 'student',
      });
      const result = await authService.loginWithGoogle({
        idToken: 'mock_google_oauth_id_token',
        provider: 'student',
      });
      expect(result.accessToken).toBe('student_google_01_jwt_token');
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'student.google@ppvs.edu.kh',
      );
    });

    it('should create mock teacher user when no existing user is found with mock token (no provider)', async () => {
      // Flow: findByEmail('navin.teacher@ppvs.edu.kh') at line 149 -> throws (caught silently)
      //   -> email = 'navin.teacher@ppvs.edu.kh', uid = 'google_user_verified_01'
      //   -> findByEmail('navin.teacher@ppvs.edu.kh') at line 183 -> throws
      //   -> catch block: createOrUpdateUser, then findByUid
      usersService.findByEmail.mockRejectedValue(new Error('NotFound'));
      usersService.createOrUpdateUser.mockResolvedValue({
        id: 'google_user_verified_01',
      });
      // findByUid is called once inside the catch block after user creation
      usersService.findByUid.mockResolvedValue({
        uid: 'google_user_verified_01',
        email: 'navin.teacher@ppvs.edu.kh',
        role: 'teacher',
      });

      const result = await authService.loginWithGoogle({
        idToken: 'mock_google_oauth_id_token',
      });
      expect(result).toHaveProperty(
        'accessToken',
        'google_user_verified_01_jwt_token',
      );
      expect(usersService.createOrUpdateUser).toHaveBeenCalledWith(
        'google_user_verified_01',
        expect.objectContaining({
          uid: 'google_user_verified_01',
          email: 'navin.teacher@ppvs.edu.kh',
          role: 'teacher',
          fullName: 'Teacher Navin (Google Verified)',
          status: 'active',
        }),
      );
      expect(usersService.findByUid).toHaveBeenCalledWith(
        'google_user_verified_01',
      );
    });

    it('should throw UnauthorizedException for invalid real Google token', async () => {
      await expect(
        authService.loginWithGoogle({
          idToken: 'invalid_real_token_xyz',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ──────────────────────────────
  // registerPublicUser()
  // ──────────────────────────────
  describe('registerPublicUser()', () => {
    it('should register a new parent with email identifier', async () => {
      const result = await authService.registerPublicUser({
        name: 'Sokha Parent',
        identifier: 'parent@test.kh',
        secret: 'secret123',
        role: 'parent',
      });
      expect(result).toHaveProperty('accessToken');
      expect(result.user).toHaveProperty('role', 'parent');
      expect(result.user).toHaveProperty('email', 'parent@test.kh');
      expect(result.user.phoneNumber).toBeUndefined();
      expect(usersService.createOrUpdateUser).toHaveBeenCalled();
      expect(parentsService.createOrUpdateProfile).toHaveBeenCalled();
      expect(auditLogsService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'users' }),
      );
    });

    it('should register a new parent with phone identifier', async () => {
      const result = await authService.registerPublicUser({
        name: 'Sokha Parent Phone',
        identifier: '012345678',
        secret: '1234',
        role: 'parent',
      });
      expect(result.user).toHaveProperty('phoneNumber', '012345678');
      expect(result.user.email).toBeUndefined();
      expect(parentsService.createOrUpdateProfile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ phoneNumber: '012345678' }),
        expect.any(Object),
      );
    });

    it('should register a new student and delegate to StudentsService', async () => {
      const result = await authService.registerPublicUser({
        name: 'Dara Student',
        identifier: 'student@test.kh',
        secret: 'password',
        role: 'student',
      });
      expect(result.user).toHaveProperty('role', 'student');
      expect(studentsService.create).toHaveBeenCalled();
      expect(parentsService.createOrUpdateProfile).not.toHaveBeenCalled();
    });

    it('should assign status pending_verification for parent without studentLinkCode', async () => {
      const result = await authService.registerPublicUser({
        name: 'Parent No Code',
        identifier: 'parent.nocode@test.kh',
        secret: 'secret123',
        role: 'parent',
      });
      expect(result.user).toHaveProperty('status', 'pending_verification');
    });

    it('should assign status active for parent with studentLinkCode', async () => {
      const result = await authService.registerPublicUser({
        name: 'Parent With Code',
        identifier: 'parent.linked@test.kh',
        secret: 'secret123',
        role: 'parent',
        studentLinkCode: 'STU-2026-001',
      });
      expect(result.user).toHaveProperty('status', 'active');
    });

    it('should assign status active for student registration', async () => {
      const result = await authService.registerPublicUser({
        name: 'Student Active',
        identifier: 'student.active@test.kh',
        secret: 'password',
        role: 'student',
      });
      expect(result.user).toHaveProperty('status', 'active');
    });

    it('should reject public self-registration for teacher role with ForbiddenException', async () => {
      await expect(
        authService.registerPublicUser({
          name: 'Fake Teacher',
          identifier: 'teacher@test.kh',
          secret: 'secret123',
          role: 'teacher' as 'parent' | 'student',
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        authService.registerPublicUser({
          name: 'Fake Teacher',
          identifier: 'teacher@test.kh',
          secret: 'secret123',
          role: 'teacher' as 'parent' | 'student',
        }),
      ).rejects.toThrow(
        'Public self-registration is strictly restricted for Parents and Students',
      );
    });

    it('should reject public self-registration for admin role with ForbiddenException', async () => {
      await expect(
        authService.registerPublicUser({
          name: 'Fake Admin',
          identifier: 'admin@test.kh',
          secret: 'secret123',
          role: 'admin' as 'parent' | 'student',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should log audit action with correct details for email registration', async () => {
      await authService.registerPublicUser({
        name: 'Audit Parent',
        identifier: 'audit@test.kh',
        secret: 'secret',
        role: 'parent',
        guardianCertified: true,
      });
      expect(auditLogsService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'users',
          details: expect.objectContaining({
            loginType: 'email',
            role: 'parent',
            source: 'public_self_registration',
            guardianCertified: true,
          }),
        }),
      );
    });

    it('should log audit action with loginType phone for phone registration', async () => {
      await authService.registerPublicUser({
        name: 'Phone Parent',
        identifier: '099887766',
        secret: '5678',
        role: 'parent',
      });
      expect(auditLogsService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            loginType: 'phone',
          }),
        }),
      );
    });

    it('should pass guardianCertified as false when not provided', async () => {
      await authService.registerPublicUser({
        name: 'No Guardian Flag',
        identifier: 'nogflag@test.kh',
        secret: 'pass',
        role: 'parent',
      });
      expect(parentsService.createOrUpdateProfile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ guardianCertified: false }),
        expect.any(Object),
      );
    });

    it('should generate a uid containing the role and timestamp', async () => {
      const beforeMs = Date.now();
      const result = await authService.registerPublicUser({
        name: 'UID Check',
        identifier: 'uidcheck@test.kh',
        secret: 'pass',
        role: 'student',
      });
      const afterMs = Date.now();
      const uid = result.user.uid;
      expect(uid).toMatch(/^student_user_\d+$/);
      const uidTimestamp = parseInt(uid.replace('student_user_', ''), 10);
      expect(uidTimestamp).toBeGreaterThanOrEqual(beforeMs);
      expect(uidTimestamp).toBeLessThanOrEqual(afterMs);
    });
  });

  // ──────────────────────────────
  // registerWithGoogle()
  // ──────────────────────────────
  describe('registerWithGoogle()', () => {
    it('should register parent via mock Google OAuth token', async () => {
      const result = await authService.registerWithGoogle({
        idToken: 'mock_google_oauth_id_token',
        role: 'parent',
        guardianCertified: true,
      });
      expect(result).toHaveProperty('accessToken');
      expect(result.user).toHaveProperty('role', 'parent');
      expect(result.user).toHaveProperty('email', 'parent.google@ppvs.edu.kh');
      expect(result.user).toHaveProperty('status', 'pending_verification');
      expect(parentsService.createOrUpdateProfile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          guardianCertified: true,
          status: 'pending_verification',
        }),
        expect.any(Object),
      );
    });

    it('should register student via mock Google OAuth token', async () => {
      const result = await authService.registerWithGoogle({
        idToken: 'mock_google_oauth_id_token',
        role: 'student',
      });
      expect(result.user).toHaveProperty('role', 'student');
      expect(result.user).toHaveProperty('email', 'student.google@ppvs.edu.kh');
      expect(result.user).toHaveProperty('status', 'active');
      expect(studentsService.create).toHaveBeenCalled();
      expect(parentsService.createOrUpdateProfile).not.toHaveBeenCalled();
    });

    it('should assign status active when parent registers with studentLinkCode via Google', async () => {
      const result = await authService.registerWithGoogle({
        idToken: 'mock_google_oauth_id_token',
        role: 'parent',
        studentLinkCode: 'STU-2026-9999',
        guardianCertified: true,
      });
      expect(result.user).toHaveProperty('status', 'active');
    });

    it('should reject Google registration for teacher role with ForbiddenException', async () => {
      await expect(
        authService.registerWithGoogle({
          idToken: 'mock_google_oauth_id_token',
          role: 'teacher' as 'parent' | 'student',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject Google registration for admin role with ForbiddenException', async () => {
      await expect(
        authService.registerWithGoogle({
          idToken: 'mock_google_oauth_id_token',
          role: 'admin' as 'parent' | 'student',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException for invalid real Google token during registration', async () => {
      await expect(
        authService.registerWithGoogle({
          idToken: 'invalid_real_token_xyz',
          role: 'parent',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should log audit action with google source for Google registration', async () => {
      await authService.registerWithGoogle({
        idToken: 'mock_google_oauth_id_token',
        role: 'student',
      });
      expect(auditLogsService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'users',
          details: expect.objectContaining({
            loginType: 'google',
            source: 'google_sso_registration',
          }),
        }),
      );
    });

    it('should delegate to UsersService.createOrUpdateUser for Google registration', async () => {
      await authService.registerWithGoogle({
        idToken: 'mock_google_oauth_id_token',
        role: 'student',
      });
      expect(usersService.createOrUpdateUser).toHaveBeenCalledWith(
        expect.stringContaining('google_student_verified_01'),
        expect.objectContaining({
          role: 'student',
          email: 'student.google@ppvs.edu.kh',
          status: 'active',
        }),
      );
    });

    it('should set guardianCertified to false when not provided in Google registration', async () => {
      await authService.registerWithGoogle({
        idToken: 'mock_google_oauth_id_token',
        role: 'parent',
      });
      expect(parentsService.createOrUpdateProfile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ guardianCertified: false }),
        expect.any(Object),
      );
    });
  });
});
