import { Test, TestingModule } from '@nestjs/testing';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AuditUserContext } from '../auth/current-user.decorator';
import { NotFoundException } from '@nestjs/common';

describe('ParentsController (Unit)', () => {
  let controller: ParentsController;
  let parentsService: {
    findByUid: jest.Mock;
    createOrUpdateProfile: jest.Mock;
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
    parentsService = {
      findByUid: jest.fn(),
      createOrUpdateProfile: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParentsController],
      providers: [{ provide: ParentsService, useValue: parentsService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ParentsController>(ParentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('should delegate to ParentsService.findByUid using context uid', async () => {
      const expectedProfile = { id: 'u123', fullName: 'Dara Seng' };
      parentsService.findByUid.mockResolvedValue(expectedProfile);

      const result = await controller.getMyProfile(mockUserContext);
      expect(result).toEqual(expectedProfile);
      expect(parentsService.findByUid).toHaveBeenCalledWith('u123');
    });
  });

  describe('updateMyProfile', () => {
    it('should delegate to ParentsService.createOrUpdateProfile with context', async () => {
      const updateDto: UpdateParentDto = { phoneNumber: '123' };
      const expected = { id: 'u123', message: 'Success' };
      parentsService.createOrUpdateProfile.mockResolvedValue(expected);

      const result = await controller.updateMyProfile(
        mockUserContext,
        updateDto,
      );
      expect(result).toEqual(expected);
      expect(parentsService.createOrUpdateProfile).toHaveBeenCalledWith(
        'u123',
        updateDto,
        { uid: 'u123', role: 'parent' },
      );
    });

    it('should assign role "parent" if context role is missing', async () => {
      const contextWithoutRole: AuditUserContext = {
        uid: 'u456',
        email: 'test',
      };
      await controller.updateMyProfile(contextWithoutRole, {});
      expect(parentsService.createOrUpdateProfile).toHaveBeenCalledWith(
        'u456',
        {},
        { uid: 'u456', role: 'parent' },
      );
    });
  });

  describe('create', () => {
    it('should delegate to ParentsService.create with context', async () => {
      const dto: CreateParentDto = {
        fullName: 'New Parent',
        phoneNumber: '012',
      };
      const expected = { id: 'auto-id', message: 'Created' };
      parentsService.create.mockResolvedValue(expected);

      const result = await controller.create(dto, mockUserContext);
      expect(result).toEqual(expected);
      expect(parentsService.create).toHaveBeenCalledWith(dto, {
        uid: 'u123',
        role: 'parent',
      });
    });
  });

  describe('findAll', () => {
    it('should delegate to ParentsService.findAll with branchId query', async () => {
      parentsService.findAll.mockResolvedValue([]);
      await controller.findAll('branch_1');
      expect(parentsService.findAll).toHaveBeenCalledWith('branch_1');
    });
  });

  describe('findOne', () => {
    it('should delegate to ParentsService.findOne', async () => {
      parentsService.findOne.mockResolvedValue({ id: 'target_id' });
      await controller.findOne('target_id');
      expect(parentsService.findOne).toHaveBeenCalledWith('target_id');
    });

    it('should propagate exceptions', async () => {
      parentsService.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should delegate to ParentsService.update with context', async () => {
      const dto: UpdateParentDto = { fullName: 'Updated' };
      parentsService.update.mockResolvedValue({ id: 'target_id' });

      await controller.update('target_id', dto, mockUserContext);
      expect(parentsService.update).toHaveBeenCalledWith('target_id', dto, {
        uid: 'u123',
        role: 'parent',
      });
    });
  });

  describe('remove', () => {
    it('should delegate to ParentsService.remove', async () => {
      parentsService.remove.mockResolvedValue({ id: 'target_id' });
      await controller.remove('target_id');
      expect(parentsService.remove).toHaveBeenCalledWith('target_id');
    });
  });
});
