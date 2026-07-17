import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, CreateMaterialDto } from './dto/create-session.dto';
import { UpdateSessionDto, UpdateMaterialDto } from './dto/update-session.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Sessions & Materials')
@ApiBearerAuth()
@Controller('classes/:classId')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('sessions')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get all sessions for a class' })
  getSessions(@Param('classId') classId: string) {
    return this.sessionsService.getSessionsByClass(classId);
  }

  @Get('sessions/:id')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get session by ID' })
  getSession(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch('sessions/:id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update session by ID' })
  updateSession(
    @Param('id') id: string,
    @Body() updateDto: UpdateSessionDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.sessionsService.update(id, updateDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Delete('sessions/:id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Delete session by ID' })
  deleteSession(@Param('id') id: string) {
    return this.sessionsService.remove(id);
  }

  @Post('sessions')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Create new class session' })
  createSession(
    @Param('classId') classId: string,
    @Body() createDto: CreateSessionDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    createDto.classId = classId;
    return this.sessionsService.createSession(createDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Get('materials')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get all materials for a class' })
  getMaterials(@Param('classId') classId: string) {
    return this.sessionsService.getMaterialsByClass(classId);
  }

  @Get('materials/:id')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get material by ID' })
  getMaterial(@Param('id') id: string) {
    return this.sessionsService.findMaterialById(id);
  }

  @Patch('materials/:id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update material by ID' })
  updateMaterial(
    @Param('id') id: string,
    @Body() updateDto: UpdateMaterialDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.sessionsService.updateMaterial(id, updateDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Delete('materials/:id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Delete material by ID' })
  deleteMaterial(@Param('id') id: string) {
    return this.sessionsService.removeMaterial(id);
  }

  @Post('materials')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Create or upload new course material' })
  createMaterial(
    @Param('classId') classId: string,
    @Body() createDto: CreateMaterialDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    createDto.classId = classId;
    return this.sessionsService.createMaterial(createDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }
}
