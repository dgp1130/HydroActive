import { component } from 'hydroactive';

const EventDispatcher = component('event-dispatcher', ($) => {
  // Propagate user clicks as `count-decrement` events.
  $.listen($.query('#decrement'), 'click', () => {
    $.dispatch(new Event('count-decrement', { bubbles: true }));
  });

  // Propagate user clicks as `count-increment` events.
  $.listen($.query('#increment'), 'click', () => {
    $.dispatch(new Event('count-increment', { bubbles: true }));
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'event-dispatcher': InstanceType<typeof EventDispatcher>;
  }
}

const EventHandler = component('event-handler', ($) => {
  const [ count, setCount ] = $.live('span', Number);

  // List for `count-{decrement,increment}` events and modify the count.
  $.listen($.host, 'count-decrement', () => { setCount(count() - 1); });
  $.listen($.host, 'count-increment', () => { setCount(count() + 1); });
});

declare global {
  interface HTMLElementTagNameMap {
    'event-handler': InstanceType<typeof EventHandler>;
  }
}
