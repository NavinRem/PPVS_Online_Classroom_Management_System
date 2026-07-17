import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class AuditLogsService extends FirestoreBaseService<CreateAuditLogDto> {
  protected collectionName = 'audit_logs';

  constructor(firebase: FirebaseService) {
    super(firebase);
  }

  async logAction(auditDto: CreateAuditLogDto) {
    try {
      const docRef = await this.firebase.firestore
        .collection(this.collectionName)
        .add({
          ...auditDto,
          timestamp: new Date().toISOString(),
        });
      return {
        id: docRef.id,
        message: 'Audit log entry recorded successfully.',
      };
    } catch (error) {
      console.error('🔥 FIRESTORE ERROR (AuditLogsService):', error);
      // We don't throw an unhandled exception that stops critical business logic if audit writing fails,
      // but we log it and return null or rethrow based on severity.
      return null;
    }
  }

  async findByEntity(entity: string, entityId?: string, branchId?: string) {
    try {
      let query: FirebaseFirestore.Query = this.firebase.firestore.collection(
        this.collectionName,
      );
      if (entity) {
        query = query.where('entity', '==', entity);
      }
      if (entityId) {
        query = query.where('entityId', '==', entityId);
      }
      if (branchId) {
        query = query.where('branchId', '==', branchId);
      }
      const snapshot = await query.get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (AuditLogsService findByEntity):',
        error,
      );
      throw new InternalServerErrorException('Failed to fetch audit logs');
    }
  }
}
