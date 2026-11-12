// Сайт читает все данные из content/settings.json и content/menu.json.
// Владелец меняет их через /admin, код трогать не нужно.

async function loadJSON(path) {
  const res = await fetch(path + "?v=" + Date.now());
  if (!res.ok) throw new Error("Не удалось загрузить " + path);
  return res.json();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

function telHref(phone) {
  return "tel:" + String(phone || "").replace(/[^\d+]/g, "");
}

function applySettings(s) {
  document.title = s.name + (s.tagline ? " — " + s.tagline : "");
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", s.hero_text || s.tagline || "");

  if (s.primary_color) {
    document.documentElement.style.setProperty("--primary", s.primary_color);
    document.documentElement.style.setProperty("--primary-dark", s.primary_color);
  }

  setText("brand-name", s.name);
  setText("hero-title", s.hero_title || s.name);
  setText("hero-text", s.hero_text);
  setText("about-title", s.about_title || "О нас");
  setText("about-text", s.about_text);
  setText("address", s.address);
  setText("footer-text", "© " + new Date().getFullYear() + " " + s.name);

  const hero = document.getElementById("hero");
  if (s.hero_image) hero.style.backgroundImage = "url('" + s.hero_image + "')";

  const aboutImg = document.getElementById("about-image");
  if (s.about_image) {
    aboutImg.src = s.about_image;
    aboutImg.hidden = false;
  }

  const tel = telHref(s.phone);
  const callTop = document.getElementById("call-top");
  callTop.href = tel;
  const phoneLink = document.getElementById("phone-link");
  phoneLink.href = tel;
  phoneLink.textContent = s.phone || "";

  const orderBtn = document.getElementById("order-btn");
  orderBtn.href = s.order_link || tel;

  const mapLink = document.getElementById("map-link");
  if (s.map_link) {
    mapLink.href = s.map_link;
    mapLink.hidden = false;
  }

  const hours = document.getElementById("hours");
  hours.innerHTML = "";
  (s.hours || []).forEach((row) => {
    const li = document.createElement("li");
    const a = document.createElement("span");
    const b = document.createElement("strong");
    a.textContent = row.days;
    b.textContent = row.time;
    li.append(a, b);
    hours.appendChild(li);
  });

  const socials = document.getElementById("socials");
  socials.innerHTML = "";
  [["Instagram", s.instagram], ["Facebook", s.facebook], ["Telegram", s.telegram]].forEach(([label, url]) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.textContent = label;
    a.className = "link";
    a.target = "_blank";
    a.rel = "noopener";
    socials.appendChild(a);
  });
}

function renderMenu(menu, currency) {
  const tabs = document.getElementById("menu-tabs");
  const list = document.getElementById("menu-list");
  const categories = menu.categories || [];
  tabs.innerHTML = "";
  list.innerHTML = "";

  function show(index) {
    [...tabs.children].forEach((t, i) => t.classList.toggle("active", i === index));
    list.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "menu-grid";

    (categories[index].items || []).forEach((item) => {
      const card = document.createElement("article");
      card.className = "dish";

      if (item.image) {
        const img = document.createElement("img");
        img.src = item.image;
        img.alt = item.title;
        img.loading = "lazy";
        card.appendChild(img);
      }

      const body = document.createElement("div");
      body.className = "dish-body";

      const head = document.createElement("div");
      head.className = "dish-head";
      const h = document.createElement("h3");
      h.textContent = item.title;
      const price = document.createElement("span");
      price.className = "price";
      price.textContent = item.price ? item.price + " " + (currency || "") : "";
      head.append(h, price);
      body.appendChild(head);

      if (item.description) {
        const p = document.createElement("p");
        p.textContent = item.description;
        body.appendChild(p);
      }

      card.appendChild(body);
      grid.appendChild(card);
    });

    list.appendChild(grid);
  }

  categories.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.type = "button";
    btn.textContent = cat.name;
    btn.addEventListener("click", () => show(i));
    tabs.appendChild(btn);
  });

  if (categories.length) show(0);
}

(async function init() {
  try {
    const [settings, menu] = await Promise.all([
      loadJSON("content/settings.json"),
      loadJSON("content/menu.json"),
    ]);
    applySettings(settings);
    renderMenu(menu, settings.currency);
  } catch (err) {
    console.error(err);
    document.getElementById("menu-list").textContent =
      "Не удалось загрузить данные сайта.";
  }
})();
