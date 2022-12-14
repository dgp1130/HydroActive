import { HydratableElement, live } from 'hydroactive/class.js';

/** Holds two buttons and dispatches events whenever they are clicked. */
class EventDispatcher extends HydratableElement {
  protected override hydrate(): void {
    this.listen(this.query('#decrement'), 'click', () => {
      this.dispatchEvent(new Event('count-decrement', { bubbles: true }));
    });

    this.listen(this.query('#increment'), 'click', () => {
      this.dispatchEvent(new Event('count-increment', { bubbles: true }));
    });
  }
}

customElements.define('event-dispatcher-class', EventDispatcher);

declare global {
  interface HTMLElementTagNameMap {
    'event-dispatcher-class': EventDispatcher;
  }
}

/**
 * Holds the current count and updates the value based on a descendent node
 * dispatching the `count-increment` and `count-decrement` events.
 */
class EventHandler extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    this.listen(this, 'count-decrement', () => { this.count--; });
    this.listen(this, 'count-increment', () => { this.count++; });
  }
}

customElements.define('event-handler-class', EventHandler);

declare global {
  interface HTMLElementTagNameMap {
    'event-handler-class': EventHandler;
  }
}
