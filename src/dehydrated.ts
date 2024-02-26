import { ElementAccessor } from './element-accessor.js';
import { Queryable } from './queryable.js';

function isHydrated(el: Element): boolean {
  return !el.hasAttribute('defer-hydration');
}

function hydrate(el: Element): void {
  el.removeAttribute('defer-hydration');
}

/** TODO */
export class Dehydrated<El extends Element> extends Queryable<El> {
  private constructor(public readonly native: El) {
    super(native);
  }

  /** TODO */
  public static override from<El extends Element>(native: El): Dehydrated<El> {
    return new Dehydrated(native);
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
