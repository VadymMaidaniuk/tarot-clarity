export type CardGlyph =
  | "echo"
  | "weave"
  | "threshold"
  | "mirror"
  | "lantern"
  | "veil"
  | "tide"
  | "compass";

export type TarotCard = {
  id: string;
  name: string;
  subtitle: string;
  keyword: string;
  glyph: CardGlyph;
  /** Hue used for the card's gradient face (0–360). */
  hue: number;
  meaning: string;
};

export const cards: TarotCard[] = [
  {
    id: "echo",
    name: "Відлуння",
    subtitle: "Відображення і тиша",
    keyword: "Гармонія",
    glyph: "echo",
    hue: 246,
    meaning:
      "Помітьте, що насправді відбувається зараз, а що лише повторюється у вашій пам’яті.",
  },
  {
    id: "weave",
    name: "Плетиво",
    subtitle: "Переплетені шляхи",
    keyword: "Складність",
    glyph: "weave",
    hue: 282,
    meaning:
      "Кілька потреб та інтерпретацій переплелися. Ясність з’явиться, якщо м’яко розділити їх.",
  },
  {
    id: "threshold",
    name: "Поріг",
    subtitle: "Попереду нове відкриття",
    keyword: "Дія",
    glyph: "threshold",
    hue: 210,
    meaning:
      "Невеликий чесний вибір може вивести ситуацію з невизначеності у реальний досвід.",
  },
  {
    id: "mirror",
    name: "Дзеркало",
    subtitle: "Ви всередині цієї історії",
    keyword: "Правда",
    glyph: "mirror",
    hue: 196,
    meaning:
      "Ваша реакція містить важливу інформацію про власні потреби, межі та надії.",
  },
  {
    id: "lantern",
    name: "Ліхтар",
    subtitle: "Один ясний сигнал",
    keyword: "Розпізнання",
    glyph: "lantern",
    hue: 32,
    meaning:
      "Вам не потрібні всі відповіді. Знайдіть наступний факт, який справді щось змінить.",
  },
  {
    id: "veil",
    name: "Завіса",
    subtitle: "Те, чого поки не можна знати",
    keyword: "Терпіння",
    glyph: "veil",
    hue: 320,
    meaning:
      "Частина невизначеності належить іншій людині. Не перетворюйте брак інформації на осуд себе.",
  },
  {
    id: "tide",
    name: "Приплив",
    subtitle: "Емоція в русі",
    keyword: "Вивільнення",
    glyph: "tide",
    hue: 172,
    meaning:
      "Сила переживання реальна, але не вічна. Дозвольте емоції пройти, перш ніж обирати відповідь.",
  },
  {
    id: "compass",
    name: "Компас",
    subtitle: "Повернення до своїх цінностей",
    keyword: "Напрям",
    glyph: "compass",
    hue: 12,
    meaning:
      "Оберіть відповідь, яка поважає і ваше прагнення до близькості, і вашу гідність.",
  },
];

export const positions = [
  "Ваш внутрішній стан",
  "Динаміка між вами",
  "Конструктивний наступний крок",
];

export function cardById(id: string) {
  return cards.find((card) => card.id === id);
}
