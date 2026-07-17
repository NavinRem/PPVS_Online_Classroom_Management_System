import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsIn,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsIn(['exam', 'quiz', 'homework', 'project'])
  type!: 'exam' | 'quiz' | 'homework' | 'project';

  @IsNumber()
  @Min(1)
  maxScore!: number;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}

export class RecordGradeDto {
  @IsString()
  @IsNotEmpty()
  assessmentId!: string;

  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsNumber()
  @Min(0)
  score!: number;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}
