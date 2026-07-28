import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AttendanceCheckInComponent } from './attendance-check-in.component';
import { AttendanceService } from './attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { ClassInfo, StudentInfo } from '../../models/class.model';

describe('AttendanceCheckInComponent', () => {
  let component: AttendanceCheckInComponent;
  let fixture: ComponentFixture<AttendanceCheckInComponent>;
  let httpMock: HttpTestingController;

  const mockClasses: ClassInfo[] = [
    {
      id: 'class_eng_01',
      name: 'English Grade 10',
      subject: 'English',
      gradeLevel: '10',
      roomNumber: '204',
      teacherId: 'teacher_user_001',
      maxStudents: 30,
      currentEnrollment: 25,
    },
  ];

  const mockStudents: StudentInfo[] = [
    { id: 's_01', name: 'Sok Dara', gender: 'Male', parentId: 'p_01' },
    { id: 's_02', name: 'Chan Bopha', gender: 'Female', parentId: 'p_02' },
  ];

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AttendanceCheckInComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AttendanceService,
        AuthService,
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AttendanceCheckInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const classesReq = httpMock.expectOne(
      'http://localhost:3000/classes?teacherId=teacher_user_001',
    );
    classesReq.flush(mockClasses);

    // Initial class auto-selection triggers student roster request
    const studentsReq = httpMock.expectOne('http://localhost:3000/classes/class_eng_01/students');
    studentsReq.flush(mockStudents);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create attendance check-in component and set default statuses', () => {
    expect(component).toBeTruthy();
    expect(component.students().length).toBe(2);
    expect(component.getCountForStatus('present')).toBe(2);
  });

  it('should update individual student status on toggle', () => {
    const firstStudentId = component.students()[0].id;
    component.setStatus(firstStudentId, 'homeworked');
    expect(component.studentStatuses()[firstStudentId]).toBe('homeworked');
  });

  it('should update all student statuses when quick mark is used', () => {
    component.setAllStatuses('permission');
    expect(component.getCountForStatus('permission')).toBe(2);
  });
});
