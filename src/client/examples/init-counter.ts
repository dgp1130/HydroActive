import { HydratableElement, init, property } from '../lib/hydrator.js';

class InitCounter extends HydratableElement {
    // Use `init()` to infer the type automatically and reduce duplication.
    // Looks nice, but is actually hackier and less efficient than `@hydrate`.
    // `init()` actually returns a placeholder `Symbol` which then gets replaced on
    // hydration, so it lies and repeats unnecessary work per-object.
    @property private count = init(this, 'span', Number);
    private counter = init(this, 'span', HTMLSpanElement);
  
    protected override hydrate(): void {
        this.bind('#increment', 'click', () => this.count++);
        this.bind('#decrement', 'click', () => this.count--);
    }

    protected override update(): void {
        this.counter.textContent = this.count.toString();
    }
}

customElements.define('init-counter', InitCounter);
