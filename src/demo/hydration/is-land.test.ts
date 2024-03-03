import '@11ty/is-land';

import { DeferredComp } from './deferred-comp.js';
import { isHydrated } from 'hydroactive';
import { testCase, useTestCases } from '../../testing/test-cases.js';

describe('is-land', () => {
  describe('Island', () => {
    useTestCases();

    it('hydrates deferred children', testCase('deferred', async (island) => {
      const deferred = island.querySelector('deferred-comp')!;
      expect(isHydrated(deferred)).toBeFalse();

      deferred.click();

      // `<is-land>` hydrates asynchronously, no easy way to await it. Seems to
      // work on microtask scheduling so waiting one macrotask should be
      // sufficient.
      await new Promise<void>((resolve) => {
        setTimeout(() => { resolve(); });
      });

      expect(isHydrated(deferred)).toBeTrue();
      expect(deferred).toBeInstanceOf(DeferredComp);

      await deferred.stable();

      expect(deferred.querySelector('span')!.textContent!).toBe('HydroActive');
    }));
  });
});
