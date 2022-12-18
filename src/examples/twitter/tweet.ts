import './editable-tweet.js';

import { attr, component } from 'hydroactive';

const Tweet = component(($) => {
  const tweetId = $.hydrate(':host', Number, attr('tweet-id'));
  const content = $.hydrate('span', String);

  $.listen($.query('button'), 'click', () => {
    const editableTweet = document.createElement('my-editable-tweet');
    editableTweet.tweetId = tweetId;
    editableTweet.content = content;
    $.host.replaceWith(editableTweet);
  });
});

customElements.define('my-tweet', Tweet);

declare global {
  interface HTMLElementTagNameMap {
    'my-tweet': InstanceType<typeof Tweet>;
  }
}
