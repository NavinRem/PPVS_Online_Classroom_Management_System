import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { FirebaseService } from '../src/config/firebase/firebase.service';

const mockQuery = {
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockRejectedValue(new Error('Mock Offline')),
  add: jest.fn().mockRejectedValue(new Error('Mock Offline')),
  doc: jest.fn().mockReturnValue({
    get: jest.fn().mockRejectedValue(new Error('Mock Offline')),
    set: jest.fn().mockRejectedValue(new Error('Mock Offline')),
    update: jest.fn().mockRejectedValue(new Error('Mock Offline')),
    delete: jest.fn().mockRejectedValue(new Error('Mock Offline')),
  }),
};

const mockFirebaseService = {
  onModuleInit: jest.fn(),
  firestore: {
    collection: jest.fn().mockReturnValue(mockQuery),
  },
};

describe('AuthModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseService)
      .useValue(mockFirebaseService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register-parent', () => {
    it('should successfully register a parent', () => {
      return request(app.getHttpServer())
        .post('/auth/register-parent')
        .send({
          name: 'Sokha E2E',
          identifier: 'sokha.e2e@ppvs.edu.kh',
          secret: 'pass123',
          role: 'parent',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user).toHaveProperty('name', 'Sokha E2E');
          expect(res.body.user).toHaveProperty('role', 'parent');
          expect(res.body.user).toHaveProperty(
            'status',
            'pending_verification',
          );
        });
    });

    it('should fail with 400 Bad Request if validation fails (missing secret)', () => {
      return request(app.getHttpServer())
        .post('/auth/register-parent')
        .send({
          name: 'Incomplete Parent',
          identifier: 'incomplete@ppvs.edu.kh',
          role: 'parent',
        })
        .expect(400);
    });

    it('should block non-parent/student roles (validation failure)', () => {
      return request(app.getHttpServer())
        .post('/auth/register-parent')
        .send({
          name: 'Teacher E2E',
          identifier: 'teacher@ppvs.edu.kh',
          secret: 'pass123',
          role: 'teacher', // Forbidden role for public registration
        })
        .expect(400);
    });
  });

  describe('POST /auth/register-student', () => {
    it('should successfully register a student', () => {
      return request(app.getHttpServer())
        .post('/auth/register-student')
        .send({
          name: 'Student E2E',
          identifier: 'student.e2e@ppvs.edu.kh',
          secret: 'pass123',
          role: 'student',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user).toHaveProperty('role', 'student');
          expect(res.body.user).toHaveProperty('status', 'active'); // Students are auto-active
        });
    });
  });

  describe('POST /auth/login', () => {
    // We expect the student we registered above to be stored in the memory store
    it('should successfully login an existing student via email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          loginType: 'email',
          email: 'student.e2e@ppvs.edu.kh',
          password: 'ignored_by_mock',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user).toHaveProperty('role', 'student');
          expect(res.body.user).toHaveProperty(
            'email',
            'student.e2e@ppvs.edu.kh',
          );
        });
    });

    it('should return 401 Unauthorized for unknown email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          loginType: 'email',
          email: 'unknown.email@ppvs.edu.kh',
        })
        .expect(401);
    });

    it('should return 400 Bad Request if missing loginType', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@ppvs.edu.kh',
        })
        .expect(400);
    });
  });

  describe('POST /auth/register-google', () => {
    it('should register a parent via google sso with link code', () => {
      return request(app.getHttpServer())
        .post('/auth/register-google')
        .send({
          idToken: 'mock_google_oauth_id_token',
          role: 'parent',
          studentLinkCode: 'LINK-1234',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user).toHaveProperty('role', 'parent');
          expect(res.body.user).toHaveProperty('status', 'active');
        });
    });
  });

  describe('POST /auth/login-google', () => {
    it('should login parent using mock provider', () => {
      return request(app.getHttpServer())
        .post('/auth/login-google')
        .send({
          idToken: 'mock_google_oauth_id_token',
          provider: 'parent',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user).toHaveProperty('role', 'parent');
        });
    });

    it('should return 401 Unauthorized for invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/login-google')
        .send({
          idToken: 'invalid_token_xyz',
        })
        .expect(401);
    });
  });
});
