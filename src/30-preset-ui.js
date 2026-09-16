//@module 30-preset-ui — ① 开局预设：页面 UI + 分步管线 + 每步精修 + 重新汇总
var OPF_CSS = "#opf-root,#opf-launcher{box-sizing:border-box;font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;letter-spacing:.3px}#opf-root *,#opf-launcher *{box-sizing:border-box}#opf-launcher{position:fixed;right:6px;top:42%;z-index:2147480001;width:38px;height:38px;border-radius:12px 6px 6px 12px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#ffd9de;background:linear-gradient(160deg,rgba(74,10,20,.92),rgba(24,3,8,.88));border:1px solid rgba(255,106,122,.28);box-shadow:0 0 6px rgba(255,77,94,.55),0 0 18px rgba(200,16,46,.35);font-size:18px;transition:transform .18s ease,box-shadow .18s ease;user-select:none}#opf-launcher:hover{transform:scale(1.08);box-shadow:0 0 6px rgba(255,77,94,.55),0 0 18px rgba(200,16,46,.35),0 0 24px rgba(255,77,94,.5)}#opf-launcher .opf-la-dot{position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#39d353;border:1px solid rgba(0,0,0,.5);display:none}#opf-launcher.running .opf-la-dot{display:block;animation:opfPulse 1s infinite}@keyframes opfPulse{0%,100%{opacity:1}50%{opacity:.25}}#opf-root{position:fixed;z-index:2147480000;width:392px;max-width:calc(100vw - 18px);max-height:min(760px,92vh);display:flex;flex-direction:column;border-radius:14px;color:#fdeef0;overflow:hidden;background:linear-gradient(180deg,rgba(46,6,14,.92) 0%,rgba(30,4,10,.90) 45%,rgba(16,2,6,.94) 100%);border:1px solid rgba(255,122,138,.34);box-shadow:0 0 0 1px rgba(0,0,0,.35),0 10px 34px rgba(0,0,0,.55),inset 0 0 42px rgba(255,60,80,.05),0 0 22px rgba(255,77,94,.22);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);transition:opacity .16s ease,transform .16s ease}#opf-root::before{content:'';position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,transparent,#ff4d5e 18%,#ffd9a8 50%,#c8102e 82%,transparent);box-shadow:0 0 12px rgba(255,90,100,.8);opacity:.9}#opf-root.opf-hidden{opacity:0;pointer-events:none;transform:translateY(6px) scale(.98)}#opf-head{display:flex;align-items:center;gap:6px;padding:8px 10px 7px 12px;cursor:move;user-select:none;background:linear-gradient(90deg,rgba(255,200,210,.10),rgba(200,16,46,.06) 55%,rgba(255,200,210,.04));border-bottom:1px solid rgba(255,122,138,.18)}#opf-title{font-weight:700;font-size:13px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ffd9de;text-shadow:0 0 8px rgba(255,77,94,.65)}#opf-title .s{color:#ffb7be;font-size:11px;font-weight:500;margin-left:6px}.opf-ico-btn{border:1px solid transparent;background:rgba(255,255,255,.04);color:#ff8a95;border-radius:7px;cursor:pointer;width:24px;height:22px;font-size:12px;line-height:1;transition:all .14s ease}.opf-ico-btn:hover{background:rgba(255,77,94,.18);color:#fff;border-color:rgba(255,106,122,.28);box-shadow:0 0 4px rgba(255,77,94,.35),0 0 12px rgba(200,16,46,.22)}#opf-body{overflow-y:auto;display:flex;flex-direction:column;min-height:0}#opf-meta{display:flex;flex-wrap:wrap;gap:4px 8px;padding:6px 12px;font-size:11px;color:rgba(255,230,234,.72);background:rgba(255,255,255,.02);border-bottom:1px dashed rgba(255,122,138,.16)}#opf-meta .tag{padding:1px 6px;border-radius:20px;font-size:10px;background:rgba(255,77,94,.12);border:1px solid rgba(255,122,138,.25);color:#ffc9ce}#opf-meta .tag.ok{color:#a5f0c0;border-color:rgba(120,255,170,.35);background:rgba(60,160,90,.14)}#opf-meta .tag.err{color:#ffd0a3;border-color:rgba(255,170,90,.4);background:rgba(200,110,40,.14)}.opf-sec{padding:8px 12px 6px}.opf-sec-label{font-size:10px;letter-spacing:2px;color:rgba(255,170,180,.62);margin-bottom:6px;text-transform:uppercase;display:flex;align-items:center;gap:6px}.opf-sec-label::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(255,120,135,.35),transparent)}#opf-demand{width:100%;resize:vertical;min-height:44px;max-height:120px;border-radius:9px;padding:7px 9px;color:#ffeef1;font-size:12px;line-height:1.5;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none;transition:border-color .15s ease,box-shadow .15s ease}#opf-demand:focus{border-color:rgba(255,110,125,.6);box-shadow:0 0 10px rgba(255,77,94,.25)}#opf-demand::placeholder{color:rgba(255,210,216,.35)}.opf-opts{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:4px 12px 6px}.opf-opt{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,226,230,.78);cursor:pointer}.opf-opt input{accent-color:#ff4d5e;cursor:pointer}.opf-num{width:54px;background:rgba(10,2,5,.55);color:#ffeef1;border:1px solid rgba(255,122,138,.25);border-radius:6px;padding:2px 5px;font-size:11px}#opf-pname{width:150px;background:rgba(10,2,5,.55);color:#ffeef1;border:1px solid rgba(255,122,138,.25);border-radius:6px;padding:2px 6px;font-size:11px}.opf-steps{padding:2px 12px 6px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;max-height:290px}.opf-step{border-radius:10px;border:1px solid rgba(255,122,138,.18);background:rgba(255,235,238,.035);transition:background .15s ease,border-color .15s ease,box-shadow .15s ease}.opf-step[data-st=run]{background:rgba(255,90,105,.10);border-color:rgba(255,120,135,.5);box-shadow:0 0 4px rgba(255,77,94,.35),0 0 12px rgba(200,16,46,.22)}.opf-step[data-st=ok]{background:rgba(120,230,160,.05);border-color:rgba(140,255,180,.25)}.opf-step[data-st=err]{border-color:rgba(255,150,90,.55)}.opf-step-head{display:flex;align-items:center;gap:7px;padding:6px 8px;cursor:pointer}.opf-idx{width:17px;height:17px;border-radius:6px 2px 6px 2px;flex:none;font-size:10px;font-weight:700;color:#ffd7dc;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(140deg,rgba(200,16,46,.55),rgba(80,10,22,.65));border:1px solid rgba(255,120,135,.35);box-shadow:0 0 6px rgba(255,77,94,.25)}.opf-dot{width:14px;font-size:11px;text-align:center;color:#8e6670;flex:none}.opf-step[data-st=run] .opf-dot{color:#ff8a95;animation:opfPulse 1s infinite}.opf-step[data-st=ok] .opf-dot{color:#7fe6a0}.opf-step[data-st=err] .opf-dot{color:#ffb066}.opf-step-title{flex:1;font-size:12px;color:#ffe9ec}.opf-step-sub{font-size:10px;color:rgba(255,200,208,.45)}.opf-step-act{border:none;background:rgba(255,255,255,.05);color:#ffc0c8;cursor:pointer;border-radius:6px;padding:2px 7px;font-size:10px;transition:all .14s ease}.opf-step-act:hover{background:rgba(255,77,94,.2);color:#fff;box-shadow:0 0 4px rgba(255,77,94,.35),0 0 12px rgba(200,16,46,.22)}.opf-step-body{display:none;padding:4px 9px 8px 30px;font-size:11px;line-height:1.55;color:rgba(255,226,230,.82)}.opf-step.open .opf-step-body{display:block}.opf-step-body pre{white-space:pre-wrap;word-break:break-word;margin:0;font-family:inherit}.opf-out{padding:2px 12px 8px}#opf-json-out{max-height:170px;overflow:auto;margin:0;padding:8px 10px;border-radius:9px;font-size:10.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:#ffd9de;background:rgba(8,1,4,.72);border:1px solid rgba(255,122,138,.22);box-shadow:inset 0 0 24px rgba(255,60,80,.05)}#opf-actions{display:flex;gap:6px;padding:8px 12px 10px;background:linear-gradient(0deg,rgba(200,16,46,.10),rgba(200,16,46,.02));border-top:1px solid rgba(255,122,138,.18)}.opf-btn{flex:1;cursor:pointer;border-radius:8px;border:1px solid transparent;font-size:12px;padding:7px 4px;color:#fff;letter-spacing:1px;transition:all .15s ease}.opf-btn:hover{filter:brightness(1.12)}.opf-btn:disabled{opacity:.45;cursor:not-allowed;filter:none}.opf-btn.primary{background:linear-gradient(135deg,rgba(255,110,120,.92),rgba(190,16,42,.96));border-color:rgba(255,180,190,.5);box-shadow:0 0 6px rgba(255,77,94,.55),0 0 18px rgba(200,16,46,.35);text-shadow:0 0 6px rgba(255,255,255,.4)}.opf-btn.ghost{background:rgba(255,235,238,.06);border-color:rgba(255,122,138,.25);color:#ffd5da}.opf-btn.ghost:hover{background:rgba(255,90,105,.14)}@media (max-width:640px){#opf-root{width:calc(100vw - 14px);left:7px !important;right:auto !important}}";
var OPF_HTML = "<div id=\"opf-head\"><div id=\"opf-title\">✦ 始弦的魔法大典<span class=\"s\">destiny preset forge</span></div><button class=\"opf-ico-btn\" id=\"opf-btn-mini\" title=\"最小化\">─</button><button class=\"opf-ico-btn\" id=\"opf-btn-close\" title=\"关闭\">✕</button></div><div id=\"opf-body\"><div id=\"opf-meta\"></div><div class=\"opf-sec\"><div class=\"opf-sec-label\">开局需求</div><textarea id=\"opf-demand\" placeholder=\"例如：给一位从迷雾森林走出、想在瓦伦蒂亚城谋生的流浪剑士配齐开局（1级、偏好近战、带一只契约伙伴……）\"></textarea></div><div class=\"opf-opts\"><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-card\"> 带角色卡</label><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-world\"> 带世界书</label><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-const\"> 仅常驻</label><label class=\"opf-opt\">注入上限<input type=\"number\" id=\"opf-cap\" class=\"opf-num\" min=\"2000\" max=\"200000\" step=\"1000\"></label><label class=\"opf-opt\">名称<input id=\"opf-pname\" value=\"【自定义开局】\" title=\"开局预设名称（导出 name 字段与文件名）\"></label></div><div class=\"opf-opts\"><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-quick\"> 快出模式(单次)</label><label class=\"opf-opt\"><input type=\"checkbox\" id=\"opf-ck-meta\"> 导出含文件元数据</label><button class=\"opf-step-act\" id=\"opf-wload\" type=\"button\">导入世界书文件</button><button class=\"opf-step-act\" id=\"opf-wclear\" type=\"button\">清世界书</button></div><div class=\"opf-sec\"><div class=\"opf-sec-label\">创作步骤</div><div class=\"opf-steps\" id=\"opf-steps\"></div></div><div class=\"opf-out\"><div class=\"opf-sec-label\">预设 JSON</div><pre id=\"opf-json-out\">尚未生成</pre></div></div><div id=\"opf-actions\"><button class=\"opf-btn primary\" id=\"opf-btn-run\">▶ 生成初稿</button><button class=\"opf-btn ghost\" id=\"opf-btn-quick\">⚡ 快速初稿</button><button class=\"opf-btn ghost\" id=\"opf-btn-save\">⬇ 导出 .preset.json</button><button class=\"opf-btn ghost\" id=\"opf-btn-copy\">⧉ 复制</button></div>";

function injectStyle(){ if (getEl(NS + "_css")) return; var st = document.createElement("style"); st.id = NS + "_css"; st.textContent = OPF_CSS; document.head.appendChild(st); var st2 = document.createElement("style"); st2.id = NS + "_css_extra"; st2.textContent = EXTRA_CSS; document.head.appendChild(st2); }
function launcher(){
  if (!getEl("opf-launcher")) {
    var b = document.createElement("div");
    b.id = "opf-launcher";
    b.title = EXT_TITLE;
    b.addEventListener("click", function (e) {
      if (b._suppressClick) { b._suppressClick = false; return; }  // 拖动刚结束，吞掉这次误触
      togglePanel();
    });
    var dot = document.createElement("span");
    dot.className = "opf-la-dot";
    b.appendChild(document.createTextNode("✦"));
    b.appendChild(dot);
    document.body.appendChild(b);
    try {
      if (!getEl("opf_launcher_drag_css")) {
        var st = document.createElement("style");
        st.id = "opf_launcher_drag_css";
        st.textContent = "#opf-launcher{touch-action:none;cursor:grab;-webkit-user-drag:none;user-drag:none}#opf-launcher.dragging{cursor:grabbing;transform:none!important}";
        document.head.appendChild(st);
      }
    } catch (err) { opfErr("launcher drag css", err); }
    try { makeLauncherDraggable(b); } catch (err) { opfErr("launcher draggable", err); }
  }
  return getEl("opf-launcher");
}
// 让侧边 ✦ 悬浮入口可拖动（拖动后记住位置；纯点击仍用于开关面板）
function makeLauncherDraggable(b){
  if (!b) return;
  var s = getSettings();
  if (typeof s.lx === "number" && typeof s.ly === "number") {
    var vw0 = window.innerWidth || 800, vh0 = window.innerHeight || 600;
    b.style.right = "auto";
    b.style.left = clamp(s.lx, 0, Math.max(0, vw0 - (b.offsetWidth || 38))) + "px";
    b.style.top = clamp(s.ly, 0, Math.max(0, vh0 - (b.offsetHeight || 38))) + "px";
  }
  var sx = 0, sy = 0, ox = 0, oy = 0, drag = false, moved = false;
  b.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    drag = true; moved = false;
    sx = e.clientX; sy = e.clientY;
    var r = b.getBoundingClientRect();
    ox = r.left; oy = r.top;
    b.style.right = "auto";               // 从 right 定位切到 left 定位
    b.style.left = Math.round(r.left) + "px";
    b.style.top = Math.round(r.top) + "px";
    b.classList.add("dragging");
    if (b.setPointerCapture) { try { b.setPointerCapture(e.pointerId); } catch (err) {} }
  });
  b.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    var vw = window.innerWidth || 800, vh = window.innerHeight || 600;
    var w = b.offsetWidth || 38, h = b.offsetHeight || 38;
    b.style.left = clamp(ox + dx, 0, Math.max(0, vw - w)) + "px";
    b.style.top = clamp(oy + dy, 0, Math.max(0, vh - h)) + "px";
  });
  function endDrag() {
    if (!drag) return;
    drag = false;
    b.classList.remove("dragging");
    var r = b.getBoundingClientRect();
    s.lx = Math.round(r.left);
    s.ly = Math.round(r.top);
    saveSettings();
    if (moved) {
      b._suppressClick = true;            // 拖动后紧随的 click 应被吞掉
      setTimeout(function () { b._suppressClick = false; }, 400);
    }
  }
  b.addEventListener("pointerup", endDrag);
  b.addEventListener("pointercancel", endDrag);
  function clampLauncherOnResize() {
    if (!b.style.left || b.style.left === "auto") return;
    var vw = window.innerWidth || 800, vh = window.innerHeight || 600;
    var w = b.offsetWidth || 38, h = b.offsetHeight || 38;
    b.style.left = clamp(parseFloat(b.style.left) || 0, 0, Math.max(0, vw - w)) + "px";
    b.style.top = clamp(parseFloat(b.style.top) || 0, 0, Math.max(0, vh - h)) + "px";
  }
  window.addEventListener("resize", clampLauncherOnResize);
}
function showPanel(){ var shell = getEl("opf-shell"); var s = getSettings(); if (!shell) return; shell.classList.remove("opf-shell-hidden"); document.body.classList.add("opf-shell-open"); launcher().style.display = "none"; s.visible = true; saveSettings(); switchPage(s.activePage || "preset", true); }
function hidePanel(){ var shell = getEl("opf-shell"); var s = getSettings(); if (!shell) return; shell.classList.add("opf-shell-hidden"); document.body.classList.remove("opf-shell-open"); launcher().style.display = "flex"; s.visible = false; saveSettings(); }
function togglePanel(){ var s = getSettings(); if (s.visible) hidePanel(); else showPanel(); }
function placePanelInView(){ /* 全屏壳：无需定位，保留空实现兼容旧调用 */ }
function keepPanelInView(){ /* 全屏壳：无需视口修正 */ }

function buildPanel(){ if (getEl("opf-shell")) return; buildShell(); }

function bindPanel(root){
  root.querySelector("#opf-btn-close").addEventListener("click", hidePanel);
  root.querySelector("#opf-btn-mini").addEventListener("click", hidePanel);
  root.querySelector("#opf-btn-run").addEventListener("click", function(){ runFlow(false); });
  root.querySelector("#opf-btn-quick").addEventListener("click", function(){ runFlow(true); });
  root.querySelector("#opf-btn-save").addEventListener("click", downloadPreset);
  root.querySelector("#opf-btn-copy").addEventListener("click", copyPreset);
  root.querySelector("#opf-ck-card").addEventListener("change", syncFromControl);
  root.querySelector("#opf-ck-world").addEventListener("change", syncFromControl);
  root.querySelector("#opf-ck-const").addEventListener("change", syncFromControl);
  root.querySelector("#opf-ck-quick").addEventListener("change", syncFromControl);
  root.querySelector("#opf-ck-meta").addEventListener("change", syncFromControl);
  root.querySelector("#opf-cap").addEventListener("change", syncFromControl);
  root.querySelector("#opf-pname").addEventListener("change", syncFromControl);
  var fi = document.createElement("input"); fi.type = "file"; fi.accept = ".json,application/json"; ST.fileInput = fi;
  fi.addEventListener("change", function(){ var f = fi.files && fi.files[0]; if (!f) return; loadWorldFromFile(f).then(function(res){ applyWorldResult(res); renderMetaStatus(); toast("世界书已从文件载入：" + (res.fileName || "")); try { switchPage("world"); } catch (e) {} }).catch(function(e){ toast("世界书文件解析失败：" + (e && e.message ? e.message : e), "error"); }); fi.value = ""; });
  root.querySelector("#opf-wload").addEventListener("click", function(){ fi.click(); });
  root.querySelector("#opf-wclear").addEventListener("click", function(){ clearWorldbook(); });
  makeDraggable(root.querySelector("#opf-head"), root);
  window.addEventListener("resize", keepPanelInView);
}

function syncFromControl(){
  var s = getSettings();
  s.includeCard = getEl("opf-ck-card").checked;
  s.includeWorld = getEl("opf-ck-world").checked;
  s.worldConstantOnly = getEl("opf-ck-const").checked;
  s.quickMode = getEl("opf-ck-quick").checked;
  s.metaMode = getEl("opf-ck-meta").checked ? "full" : "core";
  var cap = parseInt(getEl("opf-cap").value, 10);
  s.capChars = isNaN(cap) ? 30000 : clamp(cap, 2000, 200000);
  s.lastName = getEl("opf-pname").value;
  saveSettings(); renderMetaStatus();
}
function syncFromSettings(){
  var s = getSettings();
  getEl("opf-ck-card").checked = !!s.includeCard;
  getEl("opf-ck-world").checked = !!s.includeWorld;
  getEl("opf-ck-const").checked = !!s.worldConstantOnly;
  getEl("opf-ck-quick").checked = !!s.quickMode;
  getEl("opf-ck-meta").checked = s.metaMode !== "core";
  getEl("opf-cap").value = s.capChars;
  if (s.lastName) getEl("opf-pname").value = s.lastName;
  renderMetaStatus();
}

function makeDraggable(handle, root){
  var s = getSettings();
  var sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
  handle.addEventListener("pointerdown", function(e){ if (e.target.closest && e.target.closest("button")) return; drag = true; sx = e.clientX; sy = e.clientY; var r = root.getBoundingClientRect(); ox = r.left; oy = r.top; if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId); if (e.preventDefault) e.preventDefault(); });
  handle.addEventListener("pointermove", function(e){ if (!drag) return; var nx = clamp(ox + e.clientX - sx, 0, Math.max(0, window.innerWidth - 120)); var ny = clamp(oy + e.clientY - sy, 0, Math.max(0, window.innerHeight - 60)); root.style.left = nx + "px"; root.style.top = ny + "px"; });
  function endDrag(){ if (!drag) return; drag = false; var r = root.getBoundingClientRect(); s.x = Math.round(r.left); s.y = Math.round(r.top); saveSettings(); }
  handle.addEventListener("pointerup", endDrag); handle.addEventListener("pointercancel", endDrag);
}

function renderSteps(){
  var box = getEl("opf-steps"); if (!box) return; box.textContent = "";
  PHASES.forEach(function (p, i) {
    var row = document.createElement("div"); row.className = "opf-step"; row.setAttribute("data-st", "wait"); row.id = "opf-ph-" + p.id;
    var head = document.createElement("div"); head.className = "opf-step-head";
    var idx = document.createElement("span"); idx.className = "opf-idx"; idx.textContent = String(i + 1);
    var dot = document.createElement("span"); dot.className = "opf-dot"; dot.textContent = "·";
    var ttl = document.createElement("span"); ttl.className = "opf-step-title"; ttl.textContent = p.title;
    var sub = document.createElement("span"); sub.className = "opf-step-sub"; sub.textContent = p.short;
    var btn = document.createElement("button"); btn.className = "opf-step-act"; btn.type = "button";
    btn.textContent = p.key === "final" ? "重汇总" : "重跑该步及后续";
    btn.title = p.key === "final" ? "基于各步当前内容重新生成汇总 JSON" : "从本步重跑到最后（覆盖后续修改）";
    btn.addEventListener("click", function (ev) { ev.stopPropagation(); if (ST.running) { toast("请先停止当前流程"); return; } runFrom(p.id); });
    head.appendChild(idx); head.appendChild(dot); head.appendChild(ttl); head.appendChild(sub); head.appendChild(btn);
    head.addEventListener("click", function(){ row.classList.toggle("open"); });
    row.appendChild(head);
    var body = document.createElement("div"); body.className = "opf-step-body";
    var pre = document.createElement("pre"); pre.textContent = "（内容显示在这里，点击标题展开/收起）"; body.appendChild(pre);
    ST.elPre = ST.elPre || {}; ST.elPre[p.id] = pre;
    row.appendChild(body);
    if (p.key !== "final") {
      var ref = document.createElement("div"); ref.className = "opf-step-ref";
      var tag = document.createElement("span"); tag.className = "opf-ref-tag"; tag.id = "opf-ref-tag-" + p.id; tag.textContent = "先跑出本步后可精修";
      var chips = document.createElement("div"); chips.id = "opf-ref-chips-" + p.id;
      var r1 = document.createElement("div"); r1.className = "opf-step-ref-row";
      var inp = document.createElement("input"); inp.type = "text"; inp.className = "opf-ref-input"; inp.id = "opf-ref-input-" + p.id; inp.placeholder = "输入本步精修方向…"; inp.disabled = true;
      var doB = document.createElement("button"); doB.type = "button"; doB.className = "opf-step-act opf-ref-do"; doB.textContent = "按方向精修本步"; doB.disabled = true;
      var sug = document.createElement("button"); sug.type = "button"; sug.className = "opf-step-act opf-ref-sug"; sug.textContent = "该步建议"; sug.disabled = true;
      doB.addEventListener("click", function (ev) { ev.stopPropagation(); refinePhase(p.id, inp.value); });
      sug.addEventListener("click", function (ev) { ev.stopPropagation(); suggestPhaseDirections(p.id); });
      r1.appendChild(inp); r1.appendChild(doB); r1.appendChild(sug);
      ref.appendChild(tag); ref.appendChild(chips); ref.appendChild(r1);
      row.appendChild(ref);
    }
    box.appendChild(row);
    if (ST.results[p.id]) { pre.textContent = ST.results[p.id]; setPhase(p.id, "ok"); enablePhaseRefine(p.id); }
  });
}function renderMetaStatus(){
  var el = getEl("opf-meta"); if (!el) return;
  el.textContent = "";
  function add(label, cls){ var sp = document.createElement("span"); sp.className = "tag " + (cls || ""); sp.textContent = label; el.appendChild(sp); }
  var c = getCtx();
  var charName = "—";
  try { if (c && c.characters && c.characterId != null && c.characters[c.characterId]) charName = c.characters[c.characterId].name || "?"; } catch (e) {}
  add("角色: " + charName);
  var s = getSettings();
  add("角色卡: " + (s.includeCard ? "自动读取" : "关闭"));
  if (s.includeWorld) {
    var wlab = ""; var wcls = "";
    if (ST.worldSource === "st") { wlab = "世界书: 酒馆激活(" + ST.worldInfo.length + "字)"; wcls = "ok"; }
    else if (String(ST.worldSource).indexOf("file") === 0) { wlab = "世界书: 文件(" + ST.worldInfo.length + "字)"; wcls = "ok"; }
    else { wlab = "世界书: 未载入(可导入文件)"; }
    add(wlab, wcls);
  } else { add("世界书: 关闭"); }
  add("主API: " + (c && typeof c.generateRaw === "function" ? "就绪" : "未就绪(检查版本)"), c && typeof c.generateRaw === "function" ? "ok" : "err");
}

function renderRunButtons(){
  var run = getEl("opf-btn-run"); var qk = getEl("opf-btn-quick"); var la = getEl("opf-launcher");
  if (run) { run.disabled = !!ST.running; run.textContent = ST.running ? "■ 运行中…" : "▶ 生成初稿"; }
  if (qk) { qk.disabled = !!ST.running; if (!ST.running) qk.textContent = "⚡ 快速初稿"; }
  if (la) { if (ST.running) la.classList.add("running"); else la.classList.remove("running"); }
  var cRun = getEl("opf-char-run"); var cLink = getEl("opf-char-link"); var cFin = getEl("opf-char-final");
  if (cRun) { cRun.disabled = !!ST.running; cRun.textContent = ST.running ? "■ 运行中…" : "▶ 分段初稿"; }
  if (cLink) cLink.disabled = !!ST.running;
  if (cFin) cFin.disabled = !!ST.running;
  CHAR_SEGS.forEach(function (s) { charSetSegUi(s.id, ST.char && ST.char.status[s.id] || "wait"); });
  destSetAllButtons();
  rxSetButtons();
}

function runFlow(quick){
  if (ST.running) { ST.stopReq = true; toast("正在停止…"); return; }
  var s = getSettings();
  var prev = s.quickMode;
  s.quickMode = !!quick;
  var p = runAll();
  if (p && typeof p.then === "function") { p.finally(function(){ s.quickMode = prev; saveSettings(); renderRunButtons(); }); }
  renderRunButtons();
}

async function runFrom(pid){
  if (ST.running) return;
  var start = -1;
  for (var i = 0; i < PHASES.length; i++) if (PHASES[i].id === pid) { start = i; break; }
  if (start < 0) return;
  if (start === 0) { renderSteps(); await runAll(); return; }
  ST.running = true; ST.stopReq = false;
  ST._freshDraft = (start === 0);
  dirsReset();
  try {
    ST.userName = currentUserName();
    var msgs = [{ role: "system", content: buildSystemContent() }, { role: "user", content: buildUser0() }];
    for (var k = 0; k < start; k++) {
      var ph = PHASES[k];
      var had = ST.results[ph.id];
      if (!had) { toast("前面步骤尚未完成，请先用「生成初稿」", "warning"); ST.running = false; renderRunButtons(); return; }
      msgs.push({ role: "user", content: phasePrompt(ph) });
      msgs.push({ role: "assistant", content: had });
    }
    ST.msgs = msgs;
    for (var j = start; j < PHASES.length; j++) {
      if (isStop()) break;
      await runOne(PHASES[j]);
      if (PHASES[j].id === "final") handleModelReply(ST.results.final);
      await waitTick();
    }
    if (isStop()) toast("已停止");
  } catch (e) { toast("生成出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); }
}

function renderJsonOut(obj, warns){
  var pre = getEl("opf-json-out"); if (!pre) return;
  warns = warns || [];
  if (!obj) { pre.textContent = "（暂无可用 JSON）" + (warns.length ? "\n" + warns.map(function(w){ return "⚠ " + w.msg; }).join("\n") : ""); pre.className = "warn"; return; }
  var txt = JSON.stringify(obj, null, 2);
  if (warns.length) txt += "\n\n—— 校验提示 ——\n" + warns.map(function(w){ return "⚠ " + w.msg; }).join("\n");
  pre.textContent = txt;
  pre.className = warns.length ? "warn" : "";
}

// ============ 工作流 v2：分步精修（每步自己的精修框）+ 最后重新汇总 ============
var EXTRA_CSS = ".opf-dir-chip{display:block;text-align:left;cursor:pointer;border-radius:8px;border:1px solid rgba(255,122,138,.28);background:rgba(255,235,238,.05);color:#ffd5da;font-size:11px;line-height:1.45;padding:5px 8px;margin:3px 0;transition:all .14s ease}.opf-dir-chip:hover{background:rgba(255,77,94,.16);border-color:rgba(255,150,165,.55);box-shadow:0 0 8px rgba(255,77,94,.28)}.opf-dim{font-size:11px;color:rgba(255,200,208,.5);padding:2px 0;line-height:1.5}.opf-step-ref{display:flex;flex-direction:column;gap:4px;padding:2px 9px 8px 30px}.opf-step-ref-row{display:flex;gap:5px;flex-wrap:wrap;align-items:center}.opf-ref-input{flex:1 1 150px;min-width:110px;border-radius:7px;padding:4px 7px;font-size:10.5px;color:#ffeef1;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none}.opf-ref-input:focus{border-color:rgba(255,110,125,.6);box-shadow:0 0 6px rgba(255,77,94,.25)}.opf-ref-tag{font-size:9.5px;color:#8fd6ff;background:rgba(60,140,200,.15);border:1px solid rgba(120,190,255,.3);border-radius:10px;padding:0 6px;line-height:1.6}.opf-ref-tag.dirty{color:#ffd9a3;background:rgba(200,130,40,.16);border-color:rgba(255,180,90,.4)}#opf-resum-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px}";
var WORLD_RULES = "依据世界书《角色生成》《角色辅助指导》与 装备/道具/技能/资产 之书等条目提炼，生成与精修一律遵守：\n1) 属性 = 天赋基础 + 层级固定 + 等级额外。开局统一 25 点天赋基础（basePoints，每项0-6，五维总和必须=25）；等级额外 = Lv-1 点（attributePoints）；层级点 = 生命层级(一~七)-1，只结算面板不写表。\n2) 玩家开局最高等级固定10级，只会处于 第一层级_普通(Lv.1-4)/第二层级_中坚(Lv.5-8)/第三层级_精英(Lv.9-12)，层级点 +0/+1/+2；五维单值不得超过所在层级极值（一≤8、二≤10、三≤12），单项逻辑上限20（仅第七层级可达），禁止极端加点。\n3) 开局等级由需求与背景决定（1-10），要符合人设，不要为堆属性乱定级；实力获取/成长经历须在背景中说得通。\n4) 品级严格七等：普通/优良/稀有/史诗/传说/神话 + 唯一（唯一仅表唯一性/出处特殊/不可量产，不代表强度更高）；词条上限按品质：普通1/优良2/稀有2/史诗3/传说3/神话3；自定义条目按品级消耗点数（普通5-30、优良20-60、稀有35-100、史诗80-200、传说150-400、神话300-1000、唯一666）；FP 即 reincarnationPoints（随机1000-9999）。\n5) 技能分攻击技(消耗[攻击]，造成即时伤害)与动作技(消耗[动作]，禁止即时伤害与威力，用于治疗/控制/增益/减益/功能，可含DoT)；威力仅攻击技必填、动作技禁用；核心功能“伤害”仅攻击技可用；装备不增减持有者属性；装备/道具/技能/资产条目须符合对应“之书”的格式与世界观惯例。\n6) 资产写全：类型/标签/总空间/结算/描述/位置/内部资产（名称/品质/标签/数量/效果/描述/总占用空间），数量与空间必须自洽；金额统一用 Z 计价（如“资产估价: 数值Z 当地货币名”），收益率参考《经济价格指南》资产结算基准。\n7) 伙伴(契约)字段写全：lifeLevel/race/identity/career/personality/like/app/cloth/equip/attributes(strength…mind)/stairway/isContract/affinity/comment/backgroundInfo(≥200字)/skills；没有契约伙伴则 partners=[]。\n8) background.description 为开局剧情（≥500字），须与角色等级、身份、资产、伙伴互相咬合。\n9) 品级英文唯一命名（导出字段用英文）：普通=common、优良=uncommon、稀有=rare、史诗=epic、传说=legendary、神话=mythic、唯一=only；JSON 的 rarity / 资产内部资产的 品质 字段只能出现这七个英文之一。";

function dirsReset(){
  ST.dirsSuggested = false; ST.refineCount = 0; ST.dirty = false; ST.modified = {};
  renderDirsStatus("生成初稿后：可在每一步下方单独输入/生成该步的精修方向，只改自己那一步；都改完后再点“⟳ 重新汇总”生成新版 JSON。");
  renderResum();
}
function renderDirsStatus(msg){
  var el = getEl("opf-dir-status"); if (!el) return; el.textContent = msg || "";
}
function draftReadyHint(){
  if (!ST._freshDraft) return;
  renderDirsStatus("✓ 初稿完成。各步下方已出现精修框：可输入方向或点“该步建议”生成方向，只改对应一步；全部改完后点“⟳ 重新汇总”。");
  renderResum();
}
function markDirty(pid){
  ST.modified[pid] = true; ST.dirty = true;
  var tag = getEl("opf-ref-tag-" + pid);
  if (tag) { tag.textContent = "✦ 本步已修改"; tag.className = "opf-ref-tag dirty"; }
  renderDirsStatus("分步修改完成：点下方“⟳ 重新汇总”基于最新各步内容重建 P6 汇总 JSON。");
  renderResum();
}
function markSummarized(){
  if (!ST.dirty) { renderResum(); return; }
  ST.dirty = false; ST.modified = {};
  renderDirsStatus("✓ 已重新汇总。如再改某一步，记得再次点“⟳ 重新汇总”。");
  renderResum();
}
function renderResum(){
  var b = getEl("opf-resum");
  if (!b) return;
  var can = !!ST.finalJson || (ST.msgs && ST.msgs.length > 0);
  b.disabled = !can;
  b.textContent = ST.dirty ? "⟳ 重新汇总（有分步修改）" : "⟳ 重新汇总";
}
function phaseRow(pid){ return getEl("opf-ph-" + pid); }
function enablePhaseRefine(pid){
  var row = phaseRow(pid); if (!row) return;
  var has = !!ST.results[pid];
  var inp = row.querySelector(".opf-ref-input");
  var b1 = row.querySelector(".opf-ref-do");
  var b2 = row.querySelector(".opf-ref-sug");
  if (inp) inp.disabled = !has;
  if (b1) b1.disabled = !has;
  if (b2) b2.disabled = !has;
  var tag = row.querySelector(".opf-ref-tag");
  if (tag && !ST.modified[pid]) tag.textContent = has ? "可精修本步" : "先跑出本步后可精修";
}
async function refinePhase(pid, direction){
  if (ST.running) { toast("已有任务进行中（单线程），请稍候"); return; }
  var phase = null, idx = -1;
  for (var i = 0; i < PHASES.length; i++) { if (PHASES[i].id === pid) { phase = PHASES[i]; idx = i; break; } }
  if (!phase || phase.key === "final") return;
  if (!ST.results[pid]) { toast("该步还没有可精修的内容，请先“生成初稿”", "warning"); return; }
  var dir = (direction || "").trim();
  if (!dir) dir = "整体打磨：修正设定漏洞、提升与角色/背景的契合度与文笔，条目数量与格式保持不变。";
  ST.running = true; setPhase(pid, "run"); renderRunButtons();
  try {
    var msgs = [{ role: "system", content: buildSystemContent() }, { role: "user", content: buildUser0() }];
    for (var k = 0; k < idx; k++) {
      var pp = PHASES[k];
      if (ST.results[pp.id]) {
        msgs.push({ role: "user", content: "（供参考的既有内容，本阶段无需改动）：" + pp.title });
        msgs.push({ role: "assistant", content: ST.results[pp.id] });
      }
    }
    var nl = String.fromCharCode(10);
    var refineMsg = phasePrompt(phase) + nl + nl + "【本步精修指令】" + nl + "方向：" + dir + nl + nl + "[世界规则·创作限制]" + nl + WORLD_RULES + nl + nl + "要求：只输出【" + phase.title + "】这一栏的修订内容（沿用本步的书条目格式与数量，可增删但要有理由），不要改动其它栏目，也不要输出整份 JSON。若确实无需修改，原样输出“无”。";
    msgs.push({ role: "user", content: refineMsg });
    var resp = await callModel(msgs);
    ST.results[pid] = resp;
    if (ST.elPre && ST.elPre[pid]) ST.elPre[pid].textContent = (resp || "").slice(0, 4000) + ((resp && resp.length > 4000) ? " ……(截断显示)" : "");
    setPhase(pid, "ok"); enablePhaseRefine(pid);
    markDirty(pid);
    toast("已按方向修改【" + phase.title + "】，记得重新汇总");
  } catch (e) {
    setPhase(pid, "err");
    toast("精修本步出错：" + (e && e.message ? e.message : e), "error");
  } finally { ST.running = false; renderRunButtons(); }
}
async function suggestPhaseDirections(pid){
  if (ST.running) { toast("已有任务进行中（单线程），请稍候"); return; }
  var phase = null;
  for (var i = 0; i < PHASES.length; i++) if (PHASES[i].id === pid) { phase = PHASES[i]; break; }
  if (!phase || !ST.results[pid]) { toast("该步还没有可参考的内容，请先“生成初稿”", "warning"); return; }
  var chipBox = getEl("opf-ref-chips-" + pid); if (!chipBox) return;
  var cur = String(ST.results[pid]).slice(0, 3500);
  var demand = (getEl("opf-demand") && getEl("opf-demand").value.trim()) || "(未填写)";
  var nl = String.fromCharCode(10);
  var ask = "请针对【" + phase.title + "】这一栏的现有内容，结合开局需求给出 2-3 条只针对本栏的修改方向。每条一行、≤50字、去掉编号外多余的话、直接可点；必须符合世界规则限制。\n[开局需求]\n" + demand + "\n[世界规则·创作限制]\n" + WORLD_RULES + "\n[本栏现有内容]\n" + cur;
  var msgs = [{ role: "system", content: buildSystemContent() }, { role: "user", content: ask }];
  var old = ST.running;
  ST.running = true; renderRunButtons();
  try {
    var resp = await callModel(msgs);
    var list = [];
    String(resp).split(/\r?\n/).forEach(function (ln) {
      var t = String(ln).replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, "").trim();
      if (t && t.length >= 4 && t.length <= 70 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) list = ["调整条目数量/品级分布", "让效果与标签更贴人设", "补足背景与描述文笔"];
    renderPhaseChips(pid, list.slice(0, 3));
  } catch (e) {
    toast("该步建议生成失败：" + (e && e.message ? e.message : e), "error");
  } finally { ST.running = false; renderRunButtons(); }
}
function renderPhaseChips(pid, list){
  var box = getEl("opf-ref-chips-" + pid); if (!box) return;
  box.textContent = "";
  list.forEach(function (t) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "opf-dir-chip";
    b.textContent = "▶ " + t;
    b.addEventListener("click", function(){ refinePhase(pid, t); });
    box.appendChild(b);
  });
}
function addWorkflowUI(root){
  if (!root || getEl("opf-resum")) return;
  var stepsSec = root.querySelector("#opf-steps");
  var anchor = stepsSec ? stepsSec.parentElement : null;
  var sec = document.createElement("div"); sec.className = "opf-sec";
  var lab = document.createElement("div"); lab.className = "opf-sec-label"; lab.textContent = "分步精修 → 重新汇总";
  var dim = document.createElement("div"); dim.id = "opf-dir-status"; dim.className = "opf-dim";
  var row = document.createElement("div"); row.id = "opf-resum-row";
  var go = document.createElement("button"); go.type = "button"; go.className = "opf-btn ghost"; go.id = "opf-resum"; go.textContent = "⟳ 重新汇总"; go.disabled = true;
  row.appendChild(go);
  sec.appendChild(lab); sec.appendChild(dim); sec.appendChild(row);
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor.nextSibling);
  go.addEventListener("click", function(){ runFrom("final"); });
  dirsReset();
}
