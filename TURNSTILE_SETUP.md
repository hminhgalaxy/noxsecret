# Cloudflare Turnstile setup

The existing Turnstile widget is retained. Its public site key is embedded in
`assets/js/lib/captcha.js`. The secret is intentionally not stored in this
archive or in browser JavaScript.

## Vercel environment variables

Set these in the Vercel project's Environment Variables, then redeploy:

- `TURNSTILE_SECRET`: the widget's **rotated** secret value (server-side only).
- `TURNSTILE_HOSTNAMES`: `skibidiscript.vercel.app`

For local development only, you may use:
`TURNSTILE_HOSTNAMES=localhost,127.0.0.1`

Do not include localhost values in the production hostname allowlist. If the
project uses another production hostname, add that exact hostname to the
allowlist only after confirming it is registered on the existing Cloudflare
Turnstile widget.

The API temporarily supports `TURNSTILE_SECRET_KEY` as a compatibility alias
for an older deployment. Prefer `TURNSTILE_SECRET`.

## Protected actions

- Email/password login: action `login`
- Google login from the login page: action `login`
- Email/password registration: action `signup`
- Google registration/sign-in from the registration page: action `signup`

The API fails closed unless Siteverify returns success, the action matches,
and the returned hostname is in `TURNSTILE_HOSTNAMES`.

## Important secret handling

A secret key was pasted into a chat, so treat that value as exposed. Rotate the
secret in Cloudflare and save the replacement directly in Vercel. Do not paste
the replacement into chat, source files, GitHub, or this ZIP.
