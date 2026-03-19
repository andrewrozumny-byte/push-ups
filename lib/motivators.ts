export type DailyMotivator = {
  photoUrl: string;
  quote: string;
  source?: string;
  alt?: string;
};

export type BiblicalMotivator = {
  text: string;
  source?: string; // e.g. "Флп. 4:13"
};

export const dailyMotivators: DailyMotivator[] = [
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?mountains,sunrise&sig=1",
    quote: "Сила начинается с решения. Сегодня — твой день.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?strength,gym&sig=2",
    quote: "Не вдохновение. Дисциплина. Снова и снова.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?sunrise,strength&sig=3",
    quote: "Свет приходит после самого тёмного шага.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?mountains,climb&sig=4",
    quote: "Ты не бежишь от трудностей — ты растёшь сквозь них.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?ocean,focus&sig=5",
    quote: "Фокус на одно повторение. И ты уже победил.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?forest,determination&sig=6",
    quote: "Шаг за шагом. Твоя стойкость — это маршрут.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?sunrise,training&sig=7",
    quote: "Сегодня — не повтор прошлого. Это новая версия тебя.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?rock,grit&sig=8",
    quote: "Твёрдость — не характер. Твёрдость — практика.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?mountains,run&sig=9",
    quote: "Считай не минуты. Считай сделанное.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?workout,athlete&sig=10",
    quote: "Тело отвечает за то, что ты решил сегодня.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?strength,iron&sig=11",
    quote: "Пока ты сомневаешься — другие просто действуют.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?nature,resolve&sig=12",
    quote: "Маленький прогресс каждый день — это большая победа.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?sunrise,hope&sig=13",
    quote: "Утро даёт шанс, который нельзя отложить.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?mountains,trail&sig=14",
    quote: "Идёшь? Значит уже в пути.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?gym,work&sig=15",
    quote: "Железо не спорит. Оно просто работает.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?ocean,sunrise&sig=16",
    quote: "Твоя стабильность — твой суперсилуэт.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?forest,runner&sig=17",
    quote: "Когда тяжело — именно тогда формируется привычка.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?strength,fitness&sig=18",
    quote: "Сегодня: сделай. Завтра: поблагодари себя.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?mountains,challenge&sig=19",
    quote: "Ты ближе к цели, чем думаешь.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?nature,discipline&sig=20",
    quote: "План на сегодня — это обещание себе.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?sunrise,motivation&sig=21",
    quote: "Один подход — и ты возвращаешь контроль.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?rock,challenge&sig=22",
    quote: "Пусть будет трудно, но будет сделано.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?ocean,training&sig=23",
    quote: "Дисциплина держит тебя, когда мотивация спит.",
  },
  {
    photoUrl: "https://source.unsplash.com/featured/1400x900?mountains,breath&sig=24",
    quote: "Медленно. Чётко. До конца.",
  },
];

export const biblicalMotivators: BiblicalMotivator[] = [
  { text: "Всё могу в укрепляющем меня Иисусе Христе.", source: "Флп. 4:13" },
  { text: "Будь твёрд и мужествен.", source: "Иис.Нав. 1:9" },
  { text: "Претерпевший же до конца спасётся.", source: "Мф. 24:13" },
  { text: "Потому что не дал нам Бог духа боязни, но силы и любви и целомудрия.", source: "2 Тим. 1:7" },
  { text: "А надеющиеся на Господа обновятся в силе.", source: "Ис. 40:31" },
  { text: "Будьте мужественны, стойте в вере, действуйте как мужчины.", source: "1 Кор. 16:13" },
  { text: "Но всё сие преодолеваем силою Возлюбившего нас.", source: "Рим. 8:37" },
  { text: "Бог нам прибежище и сила.", source: "Пс. 46:2" },
  { text: "Ибо, кто Бог, кроме Господа? И кто твердыня, кроме Бога нашего?", source: "Пс. 17:32" },
  { text: "Не бойся, ибо Я с тобою.", source: "Ис. 41:10" },
  { text: "Будь тверд и мужествен: не страшись и не ужасайся.", source: "Втор. 31:6" },
  { text: "Не бойся того, что тебе предстоит претерпеть.", source: "Откр. 2:10" },
  { text: "Блажен человек, который переносит искушение.", source: "Иак. 1:12" },
  { text: "Посему и мы, имея вокруг себя такое облако свидетелей, свергнем с себя всякое бремя…", source: "Евр. 12:1-2" },
  { text: "Не унывайте, делая добро; ибо в своё время пожнём, если не ослабеем.", source: "Гал. 6:9" },
  { text: "Братья, не унывайте, делая добро.", source: "2 Фес. 3:13" },
  { text: "Чтобы вам исполниться бодростью и силою духа.", source: "Кол. 1:11" },
  { text: "Укрепляйтесь Господом и могуществом силы Его.", source: "Еф. 6:10" },
  { text: "Терпеливо надейся на Господа.", source: "Пс. 26:14" },
  { text: "В мире будете иметь скорбь; но мужайтесь: Я победил мир.", source: "Ин. 16:33" },
  { text: "Надейся на Господа всем сердцем твоим.", source: "Притч. 3:5-6" },
  { text: "Господь на стороне моей: не устрашусь.", source: "Пс. 118:6" },
  { text: "Не скорбите, ибо радость пред Господом — подкрепление для вас.", source: "Неем. 8:10" },
  { text: "Ибо Господь Бог — сила моя.", source: "Авв. 3:19" },
  { text: "Потому говорю вам: всё, чего ни будете просить в молитве, верьте, что получите — и будет вам.", source: "Мк. 11:24" },
  { text: "Бог же всякой благодати… да усовершит вас.", source: "1 Петр. 5:10" },
  { text: "Ибо кто рожден от Бога, побеждает мир.", source: "1 Ин. 5:4" },
  { text: "И вы всячески сохраняйте благодать Господа нашего.", source: "2 Петр. 1:5-8" },
  { text: "Не знаете ли, что бегущие на ристалище бегут все, но один получает награду…", source: "1 Кор. 9:24-25" },
  { text: "Итак, будьте твёрды, и пусть руки ваши не ослабевают.", source: "2 Пар. 15:7" },
  { text: "Ни одно оружие, сделанное против тебя, не будет успешно.", source: "Ис. 54:17" },
  { text: "Вкусите и увидите, как благ Господь.", source: "Пс. 33:9" },
  { text: "Сберегая ваши души в терпении, вы победите.", source: "Лк. 21:19" },
  { text: "Ты знаешь, что ты носишь имя, и не отступил.", source: "Откр. 3:8" },
  { text: "Да будет Господь с тобою: я не оставлю тебя.", source: "3 Цар. 2:2" },
  { text: "Крепитесь и не унывайте; будьте сильны.", source: "Пс. 31:24" },
  { text: "Укрепитесь силою в Господе и могуществом силы Его.", source: "Еф. 6:10" },
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
