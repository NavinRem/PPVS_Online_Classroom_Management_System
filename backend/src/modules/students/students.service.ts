import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { AttendanceService } from '../attendance/attendance.service';

@Injectable()
export class StudentsService extends FirestoreBaseService<CreateStudentDto> {
  protected collectionName = 'students';

  constructor(
    firebase: FirebaseService,
    @Inject(forwardRef(() => AssessmentsService))
    private readonly assessmentsService: AssessmentsService,
    @Inject(forwardRef(() => AttendanceService))
    private readonly attendanceService: AttendanceService,
  ) {
    super(firebase);
  }

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

  async getStudentMonthlyDashboard(
    studentId: string,
    month?: string,
    requesterUid?: string,
    requesterRole?: string,
  ) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    await this.verifyStudentAccess(studentId, requesterUid, requesterRole);

    try {
      const studentProfile = await this.findOne(studentId);
      const monthlyReport =
        await this.assessmentsService.getStudentMonthlyReport(
          studentId,
          targetMonth,
          'system',
          'admin',
        );
      const monthlyAttendance =
        await this.attendanceService.getStudentMonthlyAttendance(
          studentId,
          targetMonth,
          'system',
          'admin',
        );

      const enrollmentsSnap = await this.firebase.firestore
        .collection('enrollments')
        .where('studentId', '==', studentId)
        .get();

      const activeEnrollments: any[] = [];
      const enrollmentIds: string[] = [];

      for (const enrollDoc of enrollmentsSnap.docs) {
        enrollmentIds.push(enrollDoc.id);
        const enrollData = enrollDoc.data() as {
          classId: string;
          status: string;
        };
        const classDoc = await this.firebase.firestore
          .collection('classes')
          .doc(enrollData.classId)
          .get();
        if (classDoc.exists) {
          activeEnrollments.push({
            enrollmentId: enrollDoc.id,
            classId: classDoc.id,
            status: enrollData.status,
            ...classDoc.data(),
          });
        }
      }

      const pendingInvoices: any[] = [];
      const invoicesSnap = await this.firebase.firestore
        .collection('invoices')
        .get();

      invoicesSnap.docs.forEach((doc) => {
        const inv = doc.data() as any;
        if (
          (inv.studentId === studentId ||
            (inv.enrollmentId && enrollmentIds.includes(inv.enrollmentId))) &&
          (inv.status === 'pending_payment' || inv.status === 'unpaid')
        ) {
          pendingInvoices.push({ id: doc.id, ...inv });
        }
      });

      return {
        studentId,
        studentProfile,
        month: targetMonth,
        monthlyReport,
        monthlyAttendance,
        activeEnrollments,
        pendingInvoices,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      console.error(
        '🔥 FIRESTORE ERROR (StudentsService getStudentMonthlyDashboard):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to generate unified student monthly dashboard',
      );
    }
  }
}
