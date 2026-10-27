# App icon source

`make-icons.js` draws the icon (lime fuel drop + efficiency gauge on ink, colors from `src/ui/theme.ts`) and renders every PNG in `assets/images/`.

Regenerate (resvg is not a project dependency, so install it in a temp folder):

```bash
cd "$(mktemp -d)" && npm i @resvg/resvg-js@2
NODE_PATH=$PWD/node_modules node /path/to/fuelora/store/icon/make-icons.js /path/to/fuelora/assets/images
```

Android adaptive foreground/monochrome keep the glyph inside the 66% safe zone (scale 0.78).
