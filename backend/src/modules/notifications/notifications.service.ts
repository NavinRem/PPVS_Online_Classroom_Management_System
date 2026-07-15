import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import {
  CreateAnnouncementDto,
  SendNotificationDto,
} from './dto/create-announcement.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationsService extends FirestoreBaseService<CreateAnnouncementDto> {
  protected collectionName = 'announcements';

  constructor(
    firebase: FirebaseService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super(firebase);
  }

  async createAnnouncement(
    createDto: CreateAnnouncementDto,
    auditContext?: any,
  ) {
    try {
      const payload: any = {
        ...createDto,
        createdAt: new Date().toISOString(),
      };
      if (auditContext) payload.createdBy = auditContext;

      const docRef = await this.firebase.firestore
        .collection(this.collectionName)
        .add(payload);

      if (auditContext) {
        await this.auditLogsService.logAction({
          action: 'CREATE',
          entity: 'announcements',
          entityId: docRef.id,
          modifiedBy: auditContext,
          details: { title: createDto.title, targetRole: createDto.targetRole },
        });
      }

      return {
        id: docRef.id,
        ...payload,
        message: 'Announcement broadcasted successfully.',
      };
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (NotificationsService createAnnouncement):',
        error,
      );
      throw new InternalServerErrorException('Failed to create announcement');
    }
  }

  async getAnnouncementsByClass(classId: string) {
    try {
      // Get global or class-specific announcements
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .get();

      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .filter((a) => !a.classId || a.classId === classId);
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (NotificationsService getAnnouncementsByClass):',
        error,
      );
      throw new InternalServerErrorException('Failed to fetch announcements');
    }
  }

  async sendToUser(sendDto: SendNotificationDto, auditContext?: any) {
    try {
      const payload: any = {
        ...sendDto,
        read: false,
        createdAt: new Date().toISOString(),
      };
      if (auditContext) payload.createdBy = auditContext;

      const docRef = await this.firebase.firestore
        .collection('notifications')
        .add(payload);

      // Attempt push notification via FCM if recipient has registered device token
      try {
        const userDoc = await this.firebase.firestore
          .collection('users')
          .doc(sendDto.recipientId)
          .get();
        if (userDoc.exists) {
          const fcmToken = userDoc.data()?.fcmToken;
          if (fcmToken) {
            await getMessaging().send({
              token: fcmToken,
              notification: {
                title: sendDto.title,
                body: sendDto.body,
              },
              data: {
                type: sendDto.type,
                notificationId: docRef.id,
                ...(sendDto.metadata || {}),
              },
            });
          }
        }
      } catch (fcmError) {
        console.warn('⚠️ FCM Push Notification Error (saved in DB):', fcmError);
      }

      return { id: docRef.id, message: 'Notification sent successfully.' };
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (NotificationsService sendToUser):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to send user notification',
      );
    }
  }

  async getUserNotifications(userId: string) {
    try {
      const snapshot = await this.firebase.firestore
        .collection('notifications')
        .where('recipientId', '==', userId)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (NotificationsService getUserNotifications):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch user notifications',
      );
    }
  }
}
