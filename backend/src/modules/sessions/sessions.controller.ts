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
import { SessionsService } from './sessions.service';
import { CreateSessionDto, CreateMaterialDto } from './dto/create-session.dto';
import { UpdateSessionDto, UpdateMaterialDto } from './dto/update-session.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('classes/:classId')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('sessions')
  @Roles('parent', 'student', 'teacher', 'admin')
  getSessions(@Param('classId') classId: string) {
    return this.sessionsService.getSessionsByClass(classId);
  }

  @Get('sessions/:id')
  @Roles('parent', 'student', 'teacher', 'admin')
  getSession(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch('sessions/:id')
  @Roles('admin', 'teacher')
  updateSession(
    @Param('id') id: string,
    @Body() updateDto: UpdateSessionDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.sessionsService.update(id, updateDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Delete('sessions/:id')
  @Roles('admin', 'teacher')
  deleteSession(@Param('id') id: string) {
    return this.sessionsService.remove(id);
  }

  @Post('sessions')
  @Roles('admin', 'teacher')
  createSession(
    @Param('classId') classId: string,
    @Body() createDto: CreateSessionDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    createDto.classId = classId;
    return this.sessionsService.createSession(createDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Get('materials')
  @Roles('parent', 'student', 'teacher', 'admin')
  getMaterials(@Param('classId') classId: string) {
    return this.sessionsService.getMaterialsByClass(classId);
  }

  @Get('materials/:id')
  @Roles('parent', 'student', 'teacher', 'admin')
  getMaterial(@Param('id') id: string) {
    return this.sessionsService.findMaterialById(id);
  }

  @Patch('materials/:id')
  @Roles('admin', 'teacher')
  updateMaterial(
    @Param('id') id: string,
    @Body() updateDto: UpdateMaterialDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.sessionsService.updateMaterial(id, updateDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Delete('materials/:id')
  @Roles('admin', 'teacher')
  deleteMaterial(@Param('id') id: string) {
    return this.sessionsService.removeMaterial(id);
  }

  @Post('materials')
  @Roles('admin', 'teacher')
  createMaterial(
    @Param('classId') classId: string,
    @Body() createDto: CreateMaterialDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    createDto.classId = classId;
    return this.sessionsService.createMaterial(createDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }
}
