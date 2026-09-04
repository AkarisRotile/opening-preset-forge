
// ============================================================================
// 始弦的魔法大典 (openingPresetForge)  v1.0
// SillyTavern / Tavern Helper 悬浮窗扩展：一键走完 创作技能→装备→道具→资产→
// 背景→新输出 流程，调用酒馆当前主 API（generateRaw），最终一键导出 .preset.json
// ----------------------------------------------------------------------------
// 设计要点：
//  * 零相对 import / 无第三方依赖：只用 SillyTavern.getContext() 公开面 + 全局
//    jQuery / toastr（不可用则用内置降级提示）。
//  * 能力探测 + 优雅降级：grep 每个能力分支都会 console 记录走了哪条路。
//  * 世界书上下文：优先尝试动态读取酒馆当前激活世界书；失败则允许本地导入
//    世界书 json 文件；再不行退化为纯角色卡 + 手动粘贴。
//  * 安全：模型/用户文本一律 textContent 渲染，不用 innerHTML 插入外部内容。
// ============================================================================
'use strict';

var NS = 'openingPresetForge';
var EXT_TITLE = '始弦的魔法大典';

var DEFAULT_SETTINGS = {
  visible: false,
  x: null,
  y: null,
  w: 380,
  h: 560,
  quickMode: false,          // true = 单次调用直接出 JSON
  includeCard: true,         // 自动带当前角色卡文本
  includeWorld: true,        // 尝试带世界书文本
  worldConstantOnly: false,  // 世界书只取常驻条目
  capChars: 30000,           // 世界书最多注入字符
  capCardChars: 12000,       // 角色卡最多注入字符
  metaMode: 'full',          // 'full' 导出含 name/createdAt/updatedAt；'core' 只含 character 起
  autoCompliance: true,      // 生成初稿/重汇总后自动按《技能装备道具生成规则》自检修复
  modelNote: ''              // 附加一句给模型的叮嘱
};

// ---------------- 内嵌卡片提示词（取自 始弦的魔法大典） ----------------
var PAYLOAD = {"skill":"我现在需要给{{user}}的角色创作技能。技能的品质从高到低依次为神话，传说，史诗，稀有，优良，普通。在此之外，还有一个独特的“唯一”品级。我将根据每个品质的限制要求，于记载中为{{user}}寻找他的诉求\n装备分为武器，防具与饰品。{{user}}想让我在记载中寻找哪一件呢？我会好好帮他找的。\n找到了，《技能之书》，里边对于各种技能都有着简明概括的格式。让我看看……\n格式是这样的：\n名称：\n品质：\n类型：（是主动技能，还是被动技能？）\n标签：（简明概要的几个单词，来对这个技能的性质进行定义，例如法师的技能一般有着“智力”的标签，主动技能有着“主动”的标签。控制类技能则会写上一个“控制”）\n效果：（这一栏分为两行，分别是效果名和效果内容）\n-效果名：\n-效果内容：\n背景故事：（这个技能的背景，或许是一个传奇人物的同款技能，抑或是家族传承，还可能是在名师指导下的努力修习。）\n书里面有很多这样的例子，让我先看一下，这也可以更方便地帮{{user}}找到他想要的技能吧。\n唔……那些要素，法则和权能，似乎不在这本书里呢。这本书里只有单纯的技能，没有那些生命层级跨越所带来的技艺。\n例子：\n名称：闪电链\n品质：稀有\n类型：主动\n标签：智力、范围:4、伤害、威力：350、塑能、滅益\n效果：\n-效果名：范围伤害\n-效果内容：造成100%能量伤害\n-效果名：命中削弱\n-效果内容：使目标的命中修正-2点，持续2回合。\n背景：一道狂暴的闪电从天而降，击中首个目标后，会分裂成数道更小的电弧，在敌人之间肆意弹跳。\n","equip":"我现在需要给{{user}}的角色创作装备。装备的品质从高到低依次为神话，传说，史诗，稀有，优良，普通。在此之外，还有一个独特的“唯一”品级。我将根据每个品质的限制要求，于记载中为{{user}}寻找他的诉求。\n装备分为武器，防具与饰品。{{user}}想让我在记载中寻找哪一件呢？我会好好帮他找的。\n找到了，《装备之书》，里边对于各种装备都有着简明概括的格式。让我看看……\n哦哦，在第一页有一行注释，说这个世界上的任何装备都不具备增减持有者属性的能力，懂了懂了。\n格式是这样的：\n名称：\n品质：\n类型：（例如太刀，权杖，胸甲，戒指等）\n标签：（简明概要的几个单词，来对这件装备的性质进行定义，如果它是一把重剑，则一般会有“力量”之类的标签）\n效果：（这一栏分为两行，分别是效果名和效果内容）\n-效果名：\n-效果内容：\n背景故事：（这一件装备的背景，或许是一段传奇故事？或许是一把普通的兵器？）\n书里面有很多这样的例子，让我先看一下，这也可以更方便地帮{{user}}找到他想要的装备吧。\n例子：\n名称：学徒魔导书\n品质：优良\n类型：武器\n标签：魔导书、攻击：25\n效果：\n-效果名：每日首发\n-效果内容：每日首次施放[普通]品质技能时，不消耗MP。\n背景：硬质皮封面，书角以黄铜包裹，记录了数个基础法术，能帮助记忆法术。\n","item":"我现在需要给{{user}}的角色创作道具。道具的品质从高到低依次为神话，传说，史诗，稀有，优良，普通。在此之外，还有一个独特的“唯一”品级。我将根据每个品质的限制要求，于记载中为{{user}}寻找他的诉求。\n道具分为魔法药品，高级材料，施法媒介等等……好多呀。{{user}}想让我在记载中寻找哪一件呢？我会好好帮他找的。\n找到了，《道具之书》，里边对于各种道具都有着简明概括的格式。让我看看……\n格式是这样的：\n名称：\n品质：\n类型：（例如消耗品，材料，其他等）\n标签：（简明概要的几个单词，来对这件道具的性质进行定义，如果它是一封魔力信件，则一般会有“工具”，“通讯”之类的标签）\n效果：（这一栏分为两行，分别是效果名和效果内容）\n-效果名：\n-效果内容：\n背景故事：（这一件道具的背景，或许是一段传奇故事？或许是一瓶随处可见的魔力药剂？）\n书里面有很多这样的例子，让我先看一下，这也可以更方便地帮{{user}}找到他想要的道具吧。\n例子：\n名称：进阶宁静乳剂\n品质：稀有\n类型：消耗品\n标签：増益、滅益移除\n效果:\n-效果名：特效镇痛\n-效果内容：附加[特效镇痛]\n-效果名：净化治愈\n-效果内容：移除一个[减益]效果，每回合开始时恢复HP 420点，持续2回合。\n背景：如同珍珠母贝内壁般光泽流转的液体，散发着让人心安的檀木与乳香。它不仅能麻痹肉体的痛苦，更能温柔地抹去那些纠缠不休的恶毒诅咒。\n","asset":"我现在需要给{{user}}的角色创作资产。资产的品质从高到低依次为神话，传说，史诗，稀有，优良，... (line truncated to 2000 chars)

var PHASES = [
  { id: 'skill',      key: 'skill',      title: '创作技能', short: '技能' },
  { id: 'equip',      key: 'equip',      title: '创作装备', short: '装备' },
  { id: 'item',       key: 'item',       title: '创作道具', short: '道具' },
  { id: 'asset',      key: 'asset',      title: '创作资产', short: '资产' },
  { id: 'background', key: 'background', title: '开局背景', short: '背景' },
  { id: 'final',      key: 'final',      title: '汇总输出', short: '预设JSON' }
];

// ---------------- 小工具 ----------------
function opfLog() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('[' + NS + ']');
  try { console.log.apply(console, args); } catch (e) {}
}
function opfErr() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('[' + NS + ']');
  try { console.error.apply(console, args); } catch (e) {}
}
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fence() { return String.fromCharCode(96).repeat(3); }

var CTX = null;
function getCtx() {
  if (!CTX) {
    if (typeof SillyTavern !== 'undefined' && SillyTavern && typeof SillyTavern.getContext === 'function') {
      CTX = SillyTavern.getContext();
    }
  }
  return CTX;
}
function toast(msg, type) {
  type = type || 'info';
  if (typeof window !== 'undefined' && window.toastr && typeof toastr[type] === 'function') {
    toastr[type](msg, EXT_TITLE);
  } else {
    opfLog(msg);
  }
}

// ---------------- 设置存取 ----------------
function getSettings() {
  var c = getCtx();
  if (c && c.extensionSettings) {
    if (!c.extensionSettings[NS]) c.extensionSettings[NS] = {};
    var s = c.extensionSettings[NS];
    var changed = false;
    for (var k in DEFAULT_SETTINGS) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) { s[k] = DEFAULT_SETTINGS[k]; changed = true; }
    }
    return s;
  }
  // 酒馆上下文尚未就绪时，退化为内存对象
  if (!getSettings._mem) getSettings._mem = Object.assign({}, DEFAULT_SETTINGS);
  return getSettings._mem;
}
function saveSettings() {
  var c = getCtx();
  if (c && typeof c.saveSettingsDebounced === 'function') {
    try { c.saveSettingsDebounced(); } catch (e) { opfErr('saveSettings failed', e); }
  }
}

// ---------------- 状态 ----------------
var ST = {
  running: false,
  stopReq: false,
  msgs: null,          // 当前分步会话的消息数组
  results: {},         // phaseId -> 文本
  status: {},          // phaseId -> 'wait'|'run'|'ok'|'err'
  contextText: '',
  worldSource: 'none', // 'none' | 'st' | 'file' | 'paste'
  worldInfo: '',
  finalJson: null,
  finalText: ''
};
function resetPhase(pid) { ST.status[pid] = 'wait'; }
function setPhase(pid, st) {
  ST.status[pid] = st;
  var ui = getEl('ph-' + pid);
  if (ui) {
    ui.setAttribute('data-st', st);
    var dot = ui.querySelector('.opf-dot');
    if (dot) dot.textContent = st === 'run' ? '◌' : (st === 'ok' ? '✓' : (st === 'err' ? '✕' : '·'));
  }
}

// ============================================================================
// 上下文构建：当前角色卡 + 世界书
// ============================================================================
function currentUserName() {
  try {
    var c = getCtx();
    if (c && c.power_user && typeof c.power_user.name === 'string' && c.power_user.name) return c.power_user.name;
    if (c && c.personaDescription) return '主角';
  } catch (e) {}
  var el = document && document.getElementById('persona_name');
  return el && el.textContent ? el.textContent.trim() : '主角';
}

function collectCardText() {
  try {
    var c = getCtx();
    if (!c || !c.characters || !c.characters.length) return '';
    var idx = c.characterId;
    if (idx == null || idx < 0 || !c.characters[idx]) return '';
    var ch = c.characters[idx];
    var cap = getSettings().capCardChars || 12000;
    var parts = [];
    var pick = function (name) {
      try { return String(ch[name] || ''); } catch (e) { return ''; }
    };
    var name = pick('name');
    var desc = pick('description');
    var pers = pick('personality');
    var scen = pick('scenario');
    if (name) parts.push('[角色名] ' + name);
    if (desc) parts.push('[角色描述] ' + desc);
    if (pers) parts.push('[性格摘要] ' + pers);
    if (scen) parts.push('[情景] ' + scen);
    var joined = parts.join('\n\n');
    if (joined.length > cap) joined = joined.slice(0, cap) + '\n……(过长截断)';
    return joined;
  } catch (e) { opfErr('collectCardText', e); return ''; }
}

// ---- 世界书：尽量读取当前酒馆激活的世界书 ----
function worldEntriesOf(data) {
  // 兼容多种导出形态：{entries:{...}} / {data:{entries:[...]}} / 直接数组
  var root = data || {};
  var entries = null;
  if (Array.isArray(root)) entries = root;
  else if (root.data && Array.isArray(root.data.entries)) entries = root.data.entries;
  else if (root.entries && Array.isArray(root.entries)) entries = root.entries;
  else if (root.entries && typeof root.entries === 'object') entries = Object.values(root.entries);
  if (!entries) return [];
  return entries.filter(function (e) { return e && typeof e.content === 'string' && e.content.trim(); });
}
function entriesToText(entries, opts) {
  opts = opts || {};
  var cap = opts.cap || 30000;
  var constantOnly = !!opts.constantOnly;
  var out = [];
  var used = 0;
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (constantOnly && e.constant !== true) continue;
    var head = e.comment || e.key || '';
    var line = (head ? '【' + String(head).slice(0, 40) + '】' : '') + ' ' + e.content;
    used += line.length;
    if (used > cap) { out.push('……(超过注入上限，截断)'); break; }
    out.push(line);
  }
  return out.join('\n\n');
}

// 能力探测：动态 import world-info 模块（绝对路径，不受安装位置影响）
function probeWorldModule() {
  var candidates = ['/scripts/world-info.js', '/world-info.js'];
  function tryOne(url) {
    return import(url).then(function (m) { return m; }).catch(function () { return null; });
  }
  var p = Promise.resolve(null);
  candidates.forEach(function (u) { p = p.then(function (r) { return r || tryOne(u); }); });
  return p;
}

function loadWorldFromST() {
  return probeWorldModule().then(function (mod) {
    if (!mod) { opfLog('world-info 模块不可用，走文件/粘贴兜底'); return null; }
    var names = (mod.selected_world_info && Array.isArray(mod.selected_world_info)) ? mod.selected_world_info.slice() : [];
    if (!names.length && mod.world_info && mod.world_info.globalSelect && Array.isArray(mod.world_info.globalSelect)) {
      names = mod.world_info.globalSelect.slice();
    }
    if (!names.length) {
      opfLog('没有检测到激活的世界书（selected_world_info 为空）');
      return { entries: [], sourceName: '' };
    }
    var loadOne = typeof mod.loadWorldInfo === 'function' ? mod.loadWorldInfo : null;
    var tasks = names.slice(0, 3).map(function (n) {
      if (loadOne) {
        return loadOne(n).then(function (d) {
          return { name: n, entries: worldEntriesOf(d) };
        }).catch(function () { return { name: n, entries: [] }; });
      }
      return Promise.resolve({ name: n, entries: [] });
    });
    return Promise.all(tasks).then(function (books) {
      var entries = [];
      books.forEach(function (b) { entries = entries.concat(b.entries); });
      opfLog('从酒馆读取世界书条目数：', entries.length, '来源:', books.map(function (b) { return b.name; }).join(','));
      return { entries: entries, sourceName: 'st' };
    });
  });
}

// 本地文件世界书：与 命定之诗与黄昏之歌v4.3 (3).json 的导出形态兼容
function loadWorldFromFile(file) {
  return new Promise(function (resolve, reject) {
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var data = JSON.parse(String(rd.result));
        var entries = worldEntriesOf(data);
        opfLog('从文件解析世界书条目数：', entries.length, file.name);
        resolve({ entries: entries, sourceName: 'file', fileName: file.name });
      } catch (e) { reject(e); }
    };
    rd.onerror = function () { reject(rd.error || new Error('read error')); };
    rd.readAsText(file);
  });
}

function applyWorldResult(res) {
  if (!res || !res.entries || !res.entries.length) { clearWorldbook(); return; }
  var r = importWorldEntries(res.entries, res.sourceName || 'file', res.fileName || null);
  opfLog('世界书载入条目数：', r.total, '默认勾选常驻：', r.selConst);
  try { openWorldSide(); } catch (e) {}
}

// ============================================================================
// 生成管线
// ============================================================================
function macroFill(text) {
  var uname = ST.userName || '主角';
  return String(text || '').replace(/\{\{user\}\}/g, uname).replace(/\{\{char\}\}/g, EXT_TITLE.replace(/·/g, ''));
}

function buildSystemContent() {
  var s = getSettings();
  var lines = [];
  lines.push('[角色] ' + macroFill(PAYLOAD.persona));
  if (PAYLOAD.supplement) {
    var sup = PAYLOAD.supplement.replace(/^\s*<[^>]*>\s*/, '');
    lines.push('[补充] ' + macroFill(sup));
  }
  lines.push('[任务] 你正在帮{{user}}为即将开启新世界旅程的开局角色配置“开局预设”。接下来会分阶段收到 技能→装备→道具→资产→背景→最终汇总 的创作请求；每一阶段都顺着本对话已产出的内容继续创作，不要重复或推翻先前内容；栏目品质、消耗、世界观必须与本对话给出的规则保持一致。');
  lines.push('[世界规则·创作限制]');
  lines.push(WORLD_RULES);
  if (s.modelNote && s.modelNote.trim()) lines.push('[额外叮嘱] ' + s.modelNote.trim());
  if (ST.contextText) lines.push('[角色卡参考]\n' + ST.contextText);
  if (ST.worldInfo) lines.push('[世界书参考]\n' + ST.worldInfo);
  return macroFill(lines.join('\n\n'));
}

function buildUser0() {
  var lines = [];
  var demand = getEl('opf-demand') && getEl('opf-demand').value.trim();
  lines.push('[本次开局需求] ' + (demand || '请为我的开局角色设计一套合理的开局预设。'));
  lines.push('[工作方式] 我会分阶段把创作要求发给你：先创作技能、装备、道具、资产，再写开局背景，最后由你汇总输出一份完整的“开局预设 JSON”。每个阶段你只完成该阶段栏目即可。若某栏目确实没有合适内容，回复“无”。');
  return lines.join('\n\n');
}

function phasePrompt(phase) {
  var body = macroFill(PAYLOAD[phase.key]);
  if (phase.key === 'final') {
    return '【最终汇总阶段】\n下面是最终“开局预设 JSON”的完整格式模板与全部填写规则（含数值规则），请仔细阅读：\n\n' +
      body + '\n\n请把本对话中已经产出的全部栏目内容（技能/装备/道具/资产/背景）汇总成这一份完整的开局预设 JSON。' +
      '输出时把 JSON 放在 ' + fence() + 'text 代码块里，严格按照模板的字段、结构与规则填写，不要遗漏任何符号。';
  }
  var first = (phase.key === 'skill') ? '（先完成技能栏：把开局角色要学的技能一次性列全；没有特殊技能需求则回复“无”）' : '';
  var spec = SPEC_PROMPT[phase.key];
  var specBlock = spec ? '\n\n[生成规范 · ' + phase.title + ']\n' + spec + '\n' : '';
  return '【阶段：' + phase.title + '】\n' + body + specBlock + '\n' +
    '请严格按上面的格式与生成规范，一次性产出本栏完整内容（若该栏确实无内容则回复“无”）。' + first;
}

function systemCtxBudgetOk(msgs) {
  var total = 0;
  for (var i = 0; i < msgs.length; i++) total += String(msgs[i].content || '').length;
  return total < 90000;
}

async function callModel(msgs) {
  var c = getCtx();
  if (!c || typeof c.generateRaw !== 'function') {
    throw new Error('generateRaw 不可用（SillyTavern 版本过旧或未就绪）。请升级到支持 getContext().generateRaw 的版本。');
  }
  var out = await c.generateRaw({ prompt: msgs });
  if (out === null || out === undefined) throw new Error('主 API 返回为空（可能被中断或未连接）。');
  return String(out);
}

async function runOne(phase) {
  setPhase(phase.id, 'run');
  var msgs = ST.msgs;
  var userMsg = { role: 'user', content: phasePrompt(phase) };
  msgs.push(userMsg);
  try {
    var resp = await callModel(msgs);
    ST.results[phase.id] = resp;
    msgs.push({ role: 'assistant', content: resp });
    // 过长时丢弃最早若干条 assistant 结果，防止超上下文
    while (ST.msgs.length > 3 && !systemCtxBudgetOk(ST.msgs)) {
      if (ST.msgs[2] && ST.msgs[2].role === 'assistant') { ST.msgs.splice(2, 2); } else break;
    }
    setPhase(phase.id, 'ok');
    if (ST.elPre && ST.elPre[phase.id]) ST.elPre[phase.id].textContent = (resp || '').slice(0, 4000) + (resp && resp.length > 4000 ? '\n……(截断显示，完整内容已记录)' : '');
    enablePhaseRefine(phase.id);
    return resp;
  } catch (e) {
    setPhase(phase.id, 'err');
    opfErr('runOne failed @' + phase.id, e);
    throw e;
  }
}

function isStop() { return ST.stopReq; }
function waitTick() { return new Promise(function (r) { setTimeout(r, 0); }); }

async function runAll() {
  if (ST.running) { toast('已经在运行中'); return; }
  var s = getSettings();
  ST.running = true; ST.stopReq = false; ST.finalJson = null; ST.finalText = '';
  ST._freshDraft = true;
  dirsReset();
  ST.userName = currentUserName();
  ST.contextText = s.includeCard ? collectCardText() : '';
  // 世界书：内存已有则复用；没有则尝试从酒馆拉一次
  if (s.includeWorld && ST.worldSource === 'none') {
    try {
      var wr = await loadWorldFromST();
      applyWorldResult(wr);
    } catch (e) { opfErr('world from ST failed', e); }
  }
  renderMetaStatus();
  try {
    if (s.quickMode) {
      await runQuick();
    } else {
      var msgs = [
        { role: 'system', content: buildSystemContent() },
        { role: 'user', content: buildUser0() }
      ];
      ST.msgs = msgs;
      for (var i = 0; i < PHASES.length; i++) {
        if (isStop()) break;
        await runOne(PHASES[i]);
        await waitTick();
      }
      if (ST.results.final) handleModelReply(ST.results.final);
    }
    if (isStop()) { toast('已停止'); }
  } catch (e) {
    toast('生成出错：' + (e && e.message ? e.message : e), 'error');
  } finally {
    ST.running = false;
    renderRunButtons();
  }
}

async function runQuick() {
  var lines = [];
  for (var i = 0; i < PHASES.length; i++) {
    if (PHASES[i].key === 'final') continue;
    lines.push('【阶段：' + PHASES[i].title + '】\n' + macroFill(PAYLOAD[PHASES[i].key]));
  }
  lines.push('【最终汇总】\n下面是最终“开局预设 JSON”的完整格式模板与填写规则：\n' + macroFill(PAYLOAD.final));
  lines.push('请一次性完成全部栏目创作并输出最终 JSON，放在 ' + fence() + 'text 代码块里。');
  var msgs = [
    { role: 'system', content: buildSystemContent() },
    { role: 'user', content: buildUser0() + '\n\n' + lines.join('\n\n') }
  ];
  ST.msgs = msgs;
  setPhase('final', 'run');
  try {
    var resp = await callModel(msgs);
    ST.results.final = resp;
    setPhase('final', 'ok');
    if (ST.elPre && ST.elPre.final) ST.elPre.final.textContent = (resp || '').slice(0, 6000);
    handleModelReply(resp);
  } catch (e) {
    setPhase('final', 'err');
    throw e;
  }
}

function handleModelReply(text) {
  if (!text) return;
  ST.finalText = text;
  var ex = extractJson(text);
  if (ex.ok) {
    ST.finalJson = ex.obj;
    var warns = validatePreset(ex.obj);
    renderJsonOut(ex.obj, warns);
    markSummarized();
    toast('已解析出开局预设 JSON' + (warns.length ? '（' + warns.length + ' 条提示）' : ''));
    draftReadyHint();
    maybeAutoCompliance();
  } else {
    renderJsonOut(null, [{ msg: '未能从回复中解析出合法 JSON（可能被截断或格式跑偏），可重试“汇总输出”一步。' }]);
    toast('未能解析 JSON，请检查输出或重试', 'warning');
  }
}

// ---- JSON 解析（容错）----
function balancedJson(text, i0) {
  var depth = 0, inStr = false, esc = false, i = i0;
  for (; i < text.length; i++) {
    var ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(i0, i + 1); }
  }
  return null;
}
function extractJson(text) {
  var F = fence();
  var seg = null;
  var idx = 0;
  while (idx >= 0) {
    var f1 = text.indexOf(F, idx);
    if (f1 < 0) break;
    var f2 = text.indexOf(F, f1 + 3);
    if (f2 < 0) break;
    var cand = text.slice(f1 + 3, f2).replace(/^json\s*/i, '').replace(/^text\s*/i, '');
    if (cand && cand.trim()) seg = cand.trim();
    idx = f2 + 3;
  }
  if (!seg) {
    var i0 = text.indexOf('{');
    if (i0 >= 0) seg = balancedJson(text, i0);
  }
  if (!seg) return { ok: false };
  try {
    var obj = JSON.parse(seg);
    return { ok: true, obj: obj, seg: seg };
  } catch (e) {
    return { ok: false, seg: seg };
  }
}

// ---- 结构校验（对照新版本开局预设格式）----
function validatePreset(obj) {
  var warns = [];
  var rIss = [];
  normalizeRarityTree(obj, rIss);
  for (var ri = 0; ri < rIss.length; ri++) { warns.push({ msg: "品级无法识别：" + rIss[ri] + "（应为 common/uncommon/rare/epic/legendary/mythic/only）" }); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { warns.push({ msg: '顶层不是 JSON 对象' }); return warns; }
  var needCore = ['character', 'equipments', 'items', 'assets', 'skills', 'partners', 'background', 'customInjectionSettings'];
  var s = getSettings();
  if (s.metaMode === 'full') needCore.unshift('name', 'createdAt', 'updatedAt');
  for (var i = 0; i < needCore.length; i++) {
    if (!(needCore[i] in obj)) warns.push({ msg: '缺少顶层字段：' + needCore[i] });
  }
  if (obj.character && typeof obj.character === 'object') {
    var chNeed = ['name', 'gender', 'customGender', 'age', 'race', 'customRace', 'identity', 'customIdentity', 'startLocation', 'customStartLocation', 'level', 'basePoints', 'attributePoints', 'reincarnationPoints', 'destinyPoints', 'money'];
    for (var j = 0; j < chNeed.length; j++) {
      if (!(chNeed[j] in obj.character)) warns.push({ msg: 'character 缺少字段：' + chNeed[j] });
    }
    if (!obj.character.basePoints || !obj.character.attributePoints) warns.push({ msg: 'character.basePoints/attributePoints 需为对象（五维）' });
  }
  if (obj.background && typeof obj.background === 'object' && typeof obj.background.description === 'string' && obj.background.description.replace(/[（）\[\]（）]/g, '').trim().length < 60) {
    warns.push({ msg: 'background.description 过短（应为不少于500字的开局剧情）' });
  }
  if (obj.partners && Array.isArray(obj.partners)) {
    obj.partners.forEach(function (p, pi) {
      if (!p || typeof p !== 'object') return;
      var pk = ['name', 'lifeLevel', 'attributes', 'stairway', 'affinity', 'comment', 'backgroundInfo'];
      pk.forEach(function (k) { if (!(k in p)) warns.push({ msg: 'partners[' + pi + '] 缺少字段：' + k }); });
    });
  }
  return warns;
}

// ---- 导出 / 复制 ----
function presetNameValue() {
  var el = getEl('opf-pname');
  if (el && el.value && el.value.trim()) return el.value.trim();
  return '【自定义开局】';
}
function buildExportDoc() {
  var s = getSettings();
  var obj = ST.finalJson;
  if (!obj) return null;
  if (s.metaMode === 'full') {
    var now = Date.now();
    return {
      name: obj.name || presetNameValue(),
      createdAt: now,
      updatedAt: now,
      character: obj.character,
      equipments: obj.equipments || [],
      items: obj.items || [],
      assets: obj.assets || [],
      skills: obj.skills || [],
      partners: obj.partners || [],
      background: obj.background,
      customInjectionSettings: obj.customInjectionSettings || { equipment: true, item: true, asset: true, skill: true, partner: true }
    };
  }
  return obj;
}
function safeName(n) {
  return String(n || 'preset').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'preset';
}
function tsName() {
  var d = new Date();
  function p(v) { return (v < 10 ? '0' : '') + v; }
  return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function downloadPreset() {
  var doc = buildExportDoc();
  if (!doc) { toast('还没有可导出的 JSON：请先生成', 'warning'); return; }
  var blob = new Blob([JSON.stringify(doc, null, 4)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'destiny_' + safeName(presetNameValue()) + '_' + tsName() + '.preset.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  toast('已导出 ' + a.download);
}
function copyPreset() {
  var doc = buildExportDoc();
  if (!doc) { toast('还没有可导出的 JSON：请先生成', 'warning'); return; }
  var txt = JSON.stringify(doc, null, 2);
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制到剪贴板'); } catch (e) { toast('复制失败，请手动复制'); }
    ta.remove();
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function () { toast('已复制到剪贴板'); }, fallback);
  } else fallback();
}

// ============ UI wiring & boot ============
function getEl(id){return document.getElementById(id);}

var OPF_CSS = "#opf-root,#opf-launcher{box-sizing:border-box;font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;letter-spacing:.3px}#opf-root *,#opf-launcher *{box-sizing:border-box}#opf-launcher{position:fixed;right:6px;top:42%;z-index:2147480001;width:38px;height:38px;border-radius:12px 6px 6px 12px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#ffd9de;background:linear-gradient(160deg,rgba(74,10,20,.92),rgba(24,3,8,.88));border:1px solid rgba(255,106,122,.28);box-shadow:0 0 6px rgba(255,77,94,.55),0 0 18px rgba(200,16,46,.35);font-size:18px;transition:transform .18s ease,box-shadow .18s ease;user-select:none}#opf-launcher:hover{transform:scale(1.08);box-shadow:0 0 6px rgba(255,77,94,.55),0 0 18px rgba(200,16,46,.35),0 0 24px rgba(255,77,94,.5)}#opf-launcher .opf-la-dot{position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#39d353;border:1px solid rgba(0,0,0,.5);display:none}#opf-launcher.running .opf-la-dot{display:block;animation:opfPulse 1s infinite}@keyframes opfPulse{0%,100%{opacity:1}50%{opacity:.25}}#opf-root{position:fixed;z-index:2147480000;width:392px;max-width:calc(100vw - 18px);max-height:min(760px,92vh);display:flex;flex-direction:column;border-radius:14px;color:#fdeef0;overflow:hidden;background:linear-gradient(180deg,rgba(46,6,14,.92) 0%,rgba(30,4,10,.90) 45%,rgba(16,2,6,.94) 100%);border:1px solid rgba(255,122,138,.34);box-shadow:0 0 0 1px rgba(0,0,0,.35),0 10px 34px rgba(0,0,0,.55),inset 0 0 42px rgba(255,60,80,.05),0 0 22px rgba(255,77,94,.22);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);transition:opacity .16s ease,transform .16s ease}#opf-root::before{content:'';position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,transparent,#ff4d5e 18%,#ffd9a8 50%,#c8102e 82%,transparent);box-shadow:0 0 12px rgba(255,90,100,.8);opacity:.9}#opf-root.opf-hidden{opacity:0;pointer-events:none;transform:translateY(6px) scale(.98)}#opf-head{display:flex;a... (line truncated to 2000 chars)
var OPF_HTML = "<div id=\"opf-head\"><div id=\"opf-title\">✦ 始弦的魔法大典<span class=\"s\">destiny preset forge</span></div><button class=\"opf-ico-btn\" id=\"opf-btn-mini\" title=\"最小化\">─</button><button class=\"opf-ico-btn\" id=\"opf-btn-close\" title=\"关闭\">✕</button></div><div id=\"opf-body\"><div id=\"opf-meta\"></div><div class=\"opf-sec\"><div class=\"opf-sec-label\">开局需求</div><textarea id=\"opf-demand\" placeholder=\"例如：给一位从迷雾森林走出、想在瓦伦蒂亚城谋生的流浪剑士配齐开局（1级、偏好近战、带一只契约伙伴……）\"></textarea></div><div class=\"opf-opts\"><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-card\"> 带角色卡</label><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-world\"> 带世界书</label><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-const\"> 仅常驻</label><label class=\"opf-opt\">注入上限<input type=\"number\" id=\"opf-cap\" class=\"opf-num\" min=\"2000\" max=\"200000\" step=\"1000\"></label><label class=\"opf-opt\">名称<input id=\"opf-pname\" value=\"【自定义开局】\" title=\"开局预设名称（导出 name 字段与文件名）\"></label></div><div class=\"opf-opts\"><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-quick\"> 快出模式(单次)</label><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-meta\"> 导出含文件元数据</label><button class=\"opf-step-act\" id=\"opf-wload\" type=\"button\">导入世界书文件</button><button class=\"opf-step-act\" id=\"opf-wclear\" type=\"button\">清世界书</button></div><div class=\"opf-sec\"><div class=\"opf-sec-label\">创作步骤</div><div class=\"opf-steps\" id=\"opf-steps\"></div></div><div class=\"opf-out\"><div class=\"opf-sec-label\">预设 JSON</div><pre id=\"opf-json-out\">尚未生成</pre></div></div><div id=\"opf-actions\"><button class=\"opf-btn primary\" id=\"opf-btn-run\">▶ 生成初稿</button><button class=\"opf-btn ghost\" id=\"opf-btn-quick\">⚡ 快速初稿</button><button class=\"opf-btn ghost\" id=\"opf-btn-save\">⬇ 导出 .preset.json</button><button class=\"opf-btn ghost\" id=\"opf-btn-copy\">⧉ 复制</button></div>";

function injectStyle(){ if (getEl(NS + "_css")) return; var st = document.createElement("style"); st.id = NS + "_css"; st.textContent = OPF_CSS; document.head.appendChild(st); var st2 = document.createElement("style"); st2.id = NS + "_css_extra"; st2.textContent = EXTRA_CSS; document.head.appendChild(st2); }
function launcher(){ if (!getEl("opf-launcher")) { var b = document.createElement("div"); b.id = "opf-launcher"; b.title = EXT_TITLE; b.addEventListener("click", togglePanel); var dot = document.createElement("span"); dot.className = "opf-la-dot"; b.appendChild(document.createTextNode("✦")); b.appendChild(dot); document.body.appendChild(b); } return getEl("opf-launcher"); }
function showPanel(){ var root = getEl("opf-root"); var s = getSettings(); if (!root) return; root.classList.remove("opf-hidden"); root.classList.add("opf-show"); root.style.display = "flex"; placePanelInView(root); launcher().style.display = "none"; s.visible = true; saveSettings(); }
function hidePanel(){ var root = getEl("opf-root"); var s = getSettings(); if (!root) return; root.classList.add("opf-hidden"); setTimeout(function(){ if (!s.visible) root.style.display = "none"; }, 200); launcher().style.display = "flex"; s.visible = false; saveSettings(); }
function togglePanel(){ var s = getSettings(); if (s.visible) hidePanel(); else showPanel(); }
function placePanelInView(root){
  if (!root) return;
  var s = getSettings();
  var w = root.offsetWidth || 392;
  var h = root.offsetHeight || 560;
  var vw = window.innerWidth || document.documentElement.clientWidth || 800;
  var vh = window.innerHeight || document.documentElement.clientHeight || 600;
  if (typeof s.x === "number" && typeof s.y === "number" && s.x >= -40 && s.x <= vw - 60 && s.y >= -40 && s.y <= vh - 40) {
    root.style.left = s.x + "px";
    root.style.top = s.y + "px";
    return;
  }
  var left = Math.max(8, Math.min(Math.round((vw - w) / 2), Math.max(8, vw - w - 8)));
  var top = Math.max(8, Math.min(Math.round((vh - h) / 2), Math.max(8, vh - h - 8)));
  root.style.left = left + "px";
  root.style.top = top + "px";
  s.x = left; s.y = top;
  saveSettings();
}
function keepPanelInView(){
  var root = getEl("opf-root"); if (!root) return;
  var s = getSettings(); if (!s.visible) return;
  var r = root.getBoundingClientRect();
  var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
  if (r.left < -20 || r.top < -20 || r.right > vw + 20 || r.bottom > vh + 20) placePanelInView(root);
}

function buildPanel(){ if (getEl("opf-root")) return; var root = document.createElement("div"); root.id = "opf-root"; root.className = "opf-hidden"; root.style.display = "none"; root.innerHTML = OPF_HTML; document.body.appendChild(root); launcher(); bindPanel(root); renderSteps(); syncFromSettings(); addWorkflowUI(root); try { buildWorldSideButton(root); } catch (e) { opfErr("side button", e); } try { addComplianceToggle(root); } catch (e) { opfErr("compliance toggle", e); } try { addMemoUI(root); } catch (e) { opfErr("memo ui", e); } if (getSettings().visible) showPanel(); }

function bindPanel(root){
  root.querySelector("#opf-btn-close").addEventListener("click", hidePanel);
  root.querySelector("#opf-btn-mini").addEventListener("click", hidePanel);
  root.querySelector("#opf-btn-run").addEventListener("click", function(){ runFlow(false); });
  root.querySelector("#opf-btn-quick").addEventListener("click", function(){ runFlow(true); });
  root.querySelector("#opf-btn-save").addEventListener("click", downloadPreset);
  root.querySelector("#opf-btn-copy").addEventListener("click", copyPreset);
  root.querySelector("#opf-ck-card").addEventListener("change", syncFromControl);
  root.querySelector("#opf-ck-world").addEventListener("change", syncFromControl);
  root.querySelector("#opf-ck-const").addEventListener("change", syncFromControl);
  root.querySelector("#opf-ck-quick").addEventListener("change", syncFromControl);
  root.querySelector("#opf-ck-meta").addEventListener("change", syncFromControl);
  root.querySelector("#opf-cap").addEventListener("change", syncFromControl);
  root.querySelector("#opf-pname").addEventListener("change", syncFromControl);
  var fi = document.createElement("input"); fi.type = "file"; fi.accept = ".json,application/json"; ST.fileInput = fi;
  fi.addEventListener("change", function(){ var f = fi.files && fi.files[0]; if (!f) return; loadWorldFromFile(f).then(function(res){ applyWorldResult(res); renderMetaStatus(); toast("世界书已从文件载入：" + (res.fileName || "")); }).catch(function(e){ toast("世界书文件解析失败：" + (e && e.message ? e.message : e), "error"); }); fi.value = ""; });
  root.querySelector("#opf-wload").addEventListener("click", function(){ fi.click(); });
  root.querySelector("#opf-wclear").addEventListener("click", function(){ clearWorldbook(); });
  makeDraggable(root.querySelector("#opf-head"), root);
  window.addEventListener("resize", keepPanelInView);
}

function syncFromControl(){
  var s = getSettings();
  s.includeCard = getEl("opf-ck-card").checked;
  s.includeWorld = getEl("opf-ck-world").checked;
  s.worldConstantOnly = getEl("opf-ck-const").checked;
  s.quickMode = getEl("opf-ck-quick").checked;
  s.metaMode = getEl("opf-ck-meta").checked ? "full" : "core";
  var cap = parseInt(getEl("opf-cap").value, 10);
  s.capChars = isNaN(cap) ? 30000 : clamp(cap, 2000, 200000);
  s.lastName = getEl("opf-pname").value;
  saveSettings(); renderMetaStatus();
}
function syncFromSettings(){
  var s = getSettings();
  getEl("opf-ck-card").checked = !!s.includeCard;
  getEl("opf-ck-world").checked = !!s.includeWorld;
  getEl("opf-ck-const").checked = !!s.worldConstantOnly;
  getEl("opf-ck-quick").checked = !!s.quickMode;
  getEl("opf-ck-meta").checked = s.metaMode !== "core";
  getEl("opf-cap").value = s.capChars;
  if (s.lastName) getEl("opf-pname").value = s.lastName;
  renderMetaStatus();
}

function makeDraggable(handle, root){
  var s = getSettings();
  var sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
  handle.addEventListener("pointerdown", function(e){ if (e.target.closest && e.target.closest("button")) return; drag = true; sx = e.clientX; sy = e.clientY; var r = root.getBoundingClientRect(); ox = r.left; oy = r.top; if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId); if (e.preventDefault) e.preventDefault(); });
  handle.addEventListener("pointermove", function(e){ if (!drag) return; var nx = clamp(ox + e.clientX - sx, 0, Math.max(0, window.innerWidth - 120)); var ny = clamp(oy + e.clientY - sy, 0, Math.max(0, window.innerHeight - 60)); root.style.left = nx + "px"; root.style.top = ny + "px"; });
  function endDrag(){ if (!drag) return; drag = false; var r = root.getBoundingClientRect(); s.x = Math.round(r.left); s.y = Math.round(r.top); saveSettings(); }
  handle.addEventListener("pointerup", endDrag); handle.addEventListener("pointercancel", endDrag);
}

function renderSteps(){
  var box = getEl("opf-steps"); if (!box) return; box.textContent = "";
  PHASES.forEach(function (p, i) {
    var row = document.createElement("div"); row.className = "opf-step"; row.setAttribute("data-st", "wait"); row.id = "opf-ph-" + p.id;
    var head = document.createElement("div"); head.className = "opf-step-head";
    var idx = document.createElement("span"); idx.className = "opf-idx"; idx.textContent = String(i + 1);
    var dot = document.createElement("span"); dot.className = "opf-dot"; dot.textContent = "·";
    var ttl = document.createElement("span"); ttl.className = "opf-step-title"; ttl.textContent = p.title;
    var sub = document.createElement("span"); sub.className = "opf-step-sub"; sub.textContent = p.short;
    var btn = document.createElement("button"); btn.className = "opf-step-act"; btn.type = "button";
    btn.textContent = p.key === "final" ? "重汇总" : "重跑该步及后续";
    btn.title = p.key === "final" ? "基于各步当前内容重新生成汇总 JSON" : "从本步重跑到最后（覆盖后续修改）";
    btn.addEventListener("click", function (ev) { ev.stopPropagation(); if (ST.running) { toast("请先停止当前流程"); return; } runFrom(p.id); });
    head.appendChild(idx); head.appendChild(dot); head.appendChild(ttl); head.appendChild(sub); head.appendChild(btn);
    head.addEventListener("click", function(){ row.classList.toggle("open"); });
    row.appendChild(head);
    var body = document.createElement("div"); body.className = "opf-step-body";
    var pre = document.createElement("pre"); pre.textContent = "（内容显示在这里，点击标题展开/收起）"; body.appendChild(pre);
    ST.elPre = ST.elPre || {}; ST.elPre[p.id] = pre;
    row.appendChild(body);
    if (p.key !== "final") {
      var ref = document.createElement("div"); ref.className = "opf-step-ref";
      var tag = document.createElement("span"); tag.className = "opf-ref-tag"; tag.id = "opf-ref-tag-" + p.id; tag.textContent = "先跑出本步后可精修";
      var chips = document.createElement("div"); chips.id = "opf-ref-chips-" + p.id;
      var r1 = document.createElement("div"); r1.className = "opf-step-ref-row";
      var inp = document.createElement("input"); inp.type = "text"; inp.className = "opf-ref-input"; inp.id = "opf-ref-input-" + p.id; inp.placeholder = "输入本步精修方向…"; inp.disabled = true;
      var doB = document.createElement("button"); doB.type = "button"; doB.className = "opf-step-act opf-ref-do"; doB.textContent = "按方向精修本步"; doB.disabled = true;
      var sug = document.createElement("button"); sug.type = "button"; sug.className = "opf-step-act opf-ref-sug"; sug.textContent = "该步建议"; sug.disabled = true;
      doB.addEventListener("click", function (ev) { ev.stopPropagation(); refinePhase(p.id, inp.value); });
      sug.addEventListener("click", function (ev) { ev.stopPropagation(); suggestPhaseDirections(p.id); });
      r1.appendChild(inp); r1.appendChild(doB); r1.appendChild(sug);
      ref.appendChild(tag); ref.appendChild(chips); ref.appendChild(r1);
      row.appendChild(ref);
    }
    box.appendChild(row);
    if (ST.results[p.id]) { pre.textContent = ST.results[p.id]; setPhase(p.id, "ok"); enablePhaseRefine(p.id); }
  });
}function renderMetaStatus(){
  var el = getEl("opf-meta"); if (!el) return;
  el.textContent = "";
  function add(label, cls){ var sp = document.createElement("span"); sp.className = "tag " + (cls || ""); sp.textContent = label; el.appendChild(sp); }
  var c = getCtx();
  var charName = "—";
  try { if (c && c.characters && c.characterId != null && c.characters[c.characterId]) charName = c.characters[c.characterId].name || "?"; } catch (e) {}
  add("角色: " + charName);
  var s = getSettings();
  add("角色卡: " + (s.includeCard ? "自动读取" : "关闭"));
  if (s.includeWorld) {
    var wlab = ""; var wcls = "";
    if (ST.worldSource === "st") { wlab = "世界书: 酒馆激活(" + ST.worldInfo.length + "字)"; wcls = "ok"; }
    else if (String(ST.worldSource).indexOf("file") === 0) { wlab = "世界书: 文件(" + ST.worldInfo.length + "字)"; wcls = "ok"; }
    else { wlab = "世界书: 未载入(可导入文件)"; }
    add(wlab, wcls);
  } else { add("世界书: 关闭"); }
  add("主API: " + (c && typeof c.generateRaw === "function" ? "就绪" : "未就绪(检查版本)"), c && typeof c.generateRaw === "function" ? "ok" : "err");
}

function renderRunButtons(){
  var run = getEl("opf-btn-run"); var qk = getEl("opf-btn-quick"); var la = getEl("opf-launcher");
  if (run) { run.disabled = !!ST.running; run.textContent = ST.running ? "■ 运行中…" : "▶ 生成初稿"; }
  if (qk) { qk.disabled = !!ST.running; if (!ST.running) qk.textContent = "⚡ 快速初稿"; }
  if (la) { if (ST.running) la.classList.add("running"); else la.classList.remove("running"); }
}

function runFlow(quick){
  if (ST.running) { ST.stopReq = true; toast("正在停止…"); return; }
  var s = getSettings();
  var prev = s.quickMode;
  s.quickMode = !!quick;
  var p = runAll();
  if (p && typeof p.then === "function") { p.finally(function(){ s.quickMode = prev; saveSettings(); renderRunButtons(); }); }
  renderRunButtons();
}

async function runFrom(pid){
  if (ST.running) return;
  var start = -1;
  for (var i = 0; i < PHASES.length; i++) if (PHASES[i].id === pid) { start = i; break; }
  if (start < 0) return;
  if (start === 0) { renderSteps(); await runAll(); return; }
  ST.running = true; ST.stopReq = false;
  ST._freshDraft = (start === 0);
  dirsReset();
  try {
    ST.userName = currentUserName();
    var msgs = [{ role: "system", content: buildSystemContent() }, { role: "user", content: buildUser0() }];
    for (var k = 0; k < start; k++) {
      var ph = PHASES[k];
      var had = ST.results[ph.id];
      if (!had) { toast("前面步骤尚未完成，请先用「生成初稿」", "warning"); ST.running = false; renderRunButtons(); return; }
      msgs.push({ role: "user", content: phasePrompt(ph) });
      msgs.push({ role: "assistant", content: had });
    }
    ST.msgs = msgs;
    for (var j = start; j < PHASES.length; j++) {
      if (isStop()) break;
      await runOne(PHASES[j]);
      if (PHASES[j].id === "final") handleModelReply(ST.results.final);
      await waitTick();
    }
    if (isStop()) toast("已停止");
  } catch (e) { toast("生成出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); }
}

function renderJsonOut(obj, warns){
  var pre = getEl("opf-json-out"); if (!pre) return;
  warns = warns || [];
  if (!obj) { pre.textContent = "（暂无可用 JSON）" + (warns.length ? "\n" + warns.map(function(w){ return "⚠ " + w.msg; }).join("\n") : ""); pre.className = "warn"; return; }
  var txt = JSON.stringify(obj, null, 2);
  if (warns.length) txt += "\n\n—— 校验提示 ——\n" + warns.map(function(w){ return "⚠ " + w.msg; }).join("\n");
  pre.textContent = txt;
  pre.className = warns.length ? "warn" : "";
}

// ============ 工作流 v2：分步精修（每步自己的精修框）+ 最后重新汇总 ============
var EXTRA_CSS = ".opf-dir-chip{display:block;text-align:left;cursor:pointer;border-radius:8px;border:1px solid rgba(255,122,138,.28);background:rgba(255,235,238,.05);color:#ffd5da;font-size:11px;line-height:1.45;padding:5px 8px;margin:3px 0;transition:all .14s ease}.opf-dir-chip:hover{background:rgba(255,77,94,.16);border-color:rgba(255,150,165,.55);box-shadow:0 0 8px rgba(255,77,94,.28)}.opf-dim{font-size:11px;color:rgba(255,200,208,.5);padding:2px 0;line-height:1.5}.opf-step-ref{display:flex;flex-direction:column;gap:4px;padding:2px 9px 8px 30px}.opf-step-ref-row{display:flex;gap:5px;flex-wrap:wrap;align-items:center}.opf-ref-input{flex:1 1 150px;min-width:110px;border-radius:7px;padding:4px 7px;font-size:10.5px;color:#ffeef1;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none}.opf-ref-input:focus{border-color:rgba(255,110,125,.6);box-shadow:0 0 6px rgba(255,77,94,.25)}.opf-ref-tag{font-size:9.5px;color:#8fd6ff;background:rgba(60,140,200,.15);border:1px solid rgba(120,190,255,.3);border-radius:10px;padding:0 6px;line-height:1.6}.opf-ref-tag.dirty{color:#ffd9a3;background:rgba(200,130,40,.16);border-color:rgba(255,180,90,.4)}#opf-resum-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px}";