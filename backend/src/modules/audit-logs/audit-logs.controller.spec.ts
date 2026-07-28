import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

describe('AuditLogsController (Unit)', () => {
  let controller: AuditLogsController;
  let auditLogsService: {
    findByEntity: jest.Mock;
  };

  beforeEach(async () => {
    auditLogsService = {
      findByEntity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: AuditLogsService, useValue: auditLogsService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Endpoints', () => {
    it('should delegate getLogs with all queries', async () => {
      auditLogsService.findByEntity.mockResolvedValue([]);
      await controller.getLogs('users', 'user1', 'branch1');
      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        'users',
        'user1',
        'branch1',
      );
    });

    it('should delegate getLogs with empty entity if omitted', async () => {
      auditLogsService.findByEntity.mockResolvedValue([]);
      await controller.getLogs(undefined, undefined, undefined);
      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        '',
        undefined,
        undefined,
      );
    });
  });
});
