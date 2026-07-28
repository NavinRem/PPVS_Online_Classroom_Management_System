import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['email', 'phone'])
  loginType!: 'email' | 'phone';

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  pin?: string;
}
