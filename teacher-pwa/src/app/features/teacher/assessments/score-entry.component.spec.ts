import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ScoreEntryComponent } from './score-entry.component';
import { AttendanceService } from '../../attendance/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClassInfo, StudentInfo } from '../../../models/class.model';
import { AssessmentInfo } from '../../../models/assessment.model';

describe('ScoreEntryComponent', () => {
  let component: ScoreEntryComponent;
  let fixture: ComponentFixture<ScoreEntryComponent>;
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
    { id: 'stud_1', name: 'Sok Dara', gender: 'Male', parentId: 'parent_1' },
  ];
  const mockAssessments: AssessmentInfo[] = [
    {
      id: 'a_1',
      classId: 'class_eng_01',
      title: 'Unit 1 Quiz',
      maxScore: 20,
      weight: 15,
    },
  ];

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ScoreEntryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AttendanceService,
        AuthService,
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ScoreEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const classesReq = httpMock.expectOne(
      'http://localhost:3000/classes?teacherId=teacher_user_001',
    );
    classesReq.flush(mockClasses);

    // Initial class select triggers students and assessments loading
    const studentsReq = httpMock.expectOne('http://localhost:3000/classes/class_eng_01/students');
    studentsReq.flush(mockStudents);

    const assessReq = httpMock.expectOne('http://localhost:3000/assessments?classId=class_eng_01');
    assessReq.flush(mockAssessments);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create score entry component and load assessments', () => {
    expect(component).toBeTruthy();
    expect(component.assessments().length).toBe(1);
    expect(component.selectedAssessment()?.title).toBe('Unit 1 Quiz');
  });

  it('should update student score within valid range', () => {
    const firstStudentId = component.students()[0].id;
    component.updateScore(firstStudentId, '18');
    expect(component.studentScores()[firstStudentId]).toBe(18);
  });
});
