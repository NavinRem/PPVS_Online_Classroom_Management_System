import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { CreateUserDto } from './dto/create-user.dto';
import { NotFoundException } from '@nestjs/common';

describe('UsersService (Unit & Integration)', () => {
  let service: UsersService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [UsersService],
    }).compile();

    await module.init();
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('User Lifecycle & Operations (`createOrUpdateUser`, `findByUid`, and CRUD)', () => {
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

    it('should remove a user record (`remove`)', async () => {
      const result = await service.remove(uid);
      expect(result).toHaveProperty('id', uid);
      await expect(service.findOne(uid)).rejects.toThrow(NotFoundException);
    });
  });
});
