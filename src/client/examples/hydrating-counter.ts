import { HydratableElement, live } from '../lib/hydrator.js';

class HydratingCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    const decrement = this.listen('button#decrement', 'click', () => { this.count--; });
    decrement.disabled = false;

    const increment = this.listen('button#increment', 'click', () => { this.count++; });
    increment.disabled = false;

    const label = document.createElement('div');
    label.textContent = 'Hi, I\'m CSR\'d! These buttons are also disabled until their event listeners are loaded.';
    this.shadowRoot!.append(label);
  }
}

customElements.define('hydrating-counter', HydratingCounter);
