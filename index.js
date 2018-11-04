
const NUM_STARS = 1000;
const NUM_PARTICLES_SURFACE = 6000;
const NUM_PARTICLES_SKY = 2000;
const NUM_PARTICLES_FIRST_RING = 2000;
const NUM_PARTICLES_SECOND_RING = 6000;
const TAU = Math.PI * 2;
const ROT_PERIOD_IN_SECS = 30;
const RADIUS = 250;
const ATMOSPHERE_THICKNESS = 0.02;  // radius percent
const ATMOSPHERE_RADIUS = RADIUS * (1 + ATMOSPHERE_THICKNESS);
const LON_STEP = TAU / 60 / ROT_PERIOD_IN_SECS;  // 1 rotation per second
const SURFACE_LON_STEP = LON_STEP * 0.6;
const SKY_LAT_STEP = LON_STEP * 0.4;
const SKY_LON_STEP = LON_STEP;
const FIRST_RING_INNER_RADIUS = RADIUS * 1.55;
const FIRST_RING_THICKNESS = RADIUS * .10;
const SECOND_RING_INNER_RADIUS = RADIUS * 1.70;
const SECOND_RING_THICKNESS = RADIUS * .75;
const SATELLITE_RADIUS = RADIUS * 1.25;
const SHADES_OF_GRAY = false;
const RING_ROTATION_X_ANGLE_IN_RADS = Math.PI * .05;
const RING_ROTATION_Y_ANGLE_IN_RADS = -Math.PI * .05;
const RING_ROTATION_X_ANGLE_COS = Math.cos(RING_ROTATION_X_ANGLE_IN_RADS);
const RING_ROTATION_X_ANGLE_SIN = Math.sin(RING_ROTATION_X_ANGLE_IN_RADS);
const RING_ROTATION_Y_ANGLE_COS = Math.cos(RING_ROTATION_Y_ANGLE_IN_RADS);
const RING_ROTATION_Y_ANGLE_SIN = Math.sin(RING_ROTATION_Y_ANGLE_IN_RADS);
const SORTING_MARGIN = TAU / 360;

const randomRads = () => Math.random() * TAU;

class Globe {

    constructor () {
        this.showStats = true;
        this.statsElem = document.getElementById("stats");
        !this.showStats && this.statsElem.classList.add("hidden");
        this.satElem = document.getElementById("satellite-status");
        this.fpsElem = document.getElementById("fps");
        this.renderedCountElem = document.getElementById("rendered-particles");
        this.culledCountElem = document.getElementById("culled-particles");
        this.lightnessOffsetElem = document.getElementById("lightness-offset");
        this.updateLightnessOffset();

        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.lightSource = {x : .40, y : 0.40, z: 0.20};
        this.lightnessOffset = 0;
        this.stars = new Uint16Array(2 * NUM_STARS);
        this.satellite = new Float32Array(3);
        this.particlesSky = new Float32Array(3 * NUM_PARTICLES_SKY);
        this.particlesSurface = new Float32Array(3 * NUM_PARTICLES_SURFACE);
        this.particlesFirstRing = new Float32Array(3 * NUM_PARTICLES_FIRST_RING);
        this.particlesSecondRing = new Float32Array(3 * NUM_PARTICLES_SECOND_RING);

        // particles have 3 parameters: latitude, longitude and elevation
        // groups are sorted to minimize fillStyle switches, reducing CPU usage considerably

        // let longitudes = Array.from(Array(NUM_PARTICLES_SURFACE), () => randomRads());
        // longitudes.sort();
        for (let i = 0; i < NUM_PARTICLES_SURFACE; i++) {
            this.particlesSurface[i * 3] = randomRads();
            this.particlesSurface[i * 3 + 1] = randomRads();
            this.particlesSurface[i * 3 + 2] = RADIUS;
        }
        this.sortByLatitudeAndLongitude(this.particlesSurface, NUM_PARTICLES_SURFACE);
        for (let i = 0; i < NUM_PARTICLES_SURFACE; i++) {
            console.info(this.particlesSurface[i * 3 + 1].toFixed(4), this.particlesSurface[i * 3].toFixed(4));
        }
        console.info(SORTING_MARGIN);

        let longitudes = Array.from(Array(NUM_PARTICLES_SKY), () => randomRads());
        longitudes.sort();
        for (let i = 0; i < NUM_PARTICLES_SKY; i++) {
            this.particlesSky[i * 3] = randomRads();
            this.particlesSky[i * 3 + 1] = longitudes[i];
            this.particlesSky[i * 3 + 2] = ATMOSPHERE_RADIUS;
        }

        longitudes = Array.from(Array(NUM_PARTICLES_FIRST_RING), () => randomRads());
        longitudes.sort();
        for (let i = 0; i < NUM_PARTICLES_FIRST_RING; i++) {
            this.particlesFirstRing[i * 3] = 0;
            this.particlesFirstRing[i * 3 + 1] = longitudes[i];
            this.particlesFirstRing[i * 3 + 2] = FIRST_RING_INNER_RADIUS + Math.random() * FIRST_RING_THICKNESS;
        }

        longitudes = Array.from(Array(NUM_PARTICLES_SECOND_RING), () => randomRads());
        longitudes.sort();
        for (let i = 0; i < NUM_PARTICLES_SECOND_RING; i++) {
            this.particlesSecondRing[i * 3] = 0;
            this.particlesSecondRing[i * 3 + 1] = longitudes[i];
            this.particlesSecondRing[i * 3 + 2] = SECOND_RING_INNER_RADIUS + Math.random() * SECOND_RING_THICKNESS;
        }

        this.satellite[0] = 0;
        this.satellite[1] = .75 * TAU;
        this.satellite[2] = SATELLITE_RADIUS;

        this.renderedCount = 0;
        this.culledCount = 0;
        this.fpsCount = 0;
        setInterval(this.updateStats.bind(this), 1000);

        window.addEventListener("resize", this.resize.bind(this));
        this.resize();

        for (let i = 0; i < NUM_STARS; i++) {
            this.stars[i * 2] = Math.random() * this.width | 0;
            this.stars[i * 2 + 1] = Math.random() * this.height | 0;
        }

        document.documentElement.addEventListener("keypress", this.keypress.bind(this));

        document.body.appendChild(this.canvas);

        this.isRunning = true;

        this.updateFn = this.update.bind(this);
        this.previousTimestamp = performance.now();
        this.update(this.previousTimestamp);
    }

    static swapParticles(collection, i, j) {
        const lat = collection[i * 3];
        const lon = collection[i * 3 + 1];
        const elev = collection[i * 3 + 2];
        collection[i * 3] = collection[j * 3];
        collection[i * 3 + 1] = collection[j * 3 + 1];
        collection[i * 3 + 2] = collection[j * 3 + 2];
        collection[j * 3] = lat;
        collection[j * 3 + 1] = lon;
        collection[j * 3 + 2] = elev;
    }

    sortByLatitudeAndLongitude(particles, length) {
        // bubble sort, I know, but let's just keep it simple
        // had to implement my own sort to be able to sort the tuples in the Float32Array
        for (let i = 0; i < length - 1; i++) {
            for (let j = i + 1; j < length; j++) {
                const latDiff = particles[i * 3] - particles[j * 3];
                if (latDiff > 0) {
                    Globe.swapParticles(particles, i, j);
                } else if (Math.abs(latDiff) < SORTING_MARGIN) {
                    const longDiff = particles[i * 3 + 1] - particles[j * 3 + 1];
                    if (longDiff > 0) {
                        Globe.swapParticles(particles, i, j);
                    }
                }
            }
        }
    }

    keypress(event) {
        switch (event.key) {
            case "0": this.updateLightnessOffset(); break;
            case "-": this.updateLightnessOffset(-5); break;
            case "=": this.updateLightnessOffset(5); break;
            case "s": this.toggleStats(); break;
            case "p":
            case " ":
                this.isRunning = !this.isRunning;
                break;
        }
    }

    toggleStats() {
        this.showStats = !this.showStats;
        this.statsElem.classList.toggle("hidden");
    }

    updateStats() {
        this.fpsElem.innerText = "FPS: " + this.fpsCount;
        this.renderedCount = Math.round(this.renderedCount / this.fpsCount);
        this.renderedCountElem.innerText = `Rendered particles: ${this.renderedCount}`;
        this.culledCount = Math.round(this.culledCount / this.fpsCount);
        this.culledCountElem.innerText = `Culled particles: ${this.culledCount}`;
        this.fpsCount = 0;
        this.renderedCount = 0;
        this.culledCount = 0;
    }

    updateLightnessOffset(delta) {
        if (delta === undefined) {
            this.lightnessOffset = 0;
        } else {
            this.lightnessOffset += delta;
        }
        this.lightnessOffsetElem.innerText = `Lightness offset: ${this.lightnessOffset}`;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.halfWidth = this.width >>> 1;
        this.halfHeight = this.height >>> 1;
        this.canvas.setAttribute("width", this.width);
        this.canvas.setAttribute("height", this.height);
    }

    rotateY(x, y, z, cos, sin) {
        return [
            cos * x - sin * z,
            y,
            sin * x + cos * z
        ];
    }

    rotateX(x, y, z, cos, sin) {
        return [
            x,
            cos * y - sin * z,
            sin * y + cos * z
        ];
    }

    project(x, y, z) {
        // FixMe
        return [
            x,
            y / x,
            z / x
        ];
    }

    drawParticles(now, particles, particlesLength, latStep, lonStep, hue, saturation, baseLightness, lightnessBand,
                  particleSize, isOrbiting, isSatellite) {
        const styles = new Set();
        let count = 0;
        let previous = "";
        let switches = 0;
        for (let i = 0; i < particlesLength; i++) {
            const lat = particles[i * 3] + latStep;
            const lon = particles[i * 3 + 1] + lonStep;

            // move particle
            particles[i * 3] = lat;
            particles[i * 3 + 1] = lon;

            const elevation = particles[i * 3 + 2];

            let x = Math.cos(lat) * Math.cos(lon) * elevation;

            if (x < 0 && !isOrbiting) {
                this.culledCount++;
                continue;  // particles on the planet are immediately culled if on the back side
            }

            // consider y to be x and z to be y (camera is seeing the sphere rotating from the side)
            let y = Math.cos(lat) * Math.sin(lon) * elevation;
            let z = Math.sin(lat) * elevation;

            if (isSatellite && this.showStats) {
                this.satElem.innerText = `Satellite coords: [${x.toFixed(0)}, ${y.toFixed(0)}]`;
            }

            if (isOrbiting) {
                [x, y, z] = this.rotateX(x, y, z, RING_ROTATION_X_ANGLE_COS, RING_ROTATION_X_ANGLE_SIN);
                [x, y, z] = this.rotateY(x, y, z, RING_ROTATION_Y_ANGLE_COS, RING_ROTATION_Y_ANGLE_SIN);
            }

            if (isOrbiting && x < 0) {
                const distFromCenter = Math.sqrt(y**2 + z**2);
                if (distFromCenter < RADIUS) {
                    this.culledCount++;
                    continue;  // do not render stuff behind the planet
                }
            }

            // [x, y, z] = this.project(x, y, z);

            const screenX = y + this.halfWidth;
            const screenY = this.halfHeight - z;
            if (screenX < 0 || screenX > this.width || screenY < 0 || screenY > this.height) {
                this.culledCount++;
                continue;
            }

            let intensity;
            if (isSatellite) {
                intensity = (Math.cos(now / 100) + 1) / 2;
            } else {
                intensity = this.calculateLightIntensity(x, y, z);
            }

            let lightness = Math.min(baseLightness + this.lightnessOffset + intensity * lightnessBand, 100);

            if (lightness < 5) {
                this.culledCount++;
                continue;
            }

            lightness = Math.round(lightness / 10) * 10;  // trick to reduce amount of style switches

            saturation = SHADES_OF_GRAY ? 0 : saturation;

            const newstyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            styles.add(this.ctx.fillStyle = newstyle);
            count++;
            if (newstyle !== previous) {
                switches++;
                previous = newstyle;
            }
            this.ctx.fillRect(screenX, screenY, particleSize, particleSize);
            this.renderedCount++;
        }

        console.info(styles.size, count, switches);
    }

    update(now) {
        if (this.isRunning) {
            this.ctx.clearRect(0, 0, this.width, this.height);

            for (let i = 0; i < NUM_STARS; i++) {
                const brightness = 15 + Math.random() * 10;
                this.ctx.fillStyle = `hsl(0, 0%, ${brightness}%)`;
                this.ctx.fillRect(this.stars[i * 2], this.stars[i * 2 + 1], 1, 1);
            }
            this.renderedCount += NUM_STARS;

            // draw dark circle to represent the globe
            this.ctx.strokeStyle = "#020202";
            this.ctx.fillStyle = "black";
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.arc(this.halfWidth, this.halfHeight, RADIUS, 0, TAU);
            this.ctx.fill();
            this.ctx.stroke();

            this.drawParticles(now, this.particlesSurface, NUM_PARTICLES_SURFACE, 0, SURFACE_LON_STEP, 20, 100, 10, 50, 1);
            this.drawParticles(now, this.particlesSky, NUM_PARTICLES_SKY, SKY_LAT_STEP, SKY_LON_STEP, 30, 100, 10, 10, 1.3);
            this.drawParticles(now, this.satellite, 1, 0, SKY_LON_STEP, 0, 100, 0, 60, 2, true, true);
            this.drawParticles(now, this.particlesFirstRing, NUM_PARTICLES_FIRST_RING, 0, SURFACE_LON_STEP, 320, 80, 10, 80, 0.7, true);
            this.drawParticles(now, this.particlesSecondRing, NUM_PARTICLES_SECOND_RING, 0, SURFACE_LON_STEP, 300, 50, 10, 80, 0.7, true);
        }

        this.fpsCount++;
        this.previousTimestamp = now;
        requestAnimationFrame(this.updateFn);
    }

    calculateLightIntensity(x, y, z) {
        const len = Math.sqrt(x**2 + y**2 + z**2);
        x /= len; y /=len; z /= len;
        const dot = x * this.lightSource.x + y * this.lightSource.y + z * this.lightSource.z;
        return dot;
    }
}

new Globe();
