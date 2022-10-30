import { HydratableElement, live } from 'hydrator';

class LiveCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    setInterval(() => { this.count++; }, 1_000);
  }
}

customElements.define('live-counter', LiveCounter);

declare global {
  interface HTMLElementTagNameMap {
    'live-counter': LiveCounter;
  }
}
