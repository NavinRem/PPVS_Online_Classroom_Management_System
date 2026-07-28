import { Injectable } from '@nestjs/common';

import { FirestoreBaseService } from '../../common/firebase-base.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class UsersService extends FirestoreBaseService<CreateUserDto> {
  protected collectionName = 'users';

  constructor(firebase: FirebaseService) {
    super(firebase);
  }

  async createOrUpdateUser(uid: string, data: CreateUserDto | UpdateUserDto) {
    return this.createOrUpdate(uid, { uid, ...data });
  }

  async findByEmail(email: string) {
    return this.findOneByField('email', email);
  }

  async findByPhoneNumber(phoneNumber: string) {
    return this.findOneByField('phoneNumber', phoneNumber);
  }
}
