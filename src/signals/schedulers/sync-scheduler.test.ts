import { Action } from './scheduler.js';
import { syncScheduler } from './sync-scheduler.js';

describe('sync-scheduler', () => {
  describe('SyncScheduler', () => {
    describe('schedule', () => {
      it('executes the given action synchronously', () => {
        const action = jasmine.createSpy<Action>('action');

        syncScheduler.schedule(action);
        expect(action).toHaveBeenCalledOnceWith();
      });

      it('ignores cancel operations', () => {
        const action = jasmine.createSpy<Action>('action');

        const cancel = syncScheduler.schedule(action);
        expect(cancel).not.toThrow();
      });
    });
  });
});
