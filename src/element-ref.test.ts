import { ElementRef } from './element-ref.js';
import { type AttrSerializable, type AttrSerializer, toSerializer } from './serializers.js';
import { parseHtml } from './testing/html-parser.js';

describe('element-ref', () => {
  describe('ElementRef', () => {
    describe('from', () => {
      it('constructs a new `ElementRef` from the given native element', () => {
        const el = ElementRef.from(document.createElement('div'));

        expect(el).toBeInstanceOf(ElementRef);

        // Verify that native element type is inferred from the input.
        () => {
          el.native satisfies HTMLDivElement;
        };
      });

      it('throws an error when given a non-Element type', () => {
        const textNode = document.createTextNode('Hello, World!');
        expect(() => ElementRef.from(textNode as unknown as Element))
            .toThrowError(/Tried to create an `ElementRef` of `nodeType` 3/);

        expect(() => ElementRef.from(document as unknown as Element))
            .toThrowError(/Tried to create an `ElementRef` of `nodeType` 9/);
      });

      it('rejects `Node` inputs at compile-time', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          // @ts-expect-error `Node` is not assignable to `Element`.
          ElementRef.from(document.createTextNode('Hello, World!'));
        };
      });
    });

    describe('native', () => {
      it('returns the native element given to the `ElementRef`', () => {
        const div = document.createElement('div');
        const el = ElementRef.from(div);

        expect(el.native).toBe(div);
      });

      it('should be readonly', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = ElementRef.from(document.createElement('div'));

          // @ts-expect-error `native` is `readonly`.
          el.native = document.createElement('div');
        };
      });
    });

    describe('read', () => {
      it('reads the text content of the element and deserializes with the given primitive serializer', () => {
        const el = ElementRef.from(parseHtml(`<div>Hello, World!</div>`));
        expect(el.read(String)).toBe('Hello, World!');

        const el2 = ElementRef.from(parseHtml(`<div>12345</div>`));
        expect(el2.read(Number)).toBe(12345);

        const el3 = ElementRef.from(parseHtml(`<div>true</div>`));
        expect(el3.read(Boolean)).toBeTrue();

        const el4 = ElementRef.from(parseHtml(`<div>12345</div>`));
        expect(el4.read(BigInt)).toBe(12345n);
      });

      it('reads the text content of the element with the given custom serializer', () => {
        const serializer: AttrSerializer<{ foo: string }> = {
          serialize(value: { foo: string }): string {
            return value.foo;
          },

          deserialize(): { foo: string } {
            return { foo: 'bar' };
          }
        };

        const el = ElementRef.from(parseHtml(`<div>Hello, World!</div>`));
        expect(el.read(serializer)).toEqual({ foo: 'bar' });
      });

      it('reads the text content of the element with the given serializable', () => {
        class User {
          public constructor(private name: string) {}
          public static [toSerializer](): AttrSerializer<User> {
            return {
              serialize(user: User): string {
                return user.name;
              },

              deserialize(name: string): User {
                return new User(name);
              },
            };
          }
        }

        const el = ElementRef.from(parseHtml(`<div>Devel</div>`));
        expect(el.read(User)).toEqual(new User('Devel'));
      });

      it('throws an error if the deserialization process throws', () => {
        const err = new Error('Failed to deserialize.');
        const serializer: AttrSerializer<string> = {
          serialize(value: string): string {
            return value;
          },

          deserialize(): string {
            throw err;
          }
        };

        const el = ElementRef.from(parseHtml(`<div>Hello, World!</div>`));
        expect(() => el.read(serializer)).toThrow(err);
      });

      it('resolves return type from input primitive serializer type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementRef<HTMLDivElement>;

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
          const el = {} as ElementRef<HTMLDivElement>;
          const serializer = {} as AttrSerializer<number>;

          const _result: number = el.read(serializer);
        };
      });

      it('resolves return type from input custom serializable type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementRef<HTMLDivElement>;
          const serializable = {} as AttrSerializable<number>;

          const _result: number = el.read(serializable);
        };
      });
    });

    describe('attr', () => {
      it('returns the attribute value for the given name', () => {
        const el = ElementRef.from(parseHtml(`<div foo="bar"></div>`));

        expect(el.attr('foo', String)).toBe('bar');
      });

      it('deserializes empty string when the attribute is set with no value', () => {
        const el = ElementRef.from(parseHtml(`<div foo bar=""></div>`));

        expect(el.attr('foo', String)).toBe('');
        expect(el.attr('bar', String)).toBe('');
      });

      it('deserializes the attribute with the given primitive serializer', () => {
        const el = ElementRef.from(parseHtml(`<div name="Devel"></div>`));
        expect(el.attr('name', String)).toBe('Devel');

        const el2 = ElementRef.from(parseHtml(`<div id="12345"></div>`));
        expect(el2.attr('id', Number)).toBe(12345);

        const el3 = ElementRef.from(parseHtml(`<div id="12345"></div>`));
        expect(el3.attr('id', BigInt)).toBe(12345n);
      });

      it('deserializes booleans based on text value, not attribute presence', () => {
        const el = ElementRef.from(parseHtml(`<div enabled="true"></div>`));
        expect(el.attr('enabled', Boolean)).toBeTrue();

        const el2 = ElementRef.from(parseHtml(`<div enabled="false"></div>`));
        expect(el2.attr('enabled', Boolean)).toBeFalse();

        const el3 = ElementRef.from(parseHtml(`<div enabled></div>`));
        expect(() => el3.attr('enabled', Boolean)).toThrow();

        const el4 = ElementRef.from(parseHtml(`<div enabled=""></div>`));
        expect(() => el4.attr('enabled', Boolean)).toThrow();

        const el5 = ElementRef.from(parseHtml(`<div></div>`));
        expect(() => el5.attr('enabled', Boolean)).toThrow();
      });

      it('deserializes the attribute with the given custom serializer', () => {
        const serializer: AttrSerializer<{ foo: string }> = {
          serialize(value: { foo: string }): string {
            return value.foo;
          },

          deserialize(): { foo: string } {
            return { foo: 'bar' };
          }
        };

        const el = ElementRef.from(parseHtml(`<div hello="world"></div>`));
        expect(el.attr('hello', serializer)).toEqual({ foo: 'bar' });
      });

      it('deserializes the attribute with the given serializable', () => {
        class User {
          public constructor(private name: string) {}
          public static [toSerializer](): AttrSerializer<User> {
            return {
              serialize(user: User): string {
                return user.name;
              },

              deserialize(name: string): User {
                return new User(name);
              },
            };
          }
        }

        const el = ElementRef.from(parseHtml(`<div name="Devel"></div>`));
        expect(el.attr('name', User)).toEqual(new User('Devel'));
      });

      it('throws an error if the deserialization process throws', () => {
        const err = new Error('Failed to deserialize.');
        const serializer: AttrSerializer<string> = {
          serialize(value: string): string {
            return value;
          },

          deserialize(): string {
            throw err;
          }
        };

        const el = ElementRef.from(parseHtml(`<div hello="world"></div>`));
        expect(() => el.attr('hello', serializer)).toThrow(err);
      });

      it('returns `undefined` if the attribute does not exist and is marked optional', () => {
        const el = ElementRef.from(parseHtml(`<div></div>`));
        expect(el.attr('hello', String, { optional: true })).toBeUndefined();
      });

      it('resolves return type from input primitive serializer type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementRef<HTMLDivElement>;

          const _result1: string = el.attr('test', String);
          const _result2: string = el.attr('test', String, {});
          const _result3: string =
              el.attr('test', String, { optional: false });

          let optional = el.attr('test', String, { optional: true });
          optional = 'test' as string | undefined;

          let unknown =
              el.attr('test', String, { optional: true as boolean });
          unknown = 'test' as string | undefined;
        };
      });

      it('resolves return type from input custom serializer type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementRef<HTMLDivElement>;
          const serializer = {} as AttrSerializer<number>;

          const _result1: number = el.attr('test', serializer);
          const _result2: number = el.attr('test', serializer, {});
          const _result3: number =
              el.attr('test', serializer, { optional: false });

          let optional = el.attr('test', serializer, { optional: true });
          optional = 123 as number | undefined;

          let unknown =
              el.attr('test', serializer, { optional: true as boolean });
          unknown = 123 as number | undefined;
        };
      });

      it('resolves return type from input custom serializable type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementRef<HTMLDivElement>;
          const serializable = {} as AttrSerializable<number>;

          const _result1: number = el.attr('test', serializable);
          const _result2: number = el.attr('test', serializable, {});
          const _result3: number =
              el.attr('test', serializable, { optional: false });

          let optional = el.attr('test', serializable, { optional: true });
          optional = 123 as number | undefined;

          let unknown =
              el.attr('test', serializable, { optional: true as boolean });
          unknown = 123 as number | undefined;
        };
      });
    });

    describe('query', () => {
      it('returns the queried element', () => {
        const el = ElementRef.from(
            parseHtml(`<div><span>Hello, World!</span></div>`));

        expect(el.query('span').read(String)).toBe('Hello, World!');
      });

      it('throws an error when no element is found and not marked `optional`', () => {
        const el = ElementRef.from(document.createElement('div'));

        // Explicitly required.
        expect(() => el.query('span', { optional: false }))
            .toThrowError(/Selector "span" did not resolve to an element\./);

        // Implicitly required.
        expect(() => el.query('span', {}))
            .toThrowError(/Selector "span" did not resolve to an element\./);
        expect(() => el.query('span'))
            .toThrowError(/Selector "span" did not resolve to an element\./);
      });

      it('returns non-nullable type for required query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          // Explicitly required.
          {
            let result = el.query('span', { optional: false });

            // @ts-expect-error `null` should not be assignable to `result`.
            result = null;
          }

          // Implicitly required via default `optional`.
          {
            let result = el.query('span', {});

            // @ts-expect-error `null` should not be assignable to `result`.
            result = null;
          }

          // Implicitly required via default `options`.
          {
            let result = el.query('span');

            // @ts-expect-error `null` should not be assignable to `result`.
            result = null;
          }
        };
      });

      it('types the result based on a required query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          let _result1: ElementRef<HTMLInputElement> = el.query('input#id');
          let _result2: ElementRef<HTMLInputElement> = el.query('input#id', {});
          let _result3: ElementRef<HTMLInputElement> = el.query('input#id', {
            optional: false,
          });
        };
      });

      it('types the result as nullable based on an optional query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          let _result: ElementRef<HTMLInputElement> | null =
              el.query('input#id', { optional: true });
        };
      });

      it('types the result as nullable based on unknown optionality', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          let _result: ElementRef<HTMLInputElement> | null =
              el.query('input#id', { optional: true as boolean });
        };
      });

      it('types the result as `null` for impossible queries', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          let _result: null = el.query('input::before');
        };
      });

      it('returns `null` when no element is found and marked `optional`', () => {
        const el = ElementRef.from(document.createElement('div'));

        expect(el.query('span', { optional: true })).toBeNull();
      });

      it('returns nullable type for `optional` query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          // `ElementRef<Element> | null`
          let result = el.query('span', { optional: true });

          // `null` should be assignable to implicit return type.
          result = null;
        };
      });

      it('returns possibly nullable type for unknown optionality', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          // `ElementRef<Element> | null`
          let result = el.query('span', { optional: true as boolean });

          // `null` should be assignable to implicit return type.
          result = null;
        };
      });

      it('scopes to the native element', () => {
        const el = ElementRef.from(parseHtml(`
<div>
  <div>
    <!-- Should be skipped by \`:scope >\` -->
    <span>Descendant</span>
  </div>
  <span>Child</span>
</div>
        `.trim()));

        expect(el.query(':scope > span').read(String)).toBe('Child');
      });
    });

    describe('queryAll', () => {
      it('returns the queried elements', () => {
        const el = ElementRef.from(parseHtml(`
<div>
  <span>Hello, World!</span>
  <span>Hello again!</span>
  <span>Hello once more!</span>
</div>
        `.trim()));

        expect(el.queryAll('span').map((el) => el.read(String))).toEqual([
          'Hello, World!',
          'Hello again!',
          'Hello once more!',
        ]);
      });

      it('throws an error when no element is found and not marked `optional`', () => {
        const el = ElementRef.from(document.createElement('div'));

        // Explicitly required.
        expect(() => el.queryAll('span', { optional: false }))
            .toThrowError(/Selector "span" did not resolve to any elements\./);

        // Implicitly required.
        expect(() => el.queryAll('span'))
            .toThrowError(/Selector "span" did not resolve to any elements\./);
        expect(() => el.queryAll('span', {}))
            .toThrowError(/Selector "span" did not resolve to any elements\./);
      });

      it('returns an empty array when no element is found and marked `optional`', () => {
        const el = ElementRef.from(document.createElement('div'));

        expect(el.queryAll('span', { optional: true })).toEqual([]);
      });

      it('returns a *real* array', () => {
        const el = ElementRef.from(document.createElement('div'));

        expect(el.queryAll('span', { optional: true })).toBeInstanceOf(Array);
      });

      it('scopes to the native element', () => {
        const el = ElementRef.from(parseHtml(`
<div>
  <div>
    <!-- Should be skipped by \`:scope >\` -->
    <span>Descendant</span>
  </div>
  <span>Child 1</span>
  <span>Child 2</span>
</div>
        `.trim()));

        expect(el.queryAll(':scope > span').map((el) => el.read(String)))
            .toEqual([
              'Child 1',
              'Child 2',
            ]);
      });

      it('types the result based on query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementRef<HTMLDivElement>;

          const _result: ElementRef<HTMLInputElement>[] = el.queryAll('input');
        };
      });

      it('type the result without `null` pollution', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementRef<HTMLDivElement>;

          // `Array<ElementRef<Element>>` because pseudo-selectors always
          // resolve to `null`. At runtime, this will always be an empty `[]`,
          // so we type this as `Array<ElementRef<Element>>`.
          const result = el.queryAll('input::before');

          // @ts-expect-error `result` contains an array of `Element`, not an
          // array of `HTMLInputElement`.
          const _inputs: ElementRef<HTMLInputElement>[] = result;
        };
      });
    });
  });
});
