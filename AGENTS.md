# AGENTS.md

## 项目

ChatLuna V2 的「吃什么 / 喝什么」插件，使用 Cordis 4 服务和 V2 消息处理链。仅提供关键词触发的聊天推荐，不注册 eat、drink 命令。配置交给宿主原生插件表单，不创建独立 WebUI 页面、侧栏入口或 HTTP 接口。独立源码目录，许可证为 MIT。

## 开发与验证

- 修改仅发生在本源码目录，通过 `node scripts/sync.mjs <ChatLuna-V2目录>` 单向同步到宿主 `external/eat-what`。禁止直接修改同步副本。
- `@chatluna/*` 从宿主 Yarn workspace 解析。本目录不安装依赖、不生成锁文件；源码脚本直接使用 `node`，类型检查、测试、构建在宿主目录运行。
- 每次代码或发布文档变更后完成类型检查、单元测试和插件构建。同步后依次运行 `yarn --cwd <ChatLuna-V2目录>/external/eat-what typecheck`、`yarn --cwd <ChatLuna-V2目录>/external/eat-what test`、`yarn --cwd <ChatLuna-V2目录> yakumo build eat-what`。
- 不修改宿主核心代码。服务通过 `inject` 声明，资源注册绑定 Cordis 生命周期；配置和输入验证使用 Cordis Schema。
- 验证使用独立的 sandbox 群组与用户，不覆盖真实会话或配置。不将认证 token、运行配置和测试会话写入发布文件。
- 需要重启的改动须完整停止宿主 launcher 和 worker，确认端口释放后再启动。测试报告区分单元测试、构建与真实 onebot-sandbox 交互。

## 发布

- 在本机执行 `node scripts/publish.mjs <ChatLuna-V2目录>`；`--dry-run` 只演练，账号开了两步验证时加 `--otp=<验证码>`。发版前只需修改 `package.json` 的 `version` 并提交推送。
- 脚本要求工作区干净、当前分支已推送到 origin、npm 已登录、`v<版本>` tag 不存在。流程：同步 → 清空副本 `lib` 与 `tsconfig.tsbuildinfo` → 类型检查、测试、构建 → `yarn pack` → 解压后从目录 `npm publish` → 打 tag 并推送。各步原因见脚本注释。
- 不在 CI 发布：`@chatluna/*` 只能从私有宿主 workspace 解析。npm 可能先出现 `0.0.0-stage` 占位版本，确认 `latest` 指向新版本前不判定为发布失败。

## 目录说明

改动前先阅读对应说明；嵌套目录同时遵守上层说明。

- `src/AGENTS.md`：关键词、内存推荐历史、图库与配置。
- `tests/AGENTS.md`：行为测试、隔离与文档清单守卫。
- `scripts/AGENTS.md`：源码同步、npm 发布与本地开发脚本。
