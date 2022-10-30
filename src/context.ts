/**
 * @fileoverview Implementation of a context API to provide and retrieve data based on
 * the DOM hierarchy.
 */

/** Global map an element to its provided contexts. */
const providedCtxMap = new WeakMap<Element, Map<ContextName, unknown /* value */>>();

/** Global map of context names to any listeners watching it. */
const listenerMap = new Map<ContextName, Set<ContextListener<unknown>>>();

type ContextName = string | symbol;

/**
 * A context which can have values of type `_T` provided and requested within the DOM
 * hierarchy.
 */
export type Context<_T> = {
  name: ContextName;
};

/** Creates a new context with the given name. */
export function create<T>(name: ContextName): Context<T> {
  return { name };
}

/**
 * A callback function listening for changes to a specific context of the given
 * element.
 */
interface ContextListener<T> {
  element: Element;
  handler: (value: T) => void;
}

/**
 * Provides the given context with the supplied value at the element's location in the
 * DOM hierarchy.
 */
export function provide<T>(el: Element, ctx: Context<T>, value: T): void {
  // Get and insert a context entry for the given element.
  const elMap = providedCtxMap.get(el) ?? new Map();
  providedCtxMap.set(el, elMap);
  elMap.set(ctx.name, value);

  // Resolve any existing requests which were waiting for this context.
  const listeners = listenerMap.get(ctx.name) ?? new Set();
  for (const listener of listeners) {
    if (el.contains(listener.element)) {
      listener.handler(value);
    }
  }
}

type ContextResult<T> = { success: true, value: T } | { success: false };

/** Safely reads the context available to a given element and returns the value. */
export function peek<T>(el: Element, ctx: Context<T>): ContextResult<T> {
  // Check if the current element has provided any contexts.
  const elMap = providedCtxMap.get(el);
  if (!elMap) return next();

  // Check for the requested context to be provided by the current element.
  // `elMap.get()` could exist and return `undefined`, so we have to check `.has()`.
  if (!elMap.has(ctx.name)) return next();

  return { success: true, value: elMap.get(ctx.name)! as T };

  /** Move to the parent element and recursively try again. */
  function next(): ContextResult<T> {
    if (el.parentElement === null) return { success: false };

    return peek(el.parentElement, ctx);
  }
}

/**
 * Reads the context available to a given and returns the value or throws if not
 * provided.
 */
export function get<T>(el: Element, ctx: Context<T>): T {
  const result = peek(el, ctx);
  if (result.success) return result.value;

  throw new Error(`No parent element provided context: \`${ctx.name.toString()}\`.`);
}

/**
 * Reads the context available for the given element and returns value if present. If
 * not present, returns a `Promise` which waits for the value to be provided. `timeout`
 * specifies a timeout strategy, after which the `Promise` will reject.
 */
export function wait<T>(
  el: Element,
  ctx: Context<T>,
  timeout: Timeout = 'task',
): Promise<T> {
  // If the context is already provided, return it.
  const result = peek(el, ctx);
  if (result.success) return Promise.resolve(result.value);

  // Wait for the context to be provided.
  const waiterPromise = new Promise<T>((resolve) => {
    const stopListening = listen(el, ctx, (value) => {
      resolve(value);
      stopListening();
    });
  });

  // Fail the request after the given timeout.
  const timeoutPromise = getTimeout(timeout).then(() => {
    throw new Error(`Request for \`${ctx.name.toString()}\` context was never provided.`);
  });

  // Either return the context or fail from the timeout, whichever happens first.
  return Promise.race([ waiterPromise, timeoutPromise ]);
}

/**
 * Defines the timeout strategy for a context request.
 * 
 * * `forever` means the request will never time out.
 * * `task` means the request will expire on the next microtask.
 * * A number means the request will wait the specified number of milliseconds.
 * 
 * The default behavior is `task`.
 */
export type Timeout = 'forever' | 'task' | number /* milliseconds */;

function getTimeout(timeout: Timeout): Promise<void> {
  switch (timeout) {
    case 'task':
      return new Promise<void>((resolve) => {
        queueMicrotask(() => { resolve(); });
      });
    case 'forever':
      return new Promise<void>(() => {});
    default:
      return new Promise<void>((resolve) => {
        setTimeout(() => { resolve(); }, timeout);
      });
  }
}

/**
 * Invokes the given callback any time the specified context changes. Returns a "stop
 * listening" which, when invoked, removes the listener and cleans up internal state.
 */
export function listen<T>(
  el: Element,
  ctx: Context<T>,
  cb: (value: T) => void,
): () => void {
  // Check if there is existing context and emit it.
  const result = peek(el, ctx);
  if (result.success) cb(result.value);

  // Create a listener for the requested context.
  const listeners = listenerMap.get(ctx.name) ?? new Set();
  listenerMap.set(ctx.name, listeners);
  const listener: ContextListener<T> = { element: el, handler: cb };

  // Start listening and return a function to stop listening.
  listeners.add(listener as ContextListener<unknown>);
  return () => listeners.delete(listener as ContextListener<unknown>);
}
