import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import {
  CreateAssessmentDto,
  RecordGradeDto,
} from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditUserContext } from '../auth/current-user.decorator';

describe('AssessmentsController (Unit)', () => {
  let controller: AssessmentsController;
  let assessmentsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    createAssessment: jest.Mock;
    recordGrade: jest.Mock;
    getClassAssessments: jest.Mock;
    getStudentPerformanceSummary: jest.Mock;
    getStudentMonthlyReport: jest.Mock;
    getClassMonthlySummary: jest.Mock;
  };

  const mockUserContext: AuditUserContext = {
    uid: 'teacher123',
    email: 'teacher@test.kh',
    role: 'teacher',
  };

  beforeEach(async () => {
    assessmentsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createAssessment: jest.fn(),
      recordGrade: jest.fn(),
      getClassAssessments: jest.fn(),
      getStudentPerformanceSummary: jest.fn(),
      getStudentMonthlyReport: jest.fn(),
      getClassMonthlySummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssessmentsController],
      providers: [
        { provide: AssessmentsService, useValue: assessmentsService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AssessmentsController>(AssessmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Standard CRUD and Grades', () => {
    it('should delegate findAll with branchId', async () => {
      assessmentsService.findAll.mockResolvedValue([]);
      await controller.findAll('branch1');
      expect(assessmentsService.findAll).toHaveBeenCalledWith('branch1');
    });

    it('should delegate findOne', async () => {
      assessmentsService.findOne.mockResolvedValue({});
      await controller.findOne('assessment1');
      expect(assessmentsService.findOne).toHaveBeenCalledWith('assessment1');
    });

    it('should delegate update with context', async () => {
      const dto: UpdateAssessmentDto = { maxScore: 50 };
      assessmentsService.update.mockResolvedValue({});
      await controller.update('assessment1', dto, mockUserContext);
      expect(assessmentsService.update).toHaveBeenCalledWith(
        'assessment1',
        dto,
        { uid: 'teacher123', role: 'teacher' },
      );
    });

    it('should delegate remove', async () => {
      assessmentsService.remove.mockResolvedValue({});
      await controller.remove('assessment1');
      expect(assessmentsService.remove).toHaveBeenCalledWith('assessment1');
    });

    it('should delegate createAssessment with context', async () => {
      const dto: CreateAssessmentDto = {
        classId: 'class1',
        title: 'Exam',
        type: 'exam',
        maxScore: 100,
        dueDate: '2026-08-01',
      };
      assessmentsService.createAssessment.mockResolvedValue({});
      await controller.createAssessment(dto, mockUserContext);
      expect(assessmentsService.createAssessment).toHaveBeenCalledWith(dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });

    it('should delegate recordGrade with context', async () => {
      const dto: RecordGradeDto = {
        assessmentId: 'a1',
        studentId: 's1',
        score: 90,
      };
      assessmentsService.recordGrade.mockResolvedValue({});
      await controller.recordGrade(dto, mockUserContext);
      expect(assessmentsService.recordGrade).toHaveBeenCalledWith(dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });
  });

  describe('Aggregations and Reporting', () => {
    it('should delegate getClassAssessments with user context', async () => {
      assessmentsService.getClassAssessments.mockResolvedValue([]);
      await controller.getClassAssessments('class1', mockUserContext);
      expect(assessmentsService.getClassAssessments).toHaveBeenCalledWith(
        'class1',
        'teacher123',
        'teacher',
      );
    });

    it('should delegate getStudentSummary with context defaults (parent)', async () => {
      const parentContext: AuditUserContext = { uid: 'parent1', email: 'p@kh' };
      assessmentsService.getStudentPerformanceSummary.mockResolvedValue({});
      await controller.getStudentSummary('student1', parentContext);
      expect(
        assessmentsService.getStudentPerformanceSummary,
      ).toHaveBeenCalledWith('student1', 'parent1', 'parent');
    });

    it('should delegate getStudentMonthlyReport with month query', async () => {
      assessmentsService.getStudentMonthlyReport.mockResolvedValue({});
      await controller.getStudentMonthlyReport(
        'student1',
        mockUserContext,
        '2026-08',
      );
      expect(assessmentsService.getStudentMonthlyReport).toHaveBeenCalledWith(
        'student1',
        '2026-08',
        'teacher123',
        'teacher',
      );
    });

    it('should delegate getClassMonthlySummary with month query', async () => {
      assessmentsService.getClassMonthlySummary.mockResolvedValue({});
      await controller.getClassMonthlySummary(
        'class1',
        mockUserContext,
        '2026-08',
      );
      expect(assessmentsService.getClassMonthlySummary).toHaveBeenCalledWith(
        'class1',
        '2026-08',
        'teacher123',
        'teacher',
      );
    });
  });
});
