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
import { AssessmentsService } from './assessments.service';
import {
  CreateAssessmentDto,
  RecordGradeDto,
} from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('assessments')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @Roles('admin', 'teacher')
  findAll() {
    return this.assessmentsService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'teacher', 'parent', 'student')
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAssessmentDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.assessmentsService.update(id, updateDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  remove(@Param('id') id: string) {
    return this.assessmentsService.remove(id);
  }

  @Post()
  @Roles('admin', 'teacher')
  createAssessment(
    @Body() createDto: CreateAssessmentDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.assessmentsService.createAssessment(createDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Post('grades')
  @Roles('admin', 'teacher')
  recordGrade(
    @Body() recordDto: RecordGradeDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.assessmentsService.recordGrade(recordDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Get('class/:classId')
  @Roles('admin', 'teacher')
  getClassAssessments(@Param('classId') classId: string) {
    return this.assessmentsService.getClassAssessments(classId);
  }

  @Get('student/:studentId/summary')
  @Roles('parent', 'student', 'teacher', 'admin')
  getStudentSummary(
    @Param('studentId') studentId: string,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.assessmentsService.getStudentPerformanceSummary(
      studentId,
      req.user.uid,
      req.user.role || 'parent',
    );
  }
}
