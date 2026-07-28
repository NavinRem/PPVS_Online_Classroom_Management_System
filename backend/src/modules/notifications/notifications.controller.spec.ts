import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  CreateAnnouncementDto,
  SendNotificationDto,
} from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditUserContext } from '../auth/current-user.decorator';

describe('NotificationsController (Unit)', () => {
  let controller: NotificationsController;
  let notificationsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    createAnnouncement: jest.Mock;
    getAnnouncementsByClass: jest.Mock;
    sendToUser: jest.Mock;
    getUserNotifications: jest.Mock;
  };

  const mockUserContext: AuditUserContext = {
    uid: 'teacher123',
    email: 'teacher@test.kh',
    role: 'teacher',
  };

  beforeEach(async () => {
    notificationsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createAnnouncement: jest.fn(),
      getAnnouncementsByClass: jest.fn(),
      sendToUser: jest.fn(),
      getUserNotifications: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notificationsService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Announcements API', () => {
    it('should delegate findAllAnnouncements with branchId', async () => {
      notificationsService.findAll.mockResolvedValue([]);
      await controller.findAllAnnouncements('branch1');
      expect(notificationsService.findAll).toHaveBeenCalledWith('branch1');
    });

    it('should delegate findOneAnnouncement', async () => {
      notificationsService.findOne.mockResolvedValue({});
      await controller.findOneAnnouncement('a1');
      expect(notificationsService.findOne).toHaveBeenCalledWith('a1');
    });

    it('should delegate updateAnnouncement with context', async () => {
      const dto: UpdateAnnouncementDto = { title: 'Updated' };
      notificationsService.update.mockResolvedValue({});
      await controller.updateAnnouncement('a1', dto, mockUserContext);
      expect(notificationsService.update).toHaveBeenCalledWith('a1', dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });

    it('should delegate removeAnnouncement', async () => {
      notificationsService.remove.mockResolvedValue({});
      await controller.removeAnnouncement('a1');
      expect(notificationsService.remove).toHaveBeenCalledWith('a1');
    });

    it('should delegate getClassAnnouncements', async () => {
      notificationsService.getAnnouncementsByClass.mockResolvedValue([]);
      await controller.getClassAnnouncements('class1');
      expect(notificationsService.getAnnouncementsByClass).toHaveBeenCalledWith(
        'class1',
      );
    });

    it('should delegate createAnnouncement with context', async () => {
      const dto: CreateAnnouncementDto = {
        title: 'T',
        message: 'M',
        targetRole: 'all',
      };
      notificationsService.createAnnouncement.mockResolvedValue({});
      await controller.createAnnouncement(dto, mockUserContext);
      expect(notificationsService.createAnnouncement).toHaveBeenCalledWith(
        dto,
        { uid: 'teacher123', role: 'teacher' },
      );
    });
  });

  describe('Direct Notifications API', () => {
    it('should delegate getMyNotifications using user context', async () => {
      notificationsService.getUserNotifications.mockResolvedValue([]);
      await controller.getMyNotifications(mockUserContext);
      expect(notificationsService.getUserNotifications).toHaveBeenCalledWith(
        'teacher123',
      );
    });

    it('should delegate sendNotification with context', async () => {
      const dto: SendNotificationDto = {
        recipientId: 'r1',
        title: 'T',
        body: 'B',
        type: 'general',
      };
      notificationsService.sendToUser.mockResolvedValue({});
      await controller.sendNotification(dto, mockUserContext);
      expect(notificationsService.sendToUser).toHaveBeenCalledWith(dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });
  });
});
