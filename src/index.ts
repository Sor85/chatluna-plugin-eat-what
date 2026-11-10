import type { Context } from 'cordis'
import { Config } from './config'
import { loadCatalog } from './catalog'
import { registerKeywords } from './keywords'
import { RecommendationService } from './service'

export { Config }
export const name = 'chatluna-eat-what'
export const inject = ['koishi']

export async function apply(ctx: Context, config: Config) {
    const service = new RecommendationService(await loadCatalog())
    ctx.effect(() => () => service.clear())
    registerKeywords(ctx, config, service)
}
