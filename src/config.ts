import { Schema } from '@chatluna/schema'

export interface Config {
    useKeyword: boolean
    useExtraFoods: boolean
    useExtraDrinks: boolean
    foodsTemplate: string
    drinksTemplate: string
    foodsKeyword: string[]
    drinksKeyword: string[]
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
        useKeyword: Schema.boolean().default(true).extra('label', '关键词响应')
            .description('对完整消息精确匹配，不匹配包含关键词的长句'),
        foodsKeyword: Schema.array(Schema.string()).default(['吃什么']).extra('label', '食物关键词'),
        drinksKeyword: Schema.array(Schema.string()).default(['喝什么']).extra('label', '饮料关键词')
    }).description('触发方式'),
    Schema.object({
        useExtraFoods: Schema.boolean().default(false).extra('label', '额外食物图库')
            .description('在 67 张普通食物图片之外加入 15 张额外图片'),
        useExtraDrinks: Schema.boolean().default(false).extra('label', '额外饮料图库')
            .description('在 85 张普通饮料图片之外加入 1 张额外图片')
    }).description('随机图库'),
    Schema.object({
        foodsTemplate: Schema.string().role('textarea').default('{{image}}\n建议{{dishes}}')
            .extra('label', '食物回复模板'),
        drinksTemplate: Schema.string().role('textarea').default('{{image}}\n建议{{dishes}}')
            .extra('label', '饮料回复模板')
    }).description('回复模板：{{image}} 为图片，{{dishes}} 为名称；其余内容按纯文本发送')
])
