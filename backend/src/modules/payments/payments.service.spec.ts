import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateInvoiceDto,
  CheckoutDto,
  WebhookPaymentDto,
} from './dto/create-invoice.dto';

describe('PaymentsService (Unit & Integration)', () => {
  let service: PaymentsService;
  let enrollmentsService: jest.Mocked<Partial<EnrollmentsService>>;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;

  beforeAll(async () => {
    enrollmentsService = {
      updateStatus: jest.fn().mockResolvedValue({
        id: 'mock_enrollment',
        message: 'updated',
      } as any),
    };
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [
        PaymentsService,
        { provide: EnrollmentsService, useValue: enrollmentsService },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    await module.init();
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD Operations (`createInvoice`, `findAll`, `findOne`, `update`, `remove`)', () => {
    let invoiceId: string;

    it('should create an invoice in KHR (`createInvoice`)', async () => {
      const dto: CreateInvoiceDto = {
        enrollmentId: 'enroll_pay_crud_1',
        classId: 'class_pay_crud_1',
        parentId: 'parent_pay_crud_1',
        studentId: 'student_pay_crud_1',
        amount: 400000,
        currency: 'KHR',
        dueDate: '2026-08-01',
      };
      const result = await service.createInvoice(dto);
      expect(result).toHaveProperty('id');
      expect(result.status).toBe('unpaid');
      expect(result.currency).toBe('KHR');
      expect(result.message).toContain('created successfully');
      invoiceId = result.id;
    });

    it('should find invoices for a parent (`getMyInvoices` & `findAll`)', async () => {
      const parentInvoices = await service.getMyInvoices('parent_pay_crud_1');
      expect(Array.isArray(parentInvoices)).toBe(true);
      const found = parentInvoices.find((inv) => inv.id === invoiceId);
      expect(found).toBeDefined();

      const allInvoices = await service.findAll();
      expect(Array.isArray(allInvoices)).toBe(true);
    });

    it('should find one invoice by ID (`findOne`)', async () => {
      const result = await service.findOne(invoiceId);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', invoiceId);
      expect(result).toHaveProperty('amount', 400000);
    });

    it('should update an invoice (`update`)', async () => {
      const result = await service.update(invoiceId, { amount: 450000 });
      expect(result).toHaveProperty('id', invoiceId);
      expect(result.message).toContain('successfully updated');
      const fetched = (await service.findOne(invoiceId)) as any;
      expect(fetched.amount).toBe(450000);
    });

    it('should remove an invoice (`remove`)', async () => {
      const result = await service.remove(invoiceId);
      expect(result).toHaveProperty('id', invoiceId);
      expect(result.message).toContain('successfully deleted');
    });
  });

  describe('Workflow Operations (`initiateCheckout` with KHQR, `confirmPayment` webhook)', () => {
    let wfInvoiceId: string;
    const runId = Date.now();
    const mockEnrollmentId = `enroll_pay_wf_${runId}`;

    beforeAll(async () => {
      const dto: CreateInvoiceDto = {
        parentId: `parent_pay_wf_${runId}`,
        studentId: `student_pay_wf_${runId}`,
        enrollmentId: mockEnrollmentId,
        amount: 500000,
        currency: 'KHR',
        dueDate: '2026-08-15',
        classId: '',
      };
      const res = await service.createInvoice(dto);
      wfInvoiceId = res.id;
    });

    it('should initiate checkout and return KHQR PromptPay payload (`initiateCheckout`)', async () => {
      const checkoutDto: CheckoutDto = {
        invoiceId: wfInvoiceId,
        paymentMethod: 'qr_code',
      };
      const result = await service.initiateCheckout(checkoutDto);
      expect(result.paymentMethod).toBe('qr_code');
      expect(result.currency).toBe('KHR');
      expect(result).toHaveProperty('qrDataPayload');
      expect(result.qrDataPayload).toContain('KHQR_MOCK_PAYMENT_PAYLOAD');
    });

    it('should confirm payment via webhook, update invoice status, and trigger enrollment activation (`confirmPayment`)', async () => {
      const webhookDto: WebhookPaymentDto = {
        invoiceId: wfInvoiceId,
        transactionRef: 'khqr_tx_999',
        status: 'paid',
      };
      const result = await service.confirmPayment(webhookDto, {
        uid: 'system',
        role: 'admin',
      });
      expect(result.success).toBe(true);
      expect(result.status).toBe('paid');
      expect(enrollmentsService.updateStatus).toHaveBeenCalledWith(
        mockEnrollmentId,
        'active',
        expect.anything(),
      );

      const updatedInv = (await service.findOne(wfInvoiceId)) as any;
      expect(updatedInv.status).toBe('paid');
      expect(updatedInv).toHaveProperty('paidAt');
    });
  });
});
