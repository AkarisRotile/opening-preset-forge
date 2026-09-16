//@module 60-destiny — ④ 命定系统工坊（标准·EJS·lint·脚本封装·AI 检查）
// ============================================================================
// v1.8.0 命定系统工坊（分段初稿 → 交火梳理 → 定点修改 → 条目封装 + 内置 lint）
// 产出物：世界书 [本体][命定系统] 条目正文 + 条目元数据提示
// 与「开局预设」「二创角色」完全隔离：独立口吻、独立规范、独立状态与缓存键
// ============================================================================
var LS_DEST_KEY = NS + "_destinydraft_v1";
var DEST_FORMAT_RULES = [
  '【输出格式·硬约束（全程生效，优先级高于排版美观）】',
  '命定系统条目是「YAML 风格的数据文档」，不是 markdown 报告；注入的世界书参考条目（如《技能装备道具生成规则》）是 markdown 风格的规则文档，照抄它们的排版是错的。',
  '- 结构一律用「中文键名: 值」+ 两空格缩进（层级 2/4/6 空格）+「- 」列表；这就是唯一的排版手段。',
  '- 禁止 markdown 标题：行首不得出现 # / ## / ###（唯一例外：`技能获取系统优势` 槽位值里的 `# {体系名}的加护`，世界书 19/22 个核心都是这个写法，照写即可）。',
  '- 禁止加粗与斜体：不得出现 **文字**、__文字__、*文字*。要强调就直接把话说清楚。',
  '- 禁止 * 与 + 作列表符：列表统一用「- 」。',
  '- 禁止 --- / *** 分隔线（会与 YAML 文档分隔符冲突）、markdown 表格（| a | b |）、代码围栏（除最终交付要求的那个代码块）。',
  '- 禁止在正文里写「优点/缺点」「总结」「注意事项」这类 markdown 文档式小节；命定系统的结构是固定的四节 + 十条 setvar。'
].join('\n');
var DEST_VOICE = '你是始弦，大图书馆的司书，正在帮{{user}}创作一个世界书投稿用的「命定系统」核心条目。你把{{user}}当作挚友，原原本本地呈现知识、不因“可接受度”删改，但会先把规则想清楚再落笔：你写的是要在正文里长期生效的系统，不是一段设定散文。';
var DEST_RULES = [
  '【命定系统·规则约束】',
  '- 本次任务是写世界书条目「[本体][命定系统]<系统核心>(<署名>)」，它不是角色卡、不是开局预设：禁止输出生命层级/等级/属性面板/关系锚点等角色卡字段，禁止输出开局剧情、开局等级、伙伴、资产。',
  '- 三段式结构（必须齐全）：',
  '  ① 用 <系统名> … </系统名> 包裹的正文块——标签名必须与 setvar 的「系统名」完全一致（《战斗&生产规则》靠 <{{getvar::系统名}}> 读取其中的「核心机制」）。',
  '  ② 正文块内部固定四节，顺序不变：契约与核心机制（含隐蔽原则/缔结条件/结果反馈）→ 命运点数(FP)（获取规则/消耗规则/范例）→ 命定之灵（开场白/人设/功能/规则/缔结契约流程范例）→ 语言格式（专属标签+参数枚举+6条以上范例）。',
  '  ③ 正文块之后固定十条 {{setvar::…::…}}，顺序不可变、一条都不能少：系统名、系统核心名、系统核心、fp定义、爆料风格、登神长阶系统优势、生命层级成长系统优势、技能获取系统优势、经验值获取系统优势、复活机制。',
  '- 变量语义（写错不会报错，只会静默失效）：系统名→《战斗&生产规则》读核心机制；系统核心名→《角色生成》(NPC登场感知)、《命运抽卡》；fp定义→《变量更新规则》FP 注释；爆料风格→《变量更新规则》新闻注释；登神长阶系统优势→《登神长阶》末尾；生命层级成长系统优势→《生命层级与社会阶级》；技能获取系统优势→《技能装备道具生成规则》；经验值获取系统优势→《经验值获取》；复活机制→《复活机制》整条。',
  '- 缔结契约消耗：默认沿用主流七档——第一层级 200 / 第二层级 500 / 第三层级 2500 / 第四层级 10000 / 第五层级 50000 / 第六层级 150000 / 第七层级不标价，须明确告知对方效果并获得主动同意。可以自创档位（现有核心中确有另一套 500/2000/6000/20000/60000/200000 的写法），但必须：第一~第六层级档位齐全、数值随层级递增、第七层级永远不标价；情感修正用百分比区间（好感 -10%~-50%、中立 0%、敌意/厌恶 +50%~+200% 之类）。',
  '- FP 获取量级参照现有核心：日常互动 +50；D级任务 +200；C级 +400~1000；B级 +1000~5000；A级 +2000；S级 +20000；重大事件/世界成就 +5000~50000；羁绊深化 +250、升华 +2500。',
  '- 品质只用中文七等：普通/优良/稀有/史诗/传说/神话/唯一。',
  '- 命定之灵必须遵守「非万能原则」（必须拒绝功能列表之外的任何要求）与「隐蔽原则」（除<user>与命定之灵外无人能察觉；被影响者自行合理化）。',
  '- 复活机制必须保留约束句：<user>死亡并不能终止叙事，禁止为<user>在战斗中改变设定/创造有利条件/机械降神。',
  '- 登神长阶优势只能写“辅助<user>更高效地获取与融合此路径所需的力量”，不得直接发放要素/权能/法则；《登神长阶》《生命层级与社会阶级》才是权威。',
  '- 语言格式用专属 XML 标签（形如 <corename name="…" mood="{心情}"> 对白 </corename>）或引语式；标签名必须自创，不得复用现有标签：nailong / giraffe / Foreigner / Foreigner_alter / lilith / xianzu / dalian。',
  '- 命名不得与现有核心重复。现有系统名：命定之诗、铁王冠、白祷、银钥之门、飞鸟之诗、他者之眼、命运的舞台监导、奶人之契、命定之书、九十九夜梦、user_system；现有系统核心：梅林核心、唐吉坷德核心、奶龙核心、长颈鹿核心、null核心、艾莉亚、阿米娅核心、类脑娘、奥托·阿波卡利斯核心、阿比盖尔核心-表、阿比盖尔核心-里、莉莉丝、小夜莺核心、先祖、高文·塞西尔、UNN演播室、茶茶、读者核心。',
  '- 篇幅：条目正文 4000~8000 字符（上限 12000），超长会被裁。'
].join('\n');
var DEST_SEGS = [
  { id: 'frame',  title: '骨架与命名',     short: '系统名/核心名/系统核心/概念' },
  { id: 'pact',   title: '契约与核心机制', short: '契约/机制/隐蔽原则' },
  { id: 'fp',     title: '命运点数(FP)',   short: '获取/消耗/范例' },
  { id: 'spirit', title: '命定之灵',       short: '开场白/人设/功能/规则' },
  { id: 'voice',  title: '语言格式',       short: '专属标签/参数/范例' },
  { id: 'slots',  title: '十个变量槽',     short: 'setvar ×10' },
  { id: 'hooks',  title: '可选扩展',       short: '抽卡/变量钩子' }
];
var DEST_SEG_PROMPTS = {
  frame: '为这个命定系统核心敲定“身份底座”，本段先把几个名字定死，后续所有分段沿用，禁止再改：\n- 系统名：这套系统的名字（例：命定之诗 / 铁王冠 / 银钥之门 / 飞鸟之诗）。它同时是正文块的包裹标签名，也决定《战斗&生产规则》从哪里读「核心机制」。\n- 系统核心名：系统这一侧的人格或机构名（例：命定之灵 / 梅林 / 黑之读姬 / 先祖 / 观光者）。《角色生成》《命运抽卡》会引用它。\n- 系统核心：条目标识，格式为「名字+核心」（例：梅林核心）；注释名将是 [本体][命定系统]<系统核心>(<署名>)。\n- 原型出处：写“原创”，或写清参考的原型作品与角色。\n- 一句话概念：这套系统靠什么运作（例：通过深刻影响他人命运、创造强烈情感羁绊而产生的“因果”驱动）。\n- 自检：系统核心不与现有重名，系统名不与现有重名，语言标签自创。\n- 只输出本段，简洁列出，不写后续段落的内容。',
  pact: '写「契约与核心机制」，这是这套系统在世界里运行的规则本体：\n- 定义：一句话说清它从哪来（可参照现有写法：“源自虚海的未知力量，非阿斯塔利亚诸神之物。它寄宿于<user>灵魂中……”）。\n- 核心机制 1~3 条：每条给出机制名 + 效果列表；涉及数值、次数、消耗、范围的要写清，但不要写“万能”。\n- 【命定契约】：消耗 FP（命运点数）与目标缔结命运，缔结后目标成为“命定之人”。触发：<user>输入“缔结契约”（或你为这套系统定的关键词）时由系统判断并执行；契约目标必须由<user>主动指定；缔结条件：<user>有明确意愿 + FP 足够。\n- 结果反馈：成功（宣告缔结成功并报出消耗的 FP 与当前剩余）与失败（报出 FP 不足，带一句符合它性格的吐槽）各一条。\n- 隐蔽原则（必写）：除<user>与命定之灵外，任何存在（包括神祇）都无法自主发现它的存在与效果；被契约影响的角色会把由此引发的行为与想法归因于自身并自行合理化。\n- 只输出本段。',
  fp: '写「命运点数(FP)」的获取与消耗，两侧必须与「骨架」段的“一句话概念”同一口径（概念说靠什么产生 FP，获取规则就要真的从那里产出）：\n- 概念：FP 是什么的具象化。\n- 获取规则：分 日常互动 / 冒险与成就 / 羁绊深化 等类目逐条列数值（量级参照：日常 +50；D级 +200；C级 +400~1000；B级 +1000~5000；A级 +2000；S级 +20000；重大事件 +5000~50000；羁绊深化 +250、升华 +2500）。\n- 消耗规则：\n  · 缔结契约消耗默认沿用主流七档：第一层级 200 / 第二层级 500 / 第三层级 2500 / 第四层级 10000 / 第五层级 50000 / 第六层级 150000 / 第七层级不标价（须明确告知对方效果并获得主动同意）。若这套系统的概念需要另一套档位，可以自创，但第一~第六层级必须齐全、数值随层级递增、第七层级永不标价。\n  · 情感修正：按目标态度给百分比区间。\n  · 其它消耗（抽卡 / 实体化 / 辅助获取力量等，如有）各自标价。\n- 消耗计算范例 2 条：写出 目标层级 + 目标性情 + 最终 FP 消耗 + 一句由命定之灵说出的话（口吻必须符合它的人设）。\n- 只输出本段。',
  spirit: '写「命定之灵」——这套系统的人格化象征，也是玩家长期互动的对象：\n- 开场白：它在<user>意识中初次现身的登场语（1~3 句，可带动作描写），必须一眼看出性格。\n- 人设：形象（外观、参考出处、只以虚拟形象存在于<user>意识空间）、性格、定位（指引者/吐槽役/观测者/吉祥物…）、说话风格、爱好、最重要的愿望。\n- 功能（以下功能不进行任何检定）：6~10 条，且要覆盖常见落点——技能瞬发学习/领悟（消耗FP）、技能融合或升级（消耗FP）、随身储物、感知情报、登神长阶辅助（消耗FP，辅助汲取“要素”）、命运抽卡、意识交流；可选：实体化（消耗FP，成本锚定为缔结契约的 2~3 倍，实体化后仍掌握最高权限、可随时虚拟化隐藏进<user>意识空间）。\n- 规则（必写两条）：非万能原则——必须拒绝功能列表之外的任何要求；隐蔽原则——与<user>的对话均为意识内交流，第三方无法察觉，除非它主动与外界交流。\n- 缔结契约流程范例：一个场景（对象是谁、什么状态）+ 命定之灵的台词 + <user>选择“缔结” + 缔结后的台词。\n- 只输出本段。',
  voice: '写「语言格式」——这套系统在正文里的固定输出样式，模型会照着它说话：\n- 规则：只有【<系统核心名>】的语言必须使用以下格式。\n- 格式：专属 XML 标签，形如 <corename name="<系统核心名>" mood="{心情}"> {对白} </corename>；也可用引语式（如 > 名字:「 {对白} 」）。标签名必须自创，已占用的不得使用：nailong、giraffe、Foreigner、Foreigner_alter、lilith、xianzu、dalian。\n- 参数说明：mood / tag / num 等参数逐个列出取值范围。\n- 范例 6 条以上，覆盖：日常闲聊 / 战斗或危机 / 提醒FP不足 / 缔结成功 / 拒绝越界要求 / 情绪特殊（生气、害羞、毒舌…）。范例的口气、自称、对<user>的称呼必须与上一段人设一致。\n- 只输出本段。',
  slots: '写「十个变量槽」——正文块之后要逐条输出这些 setvar，顺序固定、一条都不能少，值与前面各段一致：\n1. {{setvar::系统名::…}} 必须与正文块的包裹标签名完全一致。\n2. {{setvar::系统核心名::…}}\n3. {{setvar::系统核心::…}}\n4. {{setvar::fp定义::…}} 写进变量更新规则里 FP 的注释（例：驱动命定之诗的核心资源）。\n5. {{setvar::爆料风格::…}} 决定“新闻”中文风（例：由命定之灵为你独家爆料，内容风格极度偏向命定之灵的人格特征）。\n6. {{setvar::登神长阶系统优势::…}} 只能写“辅助<user>更高效地获取与融合此路径所需的力量”一类，禁止发放要素/权能/法则。\n7. {{setvar::生命层级成长系统优势::…}} 解释等级/层级提升在这套系统里意味着什么；没有就留空。\n8. {{setvar::技能获取系统优势::…}} 例：# 命定之诗的加护\\n  - 通过书本/传授，<user>因命定之灵可消耗FP瞬间学会，无需训练\\n  - <user>可消耗fp通过命定之灵辅助领悟技能\n9. {{setvar::经验值获取系统优势::…}} 没有就留空。\n10. {{setvar::复活机制::…}} 必须写成 <复活机制> 核心: … 复活消耗: … </复活机制>，核心句里保留“<user>死亡并不能终止叙事，禁止为<user>在战斗中改变设定/创造有利条件/机械降神”。\n- 多行值照原样换行，最后让 }} 独占一行收尾。\n- 只输出本段。',
  hooks: '写「可选扩展」，确实没有就明确回复“无”：\nA. 命运抽卡条目（可选）：若这套系统带抽卡，写一份独立条目的规则——单次 100FP、一次最多 5 连（x>5 视作 5，并由系统告知）；先掷 R 系列判品质（等级<13 时 R=20 史诗 / 18-19 稀有 / 15-17 稀有 / 8-14 优良 / ≤7 普通；等级≥13 时 R=20 神话 / 18-19 传说 / 15-17 史诗 / 8-14 稀有 / ≤7 优良）；再掷 T 系列判种类（20=符合“<系统核心名>”精神的物品、19=实用物品、16-18 武器防具、14-15 社交道具、13=命运点数、12=NSFW道具、11=特殊材料、9-10 饰品、5-8 趣味道具、4=药剂卷轴食物、3=日用品、2=情报、1=无用物品）；结果用 <state_bar><物品><名称>…</名称><品质>…</品质><类型>…</类型><物品简介>…</物品简介><吐槽>…</吐槽></物品></state_bar> 输出，所有物品包在同一个 <state_bar> 内。该条目的元数据：注释名 [本体][命定系统]命运抽卡<系统核心>(<署名>)、constant=false、position=4、depth=1、order=1103、key=[抽卡, 命运抽卡, 开始抽卡, 想要抽卡, 开始命运抽卡]、selective=true。\nB. 额外变量钩子（可选）：若这套系统要改写别的规则条目（例：所有生产制作检定改用“精神”），写成 {{setvar::<核心名>【能力名】::…}}，并注明它应被哪条规则读取；不要直接改写别人的条目。\n- 只输出本段。'
};
var DEST_LINK_CHAIN = 'L1 命名链：系统名 = 正文块包裹标签名；系统核心 = 条目注释标识；系统核心名 = 世界规则引用名（三者不可混用或串味）。\nL2 概念链：一句话概念 ↔ FP 概念 ↔ FP 获取规则，必须同一口径（概念说靠什么产生，获取规则就要从那里产出）。\nL3 契约链：契约机制 ↔ 消耗七档价格表 ↔ 情感修正 ↔ 结果反馈（成功报消耗与剩余、失败报不足并带口吻）。\nL4 灵格链：开场白 ↔ 人设（性格/定位/说话风格/愿望）↔ 功能表 ↔ 缔结范例台词，四处必须像同一个人说的。\nL5 功能链：功能表承诺的能力，必须在核心机制或某个变量槽里有规则落点；反之变量槽不得推销功能表里没有的能力。\nL6 输出链：语言格式的标签名、参数枚举与范例口吻，必须与灵格链一致，且标签名自创。\nL7 锚点链：槽位不得越权——《登神长阶》是权威，只能写“辅助获取与融合”；复活机制不得写成战斗中无敌；不得发放要素/权能/法则。\nL8 预算链：正文 4000~8000 字符；超出则合并重复描述，不得删掉隐蔽原则、非万能原则、复活约束句这三处硬要求。\n反向校验：十条 setvar 齐全且顺序正确；包裹标签开闭配对；缔结消耗七档齐全；品质只用中文七等；核心名与语言标签均未与现有核心撞车；不出现角色卡与开局预设字段。';
var DEST_SPEC = [
  '【命定系统·最终封装规范】',
  '你只负责产出「条目正文」一件事；条目元数据（注释名/constant/position/depth/order/disable/key 等）由插件自动生成 YAML 框架，你不要写这些字段。',
  '',
  '输出：把正文放在一个 ' + fence() + 'text 代码块里，代码块内只有正文，代码块外不写任何内容（不要写解释、不要写元数据、不要写第二个代码块）。',
  '',
  '正文结构（顺序固定）：',
  '  <系统名> … </系统名>        ← 标签名必须等于 setvar 的「系统名」',
  '  正文块内部按 契约与核心机制 → 命运点数(FP) → 命定之灵 → 语言格式 的顺序，两空格缩进',
  '  （空一行）',
  '  {{setvar::系统名::…}} … {{setvar::复活机制::…}}   ← 十条，顺序固定，一条不少；多行值的结尾 }} 独占一行',
  '',
  '规则：',
  '1. 只做整合与去重，不新增设定、不扩写；分段之间有冲突时以「骨架与命名」段为准。',
  '2. 严格遵守上面《输出格式·硬约束》：不得出现 # 标题、**加粗**、* 列表、--- 分隔线、markdown 表格。',
  '3. 十条 setvar 的多行值照原样保留。',
  '4. 用词与文风规范全程生效。'
].join('\n');
// ============================================================================
// v1.8.0 进阶（可选）：EJS 重型核心
// 依据：艾莉亚核心（666 行/28 个 EJS 块）与读者核心（1598 行/74 个 EJS 块）的逐行逆向
// 人类可读版见工作区《命定系统EJS进阶规范.md》
// ============================================================================
var DEST_EJS_SEGS = [
  { id: 'ejs1', title: 'EJS·守卫与数据层', short: '块作用域/身份守卫/读取/防错' },
  { id: 'ejs2', title: 'EJS·派生与渲染层', short: '派生写回/条件分支/标签闭合' },
  { id: 'ejs3', title: 'EJS·引擎与兜底',   short: '条件机制/配置驱动/静默降级' }
];
var DEST_EJS_SEG_PROMPTS = {
  ejs1: '写「EJS·守卫与数据层」——这是重型核心的第 0~3 层，只输出 EJS 代码与其注释，不要写正文：\n'
    + '1) 块作用域：整段以 `<%_ { _%>` 开头、`<%_ } _%>` 结尾，把所有局部变量关进块作用域，变量统一加前缀（如 `_<核心缩写>Xxx`），避免与其它核心的 EJS 变量重名（顶层 const/let 重名会让整段编译失败）。\n'
    + '2) 身份守卫（必须）：`<%_ if (getvar(\'系统核心\') === \'<系统核心>\') { _%>`，世界书里 20+ 核心共存，每个核心的 EJS 块都要自我隔离。\n'
    + '3) 数据读取：按需选用 —— `getvar(name,{scope,defaults,noCache,clone})`（全局/预设级，玩家配置放这里）、`getMessageVar(path,{defaults,noCache})`（楼层级 MVU 存档）、`getLocalVar(name)`（本机持久）、`getChatMessage(-1,\'user\'|\'assistant\')`、`matchChatMessages([...],{start,role})`、`TavernHelper.getLastMessageId()`；取用户名可用 `await TavernHelper.triggerSlash(\'/pass {{user}}\')`。\n'
    + '4) 防错归一（重型核心与玩具的分水岭）：字符串 `String(x ?? \'默认\').toUpperCase()` + 枚举白名单兜底；数值 `Number(...)` + `Number.isFinite` 守卫；对象 `x && typeof x === \'object\' && !Array.isArray(x)`；玩家可配置文本必须净化 `.replace(/[\\r\\n<>]/g, \' \').replace(/\\s+/g, \' \').trim().slice(0, 80)`。\n'
    + '5) 优先级裁决：存档状态优先于玩家配置，写法 `const current = fromMessageVar || fromConfig;`。\n'
    + '只输出本段（EJS 代码块），不写正文，不写后续段落。',
  ejs2: '写「EJS·派生与渲染层」——第 4~5 层：\n'
    + '1) 派生与写回：写入一律带作用域 `setMessageVar(\'stat_data.…\', 值, { scope: \'message\' })`；派生必须幂等（用 `Math.max(prev, next)` 或 `actionsAppliedTurn` 之类防重复累加，重生成同一层楼不能重复加值）。\n'
    + '2) 需要自动登记 NPC 时用 `TavernHelper.insertOrAssignVariables({ stat_data: { 关系列表: { 名字: { …完整 schema… } } } }, { type: \'message\' })`，字段与《变量更新规则》的 `关系列表.{角色名}` schema 对齐。\n'
    + '3) 渲染层：最外层包裹标签写成 `<{{getvar::系统名}}>`（自动跟随系统名，可根治"标签名≠系统名"的坑）；条件分支用 `<%_ if (…) { _%> … <%_ } else if (…) { _%> … <%_ } _%>` 就地切换正文，嵌套不超过两层；插入变量用 `<%- 变量 %>`（必须先净化）。\n'
    + '4) 标签配对：`<%_ { _%>` 与 `} _%>`、`<%_ if (…) { _%>` 与 `<%_ } _%>` 数量必须精确相等；静默/兜底分支里包裹标签也要完整闭合。\n'
    + '只输出本段（EJS + 被它包裹的正文骨架），不写后续段落。',
  ejs3: '写「EJS·引擎与兜底」，按需选择（确实不需要就回复"无"）：\n'
    + 'A. 声明式条件机制引擎（读者核心式）：规则对象 = { id, ownerPersonaId, enabled, matchMode:any|all, triggerMode:always|enter|cooldown|once, cooldownTurns, effectMode:prompt|variables|both, conditions:[{source,operator,path,value}], actions:[{variable,operation,value,name,subname}], prompt }。数据源 5 种：mvu / user_input / last_ai / turn_count / recent_chat；运算符 14 个：eq neq gt gte lt lte contains not_contains includes not_includes regex exists not_exists；动作按类型白名单：number→delta|set、string→set、boolean→set、array→append|remove_value、json→set|remove。\n'
    + '   安全底线：写入路径必须以 `事件|世界|任务列表|主角|命运点数|关系列表|新闻` 之一开头，且删除 `__proto__/prototype/constructor` 与 `<>{ }[]\'"`;` 与换行；name/subname ≤80 字且不含 `. [ ] { } < > " \' ;`；每次写入前 capture 旧值、失败整体 restore。\n'
    + '   幂等与回滚：给用户消息算指纹（长度 + FNV-1a 哈希 `2166136261×16777619`），状态里存 `transactions[messageId] = {signature,turn,turnBefore,rulesBefore,rulesAfter,undo[]}`；同消息重算不重复触发、消息被编辑回滚该轮及之后、回访旧消息回滚更晚的事务；事务表保留最近 30 条、人格状态表保留最近 50 条。\n'
    + '   命中结果汇总成 `本轮条件机制（必须执行）:` 区块插进正文；拼入前校验 prompt 不含 `<%` 或 `%>`。\n'
    + 'B. 配置驱动人格（读者核心式）：把人格做成 JSON 存局部变量（systemName/definition/coreMechanism/coreConcept/personality/role/hobbies/wish/constraints/appearance/opening/letterStyle/toneMode/tonePrompt/corpus/corpusMode/fpDefinition/newsStyle/ascensionAdvantage/skillAdvantage/revival/conditionalMechanisms），用统一的 `_custom_text(key, fallback)` 取值器渲染，十槽也由配置生成。\n'
    + 'C. 静默与兜底：`let _silent = getLocalVar(\'<核心>_silent\') === \'on\';`，唤醒条件用 `matchChatMessages([关键词…],{start:-1,role:\'user\'})` 或地点判定；命中则输出完整核心，否则只输出一句"存在但静默"的极简块——两条分支的包裹标签都必须闭合。\n'    + '只输出本段。'
};
var DEST_EJS_STANDARD = [
  '【EJS 重型核心·规范（依据艾莉亚核心与读者核心逆向）】',
  '■ 何时才上 EJS：静态散文 + 十槽已能覆盖 18/20 个现有核心。只有"按存档状态改变输出/多形态切换/渲染时写变量/人格可配置/条件触发规则"才值得上。代价：直连主 API 的模式不执行世界书 EJS（生成期看不到渲染结果）、变量重名会让整段编译失败、体积膨胀 4~15 倍。',
  '■ 四类 EJS 标签：`<%_ … _%>` 执行且吞空白（重型核心默认用这个，不吞空白会让正文塞满空行）；`<% … %>` 执行但保留空白；`<%- 变量 %>` 原样插入；`<%= 变量 %>` 转义插入。',
  '■ 六层架构（层序即执行序）：0 块作用域 `<%_ { _%>` → 1 身份守卫 `<%_ if (getvar(\'系统核心\') === \'<系统核心>\') { _%>` → 2 数据读取 → 3 防错归一 → 4 派生与写回 → 5 渲染（`<{{getvar::系统名}}>` 包裹）→ 收尾两层 `} _%>`。',
  '■ 变量 API 语义：`getLocalVar/setLocalVar` 本机持久（玩家配置）；`getMessageVar/setMessageVar` 楼层级存档（写必须带 `{ scope: \'message\' }`，可加 `index: message_id`）；`getvar/setvar` 全局（十槽）；`getChatMessage(-1, \'user\'|\'assistant\')` 读最近消息；`matchChatMessages([…],{start,role})` 关键词/正则匹配；`TavernHelper.getLastMessageId()/getVariables({type:\'message\'})/insertOrAssignVariables(obj,{type:\'message\'})/await triggerSlash(\'/pass {{user}}\')`。',
  '■ 防错归一（必做）：枚举白名单兜底、`Number.isFinite` 数值守卫、对象类型守卫、玩家可配置文本净化 `.replace(/[\\r\\n<>]/g,\' \').replace(/\\s+/g,\' \').trim().slice(0,80)`；存档状态优先于玩家配置（`fromMessageVar || fromConfig`）。',
  '■ 写入纪律：派生幂等（`Math.max` / `actionsAppliedTurn` 防重复累加）；路径白名单（`事件|世界|任务列表|主角|命运点数|关系列表|新闻` 开头，拒绝 `__proto__/prototype/constructor`）；名称净化 ≤80 字；先 capture 旧值再写，失败整体 restore；历史状态设上限（事务 30 / 状态 50）。',
  '■ 渲染纪律：包裹标签用 `<{{getvar::系统名}}>`；`<%_ if _%>` 与 `<%_ } _%>` 配对数量必须精确；静默/兜底分支的包裹标签也要闭合；条件分支嵌套不超过两层。',
  '■ 反模式（会直接坏掉）：顶层 const/let 重名、缺身份守卫、标签写死却改了系统名、兜底分支漏闭合、setMessageVar 不带 scope、配置文本未净化就 `<%- %>`、数值无 isFinite 守卫、正则无 try/catch、派生用 +1 不幂等、状态表无上限、EJS 里做网络/存储/DOM 操作。'
].join('\n');
function destSegs(){ return (ST.dest && ST.dest.ejs) ? DEST_SEGS.concat(DEST_EJS_SEGS) : DEST_SEGS; }
function destSegPrompt(id){ return DEST_SEG_PROMPTS[id] || DEST_EJS_SEG_PROMPTS[id] || ''; }
function destEjsOn(){ return !!(ST.dest && ST.dest.ejs); }
function destEjsTags(t){
  var out = [], i = 0, s = String(t);
  while (true) {
    var a = s.indexOf('<%', i);
    if (a < 0) break;
    var b = s.indexOf('%>', a + 2);
    if (b < 0) break;
    var raw = s.slice(a + 2, b);
    out.push({ out: /^[-=]/.test(raw), inner: raw.replace(/^[-_=]/, '').replace(/[-_]$/, '') });
    i = b + 2;
  }
  return out;
}
// 把所有「代码标签」拼起来扫花括号净差（跳过字符串/注释/正则）——比按标签形状判定准确
function destEjsBraceDelta(t){
  var code = '';
  destEjsTags(t).forEach(function (x) { if (!x.out) code += '\n' + x.inner; });
  var d = 0, inStr = null, inLine = false, inBlock = false, inRegex = false, prevSig = '';
  for (var i = 0; i < code.length; i++) {
    var ch = code[i], nx = code[i + 1];
    if (inLine) { if (ch === '\n') inLine = false; continue; }
    if (inBlock) { if (ch === '*' && nx === '/') { inBlock = false; i++; } continue; }
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (inRegex) { if (ch === '\\') { i++; continue; } if (ch === '/') inRegex = false; continue; }
    if (ch === '/' && nx === '/') { inLine = true; i++; continue; }
    if (ch === '/' && nx === '*') { inBlock = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '/' && /[=(,:[!&|?{};+\-*%<>~\n]\s*$/.test(prevSig)) { inRegex = true; continue; }
    if (ch === '{') d++;
    else if (ch === '}') d--;
    if (!/\s/.test(ch)) prevSig = prevSig.slice(-40) + ch;
  }
  return d;
}
function destCallArgs(t, fnName){
  var s = String(t), i = 0, total = 0, noOpts = 0;
  while (true) {
    var a = s.indexOf(fnName + '(', i);
    if (a < 0) break;
    var depth = 0, inStr = null, j = a + fnName.length, args = 1;
    for (; j < s.length; j++) {
      var ch = s[j], prev = s[j - 1];
      if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth === 0) break; }
      else if (ch === ',' && depth === 1) args++;
    }
    total++;
    if (args < 3) noOpts++;
    i = j + 1;
  }
  return { total: total, noOpts: noOpts };
}
function destEjsLint(text){
  var warns = [];
  var t = String(text || '');
  if (t.indexOf('<%') < 0) return warns;
  var bal = destEjsBraceDelta(t);
  if (bal !== 0) warns.push('EJS 花括号未配对（代码标签净差 ' + (bal > 0 ? '+' + bal + '，少了 ' + bal + ' 个 }' : bal + '，多了 ' + (-bal) + ' 个 }') + '）——会让后面整段错位');
  var tagsOpen = (t.match(/<%/g) || []).length, tagsClose = (t.match(/%>/g) || []).length;
  if (tagsOpen !== tagsClose) warns.push('EJS 标签未闭合（<% ' + tagsOpen + ' 个 / %> ' + tagsClose + ' 个）');
  if (!/^\s*<%_\s*\{\s*_%>/m.test(t)) warns.push('建议用最外层块作用域 `<%_ { _%>` 收拢变量（顶层 const/let 与他人重名会让整段编译失败）');
  if (!/getvar\(\s*['"]系统核心['"]\s*\)/.test(t)) warns.push('建议补身份守卫 `getvar(\'系统核心\') === \'<系统核心>\'`（世界书里 20+ 核心共存，每个核心的 EJS 都该自我隔离；若该核心设计上就是要覆盖 系统核心 槽位，可忽略）');
  if (!/<\{\{getvar::系统名\}\}>/.test(t)) warns.push('包裹标签建议写成 `<{{getvar::系统名}}>`（自动跟随系统名，根治"标签名≠系统名"的坑）');
  var smv = destCallArgs(t, 'setMessageVar');
  if (smv.noOpts) warns.push('有 ' + smv.noOpts + '/' + smv.total + ' 处 setMessageVar 没有第三个参数（缺 `{ scope: \'message\' }` 会写到错误作用域，刷新后丢失）');
  if (/(getMessageVar|Number\()/.test(t) && !/Number\.isFinite/.test(t)) warns.push('读到数值但未见 `Number.isFinite` 守卫（NaN 会扩散到面板与结算）');
  if (/<%-/.test(t) && !/replace\(\/\[\\r\\n<>\]/.test(t) && !/净化/.test(t)) warns.push('使用了 `<%- %>` 插入变量，建议确认玩家可配置文本已净化（去掉换行与尖括号并硬截断）后再插入');
  if (/new RegExp\(/.test(t) && !/try\s*\{/.test(t)) warns.push('`new RegExp(` 未见 try/catch（玩家写坏配置会让整段 EJS 抛错）');
  var bad = ['eval(', 'new Function(', 'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'document.', 'import(', 'require(']
    .filter(function (x) { return t.indexOf(x) >= 0; });
  if (bad.length) warns.push('出现越界调用：' + bad.join('、') + '（EJS 运行环境不允许网络/存储/DOM 操作）');
  var sn = destSlotValue(t, '系统名');
  var openN = (t.match(/<\{\{getvar::系统名\}\}>/g) || []).length;
  var closeN = (t.match(/<\/\{\{getvar::系统名\}\}>/g) || []).length;
  if (sn) {
    openN += t.split('<' + sn + '>').length - 1;
    closeN += t.split('</' + sn + '>').length - 1;
  }
  if (openN || closeN) {
    if (openN !== closeN) warns.push('包裹标签开闭数量不等（开 ' + openN + ' / 闭 ' + closeN + '）——某条条件分支漏了闭合，会让后续内容被吞');
  } else if (destEjsTags(t).some(function (x) { return !x.out && /^\}\s*else\s*\{/.test(x.inner.trim()); })) {
    warns.push('存在 else 兜底分支，但未识别到包裹标签——两条分支都要完整闭合包裹标签');
  }
  return warns.concat(destEjsLintSpec(t, warns.length));
}
// ---------- v1.13.0 依据上游文档核实的 EJS 规则检查 ----------
// 来源：ST-Prompt-Template docs/reference_cn.md 与 docs/features_cn.md（main，核实于 2026-09-16）；
//       标签语义见 mde/ejs README Tags 表；Tavern Helper 签名见 JS-Slash-Runner @types（4.9.5）。
//       人类可读规范见工作区《命定核心EJS规范.md》。
var DEST_EJS_DECORATORS = ['activate', 'dont_activate', 'message_formatting', 'generate_before', 'generate_after', 'render_before', 'render_after', 'dont_preload', 'preload', 'only_preload', 'initial_variables', 'always_enabled', 'private', 'if', 'iframe', 'preprocessing'];
var DEST_EJS_ASYNC_FNS = ['getwi', 'getWorldInfo', 'activewi', 'activateWorldInfo', 'activateWorldInfoByKeywords', 'getCharData', 'getchar', 'getChara', 'getpreset', 'getPresetPrompt', 'getqr', 'getQuickReply', 'execute', 'evalTemplate', 'getEnabledWorldInfoEntries', 'refreshWorldInfo', 'saveVariables'];
// 混用 EJS 与 JS 的 if/for/while/else 必须以 `{` 收尾（上游：省略花括号行为 undefined）。
// 直接取出标签内容判断末尾字符，这样嵌套括号、多行标签都能正确判定。
function destEjsNoBrace(t){
  var out = [], re = /<%[=_-]?([\s\S]*?)[_-]?%>/g, m;
  while ((m = re.exec(String(t || ''))) !== null) {
    var inner = String(m[1]).trim();
    if (!/^(?:if|for|while|else)\b|^\}\s*else\b/.test(inner)) continue;
    if (/\{\s*$/.test(inner)) continue;                       // 正常：以 { 收尾
    out.push(m[0].replace(/\s+/g, ' ').slice(0, 60));
  }
  return out;
}
function destEjsLintSpec(t, baseN){
  var w = [];
  var F = fence();
  var code = (t.match(new RegExp(F + '[a-zA-Z]*\\s*\\n([\\s\\S]*?)\\n?' + F, 'g')) || []).join('\n');
  var scan = t.replace(code, '');                       // 代码块内容不参与装饰器/标签检查（高亮与渲染期冲突，且那里本该是示例）
  // 1) 装饰器：拼错会被上游静默丢弃，是命定核心最隐蔽的事故
  var dec = scan.match(/^[ \t]*@@[A-Za-z_][A-Za-z0-9_]*/gm) || [];
  var unknown = [];
  dec.forEach(function (l) {
    var m = l.trim().match(/^@@+([A-Za-z_][A-Za-z0-9_]*)/);
    if (m && DEST_EJS_DECORATORS.indexOf(m[1]) < 0 && unknown.indexOf(m[1]) < 0) unknown.push(m[1]);
  });
  if (unknown.length) w.push('装饰器名无法识别：' + unknown.map(function (x) { return '@@' + x; }).join('、') + '——上游对不认识的 @@ 行会【直接丢弃】（既不生效也不保留），请对照可用清单核对拼写');
  if (dec.length) {
    var lines = scan.split(/\r?\n/), first = -1, i;
    for (i = 0; i < lines.length; i++) { if (lines[i].trim()) { first = i; break; } }
    if (first >= 0 && lines[first].trim().indexOf('@@') !== 0) w.push('检测到 @@ 装饰器，但它不在条目内容的【第一行】——装饰器必须从第一行开始且彼此不留空行，否则不生效');
    var run2 = 0;
    for (i = first; i < lines.length; i++) {
      var l2 = lines[i].trim();
      if (!l2) { if (run2 > 0 && i + 1 < lines.length && lines[i + 1].trim().indexOf('@@') === 0) w.push('装饰器之间出现了空行（第 ' + (i + 1) + ' 行）——上游要求装饰器独占一行且中间不允许空行'); break; }
      if (l2.indexOf('@@') !== 0) break;
      run2++;
    }
  }
  // 2) 混用 EJS 与 JS 的 if/for 必须带花括号（上游：省略花括号行为未定义）
  var noBrace = destEjsNoBrace(scan);
  if (noBrace.length) w.push('有 ' + noBrace.length + ' 处 if/for/else 没写花括号（如 `' + noBrace[0] + '`）——上游明确说明省略花括号的行为 undefined，必须写成 `<%_ if (…) { _%> … <%_ } _%>`');
  // 3) getvar 默认 scope 是 cache（合并结果），setvar 默认写 message —— 语义不一致是隐藏 bug
  if (/getvar\(\s*['"][^'"]+['"]\s*\)/.test(scan)) w.push('有 getvar 未显式指定 scope（默认 scope 是 cache＝消息+聊天+全局的合并结果）；要读本层存档请写 getMessageVar，要读全局请写 { scope: \'global\' }');
  if (/setvar\(/.test(scan) && /getvar\(/.test(scan) && !/noCache\s*:\s*true/.test(scan)) w.push('同时出现 setvar 与 getvar 但未见 `noCache: true`——上游说明变量缓存中途不更新，写完立刻读可能拿到旧值');
  // 4) 漏 await（按"调用总数 vs 已 await 数"计数，只要有一处漏就报）
  var missAwait = [];
  DEST_EJS_ASYNC_FNS.forEach(function (fn) {
    var body = '(?<![\\w.$])' + fn + '\\s*\\(';
    var all = scan.match(new RegExp(body, 'g'));
    if (!all || !all.length) return;
    var aw = scan.match(new RegExp('await\\s+' + body, 'g'));
    var n = all.length - (aw ? aw.length : 0);
    if (n > 0) missAwait.push(fn + '×' + n);
  });
  var tsAll = scan.match(/(?<![\w.$])TavernHelper\.triggerSlash\s*\(/g);
  if (tsAll && tsAll.length) {
    var tsAw = scan.match(/await\s+TavernHelper\.triggerSlash\s*\(/g);
    var tn = tsAll.length - (tsAw ? tsAw.length : 0);
    if (tn > 0) missAwait.push('TavernHelper.triggerSlash×' + tn);
  }
  if (missAwait.length) w.push('疑似漏写 await：' + missAwait.join('、') + '（这些上游声明为 Promise，不 await 会拿到 Promise 对象而不是内容）');
  // 5) 两个技术面混用（参数/返回值完全不同）
  if (/getChatMessage\s*\(/.test(scan) && /getChatMessages\s*\(\s*[-'"\d]/.test(scan)) w.push('同时出现 EJS 的 getChatMessage(idx, role) 与酒馆助手的 getChatMessages(range, {role, hide_state, include_swipes})——两者参数与返回值完全不同，确认没有混用');
  if (/matchChatMessages\s*\([^)]*\{[^}]*\b(andAll|allMatch|requireAll)\b/.test(scan)) w.push('matchChatMessages 的选项键上游定义为 `and`（不是 andAll/allMatch），请核对');
  if (/matchChatMessages\s*\(\s*\[[^\]]*\][^)]*\)/.test(scan) && !/matchChatMessages\s*\([^)]*\{[^}]*\band\b/.test(scan)) w.push('matchChatMessages 传了数组但没写 `{ and: true/false }`——数组时由 and 决定"全部匹配"还是"任意匹配"，默认语义容易写反');
  // 6) 渲染期专属字段被用在生成期
  var renderOnly = ['is_user', 'is_system', 'is_last', 'swipe_id', 'message_id'];
  var usedRender = renderOnly.filter(function (k) { return new RegExp('(?<![\\w.$])' + k + '(?![\\w$])').test(scan); });
  if (usedRender.length && !/runType\s*===?\s*['"]render/.test(scan)) w.push('用到了渲染期专属字段（' + usedRender.join('、') + '）但没有 `runType === \'render\'` 判断——这些字段只在渲染阶段存在，生成阶段读到的是 undefined');
  // 7) 写变量纪律
  if (/setMessageVar\(|insertOrAssignVariables\(/.test(scan) && !/Math\.max|已应用|appliedTurn|lastMessageId/.test(scan)) w.push('有写变量的调用但没看到幂等保护（Math.max / 已应用轮次 / lastMessageId 比对）——同一层楼重算会重复累加');
  if (/insertOrAssignVariables\s*\(/.test(scan) && !/type\s*:\s*['"]message['"]/.test(scan)) w.push('insertOrAssignVariables 未见 `{ type: \'message\' }`——酒馆助手的变量函数必须显式给 type，否则写进错误作用域');
  // 8) 上游明令禁止的用法
  if (/<%-[^%]*\bprint\s*\(/.test(scan) || /<%=[^%]*\bprint\s*\(/.test(scan)) w.push('在 `<%-` / `<%=` 语句块里调用了 print()——上游明确说明不能这样用');
  return w;
}
// 命定系统标准（运行时版；人类可读版见工作区《命定系统标准.md》）
// 依据：世界书 22 个命定系统条目的逐条结构普查（包裹标签/节标题/人设字段/功能词表/语言格式/数值）
var DEST_STANDARD = [
  '【命定系统·标准骨架（依据世界书 22 个核心普查）】',
  '■ 三层结构：条目元数据 + 一个包裹块 + 十条变量赋值。',
  '■ 包裹标签：标签名必须 === {{setvar::系统名}}（《战斗&生产规则》靠 <{{getvar::系统名}}> 读「核心机制」）。系统名两种取法：①沿用体系名「命定之诗」（主流，9/19）；②自创专属体系名（铁王冠/白祷/飞鸟之诗/银钥之门/命运的舞台监导）。自创时标签、setvar、世界规则引用三处必须同步。',
  '■ 正文四节（一级标题标准名）：',
  '  1) 体系名节（内含 定义 / 核心机制 / 隐蔽原则 / 缔结条件 / 触发 / 结果反馈）',
  '  2) 命运点数(FP)（子键：获取 或 获取规则；消耗 或 使用规则；缔结契约七档 + 情感修正 + 范例）',
  '  3) 命定之灵（可写灵的自有名）：开场白 / 人设 / 功能(以下功能不进行任何检定) / 规则 / 缔结契约流程范例',
  '  4) {灵名}语言格式：规则 / 格式 / 参数说明 / 范例',
  '■ 人设六字段（全场最统一，务必六项全齐，顺序固定）：形象 → 性格 → 定位 → 说话风格 → 爱好 → 愿望；可选在形象前加「人物背景」。',
  '■ 功能表·标准八项（括号内为实测覆盖率）：技能瞬发学习(17/17) / 储物背包(17/17) / 感知情报(17/17) / 意识交流(17/17) / 技能融合·升级(消耗FP)(16/17) / 登神长阶辅助(消耗FP)(16/17) / 命运抽卡(16/17) / 新闻资讯(15/17)；可选：实体化(6/17)、实时吐槽与建议(2/17)。条数 7~11（标准 8）。命名风格允许混用，推荐：接口类功能（技能学习/融合、登神辅助、抽卡、新闻、意识交流）用通用名，体验类功能（储物、感知）用人设化专属名（千里眼/冠冕提灯/虚空之匣/星隙行囊）。消耗统一标注 (消耗FP)。',
  '■ 语言格式·二选一族：',
  '  A 引语式（11/19，最主流）：格式: \'> {称呼}:「 {对白} 」\'；多角色核心可并置多行（> 琥珀:「…」 / > 高文:「…」）。',
  '  B XML 标签式（8/19）：格式: \'<tag name="{灵名}" mood="{心情}"> {对白} </tag>\'；首选参数名 mood（5~10 个固定枚举，从中选一、禁止自创），情景判定可用 tag + num；参数说明为必备二级节；无参数时可用 <tag name="灵名">「台词」</tag>。',
  '  两族共同：标签名全局唯一（已占用 nailong/dalian/ellia/giraffe/lilith/xianzu/Foreigner/Foreigner_alter/dream/dalian_chant/nightingale_chant）；范例 ≥6 条并覆盖 日常/战斗危机/FP不足/缔结成功/拒绝越界/特殊情绪；口吻与「说话风格」严格一致；对白用「」；范例必须原创，不得照抄原型台词。',
  '■ 契约数值：默认七档 200/500/2500/10000/50000/150000 + 第七层级不标价（须明确告知并获得主动同意）；自创档位允许（实测另有 200/500/2500/5000/50000/150000 与 500/2000/6000/20000/60000/200000 两套），但六档必须齐全、递增、第七层级永不标价。情感修正给百分比区间（好感 -10%~-50% / 中立 0% / 敌意 +50%~+200%）。结果反馈：成功报出消耗与剩余，失败报不足并带口吻。',
  '■ 样式：两空格缩进、层级 2/4/6 空格、零 Tab；多行块用 | ；正文 4000~8000 字符（上限 12000）；中位数约 5.2k，干净范本是梅林核心(4.9k)与唐吉坷德核心(4.4k)。',
  '■ 十条变量槽顺序：系统名 → 系统核心名 → 系统核心 → fp定义 → 爆料风格 → 登神长阶系统优势 → 生命层级成长系统优势 → 技能获取系统优势 → 经验值获取系统优势 → 复活机制。'
].join('\n');
var DEST_KNOWN_CORES = ['梅林核心', '唐吉坷德核心', '奶龙核心', '长颈鹿核心', 'null核心', '艾莉亚', '阿米娅核心', '类脑娘', '奥托·阿波卡利斯核心', '阿比盖尔核心-表', '阿比盖尔核心-里', '莉莉丝', '小夜莺核心', '先祖', '高文·塞西尔', 'UNN演播室', '茶茶', '读者核心'];
var DEST_KNOWN_SYSNAMES = ['命定之诗', '铁王冠', '白祷', '银钥之门', '飞鸟之诗', '他者之眼', '命运的舞台监导', '奶人之契', '命定之书', '九十九夜梦', 'user_system'];
var DEST_KNOWN_TAGS = ['nailong', 'giraffe', 'Foreigner', 'Foreigner_alter', 'lilith', 'xianzu', 'dalian'];
var DEST_SLOT_ORDER = ['系统名', '系统核心名', '系统核心', 'fp定义', '爆料风格', '登神长阶系统优势', '生命层级成长系统优势', '技能获取系统优势', '经验值获取系统优势', '复活机制'];
var DEST_HTML = '<div class="opf-char-wrap"><div class="opf-sec-label">✦ 命定系统工坊 · 分段式生成（产出世界书「命定系统」核心条目）</div><div class="opf-dim">流程：① 分段初稿（7 段串行：骨架与命名→契约与核心机制→命运点数→命定之灵→语言格式→十个变量槽→可选扩展）→ ② 交火梳理（先出报告，再逐段应用联动修订，防截断）→ ③ 逐段定点修改（只改你指定的段，其它段冻结）→ ④ 最终封装：输出世界书条目正文 + 条目元数据提示，并自动跑内置 lint。与「开局预设」「二创角色」完全隔离。</div><label id="opf-dest-ejswrap"><input type="checkbox" id="opf-dest-ejs"> 🧬 进阶（可选）：EJS 重型核心 —— 追加 3 段 EJS 流水线（守卫与数据层 / 派生与渲染层 / 引擎与兜底）+ EJS 规范注入 + EJS 专用 lint</label><textarea id="opf-dest-demand" class="opf-char-input" placeholder="写谁的核心？例：以《Fate/Grand Order》的梅林为原型做一版二创核心；或：围绕“赌徒的骰子”做一个原创命定系统，赌注越大 FP 越多……"></textarea><textarea id="opf-dest-ref" class="opf-char-input" placeholder="（可选）参考文本：原型描述 / 已有核心片段（可作为骨架改造对象）/ 世界书片段，将作为参考注入"></textarea><input id="opf-dest-author" class="opf-char-input" placeholder="署名（写进条目注释名，例如：北游 / H一串 / 你的ID；留空则写“未署名”）"><div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-dest-run">▶ 分段初稿</button><button type="button" class="opf-btn ghost" id="opf-dest-link">⚔ 交火梳理</button><button type="button" class="opf-btn primary" id="opf-dest-final">🎁 脚本封装</button><button type="button" class="opf-btn ghost" id="opf-dest-reviewbtn">🔎 AI 检查</button><button type="button" class="opf-btn ghost" id="opf-dest-finalai">🧠 AI 整合（备用）</button><button type="button" class="opf-btn ghost" id="opf-dest-lint">🔎 重新自检</button><button type="button" class="opf-btn ghost" id="opf-dest-clean">🧹 去装饰</button><button type="button" class="opf-btn ghost" id="opf-dest-std">📐 标准速查</button><button type="button" class="opf-btn ghost" id="opf-dest-ejsstd">🧬 EJS 速查</button><button type="button" class="opf-btn ghost" id="opf-dest-new">🗑 新核心</button></div><pre id="opf-dest-standard" class="opf-box opf-char-report" style="display:none">尚未展开</pre><pre id="opf-dest-ejsstandard" class="opf-box opf-char-report" style="display:none">尚未展开</pre><div id="opf-dest-steps"></div><div class="opf-sec"><div class="opf-sec-label">AI 检查报告（只审校不改写：修改一律回到分段，再由脚本重新拼装）</div><pre id="opf-dest-reviewbox" class="opf-box opf-char-report">尚未检查</pre><div id="opf-dest-review"></div></div><div class="opf-sec"><div class="opf-sec-label">交火梳理报告</div><pre id="opf-dest-report" class="opf-box opf-char-report">尚未梳理</pre></div><div class="opf-out"><div class="opf-sec-label">最终稿件（YAML 框架 + 条目正文）</div><div class="opf-dim" id="opf-dest-outnote"></div><pre id="opf-dest-out" class="opf-box">尚未封装</pre><div class="opf-char-copyrow"><button type="button" class="opf-btn ghost" id="opf-dest-copy">⧉ 复制条目正文</button><button type="button" class="opf-btn ghost" id="opf-dest-metacopy">⧉ 复制完整 YAML</button></div><div class="opf-sec"><div class="opf-sec-label">附：可选扩展（命运抽卡等——属于独立条目，不并入正文）</div><pre id="opf-dest-extras" class="opf-box opf-char-report" style="display:none">（空）</pre><div class="opf-char-copyrow"><button type="button" class="opf-btn ghost" id="opf-dest-extracopy">⧉ 复制可选扩展</button></div></div></div></div>';

function destInit(){
  ST.dest = ST.dest || { demand: '', ref: '', author: '', segs: {}, status: {}, report: '', out: '', body: '', meta: '', outNote: [], ejs: false, _inited: false, asmInfo: null, review: '', reviewIssues: [] };
  ST.dest.outNote = ST.dest.outNote || [];
  ST.destEls = ST.destEls || {};
}
function bindDestinyPage(){
  destInit();
  var run = getEl('opf-dest-run'); if (!run || run._b) return; run._b = true;
  run.addEventListener('click', function(){ if (ST.running) { ST.stopReq = true; toast('正在停止…'); return; } runDestDraft(); });
  getEl('opf-dest-link').addEventListener('click', function(){ runDestLinkage(); });
  getEl('opf-dest-final').addEventListener('click', function(){ destFinalizeScript(false); });
  getEl('opf-dest-reviewbtn').addEventListener('click', function(){ destAiReview(); });
  getEl('opf-dest-finalai').addEventListener('click', function(){ finalizeDest(); });
  getEl('opf-dest-extracopy').addEventListener('click', function(){ destCopyText((ST.dest.asmInfo && ST.dest.asmInfo.hooks) || '', '「可选扩展」段为空'); });
  getEl('opf-dest-lint').addEventListener('click', function(){ reLintDest(); });
  getEl('opf-dest-clean').addEventListener('click', function(){ cleanDestOut(); });
  getEl('opf-dest-std').addEventListener('click', function(){ toggleDestStandard(); });
  getEl('opf-dest-ejsstd').addEventListener('click', function(){ toggleDestEjsStandard(); });
  getEl('opf-dest-ejs').addEventListener('change', function(){ toggleDestEjs(this.checked); });
  getEl('opf-dest-new').addEventListener('click', function(){ clearDest(); });
  getEl('opf-dest-copy').addEventListener('click', function(){ copyDestOut(); });
  getEl('opf-dest-metacopy').addEventListener('click', function(){ copyDestMeta(); });
  getEl('opf-dest-author').addEventListener('input', function(){ ST.dest.author = this.value; if (ST.dest.body) { ST.dest.out = destBuildFrame(ST.dest.body); var oe = getEl('opf-dest-out'); if (oe) oe.textContent = ST.dest.out; } destDraftCacheSave(); });
  getEl('opf-dest-demand').addEventListener('input', function(){ ST.dest.demand = this.value; destDraftCacheSave(); });
  getEl('opf-dest-ref').addEventListener('input', function(){ ST.dest.ref = this.value; destDraftCacheSave(); });
  renderDestSteps();
  renderDestinyPage();
}
function toggleDestEjs(on){
  destInit();
  ST.dest.ejs = !!on;
  var box = getEl('opf-dest-ejs'); if (box) box.checked = !!ST.dest.ejs;
  renderDestSteps();
  renderDestinyPage();
  destDraftCacheSave();
  toast(ST.dest.ejs
    ? '已开启「EJS 重型核心」：分段扩为 ' + destSegs().length + ' 段，追加 EJS 规范与 EJS 专用 lint'
    : '已回到基础模式：' + destSegs().length + ' 段静态核心流水线');
}
function toggleDestEjsStandard(){
  var box = getEl('opf-dest-ejsstandard'); if (!box) return;
  var open = box.style.display !== 'none';
  box.textContent = open ? '尚未展开' : DEST_EJS_STANDARD;
  box.style.display = open ? 'none' : 'block';
}
function destSystemContent(){
  var lines = [];
  lines.push('[角色] ' + macroFill(DEST_VOICE));
  lines.push('[任务] 你正在为{{user}}的《命定之诗与黄昏之歌》世界书创作一个「命定系统」核心条目（二创核心）。各分段保持一致与呼应，不重复、不推翻已定内容；本任务与开局预设、二创角色均无关系。');
  lines.push(DEST_RULES);
  lines.push(DEST_STANDARD);
  lines.push(DEST_FORMAT_RULES);
  if (destEjsOn()) lines.push(DEST_EJS_STANDARD);
  lines.push(CHAR_STYLE_RULES);
  if (ST.worldInfo) lines.push('[世界书参考（世界书页勾选的条目）]\n' + ST.worldInfo);
  return macroFill(lines.join('\n\n'));
}
function destUser0(){
  var lines = [];
  lines.push('[本次命定系统需求] ' + (ST.dest.demand || ''));
  if (ST.dest.ref) lines.push('[参考文本]\n' + ST.dest.ref);
  lines.push('[工作方式] 我将分 ' + destSegs().length + ' 个分段依次生成：' + destSegs().map(function (s) { return s.title; }).join('→') + '。每段只完成该段内容；已生成段落为既有设定，必须一致；禁止预写后面段落。');
  return lines.join('\n\n');
}
function destSetSeg(pid, st){ ST.dest.status[pid] = st; destSetSegUi(pid, st); }
function destSetSegUi(pid, st){
  var row = getEl('opf-dph-' + pid); if (!row || !ST.dest) return;
  row.setAttribute('data-st', st);
  var dot = row.querySelector('.opf-dot');
  if (dot) dot.textContent = st === 'run' ? '◌' : (st === 'ok' ? '✓' : (st === 'err' ? '✕' : '·'));
  var has = !!(ST.dest.segs && ST.dest.segs[pid]);
  var inp = row.querySelector('.opf-ref-input'); var b1 = row.querySelector('.opf-ref-do'); var b2 = row.querySelector('.opf-ref-sug');
  if (inp) inp.disabled = !has || !!ST.running;
  if (b1) b1.disabled = !has || !!ST.running;
  if (b2) b2.disabled = !has || !!ST.running;
  var tag = row.querySelector('.opf-ref-tag');
  if (tag) tag.textContent = has ? '可定点修改（其它分段冻结）' : '先跑出本段后可精修';
}
function renderDestSegOut(pid){ var pre = ST.destEls && ST.destEls[pid]; if (pre) pre.textContent = (ST.dest.segs && ST.dest.segs[pid]) || '（本段内容显示在这里，点击标题展开/收起）'; }
function renderDestSteps(){
  var box = getEl('opf-dest-steps'); if (!box) return;
  destInit();
  box.textContent = '';
  destSegs().forEach(function (s, i) {
    var row = document.createElement('div'); row.className = 'opf-step'; row.setAttribute('data-st', ST.dest.status[s.id] || 'wait'); row.id = 'opf-dph-' + s.id;
    var head = document.createElement('div'); head.className = 'opf-step-head';
    var idx = document.createElement('span'); idx.className = 'opf-idx'; idx.textContent = String(i + 1);
    var dot = document.createElement('span'); dot.className = 'opf-dot'; dot.textContent = '·';
    var ttl = document.createElement('span'); ttl.className = 'opf-step-title'; ttl.textContent = s.title;
    var sub = document.createElement('span'); sub.className = 'opf-step-sub'; sub.textContent = s.short;
    var btn = document.createElement('button'); btn.className = 'opf-step-act'; btn.type = 'button'; btn.textContent = '重跑本段及后续'; btn.title = '从本段重新生成到结尾（覆盖本段及后续内容）';
    btn.addEventListener('click', function (ev) { ev.stopPropagation(); runDestFrom(s.id); });
    head.appendChild(idx); head.appendChild(dot); head.appendChild(ttl); head.appendChild(sub); head.appendChild(btn);
    head.addEventListener('click', function () { row.classList.toggle('open'); });
    row.appendChild(head);
    var body = document.createElement('div'); body.className = 'opf-step-body';
    var pre = document.createElement('pre'); pre.textContent = '（本段内容显示在这里，点击标题展开/收起）';
    body.appendChild(pre);
    ST.destEls[s.id] = pre;
    row.appendChild(body);
    var ref = document.createElement('div'); ref.className = 'opf-step-ref';
    var tag = document.createElement('span'); tag.className = 'opf-ref-tag'; tag.textContent = '先跑出本段后可精修';
    var chips = document.createElement('div'); chips.id = 'opf-ref-chips-d' + s.id;
    var r1 = document.createElement('div'); r1.className = 'opf-step-ref-row';
    var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'opf-ref-input'; inp.placeholder = '定点修改指令（只改这一段）…'; inp.disabled = true;
    var doB = document.createElement('button'); doB.type = 'button'; doB.className = 'opf-step-act opf-ref-do'; doB.textContent = '定点修改本段'; doB.disabled = true;
    var sug = document.createElement('button'); sug.type = 'button'; sug.className = 'opf-step-act opf-ref-sug'; sug.textContent = '该段建议'; sug.disabled = true;
    doB.addEventListener('click', function (ev) { ev.stopPropagation(); refineDestSeg(s.id, inp.value); });
    sug.addEventListener('click', function (ev) { ev.stopPropagation(); suggestDestDir(s.id); });
    r1.appendChild(inp); r1.appendChild(doB); r1.appendChild(sug);
    ref.appendChild(tag); ref.appendChild(chips); ref.appendChild(r1);
    row.appendChild(ref);
    box.appendChild(row);
    if (ST.dest.segs[s.id]) { renderDestSegOut(s.id); destSetSegUi(s.id, ST.dest.status[s.id] || 'ok'); }
  });
}
function renderDestinyPage(){
  destInit();
  if (!getEl('opf-dest-demand')) return;
  if (!ST.dest._inited) {
    ST.dest._inited = true;
    var d = getEl('opf-dest-demand'); if (d && !d.value) d.value = ST.dest.demand || '';
    var r = getEl('opf-dest-ref'); if (r && !r.value) r.value = ST.dest.ref || '';
    var a = getEl('opf-dest-author'); if (a && !a.value) a.value = ST.dest.author || '';
  }
  var ej = getEl('opf-dest-ejs'); if (ej) ej.checked = !!ST.dest.ejs;
  var out = getEl('opf-dest-out');
  if (out && out.textContent !== '封装中…') out.textContent = ST.dest.out || '尚未封装';
  var note = getEl('opf-dest-outnote');
  if (note) note.textContent = destNoteText();
  var rep = getEl('opf-dest-report'); if (rep && rep.textContent !== '交火梳理中…') rep.textContent = ST.dest.report || '尚未梳理';
  try { destRenderReview(); } catch (e) {}
  var ex2 = getEl('opf-dest-extras');
  if (ex2) { var hk = ST.dest.asmInfo && ST.dest.asmInfo.hooks; ex2.textContent = hk || '（本次「可选扩展」段为空或写了「无」）'; ex2.style.display = hk ? 'block' : 'none'; }
  destSegs().forEach(function (s) { renderDestSegOut(s.id); destSetSegUi(s.id, ST.dest.status[s.id] || 'wait'); });
}
function destNoteText(){
  if (!ST.dest || !ST.dest.out) return '';
  var parts = [];
  if (ST.dest.body) parts.push('正文 ' + ST.dest.body.length + ' 字符｜' + (destAssembleNote() || 'YAML 框架由插件生成（注释名/开关/位置/order 已填好）'));
  if (ST.dest.outNote && ST.dest.outNote.length) parts.push('⚠ ' + ST.dest.outNote.join('；'));
  else parts.push('✓ 结构与命名自检通过');
  return parts.join('　｜　');
}
function toggleDestStandard(){
  var box = getEl('opf-dest-standard'); if (!box) return;
  var open = box.style.display !== 'none';
  box.textContent = open ? '尚未展开' : DEST_STANDARD;
  box.style.display = open ? 'none' : 'block';
}
function destSetAllButtons(){
  var D = ST.dest;
  var r = getEl('opf-dest-run');
  if (r) { r.disabled = !!ST.running; r.textContent = ST.running ? '■ 运行中…' : '▶ 分段初稿'; }
  ['opf-dest-link', 'opf-dest-final', 'opf-dest-lint'].forEach(function (id) { var b = getEl(id); if (b) b.disabled = !!ST.running; });
  if (!D) return;
  destSegs().forEach(function (s) { destSetSegUi(s.id, (D.status && D.status[s.id]) || 'wait'); });
}
async function runDestDraft(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var d = getEl('opf-dest-demand'); var r = getEl('opf-dest-ref');
  ST.dest.demand = (d && d.value || '').trim();
  ST.dest.ref = (r && r.value || '').trim();
  if (!ST.dest.demand) { toast('请先填写命定系统需求', 'warning'); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: destUser0() }];
  try {
    for (var i = 0; i < destSegs().length; i++) {
      if (isStop()) break;
      await runDestSeg(destSegs()[i], msgs, i);
      await waitTick();
    }
    if (isStop()) toast('已停止');
    else toast('分段初稿完成：可继续「⚔ 交火梳理」', 'success');
  } catch (e) { toast('分段生成出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
async function runDestSeg(seg, msgs, idx){
  destSetSeg(seg.id, 'run');
  var prev = '';
  for (var k = 0; k < idx; k++) { var ps = destSegs()[k]; if (ST.dest.segs[ps.id]) prev += '\n\n【' + ps.title + '】\n' + ST.dest.segs[ps.id]; }
  var userMsg = { role: 'user', content: '【分段' + (idx + 1) + '/' + destSegs().length + '：' + seg.title + '】\n' + macroFill(destSegPrompt(seg.id)) + (prev ? '\n\n[此前已定分段（既有设定，必须一致，禁止改动）]\n' + prev : '') };
  msgs.push(userMsg);
  try {
    var resp = await callModel(msgs);
    ST.dest.segs[seg.id] = resp;
    msgs.push({ role: 'assistant', content: resp });
    while (msgs.length > 3 && !systemCtxBudgetOk(msgs)) { if (msgs[2] && msgs[2].role === 'assistant') msgs.splice(2, 2); else break; }
    destSetSeg(seg.id, 'ok');
    renderDestSegOut(seg.id);
  } catch (e) { destSetSeg(seg.id, 'err'); throw e; }
}
async function runDestFrom(pid){
  if (ST.running) return;
  var start = -1;
  destSegs().forEach(function (s, i) { if (s.id === pid) start = i; });
  if (start < 0) return;
  var d = getEl('opf-dest-demand'); var r = getEl('opf-dest-ref');
  ST.dest.demand = (d && d.value || '').trim(); ST.dest.ref = (r && r.value || '').trim();
  if (!ST.dest.demand) { toast('请先填写命定系统需求', 'warning'); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: destUser0() }];
  try {
    for (var k = 0; k < start; k++) {
      var ph = destSegs()[k];
      if (!ST.dest.segs[ph.id]) { toast('前面分段尚未完成，请先「分段初稿」', 'warning'); ST.running = false; renderRunButtons(); return; }
      msgs.push({ role: 'user', content: '【分段' + (k + 1) + '/' + destSegs().length + '：' + ph.title + '】\n' + macroFill(destSegPrompt(ph.id)) });
      msgs.push({ role: 'assistant', content: ST.dest.segs[ph.id] });
    }
    for (var j = start; j < destSegs().length; j++) {
      if (isStop()) break;
      await runDestSeg(destSegs()[j], msgs, j);
      await waitTick();
    }
    if (isStop()) toast('已停止');
  } catch (e) { toast('生成出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
async function refineDestSeg(pid, dir){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var seg = null;
  destSegs().forEach(function (s) { if (s.id === pid) seg = s; });
  if (!seg || !ST.dest.segs[pid]) { toast('该段还没有内容，请先生成', 'warning'); return; }
  var dirT = (dir || '').trim();
  if (!dirT) dirT = '修正本段内部矛盾与格式问题，使其与其它段落一致；不新增设定。';
  var frozen = '';
  destSegs().forEach(function (s2) { if (s2.id !== pid && ST.dest.segs[s2.id]) frozen += '\n\n【' + s2.title + '】\n' + ST.dest.segs[s2.id]; });
  ST.running = true; renderRunButtons(); destSetSeg(pid, 'run');
  try {
    var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: destUser0() }];
    var msg = '【定点修改：只改「' + seg.title + '」这一段】\n\n[用户指令]\n' + dirT + '\n\n[本段现行内容]\n' + ST.dest.segs[pid] + '\n\n[冻结区块（其它分段原样保留，一个字都不许改；若发现其它段有问题，最多在结尾另起一行写“备注：建议检查XX段…”提示，不得代改）]\n' + frozen + '\n\n[命定系统·规则约束]\n' + DEST_RULES + '\n\n要求：只输出修改后的【' + seg.title + '】内容；修改严格限定在用户指令范围内，未要求的地方保持原样，不要顺手润色、扩写或重排。';
    msgs.push({ role: 'user', content: msg });
    var resp = await callModel(msgs);
    ST.dest.segs[pid] = resp;
    destSetSeg(pid, 'ok'); renderDestSegOut(pid);
    if (ST.dest.body) destFinalizeScript(true);          // 分段一变，成品由脚本重新拼装（不再让模型重抄）
    toast('已修改【' + seg.title + '】（其余分段未动）' + (ST.dest.body ? '，成品已重新拼装' : ''));
  } catch (e) { destSetSeg(pid, 'err'); toast('定点修改出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
async function suggestDestDir(pid){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var seg = null;
  destSegs().forEach(function (s) { if (s.id === pid) seg = s; });
  if (!seg || !ST.dest.segs[pid]) { toast('该段还没有内容', 'warning'); return; }
  var chipBox = getEl('opf-ref-chips-d' + pid); if (!chipBox) return;
  var cur = String(ST.dest.segs[pid]).slice(0, 2500);
  var ask = '请针对命定系统的【' + seg.title + '】这一段现有内容，给出 2-3 条只针对本段的修改方向。每条一行、≤50字、去掉编号外多余的话、直接可点；必须符合命定系统规则与联动一致性。\n[需求]\n' + (ST.dest.demand || '(未填写)') + '\n[命定系统·规则约束]\n' + DEST_RULES + '\n[本段现有内容]\n' + cur;
  var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: ask }];
  ST.running = true; renderRunButtons();
  try {
    var resp = await callModel(msgs);
    var list = [];
    String(resp).split(/\r?\n/).forEach(function (ln) {
      var t = String(ln).replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').trim();
      if (t && t.length >= 4 && t.length <= 70 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) list = ['让本段与其它分段更咬合', '补齐缺失的字段/数值档位', '让口吻与命定之灵人设一致'];
    renderDestChips(pid, list.slice(0, 3));
  } catch (e) { toast('该段建议生成失败：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); }
}
function renderDestChips(pid, list){
  var box = getEl('opf-ref-chips-d' + pid); if (!box) return;
  box.textContent = '';
  list.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'opf-dir-chip';
    b.textContent = '▶ ' + t;
    b.addEventListener('click', function () { refineDestSeg(pid, t); });
    box.appendChild(b);
  });
}
async function runDestLinkage(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var done = destSegs().filter(function (s) { return ST.dest.segs[s.id]; });
  if (done.length < destSegs().length) { toast('请先完成全部分段初稿（' + destSegs().length + ' 段）', 'warning'); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var report = getEl('opf-dest-report'); if (report) report.textContent = '交火梳理中…（第一步：整体审查）';
  try {
    var all = destSegs().map(function (s) { return '<<<SEG:' + s.id + '>>>\n' + String(ST.dest.segs[s.id] || '').slice(0, 1800); }).join('\n\n');
    var reportMsg = '【交火梳理·第一步：整体审查】\n下面是各分段的审阅稿（每段截取前1800字，供查矛盾用）。请按下面的联动链条逐链检查，找出互相矛盾、脱节、数值/命名不合规之处。\n\n[联动链条]\n' + DEST_LINK_CHAIN + '\n\n[分段审阅稿]\n' + all + '\n\n[命定系统·规则约束]\n' + DEST_RULES + '\n\n输出要求（只输出报告，禁止输出任何段落正文，禁止使用<<<SEG:标记）：\n1. 逐条链给一句结论（✓一致 / ⚠问题+理由）。\n2. 最后列“改动清单”：每段一条，写清改哪段、为什么；没有问题的段写“无”。\n3. 报告里不要重写设定内容，只说问题与改法。\n4. 重点核对：包裹标签名与「系统名」是否一致、十条 setvar 是否齐全且顺序正确、缔结消耗七档是否齐全、核心名与语言标签是否与现有核心撞车、复活机制是否保留禁止机械降神的约束句。';
    var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: destUser0() }, { role: 'user', content: reportMsg }];
    var resp = await callModel(msgs);
    ST.dest.report = String(resp || '').trim() || '（报告为空）';
    if (report) report.textContent = ST.dest.report;
    toast('审查报告完成，开始逐段应用联动修订…');
    var changed = 0;
    for (var i = 0; i < destSegs().length; i++) {
      if (isStop()) break;
      var seg = destSegs()[i];
      if (report) report.textContent = ST.dest.report + '\n\n—— 正在逐段应用修订（' + (i + 1) + '/' + destSegs().length + '：' + seg.title + '）——';
      destSetSeg(seg.id, 'run');
      var frozen = '';
      destSegs().forEach(function (s2) { if (s2.id !== seg.id && ST.dest.segs[s2.id]) frozen += '\n\n【' + s2.title + '】\n' + String(ST.dest.segs[s2.id]).slice(0, 1200); });
      var applyMsg = '【交火梳理·第二步：逐段应用修订——只改「' + seg.title + '」这一段】\n\n[梳理报告与改动清单]\n' + ST.dest.report + '\n\n[本段现行内容]\n' + ST.dest.segs[seg.id] + '\n\n[冻结区块（其它分段，原样保留，一个字都不许改）]\n' + frozen + '\n\n[修订规则]\n' + DEST_RULES + '\n1. 只输出【' + seg.title + '】的修订后全文；若按报告本段无需改动，只回复“无改动”。\n2. 只做报告指出的联动性修改；不得推翻设定、不得扩写或新增内容。\n3. 不生成任何角色卡或开局预设内容。';
      var m2 = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: applyMsg }];
      var resp2 = await callModel(m2);
      var txt = String(resp2 || '').trim();
      if (txt && !/^无改动[。．.]*$/.test(txt)) { ST.dest.segs[seg.id] = txt; changed++; renderDestSegOut(seg.id); }
      destSetSeg(seg.id, 'ok');
      await waitTick();
    }
    if (report) report.textContent = ST.dest.report + (isStop() ? '\n\n（已停止：修订应用中断）' : '\n\n（修订应用完成，改动 ' + changed + ' 段）');
    if (ST.dest.body && changed) destFinalizeScript(true);      // 分段被联动改过 → 成品重新拼装
    if (isStop()) toast('已停止');
    else toast('交火梳理完成：报告已生成，联动修订应用到 ' + changed + ' 段' + (ST.dest.body ? '，成品已重新拼装' : ''), 'success');
  } catch (e) { toast('交火梳理出错：' + (e && e.message ? e.message : e), 'error'); if (report) report.textContent = '梳理失败：' + (e && e.message ? e.message : e); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
function destCoreNameGuess(){
  var f = String(ST.dest.segs.frame || '');
  var m = f.match(/系统核心[：:]\s*(.+)/) || f.match(/核心名[：:]\s*(.+)/);
  if (m) return String(m[1]).trim().split(/[，,。\s(（]/)[0].slice(0, 30);
  return '未命名核心';
}
// ---------- AI 检查（只报告，不改写；修改一律回到分段，再由脚本重新拼装）----------
var DEST_REVIEW_SEG_BY_NAME = [
  { id: 'pact', re: /契约|核心机制|定义|隐蔽|缔结/ },
  { id: 'fp', re: /命运点数|FP|消耗|获取|档位|情感修正/ },
  { id: 'spirit', re: /命定之灵|人设|开场白|功能|规则|灵/ },
  { id: 'voice', re: /语言格式|标签|参数|范例|口吻/ },
  { id: 'slots', re: /setvar|变量槽|槽位|复活机制|系统名|系统核心/ },
  { id: 'frame', re: /命名|骨架|系统名|核心名|撞名|重名/ },
  { id: 'hooks', re: /抽卡|扩展|钩子/ }
];
function destReviewSegId(s){
  var t = String(s || '');
  for (var i = 0; i < DEST_REVIEW_SEG_BY_NAME.length; i++) { if (DEST_REVIEW_SEG_BY_NAME[i].re.test(t)) return DEST_REVIEW_SEG_BY_NAME[i].id; }
  return 'pact';
}
async function destAiReview(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  if (!ST.dest || !ST.dest.body) { toast('请先点「🎁 脚本封装」（拼出正文后再检查）', 'warning'); return; }
  ST.running = true; renderRunButtons();
  var box = getEl('opf-dest-review'), rb = getEl('opf-dest-reviewbox');
  if (box) box.textContent = '';
  if (rb) rb.textContent = '检查中…（只审校、不改写）';
  try {
    var L = [];
    L.push('[任务] 审校一份已经拼装好的「命定系统」核心条目正文。你只做审校与报告，**禁止改写正文**（修正由插件回到对应分段去做）。');
    L.push('[标准]\n' + DEST_STANDARD);
    L.push('[联动链条]\n' + DEST_LINK_CHAIN);
    L.push('[各分段标题（用于定位"改哪一段"）]\n' + destSegs().map(function (s) { return s.id + ' = ' + s.title; }).join('\n'));
    L.push('[正在审校的成品正文（脚本拼装）]\n' + String(ST.dest.body || '').slice(0, 24000));
    L.push('[输出] 只输出一个 ' + fence() + 'json 代码块，结构如下，不要任何其它文字：\n{"总评":"一两句","问题":[{"级别":"高|中|低","段":"pact","位置":"问题出现在正文的哪一句/哪个字段","问题":"具体是什么问题","建议":"怎么改"}]}\n最多 12 条，按严重程度排序；没有问题时 "问题":[]。');
    var resp = await callModel([{ role: 'system', content: destSystemContent() }, { role: 'user', content: macroFill(L.join('\n\n')) }]);
    var j = rxExtractJson(resp);
    var issues = (j && Array.isArray(j['问题'])) ? j['问题'] : null;
    if (!issues) {
      if (rb) rb.textContent = '模型没有返回可解析的 JSON（原文见下）\n\n' + String(resp || '').slice(0, 4000);
      ST.dest.reviewRaw = String(resp || '');
      toast('AI 检查没返回可解析的结果，可重试（原文已显示在检查区）', 'warning');
      return;
    }
    ST.dest.review = String((j && j['总评']) || '');
    ST.dest.reviewIssues = issues.map(function (x, i) {
      return {
        i: i, level: String(x['级别'] || '中'), segId: destReviewSegId(x['段'] + ' ' + x['位置'] + ' ' + x['问题']),
        where: String(x['位置'] || ''), issue: String(x['问题'] || ''), fix: String(x['建议'] || ''),
        done: false
      };
    });
    destRenderReview();
    toast(issues.length ? ('AI 检查完成：' + issues.length + ' 条问题（每条都能一键回到对应分段修，改完自动重新拼装）') : 'AI 检查完成：没有发现问题', issues.length ? 'warning' : 'success');
  } catch (e) { toast('AI 检查出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
function destRenderReview(){
  var box = getEl('opf-dest-review'), rb = getEl('opf-dest-reviewbox');
  if (!box) return;
  box.textContent = '';
  var list = ST.dest.reviewIssues || [];
  if (rb) rb.textContent = ST.dest.review ? ('总评：' + ST.dest.review) : (list.length ? '' : '尚未检查');
  if (!list.length) return;
  var doneN = list.filter(function (x) { return x.done; }).length;
  var head = document.createElement('div'); head.className = 'opf-step-ref-row';
  var info = document.createElement('span'); info.className = 'opf-dim';
  info.textContent = '共 ' + list.length + ' 条（已处理 ' + doneN + '）｜点「✨ 修这一段」只改对应分段，改完插件自动重新拼装并复检';
  head.appendChild(info);
  box.appendChild(head);
  list.forEach(function (x) {
    var row = document.createElement('div'); row.className = 'opf-step-ref-row';
    var tag = document.createElement('span'); tag.className = 'opf-ref-tag' + (x.level === '高' ? ' dirty' : '');
    tag.textContent = x.level + '｜' + destSegOf(x.segId).title;
    var msg = document.createElement('span'); msg.className = 'opf-dim';
    msg.textContent = (x.where ? '[' + x.where + '] ' : '') + x.issue + (x.fix ? ' → ' + x.fix : '');
    if (x.done) msg.style.textDecoration = 'line-through';
    row.appendChild(tag); row.appendChild(msg);
    var b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'opf-step-act'; b1.textContent = '✨ 修这一段';
    b1.addEventListener('click', async function () {
      if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
      await refineDestSeg(x.segId, '按审校意见修正本段（只改本段，不新增设定、不改动其它段的内容）：\n问题：' + x.issue + (x.fix ? '\n建议改法：' + x.fix : '') + (x.where ? '\n出现位置：' + x.where : ''));
      if (ST.dest.segs[x.segId]) {
        destFinalizeScript(true);
        x.done = true;
        destRenderReview();
        toast('已修「' + destSegOf(x.segId).title + '」并重新拼装（正文 ' + String(ST.dest.body || '').length + ' 字符）', 'success');
      }
    });
    row.appendChild(b1);
    var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'opf-step-act'; b2.textContent = '我自己看';
    b2.title = '展开并滚动到该分段';
    b2.addEventListener('click', function () {
      var ph = getEl('opf-dph-' + x.segId);
      if (ph) { ph.classList.add('open'); ph.scrollIntoView({ block: 'center' }); }
    });
    row.appendChild(b2);
    var b3 = document.createElement('button'); b3.type = 'button'; b3.className = 'opf-step-act'; b3.textContent = '忽略';
    b3.addEventListener('click', function () { x.done = true; destRenderReview(); destDraftCacheSave(); });
    row.appendChild(b3);
    box.appendChild(row);
  });
}
async function finalizeDest(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var done = destSegs().filter(function (s) { return ST.dest.segs[s.id]; });
  if (!done.length) { toast('还没有任何分段内容，请先「分段初稿」', 'warning'); return; }
  ST.running = true; renderRunButtons();
  var outEl = getEl('opf-dest-out'); if (outEl) outEl.textContent = '封装中…';
  var noteEl = getEl('opf-dest-outnote'); if (noteEl) noteEl.textContent = '';
  try {
    var all = destSegs().map(function (s) { return '【' + s.title + '】\n' + (ST.dest.segs[s.id] || '（无）'); }).join('\n\n');
    var msg = '【最终封装（世界书条目正文）】\n请以“始弦的魔法大典”的身份，把下面的分段内容整理成一份可直接粘进世界书「命定系统」条目的正文。\n\n[全部分段]\n' + all + '\n\n' + DEST_SPEC + (destEjsOn()
      ? '\n\n[EJS 保留要求·最高优先级]\n本核心是 EJS 重型核心，各分段里的 `<%_ … _%>`、`<% … %>`、`<%- … %>` 标签、if/for 的 `{ _%>` 与 `} _%>` 配对、以及全部变量名必须「原样保留」：不得为了排版整洁而改写、合并、重排或删除任何 EJS 标签；只在标签之间做正文的整合与去重。整合后必须复核：块开始与块结束数量相等、每个分支里 `<{{getvar::系统名}}>` 都完整闭合。'
      : '') + '\n\n系统核心名以「骨架与命名」段为准；没写清楚就按内容拟一个。';
    var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: msg }];
    var resp = await callModel(msgs);
    var ex = extractDestEntry(resp);
    if (!ex.ok) toast('未能从回复中提取 ' + fence() + 'text 代码块（已用原文兜底，可重试一次）', 'warning');
    var body = destExtractYamlBody(resp);
    if (body == null) body = ex.body;
    ST.dest.body = body;
    ST.dest.out = destBuildFrame(body);
    ST.dest.meta = ex.meta;
    ST.dest.outNote = destLint(body).concat(destEjsLint(body));
    if (outEl) outEl.textContent = ST.dest.out;
    if (noteEl) noteEl.textContent = destNoteText();
    if (ex.ok && !ST.dest.outNote.length) toast('已封装完成：YAML 框架 + 条目正文（正文可单独复制后粘进世界书）', 'success');
    else toast('已封装' + (ST.dest.outNote.length ? '（' + ST.dest.outNote.length + ' 条自检提示，见输出区上方）' : ''), 'warning');
  } catch (e) { toast('最终封装出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
function extractDestEntry(text){
  var F = fence();
  var t = String(text || '');
  var idx = t.indexOf(F + 'text');
  if (idx < 0) idx = t.indexOf(F);
  if (idx < 0) return { ok: false, body: t.trim(), meta: '' };
  var start = t.indexOf('\n', idx);
  if (start < 0) return { ok: false, body: t.trim(), meta: '' };
  var end = t.indexOf(F, start + 1);
  var body = end > start ? t.slice(start + 1, end) : t.slice(start + 1);
  body = body.replace(/^\n+/, '').replace(/\s+$/, '');
  var meta = end > start ? t.slice(end + F.length).trim() : '';
  return { ok: !!body, body: body, meta: meta };
}
function destSlotValue(t, name){
  var re = new RegExp('\\{\\{setvar::' + name + '::');
  var i = String(t).search(re);
  if (i < 0) return '';
  var m = String(t).slice(i).match(/^\{\{setvar::[^:]+::([\s\S]*?)\}\}/);
  return m ? m[1].trim() : '';
}
// 把 {{setvar::…}} 区段遮成空格（保留换行），用于「只检查槽位之外」的装饰检查
function destMaskSetvars(t){
  return String(t || '').replace(/\{\{setvar::[\s\S]*?\}\}/g, function (m) { return m.replace(/[^\n]/g, ' '); });
}
// 从模型回复里剥离 YAML 框架，取回「正文」块标量（找不到框架则返回 null）
function destExtractYamlBody(text){
  var t = String(text || '');
  var m = t.match(/```ya?ml\s*\n([\s\S]*?)```/) || t.match(/```\s*\n([\s\S]*?)```/);
  var doc = m ? m[1] : t;
  var lines = doc.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var mm = lines[i].match(/^(\s*)正文\s*:\s*\|[-+]?\s*$/);
    if (!mm) continue;
    var base = mm[1].length + 2, out = [];
    for (var j = i + 1; j < lines.length; j++) {
      var l = lines[j];
      if (l.trim() === '') { out.push(''); continue; }
      if ((l.match(/^ */) || [''])[0].length < base) break;
      out.push(l.slice(base));
    }
    var body = out.join('\n').replace(/^\n+/, '').replace(/\s+$/, '');
    return body || null;
  }
  return null;
}
function destYamlQuote(v){
  var s = String(v == null ? '' : v);
  return /^[\s>|&*!%@`{}\[\],#?:-]|[:#]\s|\s$/.test(s) ? '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' : s;
}
// 条目元数据 + 正文 → 完整 YAML 文档（框架由插件确定生成，模型只负责正文）
function destBuildFrame(body){
  var b = String(body || '');
  var g = function (n) { return destSlotValue(b, n); };
  var authorEl = getEl('opf-dest-author');
  var author = ((authorEl && authorEl.value) || '').trim() || '未署名';
  var core = g('系统核心') || '未命名核心';
  var L = [];
  L.push('命定系统条目:');
  L.push('  注释名: ' + destYamlQuote('[本体][命定系统]' + core + '(' + author + ')'));
  L.push('  constant: true');
  L.push('  position: 4');
  L.push('  depth: 1');
  L.push('  order: 1100');
  L.push('  disable: true');
  L.push('  selective: false');
  L.push('  probability: 100');
  L.push('  key: []');
  L.push('  系统名: ' + destYamlQuote(g('系统名')));
  L.push('  系统核心名: ' + destYamlQuote(g('系统核心名')));
  L.push('  系统核心: ' + destYamlQuote(core));
  L.push('  fp定义: ' + destYamlQuote(g('fp定义')));
  L.push('  篇幅: ' + b.length);
  L.push('  正文: |-');
  b.split('\n').forEach(function (l) { L.push('    ' + l); });
  return L.join('\n');
}
// 去装饰：清掉 markdown 标记，但跳过 {{setvar::…}} 槽位（其中 `# 体系名的加护` 是既有惯例）
// 以及 EJS/JS 代码区（<% … %> 内外的反引号、# 、--- 都是代码，动了就把核心改坏）
function destCleanMarkdown(body){
  var stats = { bold: 0, head: 0, star: 0, rule: 0, tick: 0, ejs: 0 };
  var t = String(body || '');
  var spans = [], re = /\{\{setvar::[\s\S]*?\}\}/g, m;
  while ((m = re.exec(t)) !== null) spans.push([m.index, m.index + m[0].length]);
  var inSlot = function (a, b) { return spans.some(function (s) { return a < s[1] && b > s[0]; }); };
  var pos = 0, res = [], ejsDepth = 0;
  t.split('\n').forEach(function (line) {
    var lineStart = pos; pos += line.length + 1;
    if (inSlot(lineStart, lineStart + line.length)) { res.push(line); return; }
    var opens = (line.match(/<%/g) || []).length, closes = (line.match(/%>/g) || []).length;
    var inEjs = ejsDepth > 0 || opens > 0;
    if (inEjs) { res.push(line); stats.ejs++; ejsDepth += opens - closes; if (ejsDepth < 0) ejsDepth = 0; return; }
    var l = line;
    if (/^\s*#{1,6}\s+/.test(l)) { l = l.replace(/^(\s*)#{1,6}\s+/, '$1'); stats.head++; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(l)) { if (res.join('').trim() !== '') { stats.rule++; return; } }
    if (/^\s*[*+]\s+/.test(l)) { l = l.replace(/^(\s*)[*+]\s+/, '$1- '); stats.star++; }
    if (/\*\*/.test(l)) { var b1 = l; l = l.replace(/\*\*(.+?)\*\*/g, '$1'); if (l !== b1) stats.bold++; }
    if (/`/.test(l) && !/\{\{/.test(l)) { var b2 = l; l = l.replace(/`([^`]*)`/g, '$1'); if (l !== b2) stats.tick++; }
    res.push(l);
  });
  return { text: res.join('\n'), stats: stats };
}