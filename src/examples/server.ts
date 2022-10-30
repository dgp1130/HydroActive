import { env } from 'process';
import express, { Request } from 'express';

const app = express();

// Internal redirect `/` to `/examples/index.html`.
app.use('/$', (req, _res, next) => {
    req.url = '/examples/index.html';
    next();
});

app.use(express.static('dist/', {
    cacheControl: true,
    maxAge: 30_000 /* milliseconds */,
}));

interface Tweet {
    id: number;
    content: string;
}

function renderInfiniteTweetList(initialTweets: Tweet[]): string {
    return `
        <my-infinite-tweet-list>
            <template shadowroot="open">
                <style>
                    :host {
                        display: block;
                        margin-top: 15px;
                    }

                    ul {
                        list-style: none;
                        margin-block-start: 0;
                        margin-block-end: 0;
                        padding-inline-start: 0;
                        margin-bottom: 15px;
                    }
                </style>

                <ul>
                    ${initialTweets.map((tweet) => `
                        <li>${renderTweet(tweet)}</li>
                    `.trim()).join('\n')}
                </ul>
                <button>Load more</button>
            </template>
            <script src="/examples/twitter/infinite-tweet-list.js" type="module"></script>
        </my-infinite-tweet-list>
    `.trim();
}

/**
 * Renders a tweet with the given ID and content. Includes associated JavaScript
 * and CSS with the content inside declarative shadow DOM for isolation.
 */
function renderTweet({ id, content }: Tweet): string {
    return `
<my-tweet tweet-id="${id}">
    <template shadowroot="open">
        <style>span { color: red; }</style>

        <span>${content}</span>
        <button>Edit</button>
    </template>
    <script src="/examples//twitter/tweet.js" type="module" async></script>
</my-tweet>
    `.trim();
}

function randomTweet(): Tweet {
    const id = Math.floor(Math.random() * 10_000);
    const content = `Hello world from tweet #${id}.`;

    return { id, content };
}

app.get('/examples/twitter/', (_req, res) => {
    const tweets = Array(5).fill(0).map(() => randomTweet());

    res.contentType('text/html').end(`
<!DOCTYPE html>
<html>
    <head>
        <title>Twitter</title>
        <meta charset="utf8">
        ${renderImportMap()}
    </head>
    <body>
        <h1>Twitter</h1>

        <header>
            <a href="/">Home</a>
        </header>

        ${renderInfiniteTweetList(tweets)}
    </body>
</html>
    `.trim());
});

/** Returns a generic tweet for the given ID. */
app.get('/tweet', (req, res) => {
    const id = parseIntegerParam(req, 'id');

    const content = renderTweet({
        id,
        content: `Hello world from tweet #${id}.`,
    });
    res.contentType('text/html').end(content);
});

/**
 * "Edits" the tweet with the given ID to use the provided content. Also returns
 * a rendered tweet with the new content.
 */
app.post('/tweet/edit', (req, res) => {
    const id = parseIntegerParam(req, 'id');
    const content = req.query['content'];
    if (!content || typeof content !== 'string') throw new Error(`Editing a tweet requires \`?content\` to be set.`);

    const tweet = { id, content } as Tweet;
    res.contentType('text/html').end(renderTweet(tweet));
});

function parseIntegerParam(req: Request, name: string): number {
    const idQueryParam = req.query[name];
    if (!idQueryParam || typeof idQueryParam !== 'string') {
        throw new Error(`\`?${name}\` query param is required.`);
    }

    const id = parseInt(idQueryParam);
    if (isNaN(id)) throw new Error(`\`?${name}\` query param must be an integer.`);

    return id;
}

function renderImportMap(): string {
    return `
<script type="importmap">
    {
        "imports": {
            "hydrator": "/index.js",
            "hydrator/": "/",
            "lit": "/node_modules/lit/index.js",
            "lit/": "/node_modules/lit/",
            "@lit/reactive-element": "/node_modules/@lit/reactive-element/reactive-element.js",
            "@lit/reactive-element/": "/node_modules/@lit/reactive-element/",
            "lit-element": "/node_modules/lit-element/lit-element.js",
            "lit-element/": "/node_modules/lit-element/",
            "lit-html": "/node_modules/lit-html/lit-html.js",
            "lit-html/": "/node_modules/lit-html/"
        }
    }
</script>
    `.trim();
}

const port = env['PORT'] || 8000;
app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});
