import './testing/noop-component.js';

import { ComponentRef } from './component-ref.js';
import { TestScheduler } from './signals/schedulers/test-scheduler.js';

describe('component-ref', () => {
  afterEach(() => {
    for (const child of Array.from(document.body.childNodes)) {
      child.remove();
    }
  });

  describe('ComponentRef', () => {
    describe('_from', () => {
      it('constructs a `ComponentRef` instance', () => {
        const ref = ComponentRef._from(TestScheduler.from());

        expect(ref).toBeInstanceOf(ComponentRef);
      });
    });
  });
});
