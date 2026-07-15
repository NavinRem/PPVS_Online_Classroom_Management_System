import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  FirestoreBaseService,
  AuditContext,
} from '../../common/firebase-base.service';
import { CreateSessionDto, CreateMaterialDto } from './dto/create-session.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SessionsService extends FirestoreBaseService<CreateSessionDto> {
  protected collectionName = 'class_sessions';

  constructor(
    firebase: FirebaseService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super(firebase);
  }

  async createSession(
    createDto: CreateSessionDto,
    auditContext?: AuditContext,
  ) {
    try {
      const payload: Record<string, unknown> = {
        ...(createDto as unknown as Record<string, unknown>),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (auditContext) {
        payload.createdBy = auditContext;
        payload.updatedBy = auditContext;
      }
      const docRef = await this.firebase.firestore
        .collection(this.collectionName)
        .add(payload);

      if (auditContext) {
        await this.auditLogsService.logAction({
          action: 'CREATE',
          entity: 'class_sessions',
          entityId: docRef.id,
          modifiedBy: auditContext,
          details: { classId: createDto.classId, topic: createDto.topic },
        });
      }

      return {
        id: docRef.id,
        ...payload,
        message: 'Class session created successfully.',
      };
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (SessionsService createSession):',
        error,
      );
      throw new InternalServerErrorException('Failed to create class session');
    }
  }

  async getSessionsByClass(classId: string) {
    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .where('classId', '==', classId)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (SessionsService getSessionsByClass):',
        error,
      );
      throw new InternalServerErrorException('Failed to fetch class sessions');
    }
  }

  async createMaterial(
    createDto: CreateMaterialDto,
    auditContext?: AuditContext,
  ) {
    try {
      const payload: Record<string, unknown> = {
        ...(createDto as unknown as Record<string, unknown>),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (auditContext) {
        payload.createdBy = auditContext;
        payload.updatedBy = auditContext;
      }
      const docRef = await this.firebase.firestore
        .collection('course_materials')
        .add(payload);

      if (auditContext) {
        await this.auditLogsService.logAction({
          action: 'CREATE',
          entity: 'course_materials',
          entityId: docRef.id,
          modifiedBy: auditContext,
          details: { classId: createDto.classId, title: createDto.title },
        });
      }

      return {
        id: docRef.id,
        ...payload,
        message: 'Course material uploaded/linked successfully.',
      };
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (SessionsService createMaterial):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to create course material',
      );
    }
  }

  async getMaterialsByClass(classId: string) {
    try {
      const snapshot = await this.firebase.firestore
        .collection('course_materials')
        .where('classId', '==', classId)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (SessionsService getMaterialsByClass):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch course materials',
      );
    }
  }

  async findMaterialById(id: string) {
    try {
      const doc = await this.firebase.firestore
        .collection('course_materials')
        .doc(id)
        .get();
      if (!doc.exists) {
        throw new NotFoundException(`Material with ID ${id} not found`);
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch course material');
    }
  }

  async updateMaterial(
    id: string,
    data: Partial<CreateMaterialDto>,
    auditContext?: AuditContext,
  ) {
    try {
      const payload: Record<string, unknown> = {
        ...(data as unknown as Record<string, unknown>),
        updatedAt: new Date().toISOString(),
      };
      if (auditContext) payload.updatedBy = auditContext;
      await this.firebase.firestore
        .collection('course_materials')
        .doc(id)
        .update(payload);
      return { id, message: 'Course material successfully updated!' };
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (SessionsService updateMaterial):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to update course material',
      );
    }
  }

  async removeMaterial(id: string) {
    try {
      await this.firebase.firestore
        .collection('course_materials')
        .doc(id)
        .delete();
      return { id, message: 'Course material successfully deleted!' };
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (SessionsService removeMaterial):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to delete course material',
      );
    }
  }
}
