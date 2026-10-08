import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  return (
    inject(SessionService).authenticated() ||
    inject(Router).createUrlTree(['/dang-nhap'], { queryParams: { returnUrl: state.url } })
  );
};
