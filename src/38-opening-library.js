//@module 38-opening-library — 自备开局库：手写/概要生成条目 + 随机点数 + ① 页锁定注入
// ============================================================================
// 用户要的东西：像角色卡自带的开局一样，自己写技能/装备/道具/资产/伙伴/背景，
// 点数随机；写不完可以只写概要让 AI 生成；写完存成库；以后做开局预设时按类选取，
// 汇总时原样并进 JSON——AI 与自检都不许改这些条目。
//
// 三层职责，别混：
//   · 库（localStorage）：条目的长期存放，跟任何一份开局预设无关；
//   · 选取（ST.inject）：当前开局预设草稿选中了哪些快照，跟着工程一起存档；
//   · 注入（libInjectPromptBlock / libMergeIntoPreset）：提示词里告知 + 落盘前强制覆盖。
// 为什么注入必须放在代码里而不只是写提示词：模型不听话是常态，提示词只能减少乱写；
// 只有「合并时按同名整体替换」才能保证用户手写的内容一个字都不变。
// ============================================================================
var LIB_KEY = NS + '_openinglib_v1';
var LIB_GROUPS = [
  { key: 'skills',     label: '技能', phase: 'skill',    single: false },
  { key: 'equipments', label: '装备', phase: 'equip',    single: false },
  { key: 'items',      label: '道具', phase: 'item',     single: false },
  { key: 'assets',     label: '资产', phase: 'asset',    single: false },
  { key: 'partners',   label: '伙伴', phase: '',         single: false },
  { key: 'background', label: '背景', phase: 'background', single: true }
];
var LIB_RARITY = [['common', '普通'], ['uncommon', '优良'], ['rare', '稀有'], ['epic', '史诗'], ['legendary', '传说'], ['mythic', '神话'], ['only', '唯一']];

var LIB_CSS = [
  '#opf-page-library{font-size:13.5px}',
  // 库列表
  '.lib-kitlist{display:flex;flex-direction:column;gap:2px;max-height:300px;overflow:auto;padding:2px 0}',
  '.lib-kitrow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid transparent;cursor:pointer;line-height:1.4}',
  '.lib-kitrow:hover{background:rgba(255,235,238,.06)}',
  '.lib-kitrow.active{background:rgba(255,77,94,.14);border-color:rgba(255,150,165,.4)}',
  '.lib-kitname{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ffeef1;font-size:14px;font-weight:600}',
  '.lib-kitmeta{flex:none;font-size:11.5px;color:rgba(255,200,208,.6)}',
  '.lib-kitdel{flex:none;border:none;background:transparent;color:rgba(255,160,170,.6);cursor:pointer;font-size:11px;padding:0 4px;border-radius:4px;line-height:1.6}',
  '.lib-kitdel:hover{color:#fff;background:rgba(255,77,94,.3)}',
  '.lib-empty{font-size:12.5px;color:rgba(255,200,208,.58);padding:9px 4px;line-height:1.6}',
  // 当前库编辑
  '.lib-field{display:flex;flex-direction:column;gap:3px;margin:5px 0}',
  '.lib-field>label{font-size:12px;color:rgba(255,200,208,.68)}',
  '.lib-field input,.lib-field select,.lib-field textarea{width:100%;border-radius:7px;padding:6px 8px;font-size:13px;color:#ffeef1;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none;font-family:inherit}',
  '.lib-field input:focus,.lib-field select:focus,.lib-field textarea:focus{border-color:rgba(255,110,125,.65);box-shadow:0 0 6px rgba(255,77,94,.22)}',
  '.lib-field textarea{min-height:54px;resize:vertical;line-height:1.5}',
  '.lib-field .lib-row{display:flex;gap:5px;align-items:center}',
  // 分类与条目
  '.lib-cat{margin:9px 0 3px;padding:5px 8px;border-left:2px solid rgba(255,90,105,.5);background:rgba(255,77,94,.05);border-radius:0 6px 6px 0;display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
  '.lib-cat-t{font-size:14px;font-weight:600;color:#ffe3e7}',
  '.lib-cat-n{font-size:11.5px;color:rgba(255,200,208,.6)}',
  '.lib-entry{display:flex;align-items:center;gap:7px;padding:7px 8px;border-bottom:1px solid rgba(255,122,138,.1);font-size:13px;flex-wrap:wrap}',
  '.lib-entry:hover{background:rgba(255,235,238,.04)}',
  '.lib-entry-name{flex:1 1 140px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ffeef1;font-size:14px;font-weight:600;letter-spacing:.2px}',
  '.lib-entry-meta{flex:none;font-size:11.5px;color:rgba(255,200,208,.62)}',
  '.lib-mini{flex:none;border:1px solid rgba(255,122,138,.28);background:rgba(255,235,238,.055);color:#ffd0d6;border-radius:6px;padding:3px 8px;font-size:11.5px;line-height:1.55;cursor:pointer;white-space:nowrap}',
  '.lib-mini:hover{background:rgba(255,77,94,.2);color:#fff}',
  '.lib-mini.danger{color:#ff9aa4;border-color:rgba(255,110,122,.4)}',
  // 编辑器
  '#opf-lib-editor .lib-editor-hd{display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap}',
  '#opf-lib-editor .lib-editor-hd .lib-cat-t{font-size:13px}',
  '.lib-warn{font-size:12.5px;line-height:1.55;color:#ffd0a0;padding:4px 0;white-space:pre-wrap}',
  // ① 页注入卡
  '#opf-page-library .opf-card-t{font-size:15px !important}',
  '#opf-page-library .opf-card-sub{font-size:12px !important;color:rgba(255,200,208,.62) !important}',
  '#opf-page-library .opf-card-no{font-size:11.5px !important}',
  '#opf-page-library .opf-dim{font-size:12px !important;line-height:1.6}',
  '#opf-page-library .opf-btn{font-size:13px !important}',
  '#opf-page-library .lib-editor-hd .lib-cat-t{font-size:14.5px !important}',
  '#opf-inject-card .lib-inj-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 0;border-bottom:1px dashed rgba(255,122,138,.14)}',
  '#opf-inject-card .lib-inj-label{flex:none;min-width:3.2em;font-size:13px;font-weight:600;color:#ffd9de}',
  '#opf-inject-card .lib-inj-count{flex:none;font-size:11.5px;color:rgba(255,200,208,.6)}',
  '#opf-inject-card .lib-inj-chips{flex:1 1 100%;display:flex;flex-wrap:wrap;gap:4px}',
  '.lib-chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;line-height:1.6;padding:2px 8px;border-radius:999px;background:rgba(255,77,94,.12);border:1px solid rgba(255,150,165,.3);color:#ffe3e7;max-width:100%}',
  '.lib-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}',
  '.lib-chip button{border:none;background:transparent;color:#ff9aa4;cursor:pointer;font-size:11px;padding:0;line-height:1}',
  '.lib-chip button:hover{color:#fff}',
  '#opf-inject-card .lib-inj-note{font-size:11.5px;line-height:1.65;color:rgba(255,200,208,.6);padding:3px 0}',
  // 选取弹窗
  '.lib-mask{position:fixed;inset:0;z-index:2147480500;background:rgba(5,1,3,.62);display:flex;align-items:center;justify-content:center;padding:16px}',
  '.lib-picker{width:min(620px,94vw);max-height:min(76vh,740px);display:flex;flex-direction:column;border-radius:14px;border:1px solid rgba(255,150,165,.35);background:linear-gradient(180deg,rgba(46,6,14,.98),rgba(20,3,9,.98));box-shadow:0 18px 50px rgba(0,0,0,.6);color:#fdeef0}',
  // 选取弹窗：跟随界面风格；因为挂在 #opf-shell 里，能拿到主题类
  '.lib-picker{background:linear-gradient(180deg,var(--ink-2,#1a1215),var(--ink-0,#0c0609));border:1px solid var(--line-2,rgba(216,178,116,.26));color:var(--tx,#fdeef0);box-shadow:0 18px 50px rgba(0,0,0,.62)}',
  '.lib-picker-hd{color:var(--tx,#ffe3e7);border-bottom:1px solid var(--line,rgba(216,178,116,.16))}',
  '.lib-picker-ft{border-top:1px solid var(--line,rgba(216,178,116,.16))}',
  '.lib-picker-group{color:var(--gold,#ffb7be)}',
  '.lib-picker-body .lib-empty{color:var(--tx-3,#94787a)}',
  '.lib-picker .lib-mini{font-size:12px;border-color:var(--line-2,rgba(255,122,138,.3));color:var(--tx-2,#c9ada6);background:rgba(255,255,255,.03)}',
  '.lib-picker .lib-mini:hover{background:rgba(255,255,255,.08);color:var(--tx,#fff)}',
  '.lib-picker .lib-entry-meta{color:var(--tx-3,#94787a)}',
  '.opf-theme-clock .lib-picker{background:linear-gradient(180deg,#1a120b,#100a06);border-color:rgba(150,100,56,.38);color:#f0dcb9;box-shadow:0 18px 50px rgba(0,0,0,.7),inset 0 0 0 1px rgba(198,150,96,.14)}',
  '.opf-theme-clock .lib-picker-hd,.opf-theme-clock .lib-picker-ft{border-color:rgba(198,150,96,.28)}',
  '.opf-theme-clock .lib-picker-hd{color:#f6dcb2}',
  '.opf-theme-clock .lib-picker-group{color:rgba(226,174,112,.78);border-left:2px solid rgba(198,150,96,.5);padding-left:7px}',
  '.opf-theme-clock .lib-picker .lib-mini{border-color:rgba(150,100,56,.42);color:#d6b68c;background:rgba(198,150,96,.06)}',
  '.opf-theme-clock .lib-picker .lib-mini:hover{background:rgba(198,150,96,.16);color:#f6dcb2}',
  '.opf-theme-astral .lib-picker{background:linear-gradient(180deg,#171a24,#0b0c12);border-color:rgba(226,232,246,.22);color:#eef2fb;box-shadow:0 18px 50px rgba(0,0,0,.7),inset 0 0 0 1px rgba(226,232,246,.06)}',
  '.opf-theme-astral .lib-picker-hd,.opf-theme-astral .lib-picker-ft{border-color:rgba(226,232,246,.16)}',
  '.opf-theme-astral .lib-picker-hd{color:#fff}',
  '.opf-theme-astral .lib-picker-group{color:rgba(226,232,246,.66);border-left:2px solid rgba(226,232,246,.34);padding-left:7px}',
  '.opf-theme-astral .lib-picker .lib-mini{border-color:rgba(226,232,246,.22);color:rgba(226,232,246,.78);background:rgba(255,255,255,.04)}',
  '.opf-theme-astral .lib-picker .lib-mini:hover{background:rgba(226,232,246,.12);color:#fff}',
  '.lib-picker-hd{display:flex;align-items:center;gap:8px;padding:11px 15px;border-bottom:1px solid rgba(255,122,138,.24);font-size:15px;font-weight:600;color:#ffe3e7}',
  '.lib-picker-hd .lib-mini{margin-left:auto}',
  '.lib-picker-body{flex:1 1 auto;min-height:0;overflow:auto;padding:8px 14px}',
  '.lib-picker-ft{display:flex;align-items:center;gap:8px;padding:9px 14px;border-top:1px solid rgba(255,122,138,.24)}',
  '.lib-picker-group{margin:8px 0 3px;font-size:11.5px;letter-spacing:1px;color:#ffb7be}',
  '.lib-picker-item{display:flex;align-items:center;gap:9px;padding:6px 7px;border-radius:7px;font-size:13.5px;cursor:pointer;line-height:1.45}',
  '.lib-picker-item:hover{background:rgba(255,235,238,.06)}',
  '.lib-picker-item input{accent-color:#ff4d5e;cursor:pointer;flex:none}',
  '.lib-picker-item .lib-entry-meta{margin-left:auto}'
].join('');

var LIB_HTML = [
  '<div class="opf-char-wrap opf-2col">',
  '  <div class="opf-col">',
  '    <section class="opf-card">',
  '      <div class="opf-card-hd"><span class="opf-card-no">01</span><span class="opf-card-t">开局库</span><span class="opf-card-sub">写好的条目存在浏览器本地</span></div>',
  '      <div class="opf-char-tools">',
  '        <button type="button" class="opf-btn primary" id="opf-lib-new">＋ 新建库</button>',
  '        <label class="opf-btn ghost" style="margin:0">📥 导入<input type="file" id="opf-lib-import" accept=".json,application/json" style="display:none"></label>',
  '        <label class="opf-btn ghost" style="margin:0" title="支持捏物收藏扩展导出的捏物包（fated-opening-templates）">📦 导入捏物包<input type="file" id="opf-lib-importpack" accept=".json,application/json" style="display:none"></label>',
  '        <button type="button" class="opf-btn ghost" id="opf-lib-export">⧉ 导出全部</button>',
  '      </div>',
  '      <div id="opf-lib-kitlist" class="lib-kitlist"></div>',
  '    </section>',
  '    <section class="opf-card" id="opf-lib-kitcard">',
  '      <div class="opf-card-hd"><span class="opf-card-no">02</span><span class="opf-card-t">当前库</span><span class="opf-card-sub">名称 · 概要 · 生成 · 保存</span></div>',
  '      <div class="lib-field"><label>库名称</label><input id="opf-lib-name" type="text" placeholder="例如：流浪剑士开局"></div>',
  '      <div class="lib-field"><label>概要（填写后可让 AI 按它生成全套条目；概要不参与注入）</label><textarea id="opf-lib-summary" placeholder="例如：1 级流浪剑士，从迷雾森林走出，想去瓦伦蒂亚城谋生；近战、轻甲、带一把旧剑和几瓶治疗药水；性格沉默，背景里交代他为什么离开森林"></textarea></div>',
  '      <div class="opf-char-tools">',
  '        <button type="button" class="opf-btn primary" id="opf-lib-save">💾 保存库</button>',
  '        <button type="button" class="opf-btn ghost" id="opf-lib-aiall">✨ 按概要 AI 生成全套</button>',
  '        <button type="button" class="opf-btn ghost" id="opf-lib-expkit">⬇ 导出此库</button>',
  '        <button type="button" class="opf-btn ghost" id="opf-lib-delkit">🗑 删除此库</button>',
  '      </div>',
  '      <div class="opf-dim" id="opf-lib-status">新建一个库，或者从「＋ 新增条目」开始写。</div>',
  '      <div class="opf-dim" id="opf-lib-kitstat">—</div>',
  '    </section>',
  '  </div>',
  '  <div class="opf-col">',
  '    <section class="opf-card" id="opf-lib-editor" style="display:none">',
  '      <div class="lib-editor-hd"><span class="lib-cat-t" id="opf-lib-editor-title">编辑条目</span><span class="lib-cat-n" id="opf-lib-editor-mode"></span><button type="button" class="lib-mini" id="opf-lib-editor-raw">原始 JSON</button></div>',
  '      <div id="opf-lib-editor-body"></div>',
  '      <div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-lib-editor-save">保存条目</button><button type="button" class="opf-btn ghost" id="opf-lib-editor-cancel">取消</button></div>',
  '      <div class="lib-warn" id="opf-lib-editor-warn"></div>',
  '    </section>',
  '    <section class="opf-card">',
  '      <div class="opf-card-hd"><span class="opf-card-no">03</span><span class="opf-card-t">条目</span><span class="opf-card-sub">技能 · 装备 · 道具 · 资产 · 伙伴 · 背景</span></div>',
  '      <div id="opf-lib-entries"></div>',
  '    </section>',
  '  </div>',
  '</div>'
].join('');

// ---------------- 小工具 ----------------
function libEl(id) { try { return (typeof document !== 'undefined' && document) ? document.getElementById(id) : null; } catch (e) { return null; } }
function libText(v) { return String(v == null ? '' : v); }
function libCreate(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = String(text);
  return n;
}
function libClone(v) { try { return JSON.parse(JSON.stringify(v == null ? null : v)); } catch (e) { return null; } }
function libDeep(v) { return libClone(v); }
function libNewId(prefix) { return (prefix || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function libConfirm(msg, fallback) {
  try { if (typeof window !== 'undefined' && window && typeof window.confirm === 'function') return !!window.confirm(msg); } catch (e) {}
  return !!fallback;
}
function libStatus(msg) { var el = libEl('opf-lib-status'); if (el) el.textContent = libText(msg); }
function libDownload(name, text) {
  try {
    var blob = new Blob([String(text)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { URL.revokeObjectURL(url); a.remove(); } catch (e) {} }, 1500);
    return true;
  } catch (e) { opfErr('libDownload', e); return false; }
}
function libStamp() { var d = new Date(); function p(v) { return (v < 10 ? '0' : '') + v; } return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); }
function libSafeName(n) { return String(n || 'opening').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'opening'; }
function libGroup(key) { for (var i = 0; i < LIB_GROUPS.length; i++) if (LIB_GROUPS[i].key === key) return LIB_GROUPS[i]; return null; }
function libGroups() { return LIB_GROUPS.slice(); }
// 样式必须真的挂上去：只在常量里写 CSS 等于没写（评审发现过这个坑）。
function libEnsureCss() {
  try {
    if (typeof document === 'undefined' || !document) return;
    if (document.getElementById && document.getElementById(NS + '_css_lib')) return;
    var st = document.createElement('style'); st.id = NS + '_css_lib'; st.textContent = LIB_CSS;
    (document.head || document.documentElement).appendChild(st);
  } catch (e) { opfErr('libEnsureCss', e); }
}

// ---------------- 数据层 ----------------
function libCleanEntry(key, e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  var o = libDeep(e) || {};
  if (!o._lid) o._lid = libNewId('e');
  if (key === 'background') {
    if (!o.name) o.name = '【自定义开局】';
    o.description = libText(o.description || o['描述']);
    delete o['描述'];
    delete o.cost; delete o.rarity; delete o.consume; delete o.type; delete o.tag;
    return o;
  }
  if (key === 'assets') {
    if (!o.rarity) o.rarity = 'common';
    if (!('_隐藏' in o)) o._隐藏 = false;
    // 资产用的是中文键（标签/描述/内部资产），别把英文占位字段带进最终 JSON
    if (!Array.isArray(o.标签)) o.标签 = Array.isArray(o.tag) ? o.tag.slice() : [];
    if (!o.内部资产 || typeof o.内部资产 !== 'object' || Array.isArray(o.内部资产)) o.内部资产 = {};
    delete o.tag; delete o.effect;
  } else {
    if (!Array.isArray(o.tag)) o.tag = [];
    if (!o.effect || typeof o.effect !== 'object' || Array.isArray(o.effect)) o.effect = {};
  }
  if (key === 'items' && !(Number(o.quantity) > 0)) o.quantity = 1;
  if (!o.name) o.name = '';
  if (!o.rarity || !libRarity(o.rarity)) o.rarity = 'common';
  if (key === 'partners') {
    delete o.rarity;
    if (!(Number(o.cost) > 0)) o.cost = libPartnerCost(o);
  } else if (!(Number(o.cost) > 0)) {
    // 导入/旧数据可能没有点数：补一个同品质的随机值，别让卡里只剩一个「点」。
    o.cost = libRandCost(key, o.rarity);
  }
  return o;
}
function libCleanKit(k) {
  var kid = (k && typeof k.id === 'string' && k.id) ? k.id : libNewId('k');
  var entries = {};
  LIB_GROUPS.forEach(function (g) {
    if (g.single) {
      var bg = (k && k.entries) ? k.entries[g.key] : null;
      entries[g.key] = (bg && typeof bg === 'object') ? libCleanEntry(g.key, bg) : null;
    } else {
      var arr = (k && k.entries && Array.isArray(k.entries[g.key])) ? k.entries[g.key] : [];
      entries[g.key] = [];
      arr.forEach(function (e) { var c = libCleanEntry(g.key, e); if (c) entries[g.key].push(c); });
    }
  });
  return {
    id: kid,
    name: libText(k && k.name).trim() || '未命名开局库',
    summary: libText(k && k.summary),
    createdAt: Number(k && k.createdAt) || Date.now(),
    updatedAt: Number(k && k.updatedAt) || Date.now(),
    entries: entries
  };
}
function libInit() {
  if (ST.lib && Array.isArray(ST.lib.kits)) return ST.lib;
  var lib = { kits: [], activeId: null };
  var raw = null;
  try { raw = lsGet(LIB_KEY); } catch (e) { raw = null; }
  if (raw && typeof raw === 'object' && Array.isArray(raw.kits)) {
    raw.kits.forEach(function (k) { var kit = libCleanKit(k); if (kit) lib.kits.push(kit); });
    var ids = {}; lib.kits.forEach(function (k) { ids[k.id] = 1; });
    lib.activeId = (typeof raw.activeId === 'string' && ids[raw.activeId]) ? raw.activeId : (lib.kits[0] ? lib.kits[0].id : null);
  }
  ST.lib = lib;
  return lib;
}
function libKits() { return libInit().kits; }
function libKit(id) {
  var lib = libInit();
  for (var i = 0; i < lib.kits.length; i++) if (lib.kits[i].id === id) return lib.kits[i];
  return null;
}
function libActiveKit() {
  var lib = libInit();
  var k = libKit(lib.activeId);
  if (!k && lib.kits.length) { lib.activeId = lib.kits[0].id; k = lib.kits[0]; }
  return k;
}
function libSetActive(id) { var k = libKit(id); if (!k) return null; libInit().activeId = id; return k; }
function libNewKit(name) {
  var lib = libInit();
  var entries = {};
  LIB_GROUPS.forEach(function (g) { entries[g.key] = g.single ? null : []; });
  var kit = { id: libNewId('k'), name: libText(name).trim() || ('开局库 ' + (lib.kits.length + 1)), summary: '', createdAt: Date.now(), updatedAt: Date.now(), entries: entries };
  lib.kits.unshift(kit);
  lib.activeId = kit.id;
  libSave();
  return kit;
}
function libDeleteKit(id) {
  var lib = libInit();
  var idx = -1; for (var i = 0; i < lib.kits.length; i++) if (lib.kits[i].id === id) idx = i;
  if (idx < 0) return false;
  lib.kits.splice(idx, 1);
  if (lib.activeId === id) lib.activeId = lib.kits.length ? lib.kits[0].id : null;
  libSave();
  return true;
}
function libRenameKit(id, name) {
  var k = libKit(id); if (!k) return false;
  var n = libText(name).trim(); if (n) k.name = n;
  libTouch(k); libSave(); return true;
}
function libSetSummary(id, text) { var k = libKit(id); if (!k) return false; k.summary = libText(text); libTouch(k); libSave(); return true; }
function libTouch(kit) { if (kit) kit.updatedAt = Date.now(); }
function libEntryArray(kit, key) {
  if (!kit || !kit.entries) return [];
  if (libGroup(key) && libGroup(key).single) return kit.entries[key] ? [kit.entries[key]] : [];
  return Array.isArray(kit.entries[key]) ? kit.entries[key] : [];
}
function libFindEntry(kit, key, lid) {
  var arr = key === 'background' ? (kit && kit.entries ? (kit.entries.background ? [kit.entries.background] : []) : []) : libEntryArray(kit, key);
  for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i]._lid === lid) return arr[i];
  return null;
}
function libRemoveEntry(kit, key, lid) {
  if (!kit || !kit.entries) return false;
  if (key === 'background') { if (kit.entries.background && kit.entries.background._lid === lid) { kit.entries.background = null; libTouch(kit); return true; } return false; }
  var arr = kit.entries[key];
  if (!Array.isArray(arr)) return false;
  for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i]._lid === lid) { arr.splice(i, 1); libTouch(kit); return true; }
  return false;
}

// ---------------- 默认条目 / 随机点数 ----------------
function libDefaultEntry(key) {
  var e;
  if (key === 'skills') e = { name: '新技能', rarity: 'common', type: '主动', consume: '攻击: 10MP', tag: ['力量', '单体', '伤害'], effect: { '效果名': '效果内容' }, description: '', isCustom: true };
  else if (key === 'equipments') e = { name: '新装备', rarity: 'common', type: '武器', tag: ['攻击: 10'], effect: { '效果名': '效果内容' }, description: '', isCustom: true };
  else if (key === 'items') e = { name: '新道具', rarity: 'common', type: '消耗品', tag: [], quantity: 1, effect: { '效果名': '效果内容' }, description: '', isCustom: true };
  else if (key === 'assets') e = { name: '新资产', rarity: 'common', 类型: '住宅', 标签: ['拥有者: {{user}}'], 总空间: '', 结算: '', 位置: '', 描述: '', 内部资产: {}, _隐藏: false, isCustom: true };
  else if (key === 'partners') e = {
    name: '新伙伴', lifeLevel: '第一层级 (普通)', level: 1, race: '', identity: [], career: [], personality: '', like: '', app: '', cloth: '',
    equip: [], attributes: { strength: 5, dexterity: 5, constitution: 5, intelligence: 5, mind: 5 }, stairway: { isOpen: false },
    isContract: true, affinity: 60, comment: '', backgroundInfo: '', skills: [], isCustom: true
  };
  else {
    // 背景不是"条目"：只要名称和描述，不能带 cost / rarity（否则会顺着注入写进最终 JSON）。
    e = { name: '【自定义开局】', description: '', isCustom: true };
    e._lid = libNewId('e');
    return e;
  }
  e._lid = libNewId('e');
  libNewCost(key, e);
  return e;
}
function libAddEntry(kit, key) {
  kit = kit || libActiveKit();
  if (!kit) return null;
  var e = libDefaultEntry(key);
  if (key === 'background') kit.entries.background = e;
  else { if (!Array.isArray(kit.entries[key])) kit.entries[key] = []; kit.entries[key].push(e); }
  libTouch(kit);
  return e;
}
function libPartnerCost(entry) {
  var tier = libPartnerTier(entry);
  var v = (typeof COST_BY_PARTNER_TIER !== 'undefined' && COST_BY_PARTNER_TIER[tier]) ? COST_BY_PARTNER_TIER[tier] : 100;
  return v;
}
function libCostRange(key, rarity) {
  if (key === 'partners' || key === 'partner') {
    var v = libPartnerCost(null);
    return [v, v];
  }
  var ranges = (key === 'assets' || key === 'asset') ? COST_RANGES_ASSET : COST_RANGES_ITEM;
  var r = ranges[libRarity(rarity)];
  return r ? r : ranges.common;
}
function libPartnerTier(entry) {
  var m = /第([一二三四五六七1-7])层级/.exec(libText(entry && entry.lifeLevel));
  if (!m) return 1;
  var map = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7 };
  return map[m[1]] || parseInt(m[1], 10) || 1;
}
function libRandCost(key, rarity) {
  var r = libCostRange(key, rarity);
  var lo = Math.ceil(r[0]), hi = Math.floor(r[1]);
  if (hi <= lo) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
function libRarity(v) {
  if (typeof rarityCanon === 'function') { try { var c = rarityCanon(v); if (c) return c; } catch (e) {} }
  var t = libText(v).trim().toLowerCase();
  var m = { common: 'common', uncommon: 'uncommon', rare: 'rare', epic: 'epic', legendary: 'legendary', mythic: 'mythic', only: 'only', '普通': 'common', '优良': 'uncommon', '优秀': 'uncommon', '稀有': 'rare', '史诗': 'epic', '传说': 'legendary', '神话': 'mythic', '唯一': 'only' };
  return m[t] || null;
}
function libNewCost(key, entry) {
  if (!entry || typeof entry !== 'object') return 0;
  if (key === 'background') { delete entry.cost; delete entry.rarity; return 0; }
  if (key === 'partners' || key === 'partner') {
    delete entry.rarity;
    entry.cost = libPartnerCost(entry);
    return entry.cost;
  }
  entry.rarity = libRarity(entry.rarity) || 'common';
  entry.cost = libRandCost(key, entry.rarity);
  return entry.cost;
}
function libStripMeta(entry) {
  var o = libDeep(entry) || {};
  delete o._lid; delete o._kitId; delete o._kitName; delete o._src;
  delete o._opfl; delete o.__opfLibBg;
  return o;
}
// 合并标记：_opfl 表示这条是注入并进最终 JSON 的；下次合并先按标记清掉上一轮的注入，
// 这样用户取消勾选后，导出里不会残留上一次选中的条目。
function libMarkInjected(e) { if (e && typeof e === 'object') { e._opfl = 1; } return e; }
function libStripInjected(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  ['skills', 'equipments', 'items', 'assets', 'partners'].forEach(function (key) {
    if (!Array.isArray(obj[key])) return;
    obj[key] = obj[key].filter(function (e) { return !(e && typeof e === 'object' && e._opfl); });
  });
  var bg = obj.background;
  if (bg && typeof bg === 'object' && bg._opfl) {
    if (obj.__opfLibBg && typeof obj.__opfLibBg === 'object') { obj.background = obj.__opfLibBg; delete obj.__opfLibBg; }
    else delete obj.background;
  }
  return obj;
}
function libStripPresetMarkers(obj) {
  if (Array.isArray(obj)) { obj.forEach(libStripPresetMarkers); return obj; }
  if (!obj || typeof obj !== 'object') return obj;
  delete obj._opfl; delete obj.__opfLibBg;
  Object.keys(obj).forEach(function (k) { var v = obj[k]; if (v && typeof v === 'object') libStripPresetMarkers(v); });
  return obj;
}
function libToPresetEntry(key, entry) {
  var o = libStripMeta(entry) || {};
  o.isCustom = true;
  if (key === 'background') { delete o.cost; delete o.rarity; }
  if (key === 'partners') { delete o.rarity; if (!(Number(o.cost) > 0)) o.cost = libPartnerCost(o); }
  if (key === 'assets') {
    if (!('_隐藏' in o)) o._隐藏 = false;
    if (!o.rarity) o.rarity = 'common';
    if (!Array.isArray(o.标签)) o.标签 = Array.isArray(o.tag) ? o.tag.slice() : [];
    delete o.tag; delete o.effect;
  }
  if (key === 'skills') { if (o.type === '被动') delete o.consume; }
  if (key === 'items') { if (!(Number(o.quantity) > 0)) o.quantity = 1; }
  return o;
}
function libEntryName(e) { return libText(e && e.name).trim() || '（未命名）'; }
function libEntryMeta(e) {
  if (!e) return '';
  if (!('cost' in e) && !('rarity' in e)) return '背景';
  var r = libRarity(e.rarity);
  var rl = '';
  for (var i = 0; i < LIB_RARITY.length; i++) if (LIB_RARITY[i][0] === r) rl = LIB_RARITY[i][1];
  var cost = Number(e.cost);
  return (rl || '普通') + (isFinite(cost) && cost > 0 ? ' · ' + cost + '点' : ' · 无点数');
}
function libEntryWarn(key, e) {
  var w = [];
  if (!e || typeof e !== 'object') return ['条目不是对象'];
  if (!libText(e.name).trim()) w.push('缺名称');
  var r = libRarity(e.rarity);
  if (!r) w.push('品质不是七等之一');
  if (key === 'partners') {
    var pc = Number(e.cost);
    var need = libPartnerCost(e);
    if (!isFinite(pc) || pc <= 0) w.push('缺点数，点 🎲 按生命层级补一个');
    else if (pc !== need) w.push('点数 ' + pc + ' 与生命层级标准 ' + need + ' 不一致（仍可保存）');
  } else if (key !== 'background') {
    var rr = libCostRange(key, r || 'common');
    var cost = Number(e.cost);
    if (!isFinite(cost) || cost <= 0) w.push('缺点数，点 🎲 随机一个');
    else if (cost < rr[0] || cost > rr[1]) w.push('点数 ' + cost + ' 不在 ' + ((r || 'common')) + ' 区间 ' + rr[0] + '-' + rr[1] + '（仍可保存）');
  }
  if (key === 'skills') {
    if (e.type === '被动' && e.consume) w.push('被动技不该写消耗');
    if (e.type !== '被动' && !libText(e.consume).trim()) w.push('主动技缺消耗（攻击/动作: X MP）');
  }
  if (key === 'assets' && e._隐藏 !== false) w.push('资产建议写 _隐藏: false');
  return w;
}
// ---------------- 注入（选取 + 提示词 + 合并） ----------------
function libInjectEnsure() {
  var inj = ST.inject;
  if (!inj || typeof inj !== 'object') { inj = {}; ST.inject = inj; }
  LIB_GROUPS.forEach(function (g) {
    if (g.single) { if (!inj[g.key]) inj[g.key] = null; }
    else if (!Array.isArray(inj[g.key])) inj[g.key] = [];
  });
  return inj;
}
function libInjectList(key) { var inj = libInjectEnsure(); return libGroup(key) && libGroup(key).single ? (inj[key] ? [inj[key]] : []) : (inj[key] || []); }
function libInjectCount(key) { return libInjectList(key).length; }
function libInjectHas(key, lid) { var list = libInjectList(key); for (var i = 0; i < list.length; i++) if (list[i] && list[i]._lid === lid) return true; return false; }
function libInjectAdd(key, entry) {
  if (!entry || typeof entry !== 'object') return false;
  var inj = libInjectEnsure();
  var g = libGroup(key);
  if (!g) return false;
  var snap = libDeep(entry) || {};
  if (!snap._lid) snap._lid = libNewId('e');
  if (!snap._kitId) { var ak = libActiveKit(); if (ak) { snap._kitId = ak.id; snap._kitName = ak.name; } }
  if (g.single) { inj[key] = snap; }
  else if (!libInjectHas(key, snap._lid)) inj[key].push(snap);
  return true;
}
// 库里改了条目（改名/改点数/改字段）时，把已经选进当前草稿的旧快照同步掉，
// 否则用户会看到「卡上还是旧内容」。只按 _lid 匹配，不影响别的选取。
function libSyncInjectEntry(key, entry) {
  if (!entry || !entry._lid) return;
  var inj = libInjectEnsure();
  var g = libGroup(key);
  if (!g) return;
  if (g.single) {
    if (inj[key] && inj[key]._lid === entry._lid) inj[key] = libDeep(entry);
    return;
  }
  var arr = inj[key] || [];
  for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i]._lid === entry._lid) { arr[i] = libDeep(entry); break; }
  try { libRenderInjectCard(); } catch (e) {}
}
function libInjectRemove(key, lid) {
  var inj = libInjectEnsure();
  var g = libGroup(key);
  if (!g) return false;
  if (g.single) { if (inj[key] && inj[key]._lid === lid) { inj[key] = null; return true; } return false; }
  var arr = inj[key];
  for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i]._lid === lid) { arr.splice(i, 1); return true; }
  return false;
}
function libInjectClear(key) {
  var inj = libInjectEnsure();
  var g = libGroup(key);
  if (!g) return;
  if (g.single) inj[key] = null; else inj[key] = [];
}
// 提示词块：不选就返回空串；选了才把这批条目作为「已定稿」塞给模型。
function libInjectPromptBlock(phaseKey) {
  var inj = libInjectEnsure();
  var map = { skill: 'skills', equip: 'equipments', item: 'items', asset: 'assets', partners: 'partners' };
  var keys = [];
  if (phaseKey === 'final') { LIB_GROUPS.forEach(function (g) { keys.push(g.key); }); }
  else if (map[phaseKey]) keys = [map[phaseKey]];
  else if (phaseKey === 'background') keys = ['background'];
  else return '';
  var parts = [];
  keys.forEach(function (key) {
    var g = libGroup(key);
    var fence = String.fromCharCode(96).repeat(3);
    if (key === 'background') {
      if (!inj.background) return;
      var bgBody = JSON.stringify(libStripMeta(inj.background), null, 2);
      parts.push('【' + (g ? g.label : key) + '】\n' + fence + 'json\n' + bgBody + '\n' + fence);
      return;
    }
    var list = inj[key] || [];
    if (!list.length) return;
    var body = JSON.stringify(list.map(function (e) { return libStripMeta(e); }), null, 2);
    parts.push('【' + (g ? g.label : key) + '】\n' + fence + 'json\n' + body + '\n' + fence);
  });
  if (!parts.length) return '';
  var head = '[自备条目 · 已锁定，不得改动]\n下面这些条目由{{user}}亲手编写并保存，已经定稿。';
  if (phaseKey === 'final') head += '最终 JSON 必须原样收录它们：字段、品质、点数、效果、描述一个字都不要改，不得重命名、不得增删词条；AI 自己写的同名条目一律以这些为准。';
  else head += '本栏已有这些条目，视为已经存在：不要重复创作同名条目，只补充其余内容；它们本身一个字都不要改。';
  return head + '\n\n' + parts.join('\n\n');
}
// 落盘前的硬保证：同名替换、异名追加；背景整体覆盖。幂等，重复调用不会越并越多。
function libMergeIntoPreset(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  var inj = libInjectEnsure();
  ['skills', 'equipments', 'items', 'assets', 'partners'].forEach(function (key) {
    if (!Array.isArray(obj[key])) obj[key] = [];
    // 先清掉上一轮注入的条目（标记为 _opfl），再按本次勾选并回去；幂等。
    var arr = obj[key].filter(function (e) { return !(e && typeof e === 'object' && e._opfl); });
    var list = inj[key] || [];
    var used = {};
    list.forEach(function (src) {
      var e = libMarkInjected(libToPresetEntry(key, src));
      var name = libText(e.name).trim();
      var hit = -1;
      for (var i = 0; i < arr.length; i++) {
        if (used[i]) continue;
        if (libText(arr[i] && arr[i].name).trim() === name && name) { hit = i; break; }
      }
      if (hit >= 0) { used[hit] = 1; arr[hit] = e; }
      else { arr.push(e); used[arr.length - 1] = 1; }
    });
    obj[key] = arr;
  });
  // 背景：注入时把 AI 原来的背景备份到 __opfLibBg；用户取消勾选时还原，
  // 否则「取消注入再导出」会留下上一次用户手写的背景。
  var wantBg = inj.background;
  var curBg = obj.background;
  if (curBg && typeof curBg === 'object' && curBg._opfl && !wantBg) {
    if (obj.__opfLibBg && typeof obj.__opfLibBg === 'object') { obj.background = obj.__opfLibBg; delete obj.__opfLibBg; }
    else delete obj.background;
  }
  if (wantBg && typeof wantBg === 'object') {
    if (curBg && typeof curBg === 'object' && !curBg._opfl && !obj.__opfLibBg) obj.__opfLibBg = curBg;
    obj.background = libMarkInjected(libToPresetEntry('background', wantBg));
  }
  return obj;
}

// ---------------- ① 页注入卡 ----------------
function libRenderInjectCard() {
  libEnsureCss();
  var card = libEl('opf-inject-card');
  if (!card) return;
  var inj = libInjectEnsure();
  card.textContent = '';
  var hd = libCreate('div', 'opf-card-hd');
  hd.appendChild(libCreate('span', 'opf-card-no', 'LIB'));
  hd.appendChild(libCreate('span', 'opf-card-t', '自备条目（锁定注入）'));
  hd.appendChild(libCreate('span', 'opf-card-sub', '从开局库选取；汇总时原样并进 JSON'));
  card.appendChild(hd);
  var note = libCreate('div', 'lib-inj-note', '选中的条目由代码原样写进最终 JSON：AI 不能改名、改字段、改点数，生成后的合规自检也会把它们放回原样。');
  card.appendChild(note);
  LIB_GROUPS.forEach(function (g) {
    var list = g.single ? (inj[g.key] ? [inj[g.key]] : []) : (inj[g.key] || []);
    var row = libCreate('div', 'lib-inj-row');
    row.appendChild(libCreate('span', 'lib-inj-label', g.label));
    row.appendChild(libCreate('span', 'lib-inj-count', list.length ? ('已选 ' + list.length) : '未选'));
    var bPick = libCreate('button', 'lib-mini', '选取');
    bPick.type = 'button';
    bPick.title = '从自备开局库里选这一类的条目';
    bPick.addEventListener('click', function () { libPickOpen(g.key); });
    row.appendChild(bPick);
    if (list.length) {
      var bClear = libCreate('button', 'lib-mini danger', '清空');
      bClear.type = 'button';
      bClear.addEventListener('click', function () { libInjectClear(g.key); libRenderInjectCard(); });
      row.appendChild(bClear);
    }
    if (list.length) {
      var chips = libCreate('div', 'lib-inj-chips');
      list.forEach(function (e) {
        var chip = libCreate('span', 'lib-chip');
        chip.appendChild(libCreate('span', '', libEntryName(e) + ' · ' + libEntryMeta(e)));
        var x = libCreate('button', '', '✕');
        x.type = 'button'; x.title = '从锁定注入里移除';
        x.addEventListener('click', function () { libInjectRemove(g.key, e._lid); libRenderInjectCard(); });
        chip.appendChild(x);
        chips.appendChild(chip);
      });
      row.appendChild(chips);
    }
    card.appendChild(row);
  });
  var foot = libCreate('div', 'lib-inj-note');
  var total = 0; LIB_GROUPS.forEach(function (g) { total += libInjectCount(g.key); });
  foot.textContent = total ? ('共锁定 ' + total + ' 条；没选的栏目照常由 AI 生成。') : '没有锁定条目：去「自备开局」页写/生成条目，再回来选取。';
  card.appendChild(foot);
  var go = libCreate('button', 'lib-mini', '去自备开局库');
  go.type = 'button';
  go.addEventListener('click', function () { try { switchPage('library'); } catch (e) {} });
  card.appendChild(go);
}

// 选取弹窗：按库分组，勾选即写进 ST.inject；关掉就刷新注入卡。
function libPickOpen(key) {
  var g = libGroup(key);
  if (!g) return;
  var old = libEl('opf-lib-picker');
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var lib = libInit();
  var mask = libCreate('div', 'lib-mask');
  mask.id = 'opf-lib-picker';
  var box = libCreate('div', 'lib-picker');
  var hd = libCreate('div', 'lib-picker-hd', '选取' + g.label + ' · 自备开局库');
  var close = libCreate('button', 'lib-mini', '关闭');
  close.type = 'button';
  hd.appendChild(close);
  var body = libCreate('div', 'lib-picker-body');
  var foot = libCreate('div', 'lib-picker-ft');
  var stat = libCreate('span', '', '');
  stat.style.fontSize = '11px'; stat.style.color = 'rgba(255,200,208,.55)';
  var goLib = libCreate('button', 'lib-mini', '去写新条目');
  goLib.type = 'button';
  var done = libCreate('button', 'lib-mini', '完成');
  done.type = 'button';
  function refreshStat() { stat.textContent = '当前已选 ' + libInjectCount(key) + ' 条'; }
  refreshStat();
  if (!lib.kits.length) {
    body.appendChild(libCreate('div', 'lib-empty', '还没有自备开局库：去「自备开局」页新建一个，写几条或按概要让 AI 生成。'));
  }
  var shownEntries = 0;
  lib.kits.forEach(function (kit) {
    var list = libEntryArray(kit, key);
    if (!list.length) return;
    shownEntries += list.length;
    body.appendChild(libCreate('div', 'lib-picker-group', kit.name + '（' + list.length + '）'));
    list.forEach(function (e) {
      var row = libCreate('label', 'lib-picker-item');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = libInjectHas(key, e._lid);
      cb.addEventListener('change', function () {
        if (cb.checked) { libInjectAdd(key, e); if (g.single) { body.querySelectorAll('input[type=checkbox]').forEach(function (x) { if (x !== cb) x.checked = false; }); } }
        else libInjectRemove(key, e._lid);
        refreshStat();
      });
      row.appendChild(cb);
      row.appendChild(libCreate('span', 'lib-entry-name', libEntryName(e)));
      row.appendChild(libCreate('span', 'lib-entry-meta', libEntryMeta(e)));
      body.appendChild(row);
    });
  });
  if (lib.kits.length && !shownEntries) {
    body.appendChild(libCreate('div', 'lib-empty', '这些库里「' + g.label + '」这一栏还是空的：去「自备开局」页新增，或点「AI 补此栏」按概要生成。'));
  }
  function closePicker() { try { mask.parentNode.removeChild(mask); } catch (e) {} libRenderInjectCard(); }
  close.addEventListener('click', closePicker);
  done.addEventListener('click', closePicker);
  goLib.addEventListener('click', function () { closePicker(); try { switchPage('library'); } catch (e) {} });
  mask.addEventListener('click', function (ev) { if (ev.target === mask) closePicker(); });
  foot.appendChild(stat); foot.appendChild(goLib); foot.appendChild(done);
  box.appendChild(hd); box.appendChild(body); box.appendChild(foot);
  mask.appendChild(box);
  // 挂进 shell 而不是 body：这样弹窗能继承当前界面风格（.opf-theme-*）
  var host = libEl('opf-shell') || (typeof document !== 'undefined' ? document.body : null);
  if (host) host.appendChild(mask);
}

// ---------------- AI 生成 ----------------
function libAiTask(category) {
  var g = category ? libGroup(category) : null;
  var lines = [];
  lines.push('[任务] 根据{{user}}给的开局概要，写一套可以直接导进角色卡开局预设的条目。');
  lines.push('只输出一个 JSON 对象，放在 ' + String.fromCharCode(96).repeat(3) + 'text 代码块里。');
  lines.push('键固定为：skills / equipments / items / assets / partners / background。');
  if (g) lines.push('这次只写「' + g.label + '」这一栏，其余键输出空数组（background 输出 null）。');
  lines.push('字段要求：');
  lines.push('- 技能：name / rarity / type(主动或被动) / consume(主动必填「攻击: X MP」或「动作: X MP/SP」，被动不写) / tag[] / effect{效果名: 效果内容} / description；');
  lines.push('- 装备：name / rarity / type / tag[] / effect / description（装备不增减属性，标签写「攻击: N」「防御: N」「防御(部位): N」）；');
  lines.push('- 道具：name / rarity / type / tag[] / quantity / effect / description；');
  lines.push('- 资产：name / rarity / 类型 / 标签[] / 总空间 / 结算 / 位置 / 描述 / 内部资产{} / _隐藏:false；');
  lines.push('- 伙伴：name / cost / lifeLevel / level / race / identity[] / career[] / personality / like / app / cloth / equip[] / attributes{strength,dexterity,constitution,intelligence,mind} / stairway{isOpen} / isContract / affinity / comment / backgroundInfo / skills[]；没有契约伙伴就 partners: []；');
  lines.push('- 背景：background = { name: "【自定义开局】", description: "开局剧情，不少于500字，和等级、身份、资产、伙伴咬合" }。');
  lines.push('品质只用英文七等之一：common / uncommon / rare / epic / legendary / mythic / only。');
  lines.push('点数 cost 不用你算：每条的 cost 写 0 即可，插件会按品质区间随机生成。');
  lines.push('不要写 isCustom，插件会补。');
  lines.push('必须遵守下面的世界规则、生成规范与文风设置。');
  lines.push('[世界规则·创作限制]\n' + (typeof WORLD_RULES === 'string' ? WORLD_RULES : ''));
  lines.push((typeof COMPLIANCE_SPEC === 'string' ? COMPLIANCE_SPEC : ''));
  try { if (typeof styleRulesAll === 'function') lines.push(styleRulesAll()); } catch (e) {}
  return macroFill(lines.join('\n\n'));
}
function libParseAiResult(text, category) {
  var ex = null;
  try { ex = extractJson(String(text || '')); } catch (e) { return null; }
  if (!ex || !ex.ok || !ex.obj || typeof ex.obj !== 'object') return null;
  var obj = ex.obj;
  var out = { skills: [], equipments: [], items: [], assets: [], partners: [], background: null };
  var keys = category ? [category] : ['skills', 'equipments', 'items', 'assets', 'partners', 'background'];
  keys.forEach(function (key) {
    if (key === 'background') {
      var bg = obj.background || obj['背景'];
      if (bg && typeof bg === 'object') out.background = bg;
      return;
    }
    var arr = obj[key];
    if (!Array.isArray(arr)) return;
    out[key] = arr.filter(function (e) { return e && typeof e === 'object' && !Array.isArray(e); });
  });
  return out;
}
// 把 AI 结果规范成库内条目：品质归一、点数强制随机、补内部字段。
function libApplyAiResult(kit, parsed, category) {
  if (!kit || !parsed) return { added: 0, cats: 0 };
  var added = 0, cats = 0;
  var keys = category ? [category] : LIB_GROUPS.map(function (g) { return g.key; });
  keys.forEach(function (key) {
    var g = libGroup(key);
    if (!g) return;
    if (key === 'background') {
      if (!parsed.background) return;
      var bg = libCleanEntry('background', parsed.background);
      if (!bg) return;
      bg.name = '【自定义开局】';
      bg.description = libText(bg.description || bg['描述']);
      kit.entries.background = bg; added++; cats++;
      return;
    }
    var list = parsed[key] || [];
    if (!list.length) return;
    var next = [];
    list.forEach(function (raw) {
      var e = libCleanEntry(key, raw);
      if (!e) return;
      e._lid = libNewId('e');
      if (key === 'partners') {
        delete e.rarity;
        e.cost = libPartnerCost(e);
      } else {
        e.rarity = libRarity(e.rarity) || 'common';
        e.cost = libRandCost(key, e.rarity);
      }
      e.isCustom = true;
      if (key === 'assets') e._隐藏 = false;
      if (key === 'skills' && e.type === '被动') delete e.consume;
      if (key === 'items' && !(Number(e.quantity) > 0)) e.quantity = 1;
      next.push(e);
    });
    if (next.length) { kit.entries[key] = next; added += next.length; cats++; }
  });
  libTouch(kit);
  return { added: added, cats: cats };
}
async function libAiGenerate(category) {
  category = category || '';
  var kit = libActiveKit();
  if (!kit) { toast('先新建或选中一个自备开局库', 'warning'); return; }
  if (ST.running) { toast('已有任务进行中（单线程），请稍候', 'warning'); return; }
  var sEl = libEl('opf-lib-summary') || libEl('opf-lib-name');
  var summary = libText(kit.summary);
  if (!summary.trim()) summary = '';
  if (sEl && sEl.id === 'opf-lib-summary') summary = libText(sEl.value);
  if (!summary.trim()) { libStatus('先在「概要」里写几句这个开局想要什么，再让 AI 生成。'); toast('概要还是空的', 'warning'); return; }
  kit.summary = summary;
  if (category) {
    var has = libEntryArray(kit, category).length;
    if (has && !libConfirm('AI 生成会替换当前「' + libGroup(category).label + '」里的 ' + has + ' 条，继续？', true)) return;
  } else {
    var total = 0; LIB_GROUPS.forEach(function (g) { total += libEntryArray(kit, g.key).length; });
    if (total && !libConfirm('AI 生成会按分类替换当前库里的条目（共 ' + total + ' 条），继续？', true)) return;
  }
  var label = category ? (libGroup(category).label + '条目') : '全套条目';
  ST.running = true; ST.stopReq = false;
  libSetBusy(true);
  libStatus('AI 正在按概要写' + label + '…（模型返回前页面看起来是静止的）');
  try {
    var msgs = sxMessages(libAiTask(category), '[开局概要]\n' + summary);
    var resp = await callModelSeg(msgs, '自备开局库·' + label);
    var parsed = libParseAiResult(resp, category);
    if (!parsed) { libStatus('没从回复里解析出 JSON，换次模型或把概要写具体点再试。'); toast('AI 结果解析失败', 'warning'); return; }
    var r = libApplyAiResult(kit, parsed, category);
    libSave(); libRender();
    libStatus(r.added ? ('已生成 ' + r.added + ' 条' + (r.cats ? '（' + r.cats + ' 个分类）' : '') + '；点数已按品质随机。可逐条手改后点「保存库」。') : '模型没给出可用条目，换一种说法再试。');
    toast(r.added ? ('已生成 ' + r.added + ' 条' + label) : 'AI 没有生成条目', r.added ? 'info' : 'warning');
  } catch (e) {
    libStatus('AI 生成出错：' + (e && e.message ? e.message : e));
    toast('AI 生成出错：' + (e && e.message ? e.message : e), 'error');
  } finally { ST.running = false; libSetBusy(false); }
}
// AI 生成期间把页内按钮全禁掉，避免边生成边改库造成两套状态。
function libSetBusy(on) {
  try {
    var page = libEl('opf-page-library'); if (!page || !page.querySelectorAll) return;
    var list = page.querySelectorAll('button');
    for (var i = 0; i < list.length; i++) list[i].disabled = !!on;
  } catch (e) { opfErr('libSetBusy', e); }
}

// ---------------- 库页面 ----------------
// 只写盘，不重绘页面：给「编辑中不想被刷掉」的行内操作（🎲/复制/改名/概要）用。
function libPersist() {
  var lib = libInit();
  var ok = false;
  try {
    var txt = JSON.stringify({ v: 1, kits: lib.kits, activeId: lib.activeId });
    if (txt.length > 3.5 * 1024 * 1024) toast('自备开局库较大（约 ' + Math.round(txt.length / 1024) + 'KB），浏览器本地存储可能吃紧；建议导出备份', 'warning');
    ok = lsSet(LIB_KEY, { v: 1, kits: lib.kits, activeId: lib.activeId });
  } catch (e) { opfErr('libPersist', e); }
  try { libRenderInjectCard(); } catch (e) { opfErr('libPersist inject', e); }
  return ok;
}
function libSave() {
  var ok = libPersist();
  try { libRender(); } catch (e) { opfErr('libSave render', e); }
  return ok;
}
function libRender() {
  libEnsureCss();
  var page = libEl('opf-page-library');
  if (!page) return;
  libInit();
  try { libRenderKitList(); } catch (e) { opfErr('lib kitlist', e); }
  try { libRenderKitCard(); } catch (e) { opfErr('lib kitcard', e); }
  try { libRenderEntries(); } catch (e) { opfErr('lib entries', e); }
  try { libRenderEditor(); } catch (e) { opfErr('lib editor', e); }
  try { var st = libEl('opf-lib-status'); if (st && !libText(st.textContent)) libStatus('就绪。'); } catch (e) {}
}
function libRenderKitList() {
  var box = libEl('opf-lib-kitlist'); if (!box) return;
  box.textContent = '';
  var lib = libInit();
  if (!lib.kits.length) { box.appendChild(libCreate('div', 'lib-empty', '还没有开局库。点「＋ 新建库」写第一份；也可以先「📥 导入」之前导出的 JSON。')); return; }
  lib.kits.forEach(function (kit) {
    var row = libCreate('div', 'lib-kitrow' + (kit.id === lib.activeId ? ' active' : ''));
    var nm = libCreate('span', 'lib-kitname', kit.name);
    nm.title = kit.name;
    var n = 0; LIB_GROUPS.forEach(function (g) { n += libEntryArray(kit, g.key).length; });
    var meta = libCreate('span', 'lib-kitmeta', n + ' 条');
    var del = libCreate('button', 'lib-kitdel', '✕');
    del.type = 'button'; del.title = '删除这个库（不影响已经注入到开局预设里的快照）';
    del.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (!libConfirm('删除开局库「' + kit.name + '」？不可撤销。', false)) return;
      libDeleteKit(kit.id); libRender();
    });
    row.appendChild(nm); row.appendChild(meta); row.appendChild(del);
    row.addEventListener('click', function () { libSetActive(kit.id); libSave(); });
    box.appendChild(row);
  });
}
function libRenderKitCard() {
  var lib = libInit();
  var kit = libActiveKit();
  var nameEl = libEl('opf-lib-name');
  var sumEl = libEl('opf-lib-summary');
  if (nameEl) nameEl.value = kit ? kit.name : '';
  if (sumEl) sumEl.value = kit ? libText(kit.summary) : '';
  var card = libEl('opf-lib-kitcard');
  if (card) card.style.display = kit ? '' : 'none';
  var stat = libEl('opf-lib-kitstat');
  if (stat) {
    stat.textContent = kit
      ? ('条数：' + libEntryArray(kit, 'skills').length + ' 技能 / ' + libEntryArray(kit, 'equipments').length + ' 装备 / ' + libEntryArray(kit, 'items').length + ' 道具 / ' + libEntryArray(kit, 'assets').length + ' 资产 / ' + libEntryArray(kit, 'partners').length + ' 伙伴' + (kit.entries.background ? ' / 1 背景' : ''))
      : '（先新建或选中一个库）';
  }
}
function libGroupRow(g, kit) {
  var head = libCreate('div', 'lib-cat');
  head.appendChild(libCreate('span', 'lib-cat-t', g.label));
  head.appendChild(libCreate('span', 'lib-cat-n', libEntryArray(kit, g.key).length + ' 条'));
  var add = libCreate('button', 'lib-mini', '＋ 新增');
  add.type = 'button';
  add.addEventListener('click', function () {
    if (g.single && kit.entries[g.key] && !libConfirm('背景已经有一条了，要覆盖成新的空背景吗？', false)) return;
    var e = libAddEntry(kit, g.key);
    libPersist(); libRenderEntries(); libEditOpen(g.key, e && e._lid);
  });
  head.appendChild(add);
  if (g.key !== 'background') {
    var ai = libCreate('button', 'lib-mini', 'AI 补此栏');
    ai.type = 'button';
    ai.title = '按概要只生成这一分类';
    ai.addEventListener('click', function () { libAiGenerate(g.key); });
    head.appendChild(ai);
  }
  return head;
}
function libRenderEntries() {
  var box = libEl('opf-lib-entries'); if (!box) return;
  box.textContent = '';
  var kit = libActiveKit();
  if (!kit) { box.appendChild(libCreate('div', 'lib-empty', '先在上面新建/选中一个库。')); return; }
  LIB_GROUPS.forEach(function (g) {
    box.appendChild(libGroupRow(g, kit));
    var list = libEntryArray(kit, g.key);
    if (!list.length) { box.appendChild(libCreate('div', 'lib-empty', '（这一栏还没条目：点「＋ 新增」手写，或「AI 补此栏」按概要生成）')); return; }
    list.forEach(function (e) {
      var row = libCreate('div', 'lib-entry');
      var nm = libCreate('span', 'lib-entry-name', libEntryName(e));
      nm.title = libEntryName(e);
      row.appendChild(nm);
      row.appendChild(libCreate('span', 'lib-entry-meta', libEntryMeta(e)));
      var bEdit = libCreate('button', 'lib-mini', '编辑');
      bEdit.type = 'button'; bEdit.addEventListener('click', function () { libEditOpen(g.key, e._lid); });
      row.appendChild(bEdit);
      var bRoll = libCreate('button', 'lib-mini', '🎲 点数');
      bRoll.type = 'button'; bRoll.title = '按品质区间重新随机点数';
      bRoll.addEventListener('click', function () { libNewCost(g.key, e); libSyncInjectEntry(g.key, e); libPersist(); libRenderEntries(); });
      row.appendChild(bRoll);
      var bCopy = libCreate('button', 'lib-mini', '复制');
      bCopy.type = 'button';
      bCopy.addEventListener('click', function () {
        if (g.single) { toast('背景只有一条，不能复制自己', 'warning'); return; }
        var c = libDeep(e) || {}; c._lid = libNewId('e');
        kit.entries[g.key].push(c); libTouch(kit);
        libPersist(); libRenderEntries();
      });
      row.appendChild(bCopy);
      var bInj = libCreate('button', 'lib-mini', '→注入');
      bInj.type = 'button'; bInj.title = '加入当前开局预设的锁定注入（会跟着草稿存档）';
      bInj.addEventListener('click', function () { libInjectAdd(g.key, e); libRenderInjectCard(); toast('已加入锁定注入：' + libEntryName(e)); });
      row.appendChild(bInj);
      var bDel = libCreate('button', 'lib-mini danger', '删除');
      bDel.type = 'button';
      bDel.addEventListener('click', function () {
        if (!libConfirm('删除条目「' + libEntryName(e) + '」？', false)) return;
        libRemoveEntry(kit, g.key, e._lid);
        if (LIB.ui && LIB.ui.key === g.key && LIB.ui.lid === e._lid) libEditClose();
        libPersist(); libRenderEntries();
      });
      row.appendChild(bDel);
      box.appendChild(row);
    });
  });
}
function libEditOpen(key, lid) {
  var kit = libActiveKit(); if (!kit) return;
  var e = libFindEntry(kit, key, lid);
  if (!e) return;
  LIB.ui = { key: key, lid: lid, mode: key === 'partners' ? 'raw' : 'form' };
  libRenderEditor();
  var ed = libEl('opf-lib-editor'); if (ed) ed.style.display = '';
  try { if (ed && ed.scrollIntoView) ed.scrollIntoView({ block: 'nearest' }); } catch (err) {}
}
function libEditClose() { LIB.ui = null; var ed = libEl('opf-lib-editor'); if (ed) ed.style.display = 'none'; }
function libEditorField(label, id, value, hint) {
  var wrap = libCreate('div', 'lib-field');
  wrap.appendChild(libCreate('label', '', label));
  var inp = document.createElement('input');
  inp.type = 'text'; inp.id = id; inp.value = libText(value);
  if (hint) inp.placeholder = hint;
  wrap.appendChild(inp);
  return wrap;
}
function libEditorTextarea(label, id, value, hint, minH) {
  var wrap = libCreate('div', 'lib-field');
  wrap.appendChild(libCreate('label', '', label));
  var ta = document.createElement('textarea');
  ta.id = id; ta.value = libText(value);
  if (hint) ta.placeholder = hint;
  if (minH) ta.style.minHeight = minH;
  wrap.appendChild(ta);
  return wrap;
}
function libEffectsText(e) {
  var out = [];
  if (e && e.effect && typeof e.effect === 'object') Object.keys(e.effect).forEach(function (k) { out.push(k + ': ' + libText(e.effect[k])); });
  return out.join('\n');
}
function libParseEffects(text) {
  var out = {};
  libText(text).split(/\r?\n/).forEach(function (ln) {
    var s = ln.trim(); if (!s) return;
    var m = /^([^:：]+)[:：]\s*(.*)$/.exec(s);
    if (m) out[m[1].trim()] = m[2].trim();
    else out[s] = '';
  });
  return out;
}
function libTagsText(e) {
  var arr = (e && (e.tag || e.标签)) || [];
  return Array.isArray(arr) ? arr.join('\n') : '';
}
function libParseTags(text) {
  return libText(text).split(/[\n,，、;；]+/).map(function (s) { return s.trim(); }).filter(Boolean);
}
function libRenderEditor() {
  var ed = libEl('opf-lib-editor'); if (!ed) return;
  var body = libEl('opf-lib-editor-body'); if (!body) return;
  var kit = libActiveKit();
  var ui = LIB.ui;
  var e = (kit && ui) ? libFindEntry(kit, ui.key, ui.lid) : null;
  if (!e || !ui) { ed.style.display = 'none'; return; }
  ed.style.display = '';
  var g = libGroup(ui.key);
  var title = libEl('opf-lib-editor-title'); if (title) title.textContent = '编辑' + (g ? g.label : '条目') + ' · ' + libEntryName(e);
  var mode = libEl('opf-lib-editor-mode'); if (mode) mode.textContent = '手写内容；点数可随机';
  var rawBtn = libEl('opf-lib-editor-raw');
  if (rawBtn) rawBtn.textContent = ui.mode === 'raw' ? '表单' : '原始 JSON';
  body.textContent = '';
  var key = ui.key;
  if (ui.mode === 'raw') {
    // 原始 JSON：字段多/要写模板没有的字段时最稳；保存时照样会补点数、规范化品质。
    if (mode) mode.textContent = '整条 JSON；保存时自动补点数、规范化品质';
    body.appendChild(libEditorTextarea('条目 JSON（整条）', 'lib-f-raw', JSON.stringify(libStripMeta(e), null, 2), '', '320px'));
    var rw = libEl('opf-lib-editor-warn'); if (rw) rw.textContent = libEntryWarn(key, e).join('\n');
    return;
  }
  if (key === 'background') {
    body.appendChild(libEditorField('名称', 'lib-f-name', e.name || '【自定义开局】'));
    body.appendChild(libEditorTextarea('描述', 'lib-f-desc', e.description, '开局剧情', '180px'));
  } else if (key === 'partners') {
    body.appendChild(libEditorField('名称', 'lib-f-name', e.name));
    var costWrap = libCreate('div', 'lib-field');
    costWrap.appendChild(libCreate('label', '', '点数（按生命层级随机）'));
    var row = libCreate('div', 'lib-row');
    var costInp = document.createElement('input'); costInp.type = 'number'; costInp.id = 'lib-f-cost'; costInp.value = Number(e.cost) || 0; costInp.style.flex = '1 1 auto';
    var roll = libCreate('button', 'lib-mini', '🎲'); roll.type = 'button';
    roll.title = '按生命层级取标准点数';
    roll.addEventListener('click', function () { costInp.value = libPartnerCost(e); });
    row.appendChild(costInp); row.appendChild(roll);
    costWrap.appendChild(row); body.appendChild(costWrap);
    body.appendChild(libEditorTextarea('伙伴 JSON（整条，可直接改任意字段）', 'lib-f-json', JSON.stringify(libStripMeta(e), null, 2), '', '260px'));
  } else {
    body.appendChild(libEditorField('名称', 'lib-f-name', e.name));
    var rWrap = libCreate('div', 'lib-field');
    rWrap.appendChild(libCreate('label', '', '品质'));
    var sel = document.createElement('select'); sel.id = 'lib-f-rarity';
    LIB_RARITY.forEach(function (pair) { var op = document.createElement('option'); op.value = pair[0]; op.textContent = pair[1] + '（' + pair[0] + '）'; sel.appendChild(op); });
    sel.value = libRarity(e.rarity) || 'common';
    rWrap.appendChild(sel);
    body.appendChild(rWrap);
    var cWrap = libCreate('div', 'lib-field');
    cWrap.appendChild(libCreate('label', '', '点数（按品质区间随机）'));
    var crow = libCreate('div', 'lib-row');
    var cinp = document.createElement('input'); cinp.type = 'number'; cinp.id = 'lib-f-cost'; cinp.value = Number(e.cost) || 0; cinp.style.flex = '1 1 auto';
    var cbtn = libCreate('button', 'lib-mini', '🎲 随机'); cbtn.type = 'button';
    cbtn.addEventListener('click', function () { cinp.value = libRandCost(key, sel.value); });
    // 品质改了只在当前点数越出新区间时才重随机，并说明原因；否则保留用户手填的数。
    sel.addEventListener('change', function () {
      var cur = parseInt(cinp.value, 10);
      var rr = libCostRange(key, sel.value);
      if (!isFinite(cur) || cur < rr[0] || cur > rr[1]) {
        cinp.value = libRandCost(key, sel.value);
        toast('点数越出「' + sel.value + '」区间 ' + rr[0] + '-' + rr[1] + '，已重随机');
      }
    });
    crow.appendChild(cinp); crow.appendChild(cbtn);
    cWrap.appendChild(crow); body.appendChild(cWrap);
    if (key !== 'assets') body.appendChild(libEditorField('类型', 'lib-f-type', e.type, '如 武器 / 消耗品 / 主动'));
    if (key === 'skills') {
      var tWrap = libCreate('div', 'lib-field');
      tWrap.appendChild(libCreate('label', '', '技能类型'));
      var tsel = document.createElement('select'); tsel.id = 'lib-f-skilltype';
      ['主动', '被动'].forEach(function (t) { var op = document.createElement('option'); op.value = t; op.textContent = t; tsel.appendChild(op); });
      tsel.value = e.type === '被动' ? '被动' : '主动';
      tWrap.appendChild(tsel); body.appendChild(tWrap);
      var cons = libEditorField('消耗（主动技必填，如 攻击: 20MP；被动留空）', 'lib-f-consume', e.consume || '', '攻击: 20MP');
      body.appendChild(cons);
      tsel.addEventListener('change', function () {
        var inp = libEl('lib-f-consume');
        if (inp) { inp.disabled = tsel.value === '被动'; if (tsel.value === '被动') inp.value = ''; }
      });
      if (tsel.value === '被动') { var ci = libEl('lib-f-consume'); if (ci) ci.disabled = true; }
    }
    if (key === 'items') {
      var qWrap = libCreate('div', 'lib-field');
      qWrap.appendChild(libCreate('label', '', '数量'));
      var qinp = document.createElement('input'); qinp.type = 'number'; qinp.id = 'lib-f-quantity'; qinp.value = Number(e.quantity) > 0 ? Number(e.quantity) : 1;
      qWrap.appendChild(qinp); body.appendChild(qWrap);
    }
    if (key === 'assets') {
      body.appendChild(libEditorField('类型', 'lib-f-type', e['类型'], '住宅 / 店铺 / 载具 / 工坊 …'));
      body.appendChild(libEditorTextarea('标签（每行一个）', 'lib-f-tags', libTagsText(e), '', '60px'));
      body.appendChild(libEditorField('总空间', 'lib-f-space', e['总空间'], '层/分区: 房间列表;面积:XXm²'));
      body.appendChild(libEditorField('结算', 'lib-f-settle', e['结算'], '资产估价: X Z;总租金: Y Z/天;上次结算日: 尚未结算'));
      body.appendChild(libEditorField('位置', 'lib-f-loc', e['位置'], '所在城市/地区'));
      body.appendChild(libEditorTextarea('描述', 'lib-f-desc', e['描述'], '外观、环境与背景', '70px'));
      body.appendChild(libEditorTextarea('内部资产（JSON，可为 {}）', 'lib-f-inner', JSON.stringify(e['内部资产'] || {}, null, 2), '', '110px'));
      var hWrap = libCreate('div', 'lib-field');
      hWrap.appendChild(libCreate('label', '', '在开局预设里显示'));
      var hsel = document.createElement('select'); hsel.id = 'lib-f-hide';
      [['false', '显示（_隐藏: false）'], ['true', '隐藏（_隐藏: true）']].forEach(function (pair) {
        var op = document.createElement('option'); op.value = pair[0]; op.textContent = pair[1]; hsel.appendChild(op);
      });
      hsel.value = e._隐藏 === true ? 'true' : 'false';
      hWrap.appendChild(hsel); body.appendChild(hWrap);
    } else {
      body.appendChild(libEditorTextarea('标签（每行一个）', 'lib-f-tags', libTagsText(e), '力量 / 单体 / 伤害 …', '60px'));
      body.appendChild(libEditorTextarea('效果（每行「效果名: 效果内容」）', 'lib-f-effect', libEffectsText(e), '能量伤害: 造成100%能量伤害', '70px'));
      body.appendChild(libEditorTextarea('描述', 'lib-f-desc', e.description, '叙事性描述', '70px'));
    }
  }
  var warn = libEl('opf-lib-editor-warn'); if (warn) warn.textContent = libEntryWarn(key, e).join('\n');
}
// 编辑器保存的唯一出口：把条目写回库、同步已锁定的快照、刷新注入卡。
function libCommitEditorEntry(kit, key, old, e) {
  e._lid = old._lid;
  if (key === 'background') {
    e.name = libText(e.name).trim() || '【自定义开局】';
    e.description = libText(e.description);
    e.isCustom = true;
    delete e.cost; delete e.rarity;
    kit.entries.background = e;
  } else {
    var arr = kit.entries[key] || (kit.entries[key] = []);
    for (var i = 0; i < arr.length; i++) if (arr[i]._lid === old._lid) { arr[i] = e; break; }
  }
  libTouch(kit);
  libSyncInjectEntry(key, e);
  return e;
}
function libEditorRead() {
  var kit = libActiveKit(); var ui = LIB.ui;
  if (!kit || !ui) return null;
  var old = libFindEntry(kit, ui.key, ui.lid); if (!old) return null;
  var key = ui.key;
  function val(id) { var el = libEl(id); return el ? libText(el.value) : ''; }
  // 原始 JSON 模式：整条解析后交给 libCleanEntry 补点数、规范化品质
  if (ui.mode === 'raw') {
    var raw = val('lib-f-raw');
    var obj = null;
    try { obj = JSON.parse(raw); } catch (err) { toast('条目 JSON 解析失败：' + (err && err.message ? err.message : err), 'error'); return null; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { toast('条目 JSON 必须是一个对象', 'error'); return null; }
    obj._lid = old._lid;
    var cleaned = libCleanEntry(key, obj);
    if (!cleaned) { toast('条目 JSON 无法规范化', 'error'); return null; }
    if (!libText(cleaned.name).trim()) cleaned.name = libText(old.name) || '未命名条目';
    if (key === 'assets') cleaned._隐藏 = cleaned._隐藏 === true;
    if (key === 'skills' && cleaned.type === '被动') delete cleaned.consume;
    return libCommitEditorEntry(kit, key, old, cleaned);
  }
  var e = libDeep(old) || {};
  if (val('lib-f-name')) e.name = val('lib-f-name').trim();
  if (key === 'partners') {
    var praw = val('lib-f-json');
    var pobj = null;
    try { pobj = JSON.parse(praw); } catch (err) { toast('伙伴 JSON 解析失败：' + (err && err.message ? err.message : err), 'error'); return null; }
    if (!pobj || typeof pobj !== 'object' || Array.isArray(pobj)) { toast('伙伴 JSON 必须是一个对象', 'error'); return null; }
    e = libCleanEntry('partners', pobj) || pobj;
    if (val('lib-f-name')) e.name = val('lib-f-name').trim();
    var ci = libEl('lib-f-cost'); if (ci) e.cost = parseInt(ci.value, 10) || libPartnerCost(e);
    delete e.rarity;
  } else if (key === 'background') {
    e.name = val('lib-f-name').trim() || '【自定义开局】';
    e.description = val('lib-f-desc');
    delete e.cost; delete e.rarity;
    e.isCustom = true;
  } else {
    var rar = val('lib-f-rarity'); if (rar) e.rarity = rar;
    var cost = parseInt(val('lib-f-cost'), 10); if (isFinite(cost)) e.cost = cost;
    if (key !== 'assets') { if (val('lib-f-type')) e.type = val('lib-f-type').trim(); }
    if (key === 'skills') {
      var st = val('lib-f-skilltype'); if (st) e.type = st;
      e.consume = val('lib-f-consume').trim();
      if (e.type === '被动') delete e.consume;
    }
    if (key === 'items') { var q = parseInt(val('lib-f-quantity'), 10); e.quantity = isFinite(q) && q > 0 ? q : 1; }
    e.tag = libParseTags(val('lib-f-tags'));
    if (key === 'assets') {
      e['标签'] = e.tag.slice(); delete e.tag;
      e['类型'] = val('lib-f-type').trim();
      e['总空间'] = val('lib-f-space');
      e['结算'] = val('lib-f-settle');
      e['位置'] = val('lib-f-loc');
      e['描述'] = val('lib-f-desc');
      var inner = val('lib-f-inner');
      try { e['内部资产'] = inner.trim() ? JSON.parse(inner) : {}; } catch (err2) { toast('内部资产 JSON 解析失败：' + (err2 && err2.message ? err2.message : err2), 'error'); return null; }
      e._隐藏 = val('lib-f-hide') === 'true';
      delete e.effect;
    } else {
      e.effect = libParseEffects(val('lib-f-effect'));
      e.description = val('lib-f-desc');
    }
    e.isCustom = true;
  }
  return libCommitEditorEntry(kit, key, old, e);
}

// ---------------- 捏物收藏扩展（fated-opening-templates）导入 ----------------
// 该扩展导出的 JSON 长这样：
//   { format:"fated-opening-templates", schemaVersion:1, templates:[
//       { id, name, updatedAt, library:{ equipment:[{id,payload}], item:[…], asset:[…],
//                                         skill:[…], partner:[…], background:[…] } } ] }
// payload 就是开局预设同目录的条目对象；我们按分类搬进自备库，点数原样保留。
var LIB_PACK_FORMAT = 'fated-opening-templates';
var LIB_PACK_TYPES = [
  { from: 'equipment', to: 'equipments' },
  { from: 'item', to: 'items' },
  { from: 'asset', to: 'assets' },
  { from: 'skill', to: 'skills' },
  { from: 'partner', to: 'partners' },
  { from: 'background', to: 'background' }
];
function libLooksLikePackLibrary(obj) {
  if (!obj || typeof obj !== 'object') return false;
  for (var i = 0; i < LIB_PACK_TYPES.length; i++) if (Array.isArray(obj[LIB_PACK_TYPES[i].from])) return true;
  return false;
}
// 纯函数：认三种形态（扩展导出的捏物包 / 扩展本地存储 / 裸 library），统一成 [{name, library}]。
function libParseCollectionPack(obj, fileName) {
  if (!obj || typeof obj !== 'object') return null;
  var templates = null;
  if (obj.format === LIB_PACK_FORMAT && Array.isArray(obj.templates)) templates = obj.templates;
  else if (obj.schemaVersion === 1 && obj.library && typeof obj.library === 'object' && Array.isArray(obj.templates)) templates = obj.templates;
  else if (libLooksLikePackLibrary(obj)) templates = [{ name: fileName ? String(fileName).replace(/\.json$/i, '') : '导入的捏物包', library: obj }];
  if (!templates) return null;
  var out = [];
  templates.forEach(function (t) {
    if (!t || typeof t !== 'object') return;
    var libData = t.library && typeof t.library === 'object' ? t.library : null;
    if (!libData || !libLooksLikePackLibrary(libData)) return;
    out.push({ name: libText(t.name).trim() || '导入的捏物包', updatedAt: t.updatedAt || '', library: libData });
  });
  // 扩展本地存储：templates 为空但 library 有内容时，整份 library 当一个包
  if (!out.length && obj.library && libLooksLikePackLibrary(obj.library)) {
    out.push({ name: '导入的捏物包', library: obj.library });
  }
  return out.length ? out : null;
}
function libUniqueKitName(base) {
  var name = libText(base).trim() || '导入的捏物包';
  var used = {};
  libKits().forEach(function (k) { used[k.name] = 1; });
  if (!used[name]) return name;
  var i = 2;
  while (used[name + ' ' + i]) i++;
  return name + ' ' + i;
}
function libImportCollectionPacks(packs) {
  var lib = libInit();
  var addedKits = 0, addedEntries = 0, skipped = 0, warnings = [];
  packs.forEach(function (pack) {
    var entries = { skills: [], equipments: [], items: [], assets: [], partners: [], background: null };
    var count = 0;
    LIB_PACK_TYPES.forEach(function (t) {
      var list = pack.library[t.from];
      if (!Array.isArray(list)) return;
      list.forEach(function (raw) {
        var payload = raw && raw.payload && typeof raw.payload === 'object' ? raw.payload : null;
        if (!payload || !libText(payload.name).trim()) { skipped++; return; }
        if (t.from === 'background') {
          if (entries.background) { skipped++; warnings.push('「' + pack.name + '」含多个开局剧情，只保留第一条'); return; }
          var bg = libCleanEntry('background', payload);
          if (!bg) { skipped++; return; }
          bg._lid = libNewId('e');
          bg.isCustom = true;
          entries.background = bg; count++;
          return;
        }
        var e = libCleanEntry(t.to, payload);
        if (!e) { skipped++; return; }
        e._lid = libNewId('e');
        e.isCustom = true;
        entries[t.to].push(e); count++;
      });
    });
    if (!count) { skipped++; return; }
    var kit = libCleanKit({ name: libUniqueKitName(pack.name), summary: '', entries: entries });
    kit.id = libNewId('k');
    kit.createdAt = Date.now(); kit.updatedAt = Date.now();
    lib.kits.unshift(kit);
    addedKits++; addedEntries += count;
  });
  if (addedKits) lib.activeId = lib.kits[0].id;
  return { kits: addedKits, entries: addedEntries, skipped: skipped, warnings: warnings };
}

// ---------------- 导入 / 导出 ----------------
function libExportKit(kitId) {
  var kit = kitId ? libKit(kitId) : libActiveKit();
  if (!kit) { toast('没有可导出的库', 'warning'); return; }
  var entries = libCleanExportEntries(kit);
  var doc = { _opfLibKit: 1, name: kit.name, summary: kit.summary, entries: entries };
  if (libDownload('opf_kit_' + libSafeName(kit.name) + '_' + libStamp() + '.json', JSON.stringify(doc, null, 2))) toast('已导出库「' + kit.name + '」');
}
// 导出用的 copies：去掉 _lid 这类内部字段，文件可以拿去别的浏览器重新导入。
function libCleanExportEntries(kit) {
  var entries = {};
  LIB_GROUPS.forEach(function (g) {
    if (g.single) entries[g.key] = kit.entries[g.key] ? libStripMeta(kit.entries[g.key]) : null;
    else entries[g.key] = (kit.entries[g.key] || []).map(libStripMeta);
  });
  return entries;
}
function libExportAll() {
  var lib = libInit();
  if (!lib.kits.length) { toast('还没有可导出的库', 'warning'); return; }
  var kits = lib.kits.map(function (kit) {
    return { name: kit.name, summary: kit.summary, entries: libCleanExportEntries(kit) };
  });
  var doc = { _opfLib: 1, kits: kits };
  if (libDownload('opf_opening_library_' + libStamp() + '.json', JSON.stringify(doc, null, 2))) toast('已导出 ' + lib.kits.length + ' 个库');
}
// 统一入口：先认捏物收藏扩展的捏物包，再认本工具导出的库 JSON。
function libApplyImportObject(obj, fileName) {
  var packs = libParseCollectionPack(obj, fileName);
  if (packs) {
    var r = libImportCollectionPacks(packs);
    if (!r.kits) { toast('捏物包里没有可用条目（缺少 name/payload 或分类为空）', 'warning'); return true; }
    libSave(); libRender();
    libStatus('已导入 ' + r.kits + ' 个捏物包、' + r.entries + ' 条条目' + (r.skipped ? '（跳过 ' + r.skipped + ' 条无效内容）' : '') + '。');
    toast('已导入捏物包：' + r.kits + ' 个库 / ' + r.entries + ' 条条目' + (r.warnings.length ? '（' + r.warnings[0] + '）' : ''));
    return true;
  }
  var list = [];
  if (obj && Array.isArray(obj.kits)) list = obj.kits;
  else if (obj && obj.entries && typeof obj.entries === 'object') list = [obj];
  else if (obj && obj.kit && obj.kit.entries) list = [obj.kit];
  if (!list.length) return false;
  var lib = libInit();
  var n = 0;
  list.forEach(function (raw) {
    var kit = libCleanKit(raw);
    kit.id = libNewId('k');
    LIB_GROUPS.forEach(function (g) {
      if (g.single) { if (kit.entries[g.key]) kit.entries[g.key]._lid = libNewId('e'); }
      else kit.entries[g.key].forEach(function (e) { e._lid = libNewId('e'); });
    });
    lib.kits.unshift(kit); n++;
  });
  lib.activeId = lib.kits[0] ? lib.kits[0].id : null;
  libSave(); libRender();
  libStatus('已导入 ' + n + ' 个库。');
  toast('已导入 ' + n + ' 个开局库');
  return true;
}
function libImportKit(file) {
  if (!file) return;
  var finish = function (text) {
    var obj = null;
    try { obj = JSON.parse(text); } catch (e) { toast('导入失败：不是合法 JSON', 'error'); return; }
    if (!libApplyImportObject(obj, file && file.name)) {
      toast('导入失败：既不是本工具导出的库，也不像捏物收藏扩展导出的捏物包', 'warning');
    }
  };
  try {
    if (file && typeof file.text === 'function') file.text().then(finish).catch(function (e) { toast('读取文件失败：' + (e && e.message ? e.message : e), 'error'); });
    else {
      var rd = new FileReader();
      rd.onload = function () { finish(String(rd.result)); };
      rd.onerror = function () { toast('读取文件失败', 'error'); };
      rd.readAsText(file);
    }
  } catch (e) { toast('读取文件失败：' + (e && e.message ? e.message : e), 'error'); }
}

// ---------------- 事件绑定（只绑一次） ----------------
function libBindPage() {
  libEnsureCss();
  if (LIB.bound) return;
  // 页面 DOM 还没建好时不要置 bound，否则之后永远绑不上（评审发现过）。
  if (!libEl('opf-page-library') || !libEl('opf-lib-new')) return;
  var newB = libEl('opf-lib-new');
  if (newB) newB.addEventListener('click', function () {
    var name = null;
    try { name = window.prompt('给新库起个名字', '新开局库'); } catch (e) {}
    libNewKit(name); libRender();
  });
  var imp = libEl('opf-lib-import');
  if (imp) imp.addEventListener('change', function () { var f = imp.files && imp.files[0]; if (f) libImportKit(f); imp.value = ''; });
  var impPack = libEl('opf-lib-importpack');
  if (impPack) impPack.addEventListener('change', function () { var f = impPack.files && impPack.files[0]; if (f) libImportKit(f); impPack.value = ''; });
  var expAll = libEl('opf-lib-export');
  if (expAll) expAll.addEventListener('click', libExportAll);
  var saveB = libEl('opf-lib-save');
  if (saveB) saveB.addEventListener('click', function () {
    var kit = libActiveKit(); if (!kit) { toast('先新建一个库', 'warning'); return; }
    // 编辑器开着时，先把条目表单也落一下，别让「保存库」把没保存的修改冲掉。
    if (LIB.ui && libEl('opf-lib-editor') && libEl('opf-lib-editor').style.display !== 'none') {
      try { libEditorRead(); } catch (e) { opfErr('lib save editor', e); }
    }
    var nameEl = libEl('opf-lib-name'); var sumEl = libEl('opf-lib-summary');
    if (nameEl && libText(nameEl.value).trim()) kit.name = libText(nameEl.value).trim();
    if (sumEl) kit.summary = libText(sumEl.value);
    libTouch(kit); libSave();
    toast('已保存库「' + kit.name + '」');
  });
  var aiAll = libEl('opf-lib-aiall');
  if (aiAll) aiAll.addEventListener('click', function () { libAiGenerate(''); });
  var expKit = libEl('opf-lib-expkit');
  if (expKit) expKit.addEventListener('click', function () { libExportKit(); });
  var delKit = libEl('opf-lib-delkit');
  if (delKit) delKit.addEventListener('click', function () {
    var kit = libActiveKit(); if (!kit) return;
    if (!libConfirm('删除开局库「' + kit.name + '」？不可撤销。', false)) return;
    libDeleteKit(kit.id); libEditClose(); libRender();
  });
  var edSave = libEl('opf-lib-editor-save');
  if (edSave) edSave.addEventListener('click', function () {
    var key = LIB.ui ? LIB.ui.key : 'skills';
    var e = libEditorRead(); if (!e) return;
    libPersist(); libRenderEntries(); libRenderEditor();
    var warn = libEntryWarn(key, e);
    if (warn.length) toast('已保存条目（有 ' + warn.length + ' 条提示）', 'warning'); else toast('已保存条目');
  });
  var edCancel = libEl('opf-lib-editor-cancel');
  if (edCancel) edCancel.addEventListener('click', function () { libEditClose(); });
  var rawBtn = libEl('opf-lib-editor-raw');
  if (rawBtn) rawBtn.addEventListener('click', function () {
    if (!LIB.ui) return;
    LIB.ui.mode = LIB.ui.mode === 'raw' ? 'form' : 'raw';
    libRenderEditor();
  });
  var nameEl = libEl('opf-lib-name');
  if (nameEl) nameEl.addEventListener('change', function () { var kit = libActiveKit(); if (kit && libText(nameEl.value).trim()) { kit.name = libText(nameEl.value).trim(); libTouch(kit); libPersist(); libRenderKitList(); } });
  var sumEl = libEl('opf-lib-summary');
  if (sumEl) sumEl.addEventListener('change', function () { var kit = libActiveKit(); if (kit) { kit.summary = libText(sumEl.value); libTouch(kit); libPersist(); } });
  LIB.bound = true;
}

// LIB 运行态：只放当前正在编辑哪一条，不持久化。
var LIB = { bound: false, ui: null };
