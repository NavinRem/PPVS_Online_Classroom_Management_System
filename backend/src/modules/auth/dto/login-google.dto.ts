import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LoginGoogleDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @IsString()
  @IsOptional()
  provider?: string;
}
