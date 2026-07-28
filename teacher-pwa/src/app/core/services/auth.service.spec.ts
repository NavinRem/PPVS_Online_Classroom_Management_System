import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({ template: '' })
class DummyComponent {}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
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
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and initialized with null user', () => {
    expect(service).toBeTruthy();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should login via demoLogin and navigate correctly for teacher role', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    service.demoLogin('teacher', 'teacher@ppvs.edu.kh');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.role).toBe('teacher');
    expect(service.currentUser()?.email).toBe('teacher@ppvs.edu.kh');
    expect(navigateSpy).toHaveBeenCalledWith(['/teacher/dashboard']);
  });

  it('should clear user state on logout', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    service.demoLogin('teacher', 'teacher@ppvs.edu.kh');
    service.logout();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
