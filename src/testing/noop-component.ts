import { ComponentAccessor } from '../component-accessor.js';
import { ComponentRef } from '../component-ref.js';
import { HydroActiveComponent } from '../hydroactive-component.js';

/**
 * A component which does nothing on hydration. Useful for tests which need a
 * component but don't require it to actually do anything. This avoids each test
 * defining its own components and potentially conflicting tag names.
 */
export class NoopComponent extends HydroActiveComponent {
  #ref!: ComponentRef;
  #accessor!: ComponentAccessor<this>;

  public hydrated?: true;

  public constructor() {
    super();

    this.#accessor = ComponentAccessor.fromComponent(this);
    this.#ref = ComponentRef._from(this.#accessor);
    this._registerComponentRef(this.#ref);
  }

  protected override hydrate(): void {
    this.hydrated = true;
  }

  public getComponentRef(): ComponentRef {
    return this.#ref;
  }

  public getComponentAccessor(): ComponentAccessor<this> {
    return this.#accessor;
  }
}

customElements.define('noop-component', NoopComponent);

declare global {
  interface HTMLElementTagNameMap {
    'noop-component': NoopComponent;
  }
}
