import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class EnrollmentsService extends FirestoreBaseService<CreateEnrollmentDto> {
  protected collectionName = 'enrollments';

  constructor(firebase: FirebaseService) {
    super(firebase);
  }

  async create(createEnrollmentDto: CreateEnrollmentDto) {
    const { classId, studentId } = createEnrollmentDto;
    const db = this.firebase.firestore;

    try {
      return await db.runTransaction(async (transaction) => {
        const classRef = db.collection('classes').doc(classId);
        const classDoc = await transaction.get(classRef);

        if (!classDoc.exists) {
          throw new BadRequestException('The requested class does not exist.');
        }

        const classData = classDoc.data() as {
          currentEnrollment: number;
          maxCapacity: number;
          price?: number;
        };
        const currentEnrollment = classData.currentEnrollment ?? 0;
        const maxCapacity = classData.maxCapacity ?? 0;

        if (currentEnrollment >= maxCapacity) {
          throw new BadRequestException(
            'Registration failed: This class is already full.',
          );
        }

        const enrollmentsRef = db.collection('enrollments');
        const duplicateCheck = await enrollmentsRef
          .where('classId', '==', classId)
          .where('studentId', '==', studentId)
          .get();

        if (!duplicateCheck.empty) {
          throw new BadRequestException(
            'This student is already enrolled in this class.',
          );
        }
        transaction.update(classRef, {
          currentEnrollment: currentEnrollment + 1,
        });

        const initialStatus =
          classData.price && classData.price > 0 ? 'pending_payment' : 'active';
        const newEnrollmentRef = enrollmentsRef.doc();
        transaction.set(newEnrollmentRef, {
          ...createEnrollmentDto,
          status: initialStatus,
          createdAt: new Date().toISOString(),
        });

        return {
          id: newEnrollmentRef.id,
          status: initialStatus,
          message: 'Student successfully enrolled in the class!',
        };
      });
    } catch (error) {
      console.error('🔥 TRANSACTION ERROR:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to process enrollment');
    }
  }

  async updateStatus(
    enrollmentId: string,
    status: 'pending_payment' | 'active' | 'dropped' | 'completed',
    auditContext?: any,
  ) {
    return this.update(enrollmentId, { status } as any, auditContext);
  }

  async getMySchedule(parentId: string) {
    const db = this.firebase.firestore;

    try {
      const enrollmentsSnap = await db
        .collection(this.collectionName)
        .where('parentId', '==', parentId)
        .get();

      if (enrollmentsSnap.empty) return [];

      const schedulePromises = enrollmentsSnap.docs.map(async (doc) => {
        const enrollmentData = doc.data() as {
          studentId: string;
          classId: string;
          createdAt: string;
        };

        const studentDoc = await db
          .collection('students')
          .doc(enrollmentData.studentId)
          .get();
        const studentData = studentDoc.exists
          ? (studentDoc.data() as { firstName: string; lastName: string })
          : { firstName: 'Unknown', lastName: 'Student' };

        const classDoc = await db
          .collection('classes')
          .doc(enrollmentData.classId)
          .get();
        const classData = classDoc.exists
          ? (classDoc.data() as {
              className: string;
              day: string;
              time: string;
            })
          : { className: 'Unknown Class', day: 'TBD', time: 'TBD' };

        return {
          enrollmentId: doc.id,
          studentName: `${studentData.firstName} ${studentData.lastName}`,
          className: classData.className,
          schedule: `${classData.day}s at ${classData.time}`,
          enrolledAt: enrollmentData.createdAt,
        };
      });

      return await Promise.all(schedulePromises);
    } catch (error) {
      console.error('🔥 AGGREGATION ERROR:', error);
      throw new InternalServerErrorException('Failed to generate schedule');
    }
  }
}
