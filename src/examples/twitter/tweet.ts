import { attr, component } from 'hydroactive';
import { createEditableTweet } from './editable-tweet.js';

export const TweetView = component(($) => {
  const tweetId = $.hydrate(':host', Number, attr('tweet-id'));
  const content = $.hydrate('span', String);

  $.listen($.query('button'), 'click', () => {
    $.host.replaceWith(createEditableTweet({ tweetId, content }));
  });
});

customElements.define('tweet-view', TweetView);

declare global {
  interface HTMLElementTagNameMap {
    'tweet-view': InstanceType<typeof TweetView>;
  }
}
