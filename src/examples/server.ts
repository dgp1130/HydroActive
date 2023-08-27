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

interface Toot {
    id: number;
    content: string;
}

function renderInfiniteTootList(initialToots: Toot[]): string {
    return `
        <infinite-toot-list>
            <template shadowrootmode="open">
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
                    ${initialToots.map((toot) => `
                        <li>${renderToot(toot)}</li>
                    `.trim()).join('\n')}
                </ul>
                <button>Load more</button>

                <script src="/examples/mastodon/infinite-toot-list.js" type="module"></script>
            </template>
        </infinite-toot-list>
    `.trim();
}

/**
 * Renders a toot with the given ID and content. Includes associated JavaScript
 * and CSS with the content inside declarative shadow DOM for isolation.
 */
function renderToot({ id, content }: Toot): string {
    return `
<toot-view toot-id="${id}">
    <template shadowrootmode="open">
        <style>span { color: red; }</style>

        <span>${content}</span>
        <button>Edit</button>

        <template>
            ${renderEditToot()}
        </template>

        <script src="/examples/mastodon/toot-view.js" type="module" async></script>
    </template>
</toot-view>
    `.trim();
}

function randomToot(): Toot {
    const id = Math.floor(Math.random() * 10_000);
    const content = `Hello world from toot #${id}.`;

    return { id, content };
}

app.get('/examples/mastodon/', (_req, res) => {
    const toots = Array(5).fill(0).map(() => randomToot());

    res.contentType('text/html').end(`
<!DOCTYPE html>
<html>
    <head>
        <title>Mastodon</title>
        <meta charset="utf8">
        ${renderImportMap()}
    </head>
    <body>
        <h1>Mastodon</h1>

        <header>
            <a href="/">Home</a>
        </header>

        ${renderInfiniteTootList(toots)}
    </body>
</html>
    `.trim());
});

/** Returns a generic toot for the given ID. */
app.get('/toot', (req, res) => {
    const id = parseIntegerParam(req, 'id');

    const content = renderToot({
        id,
        content: `Hello world from toot #${id}.`,
    });
    res.contentType('text/html').end(content);
});

/**
 * "Edits" the toot with the given ID to use the provided content. Also returns
 * a rendered toot with the new content.
 */
app.post('/toot/edit', (req, res) => {
    const id = parseIntegerParam(req, 'id');
    const content = req.query['content'];
    if (!content || typeof content !== 'string') throw new Error(`Editing a toot requires \`?content\` to be set.`);

    const toot: Toot = { id, content };
    res.contentType('text/html').end(renderToot(toot));
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
            "hydroactive": "/index.js",
            "hydroactive/": "/",
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

function renderEditToot(): string {
    return `
<editable-toot>
    <template shadowrootmode="open">
        <form>
            <input type="text" />
            <button type="submit">Save</button>
        </form>

        <script src="/examples/mastodon/editable-toot.js" type="module" async></script>
    </template>
</editable-toot>
    `.trim();
}

const port = env['PORT'] || 8000;
app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});
