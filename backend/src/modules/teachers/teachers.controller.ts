import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('teachers')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get('me')
  @Roles('teacher', 'admin')
  getMyProfile(@Req() req: { user: { uid: string } }) {
    return this.teachersService.findByUid(req.user.uid);
  }

  @Get('me/assigned-classes')
  @Roles('teacher', 'admin')
  getMyAssignedClasses(@Req() req: { user: { uid: string } }) {
    return this.teachersService.getAssignedClasses(req.user.uid);
  }

  @Post()
  @Roles('admin')
  create(
    @Body() createTeacherDto: CreateTeacherDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.teachersService.create(createTeacherDto, {
      uid: req.user.uid,
      role: req.user.role || 'admin',
    });
  }

  @Get()
  @Roles('admin')
  findAll() {
    return this.teachersService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'teacher')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.teachersService.update(id, updateTeacherDto, {
      uid: req.user.uid,
      role: req.user.role || 'admin',
    });
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }
}
