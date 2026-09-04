> v1.2.4：世界书条目改为“独立左缘侧栏”（点悬浮窗内“世界书清单”按钮滑出；懒加载，不改动悬浮窗布局，失败也不会影响窗口启动）。

> 当前为回退稳定版 v1.2.1（来自可运行的 v1.2.0 构建）。v1.3 的“世界书侧边栏/勾选制”已临时移除，待逐步恢复并逐版验证。

# 始弦的魔法大典（destiny preset forge）

SillyTavern / 酒馆助手(Tavern Helper) 悬浮窗插件 · v1.2
为「始弦的魔法大典 + 命定之诗与黄昏之歌」一类角色卡提供**开局预设一键流水线**：
技能 → 装备 → 道具 → 资产 → 背景 → 汇总输出开局预设 JSON，并一键导出
`destiny_*.preset.json`（与 `destiny_AI生成初稿开局预设格式.preset.json` 同构），不再手动复制。

> 生成走**酒馆当前主 API**（插件不保存、不使用任何 API Key），沿用的正是你在酒馆里选中的模型与采样配置。

---

## 〇、在酒馆网页界面直接导入（推荐）
SillyTavern 网页端的 Extensions ▸ ⬇ Install extension 支持把整个扩展从 Git 仓库 URL 拉下来并自动加载，
这是网页端一键导入的入口。步骤：
1. 把插件推到一个 Git 仓库（GitHub / Gitee / GitLab 均可）。仓库根目录直接放：manifest.json、index.js、README.md
   （也就是 opening-preset-forge 文件夹里的三件套；仓库名建议就叫 opening-preset-forge）；
2. 在酒馆顶部点 Extensions ▸ ⬇ Install extension；
3. 粘贴仓库 URL（如 https://github.com/你的账号/opening-preset-forge），分支默认即可，点安装；
4. 酒馆自动下载并加载扩展，按提示刷新页面后，右缘出现 ✦ 魔符即成功。
> 注意：该安装方式需要运行酒馆的电脑装有 git；GitHub 打不开时可改用 Gitee/GitLab 的仓库 URL。

## 一、文件说明
- opening-preset-forge/ —— 仓库就绪目录（manifest.json + index.js + README.md，推仓库时用）
- opening-preset-forge.zip —— 打包扩展（内含顶层 opening-preset-forge/ 目录，手动解压到 data 扩展目录用）
- manifest.json —— 扩展清单；index.js —— 插件本体；README.md —— 本说明

（旧版“把 index.js 放进 data/<用户名>/extensions/… ”的手工安装方式仍然有效，见下节。）

## 二、安装（三选一）

### 方式 A：标准扩展目录（推荐，SillyTavern ≥ 1.12）
1. 关闭酒馆；进入 `data/<你的用户名>/extensions/`
2. 新建文件夹 `opening-preset-forge`，把 `index.js` 放进去；
3. 同目录新建 `manifest.json`：
   ```json
   {
     "display_name": "始弦的魔法大典",
     "js": "index.js",
     "author": "you",
     "version": "1.0.0",
     "homePage": ""
   }
   ```
4. 重启酒馆（或刷新页面）。页面右缘会出现一枚 **✦ 红色魔符**，点击呼出悬浮窗。

### 方式 B：开发者/测试（加载到所有用户）
把 `index.js` 放入 `SillyTavern/public/scripts/extensions/third-party/opening-preset-forge/`（manifest 同上），
重载页面即可。官方文档称该路径即“Install for all users”方式。

### 方式 C：通过酒馆助手 / 扩展管理器导入
本插件是**标准 ST 浏览器扩展**，不依赖 Tavern Helper 的私有 API。
若你的 Tavern Helper 或第三方扩展管理器支持“安装/导入扩展目录或 zip”，把上面
“manifest.json + index.js”的目录打包交给它即可；否则直接按方式 A 手工放置。

> 卸载：删除对应目录 + 刷新页面即可。

## 三、怎么用
1. 开启悬浮窗（✦），顶部填入**开局需求**（如：给流浪剑士配 1 级开局、偏好近战、带契约伙伴…）；
2. 视需要：勾选“带角色卡 / 带世界书”，决定世界书来源（见下）；
3. 点 **▶ 生成初稿**：悬浮窗内自动按 技能→装备→道具→资产→背景→汇总 分步调用主 API，
   每步结果可点卡片查看；“重跑/重汇总”按钮可单独重跑某一步（自动重建前文）；
4. 汇总步完成后自动解析 **```text 代码块中的 JSON** 并做结构校验（缺字段会给出提示）；
5. **⬇ 导出 .preset.json** 一键下载 / **⧉ 复制** 复制到剪贴板。
   - 勾选“导出含文件元数据”：顶层含 `name/createdAt/updatedAt`（时间戳自动填当前值）；
   - “名称”输入框决定 `name` 字段与下载文件名。
6. “快出模式(单次)”：把所有阶段合并成一次调用直接出最终 JSON（省 token，但输出易长被截断）。


## 工作流（v1.2：分步精修 + 重新汇总）
1. **▶ 生成初稿**：技能→装备→道具→资产→背景→P6 汇总 JSON（步骤卡逐一亮起）；
2. 初稿完成后，**每一步卡片下方会各自出现一个精修框**：可输入该步的修改方向点“按方向精修本步”，或点“该步建议”让 AI 给出只针对本步的 2~3 条方向；
3. 精修**只重做对应那一步**，其它步骤内容不动（每次精修是独立的一次串行请求，不并发）；被改过的步骤会标“✦ 本步已修改”；
4. 需要把分步修改汇总成新 JSON 时，点 **⟳ 重新汇总**（P6 会基于各步最新内容重新生成并自动解析）；可继续再精修再汇总，直到满意；
5. 生成与精修全程注入 **《世界规则·创作限制》**（提炼自世界书《角色生成》《角色辅助指导》与各“之书”条目），防止乱写。
## 四、世界书 / 角色卡上下文（直连主 API 模式下）
- **角色卡**：自动读取当前选中角色的 description/personality/scenario 字段。
- **世界书**三档来源（状态条会显示当前来源）：
  1. 自动探测酒馆“激活世界书”（动态 import world-info 模块）——部分环境可用；
  2. **导入世界书文件**（最稳）：点按钮选择本卡的世界书 JSON（如 `命定之诗与黄昏之歌v4.3 (3).json`）；
  3. 都不用时，插件只带角色卡 + 你在“开局需求”里写的内容。
- “仅常驻”勾选后只注入 `constant:true` 的条目；“注入上限”控制最大注入字符数。

> ⚠️ 直连主 API 模式不会执行世界书里的 EJS / MVU 脚本（这是你选择该模式时已知的取舍），
> 因此复杂卡规则（属性结算/层级/脚本更新等）不会在生成时生效；悬浮窗流程只负责“创作内容 + 按新格式汇总 JSON”。

## 五、已确认的依据（版本相关事实，非猜测）
- 扩展规范与 manifest / hooks / `getContext()`：官方 `docs.sillytavern.app/for-contributors/writing-extensions`
- `getContext()` 暴露 `generateRaw` / `generateQuietPrompt` / `extensionSettings` /
  `saveSettingsDebounced` / `eventSource` / `characters` / `loader` / `Popup` 等：SillyTavern `staging` 分支 `public/scripts/st-context.js`
- 世界书模块（`world_info` / `selected_world_info` / `loadWorldInfo`）：`staging` 分支 `public/scripts/world-info.js`

## 六、自测清单（请在你的酒馆里跑一遍并回报结果）
- [ ] 刷新后右缘出现 ✦ 魔符，点击悬浮窗出现（红魔风+辉光）
- [ ] 状态条显示“主API: 就绪”
- [ ] ▶ 生成初稿 能按顺序跑完 6 步（观察每步 ✓）
- [ ] 最后一步后“预设 JSON”区出现解析结果与校验提示
- [ ] ⬇ 导出得到 `destiny_*.preset.json`，内容与新格式文件一致
- [ ] 世界书：尝试“自动探测”（状态条显示 酒馆激活）与“导入文件”两条路径
- [ ] 控制台 F12 可看到 `[openingPresetForge]` 日志

## 七、常见问题
- **主API: 未就绪**：请升级 SillyTavern 到支持 `SillyTavern.getContext().generateRaw` 的版本（1.12+）；
- **生成返回空 / 报未连接**：先在酒馆正常连一次主 API 再点生成；
- **世界书自动探测失败**：属正常降级，用“导入世界书文件”即可；
- **JSON 校验提示缺字段**：点“重汇总”重跑一步，或调整模型/温度后重试。
