import { ComponentRef } from './component-ref.js';
import { ElementAccessor } from './element-accessor.js';
import { ElementSerializerToken, resolveSerializer } from './serializer-tokens.js';
import { ElementSerializer } from './serializers.js';
import { Signal } from './signals.js';

/** Elements whose text content is currently bound to a reactive signal. */
const boundElements = new WeakSet<Element>();

/**
 * Invokes the given signal in a reactive context, serializes the result, and
 * renders it to the underlying element of this {@link ElementAccessor}.
 * Automatically re-renders whenever a signal dependency is modified.
 *
 * Automatically disables and re-enables itself based on the lifecycle of the
 * provided {@link ComponentRef}.
 *
 * @param el The {@link ElementAccessor} to bind to.
 * @param comp The {@link ComponentRef} to create the effect on. This
 *     {@link bind} call will disable / re-enable itself based on lifecycle of
 *     this {@link ComponentRef}.
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
  comp: ComponentRef,
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
  comp.effect(() => {
    // Invoke the user-defined callback in a reactive context.
    const value = sig();

    // Update the DOM with the new value.
    serializer.serializeTo(value, el.element);
  });
}
