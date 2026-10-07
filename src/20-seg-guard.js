//@module 20-seg-guard — 分段「AI 回复」落地前的判定与闸门（③ 二创角色 / ④ 命定系统 共用）
// ============================================================================
// 为什么有这一块（用户反馈的现网故障，v1.18.2 及更早）：
//   ③ 页点「⚔ 交火梳理」后，模型回了一句
//     「按照你的规则，对于这一段，我的回答是：无改动」
//   而当时的落地判断是 /^无改动[。．.]*$/ —— 它要求**整条回复从头到尾只有这三个字**。
//   多一个字、加一句前言、加个列表符号、加个括号后缀，正则就不匹配，
//   于是这句客套话被当成「修订后的整段正文」写回分段，刚生成好的设定被整段覆盖。
//   六段走的是同一条判断，模型只要一直这么答，六段会一起被清空；而分段草稿是
//   单份快照 + 2.5 秒自动存档（50-char.js 的 charDraftCacheSave / 36-projects.js 的 projTick），
//   没有历史版本 —— 用户找不回来。
//
// 这一块只做"写回之前"的三件守门事，**不动任何提示词语义**：
//   ① opfIsNoChangeReply()  —— 认出"其实是在说本段无需改动"的各种说法（前言/装饰/后缀都算）；
//   ② opfSegApplyGuard()    —— 写入闸门：空转 → 保留原文；偏短/丢结构 → 不静默落地，交用户裁决；
//   ③ 快照 / 撤销工具        —— 进任何会改分段的操作前存一份，出事了能一键退回。
//
// 原则：**宁可保留原文（用户能重跑），也不要静默写坏（用户找不回来）。**
// 与 ⑤ 正则工坊既有的"偏短裁决"同一惯例（76-regex-main.js 的 tooShort → window.confirm 默认保留原样）。

// 「本段无需改动」的各种说法（含同义改写）
var SEG_NOCHANGE_WORDS = /无改动|无需改动|不需要改动|不用改动|不必改动|无需修改|不需要修改|不用修改|不必修改|无需调整|不需调整|不用调整|无需变更|无变更|无需更动|保持原样|保持原状|维持原样|维持原状|维持不变|保持不变|原样保留/;

// 本段「正文特征」：出现这些就说明回复里有真内容，绝不能当空转处理。
// 注意第 3 条用例（"技能：无改动冷却的瞬发"）：光有关键词还不够，必须**关键词+冒号**才算字段行，
// 否则会把一句正常设定误判成空转。
function opfSegLooksLikeContent(t) {
  var s = String(t == null ? '' : t);
  if (/(名称|品质|叙述|类型|技能|装备|道具|外貌|服装|性格|背景|过去|语料|行为|禁忌|提倡|系统|核心|契约|概念|人设|功能|规则|槽|标签|开场白|范例)\s*[:：]/.test(s)) return true;
  if (s.length > 200) return true;
  if (/<<<SEG:/.test(s)) return true;
  var lines = s.split(/\r?\n/).filter(function (l) { return String(l).trim(); });
  return lines.length >= 4;
}

// 去掉装饰：代码围栏 / 行首列表符号与编号 / 全部空白 / markdown 强调与引号 / 常见标点。
// 只用于"是不是只在说无改动"这一个判断，不参与落地文本。
function opfSegStripDecor(t) {
  return String(t == null ? '' : t)
    .replace(/```[a-zA-Z]*/g, '')
    .replace(/^[\s>*+\-•·—]+/gm, '')
    .replace(/^\s*\d+[.、)]\s*/gm, '')
    .replace(/[\s\u3000]+/g, '')
    .replace(/[*_`~"'“”‘’「」『』《》〈〉【】\[\]()（）{}]/g, '')
    .replace(/[。．.、,，;；:：!！?？—－–…·]/g, '');
}

// 模型是不是在说"本段无需改动"（＝不该覆盖原文）
function opfIsNoChangeReply(text) {
  var t = String(text == null ? '' : text).trim();
  if (!t) return true;                                     // 空回复＝什么都没改，保留原文
  var core = opfSegStripDecor(t);
  if (!core) return true;                                  // 只剩装饰符号
  // ① 剥掉装饰后，核心就是一句"无改动"（允许"本段/这一段/内容"等前缀混在里面）
  if (core.length <= 14 && SEG_NOCHANGE_WORDS.test(core)) return true;
  // ② 短回复里出现"无改动/不需要修改"之类，且通篇没有任何本段正文特征 → 也是空转
  if (t.length <= 60 && SEG_NOCHANGE_WORDS.test(t) && !opfSegLooksLikeContent(t)) return true;
  // ③ 只回了一个"无"（模型说"本段没有要改的"）
  if (core.length <= 4 && /^(?:本段|该段|这一段|此段)?(?:无|没有|none|n\/a)$/i.test(core)) return true;
  return false;
}

// 剥掉"按照…／我的回答是…／好的…"这类元说明行（只在整条回复里第一/第二行、且该行不含正文特征时才剥）。
// 剥完如果什么都不剩，就原样返回，交给 opfIsNoChangeReply 去判空转。
function opfSegStripReplyPreamble(text) {
  var s = String(text == null ? '' : text).replace(/^\s+/, '');
  var lines = s.split(/\r?\n/);
  var drop = 0;
  while (drop < lines.length && drop < 2) {
    var ln = String(lines[drop]).trim();
    if (!ln) { drop++; continue; }
    if (ln.length > 60) break;
    if (opfSegLooksLikeContent(ln)) break;
    var meta = /^(?:好的|好[的嘞吧]?|明白|了解|收到|遵照|按照|依据|根据|依照|基于|综上|首先)/.test(ln)
      || /(?:我的回答是|回答如下|以下是|下面是|如下所示|见下)(?:[：:]|$)/.test(ln);
    if (!meta) break;
    drop++;
  }
  if (!drop) return s;
  var rest = lines.slice(drop).join('\n').replace(/^\s+/, '');
  return rest.trim() ? rest : s;
}

// 没有 UI（或用户没表态）时：一律"保留原样"——绝不静默落地
function opfSegConfirmAsk(msg) {
  try { if (typeof window !== 'undefined' && typeof window.confirm === 'function') return !!window.confirm(msg); } catch (e) {}
  return false;
}

// 本段原有小标题（【…】行）有没有被整段丢掉
function opfSegStructureLoss(oldText, newText) {
  var oldH = (String(oldText || '').match(/^[ \t]*【[^】]{1,20}】/gm) || []).length;
  if (oldH < 2) return false;
  var newH = (String(newText || '').match(/^[ \t]*【[^】]{1,20}】/gm) || []).length;
  return newH === 0;
}

// 写入闸门。返回值：
//   { action:'write', text }                      —— 可以写回（text 已剥掉前言）
//   { action:'write', text, note }                —— 偏短但用户点了"替换"
//   { action:'keep',  reason:'nochange' }         —— 模型说本段无需改动 / 空回复
//   { action:'keep',  reason:'blocked', note }    —— 疑似不是正文，已保留原文
// confirmFn 可注入（测试用）；默认走 window.confirm，没有 UI 时按"保留原样"处理。
function opfSegApplyGuard(oldText, newText, label, confirmFn) {
  var old = String(oldText == null ? '' : oldText);
  var txt = opfSegStripReplyPreamble(String(newText == null ? '' : newText));
  if (!txt || !txt.trim()) return { action: 'keep', reason: 'nochange' };
  if (opfIsNoChangeReply(txt)) return { action: 'keep', reason: 'nochange' };
  var minLen = Math.max(120, Math.floor(old.length * 0.3));
  var loss = opfSegStructureLoss(old, txt);
  if (old.length >= 200 && (txt.length < minLen || loss)) {
    var pct = Math.round((1 - txt.length / Math.max(1, old.length)) * 100);
    var note = '改后只有 ' + txt.length + ' 字，原 ' + old.length + ' 字（-' + pct + '%）'
      + (loss ? '，且本段原有的小标题结构全丢了' : '')
      + '，疑似只回了一句空转/说明而不是正文';
    var ask = (typeof confirmFn === 'function') ? confirmFn : opfSegConfirmAsk;
    var yes = false;
    try { yes = !!ask(note + '。\n\n要用这次的结果替换「' + String(label || '本段') + '」吗？\n（点「取消」= 保留原文，稍后可重跑本段；点「确定」= 替换，之后可用「↩ 撤销上次改动」退回）'); } catch (e) { yes = false; }
    if (!yes) return { action: 'keep', reason: 'blocked', note: note };
    return { action: 'write', text: txt, note: note + '（你选择替换）' };
  }
  return { action: 'write', text: txt };
}

// 交火梳理完成后的统计行（两页共用同一口径，报告里必须说清"改写几段/无需改动几段/拦下几段"）
function opfSegLinkSummary(changed, same, blockedCount, stopped) {
  if (stopped) return '\n\n（已停止：修订应用中断）';
  return '\n\n（修订应用完成：改写 ' + changed + ' 段，本段无需改动 ' + same + ' 段'
    + (blockedCount ? '，拦下 ' + blockedCount + ' 段' : '') + '）';
}

// 被拦下的段落清单（挂进报告：绝不静默吞掉模型的回复，用户要能人工核对）
function opfSegBlockedText(list) {
  if (!list || !list.length) return '';
  var out = ['⚠ 以下段落的 AI 回复疑似不是正文（已保留原文，未覆盖）：'];
  list.forEach(function (b) {
    out.push('【' + (b.title || '本段') + '】' + (b.note ? ' ' + b.note : ''));
    var t = String(b.text == null ? '' : b.text);
    out.push('模型原文：' + t.replace(/\s+/g, ' ').slice(0, 300) + (t.length > 300 ? '…' : ''));
  });
  out.push('要采用这些回复，请重新点「⚔ 交火梳理」，或用该段的「定点修改」按你的指令重写。');
  return out.join('\n');
}

// ---------------- 快照 / 撤销（任何会改分段的操作之前先存一份） ----------------
// 挂在 ST.char / ST.dest 上的小栈：session 级（localStorage 草稿只存正文，不存历史），
// 最多留 SEG_UNDO_MAX 份，几十 KB 而已。
var SEG_UNDO_MAX = 3;
function segUndoClone(o) { try { return JSON.parse(JSON.stringify(o == null ? {} : o)); } catch (e) { return {}; } }
function segUndoStack(holder) { if (!holder) return []; holder._undo = holder._undo || []; return holder._undo; }
function segUndoPush(holder, label, segs) {
  if (!holder) return;
  var st = segUndoStack(holder);
  st.push({ label: String(label || '改动'), at: Date.now(), segs: segUndoClone(segs) });
  while (st.length > SEG_UNDO_MAX) st.shift();
}
function segUndoPop(holder) {
  var st = segUndoStack(holder);
  return st.length ? st.pop() : null;
}
function segUndoTop(holder) {
  var st = segUndoStack(holder);
  return st.length ? st[st.length - 1] : null;
}
