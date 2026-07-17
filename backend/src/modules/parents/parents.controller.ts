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
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Parents')
@ApiBearerAuth()
@Controller('parents')
@UseGuards(FirebaseAuthGuard)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current parent profile' })
  getMyProfile(@CurrentUser() user: AuditUserContext) {
    return this.parentsService.findByUid(user.uid);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current parent profile' })
  updateMyProfile(
    @CurrentUser() user: AuditUserContext,
    @Body() updateParentDto: UpdateParentDto,
  ) {
    return this.parentsService.createOrUpdateProfile(
      user.uid,
      updateParentDto,
      {
        uid: user.uid,
        role: user.role || 'parent',
      },
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create new parent profile' })
  create(
    @Body() createParentDto: CreateParentDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.parentsService.create(createParentDto, {
      uid: user.uid,
      role: user.role || 'parent',
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Find all parents (filtered by branch if provided)',
  })
  findAll(@Query('branchId') branchId?: string) {
    return this.parentsService.findAll(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find parent by document ID' })
  findOne(@Param('id') id: string) {
    return this.parentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update parent by document ID' })
  update(
    @Param('id') id: string,
    @Body() updateParentDto: UpdateParentDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.parentsService.update(id, updateParentDto, {
      uid: user.uid,
      role: user.role || 'parent',
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete parent by document ID' })
  remove(@Param('id') id: string) {
    return this.parentsService.remove(id);
  }
}
