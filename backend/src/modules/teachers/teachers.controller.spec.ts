import { Test, TestingModule } from '@nestjs/testing';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditUserContext } from '../auth/current-user.decorator';

describe('TeachersController (Unit)', () => {
  let controller: TeachersController;
  let teachersService: {
    findByUid: jest.Mock;
    getAssignedClasses: jest.Mock;
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockUserContext: AuditUserContext = {
    uid: 'teacher123',
    email: 'teacher@test.kh',
    role: 'teacher',
  };

  beforeEach(async () => {
    teachersService = {
      findByUid: jest.fn(),
      getAssignedClasses: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeachersController],
      providers: [{ provide: TeachersService, useValue: teachersService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TeachersController>(TeachersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('should delegate to TeachersService.findByUid with context uid', async () => {
      const mockProfile = { id: 'teacher123', fullName: 'Teacher' };
      teachersService.findByUid.mockResolvedValue(mockProfile);

      const result = await controller.getMyProfile(mockUserContext);
      expect(result).toEqual(mockProfile);
      expect(teachersService.findByUid).toHaveBeenCalledWith('teacher123');
    });
  });

  describe('getMyAssignedClasses', () => {
    it('should delegate to TeachersService.getAssignedClasses passing context uid', async () => {
      const mockClasses = [{ id: 'class1', name: 'Math' }];
      teachersService.getAssignedClasses.mockResolvedValue(mockClasses);

      const result = await controller.getMyAssignedClasses(mockUserContext);
      expect(result).toEqual(mockClasses);
      expect(teachersService.getAssignedClasses).toHaveBeenCalledWith(
        'teacher123',
      );
    });
  });

  describe('create', () => {
    it('should delegate to TeachersService.create with context role and uid', async () => {
      const dto: CreateTeacherDto = {
        uid: 'newTeacher',
        fullName: 'New Teacher',
        email: 't@test.kh',
        phoneNumber: '012',
        specialization: 'Art',
      };

      const expected = { id: 'new_id', message: 'Created' };
      teachersService.create.mockResolvedValue(expected);

      const result = await controller.create(dto, mockUserContext);
      expect(result).toEqual(expected);
      expect(teachersService.create).toHaveBeenCalledWith(dto, {
        uid: 'teacher123',
        role: 'teacher', // Taken from context
      });
    });

    it('should default role to admin if missing in context', async () => {
      const contextWithoutRole: AuditUserContext = {
        uid: 'u456',
        email: 'test',
      };
      await controller.create({} as CreateTeacherDto, contextWithoutRole);
      expect(teachersService.create).toHaveBeenCalledWith(
        {},
        { uid: 'u456', role: 'admin' },
      );
    });
  });

  describe('findAll', () => {
    it('should delegate to TeachersService.findAll with branchId query', async () => {
      teachersService.findAll.mockResolvedValue([]);
      await controller.findAll('branch_xyz');
      expect(teachersService.findAll).toHaveBeenCalledWith('branch_xyz');
    });
  });

  describe('findOne', () => {
    it('should delegate to TeachersService.findOne', async () => {
      teachersService.findOne.mockResolvedValue({ id: 'target_id' });
      await controller.findOne('target_id');
      expect(teachersService.findOne).toHaveBeenCalledWith('target_id');
    });
  });

  describe('update', () => {
    it('should delegate to TeachersService.update passing context', async () => {
      const dto: UpdateTeacherDto = { fullName: 'Updated' };
      teachersService.update.mockResolvedValue({ id: 'target_id' });

      await controller.update('target_id', dto, mockUserContext);
      expect(teachersService.update).toHaveBeenCalledWith('target_id', dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });
  });

  describe('remove', () => {
    it('should delegate to TeachersService.remove', async () => {
      teachersService.remove.mockResolvedValue({ id: 'target_id' });
      await controller.remove('target_id');
      expect(teachersService.remove).toHaveBeenCalledWith('target_id');
    });
  });
});
