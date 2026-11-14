// Корзина и оформление заказа.
// Сама находит блюда на странице и добавляет к ним кнопку "В корзину".
// Куда уходит заказ, задаётся в админке (Основные настройки, блок "Заказы").

(function () {
  "use strict";

  var STORAGE_KEY = "cart_v1";
  var settings = {};
  var cart = loadCart();
  var ui = {};

  // ---------- хранение ----------
  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (i) {
        return i && typeof i.title === "string" && typeof i.price === "number" &&
          isFinite(i.price) && Number.isInteger(i.qty) && i.qty > 0;
      });
    } catch (e) {
      return [];
    }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) {}
  }

  // ---------- помощники ----------
  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "class") node.className = props[k];
      else if (k === "text") node.textContent = props[k];
      else node.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }
  function money(n) {
    return (Math.round(n * 100) / 100) + (settings.currency ? " " + settings.currency : "");
  }
  function total() {
    return cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
  }
  function count() {
    return cart.reduce(function (s, i) { return s + i.qty; }, 0);
  }
  function qtyOf(title) {
    var f = cart.filter(function (i) { return i.title === title; })[0];
    return f ? f.qty : 0;
  }

  // ---------- операции с корзиной ----------
  function add(title, price) {
    var f = cart.filter(function (i) { return i.title === title; })[0];
    if (f) f.qty += 1;
    else cart.push({ title: title, price: price, qty: 1 });
    changed();
  }
  function change(title, delta) {
    cart.forEach(function (i) { if (i.title === title) i.qty += delta; });
    cart = cart.filter(function (i) { return i.qty > 0; });
    changed();
  }
  function changed() {
    saveCart();
    renderBar();
    renderList();
    updateButtons();
  }

  // ---------- кнопки на блюдах ----------
  function decorate() {
    var dishes = document.querySelectorAll(".dish");
    dishes.forEach(function (dish) {
      if (dish.querySelector(".add-btn")) return;
      var h = dish.querySelector("h3");
      var p = dish.querySelector(".price");
      var body = dish.querySelector(".dish-body");
      if (!h || !p || !body) return;
      var title = h.textContent;
      var price = parseFloat(String(p.textContent).replace(",", "."));
      if (!isFinite(price)) return;
      var btn = el("button", { "class": "btn btn-small add-btn", type: "button", "data-title": title });
      btn.addEventListener("click", function () { add(title, price); });
      body.appendChild(btn);
    });
    updateButtons();
  }
  function updateButtons() {
    document.querySelectorAll(".add-btn").forEach(function (b) {
      var q = qtyOf(b.getAttribute("data-title"));
      var label = q > 0 ? "В корзине: " + q + " (+1)" : "В корзину";
      // Меняем текст только если он изменился, иначе наблюдатель зациклится.
      if (b.textContent !== label) b.textContent = label;
    });
  }

  // ---------- окно корзины ----------
  function build() {
    ui.bar = el("button", { "class": "cart-bar", type: "button", hidden: "" });
    ui.bar.addEventListener("click", openDrawer);

    ui.overlay = el("div", { "class": "cart-overlay", hidden: "" });
    ui.overlay.addEventListener("click", closeDrawer);

    ui.title = el("h2", { text: "Корзина" });
    var closeBtn = el("button", { "class": "cart-close", type: "button", "aria-label": "Закрыть", text: "✕" });
    closeBtn.addEventListener("click", closeDrawer);

    ui.list = el("div", { "class": "cart-list" });
    ui.total = el("div", { "class": "cart-total" });

    ui.name = el("input", { type: "text", name: "name", placeholder: "Ваше имя", autocomplete: "name", required: "" });
    ui.phone = el("input", { type: "tel", name: "phone", placeholder: "Телефон", autocomplete: "tel", required: "" });

    ui.pickup = el("input", { type: "radio", name: "dtype", value: "pickup", checked: "" });
    ui.delivery = el("input", { type: "radio", name: "dtype", value: "delivery" });
    var typeRow = el("div", { "class": "cart-type" }, [
      el("label", {}, [ui.pickup, el("span", { text: " Самовывоз" })]),
      el("label", {}, [ui.delivery, el("span", { text: " Доставка" })])
    ]);
    ui.address = el("input", { type: "text", name: "address", placeholder: "Адрес доставки", autocomplete: "street-address", hidden: "" });
    ui.comment = el("textarea", { name: "comment", placeholder: "Комментарий к заказу (необязательно)", rows: "2" });
    ui.msg = el("p", { "class": "cart-msg", hidden: "", role: "status" });
    ui.submit = el("button", { "class": "btn cart-submit", type: "submit", text: "Заказать" });

    function syncType() { ui.address.hidden = !ui.delivery.checked; }
    ui.pickup.addEventListener("change", syncType);
    ui.delivery.addEventListener("change", syncType);

    ui.form = el("form", { "class": "cart-form", novalidate: "" },
      [ui.name, ui.phone, typeRow, ui.address, ui.comment, ui.msg, ui.submit]);
    ui.form.addEventListener("submit", onSubmit);

    ui.drawer = el("aside", { "class": "cart-drawer", hidden: "", role: "dialog", "aria-label": "Корзина" }, [
      el("div", { "class": "cart-head" }, [ui.title, closeBtn]),
      ui.list, ui.total, ui.form
    ]);

    document.body.appendChild(ui.bar);
    document.body.appendChild(ui.overlay);
    document.body.appendChild(ui.drawer);
  }

  function openDrawer() {
    ui.overlay.hidden = false;
    ui.drawer.hidden = false;
    renderList();
  }
  function closeDrawer() {
    ui.overlay.hidden = true;
    ui.drawer.hidden = true;
  }
  function showMsg(text, isError) {
    ui.msg.textContent = text;
    ui.msg.hidden = !text;
    ui.msg.className = "cart-msg" + (isError ? " error" : " ok");
  }

  function renderBar() {
    var n = count();
    ui.bar.hidden = n === 0;
    ui.bar.textContent = "Корзина: " + n + " · " + money(total());
  }

  function renderList() {
    ui.list.textContent = "";
    if (!cart.length) {
      ui.list.appendChild(el("p", { "class": "cart-empty", text: "Корзина пуста" }));
      ui.form.hidden = true;
      ui.total.textContent = "";
      return;
    }
    ui.form.hidden = false;
    cart.forEach(function (i) {
      var minus = el("button", { type: "button", "class": "qty-btn", "aria-label": "Убрать", text: "−" });
      var plus = el("button", { type: "button", "class": "qty-btn", "aria-label": "Добавить", text: "+" });
      minus.addEventListener("click", function () { change(i.title, -1); });
      plus.addEventListener("click", function () { change(i.title, 1); });
      ui.list.appendChild(el("div", { "class": "cart-item" }, [
        el("div", { "class": "cart-item-name" }, [
          el("strong", { text: i.title }),
          el("span", { text: money(i.price) })
        ]),
        el("div", { "class": "cart-qty" }, [minus, el("span", { text: String(i.qty) }), plus]),
        el("div", { "class": "cart-item-sum", text: money(i.price * i.qty) })
      ]));
    });
    ui.total.textContent = "Итого: " + money(total());
  }

  // ---------- отправка заказа ----------
  function buildOrder() {
    return {
      source: "website",
      site: settings.name || "",
      created_at: new Date().toISOString(),
      customer: { name: ui.name.value.trim(), phone: ui.phone.value.trim() },
      delivery_type: ui.delivery.checked ? "delivery" : "pickup",
      address: ui.delivery.checked ? ui.address.value.trim() : "",
      comment: ui.comment.value.trim(),
      items: cart.map(function (i) { return { title: i.title, price: i.price, qty: i.qty }; }),
      total: Math.round(total() * 100) / 100,
      currency: settings.currency || ""
    };
  }

  function orderText(o) {
    var lines = ["Новый заказ" + (o.site ? " (" + o.site + ")" : "")];
    o.items.forEach(function (i) {
      lines.push("- " + i.title + " x" + i.qty + " = " + (Math.round(i.price * i.qty * 100) / 100));
    });
    lines.push("Итого: " + o.total + (o.currency ? " " + o.currency : ""));
    lines.push(o.delivery_type === "delivery" ? "Доставка: " + o.address : "Самовывоз");
    lines.push("Имя: " + o.customer.name);
    lines.push("Телефон: " + o.customer.phone);
    if (o.comment) lines.push("Комментарий: " + o.comment);
    return lines.join("\n");
  }

  function openLink(url) {
    var w = window.open(url, "_blank");
    if (!w) window.location.href = url;
  }

  function done(text) {
    cart = [];
    changed();
    ui.form.reset();
    ui.address.hidden = true;
    ui.list.textContent = "";
    ui.list.appendChild(el("p", { "class": "cart-empty ok", text: text }));
    ui.form.hidden = true;
    ui.total.textContent = "";
    showMsg("", false);
  }

  function onSubmit(ev) {
    ev.preventDefault();
    var o = buildOrder();

    if (!o.customer.name) { showMsg("Укажите имя", true); return; }
    if (o.customer.phone.replace(/\D/g, "").length < 7) { showMsg("Укажите телефон", true); return; }
    if (o.delivery_type === "delivery" && !o.address) { showMsg("Укажите адрес доставки", true); return; }
    showMsg("", false);

    var mode = settings.order_mode || "";
    var text = orderText(o);

    if (mode === "whatsapp") {
      var num = String(settings.order_whatsapp || "").replace(/\D/g, "");
      if (!num) return notConnected();
      openLink("https://wa.me/" + num + "?text=" + encodeURIComponent(text));
      done("Откроется WhatsApp с готовым заказом. Нажмите «Отправить», и мы получим его.");
    } else if (mode === "telegram") {
      var user = String(settings.order_telegram || "").replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "").trim();
      if (!user) return notConnected();
      openLink("https://t.me/" + encodeURIComponent(user) + "?text=" + encodeURIComponent(text));
      done("Откроется Telegram с готовым заказом. Нажмите «Отправить», и мы получим его.");
    } else if (mode === "email") {
      var mail = String(settings.order_email || "").trim();
      if (!mail) return notConnected();
      window.location.href = "mailto:" + encodeURIComponent(mail) +
        "?subject=" + encodeURIComponent("Новый заказ") + "&body=" + encodeURIComponent(text);
      done("Откроется почта с готовым заказом. Нажмите «Отправить», и мы получим его.");
    } else if (mode === "webhook") {
      var url = String(settings.order_webhook_url || "").trim();
      if (!/^https:\/\//i.test(url)) return notConnected();
      ui.submit.disabled = true;
      // text/plain и no-cors, чтобы браузер не блокировал запрос к сторонним сервисам.
      // Ответ сервиса прочитать нельзя, поэтому успех проверяйте в самом сервисе.
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(o)
      }).then(function () {
        done("Спасибо! Заказ отправлен, мы свяжемся с вами.");
      }).catch(function () {
        showMsg("Не удалось отправить заказ. Позвоните нам: " + (settings.phone || ""), true);
      }).then(function () {
        ui.submit.disabled = false;
      });
    } else {
      notConnected();
    }
  }

  function notConnected() {
    showMsg("Онлайн-заказы пока не подключены. Позвоните нам: " + (settings.phone || ""), true);
  }

  // ---------- запуск ----------
  function start() {
    build();
    renderBar();
    decorate();
    new MutationObserver(decorate).observe(document.body, { childList: true, subtree: true });
  }

  fetch("content/settings.json?v=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (s) {
      settings = s || {};
      if (settings.orders_enabled === false) return;
      start();
    })
    .catch(function () {});
})();
