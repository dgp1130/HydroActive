import { ComponentRef, type OnDisconnect, type OnConnect } from './component-ref.js';
import { ElementRef } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { type AttrSerializable, type AttrSerializer, toSerializer } from './serializers.js';
import { type WriteableSignal, signal } from './signals.js';
import { parseHtml } from './testing/html-parser.js';

class NoopComponent extends HydroActiveComponent {
  protected override hydrate(): void { /* noop */ }
}

customElements.define('noop-component', NoopComponent);

declare global {
  interface HTMLElementTagNameMap {
    'noop-component': NoopComponent;
  }
}

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
        const ref = ComponentRef._from(ElementRef.from(el));

        ref.connected(onConnect);
        expect(onConnect).not.toHaveBeenCalled();

        document.body.appendChild(el);
        expect(onConnect).toHaveBeenCalledOnceWith();
      });

      it('invokes the given callback on repeated connections', () => {
        const onConnect = jasmine.createSpy<OnConnect>('onConnect');

        const el = document.createElement('noop-component');
        const ref = ComponentRef._from(ElementRef.from(el));

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
        const ref = ComponentRef._from(ElementRef.from(el));

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
        const ref = ComponentRef._from(ElementRef.from(el));

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
        const ref = ComponentRef._from(ElementRef.from(el));

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
        const ref = ComponentRef._from(ElementRef.from(el));

        document.body.appendChild(el);
        expect(onConnect).not.toHaveBeenCalled();

        ref.connected(onConnect);
        expect(onConnect).toHaveBeenCalledOnceWith();
      });

      it('does not invoke the connect callback when disconnected', () => {
        const onConnect = jasmine.createSpy<OnConnect>('onConnect');

        const el = document.createElement('noop-component');
        const ref = ComponentRef._from(ElementRef.from(el));

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
        const ref = ComponentRef._from(ElementRef.from(el));

        const effect = jasmine.createSpy<() => void>('effect');

        ref.effect(effect);
        expect(effect).not.toHaveBeenCalled();

        document.body.appendChild(el);
        expect(effect).not.toHaveBeenCalled();

        await waitForNextAnimationFrame();
        expect(effect).toHaveBeenCalledOnceWith();
      });

      it('reruns the effect when a signal changes', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = ComponentRef._from(ElementRef.from(el));

        const value = signal(1);
        const effect = jasmine.createSpy<() => void>('effect')
            .and.callFake(() => { value(); });

        ref.effect(effect);
        await waitForNextAnimationFrame();
        expect(effect).toHaveBeenCalled();
        effect.calls.reset();

        await waitForNextAnimationFrame();
        expect(effect).not.toHaveBeenCalled(); // Nothing changed.

        value.set(2);
        expect(effect).not.toHaveBeenCalled(); // Scheduled but not invoked yet.

        await waitForNextAnimationFrame();
        expect(effect).toHaveBeenCalledOnceWith();
      });

      it('does not initialize the effect until connected', async () => {
        const el = document.createElement('noop-component');
        const ref = ComponentRef._from(ElementRef.from(el));

        const effect = jasmine.createSpy<() => void>('effect');

        ref.effect(effect);
        await waitForNextAnimationFrame();
        expect(effect).not.toHaveBeenCalled();

        document.body.appendChild(el);
        await waitForNextAnimationFrame();
        expect(effect).toHaveBeenCalledOnceWith();
      });

      it('pauses the effect while disconnected', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = ComponentRef._from(ElementRef.from(el));

        const value = signal(1);
        const effect = jasmine.createSpy<() => void>('effect')
            .and.callFake(() => { value(); });

        ref.effect(effect);
        await waitForNextAnimationFrame();
        expect(effect).toHaveBeenCalledOnceWith();
        effect.calls.reset();

        // Don't really need to assert this, just making sure `value` is used
        // correctly in this test.
        value.set(2);
        await waitForNextAnimationFrame();
        expect(effect).toHaveBeenCalledOnceWith();
        effect.calls.reset();

        el.remove();
        expect(effect).not.toHaveBeenCalled();

        value.set(3);
        await waitForNextAnimationFrame();
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
        const ref = ComponentRef._from(ElementRef.from(el));

        const effect = jasmine.createSpy<() => void>('effect');

        ref.effect(effect);
        await waitForNextAnimationFrame();
        expect(effect).toHaveBeenCalledOnceWith();
        effect.calls.reset();

        el.remove();
        expect(effect).not.toHaveBeenCalled();

        // Even though no dependencies changed, effect should be re-invoked just
        // to check if they have.
        document.body.appendChild(el);
        await waitForNextAnimationFrame();
        expect(effect).toHaveBeenCalledOnceWith();
      });
    });

    describe('live', () => {
      it('returns an initialized signal', () => {
        const el = parseHtml(`<noop-component>Hello!</noop-component>`) as
            NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));

        const text = ref.live(ref.host, String);
        expect(text()).toBe('Hello!');
      });

      it('binds to the provided DOM element', async () => {
        const el = parseHtml(`
          <noop-component>
            <span>test</span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const text = ref.live(ref.host.query('span'), String);
        expect(text()).toBe('test');

        text.set('test2');
        await waitForNextAnimationFrame();
        expect(el.querySelector('span')!.textContent!).toBe('test2');
      });

      it('binds to the element returned by the provided selector query', async () => {
        const el = parseHtml(`
          <noop-component>
            <span>test</span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const text = ref.live('span', String);
        expect(text()).toBe('test');

        text.set('test2');
        await waitForNextAnimationFrame();
        expect(el.querySelector('span')!.textContent!).toBe('test2');
      });

      it('processes the DOM element based on the provided primitive serializer token', async () => {
        {
          const el = parseHtml(`<noop-component>test1</noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          const value = ref.live(ref.host, String);
          expect(value()).toBe('test1');

          value.set('test2');
          await waitForNextAnimationFrame();
          expect(el.textContent!).toBe('test2');
        }

        {
          const el = parseHtml(`<noop-component>1234</noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          const value = ref.live(ref.host, Number);
          expect(value()).toBe(1234);

          value.set(4321);
          await waitForNextAnimationFrame();
          expect(el.textContent!).toBe('4321');
        }

        {
          const el = parseHtml(`<noop-component>true</noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          const value = ref.live(ref.host, Boolean);
          expect(value()).toBe(true);

          value.set(false);
          await waitForNextAnimationFrame();
          expect(el.textContent!).toBe('false');
        }

        {
          const el = parseHtml(`<noop-component>1234</noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          const value = ref.live(ref.host, BigInt);
          expect(value()).toBe(1234n);

          value.set(4321n);
          await waitForNextAnimationFrame();
          expect(el.textContent!).toBe('4321');
        }
      });

      it('processes the DOM element based on the provided custom serializer', async () => {
        const el = parseHtml(`<noop-component></noop-component>`) as
            NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const serializer: AttrSerializer<string> = {
          serialize(value: string): string {
            return `serialized: ${value}`;
          },

          deserialize(): string {
            return 'deserialized';
          },
        };

        const value = ref.live(ref.host, serializer);
        expect(value()).toBe('deserialized');

        value.set('test');
        await waitForNextAnimationFrame();
        expect(el.textContent!).toBe('serialized: test');
      });

      it('processes the DOM element based on the provided serializable', async () => {
        class User {
          public constructor(private name: string) {}
          public static [toSerializer](): AttrSerializer<User> {
            return {
              serialize(user: User): string {
                return user.name;
              },

              deserialize(name: string): User {
                return new User(name);
              }
            };
          }
        }

        const el = parseHtml(`<noop-component>Devel</noop-component>`) as
            NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const value = ref.live(ref.host, User);
        expect(value()).toEqual(new User('Devel'));

        value.set(new User('Devel without a Cause'));
        await waitForNextAnimationFrame();
        expect(el.textContent!).toBe('Devel without a Cause');
      });

      it('throws an error when binding to the same element multiple times', () => {
        const el = parseHtml(`
          <noop-component>
            <span id="my-span"></span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));

        ref.live('span', String);
        expect(() => ref.live('#my-span', String))
            .toThrowError(/cannot bind it again/);
      });

      it('throws an error when binding to the same element multiple times from different components', () => {
        const el = parseHtml(`
          <noop-component>
            <noop-component></noop-component>
          </noop-component>
        `) as NoopComponent;
        const outerRef = ComponentRef._from(ElementRef.from(el));
        const innerRef =
            ComponentRef._from(outerRef.host.query('noop-component'));

        outerRef.live('noop-component', String);
        expect(() => innerRef.live(innerRef.host, String))
            .toThrowError(/cannot bind it again/);
      });

      it('infers the return type based on the serializer', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;

          // Primitive serializer tokens.
          const _signal1: WriteableSignal<string> = ref.live(ref.host, String);
          const _signal2: WriteableSignal<number> = ref.live(ref.host, Number);
          const _signal3: WriteableSignal<boolean> =
              ref.live(ref.host, Boolean);
          const _signal4: WriteableSignal<bigint> = ref.live(ref.host, BigInt);

          // Custom `AttrSerializer` type.
          const serializer = {} as AttrSerializer<string>;
          const _signal5: WriteableSignal<string> =
              ref.live(ref.host, serializer);

          // Custom `Serializable` type.
          const serializable = {} as AttrSerializable<string>;
          const _signal6: WriteableSignal<string> =
              ref.live(ref.host, serializable);
        };
      });
    });

    describe('liveAttr', () => {
      it('returns an initialized signal', () => {
        const el = parseHtml(`
          <noop-component value="Hello!"></noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));

        const text = ref.liveAttr(ref.host, 'value', String);
        expect(text()).toBe('Hello!');
      });

      it('binds to the provided DOM element', async () => {
        const el = parseHtml(`
          <noop-component>
            <span value="test"></span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const text = ref.liveAttr(ref.host.query('span'), 'value', String);
        expect(text()).toBe('test');

        text.set('test2');
        await waitForNextAnimationFrame();
        expect(el.querySelector('span')!.getAttribute('value')).toBe('test2');
      });

      it('binds to the element returned by the provided selector query', async () => {
        const el = parseHtml(`
          <noop-component>
            <span value="test"></span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const text = ref.liveAttr('span', 'value', String);
        expect(text()).toBe('test');

        text.set('test2');
        await waitForNextAnimationFrame();
        expect(el.querySelector('span')!.getAttribute('value')).toBe('test2');
      });

      it('processes the DOM element based on the provided primitive serializer token', async () => {
        {
          const el = parseHtml(`
            <noop-component value="test1"></noop-component>
          `) as NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          const value = ref.liveAttr(ref.host, 'value', String);
          expect(value()).toBe('test1');

          value.set('test2');
          await waitForNextAnimationFrame();
          expect(el.getAttribute('value')).toBe('test2');
        }

        {
          const el = parseHtml(`
            <noop-component value="1234"></noop-component>
          `) as NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          const value = ref.liveAttr(ref.host, 'value', Number);
          expect(value()).toBe(1234);

          value.set(4321);
          await waitForNextAnimationFrame();
          expect(el.getAttribute('value')).toBe('4321');
        }

        {
          const el = parseHtml(`
            <noop-component value="true"></noop-component>
          `) as NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          const value = ref.liveAttr(ref.host, 'value', Boolean);
          expect(value()).toBe(true);

          value.set(false);
          await waitForNextAnimationFrame();
          expect(el.getAttribute('value')).toBe('false');
        }

        {
          const el = parseHtml(`
            <noop-component value="1234"></noop-component>
          `) as NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          const value = ref.liveAttr(ref.host, 'value', BigInt);
          expect(value()).toBe(1234n);

          value.set(4321n);
          await waitForNextAnimationFrame();
          expect(el.getAttribute('value')).toBe('4321');
        }
      });

      it('processes the DOM element based on the provided custom serializer', async () => {
        const el = parseHtml(`<noop-component value></noop-component>`) as
            NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const serializer: AttrSerializer<string> = {
          serialize(value: string): string {
            return `serialized: ${value}`;
          },

          deserialize(): string {
            return 'deserialized';
          },
        };

        const value = ref.liveAttr(ref.host, 'value', serializer);
        expect(value()).toBe('deserialized');

        value.set('test');
        await waitForNextAnimationFrame();
        expect(el.getAttribute('value')).toBe('serialized: test');
      });

      it('processes the DOM element based on the provided serializable', async () => {
        class User {
          public constructor(private name: string) {}
          public static [toSerializer](): AttrSerializer<User> {
            return {
              serialize(user: User): string {
                return user.name;
              },

              deserialize(name: string): User {
                return new User(name);
              }
            };
          }
        }

        const el = parseHtml(`
          <noop-component user="Devel"></noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const value = ref.liveAttr(ref.host, 'user', User);
        expect(value()).toEqual(new User('Devel'));

        value.set(new User('Devel without a Cause'));
        await waitForNextAnimationFrame();
        expect(el.getAttribute('user')).toBe('Devel without a Cause');
      });

      it('throws an error when binding to the same element attribute multiple times', () => {
        const el = parseHtml(`
          <noop-component>
            <span id="my-span" value></span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));

        ref.liveAttr('span', 'value', String);
        expect(() => ref.liveAttr('#my-span', 'value', String))
            .toThrowError(/cannot bind it again/);
      });

      it('throws an error when binding to the same element attribute multiple times from different components', () => {
        const el = parseHtml(`
          <noop-component>
            <noop-component value></noop-component>
          </noop-component>
        `) as NoopComponent;
        const outerRef = ComponentRef._from(ElementRef.from(el));
        const innerRef =
            ComponentRef._from(outerRef.host.query('noop-component'));

        outerRef.liveAttr('noop-component', 'value', String);
        expect(() => innerRef.liveAttr(innerRef.host, 'value', String))
            .toThrowError(/cannot bind it again/);
      });

      it('infers the return type based on the serializer', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;

          // Primitive serializer tokens.
          const _signal1: WriteableSignal<string> =
              ref.liveAttr(ref.host, 'value', String);
          const _signal2: WriteableSignal<number> =
              ref.liveAttr(ref.host, 'value', Number);
          const _signal3: WriteableSignal<boolean> =
              ref.liveAttr(ref.host, 'value', Boolean);
          const _signal4: WriteableSignal<bigint> =
              ref.liveAttr(ref.host, 'value', BigInt);

          // Custom `AttrSerializer` type.
          const serializer = {} as AttrSerializer<string>;
          const _signal5: WriteableSignal<string> =
              ref.liveAttr(ref.host, 'value', serializer);

          // Custom `Serializable` type.
          const serializable = {} as AttrSerializable<string>;
          const _signal6: WriteableSignal<string> =
              ref.liveAttr(ref.host, 'value', serializable);
        };
      });
    });

    describe('bind', () => {
      it('updates the provided element\'s text content reactively', async () => {
        const el = document.createElement('noop-component');
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        expect(el.textContent).toBe('');

        const value = signal('1');
        ref.bind(ref.host, () => value(), String);
        await waitForNextAnimationFrame();
        expect(el.textContent).toBe('1');

        value.set('2');
        await waitForNextAnimationFrame();
        expect(el.textContent).toBe('2');
      });

      it('does not invoke the signal until connected', async () => {
        const el = document.createElement('noop-component');
        const ref = ComponentRef._from(ElementRef.from(el));
        const sig = jasmine.createSpy<() => string>('sig')
            .and.returnValue('test');

        ref.bind(ref.host, sig, String);
        await waitForNextAnimationFrame();
        expect(sig).not.toHaveBeenCalled();

        document.body.appendChild(el);

        await waitForNextAnimationFrame();
        expect(sig).toHaveBeenCalledOnceWith();
      });

      it('pauses updates while disconnected', async () => {
        const el = document.createElement('noop-component');
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const value = signal('1');
        const sig = jasmine.createSpy<() => string>('sig')
            .and.callFake(() => value());

        ref.bind(ref.host, sig, String);
        await waitForNextAnimationFrame();
        expect(sig).toHaveBeenCalledOnceWith();
        expect(el.textContent).toBe('1');
        sig.calls.reset();

        el.remove();

        value.set('2');
        await waitForNextAnimationFrame();
        expect(sig).not.toHaveBeenCalled();
        expect(el.textContent).toBe('1'); // Does not update.
      });

      it('updates the explicitly provided element', async () => {
        const el = parseHtml(`
          <noop-component>
            <span></span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        ref.bind(ref.host.query('span'), () => 'test');
        await waitForNextAnimationFrame();
        expect(el.querySelector('span')!.textContent!).toBe('test');
      });

      it('queries for the given selector and updates that element', async () => {
        const el = parseHtml(`
          <noop-component>
            <span></span>
          </noop-component>`
        ) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        ref.bind('span', () => 'test', String);
        await waitForNextAnimationFrame();
        expect(el.querySelector('span')!.textContent!).toBe('test');
      });

      it('throws when the given selector is not found', () => {
        const el = parseHtml(`<noop-component></noop-component>`) as
            NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        expect(() => ref.bind('span', () => 'test', String)).toThrow();
      });

      it('serializes with an implicit primitive serializer', async () => {
        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bind(ref.host, () => 'test');
          await waitForNextAnimationFrame();
          expect(ref.host.native.textContent!).toBe('test');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bind(ref.host, () => 1234);
          await waitForNextAnimationFrame();
          expect(ref.host.native.textContent!).toBe('1234');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bind(ref.host, () => true);
          await waitForNextAnimationFrame();
          expect(ref.host.native.textContent!).toBe('true');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bind(ref.host, () => 1234n);
          await waitForNextAnimationFrame();
          expect(ref.host.native.textContent!).toBe('1234');
        }
      });

      it('serializes with an explicit primitive serializer', async () => {
        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bind(ref.host, () => 'test', String);
          await waitForNextAnimationFrame();
          expect(ref.host.native.textContent!).toBe('test');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bind(ref.host, () => 1234, Number);
          await waitForNextAnimationFrame();
          expect(ref.host.native.textContent!).toBe('1234');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bind(ref.host, () => true, Boolean);
          await waitForNextAnimationFrame();
          expect(ref.host.native.textContent!).toBe('true');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bind(ref.host, () => 1234n, BigInt);
          await waitForNextAnimationFrame();
          expect(ref.host.native.textContent!).toBe('1234');
        }
      });

      it('serializes with a custom `Serializer`', async () => {
        const el = parseHtml(`<noop-component></noop-component>`) as
            NoopComponent;
        document.body.appendChild(el);

        const serializer: AttrSerializer<undefined> = {
          serialize(): string {
            return 'undefined';
          },

          deserialize(): undefined {
            return undefined;
          },
        };

        const ref = ComponentRef._from(ElementRef.from(el));
        ref.bind(ref.host, () => undefined, serializer);
        await waitForNextAnimationFrame();
        expect(ref.host.native.textContent!).toBe('undefined');
      });

      it('serializes with a custom `Serializable`', async () => {
        class User {
          public constructor(private name: string) {}

          public static [toSerializer](): AttrSerializer<User> {
            return {
              serialize(user: User): string {
                return user.name;
              },

              deserialize(name: string): User {
                return new User(name);
              }
            };
          }
        }

        const el = parseHtml(`<noop-component></noop-component>`) as
            NoopComponent;
        document.body.appendChild(el);

        const ref = ComponentRef._from(ElementRef.from(el));
        ref.bind(ref.host, () => new User('Devel'), User);
        await waitForNextAnimationFrame();
        expect(ref.host.native.textContent!).toBe('Devel');
      });

      it('throws an error when binding to the same element multiple times', () => {
        const el = parseHtml(`
          <noop-component>
            <span id="my-span"></span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));

        ref.bind('span', () => 'test1');
        expect(() => ref.bind('#my-span', () => 'test2'))
            .toThrowError(/cannot bind it again/);
      });

      it('throws an error when binding to the same element multiple times from different components', () => {
        const el = parseHtml(`
          <noop-component>
            <noop-component></noop-component>
          </noop-component>
        `) as NoopComponent;
        const outerRef = ComponentRef._from(ElementRef.from(el));
        const innerRef =
            ComponentRef._from(outerRef.host.query('noop-component'));

        outerRef.bind('noop-component', () => 'test1');
        expect(() => innerRef.bind(innerRef.host, () => 'test2'))
            .toThrowError(/cannot bind it again/);
      });

      it('restricts the signal result and serializer to be the same type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;

          // Correct implicit primitive types.
          ref.bind(ref.host, () => 'test');
          ref.bind(ref.host, () => 1234);
          ref.bind(ref.host, () => true);
          ref.bind(ref.host, () => 1234n);

          // Incorrect implicit types.
          // @ts-expect-error
          ref.bind(ref.host, () => ({}));
          // @ts-expect-error
          ref.bind(ref.host, () => []);
          // @ts-expect-error
          ref.bind(ref.host, () => undefined);
          // @ts-expect-error
          ref.bind(ref.host, () => null);

          // Incorrect types with explicitly `undefined` serializer.
          // @ts-expect-error
          ref.bind(ref.host, () => ({}), undefined);
          // @ts-expect-error
          ref.bind(ref.host, () => [], undefined);
          // @ts-expect-error
          ref.bind(ref.host, () => undefined, undefined);
          // @ts-expect-error
          ref.bind(ref.host, () => null, undefined);

          // Incorrect types with possibly `undefined` serializer.
          const maybeSerializer = {} as AttrSerializer<{}> | undefined;
          // @ts-expect-error
          ref.bind(ref.host, () => ({}), maybeSerializer);
          // @ts-expect-error
          ref.bind(ref.host, () => [], maybeSerializer);
          // @ts-expect-error
          ref.bind(ref.host, () => undefined, maybeSerializer);
          // @ts-expect-error
          ref.bind(ref.host, () => null, maybeSerializer);

          // Correct explicit primitive types.
          ref.bind(ref.host, () => 'test', String);
          ref.bind(ref.host, () => 1234, Number);
          ref.bind(ref.host, () => true, Boolean);
          ref.bind(ref.host, () => 1234n, BigInt);

          // Incorrect explicit primitive types.
          // @ts-expect-error
          ref.bind(ref.host, () => 'test', Number);
          // @ts-expect-error
          ref.bind(ref.host, () => 1234, String);
          // @ts-expect-error
          ref.bind(ref.host, () => true, String);
          // @ts-expect-error
          ref.bind(ref.host, () => 1234n, String);

          // Correct explicit serializer types.
          const serializer = {} as AttrSerializer<string>;
          ref.bind(ref.host, () => 'test', serializer);

          // Incorrect explicit serializer types.
          // @ts-expect-error
          ref.bind(ref.host, () => 1234, serializer);

          // Correct explicit serializable types.
          const serializable = {} as AttrSerializable<string>;
          ref.bind(ref.host, () => 'test', serializable);

          // Incorrect explicit serializable types.
          // @ts-expect-error
          ref.bind(ref.host, () => 1234, serializable);
        };
      });
    });

    describe('bindAttr', () => {
      it('updates the provided element\'s named attribute reactively', async () => {
        const el = document.createElement('noop-component');
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        expect(el.textContent).toBe('');

        const value = signal('1');
        ref.bindAttr(ref.host, 'count', () => value(), String);
        await waitForNextAnimationFrame();
        expect(el.getAttribute('count')).toBe('1');

        value.set('2');
        await waitForNextAnimationFrame();
        expect(el.getAttribute('count')).toBe('2');
      });

      it('does not invoke the signal until connected', async () => {
        const el = document.createElement('noop-component');
        const ref = ComponentRef._from(ElementRef.from(el));
        const sig = jasmine.createSpy<() => string>('sig')
            .and.returnValue('test');

        ref.bindAttr(ref.host, 'hello', sig, String);
        await waitForNextAnimationFrame();
        expect(sig).not.toHaveBeenCalled();

        document.body.appendChild(el);

        await waitForNextAnimationFrame();
        expect(sig).toHaveBeenCalledOnceWith();
      });

      it('pauses updates while disconnected', async () => {
        const el = document.createElement('noop-component');
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        const value = signal('1');
        const sig = jasmine.createSpy<() => string>('sig')
            .and.callFake(() => value());

        ref.bindAttr(ref.host, 'count', sig, String);
        await waitForNextAnimationFrame();
        expect(sig).toHaveBeenCalledOnceWith();
        expect(el.getAttribute('count')).toBe('1');
        sig.calls.reset();

        el.remove();

        value.set('2');
        await waitForNextAnimationFrame();
        expect(sig).not.toHaveBeenCalled();
        expect(el.getAttribute('count')).toBe('1'); // Does not update.
      });

      it('updates the explicitly provided element', async () => {
        const el = parseHtml(`
          <noop-component>
            <span></span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        ref.bindAttr(ref.host.query('span'), 'name', () => 'test');
        await waitForNextAnimationFrame();
        expect(el.querySelector('span')!.getAttribute('name')).toBe('test');
      });

      it('queries for the given selector and updates that element', async () => {
        const el = parseHtml(`
          <noop-component>
            <span></span>
          </noop-component>`
        ) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        ref.bindAttr('span', 'name', () => 'test', String);
        await waitForNextAnimationFrame();
        expect(el.querySelector('span')!.getAttribute('name')).toBe('test');
      });

      it('throws when the given selector is not found', () => {
        const el = parseHtml(`<noop-component></noop-component>`) as
            NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        document.body.appendChild(el);

        expect(() => ref.bindAttr('span', 'name', () => 'test', String))
            .toThrow();
      });

      it('serializes with an implicit primitive serializer', async () => {
        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bindAttr(ref.host, 'name', () => 'test');
          await waitForNextAnimationFrame();
          expect(ref.host.native.getAttribute('name')).toBe('test');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bindAttr(ref.host, 'name', () => 1234);
          await waitForNextAnimationFrame();
          expect(ref.host.native.getAttribute('name')).toBe('1234');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bindAttr(ref.host, 'name', () => true);
          await waitForNextAnimationFrame();
          expect(ref.host.native.getAttribute('name')).toBe('true');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bindAttr(ref.host, 'name', () => 1234n);
          await waitForNextAnimationFrame();
          expect(ref.host.native.getAttribute('name')).toBe('1234');
        }
      });

      it('serializes with an explicit primitive serializer', async () => {
        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bindAttr(ref.host, 'name', () => 'test', String);
          await waitForNextAnimationFrame();
          expect(ref.host.native.getAttribute('name')).toBe('test');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bindAttr(ref.host, 'name', () => 1234, Number);
          await waitForNextAnimationFrame();
          expect(ref.host.native.getAttribute('name')).toBe('1234');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bindAttr(ref.host, 'name', () => true, Boolean);
          await waitForNextAnimationFrame();
          expect(ref.host.native.getAttribute('name')).toBe('true');
        }

        {
          const el = parseHtml(`<noop-component></noop-component>`) as
              NoopComponent;
          const ref = ComponentRef._from(ElementRef.from(el));
          document.body.appendChild(el);

          ref.bindAttr(ref.host, 'name', () => 1234n, BigInt);
          await waitForNextAnimationFrame();
          expect(ref.host.native.getAttribute('name')).toBe('1234');
        }
      });

      it('serializes with a custom `Serializer`', async () => {
        const el = parseHtml(`<noop-component></noop-component>`) as
            NoopComponent;
        document.body.appendChild(el);

        const serializer: AttrSerializer<undefined> = {
          serialize(): string {
            return 'undefined';
          },

          deserialize(): undefined {
            return undefined;
          },
        };

        const ref = ComponentRef._from(ElementRef.from(el));
        ref.bindAttr(ref.host, 'name', () => undefined, serializer);
        await waitForNextAnimationFrame();
        expect(ref.host.native.getAttribute('name')).toBe('undefined');
      });

      it('serializes with a custom `Serializable`', async () => {
        class User {
          public constructor(private name: string) {}

          public static [toSerializer](): AttrSerializer<User> {
            return {
              serialize(user: User): string {
                return user.name;
              },

              deserialize(name: string): User {
                return new User(name);
              }
            };
          }
        }

        const el = parseHtml(`<noop-component></noop-component>`) as
            NoopComponent;
        document.body.appendChild(el);

        const ref = ComponentRef._from(ElementRef.from(el));
        ref.bindAttr(ref.host, 'user', () => new User('Devel'), User);
        await waitForNextAnimationFrame();
        expect(ref.host.native.getAttribute('user')).toBe('Devel');
      });

      it('throws an error when binding to the same element attribute multiple times', () => {
        const el = parseHtml(`
          <noop-component>
            <span id="my-span"></span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));

        ref.bindAttr('span', 'name', () => 'test1');
        expect(() => ref.bindAttr('#my-span', 'name', () => 'test2'))
            .toThrowError(/cannot bind it again/);
      });

      it('throws an error when binding to the same element attribute multiple times from different components', () => {
        const el = parseHtml(`
          <noop-component>
            <noop-component></noop-component>
          </noop-component>
        `) as NoopComponent;
        const outerRef = ComponentRef._from(ElementRef.from(el));
        const innerRef =
            ComponentRef._from(outerRef.host.query('noop-component'));

        outerRef.bindAttr('noop-component', 'name', () => 'test1');
        expect(() => innerRef.bindAttr(innerRef.host, 'name', () => 'test2'))
            .toThrowError(/cannot bind it again/);
      });

      it('allows binding to different attributes of the same element', () => {
        const el = parseHtml(`<noop-component></noop-component>`) as
            NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));

        ref.bindAttr(ref.host, 'name1', () => 'test1');
        expect(() => ref.bindAttr(ref.host, 'name2', () => 'test2'))
            .not.toThrow();
      });

      it('allows binding to the same attribute of different elements', () => {
        const el = parseHtml(`
          <noop-component>
            <span id="first"></span>
            <span id="second"></span>
          </noop-component>
        `) as NoopComponent;
        const ref = ComponentRef._from(ElementRef.from(el));

        ref.bindAttr('#first', 'name', () => 'test1');
        expect(() => ref.bindAttr('#second', 'name', () => 'test2'))
            .not.toThrow();
      });

      it('restricts the signal result and serializer to be the same type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;

          // Correct implicit primitive types.
          ref.bindAttr(ref.host, 'data', () => 'test');
          ref.bindAttr(ref.host, 'data', () => 1234);
          ref.bindAttr(ref.host, 'data', () => true);
          ref.bindAttr(ref.host, 'data', () => 1234n);

          // Incorrect implicit types.
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => ({}));
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => []);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => undefined);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => null);

          // Incorrect types with explicitly `undefined` serializer.
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => ({}), undefined);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => [], undefined);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => undefined, undefined);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => null, undefined);

          // Incorrect types with possibly `undefined` serializer.
          const maybeSerializer = {} as AttrSerializer<{}> | undefined;
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => ({}), maybeSerializer);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => [], maybeSerializer);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => undefined, maybeSerializer);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => null, maybeSerializer);

          // Correct explicit primitive types.
          ref.bindAttr(ref.host, 'data', () => 'test', String);
          ref.bindAttr(ref.host, 'data', () => 1234, Number);
          ref.bindAttr(ref.host, 'data', () => true, Boolean);
          ref.bindAttr(ref.host, 'data', () => 1234n, BigInt);

          // Incorrect explicit primitive types.
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => 'test', Number);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => 1234, String);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => true, String);
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => 1234n, String);

          // Correct explicit serializer types.
          const serializer = {} as AttrSerializer<string>;
          ref.bindAttr(ref.host, 'data', () => 'test', serializer);

          // Incorrect explicit serializer types.
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => 1234, serializer);

          // Correct explicit serializable types.
          const serializable = {} as AttrSerializable<string>;
          ref.bindAttr(ref.host, 'data', () => 'test', serializable);

          // Incorrect explicit serializable types.
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => 1234, serializable);
        };
      });
    });
  });
});

async function waitForNextAnimationFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => { resolve(); });
  });
}
