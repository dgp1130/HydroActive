import { ElementAccessor } from './element-accessor.js';
import { QueriedElement } from './query.js';
import { Queryable, queryEl } from './queryable.js';

function isHydrated(el: Element): boolean {
  return !el.hasAttribute('defer-hydration');
}

function hydrate(el: Element): void {
  el.removeAttribute('defer-hydration');
}

/** TODO */
export class Dehydrated<El extends Element> implements Queryable<El> {
  private constructor(public readonly native: El) {}

  /** TODO */
  public static from<El extends Element>(native: El): Dehydrated<El> {
    return new Dehydrated(native);
  }

  /** TODO */
  public query<Selector extends string>(selector: Selector):
      Dehydrated<QueriedElement<Selector, El>> {
    const result = queryEl(this.native, selector);
    return Dehydrated.from(result);
  }

  /** TODO */
  public access(elementClass?: typeof Element): ElementAccessor<El> {
    return ElementAccessor.from(this.native, elementClass);
  }

  /** TODO */
  public hydrate(elementClass: typeof Element): ElementAccessor<El> {
    // TODO: Does this support hydrating native elements like `div`?

    if (!(this.native instanceof elementClass)) {
      throw new Error('Wrong element class.'); // TODO
    }

    if (isHydrated(this.native)) {
      throw new Error('Already hydrated.'); // TODO
    }

    hydrate(this.native);

    return ElementAccessor.from(this.native, elementClass);
  }
}
