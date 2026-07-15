import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FirestoreBaseService } from '../../common/firebase-base.service';
import {
  CreateInvoiceDto,
  CheckoutDto,
  WebhookPaymentDto,
} from './dto/create-invoice.dto';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class PaymentsService extends FirestoreBaseService<CreateInvoiceDto> {
  protected collectionName = 'invoices';

  constructor(
    firebase: FirebaseService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super(firebase);
  }

  async createInvoice(createDto: CreateInvoiceDto, auditContext?: any) {
    try {
      const invoiceData = {
        ...createDto,
        status: 'unpaid',
        currency: createDto.currency || 'KHR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (auditContext) {
        (invoiceData as any).createdBy = auditContext;
        (invoiceData as any).updatedBy = auditContext;
      }
      const docRef = await this.firebase.firestore
        .collection(this.collectionName)
        .add(invoiceData);

      if (auditContext) {
        await this.auditLogsService.logAction({
          action: 'CREATE',
          entity: 'invoices',
          entityId: docRef.id,
          modifiedBy: auditContext,
          details: { amount: createDto.amount, currency: createDto.currency },
        });
      }

      return {
        id: docRef.id,
        ...invoiceData,
        message: 'Invoice created successfully in KHR.',
      };
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (PaymentsService createInvoice):',
        error,
      );
      throw new InternalServerErrorException('Failed to create invoice');
    }
  }

  async getMyInvoices(parentId: string) {
    try {
      const snapshot = await this.firebase.firestore
        .collection(this.collectionName)
        .where('parentId', '==', parentId)
        .get();

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(
        '🔥 FIRESTORE ERROR (PaymentsService getMyInvoices):',
        error,
      );
      throw new InternalServerErrorException('Failed to fetch user invoices');
    }
  }

  async initiateCheckout(checkoutDto: CheckoutDto, _auditContext?: any) {
    try {
      const invoiceDoc = await this.firebase.firestore
        .collection(this.collectionName)
        .doc(checkoutDto.invoiceId)
        .get();

      if (!invoiceDoc.exists) {
        throw new NotFoundException(
          `Invoice with ID ${checkoutDto.invoiceId} not found.`,
        );
      }

      const invoiceData = invoiceDoc.data() as any;
      if (invoiceData.status === 'paid') {
        throw new BadRequestException('This invoice has already been paid.');
      }

      if (checkoutDto.paymentMethod === 'qr_code') {
        // Return simulated KHQR / PromptPay QR payload
        return {
          invoiceId: checkoutDto.invoiceId,
          paymentMethod: 'qr_code',
          amount: invoiceData.amount,
          currency: invoiceData.currency || 'KHR',
          qrDataPayload: `00020101021229300012KHQR_MOCK_PAYMENT_PAYLOAD_FOR_INVOICE_${checkoutDto.invoiceId}_KHR_${invoiceData.amount}`,
          message:
            'Scan the KHQR / QR Banking code to pay in Cambodian Riel (KHR).',
        };
      } else if (checkoutDto.paymentMethod === 'stripe') {
        return {
          invoiceId: checkoutDto.invoiceId,
          paymentMethod: 'stripe',
          checkoutUrl: `https://mock-checkout.stripe.com/pay/${checkoutDto.invoiceId}`,
          message: 'Redirecting to online checkout.',
        };
      } else {
        // Mock instant transaction token
        return {
          invoiceId: checkoutDto.invoiceId,
          paymentMethod: 'mock',
          mockTransactionToken: `mock_tx_${Date.now()}`,
          message: 'Mock checkout initialized.',
        };
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('🔥 CHECKOUT ERROR:', error);
      throw new InternalServerErrorException('Failed to initiate checkout');
    }
  }

  async confirmPayment(webhookDto: WebhookPaymentDto, auditContext?: any) {
    const { invoiceId, transactionRef, status = 'paid' } = webhookDto;
    try {
      const invoiceRef = this.firebase.firestore
        .collection(this.collectionName)
        .doc(invoiceId);
      const invoiceDoc = await invoiceRef.get();

      if (!invoiceDoc.exists) {
        throw new NotFoundException(`Invoice ${invoiceId} not found`);
      }

      const invoiceData = invoiceDoc.data() as any;

      // Log transaction
      const txRef = await this.firebase.firestore
        .collection('payment_transactions')
        .add({
          invoiceId,
          transactionRef,
          amount: invoiceData.amount,
          currency: invoiceData.currency || 'KHR',
          status,
          createdAt: new Date().toISOString(),
        });

      if (status === 'paid') {
        await invoiceRef.update({
          status: 'paid',
          paidAt: new Date().toISOString(),
          transactionId: txRef.id,
        });

        if (invoiceData.enrollmentId) {
          await this.enrollmentsService.updateStatus(
            invoiceData.enrollmentId,
            'active',
            auditContext || { uid: 'system_webhook', role: 'system' },
          );
        }

        if (auditContext) {
          await this.auditLogsService.logAction({
            action: 'STATUS_CHANGE',
            entity: 'invoices',
            entityId: invoiceId,
            modifiedBy: auditContext,
            details: {
              newStatus: 'paid',
              enrollmentId: invoiceData.enrollmentId,
            },
          });
        }
      }

      return {
        success: true,
        invoiceId,
        status,
        message:
          status === 'paid'
            ? 'Payment confirmed and enrollment activated!'
            : 'Payment failed or recorded.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('🔥 WEBHOOK ERROR:', error);
      throw new InternalServerErrorException(
        'Failed to confirm payment webhook',
      );
    }
  }
}
