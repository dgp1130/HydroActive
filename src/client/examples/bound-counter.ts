import { HydratableElement, live } from '../lib/hydrator.js';

class BoundCounter extends HydratableElement {
    @live('span', Number)
    private count!: number;

    protected override hydrate(): void {
        // Easy binding of events. Automatically removes the listener when disconnected.
        this.bind('#increment', 'click', () => this.count++);
        this.bind('#decrement', 'click', () => this.count--);
    }
}

customElements.define('bound-counter', BoundCounter);
