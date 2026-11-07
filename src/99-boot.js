//@module 99-boot — 启动（必须最后）
// ============ boot ============
function boot(){
  injectStyle();
  buildPanel();
  renderRunButtons();
  try { worldCacheRestore(); } catch (e) { opfErr("worldCacheRestore", e); }
  try { charDraftRestore(); } catch (e) { opfErr("charDraftRestore", e); }
  try { destDraftRestore(); } catch (e) { opfErr("destDraftRestore", e); }
  try { rxCacheRestore(); } catch (e) { opfErr("rxCacheRestore", e); }
  try { shxInit(); shxLoadCfgToUi(); } catch (e) { opfErr("shxInit", e); }
  // 工程列表：必须在三条流水线的草稿恢复之后引导，否则会把空状态当成"现有草稿"
  try { projBootstrap(); } catch (e) { opfErr("projBootstrap", e); }
  // 有活跃工程就把它的内容恢复回来（否则新会话里 2.5 秒后的空快照会把草稿写空）
  try { projRestoreActive(); } catch (e) { opfErr("projRestoreActive", e); }
  try { renderProjList(); } catch (e) { opfErr("renderProjList", e); }
  try { projAutosaveStart(); } catch (e) { opfErr("projAutosaveStart", e); }
  opfLog("loaded. context ready:", !!getCtx());
}
function tryBoot(tryCount){
  var ok = false;
  try { ok = typeof SillyTavern !== "undefined" && !!SillyTavern.getContext && !!getCtx(); } catch (e) {}
  if (ok) { try { boot(); } catch (e) { opfErr("boot error", e); } return; }
  if ((tryCount || 0) > 60) { opfLog("SillyTavern context not ready after wait"); return; }
  setTimeout(function(){ tryBoot((tryCount || 0) + 1); }, 500);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", function(){ tryBoot(0); }); }
  else { tryBoot(0); }
}