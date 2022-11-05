# Hydrator

Hydrator is a (likely soon-to-be renamed) experimental component library for hydrating
web components and adding interactivity to pre-rendered HTML.

## Premise

Most server-side rendering / static site generation solutions bind the client and
server together with a shared implementation. Components are "hybrid rendered" by
supporting both the client _and_ the server. They are rendered first on the server and
usually props are serialized and passed to the client as JSON. The components then
rerender on the client and take over interactivity.

While many frameworks tweak this approach in various ways, a few aspects of it have
always bothered me:

1.  Why are the client and server coupled together? Why can't I use a different language
    or framework on my server or even change it without completely breaking my frontend
    application?
1.  Why are _all_ components hybrid rendered? Most tend to be completely static and
    should be rendered exactly once on the server and never again on the client, but
    every component is implicitly rendered in both contexts.
1.  Why are we passing a JSON side-channel to the client? This seems unnecessary given
    that we already have the rendered HTML, why do we need to duplicate that
    information in a different structure.
1.  Why do I have to write my components to be hybrid-compatible? Why can't I write the
    server-side rendered components and directly read the file system, while my
    client-side rendered components could directly access browser APIs?
1.  Why do components need to rerender on the client when anything changes? 90% of a
    component is often static, when updating some text that's the only thing which
    should change. That's the only thing the client-side component should know _how_ to
    change.

These are complaints of a generic strawman SSR/SSG solution, each framework is different
and has different answers to these particular problems. Instead, I want to think of
hydration through a different lens:

## Mental model

Servers are good at rendering HTML and returning it in HTTP responses. That's kind of
their thing, we don't need to reinvent that. If you have a Node, Java, Ruby, Haskell,
C, or even Fortran server, any of them should be fine. **How a server renders HTML is
an unrelated implementation detail.** What Hydrator focuses on is taking that
pre-rendered HTML and making it interactive on the client.

This means we can think of hydration as a purely deserialization problem. Servers can
render web components with declarative shadow DOM without any fancy tooling or
integrations, all they need to do is render something like:

```html
<my-counter>
    <template shadowroot="open">
        <div>The current count is <span>5</span>.</div>
        <button>Increment</button>
    </template>
</my-counter>
```

Any server can do that, exactly how it does so is unimportant to Hydrator. From here,
Hydrator makes it easy to load from this component and make it interactable. It does
this by providing a number of useful decorators and lifecycle hooks. One example would
be:

```typescript
import { HydratableElement, live } from 'hydrator';

/**
 * `HydratableElement` extends `HTMLElement` and provides additional decorator and
 * lifecycle functionality.
 */
class MyCounter extends HydratableElement {
  // `@live()` automatically hydrates this property by doing
  // `this.shadowRoot!.querySelector('span')!.textContent` and parsing the result as a
  // `Number`.
  @live('span', Number)
  private count!: number;

  // Lifecycle method called exactly once when the component hydrates. Usually this
  // happens on first `connectedCallback()`, but can be deferred via `defer-hydration`.
  protected override hydrate(): void {
    // Ergonomic wrapper to read an element from the shadow DOM and assert it exists.
    const incrementBtn = this.query('button');

    // Ergonomic wrapper to bind event listeners. Automatically removes and readds the
    // listeners when the element is disconnected from / reconnected with the DOM.
    this.bind(incrementBtn, 'click', () => {
      // `@live()` automatically adds a setter to dynamically update the rendered
      // `<span />` whenever its value changes.
      this.count++;
    });
  }
}
```

See [examples](/src/examples/) for more cool features. The HTML pages contained
pre-rendered HTML (remember, how they get rendered by the server is an implementation
detail). The TypeScript files house the component's implementations and demonstrate
different forms of reactivity and use cases.
