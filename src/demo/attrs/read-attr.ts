import { AttrAccessor, defineComponent } from 'hydroactive';
import { bind } from 'hydroactive/signal-accessors.js';

/** Reads an attribute from the host element. */
export const ReadAttr = defineComponent('read-attr', (host, root) => {
  // `host` is a `ComponentAccessor` of the host element (`read-attr`).
  // `ComponentAccessor` has an `attr` method which provides an `AttrAccessor`.
  const idAttr: AttrAccessor = host.attr('user-id');

  // `AttrAccessor` has its own `read` method which reads from the attribute.
  const id: number = idAttr.read(Number);

  // Look up the username based on the ID.
  const username = getUserById(id);

  // Update the `<span>` tag to have the username read from the attribute.
  bind(host.query('span').access(), root, String, () => username);
});

declare global {
  interface HTMLElementTagNameMap {
    'read-attr': InstanceType<typeof ReadAttr>;
  }
}

function getUserById(id: number): string {
  switch (id) {
    case 1234: return 'Devel';
    default: throw new Error(`Unknown user id: ${id}.`);
  }
}
