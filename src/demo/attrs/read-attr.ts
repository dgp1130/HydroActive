import { AttrAccessor, baseComponent } from 'hydroactive';

/** Reads an attribute from the host element. */
export const ReadAttr = baseComponent('read-attr', (host) => {
  // `host` is a `ComponentAccessor` of the host element (`read-attr`).
  // `ComponentAccessor` has an `attr` method which provides an `AttrAccessor`.
  const idAttr: AttrAccessor = host.attr('user-id');

  // `AttrAccessor` has its own `read` method which reads from the attribute.
  const id: number = idAttr.read(Number);

  // Look up the username based on the ID.
  const username = getUserById(id);

  // Update the `<span>` tag to have the username read from the attribute.
  host.query('span').access().write(username, String);
});

ReadAttr.define();

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
