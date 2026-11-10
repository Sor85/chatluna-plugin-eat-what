import { cp, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..')
if (process.argv.length !== 3) throw new Error('用法：node scripts/sync.mjs <ChatLuna-V2目录>')
const mirror = await realpath(resolve(process.argv[2].replaceAll('\\', '/')))
const host = JSON.parse(await readFile(join(mirror, 'package.json'), 'utf8'))
if (host.name !== '@chatluna/root' || !host.workspaces?.includes('external/*')) {
    throw new Error('目标不是带有 external/* workspace 的 ChatLuna V2 开发目录')
}
const target = join(mirror, 'external/eat-what')
await mkdir(target, { recursive: true })
if (await realpath(target) !== target || target === source) throw new Error('目标不得为符号链接或源码目录')
const markerPath = join(target, '.eat-what-sync.json')
const marker = await readFile(markerPath, 'utf8').then(JSON.parse).catch((error) => {
    if (error.code !== 'ENOENT') throw error
})
if (!marker && (await readdir(target)).length) throw new Error('目标非空且未经本脚本同步，停止覆盖')
if (marker && marker.source !== source) throw new Error('目标属于另一源码目录，停止覆盖')

async function collect(directory, prefix = '') {
    const files = []
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === '.DS_Store') continue
        const file = join(prefix, entry.name)
        if (entry.isSymbolicLink()) throw new Error(`源码不允许符号链接：${file}`)
        if (entry.isDirectory()) files.push(...await collect(join(directory, entry.name), file))
        else if (entry.isFile()) files.push(file)
    }
    return files
}
const files = []
for (const name of ['src', 'assets', 'tests', 'scripts', 'package.json', 'tsconfig.json', 'tsconfig.check.json', 'vitest.config.ts', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'AGENTS.md', '.gitignore']) {
    const path = join(source, name)
    const stat = await lstat(path)
    if (stat.isSymbolicLink()) throw new Error(`源码不允许符号链接：${name}`)
    files.push(...(stat.isDirectory() ? await collect(path, name) : [name]))
}
async function destination(file) {
    const path = resolve(target, file)
    const inside = relative(target, path)
    if (!inside || isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`)) {
        throw new Error(`同步记录含有非法路径：${file}`)
    }
    let component = target
    for (const part of inside.split(sep)) {
        component = join(component, part)
        const stat = await lstat(component).catch((error) => {
            if (error.code !== 'ENOENT') throw error
        })
        if (stat?.isSymbolicLink()) throw new Error(`目标路径包含符号链接：${file}`)
    }
    return path
}
for (const file of marker?.files ?? []) {
    if (!files.includes(file)) await rm(await destination(file), { force: true })
}
for (const file of files) {
    const path = await destination(file)
    await mkdir(dirname(path), { recursive: true })
    await cp(join(source, file), path)
}
await writeFile(markerPath, JSON.stringify({ source, files }, null, 2) + '\n')
console.log(`已同步 ${files.length} 个文件到 ${target}`)
