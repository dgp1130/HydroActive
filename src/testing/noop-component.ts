import { ComponentRef, ElementRef } from 'hydroactive';
import { HydroActiveComponent } from '../hydroactive-component.js';

/**
 * A component which does nothing on hydration. Useful for tests which need a
 * component but don't require it to actually do anything. This avoids each test
 * defining its own components and potentially conflicting tag names.
 */
export class NoopComponent extends HydroActiveComponent {
  #ref!: ComponentRef;

  public constructor() {
    super();

    this.#ref = ComponentRef._from(ElementRef.from(this));
    this._registerComponentRef(this.#ref);
  }

  protected override hydrate(): void { /* no-op */ }

  public getComponentRef(): ComponentRef {
    return this.#ref;
  }
}

customElements.define('noop-component', NoopComponent);

declare global {
  interface HTMLElementTagNameMap {
    'noop-component': NoopComponent;
  }
}
