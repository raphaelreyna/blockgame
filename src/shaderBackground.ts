interface ShaderBackgroundDefinition {
    id: string;
    name: string;
    fragmentSource: string;
    updatedAt: number;
}

class ShaderBackgroundStore {
    private static readonly STORAGE_KEY = "blockgame.shaderBackgrounds";
    private static readonly ACTIVE_KEY = "blockgame.activeShaderBackground";

    getAll(): ShaderBackgroundDefinition[] {
        const raw = localStorage.getItem(ShaderBackgroundStore.STORAGE_KEY);
        if (!raw) {
            return [];
        }
        try {
            const parsed = JSON.parse(raw) as ShaderBackgroundDefinition[];
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.filter(entry => typeof entry.id === "string" && typeof entry.name === "string" && typeof entry.fragmentSource === "string" && typeof entry.updatedAt === "number");
        } catch (_error) {
            return [];
        }
    }

    save(entry: ShaderBackgroundDefinition): ShaderBackgroundDefinition[] {
        const existing = this.getAll();
        const index = existing.findIndex(item => item.id === entry.id);
        if (index >= 0) {
            existing[index] = entry;
        } else {
            existing.push(entry);
        }
        localStorage.setItem(ShaderBackgroundStore.STORAGE_KEY, JSON.stringify(existing));
        return existing;
    }

    delete(id: string): ShaderBackgroundDefinition[] {
        const remaining = this.getAll().filter(entry => entry.id !== id);
        localStorage.setItem(ShaderBackgroundStore.STORAGE_KEY, JSON.stringify(remaining));
        const activeId = this.getActiveId();
        if (activeId === id) {
            this.setActiveId(null);
        }
        return remaining;
    }

    getById(id: string): ShaderBackgroundDefinition | undefined {
        return this.getAll().find(entry => entry.id === id);
    }

    getActiveId(): string | null {
        return localStorage.getItem(ShaderBackgroundStore.ACTIVE_KEY);
    }

    setActiveId(id: string | null): void {
        if (id) {
            localStorage.setItem(ShaderBackgroundStore.ACTIVE_KEY, id);
        } else {
            localStorage.removeItem(ShaderBackgroundStore.ACTIVE_KEY);
        }
    }
}

class ShaderBackgroundRenderer {
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext | null;
    private program: WebGLProgram | null = null;
    private vertexBuffer: WebGLBuffer | null = null;
    private timeUniform: WebGLUniformLocation | null = null;
    private resolutionUniform: WebGLUniformLocation | null = null;
    private iResolutionUniform: WebGLUniformLocation | null = null;
    private iTimeUniform: WebGLUniformLocation | null = null;
    private iTimeDeltaUniform: WebGLUniformLocation | null = null;
    private iFrameUniform: WebGLUniformLocation | null = null;
    private iFrameRateUniform: WebGLUniformLocation | null = null;
    private iMouseUniform: WebGLUniformLocation | null = null;
    private iDateUniform: WebGLUniformLocation | null = null;
    private iChannelTimeUniforms: (WebGLUniformLocation | null)[] = [];
    private iChannelResolutionUniforms: (WebGLUniformLocation | null)[] = [];
    private startTime = 0;
    private lastFrameTime = 0;
    private frameCount = 0;
    private rafId: number | null = null;
    private supported = true;
    private lastError: string | null = null;
    private readonly channelCount = 4;
    private placeholderTextures: WebGLTexture[] = [];
    private readonly vertexSource = `attribute vec2 a_position;
varying vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    constructor(canvasId: string = "shader-bg-canvas") {
        const existingCanvas = document.getElementById(canvasId);
        if (existingCanvas instanceof HTMLCanvasElement) {
            this.canvas = existingCanvas;
        } else {
            this.canvas = document.createElement("canvas");
            this.canvas.id = canvasId;
            document.body.prepend(this.canvas);
        }
        this.gl = this.canvas.getContext("webgl");
        if (!this.gl) {
            this.supported = false;
            return;
        }
        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        const vertices = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1
        ]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        this.createPlaceholderTextures();
        window.addEventListener("resize", () => this.resizeCanvas());
        this.resizeCanvas();
    }

    isSupported(): boolean {
        return this.supported;
    }

    clearShader(): void {
        if (!this.gl) {
            return;
        }
        this.stopLoop();
        this.disposeProgram();
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.lastError = null;
    }

    setShader(fragmentSource: string): { success: boolean; error?: string } {
        if (!this.gl) {
            return { success: false, error: "WebGL not supported in this browser." };
        }
        this.stopLoop();
        const normalizedSource = this.normalizeFragmentSource(fragmentSource);
        const program = this.buildProgram(normalizedSource);
        if (!program) {
            return { success: false, error: this.lastError ?? "Failed to compile shader." };
        }
        this.disposeProgram();
        this.program = program;
        this.gl.useProgram(program);

        const positionLocation = this.gl.getAttribLocation(program, "a_position");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.captureUniformLocations(program);
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;
        this.frameCount = 0;
        this.lastError = null;
        this.animate();
        return { success: true };
    }

    private animate(): void {
        if (!this.gl || !this.program) {
            return;
        }
        this.resizeCanvas();
        this.rafId = requestAnimationFrame(() => this.animate());
        const frameIndex = this.frameCount;
        const now = performance.now();
        const elapsedSeconds = (now - this.startTime) / 1000;
        const deltaSeconds = frameIndex === 0 ? 0 : (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        this.applyBuiltInUniforms(elapsedSeconds, deltaSeconds, frameIndex);
        this.frameCount = frameIndex + 1;
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    private stopLoop(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private resizeCanvas(): void {
        if (!this.gl) {
            return;
        }
        const devicePixelRatio = window.devicePixelRatio || 1;
        const displayWidth = Math.floor(window.innerWidth * devicePixelRatio);
        const displayHeight = Math.floor(window.innerHeight * devicePixelRatio);
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.canvas.style.width = `${window.innerWidth}px`;
            this.canvas.style.height = `${window.innerHeight}px`;
        }
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    private buildProgram(fragmentSource: string): WebGLProgram | null {
        if (!this.gl) {
            return null;
        }
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, this.vertexSource);
        if (!vertexShader) {
            return null;
        }
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        if (!fragmentShader) {
            this.gl.deleteShader(vertexShader);
            return null;
        }
        const program = this.gl.createProgram();
        if (!program) {
            this.lastError = "Failed to create WebGL program.";
            return null;
        }
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        const linked = this.gl.getProgramParameter(program, this.gl.LINK_STATUS) as boolean;
        if (!linked) {
            this.lastError = this.gl.getProgramInfoLog(program) ?? "Failed to link shader program.";
            this.gl.deleteProgram(program);
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);
            return null;
        }
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
        return program;
    }

    private compileShader(type: number, source: string): WebGLShader | null {
        if (!this.gl) {
            return null;
        }
        const shader = this.gl.createShader(type);
        if (!shader) {
            this.lastError = "Unable to create WebGL shader.";
            return null;
        }
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        const compiled = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS) as boolean;
        if (!compiled) {
            this.lastError = this.gl.getShaderInfoLog(shader) ?? "Shader compilation failed.";
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    private normalizeFragmentSource(source: string): string {
        let body = source.trim();
        const header = this.buildPrecisionHeader(body);
        body = this.ensureMainWrapper(body);
        const uniformPrelude = this.buildUniformPrelude(body);
        return [header, uniformPrelude, body].filter(section => section.length > 0).join("\n");
    }

    private buildPrecisionHeader(source: string): string {
        if (/precision\s+(lowp|mediump|highp)\s+float/.test(source)) {
            return "";
        }
        return `#ifdef GL_ES
precision mediump float;
precision highp int;
#endif`;
    }

    private buildUniformPrelude(source: string): string {
        const declarations: Array<{ name: string; pattern: RegExp; snippet: string }> = [
            { name: "iResolution", pattern: /uniform\s+vec\d\s+iResolution\b/, snippet: "uniform vec3 iResolution;" },
            { name: "iTime", pattern: /uniform\s+float\s+iTime\b/, snippet: "uniform float iTime;" },
            { name: "iTimeDelta", pattern: /uniform\s+float\s+iTimeDelta\b/, snippet: "uniform float iTimeDelta;" },
            { name: "iFrame", pattern: /uniform\s+(float|int)\s+iFrame\b/, snippet: "uniform float iFrame;" },
            { name: "iFrameRate", pattern: /uniform\s+float\s+iFrameRate\b/, snippet: "uniform float iFrameRate;" },
            { name: "iMouse", pattern: /uniform\s+vec4\s+iMouse\b/, snippet: "uniform vec4 iMouse;" },
            { name: "iDate", pattern: /uniform\s+vec4\s+iDate\b/, snippet: "uniform vec4 iDate;" },
            { name: "iChannelTime", pattern: /uniform\s+float\s+iChannelTime\s*\[/, snippet: "uniform float iChannelTime[4];" },
            { name: "iChannelResolution", pattern: /uniform\s+vec3\s+iChannelResolution\s*\[/, snippet: "uniform vec3 iChannelResolution[4];" },
            { name: "iChannel0", pattern: /uniform\s+sampler2D\s+iChannel0\b/, snippet: "uniform sampler2D iChannel0;" },
            { name: "iChannel1", pattern: /uniform\s+sampler2D\s+iChannel1\b/, snippet: "uniform sampler2D iChannel1;" },
            { name: "iChannel2", pattern: /uniform\s+sampler2D\s+iChannel2\b/, snippet: "uniform sampler2D iChannel2;" },
            { name: "iChannel3", pattern: /uniform\s+sampler2D\s+iChannel3\b/, snippet: "uniform sampler2D iChannel3;" }
        ];
        const missingSnippets: string[] = [];
        for (const declaration of declarations) {
            if (!declaration.pattern.test(source)) {
                missingSnippets.push(declaration.snippet);
            }
        }
        if (missingSnippets.length === 0) {
            return "";
        }
        return missingSnippets.join("\n");
    }

    private ensureMainWrapper(source: string): string {
        const hasMainImage = /void\s+mainImage\s*\(/.test(source);
        const hasMain = /void\s+main\s*\(/.test(source);
        if (!hasMainImage || hasMain) {
            return source;
        }
        const wrapper = `
void main() {
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    gl_FragColor = color;
}`;
        return `${source}${wrapper}`;
    }

    private applyBuiltInUniforms(elapsedSeconds: number, deltaSeconds: number, frameIndex: number): void {
        if (!this.gl) {
            return;
        }
        const width = this.canvas.width;
        const height = this.canvas.height;
        const pixelRatio = window.devicePixelRatio || 1;
        if (this.timeUniform) {
            this.gl.uniform1f(this.timeUniform, elapsedSeconds);
        }
        if (this.resolutionUniform) {
            this.gl.uniform2f(this.resolutionUniform, width, height);
        }
        if (this.iResolutionUniform) {
            this.gl.uniform3f(this.iResolutionUniform, width, height, pixelRatio);
        }
        if (this.iTimeUniform) {
            this.gl.uniform1f(this.iTimeUniform, elapsedSeconds);
        }
        if (this.iTimeDeltaUniform) {
            this.gl.uniform1f(this.iTimeDeltaUniform, deltaSeconds);
        }
        if (this.iFrameUniform) {
            this.gl.uniform1i(this.iFrameUniform, frameIndex);
        }
        if (this.iFrameRateUniform) {
            const fps = deltaSeconds > 0 ? 1 / deltaSeconds : 0;
            this.gl.uniform1f(this.iFrameRateUniform, fps);
        }
        if (this.iMouseUniform) {
            this.gl.uniform4f(this.iMouseUniform, 0, 0, 0, 0);
        }
        if (this.iDateUniform) {
            const nowDate = new Date();
            const seconds = nowDate.getSeconds() + nowDate.getMilliseconds() / 1000;
            const secondsToday = seconds + nowDate.getMinutes() * 60 + nowDate.getHours() * 3600;
            this.gl.uniform4f(this.iDateUniform, nowDate.getFullYear(), nowDate.getMonth() + 1, nowDate.getDate(), secondsToday);
        }
        for (let i = 0; i < this.channelCount; i++) {
            const timeLocation = this.iChannelTimeUniforms[i];
            if (timeLocation) {
                this.gl.uniform1f(timeLocation, 0);
            }
            const resolutionLocation = this.iChannelResolutionUniforms[i];
            if (resolutionLocation) {
                this.gl.uniform3f(resolutionLocation, 1, 1, 1);
            }
        }
    }

    private captureUniformLocations(program: WebGLProgram): void {
        if (!this.gl) {
            return;
        }
        this.timeUniform = this.gl.getUniformLocation(program, "u_time");
        this.resolutionUniform = this.gl.getUniformLocation(program, "u_resolution");
        this.iResolutionUniform = this.gl.getUniformLocation(program, "iResolution");
        this.iTimeUniform = this.gl.getUniformLocation(program, "iTime");
        this.iTimeDeltaUniform = this.gl.getUniformLocation(program, "iTimeDelta");
        this.iFrameUniform = this.gl.getUniformLocation(program, "iFrame");
        this.iFrameRateUniform = this.gl.getUniformLocation(program, "iFrameRate");
        this.iMouseUniform = this.gl.getUniformLocation(program, "iMouse");
        this.iDateUniform = this.gl.getUniformLocation(program, "iDate");
        this.iChannelTimeUniforms = [];
        this.iChannelResolutionUniforms = [];
        for (let i = 0; i < this.channelCount; i++) {
            this.iChannelTimeUniforms[i] = this.gl.getUniformLocation(program, `iChannelTime[${i}]`);
            this.iChannelResolutionUniforms[i] = this.gl.getUniformLocation(program, `iChannelResolution[${i}]`);
            const samplerLocation = this.gl.getUniformLocation(program, `iChannel${i}`);
            const texture = this.placeholderTextures[i];
            if (samplerLocation && texture) {
                this.gl.activeTexture(this.gl.TEXTURE0 + i);
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.uniform1i(samplerLocation, i);
            }
        }
        this.gl.activeTexture(this.gl.TEXTURE0);
    }

    private disposeProgram(): void {
        if (this.program && this.gl) {
            this.gl.deleteProgram(this.program);
        }
        this.program = null;
    }

    private createPlaceholderTextures(): void {
        if (!this.gl) {
            return;
        }
        const pixel = new Uint8Array([0, 0, 0, 255]);
        for (let i = 0; i < this.channelCount; i++) {
            const texture = this.gl.createTexture();
            if (!texture) {
                continue;
            }
            this.placeholderTextures[i] = texture;
            this.gl.activeTexture(this.gl.TEXTURE0 + i);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixel);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        }
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
    }
}

class ShaderBackgroundController {
    private static readonly NEW_OPTION_VALUE = "__new";
    private panel: HTMLElement;
    private listEl: HTMLSelectElement;
    private nameEl: HTMLInputElement;
    private sourceEl: HTMLTextAreaElement;
    private statusEl: HTMLElement;
    private saveBtn: HTMLButtonElement;
    private deleteBtn: HTMLButtonElement;
    private applyBtn: HTMLButtonElement;
    private newBtn: HTMLButtonElement;
    private disableBtn: HTMLButtonElement;
    private store: ShaderBackgroundStore;
    private renderer: ShaderBackgroundRenderer | null = null;
    private backgrounds: ShaderBackgroundDefinition[] = [];
    private currentId: string | null = null;
    private statusTimer: number | null = null;

    constructor(panelElement: HTMLElement) {
        this.panel = panelElement;
        this.listEl = this.panel.querySelector('#shader-background-list') as HTMLSelectElement;
        this.nameEl = this.panel.querySelector('#shader-background-name') as HTMLInputElement;
        this.sourceEl = this.panel.querySelector('#shader-background-source') as HTMLTextAreaElement;
        this.statusEl = this.panel.querySelector('#shader-background-status') as HTMLElement;
        this.saveBtn = this.panel.querySelector('#shader-background-save') as HTMLButtonElement;
        this.deleteBtn = this.panel.querySelector('#shader-background-delete') as HTMLButtonElement;
        this.applyBtn = this.panel.querySelector('#shader-background-apply') as HTMLButtonElement;
        this.newBtn = this.panel.querySelector('#shader-background-new') as HTMLButtonElement;
        this.disableBtn = this.panel.querySelector('#shader-background-disable') as HTMLButtonElement;
        this.store = new ShaderBackgroundStore();
        this.renderer = new ShaderBackgroundRenderer();
        if (!this.renderer.isSupported()) {
            this.applyBtn.disabled = true;
            this.disableBtn.disabled = true;
            this.setStatus('WebGL is not supported in this browser. Custom shaders will not render but can still be saved.', true);
        }
        this.seedDefaultShader();
        this.refreshList();
        this.restoreActiveOrDraft();
        this.registerEvents();
    }

    private registerEvents(): void {
        this.listEl.addEventListener('change', () => this.handleSelectionChange());
        this.saveBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.handleSave();
        });
        this.newBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.prepareNewBackground();
        });
        this.applyBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.handleApply();
        });
        this.deleteBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.handleDelete();
        });
        this.disableBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.disableShader();
        });
    }

    private seedDefaultShader(): void {
        const existing = this.store.getAll();
        if (existing.length > 0) {
            return;
        }
        const demo: ShaderBackgroundDefinition = {
            id: ShaderBackgroundController.createId(),
            name: 'Aurora Drift',
            fragmentSource: ShaderBackgroundController.getSampleFragment(),
            updatedAt: Date.now()
        };
        this.store.save(demo);
    }

    private refreshList(selectedId?: string): void {
        this.backgrounds = this.store.getAll().sort((a, b) => b.updatedAt - a.updatedAt);
        this.listEl.innerHTML = '';
        const newOption = document.createElement('option');
        newOption.value = ShaderBackgroundController.NEW_OPTION_VALUE;
        newOption.textContent = '+ New Shader';
        this.listEl.appendChild(newOption);
        for (const background of this.backgrounds) {
            const option = document.createElement('option');
            option.value = background.id;
            option.textContent = `${background.name}`;
            this.listEl.appendChild(option);
        }
        const valueToSelect = selectedId ?? this.currentId ?? ShaderBackgroundController.NEW_OPTION_VALUE;
        this.listEl.value = valueToSelect;
        this.deleteBtn.disabled = this.currentId === null;
    }

    private restoreActiveOrDraft(): void {
        const activeId = this.store.getActiveId();
        if (activeId) {
            const active = this.backgrounds.find(entry => entry.id === activeId);
            if (active) {
                this.loadBackground(active);
                if (this.renderer && this.renderer.isSupported()) {
                    const result = this.renderer.setShader(active.fragmentSource);
                    if (result.success) {
                        document.body.classList.add('shader-bg-active');
                        return;
                    }
                    this.setStatus(result.error ?? 'Failed to load saved shader. Please update it.', true);
                    this.store.setActiveId(null);
                }
            }
        }
        if (this.backgrounds.length > 0) {
            this.loadBackground(this.backgrounds[0]);
        } else {
            this.prepareNewBackground();
        }
    }

    private handleSelectionChange(): void {
        if (this.listEl.value === ShaderBackgroundController.NEW_OPTION_VALUE) {
            this.prepareNewBackground();
            return;
        }
        const selected = this.backgrounds.find(entry => entry.id === this.listEl.value);
        if (selected) {
            this.loadBackground(selected);
        }
    }

    private loadBackground(background: ShaderBackgroundDefinition): void {
        this.currentId = background.id;
        this.nameEl.value = background.name;
        this.sourceEl.value = background.fragmentSource;
        this.deleteBtn.disabled = false;
        this.listEl.value = background.id;
    }

    private prepareNewBackground(): void {
        this.currentId = null;
        this.nameEl.value = 'New Shader';
        this.sourceEl.value = ShaderBackgroundController.getSampleFragment();
        this.listEl.value = ShaderBackgroundController.NEW_OPTION_VALUE;
        this.deleteBtn.disabled = true;
    }

    private handleSave(): void {
        const entry = this.persistCurrentBackground();
        if (entry) {
            this.setStatus(`Saved "${entry.name}".`);
        }
    }

    private handleApply(): void {
        if (!this.renderer || !this.renderer.isSupported()) {
            this.setStatus('WebGL is not available in this browser.', true);
            return;
        }
        const entry = this.persistCurrentBackground();
        if (!entry) {
            return;
        }
        const result = this.renderer.setShader(entry.fragmentSource);
        if (!result.success) {
            document.body.classList.remove('shader-bg-active');
            this.store.setActiveId(null);
            this.setStatus(result.error ?? 'Shader failed to compile.', true);
            return;
        }
        document.body.classList.add('shader-bg-active');
        this.store.setActiveId(entry.id);
        this.setStatus(`Activated "${entry.name}".`);
    }

    private handleDelete(): void {
        if (!this.currentId) {
            this.setStatus('No saved background selected.', true);
            return;
        }
        if (!confirm('Delete this background? This cannot be undone.')) {
            return;
        }
        const deletedId = this.currentId;
        const wasActive = this.store.getActiveId() === deletedId;
        this.store.delete(deletedId);
        if (wasActive) {
            document.body.classList.remove('shader-bg-active');
            this.renderer?.clearShader();
            this.store.setActiveId(null);
        }
        this.currentId = null;
        this.refreshList();
        this.prepareNewBackground();
        this.setStatus('Background deleted.');
    }

    private disableShader(): void {
        document.body.classList.remove('shader-bg-active');
        this.renderer?.clearShader();
        this.store.setActiveId(null);
        this.setStatus('Custom shader disabled.');
    }

    private persistCurrentBackground(): ShaderBackgroundDefinition | null {
        const fragmentSource = this.sourceEl.value.trim();
        if (!fragmentSource) {
            this.setStatus('Shader source cannot be empty.', true);
            return null;
        }
        const name = this.nameEl.value.trim() || 'Untitled Shader';
        const entry: ShaderBackgroundDefinition = {
            id: this.currentId ?? ShaderBackgroundController.createId(),
            name,
            fragmentSource,
            updatedAt: Date.now()
        };
        this.store.save(entry);
        this.currentId = entry.id;
        this.refreshList(entry.id);
        this.deleteBtn.disabled = false;
        return entry;
    }

    private setStatus(message: string, isError: boolean = false): void {
        this.statusEl.textContent = message;
        this.statusEl.classList.toggle('is-error', isError);
        if (this.statusTimer !== null) {
            window.clearTimeout(this.statusTimer);
        }
        this.statusTimer = window.setTimeout(() => {
            this.statusEl.textContent = '';
            this.statusTimer = null;
        }, isError ? 6000 : 3500);
    }

    private static createId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `shader-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
    }

    private static getSampleFragment(): string {
        return `precision mediump float;
            uniform vec3 iResolution;
            uniform float iTime;
            varying vec2 v_uv;

            vec3 palette(float t) {
                return vec3(0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t)));
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
                float len = length(uv);
                float waves = sin(uv.x * 4.0 + iTime * 0.6) + cos(uv.y * 4.0 - iTime * 0.4);
                float glow = exp(-6.0 * len) * 0.85;
                vec3 color = palette(waves * 0.15 + glow);
                gl_FragColor = vec4(color, 1.0);
            }`;
    }
}
