//@module 32-world — ② 世界书：左缘勾选侧栏 + 分类/搜索 + 尺寸 CSS
// ============ 世界书左缘侧栏（懒加载独立浮层，不碰主窗口布局） ============
var LSIDE_CSS2 = ".opf-wi-cat{font-size:10px;letter-spacing:1px;color:#ffb7be;background:rgba(255,77,94,.10);border:1px solid rgba(255,122,138,.22);border-radius:6px;padding:2px 8px;margin:6px 2px 2px;flex:none}#opf-lside-cat{flex:1 1 90px;min-width:80px;border-radius:7px;padding:4px 6px;font-size:11px;color:#ffeef1;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none}";
var LSIDE_CSS = "#opf-lside{position:fixed;left:0;top:70px;bottom:70px;width:min(360px,86vw);z-index:2147480003;display:flex;flex-direction:column;min-height:0;background:linear-gradient(180deg,rgba(24,4,10,.96),rgba(12,2,6,.97));border:1px solid rgba(255,122,138,.3);border-left:none;border-radius:0 12px 12px 0;box-shadow:6px 0 22px rgba(0,0,0,.4),0 0 18px rgba(255,77,94,.18);transform:translateX(-110%);transition:transform .18s ease;overflow:hidden}#opf-lside.open{transform:translateX(0)}#opf-lside-head{display:flex;align-items:center;gap:6px;padding:8px 10px;font-size:12px;font-weight:600;color:#ffd9de;border-bottom:1px solid rgba(255,122,138,.2);flex:none}#opf-lside-head .t{flex:1}.opf-lside-ico{border:none;background:transparent;color:#ff8a95;cursor:pointer;font-size:12px;padding:2px 6px;border-radius:6px}.opf-lside-ico:hover{background:rgba(255,77,94,.16);color:#fff}#opf-lside-tools{display:flex;gap:4px;padding:6px 8px 2px;flex-wrap:wrap;flex:none}#opf-lside-count{font-size:10px;color:rgba(255,200,208,.7);padding:2px 8px;width:100%}#opf-lside-filter{margin:2px 8px 4px;border-radius:7px;padding:4px 7px;font-size:11px;color:#ffeef1;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none}#opf-lside-list{flex:1 1 auto;overflow-y:auto;padding:2px 6px 8px;min-height:0}.opf-lside-hint{font-size:10.5px;color:rgba(255,200,208,.6);line-height:1.5;padding:10px 12px;white-space:pre-wrap}.opf-wi-row{display:flex;gap:6px;align-items:flex-start;padding:3px 4px;border-radius:6px;cursor:pointer;font-size:10.5px;color:rgba(255,226,230,.88)}.opf-wi-row:hover{background:rgba(255,235,238,.06)}.opf-wi-row input{margin-top:2px;accent-color:#ff4d5e;cursor:pointer}.opf-wi-row .tx{flex:1 1 auto;min-width:0;word-break:break-word;line-height:1.35}.opf-wi-row .ln{flex:none;color:rgba(255,200,208,.42);font-size:9.5px}.opf-wi-row .cst{flex:none;color:#8fd6ff;font-size:9px;padding:0 4px;border:1px solid rgba(120,190,255,.35);border-radius:8px}";
function dlcKind(c){
  var idx = c.indexOf("[DLC]");
  if (idx < 0) return "";
  var j = c.indexOf("[", idx + 5);
  if (j >= 0) {
    var k = c.indexOf("]", j);
    if (k > j) {
      var tok = c.slice(j + 1, k);
      if (tok.indexOf("角色") >= 0) return "角色";
      if (tok.indexOf("扩展") >= 0) return "DLC扩展";
      if (tok.indexOf("事件") >= 0) return "DLC事件";
      return "DLC内容";
    }
  }
  if (c.indexOf("角色") >= 0) return "角色";
  if (c.indexOf("扩展") >= 0) return "DLC扩展";
  if (c.indexOf("事件") >= 0) return "DLC事件";
  return "DLC内容";
}
function wpkCategory(e){
  var cm = (e.comment || "");
  var s = cm + " " + (Array.isArray(e.key) ? e.key.join(" / ") : (typeof e.key === "string" ? e.key : ""));
  // ---- 命定之诗 v4.3(6) 起：注释改为 [本体][分类]… / [DLC][角色|扩展|事件]… 层级标签，
  //      优先按标签归版（更稳）；未命中标签或其它世界书仍走下面的关键词兜底 ----
  if (cm.indexOf("[本体]") === 0 || cm.indexOf("[DLC]") === 0) {
    if (cm.indexOf("[DLC]") === 0) return dlcKind(cm);
    if (cm.indexOf("➡️") >= 0) return "导览开关";
    if (cm.indexOf("[命定系统]") >= 0) return "命定系统";
    if (cm.indexOf("节庆") >= 0) return "节庆";
    if (cm.indexOf("[产业]") >= 0) return "经济·产业";
    if (cm.indexOf("[组织]") >= 0) return "组织·势力";
    if (cm.indexOf("[势力]") >= 0 || cm.indexOf("[冒险区域]") >= 0 || cm.indexOf("[怪物生态]") >= 0) return "地区·地理";
    if (cm.indexOf("[种族]") >= 0) return "种族";
    if (cm.indexOf("[角色]") >= 0) return "角色";
    if (cm.indexOf("[世界设定]") >= 0 || cm.indexOf("[额外设定]") >= 0 || cm.indexOf("[变量]") >= 0 || cm.indexOf("[COT]") >= 0 || cm.indexOf("[事件]") >= 0) return "规则·系统";
    if (cm.indexOf("[控制]") >= 0 || cm.indexOf("[快捷功能]") >= 0) return "导览开关";
  }
  if (s.indexOf("[DLC]") >= 0) return dlcKind(s);
  if (s.indexOf("命定系统") >= 0 || s.indexOf("命运抽卡") >= 0) return "命定系统";
  var orgT = ["组织概览","冒险者公会","炼金公会","锻造协会","金狮商会","魔法协会","圣灵教会","联合海防巡逻队","阴影势力","捕奴队","苍棘之塔","异界信徒"];
  for (var ot = 0; ot < orgT.length; ot++) { if (cm.indexOf(orgT[ot]) >= 0) return "组织·势力"; }
  var ecoT = ["产业概览","服装与奢侈品","房产与装修","技能书和技能课程","银行信贷业","锻造与装备","魔导","专业设施建造与租赁","奴隶","妓女和娼妇","情报交易","暗杀和绑架","材料采集与贸易","炼金","魔宠"];
  for (var et = 0; et < ecoT.length; et++) { if (cm.indexOf(ecoT[et]) >= 0) return "经济·产业"; }
  var preRule = ["[世界规则]","[世界主设定]","[角色生成]","[角色辅助指导]","[InitVar]","[mvu_update]","美化规则","审美叙事","正文cot","专用预设","禁止","[战斗协议]","[生产制作协议]","生命层级"];
  for (var p = 0; p < preRule.length; p++) { if (s.indexOf(preRule[p]) >= 0) return "规则·系统"; }
  if (cm.indexOf("➡️") === 0 || cm.indexOf("概览") >= 0) return "导览开关";
  if (s.indexOf("种族") >= 0) return "种族";
  if (s.indexOf("角色") >= 0) return "角色";
  if (cm.indexOf("节庆") >= 0 || cm.toLowerCase().indexOf("festival") >= 0) return "节庆";
  var heads = ["诺斯加德联盟","精灵王庭","边陲之国","兽族联盟","索伦蒂斯","梵尼亚","瓦伦蒂亚","龙誓骑团","无尽树海","奥古斯提姆帝国","翼民圣国","潮汐王座","伯伦斯法环","永夜盟约","赛瑞利亚","萨赫拉联邦","碎星群岛","悲鸣沼泽","末世星","灾厄之翼","艾琉德雷姆","永冻冰原","克摩什","骸响之都","落星之岛","雾晶港"];
  for (var h = 0; h < heads.length; h++) { if (cm.indexOf(heads[h]) >= 0) return "地区·地理"; }
  var geoW = ["冒险区域","大陆","群岛","沼泽","冰原","自治区","地理","地图","城镇","地块","城区","地区","王国","王庭","领地","港口","森林","山脉","湖泊","海岸","边境","帝国","圣国","王座","上层区","下城区","长途移动","云海","空岛","城池","都市","首都"];
  for (var g = 0; g < geoW.length; g++) { if (s.indexOf(geoW[g]) >= 0) return "地区·地理"; }
  var orgW = ["公会","协会","商会","教会","骑士团","佣兵团","行会","捕奴队","组织","势力","阴影","信徒","教团","邪教","异神","氏族"];
  for (var o = 0; o < orgW.length; o++) { if (s.indexOf(orgW[o]) >= 0) return "组织·势力"; }
  var ruleW = ["药剂","复活","状态","经验","好感","登神","随机池","智慧生物","数值表","品质效果","variables","output_format","COT","机制","任务","委托","战斗生产","生成规则"];
  for (var r = 0; r < ruleW.length; r++) { if (s.indexOf(ruleW[r]) >= 0) return "规则·系统"; }
  var ecoW = ["信贷","借贷","贸易","经济","价格","市场","拍卖","租金","工坊","材料","魔宠","魔导","情报交易","奢侈品","珠宝","服装","锻造与装备","技能书和技能课程","产业链","兑换","黑市","灰色产业","娼馆","妓院","房产","装修","租赁","设施","异界信徒"];
  for (var q = 0; q < ecoW.length; q++) { if (s.indexOf(ecoW[q]) >= 0) return "经济·产业"; }
  return "其他";
}
function leadingTags(cm){
  var out = []; var pos = 0; var re = /\[([^\]]+)\]/g; var m;
  while ((m = re.exec(cm || "")) !== null) {
    if (m.index !== pos) break;
    out.push(m[1]); pos = re.lastIndex;
  }
  return out;
}
function wpkRegion(cm){
  // v4.3(6)：取 [本体][势力|冒险区域|怪物生态] 之后的下一个标签作为地区二级索引
  var tags = leadingTags(cm);
  for (var i = 0; i < tags.length; i++) {
    if (tags[i] === "势力" || tags[i] === "冒险区域" || tags[i] === "怪物生态") {
      var nx = tags[i + 1];
      if (nx && nx !== "势力" && nx !== "冒险区域" && nx !== "怪物生态") return nx;
      return tags[i];
    }
  }
  // 旧格式兜底：方括号第一段按 “-” 拆分
  var s1 = (cm || "").indexOf("[");
  if (s1 < 0) return "";
  var e1 = (cm || "").indexOf("]", s1);
  if (e1 <= s1 + 1) return "";
  var inner = (cm || "").slice(s1 + 1, e1).trim();
  var dash = inner.indexOf("-");
  if (dash > 0) return inner.slice(0, dash).trim();
  return inner;
}
function wpkNorm(rawList, idPrefix, srcKey){
  var out = []; if (!Array.isArray(rawList)) return out;
  var pre = idPrefix || "";
  // 书的身份键必须与 importWorldEntries 里的 key 一致（不含结尾冒号）；
  // 以前这里直接用了 id 前缀（key + ":"），导致「同书重导」的过滤条件永远不成立 → 条目每次翻倍。
  var src = (srcKey == null ? String(pre).replace(/:$/, "") : String(srcKey));
  for (var i = 0; i < rawList.length; i++) {
    var e = rawList[i];
    if (!e || typeof e.content !== "string" || !e.content.trim()) continue;
    var keyStr = Array.isArray(e.key) ? e.key.join(" / ") : (typeof e.key === "string" ? e.key : "");
    var cv = wpkCategory(e);
    out.push({ id: pre + (e.uid != null ? "u" + e.uid : "i" + i), srcKey: src, comment: (e.comment || ""), key: keyStr, content: e.content, constant: !!e.constant, sel: false, cat: cv, region: (cv === "地区·地理" ? wpkRegion(e.comment || "") : "") });
  }
  return out;
}
// ---- 世界书去重：同名 / 同内容再导入时不再翻倍 ----
/** 书名归一：去扩展名、去 (6)/（7） 这类序号、去 v4.3 版本号、去空白与分隔符 */
function wpkNormLabel(s){
  return String(s == null ? "" : s)
    .replace(/\.json$/i, "")
    .replace(/[（(]\s*\d+\s*[）)]/g, "")
    .replace(/v?\d+(?:\.\d+)+/gi, "")
    .replace(/[\s_\-—·]+/g, "")
    .trim();
}
/** 丢掉若干本书（连带书名登记） */
function wpkDropBooks(keys){
  if (!keys || !keys.length) return 0;
  var wb = ST.wb || {};
  var drop = {};
  keys.forEach(function (k) { drop[k] = 1; });
  var before = (wb.entries || []).length;
  wb.entries = (wb.entries || []).filter(function (e) { return !drop[e.srcKey]; });
  keys.forEach(function (k) {
    if (wb.bookOf && wb.bookOf[k]) {
      var lb = wb.bookOf[k];
      var i = (wb.books || []).indexOf(lb);
      if (i >= 0 && wb.books) wb.books.splice(i, 1);
      delete wb.bookOf[k];
    }
    if (wb.loaded) delete wb.loaded[k];
  });
  return before - wb.entries.length;
}
/** 跨书去重：条目正文+标题完全相同只留一条（勾选的那条优先留） */
function wpkDedupeEntries(){
  var wb = ST.wb;
  if (!wb || !Array.isArray(wb.entries)) return 0;
  var seen = {}, kept = [];
  wb.entries.forEach(function (e) {
    var k = String(e.comment || "") + "\u0001" + String(e.content || "");
    if (Object.prototype.hasOwnProperty.call(seen, k)) {
      var at = seen[k];
      if (!kept[at].sel && e.sel) kept[at] = e;
      return;
    }
    seen[k] = kept.length;
    kept.push(e);
  });
  var removed = wb.entries.length - kept.length;
  if (!removed) return 0;
  wb.entries = kept;
  var alive = {};
  kept.forEach(function (e) { alive[e.srcKey] = 1; });
  var dead = Object.keys(wb.bookOf || {}).filter(function (k) { return !alive[k]; });
  if (dead.length) wpkDropBooks(dead);
  return removed;
}

function importWorldEntries(rawEntries, sourceName, fileName){
  rawEntries = Array.isArray(rawEntries) ? rawEntries : [];
  var key = fileName ? "file:" + fileName : (sourceName === "st" ? "st:active" : "book:" + String(sourceName || "book"));
  var label = fileName ? String(fileName).replace(/\.json$/i, "") : (sourceName === "st" ? "酒馆激活" : String(sourceName || "book"));
  ST.wb = ST.wb || { entries: [], books: [], loaded: {} };
  ST.wb.loaded = ST.wb.loaded || {};
  ST.wb.bookOf = ST.wb.bookOf || {};
  ST.wb.books = ST.wb.books || [];

  var fresh = wpkNorm(rawEntries, key + ":", key);

  // ① 同名世界书（归一化书名一致）= 同一本的重新导入 → 整本替换，勾选按 comment 带过来
  var normLabel = wpkNormLabel(label);
  var groups = {};
  (ST.wb.entries || []).forEach(function (e) {
    if (e.srcKey === key) return;
    (groups[e.srcKey] = groups[e.srcKey] || []).push(e);
  });
  var carrySel = {};
  var replaceKeys = Object.keys(groups).filter(function (k) {
    if (!normLabel) return false;
    var other = wpkNormLabel(ST.wb.bookOf[k] || String(k).replace(/^file:/, ""));
    return !!other && other === normLabel;
  });
  replaceKeys.forEach(function (k) {
    groups[k].forEach(function (e) { if (e.sel && e.comment) carrySel[e.comment] = true; });
  });
  if (replaceKeys.length) {
    var dropped = wpkDropBooks(replaceKeys);
    opfLog("同名世界书替换：", replaceKeys.join(","), "移除旧条目", dropped);
  }

  var old = ST.wb.entries || [];
  var oldSel = {};
  old.forEach(function (o) { if (o.srcKey === key) oldSel[o.id] = o.sel; });
  // 跨会话缓存勾选：按 comment 匹配（同一本书重复导入/刷新时保留上次勾选，即使 uid 变化）
  var cacheSel = worldCacheGetSel(fileName || null, key);
  // ② 跨书同文条目（酒馆激活 + 手动导入同一本）：完全相同的正文不再收第二份
  var seenText = {};
  old.forEach(function (o) {
    if (o.srcKey === key) return;
    seenText[String(o.comment || "") + "\u0001" + String(o.content || "")] = 1;
  });
  var skipped = 0;
  var c = 0;
  fresh.forEach(function (e) {
    var tk = String(e.comment || "") + "\u0001" + String(e.content || "");
    if (Object.prototype.hasOwnProperty.call(seenText, tk)) { skipped++; e._dup = true; return; }
    seenText[tk] = 1;
    if (Object.prototype.hasOwnProperty.call(carrySel, e.comment)) { e.sel = true; c++; return; }
    if (Object.prototype.hasOwnProperty.call(oldSel, e.id)) e.sel = !!oldSel[e.id];
    else if (cacheSel && Object.prototype.hasOwnProperty.call(cacheSel, e.comment)) e.sel = !!cacheSel[e.comment];
    else e.sel = !!e.constant;
    if (e.sel) c++;
  });
  if (skipped) {
    fresh = fresh.filter(function (e) { return !e._dup; });
    opfLog("世界书去重：跳过与已载条目完全相同的", skipped, "条");
  }

  ST.wb.entries = old.filter(function (o) { return o.srcKey !== key; }).concat(fresh);
  if (fresh.length) {
    ST.wb.bookOf[key] = label;
    if (ST.wb.books.indexOf(label) < 0) ST.wb.books.push(label);
  } else if (!ST.wb.entries.length) {
    delete ST.wb.bookOf[key];
  }
  // ③ 收尾再按正文去重一次（防书内自重复 / 历史遗留）
  wpkDedupeEntries();
  ST.worldSource = (ST.wb.books.length > 1) ? "multi" : (fileName ? "file:" + fileName : (sourceName === "st" ? "st" : "file"));
  ST.catOpen = null; ST.regionOpen = null;
  ST.worldInfo = "";
  worldCacheSave(fileName, key, fresh);
  updateSendText();
  try { renderWorldSide(); } catch (e) { opfErr("renderWorldSide", e); }
  renderMetaStatus();
  return { added: fresh.length, skipped: skipped, replaced: replaceKeys.length, total: ST.wb.entries.length, sel: c, books: ST.wb.books.length };
}
function updateSendText(){
  var s = getSettings();
  var wb = ST.wb || { entries: [] };
  if (!s.includeWorld || !wb.entries || !wb.entries.length) { ST.worldInfo = ""; ST.worldTrunc = false; return; }
  var nl2 = String.fromCharCode(10) + String.fromCharCode(10);
  var parts = []; var total = 0; var cap = s.capChars || 30000; var cut = false;
  for (var i = 0; i < wb.entries.length; i++) {
    var e = wb.entries[i];
    if (!e.sel) continue;
    if (s.worldConstantOnly && !e.constant) continue;
    var head = e.comment || e.key || "";
    var line = (head ? "【" + String(head).slice(0, 60) + "】" : "") + e.content;
    if (total + line.length > cap) { cut = true; break; }
    parts.push(line); total += line.length;
  }
  if (cut) parts.push("……(超过" + cap + "字注入上限，其余未发送)");
  ST.worldInfo = parts.join(nl2);
  ST.worldTrunc = cut;   // 真被截断时要能在界面上看出来（字数没超过上限也可能被截）
  worldCachePersistSel();
  try { if (typeof qsRender === 'function' && getEl('opf-qs-list')) qsRender(); } catch (e) {}
}
function clearWorldbook(){
  ST.wb = { entries: [], books: [], loaded: {}, bookOf: {}, source: "none", fileName: null };
  ST.catOpen = null;
  ST.regionOpen = null;
  ST.worldSource = "none";
  ST.worldInfo = "";
  ST.worldTrunc = false;
  worldCacheClearSel();
  try { renderWorldSide(); } catch (e) {}
  renderMetaStatus();
  toast("已清空世界书条目");
}
function wpkCounts(){
  var wb = ST.wb || { entries: [] }; var selN = 0;
  for (var i = 0; i < wb.entries.length; i++) if (wb.entries[i].sel) selN++;
  return { selN: selN, total: wb.entries.length, chars: (ST.worldInfo || "").length };
}
function renderWorldSide(){
  // 页签在「酒馆世界书」时整页交给批量删除列表渲染（v1.26.0）
  if (ST.stw && ST.stw.on) { stwRenderSide(); return; }
  var listEl = getEl("opf-lside-list"); if (!listEl) return;
  var cntEl = getEl("opf-lside-count");
  var c = wpkCounts();
  if (cntEl) { var bs = (ST.wb && ST.wb.books && ST.wb.books.length) || 1; var bx = (ST.wb && ST.wb.books && ST.wb.books.length > 1) ? " · 已载" + ST.wb.books.length + "本世界书" : ""; cntEl.textContent = "已勾选 " + c.selN + "/" + c.total + " 条 · 约 " + c.chars + " 字" + bx; }
  listEl.textContent = "";
  var wb = ST.wb || { entries: [] };
  if (!wb.entries || !wb.entries.length) {
    var d = document.createElement("div"); d.className = "opf-lside-hint";
    d.textContent = "尚未载入世界书。\n\n点“导入文件”选择世界书 JSON（如 命定之诗与黄昏之歌v4.3 (6).json）；或在“生成初稿”时自动探测酒馆激活世界书。\n载入后可一次追加多本世界书（重复导入同文件=刷新）；[本体][分类]…/[DLC][角色/扩展/事件] 前缀会自动归类。勾选的才发送（默认只勾选常驻）。";
    var bt = document.createElement("button"); bt.type = "button"; bt.className = "opf-step-act"; bt.textContent = "导入世界书文件";
    bt.addEventListener("click", function(){ if (ST.fileInput) ST.fileInput.click(); else { var wb2 = getEl("opf-wload"); if (wb2) wb2.click(); } });
    d.appendChild(bt);
    listEl.appendChild(d);
    return;
  }
  if (!ST.catOpen) ST.catOpen = {};
  if (!ST.regionOpen) ST.regionOpen = {};
  var defTrue = ["命定系统","规则·系统","导览开关","种族","角色"];
  ["命定系统","规则·系统","导览开关","地区·地理","种族","角色","组织·势力","经济·产业","节庆","DLC扩展","DLC事件","DLC内容","其他"].forEach(function (kk){ if (!Object.prototype.hasOwnProperty.call(ST.catOpen, kk)) { ST.catOpen[kk] = defTrue.indexOf(kk) >= 0; } });
  var f = (getEl("opf-lside-filter") && getEl("opf-lside-filter").value || "").toLowerCase();
  var catSel = getEl("opf-lside-cat") && getEl("opf-lside-cat").value || "全部";
  var catOrder = ["命定系统","规则·系统","导览开关","地区·地理","种族","角色","组织·势力","经济·产业","节庆","DLC扩展","DLC事件","DLC内容","其他"];
  var rowsByCat = {};
  wb.entries.forEach(function (e) {
    if (f && (e.comment + " " + e.key + " " + e.content).toLowerCase().indexOf(f) < 0) return;
    var cat = e.cat || "其他";
    if (catSel !== "全部" && cat !== catSel) return;
    (rowsByCat[cat] = rowsByCat[cat] || []).push(e);
  });
  var totalShown = 0;
  catOrder.forEach(function (cat) {
    var rows = rowsByCat[cat] || [];
    if (!rows.length) return;
    totalShown += rows.length;
    var isOpen = catSel === cat ? true : (catSel === "全部" ? !!ST.catOpen[cat] : false);
    var hdRow = document.createElement("div"); hdRow.className = "opf-wi-cat-row";
    var hd = document.createElement("div"); hd.className = "opf-wi-cat";
    var selN = 0; for (var si = 0; si < rows.length; si++) if (rows[si].sel) selN++;
    hd.textContent = (isOpen ? "▾ " : "▸ ") + cat + " · " + rows.length + " 条" + (selN ? "（已勾 " + selN + "）" : "");
    hd.title = "点击展开/收起";
    hd.addEventListener("click", function(){ if (catSel === "全部") { ST.catOpen[cat] = !ST.catOpen[cat]; renderWorldSide(); } });
    var bOn = document.createElement("button"); bOn.type = "button"; bOn.className = "opf-cat-all"; bOn.textContent = "全开"; bOn.title = "一键勾选本板块全部条目";
    bOn.addEventListener("click", function(ev){ ev.stopPropagation(); wpkSetCat(cat, true); });
    var bOff = document.createElement("button"); bOff.type = "button"; bOff.className = "opf-cat-all off"; bOff.textContent = "全关"; bOff.title = "一键清空本板块勾选";
    bOff.addEventListener("click", function(ev){ ev.stopPropagation(); wpkSetCat(cat, false); });
    hdRow.appendChild(hd); hdRow.appendChild(bOn); hdRow.appendChild(bOff);
    listEl.appendChild(hdRow);
    if (!isOpen) return;
    function makeRow(ee){
      var lab = document.createElement("label"); lab.className = "opf-wi-row";
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!ee.sel;
      cb.addEventListener("change", function(){ ee.sel = !!cb.checked; updateSendText(); renderWorldSide(); renderMetaStatus(); });
      lab.appendChild(cb);
      var tx = document.createElement("span"); tx.className = "tx";
      tx.textContent = ee.comment || ee.key || ee.content.slice(0, 24);
      tx.title = (ee.comment ? ee.comment + "\n" : "") + (ee.key ? ee.key + "\n" : "") + ee.content.slice(0, 300);
      lab.appendChild(tx);
      var ln = document.createElement("span"); ln.className = "ln"; ln.textContent = ee.content.length;
      lab.appendChild(ln);
      if (ee.constant) { var cst = document.createElement("span"); cst.className = "cst"; cst.textContent = "常驻"; lab.appendChild(cst); }
      if (ST.wb && ST.wb.books && ST.wb.books.length > 1) { var bln2 = (ST.wb.bookOf || {})[ee.srcKey] || ""; if (bln2) { var bsp2 = document.createElement("span"); bsp2.className = "b"; bsp2.textContent = bln2.slice(0, 8); lab.appendChild(bsp2); } }
      return lab;
    }
    if (cat === "地区·地理") {
      var regMap = {};
      rows.forEach(function (e2){ var r = e2.region || "未分组"; (regMap[r] = regMap[r] || []).push(e2); });
      var regs = Object.keys(regMap).sort(function(x, y){ return x.localeCompare(y, "zh"); });
      regs.forEach(function (r){
        var rOpen = !!ST.regionOpen[r];
        var selR = 0; regMap[r].forEach(function (e3){ if (e3.sel) selR++; });
        var sub = document.createElement("div"); sub.className = "opf-wi-sub";
        sub.textContent = (rOpen ? "▾ " : "▸ ") + r + " · " + regMap[r].length + " 条" + (selR ? "（已勾 " + selR + "）" : "");
        sub.title = "点击展开/收起";
        sub.addEventListener("click", function(){ ST.regionOpen[r] = !rOpen; renderWorldSide(); });
        listEl.appendChild(sub);
        if (!rOpen) return;
        regMap[r].forEach(function (e3){ listEl.appendChild(makeRow(e3)); });
      });
    } else {
      rows.forEach(function (e2){ listEl.appendChild(makeRow(e2)); });
    }
  });
  if (!totalShown) { var nd = document.createElement("div"); nd.className = "opf-lside-hint"; nd.textContent = "没有匹配的条目。"; listEl.appendChild(nd); }
}
function wpkSetCat(cat, v){ var wb = ST.wb; if (!wb) return; var hit = false; wb.entries.forEach(function (e){ if ((e.cat || "其他") === cat) { e.sel = !!v; hit = true; } }); if (hit) { updateSendText(); renderWorldSide(); renderMetaStatus(); } }
function wpkSetAll(v){ var wb = ST.wb; if (!wb) return; wb.entries.forEach(function (e){ e.sel = v; }); updateSendText(); renderWorldSide(); renderMetaStatus(); }
function wpkSetConst(){ var wb = ST.wb; if (!wb) return; wb.entries.forEach(function (e){ e.sel = !!e.constant; }); updateSendText(); renderWorldSide(); renderMetaStatus(); }
function buildWorldSide(){
  if (getEl("opf-lside")) return;
  var st = document.createElement("style"); st.id = NS + "_css_lside"; st.textContent = LSIDE_CSS + LSIDE_CSS2 + LSIDE_CSS3 + LSIDE_CSS4; document.head.appendChild(st);
  var side = document.createElement("div"); side.id = "opf-lside";
  var head = document.createElement("div"); head.id = "opf-lside-head";
  var t = document.createElement("span"); t.className = "t"; t.textContent = "世界书条目 · 勾选发送";
  var hx = document.createElement("button"); hx.type = "button"; hx.className = "opf-lside-ico"; hx.textContent = "✕"; hx.addEventListener("click", function(){ switchPage("preset"); });
  head.appendChild(t); head.appendChild(hx); side.appendChild(head);
  stwBuildTabs(side);
  var tools = document.createElement("div"); tools.id = "opf-lside-tools";
  var bImport = document.createElement("button"); bImport.type = "button"; bImport.className = "opf-step-act"; bImport.id = "opf-lside-import"; bImport.textContent = "导入文件"; bImport.title = "导入世界书 JSON（重复导入同一本 = 刷新内容并保留勾选，不会翻倍）";
  bImport.addEventListener("click", function(){ if (ST.fileInput) ST.fileInput.click(); else { var w0 = getEl("opf-wload"); if (w0) w0.click(); } });
  var bClear = document.createElement("button"); bClear.type = "button"; bClear.className = "opf-step-act"; bClear.id = "opf-lside-clear"; bClear.textContent = "清空世界书"; bClear.title = "清掉已导入的全部世界书条目（勾选与缓存书单一起清）";
  bClear.addEventListener("click", function(){ clearWorldbook(); });
  var bAll = document.createElement("button"); bAll.type = "button"; bAll.className = "opf-step-act"; bAll.textContent = "全选"; bAll.addEventListener("click", function(){ wpkSetAll(true); });
  var bConst = document.createElement("button"); bConst.type = "button"; bConst.className = "opf-step-act"; bConst.textContent = "仅常驻"; bConst.addEventListener("click", wpkSetConst);
  var bNone = document.createElement("button"); bNone.type = "button"; bNone.className = "opf-step-act"; bNone.textContent = "清空勾选"; bNone.addEventListener("click", function(){ wpkSetAll(false); });
  var filt = document.createElement("input"); filt.type = "text"; filt.id = "opf-lside-filter"; filt.placeholder = "筛选条目…"; filt.addEventListener("input", function(){ renderWorldSide(); });
  var catSel = document.createElement("select"); catSel.id = "opf-lside-cat";
  ["全部","命定系统","规则·系统","导览开关","地区·地理","种族","角色","组织·势力","经济·产业","节庆","DLC扩展","DLC事件","DLC内容","其他"].forEach(function (v){ var o = document.createElement("option"); o.value = v; o.textContent = v; catSel.appendChild(o); });
  catSel.addEventListener("change", function(){ renderWorldSide(); });
  tools.appendChild(bImport); tools.appendChild(bClear); tools.appendChild(bAll); tools.appendChild(bConst); tools.appendChild(bNone); tools.appendChild(filt); tools.appendChild(catSel); side.appendChild(tools);
  stwBuildTools(side);
  var cnt = document.createElement("div"); cnt.id = "opf-lside-count"; side.appendChild(cnt);
  var list = document.createElement("div"); list.id = "opf-lside-list"; side.appendChild(list);
  var host = getEl("opf-page-world") || document.body;
  host.appendChild(side);
  renderWorldSide();
}
function openWorldSide(){ try { buildWorldSide(); } catch (e) { opfErr("buildWorldSide", e); return; } try { switchPage("world"); } catch (e) {} }
function closeWorldSide(){ try { switchPage("preset"); } catch (e) {} }
function toggleWorldSide(){ var s = getSettings(); if (s.activePage === "world") { closeWorldSide(); } else { openWorldSide(); } }
function buildWorldSideButton(root){
  if (!root || getEl("opf-wbtn")) return;
  var btn = document.createElement("button"); btn.type = "button"; btn.className = "opf-step-act"; btn.id = "opf-wbtn"; btn.textContent = "世界书清单"; btn.title = "打开「世界书」页（勾选哪些条目发送给 AI；勾选与导入自动缓存）";
  btn.addEventListener("click", toggleWorldSide);
  var opts = root.querySelectorAll(".opf-opts");
  if (opts && opts.length) { opts[opts.length - 1].appendChild(btn); } else { root.appendChild(btn); }
  try { injectGlobalSizeCSS(); } catch (e) { opfErr("injectGlobalSizeCSS", e); }
}

var LSIDE_CSS3 = "#opf-lside{font-size:12.5px;top:60px;bottom:60px}.opf-wi-cat{cursor:pointer;user-select:none;font-size:11.5px;padding:3px 8px}.opf-wi-cat:hover{color:#ff8a95;border-color:rgba(255,150,165,.55);background:rgba(255,90,105,.12)}.opf-wi-row{font-size:11.5px}.opf-wi-row .ln{font-size:10px}.opf-lside-hint{font-size:11.5px}#opf-lside-filter{font-size:12px}#opf-lside-count{font-size:10.5px}.opf-wi-cat-row{display:flex;align-items:center;gap:4px;margin:6px 0 2px;flex:none}.opf-wi-cat-row .opf-wi-cat{flex:1;margin:0}.opf-cat-all{border:none;cursor:pointer;border-radius:6px;padding:1px 7px;font-size:10px;color:#ffd5da;background:rgba(255,77,94,.12);border:1px solid rgba(255,122,138,.3)}.opf-cat-all:hover{background:rgba(255,77,94,.25)}.opf-cat-all.off{color:#ffc0c8;background:rgba(255,255,255,.06)}.opf-wi-row .b{flex:none;color:#b7d7ff;font-size:9px;border:1px solid rgba(140,180,255,.35);border-radius:8px;padding:0 4px}.opf-wi-sub{display:flex;gap:6px;align-items:center;cursor:pointer;user-select:none;font-size:11px;font-weight:600;color:#ffd9b0;background:rgba(255,170,90,.10);border:1px solid rgba(255,190,120,.25);border-radius:6px;padding:2px 8px;margin:5px 2px 1px}.opf-wi-sub:hover{color:#fff;background:rgba(255,170,90,.18)}";
var SIZE_CSS = [
  // ===== 全局字号（整体上调 2~3px，覆盖所有页面）=====
  "#opf-shell{font-size:14px!important}",
  "#opf-shell-title{font-size:17px!important}",
  ".opf-tab{font-size:14.5px!important;padding:10px 15px!important}",
  "#opf-shell-close{margin-left:0!important}",
  // 顶栏传输状态 chip
  ".opf-tx-status{margin-left:auto!important;flex:none;font-size:13px!important;color:#ffd9de;background:rgba(255,77,94,.12);border:1px solid rgba(255,122,138,.32);border-radius:999px;padding:5px 13px!important;cursor:pointer;white-space:nowrap}",
  ".opf-tx-status:hover{background:rgba(255,77,94,.26);color:#fff}",
  ".opf-tx-status.opf-tx-stream{color:#baf7cc;background:rgba(60,210,120,.14);border-color:rgba(120,230,150,.42)}",
  // ===== ① 开局预设 =====
  "#opf-root{font-size:15px!important}",
  // ① 页在全屏壳里由 SHELL_CSS 的 #opf-shell #opf-root{width:100%} 铺满；
  // 宽屏下内容走左右两栏（左＝需求与选项，右＝创作步骤与 JSON），窄屏自动叠成一栏。
  "#opf-page-preset #opf-body{display:grid!important;grid-template-columns:minmax(300px,380px) minmax(0,1fr)!important;gap:14px 22px!important;align-items:start;max-width:1680px!important;margin:0 auto;width:100%;padding:16px 20px 20px!important;overflow:visible!important;min-height:0!important}",
  "#opf-page-preset .opf-col{display:flex;flex-direction:column;gap:10px;min-width:0}",
  "@media (max-width:920px){#opf-page-preset #opf-body{grid-template-columns:minmax(0,1fr)!important}}",
  "#opf-page-preset #opf-actions{position:sticky!important;bottom:0;z-index:6;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}",
  "#opf-title{font-size:16px!important}",
  ".opf-sec-label{font-size:13px!important;letter-spacing:1px!important}",
  "#opf-demand{font-size:14px!important;min-height:60px!important}",
  ".opf-opt{font-size:13.5px!important}",
  "#opf-meta{font-size:13px!important}",
  "#opf-pname{font-size:13px!important;width:190px!important}",
  ".opf-num{font-size:13.5px!important}",
  // ===== 分步卡片 / 精修 / 按钮（多页共用）=====
  ".opf-step-title{font-size:14.5px!important}",
  ".opf-step-sub{font-size:12.5px!important}",
  ".opf-step-act{font-size:12.5px!important;padding:4px 10px!important}",
  ".opf-step-body{font-size:13.5px!important}",
  ".opf-ref-input{font-size:13px!important}",
  ".opf-ref-tag{font-size:11.5px!important}",
  ".opf-dir-chip{font-size:13.5px!important}",
  ".opf-btn{font-size:15px!important;padding:9px 6px!important}",
  ".opf-dot{font-size:13px!important}",
  // ===== 通用文本 / 输出框 / 输入框 =====
  ".opf-dim{font-size:12.5px!important;line-height:1.65!important}",
  ".opf-char-input{font-size:14px!important}",
  ".opf-box{font-size:13px!important}",
  ".opf-char-report{font-size:13px!important}",
  ".opf-char-tools{font-size:13.5px!important}",
  ".opf-outnote{font-size:12.5px!important}",
  "#opf-json-out{font-size:13px!important}",
  // ===== ② 世界书侧栏 =====
  "#opf-lside{font-size:13px!important}",
  ".opf-wi-row{font-size:12.5px!important}",
  ".opf-wi-row .tx{line-height:1.5!important}",
  "#opf-lside-filter{font-size:13px!important}",
  ".opf-lside-hint{font-size:12.5px!important}",
  "#opf-lside-head{font-size:13.5px!important}",
  // ===== ⑧ 造物工坊 =====
  "#opf-page-atelier{font-size:15px!important}",
  ".atl-space-name{font-size:13.5px!important}",
  ".atl-item-name{font-size:13px!important}",
  ".atl-empty{font-size:12.5px!important}",
  ".atl-cross-note{font-size:12.5px!important}",
  ".atl-open{font-size:12px!important}",
  ".atl-item-meta{font-size:12px!important}"
].join("");
function injectGlobalSizeCSS(){
  try { if (getEl(NS + "_css_size")) return; var st = document.createElement("style"); st.id = NS + "_css_size"; st.textContent = SIZE_CSS; document.head.appendChild(st); } catch (e) { opfErr("injectGlobalSizeCSS", e); }
}

// ============================================================================
// 酒馆世界书：批量勾选删除（v1.26.0）
// ② 世界书页新增「酒馆世界书」页签：列出 SillyTavern data/<用户>/worlds 下的
// 全部世界书，搜索 + 勾选 + 批量删除。
// 删除优先走酒馆自己的 world-info.js#deleteWorldInfo —— 它会同时解除全局选择、
// 当前角色/人设绑定并刷新酒馆的列表；拿不到模块时退回 /api/worldinfo/delete。
// 注意：这里删的是酒馆里的 .json 文件，不是本页「已载入条目」的内存快照。
// ============================================================================
var LSIDE_CSS4 = "#opf-lside-tabs{display:flex;gap:6px;padding:6px 10px 2px;flex:none}" +
  "#opf-lside-tabs .opf-lside-tab{flex:1;cursor:pointer;border-radius:7px;padding:4px 6px;font-size:11.5px;color:#ffd9de;background:rgba(255,255,255,.05);border:1px solid rgba(255,122,138,.22);font-family:inherit}" +
  "#opf-lside-tabs .opf-lside-tab:hover{background:rgba(255,77,94,.16);color:#fff}" +
  "#opf-lside-tabs .opf-lside-tab.on{color:#fff;background:rgba(255,77,94,.28);border-color:rgba(255,150,165,.6);font-weight:600}" +
  "#opf-stw-tools{display:flex;gap:4px;padding:6px 8px 2px;flex-wrap:wrap;flex:none}" +
  "#opf-stw-filter{width:100%;margin:2px 0 0;border-radius:7px;padding:4px 7px;font-size:11px;color:#ffeef1;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none}" +
  "#opf-stw-tools .opf-stw-hide{display:flex;align-items:center;gap:4px;width:100%;cursor:pointer;font-size:10.5px;color:rgba(255,226,230,.8)}" +
  "#opf-stw-tools .opf-stw-hide input{accent-color:#ff4d5e;cursor:pointer}" +
  "#opf-stw-del.opf-danger{color:#ffb3ba!important;border-color:rgba(255,90,105,.5)!important;background:rgba(255,77,94,.16)!important}" +
  "#opf-stw-del:disabled{opacity:.45;cursor:default}" +
  ".opf-wi-row .stwtag{flex:none;color:#ffd0a8;font-size:9px;border:1px solid rgba(255,190,120,.38);border-radius:8px;padding:0 4px}";

function stwS() {
  if (!ST.stw) {
    ST.stw = {
      on: false,          // 当前是否在看「酒馆世界书」页签
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
  renderWorldSide();
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
    renderWorldSide();
    return names;
  }, function (e) {
    s.loading = false; s.error = (e && e.message) ? e.message : String(e);
    renderWorldSide();
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
function stwSetOn(v) {
  var s = stwS();
  var next = !!v;
  if (s.on === next) { stwSyncChrome(); return; }
  s.on = next;
  stwSyncChrome();
  if (next && s.names === null && !s.loading) { stwRefresh(false); return; }
  renderWorldSide();
}
function stwSyncChrome() {
  var s = ST.stw;
  var on = !!(s && s.on);
  var bE = getEl('opf-lside-tab-entries');
  var bS = getEl('opf-lside-tab-stw');
  if (bE) bE.className = 'opf-lside-tab' + (on ? '' : ' on');
  if (bS) bS.className = 'opf-lside-tab' + (on ? ' on' : '');
  var tE = getEl('opf-lside-tools');
  var tS = getEl('opf-stw-tools');
  if (tE) tE.style.display = on ? 'none' : '';
  if (tS) tS.style.display = on ? '' : 'none';
  var del = getEl('opf-stw-del');
  if (del) {
    var n = stwCheckedNames().length;
    del.textContent = '删除选中' + (n ? '（' + n + '）' : '');
    del.disabled = !n || !!(s && (s.busy || s.loading));
  }
  var hid = getEl('opf-stw-hideactive');
  if (hid) hid.checked = !!(s && s.hideActive);
  var fl = getEl('opf-stw-filter');
  if (fl && fl.value !== (s && s.filter || '')) fl.value = (s && s.filter) || '';
}
function stwBuildTabs(side) {
  if (getEl('opf-lside-tabs')) return;
  var tabs = document.createElement('div');
  tabs.id = 'opf-lside-tabs';
  var bE = document.createElement('button');
  bE.type = 'button'; bE.id = 'opf-lside-tab-entries'; bE.className = 'opf-lside-tab';
  bE.textContent = '已载入条目'; bE.title = '本页导入的世界书条目，勾选后才发进 AI 上下文';
  bE.addEventListener('click', function () { stwSetOn(false); });
  var bS = document.createElement('button');
  bS.type = 'button'; bS.id = 'opf-lside-tab-stw'; bS.className = 'opf-lside-tab';
  bS.textContent = '酒馆世界书'; bS.title = '管理酒馆 data/<用户>/worlds 里的世界书文件，可批量勾选删除';
  bS.addEventListener('click', function () { stwSetOn(true); });
  tabs.appendChild(bE); tabs.appendChild(bS);
  side.appendChild(tabs);
  stwSyncChrome();
}
function stwBuildTools(side) {
  if (getEl('opf-stw-tools')) return;
  var row = document.createElement('div');
  row.id = 'opf-stw-tools';
  row.style.display = 'none';
  var bRefresh = document.createElement('button');
  bRefresh.type = 'button'; bRefresh.className = 'opf-step-act'; bRefresh.id = 'opf-stw-refresh';
  bRefresh.textContent = '刷新';
  bRefresh.title = '重新读取酒馆里的世界书列表';
  bRefresh.addEventListener('click', function () { stwRefresh(true); });
  var bAll = document.createElement('button');
  bAll.type = 'button'; bAll.className = 'opf-step-act'; bAll.id = 'opf-stw-all';
  bAll.textContent = '全选';
  bAll.title = '勾选当前列表里看到的全部世界书（受筛选影响）';
  bAll.addEventListener('click', function () { stwCheckVisible(true); });
  var bNone = document.createElement('button');
  bNone.type = 'button'; bNone.className = 'opf-step-act'; bNone.id = 'opf-stw-none';
  bNone.textContent = '清空';
  bNone.title = '清掉所有勾选（不只是当前筛选出来的）';
  bNone.addEventListener('click', function () { stwS().checked = {}; renderWorldSide(); });
  var bDel = document.createElement('button');
  bDel.type = 'button'; bDel.className = 'opf-step-act opf-danger'; bDel.id = 'opf-stw-del';
  bDel.textContent = '删除选中';
  bDel.title = '删除勾选的酒馆世界书文件（不可撤销，会先弹确认）';
  bDel.addEventListener('click', function () { stwConfirmDelete(); });
  var hidLab = document.createElement('label');
  hidLab.className = 'opf-stw-hide';
  var hid = document.createElement('input');
  hid.type = 'checkbox'; hid.id = 'opf-stw-hideactive';
  hid.addEventListener('change', function () { stwS().hideActive = !!hid.checked; renderWorldSide(); });
  hidLab.appendChild(hid);
  hidLab.appendChild(document.createTextNode('只看未使用（没被全局/角色/聊天绑定）'));
  var filt = document.createElement('input');
  filt.type = 'text'; filt.id = 'opf-stw-filter'; filt.placeholder = '筛选书名…';
  filt.addEventListener('input', function () { stwS().filter = filt.value || ''; renderWorldSide(); });
  row.appendChild(bRefresh); row.appendChild(bAll); row.appendChild(bNone); row.appendChild(bDel);
  row.appendChild(hidLab); row.appendChild(filt);
  side.appendChild(row);
}
function stwHint(listEl, text) {
  var d = document.createElement('div');
  d.className = 'opf-lside-hint';
  d.textContent = text;
  listEl.appendChild(d);
  return d;
}
function stwRow(name) {
  var s = stwS();
  var tags = stwTags(name);
  var lab = document.createElement('label');
  lab.className = 'opf-wi-row';
  var cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = !!s.checked[name]; cb.disabled = !!s.busy;
  cb.addEventListener('change', function () {
    if (cb.checked) s.checked[name] = true; else delete s.checked[name];
    stwSyncChrome();
    var cntEl = getEl('opf-lside-count');
    if (cntEl) {
      cntEl.textContent = '酒馆共 ' + (s.names || []).length + ' 本世界书 · 显示 ' + stwVisibleNames().length + ' 本 · 已勾 ' + stwCheckedNames().length + ' 本';
    }
  });
  lab.appendChild(cb);
  var tx = document.createElement('span');
  tx.className = 'tx';
  tx.textContent = name;
  tx.title = name + (tags.length ? '\n正被使用：' + tags.join(' · ') : '');
  lab.appendChild(tx);
  for (var i = 0; i < tags.length; i++) {
    var sp = document.createElement('span');
    sp.className = 'stwtag'; sp.textContent = tags[i];
    lab.appendChild(sp);
  }
  return lab;
}
function stwRenderSide() {
  var listEl = getEl('opf-lside-list');
  if (!listEl) return;
  var s = stwS();
  stwSyncChrome();
  listEl.textContent = '';
  var cntEl = getEl('opf-lside-count');
  var checked = stwCheckedNames();
  var shown = stwVisibleNames();
  var total = (s.names || []).length;
  if (cntEl) {
    var txt;
    if (s.loading) txt = '正在读取酒馆世界书列表…';
    else if (s.error) txt = '读取失败，点「刷新」重试';
    else if (s.busy) txt = '正在删除…已勾 ' + checked.length + ' 本，先别关面板';
    else txt = '酒馆共 ' + total + ' 本世界书 · 显示 ' + shown.length + ' 本 · 已勾 ' + checked.length + ' 本';
    cntEl.textContent = txt;
  }
  if (s.loading) { stwHint(listEl, '正在读取酒馆世界书列表…'); return; }
  if (s.error) {
    stwHint(listEl, '读取失败：' + s.error);
    var bt = document.createElement('button');
    bt.type = 'button'; bt.className = 'opf-step-act'; bt.textContent = '刷新重试';
    bt.addEventListener('click', function () { stwRefresh(true); });
    listEl.appendChild(bt);
    return;
  }
  if (!total) { stwHint(listEl, '酒馆里还没有世界书。'); return; }
  if (!shown.length) {
    stwHint(listEl, (s.filter ? '没有匹配的世界书。' : '没有可显示的世界书（可能都被「只看未使用」过滤掉了）。') + '\n\n这里删的是酒馆 data/<用户>/worlds 里的 .json 文件；删之前会先弹确认。');
    return;
  }
  for (var i = 0; i < shown.length; i++) listEl.appendChild(stwRow(shown[i]));
}
function stwCheckVisible(v) {
  var s = stwS();
  if (s.loading || s.busy) return;
  var names = stwVisibleNames();
  for (var i = 0; i < names.length; i++) {
    if (v) s.checked[names[i]] = true; else delete s.checked[names[i]];
  }
  renderWorldSide();
}
function stwConfirmDelete() {
  var s = stwS();
  if (s.busy || s.loading) return;
  var names = stwCheckedNames();
  if (!names.length) { toast('先在列表里勾要删的世界书', 'warning'); return; }
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
  msg += '删的是 data/<用户>/worlds 里的 .json 文件，删了找不回来；已经载进本页的条目不受影响。';
  var yes = false;
  try { yes = window.confirm(msg); } catch (e) { yes = false; }
  if (!yes) return;
  stwDoDelete(names);
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
  renderWorldSide();
  opfLog('批量删除酒馆世界书：', names.length, '本');
  return stwEnsureModule(false).then(function (mod) {
    var ok = [], fail = [];
    var chain = Promise.resolve();
    names.forEach(function (name) {
      chain = chain.then(function () {
        var p;
        try { p = stwDeleteOne(mod, name); } catch (e) { p = Promise.reject(e); }
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
    return stwRefresh(false).then(function () { stwAfterDelete(res.ok, res.fail); }, function () { stwAfterDelete(res.ok, res.fail); });
  }, function (e) {
    s.busy = false;
    renderWorldSide();
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


