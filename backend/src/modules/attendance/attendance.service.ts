import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
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
    @Inject(forwardRef(() => StudentsService))
    private readonly studentsService: StudentsService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super(firebase);
  }

  async batchCheckIn(checkInDto: BatchCheckInDto, auditContext?: any) {
    if (auditContext && auditContext.uid && auditContext.role) {
      await this.verifyTeacherClassOwnership(
        checkInDto.classId,
        auditContext.uid,
        auditContext.role,
      );
    }
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
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      console.error(
        '🔥 FIRESTORE ERROR (AttendanceService batchCheckIn):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to process batch check-in',
      );
    }
  }

  async getClassDateAttendance(
    classId: string,
    date: string,
    requesterUid?: string,
    requesterRole?: string,
  ) {
    if (requesterUid && requesterRole) {
      await this.verifyTeacherClassOwnership(
        classId,
        requesterUid,
        requesterRole,
      );
    }
    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .where('classId', '==', classId)
        .where('date', '==', date)
        .get();

      if (snapshot.empty) return { classId, date, records: [] };
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
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
    await this.verifyStudentAccess(studentId, requesterUid, requesterRole);

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

  async getStudentMonthlyAttendance(
    studentId: string,
    month?: string,
    requesterUid?: string,
    requesterRole?: string,
  ) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    await this.verifyStudentAccess(studentId, requesterUid, requesterRole);

    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .get();

      const monthlyHistory: any[] = [];
      let presentCount = 0;
      let homeworkedCount = 0;
      let permissionCount = 0;
      let absentCount = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as BatchCheckInDto;
        if (data.date && data.date.startsWith(targetMonth)) {
          if (data.records && Array.isArray(data.records)) {
            const record = data.records.find((r) => r.studentId === studentId);
            if (record) {
              if (record.status === 'present') presentCount++;
              else if (record.status === 'homeworked') homeworkedCount++;
              else if (record.status === 'permission') permissionCount++;
              else if (record.status === 'absent') absentCount++;

              monthlyHistory.push({
                classId: data.classId,
                date: data.date,
                status: record.status,
                notes: record.notes || '',
              });
            }
          }
        }
      });

      const totalSessions = monthlyHistory.length;
      const attendedOrHomeworked = presentCount + homeworkedCount;
      const engagementPercentage =
        totalSessions > 0
          ? Math.round((attendedOrHomeworked / totalSessions) * 100)
          : 0;

      return {
        studentId,
        month: targetMonth,
        totalSessions,
        metrics: {
          presentCount,
          homeworkedCount,
          permissionCount,
          absentCount,
          attendedOrHomeworked,
          engagementPercentage: `${engagementPercentage}%`,
        },
        history: monthlyHistory,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      console.error(
        '🔥 FIRESTORE ERROR (AttendanceService getStudentMonthlyAttendance):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to generate student monthly attendance summary',
      );
    }
  }

  async getClassMonthlyMetrics(
    classId: string,
    month?: string,
    requesterUid?: string,
    requesterRole?: string,
  ) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    if (requesterUid && requesterRole) {
      await this.verifyTeacherClassOwnership(
        classId,
        requesterUid,
        requesterRole,
      );
    }

    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .where('classId', '==', classId)
        .get();

      const monthlyDocs = snapshot.docs.filter((doc) => {
        const data = doc.data() as BatchCheckInDto;
        return data.date && data.date.startsWith(targetMonth);
      });

      const studentStatsMap = new Map<
        string,
        {
          present: number;
          homeworked: number;
          permission: number;
          absent: number;
          total: number;
        }
      >();

      for (const doc of monthlyDocs) {
        const data = doc.data() as BatchCheckInDto;
        if (data.records && Array.isArray(data.records)) {
          for (const rec of data.records) {
            const stats = studentStatsMap.get(rec.studentId) || {
              present: 0,
              homeworked: 0,
              permission: 0,
              absent: 0,
              total: 0,
            };
            if (rec.status === 'present') stats.present++;
            else if (rec.status === 'homeworked') stats.homeworked++;
            else if (rec.status === 'permission') stats.permission++;
            else if (rec.status === 'absent') stats.absent++;
            stats.total++;
            studentStatsMap.set(rec.studentId, stats);
          }
        }
      }

      const atRiskStudents: any[] = [];
      const studentMetrics: any[] = [];
      let totalRateSum = 0;

      for (const [studentId, stats] of studentStatsMap.entries()) {
        const studentDoc = await this.firebase.firestore
          .collection('students')
          .doc(studentId)
          .get();
        const studentName = studentDoc.exists
          ? `${(studentDoc.data() as any).firstName || ''} ${(studentDoc.data() as any).lastName || ''}`.trim()
          : 'Unknown Student';

        const attendedOrHw = stats.present + stats.homeworked;
        const rate =
          stats.total > 0 ? Math.round((attendedOrHw / stats.total) * 100) : 0;
        totalRateSum += rate;

        const metricItem = {
          studentId,
          studentName,
          totalSessions: stats.total,
          present: stats.present,
          homeworked: stats.homeworked,
          permission: stats.permission,
          absent: stats.absent,
          engagementPercentage: `${rate}%`,
        };
        studentMetrics.push(metricItem);

        if (stats.absent >= 3) {
          atRiskStudents.push({
            studentId,
            studentName,
            absentCount: stats.absent,
            totalSessions: stats.total,
            warning: 'High absence alert (>= 3 absences this month)',
          });
        }
      }

      const averageClassAttendanceRate =
        studentStatsMap.size > 0
          ? Math.round(totalRateSum / studentStatsMap.size)
          : 0;

      return {
        classId,
        month: targetMonth,
        totalCheckInDates: monthlyDocs.length,
        averageClassAttendanceRate: `${averageClassAttendanceRate}%`,
        atRiskStudents,
        studentMetrics,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      console.error(
        '🔥 FIRESTORE ERROR (AttendanceService getClassMonthlyMetrics):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to generate class monthly attendance metrics',
      );
    }
  }
}
