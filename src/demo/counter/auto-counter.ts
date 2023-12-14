import { Component, ElementRef, property, query } from 'hydroactive';

// Need to define explicitly an interface.
interface State {
  count: number;
}

class AutoCounter extends Component<State> {
  @property()
  public accessor incrementBy = 2;

  // TODO: Should require the element class to guarantee that subcomponents are
  // defined. Should *not* be a serializer because we don't care about
  // serialization at this stage. Serializer should always be defined at
  // read/write time because a single element may use multiple serializers for
  // different attributes or at different times. Also `label` may never have
  // `read` / `write` called at all, so it is kind of equivalent to
  // `comp.host.query` in that respect.
  @query('span')
  private accessor label!: ElementRef<HTMLSpanElement>;

  protected override onHydrate(): State {
    const count = this.label.read(Number);

    // Can't use `this.state` here or in any called function.
    // `this.state.count` -> Error.
    // At least can do a decent error. Is this really better than
    // `@property() private count!: number` (or `private count?: number`)?
    //
    // Argument: Maybe? `this.state` throws a clear error message.
    // `private count?: number` is also vague about the developer's intent. Can
    // `count` ever become `undefined` after initialization? With a `State`
    // interface, the initialized and uninitialized states are more clear. Comes
    // at the cost of HydroActive-specific semantics for state though.

    this.comp.connected(() => {
      const id = setInterval(() => {
        // Too easy to use `count` here, though `const` should stop it?
        // Weird that we're using `this.state` in `onHydrate`, but it's ok
        // because it's a closure invoked later.
        this.state.count += this.incrementBy;
      }, 1_000);

      return () => clearInterval(id);
    });

    // Not clear what happens to this return value. Becomes `this.state` initial
    // value in a not-so-obvious way.
    return { count };
  }

  protected override update(): void {
    // All the writes get colocated, no fine-grained reactivity.
    this.label.write(this.state.count);
  }

  // Have to prefix `this.state` everywhere except the `hydrate` function.
  public increment(): void {
    this.state.count++;
  }

  public decrement(): void {
    this.state.count--;
  }
}

customElements.define('auto-counter', AutoCounter);

declare global {
  interface HTMLElementTagNameMap {
    'auto-counter': AutoCounter;
  }
}
