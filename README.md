# chatluna-plugin-eat-what

ChatLuna V2 的吃喝推荐插件。发送「吃什么」或「喝什么」，机器人随机回复一张图片和对应名称。

## 功能

- 关键词触发随机推荐，关键词和回复模板均可自定义。
- 内置 67 张食物、85 张饮料图片；可选开启额外图库（15 张食物、1 张饮料）。
- 同一用户一小时内不会重复抽到同一项，抽完一轮后重新开始。推荐记录保存在内存中，重启后清空。

图库偏娱乐向，额外图库和部分普通图片内容较猎奇。

## 配置

在 ChatLuna V2「插件管理」中启用插件，在插件配置页修改。

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `useKeyword` | `true` | 启用关键词响应 |
| `foodsKeyword` | `["吃什么"]` | 食物关键词 |
| `drinksKeyword` | `["喝什么"]` | 饮料关键词 |
| `useExtraFoods` | `false` | 食物池加入额外图库 |
| `useExtraDrinks` | `false` | 饮料池加入额外图库 |
| `foodsTemplate` | `{{image}}\n建议{{dishes}}` | 食物回复模板 |
| `drinksTemplate` | `{{image}}\n建议{{dishes}}` | 饮料回复模板 |

关键词需与整条消息完全一致才会触发。

模板中 `{{image}}` 替换为图片，`{{dishes}}` 替换为名称，其余内容按纯文本发送。去掉 `{{image}}` 即为纯文字回复。

## 许可证

代码采用 [MIT](./LICENSE) 协议。图片来自 npm 包 `koishi-plugin-eat-what-pro@1.0.0`，来源与授权说明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
