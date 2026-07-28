import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginGoogleDto } from './dto/login-google.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegisterGoogleDto } from './dto/register-google.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email/password or phone/PIN' })
  @ApiResponse({ status: 200, description: 'Successful login.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or PIN.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('login-google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with Google OAuth ID token' })
  @ApiResponse({ status: 200, description: 'Successful Google SSO login.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid token or unregistered Google email.',
  })
  async loginGoogle(@Body() loginGoogleDto: LoginGoogleDto) {
    return this.authService.loginWithGoogle(loginGoogleDto);
  }

  @Post('register-parent')
  @ApiOperation({ summary: 'Public self-registration for Parent accounts' })
  @ApiResponse({ status: 201, description: 'Parent profile created.' })
  @ApiResponse({ status: 403, description: 'Forbidden role assignment.' })
  async registerParent(@Body() dto: RegisterUserDto) {
    return this.authService.registerPublicUser({ ...dto, role: 'parent' });
  }

  @Post('register-student')
  @ApiOperation({ summary: 'Public self-registration for Student accounts' })
  @ApiResponse({ status: 201, description: 'Student profile created.' })
  @ApiResponse({ status: 403, description: 'Forbidden role assignment.' })
  async registerStudent(@Body() dto: RegisterUserDto) {
    return this.authService.registerPublicUser({ ...dto, role: 'student' });
  }

  @Post('register-google')
  @ApiOperation({
    summary: 'Public Google OAuth registration for Parent and Student accounts',
  })
  @ApiResponse({ status: 201, description: 'Profile created via Google SSO.' })
  @ApiResponse({ status: 403, description: 'Forbidden role assignment.' })
  async registerGoogle(@Body() dto: RegisterGoogleDto) {
    return this.authService.registerWithGoogle(dto);
  }
}
