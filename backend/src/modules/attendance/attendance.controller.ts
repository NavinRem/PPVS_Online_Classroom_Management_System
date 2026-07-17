import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { BatchCheckInDto } from './dto/check-in.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get all attendance records (filtered by branch if provided)',
  })
  findAll(@Query('branchId') branchId?: string) {
    return this.attendanceService.findAll(branchId);
  }

  @Get(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get attendance record by ID' })
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update attendance record by ID' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAttendanceDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.attendanceService.update(id, updateDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Delete attendance record by ID' })
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }

  @Post('check-in')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary:
      'Batch check-in attendance (present, homeworked, permission, absent)',
  })
  checkIn(
    @Body() checkInDto: BatchCheckInDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.attendanceService.batchCheckIn(checkInDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Get('class/:classId/:date')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get class attendance by date' })
  getClassAttendance(
    @Param('classId') classId: string,
    @Param('date') date: string,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.attendanceService.getClassDateAttendance(
      classId,
      date,
      user.uid,
      user.role || 'teacher',
    );
  }

  @Get('student/:studentId')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get student attendance history' })
  getStudentAttendance(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.attendanceService.getStudentAttendanceHistory(
      studentId,
      user.uid,
      user.role || 'parent',
    );
  }

  @Get('student/:studentId/monthly')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({
    summary: 'Get PPVS monthly student attendance breakdown and engagement %',
  })
  getStudentMonthlyAttendance(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuditUserContext,
    @Param('month') month?: string,
  ) {
    return this.attendanceService.getStudentMonthlyAttendance(
      studentId,
      month,
      user.uid,
      user.role || 'parent',
    );
  }

  @Get('class/:classId/monthly-metrics')
  @Roles('teacher', 'admin')
  @ApiOperation({
    summary: 'Get PPVS class monthly attendance rate and high absence warnings',
  })
  getClassMonthlyMetrics(
    @Param('classId') classId: string,
    @CurrentUser() user: AuditUserContext,
    @Param('month') month?: string,
  ) {
    return this.attendanceService.getClassMonthlyMetrics(
      classId,
      month,
      user.uid,
      user.role || 'teacher',
    );
  }
}
