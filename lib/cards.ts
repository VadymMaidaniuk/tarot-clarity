import type { Locale } from "@/lib/i18n";

export type CardGlyph =
  | "echo"
  | "weave"
  | "threshold"
  | "mirror"
  | "lantern"
  | "veil"
  | "tide"
  | "compass";

export type CardText = {
  name: string;
  subtitle: string;
  keyword: string;
  meaning: string;
};

export type TarotCard = {
  id: string;
  glyph: CardGlyph;
  /** Hue used for the card's gradient face (0–360). */
  hue: number;
  text: Record<Locale, CardText>;
};

export const cards: TarotCard[] = [
  {
    id: "echo",
    glyph: "echo",
    hue: 246,
    text: {
      ru: {
        name: "Эхо",
        subtitle: "Отражение и тишина",
        keyword: "Гармония",
        meaning: "Заметьте, что действительно происходит сейчас, а что лишь повторяется в вашей памяти.",
      },
      uk: {
        name: "Відлуння",
        subtitle: "Відображення і тиша",
        keyword: "Гармонія",
        meaning: "Помітьте, що насправді відбувається зараз, а що лише повторюється у вашій пам’яті.",
      },
      en: {
        name: "Echo",
        subtitle: "Reflection and silence",
        keyword: "Harmony",
        meaning: "Notice what is actually happening now and what is only repeating in your memory.",
      },
    },
  },
  {
    id: "weave",
    glyph: "weave",
    hue: 282,
    text: {
      ru: {
        name: "Сплетение",
        subtitle: "Переплетённые пути",
        keyword: "Сложность",
        meaning: "Несколько потребностей и интерпретаций переплелись. Ясность появится, если мягко разделить их.",
      },
      uk: {
        name: "Плетиво",
        subtitle: "Переплетені шляхи",
        keyword: "Складність",
        meaning: "Кілька потреб та інтерпретацій переплелися. Ясність з’явиться, якщо м’яко розділити їх.",
      },
      en: {
        name: "Weave",
        subtitle: "Intertwined paths",
        keyword: "Complexity",
        meaning: "Several needs and interpretations have become entangled. Clarity comes from gently separating them.",
      },
    },
  },
  {
    id: "threshold",
    glyph: "threshold",
    hue: 210,
    text: {
      ru: {
        name: "Порог",
        subtitle: "Впереди новое открытие",
        keyword: "Действие",
        meaning: "Небольшой честный выбор может вывести ситуацию из неопределённости в реальный опыт.",
      },
      uk: {
        name: "Поріг",
        subtitle: "Попереду нове відкриття",
        keyword: "Дія",
        meaning: "Невеликий чесний вибір може вивести ситуацію з невизначеності у реальний досвід.",
      },
      en: {
        name: "Threshold",
        subtitle: "A new opening ahead",
        keyword: "Action",
        meaning: "One small honest choice can move the situation from uncertainty into real experience.",
      },
    },
  },
  {
    id: "mirror",
    glyph: "mirror",
    hue: 196,
    text: {
      ru: {
        name: "Зеркало",
        subtitle: "Вы внутри этой истории",
        keyword: "Правда",
        meaning: "Ваша реакция содержит важную информацию о собственных потребностях, границах и надеждах.",
      },
      uk: {
        name: "Дзеркало",
        subtitle: "Ви всередині цієї історії",
        keyword: "Правда",
        meaning: "Ваша реакція містить важливу інформацію про власні потреби, межі та надії.",
      },
      en: {
        name: "Mirror",
        subtitle: "You are inside this story",
        keyword: "Truth",
        meaning: "Your reaction carries important information about your own needs, boundaries and hopes.",
      },
    },
  },
  {
    id: "lantern",
    glyph: "lantern",
    hue: 32,
    text: {
      ru: {
        name: "Фонарь",
        subtitle: "Один ясный сигнал",
        keyword: "Распознавание",
        meaning: "Вам не нужны все ответы. Найдите следующий факт, который действительно что-то изменит.",
      },
      uk: {
        name: "Ліхтар",
        subtitle: "Один ясний сигнал",
        keyword: "Розпізнання",
        meaning: "Вам не потрібні всі відповіді. Знайдіть наступний факт, який справді щось змінить.",
      },
      en: {
        name: "Lantern",
        subtitle: "One clear signal",
        keyword: "Discernment",
        meaning: "You don't need every answer. Find the next fact that would actually change something.",
      },
    },
  },
  {
    id: "veil",
    glyph: "veil",
    hue: 320,
    text: {
      ru: {
        name: "Завеса",
        subtitle: "То, чего пока нельзя знать",
        keyword: "Терпение",
        meaning: "Часть неопределённости принадлежит другому человеку. Не превращайте нехватку информации в осуждение себя.",
      },
      uk: {
        name: "Завіса",
        subtitle: "Те, чого поки не можна знати",
        keyword: "Терпіння",
        meaning: "Частина невизначеності належить іншій людині. Не перетворюйте брак інформації на осуд себе.",
      },
      en: {
        name: "Veil",
        subtitle: "What cannot be known yet",
        keyword: "Patience",
        meaning: "Part of the uncertainty belongs to the other person. Don't turn missing information into self-judgement.",
      },
    },
  },
  {
    id: "tide",
    glyph: "tide",
    hue: 172,
    text: {
      ru: {
        name: "Прилив",
        subtitle: "Эмоция в движении",
        keyword: "Высвобождение",
        meaning: "Сила переживания реальна, но не вечна. Позвольте эмоции пройти, прежде чем выбирать ответ.",
      },
      uk: {
        name: "Приплив",
        subtitle: "Емоція в русі",
        keyword: "Вивільнення",
        meaning: "Сила переживання реальна, але не вічна. Дозвольте емоції пройти, перш ніж обирати відповідь.",
      },
      en: {
        name: "Tide",
        subtitle: "Emotion in motion",
        keyword: "Release",
        meaning: "The intensity is real but not permanent. Let the feeling pass before you choose a response.",
      },
    },
  },
  {
    id: "compass",
    glyph: "compass",
    hue: 12,
    text: {
      ru: {
        name: "Компас",
        subtitle: "Возвращение к своим ценностям",
        keyword: "Направление",
        meaning: "Выберите ответ, который уважает и ваше стремление к близости, и ваше достоинство.",
      },
      uk: {
        name: "Компас",
        subtitle: "Повернення до своїх цінностей",
        keyword: "Напрям",
        meaning: "Оберіть відповідь, яка поважає і ваше прагнення до близькості, і вашу гідність.",
      },
      en: {
        name: "Compass",
        subtitle: "Return to your values",
        keyword: "Direction",
        meaning: "Choose the response that honours both your wish for closeness and your dignity.",
      },
    },
  },
];

export function cardById(id: string) {
  return cards.find((card) => card.id === id);
}

export function cardText(card: TarotCard, locale: Locale): CardText {
  return card.text[locale];
}
