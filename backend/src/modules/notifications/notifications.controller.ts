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
import { NotificationsService } from './notifications.service';
import {
  CreateAnnouncementDto,
  SendNotificationDto,
} from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('announcements')
  @Roles('admin', 'teacher')
  findAllAnnouncements() {
    return this.notificationsService.findAll();
  }

  @Get('announcements/:id')
  @Roles('parent', 'student', 'teacher', 'admin')
  findOneAnnouncement(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch('announcements/:id')
  @Roles('admin', 'teacher')
  updateAnnouncement(
    @Param('id') id: string,
    @Body() updateDto: UpdateAnnouncementDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.notificationsService.update(id, updateDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Delete('announcements/:id')
  @Roles('admin', 'teacher')
  removeAnnouncement(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }

  @Get('notifications/me')
  @Roles('parent', 'student', 'teacher', 'admin')
  getMyNotifications(@Req() req: { user: { uid: string } }) {
    return this.notificationsService.getUserNotifications(req.user.uid);
  }

  @Post('notifications/send')
  @Roles('admin', 'teacher')
  sendNotification(
    @Body() sendDto: SendNotificationDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.notificationsService.sendToUser(sendDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }

  @Get('announcements/class/:classId')
  @Roles('parent', 'student', 'teacher', 'admin')
  getClassAnnouncements(@Param('classId') classId: string) {
    return this.notificationsService.getAnnouncementsByClass(classId);
  }

  @Post('announcements')
  @Roles('admin', 'teacher')
  createAnnouncement(
    @Body() createDto: CreateAnnouncementDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.notificationsService.createAnnouncement(createDto, {
      uid: req.user.uid,
      role: req.user.role || 'teacher',
    });
  }
}
