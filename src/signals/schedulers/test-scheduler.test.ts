import { TestScheduler } from './test-scheduler.js';

describe('test-scheduler', () => {
  describe('TestScheduler', () => {
    it('schedules actions and executes them when flushed', () => {
      const scheduler = TestScheduler.from();
      const action = jasmine.createSpy<() => void>('action');

      scheduler.schedule(action);

      expect(scheduler.pending()).toEqual([ action ]);

      scheduler.flush();

      expect(scheduler.pending()).toEqual([]);
    });

    it('throws an aggregate of all errors thrown from a flush', () => {
      const scheduler = TestScheduler.from();
      const err1 = new Error('Oh noes!');
      const action1 = () => { throw err1; };
      const action2 = jasmine.createSpy<() => void>('action');
      const err2 = new Error('Oh noes again!');
      const action3 = () => { throw err2; };

      scheduler.schedule(action1);
      scheduler.schedule(action2);
      scheduler.schedule(action3);

      expect(() => scheduler.flush()).toThrowMatching((err) => {
        return err instanceof AggregateError
            && err.errors.length === 2
            && err.errors.includes(err1)
            && err.errors.includes(err2);
      });
      expect(action2).toHaveBeenCalled();
      expect(scheduler.pending()).toEqual([]);
    });

    it('cancels a scheduled action when the cancel callback is invoked', () => {
      const scheduler = TestScheduler.from();

      const action1 = jasmine.createSpy<() => void>('action');
      const action2 = jasmine.createSpy<() => void>('action');
      const action3 = jasmine.createSpy<() => void>('action');

      scheduler.schedule(action1);
      const cancelAction2 = scheduler.schedule(action2);
      scheduler.schedule(action3);

      cancelAction2();

      scheduler.flush();

      expect(action1).toHaveBeenCalled();
      expect(action2).not.toHaveBeenCalled();
      expect(action3).toHaveBeenCalled();
    });

    it('does nothing when an already executed action is canceled', () => {
      const scheduler = TestScheduler.from();
      const action = jasmine.createSpy<() => void>('action');

      const cancel = scheduler.schedule(action);

      scheduler.flush();
      expect(action).toHaveBeenCalled();
      expect(scheduler.pending()).toEqual([]);

      expect(() => cancel()).not.toThrow();
    });
  });
});
