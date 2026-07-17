import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me/my-children')
  @ApiOperation({ summary: 'Get students linked to current parent UID' })
  getMyChildren(@CurrentUser() user: AuditUserContext) {
    const parentId = user.uid;
    return this.studentsService.findByParentId(parentId);
  }

  @Get(':id/monthly-dashboard')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({
    summary:
      'Get unified PPVS monthly student dashboard (report card, attendance, schedule, fee status)',
  })
  getStudentMonthlyDashboard(
    @Param('id') id: string,
    @CurrentUser() user: AuditUserContext,
    @Param('month') month?: string,
  ) {
    return this.studentsService.getStudentMonthlyDashboard(
      id,
      month,
      user.uid,
      user.role || 'parent',
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new student record linked to parent' })
  create(
    @Body() createStudentDto: CreateStudentDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    const secureStudentData = {
      ...createStudentDto,
      parentId: user.uid,
    };
    return this.studentsService.create(secureStudentData);
  }

  @Get()
  @ApiOperation({
    summary: 'Find all student profiles (filtered by branch if provided)',
  })
  findAll(@Query('branchId') branchId?: string) {
    return this.studentsService.findAll(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find student by document ID' })
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update student by document ID' })
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete student by document ID' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
