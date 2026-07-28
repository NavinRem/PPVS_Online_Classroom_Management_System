import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { NotFoundException } from '@nestjs/common';

const mockQuery = {
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

const mockFirebaseService = {
  firestore: {
    collection: jest.fn().mockReturnValue(mockQuery),
  },
};

describe('UsersService (Unit)', () => {
  let service: UsersService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('User Lifecycle & Operations', () => {
    const runId = Date.now();
    const uid = `user_mock_uid_${runId}`;

    it('should create or update a user profile (`createOrUpdateUser`)', async () => {
      const dto: CreateUserDto = {
        uid,
        email: 'admin.user@ppvs.edu.kh',
        role: 'admin',
        fullName: 'Principal Admin',
      };
      const result = await service.createOrUpdateUser(uid, dto);
      expect(result).toHaveProperty('id', uid);
      expect(result.message).toContain('successfully');

      const fetched = await service.findByUid(uid);
      expect(fetched).toHaveProperty('role', 'admin');
    });

    it('should find user profile by UID (`findByUid`)', async () => {
      const result = await service.findByUid(uid);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', uid);
      expect(result).toHaveProperty('email', 'admin.user@ppvs.edu.kh');
    });

    it('should throw NotFoundException when finding a non-existent UID', async () => {
      await expect(service.findByUid('non_existent_uid_999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should find all users (`findAll`)', async () => {
      const allUsers = await service.findAll();
      expect(Array.isArray(allUsers)).toBe(true);
      const found = allUsers.find((u) => u.id === uid);
      expect(found).toBeDefined();
    });

    it('should update a user record (`update`)', async () => {
      const result = await service.update(uid, { fullName: 'Updated Admin' });
      expect(result).toHaveProperty('id', uid);
      const fetched = await service.findOne(uid);
      expect(fetched).toHaveProperty('fullName', 'Updated Admin');
    });

    it('should find user by email (`findByEmail`)', async () => {
      const result = await service.findByEmail('admin.user@ppvs.edu.kh');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', uid);
      expect(result).toHaveProperty('email', 'admin.user@ppvs.edu.kh');
    });

    it('should throw NotFoundException when finding a non-existent email', async () => {
      await expect(service.findByEmail('missing@ppvs.edu.kh')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should find user by phone number (`findByPhoneNumber`)', async () => {
      // First let's create a user with a phone number
      const phoneUid = 'phone_user_uid';
      await service.createOrUpdateUser(phoneUid, {
        uid: phoneUid,
        role: 'parent',
        fullName: 'Phone Parent',
        phoneNumber: '012345678',
      } as unknown as CreateUserDto); // Cast because DTO might not strictly define phoneNumber in some versions

      const result = await service.findByPhoneNumber('012345678');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', phoneUid);
      expect(result).toHaveProperty('phoneNumber', '012345678');
    });

    it('should throw NotFoundException when finding a non-existent phone number', async () => {
      await expect(service.findByPhoneNumber('999999999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should remove a user record (`remove`)', async () => {
      const result = await service.remove(uid);
      expect(result).toHaveProperty('id', uid);
      await expect(service.findOne(uid)).rejects.toThrow(NotFoundException);
    });
  });
});
