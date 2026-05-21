import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { regionalUnlockedGuard } from './regional-unlocked.guard';

describe('regionalUnlockedGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => regionalUnlockedGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
