import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProgressService } from '../services/progress.service';

export const regionalUnlockedGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const progress = inject(ProgressService);

  const region = (route.paramMap.get('region') || '').trim().toLowerCase();
  if (!region) return router.parseUrl('/progress');

  const unlocked = new Set(progress.load().regions.map((r) => r.trim().toLowerCase()).filter(Boolean));
  return unlocked.has(region) ? true : router.parseUrl('/progress');
};