/** TODO */
export class ReactiveValue<Value> {
  readonly #set: (value: Value) => void;
  readonly #listeners = new Set<(value: Value) => void>();

  private constructor(
    public readonly get: () => Value,
    set: (value: Value) => void,
  ) {
    this.#set = set;
  }

  /** TODO */
  public static from<Value>({ get, set, notify }: {
    get: () => Value,
    set: (value: Value) => void,
    notify?: (notify: () => void) => void,
  }): ReactiveValue<Value> {
    const reactive = new ReactiveValue(get, set);
    const reactiveRef = new WeakRef(reactive);

    notify?.(() => {
      const reactive = reactiveRef.deref();
      if (!reactive) return;

      const value = reactive.get();
      for (const listener of reactive.#listeners) listener(value);
    });

    return reactive;
  }

  /** TODO */
  public set(value: Value): void {
    this.#set(value);

    for (const listener of this.#listeners) listener(value);
  }

  /** TODO */
  public listen(callback: (value: Value) => void): () => void {
    this.#listeners.add(callback);

    let stopped = false;
    return () => {
      // A listener could be added and removed multiple times, don't want the
      // removal callback for one to be invoked again and remove the same
      // listener re-added later.
      if (stopped) throw new Error('Listener already removed.');
      stopped = true;

      this.#listeners.delete(callback);
    };
  }
}

type PropertyDecorator<Clazz, Value> = (
  target: ClassAccessorDecoratorTarget<Clazz, Value>,
  context: ClassAccessorDecoratorContext<Clazz, Value>,
) => ClassAccessorDecoratorResult<Clazz, Value> | void;

const reactivePropMap = new WeakMap<
  object,
  Map<string | number | symbol, ReactiveValue<unknown>>
>();

/** TODO */
export function reactive(): PropertyDecorator<unknown, any> {
  return (target, ctx) => {
    let reactiveValue: ReactiveValue<unknown>;
    return {
      init: function (this: object, value: unknown): unknown {
        reactiveValue = value instanceof ReactiveValue
          ? value
          : ReactiveValue.from({
            get: target.get.bind(this),
            set: target.set.bind(this),
          });

        const propMap = reactivePropMap.get(this) ?? new Map();
        reactivePropMap.set(this, propMap);
        if (propMap.has(ctx.name)) {
          throw new Error('Reactive property map already contains this property.');
        }
        propMap.set(ctx.name, reactiveValue)

        return value;
      },

      set: function (value: unknown): void {
        reactiveValue.set(value);
      },
    };
  };
}

/** TODO */
export function getReactiveValue<Obj extends object, Prop extends keyof Obj>(
  obj: Obj, prop: Prop,
): ReactiveValue<Obj[Prop]> {
  const propMap = reactivePropMap.get(obj) ?? new Map();
  const value = propMap.get(prop);
  if (!value) throw new Error('Property not in reactive map.');
  return value;
}
