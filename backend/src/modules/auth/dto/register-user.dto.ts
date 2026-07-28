import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({ description: 'Full name of the registrant' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Email address or phone number identifier' })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({ description: 'Password or 4-digit PIN secret' })
  @IsString()
  @IsNotEmpty()
  secret!: string;

  @ApiProperty({
    description: 'Public registration role',
    enum: ['parent', 'student'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['parent', 'student'])
  role!: 'parent' | 'student';

  @ApiPropertyOptional({
    description:
      'Student invitation code to verify and link parent account immediately',
  })
  @IsOptional()
  @IsString()
  studentLinkCode?: string;

  @ApiPropertyOptional({
    description:
      'Confirmation that registrant is the legal adult guardian (18+) of student',
  })
  @IsOptional()
  @IsBoolean()
  guardianCertified?: boolean;
}
