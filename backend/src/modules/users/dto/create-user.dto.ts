import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  uid!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsIn(['admin', 'teacher', 'parent', 'student'])
  role!: 'admin' | 'teacher' | 'parent' | 'student';

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  fcmToken?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
