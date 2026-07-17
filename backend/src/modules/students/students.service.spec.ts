import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { AssessmentsService } from '../assessments/assessments.service';
import { AttendanceService } from '../attendance/attendance.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ForbiddenException } from '@nestjs/common';

describe('StudentsService (Unit & Integration)', () => {
  let service: StudentsService;
  let assessmentsService: jest.Mocked<Partial<AssessmentsService>>;
  let attendanceService: jest.Mocked<Partial<AttendanceService>>;

  beforeAll(async () => {
    assessmentsService = {
      getStudentMonthlyReport: jest.fn().mockResolvedValue({
        studentId: 'student_dashboard_test',
        month: '2026-07',
        monthlyPercentage: '92%',
        evaluationBand: 'Grade A (Outstanding)',
      }),
    };

    attendanceService = {
      getStudentMonthlyAttendance: jest.fn().mockResolvedValue({
        studentId: 'student_dashboard_test',
        month: '2026-07',
        metrics: {
          engagementPercentage: '98%',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [
        StudentsService,
        { provide: AssessmentsService, useValue: assessmentsService },
        { provide: AttendanceService, useValue: attendanceService },
      ],
    }).compile();

    await module.init();
    service = module.get<StudentsService>(StudentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD & Parent Query (`create`, `findByParentId`)', () => {
    let createdId: string;
    const runId = Date.now();
    const parentId = `parent_dashboard_${runId}`;

    it('should create a student profile linked to parent', async () => {
      const dto: CreateStudentDto = {
        fullName: 'Sonavin Rem',
        dateOfBirth: new Date('2010-05-15'),
        age: 16,
        gradeLevel: 'Grade 10',
        parentId,
      };
      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      createdId = result.id;
    });

    it('should find students by parentId (`findByParentId`)', async () => {
      const children = await service.findByParentId(parentId);
      expect(Array.isArray(children)).toBe(true);
      const found = children.find((c) => c.id === createdId);
      expect(found).toBeDefined();
    });
  });

  describe('Unified PPVS Monthly Dashboard (`getStudentMonthlyDashboard`)', () => {
    let studentId: string;
    const runId = Date.now();
    const parentId = `parent_unified_${runId}`;

    beforeAll(async () => {
      const dto: CreateStudentDto = {
        fullName: 'Unified Student',
        dateOfBirth: new Date('2011-03-10'),
        age: 15,
        gradeLevel: 'Grade 9',
        parentId,
      };
      const res = await service.create(dto);
      studentId = res.id;
    });

    it('should return unified dashboard containing profile, report card, attendance, schedule, and invoices when accessed by parent or admin', async () => {
      const dashboard = await service.getStudentMonthlyDashboard(
        studentId,
        '2026-07',
        parentId,
        'parent',
      );
      expect(dashboard).toHaveProperty('studentId', studentId);
      expect(dashboard).toHaveProperty('studentProfile');
      expect(dashboard).toHaveProperty('monthlyReport');
      expect(dashboard.monthlyReport).toHaveProperty(
        'monthlyPercentage',
        '92%',
      );
      expect(dashboard).toHaveProperty('monthlyAttendance');
      expect(dashboard).toHaveProperty('activeEnrollments');
      expect(dashboard).toHaveProperty('pendingInvoices');
    });

    it('should throw ForbiddenException if unauthorized parent accesses another student dashboard', async () => {
      await expect(
        service.getStudentMonthlyDashboard(
          studentId,
          '2026-07',
          'other_fake_parent_id',
          'parent',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
