/// <reference path="shapes.ts" />

type HighScoreSnapshot = {
    overall: number;
    perSet: Record<string, number>;
};

class HighScoreStore {
    private static readonly STORAGE_KEY = "blockgame.highScores";
    private static readonly LEGACY_KEY = "blockgame.highScore";

    getForSet(blockSetId: string): number {
        const snapshot = this.getSnapshot();
        return snapshot.perSet[blockSetId] ?? 0;
    }

    getOverall(): number {
        return this.getSnapshot().overall;
    }

    getSnapshot(): HighScoreSnapshot {
        return this.cloneSnapshot(this.readSnapshot());
    }

    updateIfGreater(blockSetId: string, score: number): HighScoreSnapshot {
        const normalized = Math.max(0, Math.floor(score));
        const snapshot = this.readSnapshot();
        const current = snapshot.perSet[blockSetId] ?? 0;
        if (normalized > current) {
            snapshot.perSet[blockSetId] = normalized;
            snapshot.overall = Math.max(snapshot.overall, normalized);
            this.writeSnapshot(snapshot);
        }
        return this.cloneSnapshot(snapshot);
    }

    private readSnapshot(): HighScoreSnapshot {
        const raw = localStorage.getItem(HighScoreStore.STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as HighScoreSnapshot;
                return this.normalizeSnapshot(parsed);
            } catch (_error) {
                // fall through to legacy / default
            }
        }
        const legacy = localStorage.getItem(HighScoreStore.LEGACY_KEY);
        if (legacy) {
            const parsedLegacy = Number.parseInt(legacy, 10);
            if (Number.isFinite(parsedLegacy) && parsedLegacy > 0) {
                const migrated: HighScoreSnapshot = {
                    overall: parsedLegacy,
                    perSet: { [getDefaultBlockSetId()]: parsedLegacy }
                };
                this.writeSnapshot(migrated);
                localStorage.removeItem(HighScoreStore.LEGACY_KEY);
                return migrated;
            }
        }
        return { overall: 0, perSet: {} };
    }

    private writeSnapshot(snapshot: HighScoreSnapshot): void {
        localStorage.setItem(HighScoreStore.STORAGE_KEY, JSON.stringify(snapshot));
    }

    private normalizeSnapshot(snapshot: HighScoreSnapshot): HighScoreSnapshot {
        const overall = Number.isFinite(snapshot?.overall) && snapshot.overall > 0 ? Math.floor(snapshot.overall) : 0;
        const perSet: Record<string, number> = {};
        if (snapshot?.perSet && typeof snapshot.perSet === "object") {
            for (const [key, value] of Object.entries(snapshot.perSet)) {
                if (!key) continue;
                const parsedValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
                if (parsedValue > 0) {
                    perSet[key] = parsedValue;
                }
            }
        }
        const normalizedOverall = Math.max(overall, ...Object.values(perSet), 0);
        return { overall: normalizedOverall, perSet };
    }

    private cloneSnapshot(snapshot: HighScoreSnapshot): HighScoreSnapshot {
        return {
            overall: snapshot.overall,
            perSet: { ...snapshot.perSet }
        };
    }
}
