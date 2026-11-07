import type { Category } from '../engine/types';

/**
 * How a condition answer changes an option's weight.
 *
 * - `tags`: options carrying the tag get the multiplier (several matching tags multiply).
 * - `others`: options that HAVE tag data but none of this rule's tags get this multiplier.
 * - `novelty`: uses real history: options not picked for a long time (or never) are
 *   boosted, options picked recently are damped.
 *
 * Options without any tag data (anything the couple typed in themselves) are never
 * touched by `tags`/`others` rules, so a condition can't silently punish them.
 */
export interface ConditionRule {
  tags?: Record<string, number>;
  others?: number;
  novelty?: boolean;
  /** Short human phrase used in the result reasons, e.g. "啱今晚預算". */
  says?: string;
}

export interface ConditionGroup {
  title: string;
  answers: Record<string, ConditionRule>;
}

export interface CategoryRules {
  condTitle: string;
  condSub: string;
  groups: ConditionGroup[];
  /** Tags for the built-in options. User-added options have none (neutral). */
  optionTags: Record<string, string[]>;
  /** Cooldown in days for this category, unless overridden per option. */
  cooldownDays: number;
  cooldownOverrides: Record<string, number>;
  /** Not picked for at least this many days → small boost. 0 disables. */
  longGapDays: number;
}

const NEUTRAL: ConditionRule = {};

export const RULES: Record<Category, CategoryRules> = {
  eat: {
    condTitle: '今晚食飯情況係……',
    condSub: '條件會調整每個選項嘅中獎機率，唔會直接刪走佢',
    cooldownDays: 3,
    cooldownOverrides: { 日本菜: 5, 火鍋: 10 },
    longGapDays: 30,
    optionTags: {
      日本菜: ['dinein', 'delivery', 'mid', 'healthy', 'treat'],
      泰國菜: ['dinein', 'delivery', 'cheap', 'near'],
      火鍋: ['dinein', 'pricey', 'slow', 'treat', 'celebrate'],
      西餐: ['dinein', 'pricey', 'slow', 'celebrate', 'far'],
      麥當勞: ['dinein', 'delivery', 'cheap', 'fast', 'near', 'junk', 'easy'],
      屋企煮: ['home', 'cheap', 'healthy', 'near'],
    },
    groups: [
      {
        title: '預算',
        answers: {
          平價: { tags: { cheap: 1.6, pricey: 0.4 }, says: '啱平價預算' },
          正常: NEUTRAL,
          豪華: { tags: { pricey: 1.6, cheap: 0.7 }, says: '啱今晚想食好啲' },
          不限: NEUTRAL,
        },
      },
      {
        title: '距離',
        answers: {
          屋企附近: { tags: { near: 1.5, far: 0.4 }, says: '就腳' },
          '30 分鐘內': { tags: { far: 0.6 } },
          去遠少少都可以: { tags: { far: 1.3 } },
        },
      },
      {
        title: '模式',
        answers: {
          堂食: { tags: { dinein: 1.3, home: 0.2 }, says: '可以堂食' },
          外賣: { tags: { delivery: 1.5, home: 0.2 }, others: 0.5, says: '叫到外賣' },
          自己煮: { tags: { home: 3 }, others: 0.4, says: '可以自己煮' },
          都可以: NEUTRAL,
        },
      },
      {
        title: '今日狀態',
        answers: {
          好攰: { tags: { easy: 1.5, near: 1.2, slow: 0.6, home: 0.6 }, says: '唔使攰' },
          想健康: { tags: { healthy: 1.7, junk: 0.3 }, says: '食得健康' },
          想食得開心: { tags: { treat: 1.5 }, says: '食得開心' },
          想試新嘢: { novelty: true },
          趕時間: { tags: { fast: 1.7, slow: 0.3 }, says: '夠快' },
          慶祝一下: { tags: { celebrate: 1.8, junk: 0.4 }, says: '夠隆重' },
        },
      },
    ],
  },
  go: {
    condTitle: '今日出行情況係……',
    condSub: '答完先轉，唔啱天氣同時間嘅地方機率會降低',
    cooldownDays: 7,
    cooldownOverrides: { 行山: 14, 商場: 5 },
    longGapDays: 45,
    optionTags: {
      行山: ['outdoor', 'active', 'long', 'quiet'],
      海邊: ['outdoor', 'quiet', 'photo', 'far', 'long'],
      商場: ['indoor', 'lively', 'near', 'short'],
      咖啡店: ['indoor', 'quiet', 'near', 'short'],
      展覽: ['indoor', 'photo', 'short'],
      攝影散步: ['outdoor', 'photo', 'near'],
    },
    groups: [
      {
        title: '有幾多時間',
        answers: {
          兩三個鐘: { tags: { short: 1.5, long: 0.3 }, says: '兩三個鐘搞得掂' },
          半日: NEUTRAL,
          成日: { tags: { long: 1.5 }, says: '用得晒成日' },
        },
      },
      {
        title: '今日天氣',
        answers: {
          好天: { tags: { outdoor: 1.4 }, says: '好天啱出去' },
          太熱: { tags: { indoor: 1.5, outdoor: 0.5 }, says: '室內避熱' },
          落雨: { tags: { indoor: 1.8, outdoor: 0.2 }, says: '落雨都唔怕' },
          涼爽: { tags: { outdoor: 1.3 }, says: '涼爽啱戶外' },
        },
      },
      {
        title: '想要嘅感覺',
        answers: {
          靜靜哋抖下: { tags: { quiet: 1.5, active: 0.5, lively: 0.6 }, says: '夠靜' },
          熱熱鬧鬧: { tags: { lively: 1.7, quiet: 0.7 }, says: '夠熱鬧' },
          影靚相: { tags: { photo: 1.7 }, says: '好影相' },
          郁動下: { tags: { active: 1.8, outdoor: 1.2 }, says: '郁得到' },
        },
      },
      {
        title: '交通',
        answers: {
          行路到: { tags: { near: 1.6, far: 0.2 }, says: '行路到' },
          '搭車 30 分鐘內': { tags: { far: 0.5 } },
          幾遠都得: { tags: { far: 1.2 } },
        },
      },
    ],
  },
  watch: {
    condTitle: '今晚睇嘢情況係……',
    condSub: '時間同心情會調整每類嘅中獎機率',
    cooldownDays: 1,
    cooldownOverrides: {},
    longGapDays: 0,
    optionTags: {
      電影: ['long', 'focus', 'thrill', 'cry'],
      劇集: ['medium', 'focus', 'thrill', 'cry'],
      YouTube: ['short', 'light', 'background', 'funny', 'learn'],
      紀錄片: ['medium', 'focus', 'learn'],
      綜藝: ['medium', 'light', 'funny', 'background'],
      唔睇喇: ['nothing'],
    },
    groups: [
      {
        title: '淨返幾多時間',
        answers: {
          '30 分鐘': { tags: { short: 1.8, medium: 0.6, long: 0.15, nothing: 1.3 }, says: '啱淨返嘅時間' },
          '1–2 個鐘': { tags: { medium: 1.2 }, says: '啱淨返嘅時間' },
          唔限: { tags: { long: 1.4, nothing: 0.6 } },
        },
      },
      {
        title: '想要咩感覺',
        answers: {
          輕鬆搞笑: { tags: { funny: 1.8, light: 1.2 }, says: '夠輕鬆' },
          緊張刺激: { tags: { thrill: 1.6 }, says: '夠刺激' },
          喊一場: { tags: { cry: 1.6 }, says: '可以喊一場' },
          長知識: { tags: { learn: 2 }, says: '長到知識' },
        },
      },
      {
        title: '點樣睇',
        answers: {
          熄燈專心睇: { tags: { focus: 1.4, background: 0.5 }, says: '值得專心睇' },
          邊食邊睇: { tags: { light: 1.3, medium: 1.1 }, says: '啱邊食邊睇' },
          背景播住: { tags: { background: 1.8, focus: 0.4 }, says: '啱背景播' },
        },
      },
    ],
  },
  custom: {
    condTitle: '呢個決定係……',
    condSub: '自訂選項冇預設標籤，所以機率只受投票同冷卻期影響',
    cooldownDays: 0,
    cooldownOverrides: {},
    longGapDays: 0,
    optionTags: {},
    groups: [],
  },
};

export const DEFAULT_OPTIONS: Record<Category, string[]> = {
  eat: ['日本菜', '泰國菜', '火鍋', '西餐', '麥當勞', '屋企煮'],
  go: ['行山', '海邊', '商場', '咖啡店', '展覽', '攝影散步'],
  watch: ['電影', '劇集', 'YouTube', '紀錄片', '綜藝', '唔睇喇'],
  custom: ['選項 A', '選項 B', '選項 C', '選項 D'],
};

export const DEFAULT_CHORES = [
  { name: '清潔貓砂', pts: 15 },
  { name: '洗碗', pts: 10 },
  { name: '倒垃圾', pts: 5 },
  { name: '吸塵', pts: 15 },
  { name: '清潔浴室', pts: 30 },
  { name: '買貓糧', pts: 10 },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  eat: '今晚食乜',
  go: '今日去邊',
  watch: '今晚睇乜',
  custom: '自訂決定',
};

export const CATEGORY_TAG: Record<Category, string> = {
  eat: '食乜',
  go: '去邊',
  watch: '睇乜',
  custom: '自訂',
};

/** Tags the couple can stick on their own options, per category (tag → label). */
export const TAG_CHOICES: Record<Category, Record<string, string>> = {
  eat: {
    cheap: '平', pricey: '貴', near: '近', far: '遠', dinein: '堂食', delivery: '外賣', home: '自己煮',
    fast: '快', slow: '慢慢食', healthy: '健康', junk: '邪惡', treat: '開心', celebrate: '慶祝', easy: '唔使攰',
  },
  go: {
    indoor: '室內', outdoor: '戶外', active: '郁動', quiet: '靜', lively: '熱鬧', photo: '好影相',
    near: '近', far: '遠', short: '兩三個鐘', long: '要成日',
  },
  watch: {
    short: '短', medium: '一兩個鐘', long: '長', focus: '要專心', background: '可以背景播', light: '輕鬆',
    funny: '搞笑', thrill: '刺激', cry: '喊', learn: '長知識', nothing: '唔睇',
  },
  custom: {},
};

export type UserTags = Partial<Record<Category, Record<string, string[]>>>;

/** Effective tags for an option: the couple's own tags win over the built-in ones. */
export function tagsFor(cat: Category, option: string, user: UserTags | undefined): string[] {
  return user?.[cat]?.[option] ?? RULES[cat].optionTags[option] ?? [];
}

export function rulesWithTags(cat: Category, user: UserTags | undefined): CategoryRules {
  const own = user?.[cat];
  if (!own || Object.keys(own).length === 0) return RULES[cat];
  return { ...RULES[cat], optionTags: { ...RULES[cat].optionTags, ...own } };
}
