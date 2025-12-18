/// <reference path="cell.ts" />

type RGBColor = { r: number; g: number; b: number };

type SparkleParticle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    rotation: number;
    spin: number;
    color: RGBColor;
};

class EffectsLayer {
    parent: HTMLElement;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    particles: SparkleParticle[] = [];
    animationFrame: number | null = null;
    lastTimestamp: number = 0;
    resizeObserver: ResizeObserver | null = null;

    constructor(parent: HTMLElement) {
        this.parent = parent;
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("effects-canvas");
        this.canvas.style.position = "absolute";
        this.canvas.style.left = "0";
        this.canvas.style.top = "0";
        this.canvas.style.pointerEvents = "none";
        this.canvas.style.zIndex = "5";
        const context = this.canvas.getContext("2d");
        if (!context) {
            throw new Error("Failed to initialize effects overlay");
        }
        this.ctx = context;
        this.parent.appendChild(this.canvas);
        this.resizeCanvas();
        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
            this.resizeObserver.observe(this.parent);
        }
    }

    refreshSize() {
        this.resizeCanvas();
    }

    dispose() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.particles = [];
        this.canvas.remove();
    }

    emitSparkles(cells: Cell[]) {
        if (cells.length === 0) {
            return;
        }
        const containerRect = this.parent.getBoundingClientRect();
        for (let cell of cells) {
            if (!cell.element) continue;
            const rect = cell.element.getBoundingClientRect();
            const centerX = rect.left - containerRect.left + rect.width / 2;
            const centerY = rect.top - containerRect.top + rect.height / 2;
            const rgb = this.parseColor(cell.element.style.backgroundColor);
            this.spawnBurst(centerX, centerY, rgb);
        }
        this.startLoop();
    }

    private resizeCanvas() {
        const rect = this.parent.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        if (this.canvas.width === width && this.canvas.height === height) {
            return;
        }
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
    }

    private startLoop() {
        if (this.animationFrame !== null) {
            return;
        }
        this.animationFrame = requestAnimationFrame(this.loop);
    }

    private loop = (timestamp: number) => {
        if (this.animationFrame === null) {
            return;
        }
        if (this.lastTimestamp === 0) {
            this.lastTimestamp = timestamp;
        }
        const delta = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        this.resizeCanvas();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const alive: SparkleParticle[] = [];
        for (let particle of this.particles) {
            particle.life -= delta;
            if (particle.life <= 0) {
                continue;
            }
            particle.vy += 120 * delta;
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.rotation += particle.spin * delta;

            alive.push(particle);
            const alpha = Math.max(0, particle.life / particle.maxLife);
            const size = particle.size * alpha;
            if (size <= 0) {
                continue;
            }
            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation);
            this.ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
            this.drawSparkle(size);
            this.ctx.restore();
        }

        this.particles = alive;
        if (this.particles.length === 0) {
            this.animationFrame = null;
            this.lastTimestamp = 0;
            return;
        }
        this.animationFrame = requestAnimationFrame(this.loop);
    };

    private drawSparkle(size: number) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(size * 0.4, 0);
        this.ctx.lineTo(0, size);
        this.ctx.lineTo(-size * 0.4, 0);
        this.ctx.closePath();
        this.ctx.fill();
    }

    private spawnBurst(x: number, y: number, color: RGBColor) {
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 120;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const life = 0.5 + Math.random() * 0.4;
            const particle: SparkleParticle = {
                x,
                y,
                vx,
                vy,
                life,
                maxLife: life,
                size: 6 + Math.random() * 6,
                rotation: Math.random() * Math.PI,
                spin: (Math.random() - 0.5) * 6,
                color: color,
            };
            this.particles.push(particle);
        }
    }

    private parseColor(value: string): RGBColor {
        if (!value) {
            return { r: 255, g: 255, b: 255 };
        }
        if (value.startsWith("#")) {
            const hex = value.substring(1);
            if (hex.length === 3) {
                const r = parseInt(hex[0] + hex[0], 16);
                const g = parseInt(hex[1] + hex[1], 16);
                const b = parseInt(hex[2] + hex[2], 16);
                return { r, g, b };
            }
            if (hex.length === 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return { r, g, b };
            }
        }
        const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (match) {
            return {
                r: parseInt(match[1], 10),
                g: parseInt(match[2], 10),
                b: parseInt(match[3], 10)
            };
        }
        return { r: 255, g: 255, b: 255 };
    }
}
