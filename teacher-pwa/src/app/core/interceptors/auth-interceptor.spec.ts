import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth-interceptor';
import { AuthService } from '../services/auth.service';

@Component({ template: '' })
class DummyComponent {}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'teacher/dashboard', component: DummyComponent },
          { path: 'parent/dashboard', component: DummyComponent },
          { path: 'student/dashboard', component: DummyComponent },
          { path: 'admin/dashboard', component: DummyComponent },
        ]),
        AuthService,
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach Authorization and X-Branch-Id headers when logged in', () => {
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authService.demoLogin('teacher', 'teacher@ppvs.edu.kh');

    http.get('/test-api').subscribe();

    const req = httpMock.expectOne('/test-api');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toContain('mock_jwt_token');
    expect(req.request.headers.has('X-Branch-Id')).toBe(true);
    expect(req.request.headers.get('X-Branch-Id')).toBe('branch_pp_01');
  });

  it('should pass request untouched when not logged in', () => {
    http.get('/test-api').subscribe();

    const req = httpMock.expectOne('/test-api');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('X-Branch-Id')).toBe(false);
  });
});
