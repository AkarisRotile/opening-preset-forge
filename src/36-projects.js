//@module 36-projects — 工程列表：①③④ 三条流水线各可保存多份草稿
// ============================================================================
// 解决「一次只能开一个草稿」：想同时弄两个角色、或对照两个开局，原本做不到。
//
// 设计取舍（重要）：
//  · **一个工程 = 一份草稿**，类型（preset/char/destiny）由它所在的列表决定。
//  · 这里只做「快照 ↔ 恢复」的搬运，**完全不碰三条流水线的业务逻辑**——
//    它们的提示词、分段、产出校验一行都没动，仍然各自按 id 独立工作。
//  · 每个类型各有一份列表与一个「当前工程」，切类型不会互相顶掉。
//  · 持久化用 localStorage（单键整体存取），带体积告警但不拦。
// ============================================================================
var LS_PROJ_KEY = NS + "_projects_v1";
var PROJ_MAX = 4.0 * 1024 * 1024;          // 序列化上限（字节），超了只告警
var PROJ_TYPES = ["preset", "char", "destiny"];
var PROJ_TYPE_LABEL = { preset: "开局预设", char: "二创角色", destiny: "命定系统" };

function projState() {
  if (!ST.proj) {
    ST.proj = {};
    PROJ_TYPES.forEach(function (t) { ST.proj[t] = { list: [], active: null }; });
    var saved = lsGet(LS_PROJ_KEY);
    if (saved && typeof saved === "object") {
      PROJ_TYPES.forEach(function (t) {
        var g = saved[t];
        if (g && typeof g === "object") {
          ST.proj[t].list = Array.isArray(g.list) ? g.list : [];
          ST.proj[t].active = typeof g.active === "string" ? g.active : null;
        }
      });
    }
  }
  return ST.proj;
}
function projGroup(type) {
  var s = projState();
  if (!s[type]) s[type] = { list: [], active: null };
  return s[type];
}
function projPersist() {
  try {
    var txt = JSON.stringify(projState());
    if (txt.length > PROJ_MAX) opfLog("工程缓存偏大：" + Math.round(txt.length / 1024) + "KB（localStorage 可能吃紧）");
    lsSet(LS_PROJ_KEY, projState());
  } catch (e) { opfErr("projPersist", e); }
}
function projNewId() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function projVal(id) { var el = getEl(id); return el && typeof el.value === "string" ? el.value : ""; }
function projSetVal(id, v) { var el = getEl(id); if (el) el.value = v == null ? "" : String(v); }
function projClone(o) { try { return JSON.parse(JSON.stringify(o == null ? null : o)); } catch (e) { return null; } }

// ---------------- 快照 / 恢复（只搬状态，不碰逻辑） ----------------
function projSnap(type) {
  if (type === "preset") {
    return {
      results: projClone(ST.results) || {},
      status: projClone(ST.status) || {},
      finalJson: projClone(ST.finalJson),
      finalText: ST.finalText || "",
      demand: projVal("opf-demand"),
      pname: projVal("opf-pname")
    };
  }
  if (type === "char") { try { charInit(); } catch (e) {} return { char: projClone(ST.char) || {} }; }
  if (type === "destiny") { try { destInit(); } catch (e) {} return { dest: projClone(ST.dest) || {} }; }
  return {};
}
function projApply(type, data) {
  data = data || {};
  if (type === "preset") {
    ST.results = projClone(data.results) || {};
    ST.status = projClone(data.status) || {};
    ST.finalJson = projClone(data.finalJson) || null;
    ST.finalText = data.finalText || "";
    ST.msgs = null;                        // 会话上下文不持久化；「重跑该步」会按 ST.results 重建
    projSetVal("opf-demand", data.demand || "");
    projSetVal("opf-pname", data.pname || "【自定义开局】");
    try { renderSteps(); } catch (e) { opfErr("projApply preset renderSteps", e); }
    try { renderJsonOut(ST.finalJson, ST.finalJson ? validatePreset(ST.finalJson) : []); } catch (e) {}
    try { renderMetaStatus(); } catch (e) {}
    return;
  }
  if (type === "char") {
    ST.char = projClone(data.char) || { demand: "", ref: "", segs: {}, status: {}, report: "", out: "", outNote: [], name: "", _inited: false };
    ST.char.outNote = ST.char.outNote || [];
    projSetVal("opf-char-demand", ST.char.demand || "");
    projSetVal("opf-char-ref", ST.char.ref || "");
    try { renderCharSteps(); renderCharPage(); } catch (e) { opfErr("projApply char", e); }
    return;
  }
  if (type === "destiny") {
    ST.dest = projClone(data.dest) || { demand: "", ref: "", author: "", segs: {}, status: {}, report: "", out: "", body: "", meta: "", outNote: [], ejs: false, _inited: false };
    projSetVal("opf-dest-demand", ST.dest.demand || "");
    projSetVal("opf-dest-ref", ST.dest.ref || "");
    projSetVal("opf-dest-author", ST.dest.author || "");
    var ecb = getEl("opf-dest-ejs"); if (ecb) ecb.checked = !!ST.dest.ejs;
    try { renderDestSteps(); renderDestinyPage(); } catch (e) { opfErr("projApply destiny", e); }
    return;
  }
}

// ---------------- 增删改查 ----------------
function projActive(type) {
  var g = projGroup(type);
  for (var i = 0; i < g.list.length; i++) if (g.list[i].id === g.active) return g.list[i];
  return null;
}
function projDefaultName(type) { return (PROJ_TYPE_LABEL[type] || "草稿") + " " + (projGroup(type).list.length + 1); }
function projHasContent(type) {
  if (type === "preset") { var d = projSnap("preset"); return !!(d.results && Object.keys(d.results).length) || !!d.finalJson || !!(d.demand && d.demand.trim()); }
  if (type === "char") return !!(ST.char && ST.char.segs && Object.keys(ST.char.segs).length);
  if (type === "destiny") return !!(ST.dest && ST.dest.segs && Object.keys(ST.dest.segs).length);
  return false;
}
// 把当前运行时状态写回「当前工程」；还没有工程就先建一个
function projCommit(type, opts) {
  type = type || currentPage();
  if (PROJ_TYPES.indexOf(type) < 0) return null;
  var g = projGroup(type);
  var cur = projActive(type);
  if (!cur) {
    cur = { id: projNewId(), name: projDefaultName(type), updatedAt: Date.now(), data: {} };
    g.list.unshift(cur); g.active = cur.id;
  }
  cur.data = projSnap(type);
  if (!opts || opts.touch !== false) cur.updatedAt = Date.now();
  return cur;
}
// 切到某个工程：先把当前工程存档，再恢复目标
function projOpen(type, id) {
  var g = projGroup(type);
  if (g.active && g.active !== id) projCommit(type);
  var p = null;
  for (var i = 0; i < g.list.length; i++) if (g.list[i].id === id) p = g.list[i];
  if (!p) return false;
  g.active = p.id;
  projApply(type, p.data);
  projPersist(); renderProjList();
  try { switchPage(type); } catch (e) {}
  return true;
}
function projCreate(type, name) {
  type = (PROJ_TYPES.indexOf(type) >= 0) ? type : (isCreateType(currentPage()) ? currentPage() : "preset");
  projCommit(type);                        // 先存当前工程，别丢
  var g = projGroup(type);
  var p = { id: projNewId(), name: String(name || "").trim() || projDefaultName(type), updatedAt: Date.now(), data: {} };
  g.list.unshift(p); g.active = p.id;
  projApply(type, {});                     // 空白草稿
  projPersist(); renderProjList();
  try { switchPage(type); } catch (e) {}
  toast("已新建：" + p.name);
  return p;
}
function projDelete(type, id) {
  var g = projGroup(type);
  var idx = -1; for (var i = 0; i < g.list.length; i++) if (g.list[i].id === id) idx = i;
  if (idx < 0) return false;
  var wasActive = g.active === id;
  g.list.splice(idx, 1);
  if (wasActive) {
    g.active = g.list.length ? g.list[0].id : null;
    projApply(type, g.active ? projActive(type).data : {});
  }
  projPersist(); renderProjList();
  return true;
}
function projRename(type, id, name) {
  var g = projGroup(type);
  for (var i = 0; i < g.list.length; i++) {
    if (g.list[i].id === id) {
      var n = String(name == null ? "" : name).trim();
      if (n) { g.list[i].name = n; g.list[i].updatedAt = Date.now(); }
    }
  }
  projPersist(); renderProjList();
}

// ---------------- 侧栏列表 UI ----------------
function projShownType() {
  if (isCreateType(currentPage())) return currentPage();
  var t = getSettings().createType;
  return isCreateType(t) ? t : "preset";
}
function renderProjList() {
  var box = getEl("opf-projlist"); if (!box) return;
  box.textContent = "";
  if (!isCreateType(currentPage())) { box.style.display = "none"; return; }
  box.style.display = "";
  var type = projShownType();
  var g = projGroup(type);
  var head = document.createElement("div"); head.className = "opf-proj-head";
  var lab = document.createElement("span"); lab.textContent = PROJ_TYPE_LABEL[type] + " 草稿";
  var add = document.createElement("button"); add.type = "button"; add.id = "opf-proj-add"; add.className = "opf-proj-add";
  add.textContent = "＋"; add.title = "新建一份" + PROJ_TYPE_LABEL[type] + "草稿";
  add.addEventListener("click", function (ev) { ev.stopPropagation(); projCreate(type); });
  head.appendChild(lab); head.appendChild(add); box.appendChild(head);
  if (!g.list.length) {
    var empty = document.createElement("div"); empty.className = "opf-proj-empty"; empty.textContent = "还没有草稿，点 ＋ 新建";
    box.appendChild(empty); return;
  }
  g.list.forEach(function (p) {
    var row = document.createElement("div");
    row.className = "opf-proj-row" + (p.id === g.active ? " active" : "");
    row.title = p.name + "（双击重命名）";
    var nm = document.createElement("span"); nm.className = "opf-proj-name"; nm.textContent = p.name;
    var del = document.createElement("button"); del.type = "button"; del.className = "opf-proj-del"; del.textContent = "✕"; del.title = "删除这份草稿";
    del.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var yes = true;
      try { yes = window.confirm("删除草稿「" + p.name + "」？不可撤销。"); } catch (e) {}
      if (yes) projDelete(type, p.id);
    });
    row.appendChild(nm); row.appendChild(del);
    row.addEventListener("click", function () { projOpen(type, p.id); });
    row.addEventListener("dblclick", function () {
      var n = null;
      try { n = window.prompt("重命名草稿", p.name); } catch (e) {}
      if (n != null) projRename(type, p.id, n);
    });
    box.appendChild(row);
  });
}

// ---------------- 自动存档 ----------------
// 不往三条流水线里塞钩子（那要动它们的内部），改成低频轮询：
// 每 2.5 秒把「当前类型」的运行时状态与工程里存着的对比，变了才写。
function projTick() {
  try {
    var t = currentPage();
    if (!isCreateType(t)) return;
    var g = projGroup(t);
    var cur = projActive(t);
    if (!cur) { projCommit(t); renderProjList(); projPersist(); return; }
    var snap = projSnap(t);
    if (JSON.stringify(snap) !== JSON.stringify(cur.data || {})) {
      cur.data = snap; cur.updatedAt = Date.now();
      projPersist(); renderProjList();
    }
  } catch (e) { opfErr("projTick", e); }
}
function projAutosaveStart() {
  if (projAutosaveStart._t) return;
  projAutosaveStart._t = setInterval(projTick, 2500);
}
// 首次启用：把三个类型「当前已有的那份草稿」各收成一个工程，不丢东西
function projBootstrap() {
  PROJ_TYPES.forEach(function (t) {
    var g = projGroup(t);
    if (g.list.length) return;
    var had = false;
    try { had = projHasContent(t); } catch (e) {}
    projCommit(t, { touch: false });
    var cur = projActive(t);
    if (cur) cur.name = had ? (PROJ_TYPE_LABEL[t] + " · 现有草稿") : projDefaultName(t);
  });
  projPersist();
}
