import { Injectable, InternalServerErrorException } from '@nestjs/common';

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
    try {
      const userRef = this.firebase.firestore
        .collection(this.collectionName)
        .doc(uid);
      const docSnap = await userRef.get();

      if (docSnap.exists) {
        await userRef.update({
          ...data,
          updatedAt: new Date().toISOString(),
        });
        return { id: uid, message: 'User role/profile updated successfully!' };
      } else {
        await userRef.set({
          uid,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return { id: uid, message: 'User role/profile created successfully!' };
      }
    } catch (error) {
      console.error('🔥 FIRESTORE ERROR (createOrUpdateUser):', error);
      throw new InternalServerErrorException(
        'Failed to create or update user profile',
      );
    }
  }
}
