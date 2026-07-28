import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController (Unit)', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    loginWithGoogle: jest.Mock;
    registerPublicUser: jest.Mock;
    registerWithGoogle: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      registerPublicUser: jest.fn(),
      registerWithGoogle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────
  // POST /auth/login
  // ──────────────────────────────
  describe('POST /auth/login', () => {
    it('should delegate email login to AuthService.login()', async () => {
      const loginDto = {
        loginType: 'email' as const,
        email: 'teacher@ppvs.edu.kh',
        password: 'pass123',
      };
      const expected = {
        accessToken: 'user_123_jwt_token',
        user: { id: 'user_123', email: 'teacher@ppvs.edu.kh', role: 'teacher' },
      };
      authService.login.mockResolvedValue(expected);

      const result = await controller.login(loginDto);
      expect(result).toEqual(expected);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should delegate phone login to AuthService.login()', async () => {
      const loginDto = {
        loginType: 'phone' as const,
        phoneNumber: '012345678',
        pin: '9999',
      };
      const expected = {
        accessToken: 'user_456_jwt_token',
        user: { id: 'user_456', phoneNumber: '012345678', role: 'student' },
      };
      authService.login.mockResolvedValue(expected);

      const result = await controller.login(loginDto);
      expect(result).toEqual(expected);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should propagate UnauthorizedException from AuthService.login()', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException(
          'Access Denied: Invalid email or credentials.',
        ),
      );

      await expect(
        controller.login({ loginType: 'email', email: 'bad@test.kh' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ──────────────────────────────
  // POST /auth/login-google
  // ──────────────────────────────
  describe('POST /auth/login-google', () => {
    it('should delegate Google login to AuthService.loginWithGoogle()', async () => {
      const dto = { idToken: 'mock_google_oauth_id_token' };
      const expected = {
        accessToken: 'google_user_jwt_token',
        user: { uid: 'g1', role: 'teacher' },
      };
      authService.loginWithGoogle.mockResolvedValue(expected);

      const result = await controller.loginGoogle(dto);
      expect(result).toEqual(expected);
      expect(authService.loginWithGoogle).toHaveBeenCalledWith(dto);
      expect(authService.loginWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('should pass provider to AuthService when provided', async () => {
      const dto = { idToken: 'mock_google_oauth_id_token', provider: 'parent' };
      authService.loginWithGoogle.mockResolvedValue({
        accessToken: 'tok',
        user: {},
      });

      await controller.loginGoogle(dto);
      expect(authService.loginWithGoogle).toHaveBeenCalledWith(dto);
    });

    it('should propagate UnauthorizedException from AuthService.loginWithGoogle()', async () => {
      authService.loginWithGoogle.mockRejectedValue(
        new UnauthorizedException('Access Denied: Invalid Google OAuth token.'),
      );

      await expect(
        controller.loginGoogle({ idToken: 'bad_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ──────────────────────────────
  // POST /auth/register-parent
  // ──────────────────────────────
  describe('POST /auth/register-parent', () => {
    it('should delegate to AuthService.registerPublicUser() with role forced to parent', async () => {
      const dto = {
        name: 'Sokha Parent',
        identifier: 'sokha@test.kh',
        secret: 'pass123',
        role: 'parent' as const,
      };
      const expected = {
        accessToken: 'parent_user_123_jwt_token',
        user: { uid: 'parent_user_123', name: 'Sokha Parent', role: 'parent' },
      };
      authService.registerPublicUser.mockResolvedValue(expected);

      const result = await controller.registerParent(dto);
      expect(result).toEqual(expected);
      expect(authService.registerPublicUser).toHaveBeenCalledWith({
        ...dto,
        role: 'parent',
      });
    });

    it('should force role to parent even if dto contains different role', async () => {
      const dto = {
        name: 'Sneaky Admin',
        identifier: 'admin@test.kh',
        secret: 'pass',
        role: 'admin' as 'parent',
      };
      authService.registerPublicUser.mockResolvedValue({
        accessToken: 'tok',
        user: {},
      });

      await controller.registerParent(dto);
      expect(authService.registerPublicUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'parent' }),
      );
    });

    it('should pass studentLinkCode and guardianCertified to AuthService', async () => {
      const dto = {
        name: 'Linked Parent',
        identifier: 'linked@test.kh',
        secret: 'pass',
        role: 'parent' as const,
        studentLinkCode: 'STU-2026-001',
        guardianCertified: true,
      };
      authService.registerPublicUser.mockResolvedValue({
        accessToken: 'tok',
        user: {},
      });

      await controller.registerParent(dto);
      expect(authService.registerPublicUser).toHaveBeenCalledWith(
        expect.objectContaining({
          studentLinkCode: 'STU-2026-001',
          guardianCertified: true,
          role: 'parent',
        }),
      );
    });
  });

  // ──────────────────────────────
  // POST /auth/register-student
  // ──────────────────────────────
  describe('POST /auth/register-student', () => {
    it('should delegate to AuthService.registerPublicUser() with role forced to student', async () => {
      const dto = {
        name: 'Dara Student',
        identifier: 'dara@test.kh',
        secret: 'pass123',
        role: 'student' as const,
      };
      const expected = {
        accessToken: 'student_user_456_jwt_token',
        user: {
          uid: 'student_user_456',
          name: 'Dara Student',
          role: 'student',
        },
      };
      authService.registerPublicUser.mockResolvedValue(expected);

      const result = await controller.registerStudent(dto);
      expect(result).toEqual(expected);
      expect(authService.registerPublicUser).toHaveBeenCalledWith({
        ...dto,
        role: 'student',
      });
    });

    it('should force role to student even if dto contains different role', async () => {
      const dto = {
        name: 'Sneaky Teacher',
        identifier: 'teacher@test.kh',
        secret: 'pass',
        role: 'teacher' as 'student',
      };
      authService.registerPublicUser.mockResolvedValue({
        accessToken: 'tok',
        user: {},
      });

      await controller.registerStudent(dto);
      expect(authService.registerPublicUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'student' }),
      );
    });
  });

  // ──────────────────────────────
  // POST /auth/register-google
  // ──────────────────────────────
  describe('POST /auth/register-google', () => {
    it('should delegate to AuthService.registerWithGoogle()', async () => {
      const dto = {
        idToken: 'mock_google_oauth_id_token',
        role: 'parent' as const,
        guardianCertified: true,
      };
      const expected = {
        accessToken: 'google_parent_jwt_token',
        user: { uid: 'gp_01', role: 'parent', status: 'pending_verification' },
      };
      authService.registerWithGoogle.mockResolvedValue(expected);

      const result = await controller.registerGoogle(dto);
      expect(result).toEqual(expected);
      expect(authService.registerWithGoogle).toHaveBeenCalledWith(dto);
      expect(authService.registerWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('should pass studentLinkCode to AuthService.registerWithGoogle()', async () => {
      const dto = {
        idToken: 'mock_google_oauth_id_token',
        role: 'parent' as const,
        studentLinkCode: 'STU-2026-ABC',
        guardianCertified: true,
      };
      authService.registerWithGoogle.mockResolvedValue({
        accessToken: 'tok',
        user: {},
      });

      await controller.registerGoogle(dto);
      expect(authService.registerWithGoogle).toHaveBeenCalledWith(dto);
    });

    it('should propagate ForbiddenException from AuthService.registerWithGoogle()', async () => {
      authService.registerWithGoogle.mockRejectedValue(
        new ForbiddenException(
          'Public self-registration is strictly restricted',
        ),
      );

      await expect(
        controller.registerGoogle({
          idToken: 'tok',
          role: 'teacher' as 'parent',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
