/** @fileoverview Defines utilities related to hydration. */

/**
 * Hydrates the given custom element according to the `defer-hydration`
 * community protocol.
 *
 * @see https://github.com/webcomponents-cg/community-protocols/pull/15/
 *
 * `clazz` isn't strictly necessary for this function, as it doesn't actually
 * *do* anything with that value. All that is done is an `instanceof` check to
 * make sure the correct `clazz` was given. However, it is useful to require the
 * class here because doing so ensures that the class definition is loaded prior
 * to hydration. Without this, there is little to no guarantee that the custom
 * element being hydrated is actually defined on the page to react to the
 * hydration.
 *
 * Technically, even having the class definition does not guarantee that
 * `customElements.define` was called for that custom element. However the
 * typical pattern is to declare a class and call `customElements.define` in the
 * top-level scope of the same file, so this is the closest guarantee we can
 * get.
 *
 * @param el The element instance to hydrate.
 * @param clazz The class of the element being hydrated.
 * @throws when the input element is a custom element which has not been defined
 *     yet.
 * @throws when the input element is not an instance of the provided class.
 * @throws if the input element is already hydrated.
 */
export function hydrate<ElementClass extends typeof Element>(
  el: Dehydrated<ElementClass>,
  clazz: ElementClass,
): asserts el is InstanceType<ElementClass> {
  // Make sure the custom element was defined prior to hydration.
  const tagName = el.tagName.toLowerCase();
  if (el.tagName.includes('-') && !customElements.get(tagName)) {
    throw new Error(`Cannot hydrate a \`${
        tagName}\` because its a custom element which has not been defined yet. Are you sure \`${
        clazz.name}\` is the right class and it was defined with \`customElements.define\` prior to hydration?`);
  }

  // Make sure we were given the correct class. This might seem unnecessary
  // since we ensure the class was defined above, however if there is no hard
  // dependency between the caller of this function and the component being
  // hydrated the ordering of this call compared to the `customElements.define`
  // call of the hydrated element would be unstable. Bundlers would be free to
  // order the two states in any order for any reason, yet only one order would
  // actually work. Therefore we need a logical dependency on the class to
  // ensure bundlers consistently order the two states correctly, rather than
  // getting it right by coincidence, and then breaking randomly when the
  // bundler updates.
  if (!(el instanceof clazz)) {
    throw new Error(`Expected element to be an instance of \`${
        clazz.name}\` but got \`${(el as Element).constructor.name}\`.`);
  }

  // Make sure the component has not already hydrated.
  if (!el.hasAttribute('defer-hydration')) {
    throw new Error(`Element \`${
        el.constructor.name}\` already hydrated, cannot hydrate it again.`);
  }

  // Synchronously trigger hydration via `attributeChangedCallback`.
  // This does not propagate errors thrown in `attributeChangedCallback`,
  // meaning `hydrate` will *not* throw if the underlying component throws an
  // error during its hydration. Sadly there's nothing we can do about this.
  // See: https://github.com/webcomponents-cg/community-protocols/pull/15#issuecomment-1962284394
  el.removeAttribute('defer-hydration');
}

/**
 * Represents an element of type `El` which has not yet been hydrated. Because
 * the element has not hydrated yet, it does not support any of the methods or
 * functionality on that type and is functionally just an {@link Element}.
 *
 * However, we keep a reference to the hydrated form of the type, which can be
 * used for type inference which converts the dehydrated form into the hydrated
 * form of the same element.
 *
 * This utility uses the element's class type instead of its instance type so
 * it retains more information about the underlying element, including static
 * members which would be lost
 */
export type Dehydrated<ElementClass extends typeof Element> = Element & {
  __haHydrated__?: ElementClass;
};
