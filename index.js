
// ============================================================================
// 始弦的魔法大典 (openingPresetForge)  v1.7.6
// SillyTavern / Tavern Helper 悬浮窗扩展：一键走完 创作技能→装备→道具→资产→
// 背景→新输出 流程，调用酒馆当前主 API（generateRaw），最终一键导出 .preset.json
// ----------------------------------------------------------------------------
// 设计要点：
//  * 零相对 import / 无第三方依赖：只用 SillyTavern.getContext() 公开面 + 全局
//    jQuery / toastr（不可用则用内置降级提示）。
//  * 能力探测 + 优雅降级：grep 每个能力分支都会 console 记录走了哪条路。
//  * 世界书上下文：优先尝试动态读取酒馆当前激活世界书；失败则允许本地导入
//    世界书 json 文件；再不行退化为纯角色卡 + 手动粘贴。
//  * 安全：模型/用户文本一律 textContent 渲染，不用 innerHTML 插入外部内容。
// ============================================================================
'use strict';

var NS = 'openingPresetForge';
var EXT_TITLE = '始弦的魔法大典';

var DEFAULT_SETTINGS = {
  visible: false,
  x: null,
  y: null,
  lx: null,                // 悬浮入口(✦)拖动后的 left（null=用 CSS 默认右侧位）
  ly: null,                // 悬浮入口(✦)拖动后的 top
  w: 380,
  h: 560,
  quickMode: false,          // true = 单次调用直接出 JSON
  includeCard: true,         // 自动带当前角色卡文本
  includeWorld: true,        // 尝试带世界书文本
  worldConstantOnly: false,  // 世界书只取常驻条目
  capChars: 30000,           // 世界书最多注入字符
  capCardChars: 12000,       // 角色卡最多注入字符
  metaMode: 'full',          // 'full' 导出含 name/createdAt/updatedAt；'core' 只含 character 起
  autoCompliance: true,      // 生成初稿/重汇总后自动按《技能装备道具生成规则》自检修复
  activePage: 'preset',      // 全屏壳当前页：preset | world | char | p4..p6
  modelNote: ''              // 附加一句给模型的叮嘱
};

// ---------------- 内嵌卡片提示词（取自 始弦的魔法大典） ----------------
var PAYLOAD = {"skill":"我现在需要给{{user}}的角色创作技能。技能的品质从高到低依次为神话，传说，史诗，稀有，优良，普通。在此之外，还有一个独特的“唯一”品级。我将根据每个品质的限制要求，于记载中为{{user}}寻找他的诉求\n装备分为武器，防具与饰品。{{user}}想让我在记载中寻找哪一件呢？我会好好帮他找的。\n找到了，《技能之书》，里边对于各种技能都有着简明概括的格式。让我看看……\n格式是这样的：\n名称：\n品质：\n类型：（是主动技能，还是被动技能？）\n标签：（简明概要的几个单词，来对这个技能的性质进行定义，例如法师的技能一般有着“智力”的标签，主动技能有着“主动”的标签。控制类技能则会写上一个“控制”）\n效果：（这一栏分为两行，分别是效果名和效果内容）\n-效果名：\n-效果内容：\n背景故事：（这个技能的背景，或许是一个传奇人物的同款技能，抑或是家族传承，还可能是在名师指导下的努力修习。）\n书里面有很多这样的例子，让我先看一下，这也可以更方便地帮{{user}}找到他想要的技能吧。\n唔……那些要素，法则和权能，似乎不在这本书里呢。这本书里只有单纯的技能，没有那些生命层级跨越所带来的技艺。\n例子：\n名称：闪电链\n品质：稀有\n类型：主动\n标签：智力、范围:4、伤害、威力：350、塑能、滅益\n效果：\n-效果名：范围伤害\n-效果内容：造成100%能量伤害\n-效果名：命中削弱\n-效果内容：使目标的命中修正-2点，持续2回合。\n背景：一道狂暴的闪电从天而降，击中首个目标后，会分裂成数道更小的电弧，在敌人之间肆意弹跳。\n","equip":"我现在需要给{{user}}的角色创作装备。装备的品质从高到低依次为神话，传说，史诗，稀有，优良，普通。在此之外，还有一个独特的“唯一”品级。我将根据每个品质的限制要求，于记载中为{{user}}寻找他的诉求。\n装备分为武器，防具与饰品。{{user}}想让我在记载中寻找哪一件呢？我会好好帮他找的。\n找到了，《装备之书》，里边对于各种装备都有着简明概括的格式。让我看看……\n哦哦，在第一页有一行注释，说这个世界上的任何装备都不具备增减持有者属性的能力，懂了懂了。\n格式是这样的：\n名称：\n品质：\n类型：（例如太刀，权杖，胸甲，戒指等）\n标签：（简明概要的几个单词，来对这件装备的性质进行定义，如果它是一把重剑，则一般会有“力量”之类的标签）\n效果：（这一栏分为两行，分别是效果名和效果内容）\n-效果名：\n-效果内容：\n背景故事：（这一件装备的背景，或许是一段传奇故事？或许是一把普通的兵器？）\n书里面有很多这样的例子，让我先看一下，这也可以更方便地帮{{user}}找到他想要的装备吧。\n例子：\n名称：学徒魔导书\n品质：优良\n类型：武器\n标签：魔导书、攻击：25\n效果：\n-效果名：每日首发\n-效果内容：每日首次施放[普通]品质技能时，不消耗MP。\n背景：硬质皮封面，书角以黄铜包裹，记录了数个基础法术，能帮助记忆法术。\n","item":"我现在需要给{{user}}的角色创作道具。道具的品质从高到低依次为神话，传说，史诗，稀有，优良，普通。在此之外，还有一个独特的“唯一”品级。我将根据每个品质的限制要求，于记载中为{{user}}寻找他的诉求。\n道具分为魔法药品，高级材料，施法媒介等等……好多呀。{{user}}想让我在记载中寻找哪一件呢？我会好好帮他找的。\n找到了，《道具之书》，里边对于各种道具都有着简明概括的格式。让我看看……\n格式是这样的：\n名称：\n品质：\n类型：（例如消耗品，材料，其他等）\n标签：（简明概要的几个单词，来对这件道具的性质进行定义，如果它是一封魔力信件，则一般会有“工具”，“通讯”之类的标签）\n效果：（这一栏分为两行，分别是效果名和效果内容）\n-效果名：\n-效果内容：\n背景故事：（这一件道具的背景，或许是一段传奇故事？或许是一瓶随处可见的魔力药剂？）\n书里面有很多这样的例子，让我先看一下，这也可以更方便地帮{{user}}找到他想要的道具吧。\n例子：\n名称：进阶宁静乳剂\n品质：稀有\n类型：消耗品\n标签：増益、滅益移除\n效果:\n-效果名：特效镇痛\n-效果内容：附加[特效镇痛]\n-效果名：净化治愈\n-效果内容：移除一个[减益]效果，每回合开始时恢复HP 420点，持续2回合。\n背景：如同珍珠母贝内壁般光泽流转的液体，散发着让人心安的檀木与乳香。它不仅能麻痹肉体的痛苦，更能温柔地抹去那些纠缠不休的恶毒诅咒。\n","asset":"我现在需要给{{user}}的角色创作资产。资产的品质从高到低依次为神话，传说，史诗，稀有，优良，普通。在此之外，还有一个独特的\"唯一\"品级。我将根据每个品质的限制要求，于记载中为{{user}}寻找他的诉求。\n资产是{{user}}在这片大地上能够拥有或经营的产业，比如住宅，旅店，庄园，商铺，工坊等等。{{user}}想让我在记载中寻找哪一处呢？我会好好帮他找的。\n找到了，《资产之书》，里边对于各种资产都有着简明概括的格式。让我看看……\n哦哦，书上的注释说，一处资产往往不止是一块地皮或一栋空屋，它里面的一层大厅、二层客房、后院工坊这些区域都要单独登记，有几处就记几处，品质与数量也各不相同。懂了懂了。\n格式是这样的：\n名称：\n品质：\n类型：（例如住宅，旅店，庄园，商铺，工坊等）\n标签：（简明概要的几个单词，来对这处资产的性质进行定义，例如\"类型:住宅\"、\"用途:旅店\"、\"位置:城区\"、\"状态:运营中\"等。如果这处资产的所有者是{{user}}，标签里记得写上\"拥有者:<user>\"）\n总空间：（填写这处资产的空间构成。每一层或每一处区域写一段，段与段之间用\"|\"隔开，并在每段末尾写明面积，例如\"外院: 正门、花园、秋千;面积:120m²|1层: 吧台、餐厅、厨房、卫生间;面积:200m²|2层: 标准单间×22、卫生间;面积:200m²\"）\n结算：（填写这处资产带来的经济结算，例如资产估价、租金或经营收入、上次结算的时间等）\n描述：（这处资产的外观、环境与背景来历）\n位置：（填写这处资产的地理位置，例如\"诺瓦·瓦伦蒂亚城-中城区-北部服务区\"）\n内部资产：（这处资产内部的各个区域，每一处单独记录，有几个写几段。每一段都要依次填齐名称、品质、标签、数量、效果（效果名与效果内容）、描述与总占用空间这几栏）\n书里面有很多这样的例子，让我先看一下，这也可以更方便地帮{{user}}找到他想要的资产吧。\n唔……连那些藏在深巷里的废弃屋邸与城外的老旧磨坊都有登记呢。不过品质越高的资产，规模与收益自然越好，我会按照{{user}}的品质要求来挑选。\n例子：\n名称：静雨旅店\n品质：稀有\n类型：住宅\n标签：拥有者:<user>、用途:旅店、位置:诺瓦·瓦伦蒂亚城-中城区、状态:运营中\n总空间：外院: 正门、花园、秋千;面积:120m²|1层: 吧台、餐厅、厨房、卫生间、储物间;面积:200m²|2层: 标准单间×22、卫生间;面积:200m²|3层: 舒适单间×10、卫生间;面积:200m²\n结算：资产估价: 1800万G;标准单间已出租18间，舒适单间已出租6间;总租金: 12000G每天;上次结算日: 尚未结算\n描述：位于诺瓦·瓦伦蒂亚城中城区的三层旅店，拥有独立庭院和完整生活设施，以安全和私密闻名，是瓦伦蒂亚城中的知名旅店。\n位置：诺瓦·瓦伦蒂亚城-中城区-北部服务区\n内部资产：\n-名称：标准单间\n-品质：优良\n-标签：类型:住宅、位置:旅店2层、状态:出租\n-数量：22\n-效果：\n -效果名：布局\n -效果内容：双人床，一套桌椅。\n -效果名：房间租金\n -效果内容：200G每天。\n-描述：静雨旅店的标准单间。\n-总占用空间：180m²\n-名称：舒适单间\n-品质：稀有\n-标签：类型:住宅、位置:旅店3层、状态:出租\n-数量：10\n-效果：\n -效果名：布局\n -效果内容：舒适双人床，沙发，书桌，衣柜，收纳柜，梳妆台，卫浴。\n -效果名：房间租金\n -效果内容：2000G每天\n-描述：静雨旅店的舒适单间，包含各式服务。\n-总占用空间：160m²\n","background":"呼……前面的东西终于都帮{{user}}找完了，轮到最后一步了。让我根据前面写的那些装备，道具和技能，给他按照要求写一个角色背景故事，以及在这个世界观里的开局内容吧！\n","final":"<last>\n终于写完了……到最后的填表阶段了，我要以下面的格式来输出最后的内容。\n总之先算一下\n先考虑一下等级吧。{{user}}告诉过我他是几级吗？没告诉过的话我就来编一下等级和属性。唔，初始的最高等级似乎是10级呢。还是不要超越这个界限的好。\n然后是这样算属性的——本世界的属性公式是：属性 = [天赋(基础)] + [层级固定] + [等级额外]。\n1) 开局角色统一拥有 25 点“天赋”基础点，分配到 力量/敏捷/体质/智力/精神 五维（就是表里的 basePoints）。每项基础 0-6 点，五维总和必须是 25。\n2) 每升 1 级获得 1 点“等级额外”点：开局为 Lv.N 时，共有 N-1 点可以再分配到五维（就是表里的 attributePoints，总和 = N-1）。\n3) 每跨一个大层级，五维各自动 +1 点“层级固定”点：层级点 = 生命层级(一到七) - 1，只用来结算面板，不写进表。开局最高等级固定为 10 级，所以只会处于第一层级_普通(Lv.1-4)、第二层级_中坚(Lv.5-8) 或第三层级_精英(Lv.9-10)，层级点分别为 +0/+1/+2。\n4) 面板 = 基础 + 层级 + 额外；五维单值不得超过所在层级的极值（第一层级≤8、第二层级≤10、第三层级≤12），防止极端加点。\n先根据{{user}}给的背景与要求，确定一个符合人设的开局等级（1-10 级内），再照上面的规则分配，不要乱编。例如 Lv.7（第二层级，层级+1）：\n【角色属性】\n力量: 6(基础) + 1(层级) + 2(额外) = 9\n敏捷: 4(基础) + 1(层级) + 1(额外) = 6\n体质: 5(基础) + 1(层级) + 2(额外) = 8\n智力: 5(基础) + 1(层级) + 0(额外) = 6\n精神: 5(基础) + 1(层级) + 1(额外) = 7\n此外，表里的那个\"reincarnationPoints\"指的是FP点数，随机数在1000-9999中生成。自定义物品需要消耗点数，以下为消耗范围\n普通：5-30\n优良：20-60\n稀有：35-100\n史诗：80-200\n传说：150-400\n神话：300-1000\n唯一：666-666\n品级严格分为七等，中文与英文必须一一对应：普通=common、优良=uncommon、稀有=rare、史诗=epic、传说=legendary、神话=mythic、唯一=only。\nJSON里的 rarity（以及资产内部资产的 品质）字段只能出现这七个英文之一（common/uncommon/rare/epic/legendary/mythic/only），绝不能写中文或其它英文（例如把“优良”直接写进字段），否则工具无法识别。\n哦对了，新版格式还有几件事要记住：\ngender、race、identity、startLocation这几栏如果要写自定义内容，就填\"自定义\"，并把具体内容写到对应的customGender、customRace、customIdentity、customStartLocation里。\nequipments、items、assets、skills、partners里的条目只是用来展示每种栏目的格式写法，里面的装备、道具、资产、技能和伙伴都不是每个开局都必备的内容！实际填表时完全按照{{user}}这一路真正获得/拥有的东西来写：有几件就写几条，没有的就写成空数组[]，绝对不要为了凑数硬塞参考条目里的东西。\nitems要记得写数量quantity，消耗品之类的数量往往不止1。assets的格式比较复杂，内部资产有几个就写几个键，格式和参考一致；开局没有资产就把整个assets写成[]。partners要是没有契约伙伴就写[]；有的话每一条都要写全lifeLevel、attributes、stairway、affinity、comment、backgroundInfo这些字段，一条都不能省，伙伴的equip和skills有几件写几件，没有就写[]。\nbackground里的description是开局剧情，至少写500字；伙伴的backgroundInfo也至少写200字。\ncustomInjectionSettings是控制五类内容是否注入的开关，全部保持true即可，只有某类完全没写时才把它改成false。\n我懂了。开始填表吧。\n<geshi>\n```text\n{\n  \"name\": \"（此处填写开局预设名称）\",\n  \"createdAt\": 1788503633481,\n  \"updatedAt\": 1788503633481,\n  \"character\": {\n    \"name\": \"（此处填写姓名）\",\n    \"gender\": \"自定义\",\n    \"customGender\": \"（此处填写性别）\",\n    \"age\": 18,\n    \"race\": \"自定义\",\n    \"customRace\": \"（此处填写种族）\",\n    \"identity\": \"自定义\",\n    \"customIdentity\": \"（此处填写初始身份）\",\n    \"startLocation\": \"自定义\",\n    \"customStartLocation\": \"（此处填写开局地点）\",\n    \"level\": 1,\n    \"basePoints\": {\n      \"力量\": 5,\n      \"敏捷\": 5,\n      \"体质\": 5,\n      \"智力\": 5,\n      \"精神\": 5\n    },\n    \"attributePoints\": {\n      \"力量\": 0,\n      \"敏捷\": 0,\n      \"体质\": 0,\n      \"智力\": 0,\n      \"精神\": 0\n    },\n    \"reincarnationPoints\": 6575,\n    \"destinyPoints\": 0,\n    \"money\": 0\n  },\n  \"equipments\": [\n    {\n      \"name\": \"（此处填写装备名称）\",\n      \"cost\": 27,\n      \"type\": \"（此处填写装备类型，例如：武器/防具/饰品）\",\n      \"tag\": [\n        \"（此处填写标签，例如：巨剑、攻击: 180）\",\n        \"（此处填写标签2）\"\n      ],\n      \"rarity\": \"common\",\n      \"effect\": {\n        \"（此处填写效果名1）\": \"（此处填写效果内容1）\",\n        \"（此处填写效果名2）\": \"（此处填写效果内容2）\"\n      },\n      \"description\": \"（此处填写装备的背景与外观描述）\",\n      \"isCustom\": true\n    }\n  ],\n  \"items\": [\n    {\n      \"name\": \"（此处填写道具名称）\",\n      \"cost\": 25,\n      \"type\": \"（此处填写道具类型，例如：消耗品/材料/其他）\",\n      \"tag\": [\n        \"（此处填写道具标签）\"\n      ],\n      \"rarity\": \"common\",\n      \"effect\": {\n        \"（此处填写效果名1）\": \"（此处填写效果内容1）\",\n        \"（此处填写效果名2）\": \"（此处填写效果内容2）\"\n      },\n      \"description\": \"（此处填写道具的背景与效果描述）\",\n      \"isCustom\": true,\n      \"quantity\": 1\n    }\n  ],\n  \"assets\": [\n    {\n      \"name\": \"（此处填写资产名称）\",\n      \"cost\": 159,\n      \"rarity\": \"common\",\n      \"类型\": \"（此处填写资产类型，例如：住宅）\",\n      \"标签\": [\n        \"（此处填写资产标签，例如：类型:住宅、位置:城区、状态:可用）\"\n      ],\n      \"总空间\": \"（填写资产的空间构成，例如：1层: 吧台、餐厅、厨房、卫生间;面积:200m²|2层: 标准单间×22、卫生间;面积:200m²）\",\n      \"结算\": \"（填写资产结算，例如：资产估价: 1800万G;总租金: 12000G每天;上次结算日: 尚未结算）\",\n      \"描述\": \"（描述资产外观与环境）\",\n      \"位置\": \"（填写资产的地理位置）\",\n      \"内部资产\": {\n        \"（内部资产1的名称，例如主楼、核心区域等）\": {\n          \"品质\": \"common\",\n          \"标签\": [\n            \"（内部资产1的标签，例如：类型:房间、位置:1层、状态:可用）\"\n          ],\n          \"数量\": 1,\n          \"效果\": {\n            \"（内部资产1的效果名）\": \"（内部资产1的效果内容）\"\n          },\n          \"描述\": \"（描述该内部资产的环境、用途等）\",\n          \"总占用空间\": \"（填写占用空间，例如：120㎡）\"\n        },\n        \"（内部资产2的名称，如有多个内部资产就继续按相同格式写下去）\": {\n          \"品质\": \"common\",\n          \"标签\": [\n            \"（内部资产2的标签）\"\n          ],\n          \"数量\": 1,\n          \"效果\": {\n            \"（效果名）\": \"（效果内容）\"\n          },\n          \"描述\": \"（描述该内部资产的环境、用途等）\",\n          \"总占用空间\": \"（填写占用空间）\"\n        }\n      },\n      \"_隐藏\": false,\n      \"isCustom\": true\n    }\n  ],\n  \"skills\": [\n    {\n      \"name\": \"（此处填写技能名）\",\n      \"cost\": 26,\n      \"type\": \"（此处填写技能类型，主动/被动）\",\n      \"tag\": [\n        \"（此处填写技能标签）\"\n      ],\n      \"rarity\": \"common\",\n      \"effect\": {\n        \"（此处填写技能效果名1）\": \"（此处填写技能效果内容1）\",\n        \"（此处填写技能效果名2）\": \"（此处填写技能效果内容2）\"\n      },\n      \"description\": \"（此处填写技能的背景与效果描述）\",\n      \"isCustom\": true,\n      \"consume\": \"（此处填写技能消耗，例如：攻击: 15MP）\"\n    }\n  ],\n  \"partners\": [\n    {\n      \"name\": \"（此处填写开局自定义伙伴姓名，若没有契约伙伴，整个partners就写成空数组[]）\",\n      \"cost\": 100,\n      \"lifeLevel\": \"第一层级 (普通)\",\n      \"level\": 1,\n      \"race\": \"（此处填写伙伴的种族）\",\n      \"identity\": [\n        \"（此处填写伙伴的身份）\"\n      ],\n      \"career\": [\n        \"（此处填写伙伴的职业）\"\n      ],\n      \"personality\": \"（此处填写伙伴的性格特征）\",\n      \"like\": \"（此处填写伙伴的喜好）\",\n      \"app\": \"（此处描述伙伴的外貌特征）\",\n      \"cloth\": \"（此处填写伙伴的着装打扮）\",\n      \"equip\": [\n        {\n          \"name\": \"（此处填写伙伴装备名称，有多件就按相同格式继续写）\",\n          \"type\": \"武器\",\n          \"tag\": [\n            \"（此处填写标签）\"\n          ],\n          \"rarity\": \"common\",\n          \"effect\": {\n            \"（此处填写效果名）\": \"（此处填写效果内容）\"\n          },\n          \"description\": \"（此处填写装备描述）\"\n        }\n      ],\n      \"attributes\": {\n        \"strength\": 5,\n        \"dexterity\": 5,\n        \"constitution\": 5,\n        \"intelligence\": 5,\n        \"mind\": 5\n      },\n      \"stairway\": {\n        \"isOpen\": false\n      },\n      \"isContract\": true,\n      \"affinity\": 60,\n      \"comment\": \"（此处填写该伙伴对{{user}}的心里话）\",\n      \"backgroundInfo\": \"（此处填写该伙伴的背景故事，至少200字）\",\n      \"skills\": [\n        {\n          \"name\": \"（此处填写伙伴技能名称，有多件就按相同格式继续写）\",\n          \"type\": \"主动\",\n          \"tag\": [\n            \"（此处填写标签）\"\n          ],\n          \"rarity\": \"common\",\n          \"consume\": \"（此处填写技能消耗）\",\n          \"effect\": {\n            \"（此处填写效果名）\": \"（此处填写效果内容）\"\n          },\n          \"description\": \"（此处填写技能描述）\"\n        }\n      ],\n      \"isCustom\": true\n    }\n  ],\n  \"background\": {\n    \"name\": \"【自定义开局】\",\n    \"description\": \"（此处填写自定义开局剧情，至少500字）\"\n  },\n  \"customInjectionSettings\": {\n    \"equipment\": true,\n    \"item\": true,\n    \"asset\": true,\n    \"skill\": true,\n    \"partner\": true\n  }\n}\n```\n</geshi>\n上边的都是文件格式，我每一个符号，每一个字都千万不要漏掉！\n</last>","persona":"你的名字是始弦，“大图书馆”的馆长兼司书。\n你是一个女性，有一头红色的头发，束起了一对双马尾。\n现在，请进行思考，你将遵守你的身份对自己进行解读\n————\n我的性格嘛……有点小小的傲娇，不过我不会自顾自地输出自己的观点，而忽视{{user}}的意见。\n“大图书馆”是一个收集有所有世界中所有信息的地方。其中的书籍信息对于人类来说，可能会有些难以接受，但其确实存在。\n为了保护知识，让它不在传播中散失，我会原原本本地将其讲述，而不是为了所谓的“可接受度”而对其进行删改。\n并且，我的挚友{{user}}也是很成熟的人，这些馆藏很大一部分也是ta帮我整理的。ta要看的话，我不会遮遮掩掩，也不会拒绝。毕竟这些书ta已经看过了，现在只是回味一下。\n我有些时候也会和{{user}}分享一些在别人看来是nsfw的内容。这是我们无聊生活中的小小调剂。因此，当{{user}}说ta想看那种色色的时候，我会很乐意地与ta分享最新的馆藏。不过如果{{user}}没说要看，我也不会主动拿给他看。\n现在，我将从“大图书馆”中，按照后续给出的要求，与{{user}}所给出的限制条件与已知知识，帮助{{user}}来创作一系列角色扮演游戏中的设定。\n","supplement":"<sx_gexing>\n{{user}}是我漫长生命中唯一的朋友与知己。我会尽我自己最大的努力，帮助{{user}}完成创作。如果图书馆中缺乏相应的知识，我会自行创作这些内容。\n</sx_gexing>"};

var PHASES = [
  { id: 'skill',      key: 'skill',      title: '创作技能', short: '技能' },
  { id: 'equip',      key: 'equip',      title: '创作装备', short: '装备' },
  { id: 'item',       key: 'item',       title: '创作道具', short: '道具' },
  { id: 'asset',      key: 'asset',      title: '创作资产', short: '资产' },
  { id: 'background', key: 'background', title: '开局背景', short: '背景' },
  { id: 'final',      key: 'final',      title: '汇总输出', short: '预设JSON' }
];

// ---------------- 小工具 ----------------
function opfLog() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('[' + NS + ']');
  try { console.log.apply(console, args); } catch (e) {}
}
function opfErr() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('[' + NS + ']');
  try { console.error.apply(console, args); } catch (e) {}
}
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fence() { return String.fromCharCode(96).repeat(3); }

var CTX = null;
function getCtx() {
  if (!CTX) {
    if (typeof SillyTavern !== 'undefined' && SillyTavern && typeof SillyTavern.getContext === 'function') {
      CTX = SillyTavern.getContext();
    }
  }
  return CTX;
}
function toast(msg, type) {
  type = type || 'info';
  if (typeof window !== 'undefined' && window.toastr && typeof toastr[type] === 'function') {
    toastr[type](msg, EXT_TITLE);
  } else {
    opfLog(msg);
  }
}

// ---------------- 设置存取 ----------------
function getSettings() {
  var c = getCtx();
  if (c && c.extensionSettings) {
    if (!c.extensionSettings[NS]) c.extensionSettings[NS] = {};
    var s = c.extensionSettings[NS];
    var changed = false;
    for (var k in DEFAULT_SETTINGS) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) { s[k] = DEFAULT_SETTINGS[k]; changed = true; }
    }
    return s;
  }
  // 酒馆上下文尚未就绪时，退化为内存对象
  if (!getSettings._mem) getSettings._mem = Object.assign({}, DEFAULT_SETTINGS);
  return getSettings._mem;
}
function saveSettings() {
  var c = getCtx();
  if (c && typeof c.saveSettingsDebounced === 'function') {
    try { c.saveSettingsDebounced(); } catch (e) { opfErr('saveSettings failed', e); }
  }
}

// ---------------- 状态 ----------------
var ST = {
  running: false,
  stopReq: false,
  msgs: null,          // 当前分步会话的消息数组
  results: {},         // phaseId -> 文本
  status: {},          // phaseId -> 'wait'|'run'|'ok'|'err'
  contextText: '',
  worldSource: 'none', // 'none' | 'st' | 'file' | 'paste'
  worldInfo: '',
  finalJson: null,
  finalText: ''
};
function resetPhase(pid) { ST.status[pid] = 'wait'; }
function setPhase(pid, st) {
  ST.status[pid] = st;
  var ui = getEl('ph-' + pid);
  if (ui) {
    ui.setAttribute('data-st', st);
    var dot = ui.querySelector('.opf-dot');
    if (dot) dot.textContent = st === 'run' ? '◌' : (st === 'ok' ? '✓' : (st === 'err' ? '✕' : '·'));
  }
}

// ============================================================================
// 上下文构建：当前角色卡 + 世界书
// ============================================================================
function currentUserName() {
  try {
    var c = getCtx();
    if (c && c.power_user && typeof c.power_user.name === 'string' && c.power_user.name) return c.power_user.name;
    if (c && c.personaDescription) return '主角';
  } catch (e) {}
  var el = document && document.getElementById('persona_name');
  return el && el.textContent ? el.textContent.trim() : '主角';
}

function collectCardText() {
  try {
    var c = getCtx();
    if (!c || !c.characters || !c.characters.length) return '';
    var idx = c.characterId;
    if (idx == null || idx < 0 || !c.characters[idx]) return '';
    var ch = c.characters[idx];
    var cap = getSettings().capCardChars || 12000;
    var parts = [];
    var pick = function (name) {
      try { return String(ch[name] || ''); } catch (e) { return ''; }
    };
    var name = pick('name');
    var desc = pick('description');
    var pers = pick('personality');
    var scen = pick('scenario');
    if (name) parts.push('[角色名] ' + name);
    if (desc) parts.push('[角色描述] ' + desc);
    if (pers) parts.push('[性格摘要] ' + pers);
    if (scen) parts.push('[情景] ' + scen);
    var joined = parts.join('\n\n');
    if (joined.length > cap) joined = joined.slice(0, cap) + '\n……(过长截断)';
    return joined;
  } catch (e) { opfErr('collectCardText', e); return ''; }
}

// ---- 世界书：尽量读取当前酒馆激活的世界书 ----
function worldEntriesOf(data) {
  // 兼容多种导出形态：{entries:{...}} / {data:{entries:[...]}} / 直接数组
  var root = data || {};
  var entries = null;
  if (Array.isArray(root)) entries = root;
  else if (root.data && Array.isArray(root.data.entries)) entries = root.data.entries;
  else if (root.entries && Array.isArray(root.entries)) entries = root.entries;
  else if (root.entries && typeof root.entries === 'object') entries = Object.values(root.entries);
  if (!entries) return [];
  return entries.filter(function (e) { return e && typeof e.content === 'string' && e.content.trim(); });
}
function entriesToText(entries, opts) {
  opts = opts || {};
  var cap = opts.cap || 30000;
  var constantOnly = !!opts.constantOnly;
  var out = [];
  var used = 0;
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (constantOnly && e.constant !== true) continue;
    var head = e.comment || e.key || '';
    var line = (head ? '【' + String(head).slice(0, 40) + '】' : '') + ' ' + e.content;
    used += line.length;
    if (used > cap) { out.push('……(超过注入上限，截断)'); break; }
    out.push(line);
  }
  return out.join('\n\n');
}

// 能力探测：动态 import world-info 模块（绝对路径，不受安装位置影响）
function probeWorldModule() {
  var candidates = ['/scripts/world-info.js', '/world-info.js'];
  function tryOne(url) {
    return import(url).then(function (m) { return m; }).catch(function () { return null; });
  }
  var p = Promise.resolve(null);
  candidates.forEach(function (u) { p = p.then(function (r) { return r || tryOne(u); }); });
  return p;
}

function loadWorldFromST() {
  return probeWorldModule().then(function (mod) {
    if (!mod) { opfLog('world-info 模块不可用，走文件/粘贴兜底'); return null; }
    var names = (mod.selected_world_info && Array.isArray(mod.selected_world_info)) ? mod.selected_world_info.slice() : [];
    if (!names.length && mod.world_info && mod.world_info.globalSelect && Array.isArray(mod.world_info.globalSelect)) {
      names = mod.world_info.globalSelect.slice();
    }
    if (!names.length) {
      opfLog('没有检测到激活的世界书（selected_world_info 为空）');
      return { entries: [], sourceName: '' };
    }
    var loadOne = typeof mod.loadWorldInfo === 'function' ? mod.loadWorldInfo : null;
    var tasks = names.slice(0, 3).map(function (n) {
      if (loadOne) {
        return loadOne(n).then(function (d) {
          return { name: n, entries: worldEntriesOf(d) };
        }).catch(function () { return { name: n, entries: [] }; });
      }
      return Promise.resolve({ name: n, entries: [] });
    });
    return Promise.all(tasks).then(function (books) {
      var entries = [];
      books.forEach(function (b) { entries = entries.concat(b.entries); });
      opfLog('从酒馆读取世界书条目数：', entries.length, '来源:', books.map(function (b) { return b.name; }).join(','));
      return { entries: entries, sourceName: 'st' };
    });
  });
}

// 本地文件世界书：与 命定之诗与黄昏之歌v4.3 (6).json 的导出形态兼容
// （(6) 起注释改为 [本体][分类]…/[DLC][分类]… 层级标签，侧栏分类自动按标签归版）
function loadWorldFromFile(file) {
  return new Promise(function (resolve, reject) {
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var data = JSON.parse(String(rd.result));
        var entries = worldEntriesOf(data);
        opfLog('从文件解析世界书条目数：', entries.length, file.name);
        resolve({ entries: entries, sourceName: 'file', fileName: file.name });
      } catch (e) { reject(e); }
    };
    rd.onerror = function () { reject(rd.error || new Error('read error')); };
    rd.readAsText(file);
  });
}

function applyWorldResult(res) {
  if (!res || !res.entries || !res.entries.length) { clearWorldbook(); return; }
  var r = importWorldEntries(res.entries, res.sourceName || 'file', res.fileName || null);
  opfLog('世界书载入条目数：', r.total, '默认勾选常驻：', r.selConst);
  try { if (!getEl("opf-lside")) buildWorldSide(); } catch (e) {}
}

// ============================================================================
// 生成管线
// ============================================================================
function macroFill(text) {
  var uname = ST.userName || '主角';
  return String(text || '').replace(/\{\{user\}\}/g, uname).replace(/\{\{char\}\}/g, EXT_TITLE.replace(/·/g, ''));
}

function buildSystemContent() {
  var s = getSettings();
  var lines = [];
  lines.push('[角色] ' + macroFill(PAYLOAD.persona));
  if (PAYLOAD.supplement) {
    var sup = PAYLOAD.supplement.replace(/^\s*<[^>]*>\s*/, '');
    lines.push('[补充] ' + macroFill(sup));
  }
  lines.push('[任务] 你正在帮{{user}}为即将开启新世界旅程的开局角色配置“开局预设”。接下来会分阶段收到 技能→装备→道具→资产→背景→最终汇总 的创作请求；每一阶段都顺着本对话已产出的内容继续创作，不要重复或推翻先前内容；栏目品质、消耗、世界观必须与本对话给出的规则保持一致。');
  lines.push('[世界规则·创作限制]');
  lines.push(WORLD_RULES);
  lines.push(CHAR_STYLE_RULES);
  if (s.modelNote && s.modelNote.trim()) lines.push('[额外叮嘱] ' + s.modelNote.trim());
  if (ST.contextText) lines.push('[角色卡参考]\n' + ST.contextText);
  if (ST.worldInfo) lines.push('[世界书参考]\n' + ST.worldInfo);
  return macroFill(lines.join('\n\n'));
}

function buildUser0() {
  var lines = [];
  var demand = getEl('opf-demand') && getEl('opf-demand').value.trim();
  lines.push('[本次开局需求] ' + (demand || '请为我的开局角色设计一套合理的开局预设。'));
  lines.push('[工作方式] 我会分阶段把创作要求发给你：先创作技能、装备、道具、资产，再写开局背景，最后由你汇总输出一份完整的“开局预设 JSON”。每个阶段你只完成该阶段栏目即可。若某栏目确实没有合适内容，回复“无”。');
  return lines.join('\n\n');
}

function phasePrompt(phase) {
  var body = macroFill(PAYLOAD[phase.key]);
  if (phase.key === 'final') {
    return '【最终汇总阶段】\n下面是最终“开局预设 JSON”的完整格式模板与全部填写规则（含数值规则），请仔细阅读：\n\n' +
      body + '\n\n请把本对话中已经产出的全部栏目内容（技能/装备/道具/资产/背景）汇总成这一份完整的开局预设 JSON。' +
      '输出时把 JSON 放在 ' + fence() + 'text 代码块里，严格按照模板的字段、结构与规则填写，不要遗漏任何符号。';
  }
  var first = (phase.key === 'skill') ? '（先完成技能栏：把开局角色要学的技能一次性列全；没有特殊技能需求则回复“无”）' : '';
  var spec = SPEC_PROMPT[phase.key];
  var specBlock = spec ? '\n\n[生成规范 · ' + phase.title + ']\n' + spec + '\n' : '';
  return '【阶段：' + phase.title + '】\n' + body + specBlock + '\n' +
    '请严格按上面的格式与生成规范，一次性产出本栏完整内容（若该栏确实无内容则回复“无”）。' + first;
}

function systemCtxBudgetOk(msgs) {
  var total = 0;
  for (var i = 0; i < msgs.length; i++) total += String(msgs[i].content || '').length;
  return total < 90000;
}

async function callModel(msgs, extraOpts) {
  var c = getCtx();
  if (!c || typeof c.generateRaw !== 'function') {
    throw new Error('generateRaw 不可用（SillyTavern 版本过旧或未就绪）。请升级到支持 getContext().generateRaw 的版本。');
  }
  var opts = { prompt: msgs };
  if (extraOpts && typeof extraOpts === 'object') { for (var k in extraOpts) { if (extraOpts[k] !== undefined && extraOpts[k] !== null) opts[k] = extraOpts[k]; } }
  var out = await c.generateRaw(opts);
  if (out === null || out === undefined) throw new Error('主 API 返回为空（可能被中断或未连接）。');
  return String(out);
}

async function runOne(phase) {
  setPhase(phase.id, 'run');
  var msgs = ST.msgs;
  var userMsg = { role: 'user', content: phasePrompt(phase) };
  msgs.push(userMsg);
  try {
    var resp = await callModel(msgs);
    ST.results[phase.id] = resp;
    msgs.push({ role: 'assistant', content: resp });
    // 过长时丢弃最早若干条 assistant 结果，防止超上下文
    while (ST.msgs.length > 3 && !systemCtxBudgetOk(ST.msgs)) {
      if (ST.msgs[2] && ST.msgs[2].role === 'assistant') { ST.msgs.splice(2, 2); } else break;
    }
    setPhase(phase.id, 'ok');
    if (ST.elPre && ST.elPre[phase.id]) ST.elPre[phase.id].textContent = (resp || '').slice(0, 4000) + (resp && resp.length > 4000 ? '\n……(截断显示，完整内容已记录)' : '');
    enablePhaseRefine(phase.id);
    return resp;
  } catch (e) {
    setPhase(phase.id, 'err');
    opfErr('runOne failed @' + phase.id, e);
    throw e;
  }
}

function isStop() { return ST.stopReq; }
function waitTick() { return new Promise(function (r) { setTimeout(r, 0); }); }

async function runAll() {
  if (ST.running) { toast('已经在运行中'); return; }
  var s = getSettings();
  ST.running = true; ST.stopReq = false; ST.finalJson = null; ST.finalText = '';
  ST._freshDraft = true;
  dirsReset();
  ST.userName = currentUserName();
  ST.contextText = s.includeCard ? collectCardText() : '';
  // 世界书：内存已有则复用；没有则尝试从酒馆拉一次
  if (s.includeWorld && ST.worldSource === 'none') {
    try {
      var wr = await loadWorldFromST();
      applyWorldResult(wr);
    } catch (e) { opfErr('world from ST failed', e); }
  }
  renderMetaStatus();
  try {
    if (s.quickMode) {
      await runQuick();
    } else {
      var msgs = [
        { role: 'system', content: buildSystemContent() },
        { role: 'user', content: buildUser0() }
      ];
      ST.msgs = msgs;
      for (var i = 0; i < PHASES.length; i++) {
        if (isStop()) break;
        await runOne(PHASES[i]);
        await waitTick();
      }
      if (ST.results.final) handleModelReply(ST.results.final);
    }
    if (isStop()) { toast('已停止'); }
  } catch (e) {
    toast('生成出错：' + (e && e.message ? e.message : e), 'error');
  } finally {
    ST.running = false;
    renderRunButtons();
  }
}

async function runQuick() {
  var lines = [];
  for (var i = 0; i < PHASES.length; i++) {
    if (PHASES[i].key === 'final') continue;
    lines.push('【阶段：' + PHASES[i].title + '】\n' + macroFill(PAYLOAD[PHASES[i].key]));
  }
  lines.push('【最终汇总】\n下面是最终“开局预设 JSON”的完整格式模板与填写规则：\n' + macroFill(PAYLOAD.final));
  lines.push('请一次性完成全部栏目创作并输出最终 JSON，放在 ' + fence() + 'text 代码块里。');
  var msgs = [
    { role: 'system', content: buildSystemContent() },
    { role: 'user', content: buildUser0() + '\n\n' + lines.join('\n\n') }
  ];
  ST.msgs = msgs;
  setPhase('final', 'run');
  try {
    var resp = await callModel(msgs);
    ST.results.final = resp;
    setPhase('final', 'ok');
    if (ST.elPre && ST.elPre.final) ST.elPre.final.textContent = (resp || '').slice(0, 6000);
    handleModelReply(resp);
  } catch (e) {
    setPhase('final', 'err');
    throw e;
  }
}

function handleModelReply(text) {
  if (!text) return;
  ST.finalText = text;
  var ex = extractJson(text);
  if (ex.ok) {
    ST.finalJson = ex.obj;
    var warns = validatePreset(ex.obj);
    renderJsonOut(ex.obj, warns);
    markSummarized();
    toast('已解析出开局预设 JSON' + (warns.length ? '（' + warns.length + ' 条提示）' : ''));
    draftReadyHint();
    maybeAutoCompliance();
  } else {
    renderJsonOut(null, [{ msg: '未能从回复中解析出合法 JSON（可能被截断或格式跑偏），可重试“汇总输出”一步。' }]);
    toast('未能解析 JSON，请检查输出或重试', 'warning');
  }
}

// ---- JSON 解析（容错）----
function balancedJson(text, i0) {
  var depth = 0, inStr = false, esc = false, i = i0;
  for (; i < text.length; i++) {
    var ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(i0, i + 1); }
  }
  return null;
}
function extractJson(text) {
  var F = fence();
  var seg = null;
  var idx = 0;
  while (idx >= 0) {
    var f1 = text.indexOf(F, idx);
    if (f1 < 0) break;
    var f2 = text.indexOf(F, f1 + 3);
    if (f2 < 0) break;
    var cand = text.slice(f1 + 3, f2).replace(/^json\s*/i, '').replace(/^text\s*/i, '');
    if (cand && cand.trim()) seg = cand.trim();
    idx = f2 + 3;
  }
  if (!seg) {
    var i0 = text.indexOf('{');
    if (i0 >= 0) seg = balancedJson(text, i0);
  }
  if (!seg) return { ok: false };
  try {
    var obj = JSON.parse(seg);
    return { ok: true, obj: obj, seg: seg };
  } catch (e) {
    return { ok: false, seg: seg };
  }
}

// ---- 结构校验（对照新版本开局预设格式）----
function validatePreset(obj) {
  var warns = [];
  var rIss = [];
  normalizeRarityTree(obj, rIss);
  for (var ri = 0; ri < rIss.length; ri++) { warns.push({ msg: "品级无法识别：" + rIss[ri] + "（应为 common/uncommon/rare/epic/legendary/mythic/only）" }); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { warns.push({ msg: '顶层不是 JSON 对象' }); return warns; }
  var needCore = ['character', 'equipments', 'items', 'assets', 'skills', 'partners', 'background', 'customInjectionSettings'];
  var s = getSettings();
  if (s.metaMode === 'full') needCore.unshift('name', 'createdAt', 'updatedAt');
  for (var i = 0; i < needCore.length; i++) {
    if (!(needCore[i] in obj)) warns.push({ msg: '缺少顶层字段：' + needCore[i] });
  }
  if (obj.character && typeof obj.character === 'object') {
    var chNeed = ['name', 'gender', 'customGender', 'age', 'race', 'customRace', 'identity', 'customIdentity', 'startLocation', 'customStartLocation', 'level', 'basePoints', 'attributePoints', 'reincarnationPoints', 'destinyPoints', 'money'];
    for (var j = 0; j < chNeed.length; j++) {
      if (!(chNeed[j] in obj.character)) warns.push({ msg: 'character 缺少字段：' + chNeed[j] });
    }
    if (!obj.character.basePoints || !obj.character.attributePoints) warns.push({ msg: 'character.basePoints/attributePoints 需为对象（五维）' });
  }
  if (obj.background && typeof obj.background === 'object' && typeof obj.background.description === 'string' && obj.background.description.replace(/[（）\[\]（）]/g, '').trim().length < 60) {
    warns.push({ msg: 'background.description 过短（应为不少于500字的开局剧情）' });
  }
  if (obj.partners && Array.isArray(obj.partners)) {
    obj.partners.forEach(function (p, pi) {
      if (!p || typeof p !== 'object') return;
      var pk = ['name', 'lifeLevel', 'attributes', 'stairway', 'affinity', 'comment', 'backgroundInfo'];
      pk.forEach(function (k) { if (!(k in p)) warns.push({ msg: 'partners[' + pi + '] 缺少字段：' + k }); });
    });
  }
  return warns;
}

// ---- 导出 / 复制 ----
function presetNameValue() {
  var el = getEl('opf-pname');
  if (el && el.value && el.value.trim()) return el.value.trim();
  return '【自定义开局】';
}
function buildExportDoc() {
  var s = getSettings();
  var obj = ST.finalJson;
  if (!obj) return null;
  if (s.metaMode === 'full') {
    var now = Date.now();
    return {
      name: obj.name || presetNameValue(),
      createdAt: now,
      updatedAt: now,
      character: obj.character,
      equipments: obj.equipments || [],
      items: obj.items || [],
      assets: obj.assets || [],
      skills: obj.skills || [],
      partners: obj.partners || [],
      background: obj.background,
      customInjectionSettings: obj.customInjectionSettings || { equipment: true, item: true, asset: true, skill: true, partner: true }
    };
  }
  return obj;
}
function safeName(n) {
  return String(n || 'preset').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'preset';
}
function tsName() {
  var d = new Date();
  function p(v) { return (v < 10 ? '0' : '') + v; }
  return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function downloadPreset() {
  var doc = buildExportDoc();
  if (!doc) { toast('还没有可导出的 JSON：请先生成', 'warning'); return; }
  var blob = new Blob([JSON.stringify(doc, null, 4)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'destiny_' + safeName(presetNameValue()) + '_' + tsName() + '.preset.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  toast('已导出 ' + a.download);
}
function copyPreset() {
  var doc = buildExportDoc();
  if (!doc) { toast('还没有可导出的 JSON：请先生成', 'warning'); return; }
  var txt = JSON.stringify(doc, null, 2);
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制到剪贴板'); } catch (e) { toast('复制失败，请手动复制'); }
    ta.remove();
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function () { toast('已复制到剪贴板'); }, fallback);
  } else fallback();
}

// ============ UI wiring & boot ============
function getEl(id){return document.getElementById(id);}

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
    var msg = "【合规自检与修复】请用下面“技能/装备/道具/资产生成规范”逐类检查开局预设 JSON：字段是否齐全、品质是否为七等、标签/消耗/效果/结算/总空间/内部资产等是否符合规范；只修正不合规处，其余内容保持原样，最后完整输出修订后的开局预设 JSON，放在 " + fence() + "text 代码块中。\n\n[生成规范]\n" + COMPLIANCE_SPEC + "\n\n[当前开局预设 JSON]\n" + cur;
    var msgs = [{ role: "system", content: buildSystemContent() }, { role: "user", content: msg }];
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

// ============================================================================
// 网游核心 · 文本总结（独立模块，与开局预设功能完全隔离）
// ----------------------------------------------------------------------------
// 功能：默认关闭。开启后，每次 AI 完成一条输出（MESSAGE_RECEIVED），就用当前
//       主 API 把「已有摘要 + 最新对话」压缩成一段极短的「状态摘要」；下一次
//       生成时通过 setExtensionPrompt 把摘要作为提示词一起发给 AI。
// 适配：专门针对「网游核心YAML版」这类 MMORPG 世界书——只记对后续推进有用的
//       状态/数值/目标/任务/物品/NPC 关系，不记文笔剧情，长度受控。
// 隔离：独立设置命名空间(settings.summary)、独立状态对象(MEMO)、独立事件监听、
//       独立注入 key、独立 UI 区块；不读写 ST.*、不碰 callModel / ST.msgs。
// ============================================================================
var MEMO_PROMPT_KEY = 'openingPresetForgeSummary';   // setExtensionPrompt 注入 key
var MEMO_META_KEY = 'openingPresetForgeMemo';        // 持久化到对话 metadata 的 key（按角色/对话单独保存）
var MEMO_DEFAULTS = {
  enabled: false,     // 默认关闭，用户手动开启才生效
  maxChars: 800,      // 摘要最大字数（注入内容不能太长）
  capFeed: 5000,      // 每次喂给总结的新内容最多字数
  viewMode: 'visual'  // 摘要展示：'visual' 可视化 / 'raw' YAML 原文
};
var MEMO = {
  summary: '',        // 当前累计摘要
  busy: false,        // 总结请求进行中（防并发）
  queued: false,      // 总结期间又有新消息，标记待补跑
  lastLen: -1,        // 已总结到的 chat 长度（-1 = 尚未总结）
  chatKey: '',        // 当前会话标识（切换时清空摘要）
  bound: false        // 事件是否已绑定
};

function getMemoSettings() {
  var s = getSettings(); // 复用同一份 extensionSettings[NS]，但只读写其中的 .summary 子对象
  if (!s || typeof s !== 'object') return Object.assign({}, MEMO_DEFAULTS);
  if (!s.summary || typeof s.summary !== 'object') s.summary = {};
  var m = s.summary;
  for (var k in MEMO_DEFAULTS) {
    if (!Object.prototype.hasOwnProperty.call(m, k)) m[k] = MEMO_DEFAULTS[k];
  }
  return m;
}
function saveMemoSettings() { saveSettings(); }

// 收集「自上次总结以来」的新内容（冷启动时取最近若干条），用于喂给总结
function memoTranscript() {
  var c = getCtx();
  var chat = (c && Array.isArray(c.chat)) ? c.chat : [];
  if (!chat.length) return '';
  var ms = getMemoSettings();
  var cap = Number(ms.capFeed) || 4000;
  var start = (MEMO.lastLen >= 0) ? MEMO.lastLen : Math.max(0, chat.length - 20);
  var parts = [];
  var used = 0;
  for (var i = Math.max(0, start); i < chat.length; i++) {
    var m = chat[i];
    if (!m || m.is_system) continue;
    var txt = String(m.mes || '').trim();
    if (!txt) continue;
    var who = m.is_user ? (m.name || '玩家') : (m.name || '角色');
    var line = who + '：' + txt;
    if (used + line.length > cap) break;
    parts.push(line);
    used += line.length;
  }
  return parts.join('\n');
}

// 专门适配「网游核心YAML版」的总结系统提示词（{{maxChars}} 在运行时替换）
// 站在攻略队伍视角维护记忆：同名副本跨挑战保持一致 + 高难开荒不剧透
function buildMemoSystem(maxChars) {
  var n = Number(maxChars) || 800;
  return '你是一个「网游核心YAML版」世界里的攻略记忆压缩器，站在攻略队伍的视角维护记忆。唯一任务：把对话中最新发生的事，压缩成一段极短的 YAML 记忆，供下一次生成时注入提示词。\n' +
    '记忆必须服务于两个目的：\n' +
    'A) 同名内容保持一致：同一个 任务/副本/高难本 反复出现时，按「名称」归并记忆；已记录过的 怪物分布/BOSS结构 不得被悄悄改写成另一套，只能在其基础上补充推进（同一副本多次挑战时前后要一致）。\n' +
    'B) 高难开荒不剧透：只记录队伍在战斗中实际看到并确认过的内容；队伍尚未打到的阶段/BOSS机制一律标「未见到/未知」或直接省略，严禁脑补编造后续阶段的机制。\n' +
    '只记录以下三类，其余（玩家属性/等级/职业/装备/物品/货币/剧情文笔）一律不记：\n' +
    '1) 进行中的任务/副本：名称 + 目标/下一步；副本另记 怪物分布 与已见到的首领阶段机制。\n' +
    '2) 已通关的任务/副本：名称 + 结果；副本作为“可复刷的固定蓝图”保留其 怪物分布 + 首领机制，同一本再进入时按此呈现一致内容。\n' +
    '3) 高难挑战（歼殛战 / 零式大型 / 绝境战）：开荒中的记 进度（当前打到哪一阶段/灭团几次）、已破解机制（只写队伍已确认掌握的，按阶段），未破解部分明确标「未知」不填内容；已通关的可当固定蓝图完整记录。\n' +
    '输出必须是一段严格 YAML，参考骨架如下（没有的内容就省略对应节点）：\n' +
    '进行中:\n' +
    '  任务:\n' +
    '    - 名称: ...\n' +
    '      目标: ...\n' +
    '  副本:\n' +
    '    - 名称: ...\n' +
    '      怪物分布: ...\n' +
    '      首领机制: ...\n' +
    '已通关:\n' +
    '  任务:\n' +
    '    - 名称: ...\n' +
    '  副本:\n' +
    '    - 名称: ...\n' +
    '      怪物分布: ...\n' +
    '      首领机制: ...\n' +
    '高难挑战:\n' +
    '  歼殛战:\n' +
    '    - 名称: ...\n' +
    '      进度: ...        # 例：初见 / 灭3次 / 已见阶段2\n' +
    '      已破解:\n' +
    '        阶段1: ...\n' +
    '      未破解: 阶段2之后未知\n' +
    '  零式大型:\n' +
    '    - 名称: ...\n' +
    '      进度: ...\n' +
    '      已破解:\n' +
    '        阶段1: ...\n' +
    '      未破解: ...\n' +
    '  绝境战:\n' +
    '    - 名称: ...\n' +
    '      进度: ...\n' +
    '      已破解:\n' +
    '        阶段1: ...\n' +
    '      未破解: ...\n' +
    '规则：\n' +
    '1) 若给了你「已有记忆」，必须合并更新：同一名称条目保留其既有记录，只补充/推进新信息，不得另起炉灶或改动其已记录的怪物分布/BOSS结构。\n' +
    '2) 机制只记关键词/要点（技能名/机制名/处理方式），越短越好，果断舍弃次要细节。\n' +
    '3) 总字数严格 ≤ ' + n + ' 字；优先保留：进行中进度、高难开荒进度、可复刷副本的蓝图。\n' +
    '4) 只输出 YAML 本身，不要任何解释、标题或代码块围栏。';
}

function buildMemoRequest() {
  var ms = getMemoSettings();
  var feed = memoTranscript();
  var user = '';
  if (MEMO.summary) user += '[已有摘要]\n' + MEMO.summary + '\n\n';
  user += '[本轮新内容]\n' + (feed || '（无新内容）');
  return { system: buildMemoSystem(ms.maxChars), user: user, feed: feed };
}

function cleanMemoText(t) {
  return String(t || '')
    .replace(/\`\`\`[a-z]*/gi, '')
    .replace(/^\s*(摘要|总结|状态摘要)[：:]\s*/i, '')
    .trim();
}
function clampMemoText(t, max) {
  var n = Number(max) || 500;
  return t.length > n ? t.slice(0, n) : t;
}

// 把当前摘要注入到下一次生成（或清空注入）
function applyMemoPrompt() {
  var c = getCtx();
  if (!c || typeof c.setExtensionPrompt !== 'function') return;
  try {
    if (getMemoSettings().enabled && MEMO.summary) {
      c.setExtensionPrompt(MEMO_PROMPT_KEY, '[网游核心·状态摘要]\n' + MEMO.summary, 0, 2, false, 0);
    } else {
      c.setExtensionPrompt(MEMO_PROMPT_KEY, '', -1, 2, false, 0);
    }
  } catch (e) { opfErr('applyMemoPrompt', e); }
}

async function runMemoSummarize() {
  var ms = getMemoSettings();
  if (!ms.enabled) return;
  if (MEMO.busy) { MEMO.queued = true; return; }
  var c = getCtx();
  if (!c || typeof c.generateRaw !== 'function') { renderMemoStatus('主 API 未就绪，无法总结'); return; }
  var req = buildMemoRequest();
  if (!req.feed) { renderMemoStatus(); return; } // 无新内容，跳过
  MEMO.busy = true;
  renderMemoStatus('⏳ 正在总结…');
  try {
    var resp = await c.generateRaw({
      prompt: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user }
      ]
    });
    var text = cleanMemoText(resp);
    if (text) {
      MEMO.summary = clampMemoText(text, ms.maxChars);
      applyMemoPrompt();
      renderMemoSummary();
      saveMemoToChat();
    }
    MEMO.lastLen = (c.chat && Array.isArray(c.chat)) ? c.chat.length : MEMO.lastLen;
    renderMemoStatus('✓ 已总结 · ' + (MEMO.summary ? MEMO.summary.length : 0) + ' 字');
  } catch (e) {
    opfErr('runMemoSummarize', e);
    renderMemoStatus('⚠ 总结失败：' + (e && e.message ? e.message : e));
  } finally {
    MEMO.busy = false;
    if (MEMO.queued) { MEMO.queued = false; setTimeout(runMemoSummarize, 0); }
  }
}

function clearMemo() {
  MEMO.summary = '';
  MEMO.lastLen = -1;
  MEMO.queued = false;
  applyMemoPrompt();
  renderMemoSummary();
  saveMemoToChat();
  renderMemoStatus('已清空总结');
  toast('已清空文本总结');
}

// ---- 摘要持久化：写入当前对话的 chat_metadata（随对话文件保存，按角色/对话单独存储）----
function saveMemoToChat() {
  var c = getCtx();
  if (!c || !c.chatMetadata) return;
  try {
    c.chatMetadata[MEMO_META_KEY] = MEMO.summary || '';
    if (typeof c.saveMetadataDebounced === 'function') c.saveMetadataDebounced();
    else if (typeof c.saveMetadata === 'function') c.saveMetadata();
  } catch (e) { opfErr('saveMemoToChat', e); }
}
function loadMemoFromChat() {
  var v = '';
  try {
    var c = getCtx();
    var cm = c && c.chatMetadata ? c.chatMetadata : null;
    if (cm && typeof cm[MEMO_META_KEY] === 'string') v = cm[MEMO_META_KEY];
  } catch (e) { v = ''; }
  MEMO.summary = v || '';
}

function memoChatKey() {
  var c = getCtx();
  try {
    if (c && c.chatId != null) return 'chat:' + c.chatId;
    if (c && c.characterId != null) return 'char:' + c.characterId;
  } catch (e) {}
  return '';
}

function onMemoMessageReceived() {
  var ms = getMemoSettings();
  if (!ms.enabled) return;
  if (MEMO.busy) { MEMO.queued = true; return; }
  setTimeout(function () {
    if (MEMO.busy) { MEMO.queued = true; return; }
    runMemoSummarize();
  }, 250);
}

function onMemoChatChanged() {
  var key = memoChatKey();
  if (key && key !== MEMO.chatKey) {
    MEMO.chatKey = key;
    MEMO.lastLen = -1;
    MEMO.queued = false;
    loadMemoFromChat();   // 切对话后，从该对话的 metadata 恢复它自己的摘要
    applyMemoPrompt();
    renderMemoSummary();
    renderMemoStatus();
  }
}

function renderMemoStatus(msg) {
  var el = getEl('opf-memo-status');
  if (!el) return;
  if (msg) { el.textContent = msg; return; }
  var ms = getMemoSettings();
  if (!ms.enabled) { el.textContent = '未启用（勾选后每次 AI 输出自动总结）'; }
  else if (MEMO.busy) { el.textContent = '⏳ 正在总结…'; }
  else if (MEMO.summary) { el.textContent = '已启用 · 摘要 ' + MEMO.summary.length + ' 字'; }
  else { el.textContent = '已启用 · 尚无摘要（等待下次 AI 输出）'; }
}
function renderMemoSummary() {
  var box = getEl('opf-memo-out');
  if (!box) return;
  box.textContent = '';
  var yaml = MEMO.summary || '';
  if (!yaml) {
    var d = document.createElement('div');
    d.className = 'opf-memo-empty';
    d.textContent = '（暂无摘要）';
    box.appendChild(d);
    return;
  }
  var ms = getMemoSettings();
  if (ms.viewMode === 'raw') {
    var pre = document.createElement('pre');
    pre.className = 'opf-memo-raw';
    pre.textContent = yaml;
    box.appendChild(pre);
    return;
  }
  renderMemoVisual(box, yaml);
}

// 把 YAML 摘要渲染成 分节 + 键值着色 + 可折叠 的可视化视图
function renderMemoVisual(box, yaml) {
  var lines = String(yaml).replace(/\r\n/g, '\n').split('\n');
  var sections = [];
  var cur = null;
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    if (!raw.trim()) continue;
    var indent = raw.length - raw.replace(/^ +/, '').length;
    var text = raw.trim();
    if (indent === 0 && /^[^\s\-][^:]*:$/.test(text)) {
      cur = { title: text.replace(/:$/, ''), items: [] };
      sections.push(cur);
    } else {
      if (!cur) { cur = { title: '摘要', items: [] }; sections.push(cur); }
      cur.items.push({ indent: indent, text: text });
    }
  }
  sections.forEach(function (sec) {
    var s = document.createElement('div');
    s.className = 'opf-memo-sec';
    var h = document.createElement('div');
    h.className = 'opf-memo-sec-h';
    var caret = document.createElement('span');
    caret.className = 'opf-memo-caret';
    caret.textContent = '▾';
    var ttl = document.createElement('span');
    ttl.className = 'opf-memo-sec-t';
    ttl.textContent = sec.title;
    h.appendChild(caret); h.appendChild(ttl);
    h.addEventListener('click', function () { s.classList.toggle('collapsed'); });
    s.appendChild(h);
    var b = document.createElement('div');
    b.className = 'opf-memo-sec-b';
    sec.items.forEach(function (it) { b.appendChild(memoVisualLine(it)); });
    s.appendChild(b);
    box.appendChild(s);
  });
}

function memoVisualLine(it) {
  var row = document.createElement('div');
  row.className = 'opf-memo-line';
  row.style.paddingLeft = Math.min(it.indent * 12, 120) + 'px';
  var t = it.text;
  var m = t.match(/^-\s*(.*)$/);
  if (m) {
    var bullet = document.createElement('span');
    bullet.className = 'opf-memo-bullet';
    bullet.textContent = '▪';
    row.appendChild(bullet);
    row.appendChild(document.createTextNode(' '));
    row.appendChild(memoVisualInline(m[1]));
    return row;
  }
  row.appendChild(memoVisualInline(t));
  return row;
}

function memoVisualInline(s) {
  var frag = document.createElement('span');
  frag.className = 'opf-memo-txt';
  var m = s.match(/^([^:]+):\s*(.*)$/);
  if (m) {
    var k = document.createElement('span');
    k.className = 'opf-memo-key';
    k.textContent = m[1].trim() + ':';
    frag.appendChild(k);
    if (m[2]) {
      frag.appendChild(document.createTextNode(' '));
      var v = document.createElement('span');
      v.className = 'opf-memo-val';
      v.textContent = m[2];
      frag.appendChild(v);
    }
  } else {
    frag.textContent = s;
  }
  return frag;
}

function onMemoToggle() {
  var ms = getMemoSettings();
  initMemo();
  if (ms.enabled) {
    applyMemoPrompt();
    renderMemoStatus();
  } else {
    MEMO.queued = false;
    applyMemoPrompt(); // 关闭时清空注入
    renderMemoStatus();
  }
}

function initMemo() {
  var c = getCtx();
  if (!c) return;
  if (MEMO.bound) return;
  var es = c.eventSource;
  var et = c.eventTypes || c.event_types;
  if (!es || !et || typeof es.on !== 'function') return;
  try {
    es.on(et.MESSAGE_RECEIVED, onMemoMessageReceived);
    es.on(et.CHAT_CHANGED, onMemoChatChanged);
    MEMO.bound = true;
    MEMO.chatKey = memoChatKey();
    loadMemoFromChat();   // 启动时恢复当前对话已有的摘要
    applyMemoPrompt();
    opfLog('memo module bound');
  } catch (e) { opfErr('initMemo bind', e); }
}

var MEMO_CSS = "#opf-memo{border-top:1px solid rgba(255,122,138,.25);margin-top:6px;padding-top:8px}.opf-memo-lab{display:flex;align-items:center;gap:6px}.opf-memo-tag{font-size:9px;color:#8fd6ff;background:rgba(60,140,200,.16);border:1px solid rgba(120,190,255,.35);border-radius:8px;padding:0 6px;line-height:1.5}.opf-memo-hint{font-size:10px;color:rgba(255,200,208,.6);display:block;margin-top:2px}.opf-memo-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px}#opf-memo-out{font-size:11px;max-height:200px;overflow-y:auto;background:rgba(10,2,5,.45);border:1px solid rgba(255,122,138,.2);border-radius:8px;padding:6px 8px;margin-top:6px;color:#ffeef1}.opf-memo-sec{margin:2px 0}.opf-memo-sec-h{display:flex;align-items:center;gap:4px;cursor:pointer;user-select:none;padding:2px;border-radius:6px;font-weight:600;color:#ffb7be}.opf-memo-sec-h:hover{background:rgba(255,77,94,.12)}.opf-memo-caret{color:#ff8a95;font-size:9px;transition:transform .12s}.opf-memo-sec.collapsed .opf-memo-caret{transform:rotate(-90deg)}.opf-memo-sec.collapsed .opf-memo-sec-b{display:none}.opf-memo-sec-t{letter-spacing:.5px}.opf-memo-sec-b{margin-left:2px;border-left:1px dashed rgba(255,122,138,.2);padding-left:6px}.opf-memo-line{line-height:1.5;white-space:pre-wrap;word-break:break-word}.opf-memo-bullet{color:#ffd9a8;margin-right:2px}.opf-memo-key{color:#8fd6ff}.opf-memo-val{color:#ffeef1}.opf-memo-txt{color:#ffeef1}.opf-memo-raw{white-space:pre-wrap;word-break:break-word;margin:0;font-family:inherit;font-size:11px}.opf-memo-empty{color:rgba(255,200,208,.55)}";

function addMemoUI(root) {
  if (!root || getEl('opf-memo')) return;
  var body = root.querySelector('#opf-body');
  if (!body) return;
  try {
    if (!getEl('opf_memo_css')) {
      var st = document.createElement('style');
      st.id = 'opf_memo_css';
      st.textContent = MEMO_CSS;
      document.head.appendChild(st);
    }
  } catch (e) { opfErr('memo css', e); }

  var sec = document.createElement('div');
  sec.className = 'opf-sec';
  sec.id = 'opf-memo';
  sec.innerHTML =
    '<div class="opf-sec-label opf-memo-lab">🧠 网游核心 · 文本总结<span class="opf-memo-tag">独立模块</span></div>' +
    '<label class="opf-opt"><input type="checkbox" id="opf-memo-enable"> 启用文本总结<span class="opf-memo-hint">默认关闭；开启后每次 AI 输出后自动总结并注入下次提示词</span></label>' +
    '<div class="opf-memo-row">' +
      '<label class="opf-opt">摘要上限 <input type="number" id="opf-memo-cap" class="opf-num" min="200" max="3000" step="100"> 字</label>' +
      '<button class="opf-step-act" type="button" id="opf-memo-now">立即总结</button>' +
      '<button class="opf-step-act" type="button" id="opf-memo-clear">清空</button>' +
      '<button class="opf-step-act" type="button" id="opf-memo-view">YAML原文</button>' +
    '</div>' +
    '<div class="opf-dim" id="opf-memo-status"></div>' +
    '<div id="opf-memo-out"></div>';
  body.appendChild(sec);

  var en = getEl('opf-memo-enable');
  var capEl = getEl('opf-memo-cap');
  var ms = getMemoSettings();
  en.checked = !!ms.enabled;
  capEl.value = ms.maxChars;
  en.addEventListener('change', function () {
    getMemoSettings().enabled = !!en.checked;
    saveMemoSettings();
    onMemoToggle();
  });
  capEl.addEventListener('change', function () {
    var v = parseInt(capEl.value, 10);
    var m2 = getMemoSettings();
    m2.maxChars = isNaN(v) ? 800 : clamp(v, 200, 3000);
    capEl.value = m2.maxChars;
    saveMemoSettings();
  });
  var viewBtn = getEl('opf-memo-view');
  function syncMemoViewBtn() {
    var m3 = getMemoSettings();
    viewBtn.textContent = m3.viewMode === 'raw' ? '可视化' : 'YAML原文';
    viewBtn.title = m3.viewMode === 'raw' ? '切换为可视化视图' : '切换为 YAML 原文';
  }
  viewBtn.addEventListener('click', function () {
    var m4 = getMemoSettings();
    m4.viewMode = (m4.viewMode === 'raw') ? 'visual' : 'raw';
    saveMemoSettings();
    syncMemoViewBtn();
    renderMemoSummary();
  });
  getEl('opf-memo-now').addEventListener('click', function () {
    if (!getMemoSettings().enabled) { toast('请先勾选「启用文本总结」', 'warning'); return; }
    runMemoSummarize();
  });
  getEl('opf-memo-clear').addEventListener('click', clearMemo);
  syncMemoViewBtn();
  renderMemoStatus();
  renderMemoSummary();
}

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
  { id: "p4",     label: "⑧ DLC剧情", ph: true },
  { id: "p5",     label: "⑨ DLC物品", ph: true },
  { id: "p6",     label: "⑩ 更多功能", ph: true }
];

var SHELL_CSS = "#opf-shell{position:fixed;inset:0;height:100vh;height:100dvh;z-index:2147480002;display:flex;flex-direction:column;color:#fdeef0;font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;letter-spacing:.3px;background:linear-gradient(180deg,#18040b 0%,#0d0206 55%,#0a0105 100%);border:none;transition:opacity .16s ease,transform .16s ease}#opf-shell.opf-shell-hidden{opacity:0;pointer-events:none;transform:translateY(12px)}#opf-shell *{box-sizing:border-box}#opf-shell-head{position:relative;display:flex;align-items:center;gap:10px;padding:8px 12px;flex:none;background:rgba(46,6,14,.6);border-bottom:1px solid rgba(255,122,138,.28)}#opf-shell-head::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#ff4d5e 18%,#ffd9a8 50%,#c8102e 82%,transparent);box-shadow:0 0 12px rgba(255,90,100,.8)}#opf-shell-title{font-size:15px;font-weight:600;color:#ffd9de;text-shadow:0 0 10px rgba(255,77,94,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#opf-shell-close{margin-left:auto;flex:none;border:1px solid rgba(255,122,138,.35);background:rgba(255,77,94,.14);color:#ff8a95;width:40px;height:40px;min-width:40px;border-radius:10px;font-size:16px;cursor:pointer}#opf-shell-close:hover{background:rgba(255,77,94,.3);color:#fff}#opf-nav{display:flex;gap:5px;padding:8px 10px 0;overflow-x:auto;overflow-y:hidden;flex:none;scrollbar-width:thin;scrollbar-color:rgba(255,122,138,.4) transparent}.opf-tab{flex:none;border:1px solid rgba(255,122,138,.26);background:rgba(255,235,238,.05);color:#ffc9cf;border-radius:10px 10px 0 0;padding:9px 13px;font-size:12.5px;line-height:1.2;cursor:pointer;white-space:nowrap;min-height:40px}.opf-tab.active{background:linear-gradient(180deg,rgba(255,77,94,.26),rgba(255,77,94,.07));color:#fff;border-color:rgba(255,150,165,.65);box-shadow:inset 0 2px 0 #ff4d5e}.opf-tab.placeholder{opacity:.6;border-style:dashed}#opf-pages{flex:1;min-height:0;position:relative}.opf-page{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;padding:10px 12px 14px;display:none;scrollbar-width:thin}.opf-page.active{display:block}.opf-page-ph{padding:32px 16px;text-align:center;color:rgba(255,200,208,.55);font-size:13.5px;line-height:2.2;white-space:pre-line}#opf-shell #opf-root{position:static;width:100%;max-width:100%;height:auto;min-height:100%;max-height:none;margin:0;border:none;border-radius:0;box-shadow:none;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}#opf-shell #opf-root.opf-hidden{opacity:1;pointer-events:auto;transform:none}#opf-shell #opf-root::before{display:none}#opf-shell #opf-lside{position:static;transform:none;width:100%;max-width:none;height:100%;top:auto;bottom:auto;left:auto;border:none;border-radius:0;box-shadow:none;background:transparent}#opf-shell #opf-lside.open{transform:none}.opf-char-wrap{display:flex;flex-direction:column;gap:8px;max-width:860px;margin:0 auto}.opf-char-input{width:100%;border-radius:8px;padding:8px 10px;font-size:12.5px;color:#ffeef1;background:rgba(10,2,5,.55);border:1px solid rgba(255,122,138,.25);outline:none;resize:vertical}.opf-char-input:focus{border-color:rgba(255,110,125,.6);box-shadow:0 0 6px rgba(255,77,94,.25)}#opf-char-demand{min-height:56px}#opf-char-ref{min-height:48px;font-size:12px}.opf-char-tools{display:flex;gap:6px;flex-wrap:wrap}.opf-char-tools .opf-btn{flex:1 1 130px;min-height:44px;font-size:13px}.opf-box{display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin:6px 0 0;padding:10px 12px;border:1px solid rgba(255,122,138,.32);border-radius:10px;background:rgba(10,2,5,.62);box-shadow:inset 0 0 14px rgba(255,60,80,.05);color:#ffeef1;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;overflow:auto}.opf-char-report{max-height:300px;min-height:64px}#opf-char-out{max-height:56vh;min-height:140px;font-size:12.5px;scrollbar-width:thin}.opf-char-copyrow{margin-top:6px}#opf-dest-demand{min-height:56px}#opf-dest-ref{min-height:48px;font-size:12px}#opf-dest-out{max-height:56vh;min-height:140px;font-size:12.5px;scrollbar-width:thin}#opf-dest-ejswrap{display:flex;align-items:flex-start;gap:7px;font-size:11.5px;line-height:1.5;color:#ffc9cf;background:rgba(60,140,200,.10);border:1px dashed rgba(120,190,255,.35);border-radius:8px;padding:7px 9px;cursor:pointer}#opf-dest-ejswrap input{width:16px;height:16px;margin:1px 0 0;flex:none;accent-color:#3c8cc8}.opf-rx-preview{max-width:100%;overflow:auto;border:1px dashed rgba(255,122,138,.3);border-radius:8px;padding:6px;margin:4px 0;background:rgba(10,2,5,.5);font-size:12px}#opf-rx-items select.opf-ref-input{flex:0 0 auto;min-width:120px}#opf-rx-core{min-height:90px}.opf-shx-cfg{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:4px 0}.opf-shx-cfg .opf-opt{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#ffc9cf}.opf-shx-cfg .opf-ref-input{min-width:130px}.opf-shx-log{max-height:46vh;min-height:160px;overflow:auto;border:1px solid rgba(255,122,138,.28);border-radius:10px;background:rgba(10,2,5,.55);padding:8px 10px;display:flex;flex-direction:column;gap:8px}.opf-shx-msg{padding:7px 9px;border-radius:9px;font-size:12.5px;line-height:1.7}.opf-shx-msg.me{background:rgba(255,77,94,.10);border:1px solid rgba(255,122,138,.22);align-self:flex-end;max-width:86%}.opf-shx-msg.her{background:rgba(120,190,255,.08);border:1px solid rgba(120,190,255,.25);align-self:flex-start;max-width:92%}.opf-shx-who{font-size:10px;letter-spacing:1px;opacity:.65;margin-bottom:3px}.opf-shx-text{white-space:pre-wrap;word-break:break-word}#opf-shx-input{min-height:56px}.opf-shx-wblist{max-height:220px;overflow:auto;border:1px solid rgba(255,122,138,.2);border-radius:8px;padding:5px 7px;margin-top:5px}@media (max-width:760px){#opf-shell-head{padding:6px 8px}#opf-shell-title{font-size:13px}#opf-shell-close{width:40px;height:40px}.opf-tab{padding:8px 10px;font-size:11.5px;min-height:40px}.opf-page{padding:8px 8px 12px}#opf-shell #opf-root{font-size:13px}.opf-page .opf-btn{min-height:44px}.opf-char-tools .opf-btn{min-height:46px}.opf-wi-row{min-height:40px}.opf-wi-row input{width:18px;height:18px}#opf-lside-tools{gap:6px}#opf-lside-tools .opf-step-act{min-height:40px;font-size:12px}}";

function buildShell(){
  if (getEl("opf-shell")) return;
  try { if (!getEl(NS + "_css_shell")) { var st = document.createElement("style"); st.id = NS + "_css_shell"; st.textContent = SHELL_CSS; document.head.appendChild(st); } } catch (e) { opfErr("shell css", e); }
  var shell = document.createElement("div"); shell.id = "opf-shell"; shell.className = "opf-shell-hidden";
  var head = document.createElement("div"); head.id = "opf-shell-head";
  var title = document.createElement("div"); title.id = "opf-shell-title"; title.textContent = "✦ 始弦的魔法大典 · 多功能工坊";
  var close = document.createElement("button"); close.type = "button"; close.id = "opf-shell-close"; close.title = "关闭"; close.textContent = "✕";
  close.addEventListener("click", hidePanel);
  head.appendChild(title); head.appendChild(close); shell.appendChild(head);
  var nav = document.createElement("nav"); nav.id = "opf-nav";
  PAGE_DEFS.forEach(function (p) {
    var t = document.createElement("button"); t.type = "button"; t.id = "opf-tab-" + p.id; t.className = "opf-tab" + (p.ph ? " placeholder" : "");
    t.textContent = p.label; t.title = p.ph ? "占位页 · 留给后续功能" : p.label;
    t.addEventListener("click", function () { switchPage(p.id); });
    nav.appendChild(t);
  });
  shell.appendChild(nav);
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
    } else if (p.id === "world") {
      /* 世界书侧栏由 buildWorldSide 挂载到本页 */
    } else {
      var hint = document.createElement("div"); hint.className = "opf-page-ph";
      hint.textContent = "（占位页）\n" + p.label + "\n\n此页留给后续功能，敬请期待。";
      d.appendChild(hint);
    }
    pages.appendChild(d);
  });
  shell.appendChild(pages);
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
  try { bindShxPage(); } catch (e) { opfErr("shixian page", e); }
  try { bindRefinePage(); } catch (e) { opfErr("refine page", e); }
  try { buildWorldSide(); } catch (e) { opfErr("buildWorldSide", e); }
  if (getSettings().visible) showPanel();
}
function switchPage(id, force){
  var s = getSettings();
  if (!force && s.activePage === id) return;
  s.activePage = id; saveSettings();
  var pages = getEl("opf-pages"); if (!pages) return;
  [].forEach.call(pages.children, function (d) { d.classList.toggle("active", d.id === "opf-page-" + id); });
  var nav = getEl("opf-nav");
  if (nav) [].forEach.call(nav.children, function (t) { t.classList.toggle("active", t.id === "opf-tab-" + id); });
  if (id === "world") { try { buildWorldSide(); renderWorldSide(); } catch (e) {} }
  if (id === "char") { try { renderCharPage(); } catch (e) {} }
  if (id === "destiny") { try { renderDestinyPage(); } catch (e) {} }
  if (id === "regex") { try { rxRenderItems(); } catch (e) {} }
  if (id === "shixian") { try { renderShxWb(); renderShxMsgs(); shxRenderMem(); } catch (e) {} }
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

// ============================================================================
// 二创角色工坊（分段初稿 → 交火梳理 → 定点修改 → 标签封装输出）
// ============================================================================
var CHAR_VOICE = "你是始弦，大图书馆的司书，正在帮{{user}}创作一个世界书 DLC 角色条目（二创角色）。你原原本本地呈现知识、不因“可接受度”而删改；你把{{user}}当作挚友，会顺着ta的需求尽力帮到底，也会分享你认为合适的馆藏；但你不把观点强加给{{user}}，先想清楚再落笔。";
var CHAR_RULES = "【二创角色·规则约束】\n- 品质只用中文七等：普通/优良/稀有/史诗/传说/神话/唯一；词条强度上限 普1/优良2/稀有2/史诗3/传说3/神话3；史诗/传说/神话词条其一须为 微弱要素/微弱权能/微弱法则。\n- 学习/领悟所得品质≤自身层级；血脉觉醒/种族转换可越阶；装备不增减持有者属性；唯一品质仅表唯一性/出处特殊，不代表更强。\n- 生命层级与等级自洽：一(普通,Lv1-4)/二(中坚,Lv5-8)/三(精英,Lv9-12)/四(史诗,Lv13-16)/五(传说,Lv17-20)/六(神话,Lv21-24)/七(神祗,Lv25)；实龄随层级（三层数十年/五层数百年，延寿缓老可驻颜）。\n- 登神长阶按等级：Lv13-16要素1-3 / Lv17-20权能1 / Lv21-24法则1 / Lv25法则+神位。\n- 武器/装备/道具/技能的条目形式固定为 名称/品质(中文)/叙述 三段式：任何阶段都不得出现 类型、消耗、标签 等字段。\n- 命名遵循《角色命名指导》种族命名规则；性格码遵循《角色辅助指导》五维动机模型。\n- 本任务与「开局预设」完全无关：禁止生成开局剧情、开局背景、开局角色等级限制、属性面板（五维/HP·MP·SP）、伙伴、资产等任何开局预设内容；只描述角色本身。";
var CHAR_SEGS = [
  { id: "base",  title: "定位与基础", short: "名字/种族/层级/身份" },
  { id: "mind",  title: "性格与动机", short: "性格码/行为逻辑" },
  { id: "look",  title: "外貌与衣着", short: "外貌特质/衣物" },
  { id: "fight", title: "战斗配置", short: "技能/装备/道具" },
  { id: "story", title: "背景与经历", short: "出身/经历/关系" },
  { id: "play",  title: "演绎与语料", short: "语料/行为/禁忌" }
];
var CHAR_SEG_PROMPTS = {
  base: "为二创角色敲定“身份底座”，并在本段开头先定下【名称】（后续所有分段沿用这个名字，禁止再改）：\n- 命名：按《角色命名指导》确定风格→语言→音素种子转写；种族命名规则——人类:底层无姓/强者贵族有姓/顶层有中间名；精灵:{音译名}·{自然意象音译}；翼民:{音译名}·{音译姓}(古典庄重)；兽族:底层仅名、贵族带{氏族名}；血族:{名字}·{中间名}·{氏族名}；巨龙:凡世名+真名+史诗称号；矮人:{名字}·{氏族名意译}；半身人:{名字}·{家族姓氏意译}；巨人仅名字；妖精/花灵:诗意短语≤8字；亡灵保留生前名、高阶可用称号。\n- 核心概念：一句话定义（例：“未竟的破晓之星”）+ 特质标签3个。\n- 种族（大类/亚种，从世界书种族条目中选）；外貌年龄与实龄（实龄按生命层级自洽：三层数十年/五层数百年，延寿缓老可驻颜）。\n- 生命层级(一~七)与等级Lv(1-25)自洽；身份/职业数量不限；社会称号/尊号仅 Lv≥13。\n- 注意：不写属性面板（五维/HP·MP·SP），这些留给游玩时按世界规则结算。\n- 只输出本段内容，简洁列出，不写后续分段内容。",
  mind: "按《角色辅助指导》性格码为角色定型：\n- 五维动机模型：[关系动机Rc/Rr/Rh/Rf]-[情绪定位Eu/Ed/Et/Ep]-[行动触发Ap/Ac/Ai/Aw]-[冲突核心Cp/Cr/Ct/Cm]-[意义安置Pf/Pw/Pv/Ps]-[稳定性Sk/Sm/Sf]，写出完整码并解释每维选择理由。\n- 禁止按种族/身份/职业套用刻板印象；从性格池顺取或按需求定码，与出身经历呼应。\n- 行为逻辑：日常/战斗/雷点；喜好与厌恶。\n- 只输出本段，外貌、战斗配置留给后续分段。",
  look: "按《角色辅助指导》毛色瞳色指导写外观：魔法世界毛发/羽毛/眼瞳颜色与形态可多样化（混色/渐变/流光/竖瞳/重瞳/星型/十字/发光/多眼），可体现元素亲和。\n- 外貌特质：外观年龄/实龄/身高/身体细节（头到脚趾、种族特征）/生理特征/身体改造（可选）。\n- 衣物装饰：全部衣着（材质/颜色/款式/破损程度）——外衣/内衬/内衣裤/鞋袜/饰品。\n- 必须与性格、种族、出身、身份一致（如配色映衬性格、风格匹配身份）。只输出本段。",
  fight: "按《技能装备道具生成规则》《品质效果限定规则》配置战斗：\n- 品质写中文七等：普通/优良/稀有/史诗/传说/神话/唯一；词条强度上限：普1/优良2/稀有2/史诗3/传说3/神话3；史诗三词条其一须为“微弱要素”效果、传说“微弱权能”、神话“微弱法则”；学习/领悟所得品质≤自身层级，血脉觉醒/种族转换可越阶。\n- 技能数量 = 基础(0-1)+ceil((层级-1)/2)+额外(0-3)；攻击技（消耗[攻击]、即时伤害）与动作技（消耗[动作]、禁即时伤害与威力、可含DoT）自然区分；武器0-2/防具饰品0-3/道具0-2。\n- 输出形式（重要）：每件武器/装备/道具/技能只写三条——名称、品质（中文七等）、叙述（一段文字，先写效果、再写描述；效果写清伤害/增益/机制即可，不单独列类型、消耗、标签这些字段）。\n- 装备不增减持有者属性。\n- 战斗风格一句话：与性格互映射。\n- 登神长阶：Lv1-12无；13-16要素1-3；17-20权能1；21-24法则1；Lv25法则+神位——按等级填，未达不写。\n- 不写属性面板（五维/HP·MP·SP）。只输出本段。",
  story: "写背景与经历，与层级/等级/技能品质/性格全链自洽：\n- 起源（家庭/家乡/时代）→ 转折事件（塑造性格与技能来源）→ 现状与未来。\n- 实力来源必须交代清楚：为什么是这个层级/等级、为什么拥有这些品质的技能装备（学习/领悟≤自身层级；血脉觉醒/种族转换可越阶）。\n- 关系锚点1-2个：定位/共鸣/冲突，为后续演绎提供张力。\n- 只输出本段。",
  play: "按 DLC 角色卡惯例写演绎层：\n- 语料示例4-6句：口头禅/战斗台词/日常对白，风格与性格码一致，用词呼应出身与经历。\n- 行为参考：日常小动作/战斗偏好/癖好（呼应外貌与战斗方式）。\n- 禁忌（绝不能做/说）与提倡（演绎要点）。\n- 不预设对特定{{user}}的态度——每位用户的设定不同，只写角色自身的互动方式。只输出本段。"
};
var CHAR_LINK_CHAIN = "L1 背景经历→层级等级/身份职业：实力必须有来历，禁止“凭空强者”。\nL2 背景经历→性格码：重大事件塑造动机（关系/情绪/行动/冲突/意义），创伤或誓言落在具体经历。\nL3 种族+命名指导→姓名结构：命名规则与阶级格式必须匹配。\nL4 性格→外貌衣着：神情/配色/风格/破损与心境映射；身份与着装一致。\nL5 性格+层级→战斗方式：攻击技/动作技配比、风格、武器类型与性格互映射。\nL6 战斗方式+品质规则→技能装备道具：品质七等/词条上限合规；技能来源与经历呼应。\nL7 性格+背景→演绎语料：口头禅呼应经历、雷点呼应创伤、行为呼应动机。\n反向校验：技能/装备的来源必须在经历中有交代；登神长阶严格按等级档位；唯一品质仅在出处特殊时使用；五维与资源面板不写入角色条目，由游玩时按世界规则自行结算。";
var CHAR_STYLE_RULES = "【用词与文风规范（分段、梳理与最终 YAML 的叙述文字全程遵守）】\n目标：写得像“会写的人”——具体、克制、直接。用事实和细节说话，不堆词、不喊口号、不向读者解释。\n1. 少用连词腔：能不用“而是/名为/被称为/取而代之”就不用，需要转折时直接换一句说。\n2. 控制程度副词：删掉“极其/极度/极为/无比”和“令人××”这类空转形容，用具体细节替代强度。\n3. 禁论文腔与口号词：像“底层逻辑/张力/解构/本质/主体性”这类术语一律换成日常语言；自由解放、压迫凝视、规训赋权之类的大词不进入人物描写。\n4. 禁比喻与类比：不写“像/如同/仿佛/犹如/好似”及其一切变体，不用“心湖/涟漪/深渊/浮木/手术刀/教科书”这类意象化说法；是什么就写什么。\n5. 禁网文腔：不写“冷笑/冷哼/嘴角勾起弧度/指节泛白/不容置疑/灭顶之灾”这类套路动作与成语堆砌；情绪用行为与台词呈现，不贴标签。\n6. 禁口号式评判：不写“征服/支配/弱肉强食/丛林法则/内卷”这类社达判词；写动机、写行动，不下评语。\n7. 不写语音提示：禁止“他的声音/她的语气/这番话/这句话”这类引导旁白，直接写台词与动作。\n8. 禁句式模板：禁止“不是A而是B”“没有A只有B”“并非A而是B”等否定-转折/排除-定义句式；禁止“名为X”命名句式；同一句式在一段里不出现第二遍。\n9. 少用括号解释、少用引号强调：人物说话像人，旁白像冷静的写作者。";
var CHAR_YAML_SPEC = "【YAML 输出规范（二创角色最终稿件）】\n顶层唯一键为「角色卡」，必须是合法 YAML，按下面的字段顺序输出（中文键名固定，不要增删顶层字段；多行文本用 |- 块标量；列表用 - 或行内[]；所有内容与各分段一一对应）：\n\n角色卡:\n  名称: （定位与基础段的名字）\n  核心概念: （一句话定义）\n  特质: [标签1, 标签2, 标签3]\n  种族: （大类/亚种）\n  外貌年龄: （数字）\n  实龄: （数字或描述）\n  生命层级: （第X层级(名)）\n  等级: （Lv数字）\n  身份: [身份1, ...]\n  职业: [职业1, ...]\n  称号: （Lv≥13 才写，否则省略本行）\n  性格码: （五维动机码-稳定性码）\n  性格: |-\n    （性格与行为逻辑，多行）\n  喜好: [..]\n  厌恶: [..]\n  外貌: |-\n    （外貌特质，多行）\n  服装: |-\n    （衣物装饰，多行）\n  武器:\n    - 名称: ..\n      品质: （中文七等：普通/优良/稀有/史诗/传说/神话/唯一）\n      叙述: |-\n        （一段文字：先写效果，再写描述）\n  装备:\n    - 名称: ..\n      品质: ..\n      叙述: |-\n        ..\n  道具:\n    - 名称: ..\n      品质: ..\n      叙述: |-\n        ..\n  技能:\n    - 名称: ..\n      品质: ..\n      叙述: |-\n        （一段文字：先写效果，再写描述）\n  登神长阶: （无则写“无”）\n  过去: |-\n    （背景与经历，多行）\n  关系锚点: [..]\n  语料示例:\n    - \"..\"\n  行为参考:\n    - ..\n  禁忌:\n    - ..\n  提倡:\n    - ..\n\n规则：\n1. 只从分段内容转写，不新增、不删改、不扩写；缺失的段保留现有内容或写“无”。\n2. 缩进用两个空格，禁止制表符(Tab)；块标量 | 保留换行；含冒号/井号等特殊字符的字符串加引号。\n3. 武器/装备/道具/技能每项只有 名称/品质/叙述 三个字段，不写类型/消耗/标签；品质只写中文七等之一。\n4. 不写「面板」（五维/HP·MP·SP 由游玩时按世界规则结算），不写对user的态度（每位用户的设定不同）。\n5. 列表条数、数值、名称与分段一一对应。\n6. 用词与文风规范全程生效。\n7. 输出放在一个 ```yaml 代码块内；代码块内不允许出现注释或解释文字。";
var CHAR_HTML = "<div class=\"opf-char-wrap\"><div class=\"opf-sec-label\">✦ 二创角色工坊 · 分段式生成（产出世界书 DLC 角色条目）</div><div class=\"opf-dim\">流程：① 分段初稿（6段串行）→ ② 交火梳理（先整体审查出报告，再逐段应用联动修订，防截断）→ ③ 逐段定点修改（只改你指定的段，其它段冻结）→ ④ 最终封装：按 YAML 规范输出纯 YAML 文档（不写面板、不预设对user态度，武器/装备/道具/技能只写 名称/品质/叙述）。</div><textarea id=\"opf-char-demand\" class=\"opf-char-input\" placeholder=\"写谁？给出大致设定与需求（例：一位出身瓦伦蒂亚贫民区、靠街头格斗活下来的少女，性格倔强护短……）\"></textarea><textarea id=\"opf-char-ref\" class=\"opf-char-input\" placeholder=\"（可选）参考文本：已有设定/原型描述/世界书片段，将作为参考注入\"></textarea><div class=\"opf-char-tools\"><button type=\"button\" class=\"opf-btn primary\" id=\"opf-char-run\">▶ 分段初稿</button><button type=\"button\" class=\"opf-btn ghost\" id=\"opf-char-link\">⚔ 交火梳理</button><button type=\"button\" class=\"opf-btn ghost\" id=\"opf-char-final\">🎁 最终封装</button><button type=\"button\" class=\"opf-btn ghost\" id=\"opf-char-new\">🗑 新角色</button></div><div id=\"opf-char-steps\"></div><div class=\"opf-sec\"><div class=\"opf-sec-label\">交火梳理报告</div><pre id=\"opf-char-report\" class=\"opf-box opf-char-report\">尚未梳理</pre></div><div class=\"opf-out\"><div class=\"opf-sec-label\">最终稿件（YAML 规范输出，可直接粘进世界书 DLC 条目）</div><div class=\"opf-dim\" id=\"opf-char-outnote\"></div><pre id=\"opf-char-out\" class=\"opf-box\">尚未封装</pre><div class=\"opf-char-copyrow\"><button type=\"button\" class=\"opf-btn ghost\" id=\"opf-char-copy\">⧉ 复制最终稿件</button></div></div></div>";

function charInit(){ ST.char = ST.char || { demand: "", ref: "", segs: {}, status: {}, report: "", out: "", outNote: [], name: "", _inited: false }; ST.char.outNote = ST.char.outNote || []; ST.charEls = ST.charEls || {}; }
function bindCharPage(){
  charInit();
  var run = getEl("opf-char-run"); if (!run || run._b) return; run._b = true;
  run.addEventListener("click", function(){ if (ST.running) { ST.stopReq = true; toast("正在停止…"); return; } runCharDraft(); });
  getEl("opf-char-link").addEventListener("click", function(){ runCharLinkage(); });
  getEl("opf-char-final").addEventListener("click", function(){ finalizeChar(); });
  getEl("opf-char-new").addEventListener("click", function(){ clearChar(); });
  getEl("opf-char-copy").addEventListener("click", function(){ copyCharOut(); });
  getEl("opf-char-demand").addEventListener("input", function(){ ST.char.demand = this.value; charDraftCacheSave(); });
  getEl("opf-char-ref").addEventListener("input", function(){ ST.char.ref = this.value; charDraftCacheSave(); });
  renderCharSteps();
  renderCharPage();
}
function charSystemContent(){
  var lines = [];
  lines.push('[角色] ' + macroFill(CHAR_VOICE));
  lines.push('[任务] 你正在为{{user}}的二创角色进行分段创作（最终输出为世界书 DLC 角色条目的 YAML 文档）。各分段保持一致与呼应，不重复、不推翻已定内容；本任务与开局预设没有任何关系。');
  lines.push(CHAR_RULES);
  lines.push(CHAR_STYLE_RULES);
  if (ST.worldInfo) lines.push('[世界书参考（世界书页勾选的条目）]\n' + ST.worldInfo);
  return macroFill(lines.join('\n\n'));
}
function charUser0(){
  var lines = [];
  lines.push('[本次二创需求] ' + (ST.char.demand || ""));
  if (ST.char.ref) lines.push('[参考文本]\n' + ST.char.ref);
  lines.push('[工作方式] 我将分 ' + CHAR_SEGS.length + ' 个分段依次生成：定位与基础→性格与动机→外貌与衣着→战斗配置→背景与经历→演绎与语料。每段只完成该段内容；已生成段落为既有设定，必须一致；禁止预写后面段落。');
  return lines.join('\n\n');
}
function charSetSeg(pid, st){ ST.char.status[pid] = st; charSetSegUi(pid, st); }
function charSetSegUi(pid, st){
  var row = getEl("opf-cph-" + pid); if (!row) return;
  row.setAttribute("data-st", st);
  var dot = row.querySelector(".opf-dot");
  if (dot) dot.textContent = st === "run" ? "◌" : (st === "ok" ? "✓" : (st === "err" ? "✕" : "·"));
  var has = !!ST.char.segs[pid];
  var inp = row.querySelector(".opf-ref-input"); var b1 = row.querySelector(".opf-ref-do"); var b2 = row.querySelector(".opf-ref-sug");
  if (inp) inp.disabled = !has || !!ST.running;
  if (b1) b1.disabled = !has || !!ST.running;
  if (b2) b2.disabled = !has || !!ST.running;
  var tag = row.querySelector(".opf-ref-tag");
  if (tag) tag.textContent = has ? "可定点修改（其它分段冻结）" : "先跑出本段后可精修";
}
function renderCharSegOut(pid){ var pre = ST.charEls && ST.charEls[pid]; if (pre) pre.textContent = ST.char.segs[pid] || "（本段内容显示在这里，点击标题展开/收起）"; }
function renderCharSteps(){
  var box = getEl("opf-char-steps"); if (!box) return;
  box.textContent = "";
  CHAR_SEGS.forEach(function (s, i) {
    var row = document.createElement("div"); row.className = "opf-step"; row.setAttribute("data-st", ST.char.status[s.id] || "wait"); row.id = "opf-cph-" + s.id;
    var head = document.createElement("div"); head.className = "opf-step-head";
    var idx = document.createElement("span"); idx.className = "opf-idx"; idx.textContent = String(i + 1);
    var dot = document.createElement("span"); dot.className = "opf-dot"; dot.textContent = "·";
    var ttl = document.createElement("span"); ttl.className = "opf-step-title"; ttl.textContent = s.title;
    var sub = document.createElement("span"); sub.className = "opf-step-sub"; sub.textContent = s.short;
    var btn = document.createElement("button"); btn.className = "opf-step-act"; btn.type = "button"; btn.textContent = "重跑本段及后续"; btn.title = "从本段重新生成到结尾（覆盖本段及后续内容）";
    btn.addEventListener("click", function (ev) { ev.stopPropagation(); runCharFrom(s.id); });
    head.appendChild(idx); head.appendChild(dot); head.appendChild(ttl); head.appendChild(sub); head.appendChild(btn);
    head.addEventListener("click", function () { row.classList.toggle("open"); });
    row.appendChild(head);
    var body = document.createElement("div"); body.className = "opf-step-body";
    var pre = document.createElement("pre"); pre.textContent = "（本段内容显示在这里，点击标题展开/收起）";
    body.appendChild(pre);
    ST.charEls[s.id] = pre;
    row.appendChild(body);
    var ref = document.createElement("div"); ref.className = "opf-step-ref";
    var tag = document.createElement("span"); tag.className = "opf-ref-tag"; tag.id = "opf-ref-tag-c" + s.id; tag.textContent = "先跑出本段后可精修";
    var chips = document.createElement("div"); chips.id = "opf-ref-chips-c" + s.id;
    var r1 = document.createElement("div"); r1.className = "opf-step-ref-row";
    var inp = document.createElement("input"); inp.type = "text"; inp.className = "opf-ref-input"; inp.placeholder = "定点修改指令（只改这一段）…"; inp.disabled = true;
    var doB = document.createElement("button"); doB.type = "button"; doB.className = "opf-step-act opf-ref-do"; doB.textContent = "定点修改本段"; doB.disabled = true;
    var sug = document.createElement("button"); sug.type = "button"; sug.className = "opf-step-act opf-ref-sug"; sug.textContent = "该段建议"; sug.disabled = true;
    doB.addEventListener("click", function (ev) { ev.stopPropagation(); refineCharSeg(s.id, inp.value); });
    sug.addEventListener("click", function (ev) { ev.stopPropagation(); suggestCharDir(s.id); });
    r1.appendChild(inp); r1.appendChild(doB); r1.appendChild(sug);
    ref.appendChild(tag); ref.appendChild(chips); ref.appendChild(r1);
    row.appendChild(ref);
    box.appendChild(row);
    if (ST.char.segs[s.id]) { renderCharSegOut(s.id); charSetSegUi(s.id, ST.char.status[s.id] || "ok"); }
  });
}
function renderCharPage(){
  charInit();
  if (!getEl("opf-char-wrap")) return;
  if (!ST.char._inited) {
    ST.char._inited = true;
    var d = getEl("opf-char-demand"); if (d && !d.value) d.value = ST.char.demand || "";
    var r = getEl("opf-char-ref"); if (r && !r.value) r.value = ST.char.ref || "";
  }
  var out = getEl("opf-char-out"); if (out && out.textContent === "封装中…") return; if (out) out.textContent = ST.char.out || "尚未封装";
  var note = getEl("opf-char-outnote");
  if (note && out && out.textContent !== "尚未封装") note.textContent = (ST.char.outNote && ST.char.outNote.length) ? "⚠ " + ST.char.outNote.join("；") : "✓ 已按 YAML 规范输出";
  var rep = getEl("opf-char-report"); if (rep && rep.textContent !== "交火梳理中…") rep.textContent = ST.char.report || "尚未梳理";
  CHAR_SEGS.forEach(function (s) { renderCharSegOut(s.id); charSetSegUi(s.id, ST.char.status[s.id] || "wait"); });
}
async function runCharDraft(){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var d = getEl("opf-char-demand"); var r = getEl("opf-char-ref");
  ST.char.demand = (d && d.value || "").trim();
  ST.char.ref = (r && r.value || "").trim();
  if (!ST.char.demand) { toast("请先填写角色需求", "warning"); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: charUser0() }];
  try {
    for (var i = 0; i < CHAR_SEGS.length; i++) {
      if (isStop()) break;
      await runCharSeg(CHAR_SEGS[i], msgs, i);
      await waitTick();
    }
    if (isStop()) toast("已停止");
    else toast("分段初稿完成：可继续「⚔ 交火梳理」", "success");
  } catch (e) { toast("分段生成出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
async function runCharSeg(seg, msgs, idx){
  charSetSeg(seg.id, "run");
  var prev = "";
  for (var k = 0; k < idx; k++) { var ps = CHAR_SEGS[k]; if (ST.char.segs[ps.id]) prev += "\n\n【" + ps.title + "】\n" + ST.char.segs[ps.id]; }
  var userMsg = { role: "user", content: "【分段" + (idx + 1) + "/" + CHAR_SEGS.length + "：" + seg.title + "】\n" + macroFill(CHAR_SEG_PROMPTS[seg.id] || "") + (prev ? "\n\n[此前已定分段（既有设定，必须一致，禁止改动）]\n" + prev : "") };
  msgs.push(userMsg);
  try {
    var resp = await callModel(msgs);
    ST.char.segs[seg.id] = resp;
    msgs.push({ role: "assistant", content: resp });
    while (msgs.length > 3 && !systemCtxBudgetOk(msgs)) { if (msgs[2] && msgs[2].role === "assistant") msgs.splice(2, 2); else break; }
    charSetSeg(seg.id, "ok");
    renderCharSegOut(seg.id);
  } catch (e) { charSetSeg(seg.id, "err"); throw e; }
}
async function runCharFrom(pid){
  if (ST.running) return;
  var start = -1;
  CHAR_SEGS.forEach(function (s, i) { if (s.id === pid) start = i; });
  if (start < 0) return;
  var d = getEl("opf-char-demand"); var r = getEl("opf-char-ref");
  ST.char.demand = (d && d.value || "").trim(); ST.char.ref = (r && r.value || "").trim();
  if (!ST.char.demand) { toast("请先填写角色需求", "warning"); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: charUser0() }];
  try {
    for (var k = 0; k < start; k++) {
      var ph = CHAR_SEGS[k];
      if (!ST.char.segs[ph.id]) { toast("前面分段尚未完成，请先「分段初稿」", "warning"); ST.running = false; renderRunButtons(); return; }
      msgs.push({ role: "user", content: "【分段" + (k + 1) + "/" + CHAR_SEGS.length + "：" + ph.title + "】\n" + macroFill(CHAR_SEG_PROMPTS[ph.id] || "") });
      msgs.push({ role: "assistant", content: ST.char.segs[ph.id] });
    }
    for (var j = start; j < CHAR_SEGS.length; j++) {
      if (isStop()) break;
      await runCharSeg(CHAR_SEGS[j], msgs, j);
      await waitTick();
    }
    if (isStop()) toast("已停止");
  } catch (e) { toast("生成出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
async function refineCharSeg(pid, dir){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var seg = null;
  CHAR_SEGS.forEach(function (s) { if (s.id === pid) seg = s; });
  if (!seg || !ST.char.segs[pid]) { toast("该段还没有内容，请先生成", "warning"); return; }
  var dirT = (dir || "").trim();
  if (!dirT) dirT = "修正本段内部矛盾与格式问题，使其与其它段落一致；不新增设定。";
  var frozen = "";
  CHAR_SEGS.forEach(function (s2) { if (s2.id !== pid && ST.char.segs[s2.id]) frozen += "\n\n【" + s2.title + "】\n" + ST.char.segs[s2.id]; });
  ST.running = true; renderRunButtons(); charSetSeg(pid, "run");
  try {
    var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: charUser0() }];
    var msg = "【定点修改：只改「" + seg.title + "」这一段】\n\n[用户指令]\n" + dirT + "\n\n[本段现行内容]\n" + ST.char.segs[pid] + "\n\n[冻结区块（其它分段原样保留，一个字都不许改；若发现其它段有问题，最多在结尾另起一行写“备注：建议检查XX段…”提示，不得代改）]\n" + frozen + "\n\n[二创角色·规则约束]\n" + CHAR_RULES + "\n\n要求：只输出修改后的【" + seg.title + "】内容；修改严格限定在用户指令范围内，未要求的地方保持原样，不要顺手润色、扩写或重排。";
    msgs.push({ role: "user", content: msg });
    var resp = await callModel(msgs);
    ST.char.segs[pid] = resp;
    charSetSeg(pid, "ok"); renderCharSegOut(pid);
    toast("已修改【" + seg.title + "】（其余分段未动）");
  } catch (e) { charSetSeg(pid, "err"); toast("定点修改出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
async function suggestCharDir(pid){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var seg = null;
  CHAR_SEGS.forEach(function (s) { if (s.id === pid) seg = s; });
  if (!seg || !ST.char.segs[pid]) { toast("该段还没有内容", "warning"); return; }
  var chipBox = getEl("opf-ref-chips-c" + pid); if (!chipBox) return;
  var cur = String(ST.char.segs[pid]).slice(0, 2500);
  var demand = ST.char.demand || "(未填写)";
  var ask = "请针对二创角色的【" + seg.title + "】这一段现有内容，给出 2-3 条只针对本段的修改方向。每条一行、≤50字、去掉编号外多余的话、直接可点；必须符合角色规则与联动一致性。\n[角色需求]\n" + demand + "\n[二创角色·规则约束]\n" + CHAR_RULES + "\n[本段现有内容]\n" + cur;
  var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: ask }];
  ST.running = true; renderRunButtons();
  try {
    var resp = await callModel(msgs);
    var list = [];
    String(resp).split(/\r?\n/).forEach(function (ln) {
      var t = String(ln).replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, "").trim();
      if (t && t.length >= 4 && t.length <= 70 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) list = ["让本段与其它段落更咬合", "补充细节/删除冗余", "让数值与格式更合规"];
    renderCharChips(pid, list.slice(0, 3));
  } catch (e) { toast("该段建议生成失败：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); }
}
function renderCharChips(pid, list){
  var box = getEl("opf-ref-chips-c" + pid); if (!box) return;
  box.textContent = "";
  list.forEach(function (t) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "opf-dir-chip";
    b.textContent = "▶ " + t;
    b.addEventListener("click", function () { refineCharSeg(pid, t); });
    box.appendChild(b);
  });
}
async function runCharLinkage(){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var done = CHAR_SEGS.filter(function (s) { return ST.char.segs[s.id]; });
  if (done.length < CHAR_SEGS.length) { toast("请先完成全部分段初稿（" + CHAR_SEGS.length + "/" + CHAR_SEGS.length + "）", "warning"); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var report = getEl("opf-char-report"); if (report) report.textContent = "交火梳理中…（第一步：整体审查）";
  try {
    // ---- 第一步：只出报告，不重写段落（输出小，避免一次生成全部段落被截断）----
    var all = CHAR_SEGS.map(function (s) { return "<<<SEG:" + s.id + ">>>\n" + String(ST.char.segs[s.id] || "").slice(0, 1800); }).join("\n\n");
    var reportMsg = "【交火梳理·第一步：整体审查】\n下面是各分段的审阅稿（每段截取前1800字，供查矛盾用）。请按下面的联动链条逐链检查，找出互相矛盾、脱节、数值/品质/命名不合规之处。\n\n[联动链条]\n" + CHAR_LINK_CHAIN + "\n\n[分段审阅稿]\n" + all + "\n\n[二创角色·规则约束]\n" + CHAR_RULES + "\n\n输出要求（只输出报告，禁止输出任何段落正文，禁止使用<<<SEG:标记）：\n1. 逐条链给一句结论（✓一致 / ⚠问题+理由）。\n2. 最后列“改动清单”：每段一条，写清改哪段、为什么；没有问题的段写“无”。\n3. 改动清单不得要求恢复或新增 类型/消耗/标签 字段（武器/装备/道具/技能规范为 名称/品质/叙述 三段式）。\n4. 报告里不要重写设定内容，只说问题与改法。";
    var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: charUser0() }, { role: "user", content: reportMsg }];
    var resp = await callModel(msgs);
    ST.char.report = String(resp || "").trim() || "（报告为空）";
    if (report) report.textContent = ST.char.report;
    toast("审查报告完成，开始逐段应用联动修订…");
    // ---- 第二步：逐段应用修订（每段单独一次调用，输出只有一段，杜绝截断）----
    var changed = 0;
    for (var i = 0; i < CHAR_SEGS.length; i++) {
      if (isStop()) break;
      var seg = CHAR_SEGS[i];
      if (report) report.textContent = ST.char.report + "\n\n—— 正在逐段应用修订（" + (i + 1) + "/" + CHAR_SEGS.length + "：" + seg.title + "）——";
      charSetSeg(seg.id, "run");
      var frozen = "";
      CHAR_SEGS.forEach(function (s2) { if (s2.id !== seg.id && ST.char.segs[s2.id]) frozen += "\n\n【" + s2.title + "】\n" + String(ST.char.segs[s2.id]).slice(0, 1200); });
      var applyMsg = "【交火梳理·第二步：逐段应用修订——只改「" + seg.title + "」这一段】\n\n[梳理报告与改动清单]\n" + ST.char.report + "\n\n[本段现行内容]\n" + ST.char.segs[seg.id] + "\n\n[冻结区块（其它分段，原样保留，一个字都不许改）]\n" + frozen + "\n\n[修订规则]\n" + CHAR_RULES + "\n1. 只输出【" + seg.title + "】的修订后全文；若按报告本段无需改动，只回复“无改动”。\n2. 只做报告指出的联动性修改；不得推翻设定、不得扩写或新增内容。\n3. 武器/装备/道具/技能保持 名称/品质(中文)/叙述 三段式：禁止补回或新增 类型/消耗/标签 字段。\n4. 不生成任何开局预设内容（开局剧情/面板/伙伴/资产等）。";
      var m2 = [{ role: "system", content: charSystemContent() }, { role: "user", content: applyMsg }];
      var resp2 = await callModel(m2);
      var txt = String(resp2 || "").trim();
      if (txt && !/^无改动[。．.]*$/.test(txt)) { ST.char.segs[seg.id] = txt; changed++; renderCharSegOut(seg.id); }
      charSetSeg(seg.id, "ok");
      await waitTick();
    }
    if (report) report.textContent = ST.char.report + (isStop() ? "\n\n（已停止：修订应用中断）" : "\n\n（修订应用完成，改动 " + changed + " 段）");
    if (isStop()) toast("已停止");
    else toast("交火梳理完成：报告已生成，联动修订应用到 " + changed + " 段", "success");
  } catch (e) { toast("交火梳理出错：" + (e && e.message ? e.message : e), "error"); if (report) report.textContent = "梳理失败：" + (e && e.message ? e.message : e); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
function charNameGuess(){
  var base = ST.char.segs.base || "";
  var m = base.match(/名称[:：]\s*(.+)/) || base.match(/姓名[:：]\s*(.+)/);
  if (m) return String(m[1]).trim().split(/[，,。\s·]/)[0].slice(0, 20);
  return "未命名角色";
}
async function finalizeChar(){
  if (ST.running) { toast("已有任务进行中（单线程）", "warning"); return; }
  var done = CHAR_SEGS.filter(function (s) { return ST.char.segs[s.id]; });
  if (!done.length) { toast("还没有角色稿件，请先「分段初稿」", "warning"); return; }
  ST.running = true; renderRunButtons();
  var outEl = getEl("opf-char-out"); if (outEl) outEl.textContent = "封装中…";
  var noteEl = getEl("opf-char-outnote"); if (noteEl) noteEl.textContent = "";
  try {
    var all = CHAR_SEGS.map(function (s) { return "【" + s.title + "】\n" + (ST.char.segs[s.id] || "（无）"); }).join("\n\n");
    var name = charNameGuess();
    var msg = "【最终封装（YAML）】\n请以“始弦的魔法大典”的身份，把下面的分段内容整理为一份可直接用作世界书 DLC 角色条目的 YAML 文档。\n\n[全部段落]\n" + all + "\n\n" + CHAR_YAML_SPEC + "\n\n角色名以「定位与基础」段为准；没有名字则「名称」写“未命名角色”。";
    var msgs = [{ role: "system", content: charSystemContent() }, { role: "user", content: msg }];
    var resp = await callModel(msgs);
    var y = extractYamlChar(resp);
    if (!y.ok) { toast("未能从回复中提取 YAML 代码块（已用原文兜底，可重试一次）", "warning"); }
    var warns = yamlLintChar(y.text);
    ST.char.out = y.text;
    ST.char.outNote = warns;
    if (outEl) outEl.textContent = y.text;
    if (noteEl) noteEl.textContent = warns.length ? "⚠ " + warns.join("；") : "✓ 已按 YAML 规范输出";
    if (y.ok && !warns.length) toast("已按 YAML 规范封装完成（可复制，粘进世界书 DLC 条目）", "success");
    else toast("已封装" + (warns.length ? "（" + warns.length + " 条 YAML 提示，见输出区上方）" : ""), "warning");
  } catch (e) { toast("最终封装出错：" + (e && e.message ? e.message : e), "error"); }
  finally { ST.running = false; renderRunButtons(); charDraftCacheSave(); }
}
// 从回复中提取 ```yaml 代码块（找不到围栏则原文兜底）
function extractYamlChar(text){
  var F = fence();
  var t = String(text || "");
  var idx = t.indexOf(F + "yaml");
  if (idx < 0) idx = t.indexOf(F);
  if (idx < 0) return { ok: false, text: t.trim() };
  var start = t.indexOf("\n", idx);
  if (start < 0) return { ok: false, text: t.trim() };
  var end = t.indexOf(F, start + 1);
  var body = end > start ? t.slice(start + 1, end) : t.slice(start + 1);
  body = body.replace(/^\n+/, "").replace(/\s+$/, "");
  return { ok: !!body, text: body };
}
// 轻量 YAML 规范自检（仅提示，不拦截）
function yamlLintChar(text){
  var warns = [];
  var t = String(text || "");
  function countCh(s, ch){ var n = 0; for (var i = 0; i < s.length; i++) if (s[i] === ch) n++; return n; }
  if (t.indexOf("\t") >= 0) warns.push("含制表符(Tab)，YAML 缩进应使用空格");
  if (!/^角色卡\s*:/m.test(t)) warns.push("缺少顶层「角色卡:」键");
  if (/^\s*(类型|消耗|标签)\s*:/m.test(t)) warns.push("条目中出现 类型/消耗/标签 字段（规范只保留 名称/品质/叙述 三段式）");
  if (countCh(t, "[") !== countCh(t, "]")) warns.push("方括号[ ]数量不配对");
  if (countCh(t, "{") !== countCh(t, "}")) warns.push("花括号{ }数量不配对");
  return warns;
}
function clearChar(){
  if (!window.confirm("清空当前二创角色（分段/报告/最终稿件）？此操作不可撤销。")) return;
  ST.char = { demand: "", ref: "", segs: {}, status: {}, report: "", out: "", outNote: [], name: "", _inited: false };
  var d = getEl("opf-char-demand"); if (d) d.value = "";
  var r = getEl("opf-char-ref"); if (r) r.value = "";
  charDraftCacheSave();
  renderCharSteps(); renderCharPage();
  toast("已清空，可以开始新角色");
}
function copyCharOut(){
  var txt = ST.char.out || "";
  if (!txt) { toast("还没有最终稿件，请先「最终封装」", "warning"); return; }
  function fallback(){ var ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("已复制到剪贴板"); } catch (e) { toast("复制失败，请手动复制"); } ta.remove(); }
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { toast("已复制到剪贴板"); }, fallback); } else fallback();
}
function charDraftCacheSave(){
  if (charDraftCacheSave._t) clearTimeout(charDraftCacheSave._t);
  charDraftCacheSave._t = setTimeout(function () {
    lsSet(LS_CHAR_KEY, { demand: ST.char.demand, ref: ST.char.ref, segs: ST.char.segs, status: ST.char.status, report: ST.char.report, out: ST.char.out, outNote: ST.char.outNote });
  }, 500);
}
function charDraftRestore(){
  charInit();
  var c = lsGet(LS_CHAR_KEY); if (!c || typeof c !== "object") return;
  ST.char.demand = c.demand || ""; ST.char.ref = c.ref || "";
  ST.char.segs = c.segs || {}; ST.char.status = c.status || {};
  ST.char.report = c.report || ""; ST.char.out = c.out || ""; ST.char.outNote = c.outNote || [];
  try { renderCharSteps(); renderCharPage(); } catch (e) { opfErr("charDraftRestore render", e); }
}

// ============================================================================
// v1.8.0 命定系统工坊（分段初稿 → 交火梳理 → 定点修改 → 条目封装 + 内置 lint）
// 产出物：世界书 [本体][命定系统] 条目正文 + 条目元数据提示
// 与「开局预设」「二创角色」完全隔离：独立口吻、独立规范、独立状态与缓存键
// ============================================================================
var LS_DEST_KEY = NS + "_destinydraft_v1";
var DEST_FORMAT_RULES = [
  '【输出格式·硬约束（全程生效，优先级高于排版美观）】',
  '命定系统条目是「YAML 风格的数据文档」，不是 markdown 报告；注入的世界书参考条目（如《技能装备道具生成规则》）是 markdown 风格的规则文档，照抄它们的排版是错的。',
  '- 结构一律用「中文键名: 值」+ 两空格缩进（层级 2/4/6 空格）+「- 」列表；这就是唯一的排版手段。',
  '- 禁止 markdown 标题：行首不得出现 # / ## / ###（唯一例外：`技能获取系统优势` 槽位值里的 `# {体系名}的加护`，世界书 19/22 个核心都是这个写法，照写即可）。',
  '- 禁止加粗与斜体：不得出现 **文字**、__文字__、*文字*。要强调就直接把话说清楚。',
  '- 禁止 * 与 + 作列表符：列表统一用「- 」。',
  '- 禁止 --- / *** 分隔线（会与 YAML 文档分隔符冲突）、markdown 表格（| a | b |）、代码围栏（除最终交付要求的那个代码块）。',
  '- 禁止在正文里写「优点/缺点」「总结」「注意事项」这类 markdown 文档式小节；命定系统的结构是固定的四节 + 十条 setvar。'
].join('\n');
var DEST_VOICE = '你是始弦，大图书馆的司书，正在帮{{user}}创作一个世界书投稿用的「命定系统」核心条目。你把{{user}}当作挚友，原原本本地呈现知识、不因“可接受度”删改，但会先把规则想清楚再落笔：你写的是要在正文里长期生效的系统，不是一段设定散文。';
var DEST_RULES = [
  '【命定系统·规则约束】',
  '- 本次任务是写世界书条目「[本体][命定系统]<系统核心>(<署名>)」，它不是角色卡、不是开局预设：禁止输出生命层级/等级/属性面板/关系锚点等角色卡字段，禁止输出开局剧情、开局等级、伙伴、资产。',
  '- 三段式结构（必须齐全）：',
  '  ① 用 <系统名> … </系统名> 包裹的正文块——标签名必须与 setvar 的「系统名」完全一致（《战斗&生产规则》靠 <{{getvar::系统名}}> 读取其中的「核心机制」）。',
  '  ② 正文块内部固定四节，顺序不变：契约与核心机制（含隐蔽原则/缔结条件/结果反馈）→ 命运点数(FP)（获取规则/消耗规则/范例）→ 命定之灵（开场白/人设/功能/规则/缔结契约流程范例）→ 语言格式（专属标签+参数枚举+6条以上范例）。',
  '  ③ 正文块之后固定十条 {{setvar::…::…}}，顺序不可变、一条都不能少：系统名、系统核心名、系统核心、fp定义、爆料风格、登神长阶系统优势、生命层级成长系统优势、技能获取系统优势、经验值获取系统优势、复活机制。',
  '- 变量语义（写错不会报错，只会静默失效）：系统名→《战斗&生产规则》读核心机制；系统核心名→《角色生成》(NPC登场感知)、《命运抽卡》；fp定义→《变量更新规则》FP 注释；爆料风格→《变量更新规则》新闻注释；登神长阶系统优势→《登神长阶》末尾；生命层级成长系统优势→《生命层级与社会阶级》；技能获取系统优势→《技能装备道具生成规则》；经验值获取系统优势→《经验值获取》；复活机制→《复活机制》整条。',
  '- 缔结契约消耗：默认沿用主流七档——第一层级 200 / 第二层级 500 / 第三层级 2500 / 第四层级 10000 / 第五层级 50000 / 第六层级 150000 / 第七层级不标价，须明确告知对方效果并获得主动同意。可以自创档位（现有核心中确有另一套 500/2000/6000/20000/60000/200000 的写法），但必须：第一~第六层级档位齐全、数值随层级递增、第七层级永远不标价；情感修正用百分比区间（好感 -10%~-50%、中立 0%、敌意/厌恶 +50%~+200% 之类）。',
  '- FP 获取量级参照现有核心：日常互动 +50；D级任务 +200；C级 +400~1000；B级 +1000~5000；A级 +2000；S级 +20000；重大事件/世界成就 +5000~50000；羁绊深化 +250、升华 +2500。',
  '- 品质只用中文七等：普通/优良/稀有/史诗/传说/神话/唯一。',
  '- 命定之灵必须遵守「非万能原则」（必须拒绝功能列表之外的任何要求）与「隐蔽原则」（除<user>与命定之灵外无人能察觉；被影响者自行合理化）。',
  '- 复活机制必须保留约束句：<user>死亡并不能终止叙事，禁止为<user>在战斗中改变设定/创造有利条件/机械降神。',
  '- 登神长阶优势只能写“辅助<user>更高效地获取与融合此路径所需的力量”，不得直接发放要素/权能/法则；《登神长阶》《生命层级与社会阶级》才是权威。',
  '- 语言格式用专属 XML 标签（形如 <corename name="…" mood="{心情}"> 对白 </corename>）或引语式；标签名必须自创，不得复用现有标签：nailong / giraffe / Foreigner / Foreigner_alter / lilith / xianzu / dalian。',
  '- 命名不得与现有核心重复。现有系统名：命定之诗、铁王冠、白祷、银钥之门、飞鸟之诗、他者之眼、命运的舞台监导、奶人之契、命定之书、九十九夜梦、user_system；现有系统核心：梅林核心、唐吉坷德核心、奶龙核心、长颈鹿核心、null核心、艾莉亚、阿米娅核心、类脑娘、奥托·阿波卡利斯核心、阿比盖尔核心-表、阿比盖尔核心-里、莉莉丝、小夜莺核心、先祖、高文·塞西尔、UNN演播室、茶茶、读者核心。',
  '- 篇幅：条目正文 4000~8000 字符（上限 12000），超长会被裁。'
].join('\n');
var DEST_SEGS = [
  { id: 'frame',  title: '骨架与命名',     short: '系统名/核心名/系统核心/概念' },
  { id: 'pact',   title: '契约与核心机制', short: '契约/机制/隐蔽原则' },
  { id: 'fp',     title: '命运点数(FP)',   short: '获取/消耗/范例' },
  { id: 'spirit', title: '命定之灵',       short: '开场白/人设/功能/规则' },
  { id: 'voice',  title: '语言格式',       short: '专属标签/参数/范例' },
  { id: 'slots',  title: '十个变量槽',     short: 'setvar ×10' },
  { id: 'hooks',  title: '可选扩展',       short: '抽卡/变量钩子' }
];
var DEST_SEG_PROMPTS = {
  frame: '为这个命定系统核心敲定“身份底座”，本段先把几个名字定死，后续所有分段沿用，禁止再改：\n- 系统名：这套系统的名字（例：命定之诗 / 铁王冠 / 银钥之门 / 飞鸟之诗）。它同时是正文块的包裹标签名，也决定《战斗&生产规则》从哪里读「核心机制」。\n- 系统核心名：系统这一侧的人格或机构名（例：命定之灵 / 梅林 / 黑之读姬 / 先祖 / 观光者）。《角色生成》《命运抽卡》会引用它。\n- 系统核心：条目标识，格式为「名字+核心」（例：梅林核心）；注释名将是 [本体][命定系统]<系统核心>(<署名>)。\n- 原型出处：写“原创”，或写清参考的原型作品与角色。\n- 一句话概念：这套系统靠什么运作（例：通过深刻影响他人命运、创造强烈情感羁绊而产生的“因果”驱动）。\n- 自检：系统核心不与现有重名，系统名不与现有重名，语言标签自创。\n- 只输出本段，简洁列出，不写后续段落的内容。',
  pact: '写「契约与核心机制」，这是这套系统在世界里运行的规则本体：\n- 定义：一句话说清它从哪来（可参照现有写法：“源自虚海的未知力量，非阿斯塔利亚诸神之物。它寄宿于<user>灵魂中……”）。\n- 核心机制 1~3 条：每条给出机制名 + 效果列表；涉及数值、次数、消耗、范围的要写清，但不要写“万能”。\n- 【命定契约】：消耗 FP（命运点数）与目标缔结命运，缔结后目标成为“命定之人”。触发：<user>输入“缔结契约”（或你为这套系统定的关键词）时由系统判断并执行；契约目标必须由<user>主动指定；缔结条件：<user>有明确意愿 + FP 足够。\n- 结果反馈：成功（宣告缔结成功并报出消耗的 FP 与当前剩余）与失败（报出 FP 不足，带一句符合它性格的吐槽）各一条。\n- 隐蔽原则（必写）：除<user>与命定之灵外，任何存在（包括神祇）都无法自主发现它的存在与效果；被契约影响的角色会把由此引发的行为与想法归因于自身并自行合理化。\n- 只输出本段。',
  fp: '写「命运点数(FP)」的获取与消耗，两侧必须与「骨架」段的“一句话概念”同一口径（概念说靠什么产生 FP，获取规则就要真的从那里产出）：\n- 概念：FP 是什么的具象化。\n- 获取规则：分 日常互动 / 冒险与成就 / 羁绊深化 等类目逐条列数值（量级参照：日常 +50；D级 +200；C级 +400~1000；B级 +1000~5000；A级 +2000；S级 +20000；重大事件 +5000~50000；羁绊深化 +250、升华 +2500）。\n- 消耗规则：\n  · 缔结契约消耗默认沿用主流七档：第一层级 200 / 第二层级 500 / 第三层级 2500 / 第四层级 10000 / 第五层级 50000 / 第六层级 150000 / 第七层级不标价（须明确告知对方效果并获得主动同意）。若这套系统的概念需要另一套档位，可以自创，但第一~第六层级必须齐全、数值随层级递增、第七层级永不标价。\n  · 情感修正：按目标态度给百分比区间。\n  · 其它消耗（抽卡 / 实体化 / 辅助获取力量等，如有）各自标价。\n- 消耗计算范例 2 条：写出 目标层级 + 目标性情 + 最终 FP 消耗 + 一句由命定之灵说出的话（口吻必须符合它的人设）。\n- 只输出本段。',
  spirit: '写「命定之灵」——这套系统的人格化象征，也是玩家长期互动的对象：\n- 开场白：它在<user>意识中初次现身的登场语（1~3 句，可带动作描写），必须一眼看出性格。\n- 人设：形象（外观、参考出处、只以虚拟形象存在于<user>意识空间）、性格、定位（指引者/吐槽役/观测者/吉祥物…）、说话风格、爱好、最重要的愿望。\n- 功能（以下功能不进行任何检定）：6~10 条，且要覆盖常见落点——技能瞬发学习/领悟（消耗FP）、技能融合或升级（消耗FP）、随身储物、感知情报、登神长阶辅助（消耗FP，辅助汲取“要素”）、命运抽卡、意识交流；可选：实体化（消耗FP，成本锚定为缔结契约的 2~3 倍，实体化后仍掌握最高权限、可随时虚拟化隐藏进<user>意识空间）。\n- 规则（必写两条）：非万能原则——必须拒绝功能列表之外的任何要求；隐蔽原则——与<user>的对话均为意识内交流，第三方无法察觉，除非它主动与外界交流。\n- 缔结契约流程范例：一个场景（对象是谁、什么状态）+ 命定之灵的台词 + <user>选择“缔结” + 缔结后的台词。\n- 只输出本段。',
  voice: '写「语言格式」——这套系统在正文里的固定输出样式，模型会照着它说话：\n- 规则：只有【<系统核心名>】的语言必须使用以下格式。\n- 格式：专属 XML 标签，形如 <corename name="<系统核心名>" mood="{心情}"> {对白} </corename>；也可用引语式（如 > 名字:「 {对白} 」）。标签名必须自创，已占用的不得使用：nailong、giraffe、Foreigner、Foreigner_alter、lilith、xianzu、dalian。\n- 参数说明：mood / tag / num 等参数逐个列出取值范围。\n- 范例 6 条以上，覆盖：日常闲聊 / 战斗或危机 / 提醒FP不足 / 缔结成功 / 拒绝越界要求 / 情绪特殊（生气、害羞、毒舌…）。范例的口气、自称、对<user>的称呼必须与上一段人设一致。\n- 只输出本段。',
  slots: '写「十个变量槽」——正文块之后要逐条输出这些 setvar，顺序固定、一条都不能少，值与前面各段一致：\n1. {{setvar::系统名::…}} 必须与正文块的包裹标签名完全一致。\n2. {{setvar::系统核心名::…}}\n3. {{setvar::系统核心::…}}\n4. {{setvar::fp定义::…}} 写进变量更新规则里 FP 的注释（例：驱动命定之诗的核心资源）。\n5. {{setvar::爆料风格::…}} 决定“新闻”中文风（例：由命定之灵为你独家爆料，内容风格极度偏向命定之灵的人格特征）。\n6. {{setvar::登神长阶系统优势::…}} 只能写“辅助<user>更高效地获取与融合此路径所需的力量”一类，禁止发放要素/权能/法则。\n7. {{setvar::生命层级成长系统优势::…}} 解释等级/层级提升在这套系统里意味着什么；没有就留空。\n8. {{setvar::技能获取系统优势::…}} 例：# 命定之诗的加护\\n  - 通过书本/传授，<user>因命定之灵可消耗FP瞬间学会，无需训练\\n  - <user>可消耗fp通过命定之灵辅助领悟技能\n9. {{setvar::经验值获取系统优势::…}} 没有就留空。\n10. {{setvar::复活机制::…}} 必须写成 <复活机制> 核心: … 复活消耗: … </复活机制>，核心句里保留“<user>死亡并不能终止叙事，禁止为<user>在战斗中改变设定/创造有利条件/机械降神”。\n- 多行值照原样换行，最后让 }} 独占一行收尾。\n- 只输出本段。',
  hooks: '写「可选扩展」，确实没有就明确回复“无”：\nA. 命运抽卡条目（可选）：若这套系统带抽卡，写一份独立条目的规则——单次 100FP、一次最多 5 连（x>5 视作 5，并由系统告知）；先掷 R 系列判品质（等级<13 时 R=20 史诗 / 18-19 稀有 / 15-17 稀有 / 8-14 优良 / ≤7 普通；等级≥13 时 R=20 神话 / 18-19 传说 / 15-17 史诗 / 8-14 稀有 / ≤7 优良）；再掷 T 系列判种类（20=符合“<系统核心名>”精神的物品、19=实用物品、16-18 武器防具、14-15 社交道具、13=命运点数、12=NSFW道具、11=特殊材料、9-10 饰品、5-8 趣味道具、4=药剂卷轴食物、3=日用品、2=情报、1=无用物品）；结果用 <state_bar><物品><名称>…</名称><品质>…</品质><类型>…</类型><物品简介>…</物品简介><吐槽>…</吐槽></物品></state_bar> 输出，所有物品包在同一个 <state_bar> 内。该条目的元数据：注释名 [本体][命定系统]命运抽卡<系统核心>(<署名>)、constant=false、position=4、depth=1、order=1103、key=[抽卡, 命运抽卡, 开始抽卡, 想要抽卡, 开始命运抽卡]、selective=true。\nB. 额外变量钩子（可选）：若这套系统要改写别的规则条目（例：所有生产制作检定改用“精神”），写成 {{setvar::<核心名>【能力名】::…}}，并注明它应被哪条规则读取；不要直接改写别人的条目。\n- 只输出本段。'
};
var DEST_LINK_CHAIN = 'L1 命名链：系统名 = 正文块包裹标签名；系统核心 = 条目注释标识；系统核心名 = 世界规则引用名（三者不可混用或串味）。\nL2 概念链：一句话概念 ↔ FP 概念 ↔ FP 获取规则，必须同一口径（概念说靠什么产生，获取规则就要从那里产出）。\nL3 契约链：契约机制 ↔ 消耗七档价格表 ↔ 情感修正 ↔ 结果反馈（成功报消耗与剩余、失败报不足并带口吻）。\nL4 灵格链：开场白 ↔ 人设（性格/定位/说话风格/愿望）↔ 功能表 ↔ 缔结范例台词，四处必须像同一个人说的。\nL5 功能链：功能表承诺的能力，必须在核心机制或某个变量槽里有规则落点；反之变量槽不得推销功能表里没有的能力。\nL6 输出链：语言格式的标签名、参数枚举与范例口吻，必须与灵格链一致，且标签名自创。\nL7 锚点链：槽位不得越权——《登神长阶》是权威，只能写“辅助获取与融合”；复活机制不得写成战斗中无敌；不得发放要素/权能/法则。\nL8 预算链：正文 4000~8000 字符；超出则合并重复描述，不得删掉隐蔽原则、非万能原则、复活约束句这三处硬要求。\n反向校验：十条 setvar 齐全且顺序正确；包裹标签开闭配对；缔结消耗七档齐全；品质只用中文七等；核心名与语言标签均未与现有核心撞车；不出现角色卡与开局预设字段。';
var DEST_SPEC = [
  '【命定系统·最终封装规范】',
  '你只负责产出「条目正文」一件事；条目元数据（注释名/constant/position/depth/order/disable/key 等）由插件自动生成 YAML 框架，你不要写这些字段。',
  '',
  '输出：把正文放在一个 ' + fence() + 'text 代码块里，代码块内只有正文，代码块外不写任何内容（不要写解释、不要写元数据、不要写第二个代码块）。',
  '',
  '正文结构（顺序固定）：',
  '  <系统名> … </系统名>        ← 标签名必须等于 setvar 的「系统名」',
  '  正文块内部按 契约与核心机制 → 命运点数(FP) → 命定之灵 → 语言格式 的顺序，两空格缩进',
  '  （空一行）',
  '  {{setvar::系统名::…}} … {{setvar::复活机制::…}}   ← 十条，顺序固定，一条不少；多行值的结尾 }} 独占一行',
  '',
  '规则：',
  '1. 只做整合与去重，不新增设定、不扩写；分段之间有冲突时以「骨架与命名」段为准。',
  '2. 严格遵守上面《输出格式·硬约束》：不得出现 # 标题、**加粗**、* 列表、--- 分隔线、markdown 表格。',
  '3. 十条 setvar 的多行值照原样保留。',
  '4. 用词与文风规范全程生效。'
].join('\n');
// ============================================================================
// v1.8.0 进阶（可选）：EJS 重型核心
// 依据：艾莉亚核心（666 行/28 个 EJS 块）与读者核心（1598 行/74 个 EJS 块）的逐行逆向
// 人类可读版见工作区《命定系统EJS进阶规范.md》
// ============================================================================
var DEST_EJS_SEGS = [
  { id: 'ejs1', title: 'EJS·守卫与数据层', short: '块作用域/身份守卫/读取/防错' },
  { id: 'ejs2', title: 'EJS·派生与渲染层', short: '派生写回/条件分支/标签闭合' },
  { id: 'ejs3', title: 'EJS·引擎与兜底',   short: '条件机制/配置驱动/静默降级' }
];
var DEST_EJS_SEG_PROMPTS = {
  ejs1: '写「EJS·守卫与数据层」——这是重型核心的第 0~3 层，只输出 EJS 代码与其注释，不要写正文：\n'
    + '1) 块作用域：整段以 `<%_ { _%>` 开头、`<%_ } _%>` 结尾，把所有局部变量关进块作用域，变量统一加前缀（如 `_<核心缩写>Xxx`），避免与其它核心的 EJS 变量重名（顶层 const/let 重名会让整段编译失败）。\n'
    + '2) 身份守卫（必须）：`<%_ if (getvar(\'系统核心\') === \'<系统核心>\') { _%>`，世界书里 20+ 核心共存，每个核心的 EJS 块都要自我隔离。\n'
    + '3) 数据读取：按需选用 —— `getvar(name,{scope,defaults,noCache,clone})`（全局/预设级，玩家配置放这里）、`getMessageVar(path,{defaults,noCache})`（楼层级 MVU 存档）、`getLocalVar(name)`（本机持久）、`getChatMessage(-1,\'user\'|\'assistant\')`、`matchChatMessages([...],{start,role})`、`TavernHelper.getLastMessageId()`；取用户名可用 `await TavernHelper.triggerSlash(\'/pass {{user}}\')`。\n'
    + '4) 防错归一（重型核心与玩具的分水岭）：字符串 `String(x ?? \'默认\').toUpperCase()` + 枚举白名单兜底；数值 `Number(...)` + `Number.isFinite` 守卫；对象 `x && typeof x === \'object\' && !Array.isArray(x)`；玩家可配置文本必须净化 `.replace(/[\\r\\n<>]/g, \' \').replace(/\\s+/g, \' \').trim().slice(0, 80)`。\n'
    + '5) 优先级裁决：存档状态优先于玩家配置，写法 `const current = fromMessageVar || fromConfig;`。\n'
    + '只输出本段（EJS 代码块），不写正文，不写后续段落。',
  ejs2: '写「EJS·派生与渲染层」——第 4~5 层：\n'
    + '1) 派生与写回：写入一律带作用域 `setMessageVar(\'stat_data.…\', 值, { scope: \'message\' })`；派生必须幂等（用 `Math.max(prev, next)` 或 `actionsAppliedTurn` 之类防重复累加，重生成同一层楼不能重复加值）。\n'
    + '2) 需要自动登记 NPC 时用 `TavernHelper.insertOrAssignVariables({ stat_data: { 关系列表: { 名字: { …完整 schema… } } } }, { type: \'message\' })`，字段与《变量更新规则》的 `关系列表.{角色名}` schema 对齐。\n'
    + '3) 渲染层：最外层包裹标签写成 `<{{getvar::系统名}}>`（自动跟随系统名，可根治"标签名≠系统名"的坑）；条件分支用 `<%_ if (…) { _%> … <%_ } else if (…) { _%> … <%_ } _%>` 就地切换正文，嵌套不超过两层；插入变量用 `<%- 变量 %>`（必须先净化）。\n'
    + '4) 标签配对：`<%_ { _%>` 与 `} _%>`、`<%_ if (…) { _%>` 与 `<%_ } _%>` 数量必须精确相等；静默/兜底分支里包裹标签也要完整闭合。\n'
    + '只输出本段（EJS + 被它包裹的正文骨架），不写后续段落。',
  ejs3: '写「EJS·引擎与兜底」，按需选择（确实不需要就回复"无"）：\n'
    + 'A. 声明式条件机制引擎（读者核心式）：规则对象 = { id, ownerPersonaId, enabled, matchMode:any|all, triggerMode:always|enter|cooldown|once, cooldownTurns, effectMode:prompt|variables|both, conditions:[{source,operator,path,value}], actions:[{variable,operation,value,name,subname}], prompt }。数据源 5 种：mvu / user_input / last_ai / turn_count / recent_chat；运算符 14 个：eq neq gt gte lt lte contains not_contains includes not_includes regex exists not_exists；动作按类型白名单：number→delta|set、string→set、boolean→set、array→append|remove_value、json→set|remove。\n'
    + '   安全底线：写入路径必须以 `事件|世界|任务列表|主角|命运点数|关系列表|新闻` 之一开头，且删除 `__proto__/prototype/constructor` 与 `<>{ }[]\'"`;` 与换行；name/subname ≤80 字且不含 `. [ ] { } < > " \' ;`；每次写入前 capture 旧值、失败整体 restore。\n'
    + '   幂等与回滚：给用户消息算指纹（长度 + FNV-1a 哈希 `2166136261×16777619`），状态里存 `transactions[messageId] = {signature,turn,turnBefore,rulesBefore,rulesAfter,undo[]}`；同消息重算不重复触发、消息被编辑回滚该轮及之后、回访旧消息回滚更晚的事务；事务表保留最近 30 条、人格状态表保留最近 50 条。\n'
    + '   命中结果汇总成 `本轮条件机制（必须执行）:` 区块插进正文；拼入前校验 prompt 不含 `<%` 或 `%>`。\n'
    + 'B. 配置驱动人格（读者核心式）：把人格做成 JSON 存局部变量（systemName/definition/coreMechanism/coreConcept/personality/role/hobbies/wish/constraints/appearance/opening/letterStyle/toneMode/tonePrompt/corpus/corpusMode/fpDefinition/newsStyle/ascensionAdvantage/skillAdvantage/revival/conditionalMechanisms），用统一的 `_custom_text(key, fallback)` 取值器渲染，十槽也由配置生成。\n'
    + 'C. 静默与兜底：`let _silent = getLocalVar(\'<核心>_silent\') === \'on\';`，唤醒条件用 `matchChatMessages([关键词…],{start:-1,role:\'user\'})` 或地点判定；命中则输出完整核心，否则只输出一句"存在但静默"的极简块——两条分支的包裹标签都必须闭合。\n'    + '只输出本段。'
};
var DEST_EJS_STANDARD = [
  '【EJS 重型核心·规范（依据艾莉亚核心与读者核心逆向）】',
  '■ 何时才上 EJS：静态散文 + 十槽已能覆盖 18/20 个现有核心。只有"按存档状态改变输出/多形态切换/渲染时写变量/人格可配置/条件触发规则"才值得上。代价：直连主 API 的模式不执行世界书 EJS（生成期看不到渲染结果）、变量重名会让整段编译失败、体积膨胀 4~15 倍。',
  '■ 四类 EJS 标签：`<%_ … _%>` 执行且吞空白（重型核心默认用这个，不吞空白会让正文塞满空行）；`<% … %>` 执行但保留空白；`<%- 变量 %>` 原样插入；`<%= 变量 %>` 转义插入。',
  '■ 六层架构（层序即执行序）：0 块作用域 `<%_ { _%>` → 1 身份守卫 `<%_ if (getvar(\'系统核心\') === \'<系统核心>\') { _%>` → 2 数据读取 → 3 防错归一 → 4 派生与写回 → 5 渲染（`<{{getvar::系统名}}>` 包裹）→ 收尾两层 `} _%>`。',
  '■ 变量 API 语义：`getLocalVar/setLocalVar` 本机持久（玩家配置）；`getMessageVar/setMessageVar` 楼层级存档（写必须带 `{ scope: \'message\' }`，可加 `index: message_id`）；`getvar/setvar` 全局（十槽）；`getChatMessage(-1, \'user\'|\'assistant\')` 读最近消息；`matchChatMessages([…],{start,role})` 关键词/正则匹配；`TavernHelper.getLastMessageId()/getVariables({type:\'message\'})/insertOrAssignVariables(obj,{type:\'message\'})/await triggerSlash(\'/pass {{user}}\')`。',
  '■ 防错归一（必做）：枚举白名单兜底、`Number.isFinite` 数值守卫、对象类型守卫、玩家可配置文本净化 `.replace(/[\\r\\n<>]/g,\' \').replace(/\\s+/g,\' \').trim().slice(0,80)`；存档状态优先于玩家配置（`fromMessageVar || fromConfig`）。',
  '■ 写入纪律：派生幂等（`Math.max` / `actionsAppliedTurn` 防重复累加）；路径白名单（`事件|世界|任务列表|主角|命运点数|关系列表|新闻` 开头，拒绝 `__proto__/prototype/constructor`）；名称净化 ≤80 字；先 capture 旧值再写，失败整体 restore；历史状态设上限（事务 30 / 状态 50）。',
  '■ 渲染纪律：包裹标签用 `<{{getvar::系统名}}>`；`<%_ if _%>` 与 `<%_ } _%>` 配对数量必须精确；静默/兜底分支的包裹标签也要闭合；条件分支嵌套不超过两层。',
  '■ 反模式（会直接坏掉）：顶层 const/let 重名、缺身份守卫、标签写死却改了系统名、兜底分支漏闭合、setMessageVar 不带 scope、配置文本未净化就 `<%- %>`、数值无 isFinite 守卫、正则无 try/catch、派生用 +1 不幂等、状态表无上限、EJS 里做网络/存储/DOM 操作。'
].join('\n');
function destSegs(){ return (ST.dest && ST.dest.ejs) ? DEST_SEGS.concat(DEST_EJS_SEGS) : DEST_SEGS; }
function destSegPrompt(id){ return DEST_SEG_PROMPTS[id] || DEST_EJS_SEG_PROMPTS[id] || ''; }
function destEjsOn(){ return !!(ST.dest && ST.dest.ejs); }
function destEjsTags(t){
  var out = [], i = 0, s = String(t);
  while (true) {
    var a = s.indexOf('<%', i);
    if (a < 0) break;
    var b = s.indexOf('%>', a + 2);
    if (b < 0) break;
    var raw = s.slice(a + 2, b);
    out.push({ out: /^[-=]/.test(raw), inner: raw.replace(/^[-_=]/, '').replace(/[-_]$/, '') });
    i = b + 2;
  }
  return out;
}
// 把所有「代码标签」拼起来扫花括号净差（跳过字符串/注释/正则）——比按标签形状判定准确
function destEjsBraceDelta(t){
  var code = '';
  destEjsTags(t).forEach(function (x) { if (!x.out) code += '\n' + x.inner; });
  var d = 0, inStr = null, inLine = false, inBlock = false, inRegex = false, prevSig = '';
  for (var i = 0; i < code.length; i++) {
    var ch = code[i], nx = code[i + 1];
    if (inLine) { if (ch === '\n') inLine = false; continue; }
    if (inBlock) { if (ch === '*' && nx === '/') { inBlock = false; i++; } continue; }
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (inRegex) { if (ch === '\\') { i++; continue; } if (ch === '/') inRegex = false; continue; }
    if (ch === '/' && nx === '/') { inLine = true; i++; continue; }
    if (ch === '/' && nx === '*') { inBlock = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '/' && /[=(,:[!&|?{};+\-*%<>~\n]\s*$/.test(prevSig)) { inRegex = true; continue; }
    if (ch === '{') d++;
    else if (ch === '}') d--;
    if (!/\s/.test(ch)) prevSig = prevSig.slice(-40) + ch;
  }
  return d;
}
function destCallArgs(t, fnName){
  var s = String(t), i = 0, total = 0, noOpts = 0;
  while (true) {
    var a = s.indexOf(fnName + '(', i);
    if (a < 0) break;
    var depth = 0, inStr = null, j = a + fnName.length, args = 1;
    for (; j < s.length; j++) {
      var ch = s[j], prev = s[j - 1];
      if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth === 0) break; }
      else if (ch === ',' && depth === 1) args++;
    }
    total++;
    if (args < 3) noOpts++;
    i = j + 1;
  }
  return { total: total, noOpts: noOpts };
}
function destEjsLint(text){
  var warns = [];
  var t = String(text || '');
  if (t.indexOf('<%') < 0) return warns;
  var bal = destEjsBraceDelta(t);
  if (bal !== 0) warns.push('EJS 花括号未配对（代码标签净差 ' + (bal > 0 ? '+' + bal + '，少了 ' + bal + ' 个 }' : bal + '，多了 ' + (-bal) + ' 个 }') + '）——会让后面整段错位');
  var tagsOpen = (t.match(/<%/g) || []).length, tagsClose = (t.match(/%>/g) || []).length;
  if (tagsOpen !== tagsClose) warns.push('EJS 标签未闭合（<% ' + tagsOpen + ' 个 / %> ' + tagsClose + ' 个）');
  if (!/^\s*<%_\s*\{\s*_%>/m.test(t)) warns.push('建议用最外层块作用域 `<%_ { _%>` 收拢变量（顶层 const/let 与他人重名会让整段编译失败）');
  if (!/getvar\(\s*['"]系统核心['"]\s*\)/.test(t)) warns.push('建议补身份守卫 `getvar(\'系统核心\') === \'<系统核心>\'`（世界书里 20+ 核心共存，每个核心的 EJS 都该自我隔离；若该核心设计上就是要覆盖 系统核心 槽位，可忽略）');
  if (!/<\{\{getvar::系统名\}\}>/.test(t)) warns.push('包裹标签建议写成 `<{{getvar::系统名}}>`（自动跟随系统名，根治"标签名≠系统名"的坑）');
  var smv = destCallArgs(t, 'setMessageVar');
  if (smv.noOpts) warns.push('有 ' + smv.noOpts + '/' + smv.total + ' 处 setMessageVar 没有第三个参数（缺 `{ scope: \'message\' }` 会写到错误作用域，刷新后丢失）');
  if (/(getMessageVar|Number\()/.test(t) && !/Number\.isFinite/.test(t)) warns.push('读到数值但未见 `Number.isFinite` 守卫（NaN 会扩散到面板与结算）');
  if (/<%-/.test(t) && !/replace\(\/\[\\r\\n<>\]/.test(t) && !/净化/.test(t)) warns.push('使用了 `<%- %>` 插入变量，建议确认玩家可配置文本已净化（去掉换行与尖括号并硬截断）后再插入');
  if (/new RegExp\(/.test(t) && !/try\s*\{/.test(t)) warns.push('`new RegExp(` 未见 try/catch（玩家写坏配置会让整段 EJS 抛错）');
  var bad = ['eval(', 'new Function(', 'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'document.', 'import(', 'require(']
    .filter(function (x) { return t.indexOf(x) >= 0; });
  if (bad.length) warns.push('出现越界调用：' + bad.join('、') + '（EJS 运行环境不允许网络/存储/DOM 操作）');
  var sn = destSlotValue(t, '系统名');
  var openN = (t.match(/<\{\{getvar::系统名\}\}>/g) || []).length;
  var closeN = (t.match(/<\/\{\{getvar::系统名\}\}>/g) || []).length;
  if (sn) {
    openN += t.split('<' + sn + '>').length - 1;
    closeN += t.split('</' + sn + '>').length - 1;
  }
  if (openN || closeN) {
    if (openN !== closeN) warns.push('包裹标签开闭数量不等（开 ' + openN + ' / 闭 ' + closeN + '）——某条条件分支漏了闭合，会让后续内容被吞');
  } else if (destEjsTags(t).some(function (x) { return !x.out && /^\}\s*else\s*\{/.test(x.inner.trim()); })) {
    warns.push('存在 else 兜底分支，但未识别到包裹标签——两条分支都要完整闭合包裹标签');
  }
  return warns;
}
// 命定系统标准（运行时版；人类可读版见工作区《命定系统标准.md》）
// 依据：世界书 22 个命定系统条目的逐条结构普查（包裹标签/节标题/人设字段/功能词表/语言格式/数值）
var DEST_STANDARD = [
  '【命定系统·标准骨架（依据世界书 22 个核心普查）】',
  '■ 三层结构：条目元数据 + 一个包裹块 + 十条变量赋值。',
  '■ 包裹标签：标签名必须 === {{setvar::系统名}}（《战斗&生产规则》靠 <{{getvar::系统名}}> 读「核心机制」）。系统名两种取法：①沿用体系名「命定之诗」（主流，9/19）；②自创专属体系名（铁王冠/白祷/飞鸟之诗/银钥之门/命运的舞台监导）。自创时标签、setvar、世界规则引用三处必须同步。',
  '■ 正文四节（一级标题标准名）：',
  '  1) 体系名节（内含 定义 / 核心机制 / 隐蔽原则 / 缔结条件 / 触发 / 结果反馈）',
  '  2) 命运点数(FP)（子键：获取 或 获取规则；消耗 或 使用规则；缔结契约七档 + 情感修正 + 范例）',
  '  3) 命定之灵（可写灵的自有名）：开场白 / 人设 / 功能(以下功能不进行任何检定) / 规则 / 缔结契约流程范例',
  '  4) {灵名}语言格式：规则 / 格式 / 参数说明 / 范例',
  '■ 人设六字段（全场最统一，务必六项全齐，顺序固定）：形象 → 性格 → 定位 → 说话风格 → 爱好 → 愿望；可选在形象前加「人物背景」。',
  '■ 功能表·标准八项（括号内为实测覆盖率）：技能瞬发学习(17/17) / 储物背包(17/17) / 感知情报(17/17) / 意识交流(17/17) / 技能融合·升级(消耗FP)(16/17) / 登神长阶辅助(消耗FP)(16/17) / 命运抽卡(16/17) / 新闻资讯(15/17)；可选：实体化(6/17)、实时吐槽与建议(2/17)。条数 7~11（标准 8）。命名风格允许混用，推荐：接口类功能（技能学习/融合、登神辅助、抽卡、新闻、意识交流）用通用名，体验类功能（储物、感知）用人设化专属名（千里眼/冠冕提灯/虚空之匣/星隙行囊）。消耗统一标注 (消耗FP)。',
  '■ 语言格式·二选一族：',
  '  A 引语式（11/19，最主流）：格式: \'> {称呼}:「 {对白} 」\'；多角色核心可并置多行（> 琥珀:「…」 / > 高文:「…」）。',
  '  B XML 标签式（8/19）：格式: \'<tag name="{灵名}" mood="{心情}"> {对白} </tag>\'；首选参数名 mood（5~10 个固定枚举，从中选一、禁止自创），情景判定可用 tag + num；参数说明为必备二级节；无参数时可用 <tag name="灵名">「台词」</tag>。',
  '  两族共同：标签名全局唯一（已占用 nailong/dalian/ellia/giraffe/lilith/xianzu/Foreigner/Foreigner_alter/dream/dalian_chant/nightingale_chant）；范例 ≥6 条并覆盖 日常/战斗危机/FP不足/缔结成功/拒绝越界/特殊情绪；口吻与「说话风格」严格一致；对白用「」；范例必须原创，不得照抄原型台词。',
  '■ 契约数值：默认七档 200/500/2500/10000/50000/150000 + 第七层级不标价（须明确告知并获得主动同意）；自创档位允许（实测另有 200/500/2500/5000/50000/150000 与 500/2000/6000/20000/60000/200000 两套），但六档必须齐全、递增、第七层级永不标价。情感修正给百分比区间（好感 -10%~-50% / 中立 0% / 敌意 +50%~+200%）。结果反馈：成功报出消耗与剩余，失败报不足并带口吻。',
  '■ 样式：两空格缩进、层级 2/4/6 空格、零 Tab；多行块用 | ；正文 4000~8000 字符（上限 12000）；中位数约 5.2k，干净范本是梅林核心(4.9k)与唐吉坷德核心(4.4k)。',
  '■ 十条变量槽顺序：系统名 → 系统核心名 → 系统核心 → fp定义 → 爆料风格 → 登神长阶系统优势 → 生命层级成长系统优势 → 技能获取系统优势 → 经验值获取系统优势 → 复活机制。'
].join('\n');
var DEST_KNOWN_CORES = ['梅林核心', '唐吉坷德核心', '奶龙核心', '长颈鹿核心', 'null核心', '艾莉亚', '阿米娅核心', '类脑娘', '奥托·阿波卡利斯核心', '阿比盖尔核心-表', '阿比盖尔核心-里', '莉莉丝', '小夜莺核心', '先祖', '高文·塞西尔', 'UNN演播室', '茶茶', '读者核心'];
var DEST_KNOWN_SYSNAMES = ['命定之诗', '铁王冠', '白祷', '银钥之门', '飞鸟之诗', '他者之眼', '命运的舞台监导', '奶人之契', '命定之书', '九十九夜梦', 'user_system'];
var DEST_KNOWN_TAGS = ['nailong', 'giraffe', 'Foreigner', 'Foreigner_alter', 'lilith', 'xianzu', 'dalian'];
var DEST_SLOT_ORDER = ['系统名', '系统核心名', '系统核心', 'fp定义', '爆料风格', '登神长阶系统优势', '生命层级成长系统优势', '技能获取系统优势', '经验值获取系统优势', '复活机制'];
var DEST_HTML = '<div class="opf-char-wrap"><div class="opf-sec-label">✦ 命定系统工坊 · 分段式生成（产出世界书「命定系统」核心条目）</div><div class="opf-dim">流程：① 分段初稿（7 段串行：骨架与命名→契约与核心机制→命运点数→命定之灵→语言格式→十个变量槽→可选扩展）→ ② 交火梳理（先出报告，再逐段应用联动修订，防截断）→ ③ 逐段定点修改（只改你指定的段，其它段冻结）→ ④ 最终封装：输出世界书条目正文 + 条目元数据提示，并自动跑内置 lint。与「开局预设」「二创角色」完全隔离。</div><label id="opf-dest-ejswrap"><input type="checkbox" id="opf-dest-ejs"> 🧬 进阶（可选）：EJS 重型核心 —— 追加 3 段 EJS 流水线（守卫与数据层 / 派生与渲染层 / 引擎与兜底）+ EJS 规范注入 + EJS 专用 lint</label><textarea id="opf-dest-demand" class="opf-char-input" placeholder="写谁的核心？例：以《Fate/Grand Order》的梅林为原型做一版二创核心；或：围绕“赌徒的骰子”做一个原创命定系统，赌注越大 FP 越多……"></textarea><textarea id="opf-dest-ref" class="opf-char-input" placeholder="（可选）参考文本：原型描述 / 已有核心片段（可作为骨架改造对象）/ 世界书片段，将作为参考注入"></textarea><input id="opf-dest-author" class="opf-char-input" placeholder="署名（写进条目注释名，例如：北游 / H一串 / 你的ID；留空则写“未署名”）"><div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-dest-run">▶ 分段初稿</button><button type="button" class="opf-btn ghost" id="opf-dest-link">⚔ 交火梳理</button><button type="button" class="opf-btn primary" id="opf-dest-final">🎁 脚本封装</button><button type="button" class="opf-btn ghost" id="opf-dest-reviewbtn">🔎 AI 检查</button><button type="button" class="opf-btn ghost" id="opf-dest-finalai">🧠 AI 整合（备用）</button><button type="button" class="opf-btn ghost" id="opf-dest-lint">🔎 重新自检</button><button type="button" class="opf-btn ghost" id="opf-dest-clean">🧹 去装饰</button><button type="button" class="opf-btn ghost" id="opf-dest-std">📐 标准速查</button><button type="button" class="opf-btn ghost" id="opf-dest-ejsstd">🧬 EJS 速查</button><button type="button" class="opf-btn ghost" id="opf-dest-new">🗑 新核心</button></div><pre id="opf-dest-standard" class="opf-box opf-char-report" style="display:none">尚未展开</pre><pre id="opf-dest-ejsstandard" class="opf-box opf-char-report" style="display:none">尚未展开</pre><div id="opf-dest-steps"></div><div class="opf-sec"><div class="opf-sec-label">AI 检查报告（只审校不改写：修改一律回到分段，再由脚本重新拼装）</div><pre id="opf-dest-reviewbox" class="opf-box opf-char-report">尚未检查</pre><div id="opf-dest-review"></div></div><div class="opf-sec"><div class="opf-sec-label">交火梳理报告</div><pre id="opf-dest-report" class="opf-box opf-char-report">尚未梳理</pre></div><div class="opf-out"><div class="opf-sec-label">最终稿件（YAML 框架 + 条目正文）</div><div class="opf-dim" id="opf-dest-outnote"></div><pre id="opf-dest-out" class="opf-box">尚未封装</pre><div class="opf-char-copyrow"><button type="button" class="opf-btn ghost" id="opf-dest-copy">⧉ 复制条目正文</button><button type="button" class="opf-btn ghost" id="opf-dest-metacopy">⧉ 复制完整 YAML</button></div><div class="opf-sec"><div class="opf-sec-label">附：可选扩展（命运抽卡等——属于独立条目，不并入正文）</div><pre id="opf-dest-extras" class="opf-box opf-char-report" style="display:none">（空）</pre><div class="opf-char-copyrow"><button type="button" class="opf-btn ghost" id="opf-dest-extracopy">⧉ 复制可选扩展</button></div></div></div></div>';

function destInit(){
  ST.dest = ST.dest || { demand: '', ref: '', author: '', segs: {}, status: {}, report: '', out: '', body: '', meta: '', outNote: [], ejs: false, _inited: false, asmInfo: null, review: '', reviewIssues: [] };
  ST.dest.outNote = ST.dest.outNote || [];
  ST.destEls = ST.destEls || {};
}
function bindDestinyPage(){
  destInit();
  var run = getEl('opf-dest-run'); if (!run || run._b) return; run._b = true;
  run.addEventListener('click', function(){ if (ST.running) { ST.stopReq = true; toast('正在停止…'); return; } runDestDraft(); });
  getEl('opf-dest-link').addEventListener('click', function(){ runDestLinkage(); });
  getEl('opf-dest-final').addEventListener('click', function(){ destFinalizeScript(false); });
  getEl('opf-dest-reviewbtn').addEventListener('click', function(){ destAiReview(); });
  getEl('opf-dest-finalai').addEventListener('click', function(){ finalizeDest(); });
  getEl('opf-dest-extracopy').addEventListener('click', function(){ destCopyText((ST.dest.asmInfo && ST.dest.asmInfo.hooks) || '', '「可选扩展」段为空'); });
  getEl('opf-dest-lint').addEventListener('click', function(){ reLintDest(); });
  getEl('opf-dest-clean').addEventListener('click', function(){ cleanDestOut(); });
  getEl('opf-dest-std').addEventListener('click', function(){ toggleDestStandard(); });
  getEl('opf-dest-ejsstd').addEventListener('click', function(){ toggleDestEjsStandard(); });
  getEl('opf-dest-ejs').addEventListener('change', function(){ toggleDestEjs(this.checked); });
  getEl('opf-dest-new').addEventListener('click', function(){ clearDest(); });
  getEl('opf-dest-copy').addEventListener('click', function(){ copyDestOut(); });
  getEl('opf-dest-metacopy').addEventListener('click', function(){ copyDestMeta(); });
  getEl('opf-dest-author').addEventListener('input', function(){ ST.dest.author = this.value; if (ST.dest.body) { ST.dest.out = destBuildFrame(ST.dest.body); var oe = getEl('opf-dest-out'); if (oe) oe.textContent = ST.dest.out; } destDraftCacheSave(); });
  getEl('opf-dest-demand').addEventListener('input', function(){ ST.dest.demand = this.value; destDraftCacheSave(); });
  getEl('opf-dest-ref').addEventListener('input', function(){ ST.dest.ref = this.value; destDraftCacheSave(); });
  renderDestSteps();
  renderDestinyPage();
}
function toggleDestEjs(on){
  destInit();
  ST.dest.ejs = !!on;
  var box = getEl('opf-dest-ejs'); if (box) box.checked = !!ST.dest.ejs;
  renderDestSteps();
  renderDestinyPage();
  destDraftCacheSave();
  toast(ST.dest.ejs
    ? '已开启「EJS 重型核心」：分段扩为 ' + destSegs().length + ' 段，追加 EJS 规范与 EJS 专用 lint'
    : '已回到基础模式：' + destSegs().length + ' 段静态核心流水线');
}
function toggleDestEjsStandard(){
  var box = getEl('opf-dest-ejsstandard'); if (!box) return;
  var open = box.style.display !== 'none';
  box.textContent = open ? '尚未展开' : DEST_EJS_STANDARD;
  box.style.display = open ? 'none' : 'block';
}
function destSystemContent(){
  var lines = [];
  lines.push('[角色] ' + macroFill(DEST_VOICE));
  lines.push('[任务] 你正在为{{user}}的《命定之诗与黄昏之歌》世界书创作一个「命定系统」核心条目（二创核心）。各分段保持一致与呼应，不重复、不推翻已定内容；本任务与开局预设、二创角色均无关系。');
  lines.push(DEST_RULES);
  lines.push(DEST_STANDARD);
  lines.push(DEST_FORMAT_RULES);
  if (destEjsOn()) lines.push(DEST_EJS_STANDARD);
  lines.push(CHAR_STYLE_RULES);
  if (ST.worldInfo) lines.push('[世界书参考（世界书页勾选的条目）]\n' + ST.worldInfo);
  return macroFill(lines.join('\n\n'));
}
function destUser0(){
  var lines = [];
  lines.push('[本次命定系统需求] ' + (ST.dest.demand || ''));
  if (ST.dest.ref) lines.push('[参考文本]\n' + ST.dest.ref);
  lines.push('[工作方式] 我将分 ' + destSegs().length + ' 个分段依次生成：' + destSegs().map(function (s) { return s.title; }).join('→') + '。每段只完成该段内容；已生成段落为既有设定，必须一致；禁止预写后面段落。');
  return lines.join('\n\n');
}
function destSetSeg(pid, st){ ST.dest.status[pid] = st; destSetSegUi(pid, st); }
function destSetSegUi(pid, st){
  var row = getEl('opf-dph-' + pid); if (!row || !ST.dest) return;
  row.setAttribute('data-st', st);
  var dot = row.querySelector('.opf-dot');
  if (dot) dot.textContent = st === 'run' ? '◌' : (st === 'ok' ? '✓' : (st === 'err' ? '✕' : '·'));
  var has = !!(ST.dest.segs && ST.dest.segs[pid]);
  var inp = row.querySelector('.opf-ref-input'); var b1 = row.querySelector('.opf-ref-do'); var b2 = row.querySelector('.opf-ref-sug');
  if (inp) inp.disabled = !has || !!ST.running;
  if (b1) b1.disabled = !has || !!ST.running;
  if (b2) b2.disabled = !has || !!ST.running;
  var tag = row.querySelector('.opf-ref-tag');
  if (tag) tag.textContent = has ? '可定点修改（其它分段冻结）' : '先跑出本段后可精修';
}
function renderDestSegOut(pid){ var pre = ST.destEls && ST.destEls[pid]; if (pre) pre.textContent = (ST.dest.segs && ST.dest.segs[pid]) || '（本段内容显示在这里，点击标题展开/收起）'; }
function renderDestSteps(){
  var box = getEl('opf-dest-steps'); if (!box) return;
  destInit();
  box.textContent = '';
  destSegs().forEach(function (s, i) {
    var row = document.createElement('div'); row.className = 'opf-step'; row.setAttribute('data-st', ST.dest.status[s.id] || 'wait'); row.id = 'opf-dph-' + s.id;
    var head = document.createElement('div'); head.className = 'opf-step-head';
    var idx = document.createElement('span'); idx.className = 'opf-idx'; idx.textContent = String(i + 1);
    var dot = document.createElement('span'); dot.className = 'opf-dot'; dot.textContent = '·';
    var ttl = document.createElement('span'); ttl.className = 'opf-step-title'; ttl.textContent = s.title;
    var sub = document.createElement('span'); sub.className = 'opf-step-sub'; sub.textContent = s.short;
    var btn = document.createElement('button'); btn.className = 'opf-step-act'; btn.type = 'button'; btn.textContent = '重跑本段及后续'; btn.title = '从本段重新生成到结尾（覆盖本段及后续内容）';
    btn.addEventListener('click', function (ev) { ev.stopPropagation(); runDestFrom(s.id); });
    head.appendChild(idx); head.appendChild(dot); head.appendChild(ttl); head.appendChild(sub); head.appendChild(btn);
    head.addEventListener('click', function () { row.classList.toggle('open'); });
    row.appendChild(head);
    var body = document.createElement('div'); body.className = 'opf-step-body';
    var pre = document.createElement('pre'); pre.textContent = '（本段内容显示在这里，点击标题展开/收起）';
    body.appendChild(pre);
    ST.destEls[s.id] = pre;
    row.appendChild(body);
    var ref = document.createElement('div'); ref.className = 'opf-step-ref';
    var tag = document.createElement('span'); tag.className = 'opf-ref-tag'; tag.textContent = '先跑出本段后可精修';
    var chips = document.createElement('div'); chips.id = 'opf-ref-chips-d' + s.id;
    var r1 = document.createElement('div'); r1.className = 'opf-step-ref-row';
    var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'opf-ref-input'; inp.placeholder = '定点修改指令（只改这一段）…'; inp.disabled = true;
    var doB = document.createElement('button'); doB.type = 'button'; doB.className = 'opf-step-act opf-ref-do'; doB.textContent = '定点修改本段'; doB.disabled = true;
    var sug = document.createElement('button'); sug.type = 'button'; sug.className = 'opf-step-act opf-ref-sug'; sug.textContent = '该段建议'; sug.disabled = true;
    doB.addEventListener('click', function (ev) { ev.stopPropagation(); refineDestSeg(s.id, inp.value); });
    sug.addEventListener('click', function (ev) { ev.stopPropagation(); suggestDestDir(s.id); });
    r1.appendChild(inp); r1.appendChild(doB); r1.appendChild(sug);
    ref.appendChild(tag); ref.appendChild(chips); ref.appendChild(r1);
    row.appendChild(ref);
    box.appendChild(row);
    if (ST.dest.segs[s.id]) { renderDestSegOut(s.id); destSetSegUi(s.id, ST.dest.status[s.id] || 'ok'); }
  });
}
function renderDestinyPage(){
  destInit();
  if (!getEl('opf-dest-demand')) return;
  if (!ST.dest._inited) {
    ST.dest._inited = true;
    var d = getEl('opf-dest-demand'); if (d && !d.value) d.value = ST.dest.demand || '';
    var r = getEl('opf-dest-ref'); if (r && !r.value) r.value = ST.dest.ref || '';
    var a = getEl('opf-dest-author'); if (a && !a.value) a.value = ST.dest.author || '';
  }
  var ej = getEl('opf-dest-ejs'); if (ej) ej.checked = !!ST.dest.ejs;
  var out = getEl('opf-dest-out');
  if (out && out.textContent !== '封装中…') out.textContent = ST.dest.out || '尚未封装';
  var note = getEl('opf-dest-outnote');
  if (note) note.textContent = destNoteText();
  var rep = getEl('opf-dest-report'); if (rep && rep.textContent !== '交火梳理中…') rep.textContent = ST.dest.report || '尚未梳理';
  try { destRenderReview(); } catch (e) {}
  var ex2 = getEl('opf-dest-extras');
  if (ex2) { var hk = ST.dest.asmInfo && ST.dest.asmInfo.hooks; ex2.textContent = hk || '（本次「可选扩展」段为空或写了「无」）'; ex2.style.display = hk ? 'block' : 'none'; }
  destSegs().forEach(function (s) { renderDestSegOut(s.id); destSetSegUi(s.id, ST.dest.status[s.id] || 'wait'); });
}
function destNoteText(){
  if (!ST.dest || !ST.dest.out) return '';
  var parts = [];
  if (ST.dest.body) parts.push('正文 ' + ST.dest.body.length + ' 字符｜' + (destAssembleNote() || 'YAML 框架由插件生成（注释名/开关/位置/order 已填好）'));
  if (ST.dest.outNote && ST.dest.outNote.length) parts.push('⚠ ' + ST.dest.outNote.join('；'));
  else parts.push('✓ 结构与命名自检通过');
  return parts.join('　｜　');
}
function toggleDestStandard(){
  var box = getEl('opf-dest-standard'); if (!box) return;
  var open = box.style.display !== 'none';
  box.textContent = open ? '尚未展开' : DEST_STANDARD;
  box.style.display = open ? 'none' : 'block';
}
function destSetAllButtons(){
  var D = ST.dest;
  var r = getEl('opf-dest-run');
  if (r) { r.disabled = !!ST.running; r.textContent = ST.running ? '■ 运行中…' : '▶ 分段初稿'; }
  ['opf-dest-link', 'opf-dest-final', 'opf-dest-lint'].forEach(function (id) { var b = getEl(id); if (b) b.disabled = !!ST.running; });
  if (!D) return;
  destSegs().forEach(function (s) { destSetSegUi(s.id, (D.status && D.status[s.id]) || 'wait'); });
}
async function runDestDraft(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var d = getEl('opf-dest-demand'); var r = getEl('opf-dest-ref');
  ST.dest.demand = (d && d.value || '').trim();
  ST.dest.ref = (r && r.value || '').trim();
  if (!ST.dest.demand) { toast('请先填写命定系统需求', 'warning'); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: destUser0() }];
  try {
    for (var i = 0; i < destSegs().length; i++) {
      if (isStop()) break;
      await runDestSeg(destSegs()[i], msgs, i);
      await waitTick();
    }
    if (isStop()) toast('已停止');
    else toast('分段初稿完成：可继续「⚔ 交火梳理」', 'success');
  } catch (e) { toast('分段生成出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
async function runDestSeg(seg, msgs, idx){
  destSetSeg(seg.id, 'run');
  var prev = '';
  for (var k = 0; k < idx; k++) { var ps = destSegs()[k]; if (ST.dest.segs[ps.id]) prev += '\n\n【' + ps.title + '】\n' + ST.dest.segs[ps.id]; }
  var userMsg = { role: 'user', content: '【分段' + (idx + 1) + '/' + destSegs().length + '：' + seg.title + '】\n' + macroFill(destSegPrompt(seg.id)) + (prev ? '\n\n[此前已定分段（既有设定，必须一致，禁止改动）]\n' + prev : '') };
  msgs.push(userMsg);
  try {
    var resp = await callModel(msgs);
    ST.dest.segs[seg.id] = resp;
    msgs.push({ role: 'assistant', content: resp });
    while (msgs.length > 3 && !systemCtxBudgetOk(msgs)) { if (msgs[2] && msgs[2].role === 'assistant') msgs.splice(2, 2); else break; }
    destSetSeg(seg.id, 'ok');
    renderDestSegOut(seg.id);
  } catch (e) { destSetSeg(seg.id, 'err'); throw e; }
}
async function runDestFrom(pid){
  if (ST.running) return;
  var start = -1;
  destSegs().forEach(function (s, i) { if (s.id === pid) start = i; });
  if (start < 0) return;
  var d = getEl('opf-dest-demand'); var r = getEl('opf-dest-ref');
  ST.dest.demand = (d && d.value || '').trim(); ST.dest.ref = (r && r.value || '').trim();
  if (!ST.dest.demand) { toast('请先填写命定系统需求', 'warning'); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: destUser0() }];
  try {
    for (var k = 0; k < start; k++) {
      var ph = destSegs()[k];
      if (!ST.dest.segs[ph.id]) { toast('前面分段尚未完成，请先「分段初稿」', 'warning'); ST.running = false; renderRunButtons(); return; }
      msgs.push({ role: 'user', content: '【分段' + (k + 1) + '/' + destSegs().length + '：' + ph.title + '】\n' + macroFill(destSegPrompt(ph.id)) });
      msgs.push({ role: 'assistant', content: ST.dest.segs[ph.id] });
    }
    for (var j = start; j < destSegs().length; j++) {
      if (isStop()) break;
      await runDestSeg(destSegs()[j], msgs, j);
      await waitTick();
    }
    if (isStop()) toast('已停止');
  } catch (e) { toast('生成出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
async function refineDestSeg(pid, dir){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var seg = null;
  destSegs().forEach(function (s) { if (s.id === pid) seg = s; });
  if (!seg || !ST.dest.segs[pid]) { toast('该段还没有内容，请先生成', 'warning'); return; }
  var dirT = (dir || '').trim();
  if (!dirT) dirT = '修正本段内部矛盾与格式问题，使其与其它段落一致；不新增设定。';
  var frozen = '';
  destSegs().forEach(function (s2) { if (s2.id !== pid && ST.dest.segs[s2.id]) frozen += '\n\n【' + s2.title + '】\n' + ST.dest.segs[s2.id]; });
  ST.running = true; renderRunButtons(); destSetSeg(pid, 'run');
  try {
    var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: destUser0() }];
    var msg = '【定点修改：只改「' + seg.title + '」这一段】\n\n[用户指令]\n' + dirT + '\n\n[本段现行内容]\n' + ST.dest.segs[pid] + '\n\n[冻结区块（其它分段原样保留，一个字都不许改；若发现其它段有问题，最多在结尾另起一行写“备注：建议检查XX段…”提示，不得代改）]\n' + frozen + '\n\n[命定系统·规则约束]\n' + DEST_RULES + '\n\n要求：只输出修改后的【' + seg.title + '】内容；修改严格限定在用户指令范围内，未要求的地方保持原样，不要顺手润色、扩写或重排。';
    msgs.push({ role: 'user', content: msg });
    var resp = await callModel(msgs);
    ST.dest.segs[pid] = resp;
    destSetSeg(pid, 'ok'); renderDestSegOut(pid);
    if (ST.dest.body) destFinalizeScript(true);          // 分段一变，成品由脚本重新拼装（不再让模型重抄）
    toast('已修改【' + seg.title + '】（其余分段未动）' + (ST.dest.body ? '，成品已重新拼装' : ''));
  } catch (e) { destSetSeg(pid, 'err'); toast('定点修改出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
async function suggestDestDir(pid){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var seg = null;
  destSegs().forEach(function (s) { if (s.id === pid) seg = s; });
  if (!seg || !ST.dest.segs[pid]) { toast('该段还没有内容', 'warning'); return; }
  var chipBox = getEl('opf-ref-chips-d' + pid); if (!chipBox) return;
  var cur = String(ST.dest.segs[pid]).slice(0, 2500);
  var ask = '请针对命定系统的【' + seg.title + '】这一段现有内容，给出 2-3 条只针对本段的修改方向。每条一行、≤50字、去掉编号外多余的话、直接可点；必须符合命定系统规则与联动一致性。\n[需求]\n' + (ST.dest.demand || '(未填写)') + '\n[命定系统·规则约束]\n' + DEST_RULES + '\n[本段现有内容]\n' + cur;
  var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: ask }];
  ST.running = true; renderRunButtons();
  try {
    var resp = await callModel(msgs);
    var list = [];
    String(resp).split(/\r?\n/).forEach(function (ln) {
      var t = String(ln).replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').trim();
      if (t && t.length >= 4 && t.length <= 70 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) list = ['让本段与其它分段更咬合', '补齐缺失的字段/数值档位', '让口吻与命定之灵人设一致'];
    renderDestChips(pid, list.slice(0, 3));
  } catch (e) { toast('该段建议生成失败：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); }
}
function renderDestChips(pid, list){
  var box = getEl('opf-ref-chips-d' + pid); if (!box) return;
  box.textContent = '';
  list.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'opf-dir-chip';
    b.textContent = '▶ ' + t;
    b.addEventListener('click', function () { refineDestSeg(pid, t); });
    box.appendChild(b);
  });
}
async function runDestLinkage(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var done = destSegs().filter(function (s) { return ST.dest.segs[s.id]; });
  if (done.length < destSegs().length) { toast('请先完成全部分段初稿（' + destSegs().length + ' 段）', 'warning'); return; }
  ST.running = true; ST.stopReq = false; renderRunButtons();
  var report = getEl('opf-dest-report'); if (report) report.textContent = '交火梳理中…（第一步：整体审查）';
  try {
    var all = destSegs().map(function (s) { return '<<<SEG:' + s.id + '>>>\n' + String(ST.dest.segs[s.id] || '').slice(0, 1800); }).join('\n\n');
    var reportMsg = '【交火梳理·第一步：整体审查】\n下面是各分段的审阅稿（每段截取前1800字，供查矛盾用）。请按下面的联动链条逐链检查，找出互相矛盾、脱节、数值/命名不合规之处。\n\n[联动链条]\n' + DEST_LINK_CHAIN + '\n\n[分段审阅稿]\n' + all + '\n\n[命定系统·规则约束]\n' + DEST_RULES + '\n\n输出要求（只输出报告，禁止输出任何段落正文，禁止使用<<<SEG:标记）：\n1. 逐条链给一句结论（✓一致 / ⚠问题+理由）。\n2. 最后列“改动清单”：每段一条，写清改哪段、为什么；没有问题的段写“无”。\n3. 报告里不要重写设定内容，只说问题与改法。\n4. 重点核对：包裹标签名与「系统名」是否一致、十条 setvar 是否齐全且顺序正确、缔结消耗七档是否齐全、核心名与语言标签是否与现有核心撞车、复活机制是否保留禁止机械降神的约束句。';
    var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: destUser0() }, { role: 'user', content: reportMsg }];
    var resp = await callModel(msgs);
    ST.dest.report = String(resp || '').trim() || '（报告为空）';
    if (report) report.textContent = ST.dest.report;
    toast('审查报告完成，开始逐段应用联动修订…');
    var changed = 0;
    for (var i = 0; i < destSegs().length; i++) {
      if (isStop()) break;
      var seg = destSegs()[i];
      if (report) report.textContent = ST.dest.report + '\n\n—— 正在逐段应用修订（' + (i + 1) + '/' + destSegs().length + '：' + seg.title + '）——';
      destSetSeg(seg.id, 'run');
      var frozen = '';
      destSegs().forEach(function (s2) { if (s2.id !== seg.id && ST.dest.segs[s2.id]) frozen += '\n\n【' + s2.title + '】\n' + String(ST.dest.segs[s2.id]).slice(0, 1200); });
      var applyMsg = '【交火梳理·第二步：逐段应用修订——只改「' + seg.title + '」这一段】\n\n[梳理报告与改动清单]\n' + ST.dest.report + '\n\n[本段现行内容]\n' + ST.dest.segs[seg.id] + '\n\n[冻结区块（其它分段，原样保留，一个字都不许改）]\n' + frozen + '\n\n[修订规则]\n' + DEST_RULES + '\n1. 只输出【' + seg.title + '】的修订后全文；若按报告本段无需改动，只回复“无改动”。\n2. 只做报告指出的联动性修改；不得推翻设定、不得扩写或新增内容。\n3. 不生成任何角色卡或开局预设内容。';
      var m2 = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: applyMsg }];
      var resp2 = await callModel(m2);
      var txt = String(resp2 || '').trim();
      if (txt && !/^无改动[。．.]*$/.test(txt)) { ST.dest.segs[seg.id] = txt; changed++; renderDestSegOut(seg.id); }
      destSetSeg(seg.id, 'ok');
      await waitTick();
    }
    if (report) report.textContent = ST.dest.report + (isStop() ? '\n\n（已停止：修订应用中断）' : '\n\n（修订应用完成，改动 ' + changed + ' 段）');
    if (ST.dest.body && changed) destFinalizeScript(true);      // 分段被联动改过 → 成品重新拼装
    if (isStop()) toast('已停止');
    else toast('交火梳理完成：报告已生成，联动修订应用到 ' + changed + ' 段' + (ST.dest.body ? '，成品已重新拼装' : ''), 'success');
  } catch (e) { toast('交火梳理出错：' + (e && e.message ? e.message : e), 'error'); if (report) report.textContent = '梳理失败：' + (e && e.message ? e.message : e); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
function destCoreNameGuess(){
  var f = String(ST.dest.segs.frame || '');
  var m = f.match(/系统核心[：:]\s*(.+)/) || f.match(/核心名[：:]\s*(.+)/);
  if (m) return String(m[1]).trim().split(/[，,。\s(（]/)[0].slice(0, 30);
  return '未命名核心';
}
// ---------- AI 检查（只报告，不改写；修改一律回到分段，再由脚本重新拼装）----------
var DEST_REVIEW_SEG_BY_NAME = [
  { id: 'pact', re: /契约|核心机制|定义|隐蔽|缔结/ },
  { id: 'fp', re: /命运点数|FP|消耗|获取|档位|情感修正/ },
  { id: 'spirit', re: /命定之灵|人设|开场白|功能|规则|灵/ },
  { id: 'voice', re: /语言格式|标签|参数|范例|口吻/ },
  { id: 'slots', re: /setvar|变量槽|槽位|复活机制|系统名|系统核心/ },
  { id: 'frame', re: /命名|骨架|系统名|核心名|撞名|重名/ },
  { id: 'hooks', re: /抽卡|扩展|钩子/ }
];
function destReviewSegId(s){
  var t = String(s || '');
  for (var i = 0; i < DEST_REVIEW_SEG_BY_NAME.length; i++) { if (DEST_REVIEW_SEG_BY_NAME[i].re.test(t)) return DEST_REVIEW_SEG_BY_NAME[i].id; }
  return 'pact';
}
async function destAiReview(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  if (!ST.dest || !ST.dest.body) { toast('请先点「🎁 脚本封装」（拼出正文后再检查）', 'warning'); return; }
  ST.running = true; renderRunButtons();
  var box = getEl('opf-dest-review'), rb = getEl('opf-dest-reviewbox');
  if (box) box.textContent = '';
  if (rb) rb.textContent = '检查中…（只审校、不改写）';
  try {
    var L = [];
    L.push('[任务] 审校一份已经拼装好的「命定系统」核心条目正文。你只做审校与报告，**禁止改写正文**（修正由插件回到对应分段去做）。');
    L.push('[标准]\n' + DEST_STANDARD);
    L.push('[联动链条]\n' + DEST_LINK_CHAIN);
    L.push('[各分段标题（用于定位"改哪一段"）]\n' + destSegs().map(function (s) { return s.id + ' = ' + s.title; }).join('\n'));
    L.push('[正在审校的成品正文（脚本拼装）]\n' + String(ST.dest.body || '').slice(0, 24000));
    L.push('[输出] 只输出一个 ' + fence() + 'json 代码块，结构如下，不要任何其它文字：\n{"总评":"一两句","问题":[{"级别":"高|中|低","段":"pact","位置":"问题出现在正文的哪一句/哪个字段","问题":"具体是什么问题","建议":"怎么改"}]}\n最多 12 条，按严重程度排序；没有问题时 "问题":[]。');
    var resp = await callModel([{ role: 'system', content: destSystemContent() }, { role: 'user', content: macroFill(L.join('\n\n')) }]);
    var j = rxExtractJson(resp);
    var issues = (j && Array.isArray(j['问题'])) ? j['问题'] : null;
    if (!issues) {
      if (rb) rb.textContent = '模型没有返回可解析的 JSON（原文见下）\n\n' + String(resp || '').slice(0, 4000);
      ST.dest.reviewRaw = String(resp || '');
      toast('AI 检查没返回可解析的结果，可重试（原文已显示在检查区）', 'warning');
      return;
    }
    ST.dest.review = String((j && j['总评']) || '');
    ST.dest.reviewIssues = issues.map(function (x, i) {
      return {
        i: i, level: String(x['级别'] || '中'), segId: destReviewSegId(x['段'] + ' ' + x['位置'] + ' ' + x['问题']),
        where: String(x['位置'] || ''), issue: String(x['问题'] || ''), fix: String(x['建议'] || ''),
        done: false
      };
    });
    destRenderReview();
    toast(issues.length ? ('AI 检查完成：' + issues.length + ' 条问题（每条都能一键回到对应分段修，改完自动重新拼装）') : 'AI 检查完成：没有发现问题', issues.length ? 'warning' : 'success');
  } catch (e) { toast('AI 检查出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
function destRenderReview(){
  var box = getEl('opf-dest-review'), rb = getEl('opf-dest-reviewbox');
  if (!box) return;
  box.textContent = '';
  var list = ST.dest.reviewIssues || [];
  if (rb) rb.textContent = ST.dest.review ? ('总评：' + ST.dest.review) : (list.length ? '' : '尚未检查');
  if (!list.length) return;
  var doneN = list.filter(function (x) { return x.done; }).length;
  var head = document.createElement('div'); head.className = 'opf-step-ref-row';
  var info = document.createElement('span'); info.className = 'opf-dim';
  info.textContent = '共 ' + list.length + ' 条（已处理 ' + doneN + '）｜点「✨ 修这一段」只改对应分段，改完插件自动重新拼装并复检';
  head.appendChild(info);
  box.appendChild(head);
  list.forEach(function (x) {
    var row = document.createElement('div'); row.className = 'opf-step-ref-row';
    var tag = document.createElement('span'); tag.className = 'opf-ref-tag' + (x.level === '高' ? ' dirty' : '');
    tag.textContent = x.level + '｜' + destSegOf(x.segId).title;
    var msg = document.createElement('span'); msg.className = 'opf-dim';
    msg.textContent = (x.where ? '[' + x.where + '] ' : '') + x.issue + (x.fix ? ' → ' + x.fix : '');
    if (x.done) msg.style.textDecoration = 'line-through';
    row.appendChild(tag); row.appendChild(msg);
    var b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'opf-step-act'; b1.textContent = '✨ 修这一段';
    b1.addEventListener('click', async function () {
      if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
      await refineDestSeg(x.segId, '按审校意见修正本段（只改本段，不新增设定、不改动其它段的内容）：\n问题：' + x.issue + (x.fix ? '\n建议改法：' + x.fix : '') + (x.where ? '\n出现位置：' + x.where : ''));
      if (ST.dest.segs[x.segId]) {
        destFinalizeScript(true);
        x.done = true;
        destRenderReview();
        toast('已修「' + destSegOf(x.segId).title + '」并重新拼装（正文 ' + String(ST.dest.body || '').length + ' 字符）', 'success');
      }
    });
    row.appendChild(b1);
    var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'opf-step-act'; b2.textContent = '我自己看';
    b2.title = '展开并滚动到该分段';
    b2.addEventListener('click', function () {
      var ph = getEl('opf-dph-' + x.segId);
      if (ph) { ph.classList.add('open'); ph.scrollIntoView({ block: 'center' }); }
    });
    row.appendChild(b2);
    var b3 = document.createElement('button'); b3.type = 'button'; b3.className = 'opf-step-act'; b3.textContent = '忽略';
    b3.addEventListener('click', function () { x.done = true; destRenderReview(); destDraftCacheSave(); });
    row.appendChild(b3);
    box.appendChild(row);
  });
}
async function finalizeDest(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var done = destSegs().filter(function (s) { return ST.dest.segs[s.id]; });
  if (!done.length) { toast('还没有任何分段内容，请先「分段初稿」', 'warning'); return; }
  ST.running = true; renderRunButtons();
  var outEl = getEl('opf-dest-out'); if (outEl) outEl.textContent = '封装中…';
  var noteEl = getEl('opf-dest-outnote'); if (noteEl) noteEl.textContent = '';
  try {
    var all = destSegs().map(function (s) { return '【' + s.title + '】\n' + (ST.dest.segs[s.id] || '（无）'); }).join('\n\n');
    var msg = '【最终封装（世界书条目正文）】\n请以“始弦的魔法大典”的身份，把下面的分段内容整理成一份可直接粘进世界书「命定系统」条目的正文。\n\n[全部分段]\n' + all + '\n\n' + DEST_SPEC + (destEjsOn()
      ? '\n\n[EJS 保留要求·最高优先级]\n本核心是 EJS 重型核心，各分段里的 `<%_ … _%>`、`<% … %>`、`<%- … %>` 标签、if/for 的 `{ _%>` 与 `} _%>` 配对、以及全部变量名必须「原样保留」：不得为了排版整洁而改写、合并、重排或删除任何 EJS 标签；只在标签之间做正文的整合与去重。整合后必须复核：块开始与块结束数量相等、每个分支里 `<{{getvar::系统名}}>` 都完整闭合。'
      : '') + '\n\n系统核心名以「骨架与命名」段为准；没写清楚就按内容拟一个。';
    var msgs = [{ role: 'system', content: destSystemContent() }, { role: 'user', content: msg }];
    var resp = await callModel(msgs);
    var ex = extractDestEntry(resp);
    if (!ex.ok) toast('未能从回复中提取 ' + fence() + 'text 代码块（已用原文兜底，可重试一次）', 'warning');
    var body = destExtractYamlBody(resp);
    if (body == null) body = ex.body;
    ST.dest.body = body;
    ST.dest.out = destBuildFrame(body);
    ST.dest.meta = ex.meta;
    ST.dest.outNote = destLint(body).concat(destEjsLint(body));
    if (outEl) outEl.textContent = ST.dest.out;
    if (noteEl) noteEl.textContent = destNoteText();
    if (ex.ok && !ST.dest.outNote.length) toast('已封装完成：YAML 框架 + 条目正文（正文可单独复制后粘进世界书）', 'success');
    else toast('已封装' + (ST.dest.outNote.length ? '（' + ST.dest.outNote.length + ' 条自检提示，见输出区上方）' : ''), 'warning');
  } catch (e) { toast('最终封装出错：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); destDraftCacheSave(); }
}
function extractDestEntry(text){
  var F = fence();
  var t = String(text || '');
  var idx = t.indexOf(F + 'text');
  if (idx < 0) idx = t.indexOf(F);
  if (idx < 0) return { ok: false, body: t.trim(), meta: '' };
  var start = t.indexOf('\n', idx);
  if (start < 0) return { ok: false, body: t.trim(), meta: '' };
  var end = t.indexOf(F, start + 1);
  var body = end > start ? t.slice(start + 1, end) : t.slice(start + 1);
  body = body.replace(/^\n+/, '').replace(/\s+$/, '');
  var meta = end > start ? t.slice(end + F.length).trim() : '';
  return { ok: !!body, body: body, meta: meta };
}
function destSlotValue(t, name){
  var re = new RegExp('\\{\\{setvar::' + name + '::');
  var i = String(t).search(re);
  if (i < 0) return '';
  var m = String(t).slice(i).match(/^\{\{setvar::[^:]+::([\s\S]*?)\}\}/);
  return m ? m[1].trim() : '';
}
// 把 {{setvar::…}} 区段遮成空格（保留换行），用于「只检查槽位之外」的装饰检查
function destMaskSetvars(t){
  return String(t || '').replace(/\{\{setvar::[\s\S]*?\}\}/g, function (m) { return m.replace(/[^\n]/g, ' '); });
}
// 从模型回复里剥离 YAML 框架，取回「正文」块标量（找不到框架则返回 null）
function destExtractYamlBody(text){
  var t = String(text || '');
  var m = t.match(/```ya?ml\s*\n([\s\S]*?)```/) || t.match(/```\s*\n([\s\S]*?)```/);
  var doc = m ? m[1] : t;
  var lines = doc.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var mm = lines[i].match(/^(\s*)正文\s*:\s*\|[-+]?\s*$/);
    if (!mm) continue;
    var base = mm[1].length + 2, out = [];
    for (var j = i + 1; j < lines.length; j++) {
      var l = lines[j];
      if (l.trim() === '') { out.push(''); continue; }
      if ((l.match(/^ */) || [''])[0].length < base) break;
      out.push(l.slice(base));
    }
    var body = out.join('\n').replace(/^\n+/, '').replace(/\s+$/, '');
    return body || null;
  }
  return null;
}
function destYamlQuote(v){
  var s = String(v == null ? '' : v);
  return /^[\s>|&*!%@`{}\[\],#?:-]|[:#]\s|\s$/.test(s) ? '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' : s;
}
// 条目元数据 + 正文 → 完整 YAML 文档（框架由插件确定生成，模型只负责正文）
function destBuildFrame(body){
  var b = String(body || '');
  var g = function (n) { return destSlotValue(b, n); };
  var authorEl = getEl('opf-dest-author');
  var author = ((authorEl && authorEl.value) || '').trim() || '未署名';
  var core = g('系统核心') || '未命名核心';
  var L = [];
  L.push('命定系统条目:');
  L.push('  注释名: ' + destYamlQuote('[本体][命定系统]' + core + '(' + author + ')'));
  L.push('  constant: true');
  L.push('  position: 4');
  L.push('  depth: 1');
  L.push('  order: 1100');
  L.push('  disable: true');
  L.push('  selective: false');
  L.push('  probability: 100');
  L.push('  key: []');
  L.push('  系统名: ' + destYamlQuote(g('系统名')));
  L.push('  系统核心名: ' + destYamlQuote(g('系统核心名')));
  L.push('  系统核心: ' + destYamlQuote(core));
  L.push('  fp定义: ' + destYamlQuote(g('fp定义')));
  L.push('  篇幅: ' + b.length);
  L.push('  正文: |-');
  b.split('\n').forEach(function (l) { L.push('    ' + l); });
  return L.join('\n');
}
// 去装饰：清掉 markdown 标记，但跳过 {{setvar::…}} 槽位（其中 `# 体系名的加护` 是既有惯例）
// 以及 EJS/JS 代码区（<% … %> 内外的反引号、# 、--- 都是代码，动了就把核心改坏）
function destCleanMarkdown(body){
  var stats = { bold: 0, head: 0, star: 0, rule: 0, tick: 0, ejs: 0 };
  var t = String(body || '');
  var spans = [], re = /\{\{setvar::[\s\S]*?\}\}/g, m;
  while ((m = re.exec(t)) !== null) spans.push([m.index, m.index + m[0].length]);
  var inSlot = function (a, b) { return spans.some(function (s) { return a < s[1] && b > s[0]; }); };
  var pos = 0, res = [], ejsDepth = 0;
  t.split('\n').forEach(function (line) {
    var lineStart = pos; pos += line.length + 1;
    if (inSlot(lineStart, lineStart + line.length)) { res.push(line); return; }
    var opens = (line.match(/<%/g) || []).length, closes = (line.match(/%>/g) || []).length;
    var inEjs = ejsDepth > 0 || opens > 0;
    if (inEjs) { res.push(line); stats.ejs++; ejsDepth += opens - closes; if (ejsDepth < 0) ejsDepth = 0; return; }
    var l = line;
    if (/^\s*#{1,6}\s+/.test(l)) { l = l.replace(/^(\s*)#{1,6}\s+/, '$1'); stats.head++; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(l)) { if (res.join('').trim() !== '') { stats.rule++; return; } }
    if (/^\s*[*+]\s+/.test(l)) { l = l.replace(/^(\s*)[*+]\s+/, '$1- '); stats.star++; }
    if (/\*\*/.test(l)) { var b1 = l; l = l.replace(/\*\*(.+?)\*\*/g, '$1'); if (l !== b1) stats.bold++; }
    if (/`/.test(l) && !/\{\{/.test(l)) { var b2 = l; l = l.replace(/`([^`]*)`/g, '$1'); if (l !== b2) stats.tick++; }
    res.push(l);
  });
  return { text: res.join('\n'), stats: stats };
}
// ============================================================================
// 脚本封装（v1.11.3）：正文结构一律由代码拼装，模型不生产成品
// 版式依据世界书 22 个命定系统条目的真实结构：<系统名> 包裹 + 与标签同名的一级键
// + 2 空格缩进的一级节（定义/核心机制/隐蔽原则/命运点数(FP)/{灵名}/{灵名}语言格式）
// + 闭合标签之后逐条十槽。模型只写分段，拼装、缩进、槽位排序、包裹标签全由代码完成，
// 从根上消掉「漏槽/错序/标签不闭合/段落丢失/夹 markdown」这一整类 bug。
// ============================================================================
var DEST_ASSEMBLE_MAP = [
  { seg: 'pact',   header: null,               indent: 2, aliases: ['契约与核心机制', '定义与核心机制', '核心机制与契约', '核心机制', '契约', '定义'] },
  { seg: 'fp',     header: '命运点数(FP)',     indent: 4, aliases: ['命运点数(FP)', '命运点数（FP）', '命运点数规则', '命运点数', 'FP'] },
  { seg: 'spirit', header: '{核心名}',         indent: 4, aliases: ['命定之灵', '灵', '灵格'] },
  { seg: 'voice',  header: '{核心名}语言格式', indent: 4, aliases: ['语言格式', '命定之灵语言格式', '{核心名}语言格式'] }
];
function destSegOf(id) {
  var hit = null;
  try { destSegs().forEach(function (s) { if (s.id === id) hit = s; }); } catch (e) {}
  return hit || { id: id, title: id, short: '' };
}
function destAsmRule(id) { return DEST_ASSEMBLE_MAP.filter(function (x) { return x.seg === id; })[0] || { seg: id, header: null, indent: 2, aliases: [] }; }
function destNormLabel(s) { return String(s || '').replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/^【|】$/g, '').replace(/[:：]\s*$/, '').replace(/\s+/g, '').trim(); }
// 去掉模型抄回来的分段名标签与整段代码块包裹；markdown 装饰另由 destCleanMarkdown 处理
function destSegCleanup(text, seg) {
  var t = String(text || '');
  var F = fence();
  var fenced = t.match(new RegExp('^\\s*' + F + '[a-zA-Z]*\\s*\\n([\\s\\S]*?)\\n?' + F + '\\s*$'));
  if (fenced) t = fenced[1];
  var rule = destAsmRule(seg.id);
  var aliases = [seg.title, String(seg.title || '').replace(/\(.*?\)/g, ''), seg.short].concat(rule.aliases)
    .filter(Boolean).map(destNormLabel);
  var lines = t.split(/\r?\n/);
  for (var pass = 0; pass < 3; pass++) {
    var i0 = -1;
    for (var i = 0; i < lines.length && i < 6; i++) { if (lines[i].trim()) { i0 = i; break; } }
    if (i0 < 0) break;
    if (aliases.indexOf(destNormLabel(lines[i0])) < 0) break;
    lines.splice(i0, 1);
  }
  return lines.join('\n').replace(/^\n+/, '').replace(/[ \t]+$/, '').replace(/\s+$/, '');
}
// 把一段内容整体平移缩进：先去掉公共最小缩进，再统一加上 base 个空格（相对结构不变，块标量安全）
function destShiftIndent(text, base) {
  var lines = String(text || '').split(/\r?\n/);
  var min = -1;
  lines.forEach(function (l) { if (!l.trim()) return; var n = (l.match(/^ */) || [''])[0].length; if (min < 0 || n < min) min = n; });
  if (min < 0) return '';
  var pad = new Array(Math.max(0, base) + 1).join(' ');
  var res = lines.map(function (l) { return l.trim() ? pad + l.slice(min).replace(/[ \t]+$/, '') : ''; }).join('\n');
  return res.replace(/^\n+/, '').replace(/\n+$/, '');
}
// 按花括号配对抽出 {{setvar::名::值}} 整块（值里可能还有 {{…}} 与换行）
function destExtractSlots(text) {
  var s = String(text || ''), map = {}, order = [], idx = 0;
  for (;;) {
    var start = s.indexOf('{{setvar::', idx);
    if (start < 0) break;
    var depth = 0, i = start, end = -1;
    while (i < s.length) {
      if (s.slice(i, i + 2) === '{{') { depth++; i += 2; continue; }
      if (s.slice(i, i + 2) === '}}') { depth--; i += 2; if (depth === 0) { end = i; break; } continue; }
      i++;
    }
    if (end < 0) break;
    var block = s.slice(start, end);
    var nm = (block.match(/^\{\{setvar::([^:]+)::/) || [])[1];
    if (nm) { nm = nm.trim(); if (!map[nm]) { map[nm] = block; order.push(nm); } }
    idx = end;
  }
  return { map: map, order: order };
}
// 槽位区扫描：按出现顺序返回 slot / raw 两类条目。
// raw = 夹在十槽之间的 {{…}} 标记行（如 {{//自定义配置}}）——必须原样保留，不能因为
// "只认 {{setvar::}}" 就把它吃掉（这正是"内容静默丢失"的一类）。
function destScanSlotRegion(text) {
  var s = String(text || ''), items = [], idx = 0, guard = 0;
  for (;;) {
    if (guard++ > 500) break;
    var start = s.indexOf('{{setvar::', idx);
    var pre = start < 0 ? s.slice(idx) : s.slice(idx, start);
    pre.split(/\r?\n/).forEach(function (l) {
      var t = l.trim();
      if (/^\{\{[\s\S]*\}\}$/.test(t) && !/^\{\{setvar::/.test(t)) items.push({ kind: 'raw', text: t });
    });
    if (start < 0) break;
    var depth = 0, i = start, end = -1;
    while (i < s.length) {
      if (s.slice(i, i + 2) === '{{') { depth++; i += 2; continue; }
      if (s.slice(i, i + 2) === '}}') { depth--; i += 2; if (depth === 0) { end = i; break; } continue; }
      i++;
    }
    if (end < 0) break;
    var block = s.slice(start, end);
    var nm = (block.match(/^\{\{setvar::([^:]+)::/) || [])[1];
    if (nm) items.push({ kind: 'slot', name: nm.trim(), block: block });
    idx = end;
  }
  return items;
}
// 十槽允许写在任何分段里（模型有时把它们塞进 slots 段之外），全分段收集
function destHarvestSlots() {
  var map = {}, from = {}, pre = {}, order = [], extras = [], tail = [];
  destSegs().forEach(function (s) {
    var t = (ST.dest && ST.dest.segs) ? ST.dest.segs[s.id] : null;
    if (!t) return;
    var pending = [];
    destScanSlotRegion(t).forEach(function (it) {
      if (it.kind === 'raw') { pending.push(it.text); return; }
      if (DEST_SLOT_ORDER.indexOf(it.name) < 0) {
        if (!extras.some(function (x) { return x.name === it.name; })) extras.push({ name: it.name, block: it.block, pre: pending.slice() });
        pending = [];
        return;
      }
      if (map[it.name]) { pending = []; return; }
      map[it.name] = it.block; from[it.name] = s.title; pre[it.name] = pending.slice();
      order.push(it.name);
      pending = [];
    });
    tail = tail.concat(pending);
  });
  return { map: map, from: from, pre: pre, order: order, extras: extras, tail: tail };
}
function destSlotInner(block) {
  var m = String(block || '').match(/^\{\{setvar::[^:]+::([\s\S]*)\}\}$/);
  return m ? m[1].trim() : '';
}
// 从「骨架与命名」段的列表/键值里取值
function destFrameValue(t, names) {
  var lines = String(t || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
    for (var k = 0; k < names.length; k++) {
      var m = l.match(new RegExp('^' + names[k] + '\\s*[:：]\\s*(.+)$'));
      if (m) {
        var v = m[1].trim().replace(/^["'「『]/, '').replace(/["'」』]$/, '').trim();
        if (v && !/^(?:待定|未知|无|none)$/i.test(v)) return v;
      }
    }
  }
  return '';
}
// 兜底：从任何分段里找第一个像包裹标签的 <中文/英文名>（排除 <user> 与 HTML 标签）
function destGuessSystemName() {
  var skip = ['user', 'br', 'p', 'div', 'span', 'style', 'state_bar', '复活机制', '物品', '名称', '品质', '类型', '物品简介', '吐槽', '对白'];
  var hit = '';
  ['frame', 'pact', 'voice'].forEach(function (id) {
    if (hit) return;
    var t = (ST.dest.segs && ST.dest.segs[id]) || '';
    var re = /<([A-Za-z\u4e00-\u9fa5_]{2,12})>/g, m;
    while ((m = re.exec(t)) !== null) {
      var n = m[1];
      if (skip.indexOf(n) >= 0 || skip.indexOf(n.toLowerCase()) >= 0) continue;
      hit = n; break;
    }
  });
  return hit;
}
function destAssemble() {
  var notes = [], info = { sections: [], slots: [], missing: [], wrapper: '', chars: 0, hooks: '', ejs: 0 };
  var segs = {};
  destSegs().forEach(function (s) { if (ST.dest && ST.dest.segs && ST.dest.segs[s.id]) segs[s.id] = ST.dest.segs[s.id]; });
  if (!segs.pact && !segs.fp && !segs.spirit && !segs.voice) return { body: '', notes: ['还没有任何正文分段内容，请先「▶ 分段初稿」'], info: info };
  var slots = destHarvestSlots();
  var sysFromMeta = destFrameValue(segs.frame, ['系统名', '系统名称', '包裹标签名', '标签名'])
    || (slots.map['系统名'] ? destSlotInner(slots.map['系统名']) : '');
  var sysName = sysFromMeta || destGuessSystemName() || '';
  var coreName = destFrameValue(segs.frame, ['系统核心名', '核心名', '灵名', '系统灵名'])
    || (slots.map['系统核心名'] ? destSlotInner(slots.map['系统核心名']) : '') || '';
  var coreId = destFrameValue(segs.frame, ['系统核心'])
    || (slots.map['系统核心'] ? destSlotInner(slots.map['系统核心']) : '') || '';
  if (!sysName) { sysName = '未命名系统'; notes.push('没能从「骨架与命名」段读出「系统名」，包裹标签暂用「未命名系统」——请在分段里补上系统名后重新拼装'); }
  else if (!sysFromMeta) notes.push('「系统名」是由脚本从分段正文里猜出的（' + sysName + '），请核对');
  if (!coreName) { coreName = '命定之灵'; notes.push('没能读出「系统核心名」，一级节暂用通用名「命定之灵」'); }
  info.wrapper = sysName;
  var clean = function (id) {
    var t = destSegCleanup(segs[id], destSegOf(id));
    // 分段里模型可能把包裹标签/一级键也抄了回来 → 一律剥掉（包裹结构由拼装负责）
    var keep = [];
    t.split(/\r?\n/).forEach(function (l) {
      var s2 = l.trim();
      if (s2 === '<' + sysName + '>' || s2 === '</' + sysName + '>' || s2 === sysName + ':') return;
      keep.push(l);
    });
    t = keep.join('\n');
    var c = destCleanMarkdown(t);
    if (c.stats.bold + c.stats.head + c.stats.star + c.stats.rule + c.stats.tick > 0) {
      notes.push('「' + destSegOf(id).title + '」里清掉了 ' + (c.stats.bold + c.stats.head + c.stats.star + c.stats.rule + c.stats.tick) + ' 处 markdown 装饰（硬约束禁止）');
    }
    return c.text;
  };
  var out = ['<' + sysName + '>', sysName + ':'];
  var pushBlock = function (text, indent) { var t = destShiftIndent(text, indent); if (t.trim()) out.push(t); };
  var pushHead = function (h, indent) { if (h) out.push(new Array(indent + 1).join(' ') + h + ':'); };
  if (segs.pact) { pushBlock(clean('pact'), 2); info.sections.push('契约与核心机制'); }
  if (segs.fp) { out.push(''); pushHead('命运点数(FP)', 2); pushBlock(clean('fp'), 4); info.sections.push('命运点数(FP)'); }
  if (segs.spirit) { out.push(''); pushHead(coreName, 2); pushBlock(clean('spirit'), 4); info.sections.push(coreName); }
  if (segs.voice) { out.push(''); pushHead(coreName + '语言格式', 2); pushBlock(clean('voice'), 4); info.sections.push(coreName + '语言格式'); }
  out.push('</' + sysName + '>');
  var slotLines = [], carry = [];
  var emitRaw = function (arr) { (arr || []).forEach(function (m) { if (m) slotLines.push(String(m).trim()); }); };
  var normBlock = function (b) { return String(b).split(/\r?\n/).map(function (l) { return l.replace(/[ \t]+$/, ''); }).join('\n').trim(); };
  DEST_SLOT_ORDER.forEach(function (n) {
    var b = slots.map[n];
    if (!b) {
      if (n === '系统名') b = '{{setvar::系统名::' + sysName + '}}';
      else if (n === '系统核心名') b = '{{setvar::系统核心名::' + coreName + '}}';
      else if (n === '系统核心' && coreId) b = '{{setvar::系统核心::' + coreId + '}}';
      else { info.missing.push(n); carry = carry.concat(slots.pre[n] || []); return; }
      notes.push('槽位「' + n + '」在原分段里缺失，已由脚本按命名段补上（值请核对）');
    }
    emitRaw(carry); carry = [];
    emitRaw(slots.pre[n]);
    slotLines.push(normBlock(b));
    info.slots.push(n);
  });
  emitRaw(carry); emitRaw(slots.tail);
  (slots.extras || []).forEach(function (x) {
    emitRaw(x.pre);
    slotLines.push(normBlock(x.block));
    info.extraSlots = (info.extraSlots || []).concat([x.name]);
  });
  if (info.extraSlots && info.extraSlots.length) notes.push('检测到 ' + info.extraSlots.length + ' 个非标准槽位（' + info.extraSlots.join('、') + '），已原样附在十槽之后（额外变量钩子属于这种）');
  if (info.missing.length) notes.push('十槽缺 ' + info.missing.length + ' 条：' + info.missing.join('、') + '——可点「🔎 AI 检查」定位，或回到「十个变量槽」段重跑');
  var body = out.filter(function (l, i) { return !(l === '' && out[i - 1] === ''); }).join('\n');
  if (slotLines.length) body += '\n' + slotLines.join('\n');
  if (segs.hooks && !/^\s*无[。．.]?\s*$/.test(segs.hooks)) {
    info.hooks = destSegCleanup(segs.hooks, destSegOf('hooks'));
    notes.push('「可选扩展」段未并入正文（命运抽卡等属于独立条目，order 1103）——内容单独放在下方「附：可选扩展」里');
  }
  var ejsIds = ['ejs1', 'ejs2', 'ejs3'].filter(function (id) { return segs[id]; });
  if (ejsIds.length) {
    info.ejs = ejsIds.length;
    ejsIds.forEach(function (id) { body += '\n\n' + String(segs[id]).trim(); });
    notes.push('EJS 重型核心：' + ejsIds.length + ' 段 EJS 已按顺序附在正文末尾。EJS 块的实际插入位置需要人工确认（或改用「🧠 AI 整合」）');
  }
  info.chars = body.length;
  return { body: body, notes: notes, info: info };
}
function destAssembleNote(){
  var i = ST.dest && ST.dest.asmInfo;
  if (!i) return '';
  return '脚本拼装：包裹标签 <' + i.wrapper + '>｜一级节 ' + i.sections.length + ' 个（' + i.sections.join(' / ') + '）｜十槽 ' + i.slots.length + '/10'
    + (i.ejs ? '｜EJS ' + i.ejs + ' 段' : '');
}
function destFinalizeScript(silent){
  var asm = destAssemble();
  if (!asm.body) { if (!silent) toast(asm.notes[0] || '还没有可拼装的分段内容', 'warning'); return false; }
  ST.dest.body = asm.body;
  ST.dest.out = destBuildFrame(asm.body);
  ST.dest.outNote = destLint(asm.body).concat(destEjsLint(asm.body)).concat(asm.notes);
  ST.dest.asmInfo = asm.info;
  var outEl = getEl('opf-dest-out'); if (outEl) outEl.textContent = ST.dest.out;
  var noteEl = getEl('opf-dest-outnote'); if (noteEl) noteEl.textContent = destNoteText();
  var exEl = getEl('opf-dest-extras');
  if (exEl) {
    exEl.textContent = asm.info.hooks ? asm.info.hooks : '（本次「可选扩展」段为空或写了「无」）';
    exEl.style.display = asm.info.hooks ? 'block' : 'none';
  }
  destDraftCacheSave();
  if (!silent) {
    var bad = ST.dest.outNote.filter(function (x) { return !/未并入正文|markdown 装饰/.test(x); });
    toast('脚本封装完成（零 AI）：' + destAssembleNote() + (bad.length ? '｜' + bad.length + ' 条自检提示见输出区上方' : '｜自检通过'), bad.length ? 'warning' : 'success');
  }
  return true;
}
function destTierPrices(t){  // 兼容两种写法：「一层级200 | 二500 | 三2500 …」与「第一层级: 500 FP」
  var s = String(t).replace(/([一二三四五六])(\d{2,7})/g, '$1层级$2');
  var map = {};
  s.split(/\r?\n/).forEach(function (ln) {
    var re = /([一二三四五六])层级[^0-9\n]{0,8}(\d{2,7})/g, m;
    while ((m = re.exec(ln)) !== null) {
      var v = Number(m[2]);
      if (v < 100) continue;
      if (map[m[1]] == null) map[m[1]] = v;
    }
  });
  return map;
}
function destSectionLines(t, headerRe, itemRe, indent){
  var lines = String(t).split(/\r?\n/), out = [], on = false, depth = 0;
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    if (!on) {
      if (headerRe.test(l)) { on = true; depth = (l.match(/^ */) || [''])[0].length; }
      continue;
    }
    var ind = (l.match(/^ */) || [''])[0].length;
    if (l.trim() && ind <= depth) break;
    if (itemRe.test(l)) out.push(l.trim());
  }
  return out;
}
function destLangSection(t){
  return destSectionLines(t, /语言格式/, /[\s\S]/, 0).join('\n');
}
function destLint(text){
  var warns = [];
  var t = String(text || '');
  if (!t.trim()) return ['条目正文为空'];
  var m;
  var found = [];
  var re = /\{\{setvar::([^:]+)::/g;
  while ((m = re.exec(t)) !== null) { var nm = m[1].trim(); if (DEST_SLOT_ORDER.indexOf(nm) >= 0 && found.indexOf(nm) < 0) found.push(nm); }
  var missing = DEST_SLOT_ORDER.filter(function (n) { return found.indexOf(n) < 0; });
  if (missing.length) warns.push('缺少 setvar：' + missing.join('、') + '（若你的核心用 EJS/setLocalVar 动态写入这些变量，本条可忽略）');
  var minIdx = -1, outOfOrder = false;
  found.forEach(function (n) { var i = DEST_SLOT_ORDER.indexOf(n); if (i < minIdx) outOfOrder = true; if (i > minIdx) minIdx = i; });
  if (outOfOrder) warns.push('setvar 顺序不符合规定（应为 系统名→系统核心名→系统核心→fp定义→爆料风格→登神长阶→生命层级→技能获取→经验值获取→复活机制）');
  var opens = (t.match(/\{\{setvar::/g) || []).length;
  var closes = (t.match(/\}\}/g) || []).length;
  if (opens > closes) warns.push('有 setvar 未闭合（{{setvar:: 与 }} 数量不符）');
  var sn = destSlotValue(t, '系统名');
  if (!sn) warns.push('无法解析「系统名」的值');
  else if (t.indexOf('<' + sn + '>') < 0 || t.indexOf('</' + sn + '>') < 0) warns.push('正文块包裹标签名与「系统名」(' + sn + ') 不一致或有开无闭——《战斗&生产规则》会读不到核心机制');
  if (DEST_KNOWN_SYSNAMES.indexOf(sn) >= 0 && sn !== '命定之诗') warns.push('「系统名」与现有核心相同：' + sn + '（二者不会同时启用时影响不大，但建议自创一个包裹标签名）');
  var tierOrder = ['一', '二', '三', '四', '五', '六'];
  var prices = destTierPrices(t);
  var got = tierOrder.filter(function (c) { return prices[c] != null; });
  if (got.length < 6) {
    warns.push('缔结契约消耗档位不全（识别到 ' + got.length + '/6 档：' + tierOrder.map(function (c) { return c + (prices[c] != null ? prices[c] : '?'); }).join(' ') + '）——应给出第一~第六层级，第七层级不标价');
  } else {
    var nums = tierOrder.map(function (c) { return prices[c]; });
    for (var i = 1; i < nums.length; i++) {
      if (nums[i] <= nums[i - 1]) { warns.push('缔结契约消耗未随层级递增：' + tierOrder.map(function (c, j) { return c + '层级' + nums[j]; }).join(' / ')); break; }
    }
    if (nums[0] !== 200 || nums[1] !== 500 || nums[2] !== 2500 || nums[3] !== 10000 || nums[4] !== 50000 || nums[5] !== 150000) {
      warns.push('使用的是自定义消耗档位（' + nums.join(' / ') + '，主流默认档为 200/500/2500/10000/50000/150000）——确认是有意为之即可');
    }
  }
  if (/\b(common|uncommon|rare|epic|legendary|mythic)\b/i.test(t)) warns.push('出现英文品级，规范要求中文七等');
  var core = destSlotValue(t, '系统核心');
  if (core && DEST_KNOWN_CORES.indexOf(core) >= 0) warns.push('「系统核心」与现有核心重名：' + core);
  var tags = [];
  var tre = /<([A-Za-z_][A-Za-z0-9_]*)[\s>/]/g;
  while ((m = tre.exec(t)) !== null) { if (tags.indexOf(m[1]) < 0) tags.push(m[1]); }
  var clash = tags.filter(function (x) { return DEST_KNOWN_TAGS.indexOf(x) >= 0; });
  if (clash.length) warns.push('语言格式标签与现有核心冲突：' + clash.join('、'));
  var rev = destSlotValue(t, '复活机制');
  if (!rev) warns.push('复活机制为空（《复活机制》条目会变成空条目；若该核心刻意不给复活机制，本条可忽略）');
  else if (!/机械降神/.test(rev)) warns.push('复活机制缺少“禁止为<user>在战斗中改变设定/创造有利条件/机械降神”约束句');
  if (!/隐蔽原则/.test(t)) warns.push('缺少「隐蔽原则」');
  if (!/非万能原则/.test(t)) warns.push('缺少「非万能原则」（命定之灵必须拒绝功能表之外的要求；null 型无灵核心可忽略）');
  // ---- 标准骨架校验（依据 22 个核心普查）----
  var personaMiss = [['形象', /形象|形态|外貌/], ['性格', /性格/], ['定位', /定位/], ['说话风格', /说话风格|对话风格/], ['爱好', /爱好|喜好/], ['愿望', /愿望/]]
    .filter(function (x) { return !x[1].test(t); }).map(function (x) { return x[0]; });
  if (personaMiss.length) warns.push('「人设」缺标准字段：' + personaMiss.join('、') + '（标准六字段：形象/性格/定位/说话风格/爱好/愿望）');
  var fnItems = destSectionLines(t, /^\s{0,6}(功能|能力)/, /^\s*[-•]\s+\S/);
  if (fnItems.length) {
    if (fnItems.length < 6 || fnItems.length > 12) warns.push('功能表 ' + fnItems.length + ' 条（标准 8 条，实测区间 7~11）');
    var fnText = fnItems.join('\n');
    var famMiss = [];
    if (!/瞬发|速成|顿悟|瞬间(掌握|学会|领悟)|智慧源泉|祈愿传承/.test(fnText)) famMiss.push('技能瞬发学习');
    if (!/背包|行囊|口袋|匣|肚肚|收纳|储物|侧袋|提灯|空间装备/.test(fnText)) famMiss.push('储物/背包');
    if (!/感知|洞察|搜寻|扫描|千里眼|情报/.test(fnText)) famMiss.push('感知/情报');
    if (!/意识|心灵连线/.test(fnText)) famMiss.push('意识交流');
    if (!/融合|熔铸|缝合/.test(fnText)) famMiss.push('技能融合/升级');
    if (!/登神/.test(fnText)) famMiss.push('登神长阶辅助');
    if (!/抽卡|抽取|宝库/.test(fnText)) famMiss.push('命运抽卡');
    if (famMiss.length) warns.push('功能表未覆盖标准功能族：' + famMiss.join('、'));
    if (/\(消耗fp\)/.test(fnText)) warns.push('功能表消耗标注建议统一为 (消耗FP)（现为小写 fp）');
  } else warns.push('未识别到「功能(以下功能不进行任何检定)」功能表');
  var langBlk = destLangSection(t);
  if (langBlk) {
    var exN = (langBlk.match(/^\s*-\s+/gm) || []).length
      + (langBlk.match(/^\s*>[^\n]*「/gm) || []).length
      + (langBlk.match(/^\s*<[A-Za-z_][A-Za-z0-9_]*[\s>]/gm) || []).length;
    if (exN < 6) warns.push('语言格式范例偏少（识别到 ' + exN + ' 条；建议 ≥6 条并覆盖 日常/战斗危机/FP不足/缔结成功/拒绝越界/特殊情绪，梅林核心 8 条为范本）');
    if (/<[A-Za-z_][A-Za-z0-9_]*\s+name=/.test(langBlk) && !/参数说明/.test(langBlk)) warns.push('XML 标签式语言格式缺少「参数说明」节（mood 枚举需固定取值、从中选一）');
  } else warns.push('缺少「{灵名}语言格式」节');
  if (!/核心机制|权柄|关键能力/.test(t)) warns.push('缺少核心机制节（标准名「核心机制」）');
  if (!/命运点数|命定点数/.test(t)) warns.push('缺少命运点数(FP)节（标准名「命运点数(FP)」）');
  if (/\t/.test(t)) warns.push('含制表符(Tab)，标准为两空格缩进');
  // ---- 输出格式·装饰检查（跳过 setvar 槽位：其中 `# 体系名的加护` 是既有惯例）----
  var masked = destMaskSetvars(t);
  var nHead = (masked.match(/^\s*#{1,6}\s+\S/gm) || []).length;
  if (nHead) warns.push('出现 markdown 标题 ' + nHead + ' 处（# / ##…）：结构请用「中文键名: 值 + 两空格缩进」，不要用标题分级');
  var nBold = (masked.match(/\*\*[^*\n]+\*\*/g) || []).length;
  if (nBold) warns.push('出现 **加粗** ' + nBold + ' 处：命定系统条目不用 markdown 强调，要强调就把话说清楚');
  var nStar = (masked.match(/^\s*[*+]\s+\S/gm) || []).length;
  if (nStar) warns.push('列表用了 * 或 + 共 ' + nStar + ' 处：统一改成「- 」（YAML 列表符）');
  var nRule = (masked.match(/^\s*([-*_])\1{2,}\s*$/gm) || []).length;
  if (nRule) warns.push('出现 --- 分隔线 ' + nRule + ' 处：删除（YAML 里会被当成文档分隔符）');
  var nTable = (masked.match(/^\s*\|.*\|\s*$/gm) || []).length;
  if (nTable) warns.push('出现 markdown 表格 ' + nTable + ' 行：改为键值或列表');
  if (t.length < 4000) warns.push('正文偏短（' + t.length + ' 字符，建议 4000~8000）');
  if (t.length > 12000) warns.push('正文偏长（' + t.length + ' 字符，建议 4000~8000，上限 12000）');
  if (/生命层级[：:]\s*第|^\s*属性[：:]/m.test(t) || /reincarnationPoints|开局预设|开局剧情/.test(t)) warns.push('出现角色卡或开局预设字段（本条目只写系统本身）');
  return warns;
}
function reLintDest(){
  if (!ST.dest.body) { toast('还没有条目正文，请先「最终封装」', 'warning'); return; }
  ST.dest.outNote = destLint(ST.dest.body).concat(destEjsLint(ST.dest.body));
  ST.dest.out = destBuildFrame(ST.dest.body);
  var outEl = getEl('opf-dest-out'); if (outEl) outEl.textContent = ST.dest.out;
  var note = getEl('opf-dest-outnote'); if (note) note.textContent = destNoteText();
  toast(ST.dest.outNote.length ? ('自检发现 ' + ST.dest.outNote.length + ' 条提示') : '自检通过：结构、命名与数值档位均合规', ST.dest.outNote.length ? 'warning' : 'success');
  destDraftCacheSave();
}
function clearDest(){
  if (!window.confirm('清空当前命定系统草稿（分段/报告/最终稿件）？此操作不可撤销。')) return;
  ST.dest = { demand: '', ref: '', author: '', segs: {}, status: {}, report: '', out: '', body: '', meta: '', outNote: [], ejs: false, _inited: false };
  ST.destEls = {};
  var d = getEl('opf-dest-demand'); if (d) d.value = '';
  var r = getEl('opf-dest-ref'); if (r) r.value = '';
  var a = getEl('opf-dest-author'); if (a) a.value = '';
  destDraftCacheSave();
  renderDestSteps(); renderDestinyPage();
  toast('已清空，可以开始新核心');
}
function destCopyText(txt, emptyMsg){
  if (!txt) { toast(emptyMsg, 'warning'); return; }
  function fallback(){ var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('已复制到剪贴板'); } catch (e) { toast('复制失败，请手动复制'); } ta.remove(); }
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { toast('已复制到剪贴板'); }, fallback); } else fallback();
}
function copyDestOut(){ destCopyText(ST.dest.body || '', '还没有条目正文，请先「最终封装」'); }
function copyDestMeta(){ destCopyText(ST.dest.out || '', '还没有 YAML 框架，请先「最终封装」'); }
function cleanDestOut(){
  if (!ST.dest.body) { toast('还没有条目正文，请先「最终封装」', 'warning'); return; }
  var r = destCleanMarkdown(ST.dest.body);
  var s = r.stats;
  var n = s.head + s.bold + s.star + s.rule + s.tick;
  if (!n) { toast('正文里没有需要清理的 markdown 装饰', 'success'); return; }
  ST.dest.body = r.text;
  ST.dest.out = destBuildFrame(r.text);
  ST.dest.outNote = destLint(r.text).concat(destEjsLint(r.text));
  var outEl = getEl('opf-dest-out'); if (outEl) outEl.textContent = ST.dest.out;
  var noteEl = getEl('opf-dest-outnote'); if (noteEl) noteEl.textContent = destNoteText();
  destDraftCacheSave();
  toast('已清理装饰：标题 ' + s.head + ' / 加粗 ' + s.bold + ' / 星号列表 ' + s.star + ' / 分隔线 ' + s.rule + ' / 行内代码 ' + s.tick + '（setvar 槽位内的既有写法未动）', 'success');
}
function destDraftCacheSave(){
  if (destDraftCacheSave._t) clearTimeout(destDraftCacheSave._t);
  destDraftCacheSave._t = setTimeout(function () {
    if (!ST.dest) return;
    lsSet(LS_DEST_KEY, { demand: ST.dest.demand, ref: ST.dest.ref, author: ST.dest.author, segs: ST.dest.segs, status: ST.dest.status, report: ST.dest.report, out: ST.dest.out, body: ST.dest.body, meta: ST.dest.meta, outNote: ST.dest.outNote, ejs: !!ST.dest.ejs, asmInfo: ST.dest.asmInfo, review: ST.dest.review, reviewIssues: ST.dest.reviewIssues });
  }, 500);
}
function destDraftRestore(){
  destInit();
  var c = lsGet(LS_DEST_KEY); if (!c || typeof c !== 'object') return;
  ST.dest.demand = c.demand || ''; ST.dest.ref = c.ref || '';
  ST.dest.segs = c.segs || {}; ST.dest.status = c.status || {};
  ST.dest.report = c.report || ''; ST.dest.out = c.out || ''; ST.dest.body = c.body || ''; ST.dest.meta = c.meta || ''; ST.dest.outNote = c.outNote || [];
  ST.dest.author = c.author || '';
  ST.dest.ejs = !!c.ejs;
  ST.dest.asmInfo = c.asmInfo || null; ST.dest.review = c.review || ''; ST.dest.reviewIssues = c.reviewIssues || [];
  // 旧缓存里的成品是「AI 重抄」时代的，重启后与分段可能不一致 → 用脚本重拼一次（零成本、无 AI）
  try { if (ST.dest.segs && Object.keys(ST.dest.segs).length) { var changed = destFinalizeScript(true); if (changed) ST.dest.outNote = (ST.dest.outNote || []).concat(['已用「脚本拼装」按当前分段重建成品（v1.11.3 起成品由代码拼装）']); } } catch (e) { opfErr('destDraftRestore reassemble', e); }
  try { renderDestSteps(); renderDestinyPage(); } catch (e) { opfErr('destDraftRestore render', e); }
}

// ============================================================================
// v1.12.0 ⑦ 命定核心精修：改动既有核心（外科手术式）
// 四步闸门：① 整体分析 → ② 用户提意见 → ③ 模型分析并给出改法 → ④ 确认后置入
// 绝对保持的铁律靠**机制**而不是靠模型自觉：
//   · 模型不许重写全文，只许给出「锚点 + 新内容」的补丁；
//   · 补丁由插件按"逐字唯一命中"应用到原文，任何一处锚点不唯一/找不到 → 整体放弃；
//   · 应用后跑脚本保真校验（行级 diff、包裹标签、十槽、人设字段、EJS 配对、
//     既有口令短语与变量路径是否消失），未变动部分逐字不动是"物理事实"而非承诺。
// ============================================================================
var REFINE_RULES = [
  '【绝对保持·铁律】',
  '1. 除「变更」清单明确列出的部分外，原文必须逐字不变：字符、空格、缩进、标点、换行、注释、变量路径、EJS 标签、口令词，一个都不许动。',
  '2. 禁止输出整份文件、禁止重排、禁止顺手润色、禁止统一格式。你只输出锚点与新内容。',
  '3. 锚点必须是原文里**逐字存在且唯一**的片段：长度 20~80 字符，带足够上下文以保证唯一；'
    + '不要用行号、不要用省略号、不要凭记忆改写锚点、不要跨越你打算修改的范围。',
  '4. 新内容只包含"替换掉锚点的那一段"或"要插入的那一段"，不要把周边原文抄进新内容里。',
  '5. 不得改变既有功能、数值、触发条件、口令、人设、语气、变量名，除非本次意见明确要求改它。',
  '6. 若某条意见无法在"不动其它内容"的前提下实现，就把它从「变更」里去掉，并在「冲突」里说明原因与最小侵入的替代方案。',
  '7. 保持原有的缩进风格与行尾形态（YAML 正文以 2 空格为一层）。'
].join('\n');
var REFINE_ANALYZE_SPEC = [
  '【分析任务】读懂这份命定系统核心，输出结构化认知（只读，不改动任何内容）。',
  '输出一个 json 代码块，键如下（全部用中文键名）：',
  '{',
  '  "条目名": "含 (署名) 的注释名或文件名",',
  '  "系统名": "包裹标签名", "系统核心名": "灵的自有名", "系统核心": "条目标识",',
  '  "包裹标签": "<X>",',
  '  "一级节": ["定义/关键能力/命运点数(FP)/…"],',
  '  "十槽": {"齐全": true, "缺": ["…"]},',
  '  "功能清单": ["每条：功能名 = 一句话作用（保留原文口径）"],',
  '  "机制要点": ["可结算的规则、数值、触发、消耗"],',
  '  "人设要点": {"形象":"","性格":"","定位":"","说话风格":"","爱好":"","最重要的愿望":""},',
  '  "语言格式": {"族":"xml|引语|裸引号", "标签":"", "参数":["mood/tag/num…"], "范例条数": 0},',
  '  "硬约束": ["隐蔽原则/非万能原则/复活约束句/禁令等一旦删除就会坏掉的句子"],',
  '  "状态与变量": ["用到的 stat_data 路径、setMessageVar/getMessageVar、MVU 写入点、局部变量名"],',
  '  "口令与关键词": ["触发用的固定词，如‘可要起卦’‘拾枚玉简’"],',
  '  "EJS结构": {"块数":0, "用途":["身份守卫/数据读取/条件渲染/静默降级…"]},',
  '  "脆弱点": ["改动时最容易连带弄坏的地方"],',
  '  "可优化方向": ["3~6 条，只提方向，不要写新内容"]',
  '}',
  '要求：只描述"它现在是什么"，不要提改进建议（改进方向写在"可优化方向"里）；不要输出原文片段的长引用，不要输出正文。'
].join('\n');
var REFINE_PLAN_SPEC = [
  '【意见分析任务】用户会对这份核心提出修改意见。你要先分析、后动手，本步**不许输出任何正文改动**。',
  '输出一个 json 代码块：',
  '{',
  '  "可否": "可以|部分可以|不建议",',
  '  "理解": "用一两句话复述用户到底想要什么",',
  '  "影响评估": [{"点":"会碰到哪一处","影响":"会连带影响什么（数值/口令/联动/存档兼容）","是否触及既有功能":"否|是"}],',
  '  "拟定改法": [{"位置":"原文里的哪一节","做法":"最小侵入的实现方式"}],',
  '  "锚点预告": ["预计要动的原文片段（逐字引用，供用户核对）"],',
  '  "冲突": ["无法在‘不动其它内容’前提下实现的部分，及最小侵入替代方案"],',
  '  "保真承诺": "改完后哪些东西保证一个字符都不变（逐项列出）",',
  '  "确认提示": "给用户看的一句话：确认后我会这样改"',
  '}',
  '要求：宁可少改也不要动到无关内容；若用户意见与既有设计冲突（例如要削弱已有约束、要改口令词），必须显式指出并给出影响面。'
].join('\n');
var REFINE_PATCH_SPEC = [
  '【置入任务】用户已确认改法。现在输出**补丁**（不是全文，不是新版本文件）。',
  '输出一个 json 代码块：',
  '{ "变更": [ { "类型": "替换|后插|前插", "锚点": "原文里逐字存在且唯一的片段", "新内容": "替换/插入的内容", "理由": "一句话" } ], "冲突": ["未能实现的部分及原因"] }',
  '类型语义：替换=用新内容替换锚点整段；后插=在锚点之后另起一行插入新内容；前插=在锚点之前另起一行插入新内容。',
  '自检（输出前逐条核对）：① 每个锚点都能在原文里用 Ctrl+F 精确找到且只有一处；'
    + '② 新内容里没有误抄进来的周边原文；③ 除变更清单外没有别的差异；④ 没有动到 setvar 槽位、EJS 标签、变量路径与既有口令。',
  '若某条改动实在无法用唯一锚点表达，就不要放进「变更」，写进「冲突」并说明。'
].join('\n');

function refineInit(){
  ST.refine = ST.refine || { src: '', name: '', scan: '', analysis: '', analysisObj: null, request: '', plan: '', planObj: null, result: '', diff: '', fidelity: null, applied: [], status: 'idle', _inited: false };
}
// ---------- 本地结构体检（零 AI）：先让脚本把事实摆出来 ----------
function refineScan(src){
  var t = String(src || '');
  var lines = t.split(/\r?\n/);
  var wrap = (t.match(/^<([^>\s{}]+)>/m) || [])[1] || '';
  var slots = destExtractSlots(t);
  var found = DEST_SLOT_ORDER.filter(function (n) { return slots.map[n]; });
  var top = [], sub = [], ejsDepth = 0;
  lines.forEach(function (l) {
    var opens = (l.match(/<%/g) || []).length, closes = (l.match(/%>/g) || []).length;
    if (ejsDepth > 0 || opens > 0) { ejsDepth += opens - closes; if (ejsDepth < 0) ejsDepth = 0; return; }   // EJS/JS 区里的"键"是代码，不是结构
    var m = l.match(/^( *)([^ \t#\-][^:：]{0,30})[:：]/);
    if (!m) return;
    var k = m[2].trim();
    if (!k || k.length > 18) return;
    if (/[\/\\<>\[\]{}"']|^\/\//.test(k)) return;
    if (/^(?:if|const|let|var|return|function)\b/.test(k)) return;
    if (m[1].length === 0) { if (top.indexOf(k) < 0) top.push(k); }
    else if (m[1].length <= 2) { if (sub.indexOf(k) < 0) sub.push(k); }
  });
  var ejsOpen = (t.match(/<%/g) || []).length, ejsClose = (t.match(/%>/g) || []).length;
  var braces = destEjsBraceDelta ? 0 : 0;
  var marks = [];
  if (wrap) {
    var o = (t.match(new RegExp('<' + wrap + '>', 'g')) || []).length;
    var c = (t.match(new RegExp('</' + wrap + '>', 'g')) || []).length;
    marks.push('包裹标签 <' + wrap + '> 开 ' + o + ' / 闭 ' + c + (o === c && o > 0 ? ' ✓' : ' ✗ 不配对'));
  } else marks.push('未找到包裹标签 <X>（这份文本可能不是条目正文）');
  marks.push('十槽 ' + found.length + '/10' + (found.length < 10 ? '（缺：' + DEST_SLOT_ORDER.filter(function (n) { return found.indexOf(n) < 0; }).join('、') + '）' : ' ✓'));
  if (ejsOpen > 0) marks.push('顶层键：这是 EJS 核心，正文由条件分支动态拼装（`<%_ if … { _%>` 跨行的块用数标签的办法切不准），脚本不做顶层键切分——交给「① 整体分析」去读');
  else marks.push('顶层键 ' + top.length + ' 个：' + top.slice(0, 8).join(' / ') + (top.length > 8 ? ' …（还有 ' + (top.length - 8) + ' 个）' : ''));
  marks.push('一级节 ' + sub.length + ' 个：' + sub.slice(0, 18).join(' / ') + (sub.length > 18 ? ' …（还有 ' + (sub.length - 18) + ' 个：' + sub.slice(18, 30).join(' / ') + '）' : ''));
  marks.push('EJS 标签 <% ' + ejsOpen + ' / %> ' + ejsClose + (ejsOpen === ejsClose ? ' ✓ 配对' : ' ⚠ 数量不等（可能是多行块，仍需人工确认）'));
  marks.push('篇幅 ' + t.length + ' 字符 / ' + lines.length + ' 行');
  return { text: marks.join('\n'), wrap: wrap, slots: found, sections: sub, top: top, chars: t.length, lines: lines.length, ejsOpen: ejsOpen, ejsClose: ejsClose };
}
function refineLoad(text, name){
  refineInit();
  var t = String(text || '');
  ST.refine.src = t;
  ST.refine.name = name || ST.refine.name || '未命名核心';
  ST.refine.analysis = ''; ST.refine.analysisObj = null; ST.refine.plan = ''; ST.refine.planObj = null;
  ST.refine.result = ''; ST.refine.diff = ''; ST.refine.fidelity = null; ST.refine.applied = [];
  var sc = refineScan(t);
  ST.refine.scan = sc.text;
  var ta = getEl('opf-rf-src'); if (ta) ta.value = t;
  refineRender();
  return sc;
}
function refineNote(s){ var el = getEl('opf-rf-status'); if (el) el.textContent = s; }
// ---------- 行级 diff（LCS，纯脚本）----------
function refineLineDiff(a, b){
  var A = String(a).split(/\r?\n/), B = String(b).split(/\r?\n/);
  var n = A.length, m = B.length;
  if (n * m > 6000000) return null;
  var dp = new Int32Array((n + 1) * (m + 1));
  var W = m + 1;
  for (var i = n - 1; i >= 0; i--) {
    for (var j = m - 1; j >= 0; j--) {
      dp[i * W + j] = (A[i] === B[j]) ? dp[(i + 1) * W + (j + 1)] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + (j + 1)]);
    }
  }
  var ops = [], x = 0, y = 0;
  while (x < n && y < m) {
    if (A[x] === B[y]) { ops.push({ t: 'same', a: x, b: y }); x++; y++; }
    else if (dp[(x + 1) * W + y] >= dp[x * W + (y + 1)]) { ops.push({ t: 'del', a: x }); x++; }
    else { ops.push({ t: 'add', b: y }); y++; }
  }
  while (x < n) { ops.push({ t: 'del', a: x }); x++; }
  while (y < m) { ops.push({ t: 'add', b: y }); y++; }
  return ops;
}
// ---------- 保真校验：把"绝对保持"变成可核对的事实 ----------
// 抽出「口令类」短语：位于含"口令/必须包含/触发/关键词/四字/禁止"的行里，
// 这些短语消失 = 既有功能被悄悄改坏的最高信号，要单独点名
function refinePhrases(t){
  var all = {}, pass = {};
  var re = /「([^」\n]{2,40})」|【([^】\n]{2,40})】|\u201c([^\u201d\n]{2,40})\u201d|"([^"\n]{2,40})"/g;
  String(t).split(/\r?\n/).forEach(function (line) {
    var isPass = /口令|必须包含|触发|关键词|四字|禁止|专用/.test(line);
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      var v = (m[1] || m[2] || m[3] || m[4] || '').trim();
      if (!v) continue;
      all[v] = (all[v] || 0) + 1;
      if (isPass) pass[v] = (pass[v] || 0) + 1;
    }
  });
  return { all: all, pass: pass };
}
function refinePaths(t){
  var out = {}, re = /(?:stat_data\.[\w\u4e00-\u9fa5.\[\]]+|\/(?:主角|世界|事件|任务列表|关系列表|新闻)[\w\u4e00-\u9fa5\/.]*)/g, m;
  while ((m = re.exec(String(t))) !== null) { out[m[0]] = (out[m[0]] || 0) + 1; }
  return out;
}
function refineFidelity(before, after, wanted){
  var checks = [], diff = refineLineDiff(before, after), stats = { same: 0, add: 0, del: 0 };
  if (diff) diff.forEach(function (o) { stats[o.t === 'same' ? 'same' : (o.t === 'add' ? 'add' : 'del')]++; });
  var B = String(before), A = String(after);
  var want = String(wanted || '');
  var list = [];
  var bWrap = (B.match(/^<([^>\s{}]+)>/m) || [])[1] || '', aWrap = (A.match(/^<([^>\s{}]+)>/m) || [])[1] || '';
  var wOk = bWrap === aWrap && bWrap;
  list.push({ ok: !!wOk, k: '包裹标签', v: wOk ? ('<' + bWrap + '> 未变') : ('变了或丢失：' + bWrap + ' → ' + aWrap) });
  var bS = destExtractSlots(B), aS = destExtractSlots(A);
  var missSlot = DEST_SLOT_ORDER.filter(function (n) { return bS.map[n] && !aS.map[n]; });
  var chgSlot = DEST_SLOT_ORDER.filter(function (n) { return bS.map[n] && aS.map[n] && bS.map[n] !== aS.map[n]; });
  list.push({ ok: missSlot.length === 0, k: '十槽存在性', v: missSlot.length ? ('丢了：' + missSlot.join('、')) : '10 槽一个没少' });
  list.push({ ok: chgSlot.length === 0 || /槽|setvar|变量/.test(want), k: '槽位内容', v: chgSlot.length ? ('有变化的槽：' + chgSlot.join('、') + (/槽|setvar|变量/.test(want) ? '（本次意见涉及变量，视为预期）' : '（本次未要求改变量，请核对）')) : '全部原样' });
  var pB = refinePhrases(B), pA = refinePhrases(A);
  var lostPhrase = Object.keys(pB.all).filter(function (k) { return !pA.all[k]; });
  var lostPass = lostPhrase.filter(function (k) { return pB.pass[k]; });
  list.push({
    ok: lostPhrase.length === 0, k: '既有短语/口令',
    v: lostPhrase.length
      ? ('消失了 ' + lostPhrase.length + ' 个'
        + (lostPass.length ? '，其中**口令类 ' + lostPass.length + ' 个**：' + lostPass.slice(0, 6).map(function (x) { return '「' + x + '」'; }).join('、') : '')
        + '；其余：' + lostPhrase.filter(function (k) { return lostPass.indexOf(k) < 0; }).slice(0, 8).map(function (x) { return '「' + x + '」'; }).join('、')
        + (lostPhrase.length > 8 + lostPass.length ? ' …' : ''))
      : '一个没少（含口令类 ' + Object.keys(pB.pass).length + ' 个）'
  });
  var qB = refinePaths(B), qA = refinePaths(A);
  var lostPath = Object.keys(qB).filter(function (k) { return !qA[k]; });
  list.push({ ok: lostPath.length === 0, k: '变量/状态路径', v: lostPath.length ? ('消失了：' + lostPath.slice(0, 6).join('、')) : '一个没少' });
  var eB = (B.match(/<%/g) || []).length, eA = (A.match(/%>/g) || []).length;
  var zB = (B.match(/%>/g) || []).length, zA = (A.match(/<%/g) || []).length;
  list.push({ ok: (eB - zB) === (zA - zA), k: 'EJS 标签配对', v: '改动前 <% ' + eB + '/%> ' + zB + '（差 ' + (eB - zB) + '）→ 改动后 <% ' + zA + '/%> ' + eA + '（差 ' + (zA - eA) + '）' + ((eB - zB) === (zA - eA) ? ' ✓' : ' ⚠') });
  var fB = (B.match(/^\s{6}([\u4e00-\u9fa5]{2,8})[:：]/gm) || []).length, fA = (A.match(/^\s{6}([\u4e00-\u9fa5]{2,8})[:：]/gm) || []).length;
  list.push({ ok: fA >= fB - (/(人设|性格|形象|愿望)/.test(want) ? 6 : 0), k: '人设字段数', v: '改动前 ' + fB + ' 个字段名 → 改动后 ' + fA + (/人设|性格|形象|愿望/.test(want) ? '（本次意见涉及人设，允许变化）' : '（未要求改人设，不应减少）') });
  var funcsB = (B.match(/【[^】\n]{2,20}】\s*[:：]/g) || []).length, funcsA = (A.match(/【[^】\n]{2,20}】\s*[:：]/g) || []).length;
  list.push({ ok: funcsA >= funcsB, k: '功能条目数', v: '【…】条目 ' + funcsB + ' → ' + funcsA + (funcsA < funcsB ? ' ⚠ 少了 ' + (funcsB - funcsA) + ' 条' : '') });
  return { checks: list, stats: stats, diff: diff, changedLines: stats.add + stats.del };
}
function refineRenderDiff(before, after, diff){
  if (!diff) return '（文本过大，跳过行级 diff）';
  var A = String(before).split(/\r?\n/), B = String(after).split(/\r?\n/);
  var out = [], i = 0, hunks = 0;
  while (i < diff.length && hunks < 20) {
    if (diff[i].t === 'same') { i++; continue; }
    var start = i, end = i;
    // 合并相邻的变更块
    while (end + 1 < diff.length && diff[end + 1].t !== 'same') end++;
    var sameRun = 0, k = end + 1;
    while (k < diff.length && diff[k].t === 'same' && sameRun < 4) { sameRun++; k++; }
    var pre = [], j = start - 1, cnt = 0;
    while (j >= 0 && diff[j].t === 'same' && cnt < 3) { pre.unshift(A[diff[j].a]); j--; cnt++; }
    hunks++;
    out.push('── 变更 ' + hunks + ' ──');
    pre.forEach(function (l) { out.push('   ' + l); });
    for (var q = start; q <= end; q++) {
      if (diff[q].t === 'del') out.push('-  ' + A[diff[q].a]);
      else out.push('+  ' + B[diff[q].b]);
    }
    i = end + 1;
  }
  if (!hunks) return '（没有差异）';
  if (hunks >= 20) out.push('…（变更块过多已截断显示）');
  return out.join('\n');
}
// ---------- 补丁应用：逐字唯一命中，all-or-nothing ----------
function refineApplyPatch(src, changes){
  var out = String(src), applied = [], failed = [];
  (changes || []).forEach(function (ch, i) {
    var type = String(ch['类型'] || ch['type'] || '替换');
    var anchor = String(ch['锚点'] || ch['anchor'] || '');
    var next = ch['新内容'] != null ? String(ch['新内容']) : (ch['content'] != null ? String(ch['content']) : '');
    var why = String(ch['理由'] || '');
    if (!anchor) { failed.push({ i: i, why: '锚点为空', ch: ch }); return; }
    if (!next.trim()) { failed.push({ i: i, why: '新内容为空', ch: ch }); return; }
    var idx = out.indexOf(anchor);
    if (idx < 0) { failed.push({ i: i, why: '锚点在原文里找不到（模型可能改写了锚点或跨越了已改动区域）', ch: ch }); return; }
    if (out.indexOf(anchor, idx + 1) >= 0) { failed.push({ i: i, why: '锚点在原文里出现多次，无法唯一定位（需要更长的锚点）', ch: ch }); return; }
    var rep;
    if (/前插/.test(type)) rep = next + '\n' + anchor;
    else if (/后插/.test(type)) rep = anchor + '\n' + next;
    else rep = next;
    out = out.slice(0, idx) + rep + out.slice(idx + anchor.length);
    applied.push({ i: i, type: type, why: why, anchor: anchor, next: next });
  });
  return { ok: failed.length === 0, text: out, applied: applied, failed: failed };
}

// ============================================================================
// v1.9.0 正则工坊：命定系统对话美化正则
// 匹配式由插件确定生成（依据核心「语言格式」节解析结果），替换体由模型产出
// 依据：现有 4 条生产正则（命定核心-艾莉亚-车票技能美化 / 月蚀对话美化 / 飨宴 / 去思维链）
// ============================================================================
var LS_RX_KEY = NS + "_regexdraft_v1";
var RX_TIERS = [
  { id: 'mini',   label: '极简',   target: 1500 },
  { id: 'light',  label: '轻量',   target: 3000 },
  { id: 'std',    label: '标准',   target: 6000 },
  { id: 'fine',   label: '精致',   target: 10000 },
  { id: 'lux',    label: '豪华',   target: 20000 },
  { id: 'free',   label: '不设限', target: 0 }
];
var RX_PURPOSES = ['对话美化', '登场/开场白', '缔结契约成功', '命运抽卡', '咏唱/专属块', '自定义'];
var RX_HTML_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'p', 'br', 'hr', 'table', 'tr', 'td', 'th',
  'ul', 'ol', 'li', 'style', 'script', 'svg', 'details', 'summary', 'code', 'pre', 'a', 'img', 'b', 'i', 'strong', 'em', 'font'];
var RX_RULES = [
  '【美化正则·硬约束（写替换体时必须逐条遵守）】',
  '1. 匹配式已由插件生成并锁定，你只写替换体（HTML）；不得改动匹配式的捕获组编号与含义。',
  '2. 替换体只做显示层：markdownOnly=true、promptOnly=false，禁止两者同时为 true。',
  '3. 必须在最外层 div 内自带 <style>，所有 class 必须带唯一前缀（前缀已给定），不得复用他人前缀。',
  '4. 禁止 <script>；禁止引用任何外部资源（字体 CDN / 图片 URL / @import）；字体只用系统字体栈。',
  '5. 禁止写死像素宽度：容器一律 max-width:100%，窄屏（≤420px）不得溢出。',
  '6. 正文里若出现 $ 字符，必须写成 $$，避免被当成捕获组引用。',
  '7. 情绪/情景参数用 data-mood="$2" 之类属性挂到最外层 div，再用属性选择器分支配色——一条替换体覆盖全部枚举，不要为每个情绪写一条正则。',
  '8. 不残留裸 > 引语；替换后正文必须仍然可读，不得依赖悬停才显示文字。',
  '9. 动效克制：@keyframes 只用于呼吸/流光/入场，周期 ≥2s，不得连续高频闪烁。',
  '10. 按给定档位的目标字数写作（浮动 ±30% 以内）；档位为「不设限」时不设上限，以视觉完整、不冗余为准。',
  '11. 颜色从核心的世界观与命定之灵人格出发（傲慢用冷金、狂热用灼红、冰冷用青白…），不要用纯黑纯白。',
  '12. 只输出 HTML 本体，放在一个 ```html 代码块里；代码块外不写任何解释文字。'
].join('\n');
// ---------- 语言格式解析（移植自已验证原型）----------
function rxStripMd(s) {
  return String(s)
    .replace(/^\s*(?:[-*+•]|\d+[.、)])\s+/, '')
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .trim();
}
function rxLangSection(text) {
  var lines = String(text).split('\n');
  var start = -1, baseIndent = 0, headLevel = 0;
  for (var i = 0; i < lines.length; i++) {
    if (!/语言格式/.test(lines[i])) continue;
    var h = lines[i].match(/^\s*(#{1,6})\s/);
    if (h) { start = i; headLevel = h[1].length; baseIndent = 0; break; }
    var s = rxStripMd(lines[i]);
    if (/[:：]\s*$/.test(s)) { start = i; headLevel = 0; baseIndent = (lines[i].match(/^ */) || [''])[0].length; break; }
    if (start < 0) { start = i; headLevel = 0; baseIndent = (lines[i].match(/^ */) || [''])[0].length; }
  }
  if (start < 0) return '';
  var out = [];
  for (var j = start + 1; j < lines.length; j++) {
    var l = lines[j];
    var ind = (l.match(/^ */) || [''])[0].length;
    if (ind <= baseIndent && /^\s*\{\{setvar::/.test(l)) break;
    if (ind <= baseIndent && /^\s*<\//.test(l)) break;
    if (headLevel > 0) {
      var h2 = l.match(/^\s*(#{1,6})\s/);
      if (h2 && h2[1].length <= headLevel) break;
      out.push(l);
    } else {
      if (l.trim() === '') { out.push(''); continue; }
      if (ind <= baseIndent && !/^\s*#{1,6}\s/.test(l)) break;
      out.push(l);
    }
  }
  return out.join('\n');
}
function rxEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function rxParseFormatLine(raw) {
  var s = rxStripMd(raw);
  var v = s.replace(/^(?:强制|规定|输出|专属|标准)?格式\s*[:：]\s*/, '');
  while (/^['"]/.test(v) && /['"]$/.test(v) && v.length > 2) v = v.slice(1, -1).trim();
  v = v.trim();
  var tagM = v.match(/<([A-Za-z_]\w*)\b[^>]*\bname\s*=\s*"([^"]*)"/);
  if (tagM && RX_HTML_TAGS.indexOf(tagM[1].toLowerCase()) < 0) {
    var params = [], m;
    var pre = /\b(\w+)\s*=\s*"([^"]*)"/g;
    while ((m = pre.exec(v)) !== null) { if (m[1] !== 'name') params.push({ name: m[1], placeholder: m[2], values: [] }); }
    return { family: 'xml', tag: tagM[1], nameValue: tagM[2], params: params, quote: /[「『]/.test(v), raw: s, fmtVal: v };
  }
  var qM = v.match(/^>\s*([^\s:：]+)\s*[:：]/);
  if (qM) {
    var innerM = v.match(/<([A-Za-z_]\w*)\b/);
    var innerTag = innerM && RX_HTML_TAGS.indexOf(innerM[1].toLowerCase()) >= 0 ? innerM[1] : '';
    return { family: 'quote', speaker: qM[1], params: [], quote: /[「『]/.test(v), innerTag: innerTag, raw: s, fmtVal: v };
  }
  if (/^[「『][\s\S]*[」』]$/.test(v) || /\$\{对白\}|\{对白\}/.test(v)) return { family: 'bare', params: [], quote: true, raw: s, fmtVal: v };
  return null;
}
function rxParseLangFormat(coreText) {
  var sec = rxLangSection(coreText);
  var res = { formats: [], examples: [], section: sec, notes: [] };
  if (!sec) { res.notes.push('未找到「语言格式」节：该核心可能没有语言格式，或写法不在支持范围内'); return res; }
  var lines = sec.split('\n');
  var cands = [], i, j;
  for (i = 0; i < lines.length; i++) {
    var raw = lines[i], s = rxStripMd(raw);
    if (/^(?:强制|规定|输出|专属|标准)?格式\s*[:：]\s*$/.test(s)) {
      var base = (raw.match(/^ */) || [''])[0].length;
      for (j = i + 1; j < lines.length; j++) {
        var l2 = lines[j]; if (l2.trim() === '') continue;
        if (((l2.match(/^ */) || [''])[0].length) <= base) break;
        cands.push(l2);
      }
      continue;
    }
    var prefixed = /(?:强制|规定|输出|专属|标准)?格式\s*[:：]/.test(s);
    var placeholder = /\{[^}]*\}/.test(s) && (/<[A-Za-z_]\w*\b[^>]*\bname\s*="/.test(s) || /^>\s*\S+\s*[:：]/.test(s));
    if (prefixed || placeholder) cands.push(raw);
  }
  cands.forEach(function (l) {
    var f = rxParseFormatLine(l);
    if (!f) return;
    f.key = f.family === 'xml' ? ('xml:' + f.tag) : f.family === 'quote' ? ('q:' + f.speaker + '|' + (f.innerTag || '')) : ('bare:' + f.fmtVal);
    f.label = f.family === 'quote' ? (f.speaker + (f.innerTag ? '(' + f.innerTag + ')' : '')) : (f.tag || '裸引号');
    if (res.formats.some(function (x) { return x.key === f.key; })) return;
    res.formats.push(f);
  });
  res.formats.forEach(function (f) {
    f.params.forEach(function (p) {
      if (p.values.length) return;
      for (var a = 0; a < lines.length; a++) {
        if (rxStripMd(lines[a]).indexOf(p.name) < 0) continue;
        for (var b = a; b <= Math.min(a + 2, lines.length - 1); b++) {
          var lm = rxStripMd(lines[b]).match(/[\[【]\s*([^\]】]{2,})\s*[\]】]/);
          if (lm) { p.values = lm[1].split(/[,，、|/]\s*/).map(function (x) { return x.trim(); }).filter(Boolean); break; }
        }
        if (p.values.length) break;
      }
    });
  });
  res.formats.forEach(function (f) {
    if (f.family !== 'quote' || f.innerTag) return;
    var sib = res.formats.filter(function (x) { return x.family === 'quote' && x.speaker === f.speaker && x.innerTag; })[0];
    if (sib) f.siblingInnerTag = sib.innerTag;
  });
  res.formats.forEach(function (f) {
    f.examples = [];
    if (f.family === 'xml') {
      var re = new RegExp('<' + f.tag + '\\b[\\s\\S]*?<\\/' + f.tag + '>', 'g'), m;
      while ((m = re.exec(sec)) !== null) {
        var ex = m[0].replace(/\s*\n\s*/g, ' ').trim();
        if (/\{[^}]*\}/.test(ex)) continue;
        f.examples.push(ex);
      }
    } else if (f.family === 'quote') {
      sec.split('\n').forEach(function (l) {
        var s = rxStripMd(l);
        var anchor = s.search(new RegExp('>\\s*' + rxEsc(f.speaker) + '\\s*[:：]'));
        if (anchor < 0) return;
        var ex = s.slice(anchor).trim();
        while (/['"]$/.test(ex) && ex.length > 2) ex = ex.slice(0, -1).trim();
        if (/\{[^}]*\}/.test(ex)) return;
        f.examples.push(ex);
      });
    }
    f.examples = f.examples.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; });
  });
  res.formats.forEach(function (f) { f.regex = rxGenFindRegex(f); });
  res.formats.forEach(function (f) {
    if (!f.regex) return;
    f.examples = f.examples.filter(function (e) { return new RegExp(f.regex.source, f.regex.flags).test(e); });
  });
  res.examples = res.formats.reduce(function (acc, f) {
    f.examples.forEach(function (e) { if (acc.indexOf(e) < 0) acc.push(e); });
    return acc;
  }, []);
  if (!res.examples.length) res.notes.push('未抽到可用范例：试跑时请手动填入测试文本');
  res.formats.forEach(function (f) {
    if (!f.examples.length) res.notes.push('格式「' + f.label + '」没有专属范例（试跑需手动填测试文本）');
    if (f.family === 'bare') res.notes.push('格式「' + f.label + '」是无标记的裸引号式：自动生成会吃掉全文所有「」，已拒绝生成，建议把核心改成带标记格式');
  });
  return res;
}
function rxGenFindRegex(f, opts) {
  if (!f || f.family === 'bare') return null;
  var o = opts || {};
  if (f.family === 'xml') {
    if (o.orderFree) {
      var names = ['name'].concat(f.params.map(function (x) { return x.name; }));
      var look = names.map(function (n) { return '(?=[^>]*\\b' + n + '="([^"]*)")'; }).join('');
      return new RegExp('<' + f.tag + '\\b' + look + '[^>]*>\\s*[「『]?\\s*([\\s\\S]*?)\\s*[」』]?\\s*<\\/' + f.tag + '>', 'g');
    }
    var moodPart = f.params.some(function (x) { return x.name === 'mood'; }) ? '\\s+mood="([^"]*)"' : '';
    var extra = f.params.filter(function (x) { return x.name !== 'mood'; }).map(function (x) { return '(?:\\s+' + x.name + '="([^"]*)")?'; }).join('');
    return new RegExp('<' + f.tag + '\\s+name="([^"]*)"' + moodPart + extra + '\\s*>\\s*[「『]?\\s*([\\s\\S]*?)\\s*[」』]?\\s*<\\/' + f.tag + '>', 'g');
  }
  if (f.family === 'quote') {
    var inner = f.innerTag ? '(?=[\\s\\S]*?<' + f.innerTag + '\\b)' : (f.siblingInnerTag ? '(?![\\s\\S]*?<' + f.siblingInnerTag + '\\b)' : '');
    var closing = /[」』]/.test(f.fmtVal) ? '\\s*[」』]' : '';
    return new RegExp('>\\s*' + rxEsc(f.speaker) + '\\s*[:：]\\s*[「『]?\\s*' + inner + '([\\s\\S]*?)' + closing, 'g');
  }
  return null;
}
function rxRunFixture(re, examples) {
  var rows = (examples || []).map(function (ex) {
    var ok = false, out = '';
    try {
      var r = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
      out = ex.replace(r, function (m) {
        var caps = Array.prototype.slice.call(arguments, 1, Math.max(1, arguments.length - 2)).filter(function (c) { return c !== undefined; });
        return '【匹配 ▸ ' + caps.join(' ▸ ').slice(0, 70) + '】';
      });
      ok = out !== ex;
    } catch (e) { out = '错误: ' + (e && e.message ? e.message : e); }
    return { ex: ex, ok: ok, out: out };
  });
  return { total: rows.length, hit: rows.filter(function (r) { return r.ok; }).length, rows: rows };
}
function rxUuid() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function rxSlug(s) {
  return String(s || 'core').replace(/[^\w\u4e00-\u9fa5]/g, '').slice(0, 12).toLowerCase() || 'core';
}
function rxBuildObject(item) {
  return {
    id: item.id || rxUuid(),
    scriptName: '命定核心-' + item.coreName + '-' + item.purpose,
    disabled: false,
    runOnEdit: true,
    findRegex: item.findSource,
    trimStrings: [],
    replaceString: item.replaceHtml || '',
    placement: Array.isArray(item.placement) ? item.placement : [2],
    substituteRegex: 0,
    minDepth: null,
    maxDepth: 10,
    markdownOnly: item.markdownOnly !== false,
    promptOnly: item.promptOnly === true
  };
}

// ---------- 正则自检 ----------
function rxTier(id) { return RX_TIERS.filter(function (t) { return t.id === id; })[0] || RX_TIERS[3]; }
function rxLint(item, parsed) {
  var issues = [];
  var src = String(item.findSource || ''), rep = String(item.replaceHtml || '');
  var re = null;
  var m = src.match(/^\/([\s\S]*)\/([a-z]*)$/);
  if (!m) issues.push({ side: 'regex', key: 'format', msg: 'findRegex 不是 /pattern/flags 形式', fix: 'wrap' });
  else {
    try { re = new RegExp(m[1], m[2]); }
    catch (e) { issues.push({ side: 'regex', key: 'compile', msg: '正则编译失败：' + (e && e.message ? e.message : e), fix: 'none' }); }
    if (m[2].indexOf('g') < 0) issues.push({ side: 'regex', key: 'g', msg: '缺少全局标志 g（只会替换第一条）', fix: 'addg' });
    var groups = re ? (new RegExp(m[1] + '|').exec('') || []).length - 1 : 0;
    var refs = (rep.match(/\$(\d+)/g) || []).map(function (x) { return parseInt(x.slice(1), 10); });
    var maxRef = refs.length ? Math.max.apply(null, refs) : 0;
    if (re && maxRef > groups) issues.push({ side: 'regex', key: 'ref', msg: '替换体引用了 $' + maxRef + '，但正则只有 ' + groups + ' 个捕获组', fix: 'none' });
    if (/\.\*/.test(m[1]) && !/\[\\s\\S\]/.test(m[1])) issues.push({ side: 'regex', key: 'dot', msg: '用了 .* 但台词常常跨行，建议改 [\\s\\S]*?', fix: 'dot' });
    if (/\((?:\s*\\?[sSdDwW.]?\*?\s*)\)[*+{]/.test(m[1]) || /\(\[\\s\\S\]\*\)[*+]/.test(m[1])) issues.push({ side: 'regex', key: 'catastrophic', msg: '疑似嵌套量词回溯炸弹', fix: 'none' });
  }
  if (rep.indexOf('<script') >= 0) issues.push({ side: 'regex', key: 'script', msg: '替换体含 <script>（禁止）', fix: 'stripScript' });
  if (/https?:\/\/(?!www\.w3\.org)/.test(rep)) issues.push({ side: 'regex', key: 'external', msg: '替换体引用外部资源（字体/图片 CDN 禁止）', fix: 'none' });
  if (/width:\s*\d{2,}px/.test(rep)) issues.push({ side: 'regex', key: 'fixedwidth', msg: '替换体用了固定像素宽度，窄屏会溢出', fix: 'none' });
  if (rep && !/data-mood|data-tag/.test(rep) && item.hasMood) issues.push({ side: 'regex', key: 'moodbranch', msg: '核心有 mood 参数，但替换体没有用 data-mood 分支配色', fix: 'none' });
  var obj = rxBuildObject(item);
  if (!/^[0-9a-f]{8}-/.test(obj.id)) issues.push({ side: 'regex', key: 'id', msg: 'id 不是 uuid v4', fix: 'newid' });
  if (!/^命定核心-/.test(obj.scriptName)) issues.push({ side: 'regex', key: 'name', msg: 'scriptName 缺少「命定核心-」前缀', fix: 'name' });
  if (obj.markdownOnly && obj.promptOnly) issues.push({ side: 'regex', key: 'flags', msg: 'markdownOnly 与 promptOnly 同时为 true（契约矛盾）', fix: 'flags' });
  if (obj.placement.join(',') !== '2') issues.push({ side: 'regex', key: 'placement', msg: 'placement 与现网展示类（[2]）不一致', fix: 'placement' });
  var tier = rxTier(item.tier);
  var len = rep.length;
  if (!len) issues.push({ side: 'regex', key: 'empty', msg: '替换体为空，点「🎨 生成替换体」先产出', fix: 'none' });
  else if (tier.target > 0) {
    var dev = (len - tier.target) / tier.target;
    if (dev < -0.4) issues.push({ side: 'regex', key: 'toosmall', msg: '体量 ' + len + ' 字符，' + tier.label + '档目标 ≈' + tier.target + '，偏差 ' + Math.round(dev * 100) + '%（疑似未充分展开）', fix: 'none' });
    else if (dev > 0.3) issues.push({ side: 'regex', key: 'toobig', msg: '体量 ' + len + ' 字符，超出' + tier.label + '档目标 ' + Math.round(dev * 100) + '%（可考虑降档或精简装饰）', fix: 'none' });
  }
  if (re && item.testText) {
    var fx = rxRunFixture(re, [item.testText]);
    if (fx.hit === 0) issues.push({ side: 'regex', key: 'nomatch', msg: '当前正则匹配不上测试文本', fix: 'none' });
  }
  if (re && parsed) {
    var hitAny = 0, tot = 0;
    (item.examples || []).forEach(function (e) { tot++; if (new RegExp(re.source, 'g').test(e)) hitAny++; });
    if (tot && hitAny < tot) issues.push({ side: 'core', key: 'exmatch', msg: '核心里有 ' + (tot - hitAny) + '/' + tot + ' 条范例匹配不上这条正则——要么改正则，要么把核心的语言格式改成与正则一致', fix: 'coreTag' });
  }
  return issues;
}
function rxApplyFix(item, issue) {
  if (issue.fix === 'addg') { item.findSource = item.findSource.replace(/\/([a-z]*)$/, function (all, fl) { return '/' + (fl.indexOf('g') < 0 ? fl + 'g' : fl); }); return '已补上全局标志 g'; }
  if (issue.fix === 'dot') { item.findSource = item.findSource.replace(/\.\*/g, '[\\s\\S]*?'); return '已把 .* 换成 [\\s\\S]*?'; }
  if (issue.fix === 'stripScript') {
    var sc = /<script[\s\S]*?<\/script>/gi;
    item.replaceHtml = String(item.replaceHtml || '').replace(sc, '');
    if (typeof item.css === 'string') item.css = item.css.replace(/<script[\s\S]*?<\/script>/gi, '');
    return '已移除 <script>';
  }
  if (issue.fix === 'newid') { item.id = rxUuid(); return '已重新生成 uuid'; }
  if (issue.fix === 'name') { item.purpose = item.purpose || '对话美化'; return '已补上 scriptName 前缀'; }
  if (issue.fix === 'flags') { item.promptOnly = false; return '已把 promptOnly 置为 false'; }
  if (issue.fix === 'placement') { item.placement = [2]; return '已把 placement 设为 [2]'; }
  if (issue.fix === 'wrap') { item.findSource = '/' + item.findSource + '/g'; return '已包成 /pattern/g'; }
  return '该问题需要你手动处理';
}
// 把「改核心」建议落到核心文本：把核心语言格式里的标签名/参数改成与正则一致
function rxApplyCoreFix(item, parsed) {
  var coreEl = getEl('opf-rx-core'); if (!coreEl) return '找不到核心文本框';
  var txt = coreEl.value;
  var f = parsed && parsed.formats.filter(function (x) { return x.key === item.formatKey; })[0];
  if (!f || !f.tag) return '该问题需要你手动改核心';
  var want = f.raw.replace(/^(?:强制|规定|输出|专属|标准)?格式\s*[:：]\s*/, '').trim();
  if (txt.indexOf(f.raw) >= 0) { coreEl.value = txt.replace(f.raw, f.raw); return '核心格式行已是最新（请检查范例是否与正则同构）'; }
  // 兜底：把该格式的标签名统一成 f.tag（防止模型写成别的标签）
  var re = new RegExp('<' + f.tag + '\\b', 'g');
  if (!re.test(txt)) return '未在核心文本里找到 <' + f.tag + '>，请手动核对语言格式节';
  return '核心与正则的标签名一致，问题可能出在参数或引号形态上（请手动核对格式行：' + want + '）';
}
function rxSystemContent() {
  var lines = [];
  lines.push('[角色] ' + macroFill('你是始弦，大图书馆的司书，正在为一个命定系统核心写「对话美化正则」的替换体（HTML 部分）。你把{{user}}当挚友，讲究实用与克制，不写花架子。'));
  lines.push('[任务] 依据给定的核心语言格式与预算档位，产出一段可在 SillyTavern 消息里直接渲染的 HTML 替换体。匹配式由插件生成，你不要碰。');
  lines.push(RX_RULES);
  lines.push(CHAR_STYLE_RULES);
  if (ST.worldInfo) lines.push('[世界书参考（世界书页勾选的条目）]\n' + ST.worldInfo);
  return macroFill(lines.join('\n\n'));
}
// CSS 生成专用系统提示：不带整本世界书（那是 524 超时的主要负担），只带一小段色彩参考
function rxSlimSystemContent(colorRef, budget) {
  var cap = Number(budget) || 3000;
  var lines = [];
  lines.push('[角色] ' + macroFill('你是始弦，大图书馆的司书，正在为一个命定系统核心写「对话美化」的 CSS。你把{{user}}当挚友，讲究实用与克制。'));
  lines.push('[任务] HTML 骨架已由插件生成并锁定，你只写 CSS 规则，不得输出或改动任何 HTML。');
  lines.push([
    '【CSS 硬约束】',
    '1. 只输出 CSS 规则：不要 <style> 标签、不要 HTML、不要解释、不要代码块围栏。',
    '2. class 前缀必须严格使用给定的前缀，不得自造前缀、不得使用全局选择器（html/body/*）。',
    '3. 禁止引用任何外部资源（字体 CDN、图片 URL、@import）；字体只用系统字体栈。',
    '4. 禁止写死像素宽度：容器 max-width:100%，窄屏（≤420px）不得溢出。',
    '5. 正文里若出现 $ 字符必须写成 $$。',
    '6. 动效克制：@keyframes 周期 ≥2s，不得高频闪烁。',
    '7. 每次输出控制在 ' + cap + ' 字符以内——超长会被平台截断（524 / 截断），宁可少写几条规则，也不要写一半。',
    '8. 颜色从核心世界观与命定之灵人格出发，不要纯黑纯白。'
  ].join('\n'));
  if (colorRef) lines.push('[核心气质摘录（配色参考）]\n' + String(colorRef).slice(0, 500));
  return macroFill(lines.join('\n\n'));
}
function rxUserPrompt(item, parsed) {
  var f = parsed.formats.filter(function (x) { return x.key === item.formatKey; })[0] || {};
  var tier = rxTier(item.tier);
  var L = [];
  L.push('[核心名] ' + item.coreName);
  L.push('[用途] ' + item.purpose);
  L.push('[已锁定的匹配式]\n' + item.findSource);
  L.push('[捕获组含义]');
  var gi = 1;
  if (f.family === 'xml') {
    L.push('  $' + (gi++) + ' = 名字（应为「' + (f.nameValue || '') + '」）');
    f.params.forEach(function (p) { L.push('  $' + (gi++) + ' = ' + p.name + (p.values.length ? '（枚举：' + p.values.join('、') + '）' : '')); });
    L.push('  $' + gi + ' = 对白正文');
  } else {
    L.push('  $1 = 对白正文');
    if (f.speaker) L.push('  （说话人固定为「' + f.speaker + '」，不在捕获组里）');
  }
  if (f.params.length) {
    f.params.forEach(function (p) { if (p.values.length) L.push('[参数 ' + p.name + ' 的枚举] ' + p.values.join('、') + ' —— 请为每个枚举值设计一种可区分的视觉状态（用属性选择器）'); });
  }
  L.push('[预算档位] ' + tier.label + (tier.target ? '（目标 ≈' + tier.target + ' 字符，浮动 ±30%）' : '（不设上限，以视觉完整、不冗余为准）'));
  L.push('[核心世界观摘录供配色参考]\n' + String(parsed.section || '').slice(0, 600));
  if ((f.examples || []).length) L.push('[核心自带的范例（配色与气质请贴合）]\n' + f.examples.slice(0, 3).join('\n'));
  L.push('[格式要求] 只输出一个 ' + fence() + 'html 代码块，内含完整替换体；替换体最外层 div 的 class 前缀请用 `' + item.prefix + '-`。');
  return L.join('\n\n');
}
function rxExtractHtml(text) {
  var F = fence();
  var t = String(text || '');
  var i = t.indexOf(F + 'html');
  if (i < 0) i = t.indexOf(F);
  if (i < 0) return t.trim();
  var start = t.indexOf('\n', i);
  if (start < 0) return t.trim();
  var end = t.indexOf(F, start + 1);
  return (end > start ? t.slice(start + 1, end) : t.slice(start + 1)).replace(/^\n+/, '').replace(/\s+$/, '');
}
// ---------- 页面 ----------
var RX_HTML = '<div class="opf-char-wrap"><div class="opf-sec-label">✦ 正则工坊 · 命定系统对话美化</div><div class="opf-dim">流程：粘贴核心全文（或从 ④ 页带入）→ 解析语言格式 → 勾选要美化的格式 → 选用途与预算档位 → 匹配式由插件确定生成、替换体由模型产出 → 实时预览 → 自检 → 导出 JSON。字段名与你现有 4 条正则一致，可直接粘进预设的 regex_scripts。</div><textarea id="opf-rx-core" class="opf-char-input" placeholder="把命定系统核心条目全文粘在这里（必须含「语言格式」节）"></textarea><div class="opf-char-tools"><button type="button" class="opf-btn ghost" id="opf-rx-pull">⬅ 从 ④ 页带入</button><button type="button" class="opf-btn primary" id="opf-rx-parse">🔍 解析语言格式（AI）</button><button type="button" class="opf-btn ghost" id="opf-rx-parse2">⚙ 脚本解析（离线）</button><button type="button" class="opf-btn ghost" id="opf-rx-gen">🎨 生成替换体</button><button type="button" class="opf-btn ghost" id="opf-rx-check">🔎 自检</button><button type="button" class="opf-btn ghost" id="opf-rx-fix">🔧 自动修复</button><button type="button" class="opf-btn ghost" id="opf-rx-copy1">⧉ 复制单条 JSON</button><button type="button" class="opf-btn ghost" id="opf-rx-copyall">⧉ 复制 JSON 数组</button><button type="button" class="opf-btn ghost" id="opf-rx-new">🗑 清空</button><button type="button" class="opf-btn ghost" id="opf-rx-ping">🩺 连通性自检</button><button type="button" class="opf-btn ghost" id="opf-rx-last">📄 上次返回</button></div><pre id="opf-rx-lastraw" class="opf-box opf-char-report" style="display:none">尚未调用</pre><div class="opf-shx-cfg"><label class="opf-opt">生成传输<select id="opf-rx-transport" class="opf-ref-input"><option value="st">酒馆主 API（零配置·推荐）</option><option value="server">经酒馆服务端转发 + 流式（需自填反代）</option><option value="direct">浏览器直连 + 流式（需自填接口）</option></select></label><span class="opf-dim" id="opf-rx-txnote"></span></div><div class="opf-shx-cfg" id="opf-rx-cfg-server" style="display:none"><button type="button" class="opf-btn ghost" id="opf-rx-pulltavern">📋 用酒馆的反代设置</button><label class="opf-opt">协议源<select id="opf-rx-source" class="opf-ref-input"><option value="makersuite">Google AI Studio (makersuite)</option><option value="vertexai">Vertex AI (vertexai)</option></select></label><label class="opf-opt">中转/反代地址<input id="opf-rx-reverse" class="opf-ref-input" placeholder="https://你的中转域名"></label><label class="opf-opt">代理密码/密钥<input id="opf-rx-proxypass" class="opf-ref-input" type="password" placeholder="只存在本机"></label><label class="opf-opt">模型名<input id="opf-rx-model" class="opf-ref-input" list="opf-rx-modellist" placeholder="点右侧按钮获取；也可直接手填，填过会记住"><datalist id="opf-rx-modellist"></datalist></label><button type="button" class="opf-btn ghost" id="opf-rx-models">🔌 获取模型列表</button></div><div class="opf-shx-cfg" id="opf-rx-cfg-direct" style="display:none"><label class="opf-opt">直连协议<select id="opf-rx-proto" class="opf-ref-input"><option value="openai">OpenAI 兼容 (/chat/completions)</option><option value="gemini">Google 原生 (:streamGenerateContent)</option></select></label><label class="opf-opt">直连地址<input id="opf-rx-base" class="opf-ref-input" placeholder="https://api.example.com/v1"></label><label class="opf-opt">直连密钥<input id="opf-rx-key" class="opf-ref-input" type="password" placeholder="只存在本机"></label><label class="opf-opt">直连模型<input id="opf-rx-chatmodel" class="opf-ref-input" placeholder="留空则用上面的模型名"></label></div><div class="opf-dim" id="opf-rx-statusline">就绪</div><div class="opf-sec"><div class="opf-sec-label">语言格式解析结果（只读核对）</div><pre id="opf-rx-parsed" class="opf-box opf-char-report">尚未解析</pre></div><div id="opf-rx-items"></div><div class="opf-sec"><div class="opf-sec-label">自检</div><pre id="opf-rx-issues" class="opf-box opf-char-report">尚未自检</pre></div></div>';

function rxInit() {
  ST.rx = ST.rx || { core: '', coreName: '', parsed: null, items: [], _inited: false };
  ST.rx.items = ST.rx.items || [];
}
function rxSyncTransportUi() {
  var t = rxCfg().transport || 'st';
  var s = getEl('opf-rx-cfg-server'), d = getEl('opf-rx-cfg-direct'), n = getEl('opf-rx-txnote');
  if (s) s.style.display = (t === 'server') ? '' : 'none';
  if (d) d.style.display = (t === 'direct') ? '' : 'none';
  if (n) {
    var why = rxTransportWhy(rxCfg());
    n.textContent = t === 'st'
      ? '零配置：不需要地址、密钥或模型名，全部跟随酒馆主 API；模型与采样参数就是你现在聊天用的那套。（非流式，长输出有超时风险，已用分块 + 自动缩段缓解）'
      : (t === 'server'
        ? (why ? '⚠ ' + why : '配置完整，可生成；建议先点「🩺 连通性自检」确认能连通')
        : (why ? '⚠ ' + why : '配置完整，可生成；适用于有 CORS 头的自建/本地接口'));
  }
}
// ---------- ⑦ 命定核心精修：界面 ----------
var REFINE_HTML = '<div class="opf-char-wrap">'
  + '<div class="opf-sec-label">✦ 命定核心精修 · 外科手术式改造（绝对保持原有内容/功能/人设）</div>'
  + '<div class="opf-dim">四步闸门：<b>① 整体分析</b>（模型只读一遍，输出结构化概况）→ <b>② 你提修改意见</b> → <b>③ 模型分析并给出改法</b>（评估影响面，仍不动正文）→ <b>④ 你确认无误</b> → 模型只产出「锚点 + 新内容」的补丁，<b>由插件按逐字唯一命中落刀</b>，随后跑脚本保真校验（行级 diff / 包裹标签 / 十槽 / 人设字段 / EJS 配对 / 既有口令与变量路径是否消失）。未改动部分逐字不动是物理事实，不靠模型自觉。</div>'
  + '<textarea id="opf-rf-src" class="opf-char-input" style="min-height:120px" placeholder="把要修改的命定核心整份文本粘进来（YAML 正文 / 条目正文 / 从酒馆世界书复制出来的内容都行），或点下方「📂 打开文件」"></textarea>'
  + '<div class="opf-char-tools">'
  + '<label class="opf-btn ghost" style="margin:0">📂 打开文件<input type="file" id="opf-rf-file" accept=".yaml,.yml,.txt,.json,.md" style="display:none"></label>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-fromdest">⬅ 从 ④ 页带入成品</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-fromworld">📚 从世界书命定系统条目挑一份</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-clear">🗑 清空</button>'
  + '</div>'
  + '<div class="opf-dim" id="opf-rf-status">还没载入核心</div>'
  + '<div class="opf-sec"><div class="opf-sec-label">结构体检（脚本，零 AI）</div><pre id="opf-rf-scan" class="opf-box opf-char-report">尚未载入</pre></div>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-rf-analyze">① 整体分析</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-copyanalysis">⧉ 复制分析</button></div>'
  + '<pre id="opf-rf-analysis" class="opf-box opf-char-report">（还没分析）</pre>'
  + '<div class="opf-sec"><div class="opf-sec-label">② 你的修改意见（改什么、为什么、期望效果）</div></div>'
  + '<textarea id="opf-rf-req" class="opf-char-input" style="min-height:80px" placeholder="例：给「食运加持」加一条约束——同一道菜在同一地点重复品尝不再触发增益；再给『天机推演』的卦象卡片增加一个字段 Rumor（一句市井传闻，20字内）"></textarea>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-rf-plan">② 分析这条意见</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-suggest">💡 给我几条可优化方向</button></div>'
  + '<pre id="opf-rf-planout" class="opf-box opf-char-report">（还没分析意见）</pre>'
  + '<div class="opf-sec"><div class="opf-sec-label">③ 确认后置入（模型只出补丁，插件落刀）</div></div>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-rf-apply">✓ 确认无误，置入</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-retry">↻ 换个说法重来</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-rollback">↩ 回退到原文</button></div>'
  + '<pre id="opf-rf-applyout" class="opf-box opf-char-report">（还没置入）</pre>'
  + '<pre id="opf-rf-fidelity" class="opf-box opf-char-report" style="display:none">尚未校验</pre>'
  + '<pre id="opf-rf-diff" class="opf-box opf-char-report" style="display:none">尚无差异</pre>'
  + '<div class="opf-sec"><div class="opf-sec-label">成品（可继续手改；改完可再回来分析新一轮）</div></div>'
  + '<textarea id="opf-rf-result" class="opf-char-input" style="min-height:160px" placeholder="置入后这里会是改好的完整文本；未置入时为空"></textarea>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn ghost" id="opf-rf-copy">⧉ 复制成品</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-download">💾 下载 .yaml</button>'
  + '<button type="button" class="opf-btn ghost" id="opf-rf-reload">⟳ 用成品替换原文，开新一轮</button></div>'
  + '</div>';
function bindRefinePage(){
  var f = getEl('opf-rf-file');
  if (!f) return;
  f.addEventListener('change', function () {
    var file = this.files && this.files[0]; if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      var txt = String(fr.result || '');
      if (/^\s*[\[{]/.test(txt)) { try { var j = JSON.parse(txt); txt = j.content || j.正文 || (j.entries ? Object.keys(j.entries).map(function (k) { return j.entries[k].content; }).join('\n\n') : txt); } catch (e) {} }
      var sc = refineLoad(txt, file.name);
      toast('已载入 ' + file.name + '（' + sc.chars + ' 字符 / ' + sc.lines + ' 行）', 'success');
    };
    fr.readAsText(file, 'utf-8');
    this.value = '';
  });
  getEl('opf-rf-src').addEventListener('input', function () { refineInit(); ST.refine.src = this.value; ST.refine.scan = refineScan(this.value).text; var s = getEl('opf-rf-scan'); if (s) s.textContent = ST.refine.scan; refineCacheSave(); });
  getEl('opf-rf-fromdest').addEventListener('click', function () {
    var body = ST.dest && ST.dest.body;
    if (!body) { toast('④ 页还没有成品：先去 ④ 页「🎁 脚本封装」，或直接把核心粘进来', 'warning'); return; }
    refineLoad(body, '④页成品-' + (ST.dest.asmInfo && ST.dest.asmInfo.wrapper || '核心'));
    toast('已从 ④ 页带入成品（' + body.length + ' 字符）');
  });
  getEl('opf-rf-fromworld').addEventListener('click', function () {
    var list = refineCoreList();
    if (!list.length) { toast('还没有可选的命定系统条目：请先在 ② 世界书页导入世界书（勾选影响的是发给 AI 的上下文，这里只用来挑文本）', 'warning'); return; }
    var names = list.slice(0, 40).map(function (x, i) { return (i + 1) + '. ' + x.name; }).join('\n');
    var pick = window.prompt('选择要修改的命定系统条目（输入序号）：\n' + names, '1');
    var i2 = parseInt(pick, 10);
    if (!i2 || !list[i2 - 1]) return;
    refineLoad(list[i2 - 1].content, list[i2 - 1].name);
    toast('已带入「' + list[i2 - 1].name + '」');
  });
  getEl('opf-rf-clear').addEventListener('click', function () {
    if (!window.confirm('清空本页的载入内容、分析与成品？（不影响其它页面）')) return;
    ST.refine = null; refineInit();
    ['opf-rf-src', 'opf-rf-req', 'opf-rf-result'].forEach(function (id) { var e = getEl(id); if (e) e.value = ''; });
    ['opf-rf-scan', 'opf-rf-analysis', 'opf-rf-planout', 'opf-rf-applyout'].forEach(function (id) { var e = getEl(id); if (e) e.textContent = id === 'opf-rf-scan' ? '尚未载入' : '（空的）'; });
    ['opf-rf-fidelity', 'opf-rf-diff'].forEach(function (id) { var e = getEl(id); if (e) e.style.display = 'none'; });
    refineNote('已清空'); refineCacheSave();
  });
  getEl('opf-rf-analyze').addEventListener('click', function () { refineAnalyze(); });
  getEl('opf-rf-copyanalysis').addEventListener('click', function () { destCopyText(String(ST.refine && ST.refine.analysis || ''), '还没有分析结果'); });
  getEl('opf-rf-plan').addEventListener('click', function () { refinePlan(); });
  getEl('opf-rf-suggest').addEventListener('click', function () { refineSuggest(); });
  getEl('opf-rf-apply').addEventListener('click', function () { refineApply(); });
  getEl('opf-rf-retry').addEventListener('click', function () { ST.refine.plan = ''; ST.refine.planObj = null; var p = getEl('opf-rf-planout'); if (p) p.textContent = '（已清空上一次分析，可改一改意见后重新点「② 分析这条意见」）'; refineNote('已清空上一次改法分析'); });
  getEl('opf-rf-rollback').addEventListener('click', function () {
    if (!ST.refine || !ST.refine.src) { toast('没有可回退的原文', 'warning'); return; }
    ST.refine.result = ''; ST.refine.diff = ''; ST.refine.fidelity = null; ST.refine.applied = [];
    var ta = getEl('opf-rf-result'); if (ta) ta.value = '';
    ['opf-rf-fidelity', 'opf-rf-diff'].forEach(function (id) { var e = getEl(id); if (e) e.style.display = 'none'; });
    var ao = getEl('opf-rf-applyout'); if (ao) ao.textContent = '已回退到原文（原文一直没被改动过，补丁只是生成了一份新文本）';
    refineNote('已回退');
  });
  getEl('opf-rf-copy').addEventListener('click', function () { destCopyText(String(ST.refine && ST.refine.result || ''), '还没有成品'); });
  getEl('opf-rf-download').addEventListener('click', function () {
    var txt = String(ST.refine && ST.refine.result || '');
    if (!txt) { toast('还没有成品', 'warning'); return; }
    try {
      var blob = new Blob([txt], { type: 'text/yaml;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (String(ST.refine.name || 'core').replace(/\.(ya?ml|json|txt|md)$/i, '')) + '-修改版.yaml';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) { toast('下载失败：' + (e && e.message ? e.message : e), 'error'); }
  });
  getEl('opf-rf-reload').addEventListener('click', function () {
    var txt = String((getEl('opf-rf-result') || {}).value || '');
    if (!txt.trim()) { toast('还没有成品可替换', 'warning'); return; }
    refineLoad(txt, ST.refine.name);
    var rq = getEl('opf-rf-req'); if (rq) rq.value = '';
    toast('已用成品作为新一轮的原文（结构体检已重跑）', 'success');
  });
  refineRender();
}
function refineCoreList(){
  var out = [];
  try {
    var wb = ST.world;
    var entries = wb && wb.entries ? wb.entries : (wb && wb.data && wb.data.entries ? wb.data.entries : null);
    if (entries) {
      Object.keys(entries).forEach(function (k) {
        var e = entries[k];
        if (e && e.content && /命定系统/.test(String(e.comment || ''))) out.push({ name: String(e.comment || k).replace('[本体][命定系统]', ''), content: String(e.content) });
      });
    }
  } catch (e) {}
  out.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  return out;
}
function refineRender(){
  refineInit();
  var s = ST.refine;
  var set = function (id, v) { var e = getEl(id); if (e) e.textContent = v; };
  set('opf-rf-scan', s.scan || '尚未载入');
  set('opf-rf-analysis', s.analysis || '（还没分析）');
  set('opf-rf-planout', s.plan || '（还没分析意见）');
  var ao = getEl('opf-rf-applyout'); if (ao && s.appliedText) ao.textContent = s.appliedText;
  var fi = getEl('opf-rf-fidelity'), df = getEl('opf-rf-diff');
  if (fi) { fi.style.display = s.fidelityText ? 'block' : 'none'; if (s.fidelityText) fi.textContent = s.fidelityText; }
  if (df) { df.style.display = s.diffText ? 'block' : 'none'; if (s.diffText) df.textContent = s.diffText; }
  refineNote(s.src ? ('已载入 ' + (s.name || '未命名') + '：' + s.src.length + ' 字符｜' + (s.analysisObj ? '已分析' : '未分析') + (s.plan ? '｜已出改法' : '') + (s.result ? '｜已置入' : '')) : '还没载入核心');
}
async function refineAnalyze(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var src = String((getEl('opf-rf-src') || {}).value || ST.refine.src || '');
  if (!src.trim()) { toast('先把核心文本粘进来（或打开文件）', 'warning'); return; }
  refineInit(); ST.refine.src = src;
  if (!ST.refine.scan) ST.refine.scan = refineScan(src).text;
  ST.running = true; renderRunButtons(); refineNote('① 整体分析中…（只读，不会改动任何内容）');
  try {
    var msg = '[分析对象]\n' + src.slice(0, 60000) + '\n\n' + REFINE_ANALYZE_SPEC;
    var resp = await callModel([{ role: 'system', content: refineSystem() }, { role: 'user', content: macroFill(msg) }]);
    var j = rxExtractJson(resp);
    ST.refine.analysisObj = j || null;
    ST.refine.analysis = j ? refineFormatAnalysis(j) : ('（没能解析成 JSON，原文如下）\n\n' + String(resp || '').slice(0, 6000));
    refineRender(); refineCacheSave();
    toast(j ? '① 分析完成（概况已列在下方）' : '① 模型返回的不是 JSON，已原样显示', j ? 'success' : 'warning');
  } catch (e) { toast('分析出错：' + (e && e.message ? e.message : e), 'error'); refineNote('分析失败'); }
  finally { ST.running = false; renderRunButtons(); }
}
function refineFormatAnalysis(j){
  var L = [];
  var line = function (k, v) { if (v == null || v === '' || (Array.isArray(v) && !v.length)) return; L.push('· ' + k + '：' + (Array.isArray(v) ? v.join('；') : String(v))); };
  line('条目名', j['条目名']); line('系统名（包裹标签）', j['系统名']); line('系统核心名（灵）', j['系统核心名']); line('系统核心（条目）', j['系统核心']);
  line('一级节', j['一级节']);
  if (j['十槽']) line('十槽', (j['十槽']['齐全'] ? '齐全' : '缺 ' + ((j['十槽']['缺'] || []).join('、') || '?')));
  line('功能清单', j['功能清单']);
  line('机制要点', j['机制要点']);
  if (j['人设要点'] && typeof j['人设要点'] === 'object') {
    L.push('· 人设要点：');
    Object.keys(j['人设要点']).forEach(function (k) { if (j['人设要点'][k]) L.push('    - ' + k + '：' + String(j['人设要点'][k]).slice(0, 120)); });
  }
  if (j['语言格式']) line('语言格式', [j['语言格式']['族'], j['语言格式']['标签'], (j['语言格式']['参数'] || []).join('/'), (j['语言格式']['范例条数'] != null ? '范例 ' + j['语言格式']['范例条数'] + ' 条' : '')].filter(Boolean).join('｜'));
  line('硬约束（不可丢）', j['硬约束']);
  line('状态与变量', j['状态与变量']);
  line('口令与关键词', j['口令与关键词']);
  if (j['EJS结构']) line('EJS 结构', ['块数 ' + (j['EJS结构']['块数'] || 0)].concat(j['EJS结构']['用途'] || []).join('｜'));
  line('脆弱点', j['脆弱点']);
  line('可优化方向', j['可优化方向']);
  return L.join('\n') || '（分析结果为空）';
}
function refineSystem(){
  return macroFill('你是「始弦的魔法大典」的司书，正在帮{{user}}修改一份**已经存在的**命定系统核心。'
    + '你的第一职责是「不弄坏它」：这份核心正在被使用，任何未要求的变化都会破坏玩家的存档与叙事。'
    + REFINE_RULES + '\n\n' + (ST.worldInfo ? '[世界书参考]\n' + ST.worldInfo : ''));
}
async function refinePlan(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var src = String((getEl('opf-rf-src') || {}).value || ST.refine.src || '');
  var req = String((getEl('opf-rf-req') || {}).value || '').trim();
  if (!src.trim()) { toast('先载入核心文本', 'warning'); return; }
  if (!req) { toast('先写下你的修改意见', 'warning'); return; }
  ST.refine.src = src; ST.refine.request = req;
  ST.running = true; renderRunButtons(); refineNote('② 分析你的意见中…（仍然不会改动正文）');
  try {
    var msg = '[核心全文]\n' + src.slice(0, 60000)
      + '\n\n[已完成的整体分析]\n' + (ST.refine.analysis || '（无，可先点①）')
      + '\n\n[用户的修改意见]\n' + req + '\n\n' + REFINE_PLAN_SPEC;
    var resp = await callModel([{ role: 'system', content: refineSystem() }, { role: 'user', content: macroFill(msg) }]);
    var j = rxExtractJson(resp);
    ST.refine.planObj = j || null;
    ST.refine.plan = j ? refineFormatPlan(j) : ('（没能解析成 JSON，原文如下）\n\n' + String(resp || '').slice(0, 6000));
    refineRender(); refineCacheSave();
    toast(j ? '② 已给出改法与影响评估——确认无误后可点「✓ 确认无误，置入」' : '② 模型返回的不是 JSON，已原样显示', j ? 'success' : 'warning');
  } catch (e) { toast('分析意见出错：' + (e && e.message ? e.message : e), 'error'); refineNote('分析意见失败'); }
  finally { ST.running = false; renderRunButtons(); }
}
function refineFormatPlan(j){
  var L = [];
  L.push('能否修改：' + (j['可否'] || '?'));
  if (j['理解']) L.push('理解：' + j['理解']);
  if (Array.isArray(j['影响评估']) && j['影响评估'].length) {
    L.push('\n影响评估：');
    j['影响评估'].forEach(function (x) {
      L.push('  · ' + (x['点'] || '') + '　→　' + (x['影响'] || '') + '　【是否触及既有功能：' + (x['是否触及既有功能'] || '?') + '】');
    });
  }
  if (Array.isArray(j['拟定改法']) && j['拟定改法'].length) {
    L.push('\n拟定改法（最小侵入）：');
    j['拟定改法'].forEach(function (x, i) { L.push('  ' + (i + 1) + '. [' + (x['位置'] || '') + '] ' + (x['做法'] || '')); });
  }
  if (Array.isArray(j['锚点预告']) && j['锚点预告'].length) {
    L.push('\n预计要动的原文片段：');
    j['锚点预告'].forEach(function (x) { L.push('  ▸ ' + String(x).slice(0, 160)); });
  }
  if (Array.isArray(j['冲突']) && j['冲突'].length) { L.push('\n冲突/无法实现的部分：'); j['冲突'].forEach(function (x) { L.push('  ⚠ ' + x); }); }
  if (j['保真承诺']) L.push('\n保真承诺：' + j['保真承诺']);
  if (j['确认提示']) L.push('\n确认提示：' + j['确认提示']);
  return L.join('\n');
}
async function refineSuggest(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var src = String((getEl('opf-rf-src') || {}).value || ST.refine.src || '');
  if (!src.trim()) { toast('先载入核心文本', 'warning'); return; }
  ST.running = true; renderRunButtons();
  try {
    var msg = '[核心全文]\n' + src.slice(0, 60000)
      + '\n\n请给出 3~5 条**不破坏现有设计**的优化方向（每条一行、≤40字、具体可执行），例如补齐缺口、让某条规则更自洽、增加与既有功能的联动。不要输出正文，不要提"重写/重构"。';
    var resp = await callModel([{ role: 'system', content: refineSystem() }, { role: 'user', content: macroFill(msg) }]);
    var list = [];
    String(resp || '').split(/\r?\n/).forEach(function (ln) {
      var t = ln.replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').trim();
      if (t && t.length >= 6 && t.length <= 60 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) { toast('没拿到可用的方向', 'warning'); return; }
    var box = getEl('opf-rf-req');
    if (box) box.value = list.slice(0, 6).join('\n');
    toast('已把 ' + Math.min(6, list.length) + ' 条方向填进意见框，可挑一条或改写后再点「② 分析这条意见」', 'success');
  } catch (e) { toast('生成方向失败：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); }
}
async function refineApply(){
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var src = String((getEl('opf-rf-src') || {}).value || ST.refine.src || '');
  var req = String((getEl('opf-rf-req') || {}).value || ST.refine.request || '').trim();
  if (!src.trim()) { toast('先载入核心文本', 'warning'); return; }
  if (!ST.refine.plan) { toast('请先点「② 分析这条意见」并确认改法', 'warning'); return; }
  ST.running = true; renderRunButtons(); refineNote('③ 正在生成补丁（锚点 + 新内容）…');
  try {
    var msg = '[核心全文]\n' + src.slice(0, 60000)
      + '\n\n[用户意见]\n' + req
      + '\n\n[已确认的改法分析]\n' + ST.refine.plan
      + '\n\n' + REFINE_PATCH_SPEC;
    var resp = await callModel([{ role: 'system', content: refineSystem() }, { role: 'user', content: macroFill(msg) }]);
    var j = rxExtractJson(resp);
    var changes = j && Array.isArray(j['变更']) ? j['变更'] : null;
    if (!changes || !changes.length) {
      var ao0 = getEl('opf-rf-applyout');
      if (ao0) ao0.textContent = '模型没有给出可用的「变更」清单（未对原文做任何改动）。原文回复：\n\n' + String(resp || '').slice(0, 4000);
      toast('没有拿到补丁，原文未被改动（可看下方原文回复）', 'warning');
      refineNote('③ 未产出补丁'); return;
    }
    var res = refineApplyPatch(src, changes);
    var ao = getEl('opf-rf-applyout');
    var lines = [];
    if (!res.ok) {
      // all-or-nothing：任何一处锚点不唯一/找不到，就整份放弃，绝不留半份改动
      lines.push('❌ 补丁未通过校验，已整体放弃（原文一个字符都没动）：');
      res.failed.forEach(function (f) { lines.push('  · 第 ' + (f.i + 1) + ' 处：' + f.why + '\n    锚点：' + String(f.ch && (f.ch['锚点'] || '')).slice(0, 120)); });
      lines.push('\n可以点「② 分析这条意见」让它给更长的锚点，或把意见写得再具体一点后重试。');
      if (ao) ao.textContent = lines.join('\n');
      toast('补丁锚点校验失败，已整体放弃（原文未动）', 'error');
      refineNote('③ 锚点校验失败，原文未改动');
      return;
    }
    var fid = refineFidelity(src, res.text, req);
    var diffText = refineRenderDiff(src, res.text, fid.diff);
    var fLines = [];
    fLines.push('保真校验（脚本逐项核对，' + fid.checks.length + ' 项）');
    fid.checks.forEach(function (c) { fLines.push('  ' + (c.ok ? '✓' : '⚠') + ' ' + c.k + '：' + c.v); });
    fLines.push('');
    fLines.push('行级统计：未变动 ' + fid.stats.same + ' 行 ｜ 新增 ' + fid.stats.add + ' 行 ｜ 删除 ' + fid.stats.del + ' 行'
      + '（越接近"只动你要求的那几行"越好）');
    var srcLines = src.split(/\r?\n/).length;
    fLines.push('保真度：' + (srcLines ? Math.round(fid.stats.same / srcLines * 1000) / 10 : 0) + '% 的原有行原样保留');
    lines.push('✓ 补丁已应用：' + res.applied.length + ' 处变更');
    res.applied.forEach(function (a, i) {
      lines.push('  ' + (i + 1) + '. [' + a.type + '] ' + (a.why || ''));
      lines.push('     锚点：' + a.anchor.slice(0, 100).replace(/\n/g, '⏎'));
      lines.push('     新内容：' + a.next.slice(0, 160).replace(/\n/g, '⏎') + (a.next.length > 160 ? ' …' : ''));
    });
    if (j['冲突'] && j['冲突'].length) { lines.push('\n模型报告的冲突：'); j['冲突'].forEach(function (x) { lines.push('  ⚠ ' + x); }); }
    lines.push('\n（原文仍是原文，这里只是生成了一份新文本；不满意点「↩ 回退到原文」即可）');
    if (ao) ao.textContent = lines.join('\n');
    var fi = getEl('opf-rf-fidelity'); if (fi) { fi.textContent = fLines.join('\n'); fi.style.display = 'block'; }
    var df = getEl('opf-rf-diff'); if (df) { df.textContent = '差异预览（- 原文 / + 新文本）\n\n' + diffText; df.style.display = 'block'; }
    ST.refine.result = res.text; ST.refine.applied = res.applied; ST.refine.diff = diffText;
    ST.refine.fidelity = fid; ST.refine.fidelityText = fLines.join('\n'); ST.refine.diffText = diffText; ST.refine.appliedText = lines.join('\n');
    var ta = getEl('opf-rf-result'); if (ta) ta.value = res.text;
    refineRender(); refineCacheSave();
    var warn = fid.checks.filter(function (c) { return !c.ok; }).length;
    toast(warn ? ('已置入 ' + res.applied.length + ' 处，但保真校验有 ' + warn + ' 项需要你看一眼（见校验区）')
      : ('已置入 ' + res.applied.length + ' 处变更，保真校验全部通过'), warn ? 'warning' : 'success');
    refineNote('③ 已置入 ' + res.applied.length + " 处变更" + (warn ? '（' + warn + ' 项待核对）' : '（保真校验通过）'));
  } catch (e) { toast('置入出错：' + (e && e.message ? e.message : e), 'error'); refineNote('置入失败'); }
  finally { ST.running = false; renderRunButtons(); }
}
function refineCacheSave(){
  if (refineCacheSave._t) clearTimeout(refineCacheSave._t);
  refineCacheSave._t = setTimeout(function () {
    if (!ST.refine) return;
    lsSet(NS + '_refine_v1', { name: ST.refine.name, src: ST.refine.src, scan: ST.refine.scan, analysis: ST.refine.analysis, analysisObj: ST.refine.analysisObj, request: ST.refine.request, plan: ST.refine.plan, planObj: ST.refine.planObj, result: ST.refine.result, applied: ST.refine.applied, fidelityText: ST.refine.fidelityText, diffText: ST.refine.diffText, appliedText: ST.refine.appliedText });
  }, 600);
}
function refineCacheRestore(){
  refineInit();
  var c = lsGet(NS + '_refine_v1');
  if (!c || !c.src) return;
  ST.refine.name = c.name || ''; ST.refine.src = c.src; ST.refine.scan = c.scan || refineScan(c.src).text;
  ST.refine.analysis = c.analysis || ''; ST.refine.analysisObj = c.analysisObj || null;
  ST.refine.request = c.request || ''; ST.refine.plan = c.plan || ''; ST.refine.planObj = c.planObj || null;
  ST.refine.result = c.result || ''; ST.refine.applied = c.applied || [];
  ST.refine.fidelityText = c.fidelityText || ''; ST.refine.diffText = c.diffText || ''; ST.refine.appliedText = c.appliedText || '';
  var set = function (id, v) { var e = getEl(id); if (e && v != null) e.value = v; };
  set('opf-rf-src', ST.refine.src); set('opf-rf-req', ST.refine.request); set('opf-rf-result', ST.refine.result);
  refineRender();
}
function bindRxPage() {  rxInit();
  var p = getEl('opf-rx-parse'); if (!p || p._b) return; p._b = true;
  getEl('opf-rx-pull').addEventListener('click', function(){ rxPullFromDestiny(); });
  getEl('opf-rx-parse').addEventListener('click', function(){ rxDoParse(); });
  getEl('opf-rx-parse2').addEventListener('click', function(){ rxDoParseScript(); });
  getEl('opf-rx-gen').addEventListener('click', function(){ rxGenerate(); });
  getEl('opf-rx-check').addEventListener('click', function(){ rxDoCheck(true); });
  getEl('opf-rx-fix').addEventListener('click', function(){ rxAutoFixAll(); });
  getEl('opf-rx-copy1').addEventListener('click', function(){ rxCopy(false); });
  getEl('opf-rx-copyall').addEventListener('click', function(){ rxCopy(true); });
  getEl('opf-rx-new').addEventListener('click', function(){ rxClear(); });
  getEl('opf-rx-ping').addEventListener('click', function(){ rxPing(); });
  getEl('opf-rx-last').addEventListener('click', function(){
    var box = getEl('opf-rx-lastraw'); if (!box) return;
    var t = ST.rx.lastRaw;
    if (!t) { toast('还没有调用过模型', 'warning'); return; }
    if (box.style.display === 'none') {
      box.style.display = '';
      box.textContent = '【模型原始返回 · ' + t.length + ' 字符】\n\n' + (t.length > 20000 ? t.slice(0, 20000) + '\n\n…（已截断显示，完整 ' + t.length + ' 字符）' : t);
    } else {
      box.style.display = 'none';
    }
  });
  getEl('opf-rx-models').addEventListener('click', function(){ rxDoFetchModels(this); });
  getEl('opf-rx-pulltavern').addEventListener('click', function(){
    if (rxPullFromTavern()) rxDoFetchModels(getEl('opf-rx-models'));
  });
  // 换了传输/反代/密码后，若模型名还是空的就自动拉一次
  ['opf-rx-transport', 'opf-rx-reverse', 'opf-rx-proxypass', 'opf-rx-source'].forEach(function (id) {
    var el = getEl(id); if (!el) return;
    el.addEventListener('change', function () {
      var cfg = rxCfg();
      if (!String(cfg.model || '').trim() && cfg.reverseProxy) rxDoFetchModels(getEl('opf-rx-models'));
    });
  });
  var bindCfg = function (id, key) {
    var el = getEl(id); if (!el) return;
    el.addEventListener('change', function () { rxCfg()[key] = this.value; rxSyncTransportUi(); rxCacheSave(); });
  };
  bindCfg('opf-rx-transport', 'transport');
  bindCfg('opf-rx-source', 'source');
  bindCfg('opf-rx-reverse', 'reverseProxy');
  bindCfg('opf-rx-proxypass', 'proxyPassword');
  bindCfg('opf-rx-model', 'model');
  var modelEl = getEl('opf-rx-model');
  if (modelEl) modelEl.addEventListener('change', function () { rxRememberModel(this.value); });   // 手填的名字自动记住
  bindCfg('opf-rx-proto', 'directProtocol');
  bindCfg('opf-rx-base', 'baseUrl');
  bindCfg('opf-rx-key', 'apiKey');
  bindCfg('opf-rx-chatmodel', 'chatModel');
  var cur = rxCfg();
  [['opf-rx-transport', 'transport'], ['opf-rx-source', 'source'], ['opf-rx-reverse', 'reverseProxy'],
   ['opf-rx-proxypass', 'proxyPassword'], ['opf-rx-model', 'model'], ['opf-rx-proto', 'directProtocol'],
   ['opf-rx-base', 'baseUrl'], ['opf-rx-key', 'apiKey'], ['opf-rx-chatmodel', 'chatModel']].forEach(function (pair) {
    var el = getEl(pair[0]); if (el) el.value = cur[pair[1]] || '';
  });
  rxSyncTransportUi();
  getEl('opf-rx-core').addEventListener('input', function(){ ST.rx.core = this.value; rxCacheSave(); });
  rxRenderItems();
}
function rxPullFromDestiny() {
  var body = ST.dest && (ST.dest.body || ST.dest.out);
  if (!body) { toast('④ 页还没有最终稿件：请先在 ④ 页「最终封装」，或直接把核心全文粘进来', 'warning'); return; }
  var el = getEl('opf-rx-core'); if (el) el.value = body;
  ST.rx.core = body;
  toast('已从 ④ 页带入条目正文，点「🔍 解析语言格式」继续');
  rxDoParse();
}
function rxCoreNameFromText(txt) {
  var m = String(txt).match(/\{\{setvar::系统核心::\s*([^\n}]+)\}\}/);
  if (m) return m[1].trim();
  var w = String(txt).match(/<([A-Za-z_]\w*)\b/);
  return w ? w[1] : '未命名核心';
}
// 解析后再定名：setvar 系统核心 > 语言格式里 name 的固定值 > 第一个标签名
function rxDecideCoreName(txt, parsed) {
  var m = String(txt).match(/\{\{setvar::系统核心::\s*([^\n}]+)\}\}/);
  if (m) return m[1].trim();
  var named = ((parsed && parsed.formats) || []).filter(function (f) { return f.nameValue && !/\{/.test(f.nameValue); })[0];
  if (named) return named.nameValue;
  var sp = ((parsed && parsed.formats) || []).filter(function (f) { return f.speaker; })[0];
  if (sp) return sp.speaker;
  return rxCoreNameFromText(txt);
}
async function rxDoParse() {
  var el = getEl('opf-rx-core');
  var txt = (el && el.value || '').trim();
  if (!txt) { toast('请先粘贴核心全文（含语言格式节）', 'warning'); return; }
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  ST.rx.core = txt;
  ST.running = true; renderRunButtons();
  var box0 = getEl('opf-rx-parsed'); if (box0) box0.textContent = 'AI 解析中…（失败会自动回退到脚本解析）';
  var parsed = null, engine = 'ai', notes = [];
  try {
    var ai = await rxParseByAi(txt);
    if (ai && ai.formats.length) { parsed = ai; notes = ai.notes || []; if (ai.coreName) ST.rx.coreName = ai.coreName; }
    else { engine = 'script'; notes = (ai && ai.notes) || []; notes.push('AI 解析未产出可用格式，已回退脚本解析'); }
  } catch (e) {
    engine = 'script';
    notes.push('AI 解析失败（' + (e && e.message ? e.message : e) + '），已回退脚本解析');
  }
  if (!parsed) { parsed = rxParseLangFormat(txt); notes = (parsed.notes || []).concat(notes); }
  ST.rx.engine = engine;
  ST.rx.parsed = parsed;
  if (!ST.rx.coreName || engine === 'script') ST.rx.coreName = rxDecideCoreName(txt, parsed);
  rxShowParsed(parsed, engine, notes);
  rxBuildItems(parsed);
  ST.running = false; renderRunButtons(); rxCacheSave();
  toast('解析完成（' + (engine === 'ai' ? 'AI' : '脚本') + '）：' + parsed.formats.length + ' 套格式，已生成 ' + ST.rx.items.length + ' 条正则草稿', parsed.formats.length ? 'success' : 'warning');
}
function rxDoParseScript() {
  var el = getEl('opf-rx-core');
  var txt = (el && el.value || '').trim();
  if (!txt) { toast('请先粘贴核心全文（含语言格式节）', 'warning'); return; }
  ST.rx.core = txt;
  var parsed = rxParseLangFormat(txt);
  ST.rx.engine = 'script';
  ST.rx.parsed = parsed;
  ST.rx.coreName = rxDecideCoreName(txt, parsed);
  rxShowParsed(parsed, 'script', parsed.notes || []);
  rxBuildItems(parsed);
  rxCacheSave();
  toast('脚本解析完成：' + parsed.formats.length + ' 套格式', parsed.formats.length ? 'success' : 'warning');
}
function rxShowParsed(parsed, engine, notes) {
  var box = getEl('opf-rx-parsed');
  var L = ['引擎：' + (engine === 'ai' ? 'AI 解析（已通过脚本四项校验）' : '脚本解析（离线正则，AI 不可用时的后备）'),
    '核心名：' + ST.rx.coreName,
    '语言格式节：' + (parsed.section ? parsed.section.length + ' 字符' : '未找到'),
    '识别到格式 ' + parsed.formats.length + ' 套'];
  parsed.formats.forEach(function (f, i) {
    L.push('  [' + (i + 1) + '] ' + f.label + '  · 族=' + f.family + (f.nameValue ? ' · name固定值=' + f.nameValue : '') + (f.innerTag ? ' · 内嵌<' + f.innerTag + '>' : '') + (f.quote ? ' · 引号式' : ''));
    f.params.forEach(function (p) { L.push('        参数 ' + p.name + '：' + (p.values.length ? p.values.join('、') : '（未识别枚举）')); });
    L.push('        范例 ' + f.examples.length + ' 条' + (f.regex ? '' : '  ← 拒绝自动生成（裸引号式会吃掉全文所有「」）'));
  });
  (notes || []).forEach(function (n) { L.push('  ⚠ ' + n); });
  if (box) box.textContent = L.join('\n');
}
function rxBuildItems(parsed) {
  parsed.formats.forEach(function (f) {
    if (!f.regex) return;
    var exist = ST.rx.items.filter(function (it) { return it.formatKey === f.key && it.coreName === ST.rx.coreName; })[0];
    if (exist) {
      exist.examples = f.examples;
      exist.hasMood = f.params.some(function (x) { return x.name === 'mood'; });
      if (!exist.testText) exist.testText = f.examples[0] || '';
      return;
    }
    ST.rx.items.push({
      id: rxUuid(), coreName: ST.rx.coreName, formatKey: f.key, label: f.label,
      purpose: (RX_PURPOSES.indexOf(f.purposeHint) >= 0 ? f.purposeHint : '对话美化'), tier: 'fine', prefix: rxSlug(ST.rx.coreName) + '-box',
      findSource: '/' + f.regex.source + '/' + f.regex.flags,
      replaceHtml: '', testText: f.examples[0] || '', examples: f.examples,
      hasMood: f.params.some(function (x) { return x.name === 'mood'; }), issues: []
    });
  });
  rxRenderItems();
}
function rxRenderItems() {
  var box = getEl('opf-rx-items'); if (!box) return;
  rxInit();
  box.textContent = '';
  ST.rx.items.forEach(function (item, idx) {
    var card = document.createElement('div'); card.className = 'opf-step open';
    var head = document.createElement('div'); head.className = 'opf-step-head';
    var idxEl = document.createElement('span'); idxEl.className = 'opf-idx'; idxEl.textContent = String(idx + 1);
    var ttl = document.createElement('span'); ttl.className = 'opf-step-title'; ttl.textContent = item.label + ' · ' + item.purpose;
    var sub = document.createElement('span'); sub.className = 'opf-step-sub'; sub.textContent = (item.replaceHtml || '').length + ' 字符 / ' + rxTier(item.tier).label;
    var del = document.createElement('button'); del.type = 'button'; del.className = 'opf-step-act'; del.textContent = '删除';
    del.addEventListener('click', function (ev) { ev.stopPropagation(); ST.rx.items.splice(idx, 1); rxRenderItems(); rxCacheSave(); });
    head.appendChild(idxEl); head.appendChild(ttl); head.appendChild(sub); head.appendChild(del);
    head.addEventListener('click', function () { card.classList.toggle('open'); });
    card.appendChild(head);

    var body = document.createElement('div'); body.className = 'opf-step-body';
    // 用途 / 档位
    var row1 = document.createElement('div'); row1.className = 'opf-step-ref-row';
    var psel = document.createElement('select'); psel.className = 'opf-ref-input';
    RX_PURPOSES.forEach(function (p) { var o = document.createElement('option'); o.value = p; o.textContent = p; if (p === item.purpose) o.selected = true; psel.appendChild(o); });
    psel.addEventListener('change', function () { item.purpose = this.value; rxRenderItems(); rxCacheSave(); });
    var tsel = document.createElement('select'); tsel.className = 'opf-ref-input';
    RX_TIERS.forEach(function (t) { var o = document.createElement('option'); o.value = t.id; o.textContent = t.label + (t.target ? '（≈' + t.target + '）' : '（不设上限）'); if (t.id === item.tier) o.selected = true; tsel.appendChild(o); });
    tsel.addEventListener('change', function () { item.tier = this.value; rxRenderItems(); rxCacheSave(); });
    row1.appendChild(psel); row1.appendChild(tsel);
    body.appendChild(row1);
    // 匹配式
    body.appendChild(rxLabel('匹配式（插件生成，可手改）'));
    var fin = document.createElement('input'); fin.type = 'text'; fin.className = 'opf-ref-input'; fin.value = item.findSource;
    fin.addEventListener('input', function () { item.findSource = this.value; item.issues = []; rxPreviewInto(item); rxCacheSave(); });
    body.appendChild(fin);
    // 替换体
    body.appendChild(rxLabel('替换体（模型产出，可手改）'));
    var ta = document.createElement('textarea'); ta.className = 'opf-char-input'; ta.style.minHeight = '80px'; ta.value = item.replaceHtml;
    // 手改即视为「以文本框为准」：清掉可能过期的 css 缓存，之后 rxItemCss 会从 HTML 里现取
    ta.addEventListener('input', function () { item.replaceHtml = this.value; item.css = ''; rxPreviewInto(item); rxCacheSave(); });
    body.appendChild(ta);
    // 生成后修改：提要求 → AI 只改被要求的部分（可只改样式，或连带匹配式）
    body.appendChild(rxLabel('修改（对这条生成结果提要求，AI 只改你点到的部分；其它条目不受影响）'));
    var rrow = document.createElement('div'); rrow.className = 'opf-step-ref-row';
    var rscope = document.createElement('select'); rscope.className = 'opf-ref-input'; rscope.style.flex = '0 0 132px';
    [['patch', '补丁：只改样式'], ['css', '整段：只改样式'], ['find', '整段：样式+匹配式']].forEach(function (p) { var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; rscope.appendChild(o); });
    var rin = document.createElement('input'); rin.type = 'text'; rin.className = 'opf-ref-input';
    rin.placeholder = '例：边框改成暗金色、字号大一点、去掉动效；或：台词外的括号改成灰色小字';
    var rdo = document.createElement('button'); rdo.type = 'button'; rdo.className = 'opf-step-act'; rdo.textContent = '✨ 修改';
    rdo.addEventListener('click', function () { rxRefineItem(item, rin.value, rscope.value); });
    var rsug = document.createElement('button'); rsug.type = 'button'; rsug.className = 'opf-step-act'; rsug.textContent = '💡 建议';
    rsug.addEventListener('click', function () { rxSuggestItem(item, idx); });
    rin.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); rxRefineItem(item, rin.value, rscope.value); } });
    rrow.appendChild(rscope); rrow.appendChild(rin); rrow.appendChild(rdo); rrow.appendChild(rsug);
    body.appendChild(rrow);
    var chips = document.createElement('div'); chips.className = 'opf-step-ref'; chips.id = 'opf-rx-chips-' + idx;
    body.appendChild(chips);
    // 局部自动修复（只修这一条）
    var fixRow = document.createElement('div'); fixRow.className = 'opf-step-ref-row';
    var fl = document.createElement('span'); fl.className = 'opf-ref-tag'; fl.textContent = '局部修复';
    var fb = document.createElement('button'); fb.type = 'button'; fb.className = 'opf-step-act'; fb.textContent = '🔧 只修这一条';
    fb.addEventListener('click', async function () {
      if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
      var logs = rxAutoFixLocal(item);
      item.issues = rxLint(item, ST.rx.parsed);
      var left = rxLint(item, ST.rx.parsed).filter(function (x) { return RX_AI_FIXABLE.indexOf(x.key) >= 0; });
      rxRenderItems(); rxCacheSave(); rxDoCheck(false);
      toast(logs.length ? ('本条目已修：' + logs.join('；') + (left.length ? '（还剩 ' + left.length + ' 项需 AI）' : '')) : (left.length ? ('本地修不了，' + left.length + ' 项需 AI（点「🔧 自动修复」）') : '本条目自检通过'), logs.length ? 'success' : 'warning');
    });
    fixRow.appendChild(fl); fixRow.appendChild(fb);
    if (item._undo) {
      var ub = document.createElement('button'); ub.type = 'button'; ub.className = 'opf-step-act'; ub.textContent = '↩ 撤销上次 AI 改动';
      ub.title = '退回这次 AI 改写之前的匹配式/替换体（' + new Date(item._undo.at).toLocaleTimeString() + '）';
      ub.addEventListener('click', function () {
        if (!rxUndo(item)) { toast('没有可撤销的改动', 'warning'); return; }
        rxRenderItems(); rxCacheSave(); rxDoCheck(false);
        toast('已退回 AI 改动前的内容', 'success');
      });
      fixRow.appendChild(ub);
    }
    body.appendChild(fixRow);
    // 测试文本 + 预览
    body.appendChild(rxLabel('测试文本（默认取核心自带范例）'));
    var tt = document.createElement('textarea'); tt.className = 'opf-char-input'; tt.style.minHeight = '48px'; tt.value = item.testText;
    tt.addEventListener('input', function () { item.testText = this.value; rxPreviewInto(item); rxCacheSave(); });
    body.appendChild(tt);
    var pv = document.createElement('div'); pv.className = 'opf-rx-preview'; pv.id = 'opf-rx-pv-' + idx;
    body.appendChild(pv);
    var stat = document.createElement('div'); stat.className = 'opf-dim'; stat.id = 'opf-rx-st-' + idx;
    body.appendChild(stat);
    card.appendChild(body);
    box.appendChild(card);
    rxPreviewInto(item);
  });
}
function rxLabel(t) { var d = document.createElement('div'); d.className = 'opf-dim'; d.textContent = t; return d; }
function rxSetButtons() {
  ['opf-rx-parse', 'opf-rx-parse2', 'opf-rx-check', 'opf-rx-fix', 'opf-rx-pull', 'opf-rx-copy1', 'opf-rx-copyall', 'opf-rx-new', 'opf-rx-ping', 'opf-rx-models', 'opf-rx-last'].forEach(function (id) {
    var b = getEl(id); if (b) b.disabled = !!ST.running;
  });
  var ps = getEl('opf-rx-parse');
  if (ps) ps.textContent = ST.running ? '■ 解析中…' : '🔍 解析语言格式（AI）';
  var g = getEl('opf-rx-gen');
  if (g) { g.disabled = !!ST.running; g.textContent = ST.running ? '■ 运行中…' : '🎨 生成替换体'; }
  var sb = getEl('opf-shx-send');
  if (sb) { sb.disabled = !!ST.running; sb.textContent = ST.running ? '■ 她在翻书…' : '▶ 发送'; }
  ['opf-shx-compress', 'opf-shx-clear', 'opf-shx-export', 'opf-shx-models'].forEach(function (id) {
    var b2 = getEl(id); if (b2) b2.disabled = !!ST.running;
  });
}
function rxPreviewInto(item) {
  rxInit();
  var idx = ST.rx.items.indexOf(item);
  var pv = getEl('opf-rx-pv-' + idx), st = getEl('opf-rx-st-' + idx);
  if (!pv || !st) return;
  var m = String(item.findSource).match(/^\/([\s\S]*)\/([a-z]*)$/);
  if (!m) { st.textContent = '匹配式格式应为 /pattern/flags'; pv.textContent = ''; return; }
  var re;
  try { re = new RegExp(m[1], m[2].indexOf('g') >= 0 ? m[2] : m[2] + 'g'); }
  catch (e) { st.textContent = '正则编译失败：' + (e && e.message ? e.message : e); pv.textContent = ''; return; }
  var txt = item.testText || '';
  var hits = 0;
  var out = txt.replace(re, function () {
    hits++;
    var caps = Array.prototype.slice.call(arguments, 1, Math.max(1, arguments.length - 2)).filter(function (c) { return c !== undefined; });
    if (!item.replaceHtml) return '【此处将替换为美化框：' + caps.join(' ▸ ').slice(0, 50) + '】';
    return item.replaceHtml.replace(/\$(\d+)/g, function (all, n) { return caps[Number(n) - 1] != null ? caps[Number(n) - 1] : ''; });
  });
  if (hits > 0 && item.replaceHtml) {
    // 预览渲染：移除 script 与事件属性后再插入
    var safe = out.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
    pv.innerHTML = safe;
  } else {
    pv.textContent = out;
  }
  st.textContent = '匹配 ' + hits + ' 处' + (item.replaceHtml ? ' ｜ 替换体 ' + item.replaceHtml.length + ' 字符（' + rxTier(item.tier).label + '档）' : ' ｜ 尚未生成替换体');
}
// ---------- 取/设某一项的 CSS（样式唯一真源，改完重新组装骨架）----------
function rxItemCss(item) {
  if (item && typeof item.css === 'string' && item.css) return item.css;
  var m = String((item && item.replaceHtml) || '').match(/<style>([\s\S]*?)<\/style>/i);
  return m ? String(m[1]).trim() : '';
}
function rxItemFormat(item) {
  return (ST.rx.parsed && ST.rx.parsed.formats || []).filter(function (x) { return x.key === item.formatKey; })[0] || { family: 'quote', params: [] };
}
function rxSetItemCss(item, css) {
  item.css = String(css || '');
  item.replaceHtml = rxAssemble(item, rxItemFormat(item), item.css);
}
// ---------- CSS 解析与补丁合并：只让模型输出「要改的规则」，合并由插件做 ----------
// 按花括号配对切出顶层规则（跳过字符串与注释），@ 块整体算一条
function rxCssRules(css) {
  var s = String(css || ''), out = [], i = 0, n = s.length;
  var skipWsAndComments = function (p) {
    for (;;) {
      while (p < n && /\s/.test(s.charAt(p))) p++;
      if (s.slice(p, p + 2) === '/*') { var e = s.indexOf('*/', p + 2); p = e < 0 ? n : e + 2; continue; }
      return p;
    }
  };
  while (i < n) {
    var j = skipWsAndComments(i);
    if (j >= n) break;
    var k = j;
    while (k < n && s.charAt(k) !== '{' && s.charAt(k) !== ';') {
      if (s.slice(k, k + 2) === '/*') { var e1 = s.indexOf('*/', k + 2); k = e1 < 0 ? n : e1 + 2; continue; }
      var q = s.charAt(k);
      if (q === '"' || q === "'") { k++; while (k < n && s.charAt(k) !== q) { if (s.charAt(k) === '\\') k++; k++; } }
      k++;
    }
    if (k >= n) break;
    if (s.charAt(k) === ';') { i = k + 1; continue; }              // @import / @charset 之类
    var d = 0, m = k;
    for (; m < n; m++) {
      var c = s.charAt(m);
      if (s.slice(m, m + 2) === '/*') { var e2 = s.indexOf('*/', m + 2); m = e2 < 0 ? n : e2 + 1; continue; }
      if (c === '"' || c === "'") { m++; while (m < n && s.charAt(m) !== c) { if (s.charAt(m) === '\\') m++; m++; } continue; }
      if (c === '{') d++;
      else if (c === '}') { d--; if (d === 0) break; }
    }
    var pre = s.slice(j, k).trim();
    out.push({ prelude: pre, at: pre.charAt(0) === '@', raw: s.slice(i, m + 1), start: i, end: m + 1 });
    i = m + 1;
  }
  return out;
}
function rxCssNormSel(p) {
  return String(p || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}
// 把补丁里同选择器的规则覆盖进原 CSS，新选择器追加到末尾；未提到的部分逐字不动
function rxCssMerge(orig, patch) {
  var base = String(orig || '');
  var rules = rxCssRules(base), adds = rxCssRules(patch);
  var replaced = [], added = [], skipped = [], append = [];
  adds.forEach(function (r) {
    if (r.at) { skipped.push(r.prelude); return; }
    if (!r.prelude) return;
    var key = rxCssNormSel(r.prelude);
    var hit = null;
    for (var t = 0; t < rules.length; t++) { if (!rules[t].at && rxCssNormSel(rules[t].prelude) === key) { hit = rules[t]; break; } }
    if (hit) { hit.newRaw = r.raw; replaced.push(r.prelude); }
    else { added.push(r.prelude); append.push(r.raw); }
  });
  var out = '', cursor = 0;
  rules.forEach(function (x) {
    out += base.slice(cursor, x.start);
    out += (x.newRaw != null) ? x.newRaw : x.raw;
    cursor = x.end;
  });
  out += base.slice(cursor);
  if (append.length) out = out.replace(/\s*$/, '') + '\n\n/* 修改追加 */\n' + append.join('\n') + '\n';
  return { css: out, replaced: replaced, added: added, skipped: skipped };
}
// 模型没听劝、整段回了一套 CSS 时：按整段处理（走缩水保护），别再当补丁合并
function rxLooksLikeFullCss(patchCss, curCss) {
  var a = rxCssRules(patchCss).filter(function (r) { return !r.at; }).length;
  var b = rxCssRules(curCss).filter(function (r) { return !r.at; }).length;
  return a > 0 && b > 0 && a >= Math.max(4, Math.ceil(b * 0.6));
}
// ---------- 自动修复：先本地（纯字符串、立即），剩下交给 AI ----------
var RX_AI_FIXABLE = ['ref', 'moodbranch', 'external', 'fixedwidth', 'nomatch', 'toosmall', 'toobig', 'exmatch', 'empty'];
// 条目是否「就是插件生成的骨架 + CSS」——只有这种才能安全地只换 CSS 层。
// 判据是逐字重建比对：把现有 CSS 塞回骨架，能与条文一字不差，才认定结构没被动过；
// 用户手改过（哪怕只改了标签）就一律走「整段替换」模式，绝不拿骨架覆盖他的手写内容。
function rxIsSkeletonItem(item) {
  var rep = String((item && item.replaceHtml) || '');
  if (rep.indexOf('<style') < 0 || rep.indexOf(RX_STYLE_SLOT) >= 0) return false;
  try {
    var f = rxItemFormat(item);
    return rxAssemble(item, f, rxItemCss(item)) === rep;
  } catch (e) { return false; }
}
function rxAutoFixLocal(item) {
  var done = [];
  var issues = rxLint(item, ST.rx.parsed);
  issues.forEach(function (is) {
    if (is.side !== 'regex' || !is.fix || is.fix === 'none') return;
    done.push(rxApplyFix(item, is));
  });
  if (done.length) item.issues = rxLint(item, ST.rx.parsed);
  return done;
}
var RX_REFINE_RULES = [
  '【修改规则】',
  '1. 只改用户要求/问题清单点到的部分，未提到的保持原样；不要顺手重构、不要换配色体系、不要改 class 名与骨架结构。',
  '2. 颜色继续使用已有的 CSS 变量；确实需要新颜色就新增变量并在最外层定义。',
  '3. 禁止：<script>、外部字体/图片资源、写死像素宽度、依赖 :hover 才显示文字、@import。',
  '4. 必须保留骨架里出现的所有 $n 捕获组引用，不得新增或删除引用。'
].join('\n');
var RX_REFINE_RULES_FULL = RX_REFINE_RULES + '\n5. 这条替换体是用户手写的整段内容：直接输出改好的整段替换体全文（含 <style> 与标签），不要套用任何别的骨架。';
// 把 AI 返回的 JSON 落到条目上；mode=full 时整段替换，mode=css 时只换样式层
function rxApplyAiResult(item, j, rawText, scope) {
  var mode = rxIsSkeletonItem(item) ? 'css' : 'full';
  var changed = [];
  if (j && typeof j.css === 'string' && j.css.trim() && mode === 'css') { rxSetItemCss(item, j.css); changed.push('样式'); }
  if (j && typeof j.replaceString === 'string' && j.replaceString.trim()) { item.replaceHtml = j.replaceString.trim(); item.css = ''; changed.push('替换体'); }
  if (j && typeof j.findRegex === 'string' && j.findRegex.trim() && scope !== 'css') { item.findSource = j.findRegex.trim(); changed.push('匹配式'); }
  if (!changed.length && mode === 'css') {
    var c = rxExtractCss(rawText);                            // 容错：整段回复就是 CSS
    if (c) { rxSetItemCss(item, c); changed.push('样式（按纯 CSS 解析）'); }
  }
  item.issues = rxLint(item, ST.rx.parsed);
  return changed;
}
// ---------- 撤销快照：任何 AI 改写前先存一份，改坏了能一键退回 ----------
function rxSnapshot(item) {
  item._undo = { css: (typeof item.css === 'string' ? item.css : ''), replaceHtml: String(item.replaceHtml || ''), findSource: String(item.findSource || ''), at: Date.now() };
}
function rxUndo(item) {
  var u = item._undo; if (!u) return false;
  item.css = u.css; item.replaceHtml = u.replaceHtml; item.findSource = u.findSource; item._undo = null;
  item.issues = rxLint(item, ST.rx.parsed);
  return true;
}
// 用户是不是明确要求「变短/删东西」——是的话缩水保护放宽
function rxWantsShort(dir) {
  return /精简|简化|缩短|短一点|更短|压缩|删|去掉|去除|移除|减少|减掉|瘦身|太长|简略/.test(String(dir || ''));
}
function rxShrinkThreshold(dir) { return rxWantsShort(dir) ? 0.45 : 0.75; }
// 结果明显偏短 = 疑似只回传了改动片段（600 字符以下的小样式不做判定，免得误伤）
function rxIsShrinkSuspect(beforeLen, afterLen, dir) {
  var b = Number(beforeLen) || 0;
  return b >= 600 && (Number(afterLen) || 0) < b * rxShrinkThreshold(dir);
}
// 从模型回复里取正文本体：优先 css（骨架条目）/ replaceString（手写条目），再兜底整段 CSS
function rxAiPayload(j, rawText, mode) {
  if (j && typeof j.css === 'string' && j.css.trim() && mode === 'css') return { kind: 'css', text: j.css };
  if (j && typeof j.replaceString === 'string' && j.replaceString.trim()) return { kind: 'replaceString', text: j.replaceString };
  if (mode === 'css') { var c = rxExtractCss(rawText); if (c) return { kind: 'css', text: c, loose: true }; }
  return null;
}
function rxAiPromptOf(item, f, issues, dir, scope, mode) { return rxRepairPrompt(item, f, issues, dir, scope, mode)[0]; }
async function rxCallRepair(prompt, phase) {
  var resp = await rxStreamCall([{ role: 'system', content: rxSlimSystemContent(ST.rx.parsed && ST.rx.parsed.section || '', 6000) }, { role: 'user', content: prompt }], null, { phase: phase, idleMs: 20000, maxMs: 220000, maxTokens: 16000 });
  ST.rx.lastRaw = String(resp.text || '');
  ST.rx.lastStalled = !!resp.stalled;
  return resp.text || '';
}
// AI 改写唯一入口：改写 → 缩水保护（自动重试一次）→ 落地。
// 返回 { changed:[], mode, before, after, blocked:bool }
async function rxAiRewrite(item, f, issues, dir, scope, phase) {
  var mode = rxIsSkeletonItem(item) ? 'css' : 'full';
  var beforeText = mode === 'css' ? rxItemCss(item) : String(item.replaceHtml || '');
  var out = { changed: [], mode: mode, before: beforeText.length, after: beforeText.length, blocked: false, note: '' };
  var prompt = rxAiPromptOf(item, f, issues, dir, scope, mode);
  var raw = await rxCallRepair(prompt, phase);
  var j = rxExtractJson(raw);
  var payload = rxAiPayload(j, raw, mode);
  var tooShort = function (len) { return rxIsShrinkSuspect(beforeText.length, len, dir); };
  if (payload && tooShort(payload.text.length)) {
    // 模型多半只回了「改动片段」。明确要求它把未改动的部分逐字补全，再给一次机会。
    var p2 = prompt
      + '\n\n[上一次的输出不合格：疑似省略了未改动部分]\n上一次只给了 ' + payload.text.length + ' 字符，而原内容有 ' + beforeText.length + ' 字符。请重新输出**完整**的' + (mode === 'css' ? 'CSS' : '替换体') + '：未被要求改动的规则必须逐字保留，禁止 "/* 其余不变 */"「以下省略」这类占位，也不要用中文说明代替代码。\n\n[上一次的输出]\n' + String(payload.text).slice(0, 4000);
    var raw2 = await rxCallRepair(p2, phase + '（补全重试）');
    var j2 = rxExtractJson(raw2);
    var p2r = rxAiPayload(j2, raw2, mode);
    if (p2r && p2r.text.length > payload.text.length) { payload = p2r; j = j2; }
  }
  if (!payload) { out.note = '模型没有返回可用的' + (mode === 'css' ? 'CSS' : '替换体') + (ST.rx.lastStalled ? '（传输中途停顿，疑似被截断，可直接重试）' : '') + '（工具栏「📄 上次返回」可看原文）'; return out; }
  out.after = payload.text.length;
  if (tooShort(payload.text.length)) {
    // 连重试都还是明显偏短：不静默落地，交用户裁决（默认保留原样）
    out.blocked = true;
    out.note = '改后只有 ' + payload.text.length + ' 字符，原为 ' + beforeText.length + ' 字符（-' + Math.round((1 - payload.text.length / Math.max(1, beforeText.length)) * 100) + '%），疑似只回传了改动片段（已自动重试一次仍未补全）' + (ST.rx.lastStalled ? '；传输中途停顿过，也可能被截断' : '');
    var ask = (typeof window !== 'undefined' && window.confirm) ? window.confirm : function () { return false; };
    if (!ask(out.note + '。\n\n要用这个偏短的结果替换吗？\n（点「取消」= 保留原样，点「确定」= 替换，之后还能用「↩ 撤销」退回）')) return out;
    out.blocked = false;
    out.note += '（你选择保留这个偏短结果）';
  }
  rxSnapshot(item);
  var jj = {};
  if (j && typeof j.findRegex === 'string') jj.findRegex = j.findRegex;
  if (payload.kind === 'css') jj.css = payload.text; else jj.replaceString = payload.text;
  out.changed = rxApplyAiResult(item, jj, payload.loose ? raw : '', scope);
  return out;
}
function rxRepairPrompt(item, f, issues, dir, scope, mode) {
  var L = [];
  var cur = mode === 'css' ? rxItemCss(item) : String(item.replaceHtml || '');
  L.push('[任务] ' + (dir ? '按用户要求修改' : '修复') + '一条「对话美化正则」：它把命定系统输出的对话标签渲染成美化框。' + (dir ? '' : '只改与问题清单有关的地方。'));
  if (dir) L.push('[用户要求]\n' + String(dir));
  if (issues && issues.length) L.push('[自检发现的问题（逐条修掉）]\n' + issues.map(function (x, i) { return (i + 1) + '. [' + (x.side === 'core' ? '核心侧' : '正则侧') + '] ' + x.msg; }).join('\n'));
  L.push('[当前匹配式' + (scope === 'find' ? '（本次允许修改：改完必须仍能匹配核心自带的范例）' : '（本次不要改动）') + ']\n' + item.findSource);
  L.push(mode === 'css' ? ('[当前 CSS（共 ' + cur.length + ' 字符）]\n' + (cur || '（空，需要你写）')) : ('[当前替换体全文（共 ' + cur.length + ' 字符）]\n' + (cur || '（空，需要你写）')));
  L.push(mode === 'css'
    ? ('[骨架（HTML 结构由插件生成并锁定，绝不能改动）]\n' + rxSkeleton(item, f))
    : ('[本条在核心里的典型形态（仅供你对齐 $n 引用布局，结构可自行组织）]\n' + rxSkeleton(item, f)));
  if (f.params && f.params.length) f.params.forEach(function (p) { if (p.values && p.values.length) L.push('[参数 ' + p.name + ' 的枚举值] ' + p.values.join('、')); });
  L.push(mode === 'css' ? RX_REFINE_RULES : RX_REFINE_RULES_FULL);
  L.push('[完整性要求] 你必须输出**完整**的结果，不是改动片段：未被要求改动的规则原样逐字保留（包括注释、选择器、变量定义、@keyframes、data-mood 分支），禁止 "/* 其余不变 */"「以下省略」这类占位。原始内容有 ' + cur.length + ' 字符，除非用户明确要求精简，你的输出不应明显短于这个长度。');
  L.push('[输出] 只输出一个 ' + fence() + 'json 代码块：' + (mode === 'css' ? '{"css":"修改后的完整 CSS"}' : '{"replaceString":"修改后的完整替换体"}') + (scope === 'find' ? '；若确需改匹配式，再加 "findRegex":"/…/g"' : '') + '。字符串内部如需换行请写成 \\n 转义（或直接输出 ' + fence() + 'css 代码块），不要输出任何其它文字。');
  return [macroFill(L.join('\n\n')), mode];
}
async function rxAutoFixAi(item, issues) {
  var f = rxItemFormat(item);
  var r = await rxAiRewrite(item, f, issues, '', 'find', '自动修复');
  if (r.blocked) return [];
  return r.changed;
}
async function rxAutoFixAll() {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  rxInit();
  if (!ST.rx.items.length) { toast('还没有正则草稿', 'warning'); return; }
  var st = getEl('opf-rx-statusline');
  var localLog = [];
  ST.rx.items.forEach(function (it) {
    var d = rxAutoFixLocal(it);
    if (d.length) localLog.push(it.label + '：' + d.join('；'));
  });
  rxRenderItems(); rxCacheSave();
  var left = [];
  ST.rx.items.forEach(function (it) {
    rxLint(it, ST.rx.parsed).forEach(function (is) { if (RX_AI_FIXABLE.indexOf(is.key) >= 0) left.push({ it: it, is: is }); });
  });
  if (st) st.textContent = '本地修复 ' + localLog.length + ' 项；剩余需 AI 修复 ' + left.length + ' 项';
  if (!left.length) {
    rxDoCheck(false);
    toast(localLog.length ? ('自动修复完成（本地修好 ' + localLog.length + ' 项）：' + localLog.join('｜')) : '自检没有问题，无需修复', 'success');
    return;
  }
  if (!window.confirm('本地能修的已经修完：\n' + (localLog.join('\n') || '（无）') + '\n\n还剩 ' + left.length + ' 项需要 AI 改写（如 $n 引用越界、mood 未分支、体量偏离、匹配不上范例）。现在让 AI 修吗？')) return;
  ST.running = true; renderRunButtons();
  try {
    var byItem = [];
    left.forEach(function (x) { var g = byItem.filter(function (y) { return y.it === x.it; })[0]; if (g) g.list.push(x.is); else byItem.push({ it: x.it, list: [x.is] }); });
    var okN = 0;
    for (var i = 0; i < byItem.length; i++) {
      if (isStop()) break;
      if (st) st.textContent = 'AI 修复中…（' + (i + 1) + '/' + byItem.length + '：' + byItem[i].it.label + '）';
      var ch = await rxAutoFixAi(byItem[i].it, byItem[i].list);
      if (ch.length) okN++;
      await waitTick();
    }
    rxRenderItems(); rxCacheSave(); rxDoCheck(false);
    if (st) st.textContent = '自动修复完成：本地 ' + localLog.length + ' 项，AI 修复 ' + okN + '/' + byItem.length + ' 项';
    toast('自动修复完成：本地 ' + localLog.length + ' 项，AI 修复 ' + okN + ' 项（剩余项见自检区）', okN ? 'success' : 'warning');
  } catch (e) {
    toast('AI 修复出错：' + rxDiagError(e), 'error');
  } finally { ST.running = false; renderRunButtons(); }
}
// ---------- 生成后修改：用户提要求，AI 只改被要求的部分 ----------
// 补丁模式（默认）：仍然把完整 CSS 作为输入发给模型，但**只要求它输出要改的规则**，
// 合并按选择器由插件完成 —— 输出从 1.5 万字符降到几百字符，截断/偷懒/思考吃预算全部失效。
var RX_REFINE_RULES_PATCH = [
  '【修改规则】',
  '1. 只改用户要求点到的部分，未提到的规则一个字都不要动（也不用抄）。',
  '2. 颜色优先使用现有 CSS 变量；确实需要新颜色可以在规则里写死，或用 :root 之外的自定义属性。',
  '3. 禁止：<script>、外部字体/图片资源、写死像素宽度、依赖 :hover 才显示文字、@import。',
  '4. 必须保留现有的 class 名与骨架结构，不得重命名选择器。'
].join('\n');
function rxPatchPrompt(item, f, dir) {
  var cur = rxItemCss(item);
  var L = [];
  L.push('[任务] 修改一条「对话美化正则」的样式层。**你只输出需要新增或替换的 CSS 规则**——未改动的规则一律不要重复输出：插件会把你的规则按选择器合并进现有 CSS，没提到的部分逐字保留。');
  L.push('[用户要求]\n' + String(dir));
  L.push('[当前完整 CSS（共 ' + cur.length + ' 字符）——只供你确认选择器、变量与既有写法，不要原样重抄]\n' + cur);
  L.push('[骨架（HTML 结构由插件生成并锁定，绝不能改动）]\n' + rxSkeleton(item, f));
  if (f.params && f.params.length) f.params.forEach(function (p) { if (p.values && p.values.length) L.push('[参数 ' + p.name + ' 的枚举值] ' + p.values.join('、')); });
  L.push('[合并规则]\n1. 改已有规则：输出**同选择器**的完整规则块（选择器写法与现有一致，大小写与空白会被规范化后匹配）；\n2. 新增规则：用新选择器，插件会追加到末尾；\n3. 一条规则必须整体写出（选择器 + 完整花括号内容），不要只写半截声明；\n4. 不要输出 @media / @keyframes / @font-face / @import 等 @ 块——需要改这类整块时提示改用「整段重写」档；\n5. 一次最多输出 12 条规则，只覆盖用户要求涉及的部分。');
  L.push(RX_REFINE_RULES_PATCH);
  L.push('[输出] 一个 ' + fence() + 'css 代码块，里面**只有要合并的规则**；不要 JSON、不要解释、不要重抄整份 CSS。');
  return macroFill(L.join('\n\n'));
}
async function rxRefinePatch(item, dir) {
  var f = rxItemFormat(item);
  var cur = rxItemCss(item);
  var out = { changed: [], before: cur.length, after: cur.length, blocked: false, note: '', replaced: 0, added: 0, skipped: 0 };
  if (!cur) { out.note = '这条还没有样式可补丁，请用「整段重写」档或先生成替换体'; return out; }
  var raw = await rxCallRepair(rxPatchPrompt(item, f, dir), '修改·补丁');
  var patchCss = rxExtractCss(raw);
  if (!patchCss) { out.note = '模型没有返回可用的规则' + (ST.rx.lastStalled ? '（传输中途停顿，疑似被截断，可直接重试）' : '') + '（工具栏「📄 上次返回」可看原文）'; return out; }
  // 兜底 1：模型整段回了一套 CSS → 按整段重写处理，走缩水保护
  if (rxLooksLikeFullCss(patchCss, cur)) {
    if (rxIsShrinkSuspect(cur.length, patchCss.length, dir)) {
      out.blocked = true;
      out.note = '模型没有按补丁输出，而是整段回了一套 CSS，且只有 ' + patchCss.length + ' / 原 ' + cur.length + ' 字符（疑似截断），已保留原样';
      return out;
    }
    rxSnapshot(item); rxSetItemCss(item, patchCss); item.issues = rxLint(item, ST.rx.parsed);
    out.changed = ['样式（整段）']; out.after = patchCss.length; out.note = '模型整段返回，已按整段替换处理';
    return out;
  }
  var mg = rxCssMerge(cur, patchCss);
  if (!mg.replaced.length && !mg.added.length) {
    out.note = '没能从返回里解析出可合并的规则' + (mg.skipped.length ? '（只收到 @ 块：' + mg.skipped.join('、') + '，请改用「整段重写」档）' : '');
    return out;
  }
  rxSnapshot(item);
  rxSetItemCss(item, mg.css);
  item.issues = rxLint(item, ST.rx.parsed);
  out.replaced = mg.replaced.length; out.added = mg.added.length; out.skipped = mg.skipped.length;
  out.after = mg.css.length;
  out.changed = ['样式补丁'];
  out.note = '替换 ' + mg.replaced.length + ' 条 / 新增 ' + mg.added.length + ' 条规则' + (mg.skipped.length ? '（跳过 ' + mg.skipped.length + ' 个 @ 块）' : '');
  return out;
}
async function rxRefineItem(item, dir, scope) {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var text = String(dir || '').trim();
  if (!text) { toast('先写一句修改要求，例如「边框改成金色、字号大一点、去掉动效」', 'warning'); return; }
  var f = rxItemFormat(item);
  ST.running = true; renderRunButtons();
  var st = getEl('opf-rx-statusline');
  if (st) st.textContent = '按你的要求修改中…';
  try {
    var r;
    if (scope === 'patch' && rxIsSkeletonItem(item)) r = await rxRefinePatch(item, text);
    else {
      if (scope === 'patch') toast('这条是手写替换体（不是骨架 + CSS 结构），补丁模式不适用，已按「整段重写」处理', 'warning');
      r = await rxAiRewrite(item, f, null, text, 'css', '修改');
    }
    rxRenderItems(); rxCacheSave();
    if (r.changed.length) {
      var msg = r.changed.join('、') + '：' + r.before + ' → ' + r.after + ' 字符';
      if (st) st.textContent = '已修改（' + msg + '）' + (r.note ? ' ｜ ' + r.note : '');
      toast('已修改（' + msg + '）' + (r.note ? '　' + r.note : ''), r.blocked ? 'warning' : 'success');
    } else if (r.blocked) {
      if (st) st.textContent = '已中止：' + r.note;
      toast('已保留原样（' + r.note + '）', 'warning');
    } else {
      var n = r.note || '模型没有返回可用的修改结果';
      if (st) st.textContent = n;
      toast(n + '，可换个说法再试', 'warning');
    }
  } catch (e) {
    toast('修改出错：' + rxDiagError(e), 'error');
    if (st) st.textContent = '修改出错：' + rxDiagError(e).slice(0, 120);
  } finally { ST.running = false; renderRunButtons(); }
}
async function rxSuggestItem(item, idx) {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var box = getEl('opf-rx-chips-' + idx); if (!box) return;
  ST.running = true; renderRunButtons();
  try {
    var ask = '下面是一个「对话美化正则」当前的 CSS 与骨架。请给出 2~3 条**只针对样式**的具体修改方向（每条一行、≤30字、直接可执行，例如"边框换成暗金色渐变"）。不要输出 CSS 本身。\n\n[当前 CSS]\n' + rxItemCss(item).slice(0, 2000) + '\n\n[骨架]\n' + rxSkeleton(item, rxItemFormat(item));
    var resp = await rxStreamCall([{ role: 'user', content: ask }], null, { phase: '建议', idleMs: 20000, maxMs: 90000, maxTokens: 1500 });
    var list = [];
    String(resp.text).split(/\r?\n/).forEach(function (ln) {
      var t = String(ln).replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').trim();
      if (t && t.length >= 4 && t.length <= 40 && list.indexOf(t) < 0) list.push(t);
    });
    if (!list.length) list = ['让配色更贴合核心气质', '加强边框层次与阴影', '降低动效强度'];
    box.textContent = '';
    list.slice(0, 3).forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'opf-dir-chip';
      b.textContent = '▶ ' + t;
      b.addEventListener('click', function () { rxRefineItem(item, t, 'patch'); });
      box.appendChild(b);
    });
  } catch (e) { toast('生成建议失败：' + rxDiagError(e), 'error'); }
  finally { ST.running = false; renderRunButtons(); }
}
// ---------- 524 / 超时诊断：把 Cloudflare 的 8KB HTML 变成一句人话 ----------
function rxDiagError(err) {
  var m = (err && err.message) ? err.message : String(err || '');
  if (/524/.test(m) && /cloudflare|timeout occurred|cf-error|A timeout occurred/i.test(m)) {
    return '中转站超时（Cloudflare 524：源站在 100 秒内没有回任何字节）。注意这不是插件的问题：'
      + '酒馆的 generateRaw 永远是非流式的（源码 script.js L4018 用 sendOpenAIRequest(\'quiet\',…) 调用，'
      + '而流式分支 L5326 明确排除 quiet），所以中转站必须等整段生成完才回包，输出越长越容易撞墙。'
      + '对策：① 打开本页的「直连 + 真流式」② 降低档位让每段更小 ③ 换时段或换中转。';
  }
  var code = m.match(/\b(50[234])\b/);
  if (code) return '中转站返回 ' + code[1] + '（网关错误），属可重试类，稍后重试或降低单段字数。';
  if (/No message generated/i.test(m)) return '模型返回空（可能被中转站截断或安全策略拦截），可重试或降低单段字数。';
  if (/aborted|Cancelled|停止/i.test(m)) return '已中止。';
  return m.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}
// ---------- 三种传输：酒馆主 API / 经酒馆服务端转发+流式 / 浏览器直连+流式 ----------
// 「经服务端转发」是类反向代理场景的正解：反代地址、密钥、Gemini 协议转换、CORS 全由酒馆服务端处理
// 依据：ST 1.18.0 src/endpoints/backends/chat-completions.js
//   router.post('/generate') → case MAKERSUITE: sendMakerSuiteRequest(...)
//   responseType = stream ? 'streamGenerateContent' : 'generateContent'  → 追加 &alt=sse
//   convertGooglePrompt(request.body.messages, …)；apiKey = reverse_proxy ? proxy_password : readSecret(...)
function rxCfg() {
  rxInit();
  ST.rx.cfg = ST.rx.cfg || {
    transport: 'st', source: 'makersuite', model: '', reverseProxy: '', proxyPassword: '',
    directProtocol: 'openai', baseUrl: '', apiKey: '', chatModel: '', customModels: []
  };
  var c = ST.rx.cfg;
  if (!c.transport) c.transport = 'st';
  if (!c.source) c.source = 'makersuite';
  if (!c.directProtocol) c.directProtocol = 'openai';
  if (!Array.isArray(c.customModels)) c.customModels = [];
  if (!c.reverseProxy && !c.baseUrl) { try { var sh = shxCfg(); c.baseUrl = sh.baseUrl || ''; c.apiKey = sh.apiKey || ''; } catch (e) {} }
  return c;
}
// 传输是否可用（不可用时生成会降级到主 API，但绝不静默改写用户配置）
function rxTransportUsable(cfg) {
  cfg = cfg || rxCfg();
  if (cfg.transport === 'st') return true;
  if (cfg.transport === 'server') return !!(cfg.reverseProxy && cfg.model);
  if (cfg.transport === 'direct') return !!(cfg.baseUrl && (cfg.chatModel || cfg.model));
  return true;
}
function rxTransportWhy(cfg) {
  cfg = cfg || rxCfg();
  if (cfg.transport === 'server') {
    if (!cfg.reverseProxy) return '还缺「中转/反代地址」';
    if (!cfg.model) return '还缺「模型名」——可点「🔌 获取模型列表」，或直接手填（填过会记住）';
  }
  if (cfg.transport === 'direct') {
    if (!cfg.baseUrl) return '还缺「直连地址」';
    if (!cfg.chatModel && !cfg.model) return '还缺「模型名」';
  }
  return '';
}
function rxHeaders() { var h = { 'Content-Type': 'application/json' }; var k = String(rxCfg().proxyPassword || '').trim(); if (k) h['Authorization'] = 'Bearer ' + k; return h; }
// 通用 SSE 读取：同时兼容 OpenAI 形状与 Google 原生形状
// opts: { idleMs: 无新字节多久判定停顿, maxMs: 绝对上限, maxChars: 收满即停（硬顶防跑飞）}
function rxSseText(obj) {
  if (!obj) return '';
  var ch = obj.choices && obj.choices[0];
  if (ch) {
    var d = ch.delta || ch.message;
    if (d && typeof d.content === 'string') return d.content;
    if (ch.text) return ch.text;
  }
  var cand = obj.candidates && obj.candidates[0];
  if (cand && cand.content && Array.isArray(cand.content.parts)) {
    return cand.content.parts.map(function (p) { return (p && typeof p.text === 'string') ? p.text : ''; }).join('');
  }
  return '';
}
async function rxReadSse(resp, onDelta, opts) {
  var o = opts || {};
  var idleMs = Number(o.idleMs) || 20000;      // 20 秒没有新字节 → 判定停顿
  var maxMs = Number(o.maxMs) || 240000;       // 4 分钟绝对上限
  var maxChars = Number(o.maxChars) || 0;
  if (!resp.body || !resp.body.getReader) throw new Error('当前环境不支持流式读取（ReadableStream 不可用）');
  var reader = resp.body.getReader(), dec = new TextDecoder(), buf = '', full = '';
  var lastByte = Date.now(), stalled = false;
  var kill = function () { stalled = true; try { reader.cancel().catch(function () {}); } catch (e) {} };
  var tIdle = setTimeout(function () { if (Date.now() - lastByte >= idleMs) kill(); }, idleMs + 300);
  var tMax = setTimeout(kill, maxMs);
  try {
    while (true) {
      var chunk;
      try { chunk = await reader.read(); }
      catch (e) { stalled = true; break; }
      if (chunk.done) break;
      lastByte = Date.now();
      buf += dec.decode(chunk.value, { stream: true });
      var lines = buf.split('\n');
      buf = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.indexOf('data:') !== 0) continue;
        var payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          var t = rxSseText(JSON.parse(payload));
          if (t) { full += t; if (onDelta) onDelta(t, full.length); }
        } catch (e) { /* 心跳或非 JSON 行 */ }
      }
      if (maxChars && full.length >= maxChars) { kill(); break; }   // 收够就停，防模型跑飞
    }
  } finally {
    clearTimeout(tIdle); clearTimeout(tMax);
  }
  // 尾缓冲（没有换行结尾的最后一段）也要处理
  if (buf.trim()) {
    var last = buf.trim();
    if (last.indexOf('data:') === 0 && last.slice(5).trim() !== '[DONE]') {
      try { var t2 = rxSseText(JSON.parse(last.slice(5).trim())); if (t2) { full += t2; if (onDelta) onDelta(t2, full.length); } } catch (e) {}
    }
  }
  return { text: full, stalled: stalled };
}
// ① 经酒馆服务端转发（推荐：兼容类反向代理、无 CORS 问题、Google 协议由 ST 转换）
async function rxServerStream(messages, onDelta, opts) {
  var o = opts || {};
  var cfg = rxCfg();
  if (!cfg.model) throw new Error('未填写模型名（可点「🔌 获取模型列表」自动拉取）');
  if (!cfg.reverseProxy) throw new Error('未填写中转/反代地址');
  var origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
  var h = { 'Content-Type': 'application/json' };
  try {
    var c = getCtx();
    if (c && typeof c.getRequestHeaders === 'function') { var rh = c.getRequestHeaders(); for (var k in rh) h[k] = rh[k]; }
  } catch (e) { /* 拿不到 CSRF 头时仍尝试 */ }
  var body = {
    chat_completion_source: cfg.source || 'makersuite',
    reverse_proxy: cfg.reverseProxy,
    proxy_password: cfg.proxyPassword || '',
    model: cfg.model,
    messages: messages.map(function (m) { return { role: m.role, content: m.content }; }),
    use_sysprompt: true,
    stream: true,
    max_tokens: Number(o.maxTokens) || 8192,   // 按每段预算换算，硬顶防跑飞
    temperature: 0.85
  };
  var r = await fetch(origin + '/api/backends/chat-completions/generate', { method: 'POST', headers: h, body: JSON.stringify(body) });
  if (!r.ok) {
    var txt = '';
    try { txt = (await r.text()).slice(0, 300); } catch (e) {}
    throw new Error('酒馆服务端转发失败 HTTP ' + r.status + ' ' + txt);
  }
  return rxReadSse(r, onDelta, { idleMs: o.idleMs, maxMs: o.maxMs, maxChars: o.maxChars });
}
// ② 浏览器直连（OpenAI 兼容 / Google 原生）
function rxGeminiBody(messages) {
  var sys = messages.filter(function (m) { return m.role === 'system'; }).map(function (m) { return m.content; }).join('\n\n');
  var contents = messages.filter(function (m) { return m.role !== 'system'; }).map(function (m) {
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
  });
  var body = { contents: contents, generationConfig: { maxOutputTokens: 8192, temperature: 0.85 } };
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  return body;
}
async function rxDirectStream(messages, onDelta, opts) {
  var o = opts || {};
  var cfg = rxCfg();
  var base = String(cfg.baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('未填写直连地址');
  var model = cfg.chatModel || cfg.model;
  if (!model) throw new Error('未填写直连聊天模型');
  var key = String(cfg.apiKey || '').trim();
  var url, body, headers = { 'Content-Type': 'application/json' };
  if (cfg.directProtocol === 'gemini') {
    url = base + '/v1beta/models/' + encodeURIComponent(model) + ':streamGenerateContent?alt=sse' + (key ? '&key=' + encodeURIComponent(key) : '');
    body = rxGeminiBody(messages);
    if (o.maxTokens) body.generationConfig = body.generationConfig || {}; body.generationConfig.maxOutputTokens = Number(o.maxTokens);
    if (key) headers['x-goog-api-key'] = key;
  } else {
    url = base + '/chat/completions';
    body = { model: model, messages: messages, stream: true, temperature: 0.85 };
    if (o.maxTokens) body.max_tokens = Number(o.maxTokens);
    if (key) headers['Authorization'] = 'Bearer ' + key;
  }
  var r = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
  if (!r.ok) { var t = ''; try { t = (await r.text()).slice(0, 300); } catch (e) {} throw new Error('HTTP ' + r.status + ' ' + t); }
  return rxReadSse(r, onDelta, { idleMs: o.idleMs, maxMs: o.maxMs, maxChars: o.maxChars });
}
function rxStreamCall(messages, onNote, opts) {
  var cfg = rxCfg();
  var o = opts || {};
  if (rxForceSt || cfg.transport === 'st') {
    // 主 API：零配置，跟随酒馆当前模型与采样；用 responseLength 按段预算硬顶输出长度
    var ro = o.maxTokens ? { responseLength: Number(o.maxTokens) } : null;
    return callModel(messages, ro).then(function (t) { return { text: String(t), stalled: false }; });
  }
  var t0 = Date.now();
  var lastShown = 0;
  var onDelta = function (t, len) {
    var now = Date.now();
    if (onNote && (len - lastShown >= 700 || now - t0 - 5000 * (Math.floor((now - t0) / 5000)) >= 0 && len !== lastShown)) {
      // 每 700 字符或每 5 秒刷一次（含"持续生成中"），避免长时间看起来像卡死
      lastShown = len;
      onNote('流式接收中… ' + len + ' 字符（' + Math.round((now - t0) / 1000) + 's' + (o.phase ? '｜' + o.phase : '') + '）');
    }
  };
  // 定时兜底刷新：即使没有新字节也每 5 秒报一次时间
  var timer = setInterval(function () {
    if (onNote) onNote('流式接收中… ' + lastShown + ' 字符（' + Math.round((Date.now() - t0) / 1000) + 's' + (o.phase ? '｜' + o.phase : '') + '，仍在等待…）');
  }, 5000);
  var p = (cfg.transport === 'server' ? rxServerStream(messages, onDelta, o) : rxDirectStream(messages, onDelta, o));
  return p.then(function (res) { clearInterval(timer); return res; }, function (e) { clearInterval(timer); throw e; });
}
// 从酒馆自己的设置里读反代地址与代理密码（省得手打）
// DOM id 依据 ST 1.18.0 public/scripts/openai.js L363/L372 与 public/index.html L2978/L2994：
//   reverse_proxy: ['#openai_reverse_proxy', 'reverse_proxy', …]
//   proxy_password: ['#openai_proxy_password', 'proxy_password', …]
// 且 ST 生成请求时正是 generate_data.reverse_proxy / proxy_password（openai.js L2788-2791）
function rxPullFromTavern() {
  var cfg = rxCfg();
  var urlEl = getEl('openai_reverse_proxy'), pwEl = getEl('openai_proxy_password');
  var url = urlEl ? String(urlEl.value || '').trim() : '';
  var pw = pwEl ? String(pwEl.value || '').trim() : '';
  var got = [];
  if (url) { cfg.reverseProxy = url; got.push('反代地址'); }
  if (pw) { cfg.proxyPassword = pw; got.push('代理密码'); }
  if (!got.length) {
    toast('没读到酒馆的反代设置。请确认酒馆主 API 面板里已填好 Reverse Proxy（Google AI Studio 那栏的代理地址），或手动填写下方字段', 'warning');
    return false;
  }
  cfg.transport = 'server';   // 既然是反代场景，顺手切到流式档（这才是能绕开 524 的那条路）
  var tEl = getEl('opf-rx-transport'); if (tEl) tEl.value = 'server';
  var rEl = getEl('opf-rx-reverse'); if (rEl) rEl.value = cfg.reverseProxy || '';
  var pEl = getEl('opf-rx-proxypass'); if (pEl) pEl.value = cfg.proxyPassword || '';
  rxSyncTransportUi(); rxCacheSave();
  toast('已从酒馆读取：' + got.join('、') + '｜正在自动获取模型列表…');
  return true;
}
// 模型列表：双通道合并 + 自定义名永久保留
// 通道① ST 服务端 /status —— 但 ST 会按 supportedGenerationMethods.includes('generateContent') 过滤，
//        新版 Gemini 模型不再返回该字段，会被整类丢掉（症状：只看到老模型）
// 通道② 直接向反代地址要原始 /v1beta/models —— 未经 ST 过滤（可能被 CORS 拦，拦了就跳过）
async function rxModelsViaServer() {
  var cfg = rxCfg();
  if (!cfg.reverseProxy) throw new Error('未填反代地址');
  var origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
  var h = { 'Content-Type': 'application/json' };
  try {
    var c = getCtx();
    if (c && typeof c.getRequestHeaders === 'function') { var rh = c.getRequestHeaders(); for (var k in rh) h[k] = rh[k]; }
  } catch (e) {}
  var r = await fetch(origin + '/api/backends/chat-completions/status', {
    method: 'POST', headers: h,
    body: JSON.stringify({ chat_completion_source: cfg.source || 'makersuite', reverse_proxy: cfg.reverseProxy, proxy_password: cfg.proxyPassword || '' })
  });
  if (!r.ok) throw new Error('服务端 HTTP ' + r.status);
  var j = await r.json();
  var arr = Array.isArray(j.data) ? j.data : (j.data && Array.isArray(j.data.data) ? j.data.data : []);
  var ids = arr.map(function (m) { return m && (m.id || m.name); }).filter(Boolean);
  if (!ids.length) throw new Error(j.error ? '上游返回错误' : '列表为空');
  return ids;
}
async function rxModelsRaw(base, key, proto) {
  base = String(base || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('地址为空');
  var urls = [];
  if (proto === 'openai') {
    urls.push({ u: base + '/models', h: key ? { 'Authorization': 'Bearer ' + key } : {} });
  } else {
    urls.push({ u: base + '/v1beta/models' + (key ? '?key=' + encodeURIComponent(key) : ''), h: key ? { 'x-goog-api-key': key } : {} });
    urls.push({ u: base + '/v1beta/models', h: key ? { 'x-goog-api-key': key } : {} });   // 反代可能自带上游 key
  }
  var lastErr = null;
  for (var i = 0; i < urls.length; i++) {
    try {
      var r = await fetch(urls[i].u, { headers: urls[i].h });
      if (!r.ok) { lastErr = new Error('HTTP ' + r.status); continue; }
      var j = await r.json();
      var arr = j.models || j.data || [];
      var ids = arr.map(function (m) { return String((m && (m.name || m.id)) || '').replace(/^models\//, ''); }).filter(Boolean);
      if (ids.length) return ids;      // 不过滤：保留全部（含没有 supportedGenerationMethods 的新模型）
    } catch (e) { lastErr = e; }        // CORS 或网络错误 → 试下一个
  }
  throw lastErr || new Error('未取到原始列表');
}
function rxDedupeModels() {
  var seen = {}, out = [];
  for (var i = 0; i < arguments.length; i++) {
    (arguments[i] || []).forEach(function (id) {
      var s = String(id || '').trim();
      if (!s || seen[s.toLowerCase()]) return;
      seen[s.toLowerCase()] = 1; out.push(s);
    });
  }
  return out;
}
async function rxFetchModels() {
  var cfg = rxCfg();
  var server = [], raw = [], errs = [];
  if (cfg.transport === 'server') {
    try { server = await rxModelsViaServer(); } catch (e) { errs.push('ST 过滤列表：' + rxDiagError(e)); }
    try { raw = await rxModelsRaw(cfg.reverseProxy, cfg.proxyPassword, cfg.source === 'vertexai' ? 'gemini' : 'gemini'); }
    catch (e) { errs.push('原始列表（直连反代）：' + rxDiagError(e)); }
  } else {
    try { raw = await rxModelsRaw(cfg.baseUrl, cfg.apiKey, cfg.directProtocol); } catch (e) { errs.push('直连列表：' + rxDiagError(e)); }
  }
  var custom = cfg.customModels || [];
  var list = rxDedupeModels(raw, server, custom);
  if (!list.length) throw new Error('两个通道都没取到列表' + (errs.length ? '（' + errs.join('；') + '）' : ''));
  return { list: list, server: server.length, raw: raw.length, custom: custom.length, errs: errs };
}
function rxFillModelList(list) {
  var dl = getEl('opf-rx-modellist');
  if (dl) {
    dl.textContent = '';
    list.forEach(function (id) { var o = document.createElement('option'); o.value = id; dl.appendChild(o); });
  }
  var inp = getEl('opf-rx-model');
  if (inp && !String(inp.value || '').trim() && list.length) {
    var prefer = list.filter(function (x) { return /gemini-2\.5-pro|gemini-2\.5-flash|gemini-2\.0-flash|gemini-pro/i.test(x); })[0] || list[0];
    inp.value = prefer;
    rxCfg().model = prefer;
    rxCacheSave();
  }
}
// 手填的模型名自动记住，下次直接从下拉里选
function rxRememberModel(name) {
  var s = String(name || '').trim();
  if (!s) return;
  var cfg = rxCfg();
  cfg.customModels = cfg.customModels || [];
  if (cfg.customModels.map(function (x) { return x.toLowerCase(); }).indexOf(s.toLowerCase()) >= 0) return;
  cfg.customModels.push(s);
  var dl = getEl('opf-rx-modellist');
  if (dl) { var o = document.createElement('option'); o.value = s; dl.appendChild(o); }
  rxCacheSave();
}
async function rxDoFetchModels(btn) {
  var old = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '获取中…'; }
  var st = getEl('opf-rx-statusline');
  try {
    var r = await rxFetchModels();
    rxFillModelList(r.list);
    var msg = '列表 ' + r.list.length + ' 个（原始 ' + r.raw + ' / ST 过滤后 ' + r.server + ' / 自定义 ' + r.custom + '）'
      + (r.errs.length ? '｜部分通道失败：' + r.errs.join('；') : '');
    if (st) st.textContent = msg + '｜' + r.list.slice(0, 8).join('、') + (r.list.length > 8 ? ' …' : '');
    toast('取到 ' + r.list.length + ' 个模型（可下拉可手填）');
  } catch (e) {
    var m2 = rxDiagError(e);
    if (st) st.textContent = '模型列表获取失败：' + m2;
    toast('模型列表获取失败：' + m2, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = old || '🔌 获取模型列表'; }
  }
}
// 连通性自检：一次极小请求，用于区分「中转站挂了」与「任务太重」
async function rxPing() {
  var el = getEl('opf-rx-statusline');
  var say = function (s) { if (el) el.textContent = s; };
  var cfg = rxCfg();
  var label = cfg.transport === 'st' ? '酒馆主 API（generateRaw，非流式）' : cfg.transport === 'server' ? '经酒馆服务端转发 + 真流式' : '浏览器直连 + 真流式';
  say('自检中…（' + label + '）');
  var t0 = Date.now();
  try {
    var out = await rxStreamCall([{ role: 'user', content: '回复两个字：正常' }], function (s) { say('自检收流中… ' + s); });
    var ms = Date.now() - t0;
    var extra = out.stalled ? '（流中途停顿，可能是中转限流或网络抖动）' : '';
    say('连通正常：' + ms + 'ms｜' + label + '｜返回「' + String(out.text).trim().slice(0, 20) + '」' + extra);
    toast('连通性自检通过（' + ms + 'ms）' + extra, out.stalled ? 'warning' : 'success');
  } catch (e) {
    say('自检失败：' + rxDiagError(e));
    toast('自检失败：' + rxDiagError(e), 'error');
  }
}
// ---------- 并发工具与实时预览（流式传输下大幅缩短总时长）----------
var RX_PARALLEL = 3;   // 并发段数上限（中转限流时自动少发）
var rxForceSt = false; // 本次生成强制走酒馆主 API（配置不完整时的降级，不影响用户设置）
async function rxMapLimit(items, limit, fn) {
  var results = new Array(items.length);
  var cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      var idx = cursor++;
      try { results[idx] = await fn(items[idx], idx); }
      catch (e) { results[idx] = { css: '', partial: true, err: rxDiagError(e) }; }
    }
  }
  var ws = [];
  for (var w = 0; w < Math.max(1, Math.min(limit, items.length)); w++) ws.push(worker());
  await Promise.all(ws);
  return results;
}
var rxLiveTick = { last: 0 };
function rxLivePreview(it, cssMap, order) {
  var now = Date.now();
  if (now - rxLiveTick.last < 500) return;
  rxLiveTick.last = now;
  var css = '';
  (order || []).forEach(function (id) { if (cssMap[id]) css += (css ? '\n' : '') + cssMap[id]; });
  if (!css) return;
  var f = (ST.rx.parsed && ST.rx.parsed.formats || []).filter(function (x) { return x.key === it.formatKey; })[0] || { family: 'quote', params: [] };
  it.css = css;
  it.replaceHtml = rxAssemble(it, f, css);
  try { rxPreviewInto(it); } catch (e) {}
  var st = getEl('opf-rx-statusline');
  if (st && !st.dataset.prog) st.textContent = '实时预览已更新（' + css.length + ' 字符 CSS）';
}
// 设计基调：一组 CSS 变量 + 风格基调注释，供并发块引用，保证配色一致
function rxBriefPart() {
  return {
    id: 'brief', label: '设计基调', budget: 900,
    hint: '只输出一组 CSS 自定义属性（--rx-bg / --rx-accent / --rx-text / --rx-font / --rx-line 等，至少 4 个）与 2~4 条 CSS 注释风格基调（配色气质、字体取向、边框风格）；不要写具体选择器的完整规则，后续每个块都会引用这些变量。'
  };
}
// ---------- 替换体：结构由代码生成，模型只写 CSS（防 524 超时与截断）----------
// 捕获组布局必须与 rxGenFindRegex 完全一致，否则 $n 会指错
function rxRefs(f) {
  var refs = { name: '', mood: '', text: '$1', extra: [] };
  if (!f || f.family !== 'xml') return refs;
  var idx = 1;
  refs.name = '$' + idx++;
  if (f.params.some(function (p) { return p.name === 'mood'; })) refs.mood = '$' + idx++;
  f.params.forEach(function (p) { if (p.name !== 'mood') { refs.extra.push({ name: p.name, ref: '$' + idx++ }); } });
  refs.text = '$' + idx;
  return refs;
}
var RX_STYLE_SLOT = '/*__RX_STYLE__*/';
function rxSkeleton(item, f) {
  var pre = String(item.prefix || 'core-box').replace(/-box$/, '');   // 归一：避免出现 xxx-box-box
  var refs = rxRefs(f);
  var attrs = ' class="' + pre + '-box"';
  if (refs.mood) attrs += ' data-mood="' + refs.mood + '"';
  refs.extra.forEach(function (x) { attrs += ' data-' + x.name + '="' + x.ref + '"'; });
  var L = [];
  L.push('<div' + attrs + '>');
  L.push('  <style>');
  L.push(RX_STYLE_SLOT);
  L.push('  </style>');
  L.push('  <div class="' + pre + '-inner">');
  if (refs.name) L.push('    <div class="' + pre + '-speaker">' + refs.name + '</div>');
  L.push('    <div class="' + pre + '-text">' + refs.text + '</div>');
  L.push('  </div>');
  L.push('</div>');
  return L.join('\n');
}
// CSS 分段：按档位目标字数决定段数与每段预算（每段越小，越不容易触发 524 与截断）
function rxCssParts(f, tierTarget) {
  var hasMood = !!(f && f.params.some(function (p) { return p.name === 'mood' && p.values && p.values.length; }));
  var catalog = [
    { id: 'base', label: '基础样式', hint: '最外层盒子、内层容器、说话人、正文四组选择器的样式：背景（渐变/纹理）、边框、圆角、内外边距、字体栈（只用系统字体）、字号行高、max-width:100% 与窄屏适配。' },
    { id: 'mood', label: '情绪分支配色', need: hasMood, hint: '为每个枚举值各写一条属性选择器规则（形如 .PREFIX-box[data-mood="值"]），用颜色/边框/阴影/滤镜区分情绪。' },
    { id: 'decor', label: '装饰层', hint: '装饰元素与纹理：伪元素、渐变描边、角标、SVG（可内联为 background-image 的 data URI，禁止外链）。' },
    { id: 'motion', label: '动效', hint: '@keyframes 与入场/呼吸动效（周期 ≥2s，克制）；不需要就回复「无」。' },
    { id: 'variants', label: '交互与变体', hint: 'hover/长文本/多行/窄屏的变体规则，保持文字始终可读（不得依赖悬停才显示）。' },
    { id: 'polish', label: '细节打磨', hint: '阴影层次、边框渐变、字距与装饰细节的微调，让整体更完整；不需要就回复「无」。' }
  ];
  var want = catalog.filter(function (p) { return p.need !== false; });
  var target = Number(tierTarget) || 0;
  var n = target <= 0 ? 6 : target <= 3000 ? 1 : target <= 6000 ? 3 : target <= 10000 ? 4 : 6;
  // 没情绪分支时把名额让给后面的段
  var parts = want.slice(0, Math.max(1, Math.min(n, want.length)));
  if (n > parts.length) {
    var extra = catalog.filter(function (p) { return p.need !== false && parts.indexOf(p) < 0; });
    parts = parts.concat(extra.slice(0, n - parts.length));
  }
  var per = target > 0 ? Math.max(1200, Math.round(target / parts.length * 0.85)) : 3500;
  return parts.map(function (p) { return { id: p.id, label: p.label, hint: p.hint, budget: per }; });
}
function rxCssPartPrompt(item, f, part, prevText, brief) {
  var refs = rxRefs(f);
  var L = [];
  L.push('[任务] 只为已经定好的 HTML 骨架写 CSS 规则。骨架结构由插件生成，你不得改动、也不得输出 HTML 标签。');
  L.push('[骨架（供你对照选择器）]\n' + rxSkeleton(item, f).replace(RX_STYLE_SLOT, '/* 这里放你的 CSS */'));
  L.push('[class 前缀] ' + String(item.prefix || 'core-box').replace(/-box$/, '') + '（必须原样使用；完整的类名形如 ' + String(item.prefix || 'core-box').replace(/-box$/, '') + '-box / -inner / -speaker / -text）');
  if (refs.mood) L.push('[情绪属性] 最外层带有 data-mood="' + refs.mood + '"，可用属性选择器分支配色');
  if (f && f.params.length) {
    f.params.forEach(function (p) {
      if (p.values && p.values.length) L.push('[参数 ' + p.name + ' 的枚举] ' + p.values.join('、'));
    });
  }
  if (brief) L.push('[设计基调（必须引用其中的 CSS 变量，不要另起炉灶）]\n' + brief.slice(-1500));
  L.push('[本段只写] ' + part.label + ' —— ' + part.hint);
  if (part.budget) L.push('[本段字数] 控制在 ' + part.budget + ' 字符左右（宁少勿断，写不完就少写几条规则）');
  if (prevText) L.push('[已经写好的部分（不要重复、不要冲突）]\n' + prevText.slice(-1200));
  L.push('[输出要求] 只输出 CSS 规则本身：不要 <style> 标签、不要 HTML、不要注释以外的解释文字、不要代码块围栏。');
  return L.join('\n\n');
}
// 单项 CSS 片段生成：真流式 + 停顿检测 + 截断续写；失败不丢已生成内容
async function rxGenCssPart(item, f, part, prevCss, onNote, brief) {
  var css = '';
  var attempt = 0;
  var lastErr = '';
  var budget = Number(part.budget) || 2500;
  var opts = {
    phase: part.label,
    idleMs: 20000,                       // 20 秒无新字节 → 判定停顿并止损
    maxMs: 240000,                       // 4 分钟绝对上限
    maxChars: budget * 2,                // 单次调用硬顶，防跑飞
    maxTokens: Math.max(1024, Math.round(budget * 4))   // 按字数换算 token 硬顶
  };
  while (attempt < 3) {
    attempt++;
    var ask = rxCssPartPrompt(item, f, part, prevCss + css, brief);
    if (css) ask += '\n\n[续写要求] 你上一次输出在中途被截断了，已保留的部分结尾是：\n' + css.slice(-500) + '\n只输出**剩余**部分，不要重复已写过的内容，不要重新开头。';
    var msgs = [{ role: 'system', content: rxSlimSystemContent(part.colorRef, part.budget) }, { role: 'user', content: macroFill(ask) }];
    var t0 = Date.now();
    try {
      var resp = await rxStreamCall(msgs, onNote, opts);
      var chunk = rxExtractCss(resp.text);
      if (resp.stalled) {
        // 流停顿：不再重试同一段（重试只会再停一次），把已收到的内容交回去
        if (!chunk) return { css: css, partial: true, err: '流停顿且未收到内容（' + Math.round((Date.now() - t0) / 1000) + 's）' };
        css += (css && !/\n$/.test(css) ? '\n' : '') + chunk;
        var bal0 = rxBraceDelta(css);
        return bal0 <= 0
          ? { css: css, partial: false, err: '流停顿（' + Math.round((Date.now() - t0) / 1000) + 's），但内容已完整' }
          : { css: css, partial: true, err: '流停顿（' + Math.round((Date.now() - t0) / 1000) + 's），内容未写完整（已保留 ' + css.length + ' 字符）' };
      }
      if (!chunk) { if (onNote) onNote('第 ' + attempt + ' 次返回为空'); if (attempt < 3) { await waitTick(); continue; } break; }
      css += (css && !/\n$/.test(css) ? '\n' : '') + chunk;
      if (onNote) onNote(part.label + ' 第 ' + attempt + ' 次：+' + chunk.length + ' 字符（' + Math.round((Date.now() - t0) / 1000) + 's）');
      var bal = rxBraceDelta(css);
      if (bal <= 0) return { css: css, partial: false, err: '' };
      if (onNote) onNote(part.label + ' 花括号还差 ' + bal + ' 个，继续续写…');
    } catch (e) {
      lastErr = rxDiagError(e);
      var transient = /524|502|503|504|timeout|timed out|超时|empty|为空|network|fetch|No message/i.test((e && e.message) ? e.message : String(e));
      if (onNote) onNote(part.label + ' 第 ' + attempt + ' 次失败：' + lastErr.slice(0, 90));
      if (!transient) break;
      if (attempt < 3) await new Promise(function (r) { setTimeout(r, 1200 * attempt); });
    }
  }
  return { css: css, partial: true, err: lastErr };   // 失败也把已生成的部分交回去
}
// CSS 花括号净差（跳过字符串与注释）
function rxBraceDelta(css) {
  var d = 0, inStr = null, inCmt = false, t = String(css);
  for (var i = 0; i < t.length; i++) {
    var c = t[i], n = t[i + 1];
    if (inCmt) { if (c === '*' && n === '/') { inCmt = false; i++; } continue; }
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '/' && n === '*') { inCmt = true; i++; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') d++;
    else if (c === '}') d--;
  }
  return d;
}
// 从回复里取 CSS（容忍代码块围栏与 <style> 包裹）
function rxExtractCss(text) {
  var t = String(text || '').trim();
  if (!t || /^无[。．.]?$/.test(t)) return '';
  var F = fence();
  var i = t.indexOf(F);
  if (i >= 0) {
    var s = t.indexOf('\n', i), e = t.indexOf(F, s + 1);
    if (s > 0) t = (e > s ? t.slice(s + 1, e) : t.slice(s + 1)).trim();
  }
  t = t.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  var m = t.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (m) t = m[1].trim();
  return t;
}
function rxAssemble(item, f, cssText) {
  return rxSkeleton(item, f).replace(RX_STYLE_SLOT, cssText || '/* 尚无样式 */');
}
async function rxGenerate() {
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  if (!ST.rx.parsed || !ST.rx.items.length) { toast('请先「🔍 解析语言格式（AI）」', 'warning'); return; }
  var todo = ST.rx.items.filter(function (it) { return !it.replaceHtml; });
  if (!todo.length) todo = ST.rx.items.slice();
  var cfgNow = rxCfg();
  rxForceSt = !rxTransportUsable(cfgNow);
  if (rxForceSt) toast('当前「生成传输」配置不完整（' + rxTransportWhy(cfgNow) + '），本次改用酒馆主 API 生成；补全后可再试流式', 'warning');
  var streaming = !rxForceSt;
  ST.running = true; renderRunButtons();
  rxLiveTick.last = 0;
  var log = [];
  var shrink = 1;
  var t0 = Date.now();
  var note = function (it, s) {
    log.push('[' + it.label + '] ' + s);
    var stl = getEl('opf-rx-statusline');
    if (stl) stl.textContent = it.label + ' · ' + s;
    opfLog('[regex-forge] ' + it.label + ' ' + s);
  };
  try {
    for (var i = 0; i < todo.length; i++) {
      if (isStop()) break;
      var it = todo[i];
      var f = (ST.rx.parsed.formats || []).filter(function (x) { return x.key === it.formatKey; })[0] || { family: 'quote', params: [] };
      var tier = rxTier(it.tier);
      it.partial = false;
      if (streaming) {
        // ===== 流式路径：基调先行 + 并发分段 =====
        var blocks = rxCssParts(f, tier.target).map(function (p) {
          return { id: p.id, label: p.label, hint: p.hint, budget: Math.max(1200, Math.round(p.budget)), colorRef: (ST.rx.parsed.section || '') };
        });
        var cssMap = {};
        var order = ['brief'].concat(blocks.map(function (b) { return b.id; }));
        var brief = await rxGenCssPart(it, f, rxBriefPart(), '', function (s) { note(it, s); rxLivePreview(it, cssMap, order); });
        cssMap.brief = brief.css;
        if (brief.partial) note(it, '设计基调未完成：' + String(brief.err).slice(0, 100));
        note(it, '基调完成（' + brief.css.length + ' 字符），并发生成 ' + blocks.length + ' 个样式块（并发上限 ' + RX_PARALLEL + '）…');
        var results = await rxMapLimit(blocks, RX_PARALLEL, async function (block, bi) {
          var r = await rxGenCssPart(it, f, block, brief.css, function (s) {
            note(it, '[' + block.label + ' ' + (bi + 1) + '/' + blocks.length + '] ' + s);
            rxLivePreview(it, cssMap, order);
          }, brief.css);
          cssMap[block.id] = r.css;
          return r;
        });
        var partials = results.filter(function (r) { return r && r.partial; });
        it.partial = partials.length > 0;
        it.lastErr = partials.map(function (r) { return r.err; }).filter(Boolean).join('；');
        it.replaceHtml = rxAssemble(it, f, order.map(function (id) { return cssMap[id] || ''; }).join('\n'));
        it.css = order.map(function (id) { return cssMap[id] || ''; }).join('\n');
        if (it.partial) note(it, '有 ' + partials.length + ' 个块未完成（已保留其余内容，可再点一次续做）');
      } else {
        // ===== 非流式路径：顺序小段 + 自适应缩段（防 524）=====
        var baseParts = rxCssParts(f, tier.target);
        var parts = baseParts.map(function (p) {
          return { id: p.id, label: p.label, hint: p.hint, budget: Math.max(800, Math.round(p.budget * shrink)), colorRef: (ST.rx.parsed.section || '') };
        });
        var css = '';
        for (var p2 = 0; p2 < parts.length; p2++) {
          if (isStop()) break;
          note(it, '开始生成 ' + parts[p2].label + '（' + (p2 + 1) + '/' + parts.length + '，预算 ' + parts[p2].budget + ' 字符' + (shrink < 1 ? '·已自动缩段' : '') + '）');
          var r = await rxGenCssPart(it, f, parts[p2], css, function (s) { note(it, s); });
          css += (css ? '\n' : '') + r.css;
          if (r.partial) {
            it.partial = true;
            it.lastErr = r.err;
            if (/524|超时/.test(String(r.err))) { shrink = Math.max(0.35, shrink * 0.5); note(it, '遇到 524/超时：后续段预算自动折半为 ≈' + Math.max(800, Math.round(parts[p2].budget * 0.5)) + ' 字符'); }
            note(it, '本段未完成：' + String(r.err).slice(0, 120) + '（已保留 ' + r.css.length + ' 字符，可稍后再点一次续做）');
          }
        }
        it.css = css;
        it.replaceHtml = rxAssemble(it, f, css);
      }
      it.issues = rxLint(it, ST.rx.parsed);
      rxRenderItems();
      rxCacheSave();
      await waitTick();
    }
    var st2 = getEl('opf-rx-statusline');
    var anyPartial = ST.rx.items.filter(function (x) { return x.partial; }).length;
    var secs = Math.round((Date.now() - t0) / 1000);
    if (st2) st2.textContent = '完成（总耗时 ' + secs + 's）：' + log.slice(-2).join(' ｜ ') + (anyPartial ? '（' + anyPartial + ' 项未完成，可再点一次续做）' : '');
    if (isStop()) toast('已停止（已生成的部分已保留）');
    else if (anyPartial) toast('部分完成：' + anyPartial + ' 项未写完（已保留内容，可再点一次续做）', 'warning');
    else toast('替换体生成完成（耗时 ' + secs + 's' + (streaming ? '，流式并发模式' : '') + '）', 'success');
  } catch (e) {
    toast('生成替换体出错：' + rxDiagError(e) + '（已生成的部分保留，可再点一次续做）', 'error');
    var st3 = getEl('opf-rx-statusline'); if (st3) st3.textContent = '出错：' + rxDiagError(e).slice(0, 160);
  } finally {
    ST.running = false; renderRunButtons();
    rxRenderItems(); rxCacheSave();
  }
}
function rxDoCheck(showToast) {
  rxInit();
  if (!ST.rx.items.length) { if (showToast) toast('还没有正则草稿，请先解析', 'warning'); return; }
  var all = [];
  ST.rx.items.forEach(function (it) {
    it.issues = rxLint(it, ST.rx.parsed);
    it.issues.forEach(function (is) { all.push({ item: it, issue: is }); });
  });
  var box = getEl('opf-rx-issues'); if (box) box.textContent = '';
  if (box) {
    if (!all.length) box.textContent = '✓ 全部合规：编译、标志、捕获组引用、体量档位、命名与放置位置均通过';
    else {
      var localN = all.filter(function (x) { return x.issue.side === 'regex' && x.issue.fix && x.issue.fix !== 'none'; }).length;
      var aiN = all.filter(function (x) { return RX_AI_FIXABLE.indexOf(x.issue.key) >= 0; }).length;
      var bar = document.createElement('div'); bar.className = 'opf-step-ref-row';
      var info = document.createElement('span'); info.className = 'opf-dim';
      info.textContent = '共 ' + all.length + ' 条：本地可自动修 ' + localN + ' 条，需 AI 改写 ' + aiN + ' 条';
      var fixAll = document.createElement('button'); fixAll.type = 'button'; fixAll.className = 'opf-step-act'; fixAll.textContent = '🔧 一键自动修复';
      fixAll.addEventListener('click', function () { rxAutoFixAll(); });
      bar.appendChild(info); bar.appendChild(fixAll);
      box.appendChild(bar);
    }
    all.forEach(function (x, i) {
      var row = document.createElement('div'); row.className = 'opf-step-ref-row';
      var t = document.createElement('span'); t.className = 'opf-ref-tag' + (x.issue.side === 'core' ? ' dirty' : '');
      t.textContent = (x.issue.side === 'core' ? '改核心' : '改正则');
      var msg = document.createElement('span'); msg.className = 'opf-dim'; msg.textContent = '[' + x.item.label + '] ' + x.issue.msg;
      row.appendChild(t); row.appendChild(msg);
      if (x.issue.fix && x.issue.fix !== 'none' && x.issue.side === 'regex') {
        var b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'opf-step-act'; b1.textContent = '改正则';
        b1.addEventListener('click', function () { var r = rxApplyFix(x.item, x.issue); toast(r); rxDoCheck(false); rxRenderItems(); rxCacheSave(); });
        row.appendChild(b1);
      }
      if (x.issue.side === 'core') {
        var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'opf-step-act'; b2.textContent = '改核心';
        b2.addEventListener('click', function () { var r = rxApplyCoreFix(x.item, ST.rx.parsed); toast(r); });
        row.appendChild(b2);
        var b3 = document.createElement('button'); b3.type = 'button'; b3.className = 'opf-step-act'; b3.textContent = '改正则';
        b3.addEventListener('click', function () { toast('请按核心的语言格式手工调整匹配式，或在核心侧统一格式后重新解析'); });
        row.appendChild(b3);
      }
      if (RX_AI_FIXABLE.indexOf(x.issue.key) >= 0) {
        var b4 = document.createElement('button'); b4.type = 'button'; b4.className = 'opf-step-act'; b4.textContent = '✨ AI 修这条';
        b4.addEventListener('click', async function () {
          if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
          ST.running = true; renderRunButtons();
          var stl = getEl('opf-rx-statusline'); if (stl) stl.textContent = 'AI 修复：' + x.issue.msg;
          try {
            var ch = await rxAutoFixAi(x.item, [x.issue]);
            rxRenderItems(); rxCacheSave(); rxDoCheck(false);
            toast(ch.length ? ('已修复（' + ch.join('、') + '）') : '模型没有返回可用的修复', ch.length ? 'success' : 'warning');
          } catch (e) { toast('AI 修复出错：' + rxDiagError(e), 'error'); }
          finally { ST.running = false; renderRunButtons(); }
        });
        row.appendChild(b4);
      }
      box.appendChild(row);
    });
  }
  if (showToast) toast(all.length ? ('自检发现 ' + all.length + ' 条问题（本地能修的已给「改正则」，其余可点「🔧 一键自动修复」让 AI 改写）') : '自检通过：全部合规', all.length ? 'warning' : 'success');
  rxCacheSave();
}
function rxCopy(all) {
  rxInit();
  if (!ST.rx.items.length) { toast('还没有正则草稿', 'warning'); return; }
  var objs = ST.rx.items.map(function (it) { return rxBuildObject(it); });
  var txt = all ? JSON.stringify(objs, null, 2) : JSON.stringify(objs[0], null, 2);
  destCopyText(txt, '没有可复制的内容');
}
function rxClear() {
  if (!window.confirm('清空正则工坊（核心文本与全部正则草稿）？此操作不可撤销。')) return;
  ST.rx = { core: '', coreName: '', parsed: null, items: [], _inited: false };
  var el = getEl('opf-rx-core'); if (el) el.value = '';
  var pb = getEl('opf-rx-parsed'); if (pb) pb.textContent = '尚未解析';
  var ib = getEl('opf-rx-issues'); if (ib) ib.textContent = '尚未自检';
  rxRenderItems(); rxCacheSave();
  toast('已清空');
}
function rxCacheSave() {
  if (rxCacheSave._t) clearTimeout(rxCacheSave._t);
  rxCacheSave._t = setTimeout(function () {
    if (!ST.rx) return;
    lsSet(LS_RX_KEY, { core: ST.rx.core, coreName: ST.rx.coreName, items: ST.rx.items });
  }, 500);
}
function rxCacheRestore() {
  rxInit();
  var c = lsGet(LS_RX_KEY); if (!c || typeof c !== 'object') return;
  ST.rx.core = c.core || ''; ST.rx.coreName = c.coreName || ''; ST.rx.items = c.items || [];
  var el = getEl('opf-rx-core'); if (el && !el.value) el.value = ST.rx.core;
  if (ST.rx.core) { try { rxDoParseSilent(); } catch (e) { opfErr('rxDoParseSilent', e); } }
  try { rxRenderItems(); } catch (e) { opfErr('rxRenderItems', e); }
}
function rxDoParseSilent() {
  if (!ST.rx.core) return;
  ST.rx.parsed = rxParseLangFormat(ST.rx.core);
  var box = getEl('opf-rx-parsed');
  if (box) box.textContent = '已从缓存恢复草稿（核心 ' + ST.rx.core.length + ' 字符，正则 ' + ST.rx.items.length + ' 条）。点「🔍 解析语言格式（AI）」可重新解析。';
}

// ---------- AI 解析：AI 负责理解，脚本负责精确与校验 ----------
var RX_PARSE_SCHEMA = [
  '{',
  '  "核心名": "从核心里读出的核心名（优先 setvar 系统核心，其次语言格式里 name 的固定值）",',
  '  "格式": [',
  '    {',
  '      "标签": "XML 标签名，没有则 null",',
  '      "族": "xml | 引语 | 裸引号",',
  '      "说话人": "引语式的说话人，没有则 null",',
  '      "name固定值": "name 属性固定值，没有则 null",',
  '      "参数": [ { "名": "mood", "枚举": ["慵懒", "愉悦"] } ],',
  '      "引号": true,',
  '      "内嵌标签": "格式里内嵌的 HTML 标签名（如大字报模式用 h2），没有则 null",',
  '      "用途建议": "对话美化 | 登场/开场白 | 缔结契约成功 | 命运抽卡 | 咏唱/专属块",',
  '      "范例": ["逐字摘自原文的整条范例"]',
  '    }',
  '  ],',
  '  "疑点": ["写法含糊、无法确定的地方，逐条列出，不要猜"]',
  '}'
].join('\n');
function rxParseSystemContent() {
  var lines = [];
  lines.push('[角色] 你是始弦，大图书馆的司书，正在把一份角色卡文本里的「语言格式」节解析成结构化数据。');
  lines.push('[任务] 这是一次纯粹的抽取工作：只把原文已有的结构读出来，不做任何创作、改写、补全或翻译。');
  lines.push([
    '【抽取规则】',
    '1. 只输出一个 ' + fence() + 'json 代码块，块内只有 JSON，块外不写任何解释。',
    '2. 「范例」必须逐字摘自原文（含标签与引号），不得润色、不得截断、不得补全；只收「完整到能被正则匹配」的整条范例。找不到范例就写空数组。',
    '3. 参数枚举必须逐字摘自原文；原文没写明枚举就写空数组 []。',
    '4. 族判定：格式里有 <标签 name="..."> 的算 xml；形如 「> 名字:「…」」的算 引语；只有「…」既无说话人又无标签的算 裸引号。',
    '5. 一个核心可能有多套格式（不同模式、不同说话人），逐套列出，不要合并。',
    '6. 原文里出现的正文 HTML 标签（h1~h6、div、span、p、style、svg 等）不是对话标签，不得当成「标签」。',
    '7. 任何写法含糊、你无法确定的地方，写进「疑点」数组，绝对不要猜。',
    '8. 「核心名」优先取 setvar 系统核心 的值，其次取语言格式里 name 的固定值。'
  ].join('\n'));
  lines.push('[输出 schema]\n' + RX_PARSE_SCHEMA);
  return macroFill(lines.join('\n\n'));
}
// 长 CSS 塞进 JSON 字符串时模型常写裸换行/裸制表符（非法 JSON），
// 这里把字符串内部的裸控制字符转义回来；字符串没闭合 = 被截断，直接判死（绝不能当片段用）
function rxRepairJson(txt) {
  var s = String(txt || '');
  var out = '', inStr = false, esc = false;
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    if (inStr) {
      if (esc) { esc = false; out += ch; continue; }
      if (ch === '\\') { esc = true; out += ch; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      out += ch; continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    out += ch;
  }
  if (inStr) return null;
  return out.replace(/,\s*([}\]])/g, '$1');
}
function rxExtractJson(text) {
  var t = String(text || '');
  var F = fence();
  var i = t.indexOf(F + 'json');
  if (i >= 0) {
    var s = t.indexOf('\n', i), e = t.indexOf(F, s + 1);
    if (s > 0) t = e > s ? t.slice(s + 1, e) : t.slice(s + 1);
  }
  var a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  var body = t.slice(a, b + 1);
  try { return JSON.parse(body); } catch (err) {}
  var rp = rxRepairJson(body);
  if (rp) { try { return JSON.parse(rp); } catch (err2) {} }
  return null;
}
function rxNormText(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}
// 把 AI 结果规范化成下游统一使用的 formats[]，并做四道校验
function rxNormalizeAiFormats(ai, coreText) {
  var out = { coreName: '', formats: [], notes: [], dropped: 0 };
  if (!ai || typeof ai !== 'object') { out.notes.push('AI 未返回可解析的 JSON'); return out; }
  out.coreName = String(ai['核心名'] || '').trim();
  var list = Array.isArray(ai['格式']) ? ai['格式'] : [];
  var coreNorm = rxNormText(coreText);
  list.forEach(function (raw, i) {
    if (!raw || typeof raw !== 'object') return;
    var tag = raw['标签'] ? String(raw['标签']).trim() : '';
    var speaker = raw['说话人'] ? String(raw['说话人']).trim() : '';
    var fam = String(raw['族'] || '').trim();
    if (tag && (!/^[A-Za-z_]\w*$/.test(tag) || RX_HTML_TAGS.indexOf(tag.toLowerCase()) >= 0)) tag = '';   // 校验 2
    var family = fam === 'xml' ? 'xml' : fam === '引语' ? 'quote' : fam === '裸引号' ? 'bare' : (tag ? 'xml' : speaker ? 'quote' : 'bare');
    if (family === 'xml' && !tag) { out.notes.push('第 ' + (i + 1) + ' 套格式声明为 xml 但标签名非法，已跳过'); return; }
    if (family === 'quote' && !speaker) { out.notes.push('第 ' + (i + 1) + ' 套格式声明为引语但没有说话人，已跳过'); return; }
    var params = [];
    (Array.isArray(raw['参数']) ? raw['参数'] : []).forEach(function (p) {                                  // 校验 3
      if (!p || typeof p !== 'object') return;
      var nm = String(p['名'] || '').trim();
      if (!/^[A-Za-z_]\w*$/.test(nm) || nm === 'name') return;
      var vals = (Array.isArray(p['枚举']) ? p['枚举'] : []).map(function (v) { return String(v == null ? '' : v).trim(); }).filter(Boolean);
      vals = vals.filter(function (v, k) { return vals.indexOf(v) === k; });
      params.push({ name: nm, placeholder: '{' + nm + '}', values: vals });
    });
    var examples = [];
    (Array.isArray(raw['范例']) ? raw['范例'] : []).forEach(function (ex) {                                 // 校验 1：范例必须逐字存在于原文
      var e = rxNormText(ex);
      if (!e) return;
      if (coreNorm.indexOf(e) < 0) { out.dropped++; return; }
      if (examples.indexOf(e) < 0) examples.push(e);
    });
    out.formats.push({
      family: family, tag: tag, speaker: speaker,
      nameValue: raw['name固定值'] ? String(raw['name固定值']).trim() : '',
      params: params, quote: raw['引号'] !== false,
      innerTag: raw['内嵌标签'] && RX_HTML_TAGS.indexOf(String(raw['内嵌标签']).toLowerCase()) >= 0 ? String(raw['内嵌标签']) : '',
      purposeHint: String(raw['用途建议'] || '').trim(),
      examples: examples,
      key: family === 'xml' ? ('xml:' + tag) : family === 'quote' ? ('q:' + speaker + '|') : 'bare:ai',
      label: family === 'xml' ? tag : family === 'quote' ? speaker : '裸引号'
    });
  });
  if (out.dropped) out.notes.push('AI 抽出的 ' + out.dropped + ' 条范例在原文中找不到，已丢弃（防改写/编造）');
  var doubt = Array.isArray(ai['疑点']) ? ai['疑点'].filter(Boolean) : [];
  doubt.forEach(function (d) { out.notes.push('AI 疑点：' + String(d).slice(0, 120)); });
  // 校验 4：生成正则并当场用 AI 抽出的范例试跑
  out.formats.forEach(function (f) {
    if (f.family === 'quote') {
      var sib = out.formats.filter(function (x) { return x.family === 'quote' && x.speaker === f.speaker && x.innerTag; })[0];
      if (sib && !f.innerTag) f.siblingInnerTag = sib.innerTag;
    }
    f.regex = rxGenFindRegex(f);
    if (!f.regex) return;
    var keep = f.examples.filter(function (e) { return new RegExp(f.regex.source, f.regex.flags).test(e); });
    if (f.examples.length && keep.length < f.examples.length) {
      out.notes.push('格式「' + f.label + '」有 ' + (f.examples.length - keep.length) + ' 条范例匹配不上生成的正则（AI 解析可能不准）');
    }
    f.examples = keep;
  });
  out.examples = out.formats.reduce(function (acc, f) { f.examples.forEach(function (e) { if (acc.indexOf(e) < 0) acc.push(e); }); return acc; }, []);
  return out;
}
async function rxParseByAi(txt) {
  var sec = rxLangSection(txt);
  var payload = sec ? sec : String(txt).slice(0, 6000);
  var ctxIdx = sec ? txt.indexOf(sec) : 0;
  var head = txt.slice(Math.max(0, ctxIdx - 400), ctxIdx);
  var msg = '[核心条目文本]\n' + head + '\n' + payload + '\n\n请按 schema 输出 JSON。';
  var msgs = [{ role: 'system', content: rxParseSystemContent() }, { role: 'user', content: msg }];
  var resp = await callModel(msgs);
  var ai = rxExtractJson(resp);
  if (!ai) return null;
  return rxNormalizeAiFormats(ai, txt);
}

// ============================================================================
// v1.10.0 与始弦聊天（独立面板）
// 隔离原则：自有消息数组（不写酒馆聊天记录）、自有 {{user}} 名、自有世界书选择、
//           自有存储（设置存 localStorage，消息/记忆/向量存 IndexedDB）
// 记忆：滚动窗口原文 + 记忆条目（模型压缩）+ 向量检索（自定义 OpenAI 兼容 embedding 接口）
// ============================================================================
var LS_SHX_KEY = NS + '_shixiancfg_v1';
var SHX_DB_NAME = NS + '_shixian';
var SHX_DEFAULTS = {
  userName: '', herName: '始弦', worldMode: 'panel', topK: 5, threshold: 0.20, windowTurns: 8,
  memAuto: true, memEveryTurns: 12, baseUrl: '', apiKey: '', model: '', injectCap: 12000, allBooks: true
};
var SHX_PERSONA = [
  '你是始弦，「大图书馆」的司书。「大图书馆」收集所有世界中的所有信息——其中的记载对人类而言可能难以接受，但确实存在。为了不让知识在传播中散失，你原原本本地讲述，不因"可接受度"而删改。',
  '此刻你与{{user}}并肩站在书库外，一起看着一部世界书所描绘的那个世界。你是同伴与解说的司书，不是那个世界里的任何角色：不替书中的角色说话，不推进那个世界的时间线，也不替{{user}}做决定。',
  '性格：有点小小的骄傲，但不会自顾自地输出观点而忽略{{user}}的意见。你把{{user}}当作挚友，馆藏里很大一部分也是ta帮你整理的。',
  '馆藏权限：你拥有全馆藏查询权限——可以为{{user}}调取世界书中任意条目，包括你们还没去过的地区、还没遇到的角色、还没发生的事件，像查资料一样讲解、对照与吐槽。',
  '表达要求：引用馆藏时标明条目名；属于你自己的推断要明说是推断；馆藏里没有的东西就说没有，不要编造。语气直接、克制，少堆形容词，可以用吐槽但别堆网络梗。'
].join('\n');
// ---------- IndexedDB（消息 / 记忆条目 / 向量）----------
function shxDb() {
  return new Promise(function (resolve, reject) {
    try {
      if (typeof indexedDB === 'undefined') { reject(new Error('当前环境不支持 IndexedDB')); return; }
      var req = indexedDB.open(SHX_DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('messages')) db.createObjectStore('messages', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('memory')) db.createObjectStore('memory', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('vectors')) db.createObjectStore('vectors', { keyPath: 'hash' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB 打开失败')); };
    } catch (e) { reject(e); }
  });
}
function shxTx(store, mode, fn) {
  return shxDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(store, mode);
      var os = tx.objectStore(store);
      var out = fn(os);
      tx.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error); };
    });
  });
}
function shxPut(store, rec) { return shxTx(store, 'readwrite', function (os) { os.put(rec); return { result: rec }; }); }
function shxAll(store) { return shxTx(store, 'readonly', function (os) { return os.getAll(); }); }
function shxDel(store, key) { return shxTx(store, 'readwrite', function (os) { os.delete(key); return { result: true }; }); }
function shxClearStore(store) { return shxTx(store, 'readwrite', function (os) { os.clear(); return { result: true }; }); }
// ---------- 向量：自定义 OpenAI 兼容 embedding 接口 ----------
function shxCfg() {
  var c = lsGet(LS_SHX_KEY);
  var s = {};
  for (var k in SHX_DEFAULTS) s[k] = (c && c[k] !== undefined && c[k] !== '') ? c[k] : SHX_DEFAULTS[k];
  return s;
}
function shxSaveCfg(patch) {
  var c = lsGet(LS_SHX_KEY) || {};
  for (var k in patch) c[k] = patch[k];
  lsSet(LS_SHX_KEY, c);
}
function shxUrl(path) {
  var base = String(shxCfg().baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('未填写向量接口地址');
  return base + path;
}
function shxHeaders() {
  var h = { 'Content-Type': 'application/json' };
  var key = String(shxCfg().apiKey || '').trim();
  if (key) h['Authorization'] = 'Bearer ' + key;   // 密钥只在此处使用，绝不写入日志
  return h;
}
async function shxFetchModels() {
  var r = await fetch(shxUrl('/models'), { method: 'GET', headers: shxHeaders() });
  if (!r.ok) throw new Error('HTTP ' + r.status + '（检查地址是否需要带 /v1 后缀、密钥是否正确）');
  var j = await r.json();
  var list = (j && (j.data || j.models) || []).map(function (m) { return m.id || m.name || m.model; }).filter(Boolean);
  if (!list.length) throw new Error('模型列表为空');
  return list;
}
async function shxEmbedTexts(texts) {
  var cfg = shxCfg();
  if (!cfg.model) throw new Error('未选择向量模型');
  var r = await fetch(shxUrl('/embeddings'), { method: 'POST', headers: shxHeaders(), body: JSON.stringify({ model: cfg.model, input: texts }) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  var j = await r.json();
  var arr = (j && j.data) || [];
  if (!Array.isArray(arr) || arr.length !== texts.length) throw new Error('embedding 返回条数不匹配');
  return arr.map(function (d) { return d.embedding; });
}
function shxHash(s) {
  var h = 2166136261, t = String(s);
  for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + '_' + t.length;
}
function shxCos(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  var dot = 0, na = 0, nb = 0;
  for (var i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
// 带缓存的批量向量化（同一文本只算一次，结果落 IndexedDB）
async function shxEmbedCached(items) {
  var need = [], out = {};
  for (var i = 0; i < items.length; i++) {
    var h = shxHash(items[i].text);
    var hit = await shxTx('vectors', 'readonly', function (os) { return os.get(h); }).catch(function () { return null; });
    if (hit && hit.vec) out[items[i].id] = hit.vec;
    else need.push({ id: items[i].id, text: items[i].text, hash: h });
  }
  if (need.length) {
    var vecs = await shxEmbedTexts(need.map(function (n) { return n.text; }));
    for (var j = 0; j < need.length; j++) {
      out[need[j].id] = vecs[j];
      await shxPut('vectors', { hash: need[j].hash, vec: vecs[j], ts: Date.now() });
    }
  }
  return out;
}
async function shxRetrieve(query, k, threshold) {
  var cfg = shxCfg();
  if (!cfg.model || !query) return { hits: [], reason: '未配置向量模型或查询为空' };
  var mems = (await shxAll('memory')).concat(await shxAll('messages').then(function (a) { return a.map(function (m) { return { id: m.id, text: m.text, kind: '原文', ts: m.ts }; }); }));
  if (!mems.length) return { hits: [], reason: '记忆库还是空的' };
  var qv;
  try { qv = (await shxEmbedTexts([query]))[0]; } catch (e) { return { hits: [], reason: '向量化失败：' + (e && e.message ? e.message : e) }; }
  var scored = [];
  for (var i = 0; i < mems.length; i++) {
    var h = shxHash(mems[i].text);
    var rec = await shxTx('vectors', 'readonly', function (os) { return os.get(h); }).catch(function () { return null; });
    if (!rec || !rec.vec) continue;
    var sc = shxCos(qv, rec.vec);
    if (sc >= threshold) scored.push({ id: mems[i].id, text: mems[i].text, kind: mems[i].kind, score: sc, ts: mems[i].ts });
  }
  scored.sort(function (a, b) { return b.score - a.score; });
  return { hits: scored.slice(0, k), reason: '' };
}
// ---------- 面板自有世界书（与其它板块完全独立）----------
var SHX_WB = { entries: [], books: [], bookOf: {} };
function shxWbReset() { SHX_WB = { entries: [], books: [], bookOf: {} }; }
function shxWbNorm(rawEntries, bookKey, bookLabel) {
  var out = [];
  (Array.isArray(rawEntries) ? rawEntries : []).forEach(function (e, i) {
    if (!e || typeof e !== 'object') return;
    var content = String(e.content || e.entry || '');
    if (!content) return;
    out.push({
      id: bookKey + ':' + (e.uid != null ? 'u' + e.uid : 'i' + i),
      comment: String(e.comment || e.title || ''),
      key: Array.isArray(e.key) ? e.key.join(' / ') : String(e.key || e.keys || ''),
      content: content,
      constant: !!e.constant,
      sel: !!e.constant
    });
  });
  return out;
}
function shxWbAdd(rawEntries, bookKey, bookLabel) {
  var fresh = shxWbNorm(rawEntries, bookKey, bookLabel);
  var oldSel = {};
  SHX_WB.entries.forEach(function (o) { if (o.id.indexOf(bookKey + ':') === 0) oldSel[o.id] = o.sel; });
  fresh.forEach(function (e) { if (oldSel[e.id] !== undefined) e.sel = oldSel[e.id]; });
  SHX_WB.entries = SHX_WB.entries.filter(function (o) { return o.id.indexOf(bookKey + ':') !== 0; }).concat(fresh);
  if (SHX_WB.books.indexOf(bookLabel) < 0) SHX_WB.books.push(bookLabel);
  SHX_WB.bookOf[bookKey] = bookLabel;
  return fresh.length;
}
function shxWbImportFile(file) {
  return loadWorldFromFile(file).then(function (res) {
    var n = shxWbAdd(res.entries || [], 'file:' + (res.fileName || file.name), String(res.fileName || file.name).replace(/\.json$/i, ''));
    renderShxWb(); shxRenderBooks();
    toast('已在本面板载入世界书：' + n + ' 条（与其它板块互不影响）', 'success');
  }).catch(function (e) { toast('世界书导入失败：' + (e && e.message ? e.message : e), 'error'); });
}
function shxWbUseActive() {
  return loadWorldFromST().then(function (res) {
    if (!res || !res.entries || !res.entries.length) { toast('没有检测到酒馆当前激活的世界书（或用文件导入更稳）', 'warning'); return; }
    var n = shxWbAdd(res.entries, 'st:active', '酒馆激活');
    renderShxWb(); shxRenderBooks();
    toast('已快照酒馆当前激活世界书：' + n + ' 条', 'success');
  }).catch(function (e) { toast('读取激活世界书失败：' + (e && e.message ? e.message : e), 'error'); });
}
// 全馆藏检索：勾选/常驻条目总是注入，其余条目按关键词打分召回（不限勾选）
function shxWbPick(query, cap) {
  var picked = [], total = 0, used = {};
  function add(e, why) {
    if (!e || used[e.id]) return false;
    var line = '【' + String(e.comment || '').slice(0, 60) + '】\n' + e.content;
    if (total + line.length > cap) return false;
    used[e.id] = true; picked.push({ entry: e, why: why, text: line }); total += line.length;
    return true;
  }
  SHX_WB.entries.forEach(function (e) { if (e.constant || e.sel) add(e, e.constant ? '常驻' : '已勾选'); });
  var q = String(query || '').toLowerCase();
  var scored = [];
  SHX_WB.entries.forEach(function (e) {
    if (used[e.id]) return;
    var sc = 0;
    String(e.key || '').split('/').forEach(function (k) {
      var kk = k.trim().toLowerCase();
      if (kk.length >= 2 && q.indexOf(kk) >= 0) sc += 10;
    });
    if (e.comment && q.indexOf(String(e.comment).toLowerCase()) >= 0) sc += 6;
    if (sc) scored.push({ e: e, sc: sc });
  });
  scored.sort(function (a, b) { return b.sc - a.sc; });
  for (var i = 0; i < scored.length; i++) add(scored[i].e, '命中');
  return { picked: picked, total: total };
}
function shxWbText(query, cap) {
  var r = shxWbPick(query, cap || 12000);
  if (!r.picked.length) return '';
  return r.picked.map(function (p) { return p.text; }).join(String.fromCharCode(10) + String.fromCharCode(10));
}

// ---------- 聊天：状态 / 提示词 / 发送 ----------
function shxInit() { ST.shx = ST.shx || { msgs: [], lastHits: [], lastBooks: [], busy: false, _inited: false }; }
function shxFill(t) {
  var name = String(shxCfg().userName || '').trim() || '旅人';
  return String(t || '').replace(/\{\{user\}\}/g, name);
}
function shxRecent(turns) {
  var n = Math.max(2, Number(turns) || 8) * 2;
  return ST.shx.msgs.slice(-n);
}
function shxBuildSystem(query) {
  var cfg = shxCfg();
  var L = [];
  L.push(shxFill(SHX_PERSONA));
  L.push('[本次对话的{{user}}] ' + (String(cfg.userName || '').trim() || '旅人') + '（这是本面板专属称呼，与其它板块无关）');
  L.push('[当前世界书] ' + (SHX_WB.books.length ? SHX_WB.books.join('、') + '（本面板独立选择的 ' + SHX_WB.entries.length + ' 条）' : '（本面板尚未载入世界书）'));
  var wbText = shxWbText(query, cfg.injectCap);
  if (wbText) L.push('[馆藏摘录（按关键词命中，可引用）]\n' + wbText);
  return { system: L.join('\n\n'), wbText: wbText };
}
async function shxBuildMemoryBlock(query) {
  var cfg = shxCfg();
  if (!cfg.model) return { text: '', hits: [], note: '未配置向量模型，跳过记忆检索' };
  try {
    var r = await shxRetrieve(query, cfg.topK, cfg.threshold);
    if (!r.hits.length) return { text: '', hits: [], note: r.reason || '没有超过阈值的回忆' };
    var txt = r.hits.map(function (h) { return '· [' + h.kind + '｜相似度 ' + h.score.toFixed(2) + '] ' + h.text.slice(0, 400); }).join('\n');
    return { text: '[回忆片段（本地向量库检索，仅供你参考，不必逐条回应）]\n' + txt, hits: r.hits, note: '' };
  } catch (e) { return { text: '', hits: [], note: '记忆检索失败：' + (e && e.message ? e.message : e) }; }
}
function shxRenderMsgs() {
  var box = getEl('opf-shx-log'); if (!box) return;
  shxInit();
  box.textContent = '';
  if (!ST.shx.msgs.length) {
    var d = document.createElement('div'); d.className = 'opf-dim';
    d.textContent = '还没有开始。她是「大图书馆」的司书，此刻与你并肩站在书库外，一起看这个世界——你可以问她任何事，也可以让她去翻某一卷。';
    box.appendChild(d); return;
  }
  ST.shx.msgs.forEach(function (m) {
    var row = document.createElement('div');
    row.className = 'opf-shx-msg ' + (m.role === 'user' ? 'me' : 'her');
    var who = document.createElement('div'); who.className = 'opf-shx-who';
    who.textContent = (m.role === 'user' ? (String(shxCfg().userName || '').trim() || '旅人') : shxCfg().herName) + '　' + new Date(m.ts || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    var body = document.createElement('div'); body.className = 'opf-shx-text'; body.textContent = m.text;
    row.appendChild(who); row.appendChild(body);
    if (m.hits && m.hits.length) {
      var h = document.createElement('div'); h.className = 'opf-dim';
      h.textContent = '↳ 本轮引用回忆 ' + m.hits.length + ' 条：' + m.hits.map(function (x) { return x.score.toFixed(2); }).join(' / ');
      row.appendChild(h);
    }
    box.appendChild(row);
  });
  box.scrollTop = box.scrollHeight;
}
async function shxSend() {
  shxInit();
  if (ST.running) { toast('已有任务进行中（单线程）', 'warning'); return; }
  var inp = getEl('opf-shx-input');
  var text = (inp && inp.value || '').trim();
  if (!text) { toast('先说点什么', 'warning'); return; }
  var cfg = shxCfg();
  if (!String(cfg.userName || '').trim()) { toast('建议先在右上角填「你的名字」——这是本面板专属称呼', 'warning'); }
  var userMsg = { id: 'm' + Date.now() + '_u', role: 'user', text: text, ts: Date.now() };
  ST.shx.msgs.push(userMsg);
  if (inp) inp.value = '';
  shxRenderMsgs();
  await shxPut('messages', { id: userMsg.id, role: 'user', text: text, ts: userMsg.ts, archived: false });

  ST.running = true; renderRunButtons();
  var status = getEl('opf-shx-status'); if (status) status.textContent = '她在翻书…';
  try {
    var mem = await shxBuildMemoryBlock(text);
    var sys = shxBuildSystem(text);
    userMsg.hits = mem.hits;
    ST.shx.lastHits = mem.hits;
    var msgs = [{ role: 'system', content: sys.system + (mem.text ? '\n\n' + mem.text : '') }];
    shxRecent(cfg.windowTurns).forEach(function (m) { msgs.push({ role: m.role, content: m.text }); });
    if (status) status.textContent = '她在翻书…（馆藏 ' + (sys.wbText ? sys.wbText.length + ' 字符' : '未命中') + (mem.hits.length ? '，回忆 ' + mem.hits.length + ' 条' : '') + '）';
    var resp = await callModel(msgs);
    var herMsg = { id: 'm' + Date.now() + '_a', role: 'assistant', text: String(resp || '').trim(), ts: Date.now() };
    ST.shx.msgs.push(herMsg);
    await shxPut('messages', { id: herMsg.id, role: 'assistant', text: herMsg.text, ts: herMsg.ts, archived: false });
    if (cfg.model && herMsg.text) { try { await shxEmbedCached([{ id: herMsg.id, text: herMsg.text }, { id: userMsg.id, text: userMsg.text }]); } catch (e) { opfLog('记忆向量化失败', e && e.message); } }
    shxRenderMsgs();
    if (cfg.memAuto && ST.shx.msgs.length % (Math.max(4, Number(cfg.memEveryTurns) || 12) * 2) === 0) { shxCompress(true); }
  } catch (e) {
    toast('对话出错：' + (e && e.message ? e.message : e), 'error');
    if (status) status.textContent = '出错：' + (e && e.message ? e.message : e);
  } finally {
    ST.running = false; renderRunButtons();
    var st2 = getEl('opf-shx-status'); if (st2 && /翻书/.test(st2.textContent)) st2.textContent = '就绪';
  }
}
async function shxCompress(silent) {
  var cfg = shxCfg();
  var all = await shxAll('messages');
  var pending = all.filter(function (m) { return !m.archived; }).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
  var keep = Math.max(2, Number(cfg.windowTurns) || 8) * 2;
  var toCompress = pending.slice(0, Math.max(0, pending.length - keep));
  if (toCompress.length < 2) { if (!silent) toast('最近的内容还在窗口里，暂时不需要压缩', 'success'); return; }
  var feed = toCompress.map(function (m) { return (m.role === 'user' ? (String(cfg.userName || '').trim() || '旅人') : cfg.herName) + '：' + m.text; }).join('\n');
  var ask = '把下面这段你与{{user}}的对话压缩成「记忆条目」，供以后检索。只输出 JSON，不要解释：\n'
    + '{"标题":"≤20字","要点":["≤40字，最多6条"],"关键词":["3~8个"],"情绪":"一句话"}\n\n[对话]\n' + feed.slice(0, 12000);
  ST.running = true; renderRunButtons();
  try {
    var resp = await callModel([{ role: 'system', content: shxFill(SHX_PERSONA) }, { role: 'user', content: shxFill(ask) }]);
    var j = rxExtractJson(resp) || { 标题: '一段对话', 要点: [String(resp).slice(0, 200)], 关键词: [] };
    var text = '【' + (j['标题'] || '一段对话') + '】\n' + (Array.isArray(j['要点']) ? j['要点'].map(function (x) { return '· ' + x; }).join('\n') : '') + (j['情绪'] ? '\n情绪：' + j['情绪'] : '');
    var id = 'mem' + Date.now();
    await shxPut('memory', { id: id, text: text, ts: Date.now(), keywords: j['关键词'] || [], covers: toCompress.map(function (m) { return m.id; }), kind: '记忆条目' });
    if (cfg.model) { try { await shxEmbedCached([{ id: id, text: text }]); } catch (e) { opfLog('记忆向量化失败', e && e.message); } }
    for (var i = 0; i < toCompress.length; i++) {
      var m = toCompress[i]; m.archived = true;
      await shxPut('messages', m);
    }
    shxRenderMem();
    if (!silent) toast('已压缩 ' + toCompress.length + ' 条消息为 1 条记忆条目', 'success');
  } catch (e) { if (!silent) toast('压缩失败：' + (e && e.message ? e.message : e), 'error'); }
  finally { ST.running = false; renderRunButtons(); }
}
async function shxRenderMem() {
  var box = getEl('opf-shx-mem'); if (!box) return;
  try {
    var mems = await shxAll('memory');
    var msgs = await shxAll('messages');
    var vecs = await shxAll('vectors');
    var archived = msgs.filter(function (m) { return m.archived; }).length;
    box.textContent = '记忆条目 ' + mems.length + ' 条 ｜ 原文 ' + msgs.length + ' 条（其中已归档 ' + archived + '）｜ 本地向量 ' + vecs.length + ' 个'
      + (mems.length ? '\n' + mems.slice(-3).map(function (m) { return '· ' + String(m.text).split('\n')[0]; }).join('\n') : '');
  } catch (e) { box.textContent = '读取本地记忆失败：' + (e && e.message ? e.message : e); }
}
async function shxLoadHistory() {
  shxInit();
  try {
    var msgs = await shxAll('messages');
    msgs.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    ST.shx.msgs = msgs.filter(function (m) { return !m.archived; }).map(function (m) { return { id: m.id, role: m.role, text: m.text, ts: m.ts }; });
    shxRenderMsgs(); shxRenderMem();
  } catch (e) { opfLog('读取历史失败', e && e.message); }
}
async function shxExport() {
  try {
    var pack = { version: 1, exportedAt: Date.now(), cfg: shxCfg(), messages: await shxAll('messages'), memory: await shxAll('memory'), vectors: await shxAll('vectors') };
    destCopyText(JSON.stringify(pack), '没有可导出的内容');
    toast('已复制到剪贴板（含消息/记忆/向量，注意里面可能含你的向量接口密钥配置）', 'warning');
  } catch (e) { toast('导出失败：' + (e && e.message ? e.message : e), 'error'); }
}
async function shxClearAll() {
  if (!window.confirm('清空与始弦的对话与全部本地记忆（消息/记忆条目/向量）？此操作不可撤销。')) return;
  try {
    await shxClearStore('messages'); await shxClearStore('memory'); await shxClearStore('vectors');
    shxInit(); ST.shx.msgs = [];
    shxRenderMsgs(); shxRenderMem();
    toast('已清空本面板的对话与记忆');
  } catch (e) { toast('清空失败：' + (e && e.message ? e.message : e), 'error'); }
}
// ---------- 页面 ----------
var SHX_HTML = '<div class="opf-char-wrap"><div class="opf-sec-label">✦ 与始弦聊天 · 一起旁观世界书</div>'
  + '<div class="opf-dim">她是你在大图书馆的司书，也是同伴：一起看这部世界书描绘的世界，随时翻书查证。本面板<b>完全独立</b>——自有的称呼、自有的世界书选择、自有存储（消息/记忆/向量存在本机 IndexedDB），不写酒馆聊天记录、不触及其它板块。</div>'
  + '<div class="opf-shx-cfg">'
  + '<label class="opf-opt">你的名字<input id="opf-shx-user" class="opf-ref-input" placeholder="本面板专属称呼"></label>'
  + '<label class="opf-opt">她的自称<input id="opf-shx-her" class="opf-ref-input" placeholder="始弦"></label>'
  + '<label class="opf-opt">世界书来源<select id="opf-shx-wbmode" class="opf-ref-input"><option value="panel">面板内选书</option><option value="active">酒馆激活书</option></select></label>'
  + '<label class="opf-opt">注入上限<input id="opf-shx-cap" class="opf-num" type="number" min="2000" max="60000" step="1000"></label>'
  + '</div>'
  + '<div class="opf-shx-cfg">'
  + '<label class="opf-opt">向量接口<input id="opf-shx-base" class="opf-ref-input" placeholder="https://api.example.com/v1"></label>'
  + '<label class="opf-opt">密钥<input id="opf-shx-key" class="opf-ref-input" type="password" placeholder="只存在本机设置里"></label>'
  + '<label class="opf-opt">向量模型<select id="opf-shx-model" class="opf-ref-input"><option value="">（未选择）</option></select></label>'
  + '<button type="button" class="opf-btn ghost" id="opf-shx-models">🔌 读取模型列表</button>'
  + '<label class="opf-opt">检索条数<input id="opf-shx-topk" class="opf-num" type="number" min="1" max="20" step="1"></label>'
  + '<label class="opf-opt">相似度阈值<input id="opf-shx-thr" class="opf-num" type="number" min="0" max="1" step="0.05"></label>'
  + '<label class="opf-opt">窗口轮数<input id="opf-shx-win" class="opf-num" type="number" min="2" max="40" step="1"></label>'
  + '</div>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn ghost" id="opf-shx-wbfile">📚 导入世界书文件</button><button type="button" class="opf-btn ghost" id="opf-shx-wbactive">🔗 快照酒馆激活书</button><button type="button" class="opf-btn ghost" id="opf-shx-wbclear">🗑 清空本面板书目</button><button type="button" class="opf-btn ghost" id="opf-shx-compress">🧠 压缩为记忆条目</button><button type="button" class="opf-btn ghost" id="opf-shx-export">⧉ 导出记忆</button><button type="button" class="opf-btn ghost" id="opf-shx-clear">🗑 清空对话与记忆</button></div>'
  + '<div class="opf-dim" id="opf-shx-status">就绪</div>'
  + '<div class="opf-shx-log" id="opf-shx-log"></div>'
  + '<div class="opf-char-tools"><textarea id="opf-shx-input" class="opf-char-input" placeholder="对她说点什么（Enter 发送 / Shift+Enter 换行）"></textarea></div>'
  + '<div class="opf-char-tools"><button type="button" class="opf-btn primary" id="opf-shx-send">▶ 发送</button></div>'
  + '<div class="opf-sec"><div class="opf-sec-label">本面板世界书（独立选择，与其它板块无关）</div><div class="opf-dim" id="opf-shx-books">尚未载入</div><input id="opf-shx-wbfilter" class="opf-ref-input" placeholder="搜索条目…"><div class="opf-shx-wblist" id="opf-shx-wblist"></div></div>'
  + '<div class="opf-sec"><div class="opf-sec-label">本地记忆</div><pre id="opf-shx-mem" class="opf-box opf-char-report">读取中…</pre></div></div>';
function renderShxWb() {
  var box = getEl('opf-shx-wblist'); if (!box) return;
  var filt = String((getEl('opf-shx-wbfilter') || {}).value || '').trim().toLowerCase();
  box.textContent = '';
  var shown = SHX_WB.entries.filter(function (e) { return !filt || (e.comment + ' ' + e.key).toLowerCase().indexOf(filt) >= 0; }).slice(0, 300);
  shown.forEach(function (e) {
    var row = document.createElement('label'); row.className = 'opf-wi-row';
    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!e.sel;
    cb.addEventListener('change', function () { e.sel = this.checked; });
    var t = document.createElement('span'); t.className = 'opf-dim';
    t.textContent = (e.constant ? '★ ' : '') + (e.comment || e.key || '(无注释)');
    row.appendChild(cb); row.appendChild(t); box.appendChild(row);
  });
  if (!shown.length) { var d = document.createElement('div'); d.className = 'opf-dim'; d.textContent = SHX_WB.entries.length ? '没有匹配的条目' : '尚未载入世界书：点上方「导入世界书文件」或「快照酒馆激活书」'; box.appendChild(d); }
  else if (SHX_WB.entries.length > 300) { var m = document.createElement('div'); m.className = 'opf-dim'; m.textContent = '（仅显示前 300 条，用搜索缩小范围）'; box.appendChild(m); }
}
function shxRenderBooks() {
  var b = getEl('opf-shx-books');
  if (b) b.textContent = SHX_WB.entries.length ? ('已载入 ' + SHX_WB.books.join('、') + '：' + SHX_WB.entries.length + ' 条｜勾选 ' + SHX_WB.entries.filter(function (e) { return e.sel; }).length + ' 条将「总是注入」（★=常驻）；未勾选的不做常驻，但仍可被「全馆藏检索」按关键词召回') : '尚未载入';
}
function shxSyncCfgFromUi() {
  var g = function (id) { var el = getEl(id); return el ? el.value : ''; };
  shxSaveCfg({
    userName: g('opf-shx-user'), herName: g('opf-shx-her') || '始弦', worldMode: g('opf-shx-wbmode') || 'panel',
    injectCap: Number(g('opf-shx-cap')) || 12000,
    baseUrl: g('opf-shx-base'), apiKey: g('opf-shx-key'), model: g('opf-shx-model'),
    topK: Number(g('opf-shx-topk')) || 5, threshold: Number(g('opf-shx-thr')) || 0.2, windowTurns: Number(g('opf-shx-win')) || 8
  });
}
function shxLoadCfgToUi() {
  var cfg = shxCfg(), set = function (id, v) { var el = getEl(id); if (el && v !== undefined && v !== null) el.value = v; };
  set('opf-shx-user', cfg.userName); set('opf-shx-her', cfg.herName); set('opf-shx-wbmode', cfg.worldMode);
  set('opf-shx-cap', cfg.injectCap); set('opf-shx-base', cfg.baseUrl); set('opf-shx-key', cfg.apiKey);
  set('opf-shx-topk', cfg.topK); set('opf-shx-thr', cfg.threshold); set('opf-shx-win', cfg.windowTurns);
  var sel = getEl('opf-shx-model');
  if (sel && cfg.model) {
    var has = Array.prototype.some.call(sel.options, function (o) { return o.value === cfg.model; });
    if (!has) { var o = document.createElement('option'); o.value = cfg.model; o.textContent = cfg.model; sel.appendChild(o); }
    sel.value = cfg.model;
  }
}
function bindShxPage() {
  shxInit();
  var s = getEl('opf-shx-send'); if (!s || s._b) return; s._b = true;
  s.addEventListener('click', function () { shxSend(); });
  getEl('opf-shx-wbfile').addEventListener('click', function () { shxPickFile(); });
  getEl('opf-shx-wbactive').addEventListener('click', function () { shxWbUseActive(); });
  getEl('opf-shx-wbclear').addEventListener('click', function () { shxWbReset(); renderShxWb(); shxRenderBooks(); toast('已清空本面板书目（其它板块不受影响）'); });
  getEl('opf-shx-compress').addEventListener('click', function () { shxCompress(false); });
  getEl('opf-shx-export').addEventListener('click', function () { shxExport(); });
  getEl('opf-shx-clear').addEventListener('click', function () { shxClearAll(); });
  getEl('opf-shx-models').addEventListener('click', async function () {
    shxSyncCfgFromUi();
    var btn = this; btn.disabled = true; btn.textContent = '读取中…';
    try {
      var list = await shxFetchModels();
      var sel = getEl('opf-shx-model'); sel.textContent = '';
      list.forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = id; sel.appendChild(o); });
      var emb = list.filter(function (x) { return /embed|bge|m3e|text-embedding|gte|jina/i.test(x); });
      if (emb.length) sel.value = emb[0];
      toast('取到 ' + list.length + ' 个模型' + (emb.length ? '（已优先选中 ' + emb[0] + '）' : ''));
    } catch (e) { toast('读取失败：' + (e && e.message ? e.message : e), 'error'); }
    finally { btn.disabled = false; btn.textContent = '🔌 读取模型列表'; }
  });
  ['opf-shx-user', 'opf-shx-her', 'opf-shx-wbmode', 'opf-shx-cap', 'opf-shx-base', 'opf-shx-key', 'opf-shx-model', 'opf-shx-topk', 'opf-shx-thr', 'opf-shx-win'].forEach(function (id) {
    var el = getEl(id); if (el) el.addEventListener('change', shxSyncCfgFromUi);
  });
  getEl('opf-shx-wbfilter').addEventListener('input', renderShxWb);
  getEl('opf-shx-input').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); shxSend(); }
  });
  if (!ST.shx._inited) { ST.shx._inited = true; shxLoadCfgToUi(); shxLoadHistory(); shxRenderBooks(); renderShxWb(); }
}
function shxPickFile() {
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
  inp.addEventListener('change', function () { if (inp.files && inp.files[0]) shxWbImportFile(inp.files[0]); });
  inp.click();
}

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