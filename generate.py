#!/usr/bin/env python3
import random
while True:
    t = random.randint(1, 20)
    p = random.randint(1, 500)
    z = random.randint(1, 20)
    s = random.randint(1, 10000)
    if t + p + z > (2 * s + 1) ** 2:
        continue
    break
used = set()
for n in ( t, p, z ):
    print(n)
    for _ in range(n):
        while True:
            x = random.randint(- s, s)
            y = random.randint(- s, s)
            if ( x, y ) in used:
                continue
            break
        print(x, y)
        used.add(( x, y ))
