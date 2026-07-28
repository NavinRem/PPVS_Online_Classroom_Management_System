import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateSessionDto, CreateMaterialDto } from './dto/create-session.dto';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('SessionsService (Unit)', () => {
  let service: SessionsService;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;
  let mockFirebaseService: any;
  let mockClassSessionsCollection: any;
  let mockCourseMaterialsCollection: any;

  beforeAll(async () => {
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    mockClassSessionsCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'existing_session_id',
            data: () => ({
              classId: 'class1',
              topic: 'Derivatives',
              date: '2026-07-20',
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: 'new_session_id' }),
      doc: jest.fn((docId: string) => {
        if (docId === 'existing_session_id' || docId === 'new_session_id') {
          return {
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: docId,
              data: () => ({ classId: 'class1', topic: 'Derivatives' }),
            }),
            set: jest.fn().mockResolvedValue(true),
            update: jest.fn().mockResolvedValue(true),
            delete: jest.fn().mockResolvedValue(true),
          };
        }
        return {
          get: jest.fn().mockResolvedValue({ exists: false }),
          delete: jest.fn().mockResolvedValue(true),
        };
      }),
    };

    const mockMaterialDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'existing_material_id',
        data: () => ({
          classId: 'class1',
          title: 'Derivatives Practice PDF',
          fileType: 'pdf',
        }),
      }),
      set: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
    };

    mockCourseMaterialsCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'existing_material_id',
            data: () => ({
              classId: 'class1',
              title: 'Derivatives Practice PDF',
              fileType: 'pdf',
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: 'new_material_id' }),
      doc: jest.fn((docId: string) => {
        if (docId === 'existing_material_id' || docId === 'new_material_id') {
          return mockMaterialDoc;
        }
        return {
          get: jest.fn().mockResolvedValue({ exists: false }),
          delete: jest.fn().mockResolvedValue(true),
        };
      }),
    };

    mockFirebaseService = {
      firestore: {
        collection: jest.fn((colName: string) => {
          if (colName === 'class_sessions') {
            return mockClassSessionsCollection;
          }
          if (colName === 'course_materials') {
            return mockCourseMaterialsCollection;
          }
          return {
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
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Class Sessions Scheduling (`createSession`, `getSessionsByClass`)', () => {
    const classId = `class1`;

    it('should create a class session (`createSession`)', async () => {
      const dto: CreateSessionDto = {
        classId,
        sessionNumber: 1,
        date: '2026-07-20',
        startTime: '08:00',
        endTime: '09:30',
        topic: 'Introduction to Derivatives',
      };

      const result = await service.createSession(dto, {
        uid: 'teacher_math',
        role: 'teacher',
      });

      expect(result).toHaveProperty('id', 'new_session_id');
      expect(result.message).toContain('successfully');
      expect(mockClassSessionsCollection.add).toHaveBeenCalled();
      expect(auditLogsService.logAction).toHaveBeenCalled();
    });

    it('should fetch sessions by class (`getSessionsByClass`)', async () => {
      const sessions = await service.getSessionsByClass(classId);
      expect(Array.isArray(sessions)).toBe(true);
      const found = sessions.find((s) => s.id === 'existing_session_id');
      expect(found).toBeDefined();
      expect(found).toHaveProperty('topic', 'Derivatives');
    });

    it('should throw InternalServerErrorException when getSessionsByClass fails', async () => {
      (mockClassSessionsCollection.get as jest.Mock).mockRejectedValueOnce(
        new Error('DB down'),
      );
      await expect(service.getSessionsByClass(classId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException when createSession fails', async () => {
      (mockClassSessionsCollection.add as jest.Mock).mockRejectedValueOnce(
        new Error('DB down'),
      );
      await expect(
        service.createSession({} as CreateSessionDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Course Learning Materials (`createMaterial`, `getMaterialsByClass`, CRUD)', () => {
    const classId = `class1`;

    it('should upload/attach course material (`createMaterial`)', async () => {
      const dto: CreateMaterialDto = {
        classId,
        title: 'Derivatives Practice PDF',
        fileType: 'pdf',
        fileUrl: 'https://cdn.ppvs.edu.kh/materials/derivatives.pdf',
        description: 'Complete all 20 practice problems',
      };
      const result = await service.createMaterial(dto, {
        uid: 'teacher_math',
        role: 'teacher',
      });
      expect(result).toHaveProperty('id', 'new_material_id');
      expect(result.message).toContain('successfully');
      expect(auditLogsService.logAction).toHaveBeenCalled();
    });

    it('should fetch materials by class (`getMaterialsByClass`)', async () => {
      const materials = await service.getMaterialsByClass(classId);
      expect(Array.isArray(materials)).toBe(true);
      const found = materials.find((m) => m.id === 'existing_material_id');
      expect(found).toBeDefined();
    });

    it('should find material by id (`findMaterialById`)', async () => {
      const single = await service.findMaterialById('existing_material_id');
      expect(single).toHaveProperty('title', 'Derivatives Practice PDF');
      expect(single).toHaveProperty('fileType', 'pdf');
    });

    it('should throw NotFoundException for unknown material', async () => {
      await expect(service.findMaterialById('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update course material (`updateMaterial`)', async () => {
      const result = await service.updateMaterial('existing_material_id', {
        title: 'Updated Practice PDF',
      });
      expect(result).toHaveProperty('id', 'existing_material_id');
      expect(result.message).toContain('successfully updated');
    });

    it('should throw InternalServerErrorException when updateMaterial fails', async () => {
      // The doc mock is shared, so we access it directly from the collection doc method execution.
      // Wait, we can just grab it by calling the doc method once here to retrieve the reference.
      const docMock = (mockCourseMaterialsCollection.doc as jest.Mock)(
        'existing_material_id',
      );
      (docMock.update as jest.Mock).mockRejectedValueOnce(
        new Error('DB error'),
      );
      await expect(
        service.updateMaterial('existing_material_id', {}),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should remove course material (`removeMaterial`)', async () => {
      const result = await service.removeMaterial('existing_material_id');
      expect(result).toHaveProperty('id', 'existing_material_id');
    });

    it('should throw InternalServerErrorException when removeMaterial fails', async () => {
      const docMock = (mockCourseMaterialsCollection.doc as jest.Mock)(
        'existing_material_id',
      );
      (docMock.delete as jest.Mock).mockRejectedValueOnce(
        new Error('DB error'),
      );
      await expect(
        service.removeMaterial('existing_material_id'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
