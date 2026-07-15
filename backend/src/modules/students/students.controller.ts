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
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('students')
@UseGuards(FirebaseAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me/my-children')
  getMyChildren(@Req() req: { user: { uid: string } }) {
    const parentId = req.user.uid;
    return this.studentsService.findByParentId(parentId);
  }

  @Post()
  create(
    @Body() createStudentDto: CreateStudentDto,
    @Req() req: { user: { uid: string } },
  ) {
    const secureStudentData = {
      ...createStudentDto,
      parentId: req.user.uid,
    };
    return this.studentsService.create(secureStudentData);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
