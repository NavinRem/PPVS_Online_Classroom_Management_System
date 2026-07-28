import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';

@Component({ template: '' })
class DummyComponent {}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch tabs and clear error messages', () => {
    component.errorMessage.set('Old error');
    component.switchTab('phone');
    expect(component.activeTab()).toBe('phone');
    expect(component.errorMessage()).toBe('');
  });

  it('should select user role and clear error messages', () => {
    component.errorMessage.set('Old error');
    component.selectRole('parent');
    expect(component.selectedRole()).toBe('parent');
    expect(component.errorMessage()).toBe('');
  });

  it('should validate empty inputs when submitting', () => {
    component.emailInput = '';
    component.onSubmit();
    expect(component.errorMessage()).toContain('Please enter your Email address');
    expect(component.isLoading()).toBe(false);
  });

  it('should switch between signin and signup modes and restrict teacher/admin public signup', () => {
    component.selectRole('teacher');
    component.switchMode('signup');
    expect(component.authMode()).toBe('signup');
    expect(component.signUpRole()).toBe('parent');

    component.selectRole('teacher');
    expect(component.errorMessage()).toContain('Public sign-up is strictly restricted');
  });

  it('should set loading and message on Google sign in', () => {
    component.onGoogleSignIn();
    expect(component.isLoading()).toBe(true);
    expect(component.successMessage()).toContain('Verifying Google account');
  });
});
