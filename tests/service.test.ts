import { describe, expect, it } from 'vitest'
import type { Asset } from '../src/catalog'
import { HISTORY_TTL, RecommendationService } from '../src/service'

const assets: Asset[] = [
    { id: 'food-1', name: '米饭', kind: 'food', extra: false, path: 'unused', mime: 'image/jpeg' },
    { id: 'food-2', name: '面条', kind: 'food', extra: false, path: 'unused', mime: 'image/jpeg' },
    { id: 'food-3', name: '额外食物', kind: 'food', extra: true, path: 'unused', mime: 'image/jpeg' },
    { id: 'drink-1', name: '水', kind: 'drink', extra: false, path: 'unused', mime: 'image/png' },
    { id: 'drink-2', name: '茶', kind: 'drink', extra: false, path: 'unused', mime: 'image/jpeg' },
    { id: 'drink-3', name: '额外饮料', kind: 'drink', extra: true, path: 'unused', mime: 'image/jpeg' }
]

describe('推荐池', () => {
    it('普通池不含额外图库，耗尽立即补满', () => {
        const service = new RecommendationService(assets, () => 0)
        expect(service.pick('food', 'u', false)?.id).toBe('food-1')
        expect(service.pick('food', 'u', false)?.id).toBe('food-2')
        expect(service.pick('food', 'u', false)?.id).toBe('food-1')
    })
    it('额外开关只影响对应池，所有图片均参与抽取', () => {
        const service = new RecommendationService(assets, () => 0.9999)
        expect(service.pick('food', 'u', true)?.id).toBe('food-3')
        expect(service.pick('drink', 'u', false)?.id).toBe('drink-2')
        expect(service.pick('drink', 'v', true)?.id).toBe('drink-3')
    })
    it('用户和平台相互隔离，食品饮品独立耗尽', () => {
        const service = new RecommendationService(assets, () => 0)
        const user = JSON.stringify(['onebot', '100'])
        service.pick('food', user, false)
        service.pick('drink', user, false)
        service.pick('food', user, false)
        service.pick('food', user, false)
        expect(service.pick('drink', user, false)?.id).toBe('drink-2')
        expect(service.pick('food', JSON.stringify(['other', '100']), false)?.id).toBe('food-1')
        expect(service.pick('food', JSON.stringify(['onebot', '200']), false)?.id).toBe('food-1')
    })
    it('两个池使用同一小时窗口，到期同时重置', () => {
        let now = 1000
        const service = new RecommendationService(assets, () => 0, () => now)
        expect(service.pick('food', 'u', false)?.id).toBe('food-1')
        now += HISTORY_TTL - 1
        expect(service.pick('drink', 'u', false)?.id).toBe('drink-1')
        expect(service.pick('food', 'u', false)?.id).toBe('food-2')
        now += 1
        expect(service.pick('food', 'u', false)?.id).toBe('food-1')
        expect(service.pick('drink', 'u', false)?.id).toBe('drink-1')
    })
    it('同步预留候选，连续并发请求不会抽到同一文件', async () => {
        const service = new RecommendationService(assets, () => 0)
        const results = await Promise.all(Array.from({ length: 3 }, async () => service.pick('food', 'u', true)?.id))
        expect(new Set(results).size).toBe(3)
    })
    it('读图失败可释放预留，卸载清空历史', () => {
        const service = new RecommendationService(assets, () => 0)
        service.pick('food', 'u', false)
        service.release('food', 'u', 'food-1')
        expect(service.pick('food', 'u', false)?.id).toBe('food-1')
        service.clear()
        expect(service.pick('food', 'u', false)?.id).toBe('food-1')
    })
    it('图库为空不记录推荐', () => {
        expect(new RecommendationService([]).pick('food', 'u', false)).toBeUndefined()
    })
})
