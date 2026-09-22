//@module 74-refine-ui — ⑦ 命定核心精修：补丁解析 + 界面与事件
// ---------- 补丁解析：优先解析分块格式（对截断友好），兼容旧 JSON 格式 ----------
// 分块格式：
//   ###变更1 / 类型: 后插 / 锚点: <<< … >>> / 新内容: <<< … >>> / 理由: …
// 好处：被截断时**完整的块仍然可用**，且能精确告知"第 N 块被截断"，而不是整份报废。
function refineParseBlocks(raw){
  var t = String(raw || '');
  var F = fence();
  t = t.replace(new RegExp(F + '[a-zA-Z]*\\s*\\n', 'g'), '').replace(new RegExp('\\n?' + F, 'g'), '');
  var marks = t.split(/^[ \t]*#{2,4}[ \t]*变更[ \t]*\d*[ \t]*$/m);
  if (marks.length < 2) return { ok: false, why: '没有找到 `###变更` 分块', changes: [], truncated: 0, tail: '' };
  var changes = [], truncated = 0, tail = '';
  for (var i = 1; i < marks.length; i++) {
    var body = marks[i];
    var type = (body.match(/^[ \t]*类型[ \t]*[:：][ \t]*(.+)$/m) || [])[1] || '替换';
    var why = (body.match(/^[ \t]*理由[ \t]*[:：][ \t]*(.+)$/m) || [])[1] || '';
    var anchor = '', next = '';
    var a1 = body.indexOf('<<<', body.search(/^[ \t]*锚点[ \t]*[:：]/m));
    if (a1 >= 0) { var a2 = body.indexOf('>>>', a1 + 3); if (a2 >= 0) anchor = body.slice(a1 + 3, a2).replace(/^\n/, '').replace(/\n$/, ''); else { truncated++; continue; } }
    var nKey = body.search(/^[ \t]*新内容[ \t]*[:：]/m);
    if (nKey >= 0) {
      var n1 = body.indexOf('<<<', nKey);
      var n2 = n1 >= 0 ? body.indexOf('>>>', n1 + 3) : -1;
      if (n1 >= 0 && n2 >= 0) next = body.slice(n1 + 3, n2).replace(/^\n/, '').replace(/\n$/, '');
      else if (n1 >= 0) { truncated++; continue; }
    }
    if (!anchor.trim() && !next.trim()) continue;
    if (!anchor.trim() || !next.trim()) { truncated++; continue; }   // 只有半边 → 视为被截断，绝不当成可用变更
    changes.push({ '类型': String(type).trim(), '锚点': anchor, '新内容': next, '理由': String(why).trim() });
  }
  // 末尾的「后续 / 冲突」行
  var tailM = t.match(/^[ \t]*(后续|冲突)[ \t]*[:：][ \t]*(.+)$/gm);
  if (tailM) tail = tailM.join('\n');
  var incompleteTail = /<<<[\s\S]*$/.test(marks[marks.length - 1]) && marks[marks.length - 1].indexOf('>>>', marks[marks.length - 1].lastIndexOf('<<<')) < 0;
  if (incompleteTail && truncated === 0) truncated = 1;
  return { ok: changes.length > 0, why: changes.length ? '' : '分块里没有解析出可用的锚点/新内容', changes: changes, truncated: truncated, tail: tail };
}
// 统一入口：先试分块，再试 JSON（兼容旧格式与模型自由发挥）
function refineParsePatch(raw){
  var t = String(raw || '');
  var blocks = refineParseBlocks(t);
  if (blocks.ok) return { changes: blocks.changes, truncated: blocks.truncated, tail: blocks.tail, format: '分块' };
  var j = rxExtractJson(t);
  var arr = j && Array.isArray(j['变更']) ? j['变更'] : (Array.isArray(j) ? j : null);
  if (arr && arr.length) {
    var tail2 = (j && Array.isArray(j['冲突']) && j['冲突'].length) ? ('冲突: ' + j['冲突'].join('；')) : '';
    var incomplete = !/\}\s*$/.test(t.trim());
    return { changes: arr, truncated: incomplete ? 1 : 0, tail: tail2, format: 'JSON' };
  }
  // 完全解析不出来时，也要区分"模型没按格式写"与"输出被截断"（后者该走截断对策）
  var openB = (t.match(/\{/g) || []).length, closeB = (t.match(/\}/g) || []).length;
  var looksTrunc = (openB > closeB) || (/<<</.test(t) && (t.match(/<<</g) || []).length % 2 === 1) || (t.indexOf('变更') >= 0 && !/\}\s*$/.test(t.trim()) && openB > 0);
  return { changes: [], truncated: looksTrunc ? 1 : 0, tail: '', format: '无法解析', why: blocks.why };
}
// 截断诊断：把"模型回复被切断"与"模型没按格式写"区分开
function refineTruncDiag(raw){
  var t = String(raw || '');
  var open = (t.match(/\{/g) || []).length, close = (t.match(/\}/g) || []).length;
  var blocks = (t.match(/###[ \t]*变更/g) || []).length;
  var openM = (t.match(/<<</g) || []).length, closeM = (t.match(/>>>/g) || []).length;
  var lines = ['返回长度 ' + t.length + ' 字符'];
  if (blocks) lines.push('变更块 ' + blocks + ' 个');
  if (openM || closeM) lines.push('内容标记 <<< ' + openM + ' 个 / >>> ' + closeM + ' 个' + (openM !== closeM ? '（不相等＝最后一块被截断）' : '（成对）'));
  if (open !== close) lines.push('花括号 { ' + open + ' / } ' + close + '（不相等＝很可能被截断）');
  lines.push('结尾 40 字符：' + JSON.stringify(t.slice(-40)));
  return lines.join('　｜　');
}

// ---------- ⑦ 命定核心精修：界面 ----------
var REFINE_HTML = '<div class="opf-char-wrap">'
  + '<div class="opf-sec-label">✦ 命定核心精修 · 外科手术式改造（绝对保持原有内容/功能/人设）</div>'
  + '<div class="opf-dim">四步闸门：<b>① 整体分析</b>（模型只读一遍，输出结构化概况）→ <b>② 你提修改意见</b> → <b>③ 模型分析并给出改法</b>（评估影响面，仍不动正文）→ <b>④ 你确认无误</b> → 模型只产出「锚点 + 新内容」的补丁，<b>由插件按逐字唯一命中落刀</b>，随后跑脚本保真校验（行级 diff / 包裹标签 / 十槽 / 人设字段 / EJS 配对 / 既有口令与变量路径是否消失）。未改动部分逐字不动是物理事实，不靠模型自觉。</div>'
  + '<textarea id="opf-rf-src" class="opf-char-input" style="min-height:120px" placeholder="把要修改的命定核心整份文本粘进来（YAML 正文 / 条目正文 / 从酒馆世界书复制出来的内容都行），或点下方「📂 打开文件」"></textarea>'
  + '<div class="opf-char-tools">'
  + '<label class="opf-btn ghost" style="margin:0">📂 打开文件<input type="file" id="opf-rf-file" accept=".yaml,.yml,.txt,.json,.md" style="display:none"></label>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-fromdest">⬅ 从 ④ 页带入成品</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-clear">🗑 清空</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-srcchk">🔍 读一下文本框</button>'
  + '</div>'
  + '<pre id="opf-rf-srcout" class="opf-box opf-char-report" style="display:none">尚未诊断</pre>'
  + '<div class="opf-dim" id="opf-rf-status">还没载入核心</div>'
  + '<div class="opf-sec"><div class="opf-sec-label">结构体检（脚本，零 AI）</div><pre id="opf-rf-scan" class="opf-box opf-char-report">尚未载入</pre></div>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-rf-analyze">① 整体分析</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-copyanalysis">⧉ 复制分析</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-ejslint">🧬 EJS 体检</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-ejsstd">🧬 EJS 规范速查</button></div>'
  + '<pre id="opf-rf-ejsout" class="opf-box opf-char-report">（还没做 EJS 体检）</pre>'
  + '<pre id="opf-rf-ejsstdbox" class="opf-box opf-char-report" style="display:none">尚未展开</pre>'
  + '<pre id="opf-rf-analysis" class="opf-box opf-char-report">（还没分析）</pre>'
  + '<div class="opf-sec"><div class="opf-sec-label">② 你的修改意见（改什么、为什么、期望效果）</div></div>'
  + '<textarea id="opf-rf-req" class="opf-char-input" style="min-height:80px" placeholder="例：给「食运加持」加一条约束——同一道菜在同一地点重复品尝不再触发增益；再给『天机推演』的卦象卡片增加一个字段 Rumor（一句市井传闻，20字内）"></textarea>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-rf-plan">② 分析这条意见</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-suggest">💡 给我几条可优化方向</button></div>'
  + '<pre id="opf-rf-planout" class="opf-box opf-char-report">（还没分析意见）</pre>'
  + '<div class="opf-sec"><div class="opf-sec-label">③ 确认后置入（模型只出补丁，插件落刀）</div></div>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-rf-apply">✓ 确认无误，置入</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-retrystep">↻ 重新生成这一步</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-relocate">📍 只重跑定位</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-splitstep">✂ 拆细本步（更小上限）</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-skipstep">⏭ 跳过本步</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-rollback">↩ 回退到原文</button></div>'
  + '<pre id="opf-rf-applyout" class="opf-box opf-char-report">（还没置入）</pre>'
  + '<pre id="opf-rf-fidelity" class="opf-box opf-char-report" style="display:none">尚未校验</pre>'
  + '<pre id="opf-rf-diff" class="opf-box opf-char-report" style="display:none">尚无差异</pre>'
  + '<div class="opf-sec"><div class="opf-sec-label">成品（可继续手改；改完可再回来分析新一轮）</div></div>'
  + '<textarea id="opf-rf-result" class="opf-char-input" style="min-height:160px" placeholder="置入后这里会是改好的完整文本；未置入时为空"></textarea>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn ghost" id="opf-rf-copy">⧉ 复制成品</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-download">💾 下载 .yaml</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-reload">⟳ 用成品替换原文，开新一轮</button></div>'
  + '</div>';
function bindRefinePage(){
  var f = getEl('opf-rf-file');
  if (!f) return;
  f.addEventListener('change', function () {
    var file = this.files && this.files[0]; if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      var txt = String(fr.result || '');
      if (/^\s*[\[{]/.test(txt)) { try { var j = JSON.parse(txt); txt = j.content || j.正文 || (j.entries ? Object.keys(j.entries).map(function (k) { return j.entries[k].content; }).join('\n\n') : txt); } catch (e) {} }
      var sc = refineLoad(txt, file.name);
      toast('已载入 ' + file.name + '（' + sc.chars + ' 字符 / ' + sc.lines + ' 行）', 'success');
    };
    fr.readAsText(file, 'utf-8');
    this.value = '';
  });
  getEl('opf-rf-src').addEventListener('input', function () {
    refineInit(); ST.refine.src = this.value; ST.refine.scan = refineScan(this.value).text;
    var s = getEl('opf-rf-scan'); if (s) s.textContent = ST.refine.scan;
    var c = getEl('opf-rf-status');
    if (c) c.textContent = '文本框 ' + this.value.length + ' 字符 / ' + this.value.split(/\r?\n/).length + ' 行' + (this.value.trim() ? '' : '（空）');
    refineCacheSave();
  });
  getEl('opf-rf-srcchk').addEventListener('click', function () {
    var box = getEl('opf-rf-srcout'); if (!box) return;
    var open = box.style.display !== 'none';
    box.textContent = open ? '尚未诊断' : refineSrcDiag();
    box.style.display = open ? 'none' : 'block';
    var h = refineSrcHealth(refineReadSrc(false));
    toast('文本框 ' + h.chars + ' 字符 / ' + h.lines + ' 行' + (h.wrapper ? '｜包裹标签 <' + h.wrapper + '>' : '｜未识别到包裹标签'), h.ok ? 'success' : 'warning');
  });
  // 页面打开时：若框里是空的而缓存里有内容，补回框里（绝不覆盖你已粘贴的内容）
  try { if (!refineReadSrc(false).trim()) refineCacheRestore(); } catch (e) { opfErr('refineCacheRestore', e); }
  getEl('opf-rf-fromdest').addEventListener('click', function () {
    var body = ST.dest && ST.dest.body;
    if (!body) { toast('④ 页还没有成品：先去 ④ 页「🎁 脚本封装」，或直接把核心粘进来', 'warning'); return; }
    refineLoad(body, '④页成品-' + (ST.dest.asmInfo && ST.dest.asmInfo.wrapper || '核心'));
    toast('已从 ④ 页带入成品（' + body.length + ' 字符）');
  });
  getEl('opf-rf-clear').addEventListener('click', function () {
    if (!window.confirm('清空本页的载入内容、分析与成品？（不影响其它页面）')) return;
    ST.refine = null; refineInit();
    ['opf-rf-src', 'opf-rf-req', 'opf-rf-result'].forEach(function (id) { var e = getEl(id); if (e) e.value = ''; });
    ['opf-rf-scan', 'opf-rf-analysis', 'opf-rf-planout', 'opf-rf-applyout'].forEach(function (id) { var e = getEl(id); if (e) e.textContent = id === 'opf-rf-scan' ? '尚未载入' : '（空的）'; });
    ['opf-rf-fidelity', 'opf-rf-diff'].forEach(function (id) { var e = getEl(id); if (e) e.style.display = 'none'; });
    refineNote('已清空'); refineCacheSave();
  });
  getEl('opf-rf-analyze').addEventListener('click', function () { refineAnalyze(); });
  getEl('opf-rf-ejslint').addEventListener('click', function () { refineEjsCheck(true); });
  getEl('opf-rf-ejsstd').addEventListener('click', function () {
    var box = getEl('opf-rf-ejsstdbox'); if (!box) return;
    var open = box.style.display !== 'none';
    box.textContent = open ? '尚未展开' : DEST_EJS_STANDARD;
    box.style.display = open ? 'none' : 'block';
  });
  getEl('opf-rf-copyanalysis').addEventListener('click', function () { destCopyText(String(ST.refine && ST.refine.analysis || ''), '还没有分析结果'); });
  getEl('opf-rf-plan').addEventListener('click', function () { refinePlan(); });
  getEl('opf-rf-suggest').addEventListener('click', function () { refineSuggest(); });
  getEl('opf-rf-apply').addEventListener('click', function () { refineApply(); });
  getEl('opf-rf-retrystep').addEventListener('click', function () { refineApply(); });
  getEl('opf-rf-relocate').addEventListener('click', function () {
    refineInit();
    if (!ST.refine.pendingGen || !ST.refine.pendingGen.length) { toast('还没有"已生成但未定位"的内容——先点「✓」跑一轮', 'warning'); return; }
    refineApply('locate');
  });
  getEl('opf-rf-splitstep').addEventListener('click', function () {
    refineInit();
    var cur = ST.refine.sizeCap || 1200;
    ST.refine.sizeCap = Math.max(400, Math.round(cur / 2));
    var steps = ST.refine.steps || [];
    var si = ST.refine.stepIndex || 0;
    if (steps[si] && !steps[si].split) {
      steps[si].split = true;
      steps.splice(si + 1, 0, { i: si + 1, title: (steps[si].title || '本步') + '（后半）', detail: '接续上一步未完成的部分：' + (steps[si].detail || ''), est: 0, done: false });
    }
    refineNote('本步输出上限已降到 ' + ST.refine.sizeCap + ' 字符' + (steps[si] && steps[si].split ? '，并已把该步拆成两步' : ''));
    toast('已把本步拆细：新内容上限降到 ' + ST.refine.sizeCap + ' 字符' + (steps.length > 1 ? '，步骤数变为 ' + steps.length : '') + '；再点一次「✓」重试本步', 'success');
    refineSyncButtons(); refineCacheSave();
  });
  getEl('opf-rf-skipstep').addEventListener('click', function () {
    refineInit();
    var steps = ST.refine.steps || [];
    var si = ST.refine.stepIndex || 0;
    if (!steps.length) { toast('当前没有分步计划', 'warning'); return; }
    if (si >= steps.length) { toast('已经到最后一步了', 'warning'); return; }
    steps[si].skipped = true; steps[si].done = false;
    ST.refine.stepIndex = si + 1;
    refineSyncButtons(); refineCacheSave();
    toast('已跳过第 ' + (si + 1) + ' 步（' + (steps[si].title || '') + '），当前进度 ' + ST.refine.stepIndex + '/' + steps.length, 'warning');
    refineNote('已跳过第 ' + (si + 1) + ' 步');
  });
  getEl('opf-rf-rollback').addEventListener('click', function () {
    if (!ST.refine || !ST.refine.src) { toast('没有可回退的原文', 'warning'); return; }
    ST.refine.result = ''; ST.refine.diff = ''; ST.refine.fidelity = null; ST.refine.applied = [];
    ST.refine.working = ST.refine.src; ST.refine.stepIndex = 0;
    ST.refine.lastFailed = null;
    (ST.refine.steps || []).forEach(function (s) { s.done = false; s.skipped = false; });
    var ta = getEl('opf-rf-result'); if (ta) ta.value = '';
    ['opf-rf-fidelity', 'opf-rf-diff'].forEach(function (id) { var e = getEl(id); if (e) e.style.display = 'none'; });
    var ao = getEl('opf-rf-applyout'); if (ao) ao.textContent = '已回退：工作稿重置为原文，分步进度归零（原文一直没被改动过，补丁只是生成一份新文本）';
    refineNote('已回退到原文'); refineSyncButtons(); refineCacheSave();
  });
  getEl('opf-rf-copy').addEventListener('click', function () { destCopyText(String(ST.refine && ST.refine.result || ''), '还没有成品'); });
  getEl('opf-rf-download').addEventListener('click', function () {
    var txt = String(ST.refine && ST.refine.result || '');
    if (!txt) { toast('还没有成品', 'warning'); return; }
    try {
      var blob = new Blob([txt], { type: 'text/yaml;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (String(ST.refine.name || 'core').replace(/\.(ya?ml|json|txt|md)$/i, '')) + '-修改版.yaml';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) { toast('下载失败：' + (e && e.message ? e.message : e), 'error'); }
  });
  getEl('opf-rf-reload').addEventListener('click', function () {
    var txt = String((getEl('opf-rf-result') || {}).value || '');
    if (!txt.trim()) { toast('还没有成品可替换', 'warning'); return; }
    refineLoad(txt, ST.refine.name);
    var rq = getEl('opf-rf-req'); if (rq) rq.value = '';
    toast('已用成品作为新一轮的原文（结构体检已重跑）', 'success');
  });
  refineRender();
}
function refineRender(){
  refineInit();
  var s = ST.refine;
  var set = function (id, v) { var e = getEl(id); if (e) e.textContent = v; };
  set('opf-rf-scan', s.scan || '尚未载入');
  set('opf-rf-analysis', s.analysis || '（还没分析）');
  set('opf-rf-planout', s.plan || '（还没分析意见）');
  var ao = getEl('opf-rf-applyout'); if (ao && s.appliedText) ao.textContent = s.appliedText;
  var fi = getEl('opf-rf-fidelity'), df = getEl('opf-rf-diff');
  if (fi) { fi.style.display = s.fidelityText ? 'block' : 'none'; if (s.fidelityText) fi.textContent = s.fidelityText; }
  if (df) { df.style.display = s.diffText ? 'block' : 'none'; if (s.diffText) df.textContent = s.diffText; }
  refineNote(s.src ? ('已载入 ' + (s.name || '未命名') + '：' + s.src.length + ' 字符｜' + (s.analysisObj ? '已分析' : '未分析') + (s.plan ? '｜已出改法' : '') + (s.steps && s.steps.length ? '｜分步 ' + (s.stepIndex || 0) + '/' + s.steps.length : '') + (s.result ? '｜已落地' : '')) : '还没载入核心');
  try { refineSyncButtons(); } catch (e) {}
}
async function refineAnalyze(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var src = refineReadSrc();
  if (!refineSrcHealth(src).ok) {
    refineNote('① 读到的内容为空或过短，已拒绝发送（点「🔍 读一下文本框」看诊断）');
    toast('读到的内容为空或过短，没有发送请求——点「🔍 读一下文本框」可看诊断', 'error');
    var d0 = getEl('opf-rf-srcout'); if (d0) { d0.textContent = refineSrcDiag(); d0.style.display = 'block'; }
    return;
  }
  refineInit(); ST.refine.src = src;
  if (!ST.refine.scan) ST.refine.scan = refineScan(src).text;
  ST.running = true; renderRunButtons(); refineNote('① 整体分析中…（只读，不会改动任何内容）');
  try {
    var msg = '[待修改的二创核心（唯一的分析对象；下面的【世界设定参考】不是它的一部分）]\n'
      + '<<<二创核心原文\n' + refineForPrompt(src.slice(0, 60000)) + '\n二创核心原文结束>>>' + refineEjsEscNote(src)
      + '\n\n' + REFINE_ANALYZE_SPEC;
    var resp = await callModel([{ role: 'system', content: refineSystem() }, { role: 'user', content: macroFill(msg) }]);
    var j = rxExtractJson(resp);
    ST.refine.analysisObj = j || null;
    // 材料隔离核对：模型报的字段里若出现"只在世界参考里才有"的整段内容 → 判为串台
    var pool0 = refineTaintPool(src, refineRefText());
    var names0 = refineNamePool(src, refineRefText());
    var taint0 = refineAnalysisTaint(j, pool0, names0);
    ST.refine.taint = taint0;
    ST.refine.analysis = (j ? refineFormatAnalysis(j) : ('（没能解析成 JSON，原文如下）\n\n' + String(resp || '').slice(0, 6000)))
      + (taint0.length
        ? ('\n\n⚠ 材料隔离核对：以下 ' + taint0.length + ' 段内容**只存在于②页的世界设定参考里**，却出现在了对"这个核心"的描述中——说明模型把参考当成了核心的一部分（串台）。请核对，或重跑一次：\n'
          + taint0.map(function (s, i) { return '   ' + (i + 1) + '. ' + s.slice(0, 110); }).join('\n'))
        : (pool0.length ? '\n\n✓ 材料隔离核对通过：分析结果里没有出现"只在世界参考里才有"的内容（参考池 ' + pool0.length + ' 段）' : ''));
    refineRender(); refineCacheSave();
    toast(j ? (taint0.length ? ('① 分析完成，但材料隔离核对发现 ' + taint0.length + ' 段疑似串台（见分析面板）') : '① 分析完成（概况已列在下方）') : '① 模型返回的不是 JSON，已原样显示', (j && !taint0.length) ? 'success' : 'warning');
  } catch (e) { toast('分析出错：' + (e && e.message ? e.message : e), 'error'); refineNote('分析失败'); }
  finally { ST.running = false; renderRunButtons(); }
}
function refineFormatAnalysis(j){
  var L = [];
  var line = function (k, v) { if (v == null || v === '' || (Array.isArray(v) && !v.length)) return; L.push('· ' + k + '：' + (Array.isArray(v) ? v.join('；') : String(v))); };
  line('条目名', j['条目名']); line('系统名（包裹标签）', j['系统名']); line('系统核心名（灵）', j['系统核心名']); line('系统核心（条目）', j['系统核心']);
  line('一级节', j['一级节']);
  if (j['十槽']) line('十槽', (j['十槽']['齐全'] ? '齐全' : '缺 ' + ((j['十槽']['缺'] || []).join('、') || '?')));
  line('功能清单', j['功能清单']);
  line('机制要点', j['机制要点']);
  if (j['人设要点'] && typeof j['人设要点'] === 'object') {
    L.push('· 人设要点：');
    Object.keys(j['人设要点']).forEach(function (k) { if (j['人设要点'][k]) L.push('    - ' + k + '：' + String(j['人设要点'][k]).slice(0, 120)); });
  }
  if (j['语言格式']) line('语言格式', [j['语言格式']['族'], j['语言格式']['标签'], (j['语言格式']['参数'] || []).join('/'), (j['语言格式']['范例条数'] != null ? '范例 ' + j['语言格式']['范例条数'] + ' 条' : '')].filter(Boolean).join('｜'));
  line('硬约束（不可丢）', j['硬约束']);
  line('状态与变量', j['状态与变量']);
  line('口令与关键词', j['口令与关键词']);
  if (j['EJS结构']) line('EJS 结构', ['块数 ' + (j['EJS结构']['块数'] || 0)].concat(j['EJS结构']['用途'] || []).concat(j['EJS结构']['装饰器'] ? ['装饰器 ' + (j['EJS结构']['装饰器'] || []).join('、')] : []).concat(j['EJS结构']['依赖的常量'] ? ['依赖 ' + (j['EJS结构']['依赖的常量'] || []).join('、')] : []).join('｜'));
  line('脆弱点', j['脆弱点']);
  line('可优化方向', j['可优化方向']);
  return L.join('\n') || '（分析结果为空）';
}
// 材料隔离条款：把"参考"与"待改"两种材料的角色写死（v1.14.0）
var REFINE_ISOLATION = [
  '【两种材料，角色不同，绝不能混】',
  '你在这轮对话里会看到两种材料，它们的关系是「参考资料 → 作用于 → 待改对象」，不是同一份东西：',
  '  A. 待修改的二创核心 ＝ 用户在消息里提供的那一份文本（插件用 `<<<二创核心原文` 与 `二创核心原文结束>>>` 包住，或标为"当前工作稿"）。它是**唯一的修改对象**，你要动的只有它。',
  '  B. 世界设定参考 ＝ 用户在世界书页勾选的条目（插件标为"[世界设定参考·不可修改]"，附在其后）。它是**不可变的参考资料**，只用来核对口径（例如数值档位、变量路径、写法习惯是否与世界规则一致）。',
  '隔离铁律：',
  'R1. 参考不是核心的一部分：分析时不要把参考里的节标题、功能、人设、变量、规则列成"这个核心的一级节/功能清单/机制要点/十槽"；那些只属于参考，不属于这个核心。',
  'R2. 参考不可修改、也不会被修改：你的任何输出都不要包含参考条目的内容（可以提它的名字来对照口径，但不要把它抄进核心，也不要改它）。',
  'R3. 不要"补全"：不要因为参考里有某条规则（变量更新规则、好感度规则、战斗规则等），就认为这个核心应该也有它、或替它补上。只有核心原文写了的东西才属于它。',
  'R4. 两者口径不一致时（核心的写法与参考里的世界规则不同）：**不要自作主张改核心**，只在"影响评估/脆弱点"里指出差异与风险；确有必要改时，写进"冲突"里由用户决定。',
  'R5. 引用时标明来源：说某条内容时写清是"核心原文"还是"世界参考"；报告里不要把两者混在一段里。',
  'R6. 修改范围只在核心原文之内：新增内容必须是为了满足用户这次的要求，而不是把参考里的东西搬进来。'
].join('\n');
function refineSystem(){
  return macroFill('你是「始弦的魔法大典」的司书，正在帮{{user}}修改一份**已经存在的**命定系统核心。'
    + '你的第一职责是「不弄坏它」：这份核心正在被使用，任何未要求的变化都会破坏玩家的存档与叙事。'
    + REFINE_RULES + '\n\n' + REFINE_ISOLATION
    + (ST.worldInfo ? '\n\n[世界设定参考·不可修改｜不是修改对象，只是核对口径用]\n' + ST.worldInfo : '\n\n（本轮没有附带世界设定参考）'));
}
async function refinePlan(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var src = refineReadSrc();
  var req = String((getEl('opf-rf-req') || {}).value || '').trim();
  if (!src.trim()) { toast('先载入核心文本', 'warning'); return; }
  if (!req) { toast('先写下你的修改意见', 'warning'); return; }
  ST.refine.src = src; ST.refine.request = req;
  ST.running = true; renderRunButtons(); refineNote('② 分析你的意见中…（仍然不会改动正文）');
  try {
    var msg = '[待修改的二创核心（唯一会被改动的对象）]\n<<<二创核心原文\n' + refineForPrompt(src.slice(0, 60000)) + '\n二创核心原文结束>>>' + refineEjsEscNote(src)
      + '\n\n[已完成的整体分析]\n' + (ST.refine.analysis || '（无，可先点①）')
      + '\n\n[用户的修改意见]\n' + req + '\n\n' + REFINE_PLAN_SPEC;
    var resp = await callModel([{ role: 'system', content: refineSystem() }, { role: 'user', content: macroFill(msg) }]);
    var j = rxExtractJson(resp);
    ST.refine.planObj = j || null;
    ST.refine.plan = j ? refineFormatPlan(j) : ('（没能解析成 JSON，原文如下）\n\n' + String(resp || '').slice(0, 6000));
    // 分步计划：模型给出的执行步骤（单步输出量受控，避免一次输出太大被截断）
    var st = (j && Array.isArray(j['执行步骤'])) ? j['执行步骤'] : [];
    ST.refine.steps = st.map(function (x, i) {
      return { i: i, title: String(x['标题'] || ('第 ' + (i + 1) + ' 步')), detail: String(x['做什么'] || ''), est: Number(x['预计新内容字符数']) || 0, done: false };
    });
    if (!ST.refine.steps.length && j) {
      ST.refine.steps = [{ i: 0, title: '一次完成', detail: String(j['确认提示'] || '按已确认的改法一次落地'), est: 0, done: false }];
    }
    ST.refine.working = refineReadSrc();
    ST.refine.stepIndex = 0;
    ST.refine.lastFailed = null;
    ST.refine.applied = []; ST.refine.result = ''; ST.refine.diff = ''; ST.refine.fidelity = null;
    ST.refine.fidelityText = ''; ST.refine.diffText = ''; ST.refine.appliedText = '';
    ['opf-rf-fidelity', 'opf-rf-diff'].forEach(function (id) { var e = getEl(id); if (e) e.style.display = 'none'; });
    refineRender(); refineCacheSave(); refineSyncButtons();
    toast(j ? ('② 已给出改法与影响评估——确认无误后可点「' + (getEl('opf-rf-apply') || {}).textContent + '」' + (ST.refine.steps.length > 1 ? '（本次拆成 ' + ST.refine.steps.length + ' 步，逐步落地，避免一次输出太大被截断）' : '')) : '② 模型返回的不是 JSON，已原样显示', j ? 'success' : 'warning');
  } catch (e) { toast('分析意见出错：' + (e && e.message ? e.message : e), 'error'); refineNote('分析意见失败'); }
  finally { ST.running = false; renderRunButtons(); }
}
function refineFormatPlan(j){
  var L = [];
  L.push('能否修改：' + (j['可否'] || '?'));
  if (j['理解']) L.push('理解：' + j['理解']);
  if (Array.isArray(j['影响评估']) && j['影响评估'].length) {
    L.push('\n影响评估：');
    j['影响评估'].forEach(function (x) {
      L.push('  · ' + (x['点'] || '') + '　→　' + (x['影响'] || '') + '　【是否触及既有功能：' + (x['是否触及既有功能'] || '?') + '】');
    });
  }
  if (Array.isArray(j['拟定改法']) && j['拟定改法'].length) {
    L.push('\n拟定改法（最小侵入）：');
    j['拟定改法'].forEach(function (x, i) { L.push('  ' + (i + 1) + '. [' + (x['位置'] || '') + '] ' + (x['做法'] || '')); });
  }
  if (Array.isArray(j['锚点预告']) && j['锚点预告'].length) {
    L.push('\n预计要动的原文片段：');
    j['锚点预告'].forEach(function (x) { L.push('  ▸ ' + String(x).slice(0, 160)); });
  }
  if (j['冲突'] && j['冲突'].length) { L.push('\n冲突/无法实现的部分：'); j['冲突'].forEach(function (x) { L.push('  ⚠ ' + x); }); }
  if (j['保真承诺']) L.push('\n保真承诺：' + j['保真承诺']);
  if (j['改动量']) L.push('\n改动量评估：' + j['改动量']);
  if (Array.isArray(j['执行步骤']) && j['执行步骤'].length) {
    L.push('\n分步执行计划（每步单独落地，防止一次输出太大被截断）：');
    j['执行步骤'].forEach(function (x, i) {
      L.push('  ' + (x['步骤'] || (i + 1)) + '. ' + (x['标题'] || '') + '　' + (x['做什么'] || '') + (x['预计新内容字符数'] ? '　（预计 ' + x['预计新内容字符数'] + ' 字符）' : ''));
    });
    if (j['执行步骤'].length > 1) L.push('  → 点「✓」每次只执行一步；每步做完都会刷新差异预览与保真校验，你可以逐步检查。');
  }
  if (j['确认提示']) L.push('\n确认提示：' + j['确认提示']);
  return L.join('\n');
}
async function refineSuggest(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var src = refineReadSrc();
  if (!src.trim()) { toast('先载入核心文本', 'warning'); return; }
  ST.running = true; renderRunButtons();
  try {
    var msg = '[待修改的二创核心（只针对它提方向；不要提世界参考里的规则）]\n<<<二创核心原文\n' + refineForPrompt(src.slice(0, 60000)) + '\n二创核心原文结束>>>' + refineEjsEscNote(src)
      + '\n\n请给出 3~5 条**不破坏现有设计**的优化方向（每条一行、≤40字、具体可执行），例如补齐缺口、让某条规则更自洽、增加与既有功能的联动。不要输出正文，不要提"重写/重构"，也不要建议"补上世界规则里的某某"（那是参考资料，不属于这个核心）。';
    var resp = await callModel([{ role: 'system', content: refineSystem() }, { role: 'user', content: macroFill(msg) }]);
    var list = [];
    String(resp || '').split(/\r?\n/).forEach(function (ln) {
      var t = ln.replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').trim();
      if (t && t.length >= 6 && t.length <= 60 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) { toast('没拿到可用的方向', 'warning'); return; }
    var box = getEl('opf-rf-req');
    if (box) box.value = list.slice(0, 6).join('\n');
    toast('已把 ' + Math.min(6, list.length) + ' 条方向填进意见框，可挑一条或改写后再点「② 分析这条意见」', 'success');
  } catch (e) { toast('生成方向失败：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); }
}
async function refineApply(mode){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var locateOnly = (mode === 'locate') && ST.refine.pendingGen && ST.refine.pendingGen.length;
  var src = refineReadSrc();
  var req = String((getEl('opf-rf-req') || {}).value || ST.refine.request || '').trim();
  if (!src.trim()) { toast('先载入核心文本', 'warning'); return; }
  if (!ST.refine.plan) { toast('请先点「② 分析这条意见」并确认改法', 'warning'); return; }
  // 多步执行：每一步都在"当前工作稿"上落刀，原始文本（src）永不改动
  if (!ST.refine.working) ST.refine.working = src;
  var steps = ST.refine.steps || [];
  var si = ST.refine.stepIndex || 0;
  var cur = steps[si] || null;
  var sizeCap = ST.refine.sizeCap || 1200;
  var stepLabel = steps.length ? ('第 ' + (si + 1) + '/' + steps.length + ' 步' + (cur && cur.title ? '（' + cur.title + '）' : '')) : '一步到位';
  ST.running = true; renderRunButtons(); refineNote('③ ' + stepLabel + '：正在生成补丁（锚点 + 新内容）…');
  try {
    var doneList = steps.slice(0, si).map(function (s, i) { return (i + 1) + '. [' + (s.done ? '已完成' : '未完成') + '] ' + (s.title || '') + '——' + (s.detail || ''); });
    // ③ 这一步要把整份工作稿交给模型（锚点必须来自这里，不能凭记忆）
    var CTX_CAP = 200000;
    var ctxText = ST.refine.working.slice(0, CTX_CAP);
    var ctxTrunc = ST.refine.working.length > CTX_CAP;
    var hintBlock = '';
    if (ST.refine.lastFailed && ST.refine.lastFailed.length) {
      hintBlock = '\n\n[上一次的锚点没对上原文——请直接使用下面给出的原文片段作为锚点，逐字复制]\n'
        + ST.refine.lastFailed.map(function (f, i) {
          return (i + 1) + '. 你上次写的锚点：\n<<<\n' + String(f.anchor || '').slice(0, 300) + '\n>>>\n'
            + (f.hint ? ('原文里最接近的一段实际是这样（请用它当锚点）：\n<<<\n' + f.hint + '\n>>>') : '原文里没有找到足够接近的片段，请重新在原文里定位。')
            + '\n失败原因：' + f.why;
        }).join('\n\n');
    }
    // ---- 阶段 A：只生成内容（不写锚点、不看世界参考）----
    var gen = locateOnly
      ? { units: ST.refine.pendingGen, tail: ST.refine.pendingTail || '', truncated: 0 }
      : null;
    if (locateOnly) refineNote('③ ' + stepLabel + '：只重跑定位（沿用上次已生成的内容，不重新写）…');
    else {
    var genMsg = '[你之前提供的系统核心 · 当前稿（仅供你了解既有写法与上下文；本阶段不要定位）]\n<<<二创核心当前稿\n' + refineForPrompt(ctxText) + '\n二创核心当前稿结束>>>' + refineEjsEscNote(ctxText)
      + (ctxTrunc ? '\n\n（注意：当前稿过长已截断显示，超出部分你看不到）' : '')
      + '\n\n[用户意见]\n' + req
      + '\n\n[已确认的改法分析]\n' + ST.refine.plan
      + (doneList.length ? '\n\n[分步计划 / 已完成情况]\n' + steps.map(function (s, i) { return (i + 1) + '. ' + (s.title || '') + '：' + (s.detail || '') + (i < si ? '（已完成，不要重复做）' : (i === si ? '　← 现在只做这一步' : '（待做，本轮不要碰）')); }).join('\n') : '')
      + (cur ? ('\n\n[本次只做这一步]\n第 ' + (si + 1) + ' 步：' + (cur.title || '') + '\n' + (cur.detail || '') + '\n请只完成这一步，不要顺手做后面的步骤。') : '')
      + '\n\n[本步内容上限]合计不超过 ' + sizeCap + ' 字符；超了就只写前半部分，并在末尾写 `后续: 还需要……`。'
      + '\n\n' + REFINE_GEN_SPEC;
    refineNote('③ ' + stepLabel + '：阶段 A · 正在生成内容…');
    var genResp = await callModel([{ role: 'system', content: refineSystem() }, { role: 'user', content: macroFill(genMsg) }]);
    gen = refineParseGenBlocks(genResp);
    var ao = getEl('opf-rf-applyout');
    if (!gen.units.length) {
      var diag0 = refineTruncDiag(genResp);
      var h0 = [];
      h0.push('❌ ' + stepLabel + ' 阶段 A（生成内容）：没能解析出可用的内容（原文一个字符都没动）。');
      h0.push('【诊断】' + diag0);
      h0.push('【解析说明】' + (gen.why || '未按 `###改动N` 分块格式输出'));
      h0.push('');
      h0.push('对策：输出被截断 → 点「✂ 拆细本步（更小上限）」；模型没按格式写 → 点「↻ 重新生成这一步」。');
      h0.push('');
      h0.push('【模型原始回复（前 4000 字符）】\n' + String(genResp || '').slice(0, 4000));
      if (ao) ao.textContent = h0.join('\n');
      ST.refine.appliedText = h0.join('\n');
      toast('阶段 A 没拿到内容，原文未被改动（诊断见下方）', 'warning');
      refineNote('③ ' + stepLabel + ' 阶段 A 未产出内容'); return;
    }
    if (gen.truncated) {
      var askG = (typeof window !== 'undefined' && window.confirm) ? window.confirm : function () { return false; };
      if (!askG('阶段 A 的输出疑似被截断（检测到 ' + gen.truncated + ' 个不完整的分块）。\n\n'
        + '· 点「确定」＝先只处理已完整的 ' + gen.units.length + ' 块，剩下的下次再做（推荐）\n'
        + '· 点「取消」＝本轮整份放弃\n\n（内容已写好，不会丢失）')) {
        if (ao) ao.textContent = '本轮因截断放弃。\n\n' + refineTruncDiag(genResp);
        refineNote('③ ' + stepLabel + ' 阶段 A 因截断放弃'); return;
      }
    }
    ST.refine.pendingGen = gen.units;                        // 内容先留住：定位失败也不用重写
    ST.refine.pendingTail = gen.tail || '';
    }
    var ao = getEl('opf-rf-applyout');
    // ---- 阶段 B：只定位（只给「核心当前稿 + 本次改动清单」，不带世界参考）----
    refineNote('③ ' + stepLabel + '：阶段 B · 正在定位插入位置…');
    var locMsg = '[你之前提供的系统核心 · 当前稿（**只有这份文本**；本阶段不要读任何其它资料、不要改写任何内容）]\n<<<二创核心当前稿\n' + refineForPrompt(ctxText) + '\n二创核心当前稿结束>>>' + refineEjsEscNote(ctxText)
      + '\n\n[本次写好的改动清单（编号顺序不可变）]\n'
      + gen.units.map(function (u, i) {
        return '###改动' + (i + 1) + '\n类型: ' + (u['类型'] || '后插') + '\n意图: ' + (u['意图'] || '') + '\n内容预览:\n<<<\n'
          + refineForPrompt(String(u['内容']).slice(0, 400)) + (String(u['内容']).length > 400 ? '\n…（已截断预览，你不需要看到全文，只需要定位）' : '') + '\n>>>';
      }).join('\n\n')
      + hintBlock
      + '\n\n' + REFINE_LOCATE_SPEC;
    var locResp = await callModel([{ role: 'system', content: '你只负责"在给定文本里定位"，不改写、不补充、不引用任何其它资料。' }, { role: 'user', content: macroFill(locMsg) }]);
    var loc = refineParseLocate(locResp);
    // 合并：内容来自阶段 A，锚点来自阶段 B（缺失的用脚本兜底，再不行就标为待定位）
    var merged = gen.units.map(function (u, i) {
      var a = (loc.anchors[i] && loc.anchors[i]['锚点']) || '';
      var byIntent = a ? '' : refineLocateByIntent(ST.refine.working, u['意图']);
      return { '类型': u['类型'], '锚点': a || byIntent || '', '新内容': u['内容'], '理由': u['意图'],
        '_how': a ? '模型定位' : (byIntent ? '脚本按意图兜底定位' : '未定位'),
        '_note': (loc.anchors[i] && loc.anchors[i]['说明']) || '' };
    });
    var unlocated = merged.filter(function (x) { return !x['锚点']; });
    ST.refine.pendingLoc = merged;
    if (unlocated.length) {
      var hu = [];
      hu.push('⚠ ' + stepLabel + ' 阶段 B（定位）：内容已经写好（' + gen.units.length + ' 处），但有 ' + unlocated.length + ' 处**没能定位到插入位置**。');
      hu.push('（这是新流程的正常分支：内容不会因此丢失，定位可以单独重跑。）');
      hu.push('');
      unlocated.forEach(function (x, i) {
        hu.push((i + 1) + '. 意图：' + (x['理由'] || '（无）'));
        hu.push('   模型说明：' + (x['_note'] || '（无）'));
        hu.push('   内容预览：' + String(x['新内容']).slice(0, 160).replace(/\n/g, '⏎'));
      });
      hu.push('');
      hu.push('可选操作：');
      hu.push('  · 「📍 只重跑定位」：内容不动，只让它重新在原文里找位置（便宜，推荐先试）；');
      hu.push('  · 「⏭ 跳过本步」：这处先不插，留到以后；');
      hu.push('  · 想手动指定：把内容复制出来，直接在成品框里贴到你要的位置。');
      if (ao) ao.textContent = hu.join('\n');
      ST.refine.appliedText = hu.join('\n');
      refineNote('③ ' + stepLabel + ' 内容已生成 ' + gen.units.length + ' 处，' + unlocated.length + ' 处待定位');
      toast('内容已生成，但有 ' + unlocated.length + ' 处没定位到位置——可点「📍 只重跑定位」', 'warning');
      refineSyncButtons();
      var fi0 = getEl('opf-rf-fidelity'); if (fi0 && !ST.refine.fidelityText) fi0.style.display = 'none';
      return;
    }
    var usable = merged.map(function (x) { return { '类型': x['类型'], '锚点': x['锚点'], '新内容': x['新内容'], '理由': x['理由'] }; });
    var parsed = { changes: usable, format: '两阶段（生成→定位）', tail: gen.tail || '' };
    var resp = genResp;                                       // 供后续诊断引用
    var locNote = merged.filter(function (x) { return /兜底/.test(x._how); }).length;
    // 材料隔离核对（在落刀之前）：新内容里若整段搬了"只在世界参考里才有"的内容 → 先拦下问用户
    var pool = refineTaintPool(ST.refine.working, refineRefText());
    var names = refineNamePool(ST.refine.working, refineRefText());
    var taint = refinePatchTaint(usable, pool, names);
    if (taint.length) {
      var askT = (typeof window !== 'undefined' && window.confirm) ? window.confirm : function () { return false; };
      if (!askT('材料隔离核对发现问题：本次补丁的"新内容"里有 ' + taint.length + ' 段内容**只存在于②页的世界设定参考里**，说明模型把世界规则搬进了这个二创核心（典型串台）：\n\n'
        + taint.map(function (s, i) { return (i + 1) + '. ' + s.slice(0, 110); }).join('\n\n')
        + '\n\n· 点「取消」＝放弃本轮（推荐：世界规则不该进核心，可点「↻ 重新生成这一步」并说明"只改核心本身"）\n'
        + '· 点「确定」＝我知道风险，仍然落地（落地后请重点看差异预览）')) {
        if (ao) ao.textContent = '因材料隔离核对未通过而放弃本轮，工作稿未改动。\n\n涉及片段：\n' + taint.map(function (s, i) { return (i + 1) + '. ' + s.slice(0, 160); }).join('\n');
        refineNote('③ ' + stepLabel + ' 因"疑似把世界参考搬进核心"而放弃');
        toast('已拦下：补丁里疑似混入了世界参考内容，工作稿未改动', 'warning');
        return;
      }
      ST.refine.taintWarn = taint;
    } else ST.refine.taintWarn = null;
    var res = refineApplyPatch(ST.refine.working, usable);
    var lines = [];
    // 删除失败不该连累整份补丁（v1.16.5）。删除类锚点常常因为"模型凭记忆抄"而找不到，
    // 但同批的替换/插入都是好的——原来整份放弃，用户看到的就是"它又没删掉，还什么都没变"。
    // 现在：只有"非删除类"失败时才整份放弃；删除类失败则放行其余改动，并把这处标出来重试。
    var delFailed = res.failed.filter(function (f) { return refineIsDeleteType(String(f.ch && f.ch['类型'] || '')) || String(f.ch && f.ch['新内容'] || '').indexOf(REFINE_DEL_MARK) >= 0; });
    var hardFailed = res.failed.filter(function (f) { return delFailed.indexOf(f) < 0; });
    if (!res.ok && hardFailed.length) {
      // all-or-nothing：任何一处锚点不唯一/找不到，就整份放弃，绝不留半份改动
      ST.refine.lastFailed = res.failed.map(function (f) { return { anchor: String(f.ch && (f.ch['锚点'] || '')), why: f.why, hint: f.hint || '' }; });
      lines.push('❌ ' + stepLabel + ' 的补丁未通过校验，已整体放弃（工作稿未被改动）：');
      // 同一批里的删除失败也一并说清，否则用户会以为"删除被悄悄吞了"
      delFailed.forEach(function (f) {
        lines.push('  · 第 ' + (f.i + 1) + ' 处（删除）：' + f.why);
        lines.push('    ↳ 本条要删的内容与上面的失败一起被搁置了，重试时会重新尝试。');
      });
      res.failed.forEach(function (f) {
        lines.push('  · 第 ' + (f.i + 1) + ' 处：' + f.why);
        lines.push('    锚点：' + String(f.ch && (f.ch['锚点'] || '')).slice(0, 160).replace(/\n/g, '⏎'));
        if (f.hint) {
          lines.push('    ↳ 原文里最接近的一段是：');
          String(f.hint).split('\n').forEach(function (l) { lines.push('        ' + l); });
          lines.push('    （已记下：点「↻ 重新生成这一步」时会连着这段原文一起交给模型，让它直接用这段当锚点）');
        } else {
          lines.push('    ↳ 原文里没找到足够接近的片段——这一步的范围可能写得太笼统，可回 ② 页补一句"改哪一节、改哪几句"再重来。');
        }
      });
      lines.push('\n对策：');
      lines.push('  · 锚点找不到 → 直接点「↻ 重新生成这一步」（会附上上面那段原文让它照抄）；');
      lines.push('  · 锚点出现多次 → 需要更长的锚点（可回 ② 页把这一步的范围写得更具体）；');
      lines.push('  · 若本步内容确实太大 → 点「✂ 拆细本步（更小上限）」。');
      if (ao) ao.textContent = lines.join('\n');
      ST.refine.appliedText = lines.join('\n');
      toast('本步锚点校验失败，已整体放弃；提示里给出了原文最接近的片段，直接点「↻ 重新生成这一步」即可', 'error');
      refineNote('③ ' + stepLabel + ' 锚点校验失败（已记下最接近的原文片段）');
      refineSyncButtons();
      return;
    }
    ST.refine.lastFailed = null;
    // 落地到工作稿
    ST.refine.working = res.text;
    if (cur) { cur.done = true; ST.refine.stepIndex = Math.min(si + 1, steps.length); }
    var fid = refineFidelity(src, ST.refine.working, req);
    var diffText = refineRenderDiff(src, ST.refine.working, fid.diff);
    var fLines = [];
    fLines.push('保真校验（脚本逐项核对，' + fid.checks.length + ' 项）　—— 对比的是「原始文本」与「当前工作稿（含全部已完成步骤）」');
    fid.checks.forEach(function (c) { fLines.push('  ' + (c.ok ? '✓' : '⚠') + ' ' + c.k + '：' + c.v); });
    fLines.push('');
    fLines.push('行级统计：未变动 ' + fid.stats.same + ' 行 ｜ 新增 ' + fid.stats.add + ' 行 ｜ 删除 ' + fid.stats.del + ' 行');
    var srcLines = src.split(/\r?\n/).length;
    fLines.push('保真度：' + (srcLines ? Math.round(fid.stats.same / srcLines * 1000) / 10 : 0) + '% 的原有行原样保留');
    lines.push('✓ ' + stepLabel + ' 已落地：' + res.applied.length + ' 处变更（格式：' + parsed.format + '）');
    res.applied.forEach(function (a, i) {
      lines.push('  ' + (i + 1) + '. [' + a.type + '] ' + (a.why || ''));
      lines.push('     锚点：' + a.anchor.slice(0, 100).replace(/\n/g, '⏎') + '　（定位方式：' + a.how + (a.degraded ? ' ⚠ 近似' : '') + '）');
      // 删除要能看到"删掉了什么"，否则用户没法核对是不是删对了（绝不静默删除）
      if (a.delLines) lines.push('     − 已删除 ' + a.delLines + ' 行：' + String(a.delText || '').slice(0, 200).replace(/\n/g, '⏎') + (String(a.delText || '').length > 200 ? ' …' : ''));
      else lines.push('     新内容：' + a.next.slice(0, 200).replace(/\n/g, '⏎') + (a.next.length > 200 ? ' …' : ''));
    });
    if (delFailed.length) {
      lines.push('');
      lines.push('⚠ 有 ' + delFailed.length + ' 处**删除没能定位**（原内容保留，未删成）：');
      delFailed.forEach(function (f) {
        lines.push('  · 第 ' + (f.i + 1) + ' 处：' + f.why);
        lines.push('    锚点：' + String(f.ch && (f.ch['锚点'] || '')).slice(0, 160).replace(/\n/g, '⏎'));
        if (f.hint) lines.push('    ↳ 原文里最接近的一段是：' + String(f.hint).split(/\r?\n/)[0].slice(0, 120) + '（其余见下方差异预览）');
      });
      lines.push('  对策：点「📍 只重跑定位」或「↻ 重新生成这一步」，会带上最近似的原文让它照抄锚点再删一次。');
    }
    if (res.degraded) lines.push('\n⚠ 有 ' + res.degraded + ' 处是**近似定位**（锚点与原文有空白差异，或退化为按行定位）——请重点看下面的差异预览确认位置对不对。');
    // EJS 完整性：送进去几处标签、这次回来几处，少了就点名（EJS 被管线吃掉是这一页最隐蔽的坑）
    var ejsWarn = (typeof opfEjsWarn === 'function') ? opfEjsWarn('') : '';
    if (ejsWarn) lines.push('\n' + ejsWarn);
    if (ST.refine.taintWarn && ST.refine.taintWarn.length) lines.push('\n⚠ 材料隔离：本次有 ' + ST.refine.taintWarn.length + ' 段新内容疑似来自世界设定参考（你选择了仍然落地）——请核对它们是否本该属于这个核心。');
    else if (pool.length) lines.push('\n✓ 材料隔离核对通过：新内容里没有出现"只在世界参考里才有"的内容（参考池 ' + pool.length + ' 段）。');
    if (parsed.tail) lines.push('\n模型附注：' + parsed.tail);
    var remain = steps.length - ST.refine.stepIndex;
    if (steps.length) {
      lines.push('');
      lines.push('进度：' + ST.refine.stepIndex + '/' + steps.length + ' 步已完成'
        + (remain > 0 ? '。**先看一眼下面的差异预览与保真校验**，确认无误后点「✓ 继续第 ' + (ST.refine.stepIndex + 1) + ' 步」。' : '。全部步骤已完成，可以复制/下载成品了。'));
      steps.forEach(function (s, i) { lines.push('   ' + (s.done ? '✓' : (i === ST.refine.stepIndex ? '▶' : '·')) + ' ' + (i + 1) + '. ' + (s.title || '') + (s.detail ? '——' + s.detail : '')); });
    }
    lines.push('\n（原始文本一直是原文，这里只是生成了一份工作稿；不满意点「↩ 回退到原文」即可）');
    if (ao) ao.textContent = lines.join('\n');
    var fi = getEl('opf-rf-fidelity'); if (fi) { fi.textContent = fLines.join('\n'); fi.style.display = 'block'; }
    var df = getEl('opf-rf-diff'); if (df) { df.textContent = '差异预览（- 原文 / + 当前工作稿）\n\n' + diffText; df.style.display = 'block'; }
    ST.refine.result = ST.refine.working; ST.refine.applied = res.applied; ST.refine.diff = diffText;
    ST.refine.fidelity = fid; ST.refine.fidelityText = fLines.join('\n'); ST.refine.diffText = diffText; ST.refine.appliedText = lines.join('\n');
    ST.refine.sizeCap = sizeCap;
    var ta = getEl('opf-rf-result'); if (ta) ta.value = ST.refine.working;
    refineRender(); refineCacheSave(); refineSyncButtons();
    var warn = fid.checks.filter(function (c) { return !c.ok; }).length;
    toast(warn ? (stepLabel + ' 已落地 ' + res.applied.length + ' 处，但保真校验有 ' + warn + ' 项需你看一眼')
      : (stepLabel + ' 已落地 ' + res.applied.length + ' 处变更，保真校验通过'), warn ? 'warning' : 'success');
    refineNote('③ ' + stepLabel + ' 完成' + (remain > 0 ? '（还剩 ' + remain + ' 步）' : '（全部完成）') + (warn ? '（' + warn + ' 项待核对）' : ''));
  } catch (e) { toast('置入出错：' + (e && e.message ? e.message : e), 'error'); refineNote('置入失败'); }
  finally { ST.running = false; renderRunButtons(); }
}
// 按当前状态刷新 ③ 区按钮文案（分步时显示"第 N 步"）
function refineSyncButtons(){
  refineInit();
  var steps = ST.refine.steps || [];
  var si = ST.refine.stepIndex || 0;
  var b = getEl('opf-rf-apply');
  if (b) {
    b.textContent = steps.length
      ? (si >= steps.length ? '✓ 全部步骤已完成' : '✓ 确认无误，执行第 ' + (si + 1) + '/' + steps.length + ' 步')
      : '✓ 确认无误，置入';
    b.disabled = steps.length > 0 && si >= steps.length;
  }
  var r = getEl('opf-rf-retrystep');
  // 只要已经有改法/分步计划，就始终给出「重新生成这一步」——失败时用户第一眼就要能找到它
  if (r) r.style.display = (ST.refine.plan || (ST.refine.steps && ST.refine.steps.length)) ? '' : 'none';
  var rl = getEl('opf-rf-relocate');
  if (rl) rl.style.display = (ST.refine.pendingGen && ST.refine.pendingGen.length) ? '' : 'none';
}
function refineCacheSave(){
  if (refineCacheSave._t) clearTimeout(refineCacheSave._t);
  refineCacheSave._t = setTimeout(function () {
    if (!ST.refine) return;
    lsSet(NS + '_refine_v1', { name: ST.refine.name, src: ST.refine.src, scan: ST.refine.scan, analysis: ST.refine.analysis, analysisObj: ST.refine.analysisObj, request: ST.refine.request, plan: ST.refine.plan, planObj: ST.refine.planObj, result: ST.refine.result, applied: ST.refine.applied, fidelityText: ST.refine.fidelityText, diffText: ST.refine.diffText, appliedText: ST.refine.appliedText });
  }, 600);
}
function refineCacheRestore(){
  refineInit();
  var c = lsGet(NS + '_refine_v1');
  if (!c || !c.src) return;
  ST.refine.name = c.name || ''; ST.refine.src = c.src; ST.refine.scan = c.scan || refineScan(c.src).text;
  ST.refine.analysis = c.analysis || ''; ST.refine.analysisObj = c.analysisObj || null;
  ST.refine.request = c.request || ''; ST.refine.plan = c.plan || ''; ST.refine.planObj = c.planObj || null;
  ST.refine.result = c.result || ''; ST.refine.applied = c.applied || [];
  ST.refine.fidelityText = c.fidelityText || ''; ST.refine.diffText = c.diffText || ''; ST.refine.appliedText = c.appliedText || '';
  var set = function (id, v) { var e = getEl(id); if (e && v != null) e.value = v; };
  set('opf-rf-src', ST.refine.src); set('opf-rf-req', ST.refine.request); set('opf-rf-result', ST.refine.result);
  refineRender();
}