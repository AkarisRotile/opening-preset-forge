//@module 40-shell — 分页外壳（PAGE_DEFS/建壳/切页）+ 本地缓存
// ============================================================================
// v1.7.0 全屏分页壳 + 本地缓存 + 二创角色工坊
// ============================================================================
var PAGE_DEFS = [
  { id: "preset", label: "① 开局预设" },
  { id: "world",  label: "② 世界书" },
  { id: "char",   label: "③ 二创角色" },
  { id: "destiny",label: "④ 命定系统" },
  { id: "regex",  label: "⑤ 正则工坊" },
  { id: "shixian",label: "⑥ 与始弦聊天" },
  { id: "refine", label: "⑦ 核心精修" },
  { id: "atelier",label: "⑧ 造物工坊" },
  { id: "settings", label: "⚙ 设置" },
  { id: "p6",     label: "⑩ 更多功能", ph: true }
];
// v1.17.0：导航按**任务**分组，不再是一排扁平数字标签。
// 「② 世界书」是全局参考、「⚙ 设置」是全局配置——它们属于顶部 chrome，不属于这一层。
// world / settings 仍是 PAGE_DEFS 里的页（容器照建），只是不进左侧导航。
//
// v1.17.1：①③④ 三条流水线收进**同一个「分段创作」入口**（虚拟项 id="create"），
// 页内再用类型切换器换页。**三条流水线的提示词/分段/产出校验一行都不动**——
// 它们本来就各自按 id 独立工作，这里只是换了个外壳呈现方式。
var CREATE_TYPES = [
  { id: "preset",  label: "① 开局预设" },
  { id: "char",    label: "③ 二创角色" },
  { id: "destiny", label: "④ 命定系统" }
];
function isCreateType(id) { for (var i = 0; i < CREATE_TYPES.length; i++) if (CREATE_TYPES[i].id === id) return true; return false; }
var NAV_GROUPS = [
  { title: "创作", items: ["create"] },
  { title: "单件", items: ["regex", "refine", "atelier"] },
  { title: "对话", items: ["shixian"] }
];
// 外壳第二层样式（覆盖 SHELL_CSS 里那套横向标签）：左侧竖向分组导航 + 顶部 chrome。
// 单独一份并在 SHELL_CSS 之后注入，避免去动那条几千字符的老 CSS 字符串。
var SHELL_CSS2 = [
  "#opf-shell-body{flex:1;min-height:0;display:flex;align-items:stretch}",
  "#opf-nav{flex:none;width:200px;display:flex;flex-direction:column;gap:2px;padding:10px 8px 16px;overflow-y:auto;overflow-x:hidden;border-right:1px solid rgba(255,122,138,.18);background:rgba(20,3,8,.5);scrollbar-width:thin}",
  ".opf-nav-group{flex:none;font-size:11px;letter-spacing:2px;color:rgba(255,170,180,.5);padding:12px 10px 5px;text-transform:uppercase}",
  "#opf-nav .opf-tab{display:block;width:100%;flex:none;text-align:left;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;border:1px solid transparent;border-radius:8px;background:transparent;color:#ffc9cf;padding:9px 12px!important;cursor:pointer;min-height:0;transition:background .14s ease,color .14s ease}",
  "#opf-nav .opf-tab:hover{background:rgba(255,235,238,.08);color:#fff}",
  "#opf-nav .opf-tab.active{background:linear-gradient(90deg,rgba(255,77,94,.30),rgba(255,77,94,.05));color:#fff;border-color:rgba(255,150,165,.45);box-shadow:inset 3px 0 0 #ff4d5e}",
  ".opf-chrome-btn{flex:none;border:1px solid rgba(255,122,138,.3);background:rgba(255,235,238,.06);color:#ffc9cf;border-radius:8px;padding:7px 11px;font-size:12.5px;cursor:pointer;white-space:nowrap}",
  ".opf-chrome-btn:hover{background:rgba(255,77,94,.22);color:#fff}",
  // 「分段创作」的类型切换子栏（只在创作页显示）
  "#opf-subbar{flex:none;display:flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(30,5,12,.55);border-bottom:1px solid rgba(255,122,138,.16);overflow-x:auto;scrollbar-width:thin}",
  ".opf-subbar-label{flex:none;font-size:11.5px;letter-spacing:2px;color:rgba(255,170,180,.55);text-transform:uppercase;margin-right:4px}",
  ".opf-subtab{flex:none;border:1px solid rgba(255,122,138,.26);background:rgba(255,235,238,.05);color:#ffc9cf;border-radius:999px;padding:6px 13px;font-size:12.5px;cursor:pointer;white-space:nowrap;transition:background .14s ease,color .14s ease}",
  ".opf-subtab:hover{background:rgba(255,77,94,.18);color:#fff}",
  ".opf-subtab.active{background:linear-gradient(180deg,rgba(255,77,94,.32),rgba(255,77,94,.12));color:#fff;border-color:rgba(255,150,165,.6)}",
  // 侧栏工程（草稿）列表
  "#opf-projlist{flex:none;display:flex;flex-direction:column;gap:2px;padding:0 4px 8px 16px}",
  ".opf-proj-head{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;color:rgba(255,170,180,.5);padding:4px 4px 4px 0}",
  ".opf-proj-add{flex:none;border:1px solid rgba(255,122,138,.3);background:rgba(255,235,238,.06);color:#ffc9cf;border-radius:6px;padding:0 7px;font-size:12px;line-height:1.7;cursor:pointer}",
  ".opf-proj-add:hover{background:rgba(255,77,94,.25);color:#fff}",
  ".opf-proj-row{display:flex;align-items:center;gap:4px;border-radius:6px;padding:4px 6px;cursor:pointer;font-size:12.5px;color:rgba(255,226,230,.8)}",
  ".opf-proj-row:hover{background:rgba(255,235,238,.08)}",
  ".opf-proj-row.active{background:rgba(255,77,94,.18);color:#fff;box-shadow:inset 2px 0 0 #ff4d5e}",
  ".opf-proj-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".opf-proj-del{flex:none;border:none;background:transparent;color:rgba(255,160,170,.55);cursor:pointer;font-size:11px;padding:0 3px;border-radius:4px;line-height:1.6}",
  ".opf-proj-del:hover{color:#fff;background:rgba(255,77,94,.3)}",
  ".opf-proj-empty{font-size:11.5px;color:rgba(255,200,208,.45);padding:2px 0 2px 2px}",
  // 分段创作页（①③④）统一模板：左控制 / 右产出。用两类选择器压过 .opf-char-wrap 的单栏定义。
  ".opf-char-wrap.opf-2col{display:grid;grid-template-columns:minmax(300px,380px) minmax(0,1fr);gap:14px 22px;max-width:1680px;align-items:start}",
  ".opf-char-wrap.opf-2col .opf-col{display:flex;flex-direction:column;gap:8px;min-width:0}",
  "@media (max-width:920px){.opf-char-wrap.opf-2col{grid-template-columns:minmax(0,1fr)}}",
  "@media (max-width:860px){#opf-nav{width:140px;padding:8px 6px 12px}.opf-nav-group{font-size:10px;padding:9px 6px 3px}#opf-nav .opf-tab{font-size:12.5px;padding:7px 8px!important}.opf-chrome-btn{padding:6px 8px;font-size:11.5px}}"
].join("");

var SHELL_CSS = "#opf-shell{position:fixed;inset:0;height:100vh;height:100dvh;z-index:2147480002;display:flex;flex-direction:column;color:#fdeef0;font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;letter-spacing:.3px;background:linear-gradient(180deg,#18040b 0%,#0d0206 55%,#0a0105 100%);border:none;transition:opacity .16s ease,transform .16s ease}#opf-shell.opf-shell-hidden{opacity:0;pointer-events:none;transform:translateY(12px)}#opf-shell *{box-sizing:border-box}#opf-shell-head{position:relative;display:flex;align-items:center;gap:10px;padding:8px 12px;flex:none;background:rgba(46,6,14,.6);border-bottom:1px solid rgba(255,122,138,.28)}#opf-shell-head::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#ff4d5e 18%,#ffd9a8 50%,#c8102e 82%,transparent);box-shadow:0 0 12px rgba(255,90,100,.8)}#opf-shell-title{font-size:15px;font-weight:600;color:#ffd9de;text-shadow:0 0 10px rgba(255,77,94,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#opf-shell-close{margin-left:auto;flex:none;border:1px solid rgba(255,122,138,.35);background:rgba(255,77,94,.14);color:#ff8a95;width:40px;height:40px;min-width:40px;border-radius:10px;font-size:16px;cursor:pointer}#opf-shell-close:hover{background:rgba(255,77,94,.3);color:#fff}#opf-nav{display:flex;gap:5px;padding:8px 10px 0;overflow-x:auto;overflow-y:hidden;flex:none;scrollbar-width:thin;scrollbar-color:rgba(255,122,138,.4) transparent}.opf-tab{flex:none;border:1px solid rgba(255,122,138,.26);background:rgba(255,235,238,.05);color:#ffc9cf;border-radius:10px 10px 0 0;padding:9px 13px;font-size:12.5px;line-height:1.2;cursor:pointer;white-space:nowrap;min-height:40px}.opf-tab.active{background:linear-gradient(180deg,rgba(255,77,94,.26),rgba(255,77,94,.07));color:#fff;border-color:rgba(255,150,165,.65);box-shadow:inset 0 2px 0 #ff4d5e}.opf-tab.placeholder{opacity:.6;border-style:dashed}#opf-pages{flex:1;min-height:0;position:relative}.opf-page{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;padding:10px 12px 14px;display:none;scrollbar-width:thin}.opf-page.active{display:block}.opf-page-ph{padding:32px 16px;text-align:center;color:rgba(255,200,208,.55);font-size:13.5px;line-height:2.2;white-space:pre-line}#opf-shell #opf-root{position:static;width:100%;max-width:100%;height:auto;min-height:100%;max-height:none;margin:0;border:none;border-radius:0;box-shadow:none;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}#opf-shell #opf-root.opf-hidden{opacity:1;pointer-events:auto;transform:none}#opf-shell #opf-root::before{display:none}#opf-shell #opf-lside{position:static;transform:none;width:100%;max-width:none;height:100%;top:auto;bottom:auto;left:auto;border:none;border-radius:0;box-shadow:none;background:transparent}#opf-shell #opf-lside.open{transform:none}.opf-char-wrap{display:flex;flex-direction:column;gap:8px;max-width:860px;margin:0 auto}.opf-char-input{width:100%;border-radius:8px;padding:8px 10px;font-size:12.5px;color:#ffeef1;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none;resize:vertical}.opf-char-input:focus{border-color:rgba(255,110,125,.6);box-shadow:0 0 6px rgba(255,77,94,.25)}#opf-char-demand{min-height:56px}#opf-char-ref{min-height:48px;font-size:12px}.opf-char-tools{display:flex;gap:6px;flex-wrap:wrap}.opf-char-tools .opf-btn{flex:1 1 130px;min-height:44px;font-size:13px}.opf-box{display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin:6px 0 0;padding:10px 12px;border:1px solid rgba(255,122,138,.32);border-radius:10px;background:rgba(10,2,5,.62);box-shadow:inset 0 0 14px rgba(255,60,80,.05);color:#ffeef1;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;overflow:auto}.opf-char-report{max-height:300px;min-height:64px}#opf-char-out{max-height:56vh;min-height:140px;font-size:12.5px;scrollbar-width:thin}.opf-char-copyrow{margin-top:6px}#opf-dest-demand{min-height:56px}#opf-dest-ref{min-height:48px;font-size:12px}#opf-dest-out{max-height:56vh;min-height:140px;font-size:12.5px;scrollbar-width:thin}#opf-dest-ejswrap{display:flex;align-items:flex-start;gap:7px;font-size:11.5px;line-height:1.5;color:#ffc9cf;background:rgba(60,140,200,.10);border:1px dashed rgba(120,190,255,.35);border-radius:8px;padding:7px 9px;cursor:pointer}#opf-dest-ejswrap input{width:16px;height:16px;margin:1px 0 0;flex:none;accent-color:#3c8cc8}.opf-rx-preview{max-width:100%;overflow:auto;border:1px dashed rgba(255,122,138,.3);border-radius:8px;padding:6px;margin:4px 0;background:rgba(10,2,5,.5);font-size:12px}#opf-rx-items select.opf-ref-input{flex:0 0 auto;min-width:120px}#opf-rx-core{min-height:90px}.opf-shx-cfg{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:4px 0}.opf-shx-cfg .opf-opt{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#ffc9cf}.opf-shx-cfg .opf-ref-input{min-width:130px}.opf-shx-log{max-height:46vh;min-height:160px;overflow:auto;border:1px solid rgba(255,122,138,.28);border-radius:10px;background:rgba(10,2,5,.55);padding:8px 10px;display:flex;flex-direction:column;gap:8px}.opf-shx-msg{padding:7px 9px;border-radius:9px;font-size:12.5px;line-height:1.7}.opf-shx-msg.me{background:rgba(255,77,94,.10);border:1px solid rgba(255,122,138,.22);align-self:flex-end;max-width:86%}.opf-shx-msg.her{background:rgba(120,190,255,.08);border:1px solid rgba(120,190,255,.25);align-self:flex-start;max-width:92%}.opf-shx-who{font-size:10px;letter-spacing:1px;opacity:.65;margin-bottom:3px}.opf-shx-text{white-space:pre-wrap;word-break:break-word}#opf-shx-input{min-height:56px}.opf-shx-wblist{max-height:220px;overflow:auto;border:1px solid rgba(255,122,138,.2);border-radius:8px;padding:5px 7px;margin-top:5px}@media (max-width:760px){#opf-shell-head{padding:6px 8px}#opf-shell-title{font-size:13px}#opf-shell-close{width:40px;height:40px}.opf-tab{padding:8px 10px;font-size:11.5px;min-height:40px}.opf-page{padding:8px 8px 12px}#opf-shell #opf-root{font-size:13px}.opf-page .opf-btn{min-height:44px}.opf-char-tools .opf-btn{min-height:46px}.opf-wi-row{min-height:40px}.opf-wi-row input{width:18px;height:18px}#opf-lside-tools{gap:6px}#opf-lside-tools .opf-step-act{min-height:40px;font-size:12px}}";

function buildShell(){
  if (getEl("opf-shell")) return;
  try { if (!getEl(NS + "_css_shell")) { var st = document.createElement("style"); st.id = NS + "_css_shell"; st.textContent = SHELL_CSS; document.head.appendChild(st); } } catch (e) { opfErr("shell css", e); }
  try { if (!getEl(NS + "_css_shell2")) { var st2 = document.createElement("style"); st2.id = NS + "_css_shell2"; st2.textContent = SHELL_CSS2; document.head.appendChild(st2); } } catch (e) { opfErr("shell css2", e); }
  var shell = document.createElement("div"); shell.id = "opf-shell"; shell.className = "opf-shell-hidden";

  // ---- 顶部全局 chrome：标题 ·（右）传输状态 · 世界书 · 设置 · 关闭 ----
  var head = document.createElement("div"); head.id = "opf-shell-head";
  var title = document.createElement("div"); title.id = "opf-shell-title"; title.textContent = "✦ 始弦的魔法大典";
  var tx = document.createElement("button"); tx.type = "button"; tx.id = "opf-tx-status"; tx.className = "opf-tx-status opf-tx-st"; tx.textContent = "传输：—";
  tx.addEventListener("click", function () { switchPage("settings"); });
  var wbtn = document.createElement("button"); wbtn.type = "button"; wbtn.id = "opf-chrome-world"; wbtn.className = "opf-chrome-btn"; wbtn.textContent = "▤ 世界书";
  wbtn.title = "打开世界书条目勾选（决定哪些条目发送给 AI；勾选与导入自动缓存）";
  wbtn.addEventListener("click", function () { toggleWorldSide(); });
  var gear = document.createElement("button"); gear.type = "button"; gear.id = "opf-chrome-settings"; gear.className = "opf-chrome-btn"; gear.textContent = "⚙";
  gear.title = "设置：生成传输 / API / 模型";
  gear.addEventListener("click", function () { switchPage("settings"); });
  var close = document.createElement("button"); close.type = "button"; close.id = "opf-shell-close"; close.title = "关闭"; close.textContent = "✕";
  close.addEventListener("click", hidePanel);
  head.appendChild(title); head.appendChild(tx); head.appendChild(wbtn); head.appendChild(gear); head.appendChild(close);
  shell.appendChild(head);

  // ---- 类型切换子栏：只在「分段创作」的三种类型页显示 ----
  var subbar = document.createElement("div"); subbar.id = "opf-subbar"; subbar.style.display = "none";
  var slabel = document.createElement("span"); slabel.className = "opf-subbar-label"; slabel.textContent = "分段创作";
  subbar.appendChild(slabel);
  CREATE_TYPES.forEach(function (ct) {
    var b = document.createElement("button"); b.type = "button"; b.id = "opf-subtab-" + ct.id; b.className = "opf-subtab";
    b.textContent = ct.label; b.title = "切到" + ct.label;
    b.addEventListener("click", function () { switchPage(ct.id); });
    subbar.appendChild(b);
  });
  shell.appendChild(subbar);

  // ---- 主体：左侧分组导航 + 右侧内容区 ----
  var bodyWrap = document.createElement("div"); bodyWrap.id = "opf-shell-body";
  var nav = document.createElement("nav"); nav.id = "opf-nav";
  var byId = {}; PAGE_DEFS.forEach(function (p) { byId[p.id] = p; });
  NAV_GROUPS.forEach(function (g) {
    var gt = document.createElement("div"); gt.className = "opf-nav-group"; gt.textContent = g.title; nav.appendChild(gt);
    g.items.forEach(function (id) {
      var p = byId[id];
      // "create" 是虚拟项（不在 PAGE_DEFS 里）：代表 ①③④ 三种类型共用的入口
      var label = p ? p.label : (id === "create" ? "分段创作" : id);
      var t = document.createElement("button"); t.type = "button"; t.id = "opf-tab-" + id; t.className = "opf-tab";
      t.textContent = label; t.title = p ? label : (label + "（开局预设 / 二创角色 / 命定系统）");
      t.addEventListener("click", function () { switchPage(id); });
      nav.appendChild(t);
      // 「分段创作」下面挂工程（草稿）列表：一个类型一份列表
      if (id === "create") { var pl = document.createElement("div"); pl.id = "opf-projlist"; nav.appendChild(pl); }
    });
  });
  bodyWrap.appendChild(nav);

  var pages = document.createElement("div"); pages.id = "opf-pages";
  PAGE_DEFS.forEach(function (p) {
    var d = document.createElement("div"); d.id = "opf-page-" + p.id; d.className = "opf-page";
    if (p.id === "preset") {
      var root = document.createElement("div"); root.id = "opf-root"; root.className = ""; root.style.display = "flex"; root.innerHTML = OPF_HTML;
      d.appendChild(root);
    } else if (p.id === "char") {
      d.innerHTML = CHAR_HTML;
    } else if (p.id === "destiny") {
      d.innerHTML = DEST_HTML;
    } else if (p.id === "regex") {
      d.innerHTML = RX_HTML;
    } else if (p.id === "shixian") {
      d.innerHTML = SHX_HTML;
    } else if (p.id === "refine") {
      d.innerHTML = REFINE_HTML;
    } else if (p.id === "atelier") {
      d.innerHTML = ATL_HTML;
    } else if (p.id === "settings") {
      d.innerHTML = SETTINGS_HTML;
    } else if (p.id === "world") {
      /* 世界书侧栏由 buildWorldSide 挂载到本页 */
    } else {
      var hint = document.createElement("div"); hint.className = "opf-page-ph";
      hint.textContent = "（占位页）\n" + p.label + "\n\n此页留给后续功能，敬请期待。";
      d.appendChild(hint);
    }
    pages.appendChild(d);
  });
  bodyWrap.appendChild(pages);
  shell.appendChild(bodyWrap);

  document.body.appendChild(shell);
  launcher();
  var root = getEl("opf-root");
  bindPanel(root);
  renderSteps(); syncFromSettings(); addWorkflowUI(root);
  try { buildWorldSideButton(root); } catch (e) { opfErr("side button", e); }
  try { addComplianceToggle(root); } catch (e) { opfErr("compliance toggle", e); }
  try { addMemoUI(root); } catch (e) { opfErr("memo ui", e); }
  try { bindCharPage(); } catch (e) { opfErr("char page", e); }
  try { bindDestinyPage(); } catch (e) { opfErr("destiny page", e); }
  try { bindRxPage(); } catch (e) { opfErr("regex page", e); }
  try { bindSettingsExtra(); } catch (e) { opfErr("settings extra", e); }
  try { bindShxPage(); } catch (e) { opfErr("shixian page", e); }
  try { bindRefinePage(); } catch (e) { opfErr("refine page", e); }
  try { bindAtelierPage(); } catch (e) { opfErr("atelier page", e); }
  try { buildWorldSide(); } catch (e) { opfErr("buildWorldSide", e); }
  if (getSettings().visible) showPanel();
}
function switchPage(id, force){
  var s = getSettings();
  // "create" 是虚拟入口：落到上次用的那种创作类型上
  if (id === "create") id = isCreateType(s.createType) ? s.createType : "preset";
  if (!force && s.activePage === id) return;
  s.activePage = id;
  if (isCreateType(id)) s.createType = id;   // 记住类型，下次进「分段创作」直接回到它
  saveSettings();
  var pages = getEl("opf-pages"); if (!pages) return;
  [].forEach.call(pages.children, function (d) { d.classList.toggle("active", d.id === "opf-page-" + id); });
  // 左侧导航高亮：虚拟项 create 在任一创作类型页都保持高亮
  var nav = getEl("opf-nav");
  if (nav) [].forEach.call(nav.children, function (t) {
    var tid = String(t.id || "").replace(/^opf-tab-/, "");
    t.classList.toggle("active", (t.id === "opf-tab-" + id) || (tid === "create" && isCreateType(id)));
  });
  // 类型切换子栏：只在创作页显示，并标出当前类型
  var sb = getEl("opf-subbar");
  if (sb) {
    sb.style.display = isCreateType(id) ? "" : "none";
    CREATE_TYPES.forEach(function (ct) {
      var b = getEl("opf-subtab-" + ct.id);
      if (b) b.classList.toggle("active", ct.id === id);
    });
  }
  try { renderProjList(); } catch (e) { opfErr("renderProjList", e); }
  if (id === "world") { try { buildWorldSide(); renderWorldSide(); } catch (e) {} }
  if (id === "char") { try { renderCharPage(); } catch (e) {} }
  if (id === "destiny") { try { renderDestinyPage(); } catch (e) {} }
  if (id === "regex") { try { rxRenderItems(); } catch (e) {} }
  if (id === "shixian") { try { renderShxWb(); renderShxMsgs(); shxRenderMem(); } catch (e) {} }
  if (id === "atelier") { try { atlRender(); } catch (e) {} }
}
function currentPage(){ return getSettings().activePage || "preset"; }

// ---------------- 本地缓存（localStorage，跨会话保留） ----------------
var LS_WORLD_KEY = NS + "_worldcache_v1";
var LS_CHAR_KEY = NS + "_chardraft_v1";
var WORLD_CACHE_MAX = 4.5 * 1024 * 1024; // 缓存 JSON 序列化上限（字节）
function lsGet(k){ try { if (typeof localStorage !== "undefined") { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } } catch (e) {} return null; }
function lsSet(k, v){ try { if (typeof localStorage !== "undefined") { localStorage.setItem(k, JSON.stringify(v)); return true; } } catch (e) { opfErr("lsSet", k, e); return false; } }
function worldCacheGet(){ var c = lsGet(LS_WORLD_KEY); if (!c || typeof c !== "object") c = { books: {} }; if (!c.books || typeof c.books !== "object") c.books = {}; return c; }
function worldCacheGetSel(fileName, srcKey){
  var c = worldCacheGet(); var b = null;
  if (fileName && c.books[fileName]) b = c.books[fileName];
  if (!b) { for (var k in c.books) { if (c.books[k] && c.books[k].srcKey === srcKey) { b = c.books[k]; break; } } }
  if (!b || !Array.isArray(b.sel)) return null;
  var m = {}; b.sel.forEach(function (cm) { m[cm] = true; });
  return m;
}
function worldCacheSave(fileName, srcKey, fresh){
  if (!fileName && srcKey.indexOf("file:") !== 0) return; // 只缓存文件导入的书（酒馆激活书随会话变化）
  var bKey = fileName || srcKey.replace(/^file:/, "");
  var c = worldCacheGet();
  var entries = fresh.map(function (e) { return { uid: e.uid, comment: e.comment, key: e.key, constant: e.constant, content: e.content }; });
  var sel = fresh.filter(function (e) { return e.sel; }).map(function (e) { return e.comment; });
  c.books[bKey] = { srcKey: srcKey, name: fileName || bKey, entries: entries, sel: sel, savedAt: Date.now() };
  var txt = JSON.stringify(c);
  if (txt.length > WORLD_CACHE_MAX) {
    for (var k in c.books) {
      var b = c.books[k];
      b.entries.forEach(function (en) { if (b.sel.indexOf(en.comment) < 0) { en.content = ""; en.trimmed = true; } });
    }
    txt = JSON.stringify(c);
    if (txt.length > WORLD_CACHE_MAX) {
      var keys = Object.keys(c.books).sort(function (x, y) { return (c.books[x].savedAt || 0) - (c.books[y].savedAt || 0); });
      while (keys.length && JSON.stringify(c).length > WORLD_CACHE_MAX) { delete c.books[keys.shift()]; }
    }
    toast("世界书缓存过大：已精简未勾选条目内容（勾选条目完整保留，可重新导入文件刷新）", "warning");
  }
  lsSet(LS_WORLD_KEY, c);
}
function worldCachePersistSel(){
  if (worldCachePersistSel._t) clearTimeout(worldCachePersistSel._t);
  worldCachePersistSel._t = setTimeout(function () {
    var c = worldCacheGet(); var wb = ST.wb || { entries: [] };
    var touched = {};
    wb.entries.forEach(function (e) {
      var bKey = e.srcKey && e.srcKey.indexOf("file:") === 0 ? e.srcKey.replace(/^file:/, "") : null;
      if (!bKey || !c.books[bKey] || touched[bKey]) return;
      touched[bKey] = true;
      c.books[bKey].sel = wb.entries.filter(function (x) { return x.srcKey === e.srcKey && x.sel; }).map(function (x) { return x.comment; });
    });
    lsSet(LS_WORLD_KEY, c);
  }, 400);
}
function worldCacheClearSel(){
  var c = worldCacheGet();
  for (var k in c.books) c.books[k].sel = [];
  lsSet(LS_WORLD_KEY, c);
}
function worldCacheRestore(){
  var c = lsGet(LS_WORLD_KEY); if (!c || !c.books) return;
  var keys = Object.keys(c.books);
  if (!keys.length) return;
  var restored = 0;
  keys.forEach(function (k) {
    var b = c.books[k];
    if (!b || !Array.isArray(b.entries) || !b.entries.length) return;
    var srcKey = b.srcKey || ("file:" + b.name);
    var selMap = {}; (b.sel || []).forEach(function (cm) { selMap[cm] = true; });
    var raw = b.entries.map(function (en) { return { uid: en.uid, comment: en.comment, key: en.key, constant: en.constant, content: en.content || "" }; });
    var fresh = raw.map(function (en, i) {
      var keyStr = Array.isArray(en.key) ? en.key.join(" / ") : (typeof en.key === "string" ? en.key : "");
      var cv = wpkCategory({ comment: en.comment, key: en.key });
      return { id: srcKey + ":" + (en.uid != null ? "u" + en.uid : "i" + i), srcKey: srcKey, comment: en.comment || "", key: keyStr, content: en.content || "", constant: !!en.constant, sel: !!selMap[en.comment], cat: cv, region: (cv === "地区·地理" ? wpkRegion(en.comment || "") : ""), trimmed: !!en.trimmed };
    });
    var selN = 0; fresh.forEach(function (e) { if (e.sel && e.content) selN++; });
    ST.wb = ST.wb || { entries: [], books: [], loaded: {}, bookOf: {} };
    var old = ST.wb.entries || [];
    ST.wb.entries = old.filter(function (o) { return o.srcKey !== srcKey; }).concat(fresh);
    ST.wb.books = ST.wb.books || [];
    ST.wb.bookOf = ST.wb.bookOf || {}; ST.wb.bookOf[srcKey] = b.name ? String(b.name).replace(/\.json$/i, "") : k;
    var label = ST.wb.bookOf[srcKey];
    if (ST.wb.books.indexOf(label) < 0) ST.wb.books.push(label);
    restored++;
  });
  if (restored) {
    var wkeys = Object.keys(ST.wb.bookOf || {});
    ST.worldSource = ST.wb.books.length > 1 ? "multi" : (wkeys.length ? "file:" + wkeys[0] : "file");
    ST.catOpen = null; ST.regionOpen = null;
    updateSendText();
    try { renderWorldSide(); } catch (e) {}
    renderMetaStatus();
    opfLog("世界书缓存已恢复", restored, "本");
    toast("已从本地缓存恢复 " + restored + " 本世界书及上次勾选（重新导入同名文件会刷新内容并保留勾选）");
  }
}
