import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuditContext } from '../../common/firebase-base.service';

export interface AuditUserContext extends AuditContext {
  email?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuditUserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuditUserContext;
  },
);
