import { component } from 'hydroactive';
import { parseDomFragment } from '../html-fragments/dom.js';

export const InfiniteTootList = component(($) => {
  const list = $.hydrate('ul', HTMLUListElement);

  $.listen($.query('button'), 'click', async () => {
    // Pick a random toot using our superior ranking algorithm.
    const randomId = Math.floor(Math.random() * 10_000);
    const tootUrl = new URL('/toot', location.href);
    tootUrl.searchParams.set('id', randomId.toString());

    // Fetch the toot.
    const res = await fetch(tootUrl);
    const template = await parseDomFragment(res);
    const toot = template.content.cloneNode(true /* deep */);

    // Append it to the list, wrapped in a list element.
    const listItem = document.createElement('li');
    listItem.appendChild(toot);
    list.append(listItem);
  });
});

customElements.define('infinite-toot-list', InfiniteTootList);

declare global {
  interface HTMLElementTagNameMap {
    'infinite-toot-list': InstanceType<typeof InfiniteTootList>;
  }
}
