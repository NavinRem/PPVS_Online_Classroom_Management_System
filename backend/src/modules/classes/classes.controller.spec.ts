import { Test, TestingModule } from '@nestjs/testing';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

describe('ClassesController (Unit)', () => {
  let controller: ClassesController;
  let classesService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    classesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [{ provide: ClassesService, useValue: classesService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClassesController>(ClassesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to ClassesService.create', async () => {
      const dto: CreateClassDto = {
        className: 'Math 101',
        teacherName: 'Teacher',
        teacherId: 't123',
        day: 'Mon',
        time: '9:00',
        maxCapacity: 30,
        price: 100,
        currency: 'KHR',
      };

      const expected = { id: 'new_id', message: 'Created' };
      classesService.create.mockResolvedValue(expected);

      const result = await controller.create(dto);
      expect(result).toEqual(expected);
      expect(classesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should delegate to ClassesService.findAll with branchId query', async () => {
      classesService.findAll.mockResolvedValue([]);
      await controller.findAll('branch_xyz');
      expect(classesService.findAll).toHaveBeenCalledWith('branch_xyz');
    });
  });

  describe('findOne', () => {
    it('should delegate to ClassesService.findOne', async () => {
      classesService.findOne.mockResolvedValue({ id: 'target_id' });
      await controller.findOne('target_id');
      expect(classesService.findOne).toHaveBeenCalledWith('target_id');
    });
  });

  describe('update', () => {
    it('should delegate to ClassesService.update', async () => {
      const dto: UpdateClassDto = { className: 'Updated' };
      classesService.update.mockResolvedValue({ id: 'target_id' });

      await controller.update('target_id', dto);
      expect(classesService.update).toHaveBeenCalledWith('target_id', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to ClassesService.remove', async () => {
      classesService.remove.mockResolvedValue({ id: 'target_id' });
      await controller.remove('target_id');
      expect(classesService.remove).toHaveBeenCalledWith('target_id');
    });
  });
});
