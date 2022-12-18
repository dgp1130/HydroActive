import './editable-tweet.js';

import { attr, component } from 'hydroactive';

const TweetView = component(($) => {
  const tweetId = $.hydrate(':host', Number, attr('tweet-id'));
  const content = $.hydrate('span', String);

  $.listen($.query('button'), 'click', () => {
    const editableTweet = document.createElement('editable-tweet');
    editableTweet.tweetId = tweetId;
    editableTweet.content = content;
    $.host.replaceWith(editableTweet);
  });
});

customElements.define('tweet-view', TweetView);

declare global {
  interface HTMLElementTagNameMap {
    'tweet-view': InstanceType<typeof TweetView>;
  }
}
