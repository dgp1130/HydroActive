import './testing/noop-component.js';

import { ComponentRef, type OnDisconnect, type OnConnect } from './component-ref.js';
import { ElementRef } from './element-ref.js';
import { signal } from './signals.js';

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
        const ref = ComponentRef._from(ElementRef.from(el));

        expect(ref.host.native).toBe(el);
      });
    });

    describe('connected', () => {
      it('invokes the given callback on connect', () => {
        const onConnect = jasmine.createSpy<OnConnect>('onConnect');

        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        ref.connected(onConnect);
        expect(onConnect).not.toHaveBeenCalled();

        document.body.appendChild(el);
        expect(onConnect).toHaveBeenCalledOnceWith();
      });

      it('invokes the given callback on repeated connections', () => {
        const onConnect = jasmine.createSpy<OnConnect>('onConnect');

        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        ref.connected(onConnect);
        expect(onConnect).not.toHaveBeenCalled();

        // Called on first connection.
        document.body.appendChild(el);
        expect(onConnect).toHaveBeenCalledOnceWith();

        onConnect.calls.reset();

        el.remove();
        expect(onConnect).not.toHaveBeenCalled();

        // Called again on second connection.
        document.body.appendChild(el);
        expect(onConnect).toHaveBeenCalledOnceWith();
      });

      it('invokes the connected disposer on disconnect', () => {
        const onDisconnect = jasmine.createSpy<OnDisconnect>('onDisconnect');

        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        ref.connected(() => onDisconnect);
        expect(onDisconnect).not.toHaveBeenCalled();

        document.body.appendChild(el);
        expect(onDisconnect).not.toHaveBeenCalled();

        el.remove();
        expect(onDisconnect).toHaveBeenCalledOnceWith();
      });

      it('refreshes the disconnect listener on each connection', () => {
        const onDisconnect1 = jasmine.createSpy<OnDisconnect>('onDisconnect1');
        const onDisconnect2 = jasmine.createSpy<OnDisconnect>('onDisconnect2');

        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        ref.connected(jasmine.createSpy().and.returnValues(
          onDisconnect1,
          onDisconnect2,
        ));
        expect(onDisconnect1).not.toHaveBeenCalled();
        expect(onDisconnect2).not.toHaveBeenCalled();

        // First connect.
        document.body.appendChild(el);
        expect(onDisconnect1).not.toHaveBeenCalled();
        expect(onDisconnect2).not.toHaveBeenCalled();

        // First disconnect should only call the first disconnect listener.
        el.remove();
        expect(onDisconnect1).toHaveBeenCalledOnceWith();
        expect(onDisconnect2).not.toHaveBeenCalled();

        onDisconnect1.calls.reset();

        // Second connect.
        document.body.appendChild(el);
        expect(onDisconnect1).not.toHaveBeenCalled();
        expect(onDisconnect2).not.toHaveBeenCalled();

        // Second disconnect should only call the second disconnect listener.
        el.remove();
        expect(onDisconnect1).not.toHaveBeenCalled();
        expect(onDisconnect2).toHaveBeenCalledOnceWith();
      });

      it('manages multiple connect callbacks', () => {
        const onConnect1 = jasmine.createSpy<OnConnect>('onConnect1');
        const onConnect2 = jasmine.createSpy<OnConnect>('onConnect2');

        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        ref.connected(onConnect1);
        ref.connected(onConnect2);

        expect(onConnect1).not.toHaveBeenCalled();
        expect(onConnect2).not.toHaveBeenCalled();

        document.body.appendChild(el);
        expect(onConnect1).toHaveBeenCalledOnceWith();
        expect(onConnect2).toHaveBeenCalledOnceWith();
      });

      it('invokes the connect callback immediately when already connected', () => {
        const onConnect = jasmine.createSpy<OnConnect>('onConnect');

        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        document.body.appendChild(el);
        expect(onConnect).not.toHaveBeenCalled();

        ref.connected(onConnect);
        expect(onConnect).toHaveBeenCalledOnceWith();
      });

      it('does not invoke the connect callback when disconnected', () => {
        const onConnect = jasmine.createSpy<OnConnect>('onConnect');

        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        // Connect and disconnect the element.
        document.body.appendChild(el);
        el.remove();

        // Should not be called because the element is currently disconnected.
        ref.connected(onConnect);
        expect(onConnect).not.toHaveBeenCalled();

        // Should be called when connected.
        document.body.appendChild(el);
        expect(onConnect).toHaveBeenCalledOnceWith();
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
