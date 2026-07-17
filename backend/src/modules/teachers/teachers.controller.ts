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
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Teachers')
@ApiBearerAuth()
@Controller('teachers')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get('me')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Get current teacher profile' })
  getMyProfile(@CurrentUser() user: AuditUserContext) {
    return this.teachersService.findByUid(user.uid);
  }

  @Get('me/assigned-classes')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Get classes assigned to current teacher' })
  getMyAssignedClasses(@CurrentUser() user: AuditUserContext) {
    return this.teachersService.getAssignedClasses(user.uid);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create new teacher profile' })
  create(
    @Body() createTeacherDto: CreateTeacherDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.teachersService.create(createTeacherDto, {
      uid: user.uid,
      role: user.role || 'admin',
    });
  }

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Find all teacher profiles (filtered by branch if provided)',
  })
  findAll(@Query('branchId') branchId?: string) {
    return this.teachersService.findAll(branchId);
  }

  @Get(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Find teacher by document ID' })
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update teacher by document ID' })
  update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.teachersService.update(id, updateTeacherDto, {
      uid: user.uid,
      role: user.role || 'admin',
    });
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete teacher by document ID' })
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }
}
