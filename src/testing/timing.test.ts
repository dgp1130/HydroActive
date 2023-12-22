import { nextFrame } from './timing.js';

describe('timing', () => {
  describe('nextFrame', () => {
    it('waits for the next animation frame to complete', async () => {
      const spy = jasmine.createSpy<() => void>('callback');

      requestAnimationFrame(spy);

      await nextFrame();

      expect(spy).toHaveBeenCalled();
    });

    it('waits for RAF callbacks scheduled after `nextFrame`', async () => {
      const spy = jasmine.createSpy<() => void>('callback');

      const promise = nextFrame();
      requestAnimationFrame(spy);

      await promise;

      expect(spy).toHaveBeenCalled();
    });

    it('waits no more than *one* animation frame', async () => {
      const spy = jasmine.createSpy<() => void>('callback');

      // Schedule `spy` to be invoked two RAFs from now.
      requestAnimationFrame(() => { requestAnimationFrame(spy); });

      await nextFrame();
      expect(spy).not.toHaveBeenCalled();

      await nextFrame();
      expect(spy).toHaveBeenCalled();
    });

    describe('with mocked clock', () => {
      beforeEach(() => { jasmine.clock().install(); });
      afterEach(() => { jasmine.clock().uninstall(); });

      it('works', async () => {
        const spy = jasmine.createSpy<() => void>('callback');

        requestAnimationFrame(spy);

        await nextFrame();

        expect(spy).toHaveBeenCalled();
      });
    });
  });
});
