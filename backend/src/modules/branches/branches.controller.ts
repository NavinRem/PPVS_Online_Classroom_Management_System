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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('branches')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles('admin')
  create(@Body() createDto: CreateBranchDto, @Req() req: any) {
    return this.branchesService.create(createDto, req.user);
  }

  @Get()
  @Roles('admin', 'teacher')
  findAll() {
    return this.branchesService.findAll();
  }

  @Get('code/:code')
  @Roles('admin', 'teacher')
  findByCode(@Param('code') code: string) {
    return this.branchesService.findByCode(code);
  }

  @Get(':id')
  @Roles('admin', 'teacher')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBranchDto,
    @Req() req: any,
  ) {
    return this.branchesService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
