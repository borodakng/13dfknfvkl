const telegram = window.Telegram?.WebApp;
const stack = document.getElementById("card-stack");
const counter = document.getElementById("counter");
const hint = document.getElementById("hint");
const actions = document.getElementById("actions");
const skipButton = document.getElementById("skip");
const likeButton = document.getElementById("like");

let personas = [];
let currentIndex = 0;
let startX = 0;
let startY = 0;

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
  content.append(tag, name, description);
  card.append(content);

  card.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
    card.setPointerCapture(event.pointerId);
  });
  card.addEventListener("pointermove", (event) => {
    if (!card.hasPointerCapture(event.pointerId)) return;
    const offsetX = event.clientX - startX;
    const offsetY = event.clientY - startY;
    card.style.transform = `translate(${offsetX}px, ${offsetY * 0.18}px) rotate(${offsetX * 0.04}deg)`;
  });
  card.addEventListener("pointerup", (event) => {
    if (!card.hasPointerCapture(event.pointerId)) return;
    const offsetX = event.clientX - startX;
    card.releasePointerCapture(event.pointerId);
    if (offsetX > 90) choosePersona(persona);
    else if (offsetX < -90) advanceCard();
    else card.style.transform = "";
  });
  card.addEventListener("pointercancel", () => {
    card.style.transform = "";
  });
  return card;
}

function renderCard() {
  stack.replaceChildren();
  if (currentIndex >= personas.length) {
    const empty = document.createElement("div");
    empty.className = "empty-card";
    empty.textContent = "Ты просмотрел(а) всех. Загляни позже за новой историей ✨";
    stack.append(empty);
    counter.textContent = `${personas.length} / ${personas.length}`;
    hint.textContent = "Все карточки просмотрены";
    actions.hidden = true;
    return;
  }

  stack.append(createCard(personas[currentIndex]));
  counter.textContent = `${currentIndex + 1} / ${personas.length}`;
  hint.textContent = "Листай влево, чтобы пропустить, вправо — чтобы выбрать";
  actions.hidden = false;
}

function advanceCard() {
  currentIndex += 1;
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

skipButton.addEventListener("click", advanceCard);
likeButton.addEventListener("click", () => {
  if (personas[currentIndex]) choosePersona(personas[currentIndex]);
});
loadPersonas();
