import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Find all users across school or filtered by branch',
  })
  findAll(@Query('branchId') branchId?: string) {
    return this.usersService.findAll(branchId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMyProfile(@CurrentUser() user: AuditUserContext) {
    const uid = user.uid;
    try {
      return await this.usersService.findByUid(uid);
    } catch {
      // If user doc not created yet, return basic decoded token info
      return { id: uid, uid, email: user.email, role: user.role || 'parent' };
    }
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  updateMyProfile(
    @CurrentUser() user: AuditUserContext,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.createOrUpdateUser(user.uid, updateUserDto);
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get user profile by UID' })
  getUserByUid(@Param('uid') uid: string) {
    return this.usersService.findByUid(uid);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create or update user profile (Admin/System)' })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createOrUpdateUser(
      createUserDto.uid,
      createUserDto,
    );
  }
}
