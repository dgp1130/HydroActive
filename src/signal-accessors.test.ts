import { ElementAccessor } from './element-accessor.js';
import { ElementSerializer, toSerializer, ElementSerializable, AttrSerializer, AttrSerializable } from './serializers.js';
import { ReactiveRoot, WriteableSignal, signal } from './signals.js';
import { bind, live } from './signal-accessors.js';
import { parseHtml } from './testing.js';
import { NoopComponent } from './testing/noop-component.js';

describe('signal-accessors', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  describe('live', () => {
    it('returns an initialized signal', () => {
      const el = parseHtml(NoopComponent, `
        <noop-component>Hello!</noop-component>
      `);

      const text = live(el.getComponentAccessor(), el.root, String);
      expect(text()).toBe('Hello!');
    });

    it('binds to the provided DOM element', async () => {
      const el = parseHtml(NoopComponent, `
        <noop-component>test</noop-component>
      `);
      document.body.appendChild(el);

      const text = live(el.getComponentAccessor(), el.root, String);
      expect(text()).toBe('test');

      text.set('test2');
      expect(text()).toBe('test2');
      await el.stable();
      expect(el.textContent!).toBe('test2');
    });

    it('processes the DOM element based on the provided primitive serializer token', async () => {
      {
        const el = parseHtml(NoopComponent, `
          <noop-component>test1</noop-component>
        `);
        document.body.appendChild(el);

        const value = live(el.getComponentAccessor(), el.root, String);
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

        const value = live(el.getComponentAccessor(), el.root, Number);
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

        const value = live(el.getComponentAccessor(), el.root, Boolean);
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

        const value = live(el.getComponentAccessor(), el.root, BigInt);
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

      const serializer: ElementSerializer<string, Element> = {
        serializeTo(value: string, element: Element): void {
          element.textContent = `serialized: ${value}`;
        },

        deserializeFrom(): string {
          return 'deserialized';
        },
      };

      const value = live(el.getComponentAccessor(), el.root, serializer);
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

      const value = live(el.getComponentAccessor(), el.root, User);
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

      const host = el.getComponentAccessor();
      const span = host.query('span').access();
      live(span, el.root, String);

      // Different `ElementAccessor` instance.
      const spanAgain = host.query('#my-span').access();
      expect(() => live(spanAgain, el.root, String))
          .toThrowError(/cannot bind it again/);
    });

    it('throws an error when binding to the same element multiple times from different components', () => {
      const outerEl = ElementAccessor.from(parseHtml(NoopComponent, `
        <noop-component>
          <noop-component></noop-component>
        </noop-component>
      `));

      const innerEl = outerEl.query('noop-component').access(NoopComponent);

      live(innerEl, outerEl.element.root, String);
      expect(() => live(innerEl, innerEl.element.root, String))
          .toThrowError(/cannot bind it again/);
    });

    it('infers the return type based on the serializer', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const host = {} as ElementAccessor<NoopComponent>;
        const root = {} as ReactiveRoot;

        // Primitive serializer tokens.
        live(host, root, String) satisfies WriteableSignal<string>;
        live(host, root, Number) satisfies WriteableSignal<number>;
        live(host, root, Boolean) satisfies WriteableSignal<boolean>;
        live(host, root, BigInt) satisfies WriteableSignal<bigint>;

        // Custom `ElementSerializer` type.
        const serializer = {} as ElementSerializer<string, Element>;
        live(host, root, serializer) satisfies WriteableSignal<string>;

        // Custom `ElementSerializable` type.
        const serializable = {} as ElementSerializable<string, Element>;
        live(host, root, serializable) satisfies WriteableSignal<string>;
      };
    });

    it('resolves serializer type based on element type', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const div = {} as ElementAccessor<HTMLDivElement>;
        const root = {} as ReactiveRoot;

        const divSerializer = {} as ElementSerializer<number, HTMLDivElement>;
        live(div, root, divSerializer);

        const inputSerializer =
            {} as ElementSerializable<number, HTMLInputElement>;
        // @ts-expect-error
        live(div, root, inputSerializer);
      };
    });

    it('throws a compile time error when given an attribute serializer', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const host = {} as ElementAccessor<NoopComponent>;
        const root = {} as ReactiveRoot;

        const serializer = {} as AttrSerializer<string>;
        // @ts-expect-error
        live(host, root, serializer);

        const serializable = {} as AttrSerializable<string>;
        // @ts-expect-error
        live(host, root, serializable);
      };
    });
  });

  describe('bind', () => {
    it('updates the provided element\'s text content reactively', async () => {
      const el = document.createElement('noop-component');
      document.body.appendChild(el);

      expect(el.textContent).toBe('');

      const value = signal('1');
      bind(el.getComponentAccessor(), el.root, String, () => value());
      await el.stable();
      expect(el.textContent).toBe('1');

      value.set('2');
      await el.stable();
      expect(el.textContent).toBe('2');
    });

    it('does not invoke the signal until connected', async () => {
      const el = document.createElement('noop-component');

      const sig = jasmine.createSpy<() => string>('sig')
          .and.returnValue('test');

      bind(el.getComponentAccessor(), el.root, String, sig);
      await el.stable();
      expect(sig).not.toHaveBeenCalled();

      document.body.appendChild(el);

      await el.stable();
      expect(sig).toHaveBeenCalledOnceWith();
    });

    it('pauses updates while disconnected', async () => {
      const el = document.createElement('noop-component');
      document.body.appendChild(el);

      const value = signal('1');
      const sig = jasmine.createSpy<() => string>('sig')
          .and.callFake(() => value());

      bind(el.getComponentAccessor(), el.root, String, sig);
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

    it('serializes with an explicit primitive serializer', async () => {
      {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);

        bind(el.getComponentAccessor(), el.root, String, () => 'test');
        await el.stable();
        expect(el.textContent!).toBe('test');
      }

      {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);

        bind(el.getComponentAccessor(), el.root, Number, () => 1234);
        await el.stable();
        expect(el.textContent!).toBe('1234');
      }

      {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);

        bind(el.getComponentAccessor(), el.root, Boolean, () => true);
        await el.stable();
        expect(el.textContent!).toBe('true');
      }

      {
        const el = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(el);

        bind(el.getComponentAccessor(), el.root, BigInt, () => 1234n);
        await el.stable();
        expect(el.textContent!).toBe('1234');
      }
    });

    it('serializes with a custom `Serializer`', async () => {
      const el = parseHtml(NoopComponent, `
        <noop-component></noop-component>
      `);
      document.body.appendChild(el);

      const serializer: ElementSerializer<undefined, Element> = {
        serializeTo(_value: undefined, element: Element): void {
          element.textContent = 'undefined';
        },

        deserializeFrom(): undefined {
          return undefined;
        },
      };

      bind(el.getComponentAccessor(), el.root, serializer, () => undefined);
      await el.stable();
      expect(el.textContent!).toBe('undefined');
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

      bind(el.getComponentAccessor(), el.root, User, () => new User('Devel'));
      await el.stable();
      expect(el.textContent!).toBe('Devel');
    });

    it('throws an error when binding to the same element multiple times', () => {
      const el = parseHtml(NoopComponent, `
        <noop-component>
          <span></span>
        </noop-component>
      `);

      const span = el.getComponentAccessor().query('span').access();
      bind(span, el.root, String, () => 'test');
      expect(() => bind(span, el.root, String, () => 'test2'))
          .toThrowError(/cannot bind it again/);
    });

    it('throws an error when binding to the same element multiple times from different components', () => {
      const outerEl = ElementAccessor.from(parseHtml(NoopComponent, `
        <noop-component>
          <noop-component id="inner"></noop-component>
        </noop-component>
      `));
      const innerEl = outerEl.query('noop-component').access(NoopComponent);

      bind(
        outerEl.query('#inner').access(NoopComponent),
        outerEl.element.root,
        String,
        () => 'test1',
      );
      expect(() => bind(innerEl, innerEl.element.root, String, () => 'test2'))
          .toThrowError(/cannot bind it again/);
    });

    it('restricts the signal result and serializer to be the same type', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const host = {} as ElementAccessor<NoopComponent>;
        const root = {} as ReactiveRoot;

        // Correct primitive types.
        bind(host, root, String, () => 'test');
        bind(host, root, Number, () => 1234);
        bind(host, root, Boolean, () => true);
        bind(host, root, BigInt, () => 1234n);

        // Incorrect primitive types.
        // @ts-expect-error
        bind(host, root, Number, () => 'test');
        // @ts-expect-error
        bind(host, root, String, () => 1234);
        // @ts-expect-error
        bind(host, root, String, () => true);
        // @ts-expect-error
        bind(host, root, String, () => 1234n);

        // Correct serializer types.
        const serializer = {} as ElementSerializer<string, Element>;
        bind(host, root, serializer, () => 'test');

        // Incorrect serializer types.
        // @ts-expect-error
        bind(host, root, serializer, () => 1234);

        // Correct serializable types.
        const serializable = {} as ElementSerializable<string, Element>;
        bind(host, root, serializable, () => 'test');

        // Incorrect serializable types.
        // @ts-expect-error
        bind(host, root, serializable, () => 1234);
      };
    });

    it('resolves serializer type based on element type', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const host = {} as ElementAccessor<HTMLDivElement>;
        const root = {} as ReactiveRoot;

        const divSerializer = {} as ElementSerializer<number, HTMLDivElement>;
        bind(host, root, divSerializer, () => 1234);

        const inputSerializer =
            {} as ElementSerializable<number, HTMLInputElement>;
        // @ts-expect-error
        bind(host, root, inputSerializer, () => 1234);

        const elSerializer = {} as ElementSerializer<number, Element>;
        bind(host, root, elSerializer, () => 1234);
        // @ts-expect-error
        bind(host, root as ElementAccessor<Element>, divSerializer, () => 1234);
      };
    });

    it('throws a compile time error when given an attribute serializer', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const host = {} as ElementAccessor<NoopComponent>;
        const root = {} as ReactiveRoot;

        const serializer = {} as AttrSerializer<string>;
        // @ts-expect-error
        bind(host, root, serializer, () => 'test');

        const serializable = {} as AttrSerializable<string>;
        // @ts-expect-error
        bind(host, root, serializable, () => 'test');
      };
    });
  });
});
