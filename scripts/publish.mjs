// 本地构建并发布到 npm。
//
// @chatluna/* 只能从 ChatLuna V2 宿主 workspace 解析，CI 拿不到，所以发布在本机完成：
// 同步到宿主副本、清空旧产物后类型检查、测试与构建，yarn pack 打包，再 npm publish，
// 最后给当前提交打 v<版本> tag 并推送。
//
// 用法：
//   node scripts/publish.mjs <ChatLuna-V2目录>               发布 package.json 里的版本
//   node scripts/publish.mjs <ChatLuna-V2目录> --dry-run     走完验证与打包，只执行 npm publish --dry-run，不打 tag
//   node scripts/publish.mjs <ChatLuna-V2目录> --otp=123456  账号开了两步验证时带上一次性验证码
// 不经 yarn 运行：本目录没有 yarn.lock，Yarn 4 会把它当成未安装的项目，在启动脚本前就报错。
// 没有交互式终端时，npm 不会等待浏览器授权，直接以 EOTP 退出，所以验证码用 --otp 传入。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const options = process.argv.slice(2)
const positional = options.filter((arg) => !arg.startsWith('--'))
if (positional.length !== 1) throw new Error('用法：node scripts/publish.mjs <ChatLuna-V2目录> [--dry-run] [--otp=<验证码>]')
const mirror = realpathSync(resolve(positional[0].replaceAll('\\', '/')))
const target = join(mirror, 'external/eat-what')
const dryRun = options.includes('--dry-run')
const otp = options.find((arg) => arg.startsWith('--otp='))

const run = (command, args, cwd = source) => execFileSync(command, args, { cwd, stdio: 'inherit' })
const read = (command, args, cwd = source) => execFileSync(command, args, { cwd, encoding: 'utf8' }).trim()
const fail = (message) => {
    console.error(`[publish] ${message}`)
    process.exit(1)
}

const { name, version } = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'))
const tag = `v${version}`

// 发布的内容必须就是某个已推送的提交：工作区有改动时，包里的代码对不上 tag。
if (read('git', ['status', '--porcelain'])) fail('工作区有未提交的改动，先提交或还原')
if (read('git', ['tag', '--list', tag])) fail(`tag ${tag} 已存在，先修改 package.json 的 version`)
if (!dryRun) {
    try {
        read('git', ['remote', 'get-url', 'origin'])
    } catch {
        fail('没有 origin 远端，先添加 GitHub 仓库并推送')
    }
    read('git', ['fetch', 'origin', '--quiet'])
    const branch = read('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (branch === 'HEAD') fail('当前不在分支上，先切换到要发布的分支')
    if (read('git', ['rev-list', '--count', `origin/${branch}..HEAD`]) !== '0') fail('当前分支有未推送的提交，先 git push')
    try {
        read('npm', ['whoami'])
    } catch {
        fail('npm 未登录，先运行 npm login')
    }
}

console.log(`[publish] ${name}@${version}${dryRun ? '（演练）' : ''}`)
run('node', [join(source, 'scripts/sync.mjs'), mirror])

// 同步脚本不清理 lib，副本里会残留已删除模块的产物，打包前必须清空后重新构建。
// tsbuildinfo 一并删除：它还在时 tsc 认为产物已是最新，清空 lib 后不再生成类型声明。
for (const entry of ['lib', 'tsconfig.tsbuildinfo']) rmSync(join(target, entry), { recursive: true, force: true })
run('yarn', ['typecheck'], target)
run('yarn', ['test'], target)
run('yarn', ['yakumo', 'build', 'eat-what'], mirror)
for (const file of ['lib/index.js', 'lib/index.d.ts']) {
    if (!existsSync(join(target, file))) fail(`构建产物缺少 ${file}`)
}

// yarn pack 把 workspace:* 改写成具体版本，npm pack 不会。
const workdir = mkdtempSync(join(tmpdir(), 'eat-what-'))
const tarball = join(workdir, 'package.tgz')
run('yarn', ['pack', '--out', tarball], target)
// 解压后从目录发布：npm 只在发布目录时把 README 写进版本元数据的 readme 字段，直接发布 tgz 时该字段为空，
// 插件市场与 npm 详情页读的正是这个字段，会显示成没有说明。
run('tar', ['-xzf', tarball, '-C', workdir])
const packageDir = join(workdir, 'package')

const args = ['publish', packageDir, '--access', 'public']
const prerelease = version.match(/-(alpha|beta|rc|next)/)?.[1]
if (prerelease) args.push('--tag', prerelease)
if (dryRun) args.push('--dry-run')
if (otp) args.push(otp)
run('npm', args)

if (dryRun) {
    console.log(`[publish] 演练完成，包文件：${tarball}，解压目录：${packageDir}`)
    process.exit(0)
}

run('git', ['tag', tag])
run('git', ['push', 'origin', tag])
console.log(`[publish] 已发布 ${name}@${version}，tag ${tag} 已推送`)
