import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreateInvoiceDto,
  CheckoutDto,
  WebhookPaymentDto,
} from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CurrentUser,
  type AuditUserContext,
} from '../auth/current-user.decorator';

@ApiTags('Payments & Invoices')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('invoices')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get all invoices (Admin only, filtered by branch if provided)',
  })
  findAll(@Query('branchId') branchId?: string) {
    return this.paymentsService.findAll(branchId);
  }

  @Get('invoices/:id')
  @Roles('admin', 'parent', 'student')
  @ApiOperation({ summary: 'Get invoice details by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch('invoices/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update invoice by ID' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInvoiceDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.paymentsService.update(id, updateDto, {
      uid: user.uid,
      role: user.role || 'admin',
    });
  }

  @Delete('invoices/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete invoice by ID' })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }

  @Get('me/invoices')
  @Roles('parent', 'student', 'admin')
  @ApiOperation({ summary: 'Get invoices for current parent/student UID' })
  getMyInvoices(@CurrentUser() user: AuditUserContext) {
    return this.paymentsService.getMyInvoices(user.uid);
  }

  @Post('create-invoice')
  @Roles('parent', 'admin', 'teacher')
  @ApiOperation({ summary: 'Create tuition invoice in Cambodian Riel (KHR)' })
  createInvoice(
    @Body() createDto: CreateInvoiceDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.paymentsService.createInvoice(createDto, {
      uid: user.uid,
      role: user.role || 'parent',
    });
  }

  @Post('checkout')
  @Roles('parent', 'student', 'admin')
  @ApiOperation({ summary: 'Initiate KHR payment checkout simulation' })
  initiateCheckout(
    @Body() checkoutDto: CheckoutDto,
    @CurrentUser() user: AuditUserContext,
  ) {
    return this.paymentsService.initiateCheckout(checkoutDto, {
      uid: user.uid,
      role: user.role || 'parent',
    });
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Payment gateway webhook confirmation' })
  confirmPayment(
    @Body() webhookDto: WebhookPaymentDto,
    @CurrentUser() user?: AuditUserContext,
  ) {
    const auditContext = user
      ? { uid: user.uid, role: user.role || 'user' }
      : { uid: 'payment_gateway', role: 'system' };
    return this.paymentsService.confirmPayment(webhookDto, auditContext);
  }
}
