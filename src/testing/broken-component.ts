import { ComponentRef, ElementRef } from 'hydroactive';
import { HydroActiveComponent } from '../hydroactive-component.js';

/** A component which throws an error on hydration. */
abstract class BrokenComponent extends HydroActiveComponent {
  #ref!: ComponentRef;
  #error: unknown;

  public constructor(error: unknown) {
    super();
    this.#error = error;

    this.#ref = ComponentRef._from(ElementRef.from(this));
    this._registerComponentRef(this.#ref);
  }

  protected override hydrate(): void {
    throw this.#error;
  }

  public getComponentRef(): ComponentRef {
    return this.#ref;
  }
}

/** Defines a new component class which throws the given error on hydration. */
export function defineBrokenComponent(tagName: string, error: unknown): {
  new(): BrokenComponent,
} {
  class Broken extends BrokenComponent {
    public constructor() {
      super(error);
    }
  }

  customElements.define(tagName, Broken);

  return Broken;
}
