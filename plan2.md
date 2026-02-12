# Plan: 32x32 Sprite Upgrade (64bitimprovement branch)

## Overview
Upgrade the rendering pipeline from 16x16 to 32x32 sprites using a `PIXEL_SCALE: 2` multiplier. The internal buffer doubles in resolution while the logical coordinate system stays the same. This allows incremental replacement of sprite art.

## Phase 1: Rendering Pipeline (DONE - uncommitted)

### config.js
- [x] Add `PIXEL_SCALE: 2`, `BUFFER_WIDTH: 640`, `BUFFER_HEIGHT: 416`, `SPRITE_SIZE: 32`

### canvas-renderer.js
- [x] Buffer at 640x416 instead of 320x208
- [x] All drawing methods multiply logical coords by PIXEL_SCALE
- [x] New helpers: `drawImageFlipped()`, `drawImageTransformed()`, `fillRectAlpha()`
- [x] `present()` scales from BUFFER_WIDTH/HEIGHT to display

### sprite-renderer.js
- [x] Sprites render to 32x32 canvases
- [x] Support both 16x16 source (upscaled 2x) and native 32x32 data (length === 1024)
- [x] Tinted sprites updated with same logic

### Consumer refactors
- [x] `character.js` — uses `drawImageFlipped()` / `drawImage()` helpers
- [x] `worker.js` — uses `drawImageTransformed()` for death rotation
- [x] `app.js` — uses `fillRectAlpha()`, `CONFIG.TILE` instead of hardcoded 16
- [x] `office.js` / `fire-status.js` — use `fillRectAlpha()`
- [x] `pixel-font.js` — font glyphs scaled by PIXEL_SCALE

## Phase 2: Eliminate raw getBufferContext() calls (DONE)
- [x] Audit all remaining `getBufferContext()` usage across the codebase
- [x] Added `setAlpha()`/`resetAlpha()` and `pixelCSS()` to canvas-renderer
- [x] `worker.js` — soul drawing uses `setAlpha()`/`resetAlpha()` instead of raw context
- [x] `pixel-font.js` — uses `renderer.pixelCSS()` instead of raw context
- [x] `state-machine.js` — replaced hardcoded `16` with `CONFIG.TILE`
- [x] Verified: `getBufferContext()` now only exists in canvas-renderer.js definition
- Files confirmed clean (already used renderer methods): whiteboard.js, hud.js, desk.js, door.js, particles.js, fire-status.js

## Phase 3: Native 32x32 Sprite Art (future)
- [ ] Create native 32x32 sprite data (1024-element arrays) in sprite-data.js
- [ ] Replace upscaled 16x16 sprites one-by-one with hand-drawn 32x32 versions
- [ ] The `isNative32` detection (data.length === 1024) already handles this automatically

## Architecture Notes
- Logical coordinates remain in the original 320x208 / 16px-tile space
- PIXEL_SCALE is applied at the rendering layer only
- Native 32x32 sprites are detected by array length (1024 vs 256)
- The display pipeline: buffer (640x416) -> scale down to fit window -> present
