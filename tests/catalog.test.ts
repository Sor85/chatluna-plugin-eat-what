import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { h } from '@satorijs/core'
import { Config } from '../src/config'
import { loadCatalog } from '../src/catalog'
import { renderTemplate } from '../src/template'

describe('配置、图库与模板', () => {
    it('保留关键词等配置默认值，不再暴露命令开关', () => {
        const parsed = Config.safeParse({})
        if (!parsed.success) throw parsed.error
        expect(JSON.stringify(Config)).not.toMatch(/useCommand|启用命令/)
        expect(parsed.data).toEqual({
            useKeyword: true, useExtraFoods: false, useExtraDrinks: false,
            foodsKeyword: ['吃什么'], drinksKeyword: ['喝什么'],
            foodsTemplate: '{{image}}\n建议{{dishes}}', drinksTemplate: '{{image}}\n建议{{dishes}}'
        })
    })
    it('保留完整168张资源且MIME与文件头对应', async () => {
        const catalog = await loadCatalog()
        expect(catalog).toHaveLength(168)
        expect(new Set(catalog.map((item) => item.id)).size).toBe(168)
        expect(catalog.filter((item) => item.kind === 'food' && !item.extra)).toHaveLength(67)
        expect(catalog.filter((item) => item.kind === 'food' && item.extra)).toHaveLength(15)
        expect(catalog.filter((item) => item.kind === 'drink' && !item.extra)).toHaveLength(85)
        expect(catalog.filter((item) => item.kind === 'drink' && item.extra)).toHaveLength(1)
        expect(catalog.filter((item) => item.mime === 'image/png')).toHaveLength(13)
        for (const item of catalog) {
            const bytes = await readFile(item.path)
            expect(bytes.subarray(0, item.mime === 'image/png' ? 8 : 3).toString('hex'))
                .toBe(item.mime === 'image/png' ? '89504e470d0a1a0a' : 'ffd8ff')
        }
    })
    it('忽略非图片、子目录与符号链接，名称保留内部句点', async () => {
        const root = await mkdtemp(join(tmpdir(), 'eat-what-catalog-'))
        try {
            for (const folder of ['foods', 'drinks', 'extra_foods', 'extra_drinks']) await mkdir(join(root, folder))
            await writeFile(join(root, 'foods', 'food.special.JPG'), Buffer.from('ffd8ff', 'hex'))
            await writeFile(join(root, 'foods', 'invalid.jpg'), 'not an image')
            await writeFile(join(root, 'foods', 'README.txt'), '')
            await mkdir(join(root, 'foods', 'fake.png'))
            await symlink(join(root, 'foods', 'README.txt'), join(root, 'foods', 'link.jpg'))
            const catalog = await loadCatalog(root)
            expect(catalog).toHaveLength(1)
            expect(catalog[0].name).toBe('food.special')
            expect(catalog[0].mime).toBe('image/jpeg')
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })
    it('模板仅替换两个占位符，保留换行与未知占位', () => {
        const image = h.image('data:image/png;base64,AA==')
        const result = renderTemplate('{{ image }}\n建议{{dishes}}\n{{unknown}}', '茶', image)
        expect(result[0]).toBe(image)
        expect(result.map(String).join('')).toContain('建议茶\n{{unknown}}')
    })
    it('去掉紧贴图片的一个换行，避免图片与文字之间出现空行', () => {
        const image = h.image('data:image/png;base64,AA==')
        const after = renderTemplate('{{image}}\n建议{{dishes}}', '茶', image)
        expect(after[0]).toBe(image)
        expect(after.slice(1).map(String).join('')).toBe('建议茶')
        const before = renderTemplate('建议{{dishes}}\r\n{{image}}', '茶', image)
        expect(before.at(-1)).toBe(image)
        expect(before.slice(0, -1).map(String).join('')).toBe('建议茶')
        const blank = renderTemplate('{{image}}\n\n建议', '茶', image)
        expect(blank.slice(1).map(String).join('')).toBe('\n建议')
    })
    it('模板和菜名中的消息标记不得成为可执行元素', () => {
        const result = renderTemplate('<at id="all"/> {{dishes}}', '<img src="file:///secret"/>', h.image('unused'))
        expect(result.every((element) => element.type === 'text')).toBe(true)
        expect(result.map(String).join('')).toContain('&lt;at')
        expect(result.map(String).join('')).toContain('&lt;img')
    })
})
