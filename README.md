# HydroActive

HydroActive is a experimental component library for hydrating web components and adding
interactivity to pre-rendered HTML.

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
an unrelated implementation detail.** HydroActive focuses on taking that pre-rendered
HTML and making it interactive on the client.

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

Any server can do that, exactly how it does so is unimportant to HydroActive. From
here, HydroActive makes it easy to load from this component and make it interactable.
It does this by providing a number of useful decorators and lifecycle hooks. One
example would be:

```typescript
import { component } from 'hydroactive';

// `component()` creates a web component based on the given hydrate function. The
// callback is invoked on hydration and provides a `$` variable with additional
// functionality to provide interactivity to the pre-rendered component.
const MyCounter = component(($) => {
  // `$.live()` automatically hydrates this property by doing
  // `this.shadowRoot!.querySelector('span')!.textContent!` and parsing the result as a
  // `Number`. Returns a `Signal` to provide reactive reads and writes.
  const [ count, setCount ] = $.live('span', Number);

  // Ergonomic wrapper to read an element from the shadow DOM and assert it exists.
  // Also types the result based on the query, this has type `HTMLButtonElement`.
  const incrementBtn = $.query('button#increment');

  // Ergonomic wrapper to bind event listeners. Automatically removes and readds the
  // listener when the element is disconnected from / reconnected with the DOM.
  $.listen(incrementBtn, 'click', () => {
    // `setCount()` automatically updates the underlying DOM with the new value.
    setCount(count() + 1);
  });
});
```

See [examples](/src/examples/) for more cool features. The HTML pages contained
pre-rendered HTML (remember, how they get rendered by the server is an implementation
detail). The TypeScript files house the component's implementations and demonstrate
different forms of reactivity and use cases.

## Class vs Functional design

Some notable trade-offs between the two authoring formats:

*   Class syntax duplicates type information in the decorator and the property type.
    *   If a tag name changes and a `@live()` is missed, class syntax will fail at
        runtime.
    *   If a tag name changes and a `$.live()` is missed, the returned type will no
        longer be accurate and likely (but not always) lead to clear type errors.
*   Class syntax effectively requires `!` on the property definition.
*   Class syntax provides access to `HTMLElement` life cycle hooks like
    `connectedCallback()` where users can easily shoot themselves in the foot.
*   Decorated properties are often marked "unused" by the IDE, because it doesn't
    understand how they are bound.
*   `query()` and `listen()` are practically identical in the two designs.
*   Many class decorators don't make sense together (such as `@live()` and `@bind()`),
    but the IDE doesn't understand this. However, `$` functions return distinct types
    and are harder to misuse in this manner.
*   Functional approach requires a separate reactivity system in signals. Whereas the
    class approach can make do with setters.
*   Functional approach decouples reactivity (via signals) from its components, while
    the class approach couples the two together (via setters).
*   Class approach requires TS decorators. Hopefully this will be compatible with the
    JS decorator proposal.
*   Returning object in functional approach feels like it's hacking in the class
    approach in the middle of the functional approach.
*   When to use `$.hydrate()` vs `$.query()` is not clear. The former asserts for a
    specific type, which is occasionally useful but easy to forget. Class approach uses
    `@hydrate()` as a declarative decorator while `this.query()` is imperative.
*   `update()` isn't necessary in the functional design, can just use effects.
*   Functional approach requires returning the custom element definition and "moving"
    its properties over, which feels very hacky.
*   Functional approach does a better job of encapsulating problem space, user code is
    _mostly_ isolated from the actual custom elements definition. On the flip side, this
    makes it harder to learn and more magical.
*   Class approach leaks a lot of implementation details about the custom element
    definition.
*   `$.host` is basically an opt-out of the functional API and leaks the core
    implementation details of the underlying component. Reminds me of Protractor's
    `browser.driver` in all the wrong ways.
*   `$.host` is accessible during hydration before returned properties have been moved
    over.
*   `$.host` doesn't include properties from the returned object. Pretty sure that's
    impossible since it requires inferring the type of a parameter based on the return
    type, which doesn't make much sense.
*   Might want `$.dispatch()` in functional approach to avoid an unnecessary `$.host`
    reference, but the class approach notably doesn't _need_ this because
    `this.dispatchEvent()` just _is_ that function.
*   `$.bind()` is more composable than `@bind()` and can work with computed properties
    without duplicating state.
*   Functional approach can't really hide the `customElements.define()` because we need
    to add it to `HTMLElementTagNameMap` anyways. In fairness, the class approach
    requires this too, though it doesn't try to abstract away any of those
    implementation details.
*   Occasionally need to make a signal with no clear initial value. Seems like an
    anti-pattern which can be hard to avoid.
*   Defining public component properties is _much_ more idiomatic in the class based
    approach.
*   Weird that signals don't directly compose each other in the functional approach.
    Since we can't assume all components are built with HydroActive or use signals, we
    also can't assume other components can use them. Requires unboxing and re-boxing
    data in unintuitive and likely non-performant ways.
    *   Maybe it's worth having an API which assumes the other element is built with
        HydroActive. Just need to make sure there are alternative approaches when
        that's not true.
*   Functional approach requires more boilerplate to expose data with manual getters and
    setters. In the class approach, `public` just works.
*   Functional approach is much more conducive with the imperative context API. However
    it still benefits greatly from signal integration.
*   Functional approach is more conducive to deferred hydration, as their aren't any
    available lifecycle hooks to break it such as `connectedCallback()`.
*   Class decorators _require_ usage of the class field scope, meaning some variables
    may exist longer than they need to, particularly those only needed during hydration.
    Functional approach closures naturally scope more narrowly.
*   Not sure what `$` _represents_ in the functional approach and don't have a good name
    for it.
*   Functional `update()` function and `$.effect()` are basically the same thing?
*   `$.use()` vs `$.effect()` are confusing to choose between.
*   Should `$.use()` *require* a `Disposer`? If you don't have one, should you just run
    that code directly in the `component()` callback?
*   `$.use()` and `$.effect()` create side effects bound to the _component_ lifecycle,
    not the _signal's_ lifecycle. Signals cannot be garbage collected when used by these
    functions, even if they are not referenced elsewhere. Maybe that's ok? But it seems
    weird that these effects are done at the bottom of the usage graph at the individual
    signals rather than the top of the usage graph like the others.
*   `$.live()` / `$.hydrate()` / `$.bind()` all seem to work when called asynchronously
    _after_ hydration. Is that ok?
    *   `$.bind()` kinda needs this to be compatible with async contexts.
    *   `$.hydrate()` makes logical sense, but has a bad name. Maybe `$.init()` would be
        better?
    *   `$.live()` is just the two combined, so it _can_ work, but I feel like it
        shouldn't. Binding late seems like a bad idea, even if it accepts a `Promise`.

### Problems which are the same in both and unrelated to the authoring format

*   Hydration timing is the same, and generally works the same way.
*   Due to hydration timing, context becomes awkward since child components usually
    hydrate before parent components.
*   Hydration is still synchronous due to the way `defer-hydration` works.
