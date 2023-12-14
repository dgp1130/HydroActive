import { ComponentRef } from './component-ref.js';
import { ElementRef } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { Signal } from './signals.js';

/** TODO */
export abstract class Component<State extends {} = {}>
    extends HydroActiveComponent {
  // Declare the property non-nullable. This is handled during hydration.
  declare protected readonly comp: ComponentRef;

  protected readonly ref!: ElementRef<this>;

  #state: State | undefined;
  protected get state(): State {
    if (!this.#doneHydrating) {
      throw new Error('`state` is not accessible during hydration.');
    }

    return this.#state!;
  }
  private set state(newState: State) {
    // Wrap `state` in a `Proxy` which automatically requests a component update
    // whenever any property is set.
    this.#state = new Proxy(newState, {
      set: (
        target: State,
        prop: string | symbol,
        newValue: any,
        receiver: any,
      ): boolean => {
        const result = Reflect.set(target, prop, newValue, receiver);
        this.requestUpdate();
        return result;
      },
    });
  }

  protected get props(): Record<string, Signal<unknown>> {
    return new Proxy(this, {
      get(target: Component<State>, prop: string | symbol): Signal<unknown> {
        const propName = typeof prop === 'symbol' ? prop.description : prop;
        const internalProp = `_${propName}`;
        return (target as any)[internalProp];
      }
    }) as unknown as Record<string, Signal<unknown>>;
  }

  #updateScheduled = false;
  protected requestUpdate(): void {
    if (this.#updateScheduled) return;

    this.comp.schedule(() => {
      this.update();
      this.#updateScheduled = false;
    });
    this.#updateScheduled = true;
  }

  #doneHydrating = false;
  protected override hydrate(): void {
    (this as any).ref = ElementRef.from(this);
    this._registerComponentRef(ComponentRef._from(this.ref));

    for (const { propName, selector } of this.#queries) {
      (this as any)[propName] = this.ref.query(selector);
    }

    this.state = this.onHydrate() ?? ({} as State);
    this.#doneHydrating = true;
  }

  protected abstract onHydrate(): State | undefined;

  protected abstract update(): void;

  // TODO: `static`?
  #queries: QueryRecord[] = [];
  public _registerQuery(propName: string | symbol, selector: string): void {
    this.#queries.push({ propName, selector });
  }
}

interface QueryRecord {
  readonly propName: string | symbol;
  readonly selector: string;
}

type PropertyDecorator<Comp extends Component, Value> = (
  target: ClassAccessorDecoratorTarget<Comp, Value>,
  context: ClassAccessorDecoratorContext<Comp, Value>,
) => ClassAccessorDecoratorResult<Comp, Value> | void;

// TODO: Does `accessor` correctly initialize in TypeScript? Seems to not
// delete the existing property value on component upgrade, which is
// inconsistent.
/** TODO */
export function property<Comp extends Component>(): PropertyDecorator<Comp, any> {
  return (_target, ctx) => {
    let comp: Comp;
    ctx.addInitializer(function () { comp = this; });
    let value: unknown;

    return {
      init(v): void {
        value = v;
      },

      get(): unknown {
        return value;
      },

      set(v: unknown): void {
        value = v;
        (comp as any).requestUpdate();
      },
    };
  };
}

// TODO: Should this be a field decorator? Would that be more generic and avoid
// an `accessor` requirement.
/** TODO */
export function query<Comp extends Component>(selector: string):
    PropertyDecorator<Comp, ElementRef<any>> {
  return (_target, ctx) => {
    ctx.addInitializer(function() { this._registerQuery(ctx.name, selector) })
  };
}
