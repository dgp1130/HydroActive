export type Signal<T> = [Accessor<T>, Setter<T>];
export type Accessor<T> = () => T;
export type Setter<T> = (value: T) => void;

export type Disposer = () => void;
type Observer = () => void;

interface Root {
  observer: Observer;
  disposers: Set<Disposer>;
}

let activeRoot: Root | undefined;

export function createSignal<T>(value: T): Signal<T> {
  const observers = new Set<Observer>();

  const accessor: Accessor<T> = () => {
    if (activeRoot) {
      const { observer } = activeRoot;
      observers.add(observer);
      activeRoot.disposers.add(() => observers.delete(observer));
    }

    return value;
  };

  const setter: Setter<T> = (v) => {
    value = v;

    // Manually call `Array.from(observers.values())` because `observer()` will
    // likely add a new `Observer` to `observers`, and we don't want to
    // recursively iterate over new `Observers`.
    // See: https://twitter.com/develwoutacause/status/1592280176658116608
    const obsArray = Array.from(observers.values());
    for (const observer of obsArray) observer();
  };

  return [accessor, setter];
}

export function createEffect(inputEffect: () => void): Disposer {
  // Clean up existing observers and rerun because we might get different
  // observers due to a different call stack during execution.
  const reRunEffect = () => {
    dispose();
    effect();
  };

  const root: Root = {
    observer: () => {
      reRunEffect();
    },
    disposers: new Set(),
  };

  const dispose = () => {
    for (const dispose of root.disposers) dispose();
    root.disposers.clear();
  };

  // Run effect safely and print any errors from user code instead of throwing.
  function effect(): void {
    useRoot(root, () => {
      try {
        inputEffect();
      } catch (err) {
        console.error(`Unhandled error in effect:\n${(err as Error).message}`);
      }
    });
  }

  // Kick off effect.
  effect();

  return () => {
    dispose();
  };
}

function useRoot<T>(root: Root, cb: () => T): T {
  activeRoot = root;
  try {
    return cb();
  } finally {
    activeRoot = undefined;
  }
}