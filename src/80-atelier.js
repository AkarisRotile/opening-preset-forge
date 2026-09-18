//@module 80-atelier — ⑧ 造物工坊：单件生成（YAML）+ 长期工作区 + 交火分析
// ============================================================================
// v1.16.0 造物工坊
// 用途：单独造一件东西——装备 / 技能 / 道具 / 资产 / 二创种族 / 二创地区 / 自定义，
//       产出统一为 YAML；也可以把一件东西当"部件"长期攒着，按工作区归档，
//       勾选若干条一起发给 AI（联动上下文），并做「交火分析」查互相冲突。
//
// 状态划分（刻意分开，别互相污染）：
//   data state   ST.atl.spaces / ST.atl.items —— 长期保存的条目，存 IndexedDB
//   draft state  ST.atl.buf                   —— 当前编辑区（需求/参考/产出），存 localStorage
//   ui state     ST.atl.meta                  —— 当前打开的条目、勾选、折叠、上次返回
// 隔离承诺：只发勾选的条目；未勾选的一条都不会进提示词。
// ============================================================================
var ATL_DB_NAME = NS + '_atelier';
var LS_ATL_KEY = NS + '_atelierdraft_v1';
var ATL_CTX_MAX = 30000;          // 联动上下文上限（字符）；超了按整条丢弃并如实报告
var ATL_HIST_MAX = 12;            // 编辑区撤回栈深度
var ATL_SPACE_DEFAULT = '未归档';

// ---------- 类型目录：字段骨架照着世界里「之书」的格式来 ----------
var ATL_KINDS = [
  {
    id: 'skill', label: '技能', noun: '技能', book: '《技能之书》',
    hint: '技能分攻击技（消耗[攻击]、造成即时伤害、必填威力）与动作技（消耗[动作]、禁止即时伤害与威力，用于治疗/控制/增益/减益/功能，可含 DoT）；核心功能「伤害」只有攻击技可用。',
    yaml: [
      '名称: ',
      '品质: ',
      '类型: 攻击技',
      '标签:',
      '  - ',
      '  - ',
      '威力: ',
      '效果:',
      '  - 效果名: ',
      '    效果内容: ',
      '背景: '
    ].join('\n'),
    fields: ['名称', '品质', '类型', '标签', '效果', '背景']
  },
  {
    id: 'equip', label: '装备', noun: '装备', book: '《装备之书》',
    hint: '装备分武器 / 防具 / 饰品；世界口径：装备不增减持有者属性，效果只写机制（触发条件、次数、特殊判定）。',
    yaml: [
      '名称: ',
      '品质: ',
      '类型: 武器',
      '标签:',
      '  - ',
      '效果:',
      '  - 效果名: ',
      '    效果内容: ',
      '背景: '
    ].join('\n'),
    fields: ['名称', '品质', '类型', '标签', '效果', '背景']
  },
  {
    id: 'item', label: '道具', noun: '道具', book: '《道具之书》',
    hint: '道具分消耗品 / 高级材料 / 施法媒介 / 其他；消耗品要写清使用条件与持续时间。',
    yaml: [
      '名称: ',
      '品质: ',
      '类型: 消耗品',
      '标签:',
      '  - ',
      '效果:',
      '  - 效果名: ',
      '    效果内容: ',
      '背景: '
    ].join('\n'),
    fields: ['名称', '品质', '类型', '标签', '效果', '背景']
  },
  {
    id: 'asset', label: '资产', noun: '资产', book: '《资产之书》',
    hint: '资产要写全：类型 / 标签 / 总空间 / 结算 / 描述 / 位置 / 内部资产（名称·品质·标签·数量·总占用空间·效果·描述）；数量与空间必须自洽；金额统一用 Z 计价（如「资产估价: 数值Z 当地货币名」）。',
    yaml: [
      '名称: ',
      '品质: ',
      '类型: 住宅',
      '标签:',
      '  - ',
      '总空间: ',
      '结算: ',
      '位置: ',
      '描述: ',
      '内部资产:',
      '  - 名称: ',
      '    品质: ',
      '    标签:',
      '      - ',
      '    数量: 1',
      '    总占用空间: ',
      '    效果:',
      '      - 效果名: ',
      '        效果内容: ',
      '    描述: '
    ].join('\n'),
    fields: ['名称', '品质', '类型', '标签', '总空间', '结算', '位置', '描述', '内部资产']
  },
  {
    id: 'race', label: '二创种族', noun: '种族', book: '（二创种族，不受之书格式限制）',
    hint: '二创种族要能立刻被人用起来：外观与体质写具体，天赋能力写成可玩的机制，文化与社会写它怎么过日子，与其他种族的关系写冲突与偏见。',
    yaml: [
      '名称: ',
      '别称: ',
      '概述: ',
      '外观: ',
      '体质与寿命: ',
      '天赋能力:',
      '  - 能力名: ',
      '    说明: ',
      '文化与社会: ',
      '聚居与分布: ',
      '与其他种族的关系: ',
      '传闻: '
    ].join('\n'),
    fields: ['名称', '概述', '外观', '天赋能力', '文化与社会']
  },
  {
    id: 'region', label: '二创地区', noun: '地区', book: '（二创地区，不受之书格式限制）',
    hint: '二创地区要写得出画面与用得上：地理气候、主要势力、可去的城镇地标、风土物产、以及一条能当引子的传闻。',
    yaml: [
      '名称: ',
      '别称: ',
      '概述: ',
      '地理与气候: ',
      '主要势力:',
      '  - 名称: ',
      '    性质: ',
      '    说明: ',
      '城镇与地标:',
      '  - 名称: ',
      '    说明: ',
      '风土与物产:',
      '  - ',
      '传闻: '
    ].join('\n'),
    fields: ['名称', '概述', '地理与气候', '主要势力', '城镇与地标', '传闻']
  },
  {
    id: 'custom', label: '自定义', noun: '条目', book: '（自定义，字段由需求决定）',
    hint: '自定义条目：先按需求确定字段，再逐字段写值；字段名用简短中文，层级不要超过三层。',
    yaml: [
      '名称: ',
      '概述: ',
      '细节:',
      '  - '
    ].join('\n'),
    fields: ['名称', '概述']
  }
];
function atlKind(id) {
  return ATL_KINDS.filter(function (k) { return k.id === id; })[0] || ATL_KINDS[0];
}

var ATL_CSS = '#opf-page-atelier{font-size:13px}'
  + '#opf-page-atelier .atl-space{border:1px solid rgba(255,122,138,.22);border-radius:10px;margin:7px 0;background:rgba(255,235,238,.03);overflow:hidden}'
  + '#opf-page-atelier .atl-space>summary{display:flex;flex-wrap:wrap;align-items:center;gap:7px;padding:7px 9px;cursor:pointer;list-style:none;background:rgba(255,77,94,.06)}'
  + '#opf-page-atelier .atl-space>summary::-webkit-details-marker{display:none}'
  + '#opf-page-atelier .atl-space>summary::before{content:"▸";color:#ff8a95}'
  + '#opf-page-atelier .atl-space[open]>summary::before{content:"▾"}'
  + '#opf-page-atelier .atl-space-name{flex:1 1 140px;min-width:0;border:0;background:transparent;color:#ffeef1;font-size:12.5px;font-weight:600;padding:2px 4px;border-bottom:1px dashed rgba(255,122,138,.25)}'
  + '#opf-page-atelier .atl-space-name:focus{outline:none;border-bottom-color:rgba(255,150,165,.75)}'
  + '#opf-page-atelier .atl-item{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:5px 9px;border-top:1px solid rgba(255,122,138,.14)}'
  + '#opf-page-atelier .atl-item.sel{background:rgba(255,77,94,.10)}'
  + '#opf-page-atelier .atl-item input[type=checkbox]{width:18px;height:18px;min-width:18px;accent-color:#ff4d5e;cursor:pointer}'
  + '#opf-page-atelier .atl-item-name{flex:1 1 130px;min-width:0;border:0;background:transparent;color:#ffeef1;font-size:12px;padding:2px 4px;border-bottom:1px dashed rgba(255,122,138,.2)}'
  + '#opf-page-atelier .atl-item-name:focus{outline:none;border-bottom-color:rgba(255,150,165,.7)}'
  + '#opf-page-atelier .atl-open{font-size:11px;padding:3px 7px;min-height:30px}'
  + '#opf-page-atelier .atl-item-meta{font-size:10.5px;color:rgba(255,200,208,.5)}'
  + '#opf-page-atelier .atl-empty{font-size:11.5px;color:rgba(255,200,208,.45);padding:6px 9px}'
  + '#opf-page-atelier textarea.opf-char-input{width:100%}'
  + '#opf-page-atelier .opf-box{white-space:pre-wrap;word-break:break-word}';
var ATL_HTML = '<div class="opf-char-wrap">'
  + '<div class="opf-sec-label">✦ 造物工坊 · 单件生成 + 长期工作区</div>'
  + '<div class="opf-dim">流程：写需求（可选参考格式）→ 选类型 → 🎨 生成 YAML → 🔎 自检 → 用改进框提要求让 AI 改（可撤回）。产出可以 📥 存成条目攒进「工作区」；<b>勾选的条目会在下一次生成/改进/交火分析时一起发给 AI</b>，没勾的一条都不会发出去。</div>'

  + '<div class="opf-sec"><div class="opf-sec-label">① 需求与参考</div></div>'
  + '<div class="opf-step-ref-row">'
  + '<label class="opf-opt">类型<select id="opf-atl-kind" class="opf-ref-input"></select></label>'
  + '<label class="opf-opt">条目名<input id="opf-atl-name" class="opf-ref-input" placeholder="可留空，生成后自动填"></label>'
  + '</div>'
  + '<textarea id="opf-atl-req" class="opf-char-input" style="min-height:80px" placeholder="需求与想法（越具体越好）：例「给女主做一把冰系太刀，稀有品质，出手时能冻住对方一回合，代价是自身也吃一点寒意」"></textarea>'
  + '<textarea id="opf-atl-ref" class="opf-char-input" style="min-height:60px" placeholder="参考内容（可不填）：粘一段别处的格式/样例，模型只当格式参考，不会照抄内容"></textarea>'
  + '<div class="opf-char-tools">'
  + '<button type="button" class="opf-btn primary" id="opf-atl-gen">🎨 生成 YAML</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-ping">🩺 连通性自检</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-last">📄 上次返回</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-kinds">📐 字段骨架速查</button>'
  + '</div>'
  + '<div class="opf-dim" id="opf-atl-status">就绪</div>'
  + '<pre id="opf-atl-lastraw" class="opf-box opf-char-report" style="display:none">尚未调用</pre>'
  + '<pre id="opf-atl-kindsbox" class="opf-box opf-char-report" style="display:none">尚未展开</pre>'

  + '<div class="opf-sec"><div class="opf-sec-label">② 本次产出（YAML 本体，可直接手改）</div></div>'
  + '<textarea id="opf-atl-out" class="opf-char-input" style="min-height:240px" placeholder="生成结果会出现在这里（只有 YAML 本体，不含代码块围栏）"></textarea>'
  + '<div class="opf-char-tools">'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-check">🔎 自检</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-undo">↩ 撤回上次改动</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-copy">⧉ 复制</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-download">💾 下载 .yaml</button>'
  + '<button type="button" class="opf-btn primary" id="opf-atl-save">📥 存成条目</button>'
  + '</div>'
  + '<pre id="opf-atl-lint" class="opf-box opf-char-report">尚未自检</pre>'

  + '<div class="opf-sec"><div class="opf-sec-label">③ 改进（提要求 → AI 改 → 可撤回）</div></div>'
  + '<textarea id="opf-atl-dir" class="opf-char-input" style="min-height:60px" placeholder="例：品质降到优良；补一条反噬代价；标签加上「冰」；把它改成像勾选的那两件同一体系"></textarea>'
  + '<div class="opf-char-tools">'
  + '<button type="button" class="opf-btn primary" id="opf-atl-fix">✨ 按这条要求改进</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-sug">💡 建议</button>'
  + '</div>'
  + '<div class="opf-step-ref" id="opf-atl-chips"></div>'

  + '<div class="opf-sec"><div class="opf-sec-label">④ 工作区（长期保存 · 勾选的条目会一起发给 AI）</div></div>'
  + '<div class="opf-step-ref-row">'
  + '<label class="opf-opt">存放工作区<select id="opf-atl-space" class="opf-ref-input"></select></label>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-newspace">＋ 新建工作区</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-regroup">⇅ 按类型归档</button>'
  + '</div>'
  + '<div class="opf-char-tools">'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-all">☑ 全选</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-none">☐ 全不选</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-export">⧉ 导出全部</button>'
  + '<label class="opf-btn ghost" style="margin:0">📥 导入<input type="file" id="opf-atl-import" accept=".json,.txt" style="display:none"></label>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-wipe">🗑 清空工作区</button>'
  + '</div>'
  + '<div class="opf-dim" id="opf-atl-ctxnote">联动上下文：未勾选任何条目（只发当前这一件）</div>'
  + '<div id="opf-atl-spaces"></div>'

  + '<div class="opf-sec"><div class="opf-sec-label">⑤ 交火分析（把勾选的条目放在一起查冲突）</div></div>'
  + '<div class="opf-step-ref-row">'
  + '<label class="opf-opt"><input type="checkbox" id="opf-atl-usewb"> 附世界书参考（② 页勾选）</label>'
  + '<button type="button" class="opf-btn primary" id="opf-atl-cross">🔥 交火分析</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-crosstodir">📋 报告填进改进框</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-atl-crosscopy">⧉ 复制报告</button>'
  + '</div>'
  + '<pre id="opf-atl-crossout" class="opf-box opf-char-report">尚未分析</pre>'
  + '</div>';

// ============================================================================
// 存储层：IndexedDB（首选）→ localStorage（退化）→ 内存（再退化）
// 三条路径共用同一组函数，页面代码不需要知道当前用的是哪条。
// ============================================================================
var ATL_STORES = ['spaces', 'items', 'meta'];
var ATL_MEM = { spaces: {}, items: {}, meta: {} };
var atlStoreMode = '';           // '' 未探测 | 'idb' | 'mem'
function atlDb() {
  return new Promise(function (resolve, reject) {
    try {
      if (typeof indexedDB === 'undefined') { reject(new Error('当前环境不支持 IndexedDB')); return; }
      var req = indexedDB.open(ATL_DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        ATL_STORES.forEach(function (s) { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB 打开失败')); };
    } catch (e) { reject(e); }
  });
}
function atlTx(store, mode, fn) {
  return atlDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, mode);
      var os = tx.objectStore(store);
      var out = fn(os);
      tx.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error); };
    });
  });
}
function atlMemLoad() {
  var c = lsGet(LS_ATL_KEY + '_store');
  if (c && typeof c === 'object') {
    ATL_STORES.forEach(function (s) { ATL_MEM[s] = (c[s] && typeof c[s] === 'object') ? c[s] : {}; });
  }
}
function atlMemSave() { try { lsSet(LS_ATL_KEY + '_store', ATL_MEM); } catch (e) { opfErr('atlMemSave', e); } }
// 首次调用时探测一次：IndexedDB 用不了就整体退化为内存（仍会尽力写 localStorage）
async function atlStoreAll(store) {
  if (atlStoreMode !== 'mem') {
    try {
      var rows = await atlTx(store, 'readonly', function (os) { return os.getAll(); });
      atlStoreMode = 'idb';
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      atlStoreMode = 'mem';
      atlMemLoad();
      opfLog('[atelier] IndexedDB 不可用，已退化为本地缓存：' + (e && e.message ? e.message : e));
    }
  }
  return Object.keys(ATL_MEM[store] || {}).map(function (k) { return ATL_MEM[store][k]; });
}
async function atlStorePut(store, rec) {
  if (atlStoreMode !== 'mem') {
    try { await atlTx(store, 'readwrite', function (os) { os.put(rec); return { result: rec }; }); atlStoreMode = 'idb'; return true; }
    catch (e) { atlStoreMode = 'mem'; atlMemLoad(); opfLog('[atelier] 写入退化为本地缓存：' + (e && e.message ? e.message : e)); }
  }
  ATL_MEM[store][rec.id] = rec; atlMemSave(); return true;
}
async function atlStoreDel(store, id) {
  if (atlStoreMode !== 'mem') {
    try { await atlTx(store, 'readwrite', function (os) { os.delete(id); return { result: true }; }); return true; }
    catch (e) { atlStoreMode = 'mem'; atlMemLoad(); }
  }
  delete ATL_MEM[store][id]; atlMemSave(); return true;
}
async function atlStoreClear(store) {
  if (atlStoreMode !== 'mem') {
    try { await atlTx(store, 'readwrite', function (os) { os.clear(); return { result: true }; }); return true; }
    catch (e) { atlStoreMode = 'mem'; atlMemLoad(); }
  }
  ATL_MEM[store] = {}; atlMemSave(); return true;
}

// ---------- 状态与初始化 ----------
// 取元素统一走这里：在没有 DOM 的环境（离线验收/脚本复用）里返回 null，不抛异常
function atlEl(id) { return (typeof document !== 'undefined' && document) ? document.getElementById(id) : null; }
function atlUuid() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return 'axxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function atlInit() {
  if (!ST.atl) {
    ST.atl = {
      spaces: [], items: [], meta: { activeItemId: '', usewb: false, lastRaw: '', report: '' },
      buf: { itemId: '', kind: 'skill', name: '', req: '', ref: '', yaml: '', dir: '' },
      hist: [], loaded: false, loading: false, storeMode: ''
    };
  }
  return ST.atl;
}
async function atlLoad() {
  var A = atlInit();
  if (A.loading) return A;
  A.loading = true;
  try {
    var sp = await atlStoreAll('spaces');
    var it = await atlStoreAll('items');
    var mt = await atlStoreAll('meta');
    A.spaces = sp.filter(function (x) { return x && x.id; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    A.items = it.filter(function (x) { return x && x.id; }).sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
    var m = mt.filter(function (x) { return x && x.id === 'ui'; })[0];
    if (m) A.meta = Object.assign({}, A.meta, { activeItemId: m.activeItemId || '', usewb: !!m.usewb, lastRaw: m.lastRaw || '', report: m.report || '' });
    if (!A.spaces.length) {
      var s0 = { id: atlUuid(), name: ATL_SPACE_DEFAULT, open: true, order: 0, createdAt: Date.now() };
      A.spaces.push(s0);
      await atlStorePut('spaces', s0);
    }
    A.loaded = true;
    A.storeMode = atlStoreMode;
  } catch (e) {
    opfErr('atlLoad', e);
    toast('工作区读取失败：' + (e && e.message ? e.message : e), 'error');
  } finally {
    A.loading = false;
  }
  return A;
}
function atlDraftSave() {
  var A = atlInit();
  if (atlDraftSave._t) clearTimeout(atlDraftSave._t);
  atlDraftSave._t = setTimeout(function () {
    lsSet(LS_ATL_KEY, { buf: A.buf, meta: { activeItemId: A.meta.activeItemId, usewb: A.meta.usewb } });
  }, 400);
}
function atlDraftRestore() {
  var A = atlInit();
  var c = lsGet(LS_ATL_KEY);
  if (c && c.buf && typeof c.buf === 'object') {
    ['itemId', 'kind', 'name', 'req', 'ref', 'yaml', 'dir'].forEach(function (k) { if (typeof c.buf[k] === 'string') A.buf[k] = c.buf[k]; });
  }
  if (c && c.meta && typeof c.meta === 'object') {
    if (c.meta.activeItemId) A.meta.activeItemId = c.meta.activeItemId;
    if (c.meta.usewb) A.meta.usewb = true;
  }
}
async function atlSaveMeta() {
  var A = atlInit();
  await atlStorePut('meta', { id: 'ui', activeItemId: A.meta.activeItemId || '', usewb: !!A.meta.usewb, lastRaw: String(A.meta.lastRaw || '').slice(0, 20000), report: String(A.meta.report || '').slice(0, 20000) });
}

// ---------- 条目 / 工作区 CRUD ----------
function atlSpace(id) { var A = atlInit(); return A.spaces.filter(function (s) { return s.id === id; })[0] || null; }
function atlItem(id) { var A = atlInit(); return A.items.filter(function (x) { return x.id === id; })[0] || null; }
function atlItemsOf(spaceId) { var A = atlInit(); return A.items.filter(function (x) { return x.spaceId === spaceId; }); }
function atlSelected() { return atlInit().items.filter(function (x) { return x.sel; }); }
function atlEnsureSpace(name) {
  var A = atlInit();
  var nm = String(name || ATL_SPACE_DEFAULT).trim() || ATL_SPACE_DEFAULT;
  var hit = A.spaces.filter(function (s) { return s.name === nm; })[0];
  if (hit) return hit;
  var s = { id: atlUuid(), name: nm, open: true, order: A.spaces.length, createdAt: Date.now() };
  A.spaces.push(s);
  atlStorePut('spaces', s);
  return s;
}
async function atlPutItem(it) {
  var A = atlInit();
  it.updatedAt = Date.now();
  var i = A.items.map(function (x) { return x.id; }).indexOf(it.id);
  if (i >= 0) A.items[i] = it; else A.items.push(it);
  await atlStorePut('items', it);
  atlDraftSave();
  return it;
}
async function atlDropItem(id) {
  var A = atlInit();
  A.items = A.items.filter(function (x) { return x.id !== id; });
  if (A.buf.itemId === id) { A.buf.itemId = ''; A.meta.activeItemId = ''; }
  await atlStoreDel('items', id);
  await atlSaveMeta();
}
// 存成条目：绑定了条目就更新它，否则按「存放工作区」新建（也可显式指定工作区）
async function atlSaveAsItem(spaceId) {
  var A = atlInit();
  var yaml = String(A.buf.yaml || '').trim();
  if (!yaml) { toast('产出还是空的：先点「🎨 生成 YAML」或手写一点内容', 'warning'); return null; }
  var kind = atlKind(A.buf.kind);
  var name = String(A.buf.name || '').trim() || atlGuessName(yaml) || ('未命名' + kind.label);
  if (A.buf.itemId && atlItem(A.buf.itemId)) {
    var old = atlItem(A.buf.itemId);
    var upd = Object.assign({}, old, { name: name, kind: A.buf.kind, req: A.buf.req, ref: A.buf.ref, yaml: yaml, prev: old.yaml || '', prevAt: Date.now() });
    await atlPutItem(upd);
    toast('已更新条目「' + name + '」（旧版留在行内「↩」里）', 'success');
    atlRender();
    return upd;
  }
  var sel = atlEl('opf-atl-space');
  var space = (spaceId && atlSpace(spaceId)) || atlSpace(sel && sel.value) || atlEnsureSpace(ATL_SPACE_DEFAULT);
  var it = {
    id: atlUuid(), spaceId: space.id, name: name, kind: A.buf.kind, req: A.buf.req, ref: A.buf.ref, yaml: yaml,
    sel: true, createdAt: Date.now(), updatedAt: Date.now(), prev: ''
  };
  await atlPutItem(it);
  A.buf.itemId = it.id;
  A.meta.activeItemId = it.id;
  await atlSaveMeta();
  toast('已存进工作区「' + space.name + '」（默认勾选，会随下次生成一起发给 AI）', 'success');
  atlRender();
  return it;
}
function atlGuessName(yaml) {
  var m = String(yaml || '').match(/^\s*名称\s*:\s*(.+)$/m);
  if (!m) return '';
  return m[1].replace(/^["']|["']$/g, '').trim().slice(0, 40);
}

// ============================================================================
// YAML 工具：抽正文 + 脚本自检（不依赖任何 YAML 库）
// ============================================================================
function atlExtractYaml(text) {
  var t = String(text || '');
  var F = fence();
  var i = t.indexOf(F + 'yaml');
  if (i < 0) i = t.indexOf(F + 'yml');
  if (i < 0) i = t.indexOf(F);
  if (i >= 0) {
    var s = t.indexOf('\n', i);
    var e = t.indexOf(F, s + 1);
    t = s >= 0 ? (e > s ? t.slice(s + 1, e) : t.slice(s + 1)) : t;
  }
  return t.replace(/^\s*(?:yaml|yml)\s*\n/i, '').replace(/^\n+/, '').replace(/\s+$/, '');
}
// 逐行扫描：缩进栈 + 键值行统计
function atlYamlScan(text) {
  var lines = String(text || '').split(/\r?\n/);
  var rows = [], topKeys = [], stack = [];
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    if (!raw.trim()) { rows.push({ n: i + 1, raw: raw, kind: 'blank' }); continue; }
    var ind = (raw.match(/^ */) || [''])[0].length;
    var body = raw.slice(ind);
    var kind = 'kv';
    if (/^#/.test(body)) kind = 'comment';
    else if (/^-\s/.test(body) || body === '-') kind = 'dash';
    else if (!/^[^:]+:(\s|$)/.test(body)) kind = 'plain';
    var key = '';
    if (kind === 'kv') key = body.slice(0, body.indexOf(':')).trim();
    else if (kind === 'dash' && /^-\s+[^:]+:(\s|$)/.test(body)) key = body.replace(/^-\s+/, '').split(':')[0].trim();
    rows.push({ n: i + 1, raw: raw, ind: ind, body: body, kind: kind, key: key });
    if (kind === 'comment' || kind === 'blank') continue;
    while (stack.length && stack[stack.length - 1].ind >= ind) stack.pop();
    if (kind === 'kv' && key && ind === 0) topKeys.push(key);
    stack.push({ ind: ind, key: key, n: i + 1 });
  }
  return { rows: rows, topKeys: topKeys };
}
// 自检：返回 { stats, issues }，issues[].level = 'error' | 'warn'
function atlYamlLint(text, kindId) {
  var t = String(text || '');
  var kind = atlKind(kindId);
  var issues = [];
  var lines = t.split(/\r?\n/);
  var nonEmpty = lines.filter(function (l) { return l.trim() && !/^\s*#/.test(l); });
  var chars = t.length;
  if (!t.trim()) return { stats: { lines: 0, chars: 0, fields: 0 }, issues: [{ level: 'error', msg: '产出是空的：先点「🎨 生成 YAML」' }] };
  if (/\t/.test(t)) issues.push({ level: 'error', msg: '含 Tab 字符：YAML 不允许用 Tab 缩进（请全部改成空格）' });
  if (/^\s*---\s*$/m.test(t) || /^\s*\.\.\.\s*$/m.test(t)) issues.push({ level: 'warn', msg: '出现 YAML 文档分隔符（--- / ...）：单件条目不需要，部分解析器会把它当成第二份文档' });
  // 全角冒号当分隔符（中文输入法最常见的坑）
  lines.forEach(function (l, i) {
    if (/^\s*#/.test(l)) return;
    var body = l.replace(/^\s*-\s*/, '');
    if (body.indexOf(':') >= 0) return;
    if (/^[^\s:：][^:：]{0,30}：/.test(body)) issues.push({ level: 'error', msg: '第 ' + (i + 1) + ' 行用了全角冒号「：」当键分隔符：YAML 只认半角「: 」（值里用全角冒号没问题）' });
  });
  // 缩进与引号
  lines.forEach(function (l, i) {
    if (!l.trim()) return;
    var ind = (l.match(/^ */) || [''])[0].length;
    if (ind % 2 !== 0) issues.push({ level: 'warn', msg: '第 ' + (i + 1) + ' 行缩进是 ' + ind + ' 个空格：建议保持 2 的倍数' });
    var q1 = (l.match(/"/g) || []).length, q2 = (l.match(/'/g) || []).length;
    if (q1 % 2 !== 0 || q2 % 2 !== 0) issues.push({ level: 'warn', msg: '第 ' + (i + 1) + ' 行引号没有配对（" ' + q1 + ' 个 / \' ' + q2 + ' 个）' });
    var o1 = (l.match(/\[/g) || []).length, c1 = (l.match(/\]/g) || []).length;
    if (o1 !== c1) issues.push({ level: 'warn', msg: '第 ' + (i + 1) + ' 行方括号不配对（[ ' + o1 + ' / ] ' + c1 + '）' });
  });
  // 冒号后面没空格：YAML 要求 `键: 值`；`范围:4` 这种写法容易被解析成嵌套映射（值里带冒号请加引号）
  lines.forEach(function (l, i) {
    if (!l.trim() || /^\s*#/.test(l)) return;
    var mm = l.match(/^(\s*)(?:-\s*)?([\u4e00-\u9fa5\w][^:\s]*):(\S.*)$/);
    if (!mm) return;
    if (/^\/\//.test(mm[3])) return;                      // URL 之类：https://…
    if (mm[3].indexOf('"') === 0 || mm[3].indexOf("'") === 0) return;
    issues.push({ level: 'warn', msg: '第 ' + (i + 1) + ' 行冒号后面没有空格（' + mm[2] + ':' + mm[3].slice(0, 12) + '）：YAML 要写 `键: 值`；值里带冒号请加引号，如 `- "范围:4"`' });
  });
  // 重复键 / 空值 / 占位符
  // 注意作用域：列表项（`- 效果名: …`）各自是一次独立的映射，同名键在不同项里不算重复，
  // 所以只对普通键行去重，作用域取「最近一个祖先列表项的行号」。
  var scan = atlYamlScan(t);
  var seen = {}, dup = [], dashStack = [];
  scan.rows.forEach(function (r) {
    if (r.kind === 'comment' || r.kind === 'blank') return;
    while (dashStack.length && (r.ind || 0) <= dashStack[dashStack.length - 1].ind) dashStack.pop();
    var scope = dashStack.length ? dashStack[dashStack.length - 1].n : 0;
    if (r.kind === 'dash') { dashStack.push({ ind: r.ind || 0, n: r.n }); return; }
    if (r.kind !== 'kv' || !r.key) return;
    var k = scope + '|' + r.ind + '|' + r.key;
    if (seen[k]) dup.push(r.key + '（第 ' + seen[k] + ' 行与第 ' + r.n + ' 行）'); else seen[k] = r.n;
  });
  if (dup.length) issues.push({ level: 'warn', msg: '同一层级出现重复键：' + dup.slice(0, 4).join('、') + '（后者会覆盖前者）' });
  // 空值：只有「后面没有更深一层的内容」时才算没填（`标签:` 后跟列表是正常写法）
  var ph = [];
  scan.rows.forEach(function (r, idx) {
    if (r.kind === 'comment' || r.kind === 'blank') return;
    if (/\{[^}]*\}|<[^>]{1,20}>|\bTODO\b|\bXXX\b|待定|待填/.test(r.raw)) { ph.push(r.n); return; }
    var empty = /^[^:#]+:\s*$/.test(r.body) || /^-\s*$/.test(r.body) || /^-\s*[^:]+:\s*$/.test(r.body);
    if (!empty) return;
    var hasChild = false;
    for (var k2 = idx + 1; k2 < scan.rows.length; k2++) {
      var nx = scan.rows[k2];
      if (nx.kind === 'blank' || nx.kind === 'comment') continue;
      if ((nx.ind || 0) > (r.ind || 0)) hasChild = true;
      break;
    }
    if (!hasChild) ph.push(r.n);
  });
  if (ph.length) issues.push({ level: 'warn', msg: '有 ' + ph.length + ' 处空值或占位符没填（第 ' + ph.slice(0, 6).join('、') + ' 行）：确认不是漏写或忘替换' });
  // 骨架字段缺失
  var missing = (kind.fields || []).filter(function (f) { return !new RegExp('^\\s*(?:-\\s*)?' + f + '\\s*:', 'm').test(t); });
  if (missing.length) issues.push({ level: 'warn', msg: '缺「' + kind.label + '」骨架字段：' + missing.join('、') + '（可以增补字段，但骨架字段不该少）' });
  var errN = issues.filter(function (x) { return x.level === 'error'; }).length;
  return {
    stats: { lines: nonEmpty.length, chars: chars, fields: scan.topKeys.length, kind: kind.label, topKeys: scan.topKeys },
    issues: issues, ok: errN === 0
  };
}

// ============================================================================
// 提示词：联动上下文只含勾选条目；每条都带类型与名称，超限按整条丢弃并报告
// ============================================================================
function atlCtxBundle() {
  var picked = atlSelected();
  var parts = [], used = 0, dropped = [];
  picked.forEach(function (it) {
    var block = '【' + atlKind(it.kind).label + '·' + (it.name || '未命名') + '】\n' + String(it.yaml || '').trim();
    if (used + block.length > ATL_CTX_MAX) { dropped.push(it.name || '未命名'); return; }
    used += block.length;
    parts.push(block);
  });
  return { text: parts.join('\n\n'), count: parts.length, chars: used, dropped: dropped, total: picked.length };
}
function atlCtxBlock() {
  var b = atlCtxBundle();
  if (!b.count) return '';
  var L = ['[联动条目（工作区里勾选的 ' + b.count + ' 条，' + b.chars + ' 字符）]',
    '这些是{{user}}已经攒下来的部件，只作为**参考与约束**：口径、命名、数值量级、体系要和它们相容；',
    '不要照抄它们的内容，也不要改动它们；本次只产出/修改下面指定的那一件。'];
  if (b.dropped.length) L.push('（因上下文上限省略了 ' + b.dropped.length + ' 条：' + b.dropped.join('、') + '——如需一起参考，请减少勾选数量）');
  L.push(b.text);
  return L.join('\n');
}
function atlWorldRules() { return (typeof WORLD_RULES === 'string' ? WORLD_RULES : ''); }
function atlSystem(kindId) {
  var kind = atlKind(kindId);
  var L = [];
  L.push('[角色] ' + macroFill('你是始弦，大图书馆的司书。你把{{user}}当作挚友，说话直接、不绕弯子；这一次你只负责把东西造出来，不写多余的解释。'));
  L.push('[任务] 为{{user}}造一件' + kind.noun + '，并按【字段骨架】输出 YAML。'
    + (kind.book ? '格式照' + kind.book + '来。' : '')
    + (kind.hint ? '\n[本类型的要点] ' + kind.hint : ''));
  L.push('[字段骨架（字段名照抄，可以按需求增补字段，但骨架字段一个都不能少）]\n' + kind.yaml);
  L.push([ATL_OUTPUT_RULES, CHAR_STYLE_RULES].join('\n'));
  if (atlWorldRules()) L.push('[世界口径（数值与品级一律遵守）]\n' + atlWorldRules());
  var ctx = atlCtxBlock();
  if (ctx) L.push(ctx);
  return macroFill(L.join('\n\n'));
}
var ATL_OUTPUT_RULES = [
  '【输出硬约束】',
  '1. 只输出一个 ' + fence() + 'yaml 代码块，块内是这一件的 YAML 本体；块外不写任何解释、不要 markdown 标题或加粗。',
  '2. 用半角冒号加一个空格写键值（`名称: 霜罗`），不要用全角「：」；缩进只用空格、每次 2 格，禁止 Tab。',
  '3. 值里若含冒号（如标签「范围:4」）必须加引号：`- "范围:4"`。',
  '4. 不要写 `---` 文档分隔符，不要留 `{占位符}`、`待定`、空值。',
  '5. 品质只能是：普通 / 优良 / 稀有 / 史诗 / 传说 / 神话 / 唯一；不要自造品级。',
  '6. 描述类字段（背景/描述/传闻）写 1~3 句、具体、不堆形容词；不要写"极其强大""毁天灭地"这类空话。',
  '7. 参考内容只用来对齐**格式与详略程度**，绝不照抄其中的名称、数值与措辞。'
].join('\n');
function atlGenPrompt() {
  var A = atlInit();
  var kind = atlKind(A.buf.kind);
  var L = [];
  L.push('[本次要造的' + kind.noun + '] ' + (String(A.buf.req || '').trim() || '（需求为空：按世界口径造一件' + kind.label + '，稳妥、可用、不越级）'));
  if (String(A.buf.ref || '').trim()) L.push('[参考内容（只参考格式与详略，不要照抄内容）]\n' + String(A.buf.ref).trim());
  L.push('[输出] 直接给出 ' + fence() + 'yaml 代码块，不要寒暄、不要总结。');
  return macroFill(L.join('\n\n'));
}
function atlFixPrompt(dir) {
  var A = atlInit();
  var cur = String(A.buf.yaml || '').trim();
  var kind = atlKind(A.buf.kind);
  var L = [];
  L.push('[任务] 按{{user}}的要求改进下面这一件' + kind.noun + '的 YAML。' + (atlWantsShort(dir) ? '' : '未提到的字段与内容逐字保留。'));
  L.push('[用户要求]\n' + String(dir || '').trim());
  L.push('[当前 YAML（共 ' + cur.length + ' 字符）——输出必须是改好的**完整** YAML，不是片段，不要写"其余不变"这类占位]\n' + cur);
  L.push('[完整性要求] 原始内容 ' + cur.length + ' 字符；除非用户明确要求精简，你的输出不应明显短于它。');
  L.push('[输出] 只输出一个 ' + fence() + 'yaml 代码块。');
  return macroFill(L.join('\n\n'));
}
function atlSugPrompt() {
  var A = atlInit();
  var cur = String(A.buf.yaml || '').trim();
  var L = [];
  L.push('下面是一件' + atlKind(A.buf.kind).label + '的 YAML（' + cur.length + ' 字符，节选如下）。请给出 3~5 条**具体可执行**的改进方向，每条一行、不超过 40 字，直接写怎么做（例如"把品质降到优良并补一条反噬代价"）。不要输出 YAML 本体，不要解释。');
  L.push(cur.slice(0, 2500));
  var ctx = atlCtxBundle();
  if (ctx.count) L.push('[联动条目（仅供参考，让建议与它们相容）]\n' + ctx.text.slice(0, 1500));
  return macroFill(L.join('\n\n'));
}
function atlCrossPrompt(useWb) {
  var b = atlCtxBundle();
  var L = [];
  L.push('[待对照的部件（共 ' + b.count + ' 条，' + b.chars + ' 字符）]\n' + b.text);
  if (b.dropped.length) L.push('（因上下文上限省略了 ' + b.dropped.length + ' 条：' + b.dropped.join('、') + '）');
  if (useWb && ST.worldInfo) L.push('[世界书参考（② 页勾选，共 ' + ST.worldInfo.length + ' 字符；只作口径核对，不是修改对象）]\n' + ST.worldInfo);
  L.push('[输出] 按四段写：【严重冲突】/【口径不一致】/【重复或功能重叠】/【可选优化】；'
    + '每段内每条格式为「涉及条目 → 问题 → 建议」；某段没有问题的就写「无」。不要重抄 YAML，不要输出代码块。');
  return macroFill(L.join('\n\n'));
}
var ATL_CROSS_RULES = [
  '【交火分析规则】',
  '1. 只依据给出的部件与世界口径判断，不要引入其它作品或你自己的设定。',
  '2. 每条结论都要点名**具体条目名**与**具体字段或数值**，不要写"整体看还行"这类空话。',
  '3. 分四段：【严重冲突】（同时成立会互相打脸，必须改）、【口径不一致】（数值量级/命名/体系不统一）、【重复或功能重叠】（两件在做同一件事）、【可选优化】（加分项，不改也能用）。',
  '4. 拿不准的写进【口径不一致】并说明依据，不要猜；没有把握就写「无法判断」。',
  '5. 不修改任何部件，只出报告。'
].join('\n');

// ---------- 通用小工具 ----------
function atlWantsShort(dir) { return /精简|简化|缩短|短一点|更短|压缩|删|去掉|去除|移除|减少|瘦身|太长/.test(String(dir || '')); }
function atlShrinkSuspect(before, after, dir) {
  var b = Number(before) || 0;
  return b >= 200 && (Number(after) || 0) < b * (atlWantsShort(dir) ? 0.45 : 0.7);
}
function atlPushHist(label) {
  var A = atlInit();
  A.hist.push({ at: Date.now(), label: label || '改动', yaml: String(A.buf.yaml || '') });
  if (A.hist.length > ATL_HIST_MAX) A.hist.shift();
}
function atlUndo() {
  var A = atlInit();
  var last = A.hist.pop();
  if (!last) { toast('没有可撤回的改动', 'warning'); return false; }
  A.buf.yaml = last.yaml;
  var out = atlEl('opf-atl-out'); if (out) out.value = last.yaml;
  toast('已撤回「' + last.label + '」（' + new Date(last.at).toLocaleTimeString() + '）', 'success');
  atlLintRun();
  atlDraftSave();
  return true;
}
function atlCopyText(txt, emptyMsg) { destCopyText(String(txt || ''), emptyMsg); }
function atlDownload(name, text) {
  try {
    var blob = new Blob([String(text || '')], { type: 'text/yaml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 0);
    toast('已下载 ' + name, 'success');
  } catch (e) { toast('下载失败：' + (e && e.message ? e.message : e), 'error'); }
}
function atlStat(s) { var e = atlEl('opf-atl-status'); if (e) e.textContent = s; }
function atlSetRunning(on) {
  ['opf-atl-gen', 'opf-atl-ping', 'opf-atl-kinds', 'opf-atl-check', 'opf-atl-copy', 'opf-atl-download', 'opf-atl-save',
    'opf-atl-fix', 'opf-atl-sug', 'opf-atl-newspace', 'opf-atl-regroup', 'opf-atl-all', 'opf-atl-none', 'opf-atl-export',
    'opf-atl-wipe', 'opf-atl-cross', 'opf-atl-crosstodir', 'opf-atl-crosscopy', 'opf-atl-undo'].forEach(function (id) {
      var b = atlEl(id); if (b) b.disabled = !!on;
    });
  var g = atlEl('opf-atl-gen'); if (g) g.textContent = on ? '■ 运行中…' : '🎨 生成 YAML';
  var x = atlEl('opf-atl-cross'); if (x) x.textContent = on ? '■ 运行中…' : '🔥 交火分析';
}
async function atlCall(msgs, label, opts) {
  var o = opts || {};
  atlStat(label + '：调用模型中…');
  var t0 = Date.now();
  var resp = await callModel(msgs, o.extra);
  var A = atlInit();
  A.meta.lastRaw = String(resp || '');
  atlStat(label + '：返回 ' + A.meta.lastRaw.length + ' 字符（' + Math.round((Date.now() - t0) / 1000) + 's）');
  return A.meta.lastRaw;
}
function atlDiag(err) {
  var m = (err && err.message) ? err.message : String(err || '');
  if (/524/.test(m) && /cloudflare|timeout|cf-error/i.test(m)) return '中转站超时（Cloudflare 524）：源站 100 秒内没回字节。这一页的输出很短，多半是上游在排队——稍后重试或换个时段。';
  var code = m.match(/\b(50[234])\b/);
  if (code) return '网关返回 ' + code[1] + '（可重试类），稍后再试。';
  if (/No message generated/i.test(m)) return '模型返回空（可能被中转截断或安全策略拦下），可重试。';
  if (/aborted|Cancelled|停止/i.test(m)) return '已中止。';
  return m.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

// ============================================================================
// 动作
// ============================================================================
function atlLintRun() {
  var A = atlInit();
  var box = atlEl('opf-atl-lint'); if (!box) return null;
  var r = atlYamlLint(A.buf.yaml, A.buf.kind);
  if (!String(A.buf.yaml || '').trim()) { box.textContent = '尚未自检（产出为空）'; return r; }
  var L = [];
  var errN = r.issues.filter(function (x) { return x.level === 'error'; }).length;
  var warnN = r.issues.length - errN;
  L.push((errN ? '❌ ' : '✓ ') + '自检：' + r.stats.lines + ' 行 / ' + r.stats.chars + ' 字符 / 顶层字段 ' + r.stats.fields + ' 个（类型：' + r.stats.kind + '）'
    + (r.issues.length ? '｜错误 ' + errN + ' / 提醒 ' + warnN : '｜没有问题'));
  if (r.stats.topKeys && r.stats.topKeys.length) L.push('顶层字段：' + r.stats.topKeys.join('、'));
  r.issues.forEach(function (x) { L.push((x.level === 'error' ? '❌ ' : '⚠ ') + x.msg); });
  box.textContent = L.join('\n');
  return r;
}
function atlSyncOut() { var A = atlInit(); var o = atlEl('opf-atl-out'); if (o) o.value = String(A.buf.yaml || ''); }
function atlSyncInputsFromBuf() {
  var A = atlInit();
  var k = atlEl('opf-atl-kind'); if (k) k.value = A.buf.kind;
  var n = atlEl('opf-atl-name'); if (n) n.value = A.buf.name || '';
  var r = atlEl('opf-atl-req'); if (r) r.value = A.buf.req || '';
  var f = atlEl('opf-atl-ref'); if (f) f.value = A.buf.ref || '';
  var d = atlEl('opf-atl-dir'); if (d) d.value = A.buf.dir || '';
  atlSyncOut();
}
function atlRenderKindSelect() {
  var sel = atlEl('opf-atl-kind'); if (!sel) return;
  var A = atlInit();
  if (!sel.options.length) {
    ATL_KINDS.forEach(function (k) {
      var o = document.createElement('option'); o.value = k.id; o.textContent = k.label; sel.appendChild(o);
    });
  }
  sel.value = A.buf.kind;
}
function atlRenderSpaceSelect() {
  var sel = atlEl('opf-atl-space'); if (!sel) return;
  var A = atlInit();
  var keep = sel.value;
  sel.textContent = '';
  A.spaces.forEach(function (sp) {
    var o = document.createElement('option'); o.value = sp.id; o.textContent = sp.name; sel.appendChild(o);
  });
  if (keep && atlSpace(keep)) sel.value = keep;
}
function atlRenderCtxNote() {
  var el = atlEl('opf-atl-ctxnote'); if (!el) return;
  var b = atlCtxBundle();
  if (!b.count) { el.textContent = '联动上下文：未勾选任何条目（只发当前这一件）'; return; }
  el.textContent = '联动上下文：已勾选 ' + b.count + ' 条（' + b.chars + ' 字符）会一起发给 AI'
    + (b.dropped.length ? '｜因上限省略 ' + b.dropped.length + ' 条：' + b.dropped.join('、') : '');
}
function atlRenderKindsBox() {
  var box = atlEl('opf-atl-kindsbox'); if (!box) return;
  box.textContent = '';
  var L = ['字段骨架速查（点「插入」把骨架填进产出框，再照着写或让 AI 改）'];
  box.appendChild(document.createTextNode(L.join('\n') + '\n\n'));
  ATL_KINDS.forEach(function (k) {
    var row = document.createElement('div'); row.className = 'opf-step-ref-row'; row.style.margin = '2px 0';
    var t = document.createElement('span'); t.className = 'opf-ref-tag'; t.textContent = k.label;
    var b = document.createElement('span'); b.className = 'opf-dim'; b.textContent = '字段：' + (k.fields || []).join(' / ');
    var ins = document.createElement('button'); ins.type = 'button'; ins.className = 'opf-step-act'; ins.textContent = '插入';
    ins.addEventListener('click', function () {
      var A = atlInit();
      atlPushHist('插入骨架');
      A.buf.kind = k.id; A.buf.yaml = k.yaml;
      atlRenderKindSelect(); atlSyncOut(); atlLintRun(); atlDraftSave();
      toast('已插入「' + k.label + '」的字段骨架（把值填上，或直接让 AI 按需求生成）');
    });
    var pre = document.createElement('pre'); pre.className = 'opf-box opf-char-report'; pre.style.margin = '2px 0 8px';
    pre.textContent = k.yaml + (k.hint ? '\n\n（要点：' + k.hint + '）' : '');
    row.appendChild(t); row.appendChild(b); row.appendChild(ins);
    box.appendChild(row); box.appendChild(pre);
  });
}
// ---------- 工作区渲染（全部用 DOM 构建，模型/用户文本一律 textContent）----------
function atlItemRow(it) {
  var row = document.createElement('div'); row.className = 'atl-item' + (it.sel ? ' sel' : '');
  var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!it.sel;
  cb.title = '勾选的条目会随下一次生成/改进/交火分析一起发给 AI';
  cb.setAttribute('aria-label', '把「' + (it.name || '未命名') + '」一起发给 AI');
  cb.addEventListener('change', function () { atlToggleSel(it.id, cb.checked); });
  var tag = document.createElement('span'); tag.className = 'opf-ref-tag'; tag.textContent = atlKind(it.kind).label;
  var nm = document.createElement('input'); nm.className = 'atl-item-name'; nm.value = it.name || '';
  nm.title = '改名（失焦即保存）';
  nm.setAttribute('aria-label', '条目名');
  nm.addEventListener('change', function () { atlRenameItem(it.id, this.value); });
  var open = document.createElement('button'); open.type = 'button'; open.className = 'opf-step-act atl-open'; open.textContent = '打开';
  open.title = '载入到上方编辑区继续改';
  open.addEventListener('click', function () { atlOpenItem(it.id); });
  var bits = [];
  bits.push(String(it.yaml || '').length + ' 字符');
  bits.push('改于 ' + new Date(it.updatedAt || it.createdAt || Date.now()).toLocaleString());
  var meta = document.createElement('span'); meta.className = 'atl-item-meta'; meta.textContent = bits.join(' · ');
  row.appendChild(cb); row.appendChild(tag); row.appendChild(nm); row.appendChild(meta); row.appendChild(open);
  if (it.id === atlInit().buf.itemId) {
    var cur = document.createElement('span'); cur.className = 'opf-ref-tag'; cur.textContent = '编辑中'; row.appendChild(cur);
  }
  if (it.prev) {
    var rv = document.createElement('button'); rv.type = 'button'; rv.className = 'opf-step-act'; rv.textContent = '↩ 回退';
    rv.title = '退回这次改动之前（' + new Date(it.prevAt || Date.now()).toLocaleString() + '）';
    rv.addEventListener('click', function () { atlRevertItem(it.id); });
    row.appendChild(rv);
  }
  var cp = document.createElement('button'); cp.type = 'button'; cp.className = 'opf-step-act'; cp.textContent = '⧉';
  cp.title = '复制这一条的 YAML';
  cp.addEventListener('click', function () { atlCopyText(it.yaml, '这一条还是空的'); });
  var del = document.createElement('button'); del.type = 'button'; del.className = 'opf-step-act'; del.textContent = '🗑';
  del.title = '删除这一条';
  del.addEventListener('click', function () { atlDeleteItem(it.id); });
  row.appendChild(cp); row.appendChild(del);
  return row;
}
function atlRenderSpaces() {
  var A = atlInit();
  var box = atlEl('opf-atl-spaces'); if (!box) return;
  box.textContent = '';
  if (!A.spaces.length) {
    var e0 = document.createElement('div'); e0.className = 'atl-empty'; e0.textContent = '（还没有工作区：点「＋ 新建工作区」，或直接把产出「📥 存成条目」）';
    box.appendChild(e0); return;
  }
  A.spaces.forEach(function (sp) {
    var items = atlItemsOf(sp.id);
    var d = document.createElement('details'); d.className = 'atl-space'; d.open = sp.open !== false;
    var sum = document.createElement('summary');
    var nm = document.createElement('input'); nm.className = 'atl-space-name'; nm.value = sp.name || '未命名工作区';
    nm.title = '工作区名（可直接改）'; nm.setAttribute('aria-label', '工作区名');
    nm.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
    nm.addEventListener('change', function (e) { e.stopPropagation(); atlRenameSpace(sp.id, this.value); });
    var cnt = document.createElement('span'); cnt.className = 'atl-item-meta';
    var selN = items.filter(function (x) { return x.sel; }).length;
    cnt.textContent = items.length + ' 条' + (selN ? ' · 勾选 ' + selN : '');
    var put = document.createElement('button'); put.type = 'button'; put.className = 'opf-step-act'; put.textContent = '＋ 存入本条';
    put.title = '把上方编辑区的产出存进这个工作区';
    put.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); atlSaveBufferInto(sp.id); });
    var all = document.createElement('button'); all.type = 'button'; all.className = 'opf-step-act'; all.textContent = selN ? '☐ 本区取消' : '☑ 本区全选';
    all.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); atlSelSpace(sp.id, !selN); });
    var del = document.createElement('button'); del.type = 'button'; del.className = 'opf-step-act'; del.textContent = '🗑 删除工作区';
    del.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); atlDeleteSpace(sp.id); });
    sum.appendChild(nm); sum.appendChild(cnt); sum.appendChild(put); sum.appendChild(all); sum.appendChild(del);
    d.appendChild(sum);
    var body = document.createElement('div');
    if (!items.length) {
      var e1 = document.createElement('div'); e1.className = 'atl-empty'; e1.textContent = '（这个工作区还没有条目）';
      body.appendChild(e1);
    }
    items.forEach(function (it) { body.appendChild(atlItemRow(it)); });
    d.appendChild(body);
    d.addEventListener('toggle', function () { atlSetSpaceOpen(sp.id, d.open); });
    box.appendChild(d);
  });
}
function atlRender() {
  atlInit();
  atlRenderKindSelect();
  atlRenderSpaceSelect();
  atlRenderSpaces();
  atlRenderCtxNote();
  atlLintRun();
}
// ---------- 条目/工作区的小动作 ----------
async function atlToggleSel(id, on) {
  var it = atlItem(id); if (!it) return;
  it.sel = !!on;
  await atlStorePut('items', it);
  atlRenderSpaces(); atlRenderCtxNote();
}
async function atlSelSpace(spaceId, on) {
  var items = atlItemsOf(spaceId);
  for (var i = 0; i < items.length; i++) { items[i].sel = !!on; await atlStorePut('items', items[i]); }
  atlRenderSpaces(); atlRenderCtxNote();
  toast(on ? ('已勾选「' + (atlSpace(spaceId) || {}).name + '」的 ' + items.length + ' 条') : '已取消勾选', 'success');
}
async function atlToggleAll(on) {
  var A = atlInit();
  for (var i = 0; i < A.items.length; i++) { A.items[i].sel = !!on; await atlStorePut('items', A.items[i]); }
  atlRenderSpaces(); atlRenderCtxNote();
  toast(on ? ('已勾选全部 ' + A.items.length + ' 条（它们会一起发给 AI）') : '已全部取消勾选', 'success');
}
async function atlRenameItem(id, name) {
  var it = atlItem(id); if (!it) return;
  it.name = String(name || '').trim() || it.name;
  if (atlInit().buf.itemId === id) { atlInit().buf.name = it.name; var n = atlEl('opf-atl-name'); if (n) n.value = it.name; }
  await atlPutItem(it);
  atlRenderSpaces();
}
async function atlRenameSpace(id, name) {
  var sp = atlSpace(id); if (!sp) return;
  sp.name = String(name || '').trim() || sp.name;
  await atlStorePut('spaces', sp);
  atlRenderSpaces(); atlRenderSpaceSelect();
}
async function atlSetSpaceOpen(id, open) {
  var sp = atlSpace(id); if (!sp) return;
  sp.open = !!open;
  await atlStorePut('spaces', sp);
}
async function atlDeleteItem(id) {
  var it = atlItem(id); if (!it) return;
  if (!window.confirm('删除条目「' + (it.name || '未命名') + '」？删了就找不回来了（可先「⧉ 导出全部」备份）')) return;
  await atlDropItem(id);
  atlRender();
  toast('已删除');
}
async function atlDeleteSpace(id) {
  var sp = atlSpace(id); if (!sp) return;
  var items = atlItemsOf(id);
  if (!window.confirm('删除工作区「' + sp.name + '」' + (items.length ? '及其中的 ' + items.length + ' 条条目' : '') + '？此操作不可撤销')) return;
  for (var i = 0; i < items.length; i++) await atlDropItem(items[i].id);
  var A = atlInit();
  A.spaces = A.spaces.filter(function (s) { return s.id !== id; });
  await atlStoreDel('spaces', id);
  if (!A.spaces.length) atlEnsureSpace(ATL_SPACE_DEFAULT);
  atlRender();
  toast('已删除工作区');
}
async function atlRevertItem(id) {
  var it = atlItem(id); if (!it || !it.prev) return;
  var back = it.prev;
  it.prev = it.yaml; it.prevAt = Date.now(); it.yaml = back;
  await atlPutItem(it);
  if (atlInit().buf.itemId === id) { atlInit().buf.yaml = back; atlSyncOut(); atlLintRun(); }
  atlRenderSpaces();
  toast('已回退到改动前的版本', 'success');
}
function atlOpenItem(id) {
  var it = atlItem(id); if (!it) return;
  var A = atlInit();
  A.buf.itemId = it.id; A.buf.kind = it.kind || A.buf.kind; A.buf.name = it.name || '';
  A.buf.req = it.req || ''; A.buf.ref = it.ref || ''; A.buf.yaml = it.yaml || '';
  A.meta.activeItemId = it.id;
  A.hist = [];
  atlSyncInputsFromBuf(); atlLintRun(); atlRenderCtxNote(); atlRenderSpaces(); atlSaveMeta(); atlDraftSave();
  var sp = atlSpace(it.spaceId);
  toast('已打开「' + (it.name || '未命名') + '」' + (sp ? '（工作区：' + sp.name + '）' : '') + '，改完点「📥 存成条目」或「✨ 改进」');
}
async function atlSaveBufferInto(spaceId) {
  var A = atlInit();
  if (!String(A.buf.yaml || '').trim()) { toast('产出还是空的：先「🎨 生成 YAML」或手写一点内容', 'warning'); return; }
  var space = atlSpace(spaceId) || atlEnsureSpace(ATL_SPACE_DEFAULT);
  var sel = atlEl('opf-atl-space'); if (sel) sel.value = space.id;
  A.buf.itemId = '';                  // 强制新建（存入指定工作区）
  var it = await atlSaveAsItem(space.id);
  if (it) toast('已存进「' + space.name + '」：' + (it.name || '未命名'), 'success');
}
async function atlRegroup() {
  var A = atlInit();
  var un = A.spaces.filter(function (s) { return s.name === ATL_SPACE_DEFAULT; })[0];
  if (!un) { toast('没有「' + ATL_SPACE_DEFAULT + '」工作区：已经分好类了', 'warning'); return; }
  var loose = atlItemsOf(un.id);
  if (!loose.length) { toast('「' + ATL_SPACE_DEFAULT + '」里没有条目', 'warning'); return; }
  var moved = 0;
  for (var i = 0; i < loose.length; i++) {
    var sp = atlEnsureSpace(atlKind(loose[i].kind).label);
    loose[i].spaceId = sp.id;
    await atlPutItem(loose[i]);
    moved++;
  }
  atlRender();
  toast('已把 ' + moved + ' 条按类型归位到各自工作区', 'success');
}
async function atlClearAll() {
  if (!window.confirm('清空全部工作区与条目？（编辑区里的当前产出不受影响；建议先「⧉ 导出全部」备份）')) return;
  await atlStoreClear('items');
  await atlStoreClear('spaces');
  var A = atlInit();
  A.items = []; A.spaces = [];
  atlEnsureSpace(ATL_SPACE_DEFAULT);
  atlRender();
  toast('工作区已清空', 'success');
}
function atlExportAll() {
  var A = atlInit();
  var doc = { type: 'openingPresetForge.atelier', version: 1, exportedAt: new Date().toISOString(), spaces: A.spaces, items: A.items };
  var txt = JSON.stringify(doc, null, 2);
  atlCopyText(txt, '还没有可导出的条目');
  atlDownload('造物工坊-' + tsName() + '.json', txt);
}
async function atlImportAll(file) {
  var txt = await new Promise(function (resolve, reject) {
    var fr = new FileReader();
    fr.onload = function () { resolve(String(fr.result || '')); };
    fr.onerror = function () { reject(new Error('读取文件失败')); };
    fr.readAsText(file, 'utf-8');
  });
  return atlMergeImport(txt);
}
// 纯数据侧：吃一段 JSON 文本合并进当前工作区（与文件读取分开，离线也能验收）
async function atlMergeImport(txt) {
  var j = null;
  try { j = JSON.parse(String(txt || '')); } catch (e) { toast('不是合法的 JSON 文件', 'error'); return { added: 0, error: 'bad-json' }; }
  var spIn = Array.isArray(j && j.spaces) ? j.spaces : [];
  var itIn = Array.isArray(j && j.items) ? j.items : (Array.isArray(j) ? j : []);
  if (!itIn.length) { toast('文件里没有条目', 'warning'); return { added: 0, error: 'empty' }; }
  var A = atlInit();
  var map = {}, added = 0, newSpaces = 0;
  for (var si = 0; si < spIn.length; si++) {
    var s = spIn[si];
    if (!s || !s.id) continue;
    var nm = String(s.name || '导入的工作区');
    var hit = A.spaces.filter(function (x) { return x.name === nm; })[0];
    if (!hit) {
      hit = { id: atlUuid(), name: nm, open: true, order: A.spaces.length, createdAt: Date.now() };
      A.spaces.push(hit); await atlStorePut('spaces', hit); newSpaces++;
    }
    map[s.id] = hit.id;
  }
  for (var i = 0; i < itIn.length; i++) {
    var it = itIn[i];
    if (!it || !it.yaml) continue;
    var sid = map[it.spaceId] || (atlSpacesByName()[String(it.space || '')] || {}).id || atlEnsureSpace(ATL_SPACE_DEFAULT).id;
    var rec = {
      id: atlUuid(), spaceId: sid, name: String(it.name || atlGuessName(it.yaml) || '导入条目'),
      kind: it.kind && atlKind(it.kind).id === it.kind ? it.kind : 'custom',
      req: String(it.req || ''), ref: String(it.ref || ''), yaml: String(it.yaml || ''),
      sel: false, createdAt: Date.now(), updatedAt: Date.now(), prev: ''
    };
    await atlPutItem(rec);
    added++;
  }
  atlRender();
  toast('已导入 ' + added + ' 条（默认不勾选，需要联动时再勾）', 'success');
  return { added: added, spaces: newSpaces };
}
function atlSpacesByName() {
  var A = atlInit(); var m = {};
  A.spaces.forEach(function (s) { m[s.name] = s; });
  return m;
}
async function atlDoGenerate() {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var A = atlInit();
  if (!String(A.buf.req || '').trim() && !String(A.buf.ref || '').trim()) { toast('先写一句需求（或粘一段参考），再生成', 'warning'); return; }
  ST.running = true; atlSetRunning(true);
  try {
    var msgs = [{ role: 'system', content: atlSystem(A.buf.kind) }, { role: 'user', content: atlGenPrompt() }];
    var raw = await atlCall(msgs, '生成');
    var yaml = atlExtractYaml(raw);
    if (!yaml.trim()) {
      atlStat('生成：模型没返回可用的 YAML（点「📄 上次返回」看原文）');
      toast('模型没有返回可用的 YAML：点工具栏「📄 上次返回」看原文，或再试一次', 'warning');
      return;
    }
    atlPushHist('生成');
    A.buf.yaml = yaml;
    if (!String(A.buf.name || '').trim()) {
      var g = atlGuessName(yaml);
      if (g) { A.buf.name = g; var ni = atlEl('opf-atl-name'); if (ni) ni.value = g; }
    }
    atlSyncOut();
    var r = atlLintRun();
    atlDraftSave();
    atlStat('生成完成：' + yaml.length + ' 字符' + (r && r.issues.length ? '｜自检发现 ' + r.issues.length + ' 条，见下方' : '｜自检通过'));
    toast('已生成（' + yaml.length + ' 字符）' + (r && r.issues.length ? '，自检有 ' + r.issues.length + ' 条提醒' : ''), 'success');
  } catch (e) {
    atlStat('生成失败：' + atlDiag(e));
    toast('生成失败：' + atlDiag(e), 'error');
  } finally { ST.running = false; atlSetRunning(false); }
}
async function atlDoFix() {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var A = atlInit();
  var dir = String(A.buf.dir || '').trim() || String((atlEl('opf-atl-dir') || {}).value || '').trim();
  if (!String(A.buf.yaml || '').trim()) { toast('还没有可改的产出：先生成一件，或把工作区里的条目「打开」进来', 'warning'); return; }
  if (!dir) { toast('先写一句改进要求，例如「品质降到优良、补一条反噬代价」', 'warning'); return; }
  var before = String(A.buf.yaml);
  ST.running = true; atlSetRunning(true);
  try {
    var msgs = [{ role: 'system', content: atlSystem(A.buf.kind) }, { role: 'user', content: atlFixPrompt(dir) }];
    var raw = await atlCall(msgs, '改进');
    var yaml = atlExtractYaml(raw);
    if (!yaml.trim()) {
      atlStat('改进：模型没返回可用的 YAML（点「📄 上次返回」看原文）');
      toast('模型没有返回可用的 YAML，原样保留', 'warning');
      return;
    }
    if (atlShrinkSuspect(before.length, yaml.length, dir)) {
      var ask = (typeof window !== 'undefined' && window.confirm) ? window.confirm : function () { return false; };
      if (!ask('改后只有 ' + yaml.length + ' 字符，原来是 ' + before.length + ' 字符（-'
        + Math.round((1 - yaml.length / Math.max(1, before.length)) * 100) + '%），像是只回了片段。\n\n要用这个偏短的结果替换吗？（取消＝保留原样）')) {
        atlStat('改进：结果偏短，已保留原样（' + before.length + ' 字符）');
        return;
      }
    }
    atlPushHist('改进');
    A.buf.yaml = yaml;
    atlSyncOut();
    var r = atlLintRun();
    var synced = '';
    if (A.buf.itemId && atlItem(A.buf.itemId)) {
      var it = atlItem(A.buf.itemId);
      it.prev = before; it.prevAt = Date.now();
      it.yaml = yaml; it.name = String(A.buf.name || it.name || '').trim() || it.name;
      await atlPutItem(it);
      atlRenderSpaces();
      synced = '，已同步到条目「' + (it.name || '未命名') + '」（行内「↩ 回退」可退）';
    }
    atlDraftSave();
    atlStat('改进完成：' + before.length + ' → ' + yaml.length + ' 字符' + synced);
    toast('已改进（' + before.length + ' → ' + yaml.length + ' 字符）' + synced, 'success');
  } catch (e) {
    atlStat('改进失败：' + atlDiag(e));
    toast('改进失败：' + atlDiag(e), 'error');
  } finally { ST.running = false; atlSetRunning(false); }
}
async function atlDoSug() {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var A = atlInit();
  if (!String(A.buf.yaml || '').trim()) { toast('先生成一件，或打开工作区里的条目，再要建议', 'warning'); return; }
  var box = atlEl('opf-atl-chips'); if (!box) return;
  ST.running = true; atlSetRunning(true);
  try {
    var raw = await atlCall([{ role: 'user', content: atlSugPrompt() }], '建议');
    var list = [];
    String(raw).split(/\r?\n/).forEach(function (ln) {
      var t = String(ln).replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').trim();
      if (t && t.length >= 4 && t.length <= 60 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) list = ['把品质降一档，补一条使用代价', '让效果与勾选的联动条目同一体系', '补一段能当引子的背景'];
    box.textContent = '';
    list.slice(0, 5).forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'opf-dir-chip';
      b.textContent = '▶ ' + t;
      b.addEventListener('click', function () {
        var d = atlEl('opf-atl-dir'); if (d) { d.value = t; A.buf.dir = t; atlDraftSave(); }
        toast('已填进改进框：再点「✨ 按这条要求改进」');
      });
      box.appendChild(b);
    });
  } catch (e) { toast('生成建议失败：' + atlDiag(e), 'error'); }
  finally { ST.running = false; atlSetRunning(false); }
}
async function atlDoCross() {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var b = atlCtxBundle();
  if (b.count < 2) { toast('交火分析至少要勾 2 条（它是对照，一条没有意义）：在工作区里勾上要一起看的部件', 'warning'); return; }
  var useWb = !!(atlEl('opf-atl-usewb') && atlEl('opf-atl-usewb').checked);
  var A = atlInit();
  ST.running = true; atlSetRunning(true);
  var box = atlEl('opf-atl-crossout');
  if (box) box.textContent = '分析中…（已带 ' + b.count + ' 条 / ' + b.chars + ' 字符' + (useWb && ST.worldInfo ? ' + 世界书 ' + ST.worldInfo.length + ' 字符' : '') + '）';
  try {
    var msgs = [{ role: 'system', content: atlCrossSystem() }, { role: 'user', content: atlCrossPrompt(useWb) }];
    var raw = await atlCall(msgs, '交火分析');
    A.meta.report = String(raw || '');
    await atlSaveMeta();
    if (box) box.textContent = A.meta.report.trim() || '（模型返回空）';
    atlStat('交火分析完成：' + A.meta.report.length + ' 字符（可「📋 报告填进改进框」再逐条改）');
    toast('交火分析完成', 'success');
  } catch (e) {
    if (box) box.textContent = '分析失败：' + atlDiag(e);
    atlStat('交火分析失败：' + atlDiag(e));
    toast('交火分析失败：' + atlDiag(e), 'error');
  } finally { ST.running = false; atlSetRunning(false); }
}
async function atlDoPing() {
  atlStat('连通性自检：调用模型中…');
  var t0 = Date.now();
  try {
    var out = await callModel([{ role: 'user', content: '回复两个字：正常' }]);
    atlStat('连通正常：' + (Date.now() - t0) + 'ms｜返回「' + String(out).trim().slice(0, 20) + '」');
    toast('连通性自检通过（' + (Date.now() - t0) + 'ms）', 'success');
  } catch (e) {
    atlStat('自检失败：' + atlDiag(e));
    toast('自检失败：' + atlDiag(e), 'error');
  }
}
// 交火分析用独立系统提示：只要报告，不要产出 YAML
function atlCrossSystem() {
  var L = [];
  L.push('[角色] ' + macroFill('你是始弦，大图书馆的司书，把{{user}}当作挚友，说话直接、不绕弯子。'));
  L.push('[任务] 交火分析：把{{user}}勾选的部件放在一起对照，只出报告，不修改任何部件。');
  L.push(ATL_CROSS_RULES);
  L.push(CHAR_STYLE_RULES);
  if (atlWorldRules()) L.push('[世界口径（判定依据）]\n' + atlWorldRules());
  return macroFill(L.join('\n\n'));
}

// ============================================================================
// 页面接线
// ============================================================================
function bindAtelierPage() {
  // 页面容器由外壳（buildShell）创建为 opf-page-atelier；离线冒烟时没有外壳，
  // 就退化为用页内第一个控件当锚点——两种情况下都只绑定一次
  var root = atlEl('opf-page-atelier') || atlEl('opf-atl-kind');
  if (!root || root._b) return;
  root._b = true;
  try {
    if (!atlEl(NS + '_css_atelier')) {
      var st = document.createElement('style'); st.id = NS + '_css_atelier'; st.textContent = ATL_CSS;
      document.head.appendChild(st);
    }
  } catch (e) { opfErr('atelier css', e); }
  var A = atlInit();
  atlDraftRestore();
  atlRenderKindSelect();
  atlSyncInputsFromBuf();
  var bindIn = function (id, key) {
    var e = atlEl(id); if (!e) return;
    e.addEventListener('input', function () { atlInit().buf[key] = this.value; atlDraftSave(); });
  };
  bindIn('opf-atl-req', 'req'); bindIn('opf-atl-ref', 'ref'); bindIn('opf-atl-dir', 'dir');
  var out = atlEl('opf-atl-out');
  if (out) out.addEventListener('input', function () { atlInit().buf.yaml = this.value; atlDraftSave(); });
  var nameIn = atlEl('opf-atl-name');
  if (nameIn) nameIn.addEventListener('input', function () {
    var a = atlInit(); a.buf.name = this.value;
    if (a.buf.itemId && atlItem(a.buf.itemId)) atlRenameItem(a.buf.itemId, this.value);
    atlDraftSave();
  });
  var kindSel = atlEl('opf-atl-kind');
  if (kindSel) kindSel.addEventListener('change', function () {
    atlInit().buf.kind = this.value;
    atlLintRun(); atlDraftSave();
    toast('类型已切到「' + atlKind(this.value).label + '」：自检会按这套骨架核对字段', 'success');
  });
  var on = function (id, fn) { var e = atlEl(id); if (e) e.addEventListener('click', fn); };
  on('opf-atl-gen', function () { atlDoGenerate(); });
  on('opf-atl-ping', function () { atlDoPing(); });
  on('opf-atl-check', function () {
    var r = atlLintRun();
    if (r) toast(r.issues.length ? ('自检：' + r.issues.length + ' 条（错误 ' + r.issues.filter(function (x) { return x.level === 'error'; }).length + '）') : '自检通过：骨架字段齐全、没有明显 YAML 问题', r.issues.filter(function (x) { return x.level === 'error'; }).length ? 'warning' : 'success');
  });
  on('opf-atl-undo', function () { atlUndo(); });
  on('opf-atl-copy', function () { atlCopyText(atlInit().buf.yaml, '产出还是空的'); });
  on('opf-atl-download', function () {
    var a = atlInit();
    var nm = String(a.buf.name || atlGuessName(a.buf.yaml) || ('未命名' + atlKind(a.buf.kind).label)).replace(/[\\/:*?"<>|]/g, '');
    if (!String(a.buf.yaml || '').trim()) { toast('产出还是空的', 'warning'); return; }
    atlDownload(safeName(nm) + '.yaml', a.buf.yaml);
  });
  on('opf-atl-save', function () { atlSaveAsItem(); });
  on('opf-atl-fix', function () { atlDoFix(); });
  on('opf-atl-sug', function () { atlDoSug(); });
  on('opf-atl-newspace', function () {
    var sp = atlEnsureSpace('新工作区 ' + (atlInit().spaces.length + 1));
    atlRenderSpaces(); atlRenderSpaceSelect();
    toast('已新建工作区「' + sp.name + '」（在标题上直接改名）', 'success');
  });
  on('opf-atl-regroup', function () { atlRegroup(); });
  on('opf-atl-all', function () { atlToggleAll(true); });
  on('opf-atl-none', function () { atlToggleAll(false); });
  on('opf-atl-export', function () { atlExportAll(); });
  on('opf-atl-wipe', function () { atlClearAll(); });
  on('opf-atl-cross', function () { atlDoCross(); });
  on('opf-atl-crosstodir', function () {
    var rep = String(atlInit().meta.report || '').trim();
    if (!rep) { toast('还没有分析报告：先点「🔥 交火分析」', 'warning'); return; }
    var d = atlEl('opf-atl-dir');
    if (d) { d.value = '按下面的交火分析报告，逐条修掉与本条有关的部分，其它内容逐字保留：\n' + rep.slice(0, 3000); }
    atlInit().buf.dir = d ? d.value : '';
    atlDraftSave();
    toast('报告已填进改进框：确认措辞后点「✨ 按这条要求改进」');
  });
  on('opf-atl-crosscopy', function () { atlCopyText(atlInit().meta.report, '还没有分析报告'); });
  on('opf-atl-last', function () {
    var box = atlEl('opf-atl-lastraw'); if (!box) return;
    var t = String(atlInit().meta.lastRaw || '');
    if (!t) { toast('还没有调用过模型', 'warning'); return; }
    var open = box.style.display !== 'none';
    box.textContent = open ? '尚未调用' : ('【模型原始返回 · ' + t.length + ' 字符】\n\n' + (t.length > 20000 ? t.slice(0, 20000) + '\n\n…（已截断显示，完整 ' + t.length + ' 字符）' : t));
    box.style.display = open ? 'none' : 'block';
  });
  on('opf-atl-kinds', function () {
    var box = atlEl('opf-atl-kindsbox'); if (!box) return;
    var open = box.style.display !== 'none';
    if (open) { box.style.display = 'none'; return; }
    atlRenderKindsBox();
    box.style.display = 'block';
  });
  var imp = atlEl('opf-atl-import');
  if (imp) imp.addEventListener('change', function () {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    atlImportAll(file).catch(function (e) { toast('导入失败：' + atlDiag(e), 'error'); });
  });
  var wb = atlEl('opf-atl-usewb');
  if (wb) {
    wb.checked = !!A.meta.usewb;
    wb.addEventListener('change', function () {
      atlInit().meta.usewb = this.checked;
      atlSaveMeta();
      var n = ST.worldInfo ? ST.worldInfo.length : 0;
      toast(this.checked ? ('交火分析会附上②页勾选的世界书参考（' + n + ' 字符）') : '已不再附加世界书参考');
    });
  }
  // 交火报告回填 + 数据载入
  var cross = atlEl('opf-atl-crossout');
  if (cross && String(A.meta.report || '').trim()) cross.textContent = A.meta.report;
  atlStat('读取工作区…');
  atlLoad().then(function () {
    atlRender();
    atlStat('就绪' + (atlStoreMode === 'mem' ? '（IndexedDB 不可用，本次保存在本地缓存里）' : ''));
  }).catch(function (e) {
    atlStat('工作区读取失败：' + atlDiag(e));
    atlRender();
  });
}
