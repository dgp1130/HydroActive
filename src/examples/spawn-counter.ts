import { component, hydrate } from 'hydroactive';

// Hydration is run with the `<template data-hydroactive-tag />` contents cloned into the
// shadow DOM. Hydrate from that starting point.
const SpawnCounter = component('spawn-counter', ($) => {
  const [ count, setCount ] = $.live('span', Number);

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });

  return {
    increment(): void {
      setCount(count() + 1);
    },
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'spawn-counter': InstanceType<typeof SpawnCounter>;
  }
}

const Spawner = component('my-spawner', ($) => {
  const counterTemplate = $.query('template');
  const list = $.query('ul');

  $.listen($.query('button'), 'click', () => {
    // Spawn a new counter by rendering a new instance based on the template.
    const counter = (counterTemplate.content.cloneNode(true /* deep */) as Element).firstElementChild!;

    // Hydrate the counter before it is appended to the DOM.
    hydrate(counter, SpawnCounter);

    // Counter is interactable and typed correctly (it's typed SpawnCounter, not Element)!
    counter.increment(); // works!

    const item = document.createElement('li');
    item.appendChild(counter);
    list.appendChild(item);
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'my-spawner': InstanceType<typeof Spawner>;
  }
}
