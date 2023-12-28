import { ElementRef, defineComponent } from 'hydroactive';

/** Reads an attribute from the host element. */
export const ReadAttr = defineComponent('read-attr', (comp) => {
  // `comp.host` is an `ElementRef` of the host element (`read-attr`).
  const host: ElementRef<HTMLElement> = comp.host;

  // `ElementRef` has an `attr` method, similar to `read` except that it takes
  // its input from the named attribute.
  const id: number = host.attr('user-id', Number);

  // Look up the username based on the ID.
  const username = getUserById(id);

  // Update the `<span>` tag to have the username read from the attribute.
  comp.bind('span', () => username);
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
