# 命定核心 · EJS 编写规范（上游核实版）

> 本文件是**从上游来源逐条核实**后整理的 EJS 编写规范，专供「命定系统核心」（以及一切走 EJS 的世界书条目）使用。
> 与《命定系统EJS进阶规范.md》的分工：那份是**架构与写法建议**（六层架构、引擎模式、反模式），本文件是**事实与语法**（哪个函数叫什么、参数怎么传、哪个标签干什么），并且每条都标了来源与置信度。
> 核实时间：2026-09-16。核实方式：直接读取上游仓库文件（下表 URL），不依赖记忆与二手教程。

---

## 0. 来源与置信度（先说清楚每条事实的出处）

| 事实类别 | 来源 | 版本/位置 | 置信度 |
| --- | --- | --- | --- |
| EJS 引擎本体与执行时机、内置函数、内置常量、装饰器、世界书标记、渲染规则 | [zonde306/ST-Prompt-Template](https://github.com/zonde306/ST-Prompt-Template) `docs/reference_cn.md`（`main` 分支，读取于 2026-09-16） | main | **high**（上游官方 API 参考） |
| 内容注入标记、`@INJECT`、楼层渲染差异、设置项、装饰器写法规则 | [zonde306/ST-Prompt-Template](https://github.com/zonde306/ST-Prompt-Template) `docs/features_cn.md`、[`README_CN.md`](https://github.com/zonde306/ST-Prompt-Template/blob/main/README_CN.md) | main | **high** |
| EJS 标签语义（`<%`/`<%_`/`<%=`/`<%-`/`<%#`/`%>`/`-%>`/`_%>`/`<%%`/`%%>`） | [mde/ejs README](https://github.com/mde/ejs/blob/main/README.md)（Tags 表）+ [EJS Syntax Reference（v2.5.1 标签）](https://github.com/mde/ejs/blob/v2.5.1/docs/syntax.md) | main + v2.5.1 | **high**（两份一致；`main` 分支已无 `docs/syntax.md`，故语义细节取 v2.5.1 标签，标签集合在 main 的 README 中逐条确认） |
| Tavern Helper（酒馆助手）函数签名（`getVariables` / `insertOrAssignVariables` / `triggerSlash` / `getChatMessages` / `getLastMessageId`） | [N0VI028/JS-Slash-Runner](https://github.com/N0VI028/JS-Slash-Runner) `@types/function/*.d.ts`、`manifest.json`（v4.9.5） | 4.9.5 | **high**（官方类型声明） |
| MVU / `stat_data` 的结构与生命周期 | 不在本文件核实范围 | — | — |

> ⚠️ 两个**不同的**技术面，不要互相串味：
> - **EJS 面**（ST-Prompt-Template）：`getvar` / `setvar` / `getMessageVar` / `matchChatMessages` / `getChatMessage` / `getwi` / `variables` / `runType` …
> - **酒馆助手面**（Tavern Helper）：`TavernHelper.getVariables` / `insertOrAssignVariables` / `triggerSlash` / `getLastMessageId` / `getChatMessages` …
>
> 名字像不代表同一个东西：例如 EJS 的 `getChatMessage(idx, role)`（单数、同步、**只读内容字符串**）与酒馆助手的 `getChatMessages(range, {role, hide_state, include_swipes})`（复数、返回对象数组）**参数与返回值都不同**。混用是命定核心里最常见的隐性 bug 之一。

---

## 1. 引擎与执行时机

EJS 由 **ST-Prompt-Template** 扩展提供（不是酒馆内建、不是酒馆助手的功能）。它处理**世界书/知识书、预设提示词、角色相关内容、消息**里的 `<% ... %>` 代码块。

`runType` 常量表示当前阶段 **high**：

| runType | 何时 |
| --- | --- |
| `preparation` | 酒馆准备生成、合并预设/世界书/角色/消息时 |
| `generate` | 提示词发给 LLM 之前（此扩展处理） |
| `render` | 收到 LLM 输出、渲染到楼层消息时 |
| `render_permanent` | 渲染且**永久改写**消息内容（开启"处理原始消息内容"时） |

关键推论（写核心时必须知道）：

1. **准备阶段会被执行多次**。酒馆在准备阶段会多次计算世界书/预设/角色卡；若在准备阶段写变量，可能**被写多次**。上游为此提供了 `dryRun` 选项（默认 `false`，即准备阶段不允许写）——**无特殊需求不要打开 `dryRun`**。
2. **渲染阶段不会触发世界书计算**（`reference_cn.md` 备注第 2 条）。渲染期能用的东西与生成期不同（见 §5）。
3. 生成阶段的 EJS 结果会**真的发给 LLM**；渲染阶段的 EJS 只改显示。**不要指望渲染期写变量能影响本轮生成**。

---

## 2. 标签语法（10 个标签，全部核实）

| 标签 | 语义 | 来源 |
| --- | --- | --- |
| `<%` | Scriptlet，控制流，**不输出** | EJS README Tags |
| `<%_` | Scriptlet + **吞掉它前面所有空白** | 同上 |
| `<%=` | 输出（转义）。**渲染期**还会额外走"格式化"：转义 HTML、处理宏、处理正则、处理 Markdown | EJS README；渲染期差异见 ST-Prompt-Template `features_cn.md` |
| `<%-` | 输出（不转义）。渲染期直接当 **HTML** 用 | 同上 |
| `<%#` | 注释，不执行不输出 | EJS README |
| `<%%` | 输出字面量 `<%` | 同上 |
| `%%>` | 输出字面量 `%>` | 同上 |
| `%>` | 普通结束标签 | 同上 |
| `-%>` | 换行吞除（newline slurp），**只对 scriptlet/注释有意义，对输出标签无效** | EJS Syntax Reference |
| `_%>` | 吞掉它后面所有空白 | 同上 |

**硬规则**：

- **混用 EJS 与 JS 的循环/条件必须写花括号**。上游原话：省略花括号"might work for some statements, but the behavior is undefined and subject to change"。所以
  ```ejs
  <% if (x) { %>   ← 必须这样写
  <% } %>
  ```
  命定核心里常见的 `<%_ if (...) { _%> … <%_ } _%>` 正是这个规范的写法（`_` 版本额外吞空白，避免正文里塞满空行）。
- **标签内允许换行**（`<%` 可以跨行），但**不允许把一条语句拆到多个标签里**。
- `<%_` 与 `_%>` 是**重型核心的默认选择**：不吞空白会让生成的正文里出现大量空行。
- 想在正文里**显示** `<%` 字面量，用 `<%%`；在渲染期酒馆会把 `&lt;%` 反转义成 `<%`、`%&gt;` 反转义成 `%>`。
- 需要一段内容**完全不被当模板处理**时用 `<#escape-ejs>…<#/escape-ejs>`（扩展提供），其中的 `<%`/`%>` 会被自动替换为 `<%%`/`%%>`。

---

## 3. 变量：五个作用域与读写函数（最容易被写错的一块）

### 3.1 作用域

| scope | 是什么 | 来源 |
| --- | --- | --- |
| `global` | 酒馆的 `extension_settings.variables.global` | `reference_cn.md` |
| `local` | 聊天变量，酒馆的 `chat_metadata.variables` | 同上 |
| `message` | 消息变量，扩展添加的 `chat[msg_id].variables[swipe_id]` | 同上 |
| `cache` | 模板的临时变量（即 `variables.xxx`） | 同上 |
| `initial` | 初始变量，由 `[InitialVariables]` 条目提供 | 同上 |

> 临时变量（`cache`）**不会保存**，本次生成结束即失效；无论选哪个 scope，写操作都会同时更新临时变量。

### 3.2 函数与默认值陷阱

- `getvar(key, options)` —— **默认 `scope: 'cache'`**，`options.defaults` 是不存在时的返回值。
- `setvar(key, value, options)` —— **默认 `scope: 'message'`**、`flags: 'n'`（直接设，不做存在性检查）。
- 特化别名：`getLocalVar/getGlobalVar/getMessageVar`、`setLocalVar/setGlobalVar/setMessageVar`、`incvar/decvar`（各自有 `inc/dec*Var` 别名）、`delvar`、`insvar`、`patchVariables`、`setVariableSchema`。
- `flags`：`nx` 不存在才设 / `xx` 存在才设 / `n` 强制设 / `nxs`·`xxs`（以对应 scope 为准）。
- `results`：`old` | `new`（默认）| `fullcache`。

**三个必须记住的陷阱**：

1. **读写默认 scope 不一致**：`getvar('x')` 读的是合并后的 cache，`setvar('x', 1)` 写的是 **message**。如果这一层楼没有 x、而 global 里有 x，`getvar('x')` 会读到 global 的值，`setvar('x', 2)` 却写在 message 上——下次读到的仍是合并结果。想明确就**显式写 scope**。
2. **写了立刻读要 `noCache: true`**。上游原话：缓存只会在开始时加载，中途不会更新。`setvar('hp', 1); getvar('hp')` 可能读到旧值。
3. **`variables` 常量的合并顺序**（高覆盖低）：① 消息变量（楼层号从末尾到开头）② 局部/聊天变量 ③ 全局变量。处理楼层消息变量时，`variables` **不包含当前楼层及之后楼层的变量**。同名冲突时：类型同为 `[]` 或 `{}` 则 lodash merge 合并，否则替换。

### 3.3 常用内置常量（生成期就可用）

`variables` / `SillyTavern`（= `SillyTavern.getContext()`）/ `faker` / `_`（lodash）/ `$`（jQuery）/ `toastr` / `runType` / `charLoreBook` / `userLoreBook` / `chatLoreBook` / `userName` / `charName` / `chatId` / `characterId` / `groupId` / `groups` / `charAvatar` / `userAvatar` / `lastUserMessageId` / `lastCharMessageId` / `model` / `generateType` / `lastUserMessage` / `lastCharMessage` / `lastMessageId`。

生成完成后还会设置 `LAST_SEND_TOKENS` / `LAST_SEND_CHARS` / `LAST_RECEIVE_TOKENS` / `LAST_RECEIVE_CHARS`。

> 命定之灵要拿玩家名字时，核心里的写法是 `await TavernHelper.triggerSlash('/pass {{user}}')`——注意这跨到了**酒馆助手面**，`{{user}}` 由酒馆宏替换，`triggerSlash` 返回 `Promise<string>`（**必须 await**）。

---

## 4. 读消息与楼层（生成期）

| 函数 | 签名（核实自上游参考） | 说明 |
| --- | --- | --- |
| `getChatMessage` | `(idx, role?)` → `string` | 单楼层内容，失败返回空字符串 |
| `getChatMessages` | `(count)` / `(count, role)` / `(start, end)` / `(start, end, role)` → `string[]` | EJS 面的**复数版是重载**，不是 options 对象 |
| `matchChatMessages` | `(pattern, options)` → `boolean`，`options = {start=-2, end=null, role=null, and}` | `pattern` 支持字符串 / 正则 / 数组；**数组时用 `and` 决定"全部匹配"还是"任意匹配"** |
| `getwi`/`getWorldInfo` | `async (lorebook, title, data?)` / `(title, data?)` → `Promise<string>` | 直接读世界书条目内容，**必须 await**；同一世界书内可省略世界书名 |
| `activewi`/`activateWorldInfo` | `async (lorebook, title, force?)` → `Promise<WorldInfoData\|null>` | 交给酒馆原生激活流程 |
| `getEnabledWorldInfoEntries` / `selectActivatedEntries` / `getWorldInfoData` | 见上游参考 | 世界书批量读取与筛选 |
| `define(name, value, merge?)` | 定义全局变量/函数 | 函数必须用 `function` 语句定义，且内部要用 `this.getvar(...)` 访问变量 |
| `print(...args)` | 直接输出 | **不能在 `<%-` / `<%=` 语句块内使用** |
| `execute(cmd)` | `async` → `Promise<string>` | 执行酒馆命令 |
| `parseJSON(text)` / `jsonPatch(dest, change)` | 宽松 JSON 解析 / JSON Patch（RFC 6902） | 解析 LLM 输出时很有用 |

> `matchChatMessages` 的选项键是 **`and`**（不是 `andAll`/`allMatch`），默认 `start: -2`（只看最近两条消息），要看整段对话得手动传 `start`。

---

## 5. 渲染期专属（只在 `runType === 'render'` 时存在）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `message_id` | number | 楼层号 |
| `swipe_id` | number | 消息页码 |
| `name` | string | 该消息的角色名 |
| `is_last` / `is_user` / `is_system` | boolean | 消息属性 |

渲染期必须知道的 4 条规则（上游 `features_cn.md`）：

1. 渲染处理的是**楼层里已经渲染出来的 HTML**（`#chat > div.mes > div.mes_block > div.mes_text`），处理结果也直接写回 DOM。
2. **`<%=` 与 `<%-` 只有在渲染期才不同**：`<%=` 会做格式化（转义 HTML 标记、处理宏、处理正则、处理 Markdown），`<%-` 直接当 HTML。
3. 渲染期会把 `&lt;%` → `<%`、`%&gt;` → `%>`（因为酒馆会转义不认识的 HTML 标记）。
4. **只改显示、不改原始消息内容**。所以楼层里的 `<% ... %>` 在下次发送时会被再执行一次——上游建议用一条酒馆正则（`findRegex: /<%.*?%>/g`、`promptOnly: true`）把它隐藏掉。
5. **代码高亮与渲染期 EJS 冲突**（高亮会在 `<`/`>`/`%` 间插 HTML，导致代码块内的 `<% %>` 不执行）。

---

## 6. 世界书条目的标记与装饰器

### 6.1 标题（备忘）里的内容注入标记

| 标记 | 作用 |
| --- | --- |
| `[GENERATE:BEFORE]` / `[GENERATE:AFTER]` | 把条目内容插到**发给 LLM 的提示词**开头 / 末尾（BEFORE 仅限 🔵） |
| `[RENDER:BEFORE]` / `[RENDER:AFTER]` | 插到**LLM 输出**的开头 / 末尾（仅渲染，不发 LLM） |
| `[GENERATE:{idx}:BEFORE]` / `[GENERATE:{idx}:AFTER]` | 按 messages 下标（**从 0 开始**）插入 |
| `[GENERATE:REGEX:pattern]` | 消息命中正则时注入；可用 `matched_message` / `matched_message_index` / `matched_message_role` |
| `[InitialVariables]` | 条目内容当变量树写入初始消息变量（JSON 或 YAML，必须是 object） |
| `[Preprocessing]` | 在酒馆处理世界书**之前**先做模板处理（可实现原生 🟢 递归激活） |
| `@INJECT pos=…,target=…,regex=…,role=…` | Prompt 注入：按绝对位置 / 目标消息 / 正则插入独立消息。**要求条目处于未激活状态**；强烈建议 system 注入放最前 |

> `[GENERATE:BEFORE]` / `[GENERATE:AFTER]` 等是**标题前缀**，写在**条目名**里，不是正文里。

### 6.2 正文开头的 `@@` 装饰器（高频踩坑区）

可用清单：`@@activate`、`@@dont_activate`、`@@message_formatting`、`@@generate_before`、`@@generate_after`、`@@render_before`、`@@render_after`、`@@dont_preload`、`@@preload`、`@@only_preload`、`@@initial_variables`、`@@always_enabled`、`@@private`、`@@if`、`@@iframe`、`@@preprocessing`。

**书写规则（逐条核实，写错就静默失效）**：

1. 必须从条目内容的**第一行**开始，**每个装饰器独占一行**，装饰器之间**不允许有空行**。
2. 装饰器可带参数，以**第一个空格**分割名字与参数（如 `@@if variables.好感度 > 50`、`@@iframe 折叠状态栏（点击显示）`）。
3. **无法识别的 `@@xxx` 行会被直接丢弃**（既不当装饰器，也不会留在内容里）。**装饰器拼错 = 这一行人间蒸发**——这是命定核心里最隐蔽的事故之一。
4. 想输出字面量 `@@activate`，用 `@@@` 转义。
5. `@@private` 的作用正是给条目内容包上 `<% { %>` / `<% } %>`，避免 `Identifier ... has already been declared`——**多个世界书条目共存时，这是防重名的官方手段**。
6. `@@if` 只支持**单行** JS 表达式；为假时该条目**不进入**世界书处理流程。
7. 预加载判定顺序：`@@dont_preload` → `@@preload`/`@@only_preload` → 「提前加载仅限 preload 标记」（默认开）→ 普通条目。**想在打开角色卡时执行的条目（初始化变量、`define`）必须显式加 `@@preload` 或 `@@only_preload`**；`[InitialVariables]`/`@@initial_variables` 不受此限制。

---

## 7. 写变量的纪律（命定核心最容易出事的地方）

1. **幂等**：同一层楼可能被重渲染/重算，派生量必须用"取最大"或"已应用轮次"之类的手段防重复累加（`Math.max(prev, next)`、`actionsAppliedTurn` 标记）。
2. **准备阶段不要写变量**（`dryRun` 默认关闭是对的）。
3. **`setMessageVar` 明确写 `{ scope: 'message' }`**（EJS 面：`setMessageVar(key, value)` 本身就是 message 的别名；酒馆助手面：`insertOrAssignVariables(vars, { type: 'message' })`，**必须**带 `type`）。
4. **改完要保存**：扩展侧若调用过 `setvar`，需要 `saveVariables()`（在 `globalThis.EjsTemplate` 作用域内）；酒馆助手侧有自动保存。
5. **写入前先归一**：枚举白名单兜底、`Number.isFinite` 守卫、对象类型判定、玩家可配置文本净化（去换行与 `<>`）。
6. **`patchVariables(key, changes)` / `jsonPatch(dest, changes)`** 是"按 JSON Patch 精确改"的正规手段，比整表替换安全。
7. **`setVariableSchema(schema)`**（扩展侧）/ `registerVariableSchema(schema, {type})`（助手侧）只做**校验或变量管理器展示**，不改变存取语义。

---

## 8. 反模式清单（写坏命定核心的常见写法）

| 反模式 | 为什么坏 | 正确做法 |
| --- | --- | --- |
| `<% if (x) %>` 不带 `{` | 行为未定义（上游原话） | `<%_ if (x) { _%> … <%_ } _%>` |
| 拼错装饰器名（`@@render_afterr`） | 该行被**静默丢弃** | 对着 §6.2 清单核对 |
| 装饰器与正文之间留空行 | 装饰器不生效 | 装饰器紧贴第一行，彼此不留空行 |
| 用 `getvar` 读自己刚 `setvar` 的值 | cache 中途不更新，读到旧值 | 加 `noCache: true`，或改用 `getMessageVar` |
| `getvar('x')` 以为读的是"本层变量" | 默认 `scope: 'cache'`（合并结果） | 显式 `{ scope: 'message' }` |
| 顶层 `const/let` 与别的条目重名 | `Identifier ... has already been declared`，整段编译失败 | 用 `<%_ { _%>` 包块作用域 + 变量加核心前缀，或给条目加 `@@private` |
| EJS 的 `getChatMessage` 与助手的 `getChatMessages` 混用 | 参数/返回值完全不同 | §0 的两面表 |
| `await` 漏写（`getwi` / `execute` / `triggerSlash` / `evalTemplate`） | 拿到 Promise 对象而不是内容 | 每个 async 函数都 `await` |
| 渲染期写变量指望影响本轮生成 | 渲染在生成之后 | 写变量放生成期 |
| 在 `<%- %>` 里调 `print()` | 上游明确禁止 | 直接输出表达式 |
| 生成期用 `is_user` / `swipe_id` | 这些字段**只在 render 存在** | 用 `lastUserMessage` / `lastCharMessage` 等生成期常量 |
| 代码块里写 `<% %>` 期望执行 | 代码高亮与渲染期冲突 | 避开代码块，或用 `<#escape-ejs>` 反向控制 |
| 多个条目各自 `define` 同名函数 | 后者覆盖前者/闭包串味 | 名字带核心前缀；函数内用 `this.getvar` |

---

## 9. 命定核心 EJS 骨架（照这个骨架写，就同时满足上面所有硬规则）

```ejs
<%_ { _%>
<%_ if (getvar('系统核心') === '<系统核心>') { _%>
<%_ // 0 块作用域 + 1 身份守卫：变量带核心前缀，避免与其它核心重名 _%>
<%_
  const _xxCfg   = getMessageVar('stat_data.<核心>.配置', { defaults: {} }) || {};
  const _xxState = getMessageVar('stat_data.<核心>.状态',  { defaults: {} }) || {};
  // 2 数据读取 + 3 防错归一
  const _xxMode  = String(_xxState.模式 ?? _xxCfg.模式 ?? '默认').trim().slice(0, 20);
  const _xxNum   = Number(_xxState.数值 ?? 0);
  const _xxSafe  = Number.isFinite(_xxNum) ? _xxNum : 0;
  // 4 派生与写回：幂等 + 明确 scope
  const _xxTurn  = Number(getMessageVar('stat_data.<核心>.已应用轮次', { defaults: -1 }));
  if (_xxTurn !== lastMessageId) {
    setMessageVar('stat_data.<核心>.数值', Math.max(_xxSafe, 0), { scope: 'message' });
    setMessageVar('stat_data.<核心>.已应用轮次', lastMessageId, { scope: 'message' });
  }
_%>
<%_ } _%>
<%_ // 5 渲染：包裹标签跟随系统名，静默分支也要闭合 _%>
<%_ if (getvar('系统核心') === '<系统核心>') { _%>
<<%- getvar('系统名') %>>
（正文）
</<%- getvar('系统名') %>>
<%_ } else { _%>
【本核心处于静默】
<%_ } _%>
<%_ } _%>
```

配套自检（写完逐条过）：

- [ ] 块作用域 `<%_ { _%>` / `<%_ } _%>` 成对，**数量相等**
- [ ] 有身份守卫 `getvar('系统核心') === '<系统核心>'`
- [ ] 渲染用的包裹标签是 `<%- getvar('系统名') %>`（跟随系统名，避免"标签名 ≠ 系统名"）
- [ ] 所有 `if/for` 都带花括号
- [ ] 静默/兜底分支里的包裹标签也完整闭合
- [ ] 变量全部带核心前缀，或条目加了 `@@private`
- [ ] 每个 async 调用都有 `await`
- [ ] 写变量带 scope、带幂等保护、值经过归一
- [ ] 装饰器（若有）逐行紧贴第一行、拼写与 §6.2 清单一致
- [ ] 渲染期才有的字段没有被用在生成期

---

## 10. 仍未核实 / 需在真实运行时确认的项

诚实清单（按上游 SKILL 的置信度规则，这些**不能**当事实用）：

1. **扩展版本**：本文件核实的是 `main` 分支文档；用户实际安装的 ST-Prompt-Template 版本未确认。运行时可用 `getFeatures()` / `globalThis.EjsTemplate` 探测。
2. **`main` 分支语义与已发布版本可能有差异**（上游文档无版本号标注）。若要严格对齐，应在实际运行环境用 `/ejs` 命令 + `getSyntaxErrorInfo()` 做验证。
3. **EJS 引擎自身的版本**（扩展打包的 ejs 是 2.x 还是 3.x）未从上游确认；本文件只使用在 2.x/3.x 中语义一致的标签。
4. **`@@private` 与 `<%_ { _%>` 在多层嵌套下的实际行为**未在真实酒馆里验证（属静态推断）。
5. **MVU 的 `stat_data` 结构与生命周期**由 MagVarUpdate 管辖，不在本文件核实范围；命定核心对 `stat_data` 的读写需另按 MVU 规范核对。
6. **`/ejs-refresh` 的触发时机**、缓存（实验性）对模板更新的影响，需按实际设置确认。

> 引用来源许可：ST-Prompt-Template 为 AGPL-3.0；EJS 为 Apache-2.0；JS-Slash-Runner 上游声明为 AFPL-9（非开源）。本文件仅作事实性引用与改写，不复制其源码。
