# Ghostyle ⇄ Creator Commerce — Integration Status & TODO

Status note for the ghostyle (Shopify store) ↔ Creator Commerce integration.
Last updated: 2026-06-29.

Three repos/surfaces are involved:
- **Creator Commerce / portal** (`apps/portal`) → `creator.ghostyle.com`
- **Design Engine** (`design-engine`) → `editor.ghostyle.com`
- **ghostyle Shopify storefront + custom app** (separate project)

---

## ✅ Done (in this repo, on `main`)

**"Sync to your store" data pipe (Steps 1–2) — verified live end-to-end**
- Design Engine: when launched with `callback_url`, on save it form-POSTs the
  design and targets `_top` to escape the iframe into the host. ERP product is
  loaded server-side by id (`?templates=erp-<id>`, no cache, no token).
- Portal: `POST /api/products/sync-redirect` → `/dashboard/products/sync`
  creates the product → lands on the Detail step.
- Not-logged-in resume: middleware redirects to `/login?next=…`, login/register
  honor `next`, the design payload survives the auth hop (sessionStorage).

**Step 3 — Shopify customer ↔ creator sync (code done)**
- `POST /api/webhooks/shopify/customers` (HMAC via `SHOPIFY_WEBHOOK_SECRET`)
  stages customers + back-fills creators; migration `022` adds
  `creators.shopify_customer_id` + a link-on-signup trigger.

**Two-button finish ("Add to cart" / "Sync to your store") — editor side done**
- Launch editor with `&cart=1` to show both. "Add to cart" posts
  `DESIGN_EDITOR_ADD_TO_CART` to the parent (ghostyle adds to its Shopify cart).

**Account hub (Track A)**
- `My Orders` board (`/dashboard/my-orders`) — buyer view, fetches this creator's
  ghostyle orders via the store Admin API + their linked `shopify_customer_id`.
- Store-nav header (Shop / Cart links back to the storefront).

**Ghostyle UI restyle** — fonts (Figtree + Clash Display) + colors (black /
yellow `#FFD166` / off-white) wired in `globals.css`; auth pages, sidebar,
dashboard, wizard restyled.

**Fixes** — editor `public/` 404s (Dockerfile copied public to the wrong path in
the standalone image), single-product embed scoping, sync-redirect hardening.

---

## ⏳ TODO

### Deploy (redeploy both Render services to pick up the above)
- [ ] Redeploy **design-engine** (Dockerfile public fix, ERP-by-id load, 404
      fixes, two-button).
- [ ] Redeploy **portal** (UI restyle, My Orders, store-nav header).

### Migrations (apply in Supabase SQL editor if not already)
- [ ] `019` size_guide, `020` shipping_cost, `021` tags (product wizard).
- [ ] `022` shopify customer sync (required for My Orders + Step 3 linking).

### Env vars
- Portal (Render):
  - [ ] `APP_URL=https://creator.ghostyle.com`
  - [ ] `NEXT_PUBLIC_DESIGN_ENGINE_URL=https://editor.ghostyle.com`
  - [ ] `NEXT_PUBLIC_STORE_URL=https://ghostyle.com` (storefront domain; for Shop/Cart links)
  - [ ] `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_ACCESS_TOKEN` (custom app Admin token)
  - [ ] `SHOPIFY_WEBHOOK_SECRET` = the **Notifications → Webhooks** signing secret (NOT the app API secret, since the customers webhook is created under Notifications)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (webhooks write the DB with it)
  - (R2 + ERP + Supabase anon already set)
- Supabase:
  - [ ] Authentication → turn OFF email confirmation (so register→resume is seamless).

### Shopify side (ghostyle theme + admin)
- [ ] Theme embed: set `callback_url=https://creator.ghostyle.com/api/products/sync-redirect` (NOT `studio.…`).
- [ ] Add `&cart=1` to the embed URL to enable the "Add to cart" button.
- [ ] Handle the `DESIGN_EDITOR_ADD_TO_CART` postMessage → add to Shopify cart,
      using the preview from `payload.products[0].variant_previews` (R2 URL) as a
      line-item property `_design_preview` (so My Orders + cart show the design).
- [ ] Fill each product's `pod.erp_product_id` metafield with its ERP id.
- [ ] Admin → Notifications → Webhooks: create **Customer creation** →
      `https://creator.ghostyle.com/api/webhooks/shopify/customers` (Format JSON,
      a stable API version). Use the page's signing secret as `SHOPIFY_WEBHOOK_SECRET`.

### Account hub — Track A remaining
- [ ] Customer Account UI Extension (in the ghostyle custom app): a small
      "Your Studio" bridge card in the Shopify account page → links to
      creator.ghostyle.com. (Real dev work: Shopify CLI + `@shopify/ui-extensions`.)

### Deferred / strategic
- [ ] **SSO** (option C): seamless login between ghostyle and Creator Commerce
      via a signed-token handoff. Currently two separate logins (acceptable v1).
- [ ] **Track B — POD app**: a full Shopify app (Printful / Ninja-Transfer style)
      that creators install on **their own** store. Separate, larger strategic
      build — decide based on whether the primary entry is "the ghostyle store"
      vs "creators' own stores". Does NOT replace the current flow; it's another
      channel into the same backend.

---

## Key decisions
- **Legacy customer accounts are off the table.** Per shopify.dev changelog
  (effective 2026-02-19), stores not already on legacy can no longer enable it;
  ghostyle is on new customer accounts. So the account experience lives in
  Creator Commerce (which we control), not Shopify's account page.
- **One person can be buyer + seller → one account, two boards** (My Orders +
  Selling), unified by the email → `shopify_customer_id` link.
- **The Shopify Admin token is server-side only** — never in the theme/frontend.
  The theme reads product metafields (no token needed).
