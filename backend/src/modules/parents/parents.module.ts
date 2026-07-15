import { Module } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { FirebaseModule } from '../../config/firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [ParentsController],
  providers: [ParentsService],
})
export class ParentsModule {}
