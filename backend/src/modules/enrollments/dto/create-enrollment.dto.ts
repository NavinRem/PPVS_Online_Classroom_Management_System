import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string; // The ID of the student taking the class

  @IsString()
  @IsNotEmpty()
  classId!: string; // The ID of the class they are joining

  @IsString()
  @IsNotEmpty()
  parentId!: string; // Good to include so parents can easily query their children's schedules

  @IsString()
  @IsOptional()
  branchId?: string;
}
