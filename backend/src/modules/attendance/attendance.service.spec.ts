import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { StudentsService } from '../students/students.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException } from '@nestjs/common';
import { BatchCheckInDto } from './dto/check-in.dto';

describe('AttendanceService (Unit & Integration)', () => {
  let service: AttendanceService;
  let studentsService: jest.Mocked<Partial<StudentsService>>;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;

  beforeAll(async () => {
    studentsService = {
      findOne: jest.fn(),
    };
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [
        AttendanceService,
        { provide: StudentsService, useValue: studentsService },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    await module.init();
    service = module.get<AttendanceService>(AttendanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD Operations (`create`, `findAll`, `findOne`, `update`, `remove`)', () => {
    let createdId: string;

    it('should create an attendance record (`create`)', async () => {
      const dto: BatchCheckInDto = {
        classId: 'test_class_crud',
        date: '2026-07-15',
        records: [
          { studentId: 'student_crud_1', status: 'present', notes: 'On time' },
        ],
      };
      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('successfully created');
      createdId = result.id;
    });

    it('should find all attendance records (`findAll`)', async () => {
      const results = await service.findAll();
      expect(Array.isArray(results)).toBe(true);
      const found = results.find((r) => r.id === createdId);
      expect(found).toBeDefined();
    });

    it('should find one attendance record by ID (`findOne`)', async () => {
      const result = await service.findOne(createdId);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', createdId);
      expect(result).toHaveProperty('classId', 'test_class_crud');
    });

    it('should update an attendance record (`update`)', async () => {
      const updateData = {
        records: [
          {
            studentId: 'student_crud_1',
            status: 'homeworked' as const,
            notes: 'Completed extra credit',
          },
        ],
      };
      const result = await service.update(createdId, updateData);
      expect(result).toHaveProperty('id', createdId);
      expect(result.message).toContain('successfully updated');
      const fetched = (await service.findOne(
        createdId,
      )) as unknown as BatchCheckInDto;
      expect(fetched.records[0].status).toBe('homeworked');
    });

    it('should remove an attendance record (`remove`)', async () => {
      const result = await service.remove(createdId);
      expect(result).toHaveProperty('id', createdId);
      expect(result.message).toContain('successfully deleted');
    });
  });

  describe('Workflow Operations (`batchCheckIn`, `getStudentAttendanceHistory`, and PPVS Monthly APIs)', () => {
    const runId = Date.now();
    const classId = `workflow_class_att_${runId}`;
    const date = '2026-07-16';
    const studentId = `workflow_student_att_${runId}`;

    beforeAll(async () => {
      // Create mock class document so teacher ownership verification passes
      await service.firebase.firestore.collection('classes').doc(classId).set({
        name: 'Test Physics Class',
        teacherId: 'teacher_mock',
        createdAt: new Date().toISOString(),
      });
    });

    it('should perform batchCheckIn with custom status (`homeworked`)', async () => {
      const checkInDto: BatchCheckInDto = {
        classId,
        date,
        records: [
          {
            studentId,
            status: 'homeworked',
            notes: 'Attended and submitted assignment',
          },
        ],
      };

      const result = await service.batchCheckIn(checkInDto, {
        uid: 'teacher_mock',
        role: 'teacher',
      });
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('saved successfully');
      expect(auditLogsService.logAction).toHaveBeenCalled();
    });

    it('should calculate exact metrics and engagement percentage (`getStudentAttendanceHistory`)', async () => {
      const summary = await service.getStudentAttendanceHistory(
        studentId,
        'teacher_mock',
        'teacher',
      );
      expect(summary.studentId).toBe(studentId);
      expect(summary.totalSessions).toBeGreaterThanOrEqual(1);
      expect(summary.metrics.homeworkedCount).toBeGreaterThanOrEqual(1);
      expect(summary.metrics.engagementPercentage).toBe('100%');
    });

    it('should calculate student monthly attendance breakdown (`getStudentMonthlyAttendance`)', async () => {
      const monthlySummary = await service.getStudentMonthlyAttendance(
        studentId,
        '2026-07',
        'teacher_mock',
        'teacher',
      );
      expect(monthlySummary.studentId).toBe(studentId);
      expect(monthlySummary.month).toBe('2026-07');
      expect(monthlySummary.totalSessions).toBeGreaterThanOrEqual(1);
      expect(monthlySummary.metrics.homeworkedCount).toBeGreaterThanOrEqual(1);
      expect(monthlySummary.metrics.engagementPercentage).toBe('100%');
    });

    it('should calculate class monthly attendance metrics (`getClassMonthlyMetrics`)', async () => {
      const classMetrics = await service.getClassMonthlyMetrics(
        classId,
        '2026-07',
        'teacher_mock',
        'teacher',
      );
      expect(classMetrics.classId).toBe(classId);
      expect(classMetrics.month).toBe('2026-07');
      expect(classMetrics.totalCheckInDates).toBeGreaterThanOrEqual(1);
      expect(classMetrics.averageClassAttendanceRate).toBe('100%');
      expect(Array.isArray(classMetrics.studentMetrics)).toBe(true);
    });

    it('should enforce RBAC teacher class ownership and throw ForbiddenException when another teacher accesses class metrics', async () => {
      await expect(
        service.getClassMonthlyMetrics(
          classId,
          '2026-07',
          'other_teacher_id',
          'teacher',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce RBAC ownership and throw ForbiddenException when unauthorized parent requests another children history', async () => {
      (studentsService.findOne as jest.Mock).mockResolvedValueOnce({
        id: studentId,
        parentId: 'real_parent_id',
      });

      await expect(
        service.getStudentAttendanceHistory(
          studentId,
          'unauthorized_parent_id',
          'parent',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
