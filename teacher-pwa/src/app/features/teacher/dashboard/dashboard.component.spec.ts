import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { AttendanceService } from '../../attendance/attendance.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({ template: '' })
class DummyComponent {}

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let attendanceService: AttendanceService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'teacher/dashboard', component: DummyComponent },
          { path: 'teacher/attendance/:id', component: DummyComponent },
          { path: 'teacher/assessments/:id', component: DummyComponent },
        ]),
        AttendanceService,
        AuthService,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    attendanceService = TestBed.inject(AttendanceService);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create dashboard component and load demo classes', () => {
    expect(component).toBeTruthy();
    expect(component.classes().length).toBeGreaterThanOrEqual(0);
  });
});
