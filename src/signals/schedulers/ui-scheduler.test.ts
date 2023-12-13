import { UiScheduler } from './ui-scheduler.js';

describe('ui-scheduler', () => {
  describe('UiScheduler', () => {
    describe('schedule', () => {
      it('schedules on the next animation frame', async () => {
        const scheduler = UiScheduler.from();
        const action = jasmine.createSpy<() => void>('action');

        scheduler.schedule(action);
        expect(action).not.toHaveBeenCalled();

        await waitForNextAnimationFrame();
        expect(action).toHaveBeenCalledOnceWith();
      });

      it('cancels a scheduled action when the cancel callback is invoked', async () => {
        const scheduler = UiScheduler.from();
        const action = jasmine.createSpy<() => void>('action');

        const cancel = scheduler.schedule(action);
        expect(action).not.toHaveBeenCalled();

        cancel();
        expect(action).not.toHaveBeenCalled();

        await waitForNextAnimationFrame();
        expect(action).not.toHaveBeenCalled();
      });

      it('schedules multiple actions concurrently', async () => {
        const scheduler = UiScheduler.from();
        const action1 = jasmine.createSpy<() => void>('action1');
        const action2 = jasmine.createSpy<() => void>('action2');

        scheduler.schedule(action1);
        scheduler.schedule(action2);

        expect(action1).not.toHaveBeenCalled();
        expect(action2).not.toHaveBeenCalled();

        await waitForNextAnimationFrame();

        expect(action1).toHaveBeenCalled();
        expect(action2).toHaveBeenCalled();
      });

      it('schedules multiple actions *without* batching them together', async () => {
        const scheduler = UiScheduler.from();

        const calls: Array<jasmine.Spy> = [];
        const action1 = jasmine.createSpy<() => void>('action1')
            .and.callFake(() => { calls.push(action1); });
        const action2 = jasmine.createSpy<() => void>('action2')
            .and.callFake(() => { calls.push(action2); });
        const action3 = jasmine.createSpy<() => void>('action3')
            .and.callFake(() => { calls.push(action3); });

        scheduler.schedule(action1);
        requestAnimationFrame(action2);
        scheduler.schedule(action3);

        expect(calls).toEqual([]);

        await waitForNextAnimationFrame();

        expect(calls).toEqual([ action1, action2, action3 ]);
      });

      it('cancels actions independently', async () => {
        const scheduler = UiScheduler.from();
        const action1 = jasmine.createSpy<() => void>('action1');
        const action2 = jasmine.createSpy<() => void>('action2');

        const cancel1 = scheduler.schedule(action1);
        scheduler.schedule(action2);

        cancel1();

        expect(action1).not.toHaveBeenCalled();
        expect(action2).not.toHaveBeenCalled();

        await waitForNextAnimationFrame();

        expect(action1).not.toHaveBeenCalled();
        expect(action2).toHaveBeenCalledOnceWith();
      });

      it('ignores canceling actions which have already executed', async () => {
        const scheduler = UiScheduler.from();
        const action1 = jasmine.createSpy<() => void>('action1');
        const action2 = jasmine.createSpy<() => void>('action2');

        const cancel = scheduler.schedule(action1);

        await waitForNextAnimationFrame();
        expect(action1).toHaveBeenCalledOnceWith();
        action1.calls.reset();

        expect(() => cancel()).not.toThrow();
        expect(action1).not.toHaveBeenCalled();

        scheduler.schedule(action2);

        await waitForNextAnimationFrame();
        expect(action1).not.toHaveBeenCalledOnceWith();
        expect(action2).toHaveBeenCalledOnceWith();
      });
    });
  });
});

async function waitForNextAnimationFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => { resolve(); });
  });
}
