import { h } from '@satorijs/core'

export function renderTemplate(template: string, name: string, image: h) {
    return template.split(/(\{\{\s*(?:image|dishes)\s*\}\})/g).filter(Boolean).map((part) => {
        if (/^\{\{\s*image\s*\}\}$/.test(part)) return image
        if (/^\{\{\s*dishes\s*\}\}$/.test(part)) return h.text(name)
        return h.text(part)
    })
}
