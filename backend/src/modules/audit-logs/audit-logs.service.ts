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
      return await this.create({
        ...auditDto,
        timestamp: new Date().toISOString(),
      } as any);
    } catch (error) {
      console.error('🔥 FIRESTORE ERROR (AuditLogsService):', error);
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
