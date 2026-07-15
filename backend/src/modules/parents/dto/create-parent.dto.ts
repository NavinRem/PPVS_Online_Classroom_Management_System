import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateParentDto {
  @IsString()
  @IsNotEmpty()
  fullName: string = '';

  @IsString()
  @IsNotEmpty()
  phoneNumber: string = '';

  @IsString()
  @IsOptional()
  email?: string = '';

  @IsString()
  @IsOptional()
  address?: string = '';

  @IsString()
  @IsOptional()
  avatarUrl?: string = '';

  @IsString()
  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';
}
