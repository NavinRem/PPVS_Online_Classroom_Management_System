import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsObject,
} from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsOptional()
  @IsIn(['all', 'parent', 'student'])
  targetRole?: 'all' | 'parent' | 'student' = 'all';

  @IsString()
  @IsOptional()
  branchId?: string;
}

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsString()
  @IsIn(['payment_due', 'new_grade', 'class_reminder', 'general'])
  type!: 'payment_due' | 'new_grade' | 'class_reminder' | 'general';

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  branchId?: string;
}
