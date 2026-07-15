import { Module } from '@nestjs/common';
import { FirebaseModule } from './config/firebase/firebase.module';
import { StudentsModule } from './modules/students/students.module';
import { ParentsModule } from './modules/parents/parents.module';
import { ClassesModule } from './modules/classes/classes.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    FirebaseModule,
    StudentsModule,
    ParentsModule,
    ClassesModule,
    EnrollmentsModule,
    AuthModule,
    UsersModule,
    AuditLogsModule,
    TeachersModule,
    PaymentsModule,
    AssessmentsModule,
    AttendanceModule,
    SessionsModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
