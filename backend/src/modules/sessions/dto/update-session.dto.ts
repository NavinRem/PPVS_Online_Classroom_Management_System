import { PartialType } from '@nestjs/mapped-types';
import { CreateSessionDto, CreateMaterialDto } from './create-session.dto';

export class UpdateSessionDto extends PartialType(CreateSessionDto) {}
export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
