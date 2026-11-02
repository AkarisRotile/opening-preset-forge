//@module 33-quickstart — ① 页「快速开局」：一键勾好生成所需条目 + 按开局地点智能勾选 + 可视化
// 设计：地点与专题都从世界书条目名解析（[本体][势力][国家][上级]名称(作者)）。
//       勾选只写 ST.wb.entries[i].sel，与 ② 页共用同一份状态；本模块不碰请求与提示词。
var QS_RULE_KEYS = ['核心数值表', '品质效果限定', '技能装备道具生成规则', '经济价格指南', '角色生成', '角色辅助指导'];
// 世界设定里生成预设直接要用的一条（层级/阶级名要写进 lifeLevel 与生命层级）
var QS_WORLD_KEYS = ['生命层级与社会阶级'];
var QS_REGION_TAGS = ['势力', '冒险区域'];
var QS_TOPIC_ORDER = ['loc', 'parent', 'locpol', 'locculture', 'overview', 'culture', 'politics', 'festival', 'rule'];
var QS_TOPIC_LABEL = {
  loc: '开局地点', parent: '上级地点',
  locpol: '地点·政治与社会', locculture: '地点·文化',
  overview: '国家总览', culture: '文化', politics: '政治与社会', festival: '节庆',
  rule: '生成规则'
};
var QS = { marks: [], built: false };

// ---------------- 解析 ----------------
/** 去掉条目名末尾的 (作者) */
function qsStripAuthor(s) {
  return String(s == null ? '' : s).replace(/[（(][^（）()]{0,24}[）)]\s*$/, '').trim();
}
/** 取前导 [x] 标签之后的名字 */
function qsAfterTags(comment) {
  var cm = String(comment == null ? '' : comment);
  var tags = leadingTags(cm), pos = 0;
  for (var i = 0; i < tags.length; i++) pos += ('[' + tags[i] + ']').length;
  return qsStripAuthor(cm.slice(pos));
}
/** 解析条目名：{ country, chain, group, name, tags }；不属于势力/冒险区域的返回 null
 *  chain = 国家之后的全部中括号标签（[城镇][挽歌堡]…），最后一个才是「上级」，前面的是类型词 */
function qsParseComment(comment) {
  var cm = String(comment || '');
  var tags = leadingTags(cm);
  if (!tags.length) return null;
  if (tags[0] !== '本体' && tags[0] !== 'DLC') return null;
  if (tags.length < 3) return null;
  var kind = tags[1];
  if (QS_REGION_TAGS.indexOf(kind) < 0) return null;
  var country = tags[2] || '';
  var chain = tags.slice(3);
  var group = chain.length ? chain[chain.length - 1] : '';
  var name = qsStripAuthor(qsAfterTags(cm));
  if (!country || !name) return null;
  return { country: country, chain: chain, group: group, name: name, tags: tags };
}
/** 专题判定：总览 / 文化 / 政治与社会 / 节庆 */
function qsTopicOf(name) {
  var n = String(name || '');
  if (n === '总览' || n === '概览' || n === '势力概览') return 'overview';
  if (n.indexOf('政治与社会') >= 0) return 'politics';
  if (n.indexOf('文化') >= 0) return 'culture';
  if (n === '节庆总览') return 'festival';
  if (n === '节庆') return 'festival';
  return '';
}
/** 是否专题条目（不是可选的「地点」） */
function qsIsTopic(name) {
  return !!qsTopicOf(name) || /^(贵族|活动|派阀|地理|地理概览|神迹群山地理概览|军事|经济|人物|历史|组织|怪物)$/.test(String(name || ''));
}
/** 是否专题标签（[节庆]、[政治与社会] 这类中括号标签，不是地名） */
function qsIsTopicTag(tag) {
  return /^(节庆|节庆总览|政治与社会|文化|地理|地理与文化|地理概览|总览|概览|贵族|活动|派阀|军事|经济|人物|历史)$/.test(String(tag || ''));
}
/** 是否地点类型词（[城镇][城市][地块]…），用来在下拉里标注类型、并且不当前级去找 */
function qsIsTypeTag(tag) {
  return /(城镇|城市|地块|王国|自治区|聚落|区域|群岛|领地|要塞|村镇|村庄|圣域|眷族|联邦|帝国|公国|王庭|联盟)$/.test(String(tag || ''));
}
/** 从 chain 里取类型词（可能没有） */
function qsTypeOf(p) {
  var chain = (p && p.chain) || [];
  for (var i = 0; i < chain.length; i++) if (qsIsTypeTag(chain[i])) return chain[i];
  return '';
}

// ---------------- 地点索引 ----------------
/** 从条目列表建立 { groups:[{country, locs:[{comment, name, size}]}] } */
function qsIndex(list) {
  var map = {}, order = [];
  (list || []).forEach(function (e) {
    var p = qsParseComment(e.comment);
    if (!p) return;
    if (qsIsTopic(p.name)) return;
    if (p.group && qsIsTopicTag(p.group)) return;   // [节庆]耀日回归祭 这类专题子条目
    if (p.name === p.country) return;   // 国家/区域自身那条是总览，不进地点下拉
    if (!map[p.country]) { map[p.country] = []; order.push(p.country); }
    map[p.country].push({ comment: e.comment, name: p.name, group: p.group, type: qsTypeOf(p), size: (e.content || '').length });
  });
  order.sort(function (a, b) { return a.localeCompare(b, 'zh-Hans-CN'); });
  return {
    groups: order.map(function (c) {
      var locs = map[c].sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-Hans-CN'); });
      return { country: c, locs: locs };
    })
  };
}

// ---------------- 勾选计划 ----------------
/**
 * 按选中的地点算出要勾的条目（纯函数，便于测试）
 * @param {Array} list ST.wb.entries
 * @param {string} locComment 选中的地点条目 comment（空=只勾生成规则）
 */
function qsPlan(list, locComment) {
  var marks = [], seen = {};
  function add(e, topic) {
    if (!e || !e.id || seen[e.id]) return;
    seen[e.id] = 1;
    marks.push({ id: e.id, topic: topic, comment: e.comment || '' });
  }
  var parsed = [];
  (list || []).forEach(function (e) {
    var p = qsParseComment(e.comment);
    parsed.push({ e: e, p: p, name: p ? p.name : '', country: p ? p.country : '', group: p ? p.group : '', chain: p ? p.chain : [] });
  });
  function pick(fn) {
    for (var i = 0; i < parsed.length; i++) if (parsed[i].p && fn(parsed[i])) return parsed[i];
    return null;
  }

  var loc = locComment ? qsParseComment(locComment) : null;
  if (loc) {
    // 1) 地点本身
    var hit = pick(function (it) { return it.country === loc.country && it.name === loc.name; });
    if (hit) add(hit.e, 'loc');
    // 2) 上级地点（[城镇][挽歌堡]黑冠台 → 挽歌堡；[红叶镇]赤枫堡 → 红叶镇）
    var chain = (loc.chain || []).slice().reverse();
    for (var ci = 0; ci < chain.length; ci++) {
      var tag = chain[ci];
      if (!tag || tag === loc.name || qsIsTypeTag(tag) || qsIsTopicTag(tag)) continue;
      var par = pick(function (it) { return it.country === loc.country && it.name === tag && (it.chain || []).indexOf(tag) >= 0; })
        || pick(function (it) { return it.country === loc.country && it.name === tag; });
      if (par) { add(par.e, 'parent'); break; }
    }
    // 3) 地点自己的专题（[伯伦斯法环][雾晶港]政治与社会）
    parsed.forEach(function (it) {
      if (!it.p || it.country !== loc.country || it.group !== loc.name) return;
      var t = qsTopicOf(it.name);
      if (t === 'politics') add(it.e, 'locpol');
      else if (t === 'culture') add(it.e, 'locculture');
    });
    // 4) 所在国家的专题：总览 / 文化 / 政治与社会 / 节庆（节庆只开总览，不铺开每一个祭典）
    var own = pick(function (it) { return it.country === loc.country && !it.group && it.name === loc.country; });
    if (own) add(own.e, 'overview');
    var ov = pick(function (it) { return it.country === loc.country && !it.group && /^(总览|概览)$/.test(it.name); });
    if (!own && ov) add(ov.e, 'overview');
    var cu = pick(function (it) { return it.country === loc.country && !it.group && qsTopicOf(it.name) === 'culture'; });
    if (cu) add(cu.e, 'culture');
    var po = pick(function (it) { return it.country === loc.country && !it.group && qsTopicOf(it.name) === 'politics'; });
    if (po) add(po.e, 'politics');
    var fe = pick(function (it) { return it.country === loc.country && !it.group && it.name === '节庆总览'; })
      || pick(function (it) { return it.country === loc.country && !it.group && it.name === '节庆'; });
    if (fe) add(fe.e, 'festival');
  }
  // 5) 生成规则（本工具生成开局预设必须的）
  parsed.forEach(function (it) {
    var cm = it.e.comment || '';
    if (cm.indexOf('[额外设定]') >= 0) {
      for (var k = 0; k < QS_RULE_KEYS.length; k++) {
        if (cm.indexOf(QS_RULE_KEYS[k]) >= 0) { add(it.e, 'rule'); return; }
      }
      return;
    }
    if (cm.indexOf('[世界设定]') >= 0) {
      for (var w = 0; w < QS_WORLD_KEYS.length; w++) {
        if (cm.indexOf(QS_WORLD_KEYS[w]) >= 0) { add(it.e, 'rule'); return; }
      }
    }
  });
  return marks;
}

// ---------------- 勾选执行 ----------------
function qsEntryById(id) {
  var list = (ST.wb && ST.wb.entries) || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
function qsSelectedChars(marks) {
  var total = 0;
  (marks || []).forEach(function (m) {
    var e = qsEntryById(m.id);
    if (e && e.sel) total += (e.content || '').length;
  });
  return total;
}
/** 按当前设置重算并勾选 */
function qsApply(silent) {
  var s = getSettings();
  var wb = ST.wb || { entries: [] };
  if (!wb.entries || !wb.entries.length) {
    QS.marks = [];
    if (!silent) toast('还没有载入世界书：先「导入世界书文件」或在酒馆里激活世界书', 'warning');
    qsRender();
    return { applied: 0 };
  }
  var locComment = s.quickStartLoc || '';
  if (!locComment) {
    // 未选地点时只勾生成规则
    QS.marks = qsPlan(wb.entries, '');
    if (!silent) toast('先选一个开局地点，再自动勾选地点与国家条目');
  } else {
    QS.marks = qsPlan(wb.entries, locComment);
  }
  var applied = 0;
  QS.marks.forEach(function (m) {
    var e = qsEntryById(m.id);
    if (!e) return;
    if (!e.sel) { e.sel = true; applied++; }
  });
  if (!s.includeWorld) {
    s.includeWorld = true;
    var cw = getEl('opf-ck-world'); if (cw) cw.checked = true;
  }
  saveSettings();
  try { updateSendText(); } catch (e) { opfErr('qs updateSendText', e); }
  try { renderWorldSide(); } catch (e) { opfErr('qs renderWorldSide', e); }
  try { renderMetaStatus(); } catch (e) { opfErr('qs renderMetaStatus', e); }
  qsRender();
  if (!silent) {
    var c = wpkCounts();
    toast('快速开局：本次勾选 ' + QS.marks.length + ' 条（新增 ' + applied + ' 条）· 已选 ' + c.selN + '/' + c.total);
  }
  return { applied: applied, marks: QS.marks.length };
}
/** 取消本功能勾选过的条目 */
function qsClearMarks(silent) {
  var n = 0;
  QS.marks.forEach(function (m) {
    var e = qsEntryById(m.id);
    if (e && e.sel) { e.sel = false; n++; }
  });
  QS.marks = [];
  saveSettings();
  try { updateSendText(); } catch (e) {}
  try { renderWorldSide(); } catch (e) {}
  try { renderMetaStatus(); } catch (e) {}
  qsRender();
  if (!silent) toast('已取消快速开局勾选的 ' + n + ' 条');
  return n;
}
function qsToggleMark(id, on) {
  var e = qsEntryById(id);
  if (!e) return;
  e.sel = !!on;
  saveSettings();
  try { updateSendText(); } catch (err) {}
  try { renderWorldSide(); } catch (err) {}
  try { renderMetaStatus(); } catch (err) {}
  qsRender();
}

// ---------------- 渲染 ----------------
function qsSyncUi() {
  var s = getSettings();
  var ck = getEl('opf-ck-fast'); if (ck) ck.checked = !!s.quickStart;
  var body = getEl('opf-qs-body'); if (body) body.style.display = s.quickStart ? '' : 'none';
}
/** 重建地点下拉 + 已启用条目清单 */
function qsRender() {
  var sel = getEl('opf-qs-loc');
  var listEl = getEl('opf-qs-list');
  var statEl = getEl('opf-qs-stat');
  var s = getSettings();
  var wb = ST.wb || { entries: [] };
  var entries = wb.entries || [];

  if (sel) {
    var keep = s.quickStartLoc || '';
    sel.textContent = '';
    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = entries.length ? '（只勾生成规则，不选地点）' : '（先导入世界书）';
    sel.appendChild(ph);
    var idx = qsIndex(entries);
    idx.groups.forEach(function (g) {
      var og = document.createElement('optgroup');
      og.label = g.country;
      g.locs.forEach(function (l) {
        var op = document.createElement('option');
        op.value = l.comment;
        var suffix = l.type || (l.group && l.group !== l.name ? l.group : '');
        op.textContent = l.name + (suffix ? '（' + suffix + '）' : '');
        og.appendChild(op);
      });
      sel.appendChild(og);
    });
    if (keep) {
      var has = false;
      for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === keep) { has = true; break; }
      if (has) sel.value = keep;
      else if (keep) { s.quickStartLoc = ''; saveSettings(); }
    }
  }

  if (listEl) {
    listEl.textContent = '';
    if (!s.quickStart) {
      listEl.appendChild(qsHint('勾选上面的「启用快速开局」后，这里会列出本功能勾好的条目，可以逐条取消。'));
    } else if (!QS.marks.length) {
      listEl.appendChild(qsHint(entries.length ? '还没算勾选：选一个开局地点，或点「↻ 重新智能勾选」。' : '还没有载入世界书：点「导入世界书文件」，或在酒馆里打开世界书。'));
    } else {
      var byTopic = {};
      QS.marks.forEach(function (m) {
        var e = qsEntryById(m.id);
        if (!e) return;
        (byTopic[m.topic] = byTopic[m.topic] || []).push({ e: e, m: m });
      });
      QS_TOPIC_ORDER.forEach(function (topic) {
        var arr = byTopic[topic];
        if (!arr || !arr.length) return;
        var head = document.createElement('div');
        head.className = 'opf-qs-group';
        head.textContent = QS_TOPIC_LABEL[topic] + '（' + arr.length + '）';
        listEl.appendChild(head);
        arr.forEach(function (it) {
          var row = document.createElement('label');
          row.className = 'opf-qs-item' + (it.e.sel ? '' : ' off');
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = !!it.e.sel;
          cb.addEventListener('change', function () { qsToggleMark(it.m.id, cb.checked); });
          var tx = document.createElement('span');
          tx.className = 'opf-qs-name';
          tx.textContent = String(it.e.comment || '').replace(/^\[本体\]|^\[DLC\]/, '');
          var sz = document.createElement('span');
          sz.className = 'opf-qs-size';
          sz.textContent = qsSize((it.e.content || '').length);
          row.appendChild(cb); row.appendChild(tx); row.appendChild(sz);
          listEl.appendChild(row);
        });
      });
    }
  }

  if (statEl) {
    var c = wpkCounts();
    var mine = qsSelectedChars(QS.marks);
    var cap = s.capChars || 30000;
    var head = '本功能 ' + QS.marks.length + ' 条 / 约 ' + Math.round(mine / 1000) + 'k 字';
    var tail = ' · 世界书已选 ' + c.selN + '/' + c.total + ' 条（约 ' + Math.round(c.chars / 1000) + 'k 字，上限 ' + Math.round(cap / 1000) + 'k）';
    statEl.textContent = head + tail;
    statEl.className = 'opf-dim' + (c.chars >= cap ? ' warn' : '');
    var raise = getEl('opf-qs-raise');
    if (raise) raise.style.display = (c.chars >= cap) ? '' : 'none';
  }
}
function qsSize(n) {
  return n >= 1000 ? (Math.round(n / 100) / 10) + 'k' : String(n);
}
function qsHint(text) {
  var d = document.createElement('div');
  d.className = 'opf-qs-hint';
  d.textContent = text;
  return d;
}

// ---------------- UI ----------------
var QS_CSS = [
  '#opf-page-preset #opf-body>.opf-hero,#opf-page-preset #opf-body>#opf-qs-card{grid-column:1/-1}',
  '.opf-hero{display:flex;flex-direction:column;gap:7px}',
  '.opf-hero-t{font-size:17px;font-weight:700;letter-spacing:1.5px;color:#ffd9de;text-shadow:0 0 12px rgba(255,77,94,.45)}',
  '.opf-hero-t .s{font-size:12px;font-weight:500;letter-spacing:.5px;color:rgba(255,200,208,.65);margin-left:8px}',
  '.opf-card{border:1px solid rgba(255,122,138,.22);border-radius:12px;background:linear-gradient(180deg,rgba(255,235,238,.055),rgba(255,235,238,.015));box-shadow:0 6px 18px rgba(0,0,0,.18);padding:11px 13px 12px;display:flex;flex-direction:column;gap:9px;min-width:0}',
  '.opf-card-hd{display:flex;align-items:center;gap:9px;min-width:0}',
  '.opf-card-no{flex:none;font-size:10.5px;letter-spacing:1px;color:#ffd9a8;background:rgba(200,130,40,.14);border:1px solid rgba(255,190,120,.32);border-radius:6px;padding:1px 7px;line-height:1.6}',
  '.opf-card-t{flex:none;font-size:14px;font-weight:600;color:#ffe9ec}',
  '.opf-card-sub{flex:1 1 auto;min-width:0;font-size:11.5px;color:rgba(255,200,208,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.opf-card .opf-opts{padding:0!important}',
  '.opf-card .opf-sec{padding:0!important}',
  '#opf-qs-card{gap:8px}',
  '.opf-qs-toggle{font-size:13.5px!important;gap:8px!important;padding:2px 0}',
  '.opf-qs-body{display:flex;flex-direction:column;gap:8px}',
  '.opf-qs-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}',
  '.opf-qs-loc{max-width:min(420px,100%);border-radius:8px;padding:5px 8px;font-size:13px;color:#ffeef1;background:rgba(10,2,5,.6);border:1px solid rgba(255,122,138,.3);outline:none}',
  '.opf-qs-loc:focus{border-color:rgba(255,110,125,.65);box-shadow:0 0 8px rgba(255,77,94,.25)}',
  '#opf-qs-stat.warn{color:#ffcf9a}',
  '#opf-qs-list{display:flex;flex-direction:column;gap:2px;max-height:270px;overflow:auto;padding:2px 2px 2px 0}',
  '.opf-qs-group{margin:6px 0 2px;font-size:11.5px;letter-spacing:1px;color:#ffb7be;border-left:2px solid rgba(255,90,105,.55);padding-left:7px}',
  '.opf-qs-item{display:flex;align-items:flex-start;gap:7px;padding:3px 6px;border-radius:7px;font-size:12.5px;color:rgba(255,236,240,.9);cursor:pointer;line-height:1.4}',
  '.opf-qs-item:hover{background:rgba(255,235,238,.06)}',
  '.opf-qs-item input{margin-top:2px;flex:none;accent-color:#ff4d5e;cursor:pointer}',
  '.opf-qs-item.off{opacity:.48}',
  '.opf-qs-item .opf-qs-name{flex:1 1 auto;min-width:0;word-break:break-word}',
  '.opf-qs-item .opf-qs-size{flex:none;font-size:10.5px;color:rgba(255,200,208,.45)}',
  '.opf-qs-hint{font-size:12px;line-height:1.6;color:rgba(255,200,208,.6);padding:4px 2px}'
].join('');

function addQuickStartUI(root) {
  var card = root && root.querySelector ? root.querySelector('#opf-qs-card') : null;
  if (!card || QS.built) return;
  try {
    if (!getEl(NS + '_css_qs')) {
      var st = document.createElement('style');
      st.id = NS + '_css_qs';
      st.textContent = QS_CSS;
      document.head.appendChild(st);
    }
  } catch (e) { opfErr('qs css', e); }

  card.innerHTML = '<div class="opf-card-hd"><span class="opf-card-no">QS</span><span class="opf-card-t">快速开局</span>' +
    '<span class="opf-card-sub">一键勾好生成所需条目，再按开局地点自动选条目（可逐条取消）</span></div>' +
    '<label class="opf-opt opf-qs-toggle"><input type="checkbox" id="opf-ck-fast"> 启用快速开局（自动勾选本工具生成开局预设必需的世界书条目）</label>' +
    '<div class="opf-qs-body" id="opf-qs-body" style="display:none">' +
    '<div class="opf-qs-row">' +
    '<label class="opf-opt" for="opf-qs-loc">开局地点 <select id="opf-qs-loc" class="opf-qs-loc"></select></label>' +
    '<button class="opf-step-act" id="opf-qs-reapply" type="button" title="按当前地点重新勾选（会把你手动取消的条目再勾回来）">↻ 重新智能勾选</button>' +
    '<button class="opf-step-act" id="opf-qs-clear" type="button" title="只取消本功能勾过的条目，别的手动勾选不动">✕ 取消本功能勾选</button>' +
    '<button class="opf-step-act" id="opf-qs-raise" type="button" style="display:none" title="把世界书注入上限提到当前总量，避免末尾被截断">↑ 调高注入上限</button>' +
    '</div>' +
    '<div class="opf-dim" id="opf-qs-stat">—</div>' +
    '<div id="opf-qs-list"></div>' +
    '</div>';

  var ck = getEl('opf-ck-fast');
  var loc = getEl('opf-qs-loc');
  var body = getEl('opf-qs-body');

  ck.addEventListener('change', function () {
    var s = getSettings();
    s.quickStart = !!ck.checked;
    saveSettings();
    if (body) body.style.display = s.quickStart ? '' : 'none';
    if (s.quickStart) { qsApply(true); renderMetaStatus(); }
    qsRender();
  });
  loc.addEventListener('change', function () {
    var s = getSettings();
    s.quickStartLoc = loc.value || '';
    saveSettings();
    if (s.quickStart) qsApply(true);
    qsRender();
  });
  getEl('opf-qs-reapply').addEventListener('click', function () {
    if (!getSettings().quickStart) { toast('先勾选「启用快速开局」', 'warning'); return; }
    qsApply(false);
  });
  getEl('opf-qs-clear').addEventListener('click', function () { qsClearMarks(false); });
  getEl('opf-qs-raise').addEventListener('click', function () {
    var s = getSettings(), c = wpkCounts();
    s.capChars = Math.min(200000, Math.max(1000, Math.ceil((c.chars * 1.05) / 1000) * 1000));
    saveSettings();
    var capEl = getEl('opf-cap'); if (capEl) capEl.value = s.capChars;
    try { updateSendText(); renderMetaStatus(); } catch (e) {}
    qsRender();
    toast('世界书注入上限已调到 ' + s.capChars + ' 字');
  });

  QS.built = true;
  qsSyncUi();
  if (getSettings().quickStart) { QS.marks = qsPlan((ST.wb && ST.wb.entries) || [], getSettings().quickStartLoc || ''); }
  qsRender();
}
