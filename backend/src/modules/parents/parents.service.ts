import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class ParentsService extends FirestoreBaseService<CreateParentDto> {
  protected collectionName = 'parents';

  constructor(firebase: FirebaseService) {
    super(firebase);
  }

  async createOrUpdateProfile(
    uid: string,
    data: CreateParentDto | UpdateParentDto,
    auditContext?: any,
  ) {
    try {
      const parentRef = this.firebase.firestore
        .collection(this.collectionName)
        .doc(uid);
      const docSnap = await parentRef.get();

      if (docSnap.exists) {
        const payload: any = {
          ...data,
          updatedAt: new Date().toISOString(),
        };
        if (auditContext) payload.updatedBy = auditContext;
        await parentRef.update(payload);
        return { id: uid, message: 'Parent profile updated successfully!' };
      } else {
        const payload: any = {
          uid,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (auditContext) {
          payload.createdBy = auditContext;
          payload.updatedBy = auditContext;
        }
        await parentRef.set(payload);
        return { id: uid, message: 'Parent profile created successfully!' };
      }
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (ParentsService createOrUpdateProfile):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to create or update parent profile',
      );
    }
  }
}
