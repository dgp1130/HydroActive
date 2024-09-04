import './testing/noop-component.js';

import { OnConnect, OnDisconnect } from './connectable.js';
import { ComponentRef } from './component-ref.js';
import { signal } from './signals.js';
import { ComponentAccessor } from './component-accessor.js';

describe('component-ref', () => {
  afterEach(() => {
    for (const child of Array.from(document.body.childNodes)) {
      child.remove();
    }
  });

  describe('ComponentRef', () => {
    describe('_from', () => {
      it('constructs a `ComponentRef` instance', () => {
        const el = document.createElement('noop-component');
        const accessor = ComponentAccessor.fromComponent(el);

        const ref = ComponentRef._from(accessor);

        expect(ref).toBeInstanceOf(ComponentRef);
      });
    });

    describe('effect', () => {
      it('schedules the effect for the next animation frame', async () => {
        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        const effect = jasmine.createSpy<() => void>('effect');

        ref.effect(effect);
        expect(effect).not.toHaveBeenCalled();

        document.body.appendChild(el);
        expect(effect).not.toHaveBeenCalled();

        await el.stable();
        expect(effect).toHaveBeenCalledOnceWith();
      });

      it('reruns the effect when a signal changes', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const value = signal(1);
        const effect = jasmine.createSpy<() => void>('effect')
            .and.callFake(() => { value(); });

        ref.effect(effect);
        await el.stable();
        expect(effect).toHaveBeenCalled();
        effect.calls.reset();

        await el.stable();
        expect(effect).not.toHaveBeenCalled(); // Nothing changed.

        value.set(2);
        expect(effect).not.toHaveBeenCalled(); // Scheduled but not invoked yet.

        await el.stable();
        expect(effect).toHaveBeenCalledOnceWith();
      });

      it('does not initialize the effect until connected', async () => {
        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        const effect = jasmine.createSpy<() => void>('effect');

        ref.effect(effect);
        await el.stable();
        expect(effect).not.toHaveBeenCalled();

        document.body.appendChild(el);
        await el.stable();
        expect(effect).toHaveBeenCalledOnceWith();
      });

      it('pauses the effect while disconnected', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const value = signal(1);
        const effect = jasmine.createSpy<() => void>('effect')
            .and.callFake(() => { value(); });

        ref.effect(effect);
        await el.stable();
        expect(effect).toHaveBeenCalledOnceWith();
        effect.calls.reset();

        // Don't really need to assert this, just making sure `value` is used
        // correctly in this test.
        value.set(2);
        await el.stable();
        expect(effect).toHaveBeenCalledOnceWith();
        effect.calls.reset();

        el.remove();
        expect(effect).not.toHaveBeenCalled();

        value.set(3);
        await el.stable();
        expect(effect).not.toHaveBeenCalled();
      });

      // Effects *must* be re-executed when reconnected to the DOM. This is
      // because signal dependencies might have changed while the effect was
      // disabled. The alternative is to continue subscribing to signal changes,
      // but doing so would prevent an unused component from being garbage
      // collected.
      it('resumes the effect when reconnected', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const effect = jasmine.createSpy<() => void>('effect');

        ref.effect(effect);
        await el.stable();
        expect(effect).toHaveBeenCalledOnceWith();
        effect.calls.reset();

        el.remove();
        expect(effect).not.toHaveBeenCalled();

        // Even though no dependencies changed, effect should be re-invoked just
        // to check if they have.
        document.body.appendChild(el);
        await el.stable();
        expect(effect).toHaveBeenCalledOnceWith();
      });
    });
  });
});
