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
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('parents')
@UseGuards(FirebaseAuthGuard)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get('me')
  getMyProfile(@Req() req: { user: { uid: string } }) {
    return this.parentsService.findByUid(req.user.uid);
  }

  @Patch('me')
  updateMyProfile(
    @Req() req: { user: { uid: string; role?: string } },
    @Body() updateParentDto: UpdateParentDto,
  ) {
    return this.parentsService.createOrUpdateProfile(
      req.user.uid,
      updateParentDto,
      {
        uid: req.user.uid,
        role: req.user.role || 'parent',
      },
    );
  }

  @Post()
  create(
    @Body() createParentDto: CreateParentDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.parentsService.create(createParentDto, {
      uid: req.user.uid,
      role: req.user.role || 'parent',
    });
  }

  @Get()
  findAll() {
    return this.parentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateParentDto: UpdateParentDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.parentsService.update(id, updateParentDto, {
      uid: req.user.uid,
      role: req.user.role || 'parent',
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parentsService.remove(id);
  }
}
