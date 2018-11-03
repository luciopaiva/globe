
const NUM_PARTICLES = 1000;
const TAU = Math.PI * 2;
const ROT_PERIOD_IN_SECS = 6;
const LON_STEP = TAU / 60 / ROT_PERIOD_IN_SECS;  // 1 rotation per second

const randomRads = () => Math.random() * TAU;

class Globe {

    constructor () {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.ctx.clearRect(0, 0, this.width, this.height);

        window.addEventListener("resize", this.resize.bind(this));
        this.resize();

        this.updateFn = this.update.bind(this);

        this.radius = 250;
        this.particles = new Float32Array(3 * NUM_PARTICLES);

        for (let i = 0; i < NUM_PARTICLES; i++) {
            this.particles[i * 3] = randomRads();
            this.particles[i * 3 + 1] = randomRads();
            this.particles[i * 3 + 2] = this.radius;
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

    update(now) {
        this.previousTimestamp = now;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // draw dark circle to represent the globe
        this.ctx.fillStyle = "#140006";
        this.ctx.beginPath();
        this.ctx.arc(this.halfWidth, this.halfHeight, this.radius, 0, TAU);
        this.ctx.fill();

        // draw particles on the visible side
        this.ctx.fillStyle = "#d20043";
        for (let i = 0; i < NUM_PARTICLES; i++) {
            const lat = this.particles[i * 3];
            const lon = this.particles[i * 3 + 1] + LON_STEP;

            // move particle
            this.particles[i * 3 + 1] = lon;

            const elevation = this.particles[i * 3 + 2];

            const x = Math.cos(lat) * Math.cos(lon) * elevation | 0;

            // only show particle if it's facing the camera
            if (x > 0) {
                // consider y to be x and z to be y (camera is seeing the sphere rotating from the side)
                const y = (Math.cos(lat) * Math.sin(lon) * elevation + this.halfWidth) | 0;
                const z = (this.halfHeight - Math.sin(lat) * elevation) | 0;

                this.ctx.fillRect(y, z, 1, 1);
            }
        }

        requestAnimationFrame(this.updateFn);
    }
}

new Globe();
