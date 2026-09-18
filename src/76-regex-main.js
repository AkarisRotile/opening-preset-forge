//@module 76-regex-main — ⑤ 正则工坊：三档传输 + 生成 + 自动修复 + AI 解析
function bindRxPage() {  rxInit();
  var p = getEl('opf-rx-parse'); if (!p || p._b) return; p._b = true;
  getEl('opf-rx-pull').addEventListener('click', function(){ rxPullFromDestiny(); });
  getEl('opf-rx-parse').addEventListener('click', function(){ rxDoParse(); });
  getEl('opf-rx-parse2').addEventListener('click', function(){ rxDoParseScript(); });
  getEl('opf-rx-gen').addEventListener('click', function(){ rxGenerate(); });
  getEl('opf-rx-check').addEventListener('click', function(){ rxDoCheck(true); });
  getEl('opf-rx-fix').addEventListener('click', function(){ rxAutoFixAll(); });
  getEl('opf-rx-copy1').addEventListener('click', function(){ rxCopy(false); });
  getEl('opf-rx-copyall').addEventListener('click', function(){ rxCopy(true); });
  getEl('opf-rx-new').addEventListener('click', function(){ rxClear(); });
  getEl('opf-rx-ping').addEventListener('click', function(){ rxPing(); });
  getEl('opf-rx-last').addEventListener('click', function(){
    var box = getEl('opf-rx-lastraw'); if (!box) return;
    var t = ST.rx.lastRaw;
    if (!t) { toast('还没有调用过模型', 'warning'); return; }
    if (box.style.display === 'none') {
      box.style.display = '';
      box.textContent = '【模型原始返回 · ' + t.length + ' 字符】\n\n' + (t.length > 20000 ? t.slice(0, 20000) + '\n\n…（已截断显示，完整 ' + t.length + ' 字符）' : t);
    } else {
      box.style.display = 'none';
    }
  });
  getEl('opf-rx-models').addEventListener('click', function(){ rxDoFetchModels(this); });
  getEl('opf-rx-pulltavern').addEventListener('click', function(){
    if (rxPullFromTavern()) rxDoFetchModels(getEl('opf-rx-models'));
  });
  // 换了传输/反代/密码后，若模型名还是空的就自动拉一次
  ['opf-rx-transport', 'opf-rx-reverse', 'opf-rx-proxypass', 'opf-rx-source'].forEach(function (id) {
    var el = getEl(id); if (!el) return;
    el.addEventListener('change', function () {
      var cfg = rxCfg();
      if (!String(cfg.model || '').trim() && cfg.reverseProxy) rxDoFetchModels(getEl('opf-rx-models'));
    });
  });
  var bindCfg = function (id, key) {
    var el = getEl(id); if (!el) return;
    el.addEventListener('change', function () { rxCfg()[key] = this.value; rxSyncTransportUi(); rxCacheSave(); });
  };
  bindCfg('opf-rx-transport', 'transport');
  bindCfg('opf-rx-source', 'source');
  bindCfg('opf-rx-reverse', 'reverseProxy');
  bindCfg('opf-rx-proxypass', 'proxyPassword');
  bindCfg('opf-rx-model', 'model');
  var modelEl = getEl('opf-rx-model');
  if (modelEl) modelEl.addEventListener('change', function () { rxRememberModel(this.value); });   // 手填的名字自动记住
  bindCfg('opf-rx-proto', 'directProtocol');
  bindCfg('opf-rx-base', 'baseUrl');
  bindCfg('opf-rx-key', 'apiKey');
  bindCfg('opf-rx-chatmodel', 'chatModel');
  var cur = rxCfg();
  [['opf-rx-transport', 'transport'], ['opf-rx-source', 'source'], ['opf-rx-reverse', 'reverseProxy'],
   ['opf-rx-proxypass', 'proxyPassword'], ['opf-rx-model', 'model'], ['opf-rx-proto', 'directProtocol'],
   ['opf-rx-base', 'baseUrl'], ['opf-rx-key', 'apiKey'], ['opf-rx-chatmodel', 'chatModel']].forEach(function (pair) {
    var el = getEl(pair[0]); if (el) el.value = cur[pair[1]] || '';
  });
  rxSyncTransportUi();
  getEl('opf-rx-core').addEventListener('input', function(){ ST.rx.core = this.value; rxCacheSave(); });
  rxRenderItems();
}
function rxPullFromDestiny() {
  var body = ST.dest && (ST.dest.body || ST.dest.out);
  if (!body) { toast('④ 页还没有最终稿件：请先在 ④ 页「最终封装」，或直接把核心全文粘进来', 'warning'); return; }
  var el = getEl('opf-rx-core'); if (el) el.value = body;
  ST.rx.core = body;
  toast('已从 ④ 页带入条目正文，点「🔍 解析语言格式」继续');
  rxDoParse();
}
function rxCoreNameFromText(txt) {
  var m = String(txt).match(/\{\{setvar::系统核心::\s*([^\n}]+)\}\}/);
  if (m) return m[1].trim();
  var w = String(txt).match(/<([A-Za-z_]\w*)\b/);
  return w ? w[1] : '未命名核心';
}
// 解析后再定名：setvar 系统核心 > 语言格式里 name 的固定值 > 第一个标签名
function rxDecideCoreName(txt, parsed) {
  var m = String(txt).match(/\{\{setvar::系统核心::\s*([^\n}]+)\}\}/);
  if (m) return m[1].trim();
  var named = ((parsed && parsed.formats) || []).filter(function (f) { return f.nameValue && !/\{/.test(f.nameValue); })[0];
  if (named) return named.nameValue;
  var sp = ((parsed && parsed.formats) || []).filter(function (f) { return f.speaker; })[0];
  if (sp) return sp.speaker;
  return rxCoreNameFromText(txt);
}
async function rxDoParse() {
  var el = getEl('opf-rx-core');
  var txt = (el && el.value || '').trim();
  if (!txt) { toast('请先粘贴核心全文（含语言格式节）', 'warning'); return; }
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  ST.rx.core = txt;
  ST.running = true; renderRunButtons();
  var box0 = getEl('opf-rx-parsed'); if (box0) box0.textContent = 'AI 解析中…（失败会自动回退到脚本解析）';
  var parsed = null, engine = 'ai', notes = [];
  try {
    var ai = await rxParseByAi(txt);
    if (ai && ai.formats.length) { parsed = ai; notes = ai.notes || []; if (ai.coreName) ST.rx.coreName = ai.coreName; }
    else { engine = 'script'; notes = (ai && ai.notes) || []; notes.push('AI 解析未产出可用格式，已回退脚本解析'); }
  } catch (e) {
    engine = 'script';
    notes.push('AI 解析失败（' + (e && e.message ? e.message : e) + '），已回退脚本解析');
  }
  if (!parsed) { parsed = rxParseLangFormat(txt); notes = (parsed.notes || []).concat(notes); }
  ST.rx.engine = engine;
  ST.rx.parsed = parsed;
  if (!ST.rx.coreName || engine === 'script') ST.rx.coreName = rxDecideCoreName(txt, parsed);
  rxShowParsed(parsed, engine, notes);
  rxBuildItems(parsed);
  ST.running = false; renderRunButtons(); rxCacheSave();
  toast('解析完成（' + (engine === 'ai' ? 'AI' : '脚本') + '）：' + parsed.formats.length + ' 套格式，已生成 ' + ST.rx.items.length + ' 条正则草稿', parsed.formats.length ? 'success' : 'warning');
}
function rxDoParseScript() {
  var el = getEl('opf-rx-core');
  var txt = (el && el.value || '').trim();
  if (!txt) { toast('请先粘贴核心全文（含语言格式节）', 'warning'); return; }
  ST.rx.core = txt;
  var parsed = rxParseLangFormat(txt);
  ST.rx.engine = 'script';
  ST.rx.parsed = parsed;
  ST.rx.coreName = rxDecideCoreName(txt, parsed);
  rxShowParsed(parsed, 'script', parsed.notes || []);
  rxBuildItems(parsed);
  rxCacheSave();
  toast('脚本解析完成：' + parsed.formats.length + ' 套格式', parsed.formats.length ? 'success' : 'warning');
}
function rxShowParsed(parsed, engine, notes) {
  var box = getEl('opf-rx-parsed');
  var L = ['引擎：' + (engine === 'ai' ? 'AI 解析（已通过脚本四项校验）' : '脚本解析（离线正则，AI 不可用时的后备）'),
    '核心名：' + ST.rx.coreName,
    '语言格式节：' + (parsed.section ? parsed.section.length + ' 字符' : '未找到'),
    '识别到格式 ' + parsed.formats.length + ' 套'];
  parsed.formats.forEach(function (f, i) {
    L.push('  [' + (i + 1) + '] ' + f.label + '  · 族=' + f.family + (f.nameValue ? ' · name固定值=' + f.nameValue : '') + (f.innerTag ? ' · 内嵌<' + f.innerTag + '>' : '') + (f.quote ? ' · 引号式' : ''));
    f.params.forEach(function (p) { L.push('        参数 ' + p.name + '：' + (p.values.length ? p.values.join('、') : '（未识别枚举）')); });
    L.push('        范例 ' + f.examples.length + ' 条' + (f.regex ? '' : '  ← 拒绝自动生成（裸引号式会吃掉全文所有「」）'));
  });
  (notes || []).forEach(function (n) { L.push('  ⚠ ' + n); });
  if (box) box.textContent = L.join('\n');
}
// 每种格式一条：class 前缀按「核心名 + 格式名」取，保证同一个核心的多套格式互不撞名
function rxItemPrefix(coreName, f) {
  var base = rxSlug(coreName);
  var tag = rxSlug(f && (f.label || f.tag || f.speaker || '')) || 'x';
  var s = base + '-' + tag;
  if (/^[0-9]/.test(s)) s = 'rx-' + s;
  return s.slice(0, 40) + '-box';
}
// 初始框架的默认选择：结算/抽卡这类「揭幕」用途用 details 款，其余默认法阵卡
function rxPickFrame(f, purpose) {
  if (/抽卡|结算|契约/.test(String(purpose || ''))) return 'reveal';
  if (f && f.family === 'bare') return 'plain';
  return 'array';
}
function rxBuildItems(parsed) {
  parsed.formats.forEach(function (f) {
    if (!f.regex) return;
    var exist = ST.rx.items.filter(function (it) { return it.formatKey === f.key && it.coreName === ST.rx.coreName; })[0];
    if (exist) {
      exist.examples = f.examples;
      exist.hasMood = f.params.some(function (x) { return x.name === 'mood'; });
      if (!exist.frame) exist.frame = rxPickFrame(f, exist.purpose);
      if (!exist.testText) exist.testText = f.examples[0] || '';
      return;
    }
    var purpose = (RX_PURPOSES.indexOf(f.purposeHint) >= 0 ? f.purposeHint : '对话美化');
    ST.rx.items.push({
      id: rxUuid(), coreName: ST.rx.coreName, formatKey: f.key, label: f.label,
      purpose: purpose, tier: 'fine', frame: rxPickFrame(f, purpose), prefix: rxItemPrefix(ST.rx.coreName, f),
      findSource: '/' + f.regex.source + '/' + f.regex.flags,
      replaceHtml: '', testText: f.examples[0] || '', examples: f.examples,
      hasMood: f.params.some(function (x) { return x.name === 'mood'; }), issues: []
    });
  });
  rxRenderItems();
}
function rxRenderItems() {
  var box = getEl('opf-rx-items'); if (!box) return;
  rxInit();
  box.textContent = '';
  ST.rx.items.forEach(function (item, idx) {
    var card = document.createElement('div'); card.className = 'opf-step open';
    var head = document.createElement('div'); head.className = 'opf-step-head';
    var idxEl = document.createElement('span'); idxEl.className = 'opf-idx'; idxEl.textContent = String(idx + 1);
    var ttl = document.createElement('span'); ttl.className = 'opf-step-title'; ttl.textContent = item.label + ' · ' + item.purpose;
    var fr = rxFrameOf(item);
    var sub = document.createElement('span'); sub.className = 'opf-step-sub';
    sub.textContent = fr.label + '｜' + (item.replaceHtml || '').length + ' 字符 / ' + rxTier(item.tier).label + (item.cssStale ? '｜样式待重生成' : '');
    var del = document.createElement('button'); del.type = 'button'; del.className = 'opf-step-act'; del.textContent = '删除';
    del.addEventListener('click', function (ev) { ev.stopPropagation(); ST.rx.items.splice(idx, 1); rxRenderItems(); rxCacheSave(); });
    head.appendChild(idxEl); head.appendChild(ttl); head.appendChild(sub); head.appendChild(del);
    head.addEventListener('click', function () { card.classList.toggle('open'); });
    card.appendChild(head);

    var body = document.createElement('div'); body.className = 'opf-step-body';
    // 用途 / 档位
    var row1 = document.createElement('div'); row1.className = 'opf-step-ref-row';
    var psel = document.createElement('select'); psel.className = 'opf-ref-input';
    RX_PURPOSES.forEach(function (p) { var o = document.createElement('option'); o.value = p; o.textContent = p; if (p === item.purpose) o.selected = true; psel.appendChild(o); });
    psel.addEventListener('change', function () { item.purpose = this.value; rxRenderItems(); rxCacheSave(); });
    var tsel = document.createElement('select'); tsel.className = 'opf-ref-input';
    RX_TIERS.forEach(function (t) { var o = document.createElement('option'); o.value = t.id; o.textContent = t.label + (t.target ? '（≈' + t.target + '）' : '（不设上限）'); if (t.id === item.tier) o.selected = true; tsel.appendChild(o); });
    tsel.addEventListener('change', function () { item.tier = this.value; rxRenderItems(); rxCacheSave(); });
    // 初始框架：换款 → 结构由代码重搭（$n 引用不会错），样式标记为待重生成
    var fsel = document.createElement('select'); fsel.className = 'opf-ref-input';
    RX_FRAMES.forEach(function (fr) { var o = document.createElement('option'); o.value = fr.id; o.textContent = fr.label; o.title = fr.from + '：' + fr.desc; if (fr.id === rxFrameOf(item).id) o.selected = true; fsel.appendChild(o); });
    fsel.addEventListener('change', function () {
      var wasSkeleton = rxIsSkeletonItem(item);
      item.frame = this.value;
      var nf = rxFrameOf(item);
      if (wasSkeleton) {
        rxSetItemCss(item, rxItemCss(item));
        item.cssStale = true;
        item.issues = rxLint(item, ST.rx.parsed);
        toast('已换成「' + nf.label + '」：HTML 骨架已重搭，点「🎨 生成替换体」按新框架重写样式', 'success');
      } else {
        toast('已选「' + nf.label + '」（' + nf.from + '）；这条是手写替换体，框架只在重搭骨架时生效');
      }
      rxRenderItems(); rxCacheSave();
    });
    row1.appendChild(psel); row1.appendChild(tsel); row1.appendChild(fsel);
    body.appendChild(row1);
    body.appendChild(rxLabel('初始框架｜' + fr.from + ' —— ' + fr.desc));
    // 匹配式
    body.appendChild(rxLabel('匹配式（插件生成，可手改）'));
    var fin = document.createElement('input'); fin.type = 'text'; fin.className = 'opf-ref-input'; fin.value = item.findSource;
    fin.addEventListener('input', function () { item.findSource = this.value; item.issues = []; rxPreviewInto(item); rxCacheSave(); });
    body.appendChild(fin);
    // 替换体
    body.appendChild(rxLabel('替换体（模型产出，可手改）'));
    var ta = document.createElement('textarea'); ta.className = 'opf-char-input'; ta.style.minHeight = '80px'; ta.value = item.replaceHtml;
    // 手改即视为「以文本框为准」：清掉可能过期的 css 缓存，之后 rxItemCss 会从 HTML 里现取
    ta.addEventListener('input', function () { item.replaceHtml = this.value; item.css = ''; rxPreviewInto(item); rxCacheSave(); });
    body.appendChild(ta);
    // 生成后修改：提要求 → AI 只改被要求的部分（可只改样式，或连带匹配式）
    body.appendChild(rxLabel('修改（对这条生成结果提要求，AI 只改你点到的部分；其它条目不受影响）'));
    var rrow = document.createElement('div'); rrow.className = 'opf-step-ref-row';
    var rscope = document.createElement('select'); rscope.className = 'opf-ref-input'; rscope.style.flex = '0 0 132px';
    [['patch', '补丁：只改样式'], ['css', '整段：只改样式'], ['find', '整段：样式+匹配式']].forEach(function (p) { var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; rscope.appendChild(o); });
    var rin = document.createElement('input'); rin.type = 'text'; rin.className = 'opf-ref-input';
    rin.placeholder = '例：边框改成暗金色、字号大一点、去掉动效；或：台词外的括号改成灰色小字';
    var rdo = document.createElement('button'); rdo.type = 'button'; rdo.className = 'opf-step-act'; rdo.textContent = '✨ 修改';
    rdo.addEventListener('click', function () { rxRefineItem(item, rin.value, rscope.value); });
    var rsug = document.createElement('button'); rsug.type = 'button'; rsug.className = 'opf-step-act'; rsug.textContent = '💡 建议';
    rsug.addEventListener('click', function () { rxSuggestItem(item, idx); });
    rin.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); rxRefineItem(item, rin.value, rscope.value); } });
    rrow.appendChild(rscope); rrow.appendChild(rin); rrow.appendChild(rdo); rrow.appendChild(rsug);
    body.appendChild(rrow);
    var chips = document.createElement('div'); chips.className = 'opf-step-ref'; chips.id = 'opf-rx-chips-' + idx;
    body.appendChild(chips);
    // 局部自动修复（只修这一条）
    var fixRow = document.createElement('div'); fixRow.className = 'opf-step-ref-row';
    var fl = document.createElement('span'); fl.className = 'opf-ref-tag'; fl.textContent = '局部修复';
    var fb = document.createElement('button'); fb.type = 'button'; fb.className = 'opf-step-act'; fb.textContent = '🔧 只修这一条';
    fb.addEventListener('click', async function () {
      if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
      var logs = rxAutoFixLocal(item);
      item.issues = rxLint(item, ST.rx.parsed);
      var left = rxLint(item, ST.rx.parsed).filter(function (x) { return RX_AI_FIXABLE.indexOf(x.key) >= 0; });
      rxRenderItems(); rxCacheSave(); rxDoCheck(false);
      toast(logs.length ? ('本条目已修：' + logs.join('；') + (left.length ? '（还剩 ' + left.length + ' 项需 AI）' : '')) : (left.length ? ('本地修不了，' + left.length + ' 项需 AI（点「🔧 自动修复」）') : '本条目自检通过'), logs.length ? 'success' : 'warning');
    });
    fixRow.appendChild(fl); fixRow.appendChild(fb);
    if (item._undo) {
      var ub = document.createElement('button'); ub.type = 'button'; ub.className = 'opf-step-act'; ub.textContent = '↩ 撤销上次 AI 改动';
      ub.title = '退回这次 AI 改写之前的匹配式/替换体（' + new Date(item._undo.at).toLocaleTimeString() + '）';
      ub.addEventListener('click', function () {
        if (!rxUndo(item)) { toast('没有可撤销的改动', 'warning'); return; }
        rxRenderItems(); rxCacheSave(); rxDoCheck(false);
        toast('已退回 AI 改动前的内容', 'success');
      });
      fixRow.appendChild(ub);
    }
    body.appendChild(fixRow);
    // 测试文本 + 预览
    body.appendChild(rxLabel('测试文本（默认取核心自带范例）'));
    var tt = document.createElement('textarea'); tt.className = 'opf-char-input'; tt.style.minHeight = '48px'; tt.value = item.testText;
    tt.addEventListener('input', function () { item.testText = this.value; rxPreviewInto(item); rxCacheSave(); });
    body.appendChild(tt);
    var pv = document.createElement('div'); pv.className = 'opf-rx-preview'; pv.id = 'opf-rx-pv-' + idx;
    body.appendChild(pv);
    var stat = document.createElement('div'); stat.className = 'opf-dim'; stat.id = 'opf-rx-st-' + idx;
    body.appendChild(stat);
    card.appendChild(body);
    box.appendChild(card);
    rxPreviewInto(item);
  });
}
function rxLabel(t) { var d = document.createElement('div'); d.className = 'opf-dim'; d.textContent = t; return d; }
function rxSetButtons() {
  ['opf-rx-parse', 'opf-rx-parse2', 'opf-rx-check', 'opf-rx-fix', 'opf-rx-pull', 'opf-rx-copy1', 'opf-rx-copyall', 'opf-rx-new', 'opf-rx-ping', 'opf-rx-models', 'opf-rx-last'].forEach(function (id) {
    var b = getEl(id); if (b) b.disabled = !!ST.running;
  });
  var ps = getEl('opf-rx-parse');
  if (ps) ps.textContent = ST.running ? '■ 解析中…' : '🔍 解析语言格式（AI）';
  var g = getEl('opf-rx-gen');
  if (g) { g.disabled = !!ST.running; g.textContent = ST.running ? '■ 运行中…' : '🎨 生成替换体'; }
  var sb = getEl('opf-shx-send');
  if (sb) { sb.disabled = !!ST.running; sb.textContent = ST.running ? '■ 她在翻书…' : '▶ 发送'; }
  ['opf-shx-compress', 'opf-shx-clear', 'opf-shx-export', 'opf-shx-models'].forEach(function (id) {
    var b2 = getEl(id); if (b2) b2.disabled = !!ST.running;
  });
}
function rxPreviewInto(item) {
  rxInit();
  var idx = ST.rx.items.indexOf(item);
  var pv = getEl('opf-rx-pv-' + idx), st = getEl('opf-rx-st-' + idx);
  if (!pv || !st) return;
  var m = String(item.findSource).match(/^\/([\s\S]*)\/([a-z]*)$/);
  if (!m) { st.textContent = '匹配式格式应为 /pattern/flags'; pv.textContent = ''; return; }
  var re;
  try { re = new RegExp(m[1], m[2].indexOf('g') >= 0 ? m[2] : m[2] + 'g'); }
  catch (e) { st.textContent = '正则编译失败：' + (e && e.message ? e.message : e); pv.textContent = ''; return; }
  var txt = item.testText || '';
  var hits = 0;
  var out = txt.replace(re, function () {
    hits++;
    var caps = Array.prototype.slice.call(arguments, 1, Math.max(1, arguments.length - 2)).filter(function (c) { return c !== undefined; });
    if (!item.replaceHtml) return '【此处将替换为美化框：' + caps.join(' ▸ ').slice(0, 50) + '】';
    return item.replaceHtml.replace(/\$(\d+)/g, function (all, n) { return caps[Number(n) - 1] != null ? caps[Number(n) - 1] : ''; });
  });
  if (hits > 0 && item.replaceHtml) {
    // 预览渲染：移除 script 与事件属性后再插入
    var safe = out.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
    pv.innerHTML = safe;
  } else {
    pv.textContent = out;
  }
  st.textContent = '匹配 ' + hits + ' 处' + (item.replaceHtml ? ' ｜ 替换体 ' + item.replaceHtml.length + ' 字符（' + rxTier(item.tier).label + '档）' : ' ｜ 尚未生成替换体');
}
// ---------- 取/设某一项的 CSS（样式唯一真源，改完重新组装骨架）----------
function rxItemCss(item) {
  if (item && typeof item.css === 'string' && item.css) return item.css;
  var m = String((item && item.replaceHtml) || '').match(/<style>([\s\S]*?)<\/style>/i);
  return m ? String(m[1]).trim() : '';
}
function rxItemFormat(item) {
  return (ST.rx.parsed && ST.rx.parsed.formats || []).filter(function (x) { return x.key === item.formatKey; })[0] || { family: 'quote', params: [] };
}
function rxSetItemCss(item, css) {
  item.css = String(css || '');
  item.replaceHtml = rxAssemble(item, rxItemFormat(item), item.css);
}
// ---------- CSS 解析与补丁合并：只让模型输出「要改的规则」，合并由插件做 ----------
// 按花括号配对切出顶层规则（跳过字符串与注释），@ 块整体算一条
function rxCssRules(css) {
  var s = String(css || ''), out = [], i = 0, n = s.length;
  var skipWsAndComments = function (p) {
    for (;;) {
      while (p < n && /\s/.test(s.charAt(p))) p++;
      if (s.slice(p, p + 2) === '/*') { var e = s.indexOf('*/', p + 2); p = e < 0 ? n : e + 2; continue; }
      return p;
    }
  };
  while (i < n) {
    var j = skipWsAndComments(i);
    if (j >= n) break;
    var k = j;
    while (k < n && s.charAt(k) !== '{' && s.charAt(k) !== ';') {
      if (s.slice(k, k + 2) === '/*') { var e1 = s.indexOf('*/', k + 2); k = e1 < 0 ? n : e1 + 2; continue; }
      var q = s.charAt(k);
      if (q === '"' || q === "'") { k++; while (k < n && s.charAt(k) !== q) { if (s.charAt(k) === '\\') k++; k++; } }
      k++;
    }
    if (k >= n) break;
    if (s.charAt(k) === ';') { i = k + 1; continue; }              // @import / @charset 之类
    var d = 0, m = k;
    for (; m < n; m++) {
      var c = s.charAt(m);
      if (s.slice(m, m + 2) === '/*') { var e2 = s.indexOf('*/', m + 2); m = e2 < 0 ? n : e2 + 1; continue; }
      if (c === '"' || c === "'") { m++; while (m < n && s.charAt(m) !== c) { if (s.charAt(m) === '\\') m++; m++; } continue; }
      if (c === '{') d++;
      else if (c === '}') { d--; if (d === 0) break; }
    }
    var pre = s.slice(j, k).trim();
    out.push({ prelude: pre, at: pre.charAt(0) === '@', raw: s.slice(i, m + 1), start: i, end: m + 1 });
    i = m + 1;
  }
  return out;
}
function rxCssNormSel(p) {
  return String(p || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}
// 把补丁里同选择器的规则覆盖进原 CSS，新选择器追加到末尾；未提到的部分逐字不动
function rxCssMerge(orig, patch) {
  var base = String(orig || '');
  var rules = rxCssRules(base), adds = rxCssRules(patch);
  var replaced = [], added = [], skipped = [], append = [];
  adds.forEach(function (r) {
    if (r.at) { skipped.push(r.prelude); return; }
    if (!r.prelude) return;
    var key = rxCssNormSel(r.prelude);
    var hit = null;
    for (var t = 0; t < rules.length; t++) { if (!rules[t].at && rxCssNormSel(rules[t].prelude) === key) { hit = rules[t]; break; } }
    if (hit) { hit.newRaw = r.raw; replaced.push(r.prelude); }
    else { added.push(r.prelude); append.push(r.raw); }
  });
  var out = '', cursor = 0;
  rules.forEach(function (x) {
    out += base.slice(cursor, x.start);
    out += (x.newRaw != null) ? x.newRaw : x.raw;
    cursor = x.end;
  });
  out += base.slice(cursor);
  if (append.length) out = out.replace(/\s*$/, '') + '\n\n/* 修改追加 */\n' + append.join('\n') + '\n';
  return { css: out, replaced: replaced, added: added, skipped: skipped };
}
// 模型没听劝、整段回了一套 CSS 时：按整段处理（走缩水保护），别再当补丁合并
function rxLooksLikeFullCss(patchCss, curCss) {
  var a = rxCssRules(patchCss).filter(function (r) { return !r.at; }).length;
  var b = rxCssRules(curCss).filter(function (r) { return !r.at; }).length;
  return a > 0 && b > 0 && a >= Math.max(4, Math.ceil(b * 0.6));
}
// ---------- 自动修复：先本地（纯字符串、立即），剩下交给 AI ----------
var RX_AI_FIXABLE = ['ref', 'moodbranch', 'external', 'fixedwidth', 'undefvar', 'clipdecor', 'hiddenbody', 'nomatch', 'toosmall', 'toobig', 'exmatch', 'empty'];
// 条目是否「就是插件生成的骨架 + CSS」——只有这种才能安全地只换 CSS 层。
// 判据是逐字重建比对：把现有 CSS 塞回骨架，能与条文一字不差，才认定结构没被动过；
// 用户手改过（哪怕只改了标签）就一律走「整段替换」模式，绝不拿骨架覆盖他的手写内容。
function rxIsSkeletonItem(item) {
  var rep = String((item && item.replaceHtml) || '');
  if (rep.indexOf('<style') < 0 || rep.indexOf(RX_STYLE_SLOT) >= 0) return false;
  try {
    var f = rxItemFormat(item);
    return rxAssemble(item, f, rxItemCss(item)) === rep;
  } catch (e) { return false; }
}
function rxAutoFixLocal(item) {
  var done = [];
  var issues = rxLint(item, ST.rx.parsed);
  issues.forEach(function (is) {
    if (is.side !== 'regex' || !is.fix || is.fix === 'none') return;
    done.push(rxApplyFix(item, is));
  });
  if (done.length) item.issues = rxLint(item, ST.rx.parsed);
  return done;
}
var RX_REFINE_RULES = [
  '【修改规则】',
  '1. 只改用户要求/问题清单点到的部分，未提到的保持原样；不要顺手重构、不要换配色体系、不要改 class 名与骨架结构。',
  '2. 颜色继续使用已有的 CSS 变量；确实需要新颜色就新增变量并在最外层定义。',
  '3. 禁止：<script>、外部字体/图片资源、把最外层容器写成固定像素宽、依赖 :hover 才显示文字、@import。装饰层（法阵/粒子/角标）用固定 px 和破框显示是允许的。',
  '4. 必须保留骨架里出现的所有 $n 捕获组引用，不得新增或删除引用。'
].join('\n');
var RX_REFINE_RULES_FULL = RX_REFINE_RULES + '\n5. 这条替换体是用户手写的整段内容：直接输出改好的整段替换体全文（含 <style> 与标签），不要套用任何别的骨架。';
// 把 AI 返回的 JSON 落到条目上；mode=full 时整段替换，mode=css 时只换样式层
function rxApplyAiResult(item, j, rawText, scope) {
  var mode = rxIsSkeletonItem(item) ? 'css' : 'full';
  var changed = [];
  if (j && typeof j.css === 'string' && j.css.trim() && mode === 'css') { rxSetItemCss(item, j.css); changed.push('样式'); }
  if (j && typeof j.replaceString === 'string' && j.replaceString.trim()) { item.replaceHtml = j.replaceString.trim(); item.css = ''; changed.push('替换体'); }
  if (j && typeof j.findRegex === 'string' && j.findRegex.trim() && scope !== 'css') { item.findSource = j.findRegex.trim(); changed.push('匹配式'); }
  if (!changed.length && mode === 'css') {
    var c = rxExtractCss(rawText);                            // 容错：整段回复就是 CSS
    if (c) { rxSetItemCss(item, c); changed.push('样式（按纯 CSS 解析）'); }
  }
  item.issues = rxLint(item, ST.rx.parsed);
  return changed;
}
// ---------- 撤销快照：任何 AI 改写前先存一份，改坏了能一键退回 ----------
function rxSnapshot(item) {
  item._undo = { css: (typeof item.css === 'string' ? item.css : ''), replaceHtml: String(item.replaceHtml || ''), findSource: String(item.findSource || ''), at: Date.now() };
}
function rxUndo(item) {
  var u = item._undo; if (!u) return false;
  item.css = u.css; item.replaceHtml = u.replaceHtml; item.findSource = u.findSource; item._undo = null;
  item.issues = rxLint(item, ST.rx.parsed);
  return true;
}
// 用户是不是明确要求「变短/删东西」——是的话缩水保护放宽
function rxWantsShort(dir) {
  return /精简|简化|缩短|短一点|更短|压缩|删|去掉|去除|移除|减少|减掉|瘦身|太长|简略/.test(String(dir || ''));
}
function rxShrinkThreshold(dir) { return rxWantsShort(dir) ? 0.45 : 0.75; }
// 结果明显偏短 = 疑似只回传了改动片段（600 字符以下的小样式不做判定，免得误伤）
function rxIsShrinkSuspect(beforeLen, afterLen, dir) {
  var b = Number(beforeLen) || 0;
  return b >= 600 && (Number(afterLen) || 0) < b * rxShrinkThreshold(dir);
}
// 从模型回复里取正文本体：优先 css（骨架条目）/ replaceString（手写条目），再兜底整段 CSS
function rxAiPayload(j, rawText, mode) {
  if (j && typeof j.css === 'string' && j.css.trim() && mode === 'css') return { kind: 'css', text: j.css };
  if (j && typeof j.replaceString === 'string' && j.replaceString.trim()) return { kind: 'replaceString', text: j.replaceString };
  if (mode === 'css') { var c = rxExtractCss(rawText); if (c) return { kind: 'css', text: c, loose: true }; }
  return null;
}
function rxAiPromptOf(item, f, issues, dir, scope, mode) { return rxRepairPrompt(item, f, issues, dir, scope, mode)[0]; }
async function rxCallRepair(prompt, phase) {
  var resp = await rxStreamCall([{ role: 'system', content: rxSlimSystemContent(ST.rx.parsed && ST.rx.parsed.section || '', 6000) }, { role: 'user', content: prompt }], null, { phase: phase, idleMs: 20000, maxMs: 220000, maxTokens: 16000 });
  ST.rx.lastRaw = String(resp.text || '');
  ST.rx.lastStalled = !!resp.stalled;
  return resp.text || '';
}
// AI 改写唯一入口：改写 → 缩水保护（自动重试一次）→ 落地。
// 返回 { changed:[], mode, before, after, blocked:bool }
async function rxAiRewrite(item, f, issues, dir, scope, phase) {
  var mode = rxIsSkeletonItem(item) ? 'css' : 'full';
  var beforeText = mode === 'css' ? rxItemCss(item) : String(item.replaceHtml || '');
  var out = { changed: [], mode: mode, before: beforeText.length, after: beforeText.length, blocked: false, note: '' };
  var prompt = rxAiPromptOf(item, f, issues, dir, scope, mode);
  var raw = await rxCallRepair(prompt, phase);
  var j = rxExtractJson(raw);
  var payload = rxAiPayload(j, raw, mode);
  var tooShort = function (len) { return rxIsShrinkSuspect(beforeText.length, len, dir); };
  if (payload && tooShort(payload.text.length)) {
    // 模型多半只回了「改动片段」。明确要求它把未改动的部分逐字补全，再给一次机会。
    var p2 = prompt
      + '\n\n[上一次的输出不合格：疑似省略了未改动部分]\n上一次只给了 ' + payload.text.length + ' 字符，而原内容有 ' + beforeText.length + ' 字符。请重新输出**完整**的' + (mode === 'css' ? 'CSS' : '替换体') + '：未被要求改动的规则必须逐字保留，禁止 "/* 其余不变 */"「以下省略」这类占位，也不要用中文说明代替代码。\n\n[上一次的输出]\n' + String(payload.text).slice(0, 4000);
    var raw2 = await rxCallRepair(p2, phase + '（补全重试）');
    var j2 = rxExtractJson(raw2);
    var p2r = rxAiPayload(j2, raw2, mode);
    if (p2r && p2r.text.length > payload.text.length) { payload = p2r; j = j2; }
  }
  if (!payload) { out.note = '模型没有返回可用的' + (mode === 'css' ? 'CSS' : '替换体') + (ST.rx.lastStalled ? '（传输中途停顿，疑似被截断，可直接重试）' : '') + '（工具栏「📄 上次返回」可看原文）'; return out; }
  out.after = payload.text.length;
  if (tooShort(payload.text.length)) {
    // 连重试都还是明显偏短：不静默落地，交用户裁决（默认保留原样）
    out.blocked = true;
    out.note = '改后只有 ' + payload.text.length + ' 字符，原为 ' + beforeText.length + ' 字符（-' + Math.round((1 - payload.text.length / Math.max(1, beforeText.length)) * 100) + '%），疑似只回传了改动片段（已自动重试一次仍未补全）' + (ST.rx.lastStalled ? '；传输中途停顿过，也可能被截断' : '');
    var ask = (typeof window !== 'undefined' && window.confirm) ? window.confirm : function () { return false; };
    if (!ask(out.note + '。\n\n要用这个偏短的结果替换吗？\n（点「取消」= 保留原样，点「确定」= 替换，之后还能用「↩ 撤销」退回）')) return out;
    out.blocked = false;
    out.note += '（你选择保留这个偏短结果）';
  }
  rxSnapshot(item);
  var jj = {};
  if (j && typeof j.findRegex === 'string') jj.findRegex = j.findRegex;
  if (payload.kind === 'css') jj.css = payload.text; else jj.replaceString = payload.text;
  out.changed = rxApplyAiResult(item, jj, payload.loose ? raw : '', scope);
  return out;
}
function rxRepairPrompt(item, f, issues, dir, scope, mode) {
  var L = [];
  var cur = mode === 'css' ? rxItemCss(item) : String(item.replaceHtml || '');
  L.push('[任务] ' + (dir ? '按用户要求修改' : '修复') + '一条「对话美化正则」：它把命定系统输出的对话标签渲染成美化框。' + (dir ? '' : '只改与问题清单有关的地方。'));
  if (dir) L.push('[用户要求]\n' + String(dir));
  if (issues && issues.length) L.push('[自检发现的问题（逐条修掉）]\n' + issues.map(function (x, i) { return (i + 1) + '. [' + (x.side === 'core' ? '核心侧' : '正则侧') + '] ' + x.msg; }).join('\n'));
  L.push('[当前匹配式' + (scope === 'find' ? '（本次允许修改：改完必须仍能匹配核心自带的范例）' : '（本次不要改动）') + ']\n' + item.findSource);
  L.push(mode === 'css' ? ('[当前 CSS（共 ' + cur.length + ' 字符）]\n' + (cur || '（空，需要你写）')) : ('[当前替换体全文（共 ' + cur.length + ' 字符）]\n' + (cur || '（空，需要你写）')));
  L.push(mode === 'css'
    ? ('[骨架（HTML 结构由插件生成并锁定，绝不能改动）· 初始框架「' + rxFrameOf(item).label + '」]\n' + rxSkeleton(item, f))
    : ('[本条在核心里的典型形态（仅供你对齐 $n 引用布局，结构可自行组织）]\n' + rxSkeleton(item, f)));
  if (mode === 'css') L.push('[框架分层职责]\n' + rxFrameLayers(rxFrameOf(item).id, rxPreOf(item)));
  if (mode === 'css') L.push('[必须定义的变量] ' + rxRequiredVars(rxPreOf(item), rxFrameOf(item).id).join(' / '));
  if (f.params && f.params.length) f.params.forEach(function (p) { if (p.values && p.values.length) L.push('[参数 ' + p.name + ' 的枚举值] ' + p.values.join('、')); });
  L.push(mode === 'css' ? RX_REFINE_RULES : RX_REFINE_RULES_FULL);
  L.push('[完整性要求] 你必须输出**完整**的结果，不是改动片段：未被要求改动的规则原样逐字保留（包括注释、选择器、变量定义、@keyframes、data-mood 分支），禁止 "/* 其余不变 */"「以下省略」这类占位。原始内容有 ' + cur.length + ' 字符，除非用户明确要求精简，你的输出不应明显短于这个长度。');
  L.push('[输出] 只输出一个 ' + fence() + 'json 代码块：' + (mode === 'css' ? '{"css":"修改后的完整 CSS"}' : '{"replaceString":"修改后的完整替换体"}') + (scope === 'find' ? '；若确需改匹配式，再加 "findRegex":"/…/g"' : '') + '。字符串内部如需换行请写成 \\n 转义（或直接输出 ' + fence() + 'css 代码块），不要输出任何其它文字。');
  return [macroFill(L.join('\n\n')), mode];
}
async function rxAutoFixAi(item, issues) {
  var f = rxItemFormat(item);
  var r = await rxAiRewrite(item, f, issues, '', 'find', '自动修复');
  if (r.blocked) return [];
  return r.changed;
}
async function rxAutoFixAll() {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  rxInit();
  if (!ST.rx.items.length) { toast('还没有正则草稿', 'warning'); return; }
  var st = getEl('opf-rx-statusline');
  var localLog = [];
  ST.rx.items.forEach(function (it) {
    var d = rxAutoFixLocal(it);
    if (d.length) localLog.push(it.label + '：' + d.join('；'));
  });
  rxRenderItems(); rxCacheSave();
  var left = [];
  ST.rx.items.forEach(function (it) {
    rxLint(it, ST.rx.parsed).forEach(function (is) { if (RX_AI_FIXABLE.indexOf(is.key) >= 0) left.push({ it: it, is: is }); });
  });
  if (st) st.textContent = '本地修复 ' + localLog.length + ' 项；剩余需 AI 修复 ' + left.length + ' 项';
  if (!left.length) {
    rxDoCheck(false);
    toast(localLog.length ? ('自动修复完成（本地修好 ' + localLog.length + ' 项）：' + localLog.join('｜')) : '自检没有问题，无需修复', 'success');
    return;
  }
  if (!window.confirm('本地能修的已经修完：\n' + (localLog.join('\n') || '（无）') + '\n\n还剩 ' + left.length + ' 项需要 AI 改写（如 $n 引用越界、mood 未分支、体量偏离、匹配不上范例）。现在让 AI 修吗？')) return;
  ST.running = true; renderRunButtons();
  try {
    var byItem = [];
    left.forEach(function (x) { var g = byItem.filter(function (y) { return y.it === x.it; })[0]; if (g) g.list.push(x.is); else byItem.push({ it: x.it, list: [x.is] }); });
    var okN = 0;
    for (var i = 0; i < byItem.length; i++) {
      if (isStop()) break;
      if (st) st.textContent = 'AI 修复中…（' + (i + 1) + '/' + byItem.length + '：' + byItem[i].it.label + '）';
      var ch = await rxAutoFixAi(byItem[i].it, byItem[i].list);
      if (ch.length) okN++;
      await waitTick();
    }
    rxRenderItems(); rxCacheSave(); rxDoCheck(false);
    if (st) st.textContent = '自动修复完成：本地 ' + localLog.length + ' 项，AI 修复 ' + okN + '/' + byItem.length + ' 项';
    toast('自动修复完成：本地 ' + localLog.length + ' 项，AI 修复 ' + okN + ' 项（剩余项见自检区）', okN ? 'success' : 'warning');
  } catch (e) {
    toast('AI 修复出错：' + rxDiagError(e), 'error');
  } finally { ST.running = false; renderRunButtons(); }
}
// ---------- 生成后修改：用户提要求，AI 只改被要求的部分 ----------
// 补丁模式（默认）：仍然把完整 CSS 作为输入发给模型，但**只要求它输出要改的规则**，
// 合并按选择器由插件完成 —— 输出从 1.5 万字符降到几百字符，截断/偷懒/思考吃预算全部失效。
var RX_REFINE_RULES_PATCH = [
  '【修改规则】',
  '1. 只改用户要求点到的部分，未提到的规则一个字都不要动（也不用抄）。',
  '2. 颜色优先使用现有 CSS 变量；确实需要新颜色可以在规则里写死，或用 :root 之外的自定义属性。',
  '3. 禁止：<script>、外部字体/图片资源、把最外层容器写成固定像素宽、依赖 :hover 才显示文字、@import。装饰层（法阵/粒子/角标）的固定 px 与破框显示是允许的。',
  '4. 必须保留现有的 class 名与骨架结构，不得重命名选择器。'
].join('\n');
function rxPatchPrompt(item, f, dir) {
  var cur = rxItemCss(item);
  var frame = rxFrameOf(item);
  var L = [];
  L.push('[任务] 修改一条「对话美化正则」的样式层。**你只输出需要新增或替换的 CSS 规则**——未改动的规则一律不要重复输出：插件会把你的规则按选择器合并进现有 CSS，没提到的部分逐字保留。');
  L.push('[用户要求]\n' + String(dir));
  L.push('[当前完整 CSS（共 ' + cur.length + ' 字符）——只供你确认选择器、变量与既有写法，不要原样重抄]\n' + cur);
  L.push('[骨架（HTML 结构由插件生成并锁定，绝不能改动）· 初始框架「' + frame.label + '」]\n' + rxSkeleton(item, f));
  if (f.params && f.params.length) f.params.forEach(function (p) { if (p.values && p.values.length) L.push('[参数 ' + p.name + ' 的枚举值] ' + p.values.join('、')); });
  L.push('[合并规则]\n1. 改已有规则：输出**同选择器**的完整规则块（选择器写法与现有一致，大小写与空白会被规范化后匹配）；\n2. 新增规则：用新选择器，插件会追加到末尾；\n3. 一条规则必须整体写出（选择器 + 完整花括号内容），不要只写半截声明；\n4. 不要输出 @media / @keyframes / @font-face / @import 等 @ 块——需要改这类整块时提示改用「整段重写」档；\n5. 一次最多输出 12 条规则，只覆盖用户要求涉及的部分。');
  L.push(RX_REFINE_RULES_PATCH);
  L.push('[输出] 一个 ' + fence() + 'css 代码块，里面**只有要合并的规则**；不要 JSON、不要解释、不要重抄整份 CSS。');
  return macroFill(L.join('\n\n'));
}
async function rxRefinePatch(item, dir) {
  var f = rxItemFormat(item);
  var cur = rxItemCss(item);
  var out = { changed: [], before: cur.length, after: cur.length, blocked: false, note: '', replaced: 0, added: 0, skipped: 0 };
  if (!cur) { out.note = '这条还没有样式可补丁，请用「整段重写」档或先生成替换体'; return out; }
  var raw = await rxCallRepair(rxPatchPrompt(item, f, dir), '修改·补丁');
  var patchCss = rxExtractCss(raw);
  if (!patchCss) { out.note = '模型没有返回可用的规则' + (ST.rx.lastStalled ? '（传输中途停顿，疑似被截断，可直接重试）' : '') + '（工具栏「📄 上次返回」可看原文）'; return out; }
  // 兜底 1：模型整段回了一套 CSS → 按整段重写处理，走缩水保护
  if (rxLooksLikeFullCss(patchCss, cur)) {
    if (rxIsShrinkSuspect(cur.length, patchCss.length, dir)) {
      out.blocked = true;
      out.note = '模型没有按补丁输出，而是整段回了一套 CSS，且只有 ' + patchCss.length + ' / 原 ' + cur.length + ' 字符（疑似截断），已保留原样';
      return out;
    }
    rxSnapshot(item); rxSetItemCss(item, patchCss); item.issues = rxLint(item, ST.rx.parsed);
    out.changed = ['样式（整段）']; out.after = patchCss.length; out.note = '模型整段返回，已按整段替换处理';
    return out;
  }
  var mg = rxCssMerge(cur, patchCss);
  if (!mg.replaced.length && !mg.added.length) {
    out.note = '没能从返回里解析出可合并的规则' + (mg.skipped.length ? '（只收到 @ 块：' + mg.skipped.join('、') + '，请改用「整段重写」档）' : '');
    return out;
  }
  rxSnapshot(item);
  rxSetItemCss(item, mg.css);
  item.issues = rxLint(item, ST.rx.parsed);
  out.replaced = mg.replaced.length; out.added = mg.added.length; out.skipped = mg.skipped.length;
  out.after = mg.css.length;
  out.changed = ['样式补丁'];
  out.note = '替换 ' + mg.replaced.length + ' 条 / 新增 ' + mg.added.length + ' 条规则' + (mg.skipped.length ? '（跳过 ' + mg.skipped.length + ' 个 @ 块）' : '');
  return out;
}
async function rxRefineItem(item, dir, scope) {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var text = String(dir || '').trim();
  if (!text) { toast('先写一句修改要求，例如「边框改成金色、字号大一点、去掉动效」', 'warning'); return; }
  var f = rxItemFormat(item);
  ST.running = true; renderRunButtons();
  var st = getEl('opf-rx-statusline');
  if (st) st.textContent = '按你的要求修改中…';
  try {
    var r;
    if (scope === 'patch' && rxIsSkeletonItem(item)) r = await rxRefinePatch(item, text);
    else {
      if (scope === 'patch') toast('这条是手写替换体（不是骨架 + CSS 结构），补丁模式不适用，已按「整段重写」处理', 'warning');
      r = await rxAiRewrite(item, f, null, text, 'css', '修改');
    }
    rxRenderItems(); rxCacheSave();
    if (r.changed.length) {
      var msg = r.changed.join('、') + '：' + r.before + ' → ' + r.after + ' 字符';
      if (st) st.textContent = '已修改（' + msg + '）' + (r.note ? ' ｜ ' + r.note : '');
      toast('已修改（' + msg + '）' + (r.note ? '　' + r.note : ''), r.blocked ? 'warning' : 'success');
    } else if (r.blocked) {
      if (st) st.textContent = '已中止：' + r.note;
      toast('已保留原样（' + r.note + '）', 'warning');
    } else {
      var n = r.note || '模型没有返回可用的修改结果';
      if (st) st.textContent = n;
      toast(n + '，可换个说法再试', 'warning');
    }
  } catch (e) {
    toast('修改出错：' + rxDiagError(e), 'error');
    if (st) st.textContent = '修改出错：' + rxDiagError(e).slice(0, 120);
  } finally { ST.running = false; renderRunButtons(); }
}
async function rxSuggestItem(item, idx) {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var box = getEl('opf-rx-chips-' + idx); if (!box) return;
  ST.running = true; renderRunButtons();
  try {
    var ask = '下面是一个「对话美化正则」当前的 CSS 与骨架。请给出 2~3 条**只针对样式**的具体修改方向（每条一行、≤30字、直接可执行，例如"边框换成暗金色渐变"）。不要输出 CSS 本身。\n\n[当前 CSS]\n' + rxItemCss(item).slice(0, 2000) + '\n\n[骨架]\n' + rxSkeleton(item, rxItemFormat(item));
    var resp = await rxStreamCall([{ role: 'user', content: ask }], null, { phase: '建议', idleMs: 20000, maxMs: 90000, maxTokens: 1500 });
    var list = [];
    String(resp.text).split(/\r?\n/).forEach(function (ln) {
      var t = String(ln).replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').trim();
      if (t && t.length >= 4 && t.length <= 40 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) list = ['让配色更贴合核心气质', '加强边框层次与阴影', '降低动效强度'];
    box.textContent = '';
    list.slice(0, 3).forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'opf-dir-chip';
      b.textContent = '▶ ' + t;
      b.addEventListener('click', function () { rxRefineItem(item, t, 'patch'); });
      box.appendChild(b);
    });
  } catch (e) { toast('生成建议失败：' + rxDiagError(e), 'error'); }
  finally { ST.running = false; renderRunButtons(); }
}
// ---------- 524 / 超时诊断：把 Cloudflare 的 8KB HTML 变成一句人话 ----------
function rxDiagError(err) {
  var m = (err && err.message) ? err.message : String(err || '');
  if (/524/.test(m) && /cloudflare|timeout occurred|cf-error|A timeout occurred/i.test(m)) {
    return '中转站超时（Cloudflare 524：源站在 100 秒内没有回任何字节）。注意这不是插件的问题：'
      + '酒馆的 generateRaw 永远是非流式的（源码 script.js L4018 用 sendOpenAIRequest(\'quiet\',…) 调用，'
      + '而流式分支 L5326 明确排除 quiet），所以中转站必须等整段生成完才回包，输出越长越容易撞墙。'
      + '对策：① 打开本页的「直连 + 真流式」② 降低档位让每段更小 ③ 换时段或换中转。';
  }
  var code = m.match(/\b(50[234])\b/);
  if (code) return '中转站返回 ' + code[1] + '（网关错误），属可重试类，稍后重试或降低单段字数。';
  if (/No message generated/i.test(m)) return '模型返回空（可能被中转站截断或安全策略拦截），可重试或降低单段字数。';
  if (/aborted|Cancelled|停止/i.test(m)) return '已中止。';
  return m.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}
// ---------- 三种传输：酒馆主 API / 经酒馆服务端转发+流式 / 浏览器直连+流式 ----------
// 「经服务端转发」是类反向代理场景的正解：反代地址、密钥、Gemini 协议转换、CORS 全由酒馆服务端处理
// 依据：ST 1.18.0 src/endpoints/backends/chat-completions.js
//   router.post('/generate') → case MAKERSUITE: sendMakerSuiteRequest(...)
//   responseType = stream ? 'streamGenerateContent' : 'generateContent'  → 追加 &alt=sse
//   convertGooglePrompt(request.body.messages, …)；apiKey = reverse_proxy ? proxy_password : readSecret(...)
function rxCfg() {
  rxInit();
  ST.rx.cfg = ST.rx.cfg || {
    transport: 'st', source: 'makersuite', model: '', reverseProxy: '', proxyPassword: '',
    directProtocol: 'openai', baseUrl: '', apiKey: '', chatModel: '', customModels: []
  };
  var c = ST.rx.cfg;
  if (!c.transport) c.transport = 'st';
  if (!c.source) c.source = 'makersuite';
  if (!c.directProtocol) c.directProtocol = 'openai';
  if (!Array.isArray(c.customModels)) c.customModels = [];
  if (!c.reverseProxy && !c.baseUrl) { try { var sh = shxCfg(); c.baseUrl = sh.baseUrl || ''; c.apiKey = sh.apiKey || ''; } catch (e) {} }
  return c;
}
// 传输是否可用（不可用时生成会降级到主 API，但绝不静默改写用户配置）
function rxTransportUsable(cfg) {
  cfg = cfg || rxCfg();
  if (cfg.transport === 'st') return true;
  if (cfg.transport === 'server') return !!(cfg.reverseProxy && cfg.model);
  if (cfg.transport === 'direct') return !!(cfg.baseUrl && (cfg.chatModel || cfg.model));
  return true;
}
function rxTransportWhy(cfg) {
  cfg = cfg || rxCfg();
  if (cfg.transport === 'server') {
    if (!cfg.reverseProxy) return '还缺「中转/反代地址」';
    if (!cfg.model) return '还缺「模型名」——可点「🔌 获取模型列表」，或直接手填（填过会记住）';
  }
  if (cfg.transport === 'direct') {
    if (!cfg.baseUrl) return '还缺「直连地址」';
    if (!cfg.chatModel && !cfg.model) return '还缺「模型名」';
  }
  return '';
}
function rxHeaders() { var h = { 'Content-Type': 'application/json' }; var k = String(rxCfg().proxyPassword || '').trim(); if (k) h['Authorization'] = 'Bearer ' + k; return h; }
// 通用 SSE 读取：同时兼容 OpenAI 形状与 Google 原生形状
// opts: { idleMs: 无新字节多久判定停顿, maxMs: 绝对上限, maxChars: 收满即停（硬顶防跑飞）}
function rxSseText(obj) {
  if (!obj) return '';
  var ch = obj.choices && obj.choices[0];
  if (ch) {
    var d = ch.delta || ch.message;
    if (d && typeof d.content === 'string') return d.content;
    if (ch.text) return ch.text;
  }
  var cand = obj.candidates && obj.candidates[0];
  if (cand && cand.content && Array.isArray(cand.content.parts)) {
    return cand.content.parts.map(function (p) { return (p && typeof p.text === 'string') ? p.text : ''; }).join('');
  }
  return '';
}
async function rxReadSse(resp, onDelta, opts) {
  var o = opts || {};
  var idleMs = Number(o.idleMs) || 20000;      // 20 秒没有新字节 → 判定停顿
  var maxMs = Number(o.maxMs) || 240000;       // 4 分钟绝对上限
  var maxChars = Number(o.maxChars) || 0;
  if (!resp.body || !resp.body.getReader) throw new Error('当前环境不支持流式读取（ReadableStream 不可用）');
  var reader = resp.body.getReader(), dec = new TextDecoder(), buf = '', full = '';
  var lastByte = Date.now(), stalled = false;
  var kill = function () { stalled = true; try { reader.cancel().catch(function () {}); } catch (e) {} };
  var tIdle = setTimeout(function () { if (Date.now() - lastByte >= idleMs) kill(); }, idleMs + 300);
  var tMax = setTimeout(kill, maxMs);
  try {
    while (true) {
      var chunk;
      try { chunk = await reader.read(); }
      catch (e) { stalled = true; break; }
      if (chunk.done) break;
      lastByte = Date.now();
      buf += dec.decode(chunk.value, { stream: true });
      var lines = buf.split('\n');
      buf = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.indexOf('data:') !== 0) continue;
        var payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          var t = rxSseText(JSON.parse(payload));
          if (t) { full += t; if (onDelta) onDelta(t, full.length); }
        } catch (e) { /* 心跳或非 JSON 行 */ }
      }
      if (maxChars && full.length >= maxChars) { kill(); break; }   // 收够就停，防模型跑飞
    }
  } finally {
    clearTimeout(tIdle); clearTimeout(tMax);
  }
  // 尾缓冲（没有换行结尾的最后一段）也要处理
  if (buf.trim()) {
    var last = buf.trim();
    if (last.indexOf('data:') === 0 && last.slice(5).trim() !== '[DONE]') {
      try { var t2 = rxSseText(JSON.parse(last.slice(5).trim())); if (t2) { full += t2; if (onDelta) onDelta(t2, full.length); } } catch (e) {}
    }
  }
  return { text: full, stalled: stalled };
}
// ① 经酒馆服务端转发（推荐：兼容类反向代理、无 CORS 问题、Google 协议由 ST 转换）
async function rxServerStream(messages, onDelta, opts) {
  var o = opts || {};
  var cfg = rxCfg();
  if (!cfg.model) throw new Error('未填写模型名（可点「🔌 获取模型列表」自动拉取）');
  if (!cfg.reverseProxy) throw new Error('未填写中转/反代地址');
  var origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
  var h = { 'Content-Type': 'application/json' };
  try {
    var c = getCtx();
    if (c && typeof c.getRequestHeaders === 'function') { var rh = c.getRequestHeaders(); for (var k in rh) h[k] = rh[k]; }
  } catch (e) { /* 拿不到 CSRF 头时仍尝试 */ }
  var body = {
    chat_completion_source: cfg.source || 'makersuite',
    reverse_proxy: cfg.reverseProxy,
    proxy_password: cfg.proxyPassword || '',
    model: cfg.model,
    messages: messages.map(function (m) { return { role: m.role, content: m.content }; }),
    use_sysprompt: true,
    stream: true,
    max_tokens: Number(o.maxTokens) || 8192,   // 按每段预算换算，硬顶防跑飞
    temperature: 0.85
  };
  var r = await fetch(origin + '/api/backends/chat-completions/generate', { method: 'POST', headers: h, body: JSON.stringify(body) });
  if (!r.ok) {
    var txt = '';
    try { txt = (await r.text()).slice(0, 300); } catch (e) {}
    throw new Error('酒馆服务端转发失败 HTTP ' + r.status + ' ' + txt);
  }
  return rxReadSse(r, onDelta, { idleMs: o.idleMs, maxMs: o.maxMs, maxChars: o.maxChars });
}
// ② 浏览器直连（OpenAI 兼容 / Google 原生）
function rxGeminiBody(messages) {
  var sys = messages.filter(function (m) { return m.role === 'system'; }).map(function (m) { return m.content; }).join('\n\n');
  var contents = messages.filter(function (m) { return m.role !== 'system'; }).map(function (m) {
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
  });
  var body = { contents: contents, generationConfig: { maxOutputTokens: 8192, temperature: 0.85 } };
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  return body;
}
async function rxDirectStream(messages, onDelta, opts) {
  var o = opts || {};
  var cfg = rxCfg();
  var base = String(cfg.baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('未填写直连地址');
  var model = cfg.chatModel || cfg.model;
  if (!model) throw new Error('未填写直连聊天模型');
  var key = String(cfg.apiKey || '').trim();
  var url, body, headers = { 'Content-Type': 'application/json' };
  if (cfg.directProtocol === 'gemini') {
    url = base + '/v1beta/models/' + encodeURIComponent(model) + ':streamGenerateContent?alt=sse' + (key ? '&key=' + encodeURIComponent(key) : '');
    body = rxGeminiBody(messages);
    if (o.maxTokens) body.generationConfig = body.generationConfig || {}; body.generationConfig.maxOutputTokens = Number(o.maxTokens);
    if (key) headers['x-goog-api-key'] = key;
  } else {
    url = base + '/chat/completions';
    body = { model: model, messages: messages, stream: true, temperature: 0.85 };
    if (o.maxTokens) body.max_tokens = Number(o.maxTokens);
    if (key) headers['Authorization'] = 'Bearer ' + key;
  }
  var r = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
  if (!r.ok) { var t = ''; try { t = (await r.text()).slice(0, 300); } catch (e) {} throw new Error('HTTP ' + r.status + ' ' + t); }
  return rxReadSse(r, onDelta, { idleMs: o.idleMs, maxMs: o.maxMs, maxChars: o.maxChars });
}
function rxStreamCall(messages, onNote, opts) {
  var cfg = rxCfg();
  var o = opts || {};
  if (rxForceSt || cfg.transport === 'st') {
    // 主 API：零配置，跟随酒馆当前模型与采样；用 responseLength 按段预算硬顶输出长度
    var ro = o.maxTokens ? { responseLength: Number(o.maxTokens) } : null;
    return callModel(messages, ro).then(function (t) { return { text: String(t), stalled: false }; });
  }
  var t0 = Date.now();
  var lastShown = 0;
  var onDelta = function (t, len) {
    var now = Date.now();
    if (onNote && (len - lastShown >= 700 || now - t0 - 5000 * (Math.floor((now - t0) / 5000)) >= 0 && len !== lastShown)) {
      // 每 700 字符或每 5 秒刷一次（含"持续生成中"），避免长时间看起来像卡死
      lastShown = len;
      onNote('流式接收中… ' + len + ' 字符（' + Math.round((now - t0) / 1000) + 's' + (o.phase ? '｜' + o.phase : '') + '）');
    }
  };
  // 定时兜底刷新：即使没有新字节也每 5 秒报一次时间
  var timer = setInterval(function () {
    if (onNote) onNote('流式接收中… ' + lastShown + ' 字符（' + Math.round((Date.now() - t0) / 1000) + 's' + (o.phase ? '｜' + o.phase : '') + '，仍在等待…）');
  }, 5000);
  var p = (cfg.transport === 'server' ? rxServerStream(messages, onDelta, o) : rxDirectStream(messages, onDelta, o));
  return p.then(function (res) { clearInterval(timer); return res; }, function (e) { clearInterval(timer); throw e; });
}
// 从酒馆自己的设置里读反代地址与代理密码（省得手打）
// DOM id 依据 ST 1.18.0 public/scripts/openai.js L363/L372 与 public/index.html L2978/L2994：
//   reverse_proxy: ['#openai_reverse_proxy', 'reverse_proxy', …]
//   proxy_password: ['#openai_proxy_password', 'proxy_password', …]
// 且 ST 生成请求时正是 generate_data.reverse_proxy / proxy_password（openai.js L2788-2791）
function rxPullFromTavern() {
  var cfg = rxCfg();
  var urlEl = getEl('openai_reverse_proxy'), pwEl = getEl('openai_proxy_password');
  var url = urlEl ? String(urlEl.value || '').trim() : '';
  var pw = pwEl ? String(pwEl.value || '').trim() : '';
  var got = [];
  if (url) { cfg.reverseProxy = url; got.push('反代地址'); }
  if (pw) { cfg.proxyPassword = pw; got.push('代理密码'); }
  if (!got.length) {
    toast('没读到酒馆的反代设置。请确认酒馆主 API 面板里已填好 Reverse Proxy（Google AI Studio 那栏的代理地址），或手动填写下方字段', 'warning');
    return false;
  }
  cfg.transport = 'server';   // 既然是反代场景，顺手切到流式档（这才是能绕开 524 的那条路）
  var tEl = getEl('opf-rx-transport'); if (tEl) tEl.value = 'server';
  var rEl = getEl('opf-rx-reverse'); if (rEl) rEl.value = cfg.reverseProxy || '';
  var pEl = getEl('opf-rx-proxypass'); if (pEl) pEl.value = cfg.proxyPassword || '';
  rxSyncTransportUi(); rxCacheSave();
  toast('已从酒馆读取：' + got.join('、') + '｜正在自动获取模型列表…');
  return true;
}
// 模型列表：双通道合并 + 自定义名永久保留
// 通道① ST 服务端 /status —— 但 ST 会按 supportedGenerationMethods.includes('generateContent') 过滤，
//        新版 Gemini 模型不再返回该字段，会被整类丢掉（症状：只看到老模型）
// 通道② 直接向反代地址要原始 /v1beta/models —— 未经 ST 过滤（可能被 CORS 拦，拦了就跳过）
async function rxModelsViaServer() {
  var cfg = rxCfg();
  if (!cfg.reverseProxy) throw new Error('未填反代地址');
  var origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
  var h = { 'Content-Type': 'application/json' };
  try {
    var c = getCtx();
    if (c && typeof c.getRequestHeaders === 'function') { var rh = c.getRequestHeaders(); for (var k in rh) h[k] = rh[k]; }
  } catch (e) {}
  var r = await fetch(origin + '/api/backends/chat-completions/status', {
    method: 'POST', headers: h,
    body: JSON.stringify({ chat_completion_source: cfg.source || 'makersuite', reverse_proxy: cfg.reverseProxy, proxy_password: cfg.proxyPassword || '' })
  });
  if (!r.ok) throw new Error('服务端 HTTP ' + r.status);
  var j = await r.json();
  var arr = Array.isArray(j.data) ? j.data : (j.data && Array.isArray(j.data.data) ? j.data.data : []);
  var ids = arr.map(function (m) { return m && (m.id || m.name); }).filter(Boolean);
  if (!ids.length) throw new Error(j.error ? '上游返回错误' : '列表为空');
  return ids;
}
async function rxModelsRaw(base, key, proto) {
  base = String(base || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('地址为空');
  var urls = [];
  if (proto === 'openai') {
    urls.push({ u: base + '/models', h: key ? { 'Authorization': 'Bearer ' + key } : {} });
  } else {
    urls.push({ u: base + '/v1beta/models' + (key ? '?key=' + encodeURIComponent(key) : ''), h: key ? { 'x-goog-api-key': key } : {} });
    urls.push({ u: base + '/v1beta/models', h: key ? { 'x-goog-api-key': key } : {} });   // 反代可能自带上游 key
  }
  var lastErr = null;
  for (var i = 0; i < urls.length; i++) {
    try {
      var r = await fetch(urls[i].u, { headers: urls[i].h });
      if (!r.ok) { lastErr = new Error('HTTP ' + r.status); continue; }
      var j = await r.json();
      var arr = j.models || j.data || [];
      var ids = arr.map(function (m) { return String((m && (m.name || m.id)) || '').replace(/^models\//, ''); }).filter(Boolean);
      if (ids.length) return ids;      // 不过滤：保留全部（含没有 supportedGenerationMethods 的新模型）
    } catch (e) { lastErr = e; }        // CORS 或网络错误 → 试下一个
  }
  throw lastErr || new Error('未取到原始列表');
}
function rxDedupeModels() {
  var seen = {}, out = [];
  for (var i = 0; i < arguments.length; i++) {
    (arguments[i] || []).forEach(function (id) {
      var s = String(id || '').trim();
      if (!s || seen[s.toLowerCase()]) return;
      seen[s.toLowerCase()] = 1; out.push(s);
    });
  }
  return out;
}
async function rxFetchModels() {
  var cfg = rxCfg();
  var server = [], raw = [], errs = [];
  if (cfg.transport === 'server') {
    try { server = await rxModelsViaServer(); } catch (e) { errs.push('ST 过滤列表：' + rxDiagError(e)); }
    try { raw = await rxModelsRaw(cfg.reverseProxy, cfg.proxyPassword, cfg.source === 'vertexai' ? 'gemini' : 'gemini'); }
    catch (e) { errs.push('原始列表（直连反代）：' + rxDiagError(e)); }
  } else {
    try { raw = await rxModelsRaw(cfg.baseUrl, cfg.apiKey, cfg.directProtocol); } catch (e) { errs.push('直连列表：' + rxDiagError(e)); }
  }
  var custom = cfg.customModels || [];
  var list = rxDedupeModels(raw, server, custom);
  if (!list.length) throw new Error('两个通道都没取到列表' + (errs.length ? '（' + errs.join('；') + '）' : ''));
  return { list: list, server: server.length, raw: raw.length, custom: custom.length, errs: errs };
}
function rxFillModelList(list) {
  var dl = getEl('opf-rx-modellist');
  if (dl) {
    dl.textContent = '';
    list.forEach(function (id) { var o = document.createElement('option'); o.value = id; dl.appendChild(o); });
  }
  var inp = getEl('opf-rx-model');
  if (inp && !String(inp.value || '').trim() && list.length) {
    var prefer = list.filter(function (x) { return /gemini-2\.5-pro|gemini-2\.5-flash|gemini-2\.0-flash|gemini-pro/i.test(x); })[0] || list[0];
    inp.value = prefer;
    rxCfg().model = prefer;
    rxCacheSave();
  }
}
// 手填的模型名自动记住，下次直接从下拉里选
function rxRememberModel(name) {
  var s = String(name || '').trim();
  if (!s) return;
  var cfg = rxCfg();
  cfg.customModels = cfg.customModels || [];
  if (cfg.customModels.map(function (x) { return x.toLowerCase(); }).indexOf(s.toLowerCase()) >= 0) return;
  cfg.customModels.push(s);
  var dl = getEl('opf-rx-modellist');
  if (dl) { var o = document.createElement('option'); o.value = s; dl.appendChild(o); }
  rxCacheSave();
}
async function rxDoFetchModels(btn) {
  var old = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '获取中…'; }
  var st = getEl('opf-rx-statusline');
  try {
    var r = await rxFetchModels();
    rxFillModelList(r.list);
    var msg = '列表 ' + r.list.length + ' 个（原始 ' + r.raw + ' / ST 过滤后 ' + r.server + ' / 自定义 ' + r.custom + '）'
      + (r.errs.length ? '｜部分通道失败：' + r.errs.join('；') : '');
    if (st) st.textContent = msg + '｜' + r.list.slice(0, 8).join('、') + (r.list.length > 8 ? ' …' : '');
    toast('取到 ' + r.list.length + ' 个模型（可下拉可手填）');
  } catch (e) {
    var m2 = rxDiagError(e);
    if (st) st.textContent = '模型列表获取失败：' + m2;
    toast('模型列表获取失败：' + m2, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = old || '🔌 获取模型列表'; }
  }
}
// 连通性自检：一次极小请求，用于区分「中转站挂了」与「任务太重」
async function rxPing() {
  var el = getEl('opf-rx-statusline');
  var say = function (s) { if (el) el.textContent = s; };
  var cfg = rxCfg();
  var label = cfg.transport === 'st' ? '酒馆主 API（generateRaw，非流式）' : cfg.transport === 'server' ? '经酒馆服务端转发 + 真流式' : '浏览器直连 + 真流式';
  say('自检中…（' + label + '）');
  var t0 = Date.now();
  try {
    var out = await rxStreamCall([{ role: 'user', content: '回复两个字：正常' }], function (s) { say('自检收流中… ' + s); });
    var ms = Date.now() - t0;
    var extra = out.stalled ? '（流中途停顿，可能是中转限流或网络抖动）' : '';
    say('连通正常：' + ms + 'ms｜' + label + '｜返回「' + String(out.text).trim().slice(0, 20) + '」' + extra);
    toast('连通性自检通过（' + ms + 'ms）' + extra, out.stalled ? 'warning' : 'success');
  } catch (e) {
    say('自检失败：' + rxDiagError(e));
    toast('自检失败：' + rxDiagError(e), 'error');
  }
}
// ---------- 并发工具与实时预览（流式传输下大幅缩短总时长）----------
var RX_PARALLEL = 3;   // 并发段数上限（中转限流时自动少发）
var rxForceSt = false; // 本次生成强制走酒馆主 API（配置不完整时的降级，不影响用户设置）
async function rxMapLimit(items, limit, fn) {
  var results = new Array(items.length);
  var cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      var idx = cursor++;
      try { results[idx] = await fn(items[idx], idx); }
      catch (e) { results[idx] = { css: '', partial: true, err: rxDiagError(e) }; }
    }
  }
  var ws = [];
  for (var w = 0; w < Math.max(1, Math.min(limit, items.length)); w++) ws.push(worker());
  await Promise.all(ws);
  return results;
}
var rxLiveTick = { last: 0 };
function rxLivePreview(it, cssMap, order) {
  var now = Date.now();
  if (now - rxLiveTick.last < 500) return;
  rxLiveTick.last = now;
  var css = '';
  (order || []).forEach(function (id) { if (cssMap[id]) css += (css ? '\n' : '') + cssMap[id]; });
  if (!css) return;
  var f = (ST.rx.parsed && ST.rx.parsed.formats || []).filter(function (x) { return x.key === it.formatKey; })[0] || { family: 'quote', params: [] };
  it.css = css;
  it.replaceHtml = rxAssemble(it, f, css);
  try { rxPreviewInto(it); } catch (e) {}
  var st = getEl('opf-rx-statusline');
  if (st && !st.dataset.prog) st.textContent = '实时预览已更新（' + css.length + ' 字符 CSS）';
}
// 设计基调：一组 CSS 变量 + 风格基调注释，供并发块引用，保证配色一致
function rxBriefPart(item, frame) {
  var pre = rxPreOf(item);
  var fr = frame || RX_FRAMES[0];
  var vars = rxRequiredVars(pre, fr.id).join(' / ');
  return {
    id: 'brief', label: '设计基调', budget: 1400,
    hint: '只输出一组 CSS 自定义属性与 2~4 条注释，不要写完整选择器规则。'
      + '必须以「.' + pre + '-box { … }」为载体，把骨架已经引用的这几个变量定出来（缺一个颜色就会掉成默认黑）：' + vars + '。'
      + '另外可再定义字号/圆角/阴影这类变量。变量值要贴合核心的世界观与命格气质（傲慢用冷金、狂热用灼红、冰冷用青白…），不要纯黑纯白。'
  };
}
// ---------- 替换体：结构由代码生成，模型只写 CSS（防 524 超时与截断）----------
// 骨架款式（初始框架）见 72 的 RX_FRAMES：紧凑卡 / 法阵卡 / 揭幕式 / 极简
function rxFrameOf(item) { return rxFrameById(item && item.frame) || RX_FRAMES[0]; }
// 捕获组布局必须与 rxGenFindRegex 完全一致，否则 $n 会指错
function rxRefs(f) {
  var refs = { name: '', mood: '', text: '$1', extra: [] };
  if (!f || f.family !== 'xml') return refs;
  var idx = 1;
  refs.name = '$' + idx++;
  if (f.params.some(function (p) { return p.name === 'mood'; })) refs.mood = '$' + idx++;
  f.params.forEach(function (p) { if (p.name !== 'mood') { refs.extra.push({ name: p.name, ref: '$' + idx++ }); } });
  refs.text = '$' + idx;
  return refs;
}
var RX_STYLE_SLOT = '/*__RX_STYLE__*/';
// 法阵：描边环 + 环形铭文 + 八角几何 + 核心三层；颜色全部走变量，等模型来定义
function rxSvgLines(pre, ringText) {
  var v = 'var(--' + pre + '-accent)';
  return [
    '    <svg class="' + pre + '-array" viewBox="0 0 240 240" aria-hidden="true">',
    '      <defs>',
    '        <filter id="' + pre + '-glow" x="-50%" y="-50%" width="200%" height="200%">',
    '          <feGaussianBlur stdDeviation="3" result="b" />',
    '          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>',
    '        </filter>',
    '        <path id="' + pre + '-ring-path" d="M 120,120 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" />',
    '      </defs>',
    '      <g class="' + pre + '-orbit ' + pre + '-orbit-1">',
    '        <circle cx="120" cy="120" r="112" fill="none" stroke="' + v + '" stroke-width="0.8" stroke-dasharray="3 5" opacity="0.45" />',
    '        <circle cx="120" cy="120" r="98" fill="none" stroke="' + v + '" stroke-width="1.4" opacity="0.7" />',
    '        <text fill="' + v + '" font-size="8" letter-spacing="2.4" opacity="0.8">',
    '          <textPath href="#' + pre + '-ring-path" startOffset="0%" textLength="490" lengthAdjust="spacing">✦ ' + ringText + ' ✦</textPath>',
    '        </text>',
    '      </g>',
    '      <g class="' + pre + '-orbit ' + pre + '-orbit-2">',
    '        <polygon points="120,40 180,120 120,200 60,120" fill="none" stroke="' + v + '" stroke-width="1.1" opacity="0.7" />',
    '        <polygon points="120,40 180,120 120,200 60,120" fill="none" stroke="' + v + '" stroke-width="1.1" opacity="0.7" transform="rotate(45 120 120)" />',
    '      </g>',
    '      <g class="' + pre + '-orbit ' + pre + '-orbit-3">',
    '        <polygon points="120,74 152,120 120,166 88,120" fill="rgba(255,255,255,0.03)" stroke="' + v + '" stroke-width="1.6" filter="url(#' + pre + '-glow)" />',
    '        <circle cx="120" cy="120" r="5" fill="' + v + '" filter="url(#' + pre + '-glow)" />',
    '      </g>',
    '    </svg>'
  ];
}
function rxDustLines(pre, n, indent) {
  var pad = indent == null ? '  ' : indent;
  var L = [];
  for (var i = 1; i <= n; i++) L.push(pad + '<span class="' + pre + '-dust d' + i + '"></span>');
  return L;
}
// 标题行：纹章 + 名号 + 情绪胶囊 + 渐隐线（名号是静态字面量或 $n）
function rxHeadLines(pre, title, moodRef, emblem) {
  if (!title && !moodRef) return [];
  var L = ['  <div class="' + pre + '-head">'];
  if (emblem) L.push('    <span class="' + pre + '-emblem">' + emblem + '</span>');
  if (title) L.push('    <span class="' + pre + '-name">' + title + '</span>');
  if (moodRef) L.push('    <span class="' + pre + '-mood">' + moodRef + '</span>');
  if (emblem) L.push('    <span class="' + pre + '-rule"></span>');
  L.push('  </div>');
  return L;
}
function rxSkeleton(item, f) {
  var pre = rxPreOf(item);                                   // 归一：避免出现 xxx-box-box
  var refs = rxRefs(f);
  var frame = rxFrameOf(item);
  var attrs = ' class="' + pre + '-box"';
  if (refs.mood) attrs += ' data-mood="' + refs.mood + '"';
  refs.extra.forEach(function (x) { attrs += ' data-' + x.name + '="' + x.ref + '"'; });
  // 名号：xml 族取 $1（name 属性），引语/方括号族取核心里写死的说话人或标记（字面量）
  var title = refs.name || rxText((f && (f.speaker || f.marker || f.label)) || '');
  var emblem = frame.id === 'plain' ? '' : (frame.id === 'reveal' ? '◆' : (frame.id === 'array' ? '✦' : '❂'));
  var head = rxHeadLines(pre, title, refs.mood, emblem);
  var body = ['  <div class="' + pre + '-body">' + refs.text + '</div>'];
  var L = [];
  if (frame.id === 'reveal') {
    L.push('<details' + attrs + '>');
    L.push('  <summary class="' + pre + '-face">');
    L.push('    <div class="' + pre + '-visual" aria-hidden="true">');
    L = L.concat(rxSvgLines(pre, rxText(item.coreName || '').slice(0, 12) || 'ARCANUM'));
    L = L.concat(rxDustLines(pre, 4, '      '));
    L.push('    </div>');
    L = L.concat(head);
    L.push('    <div class="' + pre + '-hint">▸ 点击展开</div>');
    L.push('  </summary>');
    L.push('  <div class="' + pre + '-panel">');
    L = L.concat(body);
    L.push('  </div>');
    L.push('</details>');
  } else {
    L.push('<div' + attrs + '>');
    if (frame.decor === 'array') {
      L.push('  <div class="' + pre + '-visual" aria-hidden="true">');
      L = L.concat(rxSvgLines(pre, rxText(item.coreName || '').slice(0, 12) || 'ARCANUM'));
      L = L.concat(rxDustLines(pre, 4, '    '));
      L.push('  </div>');
    }
    L = L.concat(head);
    L = L.concat(body);
    if (frame.decor === 'dust') L = L.concat(rxDustLines(pre, 2));
    L.push('</div>');
  }
  L.push('<style>');
  L.push(RX_STYLE_SLOT);
  L.push('</style>');
  return L.join('\n');
}
// 骨架里真实出现的 class（提示词里给模型对着写，避免它自造选择器）
function rxClassList(item, f) {
  var seen = [];
  var m, re = /class="([^"]+)"/g;
  var sk = rxSkeleton(item, f);
  while ((m = re.exec(sk)) !== null) {
    m[1].split(/\s+/).forEach(function (c) { if (c && seen.indexOf(c) < 0) seen.push(c); });
  }
  return seen;
}
// CSS 分段：按档位目标字数决定段数与每段预算（每段越小，越不容易触发 524 与截断）
// 段清单随「初始框架」变：法阵卡会多出「视觉层与法阵」段，揭幕式会多出「揭幕交互」段。
// 函数签名保持不变（tools/verify-destiny-page.js 逐字校验），框架由 rxGenerate 通过下面的
// 提示变量传入，避免改动签名。
var rxPartsFrameHint = '';
function rxCssParts(f, tierTarget) {
  var hasMood = !!(f && f.params.some(function (p) { return p.name === 'mood' && p.values && p.values.length; }));
  var frame = rxFrameById(rxPartsFrameHint) || RX_FRAMES[0];
  var decor = frame.decor;
  var P = '{P}';
  var catalog = [
    { id: 'base', label: '变量与外框',
      hint: '以 .' + P + '-box 为载体：先定义骨架已经引用到的变量（缺一个颜色就会掉成默认黑），再写容器本身——底色渐变、边框（左缘用强调色加粗）、圆角、内外边距、字体栈（只用系统字体）、max-width:100%，以及 :hover 的位移与发光。' },
    { id: 'mood', label: '情绪分支配色', need: hasMood,
      hint: '为每个枚举值各写一条属性选择器规则（形如 .' + P + '-box[data-mood="值"]），只重定义变量与背景即可（一条分支改 --' + P + '-accent / --' + P + '-bg 就够，不要重抄整套规则）。' },
    { id: 'layers', label: '视觉层与装饰', need: decor !== 'none',
      hint: '写 .' + P + '-visual 视觉层（绝对定位铺满、pointer-events:none、z-index 低于文字）'
        + (decor === 'array'
          ? '、.' + P + '-array 法阵（尺寸、向外溢出的一角定位、透明度、hover 放大，装饰层允许固定 px 与破框）与三层 .' + P + '-orbit-1/-2/-3 各自的旋转方向与周期（transform-origin 要用 120px 120px，因为 viewBox 是 240）'
          : '')
        + '、.' + P + '-dust 漂浮光尘（位置、大小、上浮与淡出）。' },
    { id: 'head', label: '标题栏与正文排版',
      hint: '.' + P + '-head 标题行（flex 排布、底部分隔线）、.' + P + '-emblem 纹章、.' + P + '-name 名号（字距/渐变文字/发光）'
        + (hasMood ? '、.' + P + '-mood 情绪胶囊' : '') + '、.' + P + '-rule 右侧渐隐线，以及 .' + P + '-body 正文（行高、字色、文字阴影、长文与多行换行）。' },
    { id: 'motion', label: '动效', hint: '@keyframes 与入场/呼吸/流光动效（周期 ≥2s，克制，不要高频闪烁）；给关键的 .' + P + '-box 一个入场动画；不需要就回复「无」。' },
    { id: 'variants', label: '交互与变体',
      need: frame.interactive !== true,
      hint: 'hover / 长文本 / 多行 / 窄屏（≤420px）的变体规则；文字必须始终可读，绝不允许只靠悬停才显示。' },
    { id: 'reveal', label: '揭幕交互', need: frame.interactive === true,
      hint: '写好 details/summary 的揭幕：summary 去掉原生三角（list-style:none 与 ::-webkit-details-marker{display:none}）、.' + P
        + '-face 卡面居中、.' + P + '-hint 的呼吸提示、[open] 状态下 .' + P + '-panel 与 .' + P + '-body 的揭示与爆发动效（只改样式，不许改 HTML）。' },
    { id: 'polish', label: '细节打磨', hint: '阴影层次、边框渐变、角标与纹理的微调，让整体更完整；不需要就回复「无」。' }
  ];
  var want = catalog.filter(function (p) { return p.need !== false; });
  var target = Number(tierTarget) || 0;
  var n = target <= 0 ? 8 : target <= 1500 ? 1 : target <= 3000 ? 2 : target <= 6000 ? 4 : target <= 10000 ? 5 : target <= 20000 ? 7 : 8;
  // 没情绪分支 / 非揭幕式时，把名额让给后面的段
  var parts = want.slice(0, Math.max(1, Math.min(n, want.length)));
  if (n > parts.length) {
    var extra = catalog.filter(function (p) { return p.need !== false && parts.indexOf(p) < 0; });
    parts = parts.concat(extra.slice(0, n - parts.length));
  }
  var per = target > 0 ? Math.max(1400, Math.round(target / parts.length * 0.85)) : 3500;
  return parts.map(function (p) { return { id: p.id, label: p.label, hint: p.hint, budget: per }; });
}
function rxCssPartPrompt(item, f, part, prevText, brief) {
  var refs = rxRefs(f);
  var pre = rxPreOf(item);
  var frame = rxFrameOf(item);
  var L = [];
  L.push('[任务] 只为已经定好的 HTML 骨架写 CSS 规则。骨架结构（初始框架「' + frame.label + '」）由插件生成，你不得改动、也不得输出 HTML 标签。');
  L.push('[骨架（供你对照选择器）]\n' + rxSkeleton(item, f).replace(RX_STYLE_SLOT, '/* 这里放你的 CSS */'));
  L.push('[class 前缀] ' + pre + '（必须原样使用，不得自造 class）\n可用 class：' + rxClassList(item, f).join('、'));
  L.push('[初始框架的分层职责]\n' + rxFrameLayers(frame.id, pre));
  L.push('[必须定义的变量] ' + rxRequiredVars(pre, frame.id).join(' / ') + '（骨架里的 SVG 与光尘就靠它们上色；定义了却不用没关系，用了没定义会掉成默认色）');
  if (refs.mood) L.push('[情绪属性] 最外层带有 data-mood="' + refs.mood + '"，用属性选择器分支配色');
  if (f && f.params.length) {
    f.params.forEach(function (p) {
      if (p.values && p.values.length) L.push('[参数 ' + p.name + ' 的枚举] ' + p.values.join('、'));
    });
  }
  if (brief) L.push('[设计基调（必须引用其中的 CSS 变量，不要另起炉灶）]\n' + brief.slice(-1500));
  if (part.id === 'brief') L.push('[初始框架标准模板（照这个层次与写法来，变量名换成你这条的前缀）]\n' + rxCssStandard(pre, !!refs.mood, frame.id));
  L.push('[本段只写] ' + part.label + ' —— ' + String(part.hint).replace(/\{P\}/g, pre));
  if (part.budget) L.push('[本段字数] 控制在 ' + part.budget + ' 字符左右（宁少勿断，写不完就少写几条规则）');
  if (prevText) L.push('[已经写好的部分（不要重复、不要冲突）]\n' + prevText.slice(-1200));
  L.push('[输出要求] 只输出 CSS 规则本身：不要 <style> 标签、不要 HTML、不要解释文字、不要代码块围栏。');
  return L.join('\n\n');
}
// 单项 CSS 片段生成：真流式 + 停顿检测 + 截断续写；失败不丢已生成内容
async function rxGenCssPart(item, f, part, prevCss, onNote, brief) {
  var css = '';
  var attempt = 0;
  var lastErr = '';
  var budget = Number(part.budget) || 2500;
  var opts = {
    phase: part.label,
    idleMs: 20000,                       // 20 秒无新字节 → 判定停顿并止损
    maxMs: 240000,                       // 4 分钟绝对上限
    maxChars: budget * 2,                // 单次调用硬顶，防跑飞
    maxTokens: Math.max(1024, Math.round(budget * 4))   // 按字数换算 token 硬顶
  };
  while (attempt < 3) {
    attempt++;
    var ask = rxCssPartPrompt(item, f, part, prevCss + css, brief);
    if (css) ask += '\n\n[续写要求] 你上一次输出在中途被截断了，已保留的部分结尾是：\n' + css.slice(-500) + '\n只输出**剩余**部分，不要重复已写过的内容，不要重新开头。';
    var msgs = [{ role: 'system', content: rxSlimSystemContent(part.colorRef, part.budget) }, { role: 'user', content: macroFill(ask) }];
    var t0 = Date.now();
    try {
      var resp = await rxStreamCall(msgs, onNote, opts);
      var chunk = rxExtractCss(resp.text);
      if (resp.stalled) {
        // 流停顿：不再重试同一段（重试只会再停一次），把已收到的内容交回去
        if (!chunk) return { css: css, partial: true, err: '流停顿且未收到内容（' + Math.round((Date.now() - t0) / 1000) + 's）' };
        css += (css && !/\n$/.test(css) ? '\n' : '') + chunk;
        var bal0 = rxBraceDelta(css);
        return bal0 <= 0
          ? { css: css, partial: false, err: '流停顿（' + Math.round((Date.now() - t0) / 1000) + 's），但内容已完整' }
          : { css: css, partial: true, err: '流停顿（' + Math.round((Date.now() - t0) / 1000) + 's），内容未写完整（已保留 ' + css.length + ' 字符）' };
      }
      if (!chunk) { if (onNote) onNote('第 ' + attempt + ' 次返回为空'); if (attempt < 3) { await waitTick(); continue; } break; }
      css += (css && !/\n$/.test(css) ? '\n' : '') + chunk;
      if (onNote) onNote(part.label + ' 第 ' + attempt + ' 次：+' + chunk.length + ' 字符（' + Math.round((Date.now() - t0) / 1000) + 's）');
      var bal = rxBraceDelta(css);
      if (bal <= 0) return { css: css, partial: false, err: '' };
      if (onNote) onNote(part.label + ' 花括号还差 ' + bal + ' 个，继续续写…');
    } catch (e) {
      lastErr = rxDiagError(e);
      var transient = /524|502|503|504|timeout|timed out|超时|empty|为空|network|fetch|No message/i.test((e && e.message) ? e.message : String(e));
      if (onNote) onNote(part.label + ' 第 ' + attempt + ' 次失败：' + lastErr.slice(0, 90));
      if (!transient) break;
      if (attempt < 3) await new Promise(function (r) { setTimeout(r, 1200 * attempt); });
    }
  }
  return { css: css, partial: true, err: lastErr };   // 失败也把已生成的部分交回去
}
// CSS 花括号净差（跳过字符串与注释）
function rxBraceDelta(css) {
  var d = 0, inStr = null, inCmt = false, t = String(css);
  for (var i = 0; i < t.length; i++) {
    var c = t[i], n = t[i + 1];
    if (inCmt) { if (c === '*' && n === '/') { inCmt = false; i++; } continue; }
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '/' && n === '*') { inCmt = true; i++; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') d++;
    else if (c === '}') d--;
  }
  return d;
}
// 从回复里取 CSS（容忍代码块围栏与 <style> 包裹）
function rxExtractCss(text) {
  var t = String(text || '').trim();
  if (!t || /^无[。．.]?$/.test(t)) return '';
  var F = fence();
  var i = t.indexOf(F);
  if (i >= 0) {
    var s = t.indexOf('\n', i), e = t.indexOf(F, s + 1);
    if (s > 0) t = (e > s ? t.slice(s + 1, e) : t.slice(s + 1)).trim();
  }
  t = t.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  var m = t.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (m) t = m[1].trim();
  return t;
}
function rxAssemble(item, f, cssText) {
  return rxSkeleton(item, f).replace(RX_STYLE_SLOT, cssText || '/* 尚无样式 */');
}
async function rxGenerate() {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  if (!ST.rx.parsed || !ST.rx.items.length) { toast('请先「🔍 解析语言格式（AI）」', 'warning'); return; }
  // 优先补「还没生成」与「换了初始框架、样式已过期」的条目；都有内容时才是全量重生成
  var todo = ST.rx.items.filter(function (it) { return !it.replaceHtml || it.cssStale; });
  if (!todo.length) todo = ST.rx.items.slice();
  var cfgNow = rxCfg();
  rxForceSt = !rxTransportUsable(cfgNow);
  if (rxForceSt) toast('当前「生成传输」配置不完整（' + rxTransportWhy(cfgNow) + '），本次改用酒馆主 API 生成；补全后可再试流式', 'warning');
  var streaming = !rxForceSt;
  ST.running = true; renderRunButtons();
  rxLiveTick.last = 0;
  var log = [];
  var shrink = 1;
  var t0 = Date.now();
  var note = function (it, s) {
    log.push('[' + it.label + '] ' + s);
    var stl = getEl('opf-rx-statusline');
    if (stl) stl.textContent = it.label + ' · ' + s;
    opfLog('[regex-forge] ' + it.label + ' ' + s);
  };
  try {
    for (var i = 0; i < todo.length; i++) {
      if (isStop()) break;
      var it = todo[i];
      var f = (ST.rx.parsed.formats || []).filter(function (x) { return x.key === it.formatKey; })[0] || { family: 'quote', params: [] };
      var tier = rxTier(it.tier);
      it.partial = false;
      rxPartsFrameHint = (rxFrameOf(it) || RX_FRAMES[0]).id;   // 段清单随初始框架变
      if (streaming) {
        // ===== 流式路径：基调先行 + 并发分段 =====
        var blocks = rxCssParts(f, tier.target).map(function (p) {
          return { id: p.id, label: p.label, hint: p.hint, budget: Math.max(1200, Math.round(p.budget)), colorRef: (ST.rx.parsed.section || '') };
        });
        var cssMap = {};
        var order = ['brief'].concat(blocks.map(function (b) { return b.id; }));
        var brief = await rxGenCssPart(it, f, rxBriefPart(it), '', function (s) { note(it, s); rxLivePreview(it, cssMap, order); });
        cssMap.brief = brief.css;
        if (brief.partial) note(it, '设计基调未完成：' + String(brief.err).slice(0, 100));
        note(it, '基调完成（' + brief.css.length + ' 字符），并发生成 ' + blocks.length + ' 个样式块（并发上限 ' + RX_PARALLEL + '）…');
        var results = await rxMapLimit(blocks, RX_PARALLEL, async function (block, bi) {
          var r = await rxGenCssPart(it, f, block, brief.css, function (s) {
            note(it, '[' + block.label + ' ' + (bi + 1) + '/' + blocks.length + '] ' + s);
            rxLivePreview(it, cssMap, order);
          }, brief.css);
          cssMap[block.id] = r.css;
          return r;
        });
        var partials = results.filter(function (r) { return r && r.partial; });
        it.partial = partials.length > 0;
        it.lastErr = partials.map(function (r) { return r.err; }).filter(Boolean).join('；');
        it.replaceHtml = rxAssemble(it, f, order.map(function (id) { return cssMap[id] || ''; }).join('\n'));
        it.css = order.map(function (id) { return cssMap[id] || ''; }).join('\n');
        if (it.partial) note(it, '有 ' + partials.length + ' 个块未完成（已保留其余内容，可再点一次续做）');
      } else {
        // ===== 非流式路径：顺序小段 + 自适应缩段（防 524）=====
        var baseParts = rxCssParts(f, tier.target);
        var parts = baseParts.map(function (p) {
          return { id: p.id, label: p.label, hint: p.hint, budget: Math.max(800, Math.round(p.budget * shrink)), colorRef: (ST.rx.parsed.section || '') };
        });
        var css = '';
        for (var p2 = 0; p2 < parts.length; p2++) {
          if (isStop()) break;
          note(it, '开始生成 ' + parts[p2].label + '（' + (p2 + 1) + '/' + parts.length + '，预算 ' + parts[p2].budget + ' 字符' + (shrink < 1 ? '·已自动缩段' : '') + '）');
          var r = await rxGenCssPart(it, f, parts[p2], css, function (s) { note(it, s); });
          css += (css ? '\n' : '') + r.css;
          if (r.partial) {
            it.partial = true;
            it.lastErr = r.err;
            if (/524|超时/.test(String(r.err))) { shrink = Math.max(0.35, shrink * 0.5); note(it, '遇到 524/超时：后续段预算自动折半为 ≈' + Math.max(800, Math.round(parts[p2].budget * 0.5)) + ' 字符'); }
            note(it, '本段未完成：' + String(r.err).slice(0, 120) + '（已保留 ' + r.css.length + ' 字符，可稍后再点一次续做）');
          }
        }
        it.css = css;
        it.replaceHtml = rxAssemble(it, f, css);
      }
      it.cssStale = false;
      it.issues = rxLint(it, ST.rx.parsed);
      rxRenderItems();
      rxCacheSave();
      await waitTick();
    }
    var st2 = getEl('opf-rx-statusline');
    var anyPartial = ST.rx.items.filter(function (x) { return x.partial; }).length;
    var secs = Math.round((Date.now() - t0) / 1000);
    if (st2) st2.textContent = '完成（总耗时 ' + secs + 's）：' + log.slice(-2).join(' ｜ ') + (anyPartial ? '（' + anyPartial + ' 项未完成，可再点一次续做）' : '');
    if (isStop()) toast('已停止（已生成的部分已保留）');
    else if (anyPartial) toast('部分完成：' + anyPartial + ' 项未写完（已保留内容，可再点一次续做）', 'warning');
    else toast('替换体生成完成（耗时 ' + secs + 's' + (streaming ? '，流式并发模式' : '') + '）', 'success');
  } catch (e) {
    toast('生成替换体出错：' + rxDiagError(e) + '（已生成的部分保留，可再点一次续做）', 'error');
    var st3 = getEl('opf-rx-statusline'); if (st3) st3.textContent = '出错：' + rxDiagError(e).slice(0, 160);
  } finally {
    ST.running = false; renderRunButtons();
    rxRenderItems(); rxCacheSave();
  }
}
function rxDoCheck(showToast) {
  rxInit();
  if (!ST.rx.items.length) { if (showToast) toast('还没有正则草稿，请先解析', 'warning'); return; }
  var all = [];
  ST.rx.items.forEach(function (it) {
    it.issues = rxLint(it, ST.rx.parsed);
    it.issues.forEach(function (is) { all.push({ item: it, issue: is }); });
  });
  var box = getEl('opf-rx-issues'); if (box) box.textContent = '';
  if (box) {
    if (!all.length) box.textContent = '✓ 全部合规：编译、标志、捕获组引用、体量档位、命名与放置位置均通过';
    else {
      var localN = all.filter(function (x) { return x.issue.side === 'regex' && x.issue.fix && x.issue.fix !== 'none'; }).length;
      var aiN = all.filter(function (x) { return RX_AI_FIXABLE.indexOf(x.issue.key) >= 0; }).length;
      var bar = document.createElement('div'); bar.className = 'opf-step-ref-row';
      var info = document.createElement('span'); info.className = 'opf-dim';
      info.textContent = '共 ' + all.length + ' 条：本地可自动修 ' + localN + ' 条，需 AI 改写 ' + aiN + ' 条';
      var fixAll = document.createElement('button'); fixAll.type = 'button'; fixAll.className = 'opf-step-act'; fixAll.textContent = '🔧 一键自动修复';
      fixAll.addEventListener('click', function () { rxAutoFixAll(); });
      bar.appendChild(info); bar.appendChild(fixAll);
      box.appendChild(bar);
    }
    all.forEach(function (x, i) {
      var row = document.createElement('div'); row.className = 'opf-step-ref-row';
      var t = document.createElement('span'); t.className = 'opf-ref-tag' + (x.issue.side === 'core' ? ' dirty' : '');
      t.textContent = (x.issue.side === 'core' ? '改核心' : '改正则');
      var msg = document.createElement('span'); msg.className = 'opf-dim'; msg.textContent = '[' + x.item.label + '] ' + x.issue.msg;
      row.appendChild(t); row.appendChild(msg);
      if (x.issue.fix && x.issue.fix !== 'none' && x.issue.side === 'regex') {
        var b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'opf-step-act'; b1.textContent = '改正则';
        b1.addEventListener('click', function () { var r = rxApplyFix(x.item, x.issue); toast(r); rxDoCheck(false); rxRenderItems(); rxCacheSave(); });
        row.appendChild(b1);
      }
      if (x.issue.side === 'core') {
        var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'opf-step-act'; b2.textContent = '改核心';
        b2.addEventListener('click', function () { var r = rxApplyCoreFix(x.item, ST.rx.parsed); toast(r); });
        row.appendChild(b2);
        var b3 = document.createElement('button'); b3.type = 'button'; b3.className = 'opf-step-act'; b3.textContent = '改正则';
        b3.addEventListener('click', function () { toast('请按核心的语言格式手工调整匹配式，或在核心侧统一格式后重新解析'); });
        row.appendChild(b3);
      }
      if (RX_AI_FIXABLE.indexOf(x.issue.key) >= 0) {
        var b4 = document.createElement('button'); b4.type = 'button'; b4.className = 'opf-step-act'; b4.textContent = '✨ AI 修这条';
        b4.addEventListener('click', async function () {
          if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
          ST.running = true; renderRunButtons();
          var stl = getEl('opf-rx-statusline'); if (stl) stl.textContent = 'AI 修复：' + x.issue.msg;
          try {
            var ch = await rxAutoFixAi(x.item, [x.issue]);
            rxRenderItems(); rxCacheSave(); rxDoCheck(false);
            toast(ch.length ? ('已修复（' + ch.join('、') + '）') : '模型没有返回可用的修复', ch.length ? 'success' : 'warning');
          } catch (e) { toast('AI 修复出错：' + rxDiagError(e), 'error'); }
          finally { ST.running = false; renderRunButtons(); }
        });
        row.appendChild(b4);
      }
      box.appendChild(row);
    });
  }
  if (showToast) toast(all.length ? ('自检发现 ' + all.length + ' 条问题（本地能修的已给「改正则」，其余可点「🔧 一键自动修复」让 AI 改写）') : '自检通过：全部合规', all.length ? 'warning' : 'success');
  rxCacheSave();
}
function rxCopy(all) {
  rxInit();
  if (!ST.rx.items.length) { toast('还没有正则草稿', 'warning'); return; }
  var objs = ST.rx.items.map(function (it) { return rxBuildObject(it); });
  var txt = all ? JSON.stringify(objs, null, 2) : JSON.stringify(objs[0], null, 2);
  destCopyText(txt, '没有可复制的内容');
}
function rxClear() {
  if (!window.confirm('清空正则工坊（核心文本与全部正则草稿）？此操作不可撤销。')) return;
  ST.rx = { core: '', coreName: '', parsed: null, items: [], _inited: false };
  var el = getEl('opf-rx-core'); if (el) el.value = '';
  var pb = getEl('opf-rx-parsed'); if (pb) pb.textContent = '尚未解析';
  var ib = getEl('opf-rx-issues'); if (ib) ib.textContent = '尚未自检';
  rxRenderItems(); rxCacheSave();
  toast('已清空');
}
function rxCacheSave() {
  if (rxCacheSave._t) clearTimeout(rxCacheSave._t);
  rxCacheSave._t = setTimeout(function () {
    if (!ST.rx) return;
    lsSet(LS_RX_KEY, { core: ST.rx.core, coreName: ST.rx.coreName, items: ST.rx.items });
  }, 500);
}
function rxCacheRestore() {
  rxInit();
  var c = lsGet(LS_RX_KEY); if (!c || typeof c !== 'object') return;
  ST.rx.core = c.core || ''; ST.rx.coreName = c.coreName || ''; ST.rx.items = c.items || [];
  var el = getEl('opf-rx-core'); if (el && !el.value) el.value = ST.rx.core;
  if (ST.rx.core) { try { rxDoParseSilent(); } catch (e) { opfErr('rxDoParseSilent', e); } }
  try { rxRenderItems(); } catch (e) { opfErr('rxRenderItems', e); }
}
function rxDoParseSilent() {
  if (!ST.rx.core) return;
  ST.rx.parsed = rxParseLangFormat(ST.rx.core);
  var box = getEl('opf-rx-parsed');
  if (box) box.textContent = '已从缓存恢复草稿（核心 ' + ST.rx.core.length + ' 字符，正则 ' + ST.rx.items.length + ' 条）。点「🔍 解析语言格式（AI）」可重新解析。';
}

// ---------- AI 解析：AI 负责理解，脚本负责精确与校验 ----------
var RX_PARSE_SCHEMA = [
  '{',
  '  "核心名": "从核心里读出的核心名（优先 setvar 系统核心，其次语言格式里 name 的固定值）",',
  '  "格式": [',
  '    {',
  '      "标签": "XML 标签名，没有则 null",',
  '      "族": "xml | 引语 | 裸引号",',
  '      "说话人": "引语式的说话人，没有则 null",',
  '      "name固定值": "name 属性固定值，没有则 null",',
  '      "参数": [ { "名": "mood", "枚举": ["慵懒", "愉悦"] } ],',
  '      "引号": true,',
  '      "内嵌标签": "格式里内嵌的 HTML 标签名（如大字报模式用 h2），没有则 null",',
  '      "用途建议": "对话美化 | 登场/开场白 | 缔结契约成功 | 命运抽卡 | 咏唱/专属块",',
  '      "范例": ["逐字摘自原文的整条范例"]',
  '    }',
  '  ],',
  '  "疑点": ["写法含糊、无法确定的地方，逐条列出，不要猜"]',
  '}'
].join('\n');
function rxParseSystemContent() {
  var lines = [];
  lines.push('[角色] 你是始弦，大图书馆的司书，正在把一份角色卡文本里的「语言格式」节解析成结构化数据。');
  lines.push('[任务] 这是一次纯粹的抽取工作：只把原文已有的结构读出来，不做任何创作、改写、补全或翻译。');
  lines.push([
    '【抽取规则】',
    '1. 只输出一个 ' + fence() + 'json 代码块，块内只有 JSON，块外不写任何解释。',
    '2. 「范例」必须逐字摘自原文（含标签与引号），不得润色、不得截断、不得补全；只收「完整到能被正则匹配」的整条范例。找不到范例就写空数组。',
    '3. 参数枚举必须逐字摘自原文；原文没写明枚举就写空数组 []。',
    '4. 族判定：格式里有 <标签 name="..."> 的算 xml；形如 「> 名字:「…」」的算 引语；只有「…」既无说话人又无标签的算 裸引号。',
    '5. 一个核心可能有多套格式（不同模式、不同说话人），逐套列出，不要合并。',
    '6. 原文里出现的正文 HTML 标签（h1~h6、div、span、p、style、svg 等）不是对话标签，不得当成「标签」。',
    '7. 任何写法含糊、你无法确定的地方，写进「疑点」数组，绝对不要猜。',
    '8. 「核心名」优先取 setvar 系统核心 的值，其次取语言格式里 name 的固定值。'
  ].join('\n'));
  lines.push('[输出 schema]\n' + RX_PARSE_SCHEMA);
  return macroFill(lines.join('\n\n'));
}
// 长 CSS 塞进 JSON 字符串时模型常写裸换行/裸制表符（非法 JSON），
// 这里把字符串内部的裸控制字符转义回来；字符串没闭合 = 被截断，直接判死（绝不能当片段用）
function rxRepairJson(txt) {
  var s = String(txt || '');
  var out = '', inStr = false, esc = false;
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    if (inStr) {
      if (esc) { esc = false; out += ch; continue; }
      if (ch === '\\') { esc = true; out += ch; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      out += ch; continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    out += ch;
  }
  if (inStr) return null;
  return out.replace(/,\s*([}\]])/g, '$1');
}
function rxExtractJson(text) {
  var t = String(text || '');
  var F = fence();
  var i = t.indexOf(F + 'json');
  if (i >= 0) {
    var s = t.indexOf('\n', i), e = t.indexOf(F, s + 1);
    if (s > 0) t = e > s ? t.slice(s + 1, e) : t.slice(s + 1);
  }
  var a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  var body = t.slice(a, b + 1);
  try { return JSON.parse(body); } catch (err) {}
  var rp = rxRepairJson(body);
  if (rp) { try { return JSON.parse(rp); } catch (err2) {} }
  return null;
}
function rxNormText(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}
// 把 AI 结果规范化成下游统一使用的 formats[]，并做四道校验
function rxNormalizeAiFormats(ai, coreText) {
  var out = { coreName: '', formats: [], notes: [], dropped: 0 };
  if (!ai || typeof ai !== 'object') { out.notes.push('AI 未返回可解析的 JSON'); return out; }
  out.coreName = String(ai['核心名'] || '').trim();
  var list = Array.isArray(ai['格式']) ? ai['格式'] : [];
  var coreNorm = rxNormText(coreText);
  list.forEach(function (raw, i) {
    if (!raw || typeof raw !== 'object') return;
    var tag = raw['标签'] ? String(raw['标签']).trim() : '';
    var speaker = raw['说话人'] ? String(raw['说话人']).trim() : '';
    var fam = String(raw['族'] || '').trim();
    if (tag && (!/^[A-Za-z_]\w*$/.test(tag) || RX_HTML_TAGS.indexOf(tag.toLowerCase()) >= 0)) tag = '';   // 校验 2
    var family = fam === 'xml' ? 'xml' : fam === '引语' ? 'quote' : fam === '裸引号' ? 'bare' : (tag ? 'xml' : speaker ? 'quote' : 'bare');
    if (family === 'xml' && !tag) { out.notes.push('第 ' + (i + 1) + ' 套格式声明为 xml 但标签名非法，已跳过'); return; }
    if (family === 'quote' && !speaker) { out.notes.push('第 ' + (i + 1) + ' 套格式声明为引语但没有说话人，已跳过'); return; }
    var params = [];
    (Array.isArray(raw['参数']) ? raw['参数'] : []).forEach(function (p) {                                  // 校验 3
      if (!p || typeof p !== 'object') return;
      var nm = String(p['名'] || '').trim();
      if (!/^[A-Za-z_]\w*$/.test(nm) || nm === 'name') return;
      var vals = (Array.isArray(p['枚举']) ? p['枚举'] : []).map(function (v) { return String(v == null ? '' : v).trim(); }).filter(Boolean);
      vals = vals.filter(function (v, k) { return vals.indexOf(v) === k; });
      params.push({ name: nm, placeholder: '{' + nm + '}', values: vals });
    });
    var examples = [];
    (Array.isArray(raw['范例']) ? raw['范例'] : []).forEach(function (ex) {                                 // 校验 1：范例必须逐字存在于原文
      var e = rxNormText(ex);
      if (!e) return;
      if (coreNorm.indexOf(e) < 0) { out.dropped++; return; }
      if (examples.indexOf(e) < 0) examples.push(e);
    });
    out.formats.push({
      family: family, tag: tag, speaker: speaker,
      nameValue: raw['name固定值'] ? String(raw['name固定值']).trim() : '',
      params: params, quote: raw['引号'] !== false,
      innerTag: raw['内嵌标签'] && RX_HTML_TAGS.indexOf(String(raw['内嵌标签']).toLowerCase()) >= 0 ? String(raw['内嵌标签']) : '',
      purposeHint: String(raw['用途建议'] || '').trim(),
      examples: examples,
      key: family === 'xml' ? ('xml:' + tag) : family === 'quote' ? ('q:' + speaker + '|') : 'bare:ai',
      label: family === 'xml' ? tag : family === 'quote' ? speaker : '裸引号'
    });
  });
  if (out.dropped) out.notes.push('AI 抽出的 ' + out.dropped + ' 条范例在原文中找不到，已丢弃（防改写/编造）');
  var doubt = Array.isArray(ai['疑点']) ? ai['疑点'].filter(Boolean) : [];
  doubt.forEach(function (d) { out.notes.push('AI 疑点：' + String(d).slice(0, 120)); });
  // 校验 4：生成正则并当场用 AI 抽出的范例试跑
  out.formats.forEach(function (f) {
    if (f.family === 'quote') {
      var sib = out.formats.filter(function (x) { return x.family === 'quote' && x.speaker === f.speaker && x.innerTag; })[0];
      if (sib && !f.innerTag) f.siblingInnerTag = sib.innerTag;
    }
    f.regex = rxGenFindRegex(f);
    if (!f.regex) return;
    var keep = f.examples.filter(function (e) { return new RegExp(f.regex.source, f.regex.flags).test(e); });
    if (f.examples.length && keep.length < f.examples.length) {
      out.notes.push('格式「' + f.label + '」有 ' + (f.examples.length - keep.length) + ' 条范例匹配不上生成的正则（AI 解析可能不准）');
    }
    f.examples = keep;
  });
  out.examples = out.formats.reduce(function (acc, f) { f.examples.forEach(function (e) { if (acc.indexOf(e) < 0) acc.push(e); }); return acc; }, []);
  return out;
}
async function rxParseByAi(txt) {
  var sec = rxLangSection(txt);
  var payload = sec ? sec : String(txt).slice(0, 6000);
  var ctxIdx = sec ? txt.indexOf(sec) : 0;
  var head = txt.slice(Math.max(0, ctxIdx - 400), ctxIdx);
  var msg = '[核心条目文本]\n' + head + '\n' + payload + '\n\n请按 schema 输出 JSON。';
  var msgs = [{ role: 'system', content: rxParseSystemContent() }, { role: 'user', content: msg }];
  var resp = await callModel(msgs);
  var ai = rxExtractJson(resp);
  if (!ai) return null;
  return rxNormalizeAiFormats(ai, txt);
}
