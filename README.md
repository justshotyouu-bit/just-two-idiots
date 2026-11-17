For Just Two Idiots.

## URLs

Pages live at their address without `.html`: `/who-we-are`, `/work/denver`.
That is what Cloudflare serves, so every canonical tag, `og:url`, JSON-LD
`url`, sitemap entry and internal link uses that form. Internal links between
case studies are written `./denver`, and back to the homepage `../`.
`_redirects` sends the old `.html` addresses there with a permanent 301.

Preview with `npx wrangler dev`, not by opening the files directly: the links
have no `.html`, so they only resolve on a server that handles URLs the way
Cloudflare does.
