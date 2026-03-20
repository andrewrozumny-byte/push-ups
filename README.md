## Push-ups tracker (Next.js + Postgres)

Трекер віджимань для групи друзів: головна сторінка з учасниками, профіль кожного учасника (`/[slug]`), адмінка (`/admin`) та Postgres (Vercel Postgres).

### Локальний запуск

- **Клонувати репо**:

```bash
git clone <your-repo-url>
cd push-ups
npm install
```

- **Створити `.env.local`** (можна скопіювати з `.env.example`):

```bash
cp .env.example .env.local
```

- **Запустити**:

```bash
npm run dev
```

### Деплой на Vercel

- **Створити проект на Vercel**:
  - Імпортуйте репозиторій у Vercel (New Project → Import).

- **Підключити Vercel Postgres**:
  - Vercel Dashboard → **Storage** → **Create Database** → Postgres.
  - Після створення Vercel додасть `POSTGRES_URL` у env variables проекту.

- **Додати env variables** (Project → Settings → Environment Variables):
  - `POSTGRES_URL=...`
  - `ADMIN_PASSWORD=твой_пароль`
  - `NEXT_PUBLIC_START_DATE=2025-01-20`
  - `NEXT_PUBLIC_APP_URL=https://твой-сайт.vercel.app`

- **Задеплоїти**:
  - Vercel зробить деплой автоматично після пуша або натисніть Deploy.

### Ініціалізація БД

Після першого деплою відкрийте endpoint:

- `https://твой-сайт.vercel.app/api/init`

Він створить таблиці `users` і `checkins`.

### Sabbath mode (Kyiv)

- **Saturday**: ранковий крон — лише привітання суботи (без мему й кнопок); денний крон не шле повідомлення.
- **Friday after sunset**: вечірній крон і окремий **`/api/cron/friday-sunset`** (п’ятниця 16:00 UTC у `vercel.json`) — тижневий підсумок + привітання перед шабатом.
- **Saturday after sunset**: **`/api/cron/saturday-sunset`** (субота 16:00 UTC) — «субота закінчилась» + кнопки magic check-in.

### Magic links (Telegram «Відмітитись»)

- У кожного учасника є секретний `checkin_token` у БД (генерується при створенні).
- Ранковий cron шле в чат inline-кнопки з посиланням `/magic/[slug]?token=...` (потрібен **`NEXT_PUBLIC_APP_URL`** у Vercel env).
- Для **вже існуючих** користувачів без токена один раз викличте (з заголовком `x-admin-password`):
  - `GET /api/admin/generate-tokens`

### Додати учасників

- Перейдіть на:
  - `https://твой-сайт.vercel.app/admin`
- Введіть `ADMIN_PASSWORD`
- Додайте учасників (ім'я, slug, emoji)

### Нотатки про env

- **Всі env читаються через `process.env`**:
  - `POSTGRES_URL` і `ADMIN_PASSWORD` — server only
  - `NEXT_PUBLIC_*` — доступні в клієнтському коді і підставляються під час білду
