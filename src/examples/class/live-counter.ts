import { HydratableElement, live } from 'hydroactive/class.js';

class LiveCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    setInterval(() => { this.count++; }, 1_000);
  }
}

customElements.define('live-counter-class', LiveCounter);

declare global {
  interface HTMLElementTagNameMap {
    'live-counter-class': LiveCounter;
  }
}
