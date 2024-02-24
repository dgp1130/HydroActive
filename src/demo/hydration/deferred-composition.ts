import { defineComponent } from 'hydroactive';

/** Says hello to HydroActive on hydration. */
export const InnerDeferred = defineComponent('inner-deferred', (comp) => {
  const count = comp.live('span', Number);

  comp.connected(() => {
    const handle = setInterval(() => {
      count.set(count() + 1);
    }, 1_000);

    return () => {
      clearInterval(handle);
    };
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'inner-deferred': InstanceType<typeof InnerDeferred>;
  }
}

/** Automatically increments a counter every second. */
export const OuterDeferred = defineComponent('outer-deferred', (comp) => {
  const name = comp.live('span', String);
  name.set('HydroActive');
});

declare global {
  interface HTMLElementTagNameMap {
    'outer-deferred': InstanceType<typeof OuterDeferred>;
  }
}
