import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';

/**
 * Verifies that the requester is either an Admin (Principal) or the assigned Teacher for the specified class.
 */
export async function verifyTeacherClassOwnershipUtil(
  db: Firestore,
  classId: string,
  requesterUid?: string,
  requesterRole?: string,
): Promise<void> {
  if (!requesterUid || !requesterRole) return;
  if (requesterRole === 'admin') return;

  if (requesterRole === 'teacher') {
    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) {
      throw new NotFoundException(`Class with ID ${classId} not found.`);
    }
    const classData = classDoc.data() as { teacherId?: string };
    if (classData.teacherId !== requesterUid) {
      throw new ForbiddenException(
        'Access Denied: You can only view or manage classes you are assigned to teach.',
      );
    }
  }
}

/**
 * Verifies that the requester has permission to access the specified student's records:
 * - Admin: Unrestricted (Principal level)
 * - Teacher: Must be assigned to teach at least one class the student is enrolled in
 * - Student: Must be the student themselves (requesterUid === studentId)
 * - Parent: Must be the verified parent of the student (student.parentId === requesterUid)
 */
export async function verifyStudentAccessUtil(
  db: Firestore,
  studentId: string,
  requesterUid?: string,
  requesterRole?: string,
): Promise<void> {
  if (!requesterUid || !requesterRole) return;
  if (requesterRole === 'admin') return;

  if (requesterRole === 'teacher') {
    const enrollmentsSnap = await db
      .collection('enrollments')
      .where('studentId', '==', studentId)
      .get();
    let teachesStudent = false;
    for (const doc of enrollmentsSnap.docs) {
      const classId = (doc.data() as { classId?: string }).classId;
      if (classId) {
        const classDoc = await db.collection('classes').doc(classId).get();
        if (
          classDoc.exists &&
          (classDoc.data() as { teacherId?: string }).teacherId === requesterUid
        ) {
          teachesStudent = true;
          break;
        }
      }
    }
    if (!teachesStudent && enrollmentsSnap.docs.length > 0) {
      throw new ForbiddenException(
        'Access Denied: You can only view records for students enrolled in your assigned classes.',
      );
    }
  } else if (requesterUid !== studentId) {
    const studentDoc = await db.collection('students').doc(studentId).get();
    const studentData = studentDoc.exists
      ? (studentDoc.data() as { parentId?: string })
      : null;
    if (!studentData || studentData.parentId !== requesterUid) {
      throw new ForbiddenException(
        'Access Denied: You can only view records for yourself or your own children.',
      );
    }
  }
}
