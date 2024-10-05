import { defineSignalComponent } from 'hydroactive/signal-component.js';
import { useUrlInput } from 'hydroactive/forms.js';
import { bind } from 'hydroactive/signal-accessors.js';

/** TODO: Requires users to manually type the scheme (`https://`), which just makes this unusable. */
export const UrlInput = defineSignalComponent('url-input', (host) => {
  const url = useUrlInput(host, host.query('input').access());

  bind(host.query('span').access(), host, String, () => url()?.origin ?? 'Not a URL');
});

declare global {
  interface HTMLElementTagNameMap {
    'url-input': InstanceType<typeof UrlInput>;
  }
}
