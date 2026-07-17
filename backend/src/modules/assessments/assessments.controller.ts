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
import { AssessmentsService } from './assessments.service';
import {
  CreateAssessmentDto,
  RecordGradeDto,
} from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Assessments & Grades')
@ApiBearerAuth()
@Controller('assessments')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary:
      'Get all assessments across classes (filtered by branch if provided)',
  })
  findAll(@Query('branchId') branchId?: string) {
    return this.assessmentsService.findAll(branchId);
  }

  @Get(':id')
  @Roles('admin', 'teacher', 'parent', 'student')
  @ApiOperation({ summary: 'Get assessment details by ID' })
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update assessment by ID' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAssessmentDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.assessmentsService.update(id, updateDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Delete assessment by ID' })
  remove(@Param('id') id: string) {
    return this.assessmentsService.remove(id);
  }

  @Post()
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Create new assessment for a class' })
  createAssessment(
    @Body() createDto: CreateAssessmentDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.assessmentsService.createAssessment(createDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Post('grades')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Record student grade for an assessment' })
  recordGrade(
    @Body() recordDto: RecordGradeDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.assessmentsService.recordGrade(recordDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Get('class/:classId')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get assessments assigned to a specific class' })
  getClassAssessments(
    @Param('classId') classId: string,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.assessmentsService.getClassAssessments(
      classId,
      user.uid,
      user.role || 'teacher',
    );
  }

  @Get('student/:studentId/summary')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get student performance and GPA summary' })
  getStudentSummary(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.assessmentsService.getStudentPerformanceSummary(
      studentId,
      user.uid,
      user.role || 'parent',
    );
  }

  @Get('student/:studentId/monthly-report')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({
    summary: 'Get PPVS monthly student score percentage, band, and class rank',
  })
  getStudentMonthlyReport(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuditUserContext,
    @Param('month') month?: string,
  ) {
    return this.assessmentsService.getStudentMonthlyReport(
      studentId,
      month,
      user.uid,
      user.role || 'parent',
    );
  }

  @Get('class/:classId/monthly-summary')
  @Roles('teacher', 'admin')
  @ApiOperation({
    summary: 'Get PPVS class monthly leaderboard and student rank summary',
  })
  getClassMonthlySummary(
    @Param('classId') classId: string,
    @CurrentUser() user: AuditUserContext,
    @Param('month') month?: string,
  ) {
    return this.assessmentsService.getClassMonthlySummary(
      classId,
      month,
      user.uid,
      user.role || 'teacher',
    );
  }
}
