import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('audit-logs')
@UseGuards(FirebaseAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  getLogs(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.auditLogsService.findByEntity(entity || '', entityId);
  }
}
