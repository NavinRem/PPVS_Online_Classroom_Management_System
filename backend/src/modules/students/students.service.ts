import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class StudentsService extends FirestoreBaseService<CreateStudentDto> {
  protected collectionName = 'students';

  constructor(firebase: FirebaseService) {
    super(firebase);
  }

  // Add this custom query inside StudentsService
  async findByParentId(parentId: string) {
    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .where('parentId', '==', parentId)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('🔥 FIRESTORE ERROR:', error);
      throw new InternalServerErrorException('Failed to fetch your children');
    }
  }
}
