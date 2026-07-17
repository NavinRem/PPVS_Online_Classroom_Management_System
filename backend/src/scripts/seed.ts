import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { FirebaseModule } from '../config/firebase/firebase.module';
import { UsersService } from '../modules/users/users.service';
import { TeachersService } from '../modules/teachers/teachers.service';
import { ParentsService } from '../modules/parents/parents.service';
import { StudentsService } from '../modules/students/students.service';
import { ClassesService } from '../modules/classes/classes.service';
import { EnrollmentsService } from '../modules/enrollments/enrollments.service';
import { SessionsService } from '../modules/sessions/sessions.service';
import { AttendanceService } from '../modules/attendance/attendance.service';
import { AssessmentsService } from '../modules/assessments/assessments.service';
import { PaymentsService } from '../modules/payments/payments.service';
import { AuditLogsService } from '../modules/audit-logs/audit-logs.service';

@Module({
  imports: [FirebaseModule],
  providers: [
    UsersService,
    TeachersService,
    ParentsService,
    StudentsService,
    ClassesService,
    EnrollmentsService,
    SessionsService,
    AttendanceService,
    AssessmentsService,
    PaymentsService,
    AuditLogsService,
  ],
})
export class SeedModule {}

async function bootstrap() {
  console.log(
    '🌱 [PPVS Seed Script] Bootstrapping NestJS Application Context...',
  );
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const usersService = app.get(UsersService);
    const teachersService = app.get(TeachersService);
    const parentsService = app.get(ParentsService);
    const studentsService = app.get(StudentsService);
    const classesService = app.get(ClassesService);
    const enrollmentsService = app.get(EnrollmentsService);
    const sessionsService = app.get(SessionsService);
    const attendanceService = app.get(AttendanceService);
    const assessmentsService = app.get(AssessmentsService);
    const paymentsService = app.get(PaymentsService);

    console.log(
      '✅ [PPVS Seed Script] Services loaded. Beginning simulation...',
    );

    const ADMIN_UID = 'admin_seed_user';
    const TEACHER_UID = 'teacher_seed_user';
    const PARENT_UID = 'parent_seed_user';
    const STUDENT_USER_UID = 'student_seed_user';

    // 1. Create Base User Accounts
    console.log('\n--- 1. Seeding Base User Accounts ---');
    await usersService.createOrUpdateUser(ADMIN_UID, {
      uid: ADMIN_UID,
      email: 'admin@ppvs.edu.kh',
      role: 'admin',
      fullName: 'System Administrator',
    });
    await usersService.createOrUpdateUser(TEACHER_UID, {
      uid: TEACHER_UID,
      email: 'teacher@ppvs.edu.kh',
      role: 'teacher',
      fullName: 'Sophea Chan',
    });
    await usersService.createOrUpdateUser(PARENT_UID, {
      uid: PARENT_UID,
      email: 'parent@ppvs.edu.kh',
      role: 'parent',
      fullName: 'Vannak Sok',
    });
    await usersService.createOrUpdateUser(STUDENT_USER_UID, {
      uid: STUDENT_USER_UID,
      email: 'student@ppvs.edu.kh',
      role: 'student',
      fullName: 'Bopha Sok',
    });
    console.log('✅ Base user profiles seeded in `users` collection.');

    // 2. Create Domain Profiles
    console.log('\n--- 2. Seeding Domain Profiles ---');
    await teachersService.create({
      uid: TEACHER_UID,
      fullName: 'Sophea Chan',
      email: 'teacher@ppvs.edu.kh',
      phoneNumber: '+855 12 345 678',
      specialization: 'Mathematics',
      bio: 'Senior Mathematics Instructor at PPVS with 8 years of online teaching experience.',
    });

    await parentsService.createOrUpdateProfile(PARENT_UID, {
      fullName: 'Vannak Sok',
      phoneNumber: '+855 98 765 432',
      email: 'parent@ppvs.edu.kh',
      address: 'Phnom Penh, Cambodia',
    });

    const studentRes = await studentsService.create({
      fullName: 'Bopha Sok',
      dateOfBirth: new Date('2009-05-14'),
      age: 16,
      gradeLevel: 'Grade 10',
      parentId: PARENT_UID,
    });
    const studentId = studentRes.id;
    console.log(`✅ Student profile seeded (Doc ID: ${studentId})`);

    // 3. Create Class
    console.log('\n--- 3. Seeding Class ---');
    const classRes = await classesService.create({
      className: 'Grade 10 Mathematics - PPVS Online',
      teacherName: 'Sophea Chan',
      teacherId: TEACHER_UID,
      day: 'Monday',
      time: '08:00 AM - 10:00 AM',
      maxCapacity: 30,
      price: 400000, // 400,000 KHR
      currency: 'KHR',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
    });
    const classId = classRes.id;
    console.log(`✅ Class created: (Doc ID: ${classId})`);

    // 4. Create Class Session
    console.log('\n--- 4. Seeding Class Session ---');
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionRes = await sessionsService.createSession(
      {
        classId,
        sessionNumber: 1,
        date: todayStr,
        startTime: '08:00 AM',
        endTime: '10:00 AM',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        topic: 'Solving quadratic curves using the quadratic formula',
      },
      { uid: TEACHER_UID, role: 'teacher' },
    );
    console.log(`✅ Class session created (Doc ID: ${sessionRes.id})`);

    // 5. Enroll Student
    console.log('\n--- 5. Seeding Student Enrollment ---');
    const enrollRes = await enrollmentsService.create({
      classId,
      studentId,
      parentId: PARENT_UID,
    });
    console.log(
      `✅ Student enrolled in class (Enrollment ID: ${enrollRes.id}, Status: ${enrollRes.status})`,
    );

    // 6. Record Attendance (Custom Status: 'homeworked')
    console.log(
      '\n--- 6. Seeding Batch Attendance Check-In (`homeworked`) ---',
    );
    const attendanceRes = await attendanceService.batchCheckIn(
      {
        classId,
        date: todayStr,
        records: [
          {
            studentId,
            status: 'homeworked',
            notes:
              'Attended session and completed all quadratic homework sets with excellence!',
          },
        ],
      },
      { uid: TEACHER_UID, role: 'teacher' },
    );
    console.log(
      `✅ Batch attendance recorded with status 'homeworked' (Doc ID: ${attendanceRes.id})`,
    );

    // 7. Create Assessment & Record Grade
    console.log('\n--- 7. Seeding Assessment & Recording Grade ---');
    const assessmentRes = await assessmentsService.createAssessment(
      {
        classId,
        title: 'Midterm Quadratic Mathematics Exam',
        type: 'exam',
        maxScore: 100,
        dueDate: new Date(Date.now() + 86400000 * 7)
          .toISOString()
          .split('T')[0],
      },
      { uid: TEACHER_UID, role: 'teacher' },
    );
    const assessmentId = assessmentRes.id;
    console.log(`✅ Assessment created (Doc ID: ${assessmentId})`);

    const gradeRes = await assessmentsService.recordGrade(
      {
        assessmentId,
        studentId,
        score: 95,
        comments:
          'Outstanding work! Demonstrated deep understanding of roots and factoring.',
      },
      { uid: TEACHER_UID, role: 'teacher' },
    );
    console.log(`✅ Student grade recorded: 95/100 (Doc ID: ${gradeRes.id})`);

    // 8. Create Tuition Invoice & Simulate KHR Checkout & Webhook
    console.log('\n--- 8. Seeding KHR Tuition Invoice & Payment Workflow ---');
    const invoiceRes = await paymentsService.createInvoice(
      {
        enrollmentId: enrollRes.id,
        parentId: PARENT_UID,
        studentId,
        classId,
        amount: 400000,
        currency: 'KHR',
        dueDate: new Date(Date.now() + 86400000 * 14)
          .toISOString()
          .split('T')[0],
      },
      { uid: PARENT_UID, role: 'parent' },
    );
    const invoiceId = invoiceRes.id;
    console.log(`✅ Invoice created: KHR 400,000 (Invoice ID: ${invoiceId})`);

    const checkoutRes = await paymentsService.initiateCheckout({
      invoiceId,
      paymentMethod: 'qr_code',
    });
    console.log(
      `✅ KHQR Checkout initiated. Payload preview: ${checkoutRes.qrDataPayload?.slice(0, 40)}...`,
    );

    const confirmRes = await paymentsService.confirmPayment(
      {
        invoiceId,
        transactionRef: `KHQR_SIM_TX_${Date.now()}`,
        status: 'paid',
      },
      { uid: 'system_seed_webhook', role: 'system' },
    );
    console.log(
      `✅ Webhook confirmed: ${confirmRes.message} (Status: ${confirmRes.status})`,
    );

    console.log('\n======================================================');
    console.log('🎉 [PPVS Seed Script] Simulation Completed Successfully!');
    console.log('======================================================');
    console.log(`• Teacher UID : ${TEACHER_UID}`);
    console.log(`• Parent UID  : ${PARENT_UID}`);
    console.log(`• Student ID  : ${studentId}`);
    console.log(`• Class ID    : ${classId}`);
    console.log(`• Enrollment  : ${enrollRes.id}`);
    console.log(`• Attendance  : ${attendanceRes.id} (status: homeworked)`);
    console.log(`• Assessment  : ${assessmentId} (score: 95/100)`);
    console.log(`• Invoice ID  : ${invoiceId} (amount: 400,000 KHR - PAID)`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('🔥 Fatal error during seed simulation:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal unhandled error in seed script:', error);
  process.exit(1);
});
