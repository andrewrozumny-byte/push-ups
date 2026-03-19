export type DailyMotivator = {
  photoUrl: string;
  quote: string;
  source?: string;
  alt?: string;
};

export type BiblicalMotivator = {
  text: string;
  source?: string;
};

const UNSPLASH_BASE = "https://images.unsplash.com/photo-";
const UNSPLASH_OPTS = "?w=800&q=80";

const PHOTO_IDS = [
  "1506905925346-21bda4d32df4", // Sunrise/mountains
  "1534438327276-14e5300c3a48", // Athlete training
  "1581009146145-b5ef050c2e1e", // Strong hands
  "1448375240586-882707db888b", // Forest path
  "1505118380757-91f5f5632de0", // Ocean waves
  "1477959858617-67f85cf4f1df", // City morning
  "1464822759023-fed622ff2c3b", // Mountains fog
] as const;

export const dailyMotivators: DailyMotivator[] = [
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[0]}${UNSPLASH_OPTS}`, quote: "Маленький прогрес кожен день — це велика перемога." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[1]}${UNSPLASH_OPTS}`, quote: "Не зупиняйся. Ти завжди будеш радий, що продовжив." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[2]}${UNSPLASH_OPTS}`, quote: "Дисципліна — це любов до себе." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[3]}${UNSPLASH_OPTS}`, quote: "Твоє тіло може витримати майже все. Твій розум треба переконати." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[4]}${UNSPLASH_OPTS}`, quote: "Кожне відтискання — це крок до кращої версії себе." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[5]}${UNSPLASH_OPTS}`, quote: "Сила не приходить з того, що ти можеш зробити. Вона приходить з подолання того, чого ти не міг." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[6]}${UNSPLASH_OPTS}`, quote: "Починай там, де ти є. Використовуй те, що маєш. Роби що можеш." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[0]}${UNSPLASH_OPTS}`, quote: "Сьогодні — не повтор минулого. Це нова версія тебе." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[1]}${UNSPLASH_OPTS}`, quote: "Не чекай на натхнення. Дія породжує натхнення." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[2]}${UNSPLASH_OPTS}`, quote: "Твердість — не характер. Твердість — це звичка." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[3]}${UNSPLASH_OPTS}`, quote: "Рахуй не хвилини. Рахуй зроблене." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[4]}${UNSPLASH_OPTS}`, quote: "Тіло відповідає за те, що ти вирішив сьогодні." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[5]}${UNSPLASH_OPTS}`, quote: "Поки ти сумніваєшся — інші просто діють." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[6]}${UNSPLASH_OPTS}`, quote: "Ранок дає шанс, який не можна відкладати." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[0]}${UNSPLASH_OPTS}`, quote: "Йдеш? Значить уже в дорозі." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[1]}${UNSPLASH_OPTS}`, quote: "Залізо не сперечається. Воно просто працює." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[2]}${UNSPLASH_OPTS}`, quote: "Коли важко — саме тоді формується звичка." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[3]}${UNSPLASH_OPTS}`, quote: "Сьогодні зроби. Завтра подякуй собі." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[4]}${UNSPLASH_OPTS}`, quote: "Ти ближче до мети, ніж здається." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[5]}${UNSPLASH_OPTS}`, quote: "План на сьогодні — це обіцянка собі." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[6]}${UNSPLASH_OPTS}`, quote: "Один підхід — і ти повертаєш контроль." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[0]}${UNSPLASH_OPTS}`, quote: "Хай буде важко, але буде зроблено." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[1]}${UNSPLASH_OPTS}`, quote: "Дисципліна тримає тебе, коли мотивація спить." },
  { photoUrl: `${UNSPLASH_BASE}${PHOTO_IDS[2]}${UNSPLASH_OPTS}`, quote: "Повільно. Чітко. До кінця." },
];

export const biblicalMotivators: BiblicalMotivator[] = [
  { text: "Все можу через Христа, що мене зміцнює.", source: "Флп. 4:13" },
  { text: "Будь твердим і мужнім.", source: "Іс.Нав. 1:9" },
  { text: "Той, хто витримає до кінця, спасеться.", source: "Мт. 24:13" },
  { text: "Бо дав нам Бог духа не боязкості, а сили, любові й розсудливості.", source: "2 Тим. 1:7" },
  { text: "А ті, що надіються на Господа, наберуться нової сили.", source: "Іс. 40:31" },
  { text: "Будьте мужні, стійте в вірі, чиніть як мужі.", source: "1 Кор. 16:13" },
  { text: "Але перемагаємо все це Тим, Хто нас полюбив.", source: "Рим. 8:37" },
  { text: "Бог нам прибіжище та сила.", source: "Пс. 46:2" },
  { text: "Бо хто Бог окрім Господа? І хто скеля окрім Бога нашого?", source: "Пс. 18:32" },
  { text: "Не бійся, бо Я з тобою.", source: "Іс. 41:10" },
  { text: "Будь мужній і дужий, не лякайся й не жахайся.", source: "Повт. З. 31:6" },
  { text: "Не бійся того, що маєш зазнати.", source: "Об. 2:10" },
  { text: "Блаженна людина, що витримує випробування.", source: "Як. 1:12" },
  { text: "Тому й ми, маючи навколо такий хмару свідків, звершимо біг.", source: "Євр. 12:1-2" },
  { text: "Не втомлюймося ж, роблячи добро; бо в свій час пожнемо.", source: "Гал. 6:9" },
  { text: "А ви, брати, не втомлюйтеся робити добро.", source: "2 Сол. 3:13" },
  { text: "Щоб ви сповнилися всякою радістю та силою духа.", source: "Кол. 1:11" },
  { text: "Зміцнюйтесь Господом і могутністю сили Його.", source: "Еф. 6:10" },
  { text: "Надійся на Господа, будь мужній і нехай зміцніє серце твоє.", source: "Пс. 27:14" },
  { text: "У світі матимете скорботу; але будьте добрі — Я подолав світ.", source: "Ів. 16:33" },
  { text: "Покладайся на Господа всім серцем своїм.", source: "Прип. 3:5-6" },
  { text: "Господь за мене — не злякаюсь.", source: "Пс. 118:6" },
  { text: "Бо радість перед Господом — підкріплення ваше.", source: "Неем. 8:10" },
  { text: "Господь Бог — сила моя.", source: "Авв. 3:19" },
  { text: "Усе, про що в молитві проситимете, — вірьте, що отримаєте.", source: "Мк. 11:24" },
  { text: "Бог же всякої благодаті… нехай усовершить вас.", source: "1 Петр. 5:10" },
  { text: "Бо хто народжений від Бога, перемагає світ.", source: "1 Ів. 5:4" },
  { text: "Тому ж саме, доклавши всякого старання, додайте до віри вашої доброту.", source: "2 Петр. 1:5-8" },
  { text: "Хіба не знаєте, що ті, що біжать на ристалищі, біжать усі, а нагороду отримує один?", source: "1 Кор. 9:24-25" },
  { text: "Будьте ж міцні й не слабшайте руки ваші.", source: "2 Хр. 15:7" },
  { text: "Жодна зброя, зроблена проти тебе, не матиме успіху.", source: "Іс. 54:17" },
  { text: "Скуштуйте й побачте, як добрий Господь.", source: "Пс. 34:9" },
  { text: "Терпінням вашим спасайте душі ваші.", source: "Лк. 21:19" },
  { text: "Ти маєш силу невелику, і Ти зберіг слово Моє.", source: "Об. 3:8" },
  { text: "Хай буде Господь з тобою; не покину тебе.", source: "3 Цар. 2:2" },
  { text: "Зміцнюйтесь і нехай зміцніє серце ваше.", source: "Пс. 31:24" },
];

export function getRandomMotivator(): BiblicalMotivator {
  return biblicalMotivators[Math.floor(Math.random() * biblicalMotivators.length)];
}

export function getRandomBiblicalMotivator(): BiblicalMotivator {
  return getRandomMotivator();
}

export function getMotivatorOfDay(seed?: number): DailyMotivator {
  const index = seed ?? new Date().getDate();
  return dailyMotivators[index % dailyMotivators.length]!;
}

export function getDailyMotivatorOfDay(seed?: number): DailyMotivator {
  return getMotivatorOfDay(seed);
}
