import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class BranchesService extends FirestoreBaseService<CreateBranchDto> {
  protected collectionName = 'branches';

  constructor(firebase: FirebaseService) {
    super(firebase);
  }

  async findByCode(code: string) {
    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .where('code', '==', code)
        .get();

      if (snapshot.empty) {
        throw new NotFoundException(`Branch with code '${code}' not found`);
      }

      const doc = snapshot.docs[0];
      return this.formatResponse(doc.id, doc.data());
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('🔥 FIRESTORE ERROR (BranchesService findByCode):', error);
      throw new InternalServerErrorException('Failed to fetch branch by code');
    }
  }
}
