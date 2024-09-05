import { ElementAccessor } from './element-accessor.js';
import { ElementSerializerToken, ResolveSerializer, resolveSerializer } from './serializer-tokens.js';
import { ElementSerializable, ElementSerializer, Serialized } from './serializers.js';
import { ReactiveRoot, Signal, WriteableSignal, signal } from './signals.js';

/** Elements whose text content is currently bound to a reactive signal. */
const boundElements = new WeakSet<Element>();

/**
 * Creates a {@link WriteableSignal} initialized with the current value of the
 * provided {@link ElementAccessor} as interpreted by the referenced
 * {@link ElementSerializer}. Any mutations to the returned signal are
 * automatically reflected back into the {@link ElementAccessor}.
 *
 * Automatically disables and re-enables itself based on the lifecycle of the
 * provided {@link ReactiveRoot}.
 *
 * @param el The {@link ElementAccessor} to initialize from and bind to.
 * @param root The {@link ReactiveRoot} to create the effect on. This
 *     {@link live} call will disable / re-enable itself based on lifecycle of
 *     this provided {@link ReactiveRoot}.
 * @param token A "token" which identifiers an {@link ElementSerializer} to
 *     serialize the `signal` data to/from an element. A token is one of:
 *     *   A primitive serializer - {@link String}, {@link Boolean},
 *         {@link Number}, {@link BigInt}.
 *     *   An {@link ElementSerializer} object.
 *     *   An {@link ElementSerializable} object.
 * @returns A {@link WriteableSignal<El>} initialized to the deserialized form
 *     of the provided element. Mutations to the signal value are automatically
 *     serialized back into the same DOM.
 */
export function live<
  El extends Element,
  Token extends ElementSerializerToken<any, El>,
>(
  el: ElementAccessor<El>,
  root: ReactiveRoot,
  token: Token,
): WriteableSignal<Serialized<ResolveSerializer<
  Token,
  ElementSerializer<unknown, El>,
  ElementSerializable<unknown, El>
>>> {
  const serializer = resolveSerializer(token);
  const initial = el.read(serializer);
  const value = signal(initial);

  bind(el, root, serializer as any, value);

  return value as any;
}

/**
 * Invokes the given signal in a reactive context, serializes the result, and
 * renders it to the underlying element of this {@link ElementAccessor}.
 * Automatically re-renders whenever a signal dependency is modified.
 *
 * Automatically disables and re-enables itself based on the lifecycle of the
 * provided {@link ReactiveRoot}.
 *
 * @param el The {@link ElementAccessor} to bind to.
 * @param root The {@link ReactiveRoot} to create the effect on. This
 *     {@link bind} call will disable / re-enable itself based on lifecycle of
 *     this {@link ReactiveRoot}.
 * @param token A "token" which identifiers an {@link ElementSerializer} to
 *     serialize the `signal` result to an element. A token is one of:
 *     *   A primitive serializer - {@link String}, {@link Boolean},
 *         {@link Number}, {@link BigInt}.
 *     *   An {@link ElementSerializer} object.
 *     *   An {@link ElementSerializable} object.
 * @param sig The signal to invoke in a reactive context.
 */
export function bind<
  Value,
  El extends Element,
  Token extends ElementSerializerToken<Value, El>,
>(
  el: ElementAccessor<El>,
  root: ReactiveRoot,
  token: Token,
  sig: Signal<Value>,
): void {
  // Assert that the element is not already bound to another signal.
  if (boundElements.has(el.element)) {
    throw new Error(`Element is already bound to another signal, cannot bind it again.`);
  }
  boundElements.add(el.element);

  // Resolve the serializer immediately, since that isn't dependent on the
  // value and we don't want to do this for every invocation of effect.
  const serializer = resolveSerializer(token) as ElementSerializer<Value, El>;
  root.effect(() => {
    // Invoke the user-defined callback in a reactive context.
    const value = sig();

    // Update the DOM with the new value.
    serializer.serializeTo(value, el.element);
  });
}
