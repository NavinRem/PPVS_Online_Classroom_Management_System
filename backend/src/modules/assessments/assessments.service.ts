import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import {
  CreateAssessmentDto,
  RecordGradeDto,
} from './dto/create-assessment.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { StudentsService } from '../students/students.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AssessmentsService extends FirestoreBaseService<CreateAssessmentDto> {
  protected collectionName = 'assessments';

  constructor(
    firebase: FirebaseService,
    @Inject(forwardRef(() => StudentsService))
    private readonly studentsService: StudentsService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super(firebase);
  }

  async createAssessment(createDto: CreateAssessmentDto, auditContext?: any) {
    return this.create(createDto, auditContext);
  }

  async recordGrade(recordDto: RecordGradeDto, auditContext?: any) {
    try {
      const gradesRef = this.firebase.firestore.collection('student_grades');
      // Check existing grade record
      const existing = await gradesRef
        .where('assessmentId', '==', recordDto.assessmentId)
        .where('studentId', '==', recordDto.studentId)
        .get();

      const payload: any = {
        ...recordDto,
        updatedAt: new Date().toISOString(),
      };
      if (auditContext) payload.updatedBy = auditContext;

      if (!existing.empty) {
        const docId = existing.docs[0].id;
        await gradesRef.doc(docId).update(payload);
        return { id: docId, message: 'Grade updated successfully!' };
      } else {
        payload.createdAt = new Date().toISOString();
        if (auditContext) payload.createdBy = auditContext;
        const newDoc = await gradesRef.add(payload);
        return { id: newDoc.id, message: 'Grade recorded successfully!' };
      }
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (AssessmentsService recordGrade):',
        error,
      );
      throw new InternalServerErrorException('Failed to record student grade');
    }
  }

  async getClassAssessments(
    classId: string,
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
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      console.error(
        '🔥 FIRESTORE ERROR (AssessmentsService getClassAssessments):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch class assessments',
      );
    }
  }

  async getStudentPerformanceSummary(
    studentId: string,
    requesterUid: string,
    requesterRole: string,
  ) {
    // Ownership Verification
    await this.verifyStudentAccess(studentId, requesterUid, requesterRole);

    try {
      const gradesSnap = await this.firebase.firestore
        .collection('student_grades')
        .where('studentId', '==', studentId)
        .get();

      const grades = gradesSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      let totalEarned = 0;
      let totalMax = 0;
      const detailedGrades: any[] = [];

      for (const grade of grades) {
        const assessmentDoc = await this.firebase.firestore
          .collection(this.collectionName)
          .doc(grade.assessmentId)
          .get();

        if (assessmentDoc.exists) {
          const assessment = assessmentDoc.data() as any;
          totalEarned += Number(grade.score || 0);
          totalMax += Number(assessment.maxScore || 100);

          detailedGrades.push({
            assessmentId: assessmentDoc.id,
            title: assessment.title,
            type: assessment.type,
            score: grade.score,
            maxScore: assessment.maxScore,
            comments: grade.comments || '',
            recordedAt: grade.updatedAt || grade.createdAt,
          });
        }
      }

      const overallPercentage =
        totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
      let gpaEquivalent = 'N/A';
      if (totalMax > 0) {
        if (overallPercentage >= 90) gpaEquivalent = '4.0 (A)';
        else if (overallPercentage >= 80) gpaEquivalent = '3.0 (B)';
        else if (overallPercentage >= 70) gpaEquivalent = '2.0 (C)';
        else if (overallPercentage >= 60) gpaEquivalent = '1.0 (D)';
        else gpaEquivalent = '0.0 (F)';
      }

      return {
        studentId,
        totalAssessments: detailedGrades.length,
        overallPercentage: `${overallPercentage}%`,
        gpaEquivalent,
        detailedGrades,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      console.error(
        '🔥 FIRESTORE ERROR (AssessmentsService getStudentPerformanceSummary):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to calculate student performance summary',
      );
    }
  }

  async getStudentMonthlyReport(
    studentId: string,
    month?: string,
    requesterUid?: string,
    requesterRole?: string,
  ) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    await this.verifyStudentAccess(studentId, requesterUid, requesterRole);

    try {
      const gradesSnap = await this.firebase.firestore
        .collection('student_grades')
        .where('studentId', '==', studentId)
        .get();

      const grades = gradesSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      let totalEarned = 0;
      let totalMax = 0;
      const monthlyGrades: any[] = [];
      const remarksList: string[] = [];
      let primaryClassId: string | null = null;

      for (const grade of grades) {
        const assessmentDoc = await this.firebase.firestore
          .collection(this.collectionName)
          .doc(grade.assessmentId)
          .get();

        if (assessmentDoc.exists) {
          const assessment = assessmentDoc.data() as any;
          if (!primaryClassId && assessment.classId) {
            primaryClassId = String(assessment.classId);
          }
          const gradeDate: string = String(
            grade.updatedAt || grade.createdAt || assessment.dueDate || '',
          );
          const assessDueDate: string = String(assessment.dueDate || '');
          if (
            gradeDate.startsWith(targetMonth) ||
            (assessDueDate && assessDueDate.startsWith(targetMonth))
          ) {
            const scoreNum = Number(grade.score || 0);
            const maxNum = Number(assessment.maxScore || 100);
            totalEarned += scoreNum;
            totalMax += maxNum;
            if (grade.comments) remarksList.push(String(grade.comments));

            monthlyGrades.push({
              assessmentId: assessmentDoc.id,
              title: String(assessment.title || ''),
              type: String(assessment.type || ''),
              score: scoreNum,
              maxScore: maxNum,
              comments: String(grade.comments || ''),
              recordedAt: gradeDate,
            });
          }
        }
      }

      const monthlyPercentage =
        totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
      let evaluationBand = 'Needs Improvement';
      if (monthlyPercentage >= 90) evaluationBand = 'Excellent';
      else if (monthlyPercentage >= 80) evaluationBand = 'Good';
      else if (monthlyPercentage >= 70) evaluationBand = 'Satisfactory';

      let classRanking = 'N/A';
      if (primaryClassId && totalMax > 0) {
        const enrollmentsSnap = await this.firebase.firestore
          .collection('enrollments')
          .where('classId', '==', primaryClassId)
          .get();
        const classmateScores: { studentId: string; percentage: number }[] = [];

        for (const enrollDoc of enrollmentsSnap.docs) {
          const classmateId = (enrollDoc.data() as { studentId: string })
            .studentId;
          const cmGradesSnap = await this.firebase.firestore
            .collection('student_grades')
            .where('studentId', '==', classmateId)
            .get();
          let cmEarned = 0;
          let cmMax = 0;
          for (const cmGradeDoc of cmGradesSnap.docs) {
            const cmGrade = cmGradeDoc.data() as any;
            const cmAssessDoc = await this.firebase.firestore
              .collection(this.collectionName)
              .doc(String(cmGrade.assessmentId))
              .get();
            if (cmAssessDoc.exists) {
              const cmAssess = cmAssessDoc.data() as any;
              const cmDate: string = String(
                cmGrade.updatedAt ||
                  cmGrade.createdAt ||
                  cmAssess.dueDate ||
                  '',
              );
              const cmAssessDueDate: string = String(cmAssess.dueDate || '');
              if (
                cmDate.startsWith(targetMonth) ||
                (cmAssessDueDate && cmAssessDueDate.startsWith(targetMonth))
              ) {
                cmEarned += Number(cmGrade.score || 0);
                cmMax += Number(cmAssess.maxScore || 100);
              }
            }
          }
          const cmPercentage =
            cmMax > 0 ? Math.round((cmEarned / cmMax) * 100) : 0;
          classmateScores.push({
            studentId: classmateId,
            percentage: cmPercentage,
          });
        }

        classmateScores.sort((a, b) => b.percentage - a.percentage);
        const rankIdx = classmateScores.findIndex(
          (cs) => cs.studentId === studentId,
        );
        if (rankIdx !== -1) {
          classRanking = `${rankIdx + 1} out of ${classmateScores.length} students`;
        }
      }

      return {
        studentId,
        month: targetMonth,
        totalAssessments: monthlyGrades.length,
        monthlyPercentage: `${monthlyPercentage}%`,
        evaluationBand,
        classRanking,
        remarks:
          remarksList.length > 0
            ? remarksList.join('; ')
            : 'No remarks for this month.',
        detailedGrades: monthlyGrades,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      console.error(
        '🔥 FIRESTORE ERROR (AssessmentsService getStudentMonthlyReport):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to generate student monthly report',
      );
    }
  }

  async getClassMonthlySummary(
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
      const enrollmentsSnap = await this.firebase.firestore
        .collection('enrollments')
        .where('classId', '==', classId)
        .get();

      const leaderboard: any[] = [];
      for (const enrollDoc of enrollmentsSnap.docs) {
        const enrollment = enrollDoc.data() as { studentId: string };
        const studentDoc = await this.firebase.firestore
          .collection('students')
          .doc(enrollment.studentId)
          .get();
        const studentName = studentDoc.exists
          ? `${(studentDoc.data() as any).firstName || ''} ${(studentDoc.data() as any).lastName || ''}`.trim()
          : 'Unknown Student';

        const monthlyReport = await this.getStudentMonthlyReport(
          enrollment.studentId,
          targetMonth,
          'system',
          'admin',
        );

        leaderboard.push({
          studentId: enrollment.studentId,
          studentName,
          monthlyPercentage: monthlyReport.monthlyPercentage,
          rawPercentage:
            Number(monthlyReport.monthlyPercentage.replace('%', '')) || 0,
          evaluationBand: monthlyReport.evaluationBand,
          totalAssessments: monthlyReport.totalAssessments,
          remarks: monthlyReport.remarks,
        });
      }

      leaderboard.sort((a, b) => b.rawPercentage - a.rawPercentage);
      const rankedLeaderboard = leaderboard.map((item, idx) => ({
        rank: idx + 1,
        ...item,
      }));

      return {
        classId,
        month: targetMonth,
        totalStudents: rankedLeaderboard.length,
        leaderboard: rankedLeaderboard,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
      console.error(
        '🔥 FIRESTORE ERROR (AssessmentsService getClassMonthlySummary):',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to generate class monthly summary',
      );
    }
  }
}
