import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import { BatchCheckInDto } from './dto/check-in.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { StudentsService } from '../students/students.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AttendanceService extends FirestoreBaseService<BatchCheckInDto> {
  protected collectionName = 'attendance_records';

  constructor(
    firebase: FirebaseService,
    private readonly studentsService: StudentsService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super(firebase);
  }

  async batchCheckIn(checkInDto: BatchCheckInDto, auditContext?: any) {
    try {
      // Check if attendance already exists for this classId and date
      const existingSnap = await this.firebase.firestore
        .collection(this.collectionName)
        .where('classId', '==', checkInDto.classId)
        .where('date', '==', checkInDto.date)
        .get();

      const payload: any = {
        ...checkInDto,
        updatedAt: new Date().toISOString(),
      };
      if (auditContext) payload.updatedBy = auditContext;

      let docId: string;
      if (!existingSnap.empty) {
        docId = existingSnap.docs[0].id;
        await this.firebase.firestore
          .collection(this.collectionName)
          .doc(docId)
          .update(payload);
      } else {
        payload.createdAt = new Date().toISOString();
        if (auditContext) payload.createdBy = auditContext;
        const newDoc = await this.firebase.firestore
          .collection(this.collectionName)
          .add(payload);
        docId = newDoc.id;
      }

      if (auditContext) {
        await this.auditLogsService.logAction({
          action: existingSnap.empty ? 'CREATE' : 'UPDATE',
          entity: 'attendance_records',
          entityId: docId,
          modifiedBy: auditContext,
          details: {
            classId: checkInDto.classId,
            date: checkInDto.date,
            count: checkInDto.records.length,
          },
        });
      }

      return {
        id: docId,
        message: 'Class attendance check-in saved successfully.',
      };
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (AttendanceService batchCheckIn):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to process batch check-in',
      );
    }
  }

  async getClassDateAttendance(classId: string, date: string) {
    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .where('classId', '==', classId)
        .where('date', '==', date)
        .get();

      if (snapshot.empty) return { classId, date, records: [] };
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (AttendanceService getClassDateAttendance):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch class attendance',
      );
    }
  }

  async getStudentAttendanceHistory(
    studentId: string,
    requesterUid: string,
    requesterRole: string,
  ) {
    // Ownership check
    if (requesterRole !== 'admin' && requesterRole !== 'teacher') {
      if (requesterUid !== studentId) {
        const student = (await this.studentsService.findOne(studentId)) as any;
        if (!student || student.parentId !== requesterUid) {
          throw new ForbiddenException(
            'Access Denied: You can only view attendance for yourself or your own children.',
          );
        }
      }
    }

    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .get();

      const history: any[] = [];
      let presentCount = 0;
      let homeworkedCount = 0;
      let permissionCount = 0;
      let absentCount = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as BatchCheckInDto;
        if (data.records && Array.isArray(data.records)) {
          const record = data.records.find((r) => r.studentId === studentId);
          if (record) {
            if (record.status === 'present') presentCount++;
            else if (record.status === 'homeworked') homeworkedCount++;
            else if (record.status === 'permission') permissionCount++;
            else if (record.status === 'absent') absentCount++;

            history.push({
              classId: data.classId,
              date: data.date,
              status: record.status,
              notes: record.notes || '',
            });
          }
        }
      });

      const totalSessions = history.length;
      const attendedOrHomeworked = presentCount + homeworkedCount;
      const engagementPercentage =
        totalSessions > 0
          ? Math.round((attendedOrHomeworked / totalSessions) * 100)
          : 0;

      return {
        studentId,
        totalSessions,
        metrics: {
          presentCount,
          homeworkedCount,
          permissionCount,
          absentCount,
          attendedOrHomeworked,
          engagementPercentage: `${engagementPercentage}%`,
        },
        history,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      console.error(
        '🔥 FIRESTORE ERROR (AttendanceService getStudentAttendanceHistory):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to generate student attendance summary',
      );
    }
  }
}
