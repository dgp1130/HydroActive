import { property, HydratableElement, live, hydrate } from '../lib/hydrator.js';

/**
 * A component which hydrates and renders the current count. It is effectively
 * a stateless component.
 */
class CounterDisplay extends HydratableElement {
  @live('span', Number)
  public count!: number;
}

customElements.define('counter-display', CounterDisplay);

declare global {
  interface HTMLElementTagNameMap {
    'counter-display': CounterDisplay;
  }
}

/**
 * A component which hydrates from a child component prop and manages the state,
 * passing down to the child component's props on change.
 */
class StateHostCounter extends HydratableElement {
  @property
  @hydrate('counter-display', (el) => el.count)
  private count!: number;

  @hydrate('counter-display', CounterDisplay)
  private counterDisplay!: CounterDisplay;

  protected override hydrate(): void {
    this.listen(this.query('button#decrement'), 'click', () => { this.count--; });
    this.listen(this.query('button#increment'), 'click', () => { this.count++; });
  }

  protected override update(): void {
    this.counterDisplay.count = this.count;
  }
}

customElements.define('state-host-counter', StateHostCounter);

declare global {
  interface HTMLElementTagNameMap {
    'state-host-counter': StateHostCounter;
  }
}
