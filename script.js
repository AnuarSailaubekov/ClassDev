// Конфигурация Google Формы
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfoWiADbnXP2kzUMgH1uKa2XRtgxe-_FQ0SxfNZamqB5FAIPA/formResponse';
const ENTRY_NAME = 'entry.481019795';
const ENTRY_SCORE = 'entry.791775334';
const ENTRY_DETAILS = 'entry.83596638';

let hasInteractedWithQ1 = false;
let selectedVariant = null;
let isSubmitting = false; // Флаг текущего процесса отправки

// Проверка при загрузке страницы: сдавал ли пользователь тест ранее
window.addEventListener('DOMContentLoaded', () => {
  const savedResult = localStorage.getItem('csharp_quiz_submitted');
  if (savedResult) {
    lockForm(savedResult);
  }
});

// Блокировка интерфейса, если работа уже отправлена
function lockForm(scoreText) {
  const submitBtn = document.querySelector('.btn-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.innerText = 'Тест уже сдан';
  }

  // Блокируем поля ввода и селекторы
  document.querySelectorAll('input, select, button:not(.btn-submit)').forEach(el => {
    el.disabled = true;
  });

  const resultBox = document.getElementById('resultBox');
  resultBox.style.display = 'block';
  resultBox.style.background = 'var(--white)';
  resultBox.style.border = '2px solid #2b7a78';
  resultBox.style.color = '#17252a';
  resultBox.innerHTML = `Вы уже завершили этот тест.<br>Ваш зафиксированный результат: <b>${scoreText}</b>.`;
}

// Расчет заполнения шагов
function updateProgress() {
  if (localStorage.getItem('csharp_quiz_submitted')) return;

  let completedCount = 0;

  if (hasInteractedWithQ1) completedCount++;
  if (selectedVariant !== null) completedCount++;
  if (document.getElementById('inputCollection').value.trim() !== '') completedCount++;
  if (document.querySelector('input[name="q4"]:checked') !== null) completedCount++;

  const d = document.getElementById('match_dict').value;
  const s = document.getElementById('match_set').value;
  const l = document.getElementById('match_list').value;
  if (d !== '' && s !== '' && l !== '') completedCount++;

  const percent = (completedCount / 5) * 100;
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressText').innerText = `${completedCount} из 5 решено`;
}

// Задание 1: перемещение строк
function moveItem(btn, direction) {
  if (localStorage.getItem('csharp_quiz_submitted')) return;
  const item = btn.closest('.sortable-item');
  if (direction === -1 && item.previousElementSibling) {
    item.parentNode.insertBefore(item, item.previousElementSibling);
  } else if (direction === 1 && item.nextElementSibling) {
    item.parentNode.insertBefore(item.nextElementSibling, item);
  }
  hasInteractedWithQ1 = true;
  updateProgress();
}

// Задание 2: выбор блока
function selectVariant(element, variant) {
  if (localStorage.getItem('csharp_quiz_submitted')) return;
  document.querySelectorAll('.option-card').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');
  selectedVariant = variant;
  updateProgress();
}

// Проверка ответов и отправка
async function submitResults() {
  // 1. Защита от повторного нажатия или отправки уже сданного теста
  if (isSubmitting || localStorage.getItem('csharp_quiz_submitted')) {
    return;
  }

  const name = document.getElementById('studentName').value.trim();
  if (!name) {
    alert("Пожалуйста, введи фамилию и имя перед отправкой.");
    return;
  }

  const submitBtn = document.querySelector('.btn-submit');
  const resultBox = document.getElementById('resultBox');

  // Включаем блокировку кнопки на время запроса
  isSubmitting = true;
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.6';
  submitBtn.innerText = 'Отправка...';

  let score = 0;
  let log = [];

  // Q1: Проверка порядка
  const currentOrder = Array.from(document.querySelectorAll('#sortableList .sortable-item'))
                           .map(el => el.dataset.id);
  if (currentOrder.join(',') === 'init,addA,addB,pop,read') {
    score++;
    log.push("Q1: OK");
  } else {
    log.push("Q1: Ошибка порядка");
  }

  // Q2: Проверка варианта (Вариант Б верный)
  if (selectedVariant === 'B') {
    score++;
    log.push("Q2: OK");
  } else {
    log.push("Q2: Ошибка (выбор: " + (selectedVariant || 'пусто') + ")");
  }

  // Q3: Queue
  const q3Val = document.getElementById('inputCollection').value.trim().toLowerCase();
  if (q3Val === 'queue' || q3Val === 'queue<string>') {
    score++;
    log.push("Q3: OK");
  } else {
    log.push("Q3: Ошибка (" + q3Val + ")");
  }

  // Q4: HashSet -> 3
  const q4Selected = document.querySelector('input[name="q4"]:checked')?.value;
  if (q4Selected === '3') {
    score++;
    log.push("Q4: OK");
  } else {
    log.push("Q4: Ошибка (" + (q4Selected || 'пусто') + ")");
  }

  // Q5: Match
  const d = document.getElementById('match_dict').value;
  const s = document.getElementById('match_set').value;
  const l = document.getElementById('match_list').value;
  if (d === 'key_lookup' && s === 'unique' && l === 'index') {
    score++;
    log.push("Q5: OK");
  } else {
    log.push("Q5: Ошибка сопоставления");
  }

  const scoreString = `${score}/5`;
  const formData = new FormData();
  formData.append(ENTRY_NAME, name);
  formData.append(ENTRY_SCORE, scoreString);
  formData.append(ENTRY_DETAILS, log.join(' | '));

  resultBox.style.display = 'block';
  resultBox.style.background = 'var(--white)';
  resultBox.style.border = '2px solid var(--dark)';
  resultBox.style.color = 'var(--dark)';
  resultBox.innerText = 'Сохранение результата...';

  try {
    await fetch(FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    });

    // Сохраняем факт успешной сдачи в браузер устройства
    localStorage.setItem('csharp_quiz_submitted', scoreString);

    // Блокируем форму окончательно
    lockForm(scoreString);
  } catch (e) {
    // В случае реального сбоя сети возвращаем кнопку в рабочее состояние
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.innerText = 'Отправить результат';

    resultBox.style.background = '#fef2f2';
    resultBox.style.border = '2px solid #b91c1c';
    resultBox.style.color = '#b91c1c';
    resultBox.innerText = 'Ошибка соединения при отправке. Попробуй еще раз.';
  }
}
