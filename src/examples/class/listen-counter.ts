import { HydratableElement, live } from 'hydrator/class.js';

class ListenCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    // Easy imperative querying of the shadow DOM. Does 3 things:
    // 1. Automatically scopes to the shadow DOM.
    // 2. Asserts the result exists (throws instead of returning `null`).
    // 3. Types the output based on the tag name (`button` -> `HTMLButtonElement`).
    const increment = this.query('button#increment');
    const decrement = this.query('button#decrement');

    // Easy binding of events. Automatically adds and removes the listener when the
    // component is connected or disconnected from the DOM.
    this.listen(increment, 'click', () => { this.count++; });
    this.listen(decrement, 'click', () => { this.count--; });
  }
}

customElements.define('listen-counter-class', ListenCounter);

declare global {
  interface HTMLElementTagNameMap {
    'listen-counter-class': ListenCounter;
  }
}
