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
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
@UseGuards(FirebaseAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('me/my-schedule')
  @ApiOperation({ summary: 'Get class schedule for parent/student UID' })
  getMySchedule(@CurrentUser() user: AuditUserContext) {
    const parentId = user.uid;
    return this.enrollmentsService.getMySchedule(parentId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new class enrollment' })
  create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(createEnrollmentDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Find all enrollments (filtered by branch if provided)',
  })
  findAll(@Query('branchId') branchId?: string) {
    return this.enrollmentsService.findAll(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find enrollment by ID' })
  findOne(@Param('id') id: string) {
    return this.enrollmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update enrollment by ID' })
  update(
    @Param('id') id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ) {
    return this.enrollmentsService.update(id, updateEnrollmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete enrollment by ID' })
  remove(@Param('id') id: string) {
    return this.enrollmentsService.remove(id);
  }
}
