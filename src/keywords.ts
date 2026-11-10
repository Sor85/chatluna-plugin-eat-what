import { readFile } from 'node:fs/promises'
import type { Context } from 'cordis'
import { h } from '@satorijs/core'
import type { Session } from 'koishi'
import type { Config } from './config'
import type { RecommendationService } from './service'
import { renderTemplate } from './template'
import type { Kind } from './types'

export function registerKeywords(ctx: Context, config: Config, service: RecommendationService) {
    async function recommend(session: Session, kind: Kind) {
        if (!session.userId || session.userId === session.selfId) return ''
        const userKey = JSON.stringify([session.platform, session.userId])
        const asset = service.pick(kind, userKey, kind === 'food' ? config.useExtraFoods : config.useExtraDrinks)
        if (!asset) return h.text(kind === 'food' ? '图库里没有找到任何食物图片。' : '图库里没有找到任何饮料图片。')
        try {
            const image = h.image(await readFile(asset.path), asset.mime)
            return renderTemplate(kind === 'food' ? config.foodsTemplate : config.drinksTemplate, asset.name, image)
        } catch (error) {
            service.release(kind, userKey, asset.id)
            ctx.logger.warn('Failed to read recommendation image: %s', error instanceof Error ? error.message : String(error))
            return h.text('推荐图片读取失败。')
        }
    }

    if (config.useKeyword) {
        // Match before AI dispatch, but reply only after the host's user/channel checks.
        ctx.intersect((session) => !!session.content && !!session.userId && session.userId !== session.selfId &&
            (config.foodsKeyword.includes(session.content) || config.drinksKeyword.includes(session.content)))
            .$processor.match(/^[\s\S]*$/, (session) => recommend(session,
                config.foodsKeyword.includes(session.content ?? '') ? 'food' : 'drink'), { fuzzy: false, i18n: false })
    }
}
