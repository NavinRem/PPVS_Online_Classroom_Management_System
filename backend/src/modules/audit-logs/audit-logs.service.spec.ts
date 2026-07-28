import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { InternalServerErrorException } from '@nestjs/common';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

describe('AuditLogsService (Unit)', () => {
  let service: AuditLogsService;
  let mockFirebaseService: any;
  let mockAuditLogsCollection: any;
  let mockQueryChainer: any;

  beforeAll(async () => {
    // The query chainer returns itself for `where` calls and a resolved promise for `get` calls.
    mockQueryChainer = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'log1',
            data: () => ({
              action: 'CREATE',
              entity: 'assessments',
              entityId: 'doc1',
              branchId: 'branch_a',
            }),
          },
        ],
      }),
    };

    mockAuditLogsCollection = {
      where: mockQueryChainer.where,
      get: mockQueryChainer.get,
      add: jest.fn().mockResolvedValue({ id: 'new_log_id' }),
      doc: jest.fn((docId?: string) => ({
        id: docId || 'new_log_id',
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ action: 'CREATE', entity: 'assessments' }),
        }),
      })),
    };

    mockFirebaseService = {
      firestore: {
        collection: jest.fn((colName: string) => {
          if (colName === 'audit_logs') return mockAuditLogsCollection;
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: [] }),
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
            })),
          };
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAction', () => {
    it('should record an immutable audit action', async () => {
      const dto: CreateAuditLogDto = {
        action: 'CREATE',
        entity: 'assessments',
        entityId: 'doc1',
        modifiedBy: {
          uid: 'teacher_audit_uid',
          role: 'teacher',
        },
        details: { title: 'Midterm Math Exam' },
      };
      const result = await service.logAction(dto);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', 'new_log_id');
      expect(mockAuditLogsCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'assessments' }),
      );
    });

    it('should cleanly suppress exceptions returning null on DB failure', async () => {
      // Mock the base class create method to throw directly to hit the catch block in logAction
      const createSpy = jest
        .spyOn(service, 'create')
        .mockRejectedValueOnce(new Error('DB Offline'));
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await service.logAction({
        action: 'UPDATE',
        entity: 'users',
      } as CreateAuditLogDto);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🔥 FIRESTORE ERROR (AuditLogsService):',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
      createSpy.mockRestore();
    });
  });

  describe('findByEntity', () => {
    it('should query audit logs by entity and entityId and branchId', async () => {
      const history = await service.findByEntity(
        'assessments',
        'doc1',
        'branch_a',
      );
      expect(Array.isArray(history)).toBe(true);
      expect(history[0].id).toBe('log1');
      expect(mockQueryChainer.where).toHaveBeenCalledWith(
        'entity',
        '==',
        'assessments',
      );
      expect(mockQueryChainer.where).toHaveBeenCalledWith(
        'entityId',
        '==',
        'doc1',
      );
      expect(mockQueryChainer.where).toHaveBeenCalledWith(
        'branchId',
        '==',
        'branch_a',
      );
    });

    it('should query audit logs filtered only by entity name', async () => {
      const history = await service.findByEntity('assessments');
      expect(Array.isArray(history)).toBe(true);
      expect(history[0].id).toBe('log1');
      expect(mockQueryChainer.where).toHaveBeenCalledWith(
        'entity',
        '==',
        'assessments',
      );
      // entityId and branchId should not be queried
      expect(mockQueryChainer.where).not.toHaveBeenCalledWith(
        'entityId',
        '==',
        undefined,
      );
    });

    it('should throw InternalServerErrorException when findByEntity fails', async () => {
      (mockQueryChainer.get as jest.Mock).mockRejectedValueOnce(
        new Error('DB Query Error'),
      );
      await expect(service.findByEntity('assessments')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
