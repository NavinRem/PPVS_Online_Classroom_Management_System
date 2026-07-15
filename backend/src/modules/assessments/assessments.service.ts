import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
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

  async getClassAssessments(classId: string) {
    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .where('classId', '==', classId)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
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
    if (requesterRole !== 'admin' && requesterRole !== 'teacher') {
      if (requesterUid !== studentId) {
        // Check if requester is the parent of this student
        const student = (await this.studentsService.findOne(studentId)) as any;
        if (!student || student.parentId !== requesterUid) {
          throw new ForbiddenException(
            'Access Denied: You can only view academic performance for yourself or your own children.',
          );
        }
      }
    }

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
}
