# scripts 开发约定

适用范围：`scripts/`。同时遵守根 `AGENTS.md`；业务和验证约定见 `src/AGENTS.md`、`tests/AGENTS.md`。

- 源码仓库脚本仅依赖 Node.js 内置模块，直接用 `node` 运行。
- `sync.mjs` 的宿主路径由参数传入，`publish.mjs` 默认使用相对源码目录的 `../../chatluna-v2-mirror` 并允许 `CHATLUNA_V2_ROOT` 覆盖；两者都允许 Windows 分隔符并规范化，不写死当前机器的绝对路径。
- 同步只允许写入指定宿主的 `external/eat-what`。覆盖已有目录前校验包名，避免操作其他插件。
- 不同步依赖、凭证、测试会话、Git 元数据或构建缓存；不得把副本改动反向覆盖源码。
- 构建与运行命令必须在宿主 workspace 执行；不自动提交、创建分支或修改宿主真实配置。
- 只有 `publish.mjs` 会发布到 npm 并推送 tag，且仅在手动执行时进行；它复用 `sync.mjs` 同步，不另写同步逻辑。打包必须用 `yarn pack`（改写 `workspace:*`），并解压后从目录发布（npm 才会写入 `readme` 元数据）。
