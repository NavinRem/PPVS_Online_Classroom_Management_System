import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AuditUserContext } from '../auth/current-user.decorator';

describe('EnrollmentsController (Unit)', () => {
  let controller: EnrollmentsController;
  let enrollmentsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    create: jest.Mock;
    getMySchedule: jest.Mock;
  };

  const mockUserContext: AuditUserContext = {
    uid: 'parent123',
    email: 'parent@test.kh',
    role: 'parent',
  };

  beforeEach(async () => {
    enrollmentsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      create: jest.fn(),
      getMySchedule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentsController],
      providers: [
        { provide: EnrollmentsService, useValue: enrollmentsService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EnrollmentsController>(EnrollmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Endpoints', () => {
    it('should delegate getMySchedule using user context', async () => {
      enrollmentsService.getMySchedule.mockResolvedValue([]);
      await controller.getMySchedule(mockUserContext);
      expect(enrollmentsService.getMySchedule).toHaveBeenCalledWith(
        'parent123',
      );
    });

    it('should delegate create', async () => {
      const dto: CreateEnrollmentDto = {
        classId: 'c1',
        studentId: 's1',
        parentId: 'p1',
      };
      enrollmentsService.create.mockResolvedValue({});
      await controller.create(dto);
      expect(enrollmentsService.create).toHaveBeenCalledWith(dto);
    });

    it('should delegate findAll with branchId', async () => {
      enrollmentsService.findAll.mockResolvedValue([]);
      await controller.findAll('branch1');
      expect(enrollmentsService.findAll).toHaveBeenCalledWith('branch1');
    });

    it('should delegate findOne', async () => {
      enrollmentsService.findOne.mockResolvedValue({});
      await controller.findOne('e1');
      expect(enrollmentsService.findOne).toHaveBeenCalledWith('e1');
    });

    it('should delegate updateEnrollment with context', async () => {
      const dto = { status: 'dropped' } as unknown as UpdateEnrollmentDto;
      enrollmentsService.update.mockResolvedValue({});
      await controller.update('e1', dto);
      expect(enrollmentsService.update).toHaveBeenCalledWith('e1', dto);
    });

    it('should delegate remove', async () => {
      enrollmentsService.remove.mockResolvedValue({});
      await controller.remove('e1');
      expect(enrollmentsService.remove).toHaveBeenCalledWith('e1');
    });
  });
});
