import { component, factory } from 'hydroactive';

const HydratedTemplateCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  $.bind('span', count);

  return {
    increment(): void {
      setCount(count() + 1);
    },
  };
});

const createHydratedTemplateCounter = factory(HydratedTemplateCounter);

customElements.define('hydrated-template-counter', HydratedTemplateCounter);

declare global {
  interface HTMLElementTagNameMap {
    'hydrated-template-counter': InstanceType<typeof HydratedTemplateCounter>;
  }
}

const TemplateHydrator = component(($) => {
  const spawnBtn = $.query('button');

  $.listen(spawnBtn, 'click', (evt) => {
    evt.preventDefault();
    spawnBtn.disabled = true;

    // Factory automatically hydrates the component, so it is immediately usable.
    const counter = createHydratedTemplateCounter();
    counter.increment(); // `.increment()` is valid! Already hydrated!
    $.host.shadowRoot!.appendChild(counter);
  });
});

customElements.define('template-hydrator', TemplateHydrator);

declare global {
  interface HTMLElementTagNameMap {
    'template-hydrator': InstanceType<typeof TemplateHydrator>;
  }
}
