import { AttrAccessor } from './attribute-accessor.js';
import { AttrSerializable, AttrSerializer, ElementSerializable, ElementSerializer, toSerializer } from './serializers.js';
import { parseHtml } from './testing.js';

describe('attribute-accessor', () => {
  describe('AttrAccessor', () => {
    describe('from', () => {
      it('returns an `AttrAccessor` of the given element and attribute', () => {
        const attr = AttrAccessor.from(
          parseHtml(HTMLDivElement, `<div foo="bar"></div>`),
          'foo',
        );

        expect(attr.read(String)).toBe('bar');
      });
    });

    describe('exists', () => {
      it('returns `true` when the attribute is set on the element', () => {
        const el = parseHtml(
          HTMLDivElement,
          `<div foo bar="test" baz=""></div>`,
        );

        expect(AttrAccessor.from(el, 'foo').exists()).toBeTrue();
        expect(AttrAccessor.from(el, 'bar').exists()).toBeTrue();
        expect(AttrAccessor.from(el, 'baz').exists()).toBeTrue();
      });

      it('returns `false` when the attribute is *not* set on the element', () => {
        const attr = AttrAccessor.from(
          parseHtml(HTMLDivElement, `<div></div>`),
          'test',
        );

        expect(attr.exists()).toBeFalse();
      });
    });

    describe('read', () => {
      it('returns the attribute value for the given name', () => {
        const attr = AttrAccessor.from(
          parseHtml(HTMLDivElement, `<div foo="bar"></div>`),
          'foo',
        );

        expect(attr.read(String)).toBe('bar');
      });

      it('deserializes empty string when the attribute is set with no value', () => {
        const foo = AttrAccessor.from(
          parseHtml(HTMLDivElement, `<div foo></div>`),
          'foo',
        );
        expect(foo.read(String)).toBe('');

        const bar = AttrAccessor.from(
          parseHtml(HTMLDivElement, `<div bar=""></div>`),
          'bar',
        );
        expect(bar.read(String)).toBe('');
      });

      it('deserializes the attribute with the given primitive serializer', () => {
        {
          const attr = AttrAccessor.from(
            parseHtml(HTMLDivElement, `<div name="Devel"></div>`),
            'name',
          );
          expect(attr.read(String)).toBe('Devel');
        }

        {
          const attr = AttrAccessor.from(
            parseHtml(HTMLDivElement, `<div id="12345"></div>`),
            'id',
          );
          expect(attr.read(Number)).toBe(12345);
        }

        {
          const attr = AttrAccessor.from(
            parseHtml(HTMLDivElement, `<div id="12345"></div>`),
            'id',
          );
          expect(attr.read(BigInt)).toBe(12345n);
        }
      });

      it('deserializes booleans based on text value, not attribute presence', () => {
        {
          const attr = AttrAccessor.from(
            parseHtml(HTMLDivElement, `<div enabled="true"></div>`),
            'enabled',
          );
          expect(attr.read(Boolean)).toBeTrue();
        }

        {
          const attr = AttrAccessor.from(
            parseHtml(HTMLDivElement, `<div enabled="false"></div>`),
            'enabled',
          );
          expect(attr.read(Boolean)).toBeFalse();
        }

        {
          const attr = AttrAccessor.from(
            parseHtml(HTMLDivElement, `<div enabled></div>`),
            'enabled',
          );
          expect(() => attr.read(Boolean)).toThrow();
        }

        {
          const attr = AttrAccessor.from(
            parseHtml(HTMLDivElement, `<div enabled=""></div>`),
            'enabled',
          );
          expect(() => attr.read(Boolean)).toThrow();
        }

        {
          const attr = AttrAccessor.from(
            parseHtml(HTMLDivElement, `<div></div>`),
            'enabled',
          );
          expect(() => attr.read(Boolean)).toThrow();
        }
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

        const attr = AttrAccessor.from(
          parseHtml(HTMLDivElement, `<div hello="world"></div>`),
          'hello',
        );
        expect(attr.read(serializer)).toEqual({ foo: 'bar' });
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

        const attr = AttrAccessor.from(
          parseHtml(HTMLDivElement, `<div name="Devel"></div>`),
          'name',
        );
        expect(attr.read(User)).toEqual(new User('Devel'));
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

        const attr = AttrAccessor.from(
          parseHtml(HTMLDivElement, `<div hello="world"></div>`),
          'hello',
        );
        expect(() => attr.read(serializer)).toThrow(err);
      });

      it('returns `null` if the attribute does not exist and is marked optional', () => {
        const attr = AttrAccessor.from(
          parseHtml(HTMLDivElement, `<div></div>`),
          'hello',
        );
        expect(attr.read(String, { optional: true })).toBeNull();
      });

      it('resolves return type from input primitive serializer type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const attr = {} as AttrAccessor;

          attr.read(String) satisfies string;
          attr.read(String, {}) satisfies string;
          attr.read(String, { optional: false }) satisfies string;

          const optionalAttr = attr.read(String, { optional: true });
          optionalAttr satisfies string | null;
          ({} as string | null) satisfies typeof optionalAttr;

          const unknownAttr = attr.read(String, { optional: true as boolean });
          unknownAttr satisfies string | null;
          ({} as string | null) satisfies typeof unknownAttr;
        };
      });

      it('resolves return type from input custom serializer type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const attr = {} as AttrAccessor;
          const serializer = {} as AttrSerializer<number>;

          attr.read(serializer) satisfies number;
          attr.read(serializer, {}) satisfies number;
          attr.read(serializer, { optional: false }) satisfies number;

          const optionalAttr = attr.read(serializer, { optional: true });
          optionalAttr satisfies number | null;
          ({} as number | null) satisfies typeof optionalAttr;

          const unknownAttr = attr.read(serializer, {
            optional: true as boolean,
          });
          unknownAttr satisfies number | null;
          ({} as number | null) satisfies typeof unknownAttr;
        };
      });

      it('resolves return type from input custom serializable type', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const attr = {} as AttrAccessor;
          const serializable = {} as AttrSerializable<number>;

          attr.read(serializable) satisfies number;
          attr.read(serializable, {}) satisfies number;
          attr.read(serializable, { optional: false }) satisfies number;

          const optionalAttr = attr.read(serializable, { optional: true });
          optionalAttr satisfies number | null;
          ({} as number | null) satisfies typeof optionalAttr;

          const unknownAttr = attr.read(serializable, {
            optional: true as boolean,
          });
          unknownAttr satisfies number | null;
          ({} as number | null) satisfies typeof unknownAttr;
        };
      });

      it('throws a compile-time error when used with an element serializer', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const attr = {} as AttrAccessor;

          const serializer = {} as ElementSerializer<number, Element>;
          // @ts-expect-error
          attr.read(serializer);

          const serializable = {} as ElementSerializable<number, Element>;
          // @ts-expect-error
          attr.read(serializable);
        };
      });
    });

    describe('write', () => {
      it('serializes and writes the given value to the attribute', () => {
        const el = document.createElement('div');
        const attr = AttrAccessor.from(el, 'foo');

        attr.write('bar', String);

        expect(el.getAttribute('foo')).toBe('bar');
      });

      it('serializes the attribute with the given primitive serializer', () => {
        {
          const el = document.createElement('div');
          const attr = AttrAccessor.from(el, 'name');

          attr.write('Devel', String);

          expect(el.getAttribute('name')).toBe('Devel');
        }

        {
          const el = document.createElement('div');
          const attr = AttrAccessor.from(el, 'id');

          attr.write(12345, Number);

          expect(el.getAttribute('id')).toBe('12345');
        }

        {
          const el = document.createElement('div');
          const attr = AttrAccessor.from(el, 'id');

          attr.write(12345n, BigInt);

          expect(el.getAttribute('id')).toBe('12345');
        }
      });

      it('deserializes booleans based on text value, not attribute presence', () => {
        {
          const el = document.createElement('div');
          const attr = AttrAccessor.from(el, 'enabled');

          attr.write(false, Boolean);

          expect(el.getAttribute('enabled')).toBe('false');
        }

        {
          const el = document.createElement('div');
          const attr = AttrAccessor.from(el, 'enabled');

          attr.write(true, Boolean);

          expect(el.getAttribute('enabled')).toBe('true');
        }
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

        const el = document.createElement('div');
        const attr = AttrAccessor.from(el, 'hello');

        attr.write({ foo: 'bar' }, serializer);

        expect(el.getAttribute('hello')).toBe('bar');
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

        const el = document.createElement('div');
        const attr = AttrAccessor.from(el, 'name');

        attr.write(new User('Devel'), User);

        expect(el.getAttribute('name')).toBe('Devel');
      });

      it('throws an error if the deserialization process throws', () => {
        const err = new Error('Failed to deserialize.');
        const serializer: AttrSerializer<string> = {
          serialize(): string {
            throw err;
          },

          deserialize(): string {
            return 'unused';
          }
        };

        const el = document.createElement('div');
        const attr = AttrAccessor.from(el, 'hello');

        expect(() => attr.write('test', serializer)).toThrow(err);
      });

      it('throws a compile-time error when used with an element serializer', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const attr = {} as AttrAccessor;

          const serializer = {} as ElementSerializer<number, Element>;
          // @ts-expect-error
          attr.write(1234, serializer);

          const serializable = {} as ElementSerializable<number, Element>;
          // @ts-expect-error
          attr.write(1234, serializable);
        };
      });

      it('throws a compile-time error when used with an incompatible serializer', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const attr = {} as AttrAccessor;

          // @ts-expect-error
          attr.write('test', Number);

          const serializer = {} as AttrSerializer<number>;
          // @ts-expect-error
          attr.write('test', serializer);

          const serializable = {} as AttrSerializable<number>;
          // @ts-expect-error
          attr.write('test', serializable);
        };
      });
    });
  });
});
