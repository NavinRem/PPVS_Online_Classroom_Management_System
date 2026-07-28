import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotFoundException } from '@nestjs/common';
import { AuditUserContext } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('UsersController (Unit)', () => {
  let controller: UsersController;
  let usersService: {
    findAll: jest.Mock;
    findByUid: jest.Mock;
    createOrUpdateUser: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      findByUid: jest.fn(),
      createOrUpdateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to UsersService.findAll without branchId', async () => {
      const mockUsers = [{ id: '1', role: 'student' }];
      usersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();
      expect(result).toEqual(mockUsers);
      expect(usersService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should delegate to UsersService.findAll with branchId', async () => {
      const mockUsers = [{ id: '1', branchId: 'branch_a' }];
      usersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll('branch_a');
      expect(result).toEqual(mockUsers);
      expect(usersService.findAll).toHaveBeenCalledWith('branch_a');
    });
  });

  describe('getMyProfile', () => {
    const mockUserContext: AuditUserContext = {
      uid: 'u123',
      email: 'user@test.kh',
      role: 'parent',
    };

    it('should return user profile from UsersService if found', async () => {
      const profile = { id: 'u123', fullName: 'Real User' };
      usersService.findByUid.mockResolvedValue(profile);

      const result = await controller.getMyProfile(mockUserContext);
      expect(result).toEqual(profile);
      expect(usersService.findByUid).toHaveBeenCalledWith('u123');
    });

    it('should catch error and return fallback profile info if not found in db', async () => {
      usersService.findByUid.mockRejectedValue(new NotFoundException());

      const result = await controller.getMyProfile(mockUserContext);
      expect(result).toEqual({
        id: 'u123',
        uid: 'u123',
        email: 'user@test.kh',
        role: 'parent',
      });
    });

    it('should assign role "parent" by default in fallback if role is missing in context', async () => {
      const missingRoleContext: AuditUserContext = {
        uid: 'u456',
        email: 'no-role@test.kh',
      };
      usersService.findByUid.mockRejectedValue(new Error('Any error'));

      const result = await controller.getMyProfile(missingRoleContext);
      expect(result).toEqual({
        id: 'u456',
        uid: 'u456',
        email: 'no-role@test.kh',
        role: 'parent',
      });
    });
  });

  describe('updateMyProfile', () => {
    it('should delegate to UsersService.createOrUpdateUser with context uid', async () => {
      const mockUserContext: AuditUserContext = { uid: 'u123' };
      const updateDto: UpdateUserDto = { fullName: 'New Name' };
      const expectedResponse = { id: 'u123', message: 'Updated' };
      usersService.createOrUpdateUser.mockResolvedValue(expectedResponse);

      const result = await controller.updateMyProfile(
        mockUserContext,
        updateDto,
      );
      expect(result).toEqual(expectedResponse);
      expect(usersService.createOrUpdateUser).toHaveBeenCalledWith(
        'u123',
        updateDto,
      );
    });
  });

  describe('getUserByUid', () => {
    it('should delegate to UsersService.findByUid', async () => {
      const expected = { id: 'target_id' };
      usersService.findByUid.mockResolvedValue(expected);

      const result = await controller.getUserByUid('target_id');
      expect(result).toEqual(expected);
      expect(usersService.findByUid).toHaveBeenCalledWith('target_id');
    });

    it('should propagate NotFoundException if user not found', async () => {
      usersService.findByUid.mockRejectedValue(new NotFoundException());

      await expect(controller.getUserByUid('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createUser', () => {
    it('should delegate to UsersService.createOrUpdateUser using the DTO uid', async () => {
      const dto: CreateUserDto = {
        uid: 'new_uid',
        email: 'new@test.kh',
        role: 'teacher',
        fullName: 'New Teacher',
      };
      const expected = { id: 'new_uid', message: 'Created' };
      usersService.createOrUpdateUser.mockResolvedValue(expected);

      const result = await controller.createUser(dto);
      expect(result).toEqual(expected);
      expect(usersService.createOrUpdateUser).toHaveBeenCalledWith(
        'new_uid',
        dto,
      );
    });
  });
});
