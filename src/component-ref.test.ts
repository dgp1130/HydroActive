import { ComponentRef, type OnDisconnect, type OnConnect } from './component-ref.js';
import { ElementRef } from './element-ref.js';
import { type AttrSerializable, type AttrSerializer, type ElementSerializable, type ElementSerializer, toSerializer } from './serializers.js';
import { type WriteableSignal, signal } from './signals.js';
import { parseHtml } from './testing/html-parser.js';
import { NoopComponent } from './testing/noop-component.js';

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

    describe('live', () => {
      it('returns an initialized signal', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>Hello!</noop-component>
        `);
        const ref = el.getComponentRef();

        const text = ref.live(ref.host, String);
        expect(text()).toBe('Hello!');
      });

      it('binds to the provided DOM element', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span>test</span>
          </noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const text = ref.live(ref.host.query('span'), String);
        expect(text()).toBe('test');

        text.set('test2');
        await el.stable();
        expect(el.querySelector('span')!.textContent!).toBe('test2');
      });

      it('binds to the element returned by the provided selector query', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span>test</span>
          </noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const text = ref.live('span', String);
        expect(text()).toBe('test');

        text.set('test2');
        await el.stable();
        expect(el.querySelector('span')!.textContent!).toBe('test2');
      });

      it('processes the DOM element based on the provided primitive serializer token', async () => {
        {
          const el = parseHtml(NoopComponent, `
            <noop-component>test1</noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          const value = ref.live(ref.host, String);
          expect(value()).toBe('test1');

          value.set('test2');
          await el.stable();
          expect(el.textContent!).toBe('test2');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component>1234</noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          const value = ref.live(ref.host, Number);
          expect(value()).toBe(1234);

          value.set(4321);
          await el.stable();
          expect(el.textContent!).toBe('4321');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component>true</noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          const value = ref.live(ref.host, Boolean);
          expect(value()).toBe(true);

          value.set(false);
          await el.stable();
          expect(el.textContent!).toBe('false');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component>1234</noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          const value = ref.live(ref.host, BigInt);
          expect(value()).toBe(1234n);

          value.set(4321n);
          await el.stable();
          expect(el.textContent!).toBe('4321');
        }
      });

      it('processes the DOM element based on the provided custom serializer', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const serializer: ElementSerializer<string, Element> = {
          serializeTo(value: string, element: Element): void {
            element.textContent = `serialized: ${value}`;
          },

          deserializeFrom(): string {
            return 'deserialized';
          },
        };

        const value = ref.live(ref.host, serializer);
        expect(value()).toBe('deserialized');

        value.set('test');
        await el.stable();
        expect(el.textContent!).toBe('serialized: test');
      });

      it('processes the DOM element based on the provided serializable', async () => {
        class User {
          public constructor(private name: string) {}
          public static [toSerializer](): ElementSerializer<User, Element> {
            return {
              serializeTo(user: User, element: Element): void {
                element.textContent = user.name;
              },

              deserializeFrom(element: Element): User {
                return new User(element.textContent!);
              }
            };
          }
        }

        const el = parseHtml(NoopComponent, `
          <noop-component>Devel</noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const value = ref.live(ref.host, User);
        expect(value()).toEqual(new User('Devel'));

        value.set(new User('Devel without a Cause'));
        await el.stable();
        expect(el.textContent!).toBe('Devel without a Cause');
      });

      it('throws an error when binding to the same element multiple times', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span id="my-span"></span>
          </noop-component>
        `);
        const ref = el.getComponentRef();

        ref.live('span', String);
        expect(() => ref.live('#my-span', String))
            .toThrowError(/cannot bind it again/);
      });

      it('throws an error when binding to the same element multiple times from different components', () => {
        const outerEl = parseHtml(NoopComponent, `
          <noop-component>
            <noop-component></noop-component>
          </noop-component>
        `);
        const outerRef = outerEl.getComponentRef();

        const innerEl = outerRef.host.query('noop-component').native;
        const innerRef = innerEl.getComponentRef();

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

          // Custom `ElementSerializer` type.
          const serializer = {} as ElementSerializer<string, Element>;
          const _signal5: WriteableSignal<string> =
              ref.live(ref.host, serializer);

          // Custom `ElementSerializable` type.
          const serializable = {} as ElementSerializable<string, Element>;
          const _signal6: WriteableSignal<string> =
              ref.live(ref.host, serializable);
        };
      });

      it('resolves serializer type based on element type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;
          const div = {} as ElementRef<HTMLDivElement>;

          const divSerializer = {} as ElementSerializer<number, HTMLDivElement>;
          ref.live(div, divSerializer);
          ref.live('div', divSerializer);

          const inputSerializer =
              {} as ElementSerializable<number, HTMLInputElement>;
          // @ts-expect-error
          ref.live(div, inputSerializer);
          // @ts-expect-error
          ref.live('div', inputSerializer);

          const elSerializer = {} as ElementSerializer<number, Element>;
          ref.live('.foo', elSerializer);
          // @ts-expect-error
          ref.live('.foo', divSerializer);
        };
      });

      it('throws a compile time error when given an attribute serializer', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;

          const serializer = {} as AttrSerializer<string>;
          // @ts-expect-error
          ref.live(ref.host, serializer);

          const serializable = {} as AttrSerializable<string>;
          // @ts-expect-error
          ref.live(ref.host, serializable);
        };
      });
    });

    describe('liveAttr', () => {
      it('returns an initialized signal', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component value="Hello!"></noop-component>
        `);
        const ref = el.getComponentRef();

        const text = ref.liveAttr(ref.host, 'value', String);
        expect(text()).toBe('Hello!');
      });

      it('binds to the provided DOM element', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span value="test"></span>
          </noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const text = ref.liveAttr(ref.host.query('span'), 'value', String);
        expect(text()).toBe('test');

        text.set('test2');
        await el.stable();
        expect(el.querySelector('span')!.getAttribute('value')).toBe('test2');
      });

      it('binds to the element returned by the provided selector query', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span value="test"></span>
          </noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const text = ref.liveAttr('span', 'value', String);
        expect(text()).toBe('test');

        text.set('test2');
        await el.stable();
        expect(el.querySelector('span')!.getAttribute('value')).toBe('test2');
      });

      it('processes the DOM element based on the provided primitive serializer token', async () => {
        {
          const el = parseHtml(NoopComponent, `
            <noop-component value="test1"></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          const value = ref.liveAttr(ref.host, 'value', String);
          expect(value()).toBe('test1');

          value.set('test2');
          await el.stable();
          expect(el.getAttribute('value')).toBe('test2');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component value="1234"></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          const value = ref.liveAttr(ref.host, 'value', Number);
          expect(value()).toBe(1234);

          value.set(4321);
          await el.stable();
          expect(el.getAttribute('value')).toBe('4321');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component value="true"></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          const value = ref.liveAttr(ref.host, 'value', Boolean);
          expect(value()).toBe(true);

          value.set(false);
          await el.stable();
          expect(el.getAttribute('value')).toBe('false');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component value="1234"></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          const value = ref.liveAttr(ref.host, 'value', BigInt);
          expect(value()).toBe(1234n);

          value.set(4321n);
          await el.stable();
          expect(el.getAttribute('value')).toBe('4321');
        }
      });

      it('processes the DOM element based on the provided custom serializer', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component value></noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

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
        await el.stable();
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

        const el = parseHtml(NoopComponent, `
          <noop-component user="Devel"></noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const value = ref.liveAttr(ref.host, 'user', User);
        expect(value()).toEqual(new User('Devel'));

        value.set(new User('Devel without a Cause'));
        await el.stable();
        expect(el.getAttribute('user')).toBe('Devel without a Cause');
      });

      it('throws an error when binding to the same element attribute multiple times', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span id="my-span" value></span>
          </noop-component>
        `);
        const ref = el.getComponentRef();

        ref.liveAttr('span', 'value', String);
        expect(() => ref.liveAttr('#my-span', 'value', String))
            .toThrowError(/cannot bind it again/);
      });

      it('throws an error when binding to the same element attribute multiple times from different components', () => {
        const outerEl = parseHtml(NoopComponent, `
          <noop-component>
            <noop-component value></noop-component>
          </noop-component>
        `);
        const outerRef = outerEl.getComponentRef();

        const innerEl = outerRef.host.query('noop-component').native;
        const innerRef = innerEl.getComponentRef();

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

          // Custom `AttrSerializable` type.
          const serializable = {} as AttrSerializable<string>;
          const _signal6: WriteableSignal<string> =
              ref.liveAttr(ref.host, 'value', serializable);
        };
      });

      it('throws a compile time error when given an element serializer', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;

          const serializer = {} as ElementSerializer<string, Element>;
          // @ts-expect-error
          ref.liveAttr(ref.host, 'test', serializer);

          const serializable = {} as ElementSerializable<string, Element>;
          // @ts-expect-error
          ref.liveAttr(ref.host, 'test', serializable);
        };
      });
    });

    describe('bind', () => {
      it('updates the provided element\'s text content reactively', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        expect(el.textContent).toBe('');

        const value = signal('1');
        ref.bind(ref.host, () => value(), String);
        await el.stable();
        expect(el.textContent).toBe('1');

        value.set('2');
        await el.stable();
        expect(el.textContent).toBe('2');
      });

      it('does not invoke the signal until connected', async () => {
        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();
        const sig = jasmine.createSpy<() => string>('sig')
            .and.returnValue('test');

        ref.bind(ref.host, sig, String);
        await el.stable();
        expect(sig).not.toHaveBeenCalled();

        document.body.appendChild(el);

        await el.stable();
        expect(sig).toHaveBeenCalledOnceWith();
      });

      it('pauses updates while disconnected', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const value = signal('1');
        const sig = jasmine.createSpy<() => string>('sig')
            .and.callFake(() => value());

        ref.bind(ref.host, sig, String);
        await el.stable();
        expect(sig).toHaveBeenCalledOnceWith();
        expect(el.textContent).toBe('1');
        sig.calls.reset();

        el.remove();

        value.set('2');
        await el.stable();
        expect(sig).not.toHaveBeenCalled();
        expect(el.textContent).toBe('1'); // Does not update.
      });

      it('updates the explicitly provided element', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span></span>
          </noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        ref.bind(ref.host.query('span'), () => 'test');
        await el.stable();
        expect(el.querySelector('span')!.textContent!).toBe('test');
      });

      it('queries for the given selector and updates that element', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span></span>
          </noop-component>`
        );
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        ref.bind('span', () => 'test', String);
        await el.stable();
        expect(el.querySelector('span')!.textContent!).toBe('test');
      });

      it('throws when the given selector is not found', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        expect(() => ref.bind('span', () => 'test', String)).toThrow();
      });

      it('serializes with an implicit primitive serializer', async () => {
        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bind(ref.host, () => 'test');
          await el.stable();
          expect(ref.host.native.textContent!).toBe('test');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bind(ref.host, () => 1234);
          await el.stable();
          expect(ref.host.native.textContent!).toBe('1234');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bind(ref.host, () => true);
          await el.stable();
          expect(ref.host.native.textContent!).toBe('true');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bind(ref.host, () => 1234n);
          await el.stable();
          expect(ref.host.native.textContent!).toBe('1234');
        }
      });

      it('serializes with an explicit primitive serializer', async () => {
        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bind(ref.host, () => 'test', String);
          await el.stable();
          expect(ref.host.native.textContent!).toBe('test');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bind(ref.host, () => 1234, Number);
          await el.stable();
          expect(ref.host.native.textContent!).toBe('1234');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bind(ref.host, () => true, Boolean);
          await el.stable();
          expect(ref.host.native.textContent!).toBe('true');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bind(ref.host, () => 1234n, BigInt);
          await el.stable();
          expect(ref.host.native.textContent!).toBe('1234');
        }
      });

      it('serializes with a custom `Serializer`', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const serializer: ElementSerializer<undefined, Element> = {
          serializeTo(_value: undefined, element: Element): void {
            element.textContent = 'undefined';
          },

          deserializeFrom(): undefined {
            return undefined;
          },
        };

        ref.bind(ref.host, () => undefined, serializer);
        await el.stable();
        expect(ref.host.native.textContent!).toBe('undefined');
      });

      it('serializes with a custom `Serializable`', async () => {
        class User {
          public constructor(private name: string) {}

          public static [toSerializer](): ElementSerializer<User, Element> {
            return {
              serializeTo(user: User, element: Element): void {
                element.textContent = user.name;
              },

              deserializeFrom(element: Element): User {
                return new User(element.textContent!);
              }
            };
          }
        }

        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        ref.bind(ref.host, () => new User('Devel'), User);
        await el.stable();
        expect(ref.host.native.textContent!).toBe('Devel');
      });

      it('throws an error when binding to the same element multiple times', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span id="my-span"></span>
          </noop-component>
        `);
        const ref = el.getComponentRef();

        ref.bind('span', () => 'test1');
        expect(() => ref.bind('#my-span', () => 'test2'))
            .toThrowError(/cannot bind it again/);
      });

      it('throws an error when binding to the same element multiple times from different components', () => {
        const outerEl = parseHtml(NoopComponent, `
          <noop-component>
            <noop-component></noop-component>
          </noop-component>
        `);
        const outerRef = outerEl.getComponentRef();

        const innerEl = outerRef.host.query('noop-component').native;
        const innerRef = innerEl.getComponentRef();

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
          const serializer = {} as ElementSerializer<string, Element>;
          ref.bind(ref.host, () => 'test', serializer);

          // Incorrect explicit serializer types.
          // @ts-expect-error
          ref.bind(ref.host, () => 1234, serializer);

          // Correct explicit serializable types.
          const serializable = {} as ElementSerializable<string, Element>;
          ref.bind(ref.host, () => 'test', serializable);

          // Incorrect explicit serializable types.
          // @ts-expect-error
          ref.bind(ref.host, () => 1234, serializable);
        };
      });

      it('resolves serializer type based on element type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;
          const div = {} as ElementRef<HTMLDivElement>;

          const divSerializer = {} as ElementSerializer<number, HTMLDivElement>;
          ref.bind(div, () => 1234, divSerializer);
          ref.bind('div', () => 1234, divSerializer);

          const inputSerializer =
              {} as ElementSerializable<number, HTMLInputElement>;
          // @ts-expect-error
          ref.bind(div, () => 1234, inputSerializer);
          // @ts-expect-error
          ref.bind('div', () => 1234, inputSerializer);

          const elSerializer = {} as ElementSerializer<number, Element>;
          ref.bind('.foo', () => 1234, elSerializer);
          // @ts-expect-error
          ref.bind('.foo', () => 1234, divSerializer);
        };
      });

      it('throws a compile time error when given an attribute serializer', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;

          const serializer = {} as AttrSerializer<string>;
          // @ts-expect-error
          ref.bind(ref.host, () => 'test', serializer);

          const serializable = {} as AttrSerializable<string>;
          // @ts-expect-error
          ref.bind(ref.host, () => 'test', serializable);
        };
      });
    });

    describe('bindAttr', () => {
      it('updates the provided element\'s named attribute reactively', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        expect(el.textContent).toBe('');

        const value = signal('1');
        ref.bindAttr(ref.host, 'count', () => value(), String);
        await el.stable();
        expect(el.getAttribute('count')).toBe('1');

        value.set('2');
        await el.stable();
        expect(el.getAttribute('count')).toBe('2');
      });

      it('does not invoke the signal until connected', async () => {
        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();
        const sig = jasmine.createSpy<() => string>('sig')
            .and.returnValue('test');

        ref.bindAttr(ref.host, 'hello', sig, String);
        await el.stable();
        expect(sig).not.toHaveBeenCalled();

        document.body.appendChild(el);

        await el.stable();
        expect(sig).toHaveBeenCalledOnceWith();
      });

      it('pauses updates while disconnected', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const value = signal('1');
        const sig = jasmine.createSpy<() => string>('sig')
            .and.callFake(() => value());

        ref.bindAttr(ref.host, 'count', sig, String);
        await el.stable();
        expect(sig).toHaveBeenCalledOnceWith();
        expect(el.getAttribute('count')).toBe('1');
        sig.calls.reset();

        el.remove();

        value.set('2');
        await el.stable();
        expect(sig).not.toHaveBeenCalled();
        expect(el.getAttribute('count')).toBe('1'); // Does not update.
      });

      it('updates the explicitly provided element', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span></span>
          </noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        ref.bindAttr(ref.host.query('span'), 'name', () => 'test');
        await el.stable();
        expect(el.querySelector('span')!.getAttribute('name')).toBe('test');
      });

      it('queries for the given selector and updates that element', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span></span>
          </noop-component>`
        );
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        ref.bindAttr('span', 'name', () => 'test', String);
        await el.stable();
        expect(el.querySelector('span')!.getAttribute('name')).toBe('test');
      });

      it('throws when the given selector is not found', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        expect(() => ref.bindAttr('span', 'name', () => 'test', String))
            .toThrow();
      });

      it('serializes with an implicit primitive serializer', async () => {
        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bindAttr(ref.host, 'name', () => 'test');
          await el.stable();
          expect(ref.host.native.getAttribute('name')).toBe('test');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bindAttr(ref.host, 'name', () => 1234);
          await el.stable();
          expect(ref.host.native.getAttribute('name')).toBe('1234');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bindAttr(ref.host, 'name', () => true);
          await el.stable();
          expect(ref.host.native.getAttribute('name')).toBe('true');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bindAttr(ref.host, 'name', () => 1234n);
          await el.stable();
          expect(ref.host.native.getAttribute('name')).toBe('1234');
        }
      });

      it('serializes with an explicit primitive serializer', async () => {
        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bindAttr(ref.host, 'name', () => 'test', String);
          await el.stable();
          expect(ref.host.native.getAttribute('name')).toBe('test');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bindAttr(ref.host, 'name', () => 1234, Number);
          await el.stable();
          expect(ref.host.native.getAttribute('name')).toBe('1234');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bindAttr(ref.host, 'name', () => true, Boolean);
          await el.stable();
          expect(ref.host.native.getAttribute('name')).toBe('true');
        }

        {
          const el = parseHtml(NoopComponent, `
            <noop-component></noop-component>
          `);
          document.body.appendChild(el);
          const ref = el.getComponentRef();

          ref.bindAttr(ref.host, 'name', () => 1234n, BigInt);
          await el.stable();
          expect(ref.host.native.getAttribute('name')).toBe('1234');
        }
      });

      it('serializes with a custom `Serializer`', async () => {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const serializer: AttrSerializer<undefined> = {
          serialize(): string {
            return 'undefined';
          },

          deserialize(): undefined {
            return undefined;
          },
        };

        ref.bindAttr(ref.host, 'name', () => undefined, serializer);
        await el.stable();
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

        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        ref.bindAttr(ref.host, 'user', () => new User('Devel'), User);
        await el.stable();
        expect(ref.host.native.getAttribute('user')).toBe('Devel');
      });

      it('throws an error when binding to the same element attribute multiple times', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span id="my-span"></span>
          </noop-component>
        `);
        const ref = el.getComponentRef();

        ref.bindAttr('span', 'name', () => 'test1');
        expect(() => ref.bindAttr('#my-span', 'name', () => 'test2'))
            .toThrowError(/cannot bind it again/);
      });

      it('throws an error when binding to the same element attribute multiple times from different components', () => {
        const outerEl = parseHtml(NoopComponent, `
          <noop-component>
            <noop-component></noop-component>
          </noop-component>
        `);
        const outerRef = outerEl.getComponentRef();

        const innerEl = outerRef.host.query('noop-component').native;
        const innerRef = innerEl.getComponentRef();

        outerRef.bindAttr('noop-component', 'name', () => 'test1');
        expect(() => innerRef.bindAttr(innerRef.host, 'name', () => 'test2'))
            .toThrowError(/cannot bind it again/);
      });

      it('allows binding to different attributes of the same element', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        const ref = el.getComponentRef();

        ref.bindAttr(ref.host, 'name1', () => 'test1');
        expect(() => ref.bindAttr(ref.host, 'name2', () => 'test2'))
            .not.toThrow();
      });

      it('allows binding to the same attribute of different elements', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <span id="first"></span>
            <span id="second"></span>
          </noop-component>
        `);
        const ref = el.getComponentRef();

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
          const serializable = {} as AttrSerializer<string>;
          ref.bindAttr(ref.host, 'data', () => 'test', serializable);

          // Incorrect explicit serializable types.
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => 1234, serializable);
        };
      });

      it('throws a compile time error when given an element serializer', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const ref = {} as ComponentRef;

          const serializer = {} as ElementSerializer<string, Element>;
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => 'test', serializer);

          const serializable = {} as ElementSerializable<string, Element>;
          // @ts-expect-error
          ref.bindAttr(ref.host, 'data', () => 'test', serializable);
        };
      });
    });

    describe('listen', () => {
      it('listens invokes the given callback when the specified event is triggered', () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const handler = jasmine.createSpy<(evt: Event) => void>('handler');

        ref.listen(ref.host, 'click', handler);
        expect(handler).not.toHaveBeenCalled();

        ref.host.native.click();

        expect(handler).toHaveBeenCalledOnceWith(jasmine.any(Event));
      });

      it('removes event listener on disconnect', () => {
        const el = document.createElement('noop-component');
        const ref = el.getComponentRef();

        const addSpy = spyOn(el, 'addEventListener').and.callThrough();
        const removeSpy = spyOn(el, 'removeEventListener').and.callThrough();

        const handler = jasmine.createSpy<() => void>('handler');

        // Start listening while disconnected, nothing should happen yet.
        ref.listen(ref.host, 'click', handler);
        expect(addSpy).not.toHaveBeenCalled();
        expect(removeSpy).not.toHaveBeenCalled();

        ref.host.native.click();
        expect(handler).not.toHaveBeenCalled();

        // On connection, start listening.
        document.body.appendChild(el);
        expect(addSpy).toHaveBeenCalledTimes(1);
        expect(removeSpy).not.toHaveBeenCalled();
        expect(handler).not.toHaveBeenCalled();
        addSpy.calls.reset();

        // React to events.
        ref.host.native.click();
        expect(handler).toHaveBeenCalledTimes(1);
        handler.calls.reset();

        // On disconnect, stop listening.
        el.remove();
        expect(addSpy).not.toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalledTimes(1);
        expect(handler).not.toHaveBeenCalled();
        removeSpy.calls.reset();

        // Stop reacting to events.
        ref.host.native.click();
        expect(handler).not.toHaveBeenCalled();
      });

      it('listens for events for the provided `ElementRef`', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <div id="first">
              <div id="child"></div>
            </div>
            <div id="second"></div>
          </noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const handler = jasmine.createSpy<() => void>('handler');

        ref.listen(ref.host.query('div#first'), 'click', handler);

        // Listen for direct events.
        ref.host.query('div#first').native.click();
        expect(handler).toHaveBeenCalledTimes(1);
        handler.calls.reset();

        // Listen for descendant events.
        ref.host.query('div#child').native.click();
        expect(handler).toHaveBeenCalledTimes(1);
        handler.calls.reset();

        // Do not listen for sibling events.
        ref.host.query('div#second').native.click();
        expect(handler).not.toHaveBeenCalled();

        // Do not listen for ancestor events.
        ref.host.native.click();
        expect(handler).not.toHaveBeenCalled();
      });

      it('listens for events for the provided selector', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <div id="first">
              <div id="child"></div>
            </div>
            <div id="second"></div>
          </noop-component>
        `);
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const handler = jasmine.createSpy<() => void>('handler');

        ref.listen('div#first', 'click', handler);

        // Listen for direct events.
        ref.host.query('div#first').native.click();
        expect(handler).toHaveBeenCalledTimes(1);
        handler.calls.reset();

        // Listen for descendant events.
        ref.host.query('div#child').native.click();
        expect(handler).toHaveBeenCalledTimes(1);
        handler.calls.reset();

        // Do not listen for sibling events.
        ref.host.query('div#second').native.click();
        expect(handler).not.toHaveBeenCalled();

        // Do not listen for ancestor events.
        ref.host.native.click();
        expect(handler).not.toHaveBeenCalled();
      });

      it('throws an error if given a selector which does not match anything', () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        expect(() => ref.listen('#does-not-exist', 'click', () => {}))
            .toThrowError();
      });

      it('supports custom events', () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        const handler = jasmine.createSpy<(evt: Event) => void>('handler');

        ref.listen(ref.host, 'custom-event', handler);

        const evt = new CustomEvent('custom-event');
        ref.host.native.dispatchEvent(evt);

        expect(handler).toHaveBeenCalledOnceWith(evt);
      });

      it('propagates the `capture` option', () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        spyOn(el, 'addEventListener').and.callThrough();

        ref.listen(ref.host, 'click', () => {}, { capture: true });

        expect(el.addEventListener).toHaveBeenCalledOnceWith(
          'click',
          jasmine.any(Function),
          jasmine.objectContaining({ capture: true }),
        );
      });

      it('propagates the `passive` option', () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const ref = el.getComponentRef();

        spyOn(el, 'addEventListener').and.callThrough();

        ref.listen(ref.host, 'click', () => {}, { passive: true });

        expect(el.addEventListener).toHaveBeenCalledOnceWith(
          'click',
          jasmine.any(Function),
          jasmine.objectContaining({ passive: true }),
        );
      });
    });
  });
});
