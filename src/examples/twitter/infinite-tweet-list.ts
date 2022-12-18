import { component } from 'hydroactive';
import { parseDomFragment } from '../html-fragments/dom.js';

export const InfiniteTweetList = component(($) => {
  const list = $.hydrate('ul', HTMLUListElement);

  $.listen($.query('button'), 'click', async () => {
    // Pick a random tweet using our superior ranking algorithm.
    const randomId = Math.floor(Math.random() * 10_000);
    const tweetUrl = new URL('/tweet', location.href);
    tweetUrl.searchParams.set('id', randomId.toString());

    // Fetch the tweet.
    const res = await fetch(tweetUrl);
    const template = await parseDomFragment(res);
    const tweet = template.content.cloneNode(true /* deep */);

    // Append it to the list, wrapped in a list element.
    const listItem = document.createElement('li');
    listItem.appendChild(tweet);
    list.append(listItem);
  });
});

customElements.define('infinite-tweet-list', InfiniteTweetList);

declare global {
  interface HTMLElementTagNameMap {
    'infinite-tweet-list': InstanceType<typeof InfiniteTweetList>;
  }
}
