import { defineBaseComponent } from 'hydroactive';

/** Hydrates by reading the speaker's name from the DOM and exposing it. */
export const DeferredCompositionChild = defineBaseComponent(
  'deferred-composition-child',
  (host) => {
    const speaker = host.query('span#subject').access().read(String);
    console.log(`Hydrating ${speaker}!`);

    host.query('span#target').access().write('HydroActive', String);

    return {
      /** Provides hydrated speaker name. */
      getSpeakerName(): string {
        return speaker;
      }
    };
  },
);

DeferredCompositionChild.define();

declare global {
  interface HTMLElementTagNameMap {
    'deferred-composition-child': InstanceType<typeof DeferredCompositionChild>;
  }
}
