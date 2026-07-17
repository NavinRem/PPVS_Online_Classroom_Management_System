import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsIn,
  Min,
} from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsInt()
  @Min(1)
  sessionNumber!: number;

  @IsString()
  @IsNotEmpty()
  date!: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @IsString()
  @IsOptional()
  meetingUrl?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @IsString()
  @IsIn(['pdf', 'video', 'link'])
  fileType!: 'pdf' | 'video' | 'link';

  @IsString()
  @IsOptional()
  branchId?: string;
}
