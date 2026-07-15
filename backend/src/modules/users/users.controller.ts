import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMyProfile(@Req() req: { user: { uid: string; email?: string } }) {
    const uid = req.user.uid;
    try {
      return await this.usersService.findByUid(uid);
    } catch {
      // If user doc not created yet, return basic decoded token info
      return { id: uid, uid, email: req.user.email, role: 'parent' };
    }
  }

  @Patch('me')
  updateMyProfile(
    @Req() req: { user: { uid: string } },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.createOrUpdateUser(req.user.uid, updateUserDto);
  }

  @Get(':uid')
  getUserByUid(@Param('uid') uid: string) {
    return this.usersService.findByUid(uid);
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createOrUpdateUser(
      createUserDto.uid,
      createUserDto,
    );
  }
}
