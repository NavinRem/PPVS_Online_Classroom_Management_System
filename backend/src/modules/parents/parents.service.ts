import { Injectable } from '@nestjs/common';
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
    return this.createOrUpdate(uid, { uid, ...data }, auditContext);
  }
}
