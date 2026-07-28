import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, CreateMaterialDto } from './dto/create-session.dto';
import { UpdateSessionDto, UpdateMaterialDto } from './dto/update-session.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditUserContext } from '../auth/current-user.decorator';

describe('SessionsController (Unit)', () => {
  let controller: SessionsController;
  let sessionsService: {
    getSessionsByClass: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    createSession: jest.Mock;
    getMaterialsByClass: jest.Mock;
    findMaterialById: jest.Mock;
    updateMaterial: jest.Mock;
    removeMaterial: jest.Mock;
    createMaterial: jest.Mock;
  };

  const mockUserContext: AuditUserContext = {
    uid: 'teacher123',
    email: 'teacher@test.kh',
    role: 'teacher',
  };

  beforeEach(async () => {
    sessionsService = {
      getSessionsByClass: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createSession: jest.fn(),
      getMaterialsByClass: jest.fn(),
      findMaterialById: jest.fn(),
      updateMaterial: jest.fn(),
      removeMaterial: jest.fn(),
      createMaterial: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [{ provide: SessionsService, useValue: sessionsService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Class Sessions Endpoints', () => {
    it('should delegate getSessions', async () => {
      sessionsService.getSessionsByClass.mockResolvedValue([]);
      await controller.getSessions('class1');
      expect(sessionsService.getSessionsByClass).toHaveBeenCalledWith('class1');
    });

    it('should delegate getSession', async () => {
      sessionsService.findOne.mockResolvedValue({});
      await controller.getSession('session1');
      expect(sessionsService.findOne).toHaveBeenCalledWith('session1');
    });

    it('should delegate updateSession with context', async () => {
      const dto: UpdateSessionDto = { topic: 'New Topic' };
      sessionsService.update.mockResolvedValue({});
      await controller.updateSession('session1', dto, mockUserContext);
      expect(sessionsService.update).toHaveBeenCalledWith('session1', dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });

    it('should delegate deleteSession', async () => {
      sessionsService.remove.mockResolvedValue({});
      await controller.deleteSession('session1');
      expect(sessionsService.remove).toHaveBeenCalledWith('session1');
    });

    it('should delegate createSession with classId injection and context', async () => {
      const dto: CreateSessionDto = {
        classId: '',
        sessionNumber: 1,
        date: '2026-07-20',
        startTime: '10:00',
        endTime: '11:00',
        topic: 'Test',
      };
      sessionsService.createSession.mockResolvedValue({});
      await controller.createSession('class1', dto, mockUserContext);
      expect(dto.classId).toBe('class1');
      expect(sessionsService.createSession).toHaveBeenCalledWith(dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });
  });

  describe('Course Materials Endpoints', () => {
    it('should delegate getMaterials', async () => {
      sessionsService.getMaterialsByClass.mockResolvedValue([]);
      await controller.getMaterials('class1');
      expect(sessionsService.getMaterialsByClass).toHaveBeenCalledWith(
        'class1',
      );
    });

    it('should delegate getMaterial', async () => {
      sessionsService.findMaterialById.mockResolvedValue({});
      await controller.getMaterial('mat1');
      expect(sessionsService.findMaterialById).toHaveBeenCalledWith('mat1');
    });

    it('should delegate updateMaterial with context', async () => {
      const dto: UpdateMaterialDto = { title: 'New Title' };
      sessionsService.updateMaterial.mockResolvedValue({});
      await controller.updateMaterial('mat1', dto, mockUserContext);
      expect(sessionsService.updateMaterial).toHaveBeenCalledWith('mat1', dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });

    it('should delegate deleteMaterial', async () => {
      sessionsService.removeMaterial.mockResolvedValue({});
      await controller.deleteMaterial('mat1');
      expect(sessionsService.removeMaterial).toHaveBeenCalledWith('mat1');
    });

    it('should delegate createMaterial with classId injection and context', async () => {
      const dto: CreateMaterialDto = {
        classId: '',
        title: 'Title',
        fileType: 'pdf',
        fileUrl: 'url',
      };
      sessionsService.createMaterial.mockResolvedValue({});
      await controller.createMaterial('class1', dto, mockUserContext);
      expect(dto.classId).toBe('class1');
      expect(sessionsService.createMaterial).toHaveBeenCalledWith(dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });
  });
});
