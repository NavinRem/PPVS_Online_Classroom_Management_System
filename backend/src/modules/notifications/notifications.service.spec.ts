import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InternalServerErrorException } from '@nestjs/common';
import {
  CreateAnnouncementDto,
  SendNotificationDto,
} from './dto/create-announcement.dto';

// Mock FCM
const mockSend = jest.fn().mockResolvedValue('messages/123');
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(() => ({
    send: mockSend,
  })),
}));

describe('NotificationsService (Unit)', () => {
  let service: NotificationsService;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;

  let mockFirebaseService: any;
  let mockAnnouncementsCollection: any;
  let mockNotificationsCollection: any;
  let mockUsersCollection: any;

  let userDocExists: boolean;
  let fcmTokenValue: string | null;

  beforeAll(async () => {
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    const mockAnnouncementDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          title: 'Test Announcement',
          classId: 'class1',
          targetRole: 'all',
        }),
      }),
      update: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
    };

    mockAnnouncementsCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'announce1',
            data: () => ({
              title: 'Global Announce',
              classId: '',
              targetRole: 'all',
            }),
          },
          {
            id: 'announce2',
            data: () => ({
              title: 'Class Announce',
              classId: 'class1',
              targetRole: 'student',
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: 'new_announce_id' }),
      doc: jest.fn((docId?: string) => {
        return {
          id: docId || 'new_announce_id',
          ...mockAnnouncementDoc,
        };
      }),
    };

    mockNotificationsCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'notif1',
            data: () => ({
              recipientId: 'user1',
              title: 'Direct Notif',
              read: false,
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: 'new_notif_id' }),
    };

    mockUsersCollection = {
      doc: jest.fn((docId: string) => {
        return {
          id: docId,
          get: jest.fn().mockResolvedValue({
            exists: userDocExists,
            data: () => ({ fcmToken: fcmTokenValue }),
          }),
        };
      }),
    };

    mockFirebaseService = {
      firestore: {
        collection: jest.fn((colName: string) => {
          if (colName === 'announcements') return mockAnnouncementsCollection;
          if (colName === 'notifications') return mockNotificationsCollection;
          if (colName === 'users') return mockUsersCollection;
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
        NotificationsService,
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  beforeEach(() => {
    userDocExists = true;
    fcmTokenValue = 'mock_fcm_token_123';
    jest.clearAllMocks();
    mockSend.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Broadcast Announcements', () => {
    it('should create an announcement (`createAnnouncement`)', async () => {
      const dto: CreateAnnouncementDto = {
        title: 'New Class Schedule',
        message: 'Schedule updated',
        targetRole: 'all',
        classId: 'class1',
      };
      const result = await service.createAnnouncement(dto, {
        uid: 'admin1',
        role: 'admin',
      });
      expect(result).toHaveProperty('id', 'new_announce_id');
      expect(result.message).toContain('successfully');
      expect(mockAnnouncementsCollection.add).toHaveBeenCalled();
      expect(auditLogsService.logAction).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when createAnnouncement fails', async () => {
      (mockAnnouncementsCollection.add as jest.Mock).mockRejectedValueOnce(
        new Error('DB Error'),
      );
      await expect(
        service.createAnnouncement({} as CreateAnnouncementDto),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should fetch announcements for a specific class (`getAnnouncementsByClass`)', async () => {
      // The mock returns two items: one global (classId = ''), one for 'class1'.
      // Filtering should return both for 'class1'.
      const list = await service.getAnnouncementsByClass('class1');
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(2);
      expect(list.map((a) => a.id)).toEqual(['announce1', 'announce2']);
    });

    it('should fetch announcements excluding those for other classes (`getAnnouncementsByClass`)', async () => {
      const list = await service.getAnnouncementsByClass('class99');
      // Should only return the global one
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('announce1');
    });

    it('should throw InternalServerErrorException when getAnnouncementsByClass fails', async () => {
      (mockAnnouncementsCollection.get as jest.Mock).mockRejectedValueOnce(
        new Error('DB Error'),
      );
      await expect(service.getAnnouncementsByClass('c1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Direct User Notifications', () => {
    it('should send a direct notification and trigger FCM push (`sendToUser`)', async () => {
      const dto: SendNotificationDto = {
        recipientId: 'user1',
        title: 'Homework',
        body: 'Due tomorrow',
        type: 'general',
      };
      const result = await service.sendToUser(dto, {
        uid: 'teacher1',
        role: 'teacher',
      });

      expect(result).toHaveProperty('id', 'new_notif_id');
      expect(mockNotificationsCollection.add).toHaveBeenCalled();
      expect(mockUsersCollection.doc).toHaveBeenCalledWith('user1');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'mock_fcm_token_123',
          notification: { title: 'Homework', body: 'Due tomorrow' },
          data: { type: 'general', notificationId: 'new_notif_id' },
        }),
      );
    });

    it('should save notification but not trigger FCM if user has no token', async () => {
      fcmTokenValue = null;
      const dto: SendNotificationDto = {
        recipientId: 'user1',
        title: 'Test',
        body: 'Test',
        type: 'general',
      };
      await service.sendToUser(dto);

      expect(mockNotificationsCollection.add).toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should gracefully continue and save notification even if FCM fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('FCM Timeout'));
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const dto: SendNotificationDto = {
        recipientId: 'user1',
        title: 'Test',
        body: 'Test',
        type: 'general',
      };
      const result = await service.sendToUser(dto);

      expect(result).toHaveProperty('id', 'new_notif_id');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ FCM Push Notification Error (saved in DB):',
        expect.any(Error),
      );
      consoleWarnSpy.mockRestore();
    });

    it('should throw InternalServerErrorException if saving to DB fails (`sendToUser`)', async () => {
      (mockNotificationsCollection.add as jest.Mock).mockRejectedValueOnce(
        new Error('DB failure'),
      );
      await expect(
        service.sendToUser({} as SendNotificationDto),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should fetch all notifications for a specific user (`getUserNotifications`)', async () => {
      const notifs = await service.getUserNotifications('user1');
      expect(Array.isArray(notifs)).toBe(true);
      expect(notifs[0].id).toBe('notif1');
    });

    it('should throw InternalServerErrorException when getUserNotifications fails', async () => {
      (mockNotificationsCollection.get as jest.Mock).mockRejectedValueOnce(
        new Error('DB failure'),
      );
      await expect(service.getUserNotifications('user1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
