import { type ResolveSerializer, resolveSerializer } from './serializer-tokens.js';
import { type AttrSerializer, type ElementSerializer, bigintSerializer, booleanSerializer, numberSerializer, stringSerializer, toSerializer, ElementSerializable, AttrSerializable } from './serializers.js';

describe('serializer-tokens', () => {
  describe('resolveSerializer', () => {
    it('resolves `String` to `stringSerializer`', () => {
      expect(resolveSerializer(String)).toBe(stringSerializer);
    });

    it('resolves `Number` to `numberSerializer`', () => {
      expect(resolveSerializer(Number)).toBe(numberSerializer);
    });

    it('resolves `Boolean` to `booleanSerializer`', () => {
      expect(resolveSerializer(Boolean)).toBe(booleanSerializer);
    });

    it('resolves `BigInt` to `bigintSerializer`', () => {
      expect(resolveSerializer(BigInt)).toBe(bigintSerializer);
    });

    it('resolves a custom element serializer', () => {
      const serializer: ElementSerializer<number, Element> = {
        serializeTo(value: number, element: Element): void {
          element.textContent = value.toString();
        },

        deserializeFrom(element: Element): number {
          return Number(element.textContent!);
        },
      }

      expect(resolveSerializer(serializer)).toBe(serializer);
    });

    it('resolves a custom attribute serializer', () => {
      const serializer: AttrSerializer<number> = {
        serialize(value: number): string {
          return value.toString();
        },

        deserialize(attr: string): number {
          return Number(attr);
        },
      }

      expect(resolveSerializer(serializer)).toBe(serializer);
    });

    it('resolves an `ElementSerializable`', () => {
      const serializer: ElementSerializer<number, Element> = {
        serializeTo(value: number, element: Element): void {
          element.textContent = value.toString();
        },

        deserializeFrom(element: Element): number {
          return Number(element.textContent!);
        },
      };
      const serializable = {
        [toSerializer]: () => serializer,
      };

      expect(resolveSerializer(serializable)).toBe(serializer);
    });

    it('resolves an `AttrSerializable`', () => {
      const serializer: AttrSerializer<number> = {
        serialize(value: number): string {
          return value.toString();
        },

        deserialize(attr: string): number {
          return Number(attr);
        },
      };
      const serializable = {
        [toSerializer]: () => serializer,
      };

      expect(resolveSerializer(serializable)).toBe(serializer);
    });
  });

  describe('ResolveSerializer', () => {
    // Type-only tests, only need to compile, not execute.
    //
    // `ResolverSerializer` should return a specific serializer, so we need to
    // test assignability in both directions. `typeof stringSerializer` can't
    // just *be assignable to* `ResolverSerializer<...>`, it needs to be
    // *exactly* `ResolverSerializer<...>`.
    //
    // Checking that `ResolveSerializer<...>` is assignable to
    // `stringSerializer` *sounds* like it would be a fairly strict test, but it
    // really isn't because `never` is assignable to anything, so if the
    // resolution fails, such a test would still pass. Therefore we need to
    // explicitly check both directions of assignability.

    it('resolves primitive serializers', () => {
      expect().nothing();
      () => {
        let _stringElResult1: ResolveSerializer<
          typeof String,
          ElementSerializer<unknown, any>,
          ElementSerializable<unknown, any>
        > = stringSerializer;
        let _stringElResult2: typeof stringSerializer = {} as ResolveSerializer<
          typeof String,
          ElementSerializer<unknown, any>,
          ElementSerializable<unknown, any>
        >;

        let _stringAttrResult1: ResolveSerializer<
          typeof String,
          AttrSerializer<unknown>,
          AttrSerializable<unknown>
        > = stringSerializer;
        let _stringAttrResult2: typeof stringSerializer =
            {} as ResolveSerializer<
              typeof String,
              AttrSerializer<unknown>,
              AttrSerializable<unknown>
            >;

        let _numberElResult1: ResolveSerializer<
          typeof Number,
          ElementSerializer<unknown, any>,
          ElementSerializable<unknown, any>
        > = numberSerializer;
        let _numberElResult2: typeof numberSerializer = {} as ResolveSerializer<
          typeof Number,
          ElementSerializer<unknown, any>,
          ElementSerializable<unknown, any>
        >;

        let _numberAttrResult1: ResolveSerializer<
          typeof Number,
          AttrSerializer<unknown>,
          AttrSerializable<unknown>
        > = numberSerializer;
        let _numberAttrResult2: typeof numberSerializer =
            {} as ResolveSerializer<
              typeof Number,
              AttrSerializer<unknown>,
              AttrSerializable<unknown>
            >;

        let _booleanElResult1: ResolveSerializer<
          typeof Boolean,
          ElementSerializer<unknown, any>,
          ElementSerializable<unknown, any>
        > = booleanSerializer;
        let _booleanElResult2: typeof booleanSerializer =
            {} as ResolveSerializer<
              typeof Boolean,
              ElementSerializer<unknown, any>,
              ElementSerializable<unknown, any>
            >;

        let _booleanAttrResult1: ResolveSerializer<
          typeof Boolean,
          AttrSerializer<unknown>,
          AttrSerializable<unknown>
        > = booleanSerializer;
        let _booleanAttrResult2: typeof booleanSerializer =
            {} as ResolveSerializer<
              typeof Boolean,
              AttrSerializer<unknown>,
              AttrSerializable<unknown>
            >;

        let _bigintElResult1: ResolveSerializer<
          typeof BigInt,
          ElementSerializer<unknown, any>,
          ElementSerializable<unknown, any>
        > = bigintSerializer;
        let _bigintElResult2: typeof bigintSerializer =
            {} as ResolveSerializer<
              typeof BigInt,
              ElementSerializer<unknown, any>,
              ElementSerializable<unknown, any>
            >;

        let _bigintAttrResult1: ResolveSerializer<
          typeof BigInt,
          AttrSerializer<unknown>,
          AttrSerializable<unknown>
        > = bigintSerializer;
        let _bigintAttrResult2: typeof bigintSerializer =
            {} as ResolveSerializer<
              typeof BigInt,
              AttrSerializer<unknown>,
              AttrSerializable<unknown>
            >;
      };
    });

    it('resolves serializer types', () => {
      expect().nothing();
      () => {
        const elSerializer = {} as ElementSerializer<number, Element>;
        const _elSerializerResult1: ResolveSerializer<
          typeof elSerializer,
          ElementSerializer<unknown, any>,
          ElementSerializable<unknown, any>
        > = elSerializer;
        const _elSerializerResult2: typeof elSerializer =
            {} as ResolveSerializer<
              typeof elSerializer,
              ElementSerializer<unknown, any>,
              ElementSerializable<unknown, any>
            >;

        const attrSerializer = {} as AttrSerializer<number>;
        const _attrSerializerResult1: ResolveSerializer<
          typeof attrSerializer,
          AttrSerializer<unknown>,
          AttrSerializable<unknown>
        > = attrSerializer;
        const _attrSerializerResult2: typeof attrSerializer =
            {} as ResolveSerializer<
              typeof attrSerializer,
              AttrSerializer<unknown>,
              AttrSerializable<unknown>
            >;
      };
    });

    it('resolves serializable types', () => {
      expect().nothing();
      () => {
        const elSerializer = {} as ElementSerializer<number, Element>;
        const elSerializable = { [toSerializer]: () => elSerializer };
        const _elSerializableResult: ResolveSerializer<
          typeof elSerializable,
          ElementSerializer<unknown, any>,
          ElementSerializable<unknown, any>
        > = elSerializer;
        const _elSerializableResult2: typeof elSerializer =
            {} as ResolveSerializer<
              typeof elSerializable,
              ElementSerializer<unknown, any>,
              ElementSerializable<unknown, any>
            >;

        const attrSerializer = {} as AttrSerializer<number>;
        const attrSerializable = { [toSerializer]: () => attrSerializer };
        const _attrSerializableResult1: ResolveSerializer<
          typeof attrSerializable,
          AttrSerializer<unknown>,
          AttrSerializable<unknown>
        > = attrSerializer;
        const _attrSerializableResult2: typeof attrSerializer =
            {} as ResolveSerializer<
              typeof attrSerializable,
              AttrSerializer<unknown>,
              AttrSerializable<unknown>
            >;

        const fullSerializer = {} as
            ElementSerializer<number, Element> & AttrSerializer<number>;
        const fullSerializable = { [toSerializer]: () => fullSerializer };
        const _fullSerializableResult1: ResolveSerializer<
          typeof fullSerializable,
          AttrSerializer<unknown>,
          AttrSerializable<unknown>
        > = fullSerializer;
        const _fullSerializableResult2: typeof fullSerializer =
            {} as ResolveSerializer<
              typeof fullSerializable,
              AttrSerializer<unknown>,
              AttrSerializable<unknown>
            >;
      };
    });

    it('throws a compile-time error for serializer types of the wrong form (element vs attr)', () => {
      expect().nothing();
      () => {
        const elSerializer = {} as ElementSerializer<number, Element>;
        let result1 /* : never */ = {} as ResolveSerializer<
          typeof elSerializer,
          AttrSerializer<unknown>,
          AttrSerializable<unknown>
        >;
        // @ts-expect-error
        result1 = elSerializer;

        const attrSerializer = {} as AttrSerializer<number>;
        let result2 /* : never */ = {} as ResolveSerializer<
          typeof attrSerializer,
          ElementSerializer<unknown, any>,
          ElementSerializable<unknown, any>
        >;
        // @ts-expect-error
        result2 = attrSerializer;
      };
    });
  });
});
