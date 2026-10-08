import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_BASE } from './api';
import { SessionService } from './session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const isApi = request.url.startsWith(API_BASE + '/');
  const isLogin = request.url === API_BASE + '/auth/login';
  const token = session.token();
  const outgoing =
    isApi && !isLogin && token
      ? request.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
      : request;
  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (
        isApi &&
        !isLogin &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token &&
        session.token() === token
      )
        session.end(true);
      return throwError(() => error);
    }),
  );
};
