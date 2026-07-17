import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateAnnouncementDto,
  SendNotificationDto,
} from './dto/create-announcement.dto';

describe('NotificationsService (Unit & Integration)', () => {
  let service: NotificationsService;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;

  beforeAll(async () => {
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [
        NotificationsService,
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    await module.init();
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Broadcast Announcements (`createAnnouncement`, `getAnnouncementsByClass`)', () => {
    const runId = Date.now();
    const classId = `class_announce_${runId}`;
    let announceId: string;

    it('should create an announcement (`createAnnouncement`)', async () => {
      const dto: CreateAnnouncementDto = {
        title: 'Midterm Exam Schedule',
        message: 'Midterm exams will start next week on Monday.',
        targetRole: 'all',
        classId,
      };

      const result = await service.createAnnouncement(dto, {
        uid: 'admin_sys',
        role: 'admin',
      });
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('successfully');
      announceId = result.id;
      expect(auditLogsService.logAction).toHaveBeenCalled();
    });

    it('should fetch announcements for a class (`getAnnouncementsByClass`)', async () => {
      const list = await service.getAnnouncementsByClass(classId);
      expect(Array.isArray(list)).toBe(true);
      const found = list.find((a) => a.id === announceId);
      expect(found).toBeDefined();
      expect(found).toHaveProperty('title', 'Midterm Exam Schedule');
    });
  });

  describe('Direct User Notifications (`sendToUser`, `getUserNotifications`)', () => {
    const runId = Date.now();
    const recipientId = `user_recipient_${runId}`;
    let notifId: string;

    it('should send a direct notification to a user (`sendToUser`)', async () => {
      const dto: SendNotificationDto = {
        recipientId,
        title: 'New Homework Assigned',
        body: 'Please complete the calculus assignment by Friday.',
        type: 'general',
      };

      const result = await service.sendToUser(dto, {
        uid: 'teacher_math',
        role: 'teacher',
      });
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('successfully');
      notifId = result.id;
    });

    it('should fetch all notifications for a specific user (`getUserNotifications`)', async () => {
      const notifs = await service.getUserNotifications(recipientId);
      expect(Array.isArray(notifs)).toBe(true);
      const found = notifs.find((n) => n.id === notifId);
      expect(found).toBeDefined();
      expect(found).toHaveProperty('title', 'New Homework Assigned');
      expect(found).toHaveProperty('read', false);
    });
  });
});
