import { attr, bind, context, HydratableElement, hydrate, provide } from 'hydrator';
import * as ctx from 'hydrator/context.js';

/** Context to be provided and received with the current count. */
const countCtx = ctx.create<number>(Symbol('count'));

/** Parent component which provide the current count via context. */
class CountProvider extends HydratableElement {
  @hydrate(':host', Number, attr('count'))
  @provide(countCtx) // Provide this value to all descendent components.
  private count!: number;

  protected override hydrate(): void {
    this.listen(this.query('#decrement'), 'click', () => { this.count--; });
    this.listen(this.query('#increment'), 'click', () => { this.count++; });
  }
}

customElements.define('count-provider', CountProvider);

declare global {
  interface HTMLElementTagNameMap {
    'count-provider': CountProvider;
  }
}

/** Child component which receives the current count via context and displays it. */
class CountContextDisplay extends HydratableElement {
  @context(countCtx) // Receive the count from context and automatically update this property.
  @bind('span')
  private count!: number;
}

customElements.define('count-context-display', CountContextDisplay);

declare global {
  interface HTMLElementTagNameMap {
    'count-context-display': CountContextDisplay;
  }
}
