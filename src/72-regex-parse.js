//@module 72-regex-parse — ⑤ 正则工坊：语言格式解析 + 自检 + 硬约束
// ============================================================================
// v1.9.0 正则工坊：命定系统对话美化正则
// 匹配式由插件确定生成（依据核心「语言格式」节解析结果），替换体由模型产出
// 依据：现有 4 条生产正则（命定核心-艾莉亚-车票技能美化 / 月蚀对话美化 / 飨宴 / 去思维链）
// ============================================================================
var LS_RX_KEY = NS + "_regexdraft_v1";
var RX_TIERS = [
  { id: 'mini',   label: '极简',   target: 1500 },
  { id: 'light',  label: '轻量',   target: 3000 },
  { id: 'std',    label: '标准',   target: 6000 },
  { id: 'fine',   label: '精致',   target: 10000 },
  { id: 'lux',    label: '豪华',   target: 20000 },
  { id: 'free',   label: '不设限', target: 0 }
];
var RX_PURPOSES = ['对话美化', '登场/开场白', '缔结契约成功', '命运抽卡', '咏唱/专属块', '自定义'];
var RX_HTML_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'p', 'br', 'hr', 'table', 'tr', 'td', 'th',
  'ul', 'ol', 'li', 'style', 'script', 'svg', 'details', 'summary', 'code', 'pre', 'a', 'img', 'b', 'i', 'strong', 'em', 'font'];
var RX_RULES = [
  '【美化正则·硬约束（写替换体时必须逐条遵守）】',
  '1. 匹配式已由插件生成并锁定，你只写替换体（HTML）；不得改动匹配式的捕获组编号与含义。',
  '2. 替换体只做显示层：markdownOnly=true、promptOnly=false，禁止两者同时为 true。',
  '3. 替换体自带 <style>（骨架已给出位置与 class），class 前缀必须严格用给定的那个，不得复用他人前缀。',
  '4. 禁止 <script>；禁止引用任何外部资源（字体 CDN / 图片 URL / @import）；字体只用系统字体栈。',
  '5. 最外层容器一律 max-width:100%，窄屏（≤420px）不得溢出；但法阵/粒子/角标这类装饰层允许固定像素尺寸与破框显示。',
  '6. 正文里若出现 $ 字符，必须写成 $$，避免被当成捕获组引用。',
  '7. 情绪/情景参数用 data-mood="$2" 之类属性挂到最外层 div，再用属性选择器分支配色——一条替换体覆盖全部枚举，不要为每个情绪写一条正则。',
  '8. 不残留裸 > 引语；替换后正文必须仍然可读，不得依赖悬停才显示文字。',
  '9. 动效克制：@keyframes 只用于呼吸/流光/入场，周期 ≥2s，不得连续高频闪烁。',
  '10. 按给定档位的目标字数写作（浮动 ±30% 以内）；档位为「不设限」时不设上限，以视觉完整、不冗余为准。',
  '11. 颜色从核心的世界观与命定之灵人格出发（傲慢用冷金、狂热用灼红、冰冷用青白…），不要用纯黑纯白。',
  '12. 只输出 HTML 本体，放在一个 ```html 代码块里；代码块外不写任何解释文字。'
].join('\n');
// ============================================================================
// 初始框架（骨架款式）：标准取自 4 条现网可用的正则，而不是「一个带边框的 div」
//   ① 大比目鱼对话    紧凑卡 + 左缘光带 + 呼吸底色 + hover 涟漪
//   ② 月蚀对话        三层 SVG 法阵 + 漂浮光尘 + 标题栏 + 装饰破框
//   ③ 飨宴            details/summary 揭幕式，点开播放爆发动效
//   ④ 崩坏意志        同一框架用 data-mood 属性选择器覆盖全部枚举（只改变量）
// 骨架仍由代码生成（$n 引用、class 前缀、变量契约都不会错），模型只写 CSS。
// ============================================================================
var RX_FRAMES = [
  {
    id: 'card', label: '标准卡·左缘光带', from: '标准 ≈ 范例① 大比目鱼对话',
    decor: 'dust', tierHint: 'std', interactive: false,
    desc: '外框 + 左缘光带 + 标题行（纹章·名号·情绪胶囊）+ 正文；呼吸底色，hover 浮起并放出涟漪。',
    parts: [
      ['{P}-box', '最外层：变量、底色渐变、边框（左缘用强调色加粗）、圆角、内外边距、hover 位移与发光'],
      ['{P}-head', '标题行：flex 两端对齐、底部分隔线'],
      ['{P}-emblem', '纹章符号：颜色、发光、缓慢旋转或脉冲'],
      ['{P}-name', '名号：字距、渐变文字或发光'],
      ['{P}-mood', '情绪胶囊（核心有 mood 参数时才有）'],
      ['{P}-rule', '标题行右侧渐隐分隔线'],
      ['{P}-body', '正文：行高、字色、文字阴影、长文与换行'],
      ['{P}-dust', '两枚漂浮微尘：位置、大小、上浮动画']
    ]
  },
  {
    id: 'array', label: '法阵卡·装饰破框', from: '标准 ≈ 范例② 月蚀 / 范例④ 崩坏意志',
    decor: 'array', tierHint: 'fine', interactive: false,
    desc: '三层 SVG 法阵（描边环 + 环形铭文 + 几何核心）+ 漂浮光尘 + 标题栏 + 正文；装饰允许破框，hover 时换层缩放。',
    parts: [
      ['{P}-box', '最外层：变量、底色、边框、内外边距；装饰要破框，所以不要 overflow:hidden'],
      ['{P}-visual', '视觉层：绝对定位铺满、pointer-events:none、z-index 低于文字'],
      ['{P}-array', '法阵 SVG：尺寸、定位（一角外溢）、透明度、hover 放大'],
      ['{P}-orbit-1/-2/-3', '三层轨道：各自的方向与周期（≥2s）+ 变换原点（240 视图里是 120px 120px）'],
      ['{P}-head / -emblem / -name / -mood / -rule', '标题行（同标准卡）'],
      ['{P}-body', '正文：始终可读，压在视觉层之上'],
      ['{P}-dust', '漂浮光尘：位置、大小、上浮与淡出动画']
    ]
  },
  {
    id: 'reveal', label: '揭幕式·点击爆发', from: '标准 ≈ 范例③ 飨宴',
    decor: 'array', tierHint: 'lux', interactive: true,
    desc: 'details/summary 结算卡：点开播放分解/爆发动效并揭示正文；适合战斗结算、命运抽卡、缔结契约。',
    parts: [
      ['{P}-box（details）', '最外层 details：卡片外观 + list-style:none；[open] 时切换状态'],
      ['{P}-face（summary）', '未展开时的卡面：居中排布、隐藏原生三角（list-style:none 与 ::-webkit-details-marker）'],
      ['{P}-visual / -array / -orbit-1..3', '法阵（同法阵卡）'],
      ['{P}-head / -name / -mood / -rule', '标题行'],
      ['{P}-hint', '「点击展开」提示：字距、呼吸闪烁（周期 ≥2s）'],
      ['{P}-panel', '展开后的面板：内边距、上边框'],
      ['{P}-body', '正文（展开后显示，必须清晰可读）']
    ]
  },
  {
    id: 'plain', label: '极简·纯文字框', from: '极简 / 轻量档',
    decor: 'none', tierHint: 'mini', interactive: false,
    desc: '只有变量、边框与正文，最短最稳；窄屏与超长文本优先。',
    parts: [
      ['{P}-box', '最外层：变量、边框、底色、内外边距、max-width:100%'],
      ['{P}-head / -name', '名号行（可只留一行小字）'],
      ['{P}-body', '正文：行高、字色、换行']
    ]
  }
];
function rxFrameById(id) {
  return RX_FRAMES.filter(function (x) { return x.id === id; })[0] || null;
}
// 条目前缀 → 骨架里的公共前缀（`xxx-box` 归一成 `xxx`，避免出现 xxx-box-box）
function rxPreOf(item) { return String((item && item.prefix) || 'core-box').replace(/-box$/, ''); }
// 框架编号 → 分层清单（{P} 换成真实前缀）；只给模型看，用来对齐「该写哪几层」
function rxFrameLayers(frameId, pre) {
  var fr = rxFrameById(frameId) || RX_FRAMES[0];
  return fr.parts.map(function (p) { return '  ' + String(p[0]).replace(/\{P\}/g, pre) + ' —— ' + p[1]; }).join('\n');
}
// 骨架里写死的变量名 = 模型必须定义的变量（自检 undefvar 会核对，范例④ 就是这套写法）
function rxRequiredVars(pre, frameId) {
  var v = ['--' + pre + '-accent', '--' + pre + '-bg', '--' + pre + '-text', '--' + pre + '-line'];
  if ((rxFrameById(frameId) || {}).decor === 'array') v.push('--' + pre + '-accent-2');
  return v;
}
// 初始框架标准模板：注入「设计基调」那一段的提示词，让模型照这个层次写（不是只写一个边框）
function rxCssStandard(pre, hasMood, frameId) {
  var fr = rxFrameById(frameId) || RX_FRAMES[0];
  var L = [];
  L.push('/* —— 初始框架标准（骨架已经给好 class 与变量，请照这个层次写满）—— */');
  L.push('.' + pre + '-box {');
  L.push('  --' + pre + '-bg: #0b1020; --' + pre + '-accent: #7fd7ff; --' + pre + '-accent-2: #d4af37;');
  L.push('  --' + pre + '-text: #e8f1ff; --' + pre + '-line: rgba(127,215,255,.28);');
  L.push('  position: relative; max-width: 100%; margin: 12px auto; padding: 20px 24px;');
  L.push('  background: linear-gradient(135deg, var(--' + pre + '-bg), #05070f 60%); color: var(--' + pre + '-text);');
  L.push('  border: 1px solid var(--' + pre + '-line); border-left: 4px solid var(--' + pre + '-accent); border-radius: 8px;');
  if (fr.decor === 'array') L.push('  overflow: visible;                 /* 装饰要破框，不要再写 hidden 把法阵切掉 */');
  L.push('  transition: transform .4s ease, box-shadow .4s ease;');
  L.push('}');
  L.push('.' + pre + '-box:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,0,0,.6), 0 0 22px -4px var(--' + pre + '-accent); }');
  if (hasMood) L.push('.' + pre + '-box[data-mood="愉悦"] { --' + pre + '-accent: #eab33a; --' + pre + '-bg: #15110d; }   /* 每个枚举一条，只改变量 */');
  L.push('.' + pre + '-head { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding-bottom: 9px; border-bottom: 1px solid var(--' + pre + '-line); }');
  L.push('.' + pre + '-name { font-weight: 700; letter-spacing: .15em; color: var(--' + pre + '-accent); text-shadow: 0 0 12px var(--' + pre + '-accent); }');
  L.push('.' + pre + '-rule { flex-grow: 1; height: 1px; background: linear-gradient(90deg, var(--' + pre + '-line), transparent); }');
  L.push('.' + pre + '-body { position: relative; z-index: 2; line-height: 1.85; text-shadow: 0 2px 4px rgba(0,0,0,.9); }');
  if (fr.decor === 'array') {
    L.push('/* 装饰层（法阵 / 粒子 / 角标）可以写固定 px、可以超出外框；只有最外层容器必须 max-width:100% */');
    L.push('.' + pre + '-visual { position: absolute; inset: 0; pointer-events: none; z-index: 0; }');
    L.push('.' + pre + '-array { position: absolute; right: -30px; bottom: -30px; width: 220px; height: 220px; opacity: .55; overflow: visible; }');
    L.push('.' + pre + '-orbit { transform-origin: 120px 120px; animation: ' + pre + '-spin 45s linear infinite; }');
    L.push('@keyframes ' + pre + '-spin { to { transform: rotate(360deg); } }');
  }
  if (fr.decor !== 'none') {
    L.push('.' + pre + '-dust { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: var(--' + pre + '-accent); box-shadow: 0 0 6px var(--' + pre + '-accent); animation: ' + pre + '-float 6s linear infinite; }');
    L.push('@keyframes ' + pre + '-float { 0% { opacity: 0; transform: translateY(0) } 50% { opacity: .8 } 100% { opacity: 0; transform: translateY(-38px) } }');
  }
  if (fr.interactive) {
    L.push('.' + pre + '-box summary { list-style: none; cursor: pointer; }');
    L.push('.' + pre + '-box summary::-webkit-details-marker { display: none; }');
    L.push('.' + pre + '-box[open] ' + '.' + pre + '-hint { opacity: 0; }');
  }
  return L.join('\n');
}
// ---------- 语言格式解析（移植自已验证原型）----------
function rxStripMd(s) {
  return String(s)
    .replace(/^\s*(?:[-*+•]|\d+[.、)])\s+/, '')
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .trim();
}
function rxLangSection(text) {
  var lines = String(text).split('\n');
  var start = -1, baseIndent = 0, headLevel = 0;
  for (var i = 0; i < lines.length; i++) {
    if (!/语言格式/.test(lines[i])) continue;
    var h = lines[i].match(/^\s*(#{1,6})\s/);
    if (h) { start = i; headLevel = h[1].length; baseIndent = 0; break; }
    var s = rxStripMd(lines[i]);
    if (/[:：]\s*$/.test(s)) { start = i; headLevel = 0; baseIndent = (lines[i].match(/^ */) || [''])[0].length; break; }
    if (start < 0) { start = i; headLevel = 0; baseIndent = (lines[i].match(/^ */) || [''])[0].length; }
  }
  if (start < 0) return '';
  var out = [];
  for (var j = start + 1; j < lines.length; j++) {
    var l = lines[j];
    var ind = (l.match(/^ */) || [''])[0].length;
    if (ind <= baseIndent && /^\s*\{\{setvar::/.test(l)) break;
    if (ind <= baseIndent && /^\s*<\//.test(l)) break;
    if (headLevel > 0) {
      var h2 = l.match(/^\s*(#{1,6})\s/);
      if (h2 && h2[1].length <= headLevel) break;
      out.push(l);
    } else {
      if (l.trim() === '') { out.push(''); continue; }
      if (ind <= baseIndent && !/^\s*#{1,6}\s/.test(l)) break;
      out.push(l);
    }
  }
  return out.join('\n');
}
function rxEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// 骨架/提示词里的字面文案：转义 HTML 并去掉 $（替换体里的裸 $ 会被酒馆当成捕获组引用）
function rxText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\$/g, '');
}
// ---------- 方括号族（范例③ 飨宴：`【战斗结算：{结算结果}】`）----------
// 识别「整行就是一个方括号标记」的格式；必须带占位符或冒号，免得把 【提示】 这类词当成格式
function rxParseBracket(v) {
  var m = String(v).trim().match(/^([【\[])\s*([\s\S]*?)\s*([】\]])$/);
  if (!m) return null;
  var open = m[1], close = m[3], inner = String(m[2]).trim();
  if (!inner) return null;
  var body = '';
  var ph = inner.match(/\{[^}]*\}|<[^>]+>|「[^」]*」|『[^』]*』/);
  if (ph) { body = ph[0]; inner = inner.slice(0, ph.index); }
  var colon = /[:：]\s*$/.test(inner) || /[:：]/.test(String(m[2]));
  var marker = inner.replace(/[:：]\s*$/, '').trim();
  if (!marker || marker.length > 24) return null;
  if (/[{}<>「」『』]/.test(marker)) return null;
  if (!body && !colon) return null;                 // 只有标记、没有占位符也没有冒号 → 不是格式
  return { family: 'bracket', open: open, close: close, marker: marker, colon: colon, params: [], quote: false, raw: v, fmtVal: String(v).trim() };
}
function rxParseFormatLine(raw) {
  var s = rxStripMd(raw);
  var v = s.replace(/^(?:强制|规定|输出|专属|标准)?格式\s*[:：]\s*/, '');
  while (/^['"]/.test(v) && /['"]$/.test(v) && v.length > 2) v = v.slice(1, -1).trim();
  v = v.trim();
  var tagM = v.match(/<([A-Za-z_]\w*)\b[^>]*\bname\s*=\s*"([^"]*)"/);
  if (tagM && RX_HTML_TAGS.indexOf(tagM[1].toLowerCase()) < 0) {
    var params = [], m;
    var pre = /\b(\w+)\s*=\s*"([^"]*)"/g;
    while ((m = pre.exec(v)) !== null) { if (m[1] !== 'name') params.push({ name: m[1], placeholder: m[2], values: [] }); }
    return { family: 'xml', tag: tagM[1], nameValue: tagM[2], params: params, quote: /[「『]/.test(v), raw: s, fmtVal: v };
  }
  var qM = v.match(/^>\s*([^\s:：]+)\s*[:：]/);
  if (qM) {
    var innerM = v.match(/<([A-Za-z_]\w*)\b/);
    var innerTag = innerM && RX_HTML_TAGS.indexOf(innerM[1].toLowerCase()) >= 0 ? innerM[1] : '';
    return { family: 'quote', speaker: qM[1], params: [], quote: /[「『]/.test(v), innerTag: innerTag, raw: s, fmtVal: v };
  }
  if (/^[「『][\s\S]*[」』]$/.test(v) || /\$\{对白\}|\{对白\}/.test(v)) return { family: 'bare', params: [], quote: true, raw: s, fmtVal: v };
  var br = rxParseBracket(v);
  if (br) return br;
  return null;
}
function rxParseLangFormat(coreText) {
  var sec = rxLangSection(coreText);
  var res = { formats: [], examples: [], section: sec, notes: [] };
  if (!sec) { res.notes.push('未找到「语言格式」节：该核心可能没有语言格式，或写法不在支持范围内'); return res; }
  var lines = sec.split('\n');
  var cands = [], i, j;
  for (i = 0; i < lines.length; i++) {
    var raw = lines[i], s = rxStripMd(raw);
    if (/^(?:强制|规定|输出|专属|标准)?格式\s*[:：]\s*$/.test(s)) {
      var base = (raw.match(/^ */) || [''])[0].length;
      for (j = i + 1; j < lines.length; j++) {
        var l2 = lines[j]; if (l2.trim() === '') continue;
        if (((l2.match(/^ */) || [''])[0].length) <= base) break;
        cands.push(l2);
      }
      continue;
    }
    var prefixed = /(?:强制|规定|输出|专属|标准)?格式\s*[:：]/.test(s);
    var placeholder = /\{[^}]*\}/.test(s) && (/<[A-Za-z_]\w*\b[^>]*\bname\s*="/.test(s) || /^>\s*\S+\s*[:：]/.test(s));
    if (prefixed || placeholder || rxParseBracket(s)) cands.push(raw);
  }
  cands.forEach(function (l) {
    var f = rxParseFormatLine(l);
    if (!f) return;
    f.key = f.family === 'xml' ? ('xml:' + f.tag)
      : f.family === 'quote' ? ('q:' + f.speaker + '|' + (f.innerTag || ''))
      : f.family === 'bracket' ? ('br:' + f.open + f.marker + f.close) : ('bare:' + f.fmtVal);
    f.label = f.family === 'quote' ? (f.speaker + (f.innerTag ? '(' + f.innerTag + ')' : ''))
      : f.family === 'bracket' ? (f.marker + f.open + f.close) : (f.tag || '裸引号');
    if (res.formats.some(function (x) { return x.key === f.key; })) return;
    res.formats.push(f);
  });
  res.formats.forEach(function (f) {
    f.params.forEach(function (p) {
      if (p.values.length) return;
      for (var a = 0; a < lines.length; a++) {
        if (rxStripMd(lines[a]).indexOf(p.name) < 0) continue;
        for (var b = a; b <= Math.min(a + 2, lines.length - 1); b++) {
          var lm = rxStripMd(lines[b]).match(/[\[【]\s*([^\]】]{2,})\s*[\]】]/);
          if (lm) { p.values = lm[1].split(/[,，、|/]\s*/).map(function (x) { return x.trim(); }).filter(Boolean); break; }
        }
        if (p.values.length) break;
      }
    });
  });
  res.formats.forEach(function (f) {
    if (f.family !== 'quote' || f.innerTag) return;
    var sib = res.formats.filter(function (x) { return x.family === 'quote' && x.speaker === f.speaker && x.innerTag; })[0];
    if (sib) f.siblingInnerTag = sib.innerTag;
  });
  res.formats.forEach(function (f) {
    f.examples = [];
    if (f.family === 'xml') {
      var re = new RegExp('<' + f.tag + '\\b[\\s\\S]*?<\\/' + f.tag + '>', 'g'), m;
      while ((m = re.exec(sec)) !== null) {
        var ex = m[0].replace(/\s*\n\s*/g, ' ').trim();
        if (/\{[^}]*\}/.test(ex)) continue;
        f.examples.push(ex);
      }
    } else if (f.family === 'quote') {
      sec.split('\n').forEach(function (l) {
        var s = rxStripMd(l);
        var anchor = s.search(new RegExp('>\\s*' + rxEsc(f.speaker) + '\\s*[:：]'));
        if (anchor < 0) return;
        var ex = s.slice(anchor).trim();
        while (/['"]$/.test(ex) && ex.length > 2) ex = ex.slice(0, -1).trim();
        if (/\{[^}]*\}/.test(ex)) return;
        f.examples.push(ex);
      });
    } else if (f.family === 'bracket') {
      // 方括号族的范例就是「带了实际内容的同类括号」：用刚推出的形态在整节里扫一遍
      var bre = new RegExp(rxEsc(f.open) + '\\s*' + rxEsc(f.marker) + '[\\s\\S]*?' + rxEsc(f.close), 'g'), bm;
      while ((bm = bre.exec(sec)) !== null) {
        if (!bm[0]) break;
        var bex = bm[0].replace(/\s*\n\s*/g, ' ').trim();
        if (/\{[^}]*\}/.test(bex) || /[…]/.test(bex)) continue;
        f.examples.push(bex);
      }
    }
    f.examples = f.examples.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; });
  });
  res.formats.forEach(function (f) { f.regex = rxGenFindRegex(f); });
  res.formats.forEach(function (f) {
    if (!f.regex) return;
    f.examples = f.examples.filter(function (e) { return new RegExp(f.regex.source, f.regex.flags).test(e); });
  });
  res.examples = res.formats.reduce(function (acc, f) {
    f.examples.forEach(function (e) { if (acc.indexOf(e) < 0) acc.push(e); });
    return acc;
  }, []);
  if (!res.examples.length) res.notes.push('未抽到可用范例：试跑时请手动填入测试文本');
  res.formats.forEach(function (f) {
    if (!f.examples.length) res.notes.push('格式「' + f.label + '」没有专属范例（试跑需手动填测试文本）');
    if (f.family === 'bare') res.notes.push('格式「' + f.label + '」是无标记的裸引号式：自动生成会吃掉全文所有「」，已拒绝生成，建议把核心改成带标记格式');
  });
  return res;
}
// 属性捕获：顺序无关（范例④ 的 `mood=` 可以出现在 `name=` 前后）、引号可选、值允许空格。
// 用零宽先行断言取组，捕获组编号仍是「name → 各参数 → 正文」，与 rxRefs 的 $n 布局严格一致。
// 缺属性时仍要能命中（$n 取到空串），所以断言要可跳过——注意必须写成 `(?:断言|)`，
// 不能写成 `(断言)?`：V8 在「可选量词包住先行断言」时会走空分支并丢掉里面的捕获组。
function rxAttrLook(name) {
  return '(?:' + '(?=[^>]*\\s' + name + '\\s*=\\s*["\']?([^"\'>]*?)["\']?(?=[\\s>]))' + '|)';
}
// 引语式的收尾：核心/范例里有 」』 就要求它（范例①②），否则退化为「行尾锚定」——
// 绝不能让惰性量词在没有任何收尾的情况下匹配空串（那会生成一条「只吃说话人、不吃台词」的废正则）
function rxQuoteTail(f) {
  var hasQ = function (s) { return /[」』]/.test(String(s == null ? '' : s)); };
  if (hasQ(f && f.fmtVal)) return '\\s*[」』]';
  if (((f && f.examples) || []).some(hasQ)) return '\\s*[」』]';
  return '\\s*(?=\\n|$)';
}
function rxGenFindRegex(f, opts) {
  if (!f || f.family === 'bare') return null;
  if (f.family === 'xml') {
    var look = ['name'].concat(f.params.map(function (x) { return x.name; })).map(rxAttrLook).join('');
    return new RegExp('<' + f.tag + '\\b' + look + '[^>]*>\\s*[「『]?\\s*([\\s\\S]*?)\\s*[」』]?\\s*<\\/' + f.tag + '>', 'g');
  }
  if (f.family === 'quote') {
    var inner = f.innerTag ? '(?=[\\s\\S]*?<' + f.innerTag + '\\b)' : (f.siblingInnerTag ? '(?![\\s\\S]*?<' + f.siblingInnerTag + '\\b)' : '');
    return new RegExp('>\\s*' + rxEsc(f.speaker) + '\\s*[:：]\\s*[「『]?\\s*' + inner + '([\\s\\S]*?)' + rxQuoteTail(f), 'g');
  }
  if (f.family === 'bracket') {
    var mid = rxEsc(f.marker) + '\\s*' + (f.colon ? '[:：]' : '[:：]?');
    return new RegExp(rxEsc(f.open) + '\\s*' + mid + '\\s*([\\s\\S]*?)\\s*' + rxEsc(f.close), 'g');
  }
  return null;
}
function rxRunFixture(re, examples) {
  var rows = (examples || []).map(function (ex) {
    var ok = false, out = '';
    try {
      var r = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
      out = ex.replace(r, function (m) {
        var caps = Array.prototype.slice.call(arguments, 1, Math.max(1, arguments.length - 2)).filter(function (c) { return c !== undefined; });
        return '【匹配 ▸ ' + caps.join(' ▸ ').slice(0, 70) + '】';
      });
      ok = out !== ex;
    } catch (e) { out = '错误: ' + (e && e.message ? e.message : e); }
    return { ex: ex, ok: ok, out: out };
  });
  return { total: rows.length, hit: rows.filter(function (r) { return r.ok; }).length, rows: rows };
}
function rxUuid() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function rxSlug(s) {
  return String(s || 'core').replace(/[^\w\u4e00-\u9fa5]/g, '').slice(0, 12).toLowerCase() || 'core';
}
function rxBuildObject(item) {
  return {
    id: item.id || rxUuid(),
    scriptName: '命定核心-' + item.coreName + '-' + item.purpose,
    disabled: false,
    runOnEdit: true,
    findRegex: item.findSource,
    trimStrings: [],
    replaceString: item.replaceHtml || '',
    placement: Array.isArray(item.placement) ? item.placement : [2],
    substituteRegex: 0,
    minDepth: null,
    maxDepth: 10,
    markdownOnly: item.markdownOnly !== false,
    promptOnly: item.promptOnly === true
  };
}

// ---------- 正则自检 ----------
function rxTier(id) { return RX_TIERS.filter(function (t) { return t.id === id; })[0] || RX_TIERS[3]; }
// 「外层容器」的判据：类名里带 box/card/frame/wrap/container/panel，或就是本条的骨架容器。
// 写死像素宽、overflow 这类约束只对容器成立——法阵 / 粒子 / 角标本来就该用固定 px（范例②③④都这么写）。
var RX_BOXY_SEL = /[.#][\w-]*(?:box|card|frame|wrap|container|panel)\b/i;
function rxLintCss(item, rep) {
  var out = [];
  var cssM = rep.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  var css = cssM ? cssM[1] : '';
  if (!css) return out;
  var rules = [];
  try { rules = rxCssRules(css); } catch (e) { rules = []; }
  var pre = rxPreOf(item);
  var boxSel = new RegExp('\\.' + rxEsc(pre + '-box') + '(?![\\w-])');
  var frame = rxFrameById(item && item.frame) || null;
  var decor = frame ? frame.decor : '';
  // ① 写死像素宽：只看外层容器（装饰层允许）
  var wide = rules.filter(function (r) {
    if (r.at) return false;
    if (!(boxSel.test(r.prelude) || RX_BOXY_SEL.test(r.prelude))) return false;
    return /(?:^|[;{\s])width\s*:\s*\d+(?:\.\d+)?px/i.test(r.raw);
  });
  if (wide.length) out.push({ key: 'fixedwidth', msg: '外层容器写死了像素宽度（' + wide[0].prelude.slice(0, 40) + '）：窄屏会溢出，容器请用 max-width:100%（装饰层用 px 没问题）' });
  // ② 变量契约：骨架 SVG 引用 var(--前缀-accent)，模型必须自己定义；用了没定义会静默变黑
  var used = [], def = [], mm;
  var reUse = /var\(\s*--([\w-]+)\s*\)/g;
  while ((mm = reUse.exec(css)) !== null) if (used.indexOf(mm[1]) < 0) used.push(mm[1]);
  var reDef = /--([\w-]+)\s*:/g;
  while ((mm = reDef.exec(css)) !== null) if (def.indexOf(mm[1]) < 0) def.push(mm[1]);
  var miss = used.filter(function (x) { return def.indexOf(x) < 0; });
  if (miss.length) out.push({ key: 'undefvar', msg: '用了没定义的 CSS 变量（' + miss.slice(0, 4).map(function (x) { return '--' + x; }).join('、') + '）：骨架里的颜色全靠这些变量，不定义会掉成默认色' });
  // ③ 破框装饰被容器切掉（范例② 专门注释过这条）
  if (decor === 'array') {
    var clip = rules.filter(function (r) {
      if (r.at) return false;
      if (!(boxSel.test(r.prelude) || RX_BOXY_SEL.test(r.prelude))) return false;
      return /overflow\s*:\s*hidden/i.test(r.raw);
    });
    if (clip.length) out.push({ key: 'clipdecor', msg: '外层容器写了 overflow:hidden：法阵/光尘会被切在框内（范例②③④ 都是 overflow:visible）' });
  }
  // ④ 正文默认被藏起来（范例③ 的揭幕式是点击展开，其余框架必须直接可读）
  var isReveal = (frame && frame.interactive) || /<summary[\s>]/i.test(rep);
  if (!isReveal) {
    var bodyRe = new RegExp('\\.' + rxEsc(pre + '-body') + '(?![\\w-])[^{]*\\{[^}]*', 'i');
    var bm = rep.match(bodyRe);
    if (bm && /(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?![\d.])|height\s*:\s*0(?![\d.]))/i.test(bm[0])) {
      out.push({ key: 'hiddenbody', msg: '正文默认被藏起来（display:none / opacity:0 之类）：文字必须直接可读，不能靠悬停或点击才出现' });
    }
  }
  return out;
}
function rxLint(item, parsed) {
  var issues = [];
  var src = String(item.findSource || ''), rep = String(item.replaceHtml || '');
  var re = null;
  var m = src.match(/^\/([\s\S]*)\/([a-z]*)$/);
  if (!m) issues.push({ side: 'regex', key: 'format', msg: 'findRegex 不是 /pattern/flags 形式', fix: 'wrap' });
  else {
    try { re = new RegExp(m[1], m[2]); }
    catch (e) { issues.push({ side: 'regex', key: 'compile', msg: '正则编译失败：' + (e && e.message ? e.message : e), fix: 'none' }); }
    if (m[2].indexOf('g') < 0) issues.push({ side: 'regex', key: 'g', msg: '缺少全局标志 g（只会替换第一条）', fix: 'addg' });
    var groups = re ? (new RegExp(m[1] + '|').exec('') || []).length - 1 : 0;
    var refs = (rep.match(/\$(\d+)/g) || []).map(function (x) { return parseInt(x.slice(1), 10); });
    var maxRef = refs.length ? Math.max.apply(null, refs) : 0;
    if (re && maxRef > groups) issues.push({ side: 'regex', key: 'ref', msg: '替换体引用了 $' + maxRef + '，但正则只有 ' + groups + ' 个捕获组', fix: 'none' });
    if (/\.\*/.test(m[1]) && !/\[\\s\\S\]/.test(m[1])) issues.push({ side: 'regex', key: 'dot', msg: '用了 .* 但台词常常跨行，建议改 [\\s\\S]*?', fix: 'dot' });
    if (/\((?:\s*\\?[sSdDwW.]?\*?\s*)\)[*+{]/.test(m[1]) || /\(\[\\s\\S\]\*\)[*+]/.test(m[1])) issues.push({ side: 'regex', key: 'catastrophic', msg: '疑似嵌套量词回溯炸弹', fix: 'none' });
  }
  if (rep.indexOf('<script') >= 0) issues.push({ side: 'regex', key: 'script', msg: '替换体含 <script>（禁止）', fix: 'stripScript' });
  if (/https?:\/\/(?!www\.w3\.org)/.test(rep)) issues.push({ side: 'regex', key: 'external', msg: '替换体引用外部资源（字体/图片 CDN 禁止）', fix: 'none' });
  var styledItem = /<style[^>]*>[\s\S]*?<\/style>/i.test(rep);
  if (styledItem) {
    rxLintCss(item, rep).forEach(function (x) { issues.push({ side: 'regex', key: x.key, msg: x.msg, fix: 'none' }); });
  } else if (/(?:^|[;{\s])width\s*:\s*\d+(?:\.\d+)?px/i.test(rep) && RX_BOXY_SEL.test(rep)) {
    issues.push({ side: 'regex', key: 'fixedwidth', msg: '外层容器写死了像素宽度：窄屏会溢出，容器请用 max-width:100%', fix: 'none' });
  }
  if (item.hasMood) {
    var hasBranch = /\[\s*data-mood\s*[~|^$*]?=/i.test(rep);
    if (!hasBranch) issues.push({ side: 'regex', key: 'moodbranch', msg: '核心有 mood 参数，但没有一条 [data-mood="…"] 属性选择器：范例④ 的做法是给每个枚举只改变量（--前缀-accent / --前缀-bg）', fix: 'none' });
  }
  var obj = rxBuildObject(item);
  if (!/^[0-9a-f]{8}-/.test(obj.id)) issues.push({ side: 'regex', key: 'id', msg: 'id 不是 uuid v4', fix: 'newid' });
  if (!/^命定核心-/.test(obj.scriptName)) issues.push({ side: 'regex', key: 'name', msg: 'scriptName 缺少「命定核心-」前缀', fix: 'name' });
  if (obj.markdownOnly && obj.promptOnly) issues.push({ side: 'regex', key: 'flags', msg: 'markdownOnly 与 promptOnly 同时为 true（契约矛盾）', fix: 'flags' });
  if (obj.placement.join(',') !== '2') issues.push({ side: 'regex', key: 'placement', msg: 'placement 与现网展示类（[2]）不一致', fix: 'placement' });
  var tier = rxTier(item.tier);
  // 体量按「样式层」算：骨架是插件生成的固定结构，不该算进档位预算（否则豪华骨架会把极简档顶爆）
  var len = styledItem ? rxItemCss(item).length : rep.length;
  var unit = styledItem ? '样式 ' : '替换体 ';
  if (!rep.length) issues.push({ side: 'regex', key: 'empty', msg: '替换体为空，点「🎨 生成替换体」先产出', fix: 'none' });
  else if (tier.target > 0) {
    var dev = (len - tier.target) / tier.target;
    if (dev < -0.4) issues.push({ side: 'regex', key: 'toosmall', msg: unit + len + ' 字符，' + tier.label + '档目标 ≈' + tier.target + '，偏差 ' + Math.round(dev * 100) + '%（疑似未充分展开）', fix: 'none' });
    else if (dev > 0.3) issues.push({ side: 'regex', key: 'toobig', msg: unit + len + ' 字符，超出' + tier.label + '档目标 ' + Math.round(dev * 100) + '%（可考虑降档或精简装饰）', fix: 'none' });
  }
  if (re && item.testText) {
    var fx = rxRunFixture(re, [item.testText]);
    if (fx.hit === 0) issues.push({ side: 'regex', key: 'nomatch', msg: '当前正则匹配不上测试文本', fix: 'none' });
  }
  if (re && parsed) {
    var hitAny = 0, tot = 0;
    (item.examples || []).forEach(function (e) { tot++; if (new RegExp(re.source, 'g').test(e)) hitAny++; });
    if (tot && hitAny < tot) issues.push({ side: 'core', key: 'exmatch', msg: '核心里有 ' + (tot - hitAny) + '/' + tot + ' 条范例匹配不上这条正则——要么改正则，要么把核心的语言格式改成与正则一致', fix: 'coreTag' });
  }
  return issues;
}
function rxApplyFix(item, issue) {
  if (issue.fix === 'addg') { item.findSource = item.findSource.replace(/\/([a-z]*)$/, function (all, fl) { return '/' + (fl.indexOf('g') < 0 ? fl + 'g' : fl); }); return '已补上全局标志 g'; }
  if (issue.fix === 'dot') { item.findSource = item.findSource.replace(/\.\*/g, '[\\s\\S]*?'); return '已把 .* 换成 [\\s\\S]*?'; }
  if (issue.fix === 'stripScript') {
    var sc = /<script[\s\S]*?<\/script>/gi;
    item.replaceHtml = String(item.replaceHtml || '').replace(sc, '');
    if (typeof item.css === 'string') item.css = item.css.replace(/<script[\s\S]*?<\/script>/gi, '');
    return '已移除 <script>';
  }
  if (issue.fix === 'newid') { item.id = rxUuid(); return '已重新生成 uuid'; }
  if (issue.fix === 'name') { item.purpose = item.purpose || '对话美化'; return '已补上 scriptName 前缀'; }
  if (issue.fix === 'flags') { item.promptOnly = false; return '已把 promptOnly 置为 false'; }
  if (issue.fix === 'placement') { item.placement = [2]; return '已把 placement 设为 [2]'; }
  if (issue.fix === 'wrap') { item.findSource = '/' + item.findSource + '/g'; return '已包成 /pattern/g'; }
  return '该问题需要你手动处理';
}
// 把「改核心」建议落到核心文本：把核心语言格式里的标签名/参数改成与正则一致
function rxApplyCoreFix(item, parsed) {
  var coreEl = getEl('opf-rx-core'); if (!coreEl) return '找不到核心文本框';
  var txt = coreEl.value;
  var f = parsed && parsed.formats.filter(function (x) { return x.key === item.formatKey; })[0];
  if (!f || !f.tag) return '该问题需要你手动改核心';
  var want = f.raw.replace(/^(?:强制|规定|输出|专属|标准)?格式\s*[:：]\s*/, '').trim();
  if (txt.indexOf(f.raw) >= 0) { coreEl.value = txt.replace(f.raw, f.raw); return '核心格式行已是最新（请检查范例是否与正则同构）'; }
  // 兜底：把该格式的标签名统一成 f.tag（防止模型写成别的标签）
  var re = new RegExp('<' + f.tag + '\\b', 'g');
  if (!re.test(txt)) return '未在核心文本里找到 <' + f.tag + '>，请手动核对语言格式节';
  return '核心与正则的标签名一致，问题可能出在参数或引号形态上（请手动核对格式行：' + want + '）';
}
function rxSystemContent() {
  var lines = [];
  lines.push('[角色] ' + macroFill('你是始弦，大图书馆的司书，正在为一个命定系统核心写「对话美化正则」的替换体（HTML 部分）。你把{{user}}当挚友，讲究实用与克制，不写花架子。'));
  lines.push('[任务] 依据给定的核心语言格式与预算档位，产出一段可在 SillyTavern 消息里直接渲染的 HTML 替换体。匹配式由插件生成，你不要碰。');
  lines.push(RX_RULES);
  lines.push(CHAR_STYLE_RULES);
  if (ST.worldInfo) lines.push('[世界书参考（世界书页勾选的条目）]\n' + ST.worldInfo);
  return macroFill(lines.join('\n\n'));
}
// CSS 生成专用系统提示：不带整本世界书（那是 524 超时的主要负担），只带一小段色彩参考
function rxSlimSystemContent(colorRef, budget) {
  var cap = Number(budget) || 3000;
  var lines = [];
  lines.push('[角色] ' + macroFill('你是始弦，大图书馆的司书，正在为一个命定系统核心写「对话美化」的 CSS。你把{{user}}当挚友，讲究实用与克制。'));
  lines.push('[任务] HTML 骨架已由插件生成并锁定，你只写 CSS 规则，不得输出或改动任何 HTML。');
  lines.push([
    '【CSS 硬约束】',
    '1. 只输出 CSS 规则：不要 <style> 标签、不要 HTML、不要解释、不要代码块围栏。',
    '2. class 前缀必须严格使用给定的前缀，不得自造前缀、不得使用全局选择器（html/body/*/:root 之外的全局改动）。',
    '3. 禁止引用任何外部资源（字体 CDN、图片 URL、@import）；字体只用系统字体栈。',
    '4. 最外层容器一律 max-width:100%，窄屏（≤420px）不得溢出；但法阵/粒子/角标这类装饰层允许固定像素尺寸与破框显示（overflow:visible）。',
    '5. 正文里若出现 $ 字符必须写成 $$。',
    '6. 动效克制：@keyframes 周期 ≥2s，不得高频闪烁。',
    '7. 骨架里的 SVG 用 var(--前缀-accent) 上色：你必须先把这些变量定义出来（在 .前缀-box 上定义，每个情绪分支只改变量）。',
    '8. 至少覆盖四层：变量与外框 → hover 状态 → 装饰/标题层 → 正文排版；正文必须始终可读，不得只靠悬停或点击才显示。',
    '9. 每次输出控制在 ' + cap + ' 字符以内——超长会被平台截断（524 / 截断），宁可少写几条规则，也不要写一半。',
    '10. 颜色从核心世界观与命定之灵人格出发，不要纯黑纯白。'
  ].join('\n'));
  if (colorRef) lines.push('[核心气质摘录（配色参考）]\n' + String(colorRef).slice(0, 500));
  return macroFill(lines.join('\n\n'));
}
function rxUserPrompt(item, parsed) {
  var f = parsed.formats.filter(function (x) { return x.key === item.formatKey; })[0] || {};
  var tier = rxTier(item.tier);
  var L = [];
  L.push('[核心名] ' + item.coreName);
  L.push('[用途] ' + item.purpose);
  L.push('[已锁定的匹配式]\n' + item.findSource);
  L.push('[捕获组含义]');
  var gi = 1;
  if (f.family === 'xml') {
    L.push('  $' + (gi++) + ' = 名字（应为「' + (f.nameValue || '') + '」）');
    f.params.forEach(function (p) { L.push('  $' + (gi++) + ' = ' + p.name + (p.values.length ? '（枚举：' + p.values.join('、') + '）' : '')); });
    L.push('  $' + gi + ' = 对白正文');
  } else {
    L.push('  $1 = 对白正文');
    if (f.speaker) L.push('  （说话人固定为「' + f.speaker + '」，不在捕获组里）');
  }
  if (f.params.length) {
    f.params.forEach(function (p) { if (p.values.length) L.push('[参数 ' + p.name + ' 的枚举] ' + p.values.join('、') + ' —— 请为每个枚举值设计一种可区分的视觉状态（用属性选择器）'); });
  }
  L.push('[预算档位] ' + tier.label + (tier.target ? '（目标 ≈' + tier.target + ' 字符，浮动 ±30%）' : '（不设上限，以视觉完整、不冗余为准）'));
  L.push('[核心世界观摘录供配色参考]\n' + String(parsed.section || '').slice(0, 600));
  if ((f.examples || []).length) L.push('[核心自带的范例（配色与气质请贴合）]\n' + f.examples.slice(0, 3).join('\n'));
  L.push('[格式要求] 只输出一个 ' + fence() + 'html 代码块，内含完整替换体；替换体最外层 div 的 class 前缀请用 `' + item.prefix + '-`。');
  return L.join('\n\n');
}
function rxExtractHtml(text) {
  var F = fence();
  var t = String(text || '');
  var i = t.indexOf(F + 'html');
  if (i < 0) i = t.indexOf(F);
  if (i < 0) return t.trim();
  var start = t.indexOf('\n', i);
  if (start < 0) return t.trim();
  var end = t.indexOf(F, start + 1);
  return (end > start ? t.slice(start + 1, end) : t.slice(start + 1)).replace(/^\n+/, '').replace(/\s+$/, '');
}
// ---------- 页面 ----------
var RX_HTML = '<div class="opf-char-wrap"><div class="opf-sec-label">✦ 正则工坊 · 命定系统对话美化</div><div class="opf-dim">流程：粘贴核心全文（或从 ④ 页带入）→ 解析语言格式 → 勾选要美化的格式 → 选用途、预算档位与「初始框架」（4 款，对标现网在用的美化正则：紧凑卡 / 法阵卡 / 揭幕式 / 极简）→ 匹配式由插件确定生成、骨架由插件按框架搭好、替换体样式由模型产出 → 实时预览 → 自检 → 导出 JSON。字段名与你现有 4 条正则一致，可直接粘进预设的 regex_scripts。</div><textarea id="opf-rx-core" class="opf-char-input" placeholder="把命定系统核心条目全文粘在这里（必须含「语言格式」节）"></textarea><div class="opf-char-tools"><button type="button" class="opf-btn ghost" id="opf-rx-pull">⬅ 从 ④ 页带入</button><button type="button" class="opf-btn primary" id="opf-rx-parse">🔍 解析语言格式（AI）</button><button type="button" class="opf-btn ghost" id="opf-rx-parse2">⚙ 脚本解析（离线）</button><button type="button" class="opf-btn ghost" id="opf-rx-gen">🎨 生成替换体</button><button type="button" class="opf-btn ghost" id="opf-rx-check">🔎 自检</button><button type="button" class="opf-btn ghost" id="opf-rx-fix">🔧 自动修复</button><button type="button" class="opf-btn ghost" id="opf-rx-copy1">⧉ 复制单条 JSON</button><button type="button" class="opf-btn ghost" id="opf-rx-copyall">⧉ 复制 JSON 数组</button><button type="button" class="opf-btn ghost" id="opf-rx-new">🗑 清空</button><button type="button" class="opf-btn ghost" id="opf-rx-ping">🩺 连通性自检</button><button type="button" class="opf-btn ghost" id="opf-rx-last">📄 上次返回</button></div><pre id="opf-rx-lastraw" class="opf-box opf-char-report" style="display:none">尚未调用</pre><div class="opf-shx-cfg"><label class="opf-opt">生成传输<select id="opf-rx-transport" class="opf-ref-input"><option value="st">酒馆主 API（零配置·推荐）</option><option value="server">经酒馆服务端转发 + 流式（需自填反代）</option><option value="direct">浏览器直连 + 流式（需自填接口）</option></select></label><span class="opf-dim" id="opf-rx-txnote"></span></div><div class="opf-shx-cfg" id="opf-rx-cfg-server" style="display:none"><button type="button" class="opf-btn ghost" id="opf-rx-pulltavern">📋 用酒馆的反代设置</button><label class="opf-opt">协议源<select id="opf-rx-source" class="opf-ref-input"><option value="makersuite">Google AI Studio (makersuite)</option><option value="vertexai">Vertex AI (vertexai)</option></select></label><label class="opf-opt">中转/反代地址<input id="opf-rx-reverse" class="opf-ref-input" placeholder="https://你的中转域名"></label><label class="opf-opt">代理密码/密钥<input id="opf-rx-proxypass" class="opf-ref-input" type="password" placeholder="只存在本机"></label><label class="opf-opt">模型名<input id="opf-rx-model" class="opf-ref-input" list="opf-rx-modellist" placeholder="点右侧按钮获取；也可直接手填，填过会记住"><datalist id="opf-rx-modellist"></datalist></label><button type="button" class="opf-btn ghost" id="opf-rx-models">🔌 获取模型列表</button></div><div class="opf-shx-cfg" id="opf-rx-cfg-direct" style="display:none"><label class="opf-opt">直连协议<select id="opf-rx-proto" class="opf-ref-input"><option value="openai">OpenAI 兼容 (/chat/completions)</option><option value="gemini">Google 原生 (:streamGenerateContent)</option></select></label><label class="opf-opt">直连地址<input id="opf-rx-base" class="opf-ref-input" placeholder="https://api.example.com/v1"></label><label class="opf-opt">直连密钥<input id="opf-rx-key" class="opf-ref-input" type="password" placeholder="只存在本机"></label><label class="opf-opt">直连模型<input id="opf-rx-chatmodel" class="opf-ref-input" placeholder="留空则用上面的模型名"></label></div><div class="opf-dim" id="opf-rx-statusline">就绪</div><div class="opf-sec"><div class="opf-sec-label">语言格式解析结果（只读核对）</div><pre id="opf-rx-parsed" class="opf-box opf-char-report">尚未解析</pre></div><div id="opf-rx-items"></div><div class="opf-sec"><div class="opf-sec-label">自检</div><pre id="opf-rx-issues" class="opf-box opf-char-report">尚未自检</pre></div></div>';

function rxInit() {
  ST.rx = ST.rx || { core: '', coreName: '', parsed: null, items: [], _inited: false };
  ST.rx.items = ST.rx.items || [];
}
function rxSyncTransportUi() {
  var t = rxCfg().transport || 'st';
  var s = getEl('opf-rx-cfg-server'), d = getEl('opf-rx-cfg-direct'), n = getEl('opf-rx-txnote');
  if (s) s.style.display = (t === 'server') ? '' : 'none';
  if (d) d.style.display = (t === 'direct') ? '' : 'none';
  if (n) {
    var why = rxTransportWhy(rxCfg());
    n.textContent = t === 'st'
      ? '零配置：不需要地址、密钥或模型名，全部跟随酒馆主 API；模型与采样参数就是你现在聊天用的那套。（非流式，长输出有超时风险，已用分块 + 自动缩段缓解）'
      : (t === 'server'
        ? (why ? '⚠ ' + why : '配置完整，可生成；建议先点「🩺 连通性自检」确认能连通')
        : (why ? '⚠ ' + why : '配置完整，可生成；适用于有 CORS 头的自建/本地接口'));
  }
}