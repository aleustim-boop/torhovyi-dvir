// Тема 03 «Торговий Двір»: бургер-меню, модалка замовлення, галерея, сортування,
// перемикач «плитка / список», клік по рядку таблиці категорій, калькулятор партії
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;

  // --- Мобільне меню
  var burger = doc.getElementById('burger'), nav = doc.getElementById('nav');
  if (burger && nav) burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.classList.toggle('is-open', open);
  });

  // --- Модальне вікно замовлення
  var modal = doc.getElementById('order-modal'), omProduct = doc.getElementById('om-product'), omMail = doc.getElementById('om-mail');
  function openModal(name, sku, qty) {
    if (!modal) return;
    var label = name + (sku ? ' (арт. ' + sku + ')' : '') + (qty ? ' × ' + qty + ' шт.' : '');
    if (omProduct) omProduct.textContent = label;
    if (omMail) {
      var base = omMail.getAttribute('href').split('?')[0];
      omMail.setAttribute('href', base + '?subject=' + encodeURIComponent('Замовлення: ' + name) +
        '&body=' + encodeURIComponent('Доброго дня! Цікавить: ' + label + '\nКількість: ' + (qty || '') + '\nКомпанія / ФОП: \nТелефон для зв\'язку: '));
    }
    modal.hidden = false; doc.body.classList.add('no-scroll');
  }
  function closeModal() { if (modal) { modal.hidden = true; doc.body.classList.remove('no-scroll'); } }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('.js-order');
    if (b) { e.preventDefault(); openModal(b.dataset.name, b.dataset.sku, b.dataset.qty); return; }
    if (e.target === modal || e.target.closest('#om-close')) { closeModal(); return; }
    // клік по рядку таблиці категорій — перехід у категорію
    var row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a')) location.href = row.dataset.href;
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  // --- Галерея товару
  var main = doc.getElementById('gal-main');
  if (main) doc.querySelectorAll('.gallery__thumb').forEach(function (t) {
    t.addEventListener('click', function () {
      main.src = t.dataset.src;
      doc.querySelectorAll('.gallery__thumb').forEach(function (x) { x.classList.remove('is-active'); });
      t.classList.add('is-active');
    });
  });

  // --- Перемикач «плитка / список» (запам'ятовується в localStorage)
  var viewBtns = doc.querySelectorAll('.js-view');
  function setView(v) {
    root.classList.toggle('view-list', v === 'list');
    viewBtns.forEach(function (b) {
      var on = b.dataset.view === v;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    try { localStorage.setItem('td-view', v); } catch (err) { /* приватний режим */ }
  }
  if (viewBtns.length) {
    var saved = 'grid';
    try { saved = localStorage.getItem('td-view') || 'grid'; } catch (err) { /* ігноруємо */ }
    setView(saved === 'list' ? 'list' : 'grid');
    viewBtns.forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
  }

  // --- Сортування за ціною (data-price на картці)
  var sort = doc.getElementById('sort'), grid = doc.getElementById('grid');
  if (sort && grid) {
    var cards = Array.prototype.slice.call(grid.children);
    cards.forEach(function (c, i) { c.dataset.i = i; });
    sort.addEventListener('change', function () {
      var v = sort.value;
      cards.sort(function (a, b) {
        var pa = parseFloat(a.dataset.price) || 0, pb = parseFloat(b.dataset.price) || 0;
        if (v === 'price-asc') return pa - pb;
        if (v === 'price-desc') return pb - pa;
        return a.dataset.i - b.dataset.i;
      });
      cards.forEach(function (c) { grid.appendChild(c); });
    });
  }

  // --- Калькулятор партії: кількість × ціна зі знижкою за порогами site.wholesale_tiers
  var calc = doc.getElementById('calc');
  if (calc) {
    var price = parseFloat(calc.dataset.price) || 0;
    var minQty = parseInt((calc.dataset.min || '').replace(/\D/g, ''), 10) || 1;
    var step = parseInt(calc.dataset.step, 10) || 1;
    var tiers = [];
    try { tiers = JSON.parse(calc.dataset.tiers || '[]'); } catch (err) { tiers = []; }
    // "від 500 шт." -> 500, "-10%" -> 10
    tiers = tiers.map(function (t) {
      return { min: parseInt(String(t[0]).replace(/\D/g, ''), 10) || 0, pct: parseInt(String(t[1]).replace(/\D/g, ''), 10) || 0, label: String(t[0]) };
    }).filter(function (t) { return t.min > 0 && t.pct > 0; }).sort(function (a, b) { return a.min - b.min; });

    var qtyEl = doc.getElementById('calc-qty'), unitEl = doc.getElementById('calc-unit'), discEl = doc.getElementById('calc-disc'),
        totalEl = doc.getElementById('calc-total'), hintEl = doc.getElementById('calc-hint'), orderBtn = doc.getElementById('calc-order');

    function fmt(n) {
      var dec = Math.abs(n - Math.round(n)) < 0.005 ? 0 : 2;
      var s = n.toFixed(dec);
      var parts = s.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return parts.join(',');
    }
    function tierFor(q) {
      var cur = null;
      tiers.forEach(function (t) { if (q >= t.min) cur = t; });
      return cur;
    }
    function nextTier(q) {
      for (var i = 0; i < tiers.length; i++) if (q < tiers[i].min) return tiers[i];
      return null;
    }
    function recalc(clamp) {
      var q = parseInt(qtyEl.value, 10);
      if (!q || q < 1) q = clamp ? minQty : 1;
      if (clamp && q < minQty) q = minQty;
      if (clamp) qtyEl.value = q;
      var t = tierFor(q), pct = t ? t.pct : 0;
      var unit = price * (1 - pct / 100);
      unitEl.textContent = fmt(unit);
      discEl.textContent = pct ? '−' + pct + '% (' + fmt(price) + ' → ' + fmt(unit) + ' грн)' : '—';
      totalEl.textContent = fmt(unit * q);
      var n = nextTier(q), hint = '';
      if (q < minQty) hint = 'Мінімальне замовлення — ' + minQty + ' шт.';
      else if (n) hint = 'Ще ' + (n.min - q) + ' шт. — і ціна ' + fmt(price * (1 - n.pct / 100)) + ' грн/шт. (−' + n.pct + '%)';
      else if (t) hint = 'Застосовано максимальну знижку −' + t.pct + '%. Більші тиражі — за індивідуальним прайсом.';
      hintEl.textContent = hint;
      if (orderBtn) orderBtn.dataset.qty = q;
    }
    qtyEl.min = minQty;
    qtyEl.value = minQty;
    qtyEl.addEventListener('input', function () { recalc(false); });
    qtyEl.addEventListener('change', function () { recalc(true); });
    calc.querySelectorAll('.qty__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = parseInt(qtyEl.value, 10) || minQty;
        q = q + step * parseInt(b.dataset.dir, 10);
        if (q < minQty) q = minQty;
        qtyEl.value = q;
        recalc(true);
      });
    });
    recalc(true);
  }
})();
