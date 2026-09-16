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
  initMemo();
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