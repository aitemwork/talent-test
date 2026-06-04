// ══════════════════════════════════════════════════
// ЛОГИКА ОПРЕДЕЛЕНИЯ ТОП-10
// ══════════════════════════════════════════════════

const BLOCKS = {
  "Мышление":       ["Аналитик","Мышление","Контекст","Видение будущего","Память","Генератор идей","Оптимизатор","Детализация","Взаимосвязанность"],
  "Влияние":        ["Командование","Влияние","Коммуникация","Обаяние","Конкуренция","Энергия","Активатор"],
  "Реализация":     ["Фокус","Достигатор","Осмотрительность","Последовательность","Восстановление","Ликвидация","Стрессоустойчивость","Планер"],
  "Отношения":      ["Эмпатия","Гармония","Включённость","Развитие","Служение","Гибкость","Твёрдость эмоций"],
  "Самореализация": ["Креаторство","Трансформация","Индивидуализация","Мультифокус","Обучение","Позитивность","Материализм","Уверенность","Максимизатор"],
};

export function getBlock(t) {
  for (const [b, ts] of Object.entries(BLOCKS))
    if (ts.includes(t)) return b;
  return "Мышление";
}

// ══ ДЕЛЕНИЕ НА ГРУППЫ ══
// Всегда только 3 и 4, из разных блоков
export function splitIntoGroups(talents) {
  const n = talents.length;
  
  // Определяем размеры групп
  let groupSizes = [];
  if (n === 6)  groupSizes = [3,3];
  else if (n === 7)  groupSizes = [3,4];
  else if (n === 8)  groupSizes = [4,4];
  else if (n === 9)  groupSizes = [3,3,3];
  else if (n === 10) groupSizes = [3,3,4];
  else if (n === 11) groupSizes = [3,4,4];
  else if (n === 12) groupSizes = [4,4,4];
  else {
    // Для других размеров — делим на 3 и 4
    groupSizes = [];
    let rem = n;
    while (rem > 0) {
      if (rem === 4 || rem === 3) { groupSizes.push(rem); rem = 0; }
      else if (rem >= 4) { groupSizes.push(4); rem -= 4; }
      else { groupSizes.push(rem); rem = 0; }
    }
  }

  // Распределяем таланты из разных блоков змейкой
  const byBlock = {};
  talents.forEach(t => {
    const b = getBlock(t);
    if (!byBlock[b]) byBlock[b] = [];
    byBlock[b].push(t);
  });

  const blockArrays = Object.values(byBlock);
  const allSorted = [];
  const maxLen = Math.max(...blockArrays.map(a => a.length));
  for (let row = 0; row < maxLen; row++)
    for (let col = 0; col < blockArrays.length; col++)
      if (row < blockArrays[col].length)
        allSorted.push(blockArrays[col][row]);

  // Делим по groupSizes
  const groups = [];
  let idx = 0;
  for (const size of groupSizes) {
    groups.push(allSorted.slice(idx, idx + size));
    idx += size;
  }
  return groups;
}

// ══ КАК ПОКАЗЫВАТЬ ВОПРОС ══
// 2 → pair (А/Б)
// 3-4 → rank (по порядку)
// 5 → pair (попарно)
// 6+ → снова группы
export function questionType(n) {
  if (n === 2) return "pair";
  if (n <= 4)  return "rank";
  if (n === 5) return "pairs"; // попарно все 10 вопросов
  return "groups"; // снова делим
}

// Генерируем все попарные вопросы
export function makePairs(arr) {
  const pairs = [];
  for (let i = 0; i < arr.length; i++)
    for (let j = i+1; j < arr.length; j++)
      pairs.push([arr[i], arr[j]]);
  return pairs;
}

// ══ ОСНОВНАЯ ФУНКЦИЯ — строим все шаги ══
export function buildAllSteps(group, axisUsed = {}) {
  // group — список талантов с одинаковыми показателями
  // Возвращает массив шагов для показа клиенту
  
  const steps = [];
  const n = group.length;
  
  if (n < 2) return steps;

  const qt = questionType(n);

  if (qt === "pair") {
    // 2 таланта — 1 вопрос
    const ax = Math.max(axisUsed[group[0]]||0, axisUsed[group[1]]||0);
    steps.push({ type:"pair", talents:group, axis:ax });
  }
  else if (qt === "rank") {
    // 3-4 таланта — 1 экран по порядку
    const ax = Math.max(...group.map(t => axisUsed[t]||0));
    steps.push({ type:"rank", talents:group, axis:ax });
  }
  else if (qt === "pairs") {
    // 5 талантов — попарно
    const pairs = makePairs(group);
    pairs.forEach(([a,b]) => {
      const ax = Math.max(axisUsed[a]||0, axisUsed[b]||0);
      steps.push({ type:"pair", talents:[a,b], axis:ax });
    });
  }
  else {
    // 6+ талантов — делим на группы
    const groups = splitIntoGroups(group);
    
    // Шаг 1: каждая группа
    groups.forEach((g, gi) => {
      const ax = Math.max(...g.map(t => axisUsed[t]||0));
      steps.push({ type:"rank", talents:g, axis:ax, groupIdx:gi, totalGroups:groups.length });
    });
    
    // Шаг 2: финалы по местам
    // Определяем сколько мест в каждой группе
    const maxPlaces = Math.max(...groups.map(g => g.length)); // 3 или 4
    
    for (let place = 0; place < maxPlaces; place++) {
      // Собираем всех кто занял это место
      let placeGroup = groups.map(g => g[place]).filter(Boolean); // может быть undefined если группа короче
      
      // Если на этом месте 1 талант → добавляем к предыдущему финалу
      if (placeGroup.length === 1 && steps.length > 0) {
        // Добавляем к предыдущему финальному шагу
        const prevFinal = [...steps].reverse().find(s => s.isFinale);
        if (prevFinal) {
          prevFinal.talents = [...prevFinal.talents, ...placeGroup];
          // Пересчитываем тип
          prevFinal.type = questionType(prevFinal.talents.length) === "pair" ? "pair" : "rank";
        }
        continue;
      }
      
      if (placeGroup.length < 2) continue;
      
      const ax = Math.max(...placeGroup.map(t => axisUsed[t]||0));
      const qt2 = questionType(placeGroup.length);
      
      if (qt2 === "pair") {
        steps.push({ type:"pair", talents:placeGroup, axis:ax, isFinale:true, place });
      } else if (qt2 === "rank") {
        steps.push({ type:"rank", talents:placeGroup, axis:ax, isFinale:true, place });
      } else {
        // Рекурсивно если много
        const subSteps = buildAllSteps(placeGroup, axisUsed);
        subSteps.forEach(s => { s.isFinale = true; s.place = place; });
        steps.push(...subSteps);
      }
    }
  }
  
  return steps;
}

// ══ ПОДСЧЁТ МИКРОБАЛЛОВ ══
// groupIdx — место в группе (0=1е, 1=2е, 2=3е, 3=4е)
// finalePlace — место в финале (0=1е, 1=2е, ...)
// Правило: каждый слой < предыдущего

export function calcMicroScore(groupPlace, finalePlace) {
  // Групповой этап
  const groupBonus = [0.00003, 0.00002, 0.00001, 0.000005][groupPlace] || 0;
  // Финальный этап  
  const finaleBonus = [0.000003, 0.000002, 0.000001, 0.0000005][finalePlace] || 0;
  return groupBonus + finaleBonus;
}

export default { buildAllSteps, splitIntoGroups, makePairs, questionType, calcMicroScore, getBlock };
