# Lux Vector — Hero map

Step 1 is the full-viewport 3D hero. Everything on this page is generated in code: no imported GLB, no stock HDRI.

## What should make someone stay

- A metallic chain that feels expensive and physically present
- Neon pulses that read as energy, not decoration
- Clouds that feel volumetric, not flat stickers
- Immediate play: swipe and the world answers
- The scene reforms, so the first action is never the last

## Interaction

| Input | Target | Result |
| --- | --- | --- |
| Tap / click / swipe | Chain | Links snap, tumble, and fly with the gesture |
| Tap / click / swipe | Cloud | The whole cluster scatters, then drifts |
| Idle ~2.8s | Both | Chain and sky reform |
| Mouse move (desktop) | Camera | Soft parallax |

Touch is first-class. The canvas uses `touch-action: none` so a swipe never scrolls the page.

## Copy (upgraded)

- Brand: **lux Vector**
- Headline: **The team that delivers.**
- Mantra: **Innovate. Create. Elevate.**
- Line: *A digital unit that turns sharp ideas into living products — designed with intent, built with precision, shipped without noise.*

Grammar is fixed. The line is quieter and more premium than a slogan pile-up.

## Scene graph

1. Dark void + exponential purple fog
2. Procedural cube environment (metal reflections)
3. Key / rim / neon lights
4. Code-built torus chain along a diagonal curve
5. Additive neon ring billboards on selected links
6. Layered billboard cloud clusters
7. Additive dust motes (desktop)
8. ACES + bloom + vignette
9. HTML overlay for razor-sharp type

## Files

```
src/
  components/     Hero, overlay, logo
  scene/
    createScene.js    boot, camera, lights, post, input
    chain.js          generated links + break / reform
    clouds.js         generated volumes + scatter / reform
    textures.js       cloud, neon, dust, environment
    quality.js        mobile / desktop budgets
    math.js           path and frames
```

## Quality split

Desktop keeps higher torus tessellation, more puffs, MSAA, and dust. Mobile drops density, caps DPR, and keeps the same gestures.

## Later steps (not this pass)

- Work gallery in 3D
- Team portraits / nodes
- Contact ritual
- Sound design
- Route / scroll chapters
