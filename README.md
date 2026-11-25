# MINAGIWA 水際

**[Watch it live](https://abu166.github.io/minagiwa/)**

A scroll-driven anime short in seven cuts. One WebGL stage, pinned acts, and drawn transitions (iris, ink sweep, diamond, paper burn, blade cut) that move with your scroll.

## Run

```sh
npm install
npm run dev
```

`npm run build` writes a static site to `dist/`.

## How it works

- `src/scroll.js` turns scroll position into an act, its progress, and how far the transition to the next act has run.
- `src/stage/` is the camera department: multiplane cels, the cel-shaded torii run, the water serpent, particles, and the compositor with impact frames, focus lines and letterbox.
- `src/acts/` is one file per cut.
- `src/ui/fx.js` fires Sakuga VFX effects at beats in the scroll.
- Motion is stepped on twos and threes where a key animator would.
- `prefers-reduced-motion` drops impact frames, flashes and effects.

## Credits

- Interface controls and effects: [Sakuga VFX](https://github.com/finktheartist/sakuga-vfx) by Justin Finkelman, MIT. Vendored in `public/sakuga-vfx/`.
- Built with three.js, GSAP and Lenis.
- Ren, the story and the art are original to this project. Character and background art was generated locally with Animagine XL 4.0 (CreativeML Open RAIL++-M), then cut out, upscaled and composited.
