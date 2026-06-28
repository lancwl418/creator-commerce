# ghostyle ⇄ Creator Commerce — "Sync to your store" embed spec

Handoff for the **ghostyle Shopify storefront** project. Describes what the
ghostyle side must build to embed the Design Engine on product pages and wire
the **"Sync to your store"** action that hands a finished design to Creator
Commerce.

The Creator Commerce + Design Engine side of this is already implemented
(commit `44800df`). This doc is the contract ghostyle codes against.

---

## Flow

```
ghostyle product page
  └─ embeds Design Engine (iframe)  →  customer designs
        ├─ "Order directly"      → ghostyle's normal Shopify checkout (no Creator Commerce)
        └─ "Sync to your store"  → editor form-POSTs the design to Creator Commerce
                                     → lands the customer on the product editor (Detail step)
```

The two CTAs are **ghostyle's** UI. The difference is purely *which* editor
launch the button triggers (see below). "Order directly" is out of scope here.

---

## 1. Embed the editor

Open the Design Engine `/embed` page in an iframe on the product page. The
editor needs the **blank POD product** to design on (mockup image + printable
area) — but **the theme does not supply it and needs no Shopify token**. Just
pass the ERP product id; the editor loads the product (mockup + print areas)
from ERP itself, server-side.

**Launch the iframe:**

```
https://editor.ghostyle.com/embed
  ?templates=erp-<ERP_PRODUCT_ID>
  &callback_url=<urlencoded https://creator.ghostyle.com/api/products/sync-redirect>
  &parent_origin=<urlencoded https://your-product-page-origin>
```

- `templates` — `erp-<id>`, where `<id>` is the product's `pod.erp_product_id`
  metafield. The editor fetches that ERP product directly (no cache, no token).
- `callback_url` — **this is what makes it "Sync to your store"** (see §2). Omit
  it for a design-only/preview embed.
- `parent_origin` — the origin of the page hosting the iframe (for postMessage /
  navigation safety).

The theme reads `product.metafields.pod.erp_product_id` (Liquid, no token) and
builds the URL. **No products-cache, no product object, no Shopify token needed
on the theme side** — all of that is handled server-side by the editor's ERP
connection.

> For "Order directly", launch the editor **without** `callback_url` (or use
> your own checkout integration). Only the sync path needs `callback_url`.

---

## 2. What "Sync to your store" does on save

When `callback_url` is present, on save the editor **form-POSTs** the design
payload to that URL and, because it runs in an iframe, submits with
`target="_top"` — so the **whole browser navigates** out of ghostyle and into
Creator Commerce. ghostyle does not need to handle the payload itself.

The POST is `application/x-www-form-urlencoded` with a single field:

```
payload = <JSON string>   // shape: { design_id, products: [...], title_prefix }
```

This is the shared design-payload format (`@creator-commerce/shared`). ghostyle
does not construct it — the editor does.

---

## 3. Creator Commerce side (already built — for reference)

`POST https://creator.ghostyle.com/api/products/sync-redirect`
- Receives the form POST, stashes the payload, bounces to
  `/dashboard/products/sync`.
- That page **requires a logged-in creator**, creates the product from the
  design, and redirects to `/dashboard/products/<id>?from=sync` — the product
  editor's **Detail step (step 3)**, with Product + Design already complete.

---

## 4. Auth / login

- **Step 1 (current):** if the customer is already logged into Creator Commerce
  they flow straight through. If not, they currently bounce to the Creator
  Commerce `/login`.
- **Why subdomains matter:** once `creator.ghostyle.com` sets its session cookie
  on `domain=.ghostyle.com`, a customer logged in on any `*.ghostyle.com` is
  recognized — so the sync lands them straight in without a re-login.
- A payload-preserving "register/login then resume" flow is **Step 2** on the
  Creator Commerce side (not built yet).

---

## 5. ghostyle decisions / TODO

1. **Product data source** — just set each product's `pod.erp_product_id`
   metafield to its ERP id. The editor loads the product (mockup + print areas)
   from ERP by id — no cache, no Shopify token, no product object on the theme.
2. **Button placement** — where "Order directly" vs "Sync to your store" appear
   on the product page, and gating (e.g. only show "Sync to your store" to
   logged-in creators, or always show and let the login redirect handle it).
3. **Domains** — `editor.ghostyle.com` (engine) and `creator.ghostyle.com`
   (Creator Commerce) must be live with TLS for the iframe + top-navigation to
   work cross-subdomain.

---

## 6. Do you need a Shopify App? (and product metafields)

**Short answer:** the design + "Sync to your store" flow (§1–§2) needs **only a
theme embed — no app**. A **custom app** is needed only for the deeper
integration (user-account sync webhook, reading product data via Admin API).
Because ghostyle is your *own* store, that's a **custom app** (single store, no
App Store listing or review) — not a public app.

### Theme embed (no app) — covers Steps 1–2

- Add a section / block / snippet to the product template that renders the
  editor iframe and the two CTAs ("Order directly" / "Sync to your store").
- The editor is iframe-embeddable, and `editor.ghostyle.com` is same-site under
  `ghostyle.com`, so there are no third-party-cookie issues.
- A Theme App Extension (app block) is a tidier way to let the merchant place it
  from the theme editor, but a plain Liquid snippet works just as well.

### Product metafields — how the theme knows what to design

The editor needs the **blank POD product** (mockup image + printable area),
which comes from **ERP, not Shopify**. Map each Shopify product to its ERP
product via metafields; the theme reads them to build the product-cache payload
and the launch URL:

| Metafield (`namespace.key`) | Type | Example |
|---|---|---|
| `pod.erp_product_id` | single_line_text | `2041399393261305857` |
| `pod.print_areas` | json | `[{ "area":"front", "widthPx":…, "heightPx":…, … }]` — or fetch from ERP by id at launch time |

Theme flow: read `product.metafields.pod.erp_product_id` → launch the editor
with `templates=erp-<id>` (§1). The editor loads the ERP product server-side —
no products-cache and no Shopify token on the theme. `pod.print_areas` is
optional (the editor gets print areas from ERP). Metafield **definitions +
values** can be set in the Shopify admin or written by the custom app.

### Custom app — needed for Step 3 (and later)

Create a **custom app** for ghostyle (Admin → Settings → Apps and sales
channels → *Develop apps*, or via the Partner dashboard) to get Admin API
access + webhooks:

- `customers/create` webhook → Creator Commerce provisions a matching creator
  account (**Step 3 user sync**).
- Admin API → read products / write the metafields above programmatically.
- (Later) order webhooks for fulfillment 回流.
- Likely scopes: `read_products`, `write_products` (for metafields),
  `read_customers` / `write_customers`, `read_orders`.
- Private to ghostyle — **no App Store review**.

> Not on Shopify Plus → no Multipass SSO. Login stays on Creator Commerce's own
> auth; shared `.ghostyle.com` cookies keep it seamless across subdomains.

### Recommended split

1. **Now:** theme embed (iframe + 2 CTAs) → run Steps 1–2. No app required.
2. **In parallel:** stand up the custom app + product metafields → unblocks
   Step 3 (user sync) and clean product-data access.

