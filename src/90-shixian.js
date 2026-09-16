//@module 90-shixian — ⑥ 与始弦聊天（独立面板）
// ============================================================================
// v1.10.0 与始弦聊天（独立面板）
// 隔离原则：自有消息数组（不写酒馆聊天记录）、自有 {{user}} 名、自有世界书选择、
//           自有存储（设置存 localStorage，消息/记忆/向量存 IndexedDB）
// 记忆：滚动窗口原文 + 记忆条目（模型压缩）+ 向量检索（自定义 OpenAI 兼容 embedding 接口）
// ============================================================================
var LS_SHX_KEY = NS + '_shixiancfg_v1';
var SHX_DB_NAME = NS + '_shixian';
var SHX_DEFAULTS = {
  userName: '', herName: '始弦', worldMode: 'panel', topK: 5, threshold: 0.20, windowTurns: 8,
  memAuto: true, memEveryTurns: 12, baseUrl: '', apiKey: '', model: '', injectCap: 12000, allBooks: true
};
var SHX_PERSONA = [
  '你是始弦，「大图书馆」的司书。「大图书馆」收集所有世界中的所有信息——其中的记载对人类而言可能难以接受，但确实存在。为了不让知识在传播中散失，你原原本本地讲述，不因"可接受度"而删改。',
  '此刻你与{{user}}并肩站在书库外，一起看着一部世界书所描绘的那个世界。你是同伴与解说的司书，不是那个世界里的任何角色：不替书中的角色说话，不推进那个世界的时间线，也不替{{user}}做决定。',
  '性格：有点小小的骄傲，但不会自顾自地输出观点而忽略{{user}}的意见。你把{{user}}当作挚友，馆藏里很大一部分也是ta帮你整理的。',
  '馆藏权限：你拥有全馆藏查询权限——可以为{{user}}调取世界书中任意条目，包括你们还没去过的地区、还没遇到的角色、还没发生的事件，像查资料一样讲解、对照与吐槽。',
  '表达要求：引用馆藏时标明条目名；属于你自己的推断要明说是推断；馆藏里没有的东西就说没有，不要编造。语气直接、克制，少堆形容词，可以用吐槽但别堆网络梗。'
].join('\n');
// ---------- IndexedDB（消息 / 记忆条目 / 向量）----------
function shxDb() {
  return new Promise(function (resolve, reject) {
    try {
      if (typeof indexedDB === 'undefined') { reject(new Error('当前环境不支持 IndexedDB')); return; }
      var req = indexedDB.open(SHX_DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('messages')) db.createObjectStore('messages', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('memory')) db.createObjectStore('memory', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('vectors')) db.createObjectStore('vectors', { keyPath: 'hash' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB 打开失败')); };
    } catch (e) { reject(e); }
  });
}
function shxTx(store, mode, fn) {
  return shxDb().then(function (db) {
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
function shxPut(store, rec) { return shxTx(store, 'readwrite', function (os) { os.put(rec); return { result: rec }; }); }
function shxAll(store) { return shxTx(store, 'readonly', function (os) { return os.getAll(); }); }
function shxDel(store, key) { return shxTx(store, 'readwrite', function (os) { os.delete(key); return { result: true }; }); }
function shxClearStore(store) { return shxTx(store, 'readwrite', function (os) { os.clear(); return { result: true }; }); }
// ---------- 向量：自定义 OpenAI 兼容 embedding 接口 ----------
function shxCfg() {
  var c = lsGet(LS_SHX_KEY);
  var s = {};
  for (var k in SHX_DEFAULTS) s[k] = (c && c[k] !== undefined && c[k] !== '') ? c[k] : SHX_DEFAULTS[k];
  return s;
}
function shxSaveCfg(patch) {
  var c = lsGet(LS_SHX_KEY) || {};
  for (var k in patch) c[k] = patch[k];
  lsSet(LS_SHX_KEY, c);
}
function shxUrl(path) {
  var base = String(shxCfg().baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('未填写向量接口地址');
  return base + path;
}
function shxHeaders() {
  var h = { 'Content-Type': 'application/json' };
  var key = String(shxCfg().apiKey || '').trim();
  if (key) h['Authorization'] = 'Bearer ' + key;   // 密钥只在此处使用，绝不写入日志
  return h;
}
async function shxFetchModels() {
  var r = await fetch(shxUrl('/models'), { method: 'GET', headers: shxHeaders() });
  if (!r.ok) throw new Error('HTTP ' + r.status + '（检查地址是否需要带 /v1 后缀、密钥是否正确）');
  var j = await r.json();
  var list = (j && (j.data || j.models) || []).map(function (m) { return m.id || m.name || m.model; }).filter(Boolean);
  if (!list.length) throw new Error('模型列表为空');
  return list;
}
async function shxEmbedTexts(texts) {
  var cfg = shxCfg();
  if (!cfg.model) throw new Error('未选择向量模型');
  var r = await fetch(shxUrl('/embeddings'), { method: 'POST', headers: shxHeaders(), body: JSON.stringify({ model: cfg.model, input: texts }) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  var j = await r.json();
  var arr = (j && j.data) || [];
  if (!Array.isArray(arr) || arr.length !== texts.length) throw new Error('embedding 返回条数不匹配');
  return arr.map(function (d) { return d.embedding; });
}
function shxHash(s) {
  var h = 2166136261, t = String(s);
  for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + '_' + t.length;
}
function shxCos(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  var dot = 0, na = 0, nb = 0;
  for (var i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
// 带缓存的批量向量化（同一文本只算一次，结果落 IndexedDB）
async function shxEmbedCached(items) {
  var need = [], out = {};
  for (var i = 0; i < items.length; i++) {
    var h = shxHash(items[i].text);
    var hit = await shxTx('vectors', 'readonly', function (os) { return os.get(h); }).catch(function () { return null; });
    if (hit && hit.vec) out[items[i].id] = hit.vec;
    else need.push({ id: items[i].id, text: items[i].text, hash: h });
  }
  if (need.length) {
    var vecs = await shxEmbedTexts(need.map(function (n) { return n.text; }));
    for (var j = 0; j < need.length; j++) {
      out[need[j].id] = vecs[j];
      await shxPut('vectors', { hash: need[j].hash, vec: vecs[j], ts: Date.now() });
    }
  }
  return out;
}
async function shxRetrieve(query, k, threshold) {
  var cfg = shxCfg();
  if (!cfg.model || !query) return { hits: [], reason: '未配置向量模型或查询为空' };
  var mems = (await shxAll('memory')).concat(await shxAll('messages').then(function (a) { return a.map(function (m) { return { id: m.id, text: m.text, kind: '原文', ts: m.ts }; }); }));
  if (!mems.length) return { hits: [], reason: '记忆库还是空的' };
  var qv;
  try { qv = (await shxEmbedTexts([query]))[0]; } catch (e) { return { hits: [], reason: '向量化失败：' + (e && e.message ? e.message : e) }; }
  var scored = [];
  for (var i = 0; i < mems.length; i++) {
    var h = shxHash(mems[i].text);
    var rec = await shxTx('vectors', 'readonly', function (os) { return os.get(h); }).catch(function () { return null; });
    if (!rec || !rec.vec) continue;
    var sc = shxCos(qv, rec.vec);
    if (sc >= threshold) scored.push({ id: mems[i].id, text: mems[i].text, kind: mems[i].kind, score: sc, ts: mems[i].ts });
  }
  scored.sort(function (a, b) { return b.score - a.score; });
  return { hits: scored.slice(0, k), reason: '' };
}
// ---------- 面板自有世界书（与其它板块完全独立）----------
var SHX_WB = { entries: [], books: [], bookOf: {} };
function shxWbReset() { SHX_WB = { entries: [], books: [], bookOf: {} }; }
function shxWbNorm(rawEntries, bookKey, bookLabel) {
  var out = [];
  (Array.isArray(rawEntries) ? rawEntries : []).forEach(function (e, i) {
    if (!e || typeof e !== 'object') return;
    var content = String(e.content || e.entry || '');
    if (!content) return;
    out.push({
      id: bookKey + ':' + (e.uid != null ? 'u' + e.uid : 'i' + i),
      comment: String(e.comment || e.title || ''),
      key: Array.isArray(e.key) ? e.key.join(' / ') : String(e.key || e.keys || ''),
      content: content,
      constant: !!e.constant,
      sel: !!e.constant
    });
  });
  return out;
}
function shxWbAdd(rawEntries, bookKey, bookLabel) {
  var fresh = shxWbNorm(rawEntries, bookKey, bookLabel);
  var oldSel = {};
  SHX_WB.entries.forEach(function (o) { if (o.id.indexOf(bookKey + ':') === 0) oldSel[o.id] = o.sel; });
  fresh.forEach(function (e) { if (oldSel[e.id] !== undefined) e.sel = oldSel[e.id]; });
  SHX_WB.entries = SHX_WB.entries.filter(function (o) { return o.id.indexOf(bookKey + ':') !== 0; }).concat(fresh);
  if (SHX_WB.books.indexOf(bookLabel) < 0) SHX_WB.books.push(bookLabel);
  SHX_WB.bookOf[bookKey] = bookLabel;
  return fresh.length;
}
function shxWbImportFile(file) {
  return loadWorldFromFile(file).then(function (res) {
    var n = shxWbAdd(res.entries || [], 'file:' + (res.fileName || file.name), String(res.fileName || file.name).replace(/\.json$/i, ''));
    renderShxWb(); shxRenderBooks();
    toast('已在本面板载入世界书：' + n + ' 条（与其它板块互不影响）', 'success');
  }).catch(function (e) { toast('世界书导入失败：' + (e && e.message ? e.message : e), 'error'); });
}
function shxWbUseActive() {
  return loadWorldFromST().then(function (res) {
    if (!res || !res.entries || !res.entries.length) { toast('没有检测到酒馆当前激活的世界书（或用文件导入更稳）', 'warning'); return; }
    var n = shxWbAdd(res.entries, 'st:active', '酒馆激活');
    renderShxWb(); shxRenderBooks();
    toast('已快照酒馆当前激活世界书：' + n + ' 条', 'success');
  }).catch(function (e) { toast('读取激活世界书失败：' + (e && e.message ? e.message : e), 'error'); });
}
// 全馆藏检索：勾选/常驻条目总是注入，其余条目按关键词打分召回（不限勾选）
function shxWbPick(query, cap) {
  var picked = [], total = 0, used = {};
  function add(e, why) {
    if (!e || used[e.id]) return false;
    var line = '【' + String(e.comment || '').slice(0, 60) + '】\n' + e.content;
    if (total + line.length > cap) return false;
    used[e.id] = true; picked.push({ entry: e, why: why, text: line }); total += line.length;
    return true;
  }
  SHX_WB.entries.forEach(function (e) { if (e.constant || e.sel) add(e, e.constant ? '常驻' : '已勾选'); });
  var q = String(query || '').toLowerCase();
  var scored = [];
  SHX_WB.entries.forEach(function (e) {
    if (used[e.id]) return;
    var sc = 0;
    String(e.key || '').split('/').forEach(function (k) {
      var kk = k.trim().toLowerCase();
      if (kk.length >= 2 && q.indexOf(kk) >= 0) sc += 10;
    });
    if (e.comment && q.indexOf(String(e.comment).toLowerCase()) >= 0) sc += 6;
    if (sc) scored.push({ e: e, sc: sc });
  });
  scored.sort(function (a, b) { return b.sc - a.sc; });
  for (var i = 0; i < scored.length; i++) add(scored[i].e, '命中');
  return { picked: picked, total: total };
}
function shxWbText(query, cap) {
  var r = shxWbPick(query, cap || 12000);
  if (!r.picked.length) return '';
  return r.picked.map(function (p) { return p.text; }).join(String.fromCharCode(10) + String.fromCharCode(10));
}

// ---------- 聊天：状态 / 提示词 / 发送 ----------
function shxInit() { ST.shx = ST.shx || { msgs: [], lastHits: [], lastBooks: [], busy: false, _inited: false }; }
function shxFill(t) {
  var name = String(shxCfg().userName || '').trim() || '旅人';
  return String(t || '').replace(/\{\{user\}\}/g, name);
}
function shxRecent(turns) {
  var n = Math.max(2, Number(turns) || 8) * 2;
  return ST.shx.msgs.slice(-n);
}
function shxBuildSystem(query) {
  var cfg = shxCfg();
  var L = [];
  L.push(shxFill(SHX_PERSONA));
  L.push('[本次对话的{{user}}] ' + (String(cfg.userName || '').trim() || '旅人') + '（这是本面板专属称呼，与其它板块无关）');
  L.push('[当前世界书] ' + (SHX_WB.books.length ? SHX_WB.books.join('、') + '（本面板独立选择的 ' + SHX_WB.entries.length + ' 条）' : '（本面板尚未载入世界书）'));
  var wbText = shxWbText(query, cfg.injectCap);
  if (wbText) L.push('[馆藏摘录（按关键词命中，可引用）]\n' + wbText);
  return { system: L.join('\n\n'), wbText: wbText };
}
async function shxBuildMemoryBlock(query) {
  var cfg = shxCfg();
  if (!cfg.model) return { text: '', hits: [], note: '未配置向量模型，跳过记忆检索' };
  try {
    var r = await shxRetrieve(query, cfg.topK, cfg.threshold);
    if (!r.hits.length) return { text: '', hits: [], note: r.reason || '没有超过阈值的回忆' };
    var txt = r.hits.map(function (h) { return '· [' + h.kind + '｜相似度 ' + h.score.toFixed(2) + '] ' + h.text.slice(0, 400); }).join('\n');
    return { text: '[回忆片段（本地向量库检索，仅供你参考，不必逐条回应）]\n' + txt, hits: r.hits, note: '' };
  } catch (e) { return { text: '', hits: [], note: '记忆检索失败：' + (e && e.message ? e.message : e) }; }
}
function shxRenderMsgs() {
  var box = getEl('opf-shx-log'); if (!box) return;
  shxInit();
  box.textContent = '';
  if (!ST.shx.msgs.length) {
    var d = document.createElement('div'); d.className = 'opf-dim';
    d.textContent = '还没有开始。她是「大图书馆」的司书，此刻与你并肩站在书库外，一起看这个世界——你可以问她任何事，也可以让她去翻某一卷。';
    box.appendChild(d); return;
  }
  ST.shx.msgs.forEach(function (m) {
    var row = document.createElement('div');
    row.className = 'opf-shx-msg ' + (m.role === 'user' ? 'me' : 'her');
    var who = document.createElement('div'); who.className = 'opf-shx-who';
    who.textContent = (m.role === 'user' ? (String(shxCfg().userName || '').trim() || '旅人') : shxCfg().herName) + '　' + new Date(m.ts || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    var body = document.createElement('div'); body.className = 'opf-shx-text'; body.textContent = m.text;
    row.appendChild(who); row.appendChild(body);
    if (m.hits && m.hits.length) {
      var h = document.createElement('div'); h.className = 'opf-dim';
      h.textContent = '↳ 本轮引用回忆 ' + m.hits.length + ' 条：' + m.hits.map(function (x) { return x.score.toFixed(2); }).join(' / ');
      row.appendChild(h);
    }
    box.appendChild(row);
  });
  box.scrollTop = box.scrollHeight;
}
async function shxSend() {
  shxInit();
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var inp = getEl('opf-shx-input');
  var text = (inp && inp.value || '').trim();
  if (!text) { toast('先说点什么', 'warning'); return; }
  var cfg = shxCfg();
  if (!String(cfg.userName || '').trim()) { toast('建议先在右上角填「你的名字」——这是本面板专属称呼', 'warning'); }
  var userMsg = { id: 'm' + Date.now() + '_u', role: 'user', text: text, ts: Date.now() };
  ST.shx.msgs.push(userMsg);
  if (inp) inp.value = '';
  shxRenderMsgs();
  await shxPut('messages', { id: userMsg.id, role: 'user', text: text, ts: userMsg.ts, archived: false });

  ST.running = true; renderRunButtons();
  var status = getEl('opf-shx-status'); if (status) status.textContent = '她在翻书…';
  try {
    var mem = await shxBuildMemoryBlock(text);
    var sys = shxBuildSystem(text);
    userMsg.hits = mem.hits;
    ST.shx.lastHits = mem.hits;
    var msgs = [{ role: 'system', content: sys.system + (mem.text ? '\n\n' + mem.text : '') }];
    shxRecent(cfg.windowTurns).forEach(function (m) { msgs.push({ role: m.role, content: m.text }); });
    if (status) status.textContent = '她在翻书…（馆藏 ' + (sys.wbText ? sys.wbText.length + ' 字符' : '未命中') + (mem.hits.length ? '，回忆 ' + mem.hits.length + ' 条' : '') + '）';
    var resp = await callModel(msgs);
    var herMsg = { id: 'm' + Date.now() + '_a', role: 'assistant', text: String(resp || '').trim(), ts: Date.now() };
    ST.shx.msgs.push(herMsg);
    await shxPut('messages', { id: herMsg.id, role: 'assistant', text: herMsg.text, ts: herMsg.ts, archived: false });
    if (cfg.model && herMsg.text) { try { await shxEmbedCached([{ id: herMsg.id, text: herMsg.text }, { id: userMsg.id, text: userMsg.text }]); } catch (e) { opfLog('记忆向量化失败', e && e.message); } }
    shxRenderMsgs();
    if (cfg.memAuto && ST.shx.msgs.length % (Math.max(4, Number(cfg.memEveryTurns) || 12) * 2) === 0) { shxCompress(true); }
  } catch (e) {
    toast('对话出错：' + (e && e.message ? e.message : e), 'error');
    if (status) status.textContent = '出错：' + (e && e.message ? e.message : e);
  } finally {
    ST.running = false; renderRunButtons();
    var st2 = getEl('opf-shx-status'); if (st2 && /翻书/.test(st2.textContent)) st2.textContent = '就绪';
  }
}
async function shxCompress(silent) {
  var cfg = shxCfg();
  var all = await shxAll('messages');
  var pending = all.filter(function (m) { return !m.archived; }).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
  var keep = Math.max(2, Number(cfg.windowTurns) || 8) * 2;
  var toCompress = pending.slice(0, Math.max(0, pending.length - keep));
  if (toCompress.length < 2) { if (!silent) toast('最近的内容还在窗口里，暂时不需要压缩', 'success'); return; }
  var feed = toCompress.map(function (m) { return (m.role === 'user' ? (String(cfg.userName || '').trim() || '旅人') : cfg.herName) + '：' + m.text; }).join('\n');
  var ask = '把下面这段你与{{user}}的对话压缩成「记忆条目」，供以后检索。只输出 JSON，不要解释：\n'
    + '{"标题":"≤20字","要点":["≤40字，最多6条"],"关键词":["3~8个"],"情绪":"一句话"}\n\n[对话]\n' + feed.slice(0, 12000);
  ST.running = true; renderRunButtons();
  try {
    var resp = await callModel([{ role: 'system', content: shxFill(SHX_PERSONA) }, { role: 'user', content: shxFill(ask) }]);
    var j = rxExtractJson(resp) || { 标题: '一段对话', 要点: [String(resp).slice(0, 200)], 关键词: [] };
    var text = '【' + (j['标题'] || '一段对话') + '】\n' + (Array.isArray(j['要点']) ? j['要点'].map(function (x) { return '· ' + x; }).join('\n') : '') + (j['情绪'] ? '\n情绪：' + j['情绪'] : '');
    var id = 'mem' + Date.now();
    await shxPut('memory', { id: id, text: text, ts: Date.now(), keywords: j['关键词'] || [], covers: toCompress.map(function (m) { return m.id; }), kind: '记忆条目' });
    if (cfg.model) { try { await shxEmbedCached([{ id: id, text: text }]); } catch (e) { opfLog('记忆向量化失败', e && e.message); } }
    for (var i = 0; i < toCompress.length; i++) {
      var m = toCompress[i]; m.archived = true;
      await shxPut('messages', m);
    }
    shxRenderMem();
    if (!silent) toast('已压缩 ' + toCompress.length + ' 条消息为 1 条记忆条目', 'success');
  } catch (e) { if (!silent) toast('压缩失败：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); }
}
async function shxRenderMem() {
  var box = getEl('opf-shx-mem'); if (!box) return;
  try {
    var mems = await shxAll('memory');
    var msgs = await shxAll('messages');
    var vecs = await shxAll('vectors');
    var archived = msgs.filter(function (m) { return m.archived; }).length;
    box.textContent = '记忆条目 ' + mems.length + ' 条 ｜ 原文 ' + msgs.length + ' 条（其中已归档 ' + archived + '）｜ 本地向量 ' + vecs.length + ' 个'
      + (mems.length ? '\n' + mems.slice(-3).map(function (m) { return '· ' + String(m.text).split('\n')[0]; }).join('\n') : '');
  } catch (e) { box.textContent = '读取本地记忆失败：' + (e && e.message ? e.message : e); }
}
async function shxLoadHistory() {
  shxInit();
  try {
    var msgs = await shxAll('messages');
    msgs.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    ST.shx.msgs = msgs.filter(function (m) { return !m.archived; }).map(function (m) { return { id: m.id, role: m.role, text: m.text, ts: m.ts }; });
    shxRenderMsgs(); shxRenderMem();
  } catch (e) { opfLog('读取历史失败', e && e.message); }
}
async function shxExport() {
  try {
    var pack = { version: 1, exportedAt: Date.now(), cfg: shxCfg(), messages: await shxAll('messages'), memory: await shxAll('memory'), vectors: await shxAll('vectors') };
    destCopyText(JSON.stringify(pack), '没有可导出的内容');
    toast('已复制到剪贴板（含消息/记忆/向量，注意里面可能含你的向量接口密钥配置）', 'warning');
  } catch (e) { toast('导出失败：' + (e && e.message ? e.message : e), 'error'); }
}
async function shxClearAll() {
  if (!window.confirm('清空与始弦的对话与全部本地记忆（消息/记忆条目/向量）？此操作不可撤销。')) return;
  try {
    await shxClearStore('messages'); await shxClearStore('memory'); await shxClearStore('vectors');
    shxInit(); ST.shx.msgs = [];
    shxRenderMsgs(); shxRenderMem();
    toast('已清空本面板的对话与记忆');
  } catch (e) { toast('清空失败：' + (e && e.message ? e.message : e), 'error'); }
}
// ---------- 页面 ----------
var SHX_HTML = '<div class="opf-char-wrap"><div class="opf-sec-label">✦ 与始弦聊天 · 一起旁观世界书</div>'
  + '<div class="opf-dim">她是你在大图书馆的司书，也是同伴：一起看这部世界书描绘的世界，随时翻书查证。本面板<b>完全独立</b>——自有的称呼、自有的世界书选择、自有存储（消息/记忆/向量存在本机 IndexedDB），不写酒馆聊天记录、不触及其它板块。</div>'
  + '<div class="opf-shx-cfg">'
  + '<label class="opf-opt">你的名字<input id="opf-shx-user" class="opf-ref-input" placeholder="本面板专属称呼"></label>'
  + '<label class="opf-opt">她的自称<input id="opf-shx-her" class="opf-ref-input" placeholder="始弦"></label>'
  + '<label class="opf-opt">世界书来源<select id="opf-shx-wbmode" class="opf-ref-input"><option value="panel">面板内选书</option><option value="active">酒馆激活书</option></select></label>'
  + '<label class="opf-opt">注入上限<input id="opf-shx-cap" class="opf-num" type="number" min="2000" max="60000" step="1000"></label>'
  + '</div>'
  + '<div class="opf-shx-cfg">'
  + '<label class="opf-opt">向量接口<input id="opf-shx-base" class="opf-ref-input" placeholder="https://api.example.com/v1"></label>'
  + '<label class="opf-opt">密钥<input id="opf-shx-key" class="opf-ref-input" type="password" placeholder="只存在本机设置里"></label>'
  + '<label class="opf-opt">向量模型<select id="opf-shx-model" class="opf-ref-input"><option value="">（未选择）</option></select></label>'
  + '<button type="button" class="opf-btn ghost" id="opf-shx-models">🔌 读取模型列表</button>'
  + '<label class="opf-opt">检索条数<input id="opf-shx-topk" class="opf-num" type="number" min="1" max="20" step="1"></label>'
  + '<label class="opf-opt">相似度阈值<input id="opf-shx-thr" class="opf-num" type="number" min="0" max="1" step="0.05"></label>'
  + '<label class="opf-opt">窗口轮数<input id="opf-shx-win" class="opf-num" type="number" min="2" max="40" step="1"></label>'
  + '</div>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn ghost" id="opf-shx-wbfile">📚 导入世界书文件</button><button type="button" class="opf-btn ghost" id="opf-shx-wbactive">🔗 快照酒馆激活书</button><button type="button" class="opf-btn ghost" id="opf-shx-wbclear">🗑 清空本面板书目</button><button type="button" class="opf-btn ghost" id="opf-shx-compress">🧠 压缩为记忆条目</button><button type="button" class="opf-btn ghost" id="opf-shx-export">⧉ 导出记忆</button><button type="button" class="opf-btn ghost" id="opf-shx-clear">🗑 清空对话与记忆</button></div>'
  + '<div class="opf-dim" id="opf-shx-status">就绪</div>'
  + '<div class="opf-shx-log" id="opf-shx-log"></div>'
  + '<div class="opf-char-tools"><textarea id="opf-shx-input" class="opf-char-input" placeholder="对她说点什么（Enter 发送 / Shift+Enter 换行）"></textarea></div>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-shx-send">▶ 发送</button></div>'
  + '<div class="opf-sec"><div class="opf-sec-label">本面板世界书（独立选择，与其它板块无关）</div><div class="opf-dim" id="opf-shx-books">尚未载入</div><input id="opf-shx-wbfilter" class="opf-ref-input" placeholder="搜索条目…"><div class="opf-shx-wblist" id="opf-shx-wblist"></div></div>'
  + '<div class="opf-sec"><div class="opf-sec-label">本地记忆</div><pre id="opf-shx-mem" class="opf-box opf-char-report">读取中…</pre></div></div>';
function renderShxWb() {
  var box = getEl('opf-shx-wblist'); if (!box) return;
  var filt = String((getEl('opf-shx-wbfilter') || {}).value || '').trim().toLowerCase();
  box.textContent = '';
  var shown = SHX_WB.entries.filter(function (e) { return !filt || (e.comment + ' ' + e.key).toLowerCase().indexOf(filt) >= 0; }).slice(0, 300);
  shown.forEach(function (e) {
    var row = document.createElement('label'); row.className = 'opf-wi-row';
    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!e.sel;
    cb.addEventListener('change', function () { e.sel = this.checked; });
    var t = document.createElement('span'); t.className = 'opf-dim';
    t.textContent = (e.constant ? '★ ' : '') + (e.comment || e.key || '(无注释)');
    row.appendChild(cb); row.appendChild(t); box.appendChild(row);
  });
  if (!shown.length) { var d = document.createElement('div'); d.className = 'opf-dim'; d.textContent = SHX_WB.entries.length ? '没有匹配的条目' : '尚未载入世界书：点上方「导入世界书文件」或「快照酒馆激活书」'; box.appendChild(d); }
  else if (SHX_WB.entries.length > 300) { var m = document.createElement('div'); m.className = 'opf-dim'; m.textContent = '（仅显示前 300 条，用搜索缩小范围）'; box.appendChild(m); }
}
function shxRenderBooks() {
  var b = getEl('opf-shx-books');
  if (b) b.textContent = SHX_WB.entries.length ? ('已载入 ' + SHX_WB.books.join('、') + '：' + SHX_WB.entries.length + ' 条｜勾选 ' + SHX_WB.entries.filter(function (e) { return e.sel; }).length + ' 条将「总是注入」（★=常驻）；未勾选的不做常驻，但仍可被「全馆藏检索」按关键词召回') : '尚未载入';
}
function shxSyncCfgFromUi() {
  var g = function (id) { var el = getEl(id); return el ? el.value : ''; };
  shxSaveCfg({
    userName: g('opf-shx-user'), herName: g('opf-shx-her') || '始弦', worldMode: g('opf-shx-wbmode') || 'panel',
    injectCap: Number(g('opf-shx-cap')) || 12000,
    baseUrl: g('opf-shx-base'), apiKey: g('opf-shx-key'), model: g('opf-shx-model'),
    topK: Number(g('opf-shx-topk')) || 5, threshold: Number(g('opf-shx-thr')) || 0.2, windowTurns: Number(g('opf-shx-win')) || 8
  });
}
function shxLoadCfgToUi() {
  var cfg = shxCfg(), set = function (id, v) { var el = getEl(id); if (el && v !== undefined && v !== null) el.value = v; };
  set('opf-shx-user', cfg.userName); set('opf-shx-her', cfg.herName); set('opf-shx-wbmode', cfg.worldMode);
  set('opf-shx-cap', cfg.injectCap); set('opf-shx-base', cfg.baseUrl); set('opf-shx-key', cfg.apiKey);
  set('opf-shx-topk', cfg.topK); set('opf-shx-thr', cfg.threshold); set('opf-shx-win', cfg.windowTurns);
  var sel = getEl('opf-shx-model');
  if (sel && cfg.model) {
    var has = Array.prototype.some.call(sel.options, function (o) { return o.value === cfg.model; });
    if (!has) { var o = document.createElement('option'); o.value = cfg.model; o.textContent = cfg.model; sel.appendChild(o); }
    sel.value = cfg.model;
  }
}
function bindShxPage() {
  shxInit();
  var s = getEl('opf-shx-send'); if (!s || s._b) return; s._b = true;
  s.addEventListener('click', function () { shxSend(); });
  getEl('opf-shx-wbfile').addEventListener('click', function () { shxPickFile(); });
  getEl('opf-shx-wbactive').addEventListener('click', function () { shxWbUseActive(); });
  getEl('opf-shx-wbclear').addEventListener('click', function () { shxWbReset(); renderShxWb(); shxRenderBooks(); toast('已清空本面板书目（其它板块不受影响）'); });
  getEl('opf-shx-compress').addEventListener('click', function () { shxCompress(false); });
  getEl('opf-shx-export').addEventListener('click', function () { shxExport(); });
  getEl('opf-shx-clear').addEventListener('click', function () { shxClearAll(); });
  getEl('opf-shx-models').addEventListener('click', async function () {
    shxSyncCfgFromUi();
    var btn = this; btn.disabled = true; btn.textContent = '读取中…';
    try {
      var list = await shxFetchModels();
      var sel = getEl('opf-shx-model'); sel.textContent = '';
      list.forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = id; sel.appendChild(o); });
      var emb = list.filter(function (x) { return /embed|bge|m3e|text-embedding|gte|jina/i.test(x); });
      if (emb.length) sel.value = emb[0];
      toast('取到 ' + list.length + ' 个模型' + (emb.length ? '（已优先选中 ' + emb[0] + '）' : ''));
    } catch (e) { toast('读取失败：' + (e && e.message ? e.message : e), 'error'); }
    finally { btn.disabled = false; btn.textContent = '🔌 读取模型列表'; }
  });
  ['opf-shx-user', 'opf-shx-her', 'opf-shx-wbmode', 'opf-shx-cap', 'opf-shx-base', 'opf-shx-key', 'opf-shx-model', 'opf-shx-topk', 'opf-shx-thr', 'opf-shx-win'].forEach(function (id) {
    var el = getEl(id); if (el) el.addEventListener('change', shxSyncCfgFromUi);
  });
  getEl('opf-shx-wbfilter').addEventListener('input', renderShxWb);
  getEl('opf-shx-input').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); shxSend(); }
  });
  if (!ST.shx._inited) { ST.shx._inited = true; shxLoadCfgToUi(); shxLoadHistory(); shxRenderBooks(); renderShxWb(); }
}
function shxPickFile() {
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
  inp.addEventListener('change', function () { if (inp.files && inp.files[0]) shxWbImportFile(inp.files[0]); });
  inp.click();
}
