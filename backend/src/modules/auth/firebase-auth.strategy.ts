import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-firebase-jwt';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAuthStrategy extends PassportStrategy(
  Strategy,
  'firebase-auth',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(token: string) {
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      console.error('🔥 AUTH ERROR: Invalid Token', error);
      throw new UnauthorizedException(
        'Access Denied: Invalid or expired token',
      );
    }
  }
}
