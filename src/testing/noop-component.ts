import { ComponentAccessor } from '../component-accessor.js';
import { ComponentRef } from '../component-ref.js';
import { ReactiveRoot } from '../signals.js';
import { ReactiveRootImpl } from '../signals/reactive-root.js';
import { HydroActiveComponent } from '../hydroactive-component.js';
import { UiScheduler } from '../signals/schedulers/ui-scheduler.js';

/**
 * A component which does nothing on hydration. Useful for tests which need a
 * component but don't require it to actually do anything. This avoids each test
 * defining its own components and potentially conflicting tag names.
 */
export class NoopComponent extends HydroActiveComponent {
  #ref!: ComponentRef;
  #accessor!: ComponentAccessor<this>;

  public readonly root: ReactiveRoot;

  public hydrated?: true;

  public constructor() {
    super();

    const scheduler = UiScheduler.from();
    this.#accessor = ComponentAccessor.fromComponent(this);
    this.root = ReactiveRootImpl.from(this.#accessor, scheduler);
    this.#ref = ComponentRef._from(this.root, scheduler);
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
