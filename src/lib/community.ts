export type CommunityPost = {
  id: string;
  title: string;
  titleEn: string;
  author: string;
  authorEn: string;
  blurb: string;
  blurbEn: string;
  art: string;
  templateId?: string;
};

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "snn",
    title: "脉息调弦",
    titleEn: "Pulse and string",
    author: "青石",
    authorEn: "Qingshi",
    blurb: "把练手、评测、调律拆成可掌握的枝干。",
    blurbEn: "Split practice, evaluation, and tuning into branches you can master.",
    art: "/theme/shan-shui.jpg",
    templateId: "snn-calibration",
  },
  {
    id: "blank",
    title: "空园待种",
    titleEn: "Empty garden",
    author: "园丁",
    authorEn: "Gardener",
    blurb: "一棵空白的知识树，从根写起。",
    blurbEn: "A blank tree. Start from the root.",
    art: "/theme/boot-cover.jpg",
    templateId: "blank",
  },
  {
    id: "poem",
    title: "近体诗格律",
    titleEn: "Regulated verse",
    author: "墨客",
    authorEn: "Moke",
    blurb: "平仄、对仗、用典，一枝一叶。",
    blurbEn: "Tone, parallelism, allusion — one branch at a time.",
    art: "/theme/flora-page.jpg",
  },
  {
    id: "go",
    title: "围棋官子",
    titleEn: "Go endgame",
    author: "松风",
    authorEn: "Pine wind",
    blurb: "收官次序与目数感觉。",
    blurbEn: "Endgame order and counting feel.",
    art: "/theme/flora-sw.jpg",
  },
  {
    id: "brush",
    title: "书法笔法",
    titleEn: "Calligraphy stroke",
    author: "雪堂",
    authorEn: "Snow hall",
    blurb: "中锋、侧锋、提按，从一笔开始。",
    blurbEn: "Center, side, lift and press — from a single stroke.",
    art: "/theme/flora-mid.jpg",
  },
];
