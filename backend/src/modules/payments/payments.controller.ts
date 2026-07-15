import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
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

@Controller('payments')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('invoices')
  @Roles('admin')
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('invoices/:id')
  @Roles('admin', 'parent', 'student')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch('invoices/:id')
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInvoiceDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.paymentsService.update(id, updateDto, {
      uid: req.user.uid,
      role: req.user.role || 'admin',
    });
  }

  @Delete('invoices/:id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }

  @Get('me/invoices')
  @Roles('parent', 'student', 'admin')
  getMyInvoices(@Req() req: { user: { uid: string } }) {
    return this.paymentsService.getMyInvoices(req.user.uid);
  }

  @Post('create-invoice')
  @Roles('parent', 'admin', 'teacher')
  createInvoice(
    @Body() createDto: CreateInvoiceDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.paymentsService.createInvoice(createDto, {
      uid: req.user.uid,
      role: req.user.role || 'parent',
    });
  }

  @Post('checkout')
  @Roles('parent', 'student', 'admin')
  initiateCheckout(
    @Body() checkoutDto: CheckoutDto,
    @Req() req: { user: { uid: string; role?: string } },
  ) {
    return this.paymentsService.initiateCheckout(checkoutDto, {
      uid: req.user.uid,
      role: req.user.role || 'parent',
    });
  }

  @Post('webhook')
  confirmPayment(
    @Body() webhookDto: WebhookPaymentDto,
    @Req() req: { user?: { uid: string; role?: string } },
  ) {
    const auditContext = req.user
      ? { uid: req.user.uid, role: req.user.role || 'user' }
      : { uid: 'payment_gateway', role: 'system' };
    return this.paymentsService.confirmPayment(webhookDto, auditContext);
  }
}
