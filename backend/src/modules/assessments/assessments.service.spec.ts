import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsService } from './assessments.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { StudentsService } from '../students/students.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException } from '@nestjs/common';
import {
  CreateAssessmentDto,
  RecordGradeDto,
} from './dto/create-assessment.dto';

describe('AssessmentsService (Unit & Integration)', () => {
  let service: AssessmentsService;
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
        AssessmentsService,
        { provide: StudentsService, useValue: studentsService },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    await module.init();
    service = module.get<AssessmentsService>(AssessmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD Operations (`create`, `findAll`, `findOne`, `update`, `remove`)', () => {
    let createdId: string;

    it('should create an assessment (`create`)', async () => {
      const dto: CreateAssessmentDto = {
        classId: 'class_assess_crud_1',
        title: 'Midterm Calculus Exam',
        type: 'exam',
        maxScore: 100,
        dueDate: '2026-08-01',
      };
      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('successfully created');
      createdId = result.id;
    });

    it('should find all assessments (`findAll`)', async () => {
      const results = await service.findAll();
      expect(Array.isArray(results)).toBe(true);
      const found = results.find((r) => r.id === createdId);
      expect(found).toBeDefined();
    });

    it('should find one assessment by ID (`findOne`)', async () => {
      const result = await service.findOne(createdId);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', createdId);
      expect(result).toHaveProperty('title', 'Midterm Calculus Exam');
    });

    it('should update an assessment (`update`)', async () => {
      const updateData = {
        title: 'Midterm Calculus Exam - Updated',
        maxScore: 120,
      };
      const result = await service.update(createdId, updateData);
      expect(result).toHaveProperty('id', createdId);
      expect(result.message).toContain('successfully updated');
      const fetched = (await service.findOne(
        createdId,
      )) as unknown as CreateAssessmentDto;
      expect(fetched.title).toBe('Midterm Calculus Exam - Updated');
    });

    it('should remove an assessment (`remove`)', async () => {
      const result = await service.remove(createdId);
      expect(result).toHaveProperty('id', createdId);
      expect(result.message).toContain('successfully deleted');
    });
  });

  describe('Workflow Operations (`recordGrade`, `getStudentPerformanceSummary`, and PPVS Monthly APIs)', () => {
    let assessmentId: string;
    const runId = Date.now();
    const classId = `class_assess_wf_${runId}`;
    const studentId = `student_assess_wf_${runId}`;

    beforeAll(async () => {
      await service.firebase.firestore.collection('classes').doc(classId).set({
        name: 'Calculus Advanced',
        teacherId: 'teacher_mock',
        createdAt: new Date().toISOString(),
      });

      await service.firebase.firestore
        .collection('enrollments')
        .doc(`enrollment_assess_${runId}`)
        .set({
          studentId,
          classId,
          status: 'active',
          createdAt: new Date().toISOString(),
        });

      const dto: CreateAssessmentDto = {
        classId,
        title: 'Final Physics Exam',
        type: 'exam',
        maxScore: 100,
        dueDate: '2026-07-15',
      };
      const res = await service.create(dto);
      assessmentId = res.id;
    });

    it('should record a student grade (`recordGrade`)', async () => {
      const gradeDto: RecordGradeDto = {
        assessmentId,
        studentId,
        score: 95,
        comments: 'Excellent mastery of mechanics',
      };
      const result = await service.recordGrade(gradeDto, {
        uid: 'teacher_mock',
        role: 'teacher',
      });
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('recorded successfully');
    });

    it('should compute exact overall percentage and GPA equivalent (`getStudentPerformanceSummary`)', async () => {
      const summary = await service.getStudentPerformanceSummary(
        studentId,
        'teacher_mock',
        'teacher',
      );
      expect(summary.studentId).toBe(studentId);
      expect(summary.totalAssessments).toBeGreaterThanOrEqual(1);
      expect(summary.overallPercentage).toBe('95%');
      expect(summary.gpaEquivalent).toBe('4.0 (A)');
    });

    it('should compute student monthly score percentage, band, and class rank (`getStudentMonthlyReport`)', async () => {
      const monthlyReport = await service.getStudentMonthlyReport(
        studentId,
        '2026-07',
        'teacher_mock',
        'teacher',
      );
      expect(monthlyReport.studentId).toBe(studentId);
      expect(monthlyReport.month).toBe('2026-07');
      expect(monthlyReport.totalAssessments).toBeGreaterThanOrEqual(1);
      expect(monthlyReport.monthlyPercentage).toBe('95%');
      expect(monthlyReport.evaluationBand).toBe('Excellent');
    });

    it('should compute class monthly leaderboard and student ranks (`getClassMonthlySummary`)', async () => {
      (studentsService.findOne as jest.Mock).mockResolvedValueOnce({
        id: studentId,
        firstName: 'Sonavin',
        lastName: 'Rem',
      });

      const classSummary = await service.getClassMonthlySummary(
        classId,
        '2026-07',
        'teacher_mock',
        'teacher',
      );
      expect(classSummary.classId).toBe(classId);
      expect(classSummary.month).toBe('2026-07');
      expect(Array.isArray(classSummary.leaderboard)).toBe(true);
      expect(classSummary.leaderboard.length).toBeGreaterThanOrEqual(1);
      expect(classSummary.leaderboard[0].monthlyPercentage).toBe('95%');
    });

    it('should enforce RBAC teacher class ownership and throw ForbiddenException for another teacher', async () => {
      await expect(
        service.getClassMonthlySummary(
          classId,
          '2026-07',
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
  });
});
