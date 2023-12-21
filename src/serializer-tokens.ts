import { ElementSerializer, ElementSerializable, AttrSerializer, AttrSerializable, stringSerializer, numberSerializer, booleanSerializer, bigintSerializer, toSerializer, Serialized } from './serializers.js';
import { elementSerializer } from './serializers/primitive-serializers.js';

// Tokens which reference `Serializer` objects for primitive types, filtered
// down only to those which extend the given input type.
type PrimitiveSerializerToken<Value> =
  | Value extends string ? typeof String : never
  | Value extends number ? typeof Number : never
  | Value extends boolean ? typeof Boolean : never
  | Value extends bigint ? typeof BigInt : never
;

/**
 * Tokens which can be exchanged for an {@link ElementSerializer} object.
 * {@link ElementSerializer} objects are treated as tokens which can be
 * exchanged for themselves.
 */
export type ElementSerializerToken<Value, El extends Element> =
  | PrimitiveSerializerToken<Value>
  | ElementSerializer<Value, El>
  | ElementSerializable<Value, El>
  | Value extends Element ? Value : never
;

/**
 * Tokens which can be exchanged for an {@link AttrSerializer} object.
 * {@link AttrSerializer} objects are treated as tokens which can be exchanged
 * for themselves.
 */
export type AttrSerializerToken<Value> =
  | PrimitiveSerializerToken<Value>
  | AttrSerializer<Value>
  | AttrSerializable<Value>
;

/**
 * A token for either an {@link ElementSerializer} or an {@link AttrSerializer}.
 */
export type SerializerToken<Value> =
  ElementSerializerToken<Value, any> | AttrSerializerToken<Value>;

/**
 * Resolves and returns the {@link ElementSerializer} or {@link AttrSerializer}
 * referenced by the provided token. Token literals should be statically
 * analyzable enough for the type system to compute the actual return type of
 * this function and use it for type inference.
 */
export function resolveSerializer<
  Token extends SerializerToken<any>,
  SerializerKind extends
    | ElementSerializer<unknown, any>
    | AttrSerializer<unknown>,
  SerializableKind extends
    | ElementSerializable<unknown, any>
    | AttrSerializable<unknown>,
>(token: Token): ResolveSerializer<
  Token,
  SerializerKind,
  SerializableKind
> {
  // Resolve primitive tokens.
  switch (token) {
    case String: {
      return stringSerializer as
          ResolveSerializer<Token, SerializerKind, SerializableKind>;
    } case Number: {
      return numberSerializer as
          ResolveSerializer<Token, SerializerKind, SerializableKind>;
    } case Boolean: {
      return booleanSerializer as
          ResolveSerializer<Token, SerializerKind, SerializableKind>;
    } case BigInt: {
      return bigintSerializer as
          ResolveSerializer<Token, SerializerKind, SerializableKind>;
    }
  }

  // Resolve serializable tokens.
  if (toSerializer in (token as Record<string, unknown>)) {
    type Serializable =
      | ElementSerializable<unknown, any>
      | AttrSerializable<unknown>
    ;
    return (token as Serializable)[toSerializer]() as
        ResolveSerializer<Token, SerializerKind, SerializableKind>;
  }

  // Resolve `Element` tokens.
  if (staticExtends(token, Element)) {
    return elementSerializer as
        ResolveSerializer<Token, SerializerKind, SerializableKind>;
  }

  // Resolve `Serializer` tokens, they already are a `Serializer`!
  return token as
      ResolveSerializer<Token, SerializerKind, SerializableKind>;
}

/**
 * Computes the return type of a resolved {@link ElementSerializer} or
 * {@link AttrSerializer} object for a given token.
 *
 * @param Token The {@link SerializerToken} to resolve.
 * @param SerializerKind The kind of serializer to accept. This *must* be either
 *     `ElementSerializer<unknown, any>` or `AttrSerializer<unknown>`. Do *not*
 *     use other generics such as `ElementSerializer<unknown, Element>`, as this
 *     would exclude valid serializers due to contra-variance requirements on
 *     the serializer type.
 * @param SerializerKind The kind of serializable to accept. This *must* be
 *     either `ElementSerializer<unknown, any>` or `AttrSerializer<unknown>`. Do
 *     *not* use other generics such as `ElementSerializer<unknown, Element>`,
 *     as this would exclude valid serializers due to contra-variance
 *     requirements on the serializer type.
 * @returns The resolved {@link Serializer} type, or `never` if none is found.
 */
export type ResolveSerializer<
  // The token to resolve.
  Token extends SerializerToken<any>,
  // Whether to resolve to element or attribute serializers.
  SerializerKind extends
    | ElementSerializer<unknown, any>
    | AttrSerializer<unknown>,
  // Whether to resolve to element or attribute serializables.
  SerializableKind extends
    | ElementSerializable<unknown, any>
    | AttrSerializable<unknown>,
> = Token extends SerializableKind
  ? ReturnType<Token[typeof toSerializer]>
  : Token extends SerializerKind
    ? Token
    : Token extends typeof Element
      ? InstanceType<Token> extends ElementOf<SerializerKind>
        ? ElementSerializer<InstanceType<Token>, InstanceType<Token>>
        : never
      : Token extends typeof String
        ? typeof stringSerializer
        : Token extends typeof Number
          ? typeof numberSerializer
          : Token extends typeof Boolean
            ? typeof booleanSerializer
            : Token extends typeof BigInt
              ? typeof bigintSerializer
              : never
;

type ElementOr<Token, Alternative> = Token extends typeof Element
  ? InstanceType<Token>
  : Alternative
;

type ElementOf<SerializerKind extends
  | ElementSerializer<unknown, any>
  | AttrSerializer<unknown>
> = SerializerKind extends ElementSerializer<unknown, infer El> ? El : never;

/** TODO: `instanceof` but for classes instead of instances. */
function staticExtends(maybeChild: unknown, parent: unknown): boolean {
  if (maybeChild === null || maybeChild === undefined) return false;

  for (const proto of prototypeChain(maybeChild)) {
    if (proto === parent) return true;
  }

  return false;
}

function* prototypeChain(obj: unknown): Generator<unknown, void, void> {
  const proto = Object.getPrototypeOf(obj);
  if (proto === null) return;

  yield proto;
  yield* prototypeChain(proto);
}
