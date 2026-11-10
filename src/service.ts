import type { Asset } from './catalog'
import type { Kind } from './types'

interface History {
    expiresAt: number
    food: Set<string>
    drink: Set<string>
}

export const HISTORY_TTL = 60 * 60 * 1000

export class RecommendationService {
    private readonly histories = new Map<string, History>()
    private sweepAt = 0

    constructor(
        readonly catalog: readonly Asset[],
        private readonly random = Math.random,
        private readonly now = Date.now
    ) {}

    pick(kind: Kind, userKey: string, includeExtra: boolean) {
        const pool = this.catalog.filter((item) => item.kind === kind && (includeExtra || !item.extra))
        if (!pool.length) return

        const now = this.now()
        if (now >= this.sweepAt) {
            this.prune()
            this.sweepAt = now + 60_000
        }
        let history = this.histories.get(userKey)
        if (!history || history.expiresAt <= now) {
            history = { expiresAt: now + HISTORY_TTL, food: new Set(), drink: new Set() }
            this.histories.set(userKey, history)
        }

        const seen = history[kind]
        let available = pool.filter((item) => !seen.has(item.id))
        if (!available.length) {
            seen.clear()
            available = pool
        }
        const selected = available[Math.floor(this.random() * available.length)]
        // Reserve synchronously so concurrent messages cannot draw the same item.
        seen.add(selected.id)
        return selected
    }

    release(kind: Kind, userKey: string, id: string) {
        this.histories.get(userKey)?.[kind].delete(id)
    }

    prune() {
        const now = this.now()
        for (const [key, history] of this.histories) {
            if (history.expiresAt <= now) this.histories.delete(key)
        }
    }

    clear() {
        this.histories.clear()
    }
}
