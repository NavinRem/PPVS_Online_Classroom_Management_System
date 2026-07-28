import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import {
  CreateInvoiceDto,
  CheckoutDto,
  WebhookPaymentDto,
} from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditUserContext } from '../auth/current-user.decorator';

describe('PaymentsController (Unit)', () => {
  let controller: PaymentsController;
  let paymentsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    getMyInvoices: jest.Mock;
    createInvoice: jest.Mock;
    initiateCheckout: jest.Mock;
    confirmPayment: jest.Mock;
  };

  const mockUserContext: AuditUserContext = {
    uid: 'parent123',
    email: 'parent@test.kh',
    role: 'parent',
  };

  beforeEach(async () => {
    paymentsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getMyInvoices: jest.fn(),
      createInvoice: jest.fn(),
      initiateCheckout: jest.fn(),
      confirmPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Standard CRUD & Fetching', () => {
    it('should delegate findAll with branchId', async () => {
      paymentsService.findAll.mockResolvedValue([]);
      await controller.findAll('branch1');
      expect(paymentsService.findAll).toHaveBeenCalledWith('branch1');
    });

    it('should delegate findOne', async () => {
      paymentsService.findOne.mockResolvedValue({});
      await controller.findOne('inv1');
      expect(paymentsService.findOne).toHaveBeenCalledWith('inv1');
    });

    it('should delegate update with context defaults (admin)', async () => {
      const dto: UpdateInvoiceDto = { amount: 100 };
      paymentsService.update.mockResolvedValue({});
      const adminCtx: AuditUserContext = {
        uid: 'admin1',
        email: 'admin@kh',
        role: 'admin',
      };
      await controller.update('inv1', dto, adminCtx);
      expect(paymentsService.update).toHaveBeenCalledWith('inv1', dto, {
        uid: 'admin1',
        role: 'admin',
      });
    });

    it('should delegate remove', async () => {
      paymentsService.remove.mockResolvedValue({});
      await controller.remove('inv1');
      expect(paymentsService.remove).toHaveBeenCalledWith('inv1');
    });

    it('should delegate getMyInvoices using user context', async () => {
      paymentsService.getMyInvoices.mockResolvedValue([]);
      await controller.getMyInvoices(mockUserContext);
      expect(paymentsService.getMyInvoices).toHaveBeenCalledWith('parent123');
    });
  });

  describe('Payment Flows', () => {
    it('should delegate createInvoice with context', async () => {
      const dto: CreateInvoiceDto = {
        classId: 'class1',
        parentId: 'parent1',
        studentId: 'student1',
        enrollmentId: 'enroll1',
        amount: 5000,
        currency: 'KHR',
        dueDate: '2025-01-01',
      };
      paymentsService.createInvoice.mockResolvedValue({});
      await controller.createInvoice(dto, mockUserContext);
      expect(paymentsService.createInvoice).toHaveBeenCalledWith(dto, {
        uid: 'parent123',
        role: 'parent',
      });
    });

    it('should delegate initiateCheckout with context', async () => {
      const dto: CheckoutDto = { invoiceId: 'inv1', paymentMethod: 'qr_code' };
      paymentsService.initiateCheckout.mockResolvedValue({});
      await controller.initiateCheckout(dto, mockUserContext);
      expect(paymentsService.initiateCheckout).toHaveBeenCalledWith(dto, {
        uid: 'parent123',
        role: 'parent',
      });
    });

    it('should delegate confirmPayment with user context when present', async () => {
      const dto: WebhookPaymentDto = {
        invoiceId: 'inv1',
        transactionRef: 'tx1',
        status: 'paid',
      };
      paymentsService.confirmPayment.mockResolvedValue({});
      await controller.confirmPayment(dto, mockUserContext);
      expect(paymentsService.confirmPayment).toHaveBeenCalledWith(dto, {
        uid: 'parent123',
        role: 'parent',
      });
    });

    it('should delegate confirmPayment with system context when user missing (webhook)', async () => {
      const dto: WebhookPaymentDto = {
        invoiceId: 'inv1',
        transactionRef: 'tx1',
        status: 'paid',
      };
      paymentsService.confirmPayment.mockResolvedValue({});
      await controller.confirmPayment(dto);
      expect(paymentsService.confirmPayment).toHaveBeenCalledWith(dto, {
        uid: 'payment_gateway',
        role: 'system',
      });
    });
  });
});
