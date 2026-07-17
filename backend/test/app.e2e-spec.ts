import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/classes (GET) - unauthenticated request should return 401 Unauthorized', () => {
    return request(app.getHttpServer())
      .get('/classes')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toContain('Unauthorized');
      });
  });

  it('/users/me (GET) - unauthenticated request should return 401 Unauthorized', () => {
    return request(app.getHttpServer())
      .get('/users/me')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toContain('Unauthorized');
      });
  });

  it('/assessments (GET) - unauthenticated request should return 401 Unauthorized', () => {
    return request(app.getHttpServer())
      .get('/assessments')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toContain('Unauthorized');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
