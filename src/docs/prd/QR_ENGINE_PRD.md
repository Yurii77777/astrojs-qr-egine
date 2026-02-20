# QR Code Constructor — Product Requirements Document

**Стек:** Astro + Vite · React · TypeScript · Tailwind CSS · ShadCN UI · Lucide Icons
**Дата:** 2026-02-19
**Статус:** Draft v1.0

---

## 1. Огляд продукту

Веб-застосунок з власним QR-рушієм (без сторонніх бібліотек генерації), який дозволяє користувачу сконструювати, кастомізувати та скачати QR-код. Рушій реалізує стандарт ISO/IEC 18004 з нуля на TypeScript.

### 1.1 Навіщо свій рушій

Популярні пакети (`qrcode`, `qr-code-styling`, `qrcode.react`) або не мають кастомізації зовнішнього вигляду, або делегують QR-математику чужій бібліотеці. Наша мета — повний контроль над кожним шаром: від Reed-Solomon до Canvas/SVG-рендерингу.

### 1.2 Що НЕ є метою

- Підтримка Kanji-режиму (японські символи) — поза скоупом v1
- Structured Append (розбивка на кілька QR-кодів)
- MicroQR
- Офлайн-застосунок або мобільний додаток

---

## 2. Функціональні вимоги

### 2.1 Три розміри QR

| Розмір     | QR Version | Матриця         | Макс. байт (H) | Типовий юзкейс   |
| ---------- | ---------- | --------------- | -------------- | ---------------- |
| S (Small)  | 1–5        | 21×21 – 37×37   | до 45 байт     | короткі URL, ID  |
| M (Medium) | 6–15       | 41×41 – 77×77   | до 154 байт    | стандартні URL   |
| L (Large)  | 16–25      | 81×81 – 117×117 | до 520 байт    | довгі URL, vCard |

> Версія всередині кожного діапазону обирається **автоматично** — найменша, що вміщує payload.

### 2.2 Error Correction рівні

| Рівень | Відновлення | Коли використовувати           |
| ------ | ----------- | ------------------------------ |
| L      | ~7%         | чистий екран                   |
| M      | ~15%        | загального призначення         |
| Q      | ~25%        | друк, незначне пошкодження     |
| H      | ~30%        | з логотипом, агресивний дизайн |

> За наявності вбудованого логотипу — примусово H.

### 2.3 Вхідні дані

- Текстове поле (URL, текст, vCard-шаблон)
- Автоматичний вибір режиму кодування: Numeric → Alphanumeric → Byte (UTF-8 через ECI 26)
- Лічильник символів + індикатор заповненості ємності

### 2.4 Кастомізація

#### Модулі (точки)

- Форма: квадрат · кіло (rounded) · кружечок · ромб
- Колір: суцільний · лінійний градієнт · радіальний градієнт

#### Finder-паттерни (кути)

- Зовнішній квадрат: форма (квадрат / rounded)
- Внутрішній квадрат: форма (квадрат / rounded / крапля)
- Незалежний колір від модулів

#### Фон

- Суцільний колір або прозорий

#### Логотип

- Завантаження PNG/SVG
- Розмір: 10–30% від площі коду
- Auto-excavate зони навколо логотипу (прибирати модулі під зображенням)

#### Тихая зона (Quiet Zone)

- Налаштовується: 0, 2, 4 (стандарт), 6 модулів

### 2.5 Експорт

- SVG (вектор, нескінченне масштабування)
- PNG (растр з налаштуванням DPI/розміру в px)
- Копіювання SVG-рядка у буфер обміну

---

## 3. Архітектура рушія

### 3.1 Pipeline (суворо послідовний)

```
Input
  └─► [1] Analyzer        — вибір режиму, оцінка версії
  └─► [2] Encoder         — побудова бітового потоку
  └─► [3] ECCoder         — Reed-Solomon по блоках
  └─► [4] Interleaver     — перемежування data + EC codewords
  └─► [5] MatrixBuilder   — резервування функціональних паттернів
  └─► [6] DataPlacer      — zigzag-розміщення даних
  └─► [7] MaskEvaluator   — перебір 8 масок + penalty-оцінка
  └─► [8] FormatWriter    — запис format/version information
  └─► [9] Renderer        — Canvas (live preview) / SVG (vector export) / PNG (raster export)
```

Кожен крок — чиста функція: `(input) => output`. Жодного глобального стану.

### 3.2 Структура директорій

```
src/
├── engine/                    # QR-рушій (чистий TypeScript, без DOM)
│   ├── constants/
│   │   ├── tables.ts          # EC table (160 рядків), alignment coords, remainder bits
│   │   ├── gf256.ts           # GF(256) EXP/LOG таблиці + арифметика
│   │   └── generators.ts      # Генераторні поліноми RS (37 варіантів)
│   ├── analyzer.ts            # Вибір режиму (Numeric/Alphanum/Byte) та версії
│   ├── encoder.ts             # Побудова бітового потоку
│   ├── rs.ts                  # Reed-Solomon кодування
│   ├── interleaver.ts         # Перемежування codewords
│   ├── matrix.ts              # QR-матриця + функціональні паттерни
│   ├── placer.ts              # Zigzag-розміщення даних
│   ├── masker.ts              # 8 масок + penalty scoring
│   ├── format.ts              # Format info & Version info (BCH)
│   └── index.ts               # Публічний API: generateQR(text, options) → QRMatrix
│
├── renderer/                  # Рендерери (залежать від DOM / Canvas / SVG)
│   ├── canvas.ts              # Canvas2D — основний рендерер для live preview
│   ├── svg.ts                 # SVG-рядок — генерується тільки для векторного експорту
│   └── types.ts               # RenderOptions interface (спільний для обох рендерерів)
│
├── components/                # React-компоненти
│   ├── QRPreview.tsx          # Live-preview Canvas
│   ├── QRControls/
│   │   ├── SizeSelector.tsx
│   │   ├── ECLevelSelector.tsx
│   │   ├── ModuleStylePicker.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── LogoUploader.tsx
│   │   └── ExportPanel.tsx
│   └── ui/                    # ShadCN перевикористовувані компоненти
│
├── hooks/
│   ├── useQRGenerator.ts      # Обгортка над engine (useMemo + debounce)
│   └── useExport.ts           # Логіка завантаження файлів
│
└── pages/
    └── index.astro            # Головна сторінка
```

### 3.3 Публічний API рушія

```typescript
// engine/index.ts

export interface QROptions {
  ecLevel: 'L' | 'M' | 'Q' | 'H';
  sizeClass: 'S' | 'M' | 'L'; // обмежує діапазон версій
  minVersion?: number; // override (для тестів)
}

export interface QRMatrix {
  size: number; // side in modules
  version: number;
  modules: boolean[][]; // true = dark module
  isFunction: boolean[][]; // true = function pattern (не перемальовувати кастомно)
}

export function generateQR(text: string, options: QROptions): QRMatrix;
```

### 3.4 Renderer API

```typescript
// renderer/types.ts

export interface ModuleStyle {
  shape: 'square' | 'rounded' | 'circle' | 'diamond';
  color: SolidColor | LinearGradient | RadialGradient;
}

export interface FinderStyle {
  outerShape: 'square' | 'rounded';
  innerShape: 'square' | 'rounded' | 'blob';
  color: SolidColor;
}

export interface RenderOptions {
  matrix: QRMatrix;
  moduleStyle: ModuleStyle;
  finderStyle: FinderStyle;
  background: SolidColor | 'transparent';
  quietZone: 0 | 2 | 4 | 6;
  logo?: {
    src: string; // data URL
    sizeRatio: number; // 0.1–0.3
    excavate: boolean;
  };
  pixelSize: number; // px per module
}

// Canvas — основний рендерер (live preview у браузері)
export function renderCanvas(options: RenderOptions, ctx: CanvasRenderingContext2D): void;

// SVG — тільки для векторного експорту (генерує SVG-рядок)
export function renderSVG(options: RenderOptions): string;
```

---

## 4. Детальний план реалізації по фазах

### Фаза 1 — Ядро рушія (найскладніше)

#### 1.1 GF(256) арифметика (`engine/constants/gf256.ts`)

**Що робити:**

- Побудувати таблиці EXP[256] та LOG[256]
- Примітивний поліном: `x^8 + x^4 + x^3 + x^2 + 1` = `285`
- Функції: `gfAdd(a,b)` = `a XOR b`, `gfMul(a,b)`, `gfPow(a,n)`, `gfDiv(a,b)`

**Складність:** середня. Головна пастка — `EXP[255] = EXP[0] = 1` (цикл поля), тому LOG[1] = 0 AND EXP[255] теж 1. При множенні: `exp[(log[a] + log[b]) % 255]`.

```typescript
const EXP = new Uint8Array(512); // дублюємо для зручності wrap-around
const LOG = new Uint8Array(256);
let x = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = x;
  EXP[i + 255] = x;
  LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 285 : 0);
}
```

#### 1.2 Reed-Solomon (`engine/rs.ts`)

**Що робити:**

- Функція `buildGenerator(n: number): Uint8Array` — множення `(x - α^i)` для i=0..n-1
- Функція `rsEncode(data: Uint8Array, nEC: number): Uint8Array` — повертає тільки EC codewords

**Складність:** висока. Генераторний поліном треба будувати в GF(256). Ділення: polynomial long division з XOR і GF-multiplication.

**Тест:** Version 1-M, текст `'HELLO WORLD'` (alphanumeric). EC codewords мають бути: `[196, 35, 39, 119, 235, 215, 231, 226, 93, 23]`.

#### 1.3 EC Table (`engine/constants/tables.ts`)

Жорстко задати таблицю для версій 1–40 × 4 рівні = 160 записів:

```typescript
interface ECBlock {
  totalCodewords: number;
  ecCodewordsPerBlock: number;
  group1: { blocks: number; dataCodewords: number };
  group2?: { blocks: number; dataCodewords: number };
}
type ECTable = Record<number, Record<'L' | 'M' | 'Q' | 'H', ECBlock>>;
```

Це найбільший lookup-файл (~400 рядків). Дані брати з офіційних таблиць ISO або thonky.com.

**Складність:** низька (копіювання таблиці), але критична для коректності.

#### 1.4 Analyzer та Version Selection (`engine/analyzer.ts`)

**Алгоритм:**

1. Перевірити чи текст — тільки цифри → Numeric
2. Чи тільки символи alphanumeric-сету (0-9, A-Z, SP $%\*+-./;) → Alphanumeric
3. Інакше → Byte (UTF-8)
4. Порахувати кількість символів/байт
5. Ітеративно знайти мінімальну версію в діапазоні sizeClass:
   - Взяти character count indicator width для поточної версії (залежить від версії!)
   - Порахувати загальну кількість біт
   - Порівняти з доступними data codewords для цієї версії та EC рівня

**Складність:** середня. Пастка — character count indicator width змінюється на version 10 і 27.

#### 1.5 Encoder (`engine/encoder.ts`)

**Що робити:**

- Numeric: групи по 3 → 10 біт (2 → 7, 1 → 4)
- Alphanumeric: пари → 11 біт, одиночний → 6 біт
- Byte: UTF-8, попередити ECI designator `000026` якщо є non-ISO-8859-1 символи
- Додати Mode Indicator (4 біти), Character Count, термінатор, padding bits (до кратності 8), padding bytes `0xEC / 0x11`

**Пастка:** Byte mode character count — кількість байт, а не символів (UTF-8 emoji = 4 байти).

#### 1.6 Interleaver (`engine/interleaver.ts`)

**Алгоритм:**

```
для кожного блоку в групах → RS.encode() → масив EC codewords
Interleaved data = беремо i-й codeword з кожного блоку по черзі
Interleaved EC = беремо i-й EC codeword з кожного блоку по черзі
Результат = interleaved_data + interleaved_EC + remainder_bits (нулі)
```

**Пастка:** блоки в group2 мають на 1 data codeword більше. При interleaving після коротких блоків треба пропустити і додати ці "зайві" codewords наприкінці data-секції.

#### 1.7 Matrix Builder (`engine/matrix.ts`)

**Що робити:**

- Ініціалізувати матрицю size×size зі значенням `null` (не заповнено)
- Окрема матриця `isFunction[size][size]` = `false`
- Намалювати Finder паттерни (3 шт) + сепаратори
- Намалювати Timing паттерни (рядок 6, колонка 6)
- Намалювати Alignment паттерни (для version ≥ 2, координати з таблиці)
- Поставити Dark Module: `(4*version+9, 8) = true`
- Зарезервувати Format Information зони (позначити як function, але не заповнювати)
- Зарезервувати Version Information зони (version ≥ 7)

**Складність:** висока через деталі. Alignment паттерни не ставляться де перетинаються з Finder.

**Пастка Dark Module:** координати `row = 4*V+9`, `col = 8`. V=1 → row=13, V=7 → row=37.

#### 1.8 Data Placer (`engine/placer.ts`)

**Zigzag алгоритм:**

```
col = size - 1
direction = UP (-1)
bitIndex = 0

while col > 0:
  if col == 6: col -= 1  // пропускаємо timing column

  for row in (0..size-1 if direction==DOWN else size-1..0):
    for dcol in [0, -1]:   // права колонка, потім ліва
      c = col + dcol
      if not isFunction[row][c]:
        matrix[row][c] = bits[bitIndex++] XOR maskFn(row, c)

  col -= 2
  direction *= -1
```

**Складність:** висока. Пастки: column 6 skip, правильний порядок (права колонка завжди першою), direction flip після кожної пари колонок.

#### 1.9 Mask Evaluator (`engine/masker.ts`)

- 8 масок: чисті математичні умови (i=row, j=col)
- Penalty: 4 правила (consecutive runs, 2×2 blocks, finder-like, ratio)
- Обрати маску з мінімальним penalty score
- Записати Format Information з обраною маскою та EC рівнем

**Пастка:** EC bits в Format Info: L=01, M=00, Q=11, H=10. НЕ 00,01,10,11!

#### 1.10 Format & Version Info (`engine/format.ts`)

**Format Information (15 біт):**

- `[EC 2b][mask 3b]` → доповнити до 15 біт BCH кодом
- BCH generator: `10100110111` (x^10+x^8+x^5+x^4+x^2+x+1)
- XOR маска: `101010000010010`
- Записати в дві позиції навколо top-left finder та дзеркально

**Version Information (18 біт, version ≥ 7):**

- `[version 6b]` → BCH → 18 біт
- BCH generator: `1111100100101`
- Записати в два 6×3 блоки

---

### Фаза 2 — Рендерери (Canvas preview + SVG export)

> **Архітектурне рішення:** Canvas — основний рендерер для live preview (швидкий, нативне малювання). SVG генерується лише при експорті (вектор, нескінченне масштабування). PNG експортується напряму з Canvas через `canvas.toBlob()`.

#### 2.1 Canvas рендерер (`renderer/canvas.ts`) — live preview

**Що робити:**

- Прийняти `QRMatrix` + `RenderOptions` + `CanvasRenderingContext2D`
- Для кожного темного модуля малювати форму на Canvas:
  - `square`: `ctx.fillRect()`
  - `rounded`: `ctx.roundRect()` або ручний `ctx.arc()` + `ctx.lineTo()`
  - `circle`: `ctx.arc()` + `ctx.fill()`
  - `diamond`: `ctx.moveTo()` + `ctx.lineTo()` (4 точки ромба)
- Finder паттерни — малювати окремо з `finderStyle` (ідентифікація по координатах, не по `isFunction`)
- Градієнти: `ctx.createLinearGradient()` / `ctx.createRadialGradient()`
- Quiet zone: offset через `ctx.translate(quietZone * pixelSize, quietZone * pixelSize)`
- High-DPI: враховувати `devicePixelRatio` для чіткості на Retina

**Складність:** середня. Canvas API простіший за SVG-генерацію рядків, але треба правильно працювати з DPI scaling.

#### 2.2 SVG рендерер (`renderer/svg.ts`) — vector export

**Що робити:**

- Прийняти `QRMatrix` + `RenderOptions`, повернути SVG-рядок
- Та сама логіка кастомізації (форми, кольори, finder стилі), але виражена через SVG елементи:
  - `square`: `<rect>`
  - `rounded`: `<rect rx="..." ry="...">` або `<path>` з rounded corners
  - `circle`: `<circle>`
  - `diamond`: `<polygon>` або `<path>`
- Gradient: `<defs><linearGradient>` або `<radialGradient>`, `fill="url(#g)"`
- Quiet zone: offset через `viewBox` або `<g transform="translate()">`
- `gradientUnits="userSpaceOnUse"` — щоб градієнт покривав весь код, а не окремий модуль

**Складність:** середня. SVG рендерер повторює логіку Canvas, але генерує рядок замість імперативного малювання.

#### 2.3 Спільна логіка (`renderer/shared.ts`)

Обидва рендерери використовують однакову логіку:

- Визначення Finder-модулів по координатах (`isFinderModule`)
- Logo excavation (клонування матриці, очищення зони)
- Обчислення розмірів з quiet zone

Виділити в окремий файл, щоб Canvas і SVG не дублювали код.

#### 2.4 Logo Excavation

**Алгоритм excavate:**

1. Визначити прямокутник логотипу в координатах матриці
2. Для кожного модуля в цьому прямокутнику — встановити `module = false` (light)
3. Це "з'їдає" ємність EC; саме тому потрібен H рівень

**Важливо:** excavate виконується після побудови матриці але до рендерингу. НЕ модифікувати оригінальний `QRMatrix` — клонувати.

---

### Фаза 3 — React UI

#### 3.1 Layout

```
┌─────────────────────────────────────────┐
│  Header: QR Engine Logo + назва         │
├────────────────┬────────────────────────┤
│                │                        │
│   Controls     │    QR Preview          │
│   Panel        │    (живий Canvas)      │
│   (left)       │                        │
│                │   [ Export SVG ]       │
│                │   [ Export PNG ]       │
└────────────────┴────────────────────────┘
```

#### 3.2 Компоненти

**`SizeSelector`** — 3 кнопки-картки (S/M/L) з описом і прикладом довжини URL

**`ECLevelSelector`** — 4 кнопки з поясненням та іконкою (Shield від Lucide)

**`ModuleStylePicker`** — 4 іконки-форми (SVG превʼю кожної форми)

**`ColorPicker`** — вкладки: Solid | Linear | Radial

- Solid: `<input type="color">` + hex-поле
- Gradient: 2 color stops + кут/центр

**`LogoUploader`** — drag-n-drop зона + слайдер розміру

**`QRPreview`** — Live Canvas preview, debounced 150ms, показує помилку якщо текст не вміщується в обраний size

**`ExportPanel`** — кнопки з іконками Download + Copy (Lucide: `Download`, `Copy`, `Check`)

#### 3.3 State Management

Простий `useReducer` або `useState` в кореневому компоненті. Не Redux/Zustand — зайве для v1.

```typescript
interface QRState {
  text: string;
  sizeClass: 'S' | 'M' | 'L';
  ecLevel: 'L' | 'M' | 'Q' | 'H';
  moduleStyle: ModuleStyle;
  finderStyle: FinderStyle;
  background: string;
  quietZone: 0 | 2 | 4 | 6;
  logo: LogoConfig | null;
}
```

#### 3.4 Performance

- `useMemo` для `generateQR` (дорого — викликати тільки при зміні `text`, `sizeClass`, `ecLevel`)
- Canvas re-render у `useEffect` при зміні стилю (Canvas API — імперативний, не декларативний)
- Debounce 150ms на текстове поле

---

### Фаза 4 — Export та фінішні штрихи

#### 4.1 PNG Export

Оскільки preview вже рендериться на Canvas, PNG export спрощується:

1. Створити offscreen canvas з потрібним розміром (pixelSize × totalModules)
2. Викликати `renderCanvas()` на offscreen canvas
3. `canvas.toBlob('image/png')` → завантажити

**Масштаб:** надати вибір розміру в px (256, 512, 1024, custom).

#### 4.2 SVG Export

1. Викликати `renderSVG()` з поточними `RenderOptions`
2. Завантажити як `.svg` файл або скопіювати SVG-рядок у буфер обміну

#### 4.3 Перевірка сканованості

Додати візуальний інтикатор у Preview:

- Зелений: версія обрана, код валідний
- Жовтий: payload близько до ліміту (>85% ємності)
- Червоний: payload перевищує ліміт для обраного size

#### 4.4 URL пресети

Швидкі кнопки: "URL", "Текст", "vCard", "WiFi" — підставляють шаблон у поле вводу.

---

## 5. Складні місця — детальний розбір

### 5.1 Reed-Solomon (складність: ★★★★★)

Найскладніша частина. Потребує:

- Бездоганної GF(256) арифметики
- Правильного побудови генераторного полінома (37 варіантів)
- Polynomial long division без плаваючих точок

**Стратегія тестування:** порівняти EC codewords для Version 1-M, "HELLO WORLD" з еталонним значенням зі специфікації.

### 5.2 Interleaving з нерівними блоками (складність: ★★★★)

Версії 5+ мають group1 та group2 з різною кількістю data codewords. Неправильний interleaving дає код, який 100% не скануватиметься.

**Стратегія:** unit-тест: версія 5-Q → перевірити фінальний масив codewords побайтово.

### 5.3 Zigzag Data Placement (складність: ★★★★)

Три тонкощі одночасно: skip column 6, правильний напрямок, правильний порядок всередині 2-col strip.

**Стратегія:** написати окремий тест що рахує кількість заповнених data-модулів = total data + EC codewords \* 8 + remainder bits.

### 5.4 Penalty Scoring / Rule 3 (складність: ★★★)

Finder-like pattern `0000 1011101` та `1011101 0000` — легко помилитися з зсувом.

**Стратегія:** взяти відомий вирендерений QR і перевірити що penalty score співпадає.

### 5.5 Rendering кастомних форм Finder (складність: ★★★)

Finder паттерн — 7×7 блок. Щоб замінити його на rounded/blob треба (однаково для Canvas і SVG):

- Ідентифікувати модулі як "частина Finder" по координатах (не по `isFunction`)
- Canvas: замінити стандартні `fillRect()` на кастомні `path` операції
- SVG: замінити `<rect>` на кастомний `<path>`
- Не торкатися функціональних модулів всередині (timing, alignment)

---

## 6. Технологічний стек та інструментарій

### 6.1 Проект

```bash
npm create astro@latest -- --template minimal
npx astro add react tailwind
npx shadcn@latest init
```

### 6.2 ShadCN компоненти для встановлення

```bash
npx shadcn@latest add button card input label slider tabs tooltip badge
```

### 6.3 Lucide іконки (використовувані)

- `Download` — PNG/SVG export
- `Copy`, `Check` — копіювання у буфер
- `Shield` — EC рівень
- `Zap` — Small size
- `Globe` — Medium size
- `Database` — Large size
- `Image` — логотип
- `RefreshCw` — regenerate
- `AlertCircle` — помилка ємності

### 6.4 Vite config

Рушій (`src/engine/`) — чистий TypeScript без залежностей від DOM. Це дозволяє:

- Unit-тестування в Node.js (Vitest)
- Потенційний SSR рендеринг у Astro

### 6.5 Тестування

```
Vitest для unit-тестів engine/
  ├── gf256.test.ts      — перевірка арифметики (known values)
  ├── rs.test.ts         — EC codewords для "HELLO WORLD" Version 1-M
  ├── encoder.test.ts    — бітові потоки для відомих прикладів
  ├── matrix.test.ts     — розміщення Finder, кількість зарезервованих модулів
  └── e2e.test.ts        — generateQR() → декодувати через jsQR → assert equals input
```

---

## 7. Порядок розробки (рекомендований)

```
Тиждень 1: engine/constants/ + gf256 + rs (з unit-тестами)
Тиждень 2: encoder + tables + analyzer + interleaver
Тиждень 3: matrix + placer + masker + format (повний pipeline)
Тиждень 4: Canvas renderer (базовий квадратний) + SVG export renderer
Тиждень 5: React UI + live Canvas preview + базовий export
Тиждень 6: кастомні форми + градієнти + логотип + PNG export (з Canvas напряму)
Тиждень 7: polish, edge cases, accessibility, responsive
```

---

## 8. Відомі пастки (checklist перед кожним кроком)

- [ ] EC level bits: **L=01, M=00, Q=11, H=10** (НЕ 0,1,2,3)
- [ ] Dark Module завжди є: `(4*version+9, 8)` = dark
- [ ] Version Info тільки від version 7+
- [ ] Character Count width залежить від VERSION RANGE (1-9, 10-26, 27-40)
- [ ] Byte mode count = байти (не символи для UTF-8 multibyte)
- [ ] Zigzag ПРОПУСКАЄ колонку 6 (timing pattern)
- [ ] Маска XOR тільки до data модулів, НЕ до функціональних
- [ ] RS generator exponents: mod **255** (не 256)
- [ ] Remainder bits: V2-6=7, V14-20=3, V21-27=4, V28-34=3 (інші = 0)
- [ ] Alignment паттерни НЕ перекривають Finder areas
- [ ] Format Info XOR маска: `101010000010010`
- [ ] Логотип > 30% площі → помилка або примусовий H рівень

---

## 9. Посилання

- [Thonky QR Tutorial](https://www.thonky.com/qr-code-tutorial/) — найповніший покроковий гайд
- [Nayuki QR Step by Step](https://www.nayuki.io/page/creating-a-qr-code-step-by-step) — еталонна реалізація
- [ISO/IEC 18004:2015](https://www.iso.org/standard/62021.html) — офіційний стандарт
- [jsQR](https://github.com/cozmo/jsQR) — для e2e тестів (декодер)
- [QR Code Capacity Table](https://www.qrcode.com/en/about/version.html) — DENSO WAVE
