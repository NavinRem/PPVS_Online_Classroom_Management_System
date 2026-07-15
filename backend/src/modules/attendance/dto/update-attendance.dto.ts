import { PartialType } from '@nestjs/mapped-types';
import { BatchCheckInDto } from './check-in.dto';

export class UpdateAttendanceDto extends PartialType(BatchCheckInDto) {}
