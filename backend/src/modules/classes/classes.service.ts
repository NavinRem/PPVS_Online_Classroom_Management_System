import { Injectable } from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import { CreateClassDto } from './dto/create-class.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class ClassesService extends FirestoreBaseService<CreateClassDto> {
  protected collectionName = 'classes';

  constructor(firebase: FirebaseService) {
    super(firebase);
  }

  create(createClassDto: CreateClassDto) {
    const classDataWithEnrollment = {
      ...createClassDto,
      currentEnrollment: 0,
    };
    return super.create(classDataWithEnrollment);
  }
}
