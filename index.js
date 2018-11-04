
const NUM_STARS = 1000;
const NUM_PARTICLES_SURFACE = 10000;
const NUM_PARTICLES_SKY = 10000;
const NUM_PARTICLES_FIRST_RING = 2000;
const NUM_PARTICLES_SECOND_RING = 6000;
const TAU = Math.PI * 2;
const ROT_PERIOD_IN_SECS = 30;
const RADIUS = 250;
const ATMOSPHERE_THICKNESS = 0.04;  // radius percent
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

const randomRads = () => Math.random() * TAU;

class Globe {

    constructor () {
        this.satElem = document.getElementById("satellite-status");
        this.fpsElem = document.getElementById("fps");

        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.radius = RADIUS;
        this.lightSource = {x : .40, y : 0.40, z: 0.20};
        this.stars = new Uint16Array(2 * NUM_STARS);
        this.satellite = new Float32Array(3);
        this.particlesSky = new Float32Array(3 * NUM_PARTICLES_SKY);
        this.particlesSurface = new Float32Array(3 * NUM_PARTICLES_SURFACE);
        this.particlesFirstRing = new Float32Array(3 * NUM_PARTICLES_FIRST_RING);
        this.particlesSecondRing = new Float32Array(3 * NUM_PARTICLES_SECOND_RING);

        for (let i = 0; i < NUM_PARTICLES_SURFACE; i++) {
            this.particlesSurface[i * 3] = randomRads();
            this.particlesSurface[i * 3 + 1] = randomRads();
            this.particlesSurface[i * 3 + 2] = this.radius;
        }

        for (let i = 0; i < NUM_PARTICLES_SKY; i++) {
            this.particlesSky[i * 3] = randomRads();
            this.particlesSky[i * 3 + 1] = randomRads();
            this.particlesSky[i * 3 + 2] = ATMOSPHERE_RADIUS;
        }

        for (let i = 0; i < NUM_PARTICLES_FIRST_RING; i++) {
            this.particlesFirstRing[i * 3] = 0;
            this.particlesFirstRing[i * 3 + 1] = randomRads();
            this.particlesFirstRing[i * 3 + 2] = FIRST_RING_INNER_RADIUS + Math.random() * FIRST_RING_THICKNESS;
        }

        for (let i = 0; i < NUM_PARTICLES_SECOND_RING; i++) {
            this.particlesSecondRing[i * 3] = 0;
            this.particlesSecondRing[i * 3 + 1] = randomRads();
            this.particlesSecondRing[i * 3 + 2] = SECOND_RING_INNER_RADIUS + Math.random() * SECOND_RING_THICKNESS;
        }

        this.satellite[0] = 0;
        this.satellite[1] = 0;
        this.satellite[2] = SATELLITE_RADIUS;

        this.fpsCount = 0;
        setInterval(() => { this.fpsElem.innerText = "FPS: " + this.fpsCount; this.fpsCount = 0; }, 1000);

        window.addEventListener("resize", this.resize.bind(this));
        this.resize();
        this.updateFn = this.update.bind(this);

        for (let i = 0; i < NUM_STARS; i++) {
            this.stars[i * 2] = Math.random() * this.width | 0;
            this.stars[i * 2 + 1] = Math.random() * this.height | 0;
        }

        document.body.appendChild(this.canvas);

        this.previousTimestamp = performance.now();
        this.update(this.previousTimestamp);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.halfWidth = this.width >>> 1;
        this.halfHeight = this.height >>> 1;
        this.canvas.setAttribute("width", this.width);
        this.canvas.setAttribute("height", this.height);
    }

    rotateY(x, y, z, angle) {
        return [
            Math.cos(angle) * x - Math.sin(angle) * z,
            y,
            Math.sin(angle) * x + Math.cos(angle) * z
        ];
    }

    rotateX(x, y, z, angle) {
        return [
            x,
            Math.cos(angle) * y - Math.sin(angle) * z,
            Math.sin(angle) * y + Math.cos(angle) * z
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
        for (let i = 0; i < particlesLength; i++) {
            const lat = particles[i * 3] + latStep;
            const lon = particles[i * 3 + 1] + lonStep;

            // move particle
            particles[i * 3] = lat;
            particles[i * 3 + 1] = lon;

            const elevation = particles[i * 3 + 2];

            let x = Math.cos(lat) * Math.cos(lon) * elevation;

            // only show particle if it's facing the camera (or if particle belongs to ring)
            if (x > 0 || isOrbiting) {
                // consider y to be x and z to be y (camera is seeing the sphere rotating from the side)
                let y = Math.cos(lat) * Math.sin(lon) * elevation;
                let z = Math.sin(lat) * elevation;

                if (isSatellite) {
                    this.satElem.innerText = `Satellite coords: ${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)}`;
                }

                if (isOrbiting) {
                    [x, y, z] = this.rotateY(x, y, z, -Math.PI * .05);
                    [x, y, z] = this.rotateX(x, y, z, Math.PI * .05);
                }

                // [x, y, z] = this.project(x, y, z);

                let intensity;
                if (isSatellite) {
                    intensity = (Math.cos(now / 100) + 1) / 2;
                } else {
                    intensity = this.calculateParticleIntensity(x, y, z);
                }

                const lightness = baseLightness + intensity * lightnessBand;

                saturation = SHADES_OF_GRAY ? 0 : saturation;
                this.ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;  // 340

                if (isSatellite && x < 0 && Math.abs(y) < RADIUS) {
                    continue;  // do not render satellite if behind planet
                }

                this.ctx.fillRect(y + this.halfWidth, this.halfHeight - z, particleSize, particleSize);
            }
        }
    }

    update(now) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        for (let i = 0; i < NUM_STARS; i++) {
            const brightness = 15 + Math.random() * 10;
            this.ctx.fillStyle = `hsl(0, 0%, ${brightness}%)`;
            this.ctx.fillRect(this.stars[i * 2], this.stars[i * 2 + 1], 1, 1);
        }

        // draw dark circle to represent the globe
        this.ctx.strokeStyle = "#020202";
        this.ctx.fillStyle = "black";
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(this.halfWidth, this.halfHeight, RADIUS, 0, TAU);
        this.ctx.fill();
        this.ctx.stroke();

        this.drawParticles(now, this.particlesSurface, NUM_PARTICLES_SURFACE, 0, SURFACE_LON_STEP, 20, 100, 5, 50, 1);
        this.drawParticles(now, this.particlesSky, NUM_PARTICLES_SKY, SKY_LAT_STEP, SKY_LON_STEP, 30, 100, 5, 20, 0.7);
        this.drawParticles(now, this.satellite, 1, 0, SKY_LON_STEP, 0, 100, 0, 60, 2, true, true);
        this.drawParticles(now, this.particlesFirstRing, NUM_PARTICLES_FIRST_RING, 0, SURFACE_LON_STEP, 320, 80, 5, 80, 0.7, true);
        this.drawParticles(now, this.particlesSecondRing, NUM_PARTICLES_SECOND_RING, 0, SURFACE_LON_STEP, 300, 50, 5, 80, 0.7, true);

        this.fpsCount++;
        this.previousTimestamp = now;
        requestAnimationFrame(this.updateFn);
    }

    calculateParticleIntensity(x, y, z) {
        const len = Math.sqrt(x**2 + y**2 + z**2);
        x /= len; y /=len; z /= len;
        const dot = x * this.lightSource.x + y * this.lightSource.y + z * this.lightSource.z;
        return dot;
    }
}

new Globe();
