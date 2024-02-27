import { ComponentRef } from './component-ref.js';
import { ElementAccessor } from './element-accessor.js';
import { ElementSerializer, toSerializer, ElementSerializable, AttrSerializer, AttrSerializable } from './serializers.js';
import { signal } from './signals.js';
import { bind } from './signal-accessors.js';
import { parseHtml } from './testing.js';
import { NoopComponent } from './testing/noop-component.js';

describe('signal-accessors', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  describe('bind', () => {
    it('updates the provided element\'s text content reactively', async () => {
      const host = document.createElement('noop-component');
      document.body.appendChild(host);
      const comp = host.getComponentRef();

      expect(host.textContent).toBe('');

      const value = signal('1');
      bind(ElementAccessor.from(host), comp, String, () => value());
      await host.stable();
      expect(host.textContent).toBe('1');

      value.set('2');
      await host.stable();
      expect(host.textContent).toBe('2');
    });

    it('does not invoke the signal until connected', async () => {
      const host = document.createElement('noop-component');
      const comp = host.getComponentRef();

      const sig = jasmine.createSpy<() => string>('sig')
          .and.returnValue('test');

      bind(ElementAccessor.from(host), comp, String, sig);
      await host.stable();
      expect(sig).not.toHaveBeenCalled();

      document.body.appendChild(host);

      await host.stable();
      expect(sig).toHaveBeenCalledOnceWith();
    });

    it('pauses updates while disconnected', async () => {
      const host = document.createElement('noop-component');
      document.body.appendChild(host);
      const comp = host.getComponentRef();

      const value = signal('1');
      const sig = jasmine.createSpy<() => string>('sig')
          .and.callFake(() => value());

      bind(ElementAccessor.from(host), comp, String, sig);
      await host.stable();
      expect(sig).toHaveBeenCalledOnceWith();
      expect(host.textContent).toBe('1');
      sig.calls.reset();

      host.remove();

      value.set('2');
      await host.stable();
      expect(sig).not.toHaveBeenCalled();
      expect(host.textContent).toBe('1'); // Does not update.
    });

    it('serializes with an explicit primitive serializer', async () => {
      {
        const host = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(host);
        const comp = host.getComponentRef();

        bind(ElementAccessor.from(host), comp, String, () => 'test');
        await host.stable();
        expect(host.textContent!).toBe('test');
      }

      {
        const host = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(host);
        const comp = host.getComponentRef();

        bind(ElementAccessor.from(host), comp, Number, () => 1234);
        await host.stable();
        expect(host.textContent!).toBe('1234');
      }

      {
        const host = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(host);
        const comp = host.getComponentRef();

        bind(ElementAccessor.from(host), comp, Boolean, () => true);
        await host.stable();
        expect(host.textContent!).toBe('true');
      }

      {
        const host = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
        document.body.appendChild(host);
        const comp = host.getComponentRef();

        bind(ElementAccessor.from(host), comp, BigInt, () => 1234n);
        await host.stable();
        expect(host.textContent!).toBe('1234');
      }
    });

    it('serializes with a custom `Serializer`', async () => {
      const host = parseHtml(NoopComponent, `
        <noop-component></noop-component>
      `);
      document.body.appendChild(host);
      const comp = host.getComponentRef();

      const serializer: ElementSerializer<undefined, Element> = {
        serializeTo(_value: undefined, element: Element): void {
          element.textContent = 'undefined';
        },

        deserializeFrom(): undefined {
          return undefined;
        },
      };

      bind(ElementAccessor.from(host), comp, serializer, () => undefined);
      await host.stable();
      expect(host.textContent!).toBe('undefined');
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

      const host = parseHtml(NoopComponent, `
        <noop-component></noop-component>
      `);
      document.body.appendChild(host);
      const comp = host.getComponentRef();

      bind(ElementAccessor.from(host), comp, User, () => new User('Devel'));
      await host.stable();
      expect(host.textContent!).toBe('Devel');
    });

    it('throws an error when binding to the same element multiple times', () => {
      const host = parseHtml(NoopComponent, `
        <noop-component>
          <span></span>
        </noop-component>
      `);
      const comp = host.getComponentRef();

      const span = ElementAccessor.from(host).query('span').access();
      bind(span, comp, String, () => 'test');
      expect(() => bind(span, comp, String, () => 'test2'))
          .toThrowError(/cannot bind it again/);
    });

    it('throws an error when binding to the same element multiple times from different components', () => {
      const outerHost = ElementAccessor.from(parseHtml(NoopComponent, `
        <noop-component>
          <noop-component id="inner"></noop-component>
        </noop-component>
      `));
      const outerComp = outerHost.element.getComponentRef();

      const innerHost = ElementAccessor.from(
          outerComp.host.query('noop-component').native);
      const innerComp = innerHost.element.getComponentRef();

      bind(
        outerHost.query('#inner').access(NoopComponent),
        outerComp,
        String,
        () => 'test1',
      );
      expect(() => bind(innerHost, innerComp, String, () => 'test2'))
          .toThrowError(/cannot bind it again/);
    });

    it('restricts the signal result and serializer to be the same type', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const host = {} as ElementAccessor<NoopComponent>;
        const comp = {} as ComponentRef;

        // Correct primitive types.
        bind(host, comp, String, () => 'test');
        bind(host, comp, Number, () => 1234);
        bind(host, comp, Boolean, () => true);
        bind(host, comp, BigInt, () => 1234n);

        // Incorrect primitive types.
        // @ts-expect-error
        bind(host, comp, Number, () => 'test');
        // @ts-expect-error
        bind(host, comp, String, () => 1234);
        // @ts-expect-error
        bind(host, comp, String, () => true);
        // @ts-expect-error
        bind(host, comp, String, () => 1234n);

        // Correct serializer types.
        const serializer = {} as ElementSerializer<string, Element>;
        bind(host, comp, serializer, () => 'test');

        // Incorrect serializer types.
        // @ts-expect-error
        bind(host, comp, serializer, () => 1234);

        // Correct serializable types.
        const serializable = {} as ElementSerializable<string, Element>;
        bind(host, comp, serializable, () => 'test');

        // Incorrect serializable types.
        // @ts-expect-error
        bind(host, comp, serializable, () => 1234);
      };
    });

    it('resolves serializer type based on element type', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const host = {} as ElementAccessor<HTMLDivElement>;
        const comp = {} as ComponentRef;

        const divSerializer = {} as ElementSerializer<number, HTMLDivElement>;
        bind(host, comp, divSerializer, () => 1234);

        const inputSerializer =
            {} as ElementSerializable<number, HTMLInputElement>;
        // @ts-expect-error
        bind(host, comp, inputSerializer, () => 1234);

        const elSerializer = {} as ElementSerializer<number, Element>;
        bind(host, comp, elSerializer, () => 1234);
        // @ts-expect-error
        bind(host, comp as ElementAccessor<Element>, divSerializer, () => 1234);
      };
    });

    it('throws a compile time error when given an attribute serializer', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const host = {} as ElementAccessor<NoopComponent>;
        const comp = {} as ComponentRef;

        const serializer = {} as AttrSerializer<string>;
        // @ts-expect-error
        bind(host, comp, serializer, () => 'test');

        const serializable = {} as AttrSerializable<string>;
        // @ts-expect-error
        bind(host, comp, serializable, () => 'test');
      };
    });
  });
});
