import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateInvoiceDto,
  CheckoutDto,
  WebhookPaymentDto,
} from './dto/create-invoice.dto';

describe('PaymentsService (Unit)', () => {
  let service: PaymentsService;
  let enrollmentsService: jest.Mocked<Partial<EnrollmentsService>>;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;

  let mockFirebaseService: any;
  let mockInvoicesCollection: any;
  let mockPaymentTxCollection: any;

  let invoiceDocExists: boolean;
  let invoiceStatus: string;

  beforeAll(async () => {
    enrollmentsService = {
      updateStatus: jest
        .fn()
        .mockResolvedValue({ id: 'e1', message: 'updated' }),
    };
    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    const mockInvoiceDoc = {
      get: jest.fn().mockImplementation(() =>
        Promise.resolve({
          exists: invoiceDocExists,
          data: () => ({
            parentId: 'parent1',
            amount: 500000,
            currency: 'KHR',
            status: invoiceStatus,
            enrollmentId: 'enroll1',
          }),
        }),
      ),
      update: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
    };

    mockInvoicesCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'invoice1',
            data: () => ({
              parentId: 'parent1',
              amount: 500000,
              currency: 'KHR',
              status: invoiceStatus,
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: 'new_invoice_id' }),
      doc: jest.fn((docId?: string) => {
        return {
          id: docId || 'new_invoice_id',
          ...mockInvoiceDoc,
        };
      }),
    };

    mockPaymentTxCollection = {
      add: jest.fn().mockResolvedValue({ id: 'tx_123' }),
    };

    mockFirebaseService = {
      firestore: {
        collection: jest.fn((colName: string) => {
          if (colName === 'invoices') return mockInvoicesCollection;
          if (colName === 'payment_transactions')
            return mockPaymentTxCollection;
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: [] }),
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
            })),
          };
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: EnrollmentsService, useValue: enrollmentsService },
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  beforeEach(() => {
    invoiceDocExists = true;
    invoiceStatus = 'unpaid';
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD Operations', () => {
    it('should create an invoice in KHR (`createInvoice`)', async () => {
      const dto: CreateInvoiceDto = {
        enrollmentId: 'e1',
        classId: 'c1',
        parentId: 'p1',
        studentId: 's1',
        amount: 400000,
        currency: 'KHR',
        dueDate: '2026-08-01',
      };
      const result = await service.createInvoice(dto, {
        uid: 'u1',
        role: 'admin',
      });
      expect(result).toHaveProperty('id', 'new_invoice_id');
      expect(result.status).toBe('unpaid');
      expect(result.currency).toBe('KHR');
      expect(mockInvoicesCollection.add).toHaveBeenCalled();
      expect(auditLogsService.logAction).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when createInvoice fails', async () => {
      (mockInvoicesCollection.add as jest.Mock).mockRejectedValueOnce(
        new Error('DB Error'),
      );
      await expect(
        service.createInvoice({} as CreateInvoiceDto),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should find invoices for a parent (`getMyInvoices`)', async () => {
      const results = await service.getMyInvoices('parent1');
      expect(Array.isArray(results)).toBe(true);
      expect(results[0].id).toBe('invoice1');
    });

    it('should throw InternalServerErrorException when getMyInvoices fails', async () => {
      (mockInvoicesCollection.get as jest.Mock).mockRejectedValueOnce(
        new Error('DB Error'),
      );
      await expect(service.getMyInvoices('parent1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Workflow Operations', () => {
    describe('initiateCheckout', () => {
      it('should initiate checkout and return KHQR PromptPay payload for qr_code', async () => {
        const checkoutDto: CheckoutDto = {
          invoiceId: 'invoice1',
          paymentMethod: 'qr_code',
        };
        const result = await service.initiateCheckout(checkoutDto);
        expect(result.paymentMethod).toBe('qr_code');
        expect(result.qrDataPayload).toContain(
          'KHQR_MOCK_PAYMENT_PAYLOAD_FOR_INVOICE_invoice1_KHR_500000',
        );
      });

      it('should return mock checkout url for stripe', async () => {
        const checkoutDto: CheckoutDto = {
          invoiceId: 'invoice1',
          paymentMethod: 'stripe',
        };
        const result = await service.initiateCheckout(checkoutDto);
        expect(result.paymentMethod).toBe('stripe');
        expect(result.checkoutUrl).toContain('mock-checkout.stripe.com');
      });

      it('should fallback to mock transaction token', async () => {
        const checkoutDto: CheckoutDto = {
          invoiceId: 'invoice1',
          paymentMethod: 'other_provider',
        } as any;
        const result = await service.initiateCheckout(checkoutDto);
        expect(result.paymentMethod).toBe('mock');
        expect(result).toHaveProperty('mockTransactionToken');
      });

      it('should throw NotFoundException if invoice does not exist', async () => {
        invoiceDocExists = false;
        await expect(
          service.initiateCheckout({ invoiceId: 'invalid' } as CheckoutDto),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException if invoice is already paid', async () => {
        invoiceStatus = 'paid';
        await expect(
          service.initiateCheckout({ invoiceId: 'invoice1' } as CheckoutDto),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw InternalServerErrorException if DB read fails', async () => {
        (mockInvoicesCollection.doc as jest.Mock).mockReturnValueOnce({
          get: jest.fn().mockRejectedValue(new Error('DB read error')),
        });
        await expect(
          service.initiateCheckout({ invoiceId: 'invoice1' } as CheckoutDto),
        ).rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('confirmPayment', () => {
      it('should confirm payment, update invoice status, and activate enrollment', async () => {
        const webhookDto: WebhookPaymentDto = {
          invoiceId: 'invoice1',
          transactionRef: 'tx_999',
          status: 'paid',
        };
        const result = await service.confirmPayment(webhookDto, {
          uid: 'system',
          role: 'system',
        });

        expect(result.success).toBe(true);
        expect(result.status).toBe('paid');
        expect(mockPaymentTxCollection.add).toHaveBeenCalled();
        expect(enrollmentsService.updateStatus).toHaveBeenCalledWith(
          'enroll1',
          'active',
          { uid: 'system', role: 'system' },
        );
        expect(auditLogsService.logAction).toHaveBeenCalled();
      });

      it('should process webhook when status is not paid but without activating enrollment', async () => {
        const webhookDto: WebhookPaymentDto = {
          invoiceId: 'invoice1',
          transactionRef: 'tx_999',
          status: 'failed',
        } as any;
        const result = await service.confirmPayment(webhookDto);

        expect(result.success).toBe(true);
        expect(result.status).toBe('failed');
        expect(mockPaymentTxCollection.add).toHaveBeenCalled();
        expect(enrollmentsService.updateStatus).not.toHaveBeenCalled(); // Ensure it didn't activate
      });

      it('should throw NotFoundException if invoice not found on webhook', async () => {
        invoiceDocExists = false;
        const webhookDto: WebhookPaymentDto = {
          invoiceId: 'invalid',
          transactionRef: 'tx_999',
          status: 'paid',
        };
        await expect(service.confirmPayment(webhookDto)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw InternalServerErrorException if webhook fails', async () => {
        (mockPaymentTxCollection.add as jest.Mock).mockRejectedValueOnce(
          new Error('DB failure'),
        );
        const webhookDto: WebhookPaymentDto = {
          invoiceId: 'invoice1',
          transactionRef: 'tx_999',
          status: 'paid',
        };
        await expect(service.confirmPayment(webhookDto)).rejects.toThrow(
          InternalServerErrorException,
        );
      });
    });
  });
});
