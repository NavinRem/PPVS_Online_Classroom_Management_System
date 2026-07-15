import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../config/firebase/firebase.service';

export interface AuditContext {
  uid: string;
  role?: string;
  name?: string;
}

export type FirestorePayload = Record<string, unknown>;

export abstract class FirestoreBaseService<T> {
  protected abstract collectionName: string;

  constructor(protected readonly firebase: FirebaseService) {}

  protected formatCreatePayload(
    data: T,
    auditContext?: AuditContext,
  ): FirestorePayload {
    const payload: FirestorePayload = {
      ...(data as unknown as Record<string, unknown>),
      createdAt: new Date().toISOString(),
    };
    if (auditContext) {
      payload.createdBy = auditContext;
      payload.updatedBy = auditContext;
    }
    return payload;
  }

  protected formatUpdatePayload(
    data: Partial<T>,
    auditContext?: AuditContext,
  ): FirestorePayload {
    const payload: FirestorePayload = {
      ...(data as unknown as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    };
    if (auditContext) {
      payload.updatedBy = auditContext;
    }
    return payload;
  }

  protected formatResponse(
    id: string,
    data?: Record<string, unknown>,
  ): T & { id: string } {
    return {
      id,
      ...(data as unknown as Record<string, unknown>),
    } as T & { id: string };
  }

  async create(data: T, auditContext?: AuditContext) {
    try {
      const payload = this.formatCreatePayload(data, auditContext);
      const docRef = await this.firebase.firestore
        .collection(this.collectionName)
        .add(payload);
      return {
        id: docRef.id,
        message: `Record successfully created in ${this.collectionName}!`,
      };
    } catch (error) {
      console.error(`🔥 FIRESTORE ERROR (${this.collectionName}):`, error);
      throw new InternalServerErrorException(`Failed to create record`);
    }
  }

  async findAll() {
    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .get();
      return snapshot.docs.map((doc) =>
        this.formatResponse(doc.id, doc.data() as Record<string, unknown>),
      );
    } catch (error) {
      console.error(`🔥 FIRESTORE ERROR (${this.collectionName}):`, error);
      throw new InternalServerErrorException('Failed to fetch records');
    }
  }

  async findOne(id: string) {
    try {
      const doc = await this.firebase.firestore
        .collection(this.collectionName)
        .doc(id)
        .get();
      if (!doc.exists) {
        throw new NotFoundException(`Record with ID ${id} not found`);
      }
      return this.formatResponse(doc.id, doc.data());
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(`🔥 FIRESTORE ERROR (${this.collectionName}):`, error);
      throw new InternalServerErrorException('Failed to fetch record');
    }
  }

  async update(id: string, data: Partial<T>, auditContext?: AuditContext) {
    try {
      const payload = this.formatUpdatePayload(data, auditContext);
      await this.firebase.firestore
        .collection(this.collectionName)
        .doc(id)
        .update(payload);
      return { id, message: `Record successfully updated!` };
    } catch (error) {
      console.error(`🔥 FIRESTORE ERROR (${this.collectionName}):`, error);
      throw new InternalServerErrorException('Failed to update record');
    }
  }

  async remove(id: string) {
    try {
      await this.firebase.firestore
        .collection(this.collectionName)
        .doc(id)
        .delete();
      return { id, message: `Record successfully deleted!` };
    } catch (error) {
      console.error(`🔥 FIRESTORE ERROR (${this.collectionName}):`, error);
      throw new InternalServerErrorException('Failed to delete record');
    }
  }
}
