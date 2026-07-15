import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { BatchCheckInDto } from './dto/check-in.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('attendance')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles('admin', 'teacher')
  findAll() {
    return this.attendanceService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'teacher')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAttendanceDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.attendanceService.update(id, updateDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }

  @Post('check-in')
  @Roles('admin', 'teacher')
  checkIn(
    @Body() checkInDto: BatchCheckInDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.attendanceService.batchCheckIn(checkInDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Get('class/:classId/:date')
  @Roles('admin', 'teacher')
  getClassAttendance(
    @Param('classId') classId: string,
    @Param('date') date: string,
  ) {
    return this.attendanceService.getClassDateAttendance(classId, date);
  }

  @Get('student/:studentId')
  @Roles('parent', 'student', 'teacher', 'admin')
  getStudentAttendance(
    @Param('studentId') studentId: string,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.attendanceService.getStudentAttendanceHistory(
      studentId,
      req.user.uid,
      req.user.role || 'parent',
    );
  }
}
