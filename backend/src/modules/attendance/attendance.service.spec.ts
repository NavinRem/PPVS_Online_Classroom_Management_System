import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { StudentsService } from '../students/students.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BatchCheckInDto } from './dto/check-in.dto';

describe('AttendanceService (Unit)', () => {
  let service: AttendanceService;
  let studentsService: jest.Mocked<Partial<StudentsService>>;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;
  let mockFirebaseService: any;
  let mockAttendanceCollection: any;
  let mockClassesCollection: any;
  let mockStudentsCollection: any;

  beforeAll(async () => {
    studentsService = {
      findOne: jest.fn(),
    };
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    const mockAttendanceDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'record1',
        data: () => ({
          classId: 'class1',
          date: '2026-07-15',
          records: [
            { studentId: 'student1', status: 'present', notes: 'On time' },
          ],
        }),
      }),
      set: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
    };

    mockAttendanceCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'record1',
            data: () => ({
              classId: 'class1',
              date: '2026-07-15',
              records: [
                { studentId: 'student1', status: 'present', notes: 'On time' },
              ],
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: 'new_record_id' }),
      doc: jest.fn((docId: string) => {
        if (docId === 'record1' || docId === 'new_record_id')
          return mockAttendanceDoc;
        return {
          get: jest.fn().mockResolvedValue({ exists: false }),
          delete: jest.fn().mockResolvedValue(true),
        };
      }),
    };

    mockClassesCollection = {
      doc: jest.fn((docId: string) => {
        return {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: docId,
            data: () => ({ name: 'Test Class', teacherId: 'teacher_mock' }),
          }),
        };
      }),
    };

    mockStudentsCollection = {
      doc: jest.fn((docId: string) => {
        return {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: docId,
            data: () => ({ firstName: 'Sonavin', lastName: 'Rem' }),
          }),
        };
      }),
    };

    mockFirebaseService = {
      firestore: {
        collection: jest.fn((colName: string) => {
          if (colName === 'attendance_records') return mockAttendanceCollection;
          if (colName === 'classes') return mockClassesCollection;
          if (colName === 'students') return mockStudentsCollection;

          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: [] }),
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
            })),
          };
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: StudentsService, useValue: studentsService },
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD Operations', () => {
    it('should create an attendance record (`create`)', async () => {
      const dto: BatchCheckInDto = {
        classId: 'class1',
        date: '2026-07-15',
        records: [
          { studentId: 'student1', status: 'present', notes: 'On time' },
        ],
      };
      const result = await service.create(dto);
      expect(result).toHaveProperty('id', 'new_record_id');
      expect(mockAttendanceCollection.add).toHaveBeenCalled();
    });

    it('should find all attendance records (`findAll`)', async () => {
      const results = await service.findAll();
      expect(Array.isArray(results)).toBe(true);
      expect(results[0].id).toBe('record1');
    });

    it('should find one attendance record by ID (`findOne`)', async () => {
      const result = await service.findOne('record1');
      expect(result).toHaveProperty('id', 'record1');
      expect(result).toHaveProperty('classId', 'class1');
    });

    it('should update an attendance record (`update`)', async () => {
      const result = await service.update('record1', { records: [] });
      expect(result).toHaveProperty('id', 'record1');
    });

    it('should remove an attendance record (`remove`)', async () => {
      const result = await service.remove('record1');
      expect(result).toHaveProperty('id', 'record1');
    });
  });

  describe('Workflow Operations', () => {
    const classId = 'class1';
    const date = '2026-07-15';
    const studentId = 'student1';

    it('should perform batchCheckIn with custom status (`homeworked`) updating existing', async () => {
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

      expect(result).toHaveProperty('id', 'record1');
      expect(result.message).toContain('saved successfully');
      expect(auditLogsService.logAction).toHaveBeenCalled();
    });

    it('should perform batchCheckIn creating new record if empty', async () => {
      (mockAttendanceCollection.get as jest.Mock).mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const checkInDto: BatchCheckInDto = {
        classId,
        date,
        records: [{ studentId, status: 'present' }],
      };

      const result = await service.batchCheckIn(checkInDto, {
        uid: 'teacher_mock',
        role: 'teacher',
      });
      expect(result).toHaveProperty('id', 'new_record_id');
    });

    it('should throw InternalServerErrorException when batchCheckIn fails', async () => {
      (mockAttendanceCollection.get as jest.Mock).mockRejectedValueOnce(
        new Error('DB error'),
      );
      await expect(service.batchCheckIn({} as BatchCheckInDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should calculate exact metrics and engagement percentage (`getStudentAttendanceHistory`)', async () => {
      (studentsService.findOne as jest.Mock).mockResolvedValueOnce({
        id: studentId,
      });

      const summary = await service.getStudentAttendanceHistory(
        studentId,
        'teacher_mock',
        'teacher',
      );
      expect(summary.studentId).toBe(studentId);
      expect(summary.totalSessions).toBe(1);
      expect(summary.metrics.presentCount).toBe(1);
      expect(summary.metrics.engagementPercentage).toBe('100%');
    });

    it('should throw ForbiddenException for getStudentAttendanceHistory with unauthorized parent', async () => {
      (studentsService.findOne as jest.Mock).mockResolvedValueOnce({
        id: studentId,
        parentId: 'real_parent',
      });

      await expect(
        service.getStudentAttendanceHistory(studentId, 'fake_parent', 'parent'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should calculate student monthly attendance breakdown (`getStudentMonthlyAttendance`)', async () => {
      (studentsService.findOne as jest.Mock).mockResolvedValueOnce({
        id: studentId,
      });

      const monthlySummary = await service.getStudentMonthlyAttendance(
        studentId,
        '2026-07',
        'teacher_mock',
        'teacher',
      );
      expect(monthlySummary.studentId).toBe(studentId);
      expect(monthlySummary.month).toBe('2026-07');
      expect(monthlySummary.totalSessions).toBe(1);
      expect(monthlySummary.metrics.presentCount).toBe(1);
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
      expect(classMetrics.totalCheckInDates).toBe(1);
      expect(classMetrics.averageClassAttendanceRate).toBe('100%');
      expect(Array.isArray(classMetrics.studentMetrics)).toBe(true);
      expect(classMetrics.studentMetrics[0].studentId).toBe(studentId);
    });

    it('should throw ForbiddenException for getClassMonthlyMetrics with unassigned teacher', async () => {
      await expect(
        service.getClassMonthlyMetrics(
          classId,
          '2026-07',
          'other_teacher',
          'teacher',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fetch class attendance by date correctly (`getClassDateAttendance`)', async () => {
      const res = await service.getClassDateAttendance(
        classId,
        date,
        'teacher_mock',
        'teacher',
      );
      expect(res).toHaveProperty('id', 'record1');
      expect(res).toHaveProperty('date', date);
    });

    it('should return empty records if getClassDateAttendance yields empty', async () => {
      (mockAttendanceCollection.get as jest.Mock).mockResolvedValueOnce({
        empty: true,
        docs: [],
      });
      const res = await service.getClassDateAttendance(classId, '2026-07-20');
      expect(res.records).toEqual([]);
    });
  });
});
