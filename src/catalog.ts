import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Kind } from './types'

export interface Asset {
    id: string
    name: string
    kind: Kind
    extra: boolean
    path: string
    mime: 'image/jpeg' | 'image/png'
}

const folders: { folder: string; kind: Kind; extra: boolean }[] = [
    { folder: 'foods', kind: 'food', extra: false },
    { folder: 'drinks', kind: 'drink', extra: false },
    { folder: 'extra_foods', kind: 'food', extra: true },
    { folder: 'extra_drinks', kind: 'drink', extra: true }
]

export async function loadCatalog(root = fileURLToPath(new URL('../assets/', import.meta.url))) {
    const assets: Asset[] = []
    for (const { folder, kind, extra } of folders) {
        const entries = await readdir(join(root, folder), { withFileTypes: true })
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))) {
            if (!entry.isFile()) continue
            const extension = extname(entry.name).toLowerCase()
            if (!['.jpg', '.jpeg', '.png'].includes(extension)) continue
            const path = join(root, folder, entry.name)
            const header = (await readFile(path)).subarray(0, 8)
            const mime = header.toString('hex') === '89504e470d0a1a0a' ? 'image/png'
                : header.subarray(0, 3).toString('hex') === 'ffd8ff' ? 'image/jpeg' : undefined
            if (!mime) continue
            assets.push({
                id: createHash('sha256').update(`${folder}/${entry.name}`).digest('hex').slice(0, 24),
                name: entry.name.slice(0, -extname(entry.name).length),
                kind,
                extra,
                path,
                mime
            })
        }
    }
    return assets
}
