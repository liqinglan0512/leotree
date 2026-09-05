import type { PracticeLog, TemplateRuntime, TreeTemplate } from "../types.ts";

export const SNN_TEMPLATE_ID = "snn-calibration";

const A = [
  ["A01", "校准 ≠ 准确率", 0, "高 acc 仍可严重过自信；校准问的是置信度是否等于正确率。"],
  ["A02", "Proper scoring：NLL 与 Brier", 0, "两者是严格 proper scoring rule，可作校准的可优化代理，但不能互相替代 ECE。"],
  ["A03", "ECE / MCE / ACE 与分箱", 0, "等宽箱对过自信敏感；箱数、样本量会改数字。报告时写清协议。"],
  ["A04", "Reliability diagram 怎么读", 1, "对角线以上过自信，以下欠自信；只看 ECE 会丢掉形状。"],
  ["A05", "过自信与欠自信的形状", 1, "SNN 小 T 时常过自信；转换残差也可能把质量推离对角线。"],
  ["A06", "校准器是后处理，不是新骨干", 1, "TS / isotonic 不改变排序时不涨 acc；不要把它写成「免费涨点」。"],
  ["A07", "只在 val 上拟合校准器", 0, "test 只评估一次。用 test 选温度 = 泄漏。见 F05 / F10。"],
  ["A08", "时间步让 SNN 的 logit 分布随 t 变", 0, "最终一步的校准好，不代表途中每一步都好。这是时间维问题的入口。"],
  ["A09", "研究问题：SNN 校准误差从哪来", 1, "分解：转换/训练误差、读出定义、有限 T、校准器拟合、泄漏。"],
  ["A10", "六个月主线", 2, "指标协议 → 读出定义 → 时间维曲线 → 泄漏纪律。P2 只作旁支。"],
] as const;

const B = [
  ["B01", "Temperature Scaling（Guo 2017）", 0, "一个标量温度除 logits。小校准集上通常最稳。"],
  ["B02", "温度的含义：平滑 softmax", 1, "T>1 变软，T<1 变尖。SNN 膜电位尺度会与 T 纠缠。"],
  ["B03", "Vector / Matrix scaling", 2, "类相关缩放，参数更多，小 val 易过拟合。"],
  ["B04", "Histogram binning", 1, "非参数、依赖箱；与 ECE 的箱定义不要混用同一套却不声明。"],
  ["B05", "Isotonic regression", 0, "单调映射，灵活但 val 小时过拟合；SNN 上更要盯校准集大小。"],
  ["B06", "Dirichlet calibration", 2, "多类联合校准。作 P2 了解即可，不要变成主线。"],
  ["B07", "小校准集：TS 稳、isotonic 险", 0, "先用 TS 做基线，再决定是否上非参数方法。"],
  ["B08", "总体校准 vs 类别条件校准", 1, "ECE 低不等于每一类都可靠。classwise ECE 作补充。"],
  ["B09", "校准不是免费涨点", 1, "若排序不变，acc 不变。同时报 acc 与校准指标。"],
  ["B10", "域偏移下校准会坏", 2, "神经形态数据、传感器漂移都可能让 val 上的 T 失效。"],
  ["B11", "置信度 = max softmax", 0, "默认定义。换读出等于换置信度，比较前必须对齐。"],
  ["B12", "NLL 下降 ≠ ECE 下降", 1, "proper scoring 与分箱校准误差可分手。两条都报。"],
] as const;

const C = [
  ["C01", "LIF / IF：膜电位与发放", 0, "膜电位可当 logit 来源；脉冲是它的事件化。"],
  ["C02", "读出：脉冲计数 / 膜电位 / 时间码", 0, "三种读出给出三种置信度。实验卡必须写明。"],
  ["C03", "Rate coding：T 增大向 ANN 逼近", 1, "校准变好可能只是「更像 ANN」。要对照同骨干 ANN。"],
  ["C04", "转换 SNN vs 直接训练 SNN", 0, "两条线的误校准来源不同，不要混在一张表里只报一个数。"],
  ["C05", "转换校准文献在校准什么", 1, "Li et al. 等转换校准多针对发放率近似，不等于置信度校准。"],
  ["C06", "替代梯度 / STBP 与置信度", 2, "训练动态会影响 logit 尺度。P2：只在主问题需要时碰。"],
  ["C07", "T、dt 与延迟-精度权衡", 0, "T 是自变量。只报一个甜蜜点 T，等于隐瞒曲线。"],
  ["C08", "静态图 vs DVS 神经形态数据", 1, "划分、时间窗、重复播放都可能泄漏。见 F03。"],
  ["C09", "膜电位尺度与 softmax 温度纠缠", 0, "未归一的膜电位会让 TS 的 T 不可比。记录尺度。"],
  ["C10", "早停 / cutoff 改变有效 T", 1, "提前退出等于在另一条 ECE(t) 上取值。协议要写清。"],
  ["C11", "稀疏发放 vs 校准", 2, "脉冲太少时计数读出方差大，置信度不可信。"],
  ["C12", "量化与低比特 SNN", 2, "量化改变 logit 分辨率。P2 探索项，不要挤占 P0。"],
] as const;

const D = [
  ["D01", "主指标：acc / NLL / Brier / ECE", 0, "四格都预留。缺的就空着，不要事后用 test 补。"],
  ["D02", "多种子：至少 0,1,2", 0, "报 mean±std。只报最好种子 = F08。"],
  ["D03", "等宽 ECE vs 等频 ECE", 1, "选一种写进协议并固定；附录可对照，主文不要来回换。"],
  ["D04", "同时画 acc(t) 与 ECE(t)", 0, "时间维的最小图。只有终点 ECE 不够。"],
  ["D05", "ANN 对照要公平", 1, "同一骨干、预处理、训练预算。否则「SNN 更准」无意义。"],
  ["D06", "T 是自变量，不是超参偷看", 0, "曲线优于单点。用 test 选 T 见 F04。"],
  ["D07", "校准集来源写进实验卡", 0, "val 划分 / 其他。并勾选「确认未用 test 拟合校准器」。"],
  ["D08", "超参搜索只看 val", 0, "包括读出、T、温度、早停阈值。"],
  ["D09", "能耗 / 脉冲数与校准一起报", 2, "若论文要谈效率，校准曲线旁加脉冲预算。P2。"],
  ["D10", "无效实验也留档", 1, "结论选「无效实验」+ 一句话，避免下周重复踩坑。"],
] as const;

const E = [
  ["E01", "conf(t) 是否单调", 1, "观察平均置信度随 t 的走向，记下反常拐点。"],
  ["E02", "acc(t) 曲线", 0, "延迟-精度的底图。与 ECE(t) 共用横轴。"],
  ["E03", "ECE(t) 曲线", 0, "核心图。问：校准误差何时下降、是否回升。"],
  ["E04", "小 T 过自信假说", 0, "可证伪：小 T 时 conf 高于 acc。被推翻也要记。"],
  ["E05", "大 T 变好是否只是更像 ANN", 1, "对照同骨干 ANN 的 ECE。重合则故事要改。"],
  ["E06", "逐步温度 τ(t)", 1, "每步一个温度还是共享一个。都只能在 val 上拟合。"],
  ["E07", "时间集成 logits", 1, "对 t 积分或平均后再 softmax。记录是否改变 ECE(t) 形状。"],
  ["E08", "TTFS / 时间码的置信度", 2, "首脉冲时间如何变成概率。P2。"],
  ["E09", "用置信度决定何时停", 2, "自适应 T。阈值必须在 val 上选。"],
  ["E10", "时间维 reliability diagram", 1, "若干 t 的可靠性图，比单条 ECE(t) 更露形状。"],
  ["E11", "转换误差随 t 的分解", 2, "近似误差 vs 校准误差。P2 分析项。"],
  ["E12", "temporal calibration", 0, "把时间当作校准轴：不仅校准最终输出，还校准过程中的置信度。"],
  ["E13", "三种读出在同一 t 上是否一致", 1, "计数、膜电位、时间码的置信度若打架，先定主读出。"],
] as const;

const F = [
  ["F01", "种子、配置、提交一并记下", 1, "实验卡的种子栏、附件说明写路径即可。"],
  ["F02", "超参泄漏：在 test 上挑模型", 0, "看过 test 再选架构/读出，数字不可信。"],
  ["F03", "神经形态数据划分陷阱", 1, "同一录音/同一场景进了 val 和 test 就是泄漏。"],
  ["F04", "用 test 选 T / 选读出", 0, "T 和读出是协议的一部分，只能用 val。"],
  ["F05", "用 test 拟合温度或 isotonic", 0, "最常见的硬泄漏。未勾选确认框时卡片会变警告色。"],
  ["F06", "反复偷看 test 的观察泄漏", 1, "「先看一眼 test 曲线再决定」也算。写进周回顾。"],
  ["F07", "把 ANN 校准器直接套到 SNN", 1, "尺度不同。要重拟合，并记录来源。"],
  ["F08", "只报最好种子", 0, "至少三颗种子。最好结果可作附录，不作主表。"],
  ["F09", "附件只写路径，不上传", 2, "本工具不存文件。文件名/路径写在附件说明。"],
  ["F10", "data leakage 总则", 0, "校准集来源必须可审计。任何 test 参与拟合/选型都记为泄漏风险。"],
  ["F11", "可复现清单", 0, "数据、种子、T、dt、读出、校准器、校准集、是否碰过 test。"],
  ["F12", "泄漏后的补救", 1, "作废该次校准，重划 val，周回顾泄漏项选「是」并写一句。"],
] as const;

function nodes(rows: readonly (readonly [string, string, number, string])[]) {
  return rows.map(([id, title, priority, hint]) => ({
    id,
    title,
    hint,
    priority: priority as 0 | 1 | 2,
  }));
}

export const snnTemplate: TreeTemplate = {
  id: SNN_TEMPLATE_ID,
  title: "SNN",
  description: "脉冲神经网络 · 校准与时间维可靠性",
  sections: [
    { id: "A", title: "A · 问题与地图", description: "先分清「准」和「校准」，再把 SNN 的时间轴放进问题定义里。", nodes: nodes(A) },
    { id: "B", title: "B · ANN 校准工具箱", description: "把经典后处理校准摸熟，再决定哪些搬得进 SNN。", nodes: nodes(B) },
    { id: "C", title: "C · SNN 机制与读出", description: "读出定义了「置信度」是什么；T 和 dt 不是装饰参数。", nodes: nodes(C) },
    { id: "D", title: "D · 指标与实验协议", description: "同一套协议才能比较。种子、T、校准集来源都要写进实验卡。", nodes: nodes(D) },
    { id: "E", title: "E · 时间维校准", description: "把时间当作校准轴，而不是只校准最终输出。", nodes: nodes(E) },
    { id: "F", title: "F · 风险、泄漏与纪律", description: "泄漏会让所有 ECE 数字作废。先可审计，再谈方法。", nodes: nodes(F) },
  ],
  logFields: [
    { id: "falsify", label: "若该假设被推翻，预期会看到什么", type: "textarea", group: "假设" },
    { id: "models", label: "模型", type: "multiselect", group: "设置", options: [
      { value: "ann", label: "ANN" },
      { value: "convert", label: "转换SNN" },
      { value: "direct", label: "直接训练SNN" },
    ]},
    { id: "readouts", label: "读出", type: "multiselect", group: "设置", options: [
      { value: "count", label: "脉冲计数" },
      { value: "membrane", label: "膜电位" },
      { value: "temporal", label: "时间码" },
      { value: "other", label: "其他" },
    ]},
    { id: "T", label: "时间步 T", type: "text", group: "设置" },
    { id: "dt", label: "dt", type: "text", group: "设置" },
    { id: "dataset", label: "数据集", type: "text", group: "设置" },
    { id: "calibrator", label: "校准器", type: "select", group: "设置", options: [
      { value: "", label: "（未选）" },
      { value: "none", label: "无" },
      { value: "ts", label: "Temperature Scaling" },
      { value: "isotonic", label: "Isotonic" },
      { value: "other", label: "其他" },
    ]},
    { id: "calibSource", label: "校准集来源（val 划分 / 其他）", type: "text", group: "设置" },
    { id: "noTestLeak", label: "确认未用 test 拟合校准器", type: "checkbox", group: "设置" },
    { id: "seeds", label: "种子（逗号分隔，如 0,1,2）", type: "text", group: "设置" },
    { id: "acc", label: "acc", type: "text", group: "指标" },
    { id: "nll", label: "NLL", type: "text", group: "指标" },
    { id: "brier", label: "Brier", type: "text", group: "指标" },
    { id: "ece", label: "ECE", type: "text", group: "指标" },
    { id: "temporalNote", label: "时间校准记录（conf(t) / acc(t) / ECE(t)）", type: "textarea", group: "指标" },
    { id: "verdict", label: "结论类型", type: "select", group: "结论", options: [
      { value: "", label: "（未选）" },
      { value: "support", label: "支持假设" },
      { value: "weaken", label: "削弱假设" },
      { value: "invalid", label: "无效实验" },
    ]},
    { id: "verdictNote", label: "结论一句话", type: "text", group: "结论" },
  ],
  reviewFields: [
    { id: "leak", label: "是否发生数据泄漏风险", type: "radio", options: [
      { value: "no", label: "否" },
      { value: "unsure", label: "不确定" },
      { value: "yes", label: "是" },
    ]},
    { id: "leakNote", label: "泄漏说明", type: "text", placeholder: "选「是」时写清 test 如何被用到。" },
  ],
};

export function snnLogHasRisk(log: PracticeLog): boolean {
  const c = log.custom || {};
  const text = [
    log.title,
    log.question,
    log.hypothesis,
    log.process,
    log.conclusion,
    log.attachmentNote,
    c.calibSource,
    c.temporalNote,
    c.falsify,
    c.verdictNote,
    c.dataset,
  ].join(" ");
  const mentions = (log.linkedNodeIds || []).includes("F10") || /test|泄漏|leak|测试集/i.test(text);
  return Boolean(mentions && !c.noTestLeak);
}

export const snnRuntime: TemplateRuntime = {
  logHasRisk: snnLogHasRisk,
  reviewRiskHint: (logs) => {
    const n = logs.filter(snnLogHasRisk).length;
    if (!n) return null;
    return `本周有 ${n} 条实践日志触及 test/泄漏或 F10，且未勾选「确认未用 test 拟合校准器」。`;
  },
};
