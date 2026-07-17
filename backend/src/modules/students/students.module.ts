import { Module, forwardRef } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => AssessmentsModule),
    forwardRef(() => AttendanceModule),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
