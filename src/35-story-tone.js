//@module 35-story-tone — ① 页「故事基调」：三档基调（必选其一）+ 十一种开局题材 + 子项
// 只产出提示词，不改预设 JSON 的结构；基调与题材会进 system，分步、精修、自检、建议都会带上。
var STORY_TONES = [
  { id: 'sunny', name: '阳光向上', hint: '整体明亮，善意多过恶意：冲突可以存在，但收束在希望与向上的方向上；别把 NPC 写成恶意机器，也别拿苦大仇深当燃料。' },
  { id: 'default', name: '默认', hint: '不加额外倾向：善恶比例、危险程度都照世界书本身的写法走。' },
  { id: 'gloomy', name: '阴沉压抑', hint: '整体压抑：危险是真的，代价要落地，别把世界打磨成暖光童话；但也不必刻意堆血腥，更不要预设一切必然失败。' }
];

var STORY_TYPES = [
  {
    id: 'daily', name: '平凡即是喜乐', brief: '生活日常 · 有正经工作',
    text: '开局就是一份正经工作撑着的生活日常：上班、通勤、吃饭、房租、邻里与休息日。没有天降大任，冲突来自生活本身（工作、人情、开支、家里的事）。技能与装备按普通人的尺度写，不要塞神器；资产可以是住处或小生意的一角。'
  },
  {
    id: 'shop', name: '店铺经营', brief: '开一家自己的店 · 货源客流账本',
    text: '开局经营一家属于自己的店铺（旅店、食肆、杂货、工坊、药铺等，与题材相符）：货源、客流、成本、账本、同行竞争与常客。剧情落在开张前后，人物围绕顾客、供货商、同行与帮手展开；资产按店铺写全（总空间/结算/内部资产），技能装备偏经营与手艺。'
  },
  {
    id: 'farm', name: '田园生活', brief: '农庄牧场 · 季节与收成',
    text: '开局是田园慢生活：季节、作物或牲畜、收成、邻里互助、赶集与乡间琐事。冲突来自天气、虫害、收购价、山里的东西与人之常情，而不是宏大战争。资产以农庄、牧场或田地为题写全，技能偏农事、草药、手艺与野外。'
  },
  {
    id: 'light', name: '日系轻冒险', brief: '强者顶着 · 自己不背重担',
    text: '世界确实有威胁，但有一位实力强到离谱、人品无可挑剔的勇者（或同等级存在）顶着；魔族也不是见人就杀的血海深仇设定，而是有立场、能交涉、甚至能共处的存在。你的开局不背沉重担子，重点在轻快的冒险、伙伴与日常。开局给一场小委托或小冒险即可，不要写成救世。'
  },
  {
    id: 'hero', name: '日系王道冒险', brief: '作为勇者出发',
    text: '你就是那位勇者：接委托、组队、讨伐、成长，走王道冒险的正轨。开局给一个明确的起点委托与目标（村镇求援、讨伐、护送之类），装备与技能按勇者开局配齐；世界愿意把大任交给你，但先把第一段路写好。'
  },
  {
    id: 'hermit', name: '离群索居 / 隐居', brief: '独居边地 · 自给自足',
    text: '开局在山野、林间、孤岛或边地独居，自给自足、少与人往来。冲突来自外来的打扰（访客、追兵、异变、商队）与独处的代价。资产是偏僻的住处，技能偏采集、狩猎、草药、修理与野外生存。'
  },
  {
    id: 'school', name: '崭新的校园生活', brief: '入学第一天 · 校园日常',
    text: '开局是入学或转学第一天：校门、课表、宿舍、社团、同学与老师。剧情落在校园日常与一段新关系的开端，不必开局就卷进阴谋。',
    sub: 'school'
  },
  {
    id: 'fgo', name: '命运-冠位指定', brief: '最后的御主 · 打穿七个异闻带',
    text: '你是全阿斯塔利亚最后的御主，在法环仅存的「迦勒底」院有生力量带领下回到过去，逐个打穿七个人类史上的异闻带，找出并战胜阴谋的缔造者，拯救人理。开局在迦勒底或已抵达的第一个异闻带，给明确的目标、同行者与当前异闻带的时代背景；你是御主，不是从者。'
  },
  {
    id: 'slave', name: '你成了奴隶', brief: '因故失去自由 · 处境开局',
    text: '由于某种原因你成了奴隶（战败、债务、拐卖、自卖、连坐等，原因要与人设自洽）。开局在奴隶市场、主家或押送途中，写清处境、身份，以及一点可用的余地（技能、人脉、秘密、被谁看上）。不美化奴役本身，也别把开局写成必死局。'
  },
  {
    id: 'vampire', name: '血族真祖守护家族', brief: '千百年的守望 · 今日成人礼',
    text: '你是血族真祖。千百年前你与一名人类交战落败，对方没有夺走你的性命——他行事光明磊落，从各方面看都无可挑剔，即使是你也对他赞赏有加。他死于一场阴谋，临终前你答应了他最后一个要求：替他守护好他的家族。于是你以{ROLE}的身份默默守护了千百年。如今这个家族虽不复当年鼎盛，却也还算得上是中流，家风十分正直，也会关照领地内的民众。今天，是这个家族直系千金小姐的成人礼——开局就落在这场成人礼上。',
    sub: 'role'
  },
  {
    id: 'heiress', name: '家族的千金小姐', brief: '今天是你的成人礼',
    text: '你是那个家族的直系千金小姐，今天是你的成人礼。家族已不复当年鼎盛却仍算中流，家风正直、也关照领地内的民众；府上还有一位千百年来默默守护家族的管家或女仆（若同时选了「血族真祖守护家族」，他就是故事里的那位真祖本人）。开局落在这场成人礼：宾客、家族、领地与那位守护者都在场。'
  }
];

var STORY_SCHOOLS = [
  { id: 'normal', name: '普通学校', text: '校种：普通学校——没有魔法，或魔法只是背景里的传闻；冲突来自人际、学业、社团、家庭与青春。' },
  { id: 'magic', name: '魔法学校', text: '校种：魔法学校——课程是魔法与理论，宿舍、学派、导师、考核与校内规矩；允许小规模事故，危险与规则都在校内。' }
];

var STORY_ROLES = [
  { id: '', name: '按人设判断', text: '管家或女仆——按 {{user}} 的性别决定（男性为管家，女性为女仆）；拿不准就从人设与称呼里推断，不要写反。' },
  { id: 'butler', name: '管家（男）', text: '管家' },
  { id: 'maid', name: '女仆（女）', text: '女仆' }
];

function storyToneOf(id) {
  for (var i = 0; i < STORY_TONES.length; i++) if (STORY_TONES[i].id === id) return STORY_TONES[i];
  return STORY_TONES[1];
}
function storyTypeOf(id) {
  for (var i = 0; i < STORY_TYPES.length; i++) if (STORY_TYPES[i].id === id) return STORY_TYPES[i];
  return null;
}
function storySchoolOf(id) {
  for (var i = 0; i < STORY_SCHOOLS.length; i++) if (STORY_SCHOOLS[i].id === id) return STORY_SCHOOLS[i];
  return STORY_SCHOOLS[0];
}
function storyRoleOf(id) {
  for (var i = 0; i < STORY_ROLES.length; i++) if (STORY_ROLES[i].id === id) return STORY_ROLES[i];
  return STORY_ROLES[0];
}

/** 把题材正文里的子项占位换成实际选择 */
function storyTypeText(t, s) {
  if (!t) return '';
  var out = String(t.text || '');
  if (t.sub === 'school') out += '\n' + storySchoolOf(s.storySchool).text;
  if (t.sub === 'role') {
    var role = storyRoleOf(s.storyRole);
    out = out.replace('{ROLE}', role.text);
  }
  return out;
}

/** 生成注入 system 的「故事基调」段；没选题材且基调为默认时返回空串 */
function storyPromptBlock() {
  var s = getSettings();
  var tone = storyToneOf(s.storyTone);
  var type = storyTypeOf(s.storyType);
  if (!type && (!tone || tone.id === 'default')) return '';
  var lines = ['[故事基调]'];
  if (tone) {
    lines.push('基调：' + tone.name);
    lines.push('基调要求：' + tone.hint);
  }
  if (type) {
    lines.push('开局题材：' + type.name + '（' + type.brief + '）');
    lines.push('题材设定：');
    lines.push(storyTypeText(type, s));
    lines.push('统一要求：开局的场景、事件、人物关系与文风都服从上面的基调与题材；技能/装备/道具/资产/伙伴的选择要贴着这个题材，不要写成与题材无关的通用套路；《背景》一栏的开局剧情必须落在这个题材的具体场景里，而不是泛泛的世界观介绍。');
  }
  return lines.join('\n');
}

// ---------------- UI ----------------
var STORY_CSS = [
  '#opf-page-preset #opf-body>#opf-story-card{grid-column:1/-1}',
  '.opf-story-tone{display:flex;flex-wrap:wrap;gap:8px}',
  '.opf-tone-btn{flex:1 1 110px;cursor:pointer;border-radius:9px;padding:8px 10px;font-size:13.5px;color:#ffd5da;background:rgba(255,235,238,.05);border:1px solid rgba(255,122,138,.28);transition:all .14s ease;text-align:center}',
  '.opf-tone-btn:hover{background:rgba(255,77,94,.16);border-color:rgba(255,150,165,.55)}',
  '.opf-tone-btn.active{color:#fff;background:linear-gradient(160deg,rgba(255,110,120,.30),rgba(190,16,42,.28));border-color:rgba(255,180,190,.65);box-shadow:0 0 10px rgba(255,77,94,.35)}',
  '.opf-tone-btn .t{display:block;font-size:10.5px;letter-spacing:.5px;opacity:.7;margin-top:2px}',
  '.opf-story-list{display:flex;flex-direction:column;gap:3px;max-height:320px;overflow:auto;padding-right:2px}',
  '.opf-story-item{display:flex;align-items:flex-start;gap:8px;padding:5px 8px;border-radius:8px;cursor:pointer;font-size:13px;color:rgba(255,236,240,.9);line-height:1.45;border:1px solid transparent}',
  '.opf-story-item:hover{background:rgba(255,235,238,.06)}',
  '.opf-story-item.on{background:rgba(255,90,105,.12);border-color:rgba(255,150,165,.4)}',
  '.opf-story-item input{margin-top:3px;flex:none;accent-color:#ff4d5e;cursor:pointer}',
  '.opf-story-item .nm{flex:none;font-weight:600}',
  '.opf-story-item .bf{flex:1 1 auto;min-width:0;font-size:11.5px;color:rgba(255,200,208,.55)}',
  '.opf-story-sub{display:flex;flex-wrap:wrap;gap:6px 14px;padding:6px 8px 2px 26px}',
  '.opf-story-sub .opf-opt{font-size:12.5px!important}',
  '.opf-story-now{font-size:12px;color:rgba(255,200,208,.7);line-height:1.6}'
].join('');

function storySyncUi() {
  var s = getSettings();
  var tone = storyToneOf(s.storyTone);
  var box = getEl('opf-story-tone');
  if (box) {
    var btns = box.querySelectorAll('.opf-tone-btn');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-tone') === tone.id;
      if (on) btns[i].classList.add('active'); else btns[i].classList.remove('active');
    }
  }
  storyRender();
}

function storySetTone(id) {
  var s = getSettings();
  s.storyTone = storyToneOf(id).id;
  saveSettings();
  storySyncUi();
}
function storySetType(id) {
  var s = getSettings();
  s.storyType = storyTypeOf(id) ? id : '';
  saveSettings();
  storyRender();
}
function storySetSub(key, value) {
  var s = getSettings();
  s[key] = value;
  saveSettings();
  storyRender();
}

function storyRender() {
  var listEl = getEl('opf-story-list');
  var nowEl = getEl('opf-story-now');
  if (!listEl) return;
  var s = getSettings();
  var chosen = storyTypeOf(s.storyType);
  listEl.textContent = '';

  function row(id, name, brief) {
    var lab = document.createElement('label');
    lab.className = 'opf-story-item' + ((s.storyType || '') === id ? ' on' : '');
    var input = document.createElement('input');
    input.type = 'radio';
    input.name = 'opf-story-type';
    input.value = id;
    input.checked = (s.storyType || '') === id;
    input.addEventListener('change', function () { if (input.checked) storySetType(id); });
    var nm = document.createElement('span');
    nm.className = 'nm'; nm.textContent = name;
    var bf = document.createElement('span');
    bf.className = 'bf'; bf.textContent = brief || '';
    lab.appendChild(input); lab.appendChild(nm); lab.appendChild(bf);
    listEl.appendChild(lab);
    return lab;
  }

  row('', '不指定', '按上面的需求自己定');
  STORY_TYPES.forEach(function (t) { row(t.id, t.name, t.brief); });

  // 子项：跟着选中项展开
  if (chosen && chosen.sub) {
    var wrap = document.createElement('div');
    wrap.className = 'opf-story-sub';
    var opts = chosen.sub === 'school' ? STORY_SCHOOLS : STORY_ROLES;
    var curKey = chosen.sub === 'school' ? 'storySchool' : 'storyRole';
    opts.forEach(function (o) {
      var lab = document.createElement('label');
      lab.className = 'opf-opt';
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'opf-story-sub-' + chosen.sub;
      input.value = o.id;
      input.checked = String(s[curKey] || '') === String(o.id);
      input.addEventListener('change', function () { if (input.checked) storySetSub(curKey, o.id); });
      lab.appendChild(input);
      lab.appendChild(document.createTextNode(' ' + o.name));
      wrap.appendChild(lab);
    });
    listEl.appendChild(wrap);
  }

  if (nowEl) {
    var tone = storyToneOf(s.storyTone);
    var parts = ['基调：' + tone.name];
    if (chosen) {
      var extra = '';
      if (chosen.sub === 'school') extra = ' · ' + storySchoolOf(s.storySchool).name;
      if (chosen.sub === 'role') extra = ' · ' + storyRoleOf(s.storyRole).name;
      parts.push('题材：' + chosen.name + extra);
    } else {
      parts.push('题材：不指定');
    }
    nowEl.textContent = parts.join(' ｜ ');
  }
}

function addStoryToneUI(root) {
  var card = root && root.querySelector ? root.querySelector('#opf-story-card') : null;
  if (!card) return;
  try {
    if (!getEl(NS + '_css_story')) {
      var st = document.createElement('style');
      st.id = NS + '_css_story';
      st.textContent = STORY_CSS;
      document.head.appendChild(st);
    }
  } catch (e) { opfErr('story css', e); }

  card.innerHTML = '<div class="opf-card-hd"><span class="opf-card-no">ST</span><span class="opf-card-t">故事基调</span>' +
    '<span class="opf-card-sub">基调必选其一 · 题材可选（都会写进提示词）</span></div>' +
    '<div class="opf-story-tone" id="opf-story-tone"></div>' +
    '<div class="opf-story-list" id="opf-story-list"></div>' +
    '<div class="opf-dim opf-story-now" id="opf-story-now">—</div>';

  var toneBox = getEl('opf-story-tone');
  STORY_TONES.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'opf-tone-btn';
    b.setAttribute('data-tone', t.id);
    b.title = t.hint;
    b.textContent = t.name;
    var sub = document.createElement('span');
    sub.className = 't';
    sub.textContent = t.id === 'sunny' ? '明亮 · 希望' : (t.id === 'gloomy' ? '压抑 · 代价' : '照世界书原样');
    b.appendChild(sub);
    b.addEventListener('click', function () { storySetTone(t.id); });
    toneBox.appendChild(b);
  });

  storySyncUi();
}
