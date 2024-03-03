import { AttrAccessor } from './attribute-accessor.js';
import { Dehydrated } from './dehydrated.js';
import { ElementAccessor } from './element-accessor.js';
import { AttrSerializable, AttrSerializer, ElementSerializable, ElementSerializer, toSerializer } from './serializers.js';
import { parseHtml } from './testing.js';
import { NoopComponent } from './testing/noop-component.js';

describe('element-accessor', () => {
  describe('ElementAccessor', () => {
    class DefinedElement extends HTMLElement {}
    customElements.define('element-accessor-defined', DefinedElement);

    describe('from', () => {
      it('creates a new `ElementAccessor` from a native element', () => {
        expect(ElementAccessor.from(document.createElement('div')))
            .toBeInstanceOf(ElementAccessor);
      });
    });

    describe('element', () => {
      it('returns the underlying `Element` object', () => {
        const el = document.createElement('div');

        expect(ElementAccessor.from(el).element).toBe(el);
      });
    });

    describe('attr', () => {
      it('returns an `AttrAccessor` for the given attribute on the underlying element', () => {
        const el = ElementAccessor.from(
            parseHtml(HTMLDivElement, `<div foo="bar"></div>`));

        const foo = el.attr('foo');

        expect(foo).toBeInstanceOf(AttrAccessor);
        expect(foo.read(String)).toBe('bar');

        // Make sure it's bound to the right element.
        el.element.setAttribute('foo', 'baz');
        expect(foo.read(String)).toBe('baz');
      });

      it('returns an `AttrAccessor` for the given attribute on the underlying element, even when the attribute is not set', () => {
        const el = ElementAccessor.from(
            parseHtml(HTMLDivElement, '<div></div>'));

        const foo = el.attr('foo');

        expect(foo).toBeInstanceOf(AttrAccessor);
        expect(foo.exists()).toBeFalse();
      });
    });

    describe('read', () => {
      it('reads the text content of the element and deserializes with the given primitive serializer', () => {
        const el = ElementAccessor.from(parseHtml(HTMLDivElement,
            `<div>Hello, World!</div>`));
        expect(el.read(String)).toBe('Hello, World!');

        const el2 = ElementAccessor.from(parseHtml(HTMLDivElement,
            `<div>12345</div>`));
        expect(el2.read(Number)).toBe(12345);

        const el3 = ElementAccessor.from(parseHtml(HTMLDivElement,
            `<div>true</div>`));
        expect(el3.read(Boolean)).toBeTrue();

        const el4 = ElementAccessor.from(parseHtml(HTMLDivElement,
            `<div>12345</div>`));
        expect(el4.read(BigInt)).toBe(12345n);
      });

      it('reads with the given custom element serializer', () => {
        const serializer: ElementSerializer<{ foo: string }, Element> = {
          serializeTo(): void { /* no-op */ },

          deserializeFrom(): { foo: string } {
            return { foo: 'bar' };
          },
        };

        const el = ElementAccessor.from(parseHtml(HTMLDivElement,
            `<div>Hello, World!</div>`));
        expect(el.read(serializer)).toEqual({ foo: 'bar' });
      });

      it('reads with the given custom element serializable', () => {
        class User {
          public constructor(private name: string) {}
          public static [toSerializer](): ElementSerializer<User, Element> {
            return {
              serializeTo(user: User, element: Element): void {
                element.textContent = user.name;
              },

              deserializeFrom(element: Element): User {
                return new User(element.textContent!);
              },
            };
          }
        }

        const el = ElementAccessor.from(parseHtml(HTMLDivElement,
            `<div>Devel</div>`));
        expect(el.read(User)).toEqual(new User('Devel'));
      });

      it('throws an error if the deserialization process throws', () => {
        const err = new Error('Failed to deserialize.');
        const serializer: ElementSerializer<string, Element> = {
          serializeTo(): void { /* no-op */ },

          deserializeFrom(): string {
            throw err;
          }
        };

        const el = ElementAccessor.from(parseHtml(HTMLDivElement,
            `<div>Hello, World!</div>`));
        expect(() => el.read(serializer)).toThrow(err);
      });

      it('resolves return type from input primitive serializer type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<HTMLDivElement>;

          const _resultStr: string = el.read(String);
          const _resultNum: number = el.read(Number);
          const _resultBool: boolean = el.read(Boolean);
          const _resultBigInt: bigint = el.read(BigInt);
        };
      });

      it('resolves return type from input custom serializer type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<HTMLDivElement>;
          const serializer = {} as ElementSerializer<number, Element>;

          const _result: number = el.read(serializer);
        };
      });

      it('resolves return type from input custom serializable type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<HTMLDivElement>;
          const serializable = {} as ElementSerializable<number, Element>;

          const _result: number = el.read(serializable);
        };
      });

      it('resolves serializer type based on element type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<HTMLDivElement>;

          const divSerializer = {} as ElementSerializer<number, HTMLDivElement>;
          el.read(divSerializer);

          const inputSerializer =
              {} as ElementSerializer<number, HTMLInputElement>;
          // @ts-expect-error
          el.read(inputSerializer);

          const divSerializable =
              {} as ElementSerializable<number, HTMLDivElement>;
          el.read(divSerializable);

          const inputSerializable =
              {} as ElementSerializable<number, HTMLInputElement>;
          // @ts-expect-error
          el.read(inputSerializable);
        };
      });

      it('throws a compile-time error for attribute serializers', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<HTMLDivElement>;

          const serializer = {} as AttrSerializer<number>;
          // @ts-expect-error
          el.read(serializer);

          const serializable = {} as AttrSerializable<number>;
          // @ts-expect-error
          el.read(serializable);
        };
      });
    });

    describe('listen', () => {
      it('listens invokes the given callback when the specified event is triggered', () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const comp = el.getComponentRef();

        const handler = jasmine.createSpy<(evt: Event) => void>('handler');

        ElementAccessor.from(el).listen(comp, 'click', handler);
        expect(handler).not.toHaveBeenCalled();

        comp.host.native.click();

        expect(handler).toHaveBeenCalledOnceWith(jasmine.any(Event));
      });

      it('removes event listener on disconnect', () => {
        const el = document.createElement('noop-component');
        const comp = el.getComponentRef();

        const addSpy = spyOn(el, 'addEventListener').and.callThrough();
        const removeSpy = spyOn(el, 'removeEventListener').and.callThrough();

        const handler = jasmine.createSpy<() => void>('handler');

        // Start listening while disconnected, nothing should happen yet.
        ElementAccessor.from(el).listen(comp, 'click', handler);
        expect(addSpy).not.toHaveBeenCalled();
        expect(removeSpy).not.toHaveBeenCalled();

        el.click();
        expect(handler).not.toHaveBeenCalled();

        // On connection, start listening.
        document.body.appendChild(el);
        expect(addSpy).toHaveBeenCalledTimes(1);
        expect(removeSpy).not.toHaveBeenCalled();
        expect(handler).not.toHaveBeenCalled();
        addSpy.calls.reset();

        // React to events.
        el.click();
        expect(handler).toHaveBeenCalledTimes(1);
        handler.calls.reset();

        // On disconnect, stop listening.
        el.remove();
        expect(addSpy).not.toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalledTimes(1);
        expect(handler).not.toHaveBeenCalled();
        removeSpy.calls.reset();

        // Stop reacting to events.
        el.click();
        expect(handler).not.toHaveBeenCalled();
      });

      it('listens for events on the underlying element', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <div id="first">
              <div id="child"></div>
            </div>
            <div id="second"></div>
          </noop-component>
        `);
        document.body.appendChild(el);
        const comp = el.getComponentRef();
        const host = ElementAccessor.from(el);

        const handler = jasmine.createSpy<() => void>('handler');

        host.query('div#first').access().listen(comp, 'click', handler);

        // Listen for direct events.
        host.query('div#first').access().element.click();
        expect(handler).toHaveBeenCalledTimes(1);
        handler.calls.reset();

        // Listen for descendant events.
        host.query('div#child').access().element.click();
        expect(handler).toHaveBeenCalledTimes(1);
        handler.calls.reset();

        // Do not listen for sibling events.
        host.query('div#second').access().element.click();
        expect(handler).not.toHaveBeenCalled();

        // Do not listen for ancestor events.
        el.click();
        expect(handler).not.toHaveBeenCalled();
      });

      it('supports custom events', () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const comp = el.getComponentRef();

        const handler = jasmine.createSpy<(evt: Event) => void>('handler');

        ElementAccessor.from(el).listen(comp, 'custom-event', handler);

        const evt = new CustomEvent('custom-event');
        el.dispatchEvent(evt);

        expect(handler).toHaveBeenCalledOnceWith(evt);
      });

      it('propagates the `capture` option', () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const comp = el.getComponentRef();

        spyOn(el, 'addEventListener').and.callThrough();

        ElementAccessor.from(el).listen(comp, 'click', () => {}, {
          capture: true,
        });

        expect(el.addEventListener).toHaveBeenCalledOnceWith(
          'click',
          jasmine.any(Function),
          jasmine.objectContaining({ capture: true }),
        );
      });

      it('propagates the `passive` option', () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const comp = el.getComponentRef();

        spyOn(el, 'addEventListener').and.callThrough();

        ElementAccessor.from(el).listen(comp, 'click', () => {}, {
          passive: true,
        });

        expect(el.addEventListener).toHaveBeenCalledOnceWith(
          'click',
          jasmine.any(Function),
          jasmine.objectContaining({ passive: true }),
        );
      });
    });

    describe('query', () => {
      it('returns the first queried element', () => {
        const el = ElementAccessor.from(parseHtml(HTMLDivElement, `
          <div>
            <span>First</span>
            <span>Second</span>
          </div>
        `));

        expect(el.query('span').unvalidatedElement.textContent)
            .toBe('First');
      });

      it('throws when no element is found by default', () => {
        const el = ElementAccessor.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(() => el.query('input'))
            .toThrowError(/did not resolve to an element/);
      });

      it('returns `null` when no element is found and explicitly `optional`', () => {
        const el = ElementAccessor.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(el.query('input', { optional: true })).toBeNull();
      });

      it('throws when no element is found and explicitly not `optional`', () => {
        const el = ElementAccessor.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(() => el.query('input', { optional: false }))
            .toThrowError(/did not resolve to an element/);
      });

      it('type checks the result by parsing the selector query', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<Element>;
          const result = el.query('.foo #bar > [baz] input');

          result satisfies Dehydrated<HTMLInputElement>;
        };
      });

      it('returns a non-nullish value by default', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<Element>;
          const result = el.query('input');

          // @ts-expect-error
          null satisfies typeof result;
        };
      });

      it('returns a non-nullish value when explicitly not optional', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<Element>;
          const result = el.query('input', { optional: false });

          // @ts-expect-error
          null satisfies typeof result;
        };
      });

      it('returns a nullish value when explicitly optional', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<Element>;
          const result = el.query('input', { optional: true });

          null satisfies typeof result;
        };
      });

      it('returns a nullish value when optionality is unknown', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<Element>;
          const optional = false as boolean;
          const result = el.query('input', { optional });

          null satisfies typeof result;
        };
      });
    });

    describe('queryAll', () => {
      it('returns the first queried element', () => {
        const el = ElementAccessor.from(parseHtml(HTMLDivElement, `
          <div>
            <span>First</span>
            <span>Second</span>
            <span>Third</span>
          </div>
        `));

        const items = Array.from(el.queryAll('span'))
            .map((span) => span.unvalidatedElement.textContent);
        expect(items).toEqual([ 'First', 'Second', 'Third' ]);
      });

      it('throws when no element is found by default', () => {
        const el = ElementAccessor.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(() => el.queryAll('input'))
            .toThrowError(/did not resolve to any elements/);
      });

      it('returns empty list when no element is found and explicitly `optional`', () => {
        const el = ElementAccessor.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(Array.from(el.queryAll('input', { optional: true })))
            .toEqual([]);
      });

      it('throws when no element is found and explicitly not `optional`', () => {
        const el = ElementAccessor.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(() => el.queryAll('input', { optional: false }))
            .toThrowError(/did not resolve to any elements/);
      });

      it('type checks the result by parsing the selector query', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementAccessor<Element>;
          const result = el.queryAll('.foo #bar > [baz] input');

          result satisfies Array<Dehydrated<HTMLInputElement>>;
        };
      });
    });
  });
});
