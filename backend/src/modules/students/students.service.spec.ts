import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { AttendanceService } from '../attendance/attendance.service';
import { CreateStudentDto } from './dto/create-student.dto';
import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('StudentsService (Unit)', () => {
  let service: StudentsService;
  let assessmentsService: jest.Mocked<Partial<AssessmentsService>>;
  let attendanceService: jest.Mocked<Partial<AttendanceService>>;
  let mockFirebaseService: any;

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

    const parentId = 'parent_dashboard_123'; // Hardcoded to match tests

    mockFirebaseService = {
      firestore: {
        collection: jest.fn((colName: string) => {
          if (colName === 'students') {
            return {
              where: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue({
                docs: [
                  {
                    id: 'student_dashboard_test',
                    data: () => ({ parentId, fullName: 'Unified Student' }),
                  },
                ],
              }),
              add: jest.fn().mockResolvedValue({ id: 'new_student_id' }),
              doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  exists: true,
                  id: 'student_dashboard_test',
                  data: () => ({ parentId, fullName: 'Unified Student' }),
                }),
                set: jest.fn().mockResolvedValue(true),
                update: jest.fn().mockResolvedValue(true),
                delete: jest.fn().mockResolvedValue(true),
              }),
            };
          }
          if (colName === 'enrollments') {
            return {
              where: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue({
                docs: [
                  {
                    id: 'enr1',
                    data: () => ({ classId: 'cls1', status: 'active' }),
                  },
                ],
              }),
            };
          }
          if (colName === 'classes') {
            return {
              doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  exists: true,
                  id: 'cls1',
                  data: () => ({ name: 'Math 101' }),
                }),
              }),
            };
          }
          if (colName === 'invoices') {
            return {
              get: jest.fn().mockResolvedValue({
                docs: [
                  {
                    id: 'inv1',
                    data: () => ({
                      studentId: 'student_dashboard_test',
                      status: 'pending_payment',
                    }),
                  },
                ],
              }),
            };
          }
          // Default fallback
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockRejectedValue(new Error('Mock Offline')),
            add: jest.fn().mockRejectedValue(new Error('Mock Offline')),
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockRejectedValue(new Error('Mock Offline')),
              set: jest.fn().mockRejectedValue(new Error('Mock Offline')),
              update: jest.fn().mockRejectedValue(new Error('Mock Offline')),
              delete: jest.fn().mockRejectedValue(new Error('Mock Offline')),
            }),
          };
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: AssessmentsService, useValue: assessmentsService },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    // Note: We don't need module.init() unless there are OnModuleInit hooks we care about testing,
    // and since we mocked FirebaseService, we skip its onModuleInit logic.
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD & Parent Query (`create`, `findByParentId`)', () => {
    const parentId = 'parent_dashboard_123';

    it('should create a student profile linked to parent', async () => {
      const dto: CreateStudentDto = {
        fullName: 'Sonavin Rem',
        dateOfBirth: new Date('2010-05-15'),
        age: 16,
        gradeLevel: 'Grade 10',
        parentId,
      };

      const result = await service.create(dto);
      expect(result).toHaveProperty('id', 'new_student_id');
    });

    it('should find students by parentId (`findByParentId`)', async () => {
      const children = await service.findByParentId(parentId);
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBeGreaterThan(0);
      expect(children[0]).toHaveProperty('id', 'student_dashboard_test');
    });

    it('should throw InternalServerErrorException if findByParentId queries fail', async () => {
      // Temporarily mock an error on the firestore collection
      jest
        .spyOn(mockFirebaseService.firestore, 'collection')
        .mockImplementationOnce(() => {
          throw new Error('Database down');
        });

      await expect(service.findByParentId('some_parent')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Unified PPVS Monthly Dashboard (`getStudentMonthlyDashboard`)', () => {
    const studentId = 'student_dashboard_test';

    // In our mock for 'students'.doc().get(), we return: parentId: parent_dashboard_123.
    // So the requesterUid MUST match parent_dashboard_123 to pass the verifyStudentAccess check for role 'parent'.

    it('should return unified dashboard containing profile, report card, attendance, schedule, and invoices when accessed by parent or admin', async () => {
      const dashboard = await service.getStudentMonthlyDashboard(
        studentId,
        '2026-07',
        'parent_dashboard_123', // Matches parentId in mock
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
      expect(dashboard.activeEnrollments[0]).toHaveProperty('classId', 'cls1');
      expect(dashboard).toHaveProperty('pendingInvoices');
      expect(dashboard.pendingInvoices[0]).toHaveProperty('id', 'inv1');
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

    it('should throw InternalServerErrorException when fetching monthly report fails', async () => {
      (
        assessmentsService.getStudentMonthlyReport as jest.Mock
      ).mockRejectedValueOnce(new Error('Assessments Error'));

      await expect(
        service.getStudentMonthlyDashboard(
          studentId,
          '2026-07',
          'parent_dashboard_123',
          'parent',
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
