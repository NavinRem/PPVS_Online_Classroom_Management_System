import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsDate()
  @IsNotEmpty()
  dateOfBirth!: Date;

  @IsInt()
  @IsNotEmpty()
  age!: number;

  @IsString()
  @IsNotEmpty()
  gradeLevel!: string;

  @IsString()
  @IsNotEmpty()
  parentId!: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';
}
