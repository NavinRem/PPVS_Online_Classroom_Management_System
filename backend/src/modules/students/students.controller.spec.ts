import { Test, TestingModule } from '@nestjs/testing';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditUserContext } from '../auth/current-user.decorator';

describe('StudentsController (Unit)', () => {
  let controller: StudentsController;
  let studentsService: {
    findByParentId: jest.Mock;
    getStudentMonthlyDashboard: jest.Mock;
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockUserContext: AuditUserContext = {
    uid: 'u123',
    email: 'parent@test.kh',
    role: 'parent',
  };

  beforeEach(async () => {
    studentsService = {
      findByParentId: jest.fn(),
      getStudentMonthlyDashboard: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [{ provide: StudentsService, useValue: studentsService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StudentsController>(StudentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyChildren', () => {
    it('should delegate to StudentsService.findByParentId with context uid', async () => {
      const mockChildren = [{ id: 'child1' }];
      studentsService.findByParentId.mockResolvedValue(mockChildren);

      const result = await controller.getMyChildren(mockUserContext);
      expect(result).toEqual(mockChildren);
      expect(studentsService.findByParentId).toHaveBeenCalledWith('u123');
    });
  });

  describe('getStudentMonthlyDashboard', () => {
    it('should delegate to StudentsService.getStudentMonthlyDashboard passing context role and uid', async () => {
      const mockDashboard = { studentId: 'student_123', monthlyReport: {} };
      studentsService.getStudentMonthlyDashboard.mockResolvedValue(
        mockDashboard,
      );

      const result = await controller.getStudentMonthlyDashboard(
        'student_123',
        mockUserContext,
        '2026-07',
      );
      expect(result).toEqual(mockDashboard);
      expect(studentsService.getStudentMonthlyDashboard).toHaveBeenCalledWith(
        'student_123',
        '2026-07',
        'u123',
        'parent',
      );
    });

    it('should default role to parent if missing in context', async () => {
      const contextWithoutRole: AuditUserContext = {
        uid: 'u456',
        email: 'test',
      };
      await controller.getStudentMonthlyDashboard(
        'student_123',
        contextWithoutRole,
      );
      expect(studentsService.getStudentMonthlyDashboard).toHaveBeenCalledWith(
        'student_123',
        undefined,
        'u456',
        'parent', // Defaulted role
      );
    });
  });

  describe('create', () => {
    it('should inject parentId from context and delegate to StudentsService.create', async () => {
      const dto: CreateStudentDto = {
        fullName: 'New Kid',
        age: 10,
        gradeLevel: 'G4',
        dateOfBirth: new Date(),
        parentId: '',
      };

      const expected = { id: 'new_id', message: 'Created' };
      studentsService.create.mockResolvedValue(expected);

      const result = await controller.create(dto, mockUserContext);
      expect(result).toEqual(expected);
      expect(studentsService.create).toHaveBeenCalledWith({
        ...dto,
        parentId: 'u123', // Injected securely
      });
    });
  });

  describe('findAll', () => {
    it('should delegate to StudentsService.findAll with branchId query', async () => {
      studentsService.findAll.mockResolvedValue([]);
      await controller.findAll('branch_xyz');
      expect(studentsService.findAll).toHaveBeenCalledWith('branch_xyz');
    });
  });

  describe('findOne', () => {
    it('should delegate to StudentsService.findOne', async () => {
      studentsService.findOne.mockResolvedValue({ id: 'target_id' });
      await controller.findOne('target_id');
      expect(studentsService.findOne).toHaveBeenCalledWith('target_id');
    });
  });

  describe('update', () => {
    it('should delegate to StudentsService.update', async () => {
      const dto: UpdateStudentDto = { fullName: 'Updated' };
      studentsService.update.mockResolvedValue({ id: 'target_id' });

      await controller.update('target_id', dto);
      expect(studentsService.update).toHaveBeenCalledWith('target_id', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to StudentsService.remove', async () => {
      studentsService.remove.mockResolvedValue({ id: 'target_id' });
      await controller.remove('target_id');
      expect(studentsService.remove).toHaveBeenCalledWith('target_id');
    });
  });
});
