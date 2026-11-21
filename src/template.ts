import { h } from '@satorijs/core'

const IMAGE = /^\{\{\s*image\s*\}\}$/
const DISHES = /^\{\{\s*dishes\s*\}\}$/

// 聊天平台已将图片单独成块，紧贴图片的一个换行会渲染成多余空行
export function renderTemplate(template: string, name: string, image: h) {
    const parts = template.split(/(\{\{\s*(?:image|dishes)\s*\}\})/g)
    return parts.map((part, index) => {
        if (IMAGE.test(part)) return image
        if (DISHES.test(part)) return h.text(name)
        if (IMAGE.test(parts[index - 1] ?? '')) part = part.replace(/^\r?\n/, '')
        if (IMAGE.test(parts[index + 1] ?? '')) part = part.replace(/\r?\n$/, '')
        return part ? h.text(part) : undefined
    }).filter((element): element is h => !!element)
}
