//@module 96-mobile — 手机端适配 · 外壳与共用件（owner: chrome-css）
// ============================================================================
// 只写 @media (max-width:720px) 内的覆盖；桌面（>720px）必须一行都不变。
// 注入在 95-ui-skin 之后（99-boot 里调 injectMobileCSS），所以后写 + !important 能压过皮肤。
// 97-mobile-pages.js 负责各业务页内部；两边不要互相抢选择器。
// 契约见 tools/ui-preview/MOBILE-SPEC.md
// ============================================================================
// 手机版式的唯一判定真源：窄屏，或「粗指针 + 宽屏矮高」（横屏手机/小平板）。
// 96/97 的媒体块、40-shell 的 isMobileShell 都引用它；用户强制模式由 opfApplyLayoutMode 改媒体条件。
var OPF_MOBILE_MEDIA = "(max-width:720px),(pointer:coarse) and (max-width:1024px) and (max-height:480px)";

var MOBILE_CSS = [
  // 桌面：新控件不占位、不可见（media 外只允许这一类规则）
  "#opf-nav-toggle{display:none}",
  "#opf-nav-mask{display:none}",
  // 设置页「界面布局」新控件的基样式（桌面/手机都要能看；对齐 #opf-ui-theme 的 chip 观感）
  "#opf-ui-layout{border-top:none!important;padding-top:2px!important}",
  "#opf-ui-layout .opf-theme-pick{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 4px}",
  "#opf-ui-layout .opf-theme-chip{cursor:pointer;border-radius:999px;padding:6px 14px;min-height:32px;font-size:12.5px;letter-spacing:.6px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:rgba(240,228,218,.72);transition:background .14s ease,border-color .14s ease,color .14s ease}",
  "#opf-ui-layout .opf-theme-chip:hover{background:rgba(255,255,255,.08);color:#fff4ea}",
  "#opf-ui-layout .opf-theme-chip.on{border-color:rgba(232,206,170,.5);background:rgba(232,206,170,.12);color:#fff3e2}",

  "@media " + OPF_MOBILE_MEDIA + "{",

  // ================= 外壳 & 顶栏 =================
  // 48px 一行：☰ / 标题(flex) / 传输状态点 / ▤ / ⚙ / ✕
  "#opf-shell #opf-shell-head{height:48px!important;min-height:48px!important;padding:0 8px!important;gap:6px!important;flex-wrap:nowrap!important;z-index:20!important}",
  "#opf-shell-head #opf-nav-toggle{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:none!important;width:36px!important;height:36px!important;min-width:36px!important;padding:0!important;font-size:17px!important;line-height:1!important;border-radius:9px!important}",
  "#opf-shell #opf-shell-title{flex:1 1 auto!important;min-width:0!important;font-size:15px!important;letter-spacing:1px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;gap:6px!important}",
  "#opf-shell #opf-shell-title::after{display:none!important}",
  "#opf-shell #opf-tx-status,#opf-shell #opf-tx-status.opf-tx-status{margin-left:auto!important;flex:none!important;width:34px!important;min-width:34px!important;height:34px!important;padding:0!important;font-size:0!important;line-height:0!important;gap:0!important;justify-content:center!important;overflow:hidden!important}",
  "#opf-shell #opf-tx-status::before{width:8px!important;height:8px!important;margin:0!important;flex:none!important}",
  "#opf-shell #opf-chrome-world{flex:none!important;width:36px!important;min-width:36px!important;height:36px!important;padding:0!important;font-size:16px!important;line-height:1!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;white-space:nowrap!important}",
  "#opf-shell #opf-chrome-settings{flex:none!important;width:36px!important;min-width:36px!important;height:36px!important;padding:0!important;font-size:16px!important;line-height:1!important}",
  "#opf-shell #opf-shell-close{margin-left:0!important;flex:none!important;width:36px!important;min-width:36px!important;height:36px!important;padding:0!important;font-size:15px!important;line-height:1!important}",

  // ================= 导航抽屉视觉（DOM/开合由 40-shell.js 负责） =================
  "#opf-shell #opf-shell-body{display:flex!important;flex-direction:row!important;min-height:0!important}",
  "#opf-shell #opf-pages{flex:1 1 auto!important;min-width:0!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav{position:fixed!important;left:0!important;top:0!important;bottom:0!important;right:auto!important;width:min(86vw,320px)!important;max-width:320px!important;height:100%!important;height:100dvh!important;max-height:100dvh!important;min-height:0!important;margin:0!important;padding:58px 10px calc(24px + env(safe-area-inset-bottom))!important;display:flex!important;flex-direction:column!important;flex-wrap:nowrap!important;align-items:stretch!important;gap:2px!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important;z-index:10!important;border:0!important;border-right:1px solid rgba(216,178,116,.22)!important;border-radius:0!important;background:linear-gradient(180deg,rgba(26,14,20,.985),rgba(11,5,9,.99))!important;box-shadow:0 0 40px rgba(0,0,0,.6)!important;transform:translateX(-102%)!important;visibility:hidden!important;transition:transform .22s ease,visibility 0s linear .22s!important}",
  "#opf-shell.opf-nav-open #opf-shell-body #opf-nav#opf-nav{transform:translateX(0)!important;visibility:visible!important;transition:transform .22s ease!important}",
  "#opf-shell #opf-nav-mask{display:none!important;position:fixed!important;inset:0!important;z-index:5!important;background:rgba(0,0,0,.55)!important}",
  "#opf-shell.opf-nav-open #opf-nav-mask{display:block!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav .opf-nav-group{display:block!important;flex:none!important;padding:13px 10px 5px!important;font-size:10px!important;letter-spacing:2.2px!important;color:rgba(226,186,132,.6)!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav .opf-tab{display:flex!important;align-items:center!important;justify-content:flex-start!important;width:100%!important;height:auto!important;min-height:44px!important;flex:none!important;padding:10px 12px!important;margin:0 0 2px!important;border:1px solid transparent!important;border-radius:8px!important;background:transparent!important;color:rgba(226,202,196,.88)!important;font-size:14px!important;line-height:1.35!important;letter-spacing:.5px!important;text-align:left!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;writing-mode:horizontal-tb!important;text-orientation:initial!important;gap:0!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav .opf-tab:hover{background:rgba(255,235,238,.07)!important;color:#fff!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav .opf-tab.active{background:linear-gradient(90deg,rgba(216,178,116,.16),rgba(216,178,116,.03))!important;color:#fbf1e4!important;border-color:transparent!important;box-shadow:inset 2px 0 0 #d8b274!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav .opf-tab::before{display:none!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav .opf-tab.active::after{right:12px!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-nav-sub{position:static!important;display:block!important;width:auto!important;flex:none!important;max-height:0!important;margin:0 0 2px!important;padding:0!important;overflow:hidden!important;background:transparent!important;border:0!important;box-shadow:none!important;transform:none!important;opacity:1!important;pointer-events:auto!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-nav-sub.open{max-height:420px!important;overflow-y:auto!important;padding:2px 0 4px!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-nav-sub #opf-projlist{display:flex!important;flex-direction:column!important;flex-wrap:nowrap!important;gap:2px!important;padding:4px 0 4px 10px!important;margin:0!important;border-top:1px solid rgba(216,178,116,.14)!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-projlist .opf-proj-head{font-size:11px!important;min-height:24px!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-projlist .opf-proj-add{min-width:30px!important;min-height:28px!important;padding:0 8px!important;font-size:14px!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-projlist .opf-proj-row{min-height:36px!important;padding:6px 8px!important;border-radius:8px!important;font-size:13px!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-projlist .opf-proj-name{font-size:13px!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-nav-recent{margin-top:auto!important;padding:10px 4px 4px!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-nav-recent .nr-row{min-height:32px!important;font-size:12.5px!important}",
  "#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-nav-hint{padding:0 6px!important;font-size:10.5px!important}",

  // ================= 页头 .opf-ph =================
  "#opf-shell .opf-page{min-width:0!important;padding:0!important}",
  "#opf-shell .opf-ph{padding:16px 14px 10px!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:10px!important;max-width:100%!important}",
  "#opf-shell .opf-ph-main{min-width:0!important;max-width:100%!important}",
  "#opf-shell .opf-ph-title{font-size:22px!important;letter-spacing:1px!important;line-height:1.2!important}",
  "#opf-shell .opf-ph-eyebrow{font-size:10px!important;letter-spacing:2px!important}",
  "#opf-shell .opf-ph-desc{font-size:12.5px!important;line-height:1.65!important;margin-top:6px!important;max-width:100%!important}",
  "#opf-shell .opf-ph-side{flex:none!important;width:100%!important;align-items:flex-start!important;padding:0!important}",
  "#opf-shell .opf-ph-side #opf-meta{width:100%!important;justify-content:flex-start!important;flex-wrap:wrap!important;gap:6px!important;padding:0!important;font-size:11.5px!important}",
  "#opf-shell #opf-meta .tag{font-size:10.5px!important}",
  "#opf-shell .opf-ph-rule{margin:0 14px!important;max-width:100%!important}",

  // ================= 共用件：卡片 / 按钮 / 输入 =================
  "#opf-shell .opf-card{padding:12px!important;border-radius:12px!important;min-width:0!important;max-width:100%!important}",
  "#opf-shell .opf-card-hd{flex-wrap:wrap!important;gap:4px 6px!important;padding-bottom:8px!important;align-items:center!important;min-width:0!important}",
  "#opf-shell .opf-card-no{font-size:11px!important;min-width:22px!important;height:20px!important}",
  "#opf-shell .opf-card-t{font-size:15px!important;letter-spacing:.8px!important;min-width:0!important}",
  "#opf-shell .opf-card-sub{flex:1 1 auto!important;min-width:0!important;font-size:11px!important;line-height:1.4!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}",
  "#opf-shell .opf-sec-label{font-size:12px!important;letter-spacing:1px!important}",
  "#opf-shell .opf-dim{font-size:12px!important;line-height:1.6!important}",
  "#opf-shell .opf-opts{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:8px 12px!important;padding:2px 0!important}",
  "#opf-shell .opf-opt{display:inline-flex!important;flex-wrap:wrap!important;align-items:center!important;gap:5px!important;font-size:13px!important;min-height:34px!important;line-height:1.45!important;max-width:100%!important}",
  "#opf-shell .opf-opt input[type=checkbox]{width:17px!important;height:17px!important;flex:none!important}",
  "#opf-shell .opf-num{width:76px!important;max-width:100%!important;min-height:32px!important;font-size:13.5px!important;padding:5px 7px!important}",
  "#opf-shell #opf-pname{width:min(200px,58vw)!important;max-width:100%!important;min-height:32px!important;font-size:13.5px!important;padding:5px 7px!important}",
  "#opf-shell textarea,#opf-shell input[type=text],#opf-shell input[type=password],#opf-shell select{max-width:100%!important}",
  "#opf-shell #opf-demand{width:100%!important;min-height:96px!important;max-height:38vh!important;font-size:14px!important;line-height:1.55!important;padding:9px 10px!important}",
  "#opf-shell .opf-char-input{width:100%!important;min-height:44px!important;font-size:14px!important;padding:9px 10px!important}",
  "#opf-shell .opf-ref-input{flex:1 1 100%!important;min-width:0!important;min-height:38px!important;font-size:13.5px!important;padding:8px 10px!important}",
  "#opf-shell .opf-step-act{min-height:34px!important;font-size:12.5px!important;padding:5px 10px!important}",
  "#opf-shell .opf-btn{min-height:40px!important;font-size:14px!important;padding:9px 10px!important}",
  "#opf-shell .opf-out{min-width:0!important}",
  // 共用的小按钮（自备条目卡的「选取/编辑/删除」、库列表等）：给足触控高度
  "#opf-shell .lib-mini{min-height:34px!important;min-width:40px!important;padding:5px 9px!important;font-size:12.5px!important}",
  "#opf-shell .lib-kitdel{min-width:32px!important;min-height:32px!important;font-size:13px!important}",
  "#opf-shell .lib-chip button{min-width:26px!important;min-height:30px!important;font-size:12px!important}",
  "#opf-shell #opf-json-out{max-height:42vh!important;font-size:12px!important;line-height:1.5!important}",

  // ================= 底部操作条（全宽 + 安全区） =================
  "#opf-shell #opf-page-preset #opf-actions{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100%!important;max-width:none!important;margin:0!important;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px))!important;z-index:4!important;display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px!important;border:0!important;border-top:1px solid rgba(216,178,116,.22)!important;border-radius:0!important;background:linear-gradient(180deg,rgba(28,16,22,.96),rgba(12,6,10,.98))!important;box-shadow:0 -8px 24px rgba(0,0,0,.4)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important}",
  "#opf-shell #opf-page-preset #opf-actions::before{display:none!important}",
  "#opf-shell #opf-page-preset #opf-actions .opf-btn{flex:1 1 calc(50% - 6px)!important;min-width:0!important;min-height:40px!important;font-size:13.5px!important;padding:8px 6px!important;letter-spacing:.5px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}",

  // ================= 开局预设页 =================
  // 皮肤在 #opf-page-preset #opf-body 上后置了 grid 双栏（minmax(310px,392px)），
  // 手机必须用更高特异性 + !important 强制单列纵向，否则 390px 下横向溢出 +100~297px。
  "#opf-shell #opf-page-preset #opf-body{display:flex!important;flex-direction:column!important;grid-template-columns:none!important;gap:12px!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0 14px 132px!important;overflow-x:hidden!important;min-width:0!important}",
  "#opf-shell #opf-page-preset #opf-body>*{min-width:0!important;max-width:100%!important}",
  // 单列后把主流程提到最上面：01/02（左栏）→ 03/04（右栏）→ QS 快速开局 → ST 故事基调（桌面上的辅助件）
  "#opf-shell #opf-page-preset #opf-body>.opf-col-a{order:1!important}",
  "#opf-shell #opf-page-preset #opf-body>.opf-col-b{order:2!important}",
  "#opf-shell #opf-page-preset #opf-body>#opf-qs-card{order:3!important}",
  "#opf-shell #opf-page-preset #opf-body>#opf-story-card{order:4!important}",
  "#opf-shell #opf-page-preset #opf-body>.opf-col{display:flex!important;flex-direction:column!important;gap:10px!important;width:100%!important;min-width:0!important}",
  "#opf-shell #opf-page-preset #opf-body .opf-story-list{grid-template-columns:1fr!important}",
  "#opf-shell #opf-page-preset #opf-body .opf-tone-btn{height:auto!important;min-height:44px!important}",
  "#opf-shell #opf-page-preset #opf-body .opf-steps{max-height:none!important;overflow:visible!important;padding:0!important}",
  "#opf-shell #opf-page-preset #opf-body .opf-step-head{flex-wrap:wrap!important;row-gap:4px!important;padding:8px!important}",
  "#opf-shell #opf-page-preset #opf-body .opf-step-title{min-width:0!important;flex:1 1 120px!important}",
  "#opf-shell #opf-page-preset #opf-body .opf-step-body{padding:4px 10px 9px 12px!important;font-size:13px!important}",
  "#opf-shell #opf-page-preset #opf-body .opf-step-ref-row{flex-wrap:wrap!important}",
  "#opf-shell #opf-page-preset #opf-body #opf-qs-card .opf-qs-toggle{font-size:13.5px!important}",
  "#opf-shell #opf-page-preset #opf-body .opf-resum-row{flex-wrap:wrap!important}",

  // ================= 自备开局页 =================
  "#opf-shell #opf-page-library .opf-char-wrap{display:flex!important;flex-direction:column!important;gap:12px!important;max-width:100%!important;padding:0 14px 24px!important}",
  "#opf-shell #opf-page-library .opf-char-wrap .opf-col{min-width:0!important;gap:12px!important}",
  "#opf-shell #opf-page-library .opf-char-tools{flex-wrap:wrap!important;gap:6px!important}",
  "#opf-shell #opf-page-library .opf-char-tools .opf-btn{flex:1 1 140px!important;min-height:40px!important;font-size:13px!important}",
  "#opf-shell #opf-page-library .lib-kitlist{max-height:none!important}",
  "#opf-shell #opf-page-library .lib-kitrow{min-height:44px!important;padding:8px 6px!important}",
  "#opf-shell #opf-page-library .lib-kitname{font-size:14px!important}",
  "#opf-shell #opf-page-library .lib-entry{min-height:40px!important;padding:8px 4px!important}",
  "#opf-shell #opf-page-library .lib-entry-name{font-size:14px!important}",
  "#opf-shell #opf-page-library .lib-field input,#opf-shell #opf-page-library .lib-field select,#opf-shell #opf-page-library .lib-field textarea{font-size:14px!important;min-height:38px!important;padding:8px 10px!important}",
  "#opf-shell #opf-page-library .lib-field textarea{min-height:88px!important}",
  "#opf-shell #opf-page-library .lib-chip span{max-width:56vw!important}",
  "#opf-shell #opf-page-library .opf-lib-editor-hd{flex-wrap:wrap!important}",

  // ================= 世界书页 =================
  "#opf-shell #opf-page-world.active{display:flex!important;flex-direction:column!important;overflow:hidden!important}",
  "#opf-shell #opf-page-world .opf-ph{flex:none!important}",
  "#opf-shell #opf-page-world .opf-ph-rule{flex:none!important}",
  "#opf-shell #opf-page-world #opf-lside{position:static!important;flex:1 1 auto!important;display:flex!important;flex-direction:column!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;top:auto!important;bottom:auto!important;left:auto!important;transform:none!important;overflow:hidden!important;padding:0 14px 14px!important;background:transparent!important;border:0!important;box-shadow:none!important;z-index:auto!important;font-size:13px!important}",
  "#opf-shell #opf-page-world #opf-lside-head{padding:10px 0 8px!important;font-size:14px!important;gap:8px!important}",
  "#opf-shell #opf-page-world .opf-lside-ico{min-width:36px!important;min-height:36px!important;font-size:14px!important;border-radius:8px!important}",
  "#opf-shell #opf-page-world #opf-lside-tools{gap:6px!important;padding:4px 0 6px!important}",
  "#opf-shell #opf-page-world #opf-lside-tools .opf-step-act{min-height:36px!important;font-size:12.5px!important}",
  "#opf-shell #opf-page-world #opf-lside-filter{flex:1 1 100%!important;width:100%!important;margin:2px 0!important;min-height:38px!important;font-size:13px!important;padding:8px 10px!important}",
  "#opf-shell #opf-page-world #opf-lside-cat{flex:1 1 100%!important;min-width:0!important;min-height:38px!important;font-size:13px!important;padding:8px 8px!important}",
  "#opf-shell #opf-page-world #opf-lside-count{width:auto!important;padding:4px 0!important;font-size:11.5px!important}",
  "#opf-shell #opf-page-world #opf-lside-list{padding:2px 0 8px!important}",
  "#opf-shell #opf-page-world .opf-wi-row{min-height:40px!important;align-items:center!important;padding:6px 4px!important;font-size:12.5px!important}",
  "#opf-shell #opf-page-world .opf-wi-row input{width:18px!important;height:18px!important;margin-top:0!important;flex:none!important}",
  "#opf-shell #opf-page-world .opf-wi-cat{font-size:12px!important;padding:4px 9px!important;line-height:1.5!important}",
  "#opf-shell #opf-page-world .opf-wi-cat-row{margin:8px 0 3px!important;gap:6px!important}",
  "#opf-shell #opf-page-world .opf-cat-all{min-height:30px!important;padding:3px 9px!important;font-size:11.5px!important}",
  "#opf-shell #opf-page-world .opf-wi-sub{min-height:34px!important;font-size:12px!important;padding:5px 9px!important}",
  "#opf-shell #opf-page-world .opf-lside-hint{font-size:12.5px!important;line-height:1.6!important;padding:10px 2px!important}",

  // ================= 设置页 =================
  "#opf-shell #opf-page-settings .opf-char-wrap{display:block!important;max-width:100%!important;padding:0 14px 24px!important}",
  "#opf-shell #opf-page-settings .opf-shx-cfg{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:8px!important;padding:2px 0 6px!important}",
  "#opf-shell #opf-page-settings .opf-shx-cfg .opf-opt{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:4px!important;width:100%!important;font-size:13px!important;min-height:0!important}",
  "#opf-shell #opf-page-settings .opf-ref-input,#opf-shell #opf-page-settings select.opf-ref-input,#opf-shell #opf-page-settings input.opf-ref-input{width:100%!important;min-width:0!important;flex:1 1 100%!important;min-height:38px!important;font-size:14px!important;padding:9px 10px!important}",
  "#opf-shell #opf-page-settings .opf-opt{font-size:13px!important;min-height:34px!important}",
  "#opf-shell #opf-page-settings .opf-sec-label{font-size:12.5px!important;letter-spacing:1px!important}",
  "#opf-shell #opf-page-settings .opf-dim{font-size:12.5px!important;line-height:1.6!important}",
  "#opf-shell #opf-page-settings #opf-set-status{font-size:12.5px!important}",
  "#opf-shell #opf-page-settings #opf-rx-modelall{max-height:46vh!important;font-size:12px!important}",
  "#opf-shell #opf-page-settings #opf-rx-modelall-wrap{max-width:100%!important}",
  "#opf-ui-theme .opf-theme-pick{display:flex!important;flex-wrap:wrap!important;gap:8px!important}",
  "#opf-ui-theme .opf-theme-chip{flex:1 1 30%!important;min-height:38px!important;font-size:13px!important}",
  "#opf-ui-layout .opf-theme-pick{gap:8px!important}",
  "#opf-ui-layout .opf-theme-chip{flex:1 1 30%!important;min-height:38px!important;font-size:13px!important}",
  "#opf-shell #opf-page-settings .opf-sec{margin-top:12px!important}",

  // ================= 强制手机时的大屏居中 =================
  // 只有用户手动选「手机」（#opf-shell.opf-force-mobile）才限宽居中；auto 手机版不吃这条，保持全宽。
  "#opf-shell.opf-force-mobile .opf-page{max-width:860px!important;margin:0 auto!important}",
  "#opf-shell.opf-force-mobile #opf-page-preset #opf-body{max-width:860px!important;margin:0 auto!important}",
  "#opf-shell.opf-force-mobile #opf-page-preset #opf-actions{max-width:860px!important;left:50%!important;right:auto!important;width:100%!important;transform:translateX(-50%)!important}",

  "}",

  "@media (max-width:380px){",
  // 320~380：顶栏与底栏再收紧一点
  "#opf-shell #opf-shell-head{padding:0 6px!important;gap:4px!important}",
  "#opf-shell-head #opf-nav-toggle{width:34px!important;height:34px!important;min-width:34px!important;font-size:16px!important}",
  "#opf-shell #opf-shell-title{font-size:14px!important;letter-spacing:.5px!important}",
  "#opf-shell #opf-tx-status,#opf-shell #opf-tx-status.opf-tx-status{width:32px!important;min-width:32px!important;height:32px!important}",
  "#opf-shell #opf-chrome-world,#opf-shell #opf-chrome-settings,#opf-shell #opf-shell-close{width:34px!important;min-width:34px!important;height:34px!important;font-size:14px!important}",
  "#opf-shell #opf-page-preset #opf-actions .opf-btn{font-size:12.5px!important;min-height:38px!important}",
  "#opf-shell .opf-ph-title{font-size:20px!important}",
  "}",
  "@media " + OPF_MOBILE_MEDIA + " and (max-height:700px){#opf-shell #opf-shell-body #opf-nav#opf-nav{padding-top:52px!important}#opf-shell #opf-shell-body #opf-nav#opf-nav .opf-nav-group{padding:9px 10px 3px!important}#opf-shell #opf-shell-body #opf-nav#opf-nav .opf-tab{min-height:40px!important;padding:8px 12px!important}#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-nav-recent{padding-top:6px!important}#opf-shell #opf-shell-body #opf-nav#opf-nav #opf-nav-recent .nr-row{min-height:28px!important}}",
].join("");

function injectMobileCSS() {
  if (!getEl(NS + "_css_mobile")) {
    try {
      var st = document.createElement("style");
      st.id = NS + "_css_mobile";
      st.textContent = MOBILE_CSS + (typeof MOBILE_PAGES_CSS === "string" ? MOBILE_PAGES_CSS : "");
      document.head.appendChild(st);
    } catch (e) { opfErr("mobile css", e); }
  }
  // 注入完立刻接线：应用当前布局模式 + 往设置页塞「界面布局」选择器
  try { opfApplyLayoutMode(); } catch (e) { opfErr("layout mode", e); }
  try { opfInstallLayoutUI(); } catch (e) { opfErr("layout ui", e); }
}

// ============================================================================
// 布局模式（自动 / 手机 / 桌面）—— 只控制 96/97 的手机媒体块是否生效
//   auto：交给浏览器按 OPF_MOBILE_MEDIA 判断
//   mobile：把手机媒体块改成 all，任何宽度都走手机版式
//   desktop：改成 not all，任何宽度都走桌面版式（窄屏可能溢出，属用户自选）
// 380px 那块保持纯宽度，不受模式影响。
// ============================================================================
var OPF_LAYOUT_MODES = [
  { id: "auto", label: "自动（跟随屏幕）", hint: "窄屏或横屏粗指针设备自动用手机版式" },
  { id: "mobile", label: "手机", hint: "任何屏幕都强制手机版式（单列 + 抽屉导航）" },
  { id: "desktop", label: "桌面", hint: "任何屏幕都强制桌面版式" }
];
function opfLayoutMode() {
  try {
    var s = getSettings();
    var m = s && s.uiLayout;
    return (m === "mobile" || m === "desktop") ? m : "auto";
  } catch (e) { return "auto"; }
}
function opfLayoutIsMobile() {
  var m = opfLayoutMode();
  if (m === "mobile") return true;
  if (m === "desktop") return false;
  try { return !!(typeof window !== "undefined" && window.matchMedia && window.matchMedia(OPF_MOBILE_MEDIA).matches); }
  catch (e) { return false; }
}
function opfApplyLayoutMode() {
  var mode = opfLayoutMode();
  var sh = getEl("opf-shell");
  if (sh && sh.classList) {
    sh.classList.toggle("opf-force-mobile", mode === "mobile");
    sh.classList.toggle("opf-force-desktop", mode === "desktop");
  }
  // 遍历手机样式表，只改「含 720px / pointer:coarse」的那几个顶层 media 块（96 与 97 共用同一个 style）
  var rules = [];
  try {
    var st = getEl(NS + "_css_mobile");
    if (st && st.sheet) rules = st.sheet.cssRules || [];
  } catch (e) { rules = []; }
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (!rule || !rule.media || typeof rule.media.mediaText !== "string") continue;
    var text = rule.media.mediaText;
    if (!rule.__opfOrig) {
      if (text.indexOf("720px") < 0 && text.indexOf("pointer:coarse") < 0) continue;
      rule.__opfOrig = text;
    }
    try {
      if (mode === "mobile") rule.media.mediaText = "all";
      else if (mode === "desktop") rule.media.mediaText = "not all";
      else rule.media.mediaText = rule.__opfOrig;
    } catch (e) { opfErr("layout media", e); }
  }
  // 让 ▤/☰ 的内联显隐跟上（40-shell 的 syncMobileChrome 会读 opfLayoutIsMobile）
  try { if (typeof syncMobileChrome === "function") syncMobileChrome(); } catch (e) {}
  // 非手机版式下收起抽屉
  if (!opfLayoutIsMobile() && typeof closeMobileNav === "function") { try { closeMobileNav(); } catch (e) {} }
}
function opfLayoutPickRender() {
  var box = getEl("opf-layout-pick");
  if (!box) return;
  box.textContent = "";
  var cur = opfLayoutMode();
  for (var i = 0; i < OPF_LAYOUT_MODES.length; i++) {
    (function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opf-theme-chip" + (cur === m.id ? " on" : "");
      b.textContent = m.label;
      b.title = m.hint;
      b.setAttribute("aria-pressed", cur === m.id ? "true" : "false");
      b.addEventListener("click", function () {
        try { var s = getSettings(); s.uiLayout = m.id; saveSettings(); } catch (e) { opfErr("layout save", e); }
        opfApplyLayoutMode();
        opfLayoutPickRender();
      });
      box.appendChild(b);
    })(OPF_LAYOUT_MODES[i]);
  }
}
function opfInstallLayoutUI() {
  var wrap = document.querySelector("#opf-page-settings .opf-char-wrap");
  if (!wrap) return;
  var box = getEl("opf-ui-layout");
  if (!box) {
    box = document.createElement("div");
    box.className = "opf-shx-cfg";
    box.id = "opf-ui-layout";
    var lbl = document.createElement("div");
    lbl.className = "opf-sec-label";
    lbl.textContent = "界面布局";
    box.appendChild(lbl);
    var pick = document.createElement("div");
    pick.className = "opf-theme-pick";
    pick.id = "opf-layout-pick";
    box.appendChild(pick);
    // 插在「界面风格」块之后；还没建就先放最前（95 皮肤随后会把风格块插到 wrap 首位，顺序仍是风格→布局）
    var theme = getEl("opf-ui-theme");
    if (theme && theme.parentNode === wrap) {
      if (theme.nextSibling) wrap.insertBefore(box, theme.nextSibling);
      else wrap.appendChild(box);
    } else {
      wrap.insertBefore(box, wrap.firstChild);
    }
  }
  opfLayoutPickRender();
}
