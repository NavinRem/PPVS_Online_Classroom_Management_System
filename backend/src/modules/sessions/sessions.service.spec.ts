import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateSessionDto, CreateMaterialDto } from './dto/create-session.dto';
import { NotFoundException } from '@nestjs/common';

describe('SessionsService (Unit & Integration)', () => {
  let service: SessionsService;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;

  beforeAll(async () => {
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [
        SessionsService,
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    await module.init();
    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Class Sessions Scheduling (`createSession`, `getSessionsByClass`)', () => {
    const runId = Date.now();
    const classId = `class_sessions_${runId}`;
    let sessionId: string;

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
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('successfully');
      sessionId = result.id;
      expect(auditLogsService.logAction).toHaveBeenCalled();
    });

    it('should fetch sessions by class (`getSessionsByClass`)', async () => {
      const sessions = await service.getSessionsByClass(classId);
      expect(Array.isArray(sessions)).toBe(true);
      const found = sessions.find((s) => s.id === sessionId);
      expect(found).toBeDefined();
      expect(found).toHaveProperty('topic', 'Introduction to Derivatives');
    });
  });

  describe('Course Learning Materials (`createMaterial`, `getMaterialsByClass`, CRUD)', () => {
    const runId = Date.now();
    const classId = `class_materials_${runId}`;
    let materialId: string;

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
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('successfully');
      materialId = result.id;
    });

    it('should fetch materials by class (`getMaterialsByClass` & `findMaterialById`)', async () => {
      const materials = await service.getMaterialsByClass(classId);
      expect(Array.isArray(materials)).toBe(true);
      const found = materials.find((m) => m.id === materialId);
      expect(found).toBeDefined();

      const single = await service.findMaterialById(materialId);
      expect(single).toHaveProperty('title', 'Derivatives Practice PDF');
      expect(single).toHaveProperty('fileType', 'pdf');
    });

    it('should update course material (`updateMaterial`)', async () => {
      const result = await service.updateMaterial(materialId, {
        title: 'Updated Practice PDF',
      });
      expect(result).toHaveProperty('id', materialId);
      expect(result.message).toContain('successfully updated');
      const fetched = await service.findMaterialById(materialId);
      expect(fetched).toHaveProperty('title', 'Updated Practice PDF');
    });

    it('should remove course material (`removeMaterial`)', async () => {
      const result = await service.removeMaterial(materialId);
      expect(result).toHaveProperty('id', materialId);
      await expect(service.findMaterialById(materialId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
