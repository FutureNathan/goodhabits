# Good Habits ⭐

A simple, beautiful habit tracker inspired by Simone Giertz's *Every Day Calendar*.

Pick a habit, then light up a star for every day you keep it. Over a year, the
stars paint a picture of your consistency. No accounts, no servers — everything
saves right in your browser.

![Good Habits](shot-desktop.png)

## What it does

- **A star for every day of the year.** Tap a star to mark the habit done that
  day; tap again to undo. Today is marked with a dashed star outline.
- **Vertical or horizontal layout.** Flip the calendar in Settings — *vertical*
  (months across the top) suits tall/portrait screens, *horizontal* (the whole
  year laid out wide) suits laptops and monitors. It defaults to match your
  screen's shape.
- **Flip between habits** with the `‹` / `›` arrows (or the left/right keyboard
  arrows on a computer).
- **Daily progress ring.** The ring in the corner shows how many of your habits
  you've completed *today* (e.g. `3/4`). Every tap gives it a satisfying pop,
  and finishing them all sets off a celebration. 🎉
- **At-a-glance stats** under the title: which habit you're viewing (`1 / 3`),
  how many days you've logged this year, and your current streak. A short
  legend explains them on first visit.
- **Settings** (the gear icon, or tap the habit's name) let you:
  - Add and rename habits.
  - Reorder them (drag the handle, or use the up/down arrows) — this sets the
    order you flip through them.
  - Delete a habit, with a confirmation step so you never lose one by accident.
  - Switch years with the `‹ 2026 ›` control (plus a "This year" shortcut).
  - **Download a backup** of all your habits and history, and **restore** one
    later — handy for moving between devices or browsers.
- **Works on any device** — phone, tablet, or desktop — and **saves to your
  browser** (via `localStorage`), so there's nothing to sign up for.

## Running it

It's a static site with no build step and no dependencies.

**Easiest:** just open `index.html` in any modern browser.

**Or serve it locally** (recommended so the web font loads):

```bash
npx serve .
# or
python3 -m http.server 8000
```

then open the printed URL.

**Or host it anywhere static** — GitHub Pages, Netlify, Vercel, etc. Push this
folder and point the host at `index.html`.

> **Hosting / sharing:** this is set up for the custom domain
> **`habit.nathantowianski.com`** — the `CNAME` file and the absolute Open
> Graph / Twitter URLs in `index.html` all point there, so links unfurl nicely
> in iMessage, Slack, etc. To deploy: enable GitHub Pages on the `main` branch
> and add a DNS `CNAME` record for `habit` → `futurenathan.github.io`. If you
> move hosts, update the `CNAME` file and the `og:`/`twitter:` URLs in
> `index.html`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure + share/meta tags |
| `styles.css` | All styling and animations |
| `app.js` | App logic and local storage (no frameworks) |
| `favicon.svg`, `apple-touch-icon.png` | Icons |
| `og-image.png` | Social share image |

## A note on your data

Everything lives in your browser under the key `goodhabits.v1`. Clearing your
browser data, or using a different browser/device, starts fresh — so use
**Download backup** in Settings if you want a copy. Because it's local-first,
your habit history never leaves your machine unless you export it.
