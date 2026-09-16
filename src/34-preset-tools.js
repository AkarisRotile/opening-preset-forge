//@module 34-preset-tools — ① 开局预设：合规自检修复 + 备忘录 + 品质规范化
function rarityCanon(v){
  var k = String(v == null ? "" : v).trim().toLowerCase();
  var m = { "common":"common", "普通":"common", "uncommon":"uncommon", "优良":"uncommon", "优秀":"uncommon", "rare":"rare", "稀有":"rare", "epic":"epic", "史诗":"epic", "legendary":"legendary", "传说":"legendary", "mythic":"mythic", "神话":"mythic", "only":"only", "唯一":"only" };
  return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null;
}
function normalizeRarityTree(node, issues){
  if (Array.isArray(node)) { for (var ai = 0; ai < node.length; ai++) normalizeRarityTree(node[ai], issues); return node; }
  if (!node || typeof node !== "object") return node;
  for (var key in node) {
    if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
    var val = node[key];
    if ((key === "rarity" || key === "品质") && typeof val === "string") {
      var can = rarityCanon(val);
      if (can) { node[key] = can; } else if (String(val).trim()) { issues.push(String(val).trim()); }
    } else if (val && typeof val === "object") { normalizeRarityTree(val, issues); }
  }
  return node;
}

// ============ 生成规范与合规自检（《技能装备道具生成规则》提取） ============
var SPEC_PROMPT = {
  skill: "技能格式：名称 / 品质(唯一|普通|优良|稀有|史诗|传说|神话) / 类型(主动|被动) / 消耗(主动技必填：[攻击或动作: XXX MP/SP/MP与SP]) / 标签 / 效果 / 描述。\n主动技能分类：攻击技=消耗[攻击]、造成即时伤害、可附带其它效果；动作技=消耗[动作]、禁止即时伤害与威力，用于治疗/控制/增益/减益/功能等，可含DoT。\n标签规范：关联属性(必选其一：力量/敏捷/体质/智力/精神)；目标类型(必选：单体|范围:X|自身|环境，X为个数)；核心功能(必选：伤害(仅攻击技)|治疗|控制|增益|减益|功能)；威力(攻击技必填、动作技禁用，数值参照核心数值总表)；特性(可选：陷阱/防护/符文/家族/种族/职业/血脉/教会等)；可选机制(连击/多段(仅攻击技)/持续/召唤…或锻造/炼金/烹饪/裁缝等辅助)。\n效果：每行一条“效果名: 效果”；词条上限按品质(普通1/优良2/稀有2/史诗3/传说3/神话3，唯一依专规)；伤害必须标明类型；混合伤害标明占比；召唤写明具体等级或“与召唤者同级”。\n通用伤害类型：物理(动能/冲击/穿刺/挥砍等)、能量(元素/奥术/生命力等)、精神(心智/灵魂/意志)、真实(绕过常规防御，如炼金炸弹/强酸/法则侵蚀)。\n获取与品质限制：学习(书本/传授)/领悟(重大事件后)所得技能品质不高于角色自身生命层级；血脉觉醒/种族转换可一次性获得多个专属技能。\n登神提醒：要素/权能/法则/神位/神国不用技能格式、无品质/类型/标签字段；词条中“微弱 要素/权能/法则”仅指弱化映射，不得等同完整登神能力。",
  equip: "装备格式：名称 / 品质(唯一|普通|优良|稀有|史诗|传说|神话) / 类型(如 单手剑/巨斧/重甲/戒指…) / 标签 / 效果 / 描述。\n标签规范：攻防数值用[攻击: XXX]或[防御: XXX]；徽记用[徽记: XXX公会/商会/家族/皇室等]；必要时其它标签。\n徽记规则：有徽记=认证物品，可在正规市场流通；无徽记=无认证物品、灰色流通、可能被查扣；许可来源为公会/商会/家族身份或购买凭证/登记许可。\n效果：每行一条“效果名: 效果”；词条上限按品质(普通1/优良2/稀有2/史诗3/传说3/神话3，唯一依专规)；史诗品质三词条其一须为“微弱要素”效果、传说为“微弱权能”、神话为“微弱法则”（格式：微弱要素[名称]: 效果）。\n描述：叙事性描述。\n装备不增减持有者属性（世界规则）；品质七等与“唯一”品级用法同通用品级。\n登神提醒：词条若用“微弱 要素/权能/法则”仅指弱化映射，不得等同完整登神能力。",
  item: "道具格式：名称 / 品质(唯一|普通|优良|稀有|史诗|传说|神话) / 类型(消耗品|材料|…) / 标签 / 效果 / 描述。\n标签可用[徽记: XXX公会/商会/家族/皇室等]，徽记规则同装备（有徽记可正规流通，无徽记灰色流通）。\n效果：每行一条“效果名: 效果”；词条上限按品质(普通1/优良2/稀有2/史诗3/传说3/神话3)；描述：叙事性描述。",
  asset: "资产格式：名称 / 品质(唯一|普通|优良|稀有|史诗|传说|神话) / 类型(住宅|店铺|载具|工坊|城区|领地|产业组合|部队|权益…) / 标签 / 总空间 / 结算 / 位置 / 描述 / 内部资产。\n标签含义：拥有者(归属者)；上级资产(仅当同时拥有且为包含/管理/编制关系)；租用/使用者(自住可省)；用途(生产/仓储/经营…，自住可省)；状态(未启动/建设中/运营中/租赁中/自住/寄宿…)；模式(稳定/波动/停滞，经营类)；甲方/乙方/担保/协议类型(协议/商铺类)。\n总空间：具体建筑→“层/分区: 房间列表;面积:XXm²”用|分隔，卧室标注居住者、同类数量≥2用×数量；城区/领地→“地名+领地名: 建筑类型×数量: m²|空闲面积: m²”；载具/部队/权益→记录尺寸/容量/编制/覆盖范围，无空间概念填“不适用”。\n结算：货币统一用 Z（如“资产估价: X Z 当地货币名”）；动态结算按类型填——运营中“资产估价: X Z;预计[周期]收益: Y Z”或产物×数量；租赁中固定周期租金；未启动/建设中“当前无收益或支出”；无固定收支“无固定收支/不适用”；周期结算须有“上次结算日: YYYY-MM-DD 或 尚未结算”；金额估值收益率参考《经济价格指南》资产结算基准。\n位置：实际所在地点；无实体位置填管理方/登记地/适用范围/不适用。\n描述：环境/区域/外观/用途与现状等叙事性描述；涉及协议时记录协议内容。\n内部资产：可独立计数/使用/产生作用的组成部分才记录，无需追踪填{}；每项含 品质(七等) / 标签([类型:][位置:X层/房间/分区][状态:]…) / 数量(正整数) / 效果(每行一条“效果名: 效果”，按类型写产出/生产加成/功能效果/基础属性，无实际效果填{}) / 描述 / 总占用空间(自身布局与全部数量占用合计，标明单位)。\n归属与结算：并入上级资产的内部资产采用移动非复制、同类合并数量相加；需独立结算/转让/管理的资产保留为独立资产并填[上级资产:…]，其结算填“并入[上级资产名]统一结算”或自行结算。"
};
var COMPLIANCE_SPEC = "—— 以下为 技能/装备/道具/资产 生成规范 ——\n[技能规范]\n" + SPEC_PROMPT.skill + "\n[装备规范]\n" + SPEC_PROMPT.equip + "\n[道具规范]\n" + SPEC_PROMPT.item + "\n[资产规范]\n" + SPEC_PROMPT.asset;

function addComplianceToggle(root){
  if (!root || getEl("opf-ck-ac")) return;
  var lab = document.createElement("label"); lab.className = "opf-opt"; lab.title = "生成初稿/重新汇总后，自动按《技能装备道具生成规则》对技能/装备/道具/资产做一次自检修复";
  var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "opf-ck-ac";
  cb.checked = !!getSettings().autoCompliance;
  cb.addEventListener("change", function(){ getSettings().autoCompliance = !!cb.checked; saveSettings(); });
  lab.appendChild(cb); lab.appendChild(document.createTextNode("生成后自检修复"));
  var opts = root.querySelectorAll(".opf-opts");
  if (opts && opts.length) { opts[opts.length - 1].appendChild(lab); } else { root.appendChild(lab); }
}
function maybeAutoCompliance(){
  try { if (!getSettings().autoCompliance) return; } catch (e) { return; }
  if (ST._complyBusy || ST._complyRun || ST._complyScheduled) return;
  ST._complyScheduled = true;
  setTimeout(function(){ ST._complyScheduled = false; runCompliance(); }, 350);
}
async function runCompliance(){
  if (ST._complyBusy || ST._complyRun) return;
  if (!ST.finalJson) return;
  ST._complyBusy = true;
  renderRunButtons();
  renderDirsStatus("🔍 正在按《技能装备道具生成规则》自检修复…");
  try {
    var prev = JSON.stringify(ST.finalJson);
    var cur = prev.length > 12000 ? prev.slice(0, 12000) + "……(截断)" : prev;
    var msg = "【合规自检与修复】请用下面“技能/装备/道具/资产生成规范”逐类检查开局预设 JSON：字段是否齐全、品质是否为七等、标签/消耗/效果/结算/总空间/内部资产等是否符合规范；只修正不合规处，其余内容保持原样，最后完整输出修订后的开局预设 JSON，放在 " + fence() + "text 代码块中。\n\n[生成规范]\n" + COMPLIANCE_SPEC + "\n\n[当前开局预设 JSON]\n" + cur;
    var msgs = [{ role: "system", content: buildSystemContent() }, { role: "user", content: msg }];
    ST._complyRun = true;
    try {
      var resp = await callModel(msgs);
      var ex = extractJson(resp);
      if (ex.ok && ex.obj) {
        var changed = JSON.stringify(ex.obj) !== prev;
        ST.finalJson = ex.obj;
        var warns = validatePreset(ex.obj);
        renderJsonOut(ex.obj, warns);
        if (ST.elPre && ST.elPre.final) ST.elPre.final.textContent = (resp || "").slice(0, 4000);
        setPhase("final", "ok");
        renderDirsStatus(changed ? "✓ 已按规范完成自检修复（可继续精修或导出）" : "✓ 自检通过，无需修改");
        toast(changed ? "自检并修复完成" : "自检通过，无需修改", changed ? "info" : "success");
      } else {
        renderDirsStatus("⚠ 自检结果无法解析成 JSON（已跳过修复），可重汇总后再试");
        toast("自检未通过解析，跳过", "warning");
      }
    } catch (e) {
      opfErr("compliance", e);
      renderDirsStatus("自检出错，可手动精修或重汇总");
    } finally { ST._complyRun = false; }
  } finally {
    ST._complyBusy = false;
    renderRunButtons();
  }
}

// ============================================================================
// 网游核心 · 文本总结（独立模块，与开局预设功能完全隔离）
// ----------------------------------------------------------------------------
// 功能：默认关闭。开启后，每次 AI 完成一条输出（MESSAGE_RECEIVED），就用当前
//       主 API 把「已有摘要 + 最新对话」压缩成一段极短的「状态摘要」；下一次
//       生成时通过 setExtensionPrompt 把摘要作为提示词一起发给 AI。
// 适配：专门针对「网游核心YAML版」这类 MMORPG 世界书——只记对后续推进有用的
//       状态/数值/目标/任务/物品/NPC 关系，不记文笔剧情，长度受控。
// 隔离：独立设置命名空间(settings.summary)、独立状态对象(MEMO)、独立事件监听、
//       独立注入 key、独立 UI 区块；不读写 ST.*、不碰 callModel / ST.msgs。
// ============================================================================
var MEMO_PROMPT_KEY = 'openingPresetForgeSummary';   // setExtensionPrompt 注入 key
var MEMO_META_KEY = 'openingPresetForgeMemo';        // 持久化到对话 metadata 的 key（按角色/对话单独保存）
var MEMO_DEFAULTS = {
  enabled: false,     // 默认关闭，用户手动开启才生效
  maxChars: 800,      // 摘要最大字数（注入内容不能太长）
  capFeed: 5000,      // 每次喂给总结的新内容最多字数
  viewMode: 'visual'  // 摘要展示：'visual' 可视化 / 'raw' YAML 原文
};
var MEMO = {
  summary: '',        // 当前累计摘要
  busy: false,        // 总结请求进行中（防并发）
  queued: false,      // 总结期间又有新消息，标记待补跑
  lastLen: -1,        // 已总结到的 chat 长度（-1 = 尚未总结）
  chatKey: '',        // 当前会话标识（切换时清空摘要）
  bound: false        // 事件是否已绑定
};

function getMemoSettings() {
  var s = getSettings(); // 复用同一份 extensionSettings[NS]，但只读写其中的 .summary 子对象
  if (!s || typeof s !== 'object') return Object.assign({}, MEMO_DEFAULTS);
  if (!s.summary || typeof s.summary !== 'object') s.summary = {};
  var m = s.summary;
  for (var k in MEMO_DEFAULTS) {
    if (!Object.prototype.hasOwnProperty.call(m, k)) m[k] = MEMO_DEFAULTS[k];
  }
  return m;
}
function saveMemoSettings() { saveSettings(); }

// 收集「自上次总结以来」的新内容（冷启动时取最近若干条），用于喂给总结
function memoTranscript() {
  var c = getCtx();
  var chat = (c && Array.isArray(c.chat)) ? c.chat : [];
  if (!chat.length) return '';
  var ms = getMemoSettings();
  var cap = Number(ms.capFeed) || 4000;
  var start = (MEMO.lastLen >= 0) ? MEMO.lastLen : Math.max(0, chat.length - 20);
  var parts = [];
  var used = 0;
  for (var i = Math.max(0, start); i < chat.length; i++) {
    var m = chat[i];
    if (!m || m.is_system) continue;
    var txt = String(m.mes || '').trim();
    if (!txt) continue;
    var who = m.is_user ? (m.name || '玩家') : (m.name || '角色');
    var line = who + '：' + txt;
    if (used + line.length > cap) break;
    parts.push(line);
    used += line.length;
  }
  return parts.join('\n');
}

// 专门适配「网游核心YAML版」的总结系统提示词（{{maxChars}} 在运行时替换）
// 站在攻略队伍视角维护记忆：同名副本跨挑战保持一致 + 高难开荒不剧透
function buildMemoSystem(maxChars) {
  var n = Number(maxChars) || 800;
  return '你是一个「网游核心YAML版」世界里的攻略记忆压缩器，站在攻略队伍的视角维护记忆。唯一任务：把对话中最新发生的事，压缩成一段极短的 YAML 记忆，供下一次生成时注入提示词。\n' +
    '记忆必须服务于两个目的：\n' +
    'A) 同名内容保持一致：同一个 任务/副本/高难本 反复出现时，按「名称」归并记忆；已记录过的 怪物分布/BOSS结构 不得被悄悄改写成另一套，只能在其基础上补充推进（同一副本多次挑战时前后要一致）。\n' +
    'B) 高难开荒不剧透：只记录队伍在战斗中实际看到并确认过的内容；队伍尚未打到的阶段/BOSS机制一律标「未见到/未知」或直接省略，严禁脑补编造后续阶段的机制。\n' +
    '只记录以下三类，其余（玩家属性/等级/职业/装备/物品/货币/剧情文笔）一律不记：\n' +
    '1) 进行中的任务/副本：名称 + 目标/下一步；副本另记 怪物分布 与已见到的首领阶段机制。\n' +
    '2) 已通关的任务/副本：名称 + 结果；副本作为“可复刷的固定蓝图”保留其 怪物分布 + 首领机制，同一本再进入时按此呈现一致内容。\n' +
    '3) 高难挑战（歼殛战 / 零式大型 / 绝境战）：开荒中的记 进度（当前打到哪一阶段/灭团几次）、已破解机制（只写队伍已确认掌握的，按阶段），未破解部分明确标「未知」不填内容；已通关的可当固定蓝图完整记录。\n' +
    '输出必须是一段严格 YAML，参考骨架如下（没有的内容就省略对应节点）：\n' +
    '进行中:\n' +
    '  任务:\n' +
    '    - 名称: ...\n' +
    '      目标: ...\n' +
    '  副本:\n' +
    '    - 名称: ...\n' +
    '      怪物分布: ...\n' +
    '      首领机制: ...\n' +
    '已通关:\n' +
    '  任务:\n' +
    '    - 名称: ...\n' +
    '  副本:\n' +
    '    - 名称: ...\n' +
    '      怪物分布: ...\n' +
    '      首领机制: ...\n' +
    '高难挑战:\n' +
    '  歼殛战:\n' +
    '    - 名称: ...\n' +
    '      进度: ...        # 例：初见 / 灭3次 / 已见阶段2\n' +
    '      已破解:\n' +
    '        阶段1: ...\n' +
    '      未破解: 阶段2之后未知\n' +
    '  零式大型:\n' +
    '    - 名称: ...\n' +
    '      进度: ...\n' +
    '      已破解:\n' +
    '        阶段1: ...\n' +
    '      未破解: ...\n' +
    '  绝境战:\n' +
    '    - 名称: ...\n' +
    '      进度: ...\n' +
    '      已破解:\n' +
    '        阶段1: ...\n' +
    '      未破解: ...\n' +
    '规则：\n' +
    '1) 若给了你「已有记忆」，必须合并更新：同一名称条目保留其既有记录，只补充/推进新信息，不得另起炉灶或改动其已记录的怪物分布/BOSS结构。\n' +
    '2) 机制只记关键词/要点（技能名/机制名/处理方式），越短越好，果断舍弃次要细节。\n' +
    '3) 总字数严格 ≤ ' + n + ' 字；优先保留：进行中进度、高难开荒进度、可复刷副本的蓝图。\n' +
    '4) 只输出 YAML 本身，不要任何解释、标题或代码块围栏。';
}

function buildMemoRequest() {
  var ms = getMemoSettings();
  var feed = memoTranscript();
  var user = '';
  if (MEMO.summary) user += '[已有摘要]\n' + MEMO.summary + '\n\n';
  user += '[本轮新内容]\n' + (feed || '（无新内容）');
  return { system: buildMemoSystem(ms.maxChars), user: user, feed: feed };
}

function cleanMemoText(t) {
  return String(t || '')
    .replace(/\`\`\`[a-z]*/gi, '')
    .replace(/^\s*(摘要|总结|状态摘要)[：:]\s*/i, '')
    .trim();
}
function clampMemoText(t, max) {
  var n = Number(max) || 500;
  return t.length > n ? t.slice(0, n) : t;
}

// 把当前摘要注入到下一次生成（或清空注入）
function applyMemoPrompt() {
  var c = getCtx();
  if (!c || typeof c.setExtensionPrompt !== 'function') return;
  try {
    if (getMemoSettings().enabled && MEMO.summary) {
      c.setExtensionPrompt(MEMO_PROMPT_KEY, '[网游核心·状态摘要]\n' + MEMO.summary, 0, 2, false, 0);
    } else {
      c.setExtensionPrompt(MEMO_PROMPT_KEY, '', -1, 2, false, 0);
    }
  } catch (e) { opfErr('applyMemoPrompt', e); }
}

async function runMemoSummarize() {
  var ms = getMemoSettings();
  if (!ms.enabled) return;
  if (MEMO.busy) { MEMO.queued = true; return; }
  var c = getCtx();
  if (!c || typeof c.generateRaw !== 'function') { renderMemoStatus('主 API 未就绪，无法总结'); return; }
  var req = buildMemoRequest();
  if (!req.feed) { renderMemoStatus(); return; } // 无新内容，跳过
  MEMO.busy = true;
  renderMemoStatus('⏳ 正在总结…');
  try {
    var resp = await c.generateRaw({
      prompt: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user }
      ]
    });
    var text = cleanMemoText(resp);
    if (text) {
      MEMO.summary = clampMemoText(text, ms.maxChars);
      applyMemoPrompt();
      renderMemoSummary();
      saveMemoToChat();
    }
    MEMO.lastLen = (c.chat && Array.isArray(c.chat)) ? c.chat.length : MEMO.lastLen;
    renderMemoStatus('✓ 已总结 · ' + (MEMO.summary ? MEMO.summary.length : 0) + ' 字');
  } catch (e) {
    opfErr('runMemoSummarize', e);
    renderMemoStatus('⚠ 总结失败：' + (e && e.message ? e.message : e));
  } finally {
    MEMO.busy = false;
    if (MEMO.queued) { MEMO.queued = false; setTimeout(runMemoSummarize, 0); }
  }
}

function clearMemo() {
  MEMO.summary = '';
  MEMO.lastLen = -1;
  MEMO.queued = false;
  applyMemoPrompt();
  renderMemoSummary();
  saveMemoToChat();
  renderMemoStatus('已清空总结');
  toast('已清空文本总结');
}

// ---- 摘要持久化：写入当前对话的 chat_metadata（随对话文件保存，按角色/对话单独存储）----
function saveMemoToChat() {
  var c = getCtx();
  if (!c || !c.chatMetadata) return;
  try {
    c.chatMetadata[MEMO_META_KEY] = MEMO.summary || '';
    if (typeof c.saveMetadataDebounced === 'function') c.saveMetadataDebounced();
    else if (typeof c.saveMetadata === 'function') c.saveMetadata();
  } catch (e) { opfErr('saveMemoToChat', e); }
}
function loadMemoFromChat() {
  var v = '';
  try {
    var c = getCtx();
    var cm = c && c.chatMetadata ? c.chatMetadata : null;
    if (cm && typeof cm[MEMO_META_KEY] === 'string') v = cm[MEMO_META_KEY];
  } catch (e) { v = ''; }
  MEMO.summary = v || '';
}

function memoChatKey() {
  var c = getCtx();
  try {
    if (c && c.chatId != null) return 'chat:' + c.chatId;
    if (c && c.characterId != null) return 'char:' + c.characterId;
  } catch (e) {}
  return '';
}

function onMemoMessageReceived() {
  var ms = getMemoSettings();
  if (!ms.enabled) return;
  if (MEMO.busy) { MEMO.queued = true; return; }
  setTimeout(function () {
    if (MEMO.busy) { MEMO.queued = true; return; }
    runMemoSummarize();
  }, 250);
}

function onMemoChatChanged() {
  var key = memoChatKey();
  if (key && key !== MEMO.chatKey) {
    MEMO.chatKey = key;
    MEMO.lastLen = -1;
    MEMO.queued = false;
    loadMemoFromChat();   // 切对话后，从该对话的 metadata 恢复它自己的摘要
    applyMemoPrompt();
    renderMemoSummary();
    renderMemoStatus();
  }
}

function renderMemoStatus(msg) {
  var el = getEl('opf-memo-status');
  if (!el) return;
  if (msg) { el.textContent = msg; return; }
  var ms = getMemoSettings();
  if (!ms.enabled) { el.textContent = '未启用（勾选后每次 AI 输出自动总结）'; }
  else if (MEMO.busy) { el.textContent = '⏳ 正在总结…'; }
  else if (MEMO.summary) { el.textContent = '已启用 · 摘要 ' + MEMO.summary.length + ' 字'; }
  else { el.textContent = '已启用 · 尚无摘要（等待下次 AI 输出）'; }
}
function renderMemoSummary() {
  var box = getEl('opf-memo-out');
  if (!box) return;
  box.textContent = '';
  var yaml = MEMO.summary || '';
  if (!yaml) {
    var d = document.createElement('div');
    d.className = 'opf-memo-empty';
    d.textContent = '（暂无摘要）';
    box.appendChild(d);
    return;
  }
  var ms = getMemoSettings();
  if (ms.viewMode === 'raw') {
    var pre = document.createElement('pre');
    pre.className = 'opf-memo-raw';
    pre.textContent = yaml;
    box.appendChild(pre);
    return;
  }
  renderMemoVisual(box, yaml);
}

// 把 YAML 摘要渲染成 分节 + 键值着色 + 可折叠 的可视化视图
function renderMemoVisual(box, yaml) {
  var lines = String(yaml).replace(/\r\n/g, '\n').split('\n');
  var sections = [];
  var cur = null;
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    if (!raw.trim()) continue;
    var indent = raw.length - raw.replace(/^ +/, '').length;
    var text = raw.trim();
    if (indent === 0 && /^[^\s\-][^:]*:$/.test(text)) {
      cur = { title: text.replace(/:$/, ''), items: [] };
      sections.push(cur);
    } else {
      if (!cur) { cur = { title: '摘要', items: [] }; sections.push(cur); }
      cur.items.push({ indent: indent, text: text });
    }
  }
  sections.forEach(function (sec) {
    var s = document.createElement('div');
    s.className = 'opf-memo-sec';
    var h = document.createElement('div');
    h.className = 'opf-memo-sec-h';
    var caret = document.createElement('span');
    caret.className = 'opf-memo-caret';
    caret.textContent = '▾';
    var ttl = document.createElement('span');
    ttl.className = 'opf-memo-sec-t';
    ttl.textContent = sec.title;
    h.appendChild(caret); h.appendChild(ttl);
    h.addEventListener('click', function () { s.classList.toggle('collapsed'); });
    s.appendChild(h);
    var b = document.createElement('div');
    b.className = 'opf-memo-sec-b';
    sec.items.forEach(function (it) { b.appendChild(memoVisualLine(it)); });
    s.appendChild(b);
    box.appendChild(s);
  });
}

function memoVisualLine(it) {
  var row = document.createElement('div');
  row.className = 'opf-memo-line';
  row.style.paddingLeft = Math.min(it.indent * 12, 120) + 'px';
  var t = it.text;
  var m = t.match(/^-\s*(.*)$/);
  if (m) {
    var bullet = document.createElement('span');
    bullet.className = 'opf-memo-bullet';
    bullet.textContent = '▪';
    row.appendChild(bullet);
    row.appendChild(document.createTextNode(' '));
    row.appendChild(memoVisualInline(m[1]));
    return row;
  }
  row.appendChild(memoVisualInline(t));
  return row;
}

function memoVisualInline(s) {
  var frag = document.createElement('span');
  frag.className = 'opf-memo-txt';
  var m = s.match(/^([^:]+):\s*(.*)$/);
  if (m) {
    var k = document.createElement('span');
    k.className = 'opf-memo-key';
    k.textContent = m[1].trim() + ':';
    frag.appendChild(k);
    if (m[2]) {
      frag.appendChild(document.createTextNode(' '));
      var v = document.createElement('span');
      v.className = 'opf-memo-val';
      v.textContent = m[2];
      frag.appendChild(v);
    }
  } else {
    frag.textContent = s;
  }
  return frag;
}

function onMemoToggle() {
  var ms = getMemoSettings();
  initMemo();
  if (ms.enabled) {
    applyMemoPrompt();
    renderMemoStatus();
  } else {
    MEMO.queued = false;
    applyMemoPrompt(); // 关闭时清空注入
    renderMemoStatus();
  }
}

function initMemo() {
  var c = getCtx();
  if (!c) return;
  if (MEMO.bound) return;
  var es = c.eventSource;
  var et = c.eventTypes || c.event_types;
  if (!es || !et || typeof es.on !== 'function') return;
  try {
    es.on(et.MESSAGE_RECEIVED, onMemoMessageReceived);
    es.on(et.CHAT_CHANGED, onMemoChatChanged);
    MEMO.bound = true;
    MEMO.chatKey = memoChatKey();
    loadMemoFromChat();   // 启动时恢复当前对话已有的摘要
    applyMemoPrompt();
    opfLog('memo module bound');
  } catch (e) { opfErr('initMemo bind', e); }
}

var MEMO_CSS = "#opf-memo{border-top:1px solid rgba(255,122,138,.25);margin-top:6px;padding-top:8px}.opf-memo-lab{display:flex;align-items:center;gap:6px}.opf-memo-tag{font-size:9px;color:#8fd6ff;background:rgba(60,140,200,.16);border:1px solid rgba(120,190,255,.35);border-radius:8px;padding:0 6px;line-height:1.5}.opf-memo-hint{font-size:10px;color:rgba(255,200,208,.6);display:block;margin-top:2px}.opf-memo-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px}#opf-memo-out{font-size:11px;max-height:200px;overflow-y:auto;background:rgba(10,2,5,.45);border:1px solid rgba(255,122,138,.2);border-radius:8px;padding:6px 8px;margin-top:6px;color:#ffeef1}.opf-memo-sec{margin:2px 0}.opf-memo-sec-h{display:flex;align-items:center;gap:4px;cursor:pointer;user-select:none;padding:2px;border-radius:6px;font-weight:600;color:#ffb7be}.opf-memo-sec-h:hover{background:rgba(255,77,94,.12)}.opf-memo-caret{color:#ff8a95;font-size:9px;transition:transform .12s}.opf-memo-sec.collapsed .opf-memo-caret{transform:rotate(-90deg)}.opf-memo-sec.collapsed .opf-memo-sec-b{display:none}.opf-memo-sec-t{letter-spacing:.5px}.opf-memo-sec-b{margin-left:2px;border-left:1px dashed rgba(255,122,138,.2);padding-left:6px}.opf-memo-line{line-height:1.5;white-space:pre-wrap;word-break:break-word}.opf-memo-bullet{color:#ffd9a8;margin-right:2px}.opf-memo-key{color:#8fd6ff}.opf-memo-val{color:#ffeef1}.opf-memo-txt{color:#ffeef1}.opf-memo-raw{white-space:pre-wrap;word-break:break-word;margin:0;font-family:inherit;font-size:11px}.opf-memo-empty{color:rgba(255,200,208,.55)}";

function addMemoUI(root) {
  if (!root || getEl('opf-memo')) return;
  var body = root.querySelector('#opf-body');
  if (!body) return;
  try {
    if (!getEl('opf_memo_css')) {
      var st = document.createElement('style');
      st.id = 'opf_memo_css';
      st.textContent = MEMO_CSS;
      document.head.appendChild(st);
    }
  } catch (e) { opfErr('memo css', e); }

  var sec = document.createElement('div');
  sec.className = 'opf-sec';
  sec.id = 'opf-memo';
  sec.innerHTML =
    '<div class="opf-sec-label opf-memo-lab">🧠 网游核心 · 文本总结<span class="opf-memo-tag">独立模块</span></div>' +
    '<label class="opf-opt"><input type="checkbox" id="opf-memo-enable"> 启用文本总结<span class="opf-memo-hint">默认关闭；开启后每次 AI 输出后自动总结并注入下次提示词</span></label>' +
    '<div class="opf-memo-row">' +
      '<label class="opf-opt">摘要上限 <input type="number" id="opf-memo-cap" class="opf-num" min="200" max="3000" step="100"> 字</label>' +
      '<button class="opf-step-act" type="button" id="opf-memo-now">立即总结</button>' +
      '<button class="opf-step-act" type="button" id="opf-memo-clear">清空</button>' +
      '<button class="opf-step-act" type="button" id="opf-memo-view">YAML原文</button>' +
    '</div>' +
    '<div class="opf-dim" id="opf-memo-status"></div>' +
    '<div id="opf-memo-out"></div>';
  body.appendChild(sec);

  var en = getEl('opf-memo-enable');
  var capEl = getEl('opf-memo-cap');
  var ms = getMemoSettings();
  en.checked = !!ms.enabled;
  capEl.value = ms.maxChars;
  en.addEventListener('change', function () {
    getMemoSettings().enabled = !!en.checked;
    saveMemoSettings();
    onMemoToggle();
  });
  capEl.addEventListener('change', function () {
    var v = parseInt(capEl.value, 10);
    var m2 = getMemoSettings();
    m2.maxChars = isNaN(v) ? 800 : clamp(v, 200, 3000);
    capEl.value = m2.maxChars;
    saveMemoSettings();
  });
  var viewBtn = getEl('opf-memo-view');
  function syncMemoViewBtn() {
    var m3 = getMemoSettings();
    viewBtn.textContent = m3.viewMode === 'raw' ? '可视化' : 'YAML原文';
    viewBtn.title = m3.viewMode === 'raw' ? '切换为可视化视图' : '切换为 YAML 原文';
  }
  viewBtn.addEventListener('click', function () {
    var m4 = getMemoSettings();
    m4.viewMode = (m4.viewMode === 'raw') ? 'visual' : 'raw';
    saveMemoSettings();
    syncMemoViewBtn();
    renderMemoSummary();
  });
  getEl('opf-memo-now').addEventListener('click', function () {
    if (!getMemoSettings().enabled) { toast('请先勾选「启用文本总结」', 'warning'); return; }
    runMemoSummarize();
  });
  getEl('opf-memo-clear').addEventListener('click', clearMemo);
  syncMemoViewBtn();
  renderMemoStatus();
  renderMemoSummary();
}
