/* ============================================================
   ExpenseFlow — Grupos: data + rendering + view switching
   ============================================================ */
(function () {
  var root = document.documentElement;

  /* ---- Theme ---- */
  var stored = null;
  try { stored = localStorage.getItem('ef-theme'); } catch (e) {}
  if (stored) root.setAttribute('data-theme', stored);
  else if (window.matchMedia && !window.matchMedia('(prefers-color-scheme: light)').matches) root.setAttribute('data-theme', 'dark');
  var tt = document.getElementById('themeToggle');
  if (tt) tt.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ef-theme', next); } catch (e) {}
  });

  /* ---- Real images ---- */
  var COVERS = {
    barcelona: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=640&h=400&q=80&auto=format&fit=crop',
    piso:      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=640&h=400&q=80&auto=format&fit=crop',
    cena:      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=640&h=400&q=80&auto=format&fit=crop',
    montana:   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=640&h=400&q=80&auto=format&fit=crop'
  };
  var AV = {
    alex:  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&q=80&auto=format&fit=crop',
    raul:  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&q=80&auto=format&fit=crop',
    maria: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&q=80&auto=format&fit=crop',
    jordi: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=96&h=96&q=80&auto=format&fit=crop'
  };

  /* ---- EUR formatting (es-ES: 1.234,50 €) ---- */
  var eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  function fmt(n) { return eur.format(n); }

  /* ---- Groups (honest: only image, name, description) ---- */
  var groups = [
    { id: 'barcelona', name: 'Viaje a Barcelona', cover: COVERS.barcelona,
      desc: 'Escapada de fin de semana — vuelos, alojamiento y comidas que repartimos entre los cuatro.' },
    { id: 'piso', name: 'Piso Compartido', cover: COVERS.piso,
      desc: 'Gastos del día a día del piso: alquiler, suministros y la compra semanal.' },
    { id: 'cena', name: 'Cena de aniversario', cover: COVERS.cena,
      desc: 'La cena sorpresa que organizamos entre todos para celebrar el aniversario.' },
    { id: 'montana', name: 'Escapada a la montaña', cover: COVERS.montana,
      desc: 'Fin de semana de senderismo: la cabaña, el alquiler del coche y la comida.' }
  ];

  /* ---- Detail data (Viaje a Barcelona) ---- */
  var expenses = [
    { cat: 'comida',  catLabel: 'COMIDA',          title: 'Cena en La Rambla',        by: 'María López', date: '12 may', amt: 96.00 },
    { cat: 'otro',    catLabel: 'OTRO',            title: 'Taxi al aeropuerto',       by: 'ti',          date: '11 may', amt: 58.00 },
    { cat: 'otro',    catLabel: 'OTRO',            title: 'Apartamento · 2 noches',   by: 'Jordi Puig',  date: '10 may', amt: 340.00 },
    { cat: 'ocio',    catLabel: 'ENTRETENIMIENTO', title: 'Entradas Museo Picasso',   by: 'Raul Martínez', date: '11 may', amt: 48.00 },
    { cat: 'compras', catLabel: 'COMPRAS',         title: 'Supermercado',             by: 'ti',          date: '12 may', amt: 64.50 },
    { cat: 'salud',   catLabel: 'SALUD',           title: 'Farmacia',                 by: 'María López', date: '13 may', amt: 23.80 }
  ];

  /* Balances itemized per pair (from Alex's perspective) — never collapsed to one net number */
  var balances = [
    { name: 'Raul Martínez', avatar: AV.raul, lines: [
      { type: 'owe',  amt: 38.00 },   // Debes 38,00 €
      { type: 'owed', amt: 12.50 }    // Te debe 12,50 €
    ]},
    { name: 'María López', avatar: AV.maria, lines: [
      { type: 'owed', amt: 100.00 }
    ]},
    { name: 'Jordi Puig', avatar: AV.jordi, lines: [
      { type: 'owe', amt: 85.00 },
      { type: 'owe', amt: 25.00 }
    ]}
  ];

  var members = [
    { name: 'Alex Rivera', email: 'alex@correo.com', avatar: AV.alex, role: 'admin', removable: false },
    { name: 'Raul Martínez', email: 'raul.martinez@correo.com', avatar: AV.raul, role: 'miembro', removable: true },
    { name: 'María López', email: 'maria.lopez@correo.com', avatar: AV.maria, role: 'miembro', removable: true },
    { name: 'Jordi Puig', email: 'jordi.puig@correo.com', avatar: AV.jordi, role: 'miembro', removable: true }
  ];

  /* ---- Render: group grid ---- */
  var grid = document.getElementById('groupGrid');
  function renderGroups() {
    grid.innerHTML = groups.map(function (g) {
      return '' +
      '<article class="group-card" data-group="' + g.id + '" tabindex="0" role="button" aria-label="Ver grupo ' + g.name + '">' +
        '<div class="cover"><img src="' + g.cover + '" alt="Imagen del grupo ' + g.name + '" loading="lazy"></div>' +
        '<div class="body">' +
          '<h3>' + g.name + '</h3>' +
          '<p class="desc">' + g.desc + '</p>' +
          '<span class="enter">Ver grupo <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* ---- Render: expenses ---- */
  function payLabel(by) { return by === 'ti' ? 'Pagado por ti' : 'Pagado por ' + by; }
  function renderExpenses() {
    document.getElementById('expList').innerHTML = expenses.map(function (e) {
      return '' +
      '<div class="exp-row">' +
        '<span class="cat-tag cat-' + e.cat + '">' + e.catLabel + '</span>' +
        '<div class="exp-main"><div class="t">' + e.title + '</div><div class="m">' + payLabel(e.by) + ' · ' + e.date + '</div></div>' +
        '<span class="exp-amt">' + fmt(e.amt) + '</span>' +
        '<div class="exp-tools">' +
          '<button class="tool-btn" aria-label="Editar gasto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>' +
          '<button class="tool-btn del" aria-label="Eliminar gasto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/></svg></button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ---- Render: balances (per-member, itemized per pair) ---- */
  function renderBalances() {
    document.getElementById('balList').innerHTML = balances.map(function (m) {
      var lines = m.lines.map(function (l) {
        if (l.type === 'owe') {
          return '<div class="bal-line owe"><span class="dot"></span><span class="txt">Debes</span> <span class="amt">' + fmt(l.amt) + '</span></div>';
        }
        return '<div class="bal-line owed"><span class="dot"></span><span class="txt">Te debe</span> <span class="amt">' + fmt(l.amt) + '</span></div>';
      }).join('');
      return '' +
      '<div class="bal-member">' +
        '<div class="who"><img src="' + m.avatar + '" alt=""><span class="nm">' + m.name + '</span></div>' +
        lines +
      '</div>';
    }).join('');
  }

  /* ---- Render: members ---- */
  function renderMembers() {
    document.getElementById('memberList').innerHTML = members.map(function (m) {
      var roleLabel = m.role === 'admin' ? 'ADMIN' : 'MIEMBRO';
      return '' +
      '<div class="member-row">' +
        '<img src="' + m.avatar + '" alt="Avatar de ' + m.name + '">' +
        '<div class="mi"><div class="nm">' + m.name + ' <span class="role ' + m.role + '">' + roleLabel + '</span></div><div class="em">' + m.email + '</div></div>' +
        (m.removable ? '<button class="rm">Eliminar</button>' : '') +
      '</div>';
    }).join('');
  }

  renderGroups();
  renderExpenses();
  renderBalances();
  renderMembers();

  /* ---- View switching ---- */
  var views = {
    list: document.getElementById('view-list'),
    detail: document.getElementById('view-detail'),
    empty: document.getElementById('view-empty')
  };
  var demoBtns = document.querySelectorAll('.demo-switch button');
  function showView(name) {
    Object.keys(views).forEach(function (k) {
      var on = (k === name);
      views[k].classList.toggle('active', on);
      if (on) {
        // one-shot entrance fade (kept off the base state so it never hides content)
        views[k].classList.remove('anim-in');
        void views[k].offsetWidth;
        views[k].classList.add('anim-in');
        setTimeout((function (el) { return function () { el.classList.remove('anim-in'); }; })(views[k]), 360);
      }
    });
    demoBtns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === name); });
    document.querySelector('main').scrollTop = 0;
    window.scrollTo(0, 0);
  }

  // open detail from a card
  function openDetail(id) {
    var g = groups.filter(function (x) { return x.id === id; })[0];
    if (g) {
      document.getElementById('detailCover').src = g.cover.replace('w=640&h=400', 'w=480&h=480');
      document.getElementById('detailCover').alt = 'Imagen del grupo ' + g.name;
      document.getElementById('detailName').textContent = g.name;
      document.getElementById('detailDesc').textContent = g.desc;
    }
    showView('detail');
  }
  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.group-card');
    if (card) openDetail(card.getAttribute('data-group'));
  });
  grid.addEventListener('keydown', function (e) {
    var card = e.target.closest('.group-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDetail(card.getAttribute('data-group')); }
  });

  document.getElementById('backLink').addEventListener('click', function () { showView('list'); });

  demoBtns.forEach(function (b) {
    b.addEventListener('click', function () { showView(b.getAttribute('data-view')); });
  });

  // invite form: prevent reload (prototype)
  document.getElementById('inviteForm').addEventListener('submit', function (e) { e.preventDefault(); });
})();
