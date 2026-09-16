//@module 70-refine-core — ⑦ 命定核心精修：分析/补丁/锚点/保真校验（逻辑层）
// ============================================================================
// 脚本封装（v1.11.3）：正文结构一律由代码拼装，模型不生产成品
// 版式依据世界书 22 个命定系统条目的真实结构：<系统名> 包裹 + 与标签同名的一级键
// + 2 空格缩进的一级节（定义/核心机制/隐蔽原则/命运点数(FP)/{灵名}/{灵名}语言格式）
// + 闭合标签之后逐条十槽。模型只写分段，拼装、缩进、槽位排序、包裹标签全由代码完成，
// 从根上消掉「漏槽/错序/标签不闭合/段落丢失/夹 markdown」这一整类 bug。
// ============================================================================
var DEST_ASSEMBLE_MAP = [
  { seg: 'pact',   header: null,               indent: 2, aliases: ['契约与核心机制', '定义与核心机制', '核心机制与契约', '核心机制', '契约', '定义'] },
  { seg: 'fp',     header: '命运点数(FP)',     indent: 4, aliases: ['命运点数(FP)', '命运点数（FP）', '命运点数规则', '命运点数', 'FP'] },
  { seg: 'spirit', header: '{核心名}',         indent: 4, aliases: ['命定之灵', '灵', '灵格'] },
  { seg: 'voice',  header: '{核心名}语言格式', indent: 4, aliases: ['语言格式', '命定之灵语言格式', '{核心名}语言格式'] }
];
function destSegOf(id) {
  var hit = null;
  try { destSegs().forEach(function (s) { if (s.id === id) hit = s; }); } catch (e) {}
  return hit || { id: id, title: id, short: '' };
}
function destAsmRule(id) { return DEST_ASSEMBLE_MAP.filter(function (x) { return x.seg === id; })[0] || { seg: id, header: null, indent: 2, aliases: [] }; }
function destNormLabel(s) { return String(s || '').replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/^【|】$/g, '').replace(/[:：]\s*$/, '').replace(/\s+/g, '').trim(); }
// 去掉模型抄回来的分段名标签与整段代码块包裹；markdown 装饰另由 destCleanMarkdown 处理
function destSegCleanup(text, seg) {
  var t = String(text || '');
  var F = fence();
  var fenced = t.match(new RegExp('^\\s*' + F + '[a-zA-Z]*\\s*\\n([\\s\\S]*?)\\n?' + F + '\\s*$'));
  if (fenced) t = fenced[1];
  var rule = destAsmRule(seg.id);
  var aliases = [seg.title, String(seg.title || '').replace(/\(.*?\)/g, ''), seg.short].concat(rule.aliases)
    .filter(Boolean).map(destNormLabel);
  var lines = t.split(/\r?\n/);
  for (var pass = 0; pass < 3; pass++) {
    var i0 = -1;
    for (var i = 0; i < lines.length && i < 6; i++) { if (lines[i].trim()) { i0 = i; break; } }
    if (i0 < 0) break;
    if (aliases.indexOf(destNormLabel(lines[i0])) < 0) break;
    lines.splice(i0, 1);
  }
  return lines.join('\n').replace(/^\n+/, '').replace(/[ \t]+$/, '').replace(/\s+$/, '');
}
// 把一段内容整体平移缩进：先去掉公共最小缩进，再统一加上 base 个空格（相对结构不变，块标量安全）
function destShiftIndent(text, base) {
  var lines = String(text || '').split(/\r?\n/);
  var min = -1;
  lines.forEach(function (l) { if (!l.trim()) return; var n = (l.match(/^ */) || [''])[0].length; if (min < 0 || n < min) min = n; });
  if (min < 0) return '';
  var pad = new Array(Math.max(0, base) + 1).join(' ');
  var res = lines.map(function (l) { return l.trim() ? pad + l.slice(min).replace(/[ \t]+$/, '') : ''; }).join('\n');
  return res.replace(/^\n+/, '').replace(/\n+$/, '');
}
// 按花括号配对抽出 {{setvar::名::值}} 整块（值里可能还有 {{…}} 与换行）
function destExtractSlots(text) {
  var s = String(text || ''), map = {}, order = [], idx = 0;
  for (;;) {
    var start = s.indexOf('{{setvar::', idx);
    if (start < 0) break;
    var depth = 0, i = start, end = -1;
    while (i < s.length) {
      if (s.slice(i, i + 2) === '{{') { depth++; i += 2; continue; }
      if (s.slice(i, i + 2) === '}}') { depth--; i += 2; if (depth === 0) { end = i; break; } continue; }
      i++;
    }
    if (end < 0) break;
    var block = s.slice(start, end);
    var nm = (block.match(/^\{\{setvar::([^:]+)::/) || [])[1];
    if (nm) { nm = nm.trim(); if (!map[nm]) { map[nm] = block; order.push(nm); } }
    idx = end;
  }
  return { map: map, order: order };
}
// 槽位区扫描：按出现顺序返回 slot / raw 两类条目。
// raw = 夹在十槽之间的 {{…}} 标记行（如 {{//自定义配置}}）——必须原样保留，不能因为
// "只认 {{setvar::}}" 就把它吃掉（这正是"内容静默丢失"的一类）。
function destScanSlotRegion(text) {
  var s = String(text || ''), items = [], idx = 0, guard = 0;
  for (;;) {
    if (guard++ > 500) break;
    var start = s.indexOf('{{setvar::', idx);
    var pre = start < 0 ? s.slice(idx) : s.slice(idx, start);
    pre.split(/\r?\n/).forEach(function (l) {
      var t = l.trim();
      if (/^\{\{[\s\S]*\}\}$/.test(t) && !/^\{\{setvar::/.test(t)) items.push({ kind: 'raw', text: t });
    });
    if (start < 0) break;
    var depth = 0, i = start, end = -1;
    while (i < s.length) {
      if (s.slice(i, i + 2) === '{{') { depth++; i += 2; continue; }
      if (s.slice(i, i + 2) === '}}') { depth--; i += 2; if (depth === 0) { end = i; break; } continue; }
      i++;
    }
    if (end < 0) break;
    var block = s.slice(start, end);
    var nm = (block.match(/^\{\{setvar::([^:]+)::/) || [])[1];
    if (nm) items.push({ kind: 'slot', name: nm.trim(), block: block });
    idx = end;
  }
  return items;
}
// 十槽允许写在任何分段里（模型有时把它们塞进 slots 段之外），全分段收集
function destHarvestSlots() {
  var map = {}, from = {}, pre = {}, order = [], extras = [], tail = [];
  destSegs().forEach(function (s) {
    var t = (ST.dest && ST.dest.segs) ? ST.dest.segs[s.id] : null;
    if (!t) return;
    var pending = [];
    destScanSlotRegion(t).forEach(function (it) {
      if (it.kind === 'raw') { pending.push(it.text); return; }
      if (DEST_SLOT_ORDER.indexOf(it.name) < 0) {
        if (!extras.some(function (x) { return x.name === it.name; })) extras.push({ name: it.name, block: it.block, pre: pending.slice() });
        pending = [];
        return;
      }
      if (map[it.name]) { pending = []; return; }
      map[it.name] = it.block; from[it.name] = s.title; pre[it.name] = pending.slice();
      order.push(it.name);
      pending = [];
    });
    tail = tail.concat(pending);
  });
  return { map: map, from: from, pre: pre, order: order, extras: extras, tail: tail };
}
function destSlotInner(block) {
  var m = String(block || '').match(/^\{\{setvar::[^:]+::([\s\S]*)\}\}$/);
  return m ? m[1].trim() : '';
}
// 从「骨架与命名」段的列表/键值里取值
function destFrameValue(t, names) {
  var lines = String(t || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
    for (var k = 0; k < names.length; k++) {
      var m = l.match(new RegExp('^' + names[k] + '\\s*[:：]\\s*(.+)$'));
      if (m) {
        var v = m[1].trim().replace(/^["'「『]/, '').replace(/["'」』]$/, '').trim();
        if (v && !/^(?:待定|未知|无|none)$/i.test(v)) return v;
      }
    }
  }
  return '';
}
// 兜底：从任何分段里找第一个像包裹标签的 <中文/英文名>（排除 <user> 与 HTML 标签）
function destGuessSystemName() {
  var skip = ['user', 'br', 'p', 'div', 'span', 'style', 'state_bar', '复活机制', '物品', '名称', '品质', '类型', '物品简介', '吐槽', '对白'];
  var hit = '';
  ['frame', 'pact', 'voice'].forEach(function (id) {
    if (hit) return;
    var t = (ST.dest.segs && ST.dest.segs[id]) || '';
    var re = /<([A-Za-z\u4e00-\u9fa5_]{2,12})>/g, m;
    while ((m = re.exec(t)) !== null) {
      var n = m[1];
      if (skip.indexOf(n) >= 0 || skip.indexOf(n.toLowerCase()) >= 0) continue;
      hit = n; break;
    }
  });
  return hit;
}
function destAssemble() {
  var notes = [], info = { sections: [], slots: [], missing: [], wrapper: '', chars: 0, hooks: '', ejs: 0 };
  var segs = {};
  destSegs().forEach(function (s) { if (ST.dest && ST.dest.segs && ST.dest.segs[s.id]) segs[s.id] = ST.dest.segs[s.id]; });
  if (!segs.pact && !segs.fp && !segs.spirit && !segs.voice) return { body: '', notes: ['还没有任何正文分段内容，请先「▶ 分段初稿」'], info: info };
  var slots = destHarvestSlots();
  var sysFromMeta = destFrameValue(segs.frame, ['系统名', '系统名称', '包裹标签名', '标签名'])
    || (slots.map['系统名'] ? destSlotInner(slots.map['系统名']) : '');
  var sysName = sysFromMeta || destGuessSystemName() || '';
  var coreName = destFrameValue(segs.frame, ['系统核心名', '核心名', '灵名', '系统灵名'])
    || (slots.map['系统核心名'] ? destSlotInner(slots.map['系统核心名']) : '') || '';
  var coreId = destFrameValue(segs.frame, ['系统核心'])
    || (slots.map['系统核心'] ? destSlotInner(slots.map['系统核心']) : '') || '';
  if (!sysName) { sysName = '未命名系统'; notes.push('没能从「骨架与命名」段读出「系统名」，包裹标签暂用「未命名系统」——请在分段里补上系统名后重新拼装'); }
  else if (!sysFromMeta) notes.push('「系统名」是由脚本从分段正文里猜出的（' + sysName + '），请核对');
  if (!coreName) { coreName = '命定之灵'; notes.push('没能读出「系统核心名」，一级节暂用通用名「命定之灵」'); }
  info.wrapper = sysName;
  var clean = function (id) {
    var t = destSegCleanup(segs[id], destSegOf(id));
    // 分段里模型可能把包裹标签/一级键也抄了回来 → 一律剥掉（包裹结构由拼装负责）
    var keep = [];
    t.split(/\r?\n/).forEach(function (l) {
      var s2 = l.trim();
      if (s2 === '<' + sysName + '>' || s2 === '</' + sysName + '>' || s2 === sysName + ':') return;
      keep.push(l);
    });
    t = keep.join('\n');
    var c = destCleanMarkdown(t);
    if (c.stats.bold + c.stats.head + c.stats.star + c.stats.rule + c.stats.tick > 0) {
      notes.push('「' + destSegOf(id).title + '」里清掉了 ' + (c.stats.bold + c.stats.head + c.stats.star + c.stats.rule + c.stats.tick) + ' 处 markdown 装饰（硬约束禁止）');
    }
    return c.text;
  };
  var out = ['<' + sysName + '>', sysName + ':'];
  var pushBlock = function (text, indent) { var t = destShiftIndent(text, indent); if (t.trim()) out.push(t); };
  var pushHead = function (h, indent) { if (h) out.push(new Array(indent + 1).join(' ') + h + ':'); };
  if (segs.pact) { pushBlock(clean('pact'), 2); info.sections.push('契约与核心机制'); }
  if (segs.fp) { out.push(''); pushHead('命运点数(FP)', 2); pushBlock(clean('fp'), 4); info.sections.push('命运点数(FP)'); }
  if (segs.spirit) { out.push(''); pushHead(coreName, 2); pushBlock(clean('spirit'), 4); info.sections.push(coreName); }
  if (segs.voice) { out.push(''); pushHead(coreName + '语言格式', 2); pushBlock(clean('voice'), 4); info.sections.push(coreName + '语言格式'); }
  out.push('</' + sysName + '>');
  var slotLines = [], carry = [];
  var emitRaw = function (arr) { (arr || []).forEach(function (m) { if (m) slotLines.push(String(m).trim()); }); };
  var normBlock = function (b) { return String(b).split(/\r?\n/).map(function (l) { return l.replace(/[ \t]+$/, ''); }).join('\n').trim(); };
  DEST_SLOT_ORDER.forEach(function (n) {
    var b = slots.map[n];
    if (!b) {
      if (n === '系统名') b = '{{setvar::系统名::' + sysName + '}}';
      else if (n === '系统核心名') b = '{{setvar::系统核心名::' + coreName + '}}';
      else if (n === '系统核心' && coreId) b = '{{setvar::系统核心::' + coreId + '}}';
      else { info.missing.push(n); carry = carry.concat(slots.pre[n] || []); return; }
      notes.push('槽位「' + n + '」在原分段里缺失，已由脚本按命名段补上（值请核对）');
    }
    emitRaw(carry); carry = [];
    emitRaw(slots.pre[n]);
    slotLines.push(normBlock(b));
    info.slots.push(n);
  });
  emitRaw(carry); emitRaw(slots.tail);
  (slots.extras || []).forEach(function (x) {
    emitRaw(x.pre);
    slotLines.push(normBlock(x.block));
    info.extraSlots = (info.extraSlots || []).concat([x.name]);
  });
  if (info.extraSlots && info.extraSlots.length) notes.push('检测到 ' + info.extraSlots.length + ' 个非标准槽位（' + info.extraSlots.join('、') + '），已原样附在十槽之后（额外变量钩子属于这种）');
  if (info.missing.length) notes.push('十槽缺 ' + info.missing.length + ' 条：' + info.missing.join('、') + '——可点「🔎 AI 检查」定位，或回到「十个变量槽」段重跑');
  var body = out.filter(function (l, i) { return !(l === '' && out[i - 1] === ''); }).join('\n');
  if (slotLines.length) body += '\n' + slotLines.join('\n');
  if (segs.hooks && !/^\s*无[。．.]?\s*$/.test(segs.hooks)) {
    info.hooks = destSegCleanup(segs.hooks, destSegOf('hooks'));
    notes.push('「可选扩展」段未并入正文（命运抽卡等属于独立条目，order 1103）——内容单独放在下方「附：可选扩展」里');
  }
  var ejsIds = ['ejs1', 'ejs2', 'ejs3'].filter(function (id) { return segs[id]; });
  if (ejsIds.length) {
    info.ejs = ejsIds.length;
    ejsIds.forEach(function (id) { body += '\n\n' + String(segs[id]).trim(); });
    notes.push('EJS 重型核心：' + ejsIds.length + ' 段 EJS 已按顺序附在正文末尾。EJS 块的实际插入位置需要人工确认（或改用「🧠 AI 整合」）');
  }
  info.chars = body.length;
  return { body: body, notes: notes, info: info };
}
function destAssembleNote(){
  var i = ST.dest && ST.dest.asmInfo;
  if (!i) return '';
  return '脚本拼装：包裹标签 <' + i.wrapper + '>｜一级节 ' + i.sections.length + ' 个（' + i.sections.join(' / ') + '）｜十槽 ' + i.slots.length + '/10'
    + (i.ejs ? '｜EJS ' + i.ejs + ' 段' : '');
}
function destFinalizeScript(silent){
  var asm = destAssemble();
  if (!asm.body) { if (!silent) toast(asm.notes[0] || '还没有可拼装的分段内容', 'warning'); return false; }
  ST.dest.body = asm.body;
  ST.dest.out = destBuildFrame(asm.body);
  ST.dest.outNote = destLint(asm.body).concat(destEjsLint(asm.body)).concat(asm.notes);
  ST.dest.asmInfo = asm.info;
  var outEl = getEl('opf-dest-out'); if (outEl) outEl.textContent = ST.dest.out;
  var noteEl = getEl('opf-dest-outnote'); if (noteEl) noteEl.textContent = destNoteText();
  var exEl = getEl('opf-dest-extras');
  if (exEl) {
    exEl.textContent = asm.info.hooks ? asm.info.hooks : '（本次「可选扩展」段为空或写了「无」）';
    exEl.style.display = asm.info.hooks ? 'block' : 'none';
  }
  destDraftCacheSave();
  if (!silent) {
    var bad = ST.dest.outNote.filter(function (x) { return !/未并入正文|markdown 装饰/.test(x); });
    toast('脚本封装完成（零 AI）：' + destAssembleNote() + (bad.length ? '｜' + bad.length + ' 条自检提示见输出区上方' : '｜自检通过'), bad.length ? 'warning' : 'success');
  }
  return true;
}
function destTierPrices(t){  // 兼容两种写法：「一层级200 | 二500 | 三2500 …」与「第一层级: 500 FP」
  var s = String(t).replace(/([一二三四五六])(\d{2,7})/g, '$1层级$2');
  var map = {};
  s.split(/\r?\n/).forEach(function (ln) {
    var re = /([一二三四五六])层级[^0-9\n]{0,8}(\d{2,7})/g, m;
    while ((m = re.exec(ln)) !== null) {
      var v = Number(m[2]);
      if (v < 100) continue;
      if (map[m[1]] == null) map[m[1]] = v;
    }
  });
  return map;
}
function destSectionLines(t, headerRe, itemRe, indent){
  var lines = String(t).split(/\r?\n/), out = [], on = false, depth = 0;
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    if (!on) {
      if (headerRe.test(l)) { on = true; depth = (l.match(/^ */) || [''])[0].length; }
      continue;
    }
    var ind = (l.match(/^ */) || [''])[0].length;
    if (l.trim() && ind <= depth) break;
    if (itemRe.test(l)) out.push(l.trim());
  }
  return out;
}
function destLangSection(t){
  return destSectionLines(t, /语言格式/, /[\s\S]/, 0).join('\n');
}
function destLint(text){
  var warns = [];
  var t = String(text || '');
  if (!t.trim()) return ['条目正文为空'];
  var m;
  var found = [];
  var re = /\{\{setvar::([^:]+)::/g;
  while ((m = re.exec(t)) !== null) { var nm = m[1].trim(); if (DEST_SLOT_ORDER.indexOf(nm) >= 0 && found.indexOf(nm) < 0) found.push(nm); }
  var missing = DEST_SLOT_ORDER.filter(function (n) { return found.indexOf(n) < 0; });
  if (missing.length) warns.push('缺少 setvar：' + missing.join('、') + '（若你的核心用 EJS/setLocalVar 动态写入这些变量，本条可忽略）');
  var minIdx = -1, outOfOrder = false;
  found.forEach(function (n) { var i = DEST_SLOT_ORDER.indexOf(n); if (i < minIdx) outOfOrder = true; if (i > minIdx) minIdx = i; });
  if (outOfOrder) warns.push('setvar 顺序不符合规定（应为 系统名→系统核心名→系统核心→fp定义→爆料风格→登神长阶→生命层级→技能获取→经验值获取→复活机制）');
  var opens = (t.match(/\{\{setvar::/g) || []).length;
  var closes = (t.match(/\}\}/g) || []).length;
  if (opens > closes) warns.push('有 setvar 未闭合（{{setvar:: 与 }} 数量不符）');
  var sn = destSlotValue(t, '系统名');
  if (!sn) warns.push('无法解析「系统名」的值');
  else if (t.indexOf('<' + sn + '>') < 0 || t.indexOf('</' + sn + '>') < 0) warns.push('正文块包裹标签名与「系统名」(' + sn + ') 不一致或有开无闭——《战斗&生产规则》会读不到核心机制');
  if (DEST_KNOWN_SYSNAMES.indexOf(sn) >= 0 && sn !== '命定之诗') warns.push('「系统名」与现有核心相同：' + sn + '（二者不会同时启用时影响不大，但建议自创一个包裹标签名）');
  var tierOrder = ['一', '二', '三', '四', '五', '六'];
  var prices = destTierPrices(t);
  var got = tierOrder.filter(function (c) { return prices[c] != null; });
  if (got.length < 6) {
    warns.push('缔结契约消耗档位不全（识别到 ' + got.length + '/6 档：' + tierOrder.map(function (c) { return c + (prices[c] != null ? prices[c] : '?'); }).join(' ') + '）——应给出第一~第六层级，第七层级不标价');
  } else {
    var nums = tierOrder.map(function (c) { return prices[c]; });
    for (var i = 1; i < nums.length; i++) {
      if (nums[i] <= nums[i - 1]) { warns.push('缔结契约消耗未随层级递增：' + tierOrder.map(function (c, j) { return c + '层级' + nums[j]; }).join(' / ')); break; }
    }
    if (nums[0] !== 200 || nums[1] !== 500 || nums[2] !== 2500 || nums[3] !== 10000 || nums[4] !== 50000 || nums[5] !== 150000) {
      warns.push('使用的是自定义消耗档位（' + nums.join(' / ') + '，主流默认档为 200/500/2500/10000/50000/150000）——确认是有意为之即可');
    }
  }
  if (/\b(common|uncommon|rare|epic|legendary|mythic)\b/i.test(t)) warns.push('出现英文品级，规范要求中文七等');
  var core = destSlotValue(t, '系统核心');
  if (core && DEST_KNOWN_CORES.indexOf(core) >= 0) warns.push('「系统核心」与现有核心重名：' + core);
  var tags = [];
  var tre = /<([A-Za-z_][A-Za-z0-9_]*)[\s>/]/g;
  while ((m = tre.exec(t)) !== null) { if (tags.indexOf(m[1]) < 0) tags.push(m[1]); }
  var clash = tags.filter(function (x) { return DEST_KNOWN_TAGS.indexOf(x) >= 0; });
  if (clash.length) warns.push('语言格式标签与现有核心冲突：' + clash.join('、'));
  var rev = destSlotValue(t, '复活机制');
  if (!rev) warns.push('复活机制为空（《复活机制》条目会变成空条目；若该核心刻意不给复活机制，本条可忽略）');
  else if (!/机械降神/.test(rev)) warns.push('复活机制缺少“禁止为<user>在战斗中改变设定/创造有利条件/机械降神”约束句');
  if (!/隐蔽原则/.test(t)) warns.push('缺少「隐蔽原则」');
  if (!/非万能原则/.test(t)) warns.push('缺少「非万能原则」（命定之灵必须拒绝功能表之外的要求；null 型无灵核心可忽略）');
  // ---- 标准骨架校验（依据 22 个核心普查）----
  var personaMiss = [['形象', /形象|形态|外貌/], ['性格', /性格/], ['定位', /定位/], ['说话风格', /说话风格|对话风格/], ['爱好', /爱好|喜好/], ['愿望', /愿望/]]
    .filter(function (x) { return !x[1].test(t); }).map(function (x) { return x[0]; });
  if (personaMiss.length) warns.push('「人设」缺标准字段：' + personaMiss.join('、') + '（标准六字段：形象/性格/定位/说话风格/爱好/愿望）');
  var fnItems = destSectionLines(t, /^\s{0,6}(功能|能力)/, /^\s*[-•]\s+\S/);
  if (fnItems.length) {
    if (fnItems.length < 6 || fnItems.length > 12) warns.push('功能表 ' + fnItems.length + ' 条（标准 8 条，实测区间 7~11）');
    var fnText = fnItems.join('\n');
    var famMiss = [];
    if (!/瞬发|速成|顿悟|瞬间(掌握|学会|领悟)|智慧源泉|祈愿传承/.test(fnText)) famMiss.push('技能瞬发学习');
    if (!/背包|行囊|口袋|匣|肚肚|收纳|储物|侧袋|提灯|空间装备/.test(fnText)) famMiss.push('储物/背包');
    if (!/感知|洞察|搜寻|扫描|千里眼|情报/.test(fnText)) famMiss.push('感知/情报');
    if (!/意识|心灵连线/.test(fnText)) famMiss.push('意识交流');
    if (!/融合|熔铸|缝合/.test(fnText)) famMiss.push('技能融合/升级');
    if (!/登神/.test(fnText)) famMiss.push('登神长阶辅助');
    if (!/抽卡|抽取|宝库/.test(fnText)) famMiss.push('命运抽卡');
    if (famMiss.length) warns.push('功能表未覆盖标准功能族：' + famMiss.join('、'));
    if (/\(消耗fp\)/.test(fnText)) warns.push('功能表消耗标注建议统一为 (消耗FP)（现为小写 fp）');
  } else warns.push('未识别到「功能(以下功能不进行任何检定)」功能表');
  var langBlk = destLangSection(t);
  if (langBlk) {
    var exN = (langBlk.match(/^\s*-\s+/gm) || []).length
      + (langBlk.match(/^\s*>[^\n]*「/gm) || []).length
      + (langBlk.match(/^\s*<[A-Za-z_][A-Za-z0-9_]*[\s>]/gm) || []).length;
    if (exN < 6) warns.push('语言格式范例偏少（识别到 ' + exN + ' 条；建议 ≥6 条并覆盖 日常/战斗危机/FP不足/缔结成功/拒绝越界/特殊情绪，梅林核心 8 条为范本）');
    if (/<[A-Za-z_][A-Za-z0-9_]*\s+name=/.test(langBlk) && !/参数说明/.test(langBlk)) warns.push('XML 标签式语言格式缺少「参数说明」节（mood 枚举需固定取值、从中选一）');
  } else warns.push('缺少「{灵名}语言格式」节');
  if (!/核心机制|权柄|关键能力/.test(t)) warns.push('缺少核心机制节（标准名「核心机制」）');
  if (!/命运点数|命定点数/.test(t)) warns.push('缺少命运点数(FP)节（标准名「命运点数(FP)」）');
  if (/\t/.test(t)) warns.push('含制表符(Tab)，标准为两空格缩进');
  // ---- 输出格式·装饰检查（跳过 setvar 槽位：其中 `# 体系名的加护` 是既有惯例）----
  var masked = destMaskSetvars(t);
  var nHead = (masked.match(/^\s*#{1,6}\s+\S/gm) || []).length;
  if (nHead) warns.push('出现 markdown 标题 ' + nHead + ' 处（# / ##…）：结构请用「中文键名: 值 + 两空格缩进」，不要用标题分级');
  var nBold = (masked.match(/\*\*[^*\n]+\*\*/g) || []).length;
  if (nBold) warns.push('出现 **加粗** ' + nBold + ' 处：命定系统条目不用 markdown 强调，要强调就把话说清楚');
  var nStar = (masked.match(/^\s*[*+]\s+\S/gm) || []).length;
  if (nStar) warns.push('列表用了 * 或 + 共 ' + nStar + ' 处：统一改成「- 」（YAML 列表符）');
  var nRule = (masked.match(/^\s*([-*_])\1{2,}\s*$/gm) || []).length;
  if (nRule) warns.push('出现 --- 分隔线 ' + nRule + ' 处：删除（YAML 里会被当成文档分隔符）');
  var nTable = (masked.match(/^\s*\|.*\|\s*$/gm) || []).length;
  if (nTable) warns.push('出现 markdown 表格 ' + nTable + ' 行：改为键值或列表');
  if (t.length < 4000) warns.push('正文偏短（' + t.length + ' 字符，建议 4000~8000）');
  if (t.length > 12000) warns.push('正文偏长（' + t.length + ' 字符，建议 4000~8000，上限 12000）');
  if (/生命层级[：:]\s*第|^\s*属性[：:]/m.test(t) || /reincarnationPoints|开局预设|开局剧情/.test(t)) warns.push('出现角色卡或开局预设字段（本条目只写系统本身）');
  return warns;
}
function reLintDest(){
  if (!ST.dest.body) { toast('还没有条目正文，请先「最终封装」', 'warning'); return; }
  ST.dest.outNote = destLint(ST.dest.body).concat(destEjsLint(ST.dest.body));
  ST.dest.out = destBuildFrame(ST.dest.body);
  var outEl = getEl('opf-dest-out'); if (outEl) outEl.textContent = ST.dest.out;
  var note = getEl('opf-dest-outnote'); if (note) note.textContent = destNoteText();
  toast(ST.dest.outNote.length ? ('自检发现 ' + ST.dest.outNote.length + ' 条提示') : '自检通过：结构、命名与数值档位均合规', ST.dest.outNote.length ? 'warning' : 'success');
  destDraftCacheSave();
}
function clearDest(){
  if (!window.confirm('清空当前命定系统草稿（分段/报告/最终稿件）？此操作不可撤销。')) return;
  ST.dest = { demand: '', ref: '', author: '', segs: {}, status: {}, report: '', out: '', body: '', meta: '', outNote: [], ejs: false, _inited: false };
  ST.destEls = {};
  var d = getEl('opf-dest-demand'); if (d) d.value = '';
  var r = getEl('opf-dest-ref'); if (r) r.value = '';
  var a = getEl('opf-dest-author'); if (a) a.value = '';
  destDraftCacheSave();
  renderDestSteps(); renderDestinyPage();
  toast('已清空，可以开始新核心');
}
function destCopyText(txt, emptyMsg){
  if (!txt) { toast(emptyMsg, 'warning'); return; }
  function fallback(){ var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('已复制到剪贴板'); } catch (e) { toast('复制失败，请手动复制'); } ta.remove(); }
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { toast('已复制到剪贴板'); }, fallback); } else fallback();
}
function copyDestOut(){ destCopyText(ST.dest.body || '', '还没有条目正文，请先「最终封装」'); }
function copyDestMeta(){ destCopyText(ST.dest.out || '', '还没有 YAML 框架，请先「最终封装」'); }
function cleanDestOut(){
  if (!ST.dest.body) { toast('还没有条目正文，请先「最终封装」', 'warning'); return; }
  var r = destCleanMarkdown(ST.dest.body);
  var s = r.stats;
  var n = s.head + s.bold + s.star + s.rule + s.tick;
  if (!n) { toast('正文里没有需要清理的 markdown 装饰', 'success'); return; }
  ST.dest.body = r.text;
  ST.dest.out = destBuildFrame(r.text);
  ST.dest.outNote = destLint(r.text).concat(destEjsLint(r.text));
  var outEl = getEl('opf-dest-out'); if (outEl) outEl.textContent = ST.dest.out;
  var noteEl = getEl('opf-dest-outnote'); if (noteEl) noteEl.textContent = destNoteText();
  destDraftCacheSave();
  toast('已清理装饰：标题 ' + s.head + ' / 加粗 ' + s.bold + ' / 星号列表 ' + s.star + ' / 分隔线 ' + s.rule + ' / 行内代码 ' + s.tick + '（setvar 槽位内的既有写法未动）', 'success');
}
function destDraftCacheSave(){
  if (destDraftCacheSave._t) clearTimeout(destDraftCacheSave._t);
  destDraftCacheSave._t = setTimeout(function () {
    if (!ST.dest) return;
    lsSet(LS_DEST_KEY, { demand: ST.dest.demand, ref: ST.dest.ref, author: ST.dest.author, segs: ST.dest.segs, status: ST.dest.status, report: ST.dest.report, out: ST.dest.out, body: ST.dest.body, meta: ST.dest.meta, outNote: ST.dest.outNote, ejs: !!ST.dest.ejs, asmInfo: ST.dest.asmInfo, review: ST.dest.review, reviewIssues: ST.dest.reviewIssues });
  }, 500);
}
function destDraftRestore(){
  destInit();
  var c = lsGet(LS_DEST_KEY); if (!c || typeof c !== 'object') return;
  ST.dest.demand = c.demand || ''; ST.dest.ref = c.ref || '';
  ST.dest.segs = c.segs || {}; ST.dest.status = c.status || {};
  ST.dest.report = c.report || ''; ST.dest.out = c.out || ''; ST.dest.body = c.body || ''; ST.dest.meta = c.meta || ''; ST.dest.outNote = c.outNote || [];
  ST.dest.author = c.author || '';
  ST.dest.ejs = !!c.ejs;
  ST.dest.asmInfo = c.asmInfo || null; ST.dest.review = c.review || ''; ST.dest.reviewIssues = c.reviewIssues || [];
  // 旧缓存里的成品是「AI 重抄」时代的，重启后与分段可能不一致 → 用脚本重拼一次（零成本、无 AI）
  try { if (ST.dest.segs && Object.keys(ST.dest.segs).length) { var changed = destFinalizeScript(true); if (changed) ST.dest.outNote = (ST.dest.outNote || []).concat(['已用「脚本拼装」按当前分段重建成品（v1.11.3 起成品由代码拼装）']); } } catch (e) { opfErr('destDraftRestore reassemble', e); }
  try { renderDestSteps(); renderDestinyPage(); } catch (e) { opfErr('destDraftRestore render', e); }
}

// ============================================================================
// v1.12.0 ⑦ 命定核心精修：改动既有核心（外科手术式）
// 四步闸门：① 整体分析 → ② 用户提意见 → ③ 模型分析并给出改法 → ④ 确认后置入
// 绝对保持的铁律靠**机制**而不是靠模型自觉：
//   · 模型不许重写全文，只许给出「锚点 + 新内容」的补丁；
//   · 补丁由插件按"逐字唯一命中"应用到原文，任何一处锚点不唯一/找不到 → 整体放弃；
//   · 应用后跑脚本保真校验（行级 diff、包裹标签、十槽、人设字段、EJS 配对、
//     既有口令短语与变量路径是否消失），未变动部分逐字不动是"物理事实"而非承诺。
// ============================================================================
var REFINE_RULES = [
  '【绝对保持·铁律】',
  '1. 除「变更」清单明确列出的部分外，原文必须逐字不变：字符、空格、缩进、标点、换行、注释、变量路径、EJS 标签、口令词，一个都不许动。',
  '2. 禁止输出整份文件、禁止重排、禁止顺手润色、禁止统一格式。你只输出锚点与新内容。',
  '3. 锚点必须是原文里**逐字存在且唯一**的片段：长度 20~80 字符，带足够上下文以保证唯一；'
    + '不要用行号、不要用省略号、不要凭记忆改写锚点、不要跨越你打算修改的范围。',
  '4. 新内容只包含"替换掉锚点的那一段"或"要插入的那一段"，不要把周边原文抄进新内容里。',
  '5. 不得改变既有功能、数值、触发条件、口令、人设、语气、变量名，除非本次意见明确要求改它。',
  '6. 若某条意见无法在"不动其它内容"的前提下实现，就把它从「变更」里去掉，并在「冲突」里说明原因与最小侵入的替代方案。',
  '7. 保持原有的缩进风格与行尾形态（YAML 正文以 2 空格为一层）。',
  '【EJS 铁律（这类核心几乎都含 EJS；下面的规则来自上游文档核实，不是习惯）】',
  'E1. 不要改动任何 `<% … %>` / `<%_ … _%>` / `<%- … %>` / `<%= … %>` 代码块内部的代码，除非本次意见明确要求；不要合并、拆分、重排、重新缩进这些块。',
  'E2. `if/for/while` 必须保留花括号（`<%_ if (…) { _%>` … `<%_ } _%>`）：省略花括号在上游文档里是"行为未定义"。',
  'E3. 标签必须成对、数量不变：改完 `<%` 与 `%>` 的数量要相等，`<%_ { _%>` 与 `<%_ } _%>` 数量要相等。',
  'E4. 装饰器（正文第一行的 `@@activate` / `@@if …` / `@@render_after` / `@@private` 等）必须仍在第一行、每个独占一行、中间不留空行；'
    + '**名字拼错的 @@ 行会被上游直接丢弃**，不确定就不要写、也不要去改它们。',
  'E5. 变量作用域语义不要想当然：`getvar` 默认读 cache（消息+聊天+全局的合并结果），`setvar` 默认写 message；'
    + '写了立刻读要 `noCache: true`。要改就显式写 scope/type，不要"顺手规范化"。',
  'E6. 不要混用两个技术面：EJS 的 `getChatMessage(idx, role)`（单数、返回字符串）与酒馆助手的 '
    + '`getChatMessages(range, {role, hide_state, include_swipes})`（复数、返回对象数组）参数与返回值都不同。',
  'E7. `getwi` / `activewi` / `execute` / `TavernHelper.triggerSlash` 等都是异步函数，`await` 一个都不许漏。',
  'E8. 渲染期专属字段（`message_id` / `swipe_id` / `is_user` / `is_system` / `is_last`）只能在 `runType === \'render\'` 的分支里用，不要搬到生成期。'
].join('\n');
var REFINE_ANALYZE_SPEC = [
  '【分析任务】读懂这份命定系统核心，输出结构化认知（只读，不改动任何内容）。',
  '输出一个 json 代码块，键如下（全部用中文键名）：',
  '{',
  '  "条目名": "含 (署名) 的注释名或文件名",',
  '  "系统名": "包裹标签名", "系统核心名": "灵的自有名", "系统核心": "条目标识",',
  '  "包裹标签": "<X>",',
  '  "一级节": ["定义/关键能力/命运点数(FP)/…"],',
  '  "十槽": {"齐全": true, "缺": ["…"]},',
  '  "功能清单": ["每条：功能名 = 一句话作用（保留原文口径）"],',
  '  "机制要点": ["可结算的规则、数值、触发、消耗"],',
  '  "人设要点": {"形象":"","性格":"","定位":"","说话风格":"","爱好":"","最重要的愿望":""},',
  '  "语言格式": {"族":"xml|引语|裸引号", "标签":"", "参数":["mood/tag/num…"], "范例条数": 0},',
  '  "硬约束": ["隐蔽原则/非万能原则/复活约束句/禁令等一旦删除就会坏掉的句子"],',
  '  "状态与变量": ["用到的 stat_data 路径、setMessageVar/getMessageVar、MVU 写入点、局部变量名"],',
  '  "口令与关键词": ["触发用的固定词，如‘可要起卦’‘拾枚玉简’"],',
  '  "EJS结构": {"块数":0, "用途":["身份守卫/数据读取/条件渲染/静默降级…"]},',
  '  "脆弱点": ["改动时最容易连带弄坏的地方"],',
  '  "可优化方向": ["3~6 条，只提方向，不要写新内容"]',
  '}',
  '要求：只描述"它现在是什么"，不要提改进建议（改进方向写在"可优化方向"里）；不要输出原文片段的长引用，不要输出正文。'
].join('\n');
var REFINE_PLAN_SPEC = [
  '【意见分析任务】用户会对这份核心提出修改意见。你要先分析、后动手，本步**不许输出任何正文改动**。',
  '输出一个 json 代码块：',
  '{',
  '  "可否": "可以|部分可以|不建议",',
  '  "理解": "用一两句话复述用户到底想要什么",',
  '  "影响评估": [{"点":"会碰到哪一处","影响":"会连带影响什么（数值/口令/联动/存档兼容）","是否触及既有功能":"否|是"}],',
  '  "拟定改法": [{"位置":"原文里的哪一节","做法":"最小侵入的实现方式"}],',
  '  "锚点预告": ["预计要动的原文片段（逐字引用，供用户核对）"],',
  '  "冲突": ["无法在‘不动其它内容’前提下实现的部分，及最小侵入替代方案"],',
  '  "保真承诺": "改完后哪些东西保证一个字符都不变（逐项列出）",',
  '  "改动量": "小|中|大",',
  '  "执行步骤": [{"步骤":1,"标题":"这一步做什么（≤20字）","做什么":"具体改动内容与位置","预计新内容字符数":300}],',
  '  "确认提示": "给用户看的一句话：确认后我会分 N 步这样改"',
  '}',
  '【分步要求·重要】',
  'A. 先判断这个改法需要几步，再写「执行步骤」。判断标准是**单次输出的正文量**：每步的新内容必须控制在 ' + '1200' + ' 字符以内（含 EJS 代码），预计超过就必须继续拆——例如"插入一段大段 EJS"应拆成：插骨架与守卫 → 往骨架里插数据读取 → 插分支与收尾。',
  'B. 每步只做一件事，且每步都要能独立成立：做完第 N 步后，原文仍是一个能跑的核心（不能留下半截代码或未闭合的标签）。',
  'C. 若某一步无论如何都无法在 1200 字符内完成（例如必须一次性替换一大段现有内容），就在「做什么」里注明"本步输出较大"，并把它拆成"先替换前半、再替换后半"两步，锚点分别取原文里不同的唯一片段。',
  'D. 步骤数一般 1~5 步：小改动 1 步，中等改动 2~3 步，大改动 4~6 步。不要为了少写而硬塞。',
  'E. 如果改动量其实很小（一句话、一个数值），就老老实实给 1 步，不要硬拆。',
  '要求：宁可少改也不要动到无关内容；若用户意见与既有设计冲突（例如要削弱已有约束、要改口令词），必须显式指出并给出影响面。'
].join('\n');
var REFINE_PATCH_SPEC = [
  '【置入任务】用户已确认改法。现在**只做当前这一步**，输出**补丁**（不是全文，不是新版本文件）。',
  '输出格式（优先用这个分块格式，它对"输出被截断"最友好；不要用 json 包裹整份补丁）：',
  '###变更1',
  '类型: 替换|后插|前插',
  '锚点:',
  '<<<',
  '（原文里逐字存在且唯一的片段，原样抄写，不要改一个字）',
  '>>>',
  '新内容:',
  '<<<',
  '（要替换/插入的内容；可以是纯文本，也可以是 EJS 代码）',
  '>>>',
  '理由: 一句话',
  '',
  '###变更2 …（需要多处改动就重复这个块）',
  '',
  '类型语义：替换=用新内容替换锚点整段；后插=在锚点之后另起一行插入新内容；前插=在锚点之前另起一行插入新内容。',
  '【本步的输出上限】新内容合计**不要超过 1200 字符**。如果这一步的内容更多，就只输出前半部分，把剩下的写进「后续」一行（例如 `后续: 还需插入 else 分支与收尾`），下一轮会继续做。宁可多分几轮，也不要一口气输出到被截断。',
  '【自检（输出前逐条核对）】① 每个锚点都能在原文里精确找到且只有一处；② 新内容里没有误抄进来的周边原文；③ 除变更清单外没有别的差异；④ 没有动到 setvar 槽位、EJS 标签、变量路径与既有口令；⑤ 每处改动单独看都是完整的（不留半截代码、不留未闭合标签）。',
  '若某条改动实在无法用唯一锚点表达，就不要放进变更块，写进末尾的「冲突:」一行并说明。'
].join('\n');

function refineInit(){
  ST.refine = ST.refine || { src: '', name: '', scan: '', analysis: '', analysisObj: null, request: '', plan: '', planObj: null, result: '', diff: '', fidelity: null, applied: [], status: 'idle', _inited: false, working: '', steps: [], stepIndex: 0, sizeCap: 1200, ejsNote: '', lastFailed: null };
}
// ---------- 本地结构体检（零 AI）：先让脚本把事实摆出来 ----------
function refineScan(src){
  var t = String(src || '');
  var lines = t.split(/\r?\n/);
  var wrap = (t.match(/^<([^>\s{}]+)>/m) || [])[1] || '';
  var slots = destExtractSlots(t);
  var found = DEST_SLOT_ORDER.filter(function (n) { return slots.map[n]; });
  var top = [], sub = [], ejsDepth = 0;
  lines.forEach(function (l) {
    var opens = (l.match(/<%/g) || []).length, closes = (l.match(/%>/g) || []).length;
    if (ejsDepth > 0 || opens > 0) { ejsDepth += opens - closes; if (ejsDepth < 0) ejsDepth = 0; return; }   // EJS/JS 区里的"键"是代码，不是结构
    var m = l.match(/^( *)([^ \t#\-][^:：]{0,30})[:：]/);
    if (!m) return;
    var k = m[2].trim();
    if (!k || k.length > 18) return;
    if (/[\/\\<>\[\]{}"']|^\/\//.test(k)) return;
    if (/^(?:if|const|let|var|return|function)\b/.test(k)) return;
    if (m[1].length === 0) { if (top.indexOf(k) < 0) top.push(k); }
    else if (m[1].length <= 2) { if (sub.indexOf(k) < 0) sub.push(k); }
  });
  var ejsOpen = (t.match(/<%/g) || []).length, ejsClose = (t.match(/%>/g) || []).length;
  var braces = destEjsBraceDelta ? 0 : 0;
  var marks = [];
  if (wrap) {
    var o = (t.match(new RegExp('<' + wrap + '>', 'g')) || []).length;
    var c = (t.match(new RegExp('</' + wrap + '>', 'g')) || []).length;
    marks.push('包裹标签 <' + wrap + '> 开 ' + o + ' / 闭 ' + c + (o === c && o > 0 ? ' ✓' : ' ✗ 不配对'));
  } else marks.push('未找到包裹标签 <X>（这份文本可能不是条目正文）');
  marks.push('十槽 ' + found.length + '/10' + (found.length < 10 ? '（缺：' + DEST_SLOT_ORDER.filter(function (n) { return found.indexOf(n) < 0; }).join('、') + '）' : ' ✓'));
  if (ejsOpen > 0) marks.push('顶层键：这是 EJS 核心，正文由条件分支动态拼装（`<%_ if … { _%>` 跨行的块用数标签的办法切不准），脚本不做顶层键切分——交给「① 整体分析」去读');
  else marks.push('顶层键 ' + top.length + ' 个：' + top.slice(0, 8).join(' / ') + (top.length > 8 ? ' …（还有 ' + (top.length - 8) + ' 个）' : ''));
  marks.push('一级节 ' + sub.length + ' 个：' + sub.slice(0, 18).join(' / ') + (sub.length > 18 ? ' …（还有 ' + (sub.length - 18) + ' 个：' + sub.slice(18, 30).join(' / ') + '）' : ''));
  marks.push('EJS 标签 <% ' + ejsOpen + ' / %> ' + ejsClose + (ejsOpen === ejsClose ? ' ✓ 配对' : ' ⚠ 数量不等（可能是多行块，仍需人工确认）'));
  marks.push('篇幅 ' + t.length + ' 字符 / ' + lines.length + ' 行');
  return { text: marks.join('\n'), wrap: wrap, slots: found, sections: sub, top: top, chars: t.length, lines: lines.length, ejsOpen: ejsOpen, ejsClose: ejsClose };
}
function refineLoad(text, name){
  refineInit();
  var t = String(text || '');
  ST.refine.src = t;
  ST.refine.name = name || ST.refine.name || '未命名核心';
  ST.refine.analysis = ''; ST.refine.analysisObj = null; ST.refine.plan = ''; ST.refine.planObj = null;
  ST.refine.result = ''; ST.refine.diff = ''; ST.refine.fidelity = null; ST.refine.applied = [];
  ST.refine.working = t; ST.refine.steps = []; ST.refine.stepIndex = 0; ST.refine.sizeCap = 1200;
  var sc = refineScan(t);
  ST.refine.scan = sc.text;
  var ta = getEl('opf-rf-src'); if (ta) ta.value = t;
  refineEjsCheck(false);                                  // 载入即做一次 EJS 体检（零 AI）
  refineRender();
  refineSyncButtons();
  return sc;
}
// ⑦ 的 EJS 体检：直接复用 ④ 页的 destEjsLint（两层检查：通用 + 上游核实项）
function refineEjsCheck(showToast){
  refineInit();
  var t = String(ST.refine.src || '');
  var box = getEl('opf-rf-ejsout');
  if (t.indexOf('<%') < 0) {
    var msg = '这份文本里没有 EJS 标签（`<% … %>`），无需 EJS 体检。';
    if (box) box.textContent = msg;
    if (showToast) toast('文本里没有 EJS 标签', 'warning');
    ST.refine.ejsNote = '';
    return [];
  }
  var warns = destEjsLint(t);
  var tagsOpen = (t.match(/<%/g) || []).length, tagsClose = (t.match(/%>/g) || []).length;
  var decs = (t.match(/^[ \t]*@@[A-Za-z_][A-Za-z0-9_]*/gm) || []).length;
  var head = 'EJS 体检（' + tagsOpen + ' 个标签／装饰器 ' + decs + ' 行／花括号净差 ' + destEjsBraceDelta(t) + '）';
  var body = warns.length
    ? warns.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n')
    : '✓ 未发现规范问题（标签配对、花括号、作用域用法、await、装饰器拼写、渲染期字段、幂等保护等检查均通过）';
  if (box) box.textContent = head + '\n\n' + body;
  ST.refine.ejsNote = warns.length ? ('EJS 体检 ' + warns.length + ' 条提示') : 'EJS 体检通过';
  if (showToast) toast(warns.length ? ('EJS 体检发现 ' + warns.length + ' 条（见体检区）') : 'EJS 体检通过', warns.length ? 'warning' : 'success');
  return warns;
}
function refineNote(s){ var el = getEl('opf-rf-status'); if (el) el.textContent = s; }
// ---------- 行级 diff（LCS，纯脚本）----------
function refineLineDiff(a, b){
  var A = String(a).split(/\r?\n/), B = String(b).split(/\r?\n/);
  var n = A.length, m = B.length;
  if (n * m > 6000000) return null;
  var dp = new Int32Array((n + 1) * (m + 1));
  var W = m + 1;
  for (var i = n - 1; i >= 0; i--) {
    for (var j = m - 1; j >= 0; j--) {
      dp[i * W + j] = (A[i] === B[j]) ? dp[(i + 1) * W + (j + 1)] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + (j + 1)]);
    }
  }
  var ops = [], x = 0, y = 0;
  while (x < n && y < m) {
    if (A[x] === B[y]) { ops.push({ t: 'same', a: x, b: y }); x++; y++; }
    else if (dp[(x + 1) * W + y] >= dp[x * W + (y + 1)]) { ops.push({ t: 'del', a: x }); x++; }
    else { ops.push({ t: 'add', b: y }); y++; }
  }
  while (x < n) { ops.push({ t: 'del', a: x }); x++; }
  while (y < m) { ops.push({ t: 'add', b: y }); y++; }
  return ops;
}
// ---------- 保真校验：把"绝对保持"变成可核对的事实 ----------
// 抽出「口令类」短语：位于含"口令/必须包含/触发/关键词/四字/禁止"的行里，
// 这些短语消失 = 既有功能被悄悄改坏的最高信号，要单独点名
function refinePhrases(t){
  var all = {}, pass = {};
  var re = /「([^」\n]{2,40})」|【([^】\n]{2,40})】|\u201c([^\u201d\n]{2,40})\u201d|"([^"\n]{2,40})"/g;
  String(t).split(/\r?\n/).forEach(function (line) {
    var isPass = /口令|必须包含|触发|关键词|四字|禁止|专用/.test(line);
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      var v = (m[1] || m[2] || m[3] || m[4] || '').trim();
      if (!v) continue;
      all[v] = (all[v] || 0) + 1;
      if (isPass) pass[v] = (pass[v] || 0) + 1;
    }
  });
  return { all: all, pass: pass };
}
function refinePaths(t){
  var out = {}, re = /(?:stat_data\.[\w\u4e00-\u9fa5.\[\]]+|\/(?:主角|世界|事件|任务列表|关系列表|新闻)[\w\u4e00-\u9fa5\/.]*)/g, m;
  while ((m = re.exec(String(t))) !== null) { out[m[0]] = (out[m[0]] || 0) + 1; }
  return out;
}
function refineFidelity(before, after, wanted){
  var checks = [], diff = refineLineDiff(before, after), stats = { same: 0, add: 0, del: 0 };
  if (diff) diff.forEach(function (o) { stats[o.t === 'same' ? 'same' : (o.t === 'add' ? 'add' : 'del')]++; });
  var B = String(before), A = String(after);
  var want = String(wanted || '');
  var list = [];
  var bWrap = (B.match(/^<([^>\s{}]+)>/m) || [])[1] || '', aWrap = (A.match(/^<([^>\s{}]+)>/m) || [])[1] || '';
  var wOk = bWrap === aWrap && bWrap;
  list.push({ ok: !!wOk, k: '包裹标签', v: wOk ? ('<' + bWrap + '> 未变') : ('变了或丢失：' + bWrap + ' → ' + aWrap) });
  var bS = destExtractSlots(B), aS = destExtractSlots(A);
  var missSlot = DEST_SLOT_ORDER.filter(function (n) { return bS.map[n] && !aS.map[n]; });
  var chgSlot = DEST_SLOT_ORDER.filter(function (n) { return bS.map[n] && aS.map[n] && bS.map[n] !== aS.map[n]; });
  list.push({ ok: missSlot.length === 0, k: '十槽存在性', v: missSlot.length ? ('丢了：' + missSlot.join('、')) : '10 槽一个没少' });
  list.push({ ok: chgSlot.length === 0 || /槽|setvar|变量/.test(want), k: '槽位内容', v: chgSlot.length ? ('有变化的槽：' + chgSlot.join('、') + (/槽|setvar|变量/.test(want) ? '（本次意见涉及变量，视为预期）' : '（本次未要求改变量，请核对）')) : '全部原样' });
  var pB = refinePhrases(B), pA = refinePhrases(A);
  var lostPhrase = Object.keys(pB.all).filter(function (k) { return !pA.all[k]; });
  var lostPass = lostPhrase.filter(function (k) { return pB.pass[k]; });
  list.push({
    ok: lostPhrase.length === 0, k: '既有短语/口令',
    v: lostPhrase.length
      ? ('消失了 ' + lostPhrase.length + ' 个'
        + (lostPass.length ? '，其中**口令类 ' + lostPass.length + ' 个**：' + lostPass.slice(0, 6).map(function (x) { return '「' + x + '」'; }).join('、') : '')
        + '；其余：' + lostPhrase.filter(function (k) { return lostPass.indexOf(k) < 0; }).slice(0, 8).map(function (x) { return '「' + x + '」'; }).join('、')
        + (lostPhrase.length > 8 + lostPass.length ? ' …' : ''))
      : '一个没少（含口令类 ' + Object.keys(pB.pass).length + ' 个）'
  });
  var qB = refinePaths(B), qA = refinePaths(A);
  var lostPath = Object.keys(qB).filter(function (k) { return !qA[k]; });
  list.push({ ok: lostPath.length === 0, k: '变量/状态路径', v: lostPath.length ? ('消失了：' + lostPath.slice(0, 6).join('、')) : '一个没少' });
  var eB = (B.match(/<%/g) || []).length, eA = (A.match(/%>/g) || []).length;
  var zB = (B.match(/%>/g) || []).length, zA = (A.match(/<%/g) || []).length;
  list.push({ ok: (eB - zB) === (zA - zA), k: 'EJS 标签配对', v: '改动前 <% ' + eB + '/%> ' + zB + '（差 ' + (eB - zB) + '）→ 改动后 <% ' + zA + '/%> ' + eA + '（差 ' + (zA - eA) + '）' + ((eB - zB) === (zA - eA) ? ' ✓' : ' ⚠') });
  var fB = (B.match(/^\s{6}([\u4e00-\u9fa5]{2,8})[:：]/gm) || []).length, fA = (A.match(/^\s{6}([\u4e00-\u9fa5]{2,8})[:：]/gm) || []).length;
  list.push({ ok: fA >= fB - (/(人设|性格|形象|愿望)/.test(want) ? 6 : 0), k: '人设字段数', v: '改动前 ' + fB + ' 个字段名 → 改动后 ' + fA + (/人设|性格|形象|愿望/.test(want) ? '（本次意见涉及人设，允许变化）' : '（未要求改人设，不应减少）') });
  var funcsB = (B.match(/【[^】\n]{2,20}】\s*[:：]/g) || []).length, funcsA = (A.match(/【[^】\n]{2,20}】\s*[:：]/g) || []).length;
  list.push({ ok: funcsA >= funcsB, k: '功能条目数', v: '【…】条目 ' + funcsB + ' → ' + funcsA + (funcsA < funcsB ? ' ⚠ 少了 ' + (funcsB - funcsA) + ' 条' : '') });
  // EJS 完整性（这类核心几乎都含 EJS，且 EJS 坏了是"整段失效"级别）
  if (B.indexOf('<%') >= 0) {
    var decB = (B.match(/^[ \t]*@@[A-Za-z_][A-Za-z0-9_]*/gm) || []).map(function (x) { return x.trim(); });
    var decA = (A.match(/^[ \t]*@@[A-Za-z_][A-Za-z0-9_]*/gm) || []).map(function (x) { return x.trim(); });
    var lostDec = decB.filter(function (x) { return decA.indexOf(x) < 0; });
    list.push({ ok: lostDec.length === 0, k: 'EJS 装饰器行', v: decB.length ? (lostDec.length ? ('消失/改名 ' + lostDec.length + ' 行：' + lostDec.join('、') + '（上游对拼错的 @@ 行会直接丢弃，务必核对）') : decB.length + ' 行原样保留') : '本条没有 @@ 装饰器' });
    var noBraceB = destEjsNoBrace(B).length, noBraceA = destEjsNoBrace(A).length;
    list.push({ ok: noBraceA <= noBraceB, k: 'EJS 花括号写法', v: '无花括号的 if/for：' + noBraceB + ' → ' + noBraceA + (noBraceA > noBraceB ? ' ⚠ 新增了' + (noBraceA - noBraceB) + ' 处（上游：行为未定义）' : '') });
    var braceB = destEjsBraceDelta(B), braceA = destEjsBraceDelta(A);
    list.push({ ok: braceB === braceA, k: 'EJS 代码花括号净差', v: braceB + ' → ' + braceA + (braceB === braceA ? ' ✓ 未变' : ' ⚠ 变了（可能是块没配平）') });
    var awB = (B.match(/(?<!await\s)(?<![\w.$])(?:getwi|activewi|execute|evalTemplate)\s*\(/g) || []).length;
    var awA = (A.match(/(?<!await\s)(?<![\w.$])(?:getwi|activewi|execute|evalTemplate)\s*\(/g) || []).length;
    if (awA !== awB) list.push({ ok: false, k: 'EJS 漏 await', v: '疑似漏 await 的异步调用：' + awB + ' → ' + awA + '（新增的记得补 await）' });
    // 空白控制标签漂移：<%_ / _%> 改成 <% / %> 会改变输出空白（正文塞满空行），属行为变化
    var wsB = (B.match(/<%_|_%>/g) || []).length, wsA = (A.match(/<%_|_%>/g) || []).length;
    if (wsB !== wsA) list.push({ ok: false, k: 'EJS 空白控制标签', v: '<%_ / _%> 数量 ' + wsB + ' → ' + wsA + '（改名会改变输出里的空白，正文可能突然多出大量空行）' });
    else list.push({ ok: true, k: 'EJS 空白控制标签', v: wsB + ' 个 <%_ / _%> 未变' });
  }
  return { checks: list, stats: stats, diff: diff, changedLines: stats.add + stats.del };
}
function refineRenderDiff(before, after, diff){
  if (!diff) return '（文本过大，跳过行级 diff）';
  var A = String(before).split(/\r?\n/), B = String(after).split(/\r?\n/);
  var out = [], i = 0, hunks = 0;
  while (i < diff.length && hunks < 20) {
    if (diff[i].t === 'same') { i++; continue; }
    var start = i, end = i;
    // 合并相邻的变更块
    while (end + 1 < diff.length && diff[end + 1].t !== 'same') end++;
    var sameRun = 0, k = end + 1;
    while (k < diff.length && diff[k].t === 'same' && sameRun < 4) { sameRun++; k++; }
    var pre = [], j = start - 1, cnt = 0;
    while (j >= 0 && diff[j].t === 'same' && cnt < 3) { pre.unshift(A[diff[j].a]); j--; cnt++; }
    hunks++;
    out.push('── 变更 ' + hunks + ' ──');
    pre.forEach(function (l) { out.push('   ' + l); });
    for (var q = start; q <= end; q++) {
      if (diff[q].t === 'del') out.push('-  ' + A[diff[q].a]);
      else out.push('+  ' + B[diff[q].b]);
    }
    i = end + 1;
  }
  if (!hunks) return '（没有差异）';
  if (hunks >= 20) out.push('…（变更块过多已截断显示）');
  return out.join('\n');
}
// ---------- 锚点定位：先逐字，再归一化空白，最后（仅插入类）退化为按行定位 ----------
// 模型写锚点时最常见的问题是"凭记忆抄"：缩进差几格、行尾多了空格、把两行并成一行。
// 这里做三级匹配，并对"近似定位"如实标注，绝不假装是逐字命中。
function refineNormIndex(s) {
  var map = [], buf = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (/\s/.test(c)) {
      if (buf && buf.charAt(buf.length - 1) !== ' ') { buf += ' '; map.push(i); }
    } else { buf += c; map.push(i); }
  }
  return { norm: buf, map: map };
}
function refineFindAnchor(text, anchor, type) {
  var a = String(anchor == null ? '' : anchor);
  if (!a.trim()) return { ok: false, why: '锚点为空' };
  // ① 逐字
  var i1 = text.indexOf(a);
  if (i1 >= 0) {
    if (text.indexOf(a, i1 + 1) >= 0) return { ok: false, why: '锚点在原文里出现多次（≥2 处），无法唯一定位', dup: true };
    return { ok: true, start: i1, end: i1 + a.length, how: '逐字' };
  }
  // ② 归一化空白（缩进/行尾空格/多空格差异都能对上）
  var T = refineNormIndex(text);
  var B = refineNormIndex(a).norm.trim();
  if (B) {
    var p2 = T.norm.indexOf(B);
    if (p2 >= 0) {
      if (T.norm.indexOf(B, p2 + 1) >= 0) return { ok: false, why: '锚点按空白归一后仍出现多次，无法唯一定位', dup: true };
      var st2 = T.map[p2], en2 = T.map[p2 + B.length - 1] + 1;
      return { ok: true, start: st2, end: en2, how: '空白归一（缩进/空格差异）', degraded: true };
    }
  }
  // ③ 仅对"插入类"退化：用锚点里最长的一行去定位（替换类绝不做，避免误删原文）
  if (/前插|后插|insert/i.test(String(type))) {
    var lines = a.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length >= 6; });
    lines.sort(function (x, y) { return y.length - x.length; });
    for (var k = 0; k < lines.length && k < 3; k++) {
      var probe = lines[k];
      var np = refineNormIndex(probe).norm;
      var p3 = T.norm.indexOf(np);
      if (p3 >= 0 && T.norm.indexOf(np, p3 + 1) < 0) {
        var st3 = T.map[p3], en3 = T.map[p3 + np.length - 1] + 1;
        return { ok: true, start: st3, end: en3, how: '按锚点最长行近似定位', degraded: true };
      }
    }
  }
  return { ok: false, why: '锚点在原文里找不到（模型多半是凭记忆改写了锚点：缩进/标点/换行与原文不一致）' };
}
// "你是不是想找这段" —— 在原文里找出与锚点最接近的片段，用于下一次重试时回灌给模型
function refineAnchorHint(text, anchor) {
  var a = String(anchor || '');
  var first = '';
  a.split(/\r?\n/).some(function (l) { if (l.trim().length >= 4) { first = l.trim(); return true; } return false; });
  if (!first) first = a.trim().slice(0, 20);
  if (!first) return '';
  var lines = String(text || '').split(/\r?\n/);
  var bigrams = function (s) {
    var out = [];
    for (var i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
    return out;
  };
  var bg = bigrams(first);
  if (!bg.length) return '';
  var best = -1, bestScore = 0;
  lines.forEach(function (l, i) {
    var t = l.trim();
    if (t.length < 4) return;
    var hit = 0;
    bg.forEach(function (x) { if (t.indexOf(x) >= 0) hit++; });
    var score = hit / bg.length;
    if (t.indexOf(first) >= 0) score += 1;                    // 包含整行 → 直接优先
    if (score > bestScore) { bestScore = score; best = i; }
  });
  if (best < 0 || bestScore < 0.5) return '';
  return lines.slice(best, best + 3).join('\n');
}
// 把补丁落到文本上；三级锚点匹配 + all-or-nothing
function refineApplyPatch(src, changes, opts){
  var out = String(src), applied = [], failed = [];
  var o = opts || {};
  (changes || []).forEach(function (ch, i) {
    var type = String(ch['类型'] || ch['type'] || '替换');
    var anchor = String(ch['锚点'] || ch['anchor'] || '');
    var next = ch['新内容'] != null ? String(ch['新内容']) : (ch['content'] != null ? String(ch['content']) : '');
    var why = String(ch['理由'] || '');
    if (!anchor) { failed.push({ i: i, why: '锚点为空', ch: ch }); return; }
    if (!next.trim()) { failed.push({ i: i, why: '新内容为空', ch: ch }); return; }
    var hit = refineFindAnchor(out, anchor, type);
    if (!hit.ok) {
      failed.push({ i: i, why: hit.why, ch: ch, hint: refineAnchorHint(out, anchor) });
      return;
    }
    var rep;
    if (/前插/.test(type)) rep = next + '\n' + out.slice(hit.start, hit.end);
    else if (/后插/.test(type)) rep = out.slice(hit.start, hit.end) + '\n' + next;
    else rep = next;
    out = out.slice(0, hit.start) + rep + out.slice(hit.end);
    applied.push({ i: i, type: type, why: why, anchor: anchor, next: next, how: hit.how, degraded: !!hit.degraded });
  });
  var deg = applied.filter(function (x) { return x.degraded; }).length;
  return { ok: failed.length === 0, text: out, applied: applied, failed: failed, degraded: deg };
}
