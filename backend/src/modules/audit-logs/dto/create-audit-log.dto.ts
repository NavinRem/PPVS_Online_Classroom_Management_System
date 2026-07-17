import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @IsNotEmpty()
  action!: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';

  @IsString()
  @IsNotEmpty()
  entity!: string; // e.g., 'classes', 'assessments', 'attendance', 'enrollments'

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsObject()
  @IsNotEmpty()
  modifiedBy!: {
    uid: string;
    role?: string;
    name?: string;
  };

  @IsObject()
  @IsOptional()
  details?: Record<string, any>;

  @IsString()
  @IsOptional()
  branchId?: string;
}
