import { ComponentRef, ElementRef, defineComponent } from 'hydroactive';

/**
 * TODO
 *
 * TODO: What primitives should this expose?
 */
class ReactiveList<Value> implements Iterable<Value> {
  private constructor(
    private readonly comp: ComponentRef,
    private readonly roots: ElementRef<Element>[],
    private readonly items: Value[]
  ) {}

  public static from<Value, El extends Element>(
    comp: ComponentRef,
    roots: ElementRef<El>[],
    mapper: (el: ElementRef<El>) => Value,
  ): ReactiveList<Value> {
    return new ReactiveList(comp, roots, roots.map((root) => mapper(root)));
  }

  public swap(first: number, second: number): void {
    if (first >= this.items.length || second >= this.items.length) throw new Error('TODO');

    const tempItem = this.items[first]!;
    this.items[first] = this.items[second]!;
    this.items[second] = tempItem;

    const tempNode = document.createComment('');
    this.roots[first]!.native.replaceWith(tempNode);
    this.roots[second]!.native.replaceWith(this.roots[first]!.native);
    tempNode.replaceWith(this.roots[second]!.native);

    const tempRoot = this.roots[first]!;
    this.roots[first] = this.roots[second]!;
    this.roots[second] = tempRoot;
  }

  public containing(element: ElementRef<Element> | Element): number {
    const el = element instanceof ElementRef ? element.native : element;
    for (const ancestor of parents(el)) {
      if (ancestor === this.comp.host.native) throw new Error('TODO: Not in component');

      const index = this.roots.findIndex((root) => root.native === ancestor);
      if (index !== -1) return index;
    }

    throw new Error('TODO: Should never happen?');
  }

  [Symbol.iterator](): Iterator<Value> {
    return this.items[Symbol.iterator]();
  }
}

function* parents(el: Element): Generator<HTMLElement, void, void> {
  const parent = el.parentElement;
  if (parent === null) return;

  yield parent;
  yield* parents(parent);
}

/** TODO */
export const ListCounter = defineComponent('list-counter', (comp) => {
  const items = comp.host.queryAll('li');
  const listItems = ReactiveList.from(
    comp,
    items,
    (listItem) => comp.live(listItem.query('span'), Number),
  );

  listen(comp, comp.host, 'click', (evt) => {
    const target = evt.target as Element;
    if (target.tagName !== 'BUTTON') return;

    const index = listItems.containing(target);
    listItems.swap(0, index);
  });

  comp.connected(() => {
    const id = setInterval(() => {
      for (const listItem of listItems) {
        listItem.set(listItem() + 1);
      }
    }, 1_000);

    return () => {
      clearInterval(id);
    };
  });
});

function listen(
  comp: ComponentRef,
  selectorOrElement: string | ElementRef<Element>,
  event: string,
  callback: (evt: Event) => void,
): void {
  const element = selectorOrElement instanceof ElementRef
    ? selectorOrElement
    : comp.host.query(selectorOrElement);

  comp.connected(() => {
    element.native.addEventListener(event, callback);

    return () => {
      element.native.removeEventListener(event, callback);
    };
  });
}
