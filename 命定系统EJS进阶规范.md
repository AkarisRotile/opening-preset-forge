# 命定系统 · EJS 进阶规范（超重型核心）

> 适用范围：《命定之诗与黄昏之歌 v4.3(6)》里**需要动态计算、条件分支、变量写入**的命定系统核心。
> 证据来源：对两个重型核心的逐行逆向——`艾莉亚核心`（666 行 / 28 个 EJS 块 / 28k 字符）与 `读者核心`（1598 行 / 74 个 EJS 块 / 72k 字符）（原始抽取与诊断脚本保留在开发工作区，未随仓库分发）。
> 定位：**可选进阶**。基础能力（静态散文 + 十个 setvar）已能覆盖 18/20 个现有核心；只有当你需要"按存档状态改变输出"时才该上这一层。

---

## 0. 门槛判断：什么时候才值得上 EJS

| 需求 | 静态散文够吗 | 结论 |
|---|---|---|
| 固定人设、固定功能表、固定 FP 规则 | ✅ | **不要上 EJS**（梅林核心 4.9k 字符就是范本） |
| 同一核心要多套人格/形态，运行时切换 | ❌ | 上：内联 EJS 分支（艾莉亚的"三形态"） |
| 输出内容要随存档数值变化（如按好感度决定台词） | ❌ | 上：读取 + 条件渲染 |
| 要在渲染时顺手写变量（登记 NPC、结算好感、加 buff） | ❌ | 上：派生写入 |
| 想让人格本身可被玩家配置（JSON 配置驱动） | ❌ | 上：配置驱动型（读者核心的 `dream_custom_persona`） |
| 要"条件触发一次/冷却/进入时"这类规则引擎 | ❌ | 上：声明式规则引擎（读者核心） |

**代价（必须知情）**：
1. 只在**支持 EJS 的预设**下渲染；直连主 API 的模式（含本插件自己的生成流程）**不执行**世界书里的 EJS——所以生成期看不到渲染结果，只能静态检查。
2. 变量声明冲突会导致**整段渲染失败**（EJS 是编译执行的，`const` 重复声明直接报错），排查成本远高于散文。
3. 体积膨胀：艾莉亚 28k、读者核心 72k，二者都是常规核心（4~8k）的 4~15 倍。

---

## 1. 两种重型形态

| 形态 | 代表 | 结构 | 适用 |
|---|---|---|---|
| **A · 内联 EJS 型** | 艾莉亚核心 | 正文用 `<%_ if (...) { _%>` 就地分支，代码集中写在**块首**做数据准备 | 形态/分支数量有限（3~5 套），主要需求是"按状态切换文本" |
| **B · 配置驱动型** | 读者核心 | 正文用 `<%- 变量 %>` 渲染**模板**，人格内容是 `dream_custom_persona` 里的 JSON 配置，代码负责读配置、算条件、按模板铺开 | 人格要可被玩家配置、要反复派生新核心；代码只写一次，人格是数据 |

**混合**是现实中最优解：读者核心自己就是"配置驱动 + 内联兜底"——它同时保留了 `kuromaku/shoujo/genki/weirdo/reader/custom` 六种内置人格分支，其中 `custom` 才走 JSON 配置。

---

## 2. EJS 标签规范（四类标签，用途不可混）

| 标签 | 语义 | 用途 | 注意 |
|---|---|---|---|
| `<%_ … _%>` | **执行**，且**吞掉**前后空白 | 所有逻辑：if/for/赋值/读变量 | **重型核心的默认标签**。不吞空白会让渲染结果里塞满空行，污染正文 |
| `<% … %>` | 执行，保留空白 | 少用；只在需要保留换行时用 | 读者核心在渲染大段分支时用它 |
| `<%- 变量 %>` | **原样插入**（不转义） | 插入变量文本、插入数组拼接结果 | 插入的内容必须先净化，见 §5.3 |
| `<%= 变量 %>` | 转义插入 | 本项目几乎不用（正文不是 HTML） | — |

### 2.1 三条硬规则

1. **最外层用块作用域包裹**：艾莉亚全篇以 `<%_ { _%>` 开头、`<%_ } _%>` 结尾（第 1 行与第 646 行）。`{ }` 把几百个局部变量关进块作用域，避免与其它核心 EJS 的变量重名。
2. **`<%_ if (…) { _%>` 与 `<%_ } _%>` 必须配对**，跨正文的 if/for 缩进可以不规则，但配对数量必须精确——漏一个，后面全篇错位。
3. **不要在 EJS 里写注释以外的自由文本**；所有正文留在 EJS 之外，用标签"切"开。

---

## 3. 六层架构（重型核心的标准骨架）

艾莉亚与读者核心都能拆成同样的六层，**层序即执行序**：

```
<%_ { _%>                                    ← 第 0 层：块作用域
<%_ if (getvar('系统核心') === '<系统核心>') { _%>   ← 第 1 层：身份守卫
  …读取（getvar / getMessageVar / getLocalVar / getChatMessage）…   ← 第 2 层：数据读取
  …归一化与防错（枚举白名单、Number.isFinite、?? 默认值、净化）…      ← 第 3 层：防错归一
  …业务派生（计数、优先级裁决、写回变量）…                          ← 第 4 层：派生与写回
<系统名>                                     ← 第 5 层：渲染（最外层包裹标签）
  …用 <%_ if _%> 分支与 <%- 变量 %> 铺开正文…
</系统名>
<%_ } _%>                                   ← 收尾：关掉身份守卫
<%_ } _%>                                   ← 收尾：关掉块作用域
```

### 第 1 层 · 身份守卫（必须）

```ejs
<%_ if (getvar('系统核心') === '<系统核心>') { _%>
```

- `系统核心` 就是十个 setvar 里的第三个槽（如 `艾莉亚`、`九十九夜梦`）。世界书里 20 多个核心共存，**每个核心的 EJS 块都用这条守卫自我隔离**——只有当前启用的核心会渲染自己的块。
- 没有守卫的 EJS 会无条件执行，导致"开了 A 核心却被 B 核心的代码改变量"。
- 读法有两种：宏 `{{getvar::系统核心}}`（文本比较）或 JS `getvar('系统核心')`（艾莉亚用后者）。

### 第 2 层 · 数据读取（API 速查）

| API | 语义 | 实测用法 |
|---|---|---|
| `getvar(name, {scope, defaults, noCache, clone})` | 读**全局/预设级**变量 | `getvar('dialog_beauty.story', { scope: 'local', defaults: {}, noCache: true, clone: true })` |
| `getMessageVar(path, {defaults, noCache})` | 读**楼层级** MVU 变量（推荐，随消息回滚） | `getMessageVar('stat_data.关系列表') \|\| {}` |
| `getLocalVar(name)` | 读**本机持久**变量（跨对话保留，适合玩家配置） | `getLocalVar('dream_persona')` |
| `getChatMessage(-1, 'user')` / `(-1, 'assistant')` | 读最近一条消息文本 | `String(getChatMessage(-1, 'user') \|\| '')` |
| `matchChatMessages([...], {start, role})` | 关键词/正则匹配最近消息 | `matchChatMessages(/契约/, { start: -1, role: 'user' })` |
| `TavernHelper.getLastMessageId()` | 当前楼层号（用于"首楼不执行"） | `if (TavernHelper.getLastMessageId() > 0)` |
| `TavernHelper.getVariables({type:'message'})` | 一次性取整棵变量树 | 配合 `_.get(variables, 'stat_data.关系列表', {})` |
| `await TavernHelper.triggerSlash('/pass {{user}}')` | 取用户名（**可 await**） | `const userName = await TavernHelper.triggerSlash('/pass {{user}}');` |
| 宏 `{{getvar::X}}` / `{{setvar::X::V}}` | 文本级读写（同理可用在 EJS 外的正文） | 包裹标签用 `<{{getvar::系统名}}>` |

**读写语义速记**：
- `*LocalVar` = 本机持久（玩家配置放这里）
- `*MessageVar` = 楼层级（MVU 存档数据放这里，**有 `{scope:'message'}` 与 `index: message_id` 两个关键选项**）
- 无前缀 `getvar/setvar` = 全局/预设级（十槽放这里）

### 第 3 层 · 防错归一（重型核心与玩具的分水岭）

艾莉亚的写法可直接抄：

```ejs
let mode = String(_.get(cfg, 'skill1', 'B') ?? 'B').toUpperCase();   // 取默认 + 转大写
mode = ['A', 'B', 'C'].includes(mode) ? mode : 'B';                   // 枚举白名单兜底
const custom = String(_.get(cfg, 'skill4Custom', '') ?? '')
  .replace(/[\r\n<>]/g, ' ')      // 净化：去掉换行与尖括号，防注入到正文/EJS
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 80);                  // 硬截断
let n = Number(getMessageVar('...', { defaults: 0 }));
if (!Number.isFinite(n) || n < 0) n = 0;                             // 数值守卫
const obj = (x && typeof x === 'object' && !Array.isArray(x)) ? x : {}; // 类型守卫
```

**优先级裁决**：艾莉亚先读 messageVar 里的"当前状态"，读不到才回落到 localVar 配置 —— `const current = fromMessageVar || fromConfig;`。这是"存档状态优先于玩家配置"的标准写法。

### 第 4 层 · 派生与写回

- 写回一律带作用域：`setMessageVar('stat_data.事件.已相遇车票数', n, { scope: 'message' })`。
- **派生要幂等**：艾莉亚用 `Math.max(prev, recordCount)` 而不是 `prev + 1`，避免重生成时重复累加。
- 自动登记新 NPC：用 `TavernHelper.insertOrAssignVariables({ stat_data: { 关系列表: { 名字: {…完整 schema…} } } }, { type: 'message' })`，字段必须与《变量更新规则》的 schema 对齐（在场/种族/身份/职业/生命层级/等级/属性/装备/技能/登神长阶/性格/喜爱/外貌/着装/命定契约/好感度/心里话/背景故事）。

### 第 5 层 · 渲染

- 最外层包裹标签写成 `<{{getvar::系统名}}>`（读者核心的写法），比写死 `<命定之诗>` 更能自动跟随系统名——**这是解决"标签名 ≠ 系统名"那个经典坑的最优解**。
- 条件分支直接切正文；插入变量用 `<%- %>`。
- 分支数量多时，把每套人设写成 `if / else if` 并列块，**不要嵌套超过两层**。

---

## 4. 形态 B · 配置驱动（可让玩家改核心）

读者核心把人格做成 JSON，存在 `dream_custom_persona` 局部变量里，字段清单：

```
systemName  definition  coreMechanism  coreConcept  personality  role  hobbies  wish
constraints  appearance  opening  letterStyle  toneMode  tonePrompt
corpus  corpusMode(fixed|random)  fpDefinition  newsStyle
ascensionAdvantage  skillAdvantage  revival
conditionalMechanisms[]  conditionalEnabled
```

渲染时统一走一个取值器，**每个字段都有兜底**：

```ejs
let _custom_text = function(key, fallback) {
  let v = persona && persona[key];
  return (typeof v === 'string' && v.trim().length > 0) ? v.trim() : fallback;
};
```

正文里则写成 `<%- _custom_text('personality', '温和、好奇') %>`。**语料（corpus）支持两种模式**：`fixed` 取一组、`random` 用 Fisher–Yates 洗牌后取前 3 组——这是"每次开场白不一样"的现成实现。

配置驱动型的额外好处：**十槽也能从配置生成**，读者核心就是这么写的：

```ejs
setLocalVar('系统名', _custom_system_name);
setLocalVar('fp定义', _custom_text('fpDefinition', _custom_system_name + '的精神食粮'));
setLocalVar('爆料风格', _custom_text('newsStyle', '由她以符合自身性格的方式为<user>提供情报'));
setLocalVar('登神长阶系统优势', _custom_text('ascensionAdvantage', …));
setLocalVar('技能获取系统优势', _custom_text('skillAdvantage', …));
setLocalVar('复活机制', `<复活机制>\n核心: ${_custom_text('revival', …)}\n</复活机制>`);
```

---

## 5. 形态 B+ · 声明式条件机制引擎（读者核心的杀手锏）

一条规则就是一个对象，**数据即逻辑**：

```
{
  id, ownerPersonaId, enabled,
  matchMode: 'any' | 'all',
  triggerMode: 'always' | 'enter' | 'cooldown' | 'once',   // 每轮 / 条件由假转真 / 冷却 N 轮 / 只触发一次
  cooldownTurns,
  effectMode: 'prompt' | 'variables' | 'both',
  conditions: [{ source, operator, path, value }, …],
  actions:    [{ variable, operation, value, name, subname }, …],
  prompt: '触发时注入正文的一段指令'
}
```

**条件的 5 个数据源**：`mvu`（存档变量）/ `user_input`（本条用户输入）/ `last_ai`（上一条 AI 输出）/ `turn_count`（楼层数）/ `recent_chat`（最近楼层关键词/正则）。

**14 个运算符**：`eq` `neq` `gt` `gte` `lt` `lte` `contains` `not_contains` `includes` `not_includes` `regex` `exists` `not_exists`（数值比较一律先 `Number.isFinite` 守卫，正则一律 `try/catch`）。

**动作的 5 种类型与各自允许的操作**：

| 类型 | 允许 operation |
|---|---|
| number | `delta`（增量）/ `set` |
| string | `set` |
| boolean | `set`（值必须是 true/false，不做真值转换） |
| array | `append` / `remove_value` |
| json | `set` / `remove` |

### 5.1 三条安全底线（照抄即可）

1. **路径白名单**：写入路径必须以 `事件|世界|任务列表|主角|命运点数|关系列表|新闻` 之一开头，且不含 `<>{ }[]'"\`;` 与换行，并显式拒绝 `__proto__` / `prototype` / `constructor`。
   ```js
   if (/(^|\.)(__proto__|prototype|constructor)(\.|$)/.test(p)) return false;
   ```
2. **名称净化**：作为路径片段的 `name`/`subname` 必须 ≤80 字且不含 `. [ ] { } < > " ' ;` 与换行。
3. **先捕获后写入**：每次写之前 `_capture(path)` 把旧值压入 undo 日志，失败时整体 `_restore()`。

### 5.2 幂等与回滚（重生成/编辑不炸档）

读者核心的做法值得整体照搬：

- 给每条用户消息算一个**指纹**：长度 + FNV-1a 哈希（`2166136261` 与 `16777619`）；
- 状态里存 `transactions[messageId] = { signature, turn, turnBefore, rulesBefore, rulesAfter, undo[] }`；
- 三种情形分别处理：
  - **同一消息重算**（signature 相同且 id 相同）→ 不重复触发（`firedTurn === turn` 才输出 prompt；`actionsAppliedTurn !== turn` 才重复写变量）；
  - **消息被编辑**（同 id、signature 变了）→ 回滚该轮及之后所有事务，再当新轮跑；
  - **回访旧消息**（同 signature、不同 id）→ 回滚比它更晚的事务，复用它的结果；
- **上限**：事务表保留最近 30 条、人格状态表保留最近 50 条，超出即淘汰最旧。

### 5.3 输出侧

命中的 `prompt` 汇总成一段，插在正文的固定位置：

```
  本轮条件机制（必须执行）:
     - <规则1的prompt>
     - <规则2的prompt>
```

并且**在拼进正文前校验**：prompt 里若含 `<%` 或 `%>` 直接丢弃（防止配置里的文本反向注入 EJS）。

---

## 6. 高级形态 · 静默与兜底

读者核心在整块外面套了"是否渲染"的总闸：

```ejs
let _silent_mode = getLocalVar('dream_silent_mode') === 'on';
let _force_awaken = matchChatMessages(['夜梦','九十九','读者','咖啡馆','间章'], { start: -1, role: 'user' })
                || getMessageVar('stat_data.世界.地点').includes('咖啡馆');
…
<%_ if (!_silent_mode || _force_awaken) { _%>
<{{getvar::系统名}}> …完整核心… </{{getvar::系统名}}>
<%_ } else { _%>
<{{getvar::系统名}}>{{getvar::系统名}}尽管存在，但现在保持完全静默的观察状态，绝不主动发言或进行任何干涉</{{getvar::系统名}}>
<%_ } _%>
```

要点：**无论走哪条分支，包裹标签都必须完整闭合**；静默分支只输出一句话，既省 token 又保持接口形状不变（《战斗&生产规则》仍能读到 `<系统名>`）。

---

## 7. 反模式清单（会直接坏掉的做法）

| 反模式 | 后果 |
|---|---|
| 顶层 `const`/`let` 重名 | EJS 编译失败，整段不渲染（用块作用域 `{ }` + 统一前缀规避，如 `_ellia*`） |
| 缺身份守卫 | 多核心互相污染变量 |
| 包裹标签写死 `<命定之诗>` 却把 `系统名` 设成别的 | 《战斗&生产规则》读不到核心机制（现网已有此例：奶龙核心） |
| 静默/兜底分支漏掉闭合标签 | 标签失衡，后续内容被吞 |
| 直接用 `getMessageVar` 写入而不带 `{scope:'message'}` | 写到错误作用域，存档刷新后丢失 |
| 玩家配置文本未净化就 `<%- %>` 进正文 | 注入（换行/尖括号破坏结构） |
| 数值未做 `Number.isFinite` 守卫 | `NaN` 扩散到面板与结算 |
| 正则未 `try/catch` | 玩家写坏配置 → 整个 EJS 抛错 |
| 派生用 `+1` 而非 `Math.max` / 未做幂等 | 重生成一层楼就多加一次 |
| 无上限地往状态表里塞历史 | 局部变量无限膨胀 |
| 在 EJS 里做网络/存储/DOM 操作 | 运行环境不允许，且是安全红线 |

---

## 8. 骨架模板（可直接复制改）

```ejs
<%_ { _%>
<%_ if (getvar('系统核心') === '<系统核心>') { _%>
<%_
/* ── 2. 数据读取 ─────────────────────────── */
const _cfg = getvar('<核心>.<配置键>', { scope: 'local', defaults: {}, noCache: true, clone: true }) || {};
const _rel = getMessageVar('stat_data.关系列表', { defaults: {} }) || {};
const _userInput = String(getChatMessage(-1, 'user') || '');
const _lastAI = String(getChatMessage(-1, 'assistant') || '');

/* ── 3. 防错归一 ─────────────────────────── */
let _mode = String(_.get(_cfg, 'mode', 'A') ?? 'A').toUpperCase();
_mode = ['A', 'B', 'C'].includes(_mode) ? _mode : 'A';
const _customText = String(_.get(_cfg, 'customText', '') ?? '')
  .replace(/[\r\n<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
let _fp = Number(getMessageVar('stat_data.命运点数', { defaults: 0 }));
if (!Number.isFinite(_fp) || _fp < 0) _fp = 0;

/* ── 4. 派生与写回（幂等）─────────────────── */
const _favorNow = Math.max(Number(getMessageVar('stat_data.关系列表.<灵名>.好感度', { defaults: 0 })) || 0, 0);
setMessageVar('stat_data.关系列表.<灵名>.好感度', _favorNow, { scope: 'message' });
_%>
<{{getvar::系统名}}>
<系统名>:
  定义: …
  核心机制:
<%_ if (_mode === 'A') { _%>
    【形态A】: …
<%_ } else if (_mode === 'B') { _%>
    【形态B】: …
<%_ } else { _%>
    【形态C】: …
<%_ } _%>
  命运点数(FP): …（七档 + 情感修正）
  命定之灵: 开场白 / 人设六字段 / 功能八项 / 规则
  命定之灵语言格式: …
<%_ if (_customText) { _%>
  自定义补充: <%- _customText %>
<%_ } _%>
</{{getvar::系统名}}>
{{setvar::系统名::…}}
…（其余九条，EJS 型可用 setLocalVar 动态写）…
<%_ } _%>
<%_ } _%>
```

---

## 9. 进阶自检清单（13 项）

1. 有块作用域 `<%_ { _%> … <%_ } _%>`，且所有 `let/const` 带统一前缀；
2. 有身份守卫 `getvar('系统核心') === '<系统核心>'`；
3. `<%_ if (...) { _%>` 与 `<%_ } _%>` 数量配对；`<%_ for` 亦然；
4. 包裹标签用 `<{{getvar::系统名}}>` 或与 `系统名` 完全一致，且所有分支里都闭合；
5. 每一个 `getMessageVar` 写入都带 `{ scope: 'message' }`；
6. 数值读取有 `Number.isFinite` 守卫；枚举有白名单兜底；对象有类型守卫；
7. 玩家输入/配置文本经净化（去换行与 `<>`）并硬截断后才 `<%- %>`；
8. 正则构造有 `try/catch`；
9. 写入路径经过白名单校验，且拒绝 `__proto__/prototype/constructor`；
10. 派生写入幂等（`Math.max` / `actionsAppliedTurn` 之类）；
11. 历史状态有上限淘汰（事务 30 / 状态 50）；
12. 有静默或降级分支，且降级分支保持标签闭合；
13. 未出现 `eval` / `Function(` / `fetch` / `XMLHttpRequest` / `localStorage` / `document.` / `import(` 等越界调用。

> 其中 1、2、3、4、5、7、8、13 已由插件的「🧬 进阶 · EJS 重型核心」模式在内置 lint 中自动校验（见 `README.md` 六·C）。
