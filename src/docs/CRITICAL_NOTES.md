# Critical Notes — QR Engine Implementation

Зібрані edge cases, пастки та важливі деталі по кожному модулю.
Читати **перед** початком реалізації відповідного файлу.

---

## engine/constants/gf256.ts

### EXP таблиця — дублювання до 512 елементів

```ts
const EXP = new Uint8Array(512);
```

При множенні `gfMul(a, b)` = `EXP[(LOG[a] + LOG[b])]` — сума логарифмів може дати індекс > 254.
Без дублювання потрібен explicit mod: `EXP[(LOG[a] + LOG[b]) % 255]`.
З дублюванням mod не потрібен і код простіший. Обидва варіанти коректні, але дублювання стандартніше.

### LOG[0] — невизначений

`LOG[0]` не має значення у GF(256) (log від нуля = -∞).
Ніколи не викликати `LOG[0]` — це UB. Захистити `gfMul`:

```ts
function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]]; // safe з 512-елементною EXP
}
```

### Побудова таблиці — правильний XOR

```ts
let x = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x = x << 1;
  if (x >= 256) x ^= 285; // 285 = 0x11D = примітивний поліном
}
EXP[255] = EXP[0]; // = 1, для wrap-around при дублюванні
```

`x >= 256`, не `x > 255` — те саме, але явніше. Не `x & 0x100` — менш читабельно.

---

## engine/constants/generators.ts

### 37 поліномів, не 40×4=160

Хоча комбінацій version×ECLevel = 160, унікальних значень `n` (кількість EC codewords на блок) = **37**.
Генерувати поліном треба тільки для унікальних `n`.

### Exponent wrap — mod 255, не 256

При побудові генераторного полінома через множення `(x - α^i)`:

```ts
// ПРАВИЛЬНО:
newPoly[j] ^= gfMul(poly[j - 1], EXP[i % 255]);
// НЕПРАВИЛЬНО:
newPoly[j] ^= gfMul(poly[j - 1], EXP[i % 256]); // corrupts at i=255
```

---

## engine/constants/tables.ts

### Структура EC таблиці — два типи блоків

Більшість версій мають **дві групи блоків** (group1 + group2) з різною кількістю data codewords:

```ts
interface ECBlockGroup {
  count: number; // кількість блоків у групі
  dataBytes: number; // data codewords у кожному блоці групи
  ecBytes: number; // EC codewords у кожному блоці (однакові для обох груп)
}
interface ECEntry {
  totalDataBytes: number;
  group1: ECBlockGroup;
  group2?: ECBlockGroup; // відсутня у простих версіях
}
```

`ecBytes` однаковий для group1 і group2 в межах одного version+level.

### Перевірка цілісності таблиці

Після заповнення таблиці верифікувати:

```
totalDataBytes === group1.count * group1.dataBytes + (group2?.count ?? 0) * (group2?.dataBytes ?? 0)
```

Якщо не збігається — в таблиці помилка.

### Remainder bits — не нулі в даних, а хвіст бітстріму

```ts
const REMAINDER_BITS: Record<number, number> = {
  // version: bits
  2: 7,
  3: 7,
  4: 7,
  5: 7,
  6: 7,
  14: 3,
  15: 3,
  16: 3,
  17: 3,
  18: 3,
  19: 3,
  20: 3,
  21: 4,
  22: 4,
  23: 4,
  24: 4,
  25: 4,
  26: 4,
  27: 4,
  28: 3,
  29: 3,
  30: 3,
  31: 3,
  32: 3,
  33: 3,
  34: 3,
};
// всі інші версії = 0
```

Це нульові біти що додаються після інтерливінгу щоб вирівняти бітстрім під кількість модулів.

---

## engine/analyzer.ts

### Alphanumeric charset — лише uppercase

```ts
const ALPHANUM_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
// 45 символів, індекси 0..44
```

Якщо хоча б один символ lowercase → режим Byte. Не конвертувати автоматично в uppercase.

### Character count indicator — ширина залежить від VERSION RANGE

```ts
function getCountBits(mode: Mode, version: number): number {
  if (version <= 9) {
    return { Numeric: 10, Alphanumeric: 9, Byte: 8, Kanji: 8 }[mode];
  } else if (version <= 26) {
    return { Numeric: 12, Alphanumeric: 11, Byte: 16, Kanji: 10 }[mode];
  } else {
    return { Numeric: 14, Alphanumeric: 13, Byte: 16, Kanji: 12 }[mode];
  }
}
```

**Критично:** Byte mode стрибає з 8 до 16 біт на version 10. Hardcode 8 = тихе пошкодження довгих URL.

### Version selection — ітеративна, не однопрохідна

Вибір версії залежить від розміру character count indicator, який залежить від версії.
Алгоритм: стартуємо з мінімальної версії діапазону, перебираємо вгору до першої що вміщує payload.

```ts
for (let v = minV; v <= maxV; v++) {
  const countBits = getCountBits(mode, v);
  const totalBits = 4 + countBits + dataBits; // mode + count + data
  const capacity = EC_TABLE[v][ecLevel].totalDataBytes * 8;
  if (totalBits <= capacity) return v;
}
throw new Error('Payload too large for selected size class');
```

### UTF-8 byte count — не charAt, а TextEncoder

```ts
const byteLen = new TextEncoder().encode(text).length;
```

Emoji та кириличні символи = 2–4 байти кожен. `text.length` повертає кількість UTF-16 code units, не байт.

---

## engine/encoder.ts

### Numeric групування

```
"12345" → ["123", "45"]
123 → 10 bits
45  → 7 bits  (2 digits)
```

Залишок 1 цифра → 4 bits. Залишок 2 цифри → 7 bits. 3 цифри → 10 bits.

### Alphanumeric pairs

```ts
const val = ALPHANUM_IDX[char1] * 45 + ALPHANUM_IDX[char2]; // → 11 bits
// одиночний залишковий символ → 6 bits
```

### Padding bytes — суворий порядок

Після термінатора (`0000`, до 4 біт) та вирівнювання до байта:

```
0xEC, 0x11, 0xEC, 0x11, ... до заповнення capacity
```

Не `0x00`. Не `0xFF`. Саме `0xEC` і `0x11` — так прописано у стандарті.

### ECI для UTF-8

Якщо текст містить символи поза ISO-8859-1 (тобто code point > 255):

```
ECI mode indicator: 0111 (4 bits)
ECI designator 26:  00011010 (1 byte, оскільки < 128)
потім Byte mode сегмент з UTF-8 байтами
```

Більшість сканерів читають UTF-8 Byte-mode і без ECI — але для строгої відповідності стандарту ECI потрібен.

---

## engine/rs.ts

### Polynomial long division — порядок коефіцієнтів

Поліном зберігається **від старшого до молодшого** степеня:

```
[a_n, a_{n-1}, ..., a_1, a_0]
index 0 = старший коефіцієнт
```

При діленні ітеруємо зліва направо. Змішати порядок = тихе неправильне кодування.

### Алгоритм encode

```ts
function rsEncode(data: Uint8Array, nEC: number, generator: Uint8Array): Uint8Array {
  const buf = new Uint8Array(data.length + nEC);
  buf.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = buf[i];
    if (coef !== 0) {
      for (let j = 0; j < generator.length; j++) {
        buf[i + j] ^= gfMul(generator[j], coef);
      }
    }
  }
  return buf.slice(data.length); // тільки EC частина
}
```

`if (coef !== 0)` — обов'язкова перевірка, бо `gfMul(0, x)` = 0 і `LOG[0]` = UB.

### Еталонний тест (Version 1-M, "HELLO WORLD")

```
Data codewords:    [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236]
EC codewords:      [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]
```

Якщо EC codewords не збіглися — в gfMul або buildGenerator є баг.

---

## engine/interleaver.ts

### Нерівні блоки — extra codeword в кінці

Коли є group2 і `group2.dataBytes > group1.dataBytes` (різниця завжди = 1):

```
Прохід по стовпцях:
  for (let col = 0; col < maxDataBytes; col++) {
    for кожного блоку в group1+group2:
      if (col < block.dataBytes) → взяти block.data[col]
  }
```

Блоки group1 "вичерпуються" раніше — їх просто пропускаємо у відповідному стовпці.
НЕ додавати окремий прохід для "зайвих" — умова `col < block.dataBytes` вже це обробляє.

### Порядок: data спочатку, EC потім

```
final = [...interleavedData, ...interleavedEC, ...remainderBits(0)]
```

Remainder bits — це нульові біти (не байти), додаються як padding на рівні бітстріму.

---

## engine/matrix.ts

### Finder pattern — координати верхнього лівого кута блоку 7×7

```
Top-left:     row=0, col=0
Top-right:    row=0, col=size-7
Bottom-left:  row=size-7, col=0
```

Сепаратор — 1 модуль білого навколо кожного Finder. Разом займають 8 рядків/стовпців.

### Dark module — не забути!

```ts
matrix[4 * version + 9][8] = true;
isFunction[4 * version + 9][8] = true;
```

Version 1 → row=13. Version 7 → row=37. Завжди col=8.

### Alignment patterns — перевірка на overlap з Finder

Alignment паттерн (центр у [r, c]) не ставиться якщо будь-яка точка 5×5 блоку потрапляє у зону Finder (рядки 0–8 або col 0–8 для top-left, тощо).
Практично: skip якщо `(r <= 8 && c <= 8)` || `(r <= 8 && c >= size-8)` || `(r >= size-8 && c <= 8)`.

### Format Information зони — резервувати одразу

До розміщення даних позначити як `isFunction = true`:

- Row 8, col 0–8 (9 модулів, крім col 6 — timing)
- Col 8, row 0–8 (9 модулів, крім row 6 — timing)
- Row 8, col size-8 .. size-1 (8 модулів)
- Col 8, row size-7 .. size-1 (7 модулів) + dark module

### Version Information зони (version >= 7)

- 6×3 блок: rows 0–5, cols size-11 .. size-9
- 3×6 блок: rows size-11 .. size-9, cols 0–5

---

## engine/placer.ts

### Zigzag — правильна послідовність у 2-col strip

Всередині кожної пари колонок: права колонка першою, потім ліва.

```
strip колонок [col, col-1]:
  перевіряємо (row, col), потім (row, col-1)
```

### Column 6 skip

```ts
let col = size - 1;
while (col > 0) {
  if (col === 6) col--; // пропускаємо timing column
  // ... iterate rows
  col -= 2;
}
```

### Direction flip — після кожної пари

```ts
let direction = -1; // починаємо знизу вгору
// після обробки пари: direction *= -1
```

### Підрахунок як перевірка

```
data_modules = size*size - function_modules - format_modules - version_modules
```

Має дорівнювати `(totalDataBytes + totalECBytes) * 8 + remainderBits`.
Написати assertion у dev-режимі.

---

## engine/masker.ts

### 8 масок — умови (i=row, j=col, 0-indexed)

```ts
const MASK_FNS: Array<(i: number, j: number) => boolean> = [
  (i, j) => (i + j) % 2 === 0,
  (i, j) => i % 2 === 0,
  (i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i + j) % 2) + ((i * j) % 3)) % 2 === 0,
];
```

### Penalty Rule 3 — точний паттерн

Шукати у кожному рядку і стовпці:

```
dark light dark dark dark light dark  +  чотири light перед або після
```

Bit pattern: `1011101` з `00001011101` або `10111010000`.
Penalty = **40** за кожне входження (не за рядок).

### Penalty Rule 4 — формула

```ts
const total = size * size;
const darkCount = countDarkModules(matrix);
const percent = (darkCount / total) * 100;
const prev = Math.floor(percent / 5) * 5;
const next = prev + 5;
const penalty = (Math.min(Math.abs(prev - 50), Math.abs(next - 50)) / 5) * 10;
```

### Не мутувати оригінальну матрицю

Для кожної маски — клонувати матрицю, застосувати маску, підрахувати penalty, відкинути.
Зберегти тільки індекс переможця, потім застосувати ту маску остаточно.

---

## engine/format.ts

### Format information — EC bits НЕ у числовому порядку

```ts
const EC_BITS: Record<'L' | 'M' | 'Q' | 'H', number> = {
  L: 0b01,
  M: 0b00,
  Q: 0b11,
  H: 0b10,
};
```

Це найчастіша помилка при реалізації. L≠0, M≠1, Q≠2, H≠3.

### Format info — BCH encoding

```
raw = (EC_BITS[level] << 3) | maskIndex  // 5 bits
raw << 10  // зсуваємо під ступінь 14
ділимо на генераторний поліном 10100110111 у GF(2) (звичайний XOR-div)
залишок XOR з raw<<10 = 15-бітний format string до маскування
```

XOR маска format string: `101010000010010` (= 0x5412).

### Порядок бітів при записі — LSB first (bit 0 → position 0)

**КРИТИЧНО:** При записі 15-бітного format info у матрицю, біт 0 (LSB) йде в першу позицію масиву, біт 14 (MSB) — в останню. НЕ навпаки.

```ts
// ПРАВИЛЬНО:
const bit = ((formatBits >>> i) & 1) === 1;
// НЕПРАВИЛЬНО (дає невалідний QR):
const bit = ((formatBits >>> (14 - i)) & 1) === 1;
```

Цей баг не ловиться unit-тестами на розрахунок бітів (вони коректні) — тільки roundtrip decode тестом.

### Дві копії format info

- Copy 1: навколо top-left Finder (конкретна розкладка по модулях — дивись thonky)
- Copy 2: дзеркальна копія (top-right + bottom-left Finder)
  Обидві копії **ідентичні** за значенням, відрізняється тільки фізичне розташування.

### Version info — тільки version >= 7

BCH generator: `1111100100101` (= 0x1F25).

```
raw = version  // 6 bits
raw << 12, ділимо, залишок XOR raw<<12 = 18-bit version string
```

Записати у два блоки (транспоновані копії один одного).

---

## renderer/shared.ts (спільна логіка)

### Finder паттерн — ідентифікація модулів за координатами

Щоб застосувати кастомний стиль до Finder, ідентифікувати їх за позицією, не за `isFunction`.
`isFunction` включає також timing, alignment, format zones — вони мають інший вигляд.

```ts
function isFinderModule(row: number, col: number, size: number): boolean {
  return (
    (row < 8 && col < 8) || // top-left (з сепаратором)
    (row < 8 && col >= size - 8) || // top-right
    (row >= size - 8 && col < 8)
  ); // bottom-left
}
```

### Excavate — клонувати матрицю перед модифікацією

```ts
const working = matrix.modules.map((row) => [...row]);
// встановити false для модулів у зоні логотипу
// передати working у renderer, не matrix.modules
```

---

## renderer/canvas.ts (основний рендерер — live preview)

> Canvas — основний рендерер для live preview у браузері. Швидший за SVG-генерацію, нативне малювання.

### High-DPI рендеринг (Retina)

```ts
const dpr = window.devicePixelRatio || 1;
canvas.width = targetPx * dpr;
canvas.height = targetPx * dpr;
canvas.style.width = targetPx + 'px';
canvas.style.height = targetPx + 'px';
ctx.scale(dpr, dpr);
```

Без DPI scaling — QR виглядатиме розмито на Retina-дисплеях.

### Градієнт у Canvas

```ts
const grad = ctx.createLinearGradient(x1, y1, x2, y2);
grad.addColorStop(0, color1);
grad.addColorStop(1, color2);
ctx.fillStyle = grad;
```

Градієнт створювати один раз для всього коду (координати = повний розмір Canvas), а не для кожного модуля окремо. Інакше — той самий баг що й з SVG `objectBoundingBox`.

### Quiet zone — offset через translate

```ts
ctx.translate(quietZone * pixelSize, quietZone * pixelSize);
// малювати модулі від (0,0), translate зсуне їх автоматично
```

### Rounded rect — сумісність

`ctx.roundRect()` підтримується у всіх сучасних браузерах (Chrome 99+, Firefox 112+, Safari 15.4+). Для надійності можна використати fallback через `ctx.arc()` + `ctx.lineTo()`.

### PNG Export — напряму з Canvas

Оскільки preview вже на Canvas, PNG export максимально простий:

```ts
// Створити offscreen canvas з потрібним розміром
const offscreen = document.createElement('canvas');
const totalPx = (matrixSize + 2 * quietZone) * pixelSize;
offscreen.width = totalPx;
offscreen.height = totalPx;
const offCtx = offscreen.getContext('2d')!;
renderCanvas(options, offCtx); // той самий рендерер
offscreen.toBlob((blob) => download(blob!), 'image/png');
```

Не потрібен SVG→Canvas→PNG pipeline — Canvas вже є основним рендерером.

---

## renderer/svg.ts (тільки для векторного експорту)

> SVG рендерер генерує SVG-рядок **тільки** при натисканні "Export SVG". Не використовується для live preview.

### Градієнт у SVG — прив'язка до userSpaceOnUse

```xml
<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="W" y2="H">
```

З `objectBoundingBox` (дефолт) — градієнт прив'язується до кожного окремого модуля,
а не до всього коду. Результат — не те що очікується.

### Quiet zone — offset через viewBox або transform

```xml
<svg viewBox="-Q -Q W+2Q H+2Q">
<!-- або -->
<g transform="translate(Q, Q)">
```

де Q = quietZone \* moduleSize в пікселях.

### SVG розмір — цілі числа для чіткості

`moduleSize` завжди integer. Якщо потрібен дробовий — використовувати viewBox scaling,
але реальні координати залишати цілочисельними.

### Візуальна паритетність з Canvas

SVG export повинен виглядати **ідентично** Canvas preview. Спільну логіку (форми модулів, finder стилі, excavation) тримати в `shared.ts`, щоб обидва рендерери використовували однакові обчислення.

---

## Загальна сканованість

### Мінімальний розмір модуля на екрані

2px — абсолютний мінімум. 4px — комфортно. Для preview показувати з 4px/модуль.

### Колір — перевірка контрасту

Темний колір має бути темнішим за світлий у **grayscale**.

```ts
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
// dark luminance < light luminance — обов'язкова умова
```

### Логотип > 30% площі

```ts
const logoArea = (logoW * logoH) / (size * size);
if (logoArea > 0.3) throw new Error('Logo too large — reduce size or increase EC level');
```

Примусово H level якщо є логотип.

### Тихая зона

4 модулі — стандарт. 0 модулів — деякі сканери не зможуть знайти межу коду.
Не дозволяти quiet zone = 0 без попередження у UI.
