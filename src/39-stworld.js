//@module 39-stworld — 独立页「酒馆世界书」：批量勾选删除酒馆 worlds 里的文件
// ============================================================================
// 为什么单独一页：这个操作删的是磁盘文件、删了不可恢复，和「世界书」页里勾选发送
// 的条目混在一起太容易误触。所以从 ② 世界书侧栏里拿掉，单独放进导航「管理」组。
//
// 删除优先走酒馆自己的 world-info.js#deleteWorldInfo —— 它会顺带解除全局选择、
// 当前角色/人设绑定并刷新酒馆列表；拿不到模块时退回 /api/worldinfo/delete。
// 页面里再加一道「我确认」勾选，勾选变化会把它重置，避免手滑直接点到删除。
// ============================================================================
var STW_CSS = [
  '#opf-page-stw .opf-char-wrap{max-width:1120px;margin:0 auto}',
  '#opf-page-stw .opf-card+.opf-card{margin-top:12px}',
  '.opf-stw-warn{color:#ffb7be!important;line-height:1.65}',
  '.opf-stw-tools{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:10px 0 6px}',
  '.opf-stw-tools input[type=text]{flex:1 1 210px;min-width:0;height:32px;border-radius:8px;padding:4px 9px;font-size:12.5px;color:#ffeef1;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none}',
  '.opf-stw-tools input[type=text]:focus{border-color:rgba(255,150,165,.6)}',
  '.opf-stw-hide{display:flex;align-items:center;gap:6px;font-size:12.5px;color:rgba(255,226,230,.85);cursor:pointer;min-height:32px}',
  '.opf-stw-hide input{accent-color:#ff4d5e;cursor:pointer}',
  '#opf-stw-count{font-size:12.5px;color:rgba(255,200,208,.72);padding:2px 0 4px}',
  '#opf-stw-list{display:flex;flex-direction:column;gap:1px;max-height:52vh;overflow-y:auto;border:1px solid rgba(255,122,138,.22);border-radius:10px;padding:4px 6px;background:rgba(10,2,5,.32);scrollbar-width:thin}',
  '.opf-stw-row{display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:7px;cursor:pointer;font-size:13px;color:rgba(255,226,230,.9);line-height:1.45}',
  '.opf-stw-row:hover{background:rgba(255,235,238,.06)}',
  '.opf-stw-row input{margin-top:3px;accent-color:#ff4d5e;cursor:pointer;flex:none}',
  '.opf-stw-row input:disabled{cursor:default}',
  '.opf-stw-name{flex:1 1 auto;min-width:0;word-break:break-word}',
  '.opf-stw-tag{flex:none;font-size:10.5px;color:#ffd0a8;border:1px solid rgba(255,190,120,.38);border-radius:8px;padding:0 5px;line-height:1.7;white-space:nowrap}',
  '.opf-stw-ack{display:flex;align-items:center;gap:9px;font-size:13px;color:#ffd9de;line-height:1.6;padding:6px 0 8px;cursor:pointer}',
  '.opf-stw-ack input{flex:none;width:16px;height:16px;accent-color:#ff4d5e;cursor:pointer}',
  '.opf-stw-hint{font-size:12.5px;color:rgba(255,200,208,.6);line-height:1.6;padding:10px 12px;white-space:pre-wrap}',
  '#opf-stw-delsum{color:rgba(255,200,208,.6);font-size:12px;align-self:center}',
  '#opf-stw-trash{display:flex;flex-direction:column;gap:2px;max-height:22vh;overflow-y:auto;margin-top:6px}',
  '.opf-stw-trashrow{display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:7px;font-size:12.5px;color:rgba(255,226,230,.85)}',
  '.opf-stw-trashrow:hover{background:rgba(255,235,238,.06)}',
  '.opf-stw-trashname{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.opf-stw-trashmeta{flex:none;font-size:11px;color:rgba(255,200,208,.55)}',
  '.opf-stw-trashrow .opf-btn{flex:none;min-height:26px;padding:0 9px;font-size:11.5px}',
  '@media (max-width:720px){',
  '  #opf-page-stw .opf-char-wrap{padding:4px 4px 24px}',
  '  #opf-stw-list{max-height:46vh}',
  '  .opf-stw-tools input[type=text]{flex:1 1 100%}',
  '  .opf-stw-tools .opf-btn{flex:1 1 calc(50% - 4px);min-height:38px}',
  '  .opf-stw-row{font-size:13.5px;padding:8px 7px}',
  '}'
].join('');

var STW_HTML = [
  '<div class="opf-char-wrap">',
  '  <div class="opf-col">',
  '    <section class="opf-card">',
  '      <div class="opf-card-hd"><span class="opf-card-no">01</span><span class="opf-card-t">酒馆世界书</span><span class="opf-card-sub">data/&lt;用户&gt;/worlds</span></div>',
  '      <div class="opf-dim opf-stw-warn">这里管的是酒馆自己的世界书文件，不是「世界书」页里已载入的条目。删掉就是磁盘上的 .json 没了；删前会先备份到下面「最近删除」，但只保留最近几十本。</div>',
  '      <div class="opf-stw-tools">',
  '        <button type="button" class="opf-btn ghost" id="opf-stw-refresh">刷新列表</button>',
  '        <input type="text" id="opf-stw-filter" placeholder="筛选书名…">',
  '        <label class="opf-stw-hide"><input type="checkbox" id="opf-stw-hideactive"> 只看未使用</label>',
  '        <button type="button" class="opf-btn ghost" id="opf-stw-none">清空勾选</button>',
  '      </div>',
  '      <div id="opf-stw-count">—</div>',
  '      <div id="opf-stw-list"></div>',
  '    </section>',
  '    <section class="opf-card">',
  '      <div class="opf-card-hd"><span class="opf-card-no">02</span><span class="opf-card-t">删除选中</span><span class="opf-card-sub">不可恢复</span></div>',
  '      <label class="opf-stw-ack"><input type="checkbox" id="opf-stw-ack"> 我确认这些世界书不再需要，删除后无法恢复</label>',
  '      <div class="opf-char-tools">',
  '        <button type="button" class="opf-btn opf-danger" id="opf-stw-del" disabled>删除选中</button>',
  '        <span id="opf-stw-delsum">还没勾选。</span>',
  '      </div>',
  '    </section>',
  '    <section class="opf-card">',
  '      <div class="opf-card-hd"><span class="opf-card-no">03</span><span class="opf-card-t">最近删除</span><span class="opf-card-sub" id="opf-stw-trashcount">—</span></div>',
  '      <div class="opf-dim">删除前会把整本书的 JSON 备份进浏览器 IndexedDB，删错了可以在这里恢复。只保留最近几十本。</div>',
  '      <div id="opf-stw-trash"></div>',
  '    </section>',
  '  </div>',
  '</div>'
].join('');

function stwS() {
  if (!ST.stw) {
    ST.stw = {
      names: null,        // 酒馆世界书名（null = 还没读过）
      mod: null,          // 动态 import 到的 world-info 模块（拿不到为 null）
      modPromise: null,
      loading: false,
      error: '',
      filter: '',
      checked: {},        // 书名 -> true
      hideActive: false,  // 只看未使用（没被全局/角色/聊天绑定）
      busy: false
    };
  }
  return ST.stw;
}
function stwCheckedNames() {
  var s = ST.stw;
  if (!s || !s.names) return [];
  var out = [];
  for (var i = 0; i < s.names.length; i++) if (s.checked[s.names[i]]) out.push(s.names[i]);
  return out;
}
function stwSortNames(list) {
  var seen = {}, arr = [];
  for (var i = 0; i < list.length; i++) {
    var n = list[i];
    if (typeof n !== 'string' || !n) continue;
    var k = n.toLowerCase();
    if (seen[k]) continue;
    seen[k] = 1; arr.push(n);
  }
  arr.sort(function (a, b) { return String(a).localeCompare(String(b), 'zh'); });
  return arr;
}
// 动态 import 酒馆世界书模块：能拿到就用它自己的删除/列表逻辑，拿不到走公开接口兜底
function stwEnsureModule(force) {
  var s = stwS();
  if (!force && s.modPromise) return s.modPromise;
  var p = Promise.resolve(null);
  try { if (typeof probeWorldModule === 'function') p = probeWorldModule() || Promise.resolve(null); } catch (e) { p = Promise.resolve(null); }
  s.modPromise = p.then(function (m) { s.mod = m || null; return s.mod; }, function () { s.mod = null; return null; });
  return s.modPromise;
}
function stwListFromApi() {
  var ctx = getCtx();
  if (!ctx || typeof fetch !== 'function') return Promise.resolve([]);
  var headers = {};
  try { if (typeof ctx.getRequestHeaders === 'function') headers = ctx.getRequestHeaders() || {}; } catch (e) {}
  return fetch('/api/worldinfo/list', { method: 'POST', headers: headers, body: JSON.stringify({}) })
    .then(function (r) {
      if (!r.ok) throw new Error('读取世界书列表失败（HTTP ' + r.status + '）');
      return r.json();
    })
    .then(function (data) {
      var out = [];
      (Array.isArray(data) ? data : []).forEach(function (x) {
        var n = x && (x.file_id || x.name);
        if (n) out.push(String(n));
      });
      return out;
    });
}
function stwFetchNames() {
  return stwEnsureModule(false).then(function (mod) {
    var ctx = getCtx();
    var names = null;
    try { if (ctx && typeof ctx.getWorldInfoNames === 'function') names = ctx.getWorldInfoNames(); } catch (e) {}
    if ((!names || !names.length) && mod && Array.isArray(mod.world_names)) names = mod.world_names.slice();
    if (names && names.length) return stwSortNames(names);
    return stwListFromApi().then(stwSortNames);
  });
}
function stwRefresh(force) {
  var s = stwS();
  if (s.loading) return Promise.resolve(null);
  s.loading = true; s.error = '';
  if (force) { s.names = null; s.modPromise = null; s.mod = null; }
  stwRenderPage();
  // 点「刷新」= 也去磁盘重新扫一遍酒馆的 world_names，别只读页面里的旧缓存
  var warm = Promise.resolve();
  if (force) {
    warm = stwEnsureModule(false).then(function (mod) {
      if (mod && typeof mod.updateWorldInfoList === 'function') {
        return Promise.resolve(mod.updateWorldInfoList()).then(function () {}, function () {});
      }
    });
  }
  return warm.then(stwFetchNames).then(function (names) {
    s.loading = false; s.names = names;
    stwRenderPage();
    return names;
  }, function (e) {
    s.loading = false; s.error = (e && e.message) ? e.message : String(e);
    stwRenderPage();
    return null;
  });
}
// 这本书现在被谁用着：全局选择 / 当前角色主世界书 / 当前聊天世界书
function stwTags(name) {
  var tags = [];
  var s = ST.stw || {};
  var mod = s.mod;
  if (mod && Array.isArray(mod.selected_world_info) && mod.selected_world_info.indexOf(name) >= 0) tags.push('全局');
  try {
    var ctx = getCtx();
    if (ctx && ctx.characters && ctx.characters[ctx.characterId]) {
      var ch = ctx.characters[ctx.characterId];
      if (ch.data && ch.data.extensions && ch.data.extensions.world === name) tags.push('角色');
    }
  } catch (e) {}
  try {
    var ctx2 = getCtx();
    if (ctx2 && ctx2.chatMetadata && ctx2.chatMetadata.world_info === name) tags.push('聊天');
  } catch (e) {}
  return tags;
}
function stwUsed(name) { return stwTags(name).length > 0; }
function stwVisibleNames() {
  var s = stwS();
  var names = s.names || [];
  var f = String(s.filter || '').trim().toLowerCase();
  var out = [];
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (f && String(n).toLowerCase().indexOf(f) < 0) continue;
    if (s.hideActive && stwUsed(n)) continue;
    out.push(n);
  }
  return out;
}
function stwResetAck() {
  var a = getEl('opf-stw-ack');
  if (a) a.checked = false;
}
function stwSyncPage() {
  var s = ST.stw;
  if (!s) return;
  var checked = stwCheckedNames();
  var shown = stwVisibleNames();
  var total = (s.names || []).length;
  var cntEl = getEl('opf-stw-count');
  if (cntEl) {
    var txt;
    if (s.loading) txt = '正在读取酒馆世界书列表…';
    else if (s.error) txt = '读取失败，点「刷新列表」重试';
    else if (s.busy) txt = '正在删除…已勾 ' + checked.length + ' 本，先别离开这一页';
    else txt = '酒馆共 ' + total + ' 本世界书 · 显示 ' + shown.length + ' 本 · 已勾 ' + checked.length + ' 本';
    cntEl.textContent = txt;
  }
  var del = getEl('opf-stw-del');
  var ack = getEl('opf-stw-ack');
  var sum = getEl('opf-stw-delsum');
  if (del) {
    del.textContent = '删除选中' + (checked.length ? '（' + checked.length + '）' : '');
    del.disabled = !checked.length || !(ack && ack.checked) || !!s.busy || !!s.loading;
  }
  if (sum) {
    if (s.busy) sum.textContent = '正在删除，别关页面…';
    else if (!checked.length) sum.textContent = '还没勾选。';
    else if (!(ack && ack.checked)) sum.textContent = '已勾 ' + checked.length + ' 本；还要勾上面那句确认才能删。';
    else sum.textContent = '将删除 ' + checked.length + ' 本，删了找不回来。';
  }
  var fl = getEl('opf-stw-filter');
  if (fl && fl.value !== (s.filter || '')) fl.value = s.filter || '';
  var hid = getEl('opf-stw-hideactive');
  if (hid) hid.checked = !!s.hideActive;
}
function stwHint(listEl, text) {
  var d = document.createElement('div');
  d.className = 'opf-stw-hint';
  d.textContent = text;
  listEl.appendChild(d);
  return d;
}
function stwRow(name) {
  var s = stwS();
  var tags = stwTags(name);
  var lab = document.createElement('label');
  lab.className = 'opf-stw-row';
  var cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = !!s.checked[name]; cb.disabled = !!s.busy;
  cb.addEventListener('change', function () {
    if (cb.checked) s.checked[name] = true; else delete s.checked[name];
    stwResetAck();   // 勾选一变就要求重新确认，防止改完选择顺手删
    stwSyncPage();
  });
  lab.appendChild(cb);
  var tx = document.createElement('span');
  tx.className = 'opf-stw-name';
  tx.textContent = name;
  tx.title = name + (tags.length ? '\n正被使用：' + tags.join(' · ') : '');
  lab.appendChild(tx);
  for (var i = 0; i < tags.length; i++) {
    var sp = document.createElement('span');
    sp.className = 'opf-stw-tag'; sp.textContent = tags[i];
    lab.appendChild(sp);
  }
  return lab;
}
function stwRenderList() {
  var s = stwS();
  var listEl = getEl('opf-stw-list');
  if (!listEl) return;
  listEl.textContent = '';
  var shown = stwVisibleNames();
  var total = (s.names || []).length;
  if (s.loading) { stwHint(listEl, '正在读取酒馆世界书列表…'); stwSyncPage(); return; }
  if (s.error) {
    stwHint(listEl, '读取失败：' + s.error);
    var bt = document.createElement('button');
    bt.type = 'button'; bt.className = 'opf-btn ghost'; bt.textContent = '刷新重试';
    bt.addEventListener('click', function () { stwRefresh(true); });
    listEl.appendChild(bt);
    stwSyncPage();
    return;
  }
  if (!total) { stwHint(listEl, '酒馆里还没有世界书。'); stwSyncPage(); return; }
  if (!shown.length) {
    stwHint(listEl, (s.filter ? '没有匹配的世界书。' : '没有可显示的世界书（可能都被「只看未使用」过滤掉了）。') + '\n\n这里删的是酒馆 data/<用户>/worlds 里的 .json 文件；删之前还要勾确认。');
    stwSyncPage();
    return;
  }
  for (var i = 0; i < shown.length; i++) listEl.appendChild(stwRow(shown[i]));
  stwSyncPage();
}
function stwClearChecked() {
  var s = stwS();
  if (s.busy) return;
  s.checked = {};
  stwResetAck();
  stwRenderList();
}
function stwConfirmDelete() {
  var s = stwS();
  if (s.busy || s.loading) return;
  var names = stwCheckedNames();
  if (!names.length) { toast('先在列表里勾要删的世界书', 'warning'); return; }
  var ack = getEl('opf-stw-ack');
  if (!ack || !ack.checked) { toast('还要勾上「我确认这些世界书不再需要」才能删', 'warning'); return; }
  // 一次删太多时再加一道「打字确认」，防止开着筛选框随手点
  if (names.length > 3) {
    var typed = '';
    try { typed = window.prompt('这次要删 ' + names.length + ' 本世界书（删除前会备份到「最近删除」）。\n确认请输入「确认删除」：'); } catch (e) { typed = ''; }
    if (String(typed == null ? '' : typed).trim() !== '确认删除') { toast('已取消删除', 'info'); return; }
  }
  var used = [];
  for (var i = 0; i < names.length; i++) if (stwUsed(names[i])) used.push(names[i]);
  var msg = '要从酒馆里删除这 ' + names.length + ' 本世界书吗？\n\n' + names.slice(0, 8).join('\n');
  if (names.length > 8) msg += '\n…还有 ' + (names.length - 8) + ' 本';
  msg += '\n\n';
  if (used.length) {
    msg += '⚠ 其中 ' + used.length + ' 本正被使用（全局/角色/聊天）：\n' + used.slice(0, 6).join('、') + (used.length > 6 ? ' 等' : '') + '\n酒馆会顺便解除这些绑定。\n\n';
  }
  if (!s.mod || typeof s.mod.deleteWorldInfo !== 'function') {
    msg += '（没拿到酒馆内部删除接口，会直接调接口删文件；删完建议刷新一次酒馆页面。）\n\n';
  }
  msg += '删的是 data/<用户>/worlds 里的 .json 文件，删前会先备份到本页「最近删除」；「世界书」页里已载入的条目不受影响。';
  var yes = false;
  try { yes = window.confirm(msg); } catch (e) { yes = false; }
  if (!yes) return;
  stwDoDelete(names);
}

// ---------------- 回收站：删之前把整本 JSON 备份进 IndexedDB ----------------
var STW_TRASH_DB = NS + '_stwtrash_v1';
var STW_TRASH_MAX = 80;
function stwIdbOpen() {
  return new Promise(function (resolve, reject) {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB 不可用')); return; }
    var req;
    try { req = indexedDB.open(STW_TRASH_DB, 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error || new Error('打开回收站失败')); };
  });
}
function stwTrashAdd(recs) {
  return stwIdbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('items', 'readwrite');
      var os = tx.objectStore('items');
      recs.forEach(function (r) { os.put(r); });
      tx.oncomplete = function () { db.close(); resolve(); };
      tx.onerror = function () { db.close(); reject(tx.error || new Error('写回收站失败')); };
      tx.onabort = function () { db.close(); reject(tx.error || new Error('写回收站被中止')); };
    });
  });
}
function stwTrashList() {
  return stwIdbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('items', 'readonly');
      var os = tx.objectStore('items');
      var req = os.getAll();
      req.onsuccess = function () { db.close(); resolve(req.result || []); };
      req.onerror = function () { db.close(); reject(req.error || new Error('读回收站失败')); };
    });
  });
}
function stwTrashRemove(id) {
  return stwIdbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('items', 'readwrite');
      tx.objectStore('items').delete(id);
      tx.oncomplete = function () { db.close(); resolve(); };
      tx.onerror = function () { db.close(); reject(tx.error || new Error('清理回收站失败')); };
    });
  });
}
function stwTrashTrim() {
  return stwTrashList().then(function (rows) {
    if (rows.length <= STW_TRASH_MAX) return;
    rows.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    var drop = rows.slice(0, rows.length - STW_TRASH_MAX);
    return drop.reduce(function (p, r) { return p.then(function () { return stwTrashRemove(r.id); }); }, Promise.resolve());
  });
}
// 删之前把整本书读出来：优先酒馆模块（缓存里就是现成对象），没有就调 get 接口
function stwReadBook(mod, name) {
  var ctx = getCtx();
  var viaApi = function () {
    if (!ctx || typeof fetch !== 'function') return Promise.reject(new Error('没有读取通道'));
    var headers = {};
    try { if (typeof ctx.getRequestHeaders === 'function') headers = ctx.getRequestHeaders() || {}; } catch (e) {}
    return fetch('/api/worldinfo/get', { method: 'POST', headers: headers, body: JSON.stringify({ name: name }) })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        if (!d || !d.entries) throw new Error('读不到条目正文');
        return JSON.stringify(d);
      });
  };
  if (mod && typeof mod.loadWorldInfo === 'function') {
    return Promise.resolve(mod.loadWorldInfo(name)).then(function (data) {
      if (data && data.entries) return JSON.stringify(data);
      return viaApi();   // 模块读不到（缓存未命中/空书）就走接口，别在这里卡死删除
    }, function () { return viaApi(); });
  }
  return viaApi();
}
function stwFmtTime(ts) {
  try {
    var d = new Date(ts || 0);
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return (d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  } catch (e) { return ''; }
}
function stwRenderTrash() {
  var box = getEl('opf-stw-trash');
  if (!box) return;
  var cnt = getEl('opf-stw-trashcount');
  box.textContent = '';
  stwTrashList().then(function (rows) {
    rows.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    if (cnt) cnt.textContent = rows.length ? '可恢复 ' + rows.length + ' 本' : '暂无备份';
    if (!rows.length) {
      var d = document.createElement('div');
      d.className = 'opf-stw-hint';
      d.textContent = '还没有删除记录。';
      box.appendChild(d);
      return;
    }
    rows.forEach(function (rec) {
      var row = document.createElement('div');
      row.className = 'opf-stw-trashrow';
      var nm = document.createElement('span');
      nm.className = 'opf-stw-trashname';
      nm.textContent = rec.name || '(无名)';
      nm.title = (rec.name || '') + '\n删除于 ' + stwFmtTime(rec.ts);
      var mt = document.createElement('span');
      mt.className = 'opf-stw-trashmeta';
      mt.textContent = stwFmtTime(rec.ts) + ' · ' + Math.round((rec.data || '').length / 1024) + 'KB';
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'opf-btn ghost'; btn.textContent = '恢复';
      btn.addEventListener('click', function () { stwRestoreBook(rec); });
      row.appendChild(nm); row.appendChild(mt); row.appendChild(btn);
      box.appendChild(row);
    });
  }, function (e) {
    if (cnt) cnt.textContent = '回收站不可用';
    var d = document.createElement('div');
    d.className = 'opf-stw-hint';
    d.textContent = '回收站不可用：' + ((e && e.message) || e) + '\n没有备份时不会执行删除。';
    box.appendChild(d);
  });
}
function stwRestoreBook(rec) {
  var ctx = getCtx();
  if (!ctx || typeof fetch !== 'function') { toast('没有可用的恢复通道', 'error'); return; }
  var data = null;
  try { data = JSON.parse(rec.data || ''); } catch (e) {}
  if (!data || !data.entries) { toast('这条备份内容坏了，没法恢复', 'error'); return; }
  var names = (ST.stw && ST.stw.names) || [];
  if (names.indexOf(rec.name) >= 0) {
    var yes = false;
    try { yes = window.confirm('酒馆里已经有一本同名世界书「' + rec.name + '」。\n恢复会用备份覆盖它，继续？'); } catch (e) { yes = false; }
    if (!yes) return;
  }
  var headers = {};
  try { if (typeof ctx.getRequestHeaders === 'function') headers = ctx.getRequestHeaders() || {}; } catch (e) {}
  fetch('/api/worldinfo/edit', { method: 'POST', headers: headers, body: JSON.stringify({ name: rec.name, data: data }) })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return stwTrashRemove(rec.id);
    })
    .then(function () {
      return stwEnsureModule(false).then(function (mod) {
        if (mod && typeof mod.updateWorldInfoList === 'function') return mod.updateWorldInfoList().then(function () {}, function () {});
        if (typeof ctx.updateWorldInfoList === 'function') return Promise.resolve(ctx.updateWorldInfoList()).then(function () {}, function () {});
      });
    })
    .then(function () {
      toast('已恢复「' + rec.name + '」', 'success');
      stwRefresh(true);
      stwRenderTrash();
    }, function (e) {
      toast('恢复失败：' + ((e && e.message) || e), 'error');
    });
}

function stwDeleteOne(mod, name) {
  if (mod && typeof mod.deleteWorldInfo === 'function') {
    return Promise.resolve(mod.deleteWorldInfo(name)).then(function (ok) {
      if (ok === false) throw new Error('酒馆返回未删除');
      return true;
    });
  }
  var ctx = getCtx();
  if (ctx && typeof ctx.deleteWorldInfo === 'function') {
    return Promise.resolve(ctx.deleteWorldInfo(name)).then(function (ok) {
      if (ok === false) throw new Error('酒馆返回未删除');
      return true;
    });
  }
  if (!ctx || typeof fetch !== 'function') return Promise.reject(new Error('没有可用的删除通道'));
  var headers = {};
  try { if (typeof ctx.getRequestHeaders === 'function') headers = ctx.getRequestHeaders() || {}; } catch (e) {}
  return fetch('/api/worldinfo/delete', { method: 'POST', headers: headers, body: JSON.stringify({ name: name }) })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      // 兜底路径没有 deleteWorldInfo 的收尾，手动让酒馆重读一次世界书清单
      var upd = Promise.resolve();
      try { if (typeof ctx.updateWorldInfoList === 'function') upd = Promise.resolve(ctx.updateWorldInfoList()); } catch (e) {}
      return upd.then(function () { return true; }, function () { return true; });
    });
}
function stwDoDelete(names) {
  var s = stwS();
  s.busy = true;
  stwRenderPage();
  opfLog('批量删除酒馆世界书：', names.length, '本');
  return stwEnsureModule(false).then(function (mod) {
    var ok = [], fail = [];
    var chain = Promise.resolve();
    names.forEach(function (name) {
      chain = chain.then(function () {
        // 先备份进回收站；备份不成功就不删这本（宁可失败也不丢）
        var p = stwReadBook(mod, name).then(function (json) {
          return stwTrashAdd([{ id: name + '|' + Date.now() + '|' + Math.random().toString(36).slice(2, 8), name: name, data: json, ts: Date.now() }]);
        }).then(function () {
          return stwDeleteOne(mod, name);
        });
        return p.then(function () {
          ok.push(name); delete s.checked[name];
        }, function (e) {
          fail.push({ name: name, error: (e && e.message) ? e.message : String(e) });
        });
      });
    });
    return chain.then(function () { return { ok: ok, fail: fail }; });
  }).then(function (res) {
    s.busy = false;
    stwResetAck();
    try { stwTrashTrim(); } catch (e) {}
    // 有失败时强制重扫：可能是酒馆里的旧书名（文件已经不在了），刷新后这些幽灵条目会消失
    return stwRefresh(res.fail.length > 0).then(function () { stwAfterDelete(res.ok, res.fail); stwRenderTrash(); }, function () { stwAfterDelete(res.ok, res.fail); stwRenderTrash(); });
  }, function (e) {
    s.busy = false;
    stwRenderPage();
    toast('批量删除失败：' + ((e && e.message) || e), 'error');
  });
}
function stwAfterDelete(ok, fail) {
  if (!ok.length && !fail.length) { toast('没有删除任何世界书', 'info'); return; }
  var msg = '已删除 ' + ok.length + ' 本世界书';
  if (fail.length) {
    var names = [];
    for (var i = 0; i < fail.length && i < 3; i++) names.push(fail[i].name);
    msg += '，失败 ' + fail.length + ' 本（' + names.join('、') + (fail.length > 3 ? ' 等' : '') + '）';
  }
  toast(msg, fail.length ? 'warning' : 'success');
  if (fail.length) opfErr('批量删除世界书失败：', fail);
  opfLog('批量删除酒馆世界书完成：成功', ok.length, '失败', fail.length);
}
function stwInjectCSS() {
  try {
    if (getEl(NS + '_css_stw')) return;
    var st = document.createElement('style');
    st.id = NS + '_css_stw';
    st.textContent = STW_CSS;
    document.head.appendChild(st);
  } catch (e) { opfErr('stw css', e); }
}
function stwBindPage() {
  stwInjectCSS();
  var page = getEl('opf-page-stw');
  if (!page || page.getAttribute('data-stw-bound')) return;
  page.setAttribute('data-stw-bound', '1');
  var f = getEl('opf-stw-filter');
  if (f) f.addEventListener('input', function () { stwS().filter = f.value || ''; stwRenderList(); });
  var hid = getEl('opf-stw-hideactive');
  if (hid) hid.addEventListener('change', function () { stwS().hideActive = !!hid.checked; stwRenderList(); });
  var none = getEl('opf-stw-none');
  if (none) none.addEventListener('click', function () { stwClearChecked(); });
  var refresh = getEl('opf-stw-refresh');
  if (refresh) refresh.addEventListener('click', function () { stwRefresh(true); });
  var ack = getEl('opf-stw-ack');
  if (ack) ack.addEventListener('change', function () { stwSyncPage(); });
  var del = getEl('opf-stw-del');
  if (del) del.addEventListener('click', function () { stwConfirmDelete(); });
  stwRenderPage();
}
function stwRenderPage() {
  var page = getEl('opf-page-stw');
  if (!page) return;
  var s = stwS();
  if (s.names === null && !s.loading) { stwRefresh(false); return; }
  stwRenderList();
  stwRenderTrash();
}
