import { Test, TestingModule } from '@nestjs/testing';
import { BranchesService } from './branches.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { CreateBranchDto } from './dto/create-branch.dto';
import { NotFoundException } from '@nestjs/common';

describe('BranchesService (Unit & Integration)', () => {
  let service: BranchesService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [BranchesService],
    }).compile();

    await module.init();
    service = module.get<BranchesService>(BranchesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Multi-Branch Lifecycle (`create`, `findByCode`, `findAll`, `findOne`, `update`, `remove`)', () => {
    const runId = Date.now();
    const code = `BKK1_${runId}`;
    let branchId: string;

    it('should create a school branch (`create`)', async () => {
      const dto: CreateBranchDto = {
        name: `PPVS Chinese Academy - BKK1 (${runId})`,
        code,
        address: 'St 278, BKK1, Phnom Penh',
        phoneNumber: '+85512345678',
        status: 'active',
      };
      const result = await service.create(dto, {
        uid: 'admin_sys',
        role: 'admin',
      });
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('successfully');
      branchId = result.id;
    });

    it('should find branch by code (`findByCode`)', async () => {
      const branch = await service.findByCode(code);
      expect(branch).toBeDefined();
      expect(branch).toHaveProperty('id', branchId);
      expect(branch).toHaveProperty('code', code);
    });

    it('should throw NotFoundException when looking up non-existent code', async () => {
      await expect(service.findByCode('NON_EXISTENT_CODE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should find all branches (`findAll`)', async () => {
      const all = await service.findAll();
      expect(Array.isArray(all)).toBe(true);
      const found = all.find((b) => b.id === branchId);
      expect(found).toBeDefined();
    });

    it('should update branch details (`update`)', async () => {
      const result = await service.update(
        branchId,
        { address: 'Updated St 278, BKK1' },
        { uid: 'admin_sys', role: 'admin' },
      );
      expect(result).toHaveProperty('id', branchId);
      const fetched = await service.findOne(branchId);
      expect(fetched).toHaveProperty('address', 'Updated St 278, BKK1');
    });

    it('should delete a branch (`remove`)', async () => {
      const result = await service.remove(branchId);
      expect(result).toHaveProperty('id', branchId);
      await expect(service.findOne(branchId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
