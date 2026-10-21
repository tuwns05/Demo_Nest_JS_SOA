import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const authGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!session.authenticated()) {
    return router.createUrlTree(['/dang-nhap'], { queryParams: { returnUrl: state.url } });
  }
  const roles = route.data?.['roles'] as string[] | undefined;
  if (roles && !roles.includes(session.role()!)) return router.createUrlTree([session.home()]);
  return true;
};
