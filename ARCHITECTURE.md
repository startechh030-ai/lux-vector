# Lux Vector — Hero V2

TypeScript + React + Babylon.js. All 3D is generated in code.

## V2 upgrades

- Migrated to TypeScript
- Chain links are forged **stadium / oval tubes**, not toy circles
- Only the **visible window** of chain exists. Links recycle as they leave the frame
- The strand **travels** from one screen edge to the other
- Snap is **once**: the contact link shatters, a ripple runs the body, both sides hang
- After the snap, the hanging chain can be **wiggled**, not broken again
- Idle ~4.8s reforms the strand and travel resumes
- Clouds **form**, drift, billow, scatter, and re-form

## Interaction

| Input | Target | Result |
| --- | --- | --- |
| Cross with finger / cursor | Moving chain | One snap at the contact link |
| Drag after snap | Hanging chain | Wiggle the two drapes |
| Sweep | Cloud | Cluster scatters |
| Idle | Scene | Chain and sky reform |

## Files

```
src/
  main.tsx App.tsx
  components/     Hero, overlay, logo
  scene/
    createScene.ts    boot, camera, lights, post, input
    chain.ts          traveling links, snap, verlet hang
    clouds.ts         form / drift / scatter
    textures.ts       cloud, neon, scratch, environment
    quality.ts        mobile / desktop budgets
    math.ts           path, frames, projection
    types.ts
```
