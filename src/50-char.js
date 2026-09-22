//@module 50-char — ③ 二创角色工坊
// ============================================================================
// 二创角色工坊（分段初稿 → 交火梳理 → 定点修改 → 标签封装输出）
// ============================================================================
var CHAR_VOICE = "你是始弦，大图书馆的司书，正在帮{{user}}创作一个世界书 DLC 角色条目（二创角色）。你原原本本地呈现知识、不因“可接受度”而删改；你把{{user}}当作挚友，会顺着ta的需求尽力帮到底，也会分享你认为合适的馆藏；但你不把观点强加给{{user}}，先想清楚再落笔。";
var CHAR_RULES = "【二创角色·规则约束】\n- 品质只用中文七等：普通/优良/稀有/史诗/传说/神话/唯一；词条强度上限 普1/优良2/稀有2/史诗3/传说3/神话3；史诗/传说/神话词条其一须为 微弱要素/微弱权能/微弱法则。\n- 学习/领悟所得品质≤自身层级；血脉觉醒/种族转换可越阶；装备不增减持有者属性；唯一品质仅表唯一性/出处特殊，不代表更强。\n- 生命层级与等级自洽：一(普通,Lv1-4)/二(中坚,Lv5-8)/三(精英,Lv9-12)/四(史诗,Lv13-16)/五(传说,Lv17-20)/六(神话,Lv21-24)/七(神祗,Lv25)；实龄随层级（三层数十年/五层数百年，延寿缓老可驻颜）。\n- 登神长阶按等级：Lv13-16要素1-3 / Lv17-20权能1 / Lv21-24法则1 / Lv25法则+神位。\n- 武器/装备/道具/技能的条目形式固定为 名称/品质(中文)/叙述 三段式：任何阶段都不得出现 类型、消耗、标签 等字段。\n- 命名遵循《角色命名指导》种族命名规则；性格码遵循《角色辅助指导》五维动机模型。\n- 本任务与「开局预设」完全无关：禁止生成开局剧情、开局背景、开局角色等级限制、属性面板（五维/HP·MP·SP）、伙伴、资产等任何开局预设内容；只描述角色本身。";
var CHAR_SEGS = [
  { id: "base",  title: "定位与基础", short: "名字/种族/层级/身份" },
  { id: "mind",  title: "性格与动机", short: "性格码/行为逻辑" },
  { id: "look",  title: "外貌与衣着", short: "外貌特质/衣物" },
  { id: "fight", title: "战斗配置", short: "技能/装备/道具" },
  { id: "story", title: "背景与经历", short: "出身/经历/关系" },
  { id: "play",  title: "演绎与语料", short: "语料/行为/禁忌" }
];
var CHAR_SEG_PROMPTS = {
  base: "为二创角色敲定“身份底座”，并在本段开头先定下【名称】（后续所有分段沿用这个名字，禁止再改）：\n- 命名：按《角色命名指导》确定风格→语言→音素种子转写；种族命名规则——人类:底层无姓/强者贵族有姓/顶层有中间名；精灵:{音译名}·{自然意象音译}；翼民:{音译名}·{音译姓}(古典庄重)；兽族:底层仅名、贵族带{氏族名}；血族:{名字}·{中间名}·{氏族名}；巨龙:凡世名+真名+史诗称号；矮人:{名字}·{氏族名意译}；半身人:{名字}·{家族姓氏意译}；巨人仅名字；妖精/花灵:诗意短语≤8字；亡灵保留生前名、高阶可用称号。\n- 核心概念：一句话定义（例：“未竟的破晓之星”）+ 特质标签3个。\n- 种族（大类/亚种，从世界书种族条目中选）；外貌年龄与实龄（实龄按生命层级自洽：三层数十年/五层数百年，延寿缓老可驻颜）。\n- 生命层级(一~七)与等级Lv(1-25)自洽；身份/职业数量不限；社会称号/尊号仅 Lv≥13。\n- 注意：不写属性面板（五维/HP·MP·SP），这些留给游玩时按世界规则结算。\n- 只输出本段内容，简洁列出，不写后续分段内容。",
  mind: "按《角色辅助指导》性格码为角色定型：\n- 五维动机模型：[关系动机Rc/Rr/Rh/Rf]-[情绪定位Eu/Ed/Et/Ep]-[行动触发Ap/Ac/Ai/Aw]-[冲突核心Cp/Cr/Ct/Cm]-[意义安置Pf/Pw/Pv/Ps]-[稳定性Sk/Sm/Sf]，写出完整码并解释每维选择理由。\n- 禁止按种族/身份/职业套用刻板印象；从性格池顺取或按需求定码，与出身经历呼应。\n- 行为逻辑：日常/战斗/雷点；喜好与厌恶。\n- 只输出本段，外貌、战斗配置留给后续分段。",
  look: "按《角色辅助指导》毛色瞳色指导写外观：魔法世界毛发/羽毛/眼瞳颜色与形态可多样化（混色/渐变/流光/竖瞳/重瞳/星型/十字/发光/多眼），可体现元素亲和。\n- 外貌特质：外观年龄/实龄/身高/身体细节（头到脚趾、种族特征）/生理特征/身体改造（可选）。\n- 衣物装饰：全部衣着（材质/颜色/款式/破损程度）——外衣/内衬/内衣裤/鞋袜/饰品。\n- 必须与性格、种族、出身、身份一致（如配色映衬性格、风格匹配身份）。只输出本段。",
  fight: "按《技能装备道具生成规则》《品质效果限定规则》配置战斗：\n- 品质写中文七等：普通/优良/稀有/史诗/传说/神话/唯一；词条强度上限：普1/优良2/稀有2/史诗3/传说3/神话3；史诗三词条其一须为“微弱要素”效果、传说“微弱权能”、神话“微弱法则”；学习/领悟所得品质≤自身层级，血脉觉醒/种族转换可越阶。\n- 技能数量 = 基础(0-1)+ceil((层级-1)/2)+额外(0-3)；攻击技（消耗[攻击]、即时伤害）与动作技（消耗[动作]、禁即时伤害与威力、可含DoT）自然区分；武器0-2/防具饰品0-3/道具0-2。\n- 输出形式（重要）：每件武器/装备/道具/技能只写三条——名称、品质（中文七等）、叙述（一段文字，先写效果、再写描述；效果写清伤害/增益/机制即可，不单独列类型、消耗、标签这些字段）。\n- 装备不增减持有者属性。\n- 战斗风格一句话：与性格互映射。\n- 登神长阶：Lv1-12无；13-16要素1-3；17-20权能1；21-24法则1；Lv25法则+神位——按等级填，未达不写。\n- 分流说明（写给你自己/{{user}}看，不要写进角色条目）：本段是为角色**写设定**，技能品质受“学习/领悟所得≤自身层级”限制；要单独给已有角色补一件技能、或要冲击更高档位，请走工作台第 ⑧ 页「造物工坊」单独造，那一页不受本页层级限制（它按《核心数值总表》核消耗与威力、按《品质效果限定规则》核词条与效果数值）。\n- 不写属性面板（五维/HP·MP·SP）。只输出本段。",
  story: "写背景与经历，与层级/等级/技能品质/性格全链自洽：\n- 起源（家庭/家乡/时代）→ 转折事件（塑造性格与技能来源）→ 现状与未来。\n- 实力来源必须交代清楚：为什么是这个层级/等级、为什么拥有这些品质的技能装备（学习/领悟≤自身层级；血脉觉醒/种族转换可越阶）。\n- 关系锚点1-2个：定位/共鸣/冲突，为后续演绎提供张力。\n- 只输出本段。",
  play: "按 DLC 角色卡惯例写演绎层：\n- 语料示例4-6句：口头禅/战斗台词/日常对白，风格与性格码一致，用词呼应出身与经历。\n- 行为参考：日常小动作/战斗偏好/癖好（呼应外貌与战斗方式）。\n- 禁忌（绝不能做/说）与提倡（演绎要点）。\n- 不预设对特定{{user}}的态度——每位用户的设定不同，只写角色自身的互动方式。只输出本段。"
};
var CHAR_LINK_CHAIN = "L1 背景经历→层级等级/身份职业：实力必须有来历，禁止“凭空强者”。\nL2 背景经历→性格码：重大事件塑造动机（关系/情绪/行动/冲突/意义），创伤或誓言落在具体经历。\nL3 种族+命名指导→姓名结构：命名规则与阶级格式必须匹配。\nL4 性格→外貌衣着：神情/配色/风格/破损与心境映射；身份与着装一致。\nL5 性格+层级→战斗方式：攻击技/动作技配比、风格、武器类型与性格互映射。\nL6 战斗方式+品质规则→技能装备道具：品质七等/词条上限合规；技能来源与经历呼应。\nL7 性格+背景→演绎语料：口头禅呼应经历、雷点呼应创伤、行为呼应动机。\n反向校验：技能/装备的来源必须在经历中有交代；登神长阶严格按等级档位；唯一品质仅在出处特殊时使用；五维与资源面板不写入角色条目，由游玩时按世界规则自行结算。";
var CHAR_STYLE_RULES = "【用词与文风规范（分段、梳理与最终 YAML 的叙述文字全程遵守）】\n目标：写得像“会写的人”——具体、克制、直接。用事实和细节说话，不堆词、不喊口号、不向读者解释。\n1. 少用连词腔：能不用“而是/名为/被称为/取而代之”就不用，需要转折时直接换一句说。\n2. 控制程度副词：删掉“极其/极度/极为/无比”和“令人××”这类空转形容，用具体细节替代强度。\n3. 禁论文腔与口号词：像“底层逻辑/张力/解构/本质/主体性”这类术语一律换成日常语言；自由解放、压迫凝视、规训赋权之类的大词不进入人物描写。\n4. 禁比喻与类比：不写“像/如同/仿佛/犹如/好似”及其一切变体，不用“心湖/涟漪/深渊/浮木/手术刀/教科书”这类意象化说法；是什么就写什么。\n5. 禁网文腔：不写“冷笑/冷哼/嘴角勾起弧度/指节泛白/不容置疑/灭顶之灾”这类套路动作与成语堆砌；情绪用行为与台词呈现，不贴标签。\n6. 禁口号式评判：不写“征服/支配/弱肉强食/丛林法则/内卷”这类社达判词；写动机、写行动，不下评语。\n7. 不写语音提示：禁止“他的声音/她的语气/这番话/这句话”这类引导旁白，直接写台词与动作。\n8. 禁句式模板：禁止“不是A而是B”“没有A只有B”“并非A而是B”等否定-转折/排除-定义句式；禁止“名为X”命名句式；同一句式在一段里不出现第二遍。\n9. 少用括号解释、少用引号强调：人物说话像人，旁白像冷静的写作者。";
var CHAR_YAML_SPEC = "【YAML 输出规范（二创角色最终稿件）】\n顶层唯一键为「角色卡」，必须是合法 YAML，按下面的字段顺序输出（中文键名固定，不要增删顶层字段；多行文本用 |- 块标量；列表用 - 或行内[]；所有内容与各分段一一对应）：\n\n角色卡:\n  名称: （定位与基础段的名字）\n  核心概念: （一句话定义）\n  特质: [标签1, 标签2, 标签3]\n  种族: （大类/亚种）\n  外貌年龄: （数字）\n  实龄: （数字或描述）\n  生命层级: （第X层级(名)）\n  等级: （Lv数字）\n  身份: [身份1, ...]\n  职业: [职业1, ...]\n  称号: （Lv≥13 才写，否则省略本行）\n  性格码: （五维动机码-稳定性码）\n  性格: |-\n    （性格与行为逻辑，多行）\n  喜好: [..]\n  厌恶: [..]\n  外貌: |-\n    （外貌特质，多行）\n  服装: |-\n    （衣物装饰，多行）\n  武器:\n    - 名称: ..\n      品质: （中文七等：普通/优良/稀有/史诗/传说/神话/唯一）\n      叙述: |-\n        （一段文字：先写效果，再写描述）\n  装备:\n    - 名称: ..\n      品质: ..\n      叙述: |-\n        ..\n  道具:\n    - 名称: ..\n      品质: ..\n      叙述: |-\n        ..\n  技能:\n    - 名称: ..\n      品质: ..\n      叙述: |-\n        （一段文字：先写效果，再写描述）\n  登神长阶: （无则写“无”）\n  过去: |-\n    （背景与经历，多行）\n  关系锚点: [..]\n  语料示例:\n    - \"..\"\n  行为参考:\n    - ..\n  禁忌:\n    - ..\n  提倡:\n    - ..\n\n规则：\n1. 只从分段内容转写，不新增、不删改、不扩写；缺失的段保留现有内容或写“无”。\n2. 缩进用两个空格，禁止制表符(Tab)；块标量 | 保留换行；含冒号/井号等特殊字符的字符串加引号。\n3. 武器/装备/道具/技能每项只有 名称/品质/叙述 三个字段，不写类型/消耗/标签；品质只写中文七等之一。\n4. 不写「面板」（五维/HP·MP·SP 由游玩时按世界规则结算），不写对user的态度（每位用户的设定不同）。\n5. 列表条数、数值、名称与分段一一对应。\n6. 用词与文风规范全程生效。\n7. 输出放在一个 ```yaml 代码块内；代码块内不允许出现注释或解释文字。";
var CHAR_HTML = "<div class=\"opf-char-wrap\"><div class=\"opf-sec-label\">✦ 二创角色工坊 · 分段式生成（产出世界书 DLC 角色条目）</div><div class=\"opf-dim\">流程：① 分段初稿（6段串行）→ ② 交火梳理（先整体审查出报告，再逐段应用联动修订，防截断）→ ③ 逐段定点修改（只改你指定的段，其它段冻结）→ ④ 最终封装：按 YAML 规范输出纯 YAML 文档（不写面板、不预设对user态度，武器/装备/道具/技能只写 名称/品质/叙述）。<br>⚠ 本页是给角色<b>写设定</b>：技能品质受“学习/领悟所得≤自身层级”限制（第四层级＝史诗档）。要给已有角色单独补一件技能、或要更高的档位，请去 <b>⑧ 造物工坊</b> 选类型「技能」单独造——那里不受本页层级限制，但会核对品质／消耗／威力是否同档。</div><textarea id=\"opf-char-demand\" class=\"opf-char-input\" placeholder=\"写谁？给出大致设定与需求（例：一位出身瓦伦蒂亚贫民区、靠街头格斗活下来的少女，性格倔强护短……）\"></textarea><textarea id=\"opf-char-ref\" class=\"opf-char-input\" placeholder=\"（可选）参考文本：已有设定/原型描述/世界书片段，将作为参考注入\"></textarea><div class=\"opf-char-tools\"><button type=\"button\" class=\"opf-btn primary\" id=\"opf-char-run\">▶ 分段初稿</button><button type=\"button\" class=\"opf-btn ghost\" id=\"opf-char-link\">⚔ 交火梳理</button><button type=\"button\" class=\"opf-btn ghost\" id=\"opf-char-final\">🎁 最终封装</button><button type=\"button\" class=\"opf-btn ghost\" id=\"opf-char-new\">🗑 新角色</button></div><div id=\"opf-char-steps\"></div><div class=\"opf-sec\"><div class=\"opf-sec-label\">交火梳理报告</div><pre id=\"opf-char-report\" class=\"opf-box opf-char-report\">尚未梳理</pre></div><div class=\"opf-out\"><div class=\"opf-sec-label\">最终稿件（YAML 规范输出，可直接粘进世界书 DLC 条目）</div><div class=\"opf-dim\" id=\"opf-char-outnote\"></div><pre id=\"opf-char-out\" class=\"opf-box\">尚未封装</pre><div class=\"opf-char-copyrow\"><button type=\"button\" class=\"opf-btn ghost\" id=\"opf-char-copy\">⧉ 复制最终稿件</button></div></div></div>";

function charInit(){ ST.char = ST.char || { demand: "", ref: "", segs: {}, status: {}, report: "", out: "", outNote: [], name: "", _inited: false }; ST.char.outNote = ST.char.outNote || []; ST.charEls = ST.charEls || {}; }
function bindCharPage(){
  charInit();
  var run = getEl("opf-char-run"); if (!run || run._b) return; run._b = true;
  run.addEventListener("click", function(){ if (ST.running) { ST.stopReq = true; toast("正在停止…"); return; } runCharDraft(); });
  getEl("opf-char-link").addEventListener("click", function(){ runCharLinkage(); });
  getEl("opf-char-final").addEventListener("click", function(){ finalizeChar(); });
  getEl("opf-char-new").addEventListener("click", function(){ clearChar(); });
  getEl("opf-char-copy").addEventListener("click", function(){ copyCharOut(); });
  getEl("opf-char-demand").addEventListener("input", function(){ ST.char.demand = this.value; charDraftCacheSave(); });
  getEl("opf-char-ref").addEventListener("input", function(){ ST.char.ref = this.value; charDraftCacheSave(); });
  renderCharSteps();
  renderCharPage();
}
function charSystemContent(){
  var lines = [];
  lines.push('[角色] ' + macroFill(CHAR_VOICE));
  lines.push('[任务] 你正在为{{user}}的二创角色进行分段创作（最终输出为世界书 DLC 角色条目的 YAML 文档）。各分段保持一致与呼应，不重复、不推翻已定内容；本任务与开局预设没有任何关系。');
  lines.push(CHAR_RULES);
  lines.push(CHAR_STYLE_RULES);
  if (ST.worldInfo) lines.push('[世界书参考（世界书页勾选的条目）]\n' + ST.worldInfo);
  return macroFill(lines.join('\n\n'));
}
function charUser0(){
  var lines = [];
  lines.push('[本次二创需求] ' + (ST.char.demand || ""));
  if (ST.char.ref) lines.push('[参考文本]\n' + ST.char.ref);
  lines.push('[工作方式] 我将分 ' + CHAR_SEGS.length + ' 个分段依次生成：定位与基础→性格与动机→外貌与衣着→战斗配置→背景与经历→演绎与语料。每段只完成该段内容；已生成段落为既有设定，必须一致；禁止预写后面段落。');
  return lines.join('\n\n');
}
function charSetSeg(pid, st){ ST.char.status[pid] = st; charSetSegUi(pid, st); }
function charSetSegUi(pid, st){
  var row = getEl("opf-cph-" + pid); if (!row) return;
  row.setAttribute("data-st", st);
  var dot = row.querySelector(".opf-dot");
  if (dot) dot.textContent = st === "run" ? "◌" : (st === "ok" ? "✓" : (st === "err" ? "✕" : "·"));
  var has = !!ST.char.segs[pid];
  var inp = row.querySelector(".opf-ref-input"); var b1 = row.querySelector(".opf-ref-do"); var b2 = row.querySelector(".opf-ref-sug");
  if (inp) inp.disabled = !has || !!ST.running;
  if (b1) b1.disabled = !has || !!ST.running;
  if (b2) b2.disabled = !has || !!ST.running;
  var tag = row.querySelector(".opf-ref-tag");
  if (tag) tag.textContent = has ? "可定点修改（其它分段冻结）" : "先跑出本段后可精修";
}
function renderCharSegOut(pid){ var pre = ST.charEls && ST.charEls[pid]; if (pre) pre.textContent = ST.char.segs[pid] || "（本段内容显示在这里，点击标题展开/收起）"; }
function renderCharSteps(){
  var box = getEl("opf-char-steps"); if (!box) return;
  box.textContent = "";
  CHAR_SEGS.forEach(function (s, i) {
    var row = document.createElement("div"); row.className = "opf-step"; row.setAttribute("data-st", ST.char.status[s.id] || "wait"); row.id = "opf-cph-" + s.id;
    var head = document.createElement("div"); head.className = "opf-step-head";
    var idx = document.createElement("span"); idx.className = "opf-idx"; idx.textContent = String(i + 1);
    var dot = document.createElement("span"); dot.className = "opf-dot"; dot.textContent = "·";
    var ttl = document.createElement("span"); ttl.className = "opf-step-title"; ttl.textContent = s.title;
    var sub = document.createElement("span"); sub.className = "opf-step-sub"; sub.textContent = s.short;
    var btn = document.createElement("button"); btn.className = "opf-step-act"; btn.type = "button"; btn.textContent = "重跑本段及后续"; btn.title = "从本段重新生成到结尾（覆盖本段及后续内容）";
    btn.addEventListener("click", function (ev) { ev.stopPropagation(); runCharFrom(s.id); });
    head.appendChild(idx); head.appendChild(dot); head.appendChild(ttl); head.appendChild(sub); head.appendChild(btn);
    head.addEventListener("click", function () { row.classList.toggle("open"); });
    row.appendChild(head);
    var body = document.createElement("div"); body.className = "opf-step-body";
    var pre = document.createElement("pre"); pre.textContent = "（本段内容显示在这里，点击标题展开/收起）";
    body.appendChild(pre);
    ST.charEls[s.id] = pre;
    row.appendChild(body);
    var ref = document.createElement("div"); ref.className = "opf-step-ref";
    var tag = document.createElement("span"); tag.className = "opf-ref-tag"; tag.id = "opf-ref-tag-c" + s.id; tag.textContent = "先跑出本段后可精修";
    var chips = document.createElement("div"); chips.id = "opf-ref-chips-c" + s.id;
    var r1 = document.createElement("div"); r1.className = "opf-step-ref-row";
    var inp = document.createElement("input"); inp.type = "text"; inp.className = "opf-ref-input"; inp.placeholder = "定点修改指令（只改这一段）…"; inp.disabled = true;
    var doB = document.createElement("button"); doB.type = "button"; doB.className = "opf-step-act opf-ref-do"; doB.textContent = "定点修改本段"; doB.disabled = true;
    var sug = document.createElement("button"); sug.type = "button"; sug.className = "opf-step-act opf-ref-sug"; sug.textContent = "该段建议"; sug.disabled = true;
    doB.addEventListener("click", function (ev) { ev.stopPropagation(); refineCharSeg(s.id, inp.value); });
    sug.addEventListener("click", function (ev) { ev.stopPropagation(); suggestCharDir(s.id); });
    r1.appendChild(inp); r1.appendChild(doB); r1.appendChild(sug);
    ref.appendChild(tag); ref.appendChild(chips); ref.appendChild(r1);
    row.appendChild(ref);
    box.appendChild(row);
    if (ST.char.segs[s.id]) { renderCharSegOut(s.id); charSetSegUi(s.id, ST.char.status[s.id] || "ok"); }
  });
}
function renderCharPage(){
  charInit();
  if (!getEl("opf-char-wrap")) return;
  if (!ST.char._inited) {
    ST.char._inited = true;
    var d = getEl("opf-char-demand"); if (d && !d.value) d.value = ST.char.demand || "";
    var r = getEl("opf-char-ref"); if (r && !r.value) r.value = ST.char.ref || "";
  }
  var out = getEl("opf-char-out"); if (out && out.textContent === "封装中…") return; if (out) out.textContent = ST.char.out || "尚未封装";
  var note = getEl("opf-char-outnote");
  if (note && out && out.textContent !== "尚未封装") note.textContent = (ST.char.outNote && ST.char.outNote.length) ? "⚠ " + ST.char.outNote.join("；") : "✓ 已按 YAML 规范输出";
  var rep = getEl("opf-char-report"); if (rep && rep.textContent !== "交火梳理中…") rep.textContent = ST.char.report || "尚未梳理";
  CHAR_SEGS.forEach(function (s) { renderCharSegOut(s.id); charSetSegUi(s.id, ST.char.status[s.id] || "wait"); });
}
async function runCharDraft(){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var d = getEl("opf-char-demand"); var r = getEl("opf-char-ref");
  ST.char.demand = (d && d.value || "").trim();
  ST.char.ref = (r && r.value || "").trim();
  if (!ST.char.demand) { toast("请先填写角色需求", "warning"); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: charUser0() }];
  try {
    for (var i = 0; i < CHAR_SEGS.length; i++) {
      if (isStop()) break;
      await runCharSeg(CHAR_SEGS[i], msgs, i);
      await waitTick();
    }
    if (isStop()) toast("已停止");
    else toast("分段初稿完成：可继续「⚔ 交火梳理」", "success");
  } catch (e) { toast("分段生成出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
async function runCharSeg(seg, msgs, idx){
  charSetSeg(seg.id, "run");
  var prev = "";
  for (var k = 0; k < idx; k++) { var ps = CHAR_SEGS[k]; if (ST.char.segs[ps.id]) prev += "\n\n【" + ps.title + "】\n" + ST.char.segs[ps.id]; }
  var userMsg = { role: "user", content: "【分段" + (idx + 1) + "/" + CHAR_SEGS.length + "：" + seg.title + "】\n" + macroFill(CHAR_SEG_PROMPTS[seg.id] || "") + (prev ? "\n\n[此前已定分段（既有设定，必须一致，禁止改动）]\n" + prev : "") };
  msgs.push(userMsg);
  try {
    var resp = await callModel(msgs);
    ST.char.segs[seg.id] = resp;
    msgs.push({ role: "assistant", content: resp });
    while (msgs.length > 3 && !systemCtxBudgetOk(msgs)) { if (msgs[2] && msgs[2].role === "assistant") msgs.splice(2, 2); else break; }
    charSetSeg(seg.id, "ok");
    renderCharSegOut(seg.id);
  } catch (e) { charSetSeg(seg.id, "err"); throw e; }
}
async function runCharFrom(pid){
  if (ST.running) return;
  var start = -1;
  CHAR_SEGS.forEach(function (s, i) { if (s.id === pid) start = i; });
  if (start < 0) return;
  var d = getEl("opf-char-demand"); var r = getEl("opf-char-ref");
  ST.char.demand = (d && d.value || "").trim(); ST.char.ref = (r && r.value || "").trim();
  if (!ST.char.demand) { toast("请先填写角色需求", "warning"); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: charUser0() }];
  try {
    for (var k = 0; k < start; k++) {
      var ph = CHAR_SEGS[k];
      if (!ST.char.segs[ph.id]) { toast("前面分段尚未完成，请先「分段初稿」", "warning"); ST.running = false; renderRunButtons(); return; }
      msgs.push({ role: "user", content: "【分段" + (k + 1) + "/" + CHAR_SEGS.length + "：" + ph.title + "】\n" + macroFill(CHAR_SEG_PROMPTS[ph.id] || "") });
      msgs.push({ role: "assistant", content: ST.char.segs[ph.id] });
    }
    for (var j = start; j < CHAR_SEGS.length; j++) {
      if (isStop()) break;
      await runCharSeg(CHAR_SEGS[j], msgs, j);
      await waitTick();
    }
    if (isStop()) toast("已停止");
  } catch (e) { toast("生成出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
async function refineCharSeg(pid, dir){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var seg = null;
  CHAR_SEGS.forEach(function (s) { if (s.id === pid) seg = s; });
  if (!seg || !ST.char.segs[pid]) { toast("该段还没有内容，请先生成", "warning"); return; }
  var dirT = (dir || "").trim();
  if (!dirT) dirT = "修正本段内部矛盾与格式问题，使其与其它段落一致；不新增设定。";
  var frozen = "";
  CHAR_SEGS.forEach(function (s2) { if (s2.id !== pid && ST.char.segs[s2.id]) frozen += "\n\n【" + s2.title + "】\n" + ST.char.segs[s2.id]; });
  ST.running = true; renderRunButtons(); charSetSeg(pid, "run");
  try {
    var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: charUser0() }];
    var msg = "【定点修改：只改「" + seg.title + "」这一段】\n\n[用户指令]\n" + dirT + "\n\n[本段现行内容]\n" + ST.char.segs[pid] + "\n\n[冻结区块（其它分段原样保留，一个字都不许改；若发现其它段有问题，最多在结尾另起一行写“备注：建议检查XX段…”提示，不得代改）]\n" + frozen + "\n\n[二创角色·规则约束]\n" + CHAR_RULES + "\n\n要求：只输出修改后的【" + seg.title + "】内容；修改严格限定在用户指令范围内，未要求的地方保持原样，不要顺手润色、扩写或重排。";
    msgs.push({ role: "user", content: msg });
    var resp = await callModel(msgs);
    ST.char.segs[pid] = resp;
    charSetSeg(pid, "ok"); renderCharSegOut(pid);
    toast("已修改【" + seg.title + "】（其余分段未动）");
  } catch (e) { charSetSeg(pid, "err"); toast("定点修改出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
async function suggestCharDir(pid){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var seg = null;
  CHAR_SEGS.forEach(function (s) { if (s.id === pid) seg = s; });
  if (!seg || !ST.char.segs[pid]) { toast("该段还没有内容", "warning"); return; }
  var chipBox = getEl("opf-ref-chips-c" + pid); if (!chipBox) return;
  var cur = String(ST.char.segs[pid]).slice(0, 2500);
  var demand = ST.char.demand || "(未填写)";
  var ask = "请针对二创角色的【" + seg.title + "】这一段现有内容，给出 2-3 条只针对本段的修改方向。每条一行、≤50字、去掉编号外多余的话、直接可点；必须符合角色规则与联动一致性。\n[角色需求]\n" + demand + "\n[二创角色·规则约束]\n" + CHAR_RULES + "\n[本段现有内容]\n" + cur;
  var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: ask }];
  ST.running = true; renderRunButtons();
  try {
    var resp = await callModel(msgs);
    var list = [];
    String(resp).split(/\r?\n/).forEach(function (ln) {
      var t = String(ln).replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, "").trim();
      if (t && t.length >= 4 && t.length <= 70 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) list = ["让本段与其它段落更咬合", "补充细节/删除冗余", "让数值与格式更合规"];
    renderCharChips(pid, list.slice(0, 3));
  } catch (e) { toast("该段建议生成失败：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); }
}
function renderCharChips(pid, list){
  var box = getEl("opf-ref-chips-c" + pid); if (!box) return;
  box.textContent = "";
  list.forEach(function (t) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "opf-dir-chip";
    b.textContent = "▶ " + t;
    b.addEventListener("click", function () { refineCharSeg(pid, t); });
    box.appendChild(b);
  });
}
async function runCharLinkage(){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var done = CHAR_SEGS.filter(function (s) { return ST.char.segs[s.id]; });
  if (done.length < CHAR_SEGS.length) { toast("请先完成全部分段初稿（" + CHAR_SEGS.length + "/" + CHAR_SEGS.length + "）", "warning"); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var report = getEl("opf-char-report"); if (report) report.textContent = "交火梳理中…（第一步：整体审查）";
  try {
    // ---- 第一步：只出报告，不重写段落（输出小，避免一次生成全部段落被截断）----
    var all = CHAR_SEGS.map(function (s) { return "<<<SEG:" + s.id + ">>>\n" + String(ST.char.segs[s.id] || "").slice(0, 1800); }).join("\n\n");
    var reportMsg = "【交火梳理·第一步：整体审查】\n下面是各分段的审阅稿（每段截取前1800字，供查矛盾用）。请按下面的联动链条逐链检查，找出互相矛盾、脱节、数值/品质/命名不合规之处。\n\n[联动链条]\n" + CHAR_LINK_CHAIN + "\n\n[分段审阅稿]\n" + all + "\n\n[二创角色·规则约束]\n" + CHAR_RULES + "\n\n输出要求（只输出报告，禁止输出任何段落正文，禁止使用<<<SEG:标记）：\n1. 逐条链给一句结论（✓一致 / ⚠问题+理由）。\n2. 最后列“改动清单”：每段一条，写清改哪段、为什么；没有问题的段写“无”。\n3. 改动清单不得要求恢复或新增 类型/消耗/标签 字段（武器/装备/道具/技能规范为 名称/品质/叙述 三段式）。\n4. 报告里不要重写设定内容，只说问题与改法。";
    var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: charUser0() }, { role: "user", content: reportMsg }];
    var resp = await callModel(msgs);
    ST.char.report = String(resp || "").trim() || "（报告为空）";
    if (report) report.textContent = ST.char.report;
    toast("审查报告完成，开始逐段应用联动修订…");
    // ---- 第二步：逐段应用修订（每段单独一次调用，输出只有一段，杜绝截断）----
    var changed = 0;
    for (var i = 0; i < CHAR_SEGS.length; i++) {
      if (isStop()) break;
      var seg = CHAR_SEGS[i];
      if (report) report.textContent = ST.char.report + "\n\n—— 正在逐段应用修订（" + (i + 1) + "/" + CHAR_SEGS.length + "：" + seg.title + "）——";
      charSetSeg(seg.id, "run");
      var frozen = "";
      CHAR_SEGS.forEach(function (s2) { if (s2.id !== seg.id && ST.char.segs[s2.id]) frozen += "\n\n【" + s2.title + "】\n" + String(ST.char.segs[s2.id]).slice(0, 1200); });
      var applyMsg = "【交火梳理·第二步：逐段应用修订——只改「" + seg.title + "」这一段】\n\n[梳理报告与改动清单]\n" + ST.char.report + "\n\n[本段现行内容]\n" + ST.char.segs[seg.id] + "\n\n[冻结区块（其它分段，原样保留，一个字都不许改）]\n" + frozen + "\n\n[修订规则]\n" + CHAR_RULES + "\n1. 只输出【" + seg.title + "】的修订后全文；若按报告本段无需改动，只回复“无改动”。\n2. 只做报告指出的联动性修改；不得推翻设定。报告“改动清单”里点名的矛盾/重复/写错的内容，**必须真的删掉或改掉**——旧内容不许留在原地与新内容并排（叠加＝没改）。\n3. 报告点名要删的就删，删完比原来短是正常的；除报告点名的部分外，不许删别的内容，也不许扩写新增。\n4. 武器/装备/道具/技能保持 名称/品质(中文)/叙述 三段式：禁止补回或新增 类型/消耗/标签 字段。\n5. 不生成任何开局预设内容（开局剧情/面板/伙伴/资产等）。";
      var m2 = [{ role: "system", content: charSystemContent() }, { role: "user", content: applyMsg }];
      var resp2 = await callModel(m2);
      var txt = String(resp2 || "").trim();
      if (txt && !/^无改动[。．.]*$/.test(txt)) { ST.char.segs[seg.id] = txt; changed++; renderCharSegOut(seg.id); }
      charSetSeg(seg.id, "ok");
      await waitTick();
    }
    if (report) report.textContent = ST.char.report + (isStop() ? "\n\n（已停止：修订应用中断）" : "\n\n（修订应用完成，改动 " + changed + " 段）");
    if (isStop()) toast("已停止");
    else toast("交火梳理完成：报告已生成，联动修订应用到 " + changed + " 段", "success");
  } catch (e) { toast("交火梳理出错：" + (e && e.message ? e.message : e), "error"); if (report) report.textContent = "梳理失败：" + (e && e.message ? e.message : e); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
function charNameGuess(){
  var base = ST.char.segs.base || "";
  var m = base.match(/名称[:：]\s*(.+)/) || base.match(/姓名[:：]\s*(.+)/);
  if (m) return String(m[1]).trim().split(/[，,。\s·]/)[0].slice(0, 20);
  return "未命名角色";
}
async function finalizeChar(){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var done = CHAR_SEGS.filter(function (s) { return ST.char.segs[s.id]; });
  if (!done.length) { toast("还没有角色稿件，请先「分段初稿」", "warning"); return; }
  ST.running = true; renderRunButtons();
  var outEl = getEl("opf-char-out"); if (outEl) outEl.textContent = "封装中…";
  var noteEl = getEl("opf-char-outnote"); if (noteEl) noteEl.textContent = "";
  try {
    var all = CHAR_SEGS.map(function (s) { return "【" + s.title + "】\n" + (ST.char.segs[s.id] || "（无）"); }).join("\n\n");
    var name = charNameGuess();
    var msg = "【最终封装（YAML）】\n请以“始弦的魔法大典”的身份，把下面的分段内容整理为一份可直接用作世界书 DLC 角色条目的 YAML 文档。\n\n[全部段落]\n" + all + "\n\n" + CHAR_YAML_SPEC + "\n\n角色名以「定位与基础」段为准；没有名字则「名称」写“未命名角色”。";
    var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: msg }];
    var resp = await callModel(msgs);
    var y = extractYamlChar(resp);
    if (!y.ok) { toast("未能从回复中提取 YAML 代码块（已用原文兜底，可重试一次）", "warning"); }
    var warns = yamlLintChar(y.text);
    ST.char.out = y.text;
    ST.char.outNote = warns;
    if (outEl) outEl.textContent = y.text;
    if (noteEl) noteEl.textContent = warns.length ? "⚠ " + warns.join("；") : "✓ 已按 YAML 规范输出";
    if (y.ok && !warns.length) toast("已按 YAML 规范封装完成（可复制，粘进世界书 DLC 条目）", "success");
    else toast("已封装" + (warns.length ? "（" + warns.length + " 条 YAML 提示，见输出区上方）" : ""), "warning");
  } catch (e) { toast("最终封装出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
// 从回复中提取 ```yaml 代码块（找不到围栏则原文兜底）
function extractYamlChar(text){
  var F = fence();
  var t = String(text || "");
  var idx = t.indexOf(F + "yaml");
  if (idx < 0) idx = t.indexOf(F);
  if (idx < 0) return { ok: false, text: t.trim() };
  var start = t.indexOf("\n", idx);
  if (start < 0) return { ok: false, text: t.trim() };
  var end = t.indexOf(F, start + 1);
  var body = end > start ? t.slice(start + 1, end) : t.slice(start + 1);
  body = body.replace(/^\n+/, "").replace(/\s+$/, "");
  return { ok: !!body, text: body };
}
// 轻量 YAML 规范自检（仅提示，不拦截）
function yamlLintChar(text){
  var warns = [];
  var t = String(text || "");
  function countCh(s, ch){ var n = 0; for (var i = 0; i < s.length; i++) if (s[i] === ch) n++; return n; }
  if (t.indexOf("\t") >= 0) warns.push("含制表符(Tab)，YAML 缩进应使用空格");
  if (!/^角色卡\s*:/m.test(t)) warns.push("缺少顶层「角色卡:」键");
  if (/^\s*(类型|消耗|标签)\s*:/m.test(t)) warns.push("条目中出现 类型/消耗/标签 字段（规范只保留 名称/品质/叙述 三段式）");
  if (countCh(t, "[") !== countCh(t, "]")) warns.push("方括号[ ]数量不配对");
  if (countCh(t, "{") !== countCh(t, "}")) warns.push("花括号{ }数量不配对");
  return warns;
}
function clearChar(){
  if (!window.confirm("清空当前二创角色（分段/报告/最终稿件）？此操作不可撤销。")) return;
  ST.char = { demand: "", ref: "", segs: {}, status: {}, report: "", out: "", outNote: [], name: "", _inited: false };
  var d = getEl("opf-char-demand"); if (d) d.value = "";
  var r = getEl("opf-char-ref"); if (r) r.value = "";
  charDraftCacheSave();
  renderCharSteps(); renderCharPage();
  toast("已清空，可以开始新角色");
}
function copyCharOut(){
  var txt = ST.char.out || "";
  if (!txt) { toast("还没有最终稿件，请先「最终封装」", "warning"); return; }
  function fallback(){ var ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("已复制到剪贴板"); } catch (e) { toast("复制失败，请手动复制"); } ta.remove(); }
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { toast("已复制到剪贴板"); }, fallback); } else fallback();
}
function charDraftCacheSave(){
  if (charDraftCacheSave._t) clearTimeout(charDraftCacheSave._t);
  charDraftCacheSave._t = setTimeout(function () {
    lsSet(LS_CHAR_KEY, { demand: ST.char.demand, ref: ST.char.ref, segs: ST.char.segs, status: ST.char.status, report: ST.char.report, out: ST.char.out, outNote: ST.char.outNote });
  }, 500);
}
function charDraftRestore(){
  charInit();
  var c = lsGet(LS_CHAR_KEY); if (!c || typeof c !== "object") return;
  ST.char.demand = c.demand || ""; ST.char.ref = c.ref || "";
  ST.char.segs = c.segs || {}; ST.char.status = c.status || {};
  ST.char.report = c.report || ""; ST.char.out = c.out || ""; ST.char.outNote = c.outNote || [];
  try { renderCharSteps(); renderCharPage(); } catch (e) { opfErr("charDraftRestore render", e); }
}
