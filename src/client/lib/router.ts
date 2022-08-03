export interface Route {
  path: string;
  params: URLSearchParams;
  hash: string;
  toString(): string;
}

window.location.hash = '#'; // Reset to home on hard page load.
let currentRoute = createRoute(location);

export abstract class Router extends HTMLElement {
  protected abstract route(route: Route): Promise<DocumentFragment>;

  connectedCallback(): void {
    window.addEventListener('popstate', this.onRouteChange);
  }

  disconnectedCallback(): void {
    window.removeEventListener('popstate', this.onRouteChange);
  }

  private fragmentCache = new Map<string, DocumentFragment>();
  private onRouteChange = (async (_evt: PopStateEvent) => {
    const prevRoute = currentRoute;
    currentRoute = createRoute(location);
    if (routeEquals(prevRoute, currentRoute)) return;

    // TODO: Cancel on multiple navigation events.
    const newFragment = this.fragmentCache.get(currentRoute.toString())
      ?? await this.route(currentRoute);

    // Remove and cache the current fragment.
    const prevFragment = document.createDocumentFragment();
    prevFragment.append(...this.children);
    this.fragmentCache.set(prevRoute.toString(), prevFragment);

    // Insert the new fragment.
    this.append(newFragment);
  }).bind(this);
}

function createRoute(location: Location): Route {
  return {
    path: location.pathname,
    params: new URLSearchParams(new URL(location.href).search),
    hash: location.hash,
    toString() {
        return `${this.path}?${this.params.toString()}${this.hash}`;
    }
  };
}

function routeEquals(first: Route, second: Route): boolean {
  if (first.path !== second.path) return false;
  if (first.hash !== second.hash) return false;

  const zippedParams = zip(Array.from(first.params.entries()), Array.from(second.params.entries()));
  for (const [ [ firstName, firstValue ], [ secondName, secondValue ] ] of zippedParams) {
    if (firstName !== secondName) return false;
    if (firstValue !== secondValue) return false;
  }

  return true;
}

function zip<T1, T2>(first: T1[], second: T2[]): Array<[T1, T2]> {
  if (first.length !== second.length) throw new Error();

  return first.map((f, i) => [f, second[i]!]);
}
