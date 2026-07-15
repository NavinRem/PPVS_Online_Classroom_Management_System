import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FirebaseAuthStrategy } from './firebase-auth.strategy';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [PassportModule, FirebaseModule],
  providers: [FirebaseAuthStrategy, RolesGuard],
  exports: [PassportModule, RolesGuard], // Export both so other modules can use Guard and Roles
})
export class AuthModule {}
