import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))

it('所有子目录说明均在根清单登记，登记路径全部存在', async () => {
    const rootNotes = await readFile(join(root, 'AGENTS.md'), 'utf8')
    const registered = [...rootNotes.matchAll(/`([^`]+\/AGENTS\.md)`/g)].map((match) => match[1]).sort()
    const found: string[] = []
    async function visit(directory: string, relative = '') {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (['node_modules', '.git', 'lib', 'dist', 'tmp'].includes(entry.name)) continue
            const path = relative ? `${relative}/${entry.name}` : entry.name
            if (entry.isDirectory()) await visit(resolve(directory, entry.name), path)
            else if (entry.name === 'AGENTS.md' && relative) found.push(path)
        }
    }
    await visit(root)
    expect(found.sort()).toEqual(registered)
})

it('插件仅保留聊天服务与宿主原生配置，不包含独立WebUI', async () => {
    const files = await readdir(root)
    const entry = await readFile(join(root, 'src/index.ts'), 'utf8')
    const manifest = await readFile(join(root, 'package.json'), 'utf8')
    expect(files).not.toContain('client')
    expect(files).not.toContain('tsconfig.client.json')
    expect(await readdir(join(root, 'src'))).not.toContain('webui.ts')
    expect(entry).not.toMatch(/registerWebui|chatluna_webui/)
    expect(manifest).not.toMatch(/@chatluna\/(?:ui-|server)|"react"|"dist"/)
    expect(entry).toContain('export { Config }')
})
