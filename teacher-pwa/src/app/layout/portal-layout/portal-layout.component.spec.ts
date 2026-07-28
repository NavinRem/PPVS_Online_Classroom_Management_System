import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { PortalLayoutComponent } from './portal-layout.component';
import { AuthService } from '../../core/services/auth.service';

@Component({ template: '' })
class DummyComponent {}

describe('PortalLayoutComponent', () => {
  let component: PortalLayoutComponent;
  let fixture: ComponentFixture<PortalLayoutComponent>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PortalLayoutComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'teacher/dashboard', component: DummyComponent },
          { path: 'teacher/attendance', component: DummyComponent },
          { path: 'teacher/assessments', component: DummyComponent },
        ]),
        AuthService,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    authService = TestBed.inject(AuthService);
    authService.demoLogin('teacher', 'teacher@ppvs.edu.kh');

    fixture = TestBed.createComponent(PortalLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create layout and show logged in user profile', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-name')?.textContent).toContain('Teacher Navin');
  });
});
