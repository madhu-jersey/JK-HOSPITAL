# J.K Hospital, Tanuku — website

Static, bilingual (English / తెలుగు) one-page site. No build step.

```
public/
  index.html            page (English content, SEO tags, Hospital JSON-LD)
  404.html              not-found page
  css/styles.css        all styles (palette sampled from the logo: blue #003FB0, red #E40514)
  js/i18n.js            Telugu translations (edit Telugu text here)
  js/main.js            language toggle, live OP-hours status, menu, reveals, gallery viewer, reviews
  images/               photos (optimised from ASSETS/)
  fonts/                self-hosted variable fonts (Inter, Bricolage Grotesque, Noto Sans Telugu — SIL OFL, via Fontsource)
```

## Photos

All photos are real, optimised from `ASSETS/`. To swap one, drop a new JPG in with the same file name.

| File | Where |
|---|---|
| `images/hero-building.jpg` + `images/hero-building-720.jpg` | Hero (the 720px copy is served to phones; replace both) |
| `images/doctor-lokeswara-reddy.jpg` | Doctors – Dr. N. Lokeswara Reddy |
| `images/doctor-nagendranath.jpg` | Doctors – Dr. Tangirala T.P. Nagendranath |
| `images/gallery/NN-640.jpg` + `images/gallery/NN.jpg` | Facilities gallery, 01–15 (thumbnail + full size for the photo viewer) |

The gallery keeps each photo's own shape. If you change a photo's orientation, update its `--r` value
(width ÷ height) and its `width`/`height` attributes in `index.html`. Photos 10–15 sit behind "View more photos".

## Preview locally

```bash
npx serve public
```

## Deploy to Vercel

Import the folder as a project (Framework preset: **Other**, no build command). `vercel.json` serves `public/`;
`.vercelignore` keeps the large `ASSETS/` originals out of the upload.
No domain is hard-coded; once the domain is recovered, optionally add `<link rel="canonical">`, an absolute
`og:image` URL and a `sitemap.xml`.
