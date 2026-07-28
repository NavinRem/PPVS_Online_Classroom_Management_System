import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FirebaseAuthStrategy } from './firebase-auth.strategy';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { RolesGuard } from './roles.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { ParentsModule } from '../parents/parents.module';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    PassportModule,
    FirebaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => ParentsModule),
    forwardRef(() => StudentsModule),
  ],
  controllers: [AuthController],
  providers: [FirebaseAuthStrategy, RolesGuard, AuthService],
  exports: [PassportModule, RolesGuard, AuthService],
})
export class AuthModule {}
