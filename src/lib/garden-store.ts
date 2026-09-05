import { newBlankTree } from "@/lib/knowledge-tree/factory";
import { nowISO, uid } from "@/lib/knowledge-tree/ids";
import type { KnowledgeTree } from "@/lib/knowledge-tree/types";

export const GARDEN_KEY = "leo-tree-gardens-v1";
export const GARDEN_COVERS = Array.from({ length: 16 }, (_, i) => `/theme/gardens/g${String(i).padStart(2, "0")}.jpg`);

export type Garden = {
  id: string;
  title: string;
  titleEn: string;
  blurb: string;
  blurbEn: string;
  art: string;
  owner: string;
  seeded?: boolean;
};

export type Planted = {
  id: string;
  gardenId: string;
  ownerName: string;
  title: string;
  snapshot: KnowledgeTree;
  plantedAt: string;
};

export type GardenComment = {
  id: string;
  gardenId: string;
  plantedId?: string;
  author: string;
  body: string;
  createdAt: string;
};

export type GardenState = {
  gardens: Garden[];
  planted: Planted[];
  comments: GardenComment[];
};

const SEED_GARDENS: Garden[] = [
  {
    id: "snn",
    title: "脉息调弦",
    titleEn: "Pulse and string",
    blurb: "把练手、评测、调律拆成可掌握的枝干。",
    blurbEn: "Split practice, evaluation, and tuning into branches you can master.",
    art: "/theme/shan-shui.jpg",
    owner: "青石",
    seeded: true,
  },
  {
    id: "blank",
    title: "空园待种",
    titleEn: "Empty garden",
    blurb: "一棵空白的知识树，从根写起。看 Leo 与 Lee 如何落款。",
    blurbEn: "A blank garden. See how Leo and Lee signed their trees.",
    art: "/theme/boot-cover.jpg",
    owner: "园丁",
    seeded: true,
  },
  {
    id: "poem",
    title: "近体诗格律",
    titleEn: "Regulated verse",
    blurb: "平仄、对仗、用典，一枝一叶。",
    blurbEn: "Tone, parallelism, allusion — one branch at a time.",
    art: "/theme/flora-page.jpg",
    owner: "墨客",
    seeded: true,
  },
  {
    id: "go",
    title: "围棋官子",
    titleEn: "Go endgame",
    blurb: "收官次序与目数感觉。",
    blurbEn: "Endgame order and counting feel.",
    art: "/theme/flora-sw.jpg",
    owner: "松风",
    seeded: true,
  },
  {
    id: "brush",
    title: "书法笔法",
    titleEn: "Calligraphy stroke",
    blurb: "中锋、侧锋、提按，从一笔开始。",
    blurbEn: "Center, side, lift and press — from a single stroke.",
    art: "/theme/flora-mid.jpg",
    owner: "雪堂",
    seeded: true,
  },
  {
    id: "spring",
    title: "春山试笔",
    titleEn: "Spring mountain",
    blurb: "开年第一笔，把想学的事种进土里。",
    blurbEn: "The first stroke of the year. Plant what you mean to learn.",
    art: "/theme/gardens/g00.jpg",
    owner: "春山",
    seeded: true,
  },
  {
    id: "rain",
    title: "夜雨读书",
    titleEn: "Night rain reading",
    blurb: "雨声里把一本书拆成枝干。",
    blurbEn: "Split a book into branches while it rains.",
    art: "/theme/gardens/g02.jpg",
    owner: "夜雨",
    seeded: true,
  },
  {
    id: "plum-sword",
    title: "梅下论剑",
    titleEn: "Plum-tree fencing",
    blurb: "把一门手艺的对错写清楚。",
    blurbEn: "Write down what is right and wrong in a craft.",
    art: "/theme/gardens/g04.jpg",
    owner: "梅客",
    seeded: true,
  },
  {
    id: "bamboo",
    title: "竹里馆",
    titleEn: "Bamboo lodge",
    blurb: "独坐幽篁，把笔记养成林。",
    blurbEn: "Sit in the bamboo and grow notes into a grove.",
    art: "/theme/gardens/g06.jpg",
    owner: "王维",
    seeded: true,
  },
  {
    id: "lanting",
    title: "兰亭修禊",
    titleEn: "Orchid pavilion",
    blurb: "曲水流觞，大家把树栽在同一条溪边。",
    blurbEn: "Many trees along one stream.",
    art: "/theme/gardens/g08.jpg",
    owner: "右军",
    seeded: true,
  },
  {
    id: "chrys",
    title: "菊径晚香",
    titleEn: "Chrysanthemum path",
    blurb: "岁晚不急，把慢学的东西慢慢写。",
    blurbEn: "No hurry in late season. Write the slow things slowly.",
    art: "/theme/gardens/g10.jpg",
    owner: "东篱",
    seeded: true,
  },
  {
    id: "bridge",
    title: "溪桥问学",
    titleEn: "Bridge questions",
    blurb: "过桥之前，先问一句为什么。",
    blurbEn: "Ask why before you cross.",
    art: "/theme/gardens/g12.jpg",
    owner: "溪桥",
    seeded: true,
  },
  {
    id: "pine",
    title: "松风讲席",
    titleEn: "Pine-wind lecture",
    blurb: "把听来的课落成可以复习的树。",
    blurbEn: "Turn a lecture into a tree you can review.",
    art: "/theme/gardens/g14.jpg",
    owner: "松风",
    seeded: true,
  },
  {
    id: "snow",
    title: "雪窗夜课",
    titleEn: "Snow-window night class",
    blurb: "灯下把难点剖开。",
    blurbEn: "Split the hard knots under the lamp.",
    art: "/theme/gardens/g11.jpg",
    owner: "雪窗",
    seeded: true,
  },
  {
    id: "peach",
    title: "桃源问津",
    titleEn: "Peach-blossom spring",
    blurb: "迷路也不妨，把走过的路记成树。",
    blurbEn: "Getting lost is fine. Keep the path as a tree.",
    art: "/theme/gardens/g15.jpg",
    owner: "渔人",
    seeded: true,
  },
];

function demoTree(owner: string): KnowledgeTree {
  const tree = newBlankTree(`${owner} 的 Leo Tree`);
  tree.description =
    owner === "Leo"
      ? "示例空树。结构还没写，用来示范如何把树栽进园里。"
      : "另一棵示例空树。点开看看落款，再把自己的树栽进来。";
  return tree;
}

const SEED_PLANTED: Planted[] = [
  {
    id: "plant-leo",
    gardenId: "blank",
    ownerName: "Leo",
    title: "Leo 的 Leo Tree",
    snapshot: demoTree("Leo"),
    plantedAt: "2026-03-12T08:00:00.000Z",
  },
  {
    id: "plant-lee",
    gardenId: "blank",
    ownerName: "Lee",
    title: "Lee 的 Leo Tree",
    snapshot: demoTree("Lee"),
    plantedAt: "2026-03-18T08:00:00.000Z",
  },
];

const SEED_COMMENTS: GardenComment[] = [
  {
    id: "c-1",
    gardenId: "blank",
    author: "园丁",
    body: "空园也是园。先看 Leo 和 Lee 怎么落款，再把自己的树栽进来。",
    createdAt: "2026-03-12T09:00:00.000Z",
  },
  {
    id: "c-2",
    gardenId: "blank",
    plantedId: "plant-leo",
    author: "Leo",
    body: "我先占一枝，内容还没写。你们可以点进去看空结构。",
    createdAt: "2026-03-12T10:00:00.000Z",
  },
  {
    id: "c-3",
    gardenId: "blank",
    plantedId: "plant-lee",
    author: "Lee",
    body: "跟在后面。学会了就把自己的树移过来。",
    createdAt: "2026-03-18T11:00:00.000Z",
  },
];

function seedState(): GardenState {
  return {
    gardens: SEED_GARDENS.map((g) => ({ ...g })),
    planted: SEED_PLANTED.map((p) => ({ ...p, snapshot: structuredClone(p.snapshot) })),
    comments: SEED_COMMENTS.map((c) => ({ ...c })),
  };
}

function mergeSeed(saved: GardenState): GardenState {
  const userGardens = saved.gardens.filter((g) => !SEED_GARDENS.some((s) => s.id === g.id));
  saved.gardens = [...SEED_GARDENS.map((g) => ({ ...g })), ...userGardens];
  const plantedIds = new Set(saved.planted.map((p) => p.id));
  for (const p of SEED_PLANTED) {
    if (!plantedIds.has(p.id)) saved.planted.push({ ...p, snapshot: structuredClone(p.snapshot) });
  }
  const commentIds = new Set(saved.comments.map((c) => c.id));
  for (const c of SEED_COMMENTS) {
    if (!commentIds.has(c.id)) saved.comments.push({ ...c });
  }
  return saved;
}

export function loadGardens(): GardenState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = window.localStorage.getItem(GARDEN_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as GardenState;
    if (!parsed || !Array.isArray(parsed.gardens)) return seedState();
    return mergeSeed({
      gardens: parsed.gardens,
      planted: parsed.planted ?? [],
      comments: parsed.comments ?? [],
    });
  } catch {
    return seedState();
  }
}

export function saveGardens(state: GardenState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GARDEN_KEY, JSON.stringify(state));
}

export function createGarden(
  state: GardenState,
  input: { title: string; blurb: string; art: string; owner: string },
): { state: GardenState; garden: Garden } {
  const garden: Garden = {
    id: uid("garden"),
    title: input.title.trim() || "未名园",
    titleEn: input.title.trim() || "Untitled garden",
    blurb: input.blurb.trim(),
    blurbEn: input.blurb.trim(),
    art: input.art || GARDEN_COVERS[0],
    owner: input.owner,
  };
  const next = { ...state, gardens: [garden, ...state.gardens] };
  saveGardens(next);
  return { state: next, garden };
}

export function plantIntoGarden(
  state: GardenState,
  input: { gardenId: string; ownerName: string; tree: KnowledgeTree },
): GardenState {
  const snapshot = structuredClone(input.tree);
  const planted: Planted = {
    id: uid("plant"),
    gardenId: input.gardenId,
    ownerName: input.ownerName,
    title: `${input.ownerName} 的 Leo Tree`,
    snapshot,
    plantedAt: nowISO(),
  };
  const next = { ...state, planted: [planted, ...state.planted] };
  saveGardens(next);
  return next;
}

export function addGardenComment(
  state: GardenState,
  input: { gardenId: string; author: string; body: string; plantedId?: string },
): GardenState {
  const body = input.body.trim();
  if (!body) return state;
  const comment: GardenComment = {
    id: uid("c"),
    gardenId: input.gardenId,
    plantedId: input.plantedId,
    author: input.author,
    body,
    createdAt: nowISO(),
  };
  const next = { ...state, comments: [...state.comments, comment] };
  saveGardens(next);
  return next;
}

export function gardenTitle(g: Garden, en: boolean) {
  return en ? g.titleEn : g.title;
}

export function gardenBlurb(g: Garden, en: boolean) {
  return en ? g.blurbEn : g.blurb;
}
