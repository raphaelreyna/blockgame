class HighScoreStore {
    private static readonly STORAGE_KEY = "blockgame.highScore";

    get(): number {
        const raw = localStorage.getItem(HighScoreStore.STORAGE_KEY);
        if (!raw) {
            return 0;
        }
        const parsed = Number.parseInt(raw, 10);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return 0;
        }
        return parsed;
    }

    set(score: number): number {
        const normalized = Math.max(0, Math.floor(score));
        localStorage.setItem(HighScoreStore.STORAGE_KEY, normalized.toString());
        return normalized;
    }

    updateIfGreater(score: number): number {
        const normalized = Math.max(0, Math.floor(score));
        const current = this.get();
        if (normalized > current) {
            return this.set(normalized);
        }
        return current;
    }
}
