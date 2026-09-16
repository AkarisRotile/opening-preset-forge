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
function wpkNorm(rawList, idPrefix){
  var out = []; if (!Array.isArray(rawList)) return out;
  var pre = idPrefix || "";
  for (var i = 0; i < rawList.length; i++) {
    var e = rawList[i];
    if (!e || typeof e.content !== "string" || !e.content.trim()) continue;
    var keyStr = Array.isArray(e.key) ? e.key.join(" / ") : (typeof e.key === "string" ? e.key : "");
    var cv = wpkCategory(e);
    out.push({ id: pre + (e.uid != null ? "u" + e.uid : "i" + i), srcKey: pre, comment: (e.comment || ""), key: keyStr, content: e.content, constant: !!e.constant, sel: false, cat: cv, region: (cv === "地区·地理" ? wpkRegion(e.comment || "") : "") });
  }
  return out;
}
function importWorldEntries(rawEntries, sourceName, fileName){
  rawEntries = Array.isArray(rawEntries) ? rawEntries : [];
  var key = fileName ? "file:" + fileName : (sourceName === "st" ? "st:active" : "book:" + String(sourceName || "book"));
  var label = fileName ? String(fileName).replace(/\.json$/i, "") : (sourceName === "st" ? "酒馆激活" : String(sourceName || "book"));
  ST.wb = ST.wb || { entries: [], books: [], loaded: {} };
  ST.wb.loaded = ST.wb.loaded || {};
  var old = ST.wb.entries || [];
  var oldSel = {};
  old.forEach(function (o){ if (o.srcKey === key) oldSel[o.id] = o.sel; });
  // 跨会话缓存勾选：按 comment 匹配（同一本书重复导入/刷新时保留上次勾选，即使 uid 变化）
  var cacheSel = worldCacheGetSel(fileName || null, key);
  var fresh = wpkNorm(rawEntries, key + ":");
  var c = 0;
  fresh.forEach(function (e){
    if (Object.prototype.hasOwnProperty.call(oldSel, e.id)) e.sel = !!oldSel[e.id];
    else if (cacheSel && Object.prototype.hasOwnProperty.call(cacheSel, e.comment)) e.sel = !!cacheSel[e.comment];
    else e.sel = !!e.constant;
    if (e.sel) c++;
  });
  ST.wb.entries = old.filter(function (o){ return o.srcKey !== key; }).concat(fresh);
  ST.wb.books = ST.wb.books || [];
  ST.wb.bookOf = ST.wb.bookOf || {}; ST.wb.bookOf[key] = label;
  if (fresh.length && ST.wb.books.indexOf(label) < 0) ST.wb.books.push(label);
  ST.worldSource = (ST.wb.books.length > 1) ? "multi" : (fileName ? "file:" + fileName : (sourceName === "st" ? "st" : "file"));
  ST.catOpen = null; ST.regionOpen = null;
  ST.worldInfo = "";
  worldCacheSave(fileName, key, fresh);
  updateSendText();
  try { renderWorldSide(); } catch (e) { opfErr("renderWorldSide", e); }
  renderMetaStatus();
  return { added: fresh.length, total: ST.wb.entries.length, sel: c, books: ST.wb.books.length };
}
function updateSendText(){
  var s = getSettings();
  var wb = ST.wb || { entries: [] };
  if (!s.includeWorld || !wb.entries || !wb.entries.length) { ST.worldInfo = ""; return; }
  var nl2 = String.fromCharCode(10) + String.fromCharCode(10);
  var parts = []; var total = 0; var cap = s.capChars || 30000;
  for (var i = 0; i < wb.entries.length; i++) {
    var e = wb.entries[i];
    if (!e.sel) continue;
    if (s.worldConstantOnly && !e.constant) continue;
    var head = e.comment || e.key || "";
    var line = (head ? "【" + String(head).slice(0, 60) + "】" : "") + e.content;
    if (total + line.length > cap) { parts.push("……(超过" + cap + "字注入上限，其余未发送)"); break; }
    parts.push(line); total += line.length;
  }
  ST.worldInfo = parts.join(nl2);
  worldCachePersistSel();
}
function clearWorldbook(){
  ST.wb = { entries: [], books: [], loaded: {}, bookOf: {}, source: "none", fileName: null };
  ST.catOpen = null;
  ST.regionOpen = null;
  ST.worldSource = "none";
  ST.worldInfo = "";
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
  var st = document.createElement("style"); st.id = NS + "_css_lside"; st.textContent = LSIDE_CSS + LSIDE_CSS2 + LSIDE_CSS3; document.head.appendChild(st);
  var side = document.createElement("div"); side.id = "opf-lside";
  var head = document.createElement("div"); head.id = "opf-lside-head";
  var t = document.createElement("span"); t.className = "t"; t.textContent = "世界书条目 · 勾选发送";
  var hx = document.createElement("button"); hx.type = "button"; hx.className = "opf-lside-ico"; hx.textContent = "✕"; hx.addEventListener("click", function(){ switchPage("preset"); });
  head.appendChild(t); head.appendChild(hx); side.appendChild(head);
  var tools = document.createElement("div"); tools.id = "opf-lside-tools";
  var bAll = document.createElement("button"); bAll.type = "button"; bAll.className = "opf-step-act"; bAll.textContent = "全选"; bAll.addEventListener("click", function(){ wpkSetAll(true); });
  var bConst = document.createElement("button"); bConst.type = "button"; bConst.className = "opf-step-act"; bConst.textContent = "仅常驻"; bConst.addEventListener("click", wpkSetConst);
  var bNone = document.createElement("button"); bNone.type = "button"; bNone.className = "opf-step-act"; bNone.textContent = "清空勾选"; bNone.addEventListener("click", function(){ wpkSetAll(false); });
  var filt = document.createElement("input"); filt.type = "text"; filt.id = "opf-lside-filter"; filt.placeholder = "筛选条目…"; filt.addEventListener("input", function(){ renderWorldSide(); });
  var catSel = document.createElement("select"); catSel.id = "opf-lside-cat";
  ["全部","命定系统","规则·系统","导览开关","地区·地理","种族","角色","组织·势力","经济·产业","节庆","DLC扩展","DLC事件","DLC内容","其他"].forEach(function (v){ var o = document.createElement("option"); o.value = v; o.textContent = v; catSel.appendChild(o); });
  catSel.addEventListener("change", function(){ renderWorldSide(); });
  tools.appendChild(bAll); tools.appendChild(bConst); tools.appendChild(bNone); tools.appendChild(filt); tools.appendChild(catSel); side.appendChild(tools);
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
var SIZE_CSS = "#opf-root{width:448px;font-size:13px}#opf-title{font-size:14.5px}.opf-sec-label{font-size:11px;letter-spacing:1.5px}#opf-demand{font-size:13px;min-height:50px}.opf-opt{font-size:12px}#opf-meta{font-size:12px}.opf-step-title{font-size:13px}.opf-step-sub{font-size:11px}.opf-step-act{font-size:11px;padding:3px 8px}.opf-btn{font-size:13px;padding:8px 5px}#opf-json-out{font-size:11.5px}.opf-dim{font-size:11.5px}.opf-ref-input{font-size:11.5px}.opf-dir-chip{font-size:12px}.opf-step-body{font-size:12px}#opf-pname{font-size:12px;width:170px}.opf-num{font-size:12px}";
function injectGlobalSizeCSS(){
  try { if (getEl(NS + "_css_size")) return; var st = document.createElement("style"); st.id = NS + "_css_size"; st.textContent = SIZE_CSS; document.head.appendChild(st); } catch (e) { opfErr("injectGlobalSizeCSS", e); }
}
