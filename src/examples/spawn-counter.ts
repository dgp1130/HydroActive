import { component, factory } from 'hydroactive';

// Hydration is run with the `<template data-hydroactive-tag />` contents cloned into the
// shadow DOM. Hydrate from that starting point.
const SpawnCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });
});

// Generate a factory to create and hydrate a new instance of the component. This makes sure
// the new component is immediately hydrated and usable.
const spawnCounter = factory(SpawnCounter);

customElements.define('spawn-counter', SpawnCounter);

declare global {
  interface HTMLElementTagNameMap {
    'spawn-counter': InstanceType<typeof SpawnCounter>;
  }
}

const Spawner = component(($) => {
  const list = $.hydrate('ul', HTMLUListElement);

  $.listen($.query('button'), 'click', () => {
    // Spawn a new counter by client-side rendering a new instance based on the template.
    const item = document.createElement('li');
    item.appendChild(spawnCounter());

    list.appendChild(item);
  });
});

customElements.define('my-spawner', Spawner);

declare global {
  interface HTMLElementTagNameMap {
    'my-spawner': InstanceType<typeof Spawner>;
  }
}
