import { afterEach, describe, expect, it } from 'vitest'
import { Context } from 'cordis'
import { h, Session as SatoriSession } from '@satorijs/core'
import Database from '@cordisjs/plugin-database'
import SqliteDriver from '@cordisjs/plugin-database-sqlite'
import Permissions from '@chatluna/permission'
import Koishi from 'koishi'
import * as plugin from '../src'
import { Config } from '../src/config'

const hosts: Context[] = []
afterEach(async () => {
    for (const ctx of hosts.splice(0)) await ctx.fiber.dispose()
})

async function setup(config: Partial<Config> = {}, beforePlugin?: (ctx: Context) => void) {
    const ctx = new Context()
    hosts.push(ctx)
    await ctx.plugin(Database)
    await ctx.plugin(SqliteDriver, { path: ':memory:' })
    await ctx.plugin(Permissions, {})
    await ctx.plugin(Koishi, { prefix: ['/'] })
    beforePlugin?.(ctx)
    const parsed = Config.safeParse(config)
    if (!parsed.success) throw parsed.error
    const fiber = await ctx.plugin(plugin, parsed.data)
    const sent: h[][] = []
    const bot = {
        ctx, platform: 'onebot', selfId: '9000',
        async sendMessage(_channelId: string, content: h.Fragment) {
            sent.push(h.normalize(content))
            return ['1']
        }
    }
    async function send(content: string, userId = '1000', channelId = '2000') {
        // The recorder supplies Session's transport boundary, not the full adapter Bot API.
        const session: SatoriSession = Reflect.construct(SatoriSession, [bot, {
            type: 'message', platform: bot.platform, selfId: bot.selfId,
            user: { id: userId, name: '验收用户' },
            channel: { id: channelId, type: 1 },
            message: { id: `${Date.now()}-${Math.random()}` }
        }])
        session.content = content
        if (userId === bot.selfId) {
            await ctx.parallel('message', session)
            return
        }
        const done = new Promise<void>((resolve) => {
            const off = ctx.on('middleware', (current: SatoriSession) => {
                if (current.id !== session.id) return
                off()
                resolve()
            })
        })
        ctx.emit('message', session)
        await done
    }
    return { ctx, fiber, sent, send }
}

describe('真实关键词与中间件链', () => {
    it('关键词先于已注册的AI消费中间件，未匹配内容仍交给AI', async () => {
        let consumed = 0
        const host = await setup({ foodsTemplate: 'food:{{dishes}}' }, (ctx) => {
            ctx.middleware(() => { consumed++; return 'AI consumed' })
        })
        await host.send('吃什么')
        expect(host.sent[0].map(String).join('')).toMatch(/^food:/)
        expect(consumed).toBe(0)
        await host.send('今天吃什么')
        expect(host.sent[1].map(String).join('')).toBe('AI consumed')
        expect(consumed).toBe(1)
    })
    it('宿主attach过滤拒绝消息时不执行关键词回复', async () => {
        const host = await setup({}, (ctx) => { ctx.on('attach-user', () => true) })
        await host.send('吃什么')
        expect(host.sent).toHaveLength(0)
    })
    it('默认精确关键词触发，不注册命令，未匹配消息继续透传', async () => {
        const host = await setup()
        let passthrough = 0
        host.ctx.middleware((_session, next) => { passthrough++; return next() })
        await host.send('今天吃什么')
        await host.send('吃什么 ')
        await host.send('/eat')
        expect(host.sent).toHaveLength(0)
        expect(passthrough).toBe(3)
        await host.send('吃什么')
        await host.send('喝什么')
        expect(host.sent).toHaveLength(2)
        expect(host.sent.every((elements) => elements.some((element) => element.type === 'img'))).toBe(true)
        expect(host.sent.every((elements) => elements.some((element) => element.type === 'text' && String(element).includes('建议')))).toBe(true)
    })
    it('关键词可关闭，eat和drink不再触发推荐', async () => {
        const host = await setup({ useKeyword: false })
        await host.send('吃什么')
        await host.send('喝什么')
        await host.send('/eat')
        await host.send('/drink')
        expect(host.sent).toHaveLength(0)
    })
    it('旧配置启用命令也不注册eat和drink，不占用其他插件的命令', async () => {
        const legacy = Config.safeParse({ useCommand: true })
        if (!legacy.success) throw legacy.error
        const host = await setup(legacy.data)
        await host.send('/eat')
        await host.send('/drink')
        expect(host.sent).toHaveLength(0)
        host.ctx.command('eat').action(() => 'other plugin')
        await host.send('/eat')
        expect(host.sent[0].map(String).join('')).toBe('other plugin')
        await host.send('吃什么')
        expect(host.sent).toHaveLength(2)
    })
    it('自定义关键词冲突时食物优先，模板安全，机器人自身不响应', async () => {
        const host = await setup({ foodsKeyword: ['推荐'], drinksKeyword: ['推荐'], foodsTemplate: 'food:{{dishes}}', drinksTemplate: 'drink:{{dishes}}' })
        await host.send('推荐', '9000')
        expect(host.sent).toHaveLength(0)
        await host.send('推荐')
        expect(host.sent[0].map(String).join('')).toMatch(/^food:/)
    })
    it('同一用户跨会话和不同关键词共享去重历史', async () => {
        const host = await setup({ foodsKeyword: ['吃什么', '午餐吃什么'], foodsTemplate: '{{dishes}}' })
        await host.send('吃什么', '1000', '2000')
        await host.send('午餐吃什么', '1000', '3000')
        expect(host.sent).toHaveLength(2)
        expect(host.sent[0].map(String).join('')).not.toBe(host.sent[1].map(String).join(''))
    })
    it('卸载后移除关键词，重载不会重复发送', async () => {
        const host = await setup()
        await host.fiber.dispose()
        await host.send('吃什么')
        await host.send('/eat')
        expect(host.sent).toHaveLength(0)
        const defaults = Config.safeParse({})
        if (!defaults.success) throw defaults.error
        await host.ctx.plugin(plugin, defaults.data)
        await host.send('吃什么')
        expect(host.sent).toHaveLength(1)
    })
})
