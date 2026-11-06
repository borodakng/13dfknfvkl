const telegram = window.Telegram?.WebApp;
const stack = document.getElementById("card-stack");
const counter = document.getElementById("counter");
const hint = document.getElementById("hint");
const actions = document.getElementById("actions");
const chooseButton = document.getElementById("choose");
const profileButton = document.getElementById("show-profile");
const profileDialog = document.getElementById("profile-dialog");
const closeProfileButton = document.getElementById("close-profile");
const profileImage = document.getElementById("profile-image");
const profilePlaceholder = document.getElementById("profile-placeholder");
const catalogTabs = [...document.querySelectorAll(".catalog-tab")];

let personas = [];
let currentIndex = 0;
let currentView = "all";
let favoriteIds = [];
let recentIds = [];
let storageWarning = false;

telegram?.ready();
telegram?.expand();

const userId = telegram?.initDataUnsafe?.user?.id;
const storagePrefix = `persona-picker:${userId ?? "guest"}`;
const favoritesKey = `${storagePrefix}:favorites`;
const recentKey = `${storagePrefix}:recent`;

function readStoredIds(key) {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return [];
    const value = JSON.parse(stored);
    if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
      storageWarning = true;
      return [];
    }
    return value;
  } catch {
    storageWarning = true;
    return [];
  }
}

function storeIds(key, ids) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    storageWarning = true;
  }
}

function visiblePersonas() {
  if (currentView === "favorites") {
    return personas.filter((persona) => favoriteIds.includes(persona.id));
  }
  if (currentView === "recent") {
    const byId = new Map(personas.map((persona) => [persona.id, persona]));
    return recentIds.map((id) => byId.get(id)).filter(Boolean);
  }
  return personas;
}

function updateHint(message) {
  hint.textContent = storageWarning
    ? `${message} · Данные сохраняются только до закрытия страницы`
    : message;
}

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

  const favoriteButton = document.createElement("button");
  favoriteButton.className = "favorite-toggle";
  favoriteButton.type = "button";
  favoriteButton.textContent = favoriteIds.includes(persona.id) ? "♥" : "♡";
  favoriteButton.setAttribute(
    "aria-label",
    favoriteIds.includes(persona.id) ? "Убрать из избранного" : "Добавить в избранное",
  );
  favoriteButton.setAttribute("aria-pressed", String(favoriteIds.includes(persona.id)));
  favoriteButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  favoriteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite(persona);
  });
  card.append(favoriteButton);

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
  description.textContent = persona.description || "Новая история может начаться с одного сообщения";
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
  const displayedPersonas = visiblePersonas();
  if (displayedPersonas.length === 0) {
    stack.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "empty-card";
    empty.textContent = currentView === "favorites"
      ? "Здесь появятся персонажи, которых ты добавишь в избранное."
      : currentView === "recent"
        ? "Здесь появятся персонажи, с которыми ты начнёшь общение."
        : "В этой подборке пока нет персонажей.";
    stack.append(empty);
    counter.textContent = "0 / 0";
    updateHint("Добавь персонажа в избранное или начни с ним историю");
    actions.hidden = true;
    return;
  }

  currentIndex = (currentIndex + displayedPersonas.length) % displayedPersonas.length;
  stack.replaceChildren();
  stack.append(createCard(displayedPersonas[currentIndex]));
  counter.textContent = `${currentIndex + 1} / ${displayedPersonas.length}`;
  updateHint("Влево — следующий персонаж, вправо — предыдущий");
  actions.hidden = false;
}

function moveCard(direction) {
  const count = visiblePersonas().length;
  if (count === 0) return;
  currentIndex = (currentIndex + direction + count) % count;
  renderCard();
}

function currentPersona() {
  return visiblePersonas()[currentIndex];
}

function toggleFavorite(persona) {
  if (favoriteIds.includes(persona.id)) {
    favoriteIds = favoriteIds.filter((id) => id !== persona.id);
  } else {
    favoriteIds = [persona.id, ...favoriteIds];
  }
  storeIds(favoritesKey, favoriteIds);
  renderCard();
}

function showProfile(persona) {
  if (!persona) return;

  document.getElementById("profile-name").textContent = persona.name;
  document.getElementById("profile-style").textContent = `✦ ${persona.style}`;
  document.getElementById("profile-description").textContent =
    persona.description || "Новая история может начаться с одного сообщения";
  if (persona.image) {
    profileImage.src = new URL(persona.image, window.location.href).href;
    profileImage.alt = `Портрет персонажа ${persona.name}`;
    profileImage.hidden = false;
    profilePlaceholder.hidden = true;
  } else {
    profileImage.removeAttribute("src");
    profileImage.hidden = true;
    profilePlaceholder.hidden = false;
  }
  profileDialog.showModal();
}

function choosePersona(persona) {
  if (!telegram?.sendData) {
    updateHint("Открой каталог из Telegram, чтобы начать общение");
    return;
  }

  recentIds = [persona.id, ...recentIds.filter((id) => id !== persona.id)];
  storeIds(recentKey, recentIds);

  try {
    telegram.sendData(JSON.stringify({
      action: "select_persona",
      persona_id: persona.id,
    }));
  } catch {
    updateHint("Не получилось передать выбор боту. Открой каталог из чата.");
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
    const availableIds = new Set(personas.map((persona) => persona.id));
    favoriteIds = readStoredIds(favoritesKey).filter((id) => availableIds.has(id));
    recentIds = readStoredIds(recentKey).filter((id) => availableIds.has(id));
    renderCard();
  } catch (error) {
    showError(error instanceof Error ? error.message : "Не удалось загрузить персонажей.");
  }
}

catalogTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentView = tab.dataset.view;
    currentIndex = 0;
    catalogTabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderCard();
  });
});

chooseButton.addEventListener("click", () => {
  const persona = currentPersona();
  if (persona) choosePersona(persona);
});
profileButton.addEventListener("click", () => showProfile(currentPersona()));
closeProfileButton.addEventListener("click", () => profileDialog.close());
profileDialog.addEventListener("click", (event) => {
  if (event.target === profileDialog) profileDialog.close();
});
loadPersonas();
