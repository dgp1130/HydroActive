/**
 * @fileoverview Provides primitives to easily implement the on-demand
 * definitions community protocol.
 *
 * @see https://github.com/webcomponents-cg/community-protocols/pull/67
 */

/**
 * Defines the custom element.
 *
 * @param registry The registry to define the custom element in. Defaults to the
 *     global {@link customElements} registry.
 * @param tagName The tag name to define the custom element as. Uses a default
 *     tag name when not specified. Using an explicit tag name is only supported
 *     when using a non-global registry
 */
export type Define =
    (registry?: CustomElementRegistry, tagName?: string) => void;

/**
 * A class definition which implements the on-demand definitions community
 * protocol.
 *
 * Note that because `define` is static, this type should be applied to the
 * custom element class type, not the instance type.
 *
 * ```typescript
 * class MyElement extends HTMLElement {
 *   static define() { ... }
 * }
 *
 * const definable = MyElement as Defineable;
 * ```
 */
export interface Defineable {
  /**
   * Defines the custom element.
   *
   * @param registry The registry to define the custom element in. Defaults to
   *     the global {@link customElements} registry.
   * @param tagName The tag name to define the custom element as. Uses a default
   *     tag name when not specified. Using an explicit tag name is only
   *     supported when a using non-global registry
   */
  define: Define;
}

/**
 * Defines the provided custom element in the global registry if that element
 * implements the on-demand definitions community protocol.
 *
 * @param Clazz The custom element class to define.
 */
export function defineIfSupported(Clazz: typeof Element): void {
  (Clazz as Partial<Defineable>).define?.();
}

/**
 * Creates a {@link Define} function which defines the given custom element with
 * the default tag name. The returned function should be used as the static
 * `define` function in a {@link Defineable} custom element.
 *
 * @param defaultTagName The tag name to use in the global registry and by
 *     default for scoped registries.
 * @param Clazz The custom element class to define.
 * @param options Options for the {@link CustomElementRegistry.prototype.define}
 *     call.
 */
export function createDefine(
  defaultTagName: string,
  Clazz: typeof HTMLElement,
  options?: ElementDefinitionOptions,
): Define {
  return (registry = customElements, tagName = defaultTagName) => {
    // Tag name can only be modified when not in the global registry.
    if (registry === customElements && tagName !== defaultTagName) {
      throw new Error('Cannot use a non-default tag name in the global custom element registry.');
    }

    // Check if the tag name was already defined by another class.
    const existing = registry.get(tagName);
    if (existing) {
      if (existing === Clazz) {
        return; // Already defined as the correct class, no-op.
      } else {
        throw new Error(`Tag name \`${tagName}\` already defined as \`${
            existing.name}\`.`);
      }
    }

    // Define the class.
    registry.define(tagName, Clazz, options);
  };
}
