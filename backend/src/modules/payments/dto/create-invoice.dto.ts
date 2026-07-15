import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId!: string;

  @IsString()
  @IsNotEmpty()
  parentId!: string;

  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @IsString()
  @IsOptional()
  currency: string = 'KHR';

  @IsString()
  @IsOptional()
  dueDate?: string;
}

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @IsString()
  @IsIn(['stripe', 'qr_code', 'mock'])
  paymentMethod!: 'stripe' | 'qr_code' | 'mock';

  @IsString()
  @IsOptional()
  returnUrl?: string;
}

export class WebhookPaymentDto {
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @IsString()
  @IsNotEmpty()
  transactionRef!: string;

  @IsString()
  @IsOptional()
  status?: 'paid' | 'failed';
}
