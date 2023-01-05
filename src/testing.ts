import { GetProps } from './functional.js';

/**
 * Queries for an element with the given selector in the document and asserts a single result
 * was found. Returns a `Dehydrated` `Element` instance which can be hydrated to its intended
 * type.
 */
export function query<Clazz extends Class<Element>>(selector: string, clazz: Clazz):
    DehydratedInstanceType<DehydratedClass<Clazz>> {
  const [ el, ...rest ] = queryAll(selector, clazz);
  if (rest.length !== 0) throw new Error(`Multiple elements matched selector \`${selector}\`, expected only one.`);

  return el;
}

/**
 * Queries for elements with the given selector in the document and asserts a single result
 * was found. Returns a `Dehydrated` `Element` instance which can be hydrated to its intended
 * type.
 */
export function queryAll<Clazz extends Class<Element>>(selector: string, clazz: Clazz):
    OneOrMore<DehydratedInstanceType<DehydratedClass<Clazz>>> {
  const els = Array.from(document.querySelectorAll(selector));

  if (els.length === 0) throw new Error(`No element matched selector \`${selector}\`.`);

  for (const el of els) {
    if (!(el instanceof clazz)) {
      throw new Error(`Expected \`${selector}\` to be an instance of \`${
        clazz.name}\`, but got an instance of \`${(el as Element).constructor.name}\` instead.`);
    }
  }

  return els as OneOrMore<DehydratedInstanceType<DehydratedClass<Clazz>>>;
}

interface Hydratable<Clazz extends Class<Element>> {
  readonly __hydrated__?: Clazz;
}
type DehydratedInstanceType<Clazz extends DehydratedClass<Class<Element>>> = InstanceType<Clazz> & Hydratable<HydratedClass<Clazz>>;
type DehydratedClass<Clazz extends Class<Element>> = Class<Element> & Hydratable<Clazz>;
type HydratedClass<Clazz extends Class<Element>> = Clazz extends DehydratedClass<infer Hydrated> ? Hydrated : never;

type Class<T> = new (...args: unknown[]) => T;
type OneOrMore<T> = [ T, ...T[] ];

/**
 * Hydrates the given element by assigning all the given properties and then removing the
 * `defer-hydration` attribute. Also asserts that `defer-hydration` is present prior to
 * removing it to ensure the element was not previously hydrated.
 */
export function hydrate<Clazz extends Class<Element>>(
  el: DehydratedInstanceType<DehydratedClass<Clazz>>,
  // `props` can be omitted if the element does not have any required properties.
  ...[ props = {} as any ]: (
    {} extends GetProps<Clazz>
      ? [ props?: GetProps<Clazz> ]
      : [ props: GetProps<Clazz> ]
  )
): asserts el is InstanceType<Clazz> {
  // Assert that the element was properly deferred, or else it will hydrate before the test
  // has a chance to run.
  if (!el.hasAttribute('defer-hydration')) {
    throw new Error(`Expected element to be deferred, but it was already hydrated. Did you forget \`defer-hydration\`?`);
  }

  // Assign all the provided props values.
  for (const [ key, value ] of Object.entries(props)) {
    (el as any)[key] = value;
  }

  // Hydrate the element.
  el.removeAttribute('defer-hydration');
}
