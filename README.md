# RAUN Event & Decor — Website

Client website built by **Zanmi Connect** for RAUN Event & Decor (Tamarac, Florida).

## Stack

Static site — no build step, no backend, no monthly cost. Open `index.html` or serve the folder with any static host.

```
site/
├── index.html              # the whole site (one page)
├── assets/
│   ├── css/styles.css      # brand styles (navy #1F3778 / orange #DA7D46)
│   ├── js/site.js          # nav, booking form → WhatsApp, chatbot boot
│   └── img/
│       ├── logo/           # logo versions + favicons
│       └── gallery/        # gallery photos
└── chatbot/
    ├── engine.js           # Zanmi Connect Smart Assistant engine (shared module)
    └── raun-config.json    # RAUN chat script (questions → WhatsApp handoff)
```

## Sections

Header · Hero ("RUN TO RAUN") · Services · Gallery · Rentals · About · Client Love · Booking CTA band · Contact/booking form · Footer

## Key behaviors

- **Booking form → WhatsApp:** the form collects name, phone, date, guests, event type, and services, then opens WhatsApp with everything pre-filled to +1 (954) 534-4854. No email backend.
- **Chatbot:** rule-based, zero-cost assistant. Edit `chatbot/raun-config.json` to change what it says — no code changes needed.
- **Placeholders (swap before launch):** gallery photos are concept images; the 3 reviews are samples. Both are labeled on the page.

## Deploy

Any static host works (GitHub Pages, Netlify, Cloudflare Pages). Point the domain's DNS at the host when ready.

## Brand

See `../RAUN_Brand_Guidelines.pdf` — navy #1F3778, celebration orange #DA7D46, Montserrat.
