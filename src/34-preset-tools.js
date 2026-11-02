//@module 34-preset-tools — ① 开局预设：合规自检修复 + 备忘录 + 品质规范化
function rarityCanon(v){
  var k = String(v == null ? "" : v).trim().toLowerCase();
  var m = { "common":"common", "普通":"common", "uncommon":"uncommon", "优良":"uncommon", "优秀":"uncommon", "rare":"rare", "稀有":"rare", "epic":"epic", "史诗":"epic", "legendary":"legendary", "传说":"legendary", "mythic":"mythic", "神话":"mythic", "only":"only", "唯一":"only" };
  return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null;
}
function normalizeRarityTree(node, issues){
  if (Array.isArray(node)) { for (var ai = 0; ai < node.length; ai++) normalizeRarityTree(node[ai], issues); return node; }
  if (!node || typeof node !== "object") return node;
  for (var key in node) {
    if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
    var val = node[key];
    if ((key === "rarity" || key === "品质") && typeof val === "string") {
      var can = rarityCanon(val);
      if (can) { node[key] = can; } else if (String(val).trim()) { issues.push(String(val).trim()); }
    } else if (val && typeof val === "object") { normalizeRarityTree(val, issues); }
  }
  return node;
}

// ============ 生成规范与合规自检（《技能装备道具生成规则》提取） ============
var SPEC_PROMPT = {
  skill: "技能格式：名称 / 品质(唯一|普通|优良|稀有|史诗|传说|神话) / 类型(主动|被动) / 消耗(主动技必填：[攻击或动作: XXX MP/SP/MP与SP]) / 标签 / 效果 / 描述。\n主动技能分类：攻击技=消耗[攻击]、造成即时伤害、可附带其它效果；动作技=消耗[动作]、禁止即时伤害与威力，用于治疗/控制/增益/减益/功能等，可含DoT。\n标签规范：关联属性(必选其一：力量/敏捷/体质/智力/精神)；目标类型(必选：单体|范围:X|自身|环境，X为个数)；核心功能(必选：伤害(仅攻击技)|治疗|控制|增益|减益|功能)；威力(攻击技必填、动作技禁用，数值参照核心数值总表)；特性(可选：陷阱/防护/符文/家族/种族/职业/血脉/教会等)；可选机制(连击/多段(仅攻击技)/持续/召唤…或锻造/炼金/烹饪/裁缝等辅助)。\n效果：每行一条“效果名: 效果”；词条上限按品质(普通1/优良2/稀有2/史诗3/传说3/神话3，唯一依专规)；伤害必须标明类型；混合伤害标明占比；召唤写明具体等级或“与召唤者同级”。\n通用伤害类型：物理(动能/冲击/穿刺/挥砍等)、能量(元素/奥术/生命力等)、精神(心智/灵魂/意志)、真实(绕过常规防御，如炼金炸弹/强酸/法则侵蚀)。\n获取与品质限制：学习(书本/传授)/领悟(重大事件后)所得技能品质不高于角色自身生命层级；血脉觉醒/种族转换可一次性获得多个专属技能。\n登神提醒：要素/权能/法则/神位/神国不用技能格式、无品质/类型/标签字段；词条中“微弱 要素/权能/法则”仅指弱化映射，不得等同完整登神能力。",
  equip: "装备格式：名称 / 品质(唯一|普通|优良|稀有|史诗|传说|神话) / 类型(如 单手剑/巨斧/重甲/戒指…) / 标签 / 效果 / 描述。\n标签规范：攻防数值用[攻击: XXX]或[防御: XXX]；徽记用[徽记: XXX公会/商会/家族/皇室等]；必要时其它标签。\n徽记规则：有徽记=认证物品，可在正规市场流通；无徽记=无认证物品、灰色流通、可能被查扣；许可来源为公会/商会/家族身份或购买凭证/登记许可。\n效果：每行一条“效果名: 效果”；词条上限按品质(普通1/优良2/稀有2/史诗3/传说3/神话3，唯一依专规)；史诗品质三词条其一须为“微弱要素”效果、传说为“微弱权能”、神话为“微弱法则”（格式：微弱要素[名称]: 效果）。\n描述：叙事性描述。\n装备不增减持有者属性（世界规则）；品质七等与“唯一”品级用法同通用品级。\n登神提醒：词条若用“微弱 要素/权能/法则”仅指弱化映射，不得等同完整登神能力。",
  item: "道具格式：名称 / 品质(唯一|普通|优良|稀有|史诗|传说|神话) / 类型(消耗品|材料|…) / 标签 / 效果 / 描述。\n标签可用[徽记: XXX公会/商会/家族/皇室等]，徽记规则同装备（有徽记可正规流通，无徽记灰色流通）。\n效果：每行一条“效果名: 效果”；词条上限按品质(普通1/优良2/稀有2/史诗3/传说3/神话3)；描述：叙事性描述。",
  asset: "资产格式：名称 / 品质(唯一|普通|优良|稀有|史诗|传说|神话) / 类型(住宅|店铺|载具|工坊|城区|领地|产业组合|部队|权益…) / 标签 / 总空间 / 结算 / 位置 / 描述 / 内部资产。\n标签含义：拥有者(归属者)；上级资产(仅当同时拥有且为包含/管理/编制关系)；租用/使用者(自住可省)；用途(生产/仓储/经营…，自住可省)；状态(未启动/建设中/运营中/租赁中/自住/寄宿…)；模式(稳定/波动/停滞，经营类)；甲方/乙方/担保/协议类型(协议/商铺类)。\n总空间：具体建筑→“层/分区: 房间列表;面积:XXm²”用|分隔，卧室标注居住者、同类数量≥2用×数量；城区/领地→“地名+领地名: 建筑类型×数量: m²|空闲面积: m²”；载具/部队/权益→记录尺寸/容量/编制/覆盖范围，无空间概念填“不适用”。\n结算：货币统一用 Z（如“资产估价: X Z 当地货币名”）；动态结算按类型填——运营中“资产估价: X Z;预计[周期]收益: Y Z”或产物×数量；租赁中固定周期租金；未启动/建设中“当前无收益或支出”；无固定收支“无固定收支/不适用”；周期结算须有“上次结算日: YYYY-MM-DD 或 尚未结算”；金额估值收益率参考《经济价格指南》资产结算基准。\n位置：实际所在地点；无实体位置填管理方/登记地/适用范围/不适用。\n描述：环境/区域/外观/用途与现状等叙事性描述；涉及协议时记录协议内容。\n内部资产：可独立计数/使用/产生作用的组成部分才记录，无需追踪填{}；每项含 品质(七等) / 标签([类型:][位置:X层/房间/分区][状态:]…) / 数量(正整数) / 效果(每行一条“效果名: 效果”，按类型写产出/生产加成/功能效果/基础属性，无实际效果填{}) / 描述 / 总占用空间(自身布局与全部数量占用合计，标明单位)。\n归属与结算：并入上级资产的内部资产采用移动非复制、同类合并数量相加；需独立结算/转让/管理的资产保留为独立资产并填[上级资产:…]，其结算填“并入[上级资产名]统一结算”或自行结算。"
};
var COMPLIANCE_SPEC = "—— 以下为 技能/装备/道具/资产 生成规范 ——\n[技能规范]\n" + SPEC_PROMPT.skill + "\n[装备规范]\n" + SPEC_PROMPT.equip + "\n[道具规范]\n" + SPEC_PROMPT.item + "\n[资产规范]\n" + SPEC_PROMPT.asset;

function addComplianceToggle(root){
  if (!root || getEl("opf-ck-ac")) return;
  var lab = document.createElement("label"); lab.className = "opf-opt"; lab.title = "生成初稿/重新汇总后，自动按《技能装备道具生成规则》对技能/装备/道具/资产做一次自检修复";
  var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "opf-ck-ac";
  cb.checked = !!getSettings().autoCompliance;
  cb.addEventListener("change", function(){ getSettings().autoCompliance = !!cb.checked; saveSettings(); });
  lab.appendChild(cb); lab.appendChild(document.createTextNode("生成后自检修复"));
  var opts = root.querySelectorAll(".opf-opts");
  if (opts && opts.length) { opts[opts.length - 1].appendChild(lab); } else { root.appendChild(lab); }
}
function maybeAutoCompliance(){
  try { if (!getSettings().autoCompliance) return; } catch (e) { return; }
  if (ST._complyBusy || ST._complyRun || ST._complyScheduled) return;
  ST._complyScheduled = true;
  setTimeout(function(){ ST._complyScheduled = false; runCompliance(); }, 350);
}
async function runCompliance(){
  if (ST._complyBusy || ST._complyRun) return;
  if (!ST.finalJson) return;
  ST._complyBusy = true;
  renderRunButtons();
  renderDirsStatus("🔍 正在按《技能装备道具生成规则》自检修复…");
  try {
    var prev = JSON.stringify(ST.finalJson);
    var cur = prev.length > 12000 ? prev.slice(0, 12000) + "……(截断)" : prev;
    var complyTask = "【合规自检与修复】请用下面“技能/装备/道具/资产生成规范”逐类检查开局预设 JSON：字段是否齐全、品质是否为七等、标签/消耗/效果/结算/总空间/内部资产等是否符合规范；只修正不合规处，其余内容保持原样，最后完整输出修订后的开局预设 JSON，放在 " + fence() + "text 代码块中。\n\n[生成规范]\n" + COMPLIANCE_SPEC + '\n\n' + buildSystemContent();
    var complyUser = "[当前开局预设 JSON]\n" + cur;
    var msgs = sxMessages(complyTask, complyUser);
    ST._complyRun = true;
    try {
      var resp = await callModel(msgs);
      var ex = extractJson(resp);
      if (ex.ok && ex.obj) {
        var changed = JSON.stringify(ex.obj) !== prev;
        ST.finalJson = ex.obj;
        var warns = validatePreset(ex.obj);
        renderJsonOut(ex.obj, warns);
        if (ST.elPre && ST.elPre.final) ST.elPre.final.textContent = (resp || "").slice(0, 4000);
        setPhase("final", "ok");
        renderDirsStatus(changed ? "✓ 已按规范完成自检修复（可继续精修或导出）" : "✓ 自检通过，无需修改");
        toast(changed ? "自检并修复完成" : "自检通过，无需修改", changed ? "info" : "success");
      } else {
        renderDirsStatus("⚠ 自检结果无法解析成 JSON（已跳过修复），可重汇总后再试");
        toast("自检未通过解析，跳过", "warning");
      }
    } catch (e) {
      opfErr("compliance", e);
      renderDirsStatus("自检出错，可手动精修或重汇总");
    } finally { ST._complyRun = false; }
  } finally {
    ST._complyBusy = false;
    renderRunButtons();
  }
}
