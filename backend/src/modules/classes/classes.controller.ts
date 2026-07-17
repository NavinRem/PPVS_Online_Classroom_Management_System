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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@ApiTags('Classes')
@ApiBearerAuth()
@Controller('classes')
@UseGuards(FirebaseAuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new class' })
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Find all classes (filtered by branch if provided)',
  })
  findAll(@Query('branchId') branchId?: string) {
    return this.classesService.findAll(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find class by ID' })
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update class by ID' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete class by ID' })
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
