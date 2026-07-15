import { Injectable, OnModuleInit } from '@nestjs/common';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (getApps().length === 0) {
      // 1. Route all database traffic to the local sandbox
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

      // 2. Initialize strictly offline using just your Project ID
      initializeApp({
        projectId: 'ppvs-online-classroom-system',
      });

      console.log(
        '🔥 Firebase Admin initialized successfully (Using Local Emulator)',
      );
    }
  }

  get firestore() {
    return getFirestore();
  }
}
