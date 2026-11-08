//@module 97-mobile-pages — 手机端适配 · 各业务页（owner: page-css）
// ============================================================================
// 二创角色 / 命定系统 / 正则工坊 / 与始弦聊天 / 核心精修 / 造物工坊
// 只写 @media (max-width:720px) 内的覆盖；桌面（>720px）必须一行都不变。
// 由 96-mobile.js 的 injectMobileCSS() 一并注入（96 之后，能压过皮肤）。
// 共用件（顶栏/页头/卡片/按钮/输入/底部条）归 96-mobile.js；这里只做这六页的页内结构。
// 契约见 tools/ui-preview/MOBILE-SPEC.md
// ============================================================================

// 六个业务页的容器前缀：所有共用规则都挂在具体页 id 下面，绝不影响其它页与桌面
var MP_PAGES = ["#opf-page-char", "#opf-page-destiny", "#opf-page-regex", "#opf-page-refine", "#opf-page-atelier", "#opf-page-shixian"];
function mpSel(sel) {
  var out = [];
  for (var i = 0; i < MP_PAGES.length; i++) out.push(MP_PAGES[i] + " " + sel);
  return out.join(",");
}

// 媒体条件：96 会定义 OPF_MOBILE_MEDIA（布局模式可切「自动 / 强制」）；
// 单独加载 97 时退回 720 宽断点，避免 ReferenceError 把整份 MOBILE_PAGES_CSS 拖死。
var _mpMQ = (typeof OPF_MOBILE_MEDIA === "string" ? OPF_MOBILE_MEDIA : "(max-width:720px)");

var MOBILE_PAGES_CSS = [
  "@media " + _mpMQ + "{",

  // ---------- ① 六页公共骨架 ----------
  // 页容器：占满内容区（皮肤的 max-width:980/1500 与 30px 大留白在手机上收掉）
  mpSel(".opf-char-wrap") + "{width:100%!important;max-width:100%!important;margin:0!important;padding:4px 10px 26px!important;box-sizing:border-box!important}",
  // 输入框 / 输出框 / 预览块：一律不许撑破容器
  mpSel(".opf-char-input") + "," + mpSel(".opf-ref-input") + "," + mpSel(".opf-box") + "," + mpSel(".opf-rx-preview") + "," + mpSel(".opf-char-report") + "{max-width:100%!important;min-width:0!important;box-sizing:border-box!important}",
  mpSel(".opf-char-input") + "," + mpSel(".opf-ref-input") + "{width:100%!important}",
  // 长输出框 ≈50dvh；评审/报告类短框封顶，避免一屏全是黑框
  mpSel(".opf-box") + "{max-height:46dvh!important;min-height:72px!important;overflow:auto!important}",
  "#opf-char-out,#opf-dest-out{max-height:52dvh!important;min-height:150px!important}",
  "#opf-char-report,#opf-dest-report,#opf-dest-reviewbox{max-height:38dvh!important;min-height:68px!important}",
  // 工具按钮：两列换行，触控高度 ≥42px（皮肤把高度压到 32）
  mpSel(".opf-char-tools") + "{gap:8px!important;width:100%!important}",
  mpSel(".opf-char-tools .opf-btn") + "{flex:1 1 calc(50% - 4px)!important;max-width:calc(50% - 4px)!important;width:auto!important;height:auto!important;min-height:42px!important;padding:6px 8px!important;font-size:12.5px!important;line-height:1.35!important;white-space:normal!important}",
  mpSel(".opf-char-tools .opf-btn:only-child") + "{flex:1 1 100%!important;max-width:100%!important}",
  "#opf-page-char .opf-char-copyrow .opf-btn,#opf-page-destiny .opf-char-copyrow .opf-btn{flex:1 1 100%!important;max-width:none!important;width:100%!important;min-height:42px!important}",

  // ---------- ② 二创角色 / 命定系统：双栏 → 单列 ----------
  "#opf-page-char .opf-char-wrap.opf-2col,#opf-page-destiny .opf-char-wrap.opf-2col{display:flex!important;flex-direction:column!important;grid-template-columns:none!important;gap:12px!important;width:100%!important;max-width:100%!important}",
  "#opf-page-char .opf-char-wrap.opf-2col>.opf-col,#opf-page-destiny .opf-char-wrap.opf-2col>.opf-col{display:flex!important;flex-direction:column!important;width:100%!important;min-width:0!important;gap:10px!important}",
  // 皮肤给左栏的 sticky + 内部滚动在手机上必须取消，否则左栏变成一条独立滚动的小窗口
  "#opf-page-char .opf-char-wrap.opf-2col>.opf-col-a,#opf-page-destiny .opf-char-wrap.opf-2col>.opf-col-a{position:static!important;top:auto!important;max-height:none!important;overflow:visible!important;padding:12px!important;border-radius:12px!important}",
  "#opf-dest-ejswrap{font-size:12px!important;line-height:1.6!important;padding:8px 10px!important;align-items:flex-start!important}",
  "#opf-dest-ejswrap input{width:18px!important;height:18px!important;margin-top:1px!important}",

  // ---------- ③ 拆分页（正则 / 精修 / 造物）：左输入右产出 → 纵向 ----------
  mpSel(".opf-split") + "{display:flex!important;flex-direction:column!important;grid-template-columns:none!important;gap:12px!important;width:100%!important;max-width:100%!important}",
  mpSel(".opf-split-l") + "{position:static!important;top:auto!important;max-height:none!important;overflow:visible!important;width:100%!important;padding:12px!important;box-sizing:border-box!important;gap:9px!important}",
  mpSel(".opf-split-r") + "{width:100%!important;min-width:0!important;gap:10px!important}",
  "#opf-page-regex .opf-split-l .opf-char-input{min-height:128px!important}",
  "#opf-page-refine .opf-split-l .opf-char-input{min-height:132px!important}",
  "#opf-page-refine .opf-split-r .opf-char-input{min-height:120px!important}",
  "#opf-page-atelier .opf-split-l .opf-char-input{min-height:80px!important}",
  "#opf-page-atelier .opf-split-r .opf-char-input{min-height:128px!important}",
  "#opf-page-regex .opf-split-r .opf-box,#opf-page-refine .opf-split-r .opf-box,#opf-page-atelier .opf-split-r .opf-box{min-height:88px!important;max-height:46dvh!important}",
  // 各页正文框的常用高度
  "#opf-rx-core{min-height:132px!important}",
  "#opf-rf-src{min-height:132px!important}",
  "#opf-rf-req{min-height:88px!important}",
  "#opf-rf-result{min-height:150px!important}",
  "#opf-atl-req{min-height:88px!important}",
  "#opf-atl-ref{min-height:64px!important}",
  "#opf-atl-out{min-height:144px!important}",
  "#opf-atl-dir{min-height:104px!important}",

  // ---------- ④ 步骤卡（角色/命定/正则的子条目）----------
  mpSel(".opf-step") + "{min-width:0!important;margin-bottom:8px!important}",
  mpSel(".opf-step-head") + "{flex-wrap:wrap!important;align-items:center!important;gap:5px 7px!important;padding:8px 9px!important;min-height:44px!important}",
  mpSel(".opf-step-title") + "{flex:1 1 auto!important;min-width:0!important;font-size:13px!important;line-height:1.4!important}",
  // 副标题整行换行（不做省略号裁切：裁切会被审计算成「内部横滚」）
  mpSel(".opf-step-sub") + "{order:5!important;flex:1 1 100%!important;max-width:100%!important;font-size:11px!important;white-space:normal!important;line-height:1.5!important}",
  mpSel(".opf-step-head .opf-step-act") + "{flex:none!important;min-height:34px!important;padding:0 9px!important;font-size:11.5px!important}",
  // 步骤正文原本左缩进 30px，在 320 宽上太贵
  mpSel(".opf-step-body") + "{padding:4px 10px 10px!important;font-size:12.5px!important;line-height:1.65!important}",
  mpSel(".opf-step-act") + "{min-height:34px!important;padding:0 10px!important;font-size:11.5px!important}",
  // 行式字段：输入/下拉都收进容器，窄屏自动换行（不让 170/280px 的 flex basis 顶出去）
  mpSel(".opf-step-ref-row") + "{gap:7px!important;align-items:center!important;width:100%!important}",
  mpSel(".opf-step-ref-row .opf-ref-input") + "{flex:1 1 140px!important;min-width:0!important;max-width:100%!important;height:38px!important}",
  mpSel(".opf-step-ref-row select.opf-ref-input") + "{flex:1 1 45%!important;min-width:0!important}",

  // ---------- ⑤ 页内子标签（命定系统三页共用）：横向可滚 ----------
  "#opf-subbar{max-width:100%!important;padding:2px 12px 0!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch}",
  "#opf-subbar::-webkit-scrollbar{display:none}",
  ".opf-subtab{flex:none!important;padding:7px 13px!important;font-size:12.5px!important;min-height:36px!important}",

  // ---------- ⑥ 正则工坊 ----------
  "#opf-page-regex #opf-rx-items .opf-step-body>.opf-dim{font-size:11.5px!important;line-height:1.6!important;margin-top:4px!important}",
  "#opf-page-regex .opf-rx-preview{max-width:100%!important;overflow-x:auto!important}",

  // ---------- ⑦ 造物工坊：工作区列表在窄屏堆叠 ----------
  "#opf-atl-spaces .atl-space{margin:8px 0!important}",
  "#opf-atl-spaces .atl-space>summary{padding:8px 9px!important;gap:6px!important}",
  "#opf-page-atelier .atl-space-name{flex:1 1 120px!important;font-size:12.5px!important;min-height:34px!important;padding:5px 6px!important}",
  // 类型 / 条目名 / 工作区这类「字段名 + 控件」行在窄屏整行铺开
  "#opf-page-atelier .opf-step-ref-row>.opf-opt{flex:1 1 100%!important;display:flex!important;justify-content:space-between!important;gap:8px!important;min-height:40px!important}",
  "#opf-page-atelier .opf-step-ref-row>.opf-opt .opf-ref-input{flex:1 1 auto!important;width:auto!important;min-width:0!important;max-width:100%!important}",
  "#opf-page-atelier .opf-step-ref-row>.opf-ref-input,#opf-page-atelier .opf-step-ref-row>select{flex:1 1 100%!important;min-width:0!important}",
  "#opf-page-atelier .atl-item{padding:7px 9px!important;gap:7px!important}",
  "#opf-page-atelier .atl-open{min-height:34px!important}",
  "#opf-page-atelier .atl-cross-note,#opf-page-atelier #opf-atl-sx{font-size:11.5px!important;line-height:1.6!important}",

  // ---------- ⑧ 与始弦聊天 ----------
  "#opf-page-shixian .opf-shx-cfg{gap:8px!important}",
  "#opf-page-shixian .opf-shx-cfg .opf-opt{flex:1 1 100%!important;min-height:40px!important;font-size:12px!important;justify-content:space-between!important}",
  "#opf-page-shixian .opf-shx-cfg .opf-ref-input{flex:1 1 130px!important;min-width:0!important;max-width:62%!important;height:36px!important}",
  "#opf-page-shixian .opf-shx-cfg .opf-num{width:84px!important;min-width:0!important;height:34px!important;padding:0 8px!important}",
  "#opf-page-shixian #opf-shx-log{max-height:44dvh!important;min-height:220px!important;padding:9px!important}",
  "#opf-page-shixian #opf-shx-input{min-height:76px!important}",
  "#opf-page-shixian .opf-shx-msg.me,#opf-page-shixian .opf-shx-msg.her{max-width:92%!important}",
  "#opf-page-shixian .opf-shx-wblist{max-height:38dvh!important}",
  "#opf-page-shixian #opf-shx-mem{max-height:44dvh!important}",

  "}",

  // ---------- ⑨ 窄机细调（≤380，主要给 320/360）----------
  "@media (max-width:380px){",
  mpSel(".opf-char-wrap") + "{padding:2px 8px 22px!important}",
  mpSel(".opf-step-title") + "{font-size:12.5px!important}",
  mpSel(".opf-step-head") + "{gap:5px!important}",
  mpSel(".opf-step-ref-row select.opf-ref-input") + "{flex:1 1 100%!important}",
  "#opf-page-shixian .opf-shx-cfg .opf-opt{flex-direction:column!important;align-items:stretch!important;gap:5px!important}",
  "#opf-page-shixian .opf-shx-cfg .opf-ref-input{max-width:100%!important;width:100%!important}",
  "}"
].join("");
