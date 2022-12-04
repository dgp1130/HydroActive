import { component } from 'hydroactive';

const EventDispatcher = component(($) => {
  $.listen($.query('#decrement'), 'click', () => {
    $.dispatch(new Event('count-decrement', { bubbles: true }));
  });

  $.listen($.query('#increment'), 'click', () => {
    $.dispatch(new Event('count-increment', { bubbles: true }));
  });
});

customElements.define('event-dispatcher', EventDispatcher);

declare global {
  interface HTMLElementTagNameMap {
    'event-dispatcher': InstanceType<typeof EventDispatcher>;
  }
}

const EventHandler = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  $.listen($.host, 'count-decrement', () => { setCount(count() - 1); });
  $.listen($.host, 'count-increment', () => { setCount(count() + 1); });
});

customElements.define('event-handler', EventHandler);

declare global {
  interface HTMLElementTagNameMap {
    'event-handler': InstanceType<typeof EventHandler>;
  }
}
