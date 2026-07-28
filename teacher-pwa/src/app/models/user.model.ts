export type UserRole = 'teacher' | 'parent' | 'student' | 'admin';

export interface UserProfile {
  uid: string;
  email?: string;
  phoneNumber?: string;
  name: string;
  role: UserRole;
  branchId?: string;
  avatarUrl?: string;
}

export interface LoginPayload {
  loginType: 'email' | 'phone';
  email?: string;
  password?: string;
  phoneNumber?: string;
  pin?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}
