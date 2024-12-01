import { Connectable, Connector } from './connectable.js';
import { StabilityTracker } from './signals/schedulers/stability-tracker.js';
import { UiScheduler } from './signals/schedulers/ui-scheduler.js';

/**
 * A map of {@link HydroActiveComponent} elements to their associated
 * {@link ElementInternals}. This mapping can be imported internally within
 * HydroActive without making the internals accessible outside the component
 * (such as on an `_internals` property).
 *
 * We really only care about a closed shadow root on this type, however a closed
 * shadow root can be attached at any time, not just on custom element
 * construction. Therefore, we keep a reference to the entire
 * {@link ElementInternals} object in case a closed shadow root is attached in
 * the future and appears on this object.
 */
const internalsMap =
    new WeakMap<HydroActiveComponent, ElementInternals>();

/** Export the type as readonly so no one else messes with the contents. */
export const elementInternalsMap =
    internalsMap as ReadonlyWeakMap<HydroActiveComponent, ElementInternals>;
export type ReadonlyWeakMap<Key extends object, Value> =
    Pick<WeakMap<Key, Value>, 'get' | 'has'>;

/** Abstract base class for all HydroActive components. */
export abstract class HydroActiveComponent extends HTMLElement {
  /** Whether or not the component has been hydrated. */
  #hydrated = false;

  protected _tracker = StabilityTracker.from();
  protected _scheduler = UiScheduler.from();

  constructor() {
    super();

    internalsMap.set(this, this.attachInternals());
  }

  #connector = Connector.from(() => this.isConnected);
  public /* internal */ get _connectable(): Connectable {
    return this.#connector;
  }

  /** User-defined lifecycle hook invoked on hydration. */
  protected abstract hydrate(): ComponentDefinition | void;

  connectedCallback(): void {
    this.#connector.connect();

    this.#requestHydration();
  }

  disconnectedCallback(): void {
    this.#connector.disconnect();
  }

  // Trigger hydration when the `defer-hydration` attribute is removed.
  static get observedAttributes(): string[] { return ['defer-hydration']; }
  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === 'defer-hydration' && newValue === null) {
      this.#requestHydration();
    }
  }

  /** Hydrates the component if not already hydrated. Otherwise does nothing. */
  #requestHydration(): void {
    if (this.#hydrated) return;
    if (this.hasAttribute('defer-hydration')) return;

    this.#hydrated = true;
    this.hydrate();
  }

  /**
   * Returns a {@link Promise} which resolves when this component is stable. A
   * component is "stable" when there are no pending DOM operations scheduled.
   *
   * @returns A {@link Promise} which resolves when this component is stable.
   */
  public async stable(): Promise<void> {
    return await this._scheduler.stable();
  }
}

/** The properties to apply to a component after hydration. */
export type ComponentDefinition = Record<string | number | symbol, unknown>;

/**
 * Applies the given {@link ComponentDefinition} to the provided {@link comp} by
 * assigning all its properties.
 *
 * @throws when the component has already defined a property specified in the
 *     definition.
 */
export function applyDefinition<CompDef extends ComponentDefinition>(
  comp: HydroActiveComponent,
  compDef: CompDef,
): asserts comp is HydroActiveComponent & CompDef {
  for (const [key, value] of Object.entries(compDef)) {
    if (key in comp) {
      throw new Error(`Cannot redefine existing property \`${key}\`.`);
    }

    (comp as unknown as Record<string | number | symbol, unknown>)[key] = value;
  }
}
