import { defineComponent } from 'hydroactive';
import { DeferredCompositionChild } from './deferred-composition-child.js';
import { bind } from 'hydroactive/signal-accessors.js';

/** Demonstrates accessing and hydrating child components. */
export const DeferredComposition = defineComponent('deferred-composition', (host, comp) => {
  // `.access` asserts the component is already hydrated.
  const firstName = host.query('#first')
      .access(DeferredCompositionChild)
      .element.getSpeakerName();
  bind(host.query('#first-speaker').access(), comp, String, () => firstName);

  // `.hydrate` hydrates the component immediately.
  const secondName = host.query('#second')
      .hydrate(DeferredCompositionChild)
      .element.getSpeakerName();
  bind(host.query('#second-speaker').access(), comp, String, () => secondName);
});

declare global {
  interface HTMLElementTagNameMap {
    'deferred-composition': InstanceType<typeof DeferredComposition>;
  }
}
