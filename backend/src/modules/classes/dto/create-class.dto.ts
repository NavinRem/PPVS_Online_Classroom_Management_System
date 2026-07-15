import {
  IsString,
  IsInt,
  IsNotEmpty,
  Min,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  className!: string;

  @IsString()
  @IsNotEmpty()
  teacherName!: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsNotEmpty()
  day!: string;

  @IsString()
  @IsNotEmpty()
  time!: string;

  @IsInt()
  @Min(1)
  maxCapacity!: number;

  @IsNumber()
  @Min(0)
  price: number = 0;

  @IsString()
  @IsOptional()
  currency: string = 'KHR';

  @IsString()
  @IsOptional()
  meetingUrl?: string;
}
