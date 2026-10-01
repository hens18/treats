# Treats Dipped by Jay site

New site for Treats Dipped by Jay, a mobile cheesecake bar / dessert truck in Houston, TX, run by Jayla "Jay" Stanford.
Their current site, https://treatsdippedbyjay.com/, is a Shopify shop for shipped cookies, loaf cakes, crumbs and recipes
(no truck menu, hours or reviews).
Brief from the client: use the store info, hours, menu and title supplied (logo, Instagram screenshot, printed menu, two
videos), add a reviews section people can interact with while it scrolls right to left (as on `hens18/hwest`,
`hens18/bakery`, `hens18/kanji`), be creative with the palette but keep it user friendly and fast, use 3D graphics where
they fit, and flag design concerns. Four more photos are coming after the first pass.

## Previews

- `node scripts/build-preview.js` writes `.preview/index.html` (CSS, JS and images inlined) and copies the videos,
  captions and the 3D bundle next to it in `.preview/assets/`. `--artifact` writes `.preview/live.html` instead.
- No claude.ai live link for this one: the page carries the business's real name and logo, so it isn't published as an
  artifact. Share screenshots, or the GitHub Pages URL once deployed.

## Business facts (sources)

- Instagram @treatsdippedbyjay (client screenshot, Oct 1 2026): "MOBILE CHEESECAKE BAR", category Food Truck,
  "READY TO GET DIPPED??", "DESSERT TRUCK", "Houston, Tx FRIDAY - SUNDAY 2-8PM", 24.7K followers, 119 posts.
  Highlights: FOX 26, Popup shops!, PV, Treat Tables, Reviews (x3).
- Hours: Fri to Sun 2 PM to 8 PM, Houston time (America/Chicago). Source of truth: `HOURS` in `site/assets/main.js`,
  repeated in the JSON-LD in `site/index.html`, the facts strip, the Find the truck copy and the footer.
- No street address: the truck moves; the site sends people to Instagram for the day's spot.
- Linktree: website, Amazon storefront, TikTok @treatsdippedbyjay, Instagram. Shopify About page: Pinterest too.
- Owner: Jayla Stanford, Prairie View A&M student (Houston Style Magazine, Aug 5 2025, "PVAMU Senior Jayla Stanford Opens
  Dessert Truck - TreatsDippedByJay."). Shopify About: "in business 3 years" (undated).
- Allergy text is from the Shopify FAQ ("May contain traces of peanuts, nuts, and egg. May contain gluten, milk, soy,
  wheat, and barley." plus "inform us of any allergies").

## Menu (from the printed menu, `site/assets/img/printed-menu.webp`)

- Bestsellers: Strawberry Cheesecake Cups, Cheesecake Cups, Banana Pudding.
- Cheesecake Cups $12 (cone $13): Biscoff, Strawberry Crunch, Banana Pudding, Oreo, Fruity Pebbles, Graham Cracker,
  Caramel Apple Pecan. Dipped Slices $10: Biscoff, Strawberry Crunch, Banana Pudding, Oreo, Fruity Pebbles, Red Velvet.
- Cookies $4: Biscoff, S'mores, Oreo, Chocolate Chip, Red Velvet, Strawberry Crunch, Strawberry Nana, Banana Pudding,
  Macadamia, M&M Peanut Butter, Lemon, Cookie Monster.
- Specialty (prices read from the small starbursts, zoomed): Candied Grapes $15, Chocolate Covered Strawberries $10,
  Churro Cheesecake $12 to $15, Stuffed Cheesecake Strawberries $12, Cupcakes $4, Build Your Own Ice Cream $6,
  Apple Salad $13, Dipped Apple Slices $12 (Biscoff, Strawberry Crunch, Banana Pudding, Oreo, Fruity Pebbles).
- The flavor chips in the menu filter by `data-flavor` on list items; cards carry `data-item` for the summary line.
- Cookie flip-side text comes from the Shopify product descriptions (lightly cleaned; "Cookies N Creak" read as
  Hershey's Cookies 'n' Creme).

## NEEDS OWNER CONFIRMATION

- Reviews: none were attached to the brief (see Reviews below).
- Hours: the bio says 2 to 8 PM; the loaf cake video says "open today from 3 to 8 PM". Site uses 2 to 8.
- Loaf cakes: in the video (strawberry, banana pudding, Oreo, Biscoff, red velvet) and on Shopify ($9) but not on the
  printed menu. Only mentioned in the video caption and the "Cookies by mail" card.
- "In 2025 she put them on wheels" and "Prairie View A&M" come from the Houston Style Magazine piece. Is Jay still a
  student / graduated? Ok to name her school?
- Booking: treat tables and pop-ups are from the Instagram highlights; the site says to DM on Instagram. Is there an
  email or phone for bookings? FOX 26 highlight suggests a TV feature: date and link?
- Online shop: the new site may replace treatsdippedbyjay.com. The "Cookies by mail" card links to
  treatsdippedbyjay.com/collections/all; if the domain moves to this site, the shop needs another URL or the card goes.
- Videos: captions transcribed from the audio (Whisper) and cleaned. "Snickers and sweets" and "red velvet"
  (sounds like "red duckie") are best guesses.

## Reviews

- `site/assets/reviews.js`: `REVIEWS` is empty. The belt shows 4 dashed "Review slot" cards (marked "Placeholder, not a
  review"), the Instagram card (24.7K) and the Houston Style Magazine card. Add real reviews word for word to `REVIEWS`;
  slots fill whatever is left up to `MIN_CARDS`. Never invent or edit review text.
- Belt behavior is the hwest belt: drifts right to left; hover or keyboard focus eases it to a stop; drag or swipe (with
  fling) and sideways trackpad scroll move it; tapping a card stops it, centers it and shows the full text; review
  photos open in the lightbox; prev/next; Pause; Esc closes. Reduced motion: no drift. Copies after the first set are
  aria-hidden.

## Design direction

- One committed light look from the printed menu and logo: frosting pink (`--frost`), hot-pink price starbursts
  (`--hot`), chocolate brown slab type and box borders (`--cocoa`), deep chocolate reviews band (`--cocoa-deep`).
- Signature: drips. The pink hero drips into the page and the chocolate reviews band drips into Find the truck
  (`--drip` SVG tile used as a mask). Menu cards copy the printed menu's brown-bordered boxes with starburst prices.
- The logo is used as a die-cut white sticker (`logo.webp`, `logo-sm.webp`): the original pink-on-white artwork
  disappears on pink, so the white outline keeps it readable everywhere. Re-make from the client logo with the
  ImageMagick dilate/close steps if the art changes.
- Type: Alfa Slab One (display, like the printed menu's headings), Gelasio (body, like its item text).
- 3D: the hero strawberry (WebGL, below), price starbursts turn over on hover, cookies flip to show what's in them,
  the two video phones sit at an angle and straighten when hovered or unmuted.
- Copy rules: no em dashes; none of leverage, seamless, empower, unlock, robust, actionable, data-driven, solutions,
  testament, landscape, delve, elevate. Nothing meant to be read rests at opacity 0 waiting for an animation.

## 3D strawberry

- `src/strawberry.js`, built with `npm install && npm run build:3d` into `site/assets/strawberry3d.js` (three.js
  tree-shaken, about 550 KB, 140 KB gzipped). The built file is committed so the site needs no build step.
- Modeled in code: lathe-style body with seed dimples, instanced seeds, pink candy-melt dip with a rounded lip,
  chocolate drizzle tubes, strawberry crunch crumbs, calyx and stem, a generated studio environment for reflections.
- `main.js` imports it after `load` + idle, never on Save-Data or 2G. Until it renders, and wherever WebGL is missing,
  `strawberry-still.webp` shows (a render of the same model). Drag spins it; vertical swipes still scroll; it stops
  rendering offscreen; reduced motion turns off the spin and bob.
- To re-render the still: mount with `{ snapshot: true }` in a 1040px square host and save `snapshot()` as WebP.

## Media

- Videos: client MP4s (1080x1920 VP9, 17 MB and 23 MB) re-encoded to 540x960 H.264 CRF 30, 30 fps, AAC 64k,
  faststart: `apple-salad.mp4` 3.2 MB, `loaf-cakes.mp4` 4.2 MB. `preload="none"`, posters from frames 8 s and 17.3 s.
  They play muted with captions (`site/assets/captions/*.vtt`) while half on screen; one has sound at a time.
- Cookie cutouts and `loaf-strawberry.webp` are the owner's own product photos from the Shopify store.
- Waiting on four more photos from the client. Best slots: a cheesecake cup or cone, a dipped slice, the truck itself,
  and the specialty strawberries. Menu cards can take a photo above `.item__top`.

## Layout

- `site/index.html` + `site/assets/`: plain HTML/CSS/vanilla JS. `site.css` tokens and sections, `reviews.css` /
  `reviews.js` the belt, `main.js` nav, hours, 3D loader, videos, flavor filter, cookie flip, lightbox.
- Deploy: GitHub Pages via `.github/workflows/pages.yml`, which publishes `site/` on every push to `main` (or by hand from
  the Actions tab). Settings > Pages > Source must be "GitHub Actions". Patch the `DEPLOY STEP` comment (og:url,
  og:image) once the domain exists.
