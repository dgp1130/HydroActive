import { baseComponent } from 'hydroactive';
import { DeferredCompositionChild } from './deferred-composition-child.js';

/** Demonstrates accessing and hydrating child components. */
export const DeferredComposition = baseComponent(
  'deferred-composition',
  (host) => {
    // `.access` asserts the component is already hydrated.
    const firstName = host.query('#first')
        .access(DeferredCompositionChild)
        .element.getSpeakerName();
    host.query('#first-speaker').access().write(firstName, String);

    // `.hydrate` hydrates the component immediately.
    const secondName = host.query('#second')
        .hydrate(DeferredCompositionChild)
        .element.getSpeakerName();
    host.query('#second-speaker').access().write(secondName, String);
  },
);

DeferredComposition.define();

declare global {
  interface HTMLElementTagNameMap {
    'deferred-composition': InstanceType<typeof DeferredComposition>;
  }
}
