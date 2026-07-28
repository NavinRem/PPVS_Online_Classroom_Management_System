import { Test, TestingModule } from '@nestjs/testing';
import { ParentsService } from './parents.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { CreateParentDto } from './dto/create-parent.dto';
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

describe('ParentsService (Unit)', () => {
  let service: ParentsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<ParentsService>(ParentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Parent Profile & Operations', () => {
    const runId = Date.now();
    const parentUid = `parent_uid_${runId}`;

    it('should create or update parent profile (`createOrUpdateProfile`)', async () => {
      const dto: CreateParentDto = {
        fullName: 'Dara Seng',
        email: 'dara.parent@example.com',
        phoneNumber: '+85512345678',
      };
      const result = await service.createOrUpdateProfile(parentUid, dto);
      expect(result).toHaveProperty('id', parentUid);
      expect(result.message).toContain('successfully');

      const fetched = await service.findByUid(parentUid);
      expect(fetched).toHaveProperty('fullName', 'Dara Seng');
    });

    it('should find parent profile (`findByUid`)', async () => {
      const result = await service.findByUid(parentUid);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', parentUid);
      expect(result).toHaveProperty('phoneNumber', '+85512345678');
    });

    it('should find all parent profiles (`findAll`)', async () => {
      const all = await service.findAll();
      expect(Array.isArray(all)).toBe(true);
      const found = all.find((p) => p.id === parentUid);
      expect(found).toBeDefined();
    });

    it('should update a parent profile (`update`)', async () => {
      const result = await service.update(parentUid, {
        phoneNumber: '+85599888777',
      });
      expect(result).toHaveProperty('id', parentUid);
      const fetched = await service.findOne(parentUid);
      expect(fetched).toHaveProperty('phoneNumber', '+85599888777');
    });

    it('should remove a parent profile (`remove`)', async () => {
      const result = await service.remove(parentUid);
      expect(result).toHaveProperty('id', parentUid);
      await expect(service.findOne(parentUid)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
