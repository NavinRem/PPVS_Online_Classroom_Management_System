import { Test, TestingModule } from '@nestjs/testing';
import { ParentsService } from './parents.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { CreateParentDto } from './dto/create-parent.dto';
import { NotFoundException } from '@nestjs/common';

describe('ParentsService (Unit & Integration)', () => {
  let service: ParentsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [ParentsService],
    }).compile();

    await module.init();
    service = module.get<ParentsService>(ParentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Parent Profile & Operations (`createOrUpdateProfile`, `findByUid`, CRUD)', () => {
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
