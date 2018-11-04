
# Globe

![](screenshot.png)

A rotating globe made of thousands of particles, rendered on a 2D canvas.

## Use filStyle wisely

Setting `context.fillStyle` is expensive, but only if the value style actually changed. If you pass the same style currently being used, it doesn't seem to hurt CPU. This gave me a few ideas.

My first action was to get rid of fractional values, because they won't contribute to the final color, but can cost precious CPU! In my case, rounding the HSL lightness value before passing it to `fillStyle` increased my FPS from 35 to 43 (20% faster!).

Another trick to gain some extra frames per second is to truncate lightness from 100 possible values to just 10:

    lightness = Math.round(lightness / 10) * 10;

This makes `fillStyle` do even less style switches, making us go from 43 to 47 FPS. Visualization quality was not affected at all by this.

And then it naturally occurred to me: if I could find some way of processing all particles ordered by the style they want, I would optimize even more my rendering function. It so happens that particles in the same longitude have more or less the same style, so I decided to sort particles accordingly during initialization. This brought me from my previous 47 to 57 FPS! 21% faster than without sorting :-)

Although particles in the same longitude don't change lightness that much, I decided to try also sorting planet particles by latitude. One funny thing that happened is that I initially created two sorted lists: one of longitudes and another of latitudes. To initialize the nth element in the array, I picked the nth longitude and the nth latitude values. This is what happened:

![](sorting-gone-wrong.png)

The fix consisted of placing points randomly and only then sorting them, longitude first and then latitude. The gain was negligible (if any), though. Sorting by latitude just makes sense for points on the surface, since points in the sky are constantly changing latitude and points in the rings all have latitude zero anyway. I ended up sorting just by longitude to make the code simpler.

Phew. With all improvements together, I was able to make the code go 62% faster :-)

## Part 2: analyzing number of style switches

    distinct-styles  fills  switches
    4                2328   1440
    2                994    135
    1                1      1
    6                1041   11
    6                3218   11

Even by sorting surface points by longitude, the number of style switches is still pretty high. Sorting by longitude+latitude or just by latitude doesn't do any good either.

Latitude only

4 2334 1203
2 1004 152
1 1 1
6 1043 11
6 3225 11

Longitude + latitude

4 2387 1449
2 1004 182
1 1 1
6 1068 11
6 3228 11

Latitude + longitude

4 2290 1156
2 986 164
1 1 1
6 1045 11
6 3265 11

