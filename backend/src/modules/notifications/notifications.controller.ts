import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CreateAnnouncementDto,
  SendNotificationDto,
} from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Notifications & Announcements')
@ApiBearerAuth()
@Controller()
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('announcements')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary:
      'Get all announcements across classes (filtered by branch if provided)',
  })
  findAllAnnouncements(@Query('branchId') branchId?: string) {
    return this.notificationsService.findAll(branchId);
  }

  @Get('announcements/:id')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get announcement by ID' })
  findOneAnnouncement(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch('announcements/:id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update announcement by ID' })
  updateAnnouncement(
    @Param('id') id: string,
    @Body() updateDto: UpdateAnnouncementDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.notificationsService.update(id, updateDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Delete('announcements/:id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Delete announcement by ID' })
  removeAnnouncement(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }

  @Get('notifications/me')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get direct notifications for current user' })
  getMyNotifications(@CurrentUser() user: AuditUserContext) {
    return this.notificationsService.getUserNotifications(user.uid);
  }

  @Post('notifications/send')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Send direct notification to a user' })
  sendNotification(
    @Body() sendDto: SendNotificationDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.notificationsService.sendToUser(sendDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }

  @Get('announcements/class/:classId')
  @Roles('parent', 'student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get announcements for a specific class' })
  getClassAnnouncements(@Param('classId') classId: string) {
    return this.notificationsService.getAnnouncementsByClass(classId);
  }

  @Post('announcements')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Create new announcement for a class' })
  createAnnouncement(
    @Body() createDto: CreateAnnouncementDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.notificationsService.createAnnouncement(createDto, {
      uid: user.uid,
      role: user.role || 'teacher',
    });
  }
}
