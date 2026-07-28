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
      return await this.findOneByField('code', code);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('🔥 FIRESTORE ERROR (BranchesService findByCode):', error);
      throw new InternalServerErrorException('Failed to fetch branch by code');
    }
  }
}
