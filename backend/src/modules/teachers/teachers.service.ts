import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class TeachersService extends FirestoreBaseService<CreateTeacherDto> {
  protected collectionName = 'teachers';

  constructor(firebase: FirebaseService) {
    super(firebase);
  }

  async findByUid(uid: string) {
    try {
      const docRef = await this.firebase.firestore
        .collection(this.collectionName)
        .doc(uid)
        .get();

      if (!docRef.exists) {
        throw new NotFoundException(
          `Teacher profile with UID ${uid} not found`,
        );
      }

      return { id: docRef.id, ...docRef.data() };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('🔥 FIRESTORE ERROR (TeachersService findByUid):', error);
      throw new InternalServerErrorException('Failed to fetch teacher profile');
    }
  }

  async getAssignedClasses(teacherUid: string) {
    try {
      // Look for classes where teacherId is this teacher's doc ID or UID
      const snapshot = await this.firebase.firestore
        .collection('classes')
        .where('teacherId', '==', teacherUid)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (TeachersService getAssignedClasses):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch assigned classes',
      );
    }
  }
}
