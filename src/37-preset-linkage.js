//@module 37-preset-linkage — ① 开局预设：交火处理（审查报告 → 按报告逐栏修订 → 重新汇总）
// 与 ③④ 页的「交火梳理」同一套思路：第一步只出报告（输出小、不截断），第二步每栏单独调用。
// 两步的提示词都带 [文风与信息边界]（ANTI_SLOP_RULES），与背景阶段用的是同一段原文。
var LINK_COL_RULES = {
  skill: '技能同时有「消耗」（攻击: X MP / 动作: X MP/SP，被动技不写）与「点数」（整数，落在品质区间）两个字段；标签必须齐三类：关联属性 / 目标类型 / 核心功能；只有攻击技写「威力: N」。',
  equip: '装备标签写「攻击: N」「防御: N」「防御(部位): N」；装备不增减持有者属性；史诗/传说/神话分别要有一条微弱要素/权能/法则词条。',
  item: '道具要有数量 quantity；徽记写成 [徽记: …]；词条上限按品质。',
  asset: '资产写全 类型/标签/总空间/结算/位置/描述/内部资产，金额用 Z；点数用资产区间（普通100-180 / 优良180-350 / 稀有350-700 / 史诗700-1300 / 传说1300-2200 / 神话2200-3000 / 唯一666）。',
  background: '背景只修叙事与信息边界（谁在场、谁知道什么、消息传播要时间、别写角色不可能知道的事），不改人物与条目的既有事实；整段不少于 500 字。',
};
var LINK_CHAIN = [
  'L1 人物 ↔ 背景：种族 / 身份 / 等级 / 起始地点，与背景里的出身、经历、所在地一致，等级有来历',
  'L2 数值：等级 ↔ 五维（属性 = 天赋基础 + 层级固定 + 等级额外，基础点总和等于天赋档位）↔ 转生点 reincarnationPoints 与各条目点数总和',
  'L3 战斗：技能 / 装备 ↔ 职业与战斗风格；技能同时有「消耗」（攻击: X MP / 动作: X MP/SP，被动不写）与「点数」（整数，按品质区间）；来源（学习 / 领悟 / 血脉 / 收编）在背景里说得通',
  'L4 资产：类型 / 标签 / 总空间 / 结算 / 位置 / 内部资产自洽，金额用 Z，规模与身份财力相称，点数用资产区间',
  'L5 伙伴：生命层级 ↔ 等级 ↔ 属性 ↔ 装备 / 技能，关系与好感有来由',
  'L6 题材与基调：故事基调与开局题材必须落到具体场景、条目与文风上',
  'L7 格式：品级七等、点数区间、技能标签三类（关联属性 / 目标类型 / 核心功能）、装备标签「攻击: N」「防御: N」「防御(部位): N」、史诗以上要有微弱要素 / 权能 / 法则词条',
].join('\n');

function linkCols() {
  return PHASES.filter(function (p) { return p.key !== 'final'; }).map(function (p) { return p.id; });
}
function linkTitle(id) {
  for (var i = 0; i < PHASES.length; i++) if (PHASES[i].id === id) return PHASES[i].title;
  return id;
}
function linkShort(id) {
  for (var i = 0; i < PHASES.length; i++) if (PHASES[i].id === id) return PHASES[i].short;
  return id;
}
function linkMaterial(cap) {
  cap = cap || 4000;
  return linkCols().map(function (k) {
    var t = String(ST.results[k] || '（未生成）');
    if (t.length > cap) t = t.slice(0, cap) + '\n……（截断）';
    return '【' + linkShort(k) + '】\n' + t;
  }).join('\n\n');
}

function presetLinkReportTask() {
  return '【交火处理 · 第一步：只出审查报告，不改任何一栏】\n' +
    '下面是我这份开局预设各栏的现行内容（过长会截断）。请按联动链条逐条核对，找出互相矛盾、口径不一致、数值 / 品质 / 点数越界、来源说不通、与故事基调或开局题材不贴合的地方。\n\n' +
    '[联动链条]\n' + LINK_CHAIN + '\n\n' +
    '[文风与信息边界]（第二步修订也照它执行）\n' + ANTI_SLOP_RULES + '\n\n' +
    '[各栏现状]\n' + linkMaterial() + '\n\n' +
    '[输出要求]\n' +
    '1) 只输出报告：不要重写任何一栏，不要输出 JSON，不要写开场白。\n' +
    '2) 「冲突清单」每条一行，格式「[高/中/低] 栏目·条目：问题 → 怎么改」；该栏没问题的写「✓ 无明显冲突」。\n' +
    '3) 「每栏修改要点」：技能、装备、道具、资产、背景 各 1-3 条，只写要改什么，不要贴正文。';
}

function presetLinkApplyTask(col, report) {
  var title = linkShort(col);
  var extra = LINK_COL_RULES[col] || '';
  var rep = String(report || '').slice(0, 6000);
  return '【交火处理 · 第二步：按报告修订「' + title + '」这一栏】\n\n' +
    '[审查报告与改动清单]\n' + rep + '\n\n' +
    '[本栏现行内容]\n' + String(ST.results[col] || '') + '\n\n' +
    '[文风与信息边界]\n' + ANTI_SLOP_RULES + '\n\n' +
    '[修订要求]\n' +
    '1. 只输出「' + title + '」这一栏修订后的完整内容，沿用原来的书目格式与条目数量；可增删但必须对应报告点名的条目，不要输出 JSON、不要解释、不要写前言或「按照…」这类开场。\n' +
    '2. 报告点名的问题必须真的改掉或删掉，旧内容不许留在原地与新内容并排（叠加＝没改）；除报告点名的部分外保持原样，不许顺手扩写。\n' +
    '3. ' + extra + '\n' +
    '4. 与故事基调、开局题材不贴合的地方，按报告调整。\n' +
    '5. 确实无需修改，就只输出四个字：无改动';
}

// ---------------- 执行 ----------------
async function runPresetLinkage() {
  if (ST.running) { toast('已有任务进行中（单线程），请稍候', 'warning'); return; }
  var cols = linkCols();
  var missing = cols.filter(function (k) { return !ST.results[k]; });
  if (missing.length) {
    toast('交火处理需要先跑出这些栏目：' + missing.map(linkShort).join('、'), 'warning');
    return;
  }
  var repEl = getEl('opf-lk-report');
  var stEl = getEl('opf-lk-status');
  var runB = getEl('opf-lk-run');
  var undoB = getEl('opf-lk-undo');
  ST.running = true; ST.stopReq = false;
  if (runB) runB.disabled = true;
  renderRunButtons();
  if (repEl) { repEl.style.display = ''; repEl.textContent = '交火处理中…（第一步：审查报告）'; }
  if (stEl) stEl.textContent = '第一步：审查中…';
  try {
    // ---- 第一步：只出报告 ----
    var msgs = sxPresetMessages();
    sxTurn(presetLinkReportTask(), '按上面的要求，只输出审查报告与每栏修改要点。').forEach(function (m) { msgs.push(m); });
    var resp = await callModelSeg(msgs, '交火处理·审查', function (note) {
      if (stEl) stEl.textContent = '第一步：审查中… ' + (note || '');
    });
    ST.lkReport = String(resp || '').trim() || '（报告为空）';
    if (repEl) repEl.textContent = ST.lkReport;
    if (isStop()) { toast('已停止'); return; }

    // ---- 第二步：逐栏修订（每栏单独一次调用，落地前过守门）----
    ST.lkSnapshot = {};
    cols.forEach(function (k) { ST.lkSnapshot[k] = ST.results[k]; });
    var changed = 0, same = 0, blocked = [];
    for (var i = 0; i < cols.length; i++) {
      if (isStop()) break;
      var col = cols[i];
      var title = linkShort(col);
      if (stEl) stEl.textContent = '第二步：修订「' + title + '」（' + (i + 1) + '/' + cols.length + '）…';
      if (repEl) repEl.textContent = ST.lkReport + '\n\n—— 正在修订（' + (i + 1) + '/' + cols.length + '：' + title + '）——';
      setPhase(col, 'run');
      var m2 = sxPresetMessages();
      sxTurn(presetLinkApplyTask(col, ST.lkReport), '只输出「' + title + '」这一栏的修订后内容。').forEach(function (m) { m2.push(m); });
      var resp2 = await callModelSeg(m2, '交火处理·' + title, function (note) {
        if (stEl) stEl.textContent = '第二步：修订「' + title + '」… ' + (note || '');
      });
      // 守门：空转回复 → 保留原文；疑似不是正文（偏短/丢结构）→ 不静默覆盖，挂进报告
      var g = opfSegApplyGuard(ST.results[col], resp2, title, function () { return false; });
      if (g.action === 'write') { ST.results[col] = g.text; changed++; }
      else if (g.reason === 'blocked') { blocked.push({ title: title, note: g.note, text: resp2 }); }
      else { same++; }
      setPhase(col, 'ok');
      await waitTick();
    }
    renderSteps();
    for (var j = 0; j < cols.length; j++) if (ST.results[cols[j]] !== ST.lkSnapshot[cols[j]]) markDirty(cols[j]);
    if (repEl) repEl.textContent = ST.lkReport + opfSegLinkSummary(changed, same, blocked.length, isStop()) + (blocked.length ? '\n\n' + opfSegBlockedText(blocked) : '');
    if (stEl) {
      stEl.textContent = isStop()
        ? '已停止（已修订的栏目保留，可点「↩ 撤销交火改动」退回）'
        : '完成：改写 ' + changed + ' 栏，无需改动 ' + same + ' 栏' + (blocked.length ? '，拦下 ' + blocked.length + ' 栏' : '') + '。下一步点「⟳ 重新汇总」重建 JSON。';
    }
    if (undoB) undoB.disabled = false;
    if (isStop()) { toast('已停止'); }
    else if (blocked.length) toast('交火处理：改写 ' + changed + ' 栏，拦下 ' + blocked.length + ' 栏（原文已保留，见报告）', 'warning');
    else toast('交火处理完成：改写 ' + changed + ' 栏，无需改动 ' + same + ' 栏；记得「⟳ 重新汇总」');
  } catch (e) {
    if (repEl) repEl.textContent = '交火处理失败：' + (e && e.message ? e.message : e);
    if (stEl) stEl.textContent = '失败：' + (e && e.message ? e.message : e);
    toast('交火处理出错：' + (e && e.message ? e.message : e), 'error');
  } finally {
    ST.running = false;
    if (runB) runB.disabled = false;
    renderRunButtons();
  }
}

function undoPresetLinkage() {
  if (ST.running) { toast('请先停止当前流程', 'warning'); return; }
  if (!ST.lkSnapshot) { toast('还没有可撤销的交火改动', 'warning'); return; }
  var n = 0;
  linkCols().forEach(function (k) {
    if (ST.results[k] !== ST.lkSnapshot[k]) { ST.results[k] = ST.lkSnapshot[k]; n++; }
  });
  ST.lkSnapshot = null;
  renderSteps();
  var undoB = getEl('opf-lk-undo'); if (undoB) undoB.disabled = true;
  var stEl = getEl('opf-lk-status'); if (stEl) stEl.textContent = '已撤销交火改动（' + n + ' 栏还原）。';
  toast(n ? '已撤销交火改动：还原 ' + n + ' 栏' : '没有需要还原的栏目');
}

// ---------------- UI ----------------
var LINK_CSS = [
  '#opf-lk-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}',
  '#opf-lk-run,#opf-lk-undo{flex:1 1 140px}',
  '#opf-lk-report{max-height:340px;min-height:60px;margin-top:6px;font-size:12.5px;line-height:1.6}'
].join('');

function addPresetLinkageUI(root) {
  if (!root || getEl('opf-lk-run')) return;
  try {
    if (!getEl(NS + '_css_lk')) {
      var st = document.createElement('style');
      st.id = NS + '_css_lk';
      st.textContent = LINK_CSS;
      document.head.appendChild(st);
    }
  } catch (e) { opfErr('linkage css', e); }

  var resumBtn = getEl('opf-resum');
  var anchor = resumBtn && resumBtn.closest ? resumBtn.closest('.opf-sec') : null;
  var sec = document.createElement('div'); sec.className = 'opf-sec';
  var lab = document.createElement('div'); lab.className = 'opf-sec-label'; lab.textContent = '交火处理';
  var dim = document.createElement('div'); dim.className = 'opf-dim'; dim.id = 'opf-lk-status';
  dim.textContent = '四栏跑完后点一次：先出报告，再按报告逐栏修订（不动没被点名的内容），最后自己点「⟳ 重新汇总」。';
  var row = document.createElement('div'); row.id = 'opf-lk-row';
  var bRun = document.createElement('button'); bRun.type = 'button'; bRun.className = 'opf-btn ghost'; bRun.id = 'opf-lk-run'; bRun.textContent = '⚔ 交火处理';
  bRun.title = '按联动链条审查这份开局预设，出报告后逐栏修订（技能 / 装备 / 道具 / 资产 / 背景）';
  var bUndo = document.createElement('button'); bUndo.type = 'button'; bUndo.className = 'opf-btn ghost'; bUndo.id = 'opf-lk-undo'; bUndo.textContent = '↩ 撤销交火改动'; bUndo.disabled = true;
  row.appendChild(bRun); row.appendChild(bUndo);
  var rep = document.createElement('pre'); rep.id = 'opf-lk-report'; rep.className = 'opf-box'; rep.style.display = 'none'; rep.textContent = '';
  sec.appendChild(lab); sec.appendChild(dim); sec.appendChild(row); sec.appendChild(rep);
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor.nextSibling);
  else root.appendChild(sec);

  bRun.addEventListener('click', function () { runPresetLinkage(); });
  bUndo.addEventListener('click', function () { undoPresetLinkage(); });
}

