export type TarotCard = {
  id: string;
  name: string;
  subtitle: string;
  keyword: string;
  image: string;
  meaning: string;
};

export const cards: TarotCard[] = [
  {
    id: "echo",
    name: "Відлуння",
    subtitle: "Відображення і тиша",
    keyword: "Гармонія",
    image: "/images/card-echo.jpg",
    meaning:
      "Помітьте, що насправді відбувається зараз, а що лише повторюється у вашій пам’яті.",
  },
  {
    id: "weave",
    name: "Плетиво",
    subtitle: "Переплетені шляхи",
    keyword: "Складність",
    image: "/images/card-weave.jpg",
    meaning:
      "Кілька потреб та інтерпретацій переплелися. Ясність з’явиться, якщо м’яко розділити їх.",
  },
  {
    id: "threshold",
    name: "Поріг",
    subtitle: "Попереду нове відкриття",
    keyword: "Дія",
    image: "/images/card-threshold.jpg",
    meaning:
      "Невеликий чесний вибір може вивести ситуацію з невизначеності у реальний досвід.",
  },
  {
    id: "mirror",
    name: "Дзеркало",
    subtitle: "Ви всередині цієї історії",
    keyword: "Правда",
    image: "/images/texture-light.jpg",
    meaning:
      "Ваша реакція містить важливу інформацію про власні потреби, межі та надії.",
  },
  {
    id: "lantern",
    name: "Ліхтар",
    subtitle: "Один ясний сигнал",
    keyword: "Розпізнання",
    image: "/images/texture-foil.jpg",
    meaning:
      "Вам не потрібні всі відповіді. Знайдіть наступний факт, який справді щось змінить.",
  },
  {
    id: "veil",
    name: "Завіса",
    subtitle: "Те, чого поки не можна знати",
    keyword: "Терпіння",
    image: "/images/texture-geometry.jpg",
    meaning:
      "Частина невизначеності належить іншій людині. Не перетворюйте брак інформації на осуд себе.",
  },
  {
    id: "tide",
    name: "Приплив",
    subtitle: "Емоція в русі",
    keyword: "Вивільнення",
    image: "/images/texture-ink.jpg",
    meaning:
      "Сила переживання реальна, але не вічна. Дозвольте емоції пройти, перш ніж обирати відповідь.",
  },
  {
    id: "compass",
    name: "Компас",
    subtitle: "Повернення до своїх цінностей",
    keyword: "Напрям",
    image: "/images/situation.jpg",
    meaning:
      "Оберіть відповідь, яка поважає і ваше прагнення до близькості, і вашу гідність.",
  },
];

export const positions = [
  "Ваш внутрішній стан",
  "Динаміка між вами",
  "Конструктивний наступний крок",
];
