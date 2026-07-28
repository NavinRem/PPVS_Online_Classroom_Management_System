import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsService } from './assessments.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { StudentsService } from '../students/students.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CreateAssessmentDto,
  RecordGradeDto,
} from './dto/create-assessment.dto';

describe('AssessmentsService (Unit)', () => {
  let service: AssessmentsService;
  let studentsService: jest.Mocked<Partial<StudentsService>>;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;
  let mockFirebaseService: any;
  let mockAssessmentsCollection: any;
  let mockStudentGradesCollection: any;
  let mockClassesCollection: any;
  let mockEnrollmentsCollection: any;
  let mockStudentsCollection: any;

  beforeAll(async () => {
    studentsService = {
      findOne: jest.fn(),
    };
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    const mockAssessmentDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'assessment1',
        data: () => ({
          classId: 'class1',
          title: 'Midterm Calculus Exam',
          type: 'exam',
          maxScore: 100,
          dueDate: '2026-08-01',
        }),
      }),
      set: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
    };

    mockAssessmentsCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'assessment1',
            data: () => ({
              classId: 'class1',
              title: 'Midterm Calculus Exam',
              type: 'exam',
              maxScore: 100,
              dueDate: '2026-08-01',
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: 'new_assessment_id' }),
      doc: jest.fn((docId: string) => {
        if (docId === 'assessment1' || docId === 'new_assessment_id')
          return mockAssessmentDoc;
        return {
          get: jest.fn().mockResolvedValue({ exists: false }),
          delete: jest.fn().mockResolvedValue(true),
        };
      }),
    };

    const mockGradeDoc = {
      update: jest.fn().mockResolvedValue(true),
    };

    mockStudentGradesCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'grade1',
            data: () => ({
              assessmentId: 'assessment1',
              studentId: 'student1',
              score: 95,
              comments: 'Excellent',
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: 'new_grade_id' }),
      doc: jest.fn(() => mockGradeDoc),
    };

    mockClassesCollection = {
      doc: jest.fn((docId: string) => {
        return {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: docId,
            data: () => ({
              name: 'Calculus Advanced',
              teacherId: 'teacher_mock',
            }),
          }),
        };
      }),
    };

    mockEnrollmentsCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'enrollment1',
            data: () => ({
              studentId: 'student1',
              classId: 'class1',
              status: 'active',
            }),
          },
        ],
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
          if (colName === 'assessments') return mockAssessmentsCollection;
          if (colName === 'student_grades') return mockStudentGradesCollection;
          if (colName === 'classes') return mockClassesCollection;
          if (colName === 'enrollments') return mockEnrollmentsCollection;
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
        AssessmentsService,
        { provide: StudentsService, useValue: studentsService },
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD Operations', () => {
    it('should create an assessment (`create`)', async () => {
      const dto: CreateAssessmentDto = {
        classId: 'class1',
        title: 'Midterm Calculus Exam',
        type: 'exam',
        maxScore: 100,
        dueDate: '2026-08-01',
      };
      const result = await service.createAssessment(dto);
      expect(result).toHaveProperty('id', 'new_assessment_id');
      expect(mockAssessmentsCollection.add).toHaveBeenCalled();
    });

    it('should find all assessments (`findAll`)', async () => {
      const results = await service.findAll();
      expect(Array.isArray(results)).toBe(true);
      expect(results[0].id).toBe('assessment1');
    });

    it('should find one assessment by ID (`findOne`)', async () => {
      const result = await service.findOne('assessment1');
      expect(result).toHaveProperty('id', 'assessment1');
      expect(result).toHaveProperty('title', 'Midterm Calculus Exam');
    });

    it('should update an assessment (`update`)', async () => {
      const result = await service.update('assessment1', { maxScore: 120 });
      expect(result).toHaveProperty('id', 'assessment1');
    });

    it('should remove an assessment (`remove`)', async () => {
      const result = await service.remove('assessment1');
      expect(result).toHaveProperty('id', 'assessment1');
    });
  });

  describe('Workflow Operations', () => {
    const classId = 'class1';
    const studentId = 'student1';
    const assessmentId = 'assessment1';

    it('should record a student grade - updating existing (`recordGrade`)', async () => {
      const gradeDto: RecordGradeDto = {
        assessmentId,
        studentId,
        score: 95,
        comments: 'Excellent mastery',
      };

      const result = await service.recordGrade(gradeDto, {
        uid: 'teacher_mock',
        role: 'teacher',
      });
      expect(result).toHaveProperty('id', 'grade1');
      expect(result.message).toContain('updated successfully');
    });

    it('should record a student grade - creating new (`recordGrade`)', async () => {
      // Mock empty to trigger creation
      (mockStudentGradesCollection.get as jest.Mock).mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const gradeDto: RecordGradeDto = {
        assessmentId,
        studentId,
        score: 90,
      };

      const result = await service.recordGrade(gradeDto, {
        uid: 'teacher_mock',
        role: 'teacher',
      });
      expect(result).toHaveProperty('id', 'new_grade_id');
      expect(result.message).toContain('recorded successfully');
    });

    it('should throw InternalServerErrorException when recordGrade fails', async () => {
      (mockStudentGradesCollection.get as jest.Mock).mockRejectedValueOnce(
        new Error('DB error'),
      );
      await expect(service.recordGrade({} as RecordGradeDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should compute exact overall percentage and GPA equivalent (`getStudentPerformanceSummary`)', async () => {
      (studentsService.findOne as jest.Mock).mockResolvedValueOnce({
        id: studentId,
      });

      const summary = await service.getStudentPerformanceSummary(
        studentId,
        studentId,
        'student',
      );
      expect(summary.studentId).toBe(studentId);
      expect(summary.totalAssessments).toBeGreaterThanOrEqual(1);
      expect(summary.overallPercentage).toBe('95%');
      expect(summary.gpaEquivalent).toBe('4.0 (A)');
    });

    it('should compute student monthly score percentage, band, and class rank (`getStudentMonthlyReport`)', async () => {
      (studentsService.findOne as jest.Mock).mockResolvedValue({
        id: studentId,
      });

      // Target month must match the mocked dates. We mocked assessment dueDate '2026-08-01'. Let's ask for '2026-08'
      const monthlyReport = await service.getStudentMonthlyReport(
        studentId,
        '2026-08',
        studentId,
        'student',
      );
      expect(monthlyReport.studentId).toBe(studentId);
      expect(monthlyReport.month).toBe('2026-08');
      expect(monthlyReport.totalAssessments).toBeGreaterThanOrEqual(1);
      expect(monthlyReport.monthlyPercentage).toBe('95%');
      expect(monthlyReport.evaluationBand).toBe('Excellent');
      expect(monthlyReport.classRanking).toContain('1 out of 1 students');
    });

    it('should compute class monthly leaderboard and student ranks (`getClassMonthlySummary`)', async () => {
      (studentsService.findOne as jest.Mock).mockResolvedValue({
        id: studentId,
      });

      const classSummary = await service.getClassMonthlySummary(
        classId,
        '2026-08',
        'teacher_mock',
        'teacher',
      );
      expect(classSummary.classId).toBe(classId);
      expect(classSummary.month).toBe('2026-08');
      expect(Array.isArray(classSummary.leaderboard)).toBe(true);
      expect(classSummary.leaderboard.length).toBe(1);
      expect(classSummary.leaderboard[0].studentName).toBe('Sonavin Rem');
      expect(classSummary.leaderboard[0].monthlyPercentage).toBe('95%');
    });

    it('should enforce RBAC teacher class ownership and throw ForbiddenException for another teacher', async () => {
      await expect(
        service.getClassMonthlySummary(
          classId,
          '2026-08',
          'other_teacher_id',
          'teacher',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce ownership and throw ForbiddenException for unauthorized parent', async () => {
      (studentsService.findOne as jest.Mock).mockResolvedValueOnce({
        id: studentId,
        parentId: 'legit_parent_id',
      });

      await expect(
        service.getStudentPerformanceSummary(
          studentId,
          'fake_parent_id',
          'parent',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fetch class assessments correctly (`getClassAssessments`)', async () => {
      const results = await service.getClassAssessments(
        classId,
        'teacher_mock',
        'teacher',
      );
      expect(Array.isArray(results)).toBe(true);
      expect(results[0].id).toBe('assessment1');
    });

    it('should throw InternalServerErrorException for getClassAssessments if queries fail', async () => {
      (mockAssessmentsCollection.get as jest.Mock).mockRejectedValueOnce(
        new Error('DB Error'),
      );
      await expect(
        service.getClassAssessments(classId, 'teacher_mock', 'teacher'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
