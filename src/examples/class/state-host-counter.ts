import { property, HydratableElement, live, hydrate } from 'hydrator/class.js';

/**
 * A component which hydrates and renders the current count. It is effectively
 * a stateless component.
 */
class CounterDisplay extends HydratableElement {
  @live('span', Number)
  public count!: number;
}

customElements.define('counter-display-class', CounterDisplay);

declare global {
  interface HTMLElementTagNameMap {
    'counter-display-class': CounterDisplay;
  }
}

/**
 * A component which hydrates from a child component prop and manages the state,
 * passing down to the child component's props on change.
 */
class StateHostCounter extends HydratableElement {
  @property
  @hydrate('counter-display-class', (el) => el.count)
  private count!: number;

  @hydrate('counter-display-class', CounterDisplay)
  private counterDisplay!: CounterDisplay;

  protected override hydrate(): void {
    this.listen(this.query('button#decrement'), 'click', () => { this.count--; });
    this.listen(this.query('button#increment'), 'click', () => { this.count++; });
  }

  protected override update(): void {
    this.counterDisplay.count = this.count;
  }
}

customElements.define('state-host-counter-class', StateHostCounter);

declare global {
  interface HTMLElementTagNameMap {
    'state-host-counter-class': StateHostCounter;
  }
}
