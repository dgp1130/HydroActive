import { attr, component, ComponentDef } from 'hydroactive';
import { createSignal } from 'hydroactive/signal.js';

// Hydrates the initial count and "returns" it to the parent component which triggered it.
const OrchestratedInitialCount = component(
  'orchestrated-initial-count',
  ($: ComponentDef<{ user: User }>) => {
    $.bind('#user', () => $.props.user()!.name);
    const count = $.read('#count', Number);

    return { count };
  },
);

declare global {
  interface HTMLElementTagNameMap {
    'orchestrated-initial-count': InstanceType<typeof OrchestratedInitialCount>;
  }
}

// Requires an initial count as a prop and hydrates a counter around it.
const OrchestratedCounter = component(
  'orchestrated-counter',
  ($: ComponentDef<{ count: number }>) => {
    const [ count, setCount ] = createSignal($.props.count()!);

    $.bind('span', count);

    $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
    $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });
  },
);

declare global {
  interface HTMLElementTagNameMap {
    'orchestrated-counter': InstanceType<typeof OrchestratedCounter>;
  }
}

// Orchestrates the hydration of multiple sub-components to force a specific ordering.
const OrchestratedParent = component('orchestrated-parent', ($) => {
  const user = getUser($.read(':host', Number, attr('user-id')));

  // Hydrate `orchestrated-initial-count` *first* and get the initial count from it.
  const { count } = $.hydrate('orchestrated-initial-count', OrchestratedInitialCount, { user });

  // Hydrate `orchestrated-counter` *second`, using the initial count we just hydrated.
  $.hydrate('orchestrated-counter', OrchestratedCounter, { count });
});

declare global {
  interface HTMLElementTagNameMap {
    'orchestrated-parent': InstanceType<typeof OrchestratedParent>;
  }
}

interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  return { id, name: 'Devel' };
}
