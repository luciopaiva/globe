
# Globe

![](screenshot.png)

A rotating globe made of thousands of particles, rendered on a 2D canvas.

## Lessons learned

Calling `context.fillStyle` is expensive, but only if the value style actually changed. If you pass the same style currently being used, it doesn't seem to hurt CPU that bad.

So watch out if you pass fractional values, because they won't contribute to the final color, but can cost precious CPU! In my case, rounding the HSL lightness value before passing it to `fillStyle` increased my FPS from 35 to 43 (20% faster!).

Another trick to gain some extra frames per second is to truncate lightness from 100 possible values to just 10:

    lightness = Math.round(lightness / 10) * 10;

This makes `fillStyle` do even less style switches, making us go from 43 to 47 FPS.
