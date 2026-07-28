import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  let headers = req.headers;

  // 1. Retrieve the token from storage if available
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  // 2. Attach active branch ID header if present on the current user profile
  const user = authService.currentUser();
  if (user?.branchId) {
    headers = headers.set('X-Branch-Id', user.branchId);
  }

  if (headers !== req.headers) {
    const clonedReq = req.clone({ headers });
    return next(clonedReq);
  }

  return next(req);
};
