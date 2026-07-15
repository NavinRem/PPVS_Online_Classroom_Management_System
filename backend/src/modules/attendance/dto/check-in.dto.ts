import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsIn,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StudentCheckInRecordDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsIn(['present', 'homeworked', 'permission', 'absent'])
  status!: 'present' | 'homeworked' | 'permission' | 'absent';

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BatchCheckInDto {
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsString()
  @IsNotEmpty()
  date!: string; // YYYY-MM-DD

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentCheckInRecordDto)
  records!: StudentCheckInRecordDto[];
}
