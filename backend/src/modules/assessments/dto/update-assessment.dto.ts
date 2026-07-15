import { PartialType } from '@nestjs/mapped-types';
import { CreateAssessmentDto, RecordGradeDto } from './create-assessment.dto';

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {}
export class UpdateGradeDto extends PartialType(RecordGradeDto) {}
