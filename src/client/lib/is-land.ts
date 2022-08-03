// Inspired by Zach Leatherman's `is-land`, but keeps SSR'd DOM content while loading
// and tells the child component to hydrate once its implementation is loaded.

type Waiter = (island: Island) => Promise<void>;

const waiters = new Map<string, Waiter>(Object.entries({
  'on:interaction': (island) => new Promise((resolve) => {
    island.addEventListener('mouseenter', () => resolve(), { once: true });
  }),
}));

class Island extends HTMLElement {
  connectedCallback(): void {
    this.waitForHydration().then(() => this.hydrate());
  }

  private async waitForHydration(): Promise<void> {
    const conditionalAttrs = this.getAttributeNames()
      .filter((attrName) => attrName.startsWith('on:'));
    if (conditionalAttrs.length !== 1) throw new Error(`Expected exactly one condition, but got:\n${conditionalAttrs.join('\n')}`);

    const condition = conditionalAttrs[0]!;
    const waiter = waiters.get(condition);
    if (!waiter) throw new Error(`No waiter named: ${condition}`);

    await waiter(this);
  }

  private async hydrate(): Promise<void> {
    const importHref = this.getAttribute('import');
    if (importHref) await import(importHref); // Side-effectfull import.

    const child = this.getOnlyChild();
    child.removeAttribute('defer-hydration');
  }

  private getOnlyChild(): Element {
    if (this.children.length !== 1) throw new Error(`Expected exactly one child, but got ${this.children.length} children.`);
    return this.children[0]!;
  }
}

customElements.define('is-land', Island);
