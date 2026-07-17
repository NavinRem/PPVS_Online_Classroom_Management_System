import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

describe('AuditLogsService (Unit & Integration)', () => {
  let service: AuditLogsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [AuditLogsService],
    }).compile();

    await module.init();
    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Audit Trail Recording & Queries (`logAction`, `findByEntity`)', () => {
    const runId = Date.now();
    const entityId = `doc_audit_${runId}`;
    let logDocId: string;

    it('should record an immutable audit action (`logAction`)', async () => {
      const dto: CreateAuditLogDto = {
        action: 'CREATE',
        entity: 'assessments',
        entityId,
        modifiedBy: {
          uid: 'teacher_audit_uid',
          role: 'teacher',
        },
        details: { title: 'Midterm Math Exam' },
      };
      const result = await service.logAction(dto);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      expect(result?.message).toContain('successfully');
      if (result?.id) logDocId = result.id;
    });

    it('should query audit logs by entity and entityId (`findByEntity`)', async () => {
      const history = await service.findByEntity('assessments', entityId);
      expect(Array.isArray(history)).toBe(true);
      const found = history.find((log) => log.id === logDocId);
      expect(found).toBeDefined();
      expect(found).toHaveProperty('action', 'CREATE');
    });

    it('should query audit logs filtered only by entity name', async () => {
      const list = await service.findByEntity('assessments');
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
  });
});
