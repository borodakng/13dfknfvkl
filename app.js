const telegram = window.Telegram?.WebApp;
const stack = document.getElementById("card-stack");
const counter = document.getElementById("counter");
const hint = document.getElementById("hint");
const actions = document.getElementById("actions");
const chooseButton = document.getElementById("choose");

let personas = [];
let currentIndex = 0;

telegram?.ready();
telegram?.expand();

function showError(message) {
  stack.replaceChildren();
  const error = document.createElement("div");
  error.className = "empty-card";
  error.textContent = message;
  stack.append(error);
  counter.textContent = "";
  hint.textContent = "";
  actions.hidden = true;
}

function createCard(persona) {
  const card = document.createElement("article");
  card.className = "card";

  if (persona.image) {
    const image = document.createElement("img");
    image.className = "card-image";
    image.alt = `Портрет персонажа ${persona.name}`;
    image.draggable = false;
    image.src = new URL(persona.image, window.location.href).href;
    image.addEventListener("error", () => image.remove(), { once: true });
    card.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "card-image-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.textContent = "♡";
    card.append(placeholder);
  }

  const content = document.createElement("div");
  content.className = "card-content";
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = "✦ " + persona.style;
  const name = document.createElement("h2");
  name.textContent = persona.name;
  const description = document.createElement("p");
  description.textContent = "Новая история может начаться с одного сообщения";
  const stats = document.createElement("div");
  stats.className = "card-stats";
  stats.setAttribute("aria-label", "Популярность персонажа");
  stats.innerHTML = `
    <div class="card-stat"><strong>1,2к</strong><span>выбрали</span></div>
    <div class="card-stat"><strong>6,8к</strong><span>сообщений</span></div>
  `;
  content.append(tag, name, description, stats);
  card.append(content);

  card.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) return;
    card.dataset.startX = String(event.clientX);
    card.setPointerCapture(event.pointerId);
  });
  card.addEventListener("pointermove", (event) => {
    if (!card.hasPointerCapture(event.pointerId)) return;
    const offsetX = event.clientX - Number(card.dataset.startX);
    card.style.transform = `translateX(${offsetX}px) rotate(${offsetX * 0.04}deg)`;
  });
  card.addEventListener("pointerup", (event) => {
    if (!card.hasPointerCapture(event.pointerId)) return;
    const offsetX = event.clientX - Number(card.dataset.startX);
    card.releasePointerCapture(event.pointerId);
    if (offsetX > 90) moveCard(-1);
    else if (offsetX < -90) moveCard(1);
    else card.style.transform = "";
  });
  card.addEventListener("pointercancel", () => {
    card.style.transform = "";
  });
  return card;
}

function renderCard() {
  stack.replaceChildren();
  stack.append(createCard(personas[currentIndex]));
  counter.textContent = `${currentIndex + 1} / ${personas.length}`;
  hint.textContent = "Влево — следующий персонаж, вправо — предыдущий";
  actions.hidden = false;
}

function moveCard(direction) {
  currentIndex = (currentIndex + direction + personas.length) % personas.length;
  renderCard();
}

function choosePersona(persona) {
  if (!telegram?.sendData) {
    hint.textContent = "Открой каталог из Telegram, чтобы начать общение";
    return;
  }

  try {
    telegram.sendData(JSON.stringify({
      action: "select_persona",
      persona_id: persona.id,
    }));
  } catch {
    hint.textContent = "Не получилось передать выбор боту. Открой каталог из чата.";
  }
}

async function loadPersonas() {
  if (!telegram?.sendData) {
    showError("Открой каталог из бота, чтобы увидеть персонажей.");
    return;
  }

  const userGender = new URLSearchParams(window.location.search).get("gender");
  if (userGender !== "male" && userGender !== "female") {
    showError("Открой каталог кнопкой «Выбрать собеседника» в чате с ботом.");
    return;
  }

  try {
    const response = await fetch("./personas.json");
    if (!response.ok) throw new Error("Не удалось загрузить каталог персонажей.");
    const catalog = await response.json();
    if (!Array.isArray(catalog)) throw new Error("Некорректный каталог персонажей.");
    const personaGender = userGender === "male" ? "female" : "male";
    personas = catalog.filter((persona) => persona.gender === personaGender);
    if (personas.length === 0) {
      showError("Для этой подборки пока нет персонажей.");
      return;
    }
    renderCard();
  } catch (error) {
    showError(error instanceof Error ? error.message : "Не удалось загрузить персонажей.");
  }
}

chooseButton.addEventListener("click", () => {
  if (personas[currentIndex]) choosePersona(personas[currentIndex]);
});
loadPersonas();
