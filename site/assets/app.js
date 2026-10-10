/* ==========================================================================
   NabilaXP - logika desktop
   Alur: layar mati > boot > selamat datang > desktop > (standby / matikan)
   ========================================================================== */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNarrow = () => window.matchMedia('(max-width: 820px)').matches;
const isTouch = () => window.matchMedia('(hover: none)').matches;

/* --------------------------------------------------------------------------
   Efek suara kecil (disintesis sendiri, tanpa berkas audio)
   -------------------------------------------------------------------------- */
const Sfx = {
  ctx: null,
  enabled: localStorage.getItem('nabila-xp-sound') !== 'off',

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (err) { this.ctx = null; }
  },

  tone(freq, dur, opts = {}) {
    if (!this.enabled || !this.ctx) return;
    const { type = 'sine', gain = 0.07, when = 0, to = null } = opts;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  click() { this.tone(980, 0.045, { gain: 0.045 }); },
  open() { this.tone(520, 0.1, { gain: 0.06 }); this.tone(780, 0.12, { gain: 0.05, when: 0.06 }); },
  close() { this.tone(700, 0.09, { gain: 0.05 }); this.tone(460, 0.12, { gain: 0.045, when: 0.06 }); },
  ding() { this.tone(880, 0.14, { gain: 0.06 }); this.tone(1318, 0.22, { gain: 0.05, when: 0.09 }); },
  error() { this.tone(185, 0.16, { type: 'square', gain: 0.05 }); this.tone(150, 0.2, { type: 'square', gain: 0.05, when: 0.12 }); },
  minimize() { this.tone(640, 0.07, { gain: 0.045, to: 420 }); },
  startup() {
    [392, 523.25, 659.25, 783.99].forEach((f, i) => {
      this.tone(f, 0.26, { gain: 0.055, when: i * 0.12, type: 'triangle' });
    });
    this.tone(1046.5, 0.5, { gain: 0.05, when: 0.5, type: 'sine' });
  },
  shutdown() {
    [659.25, 523.25, 392, 261.63].forEach((f, i) => {
      this.tone(f, 0.24, { gain: 0.05, when: i * 0.14, type: 'triangle' });
    });
  }
};

document.addEventListener('pointerdown', () => Sfx.init(), { once: true, capture: true });
document.addEventListener('keydown', () => Sfx.init(), { once: true, capture: true });

/* --------------------------------------------------------------------------
   Layar (power / boot / welcome / standby / shutdown)
   -------------------------------------------------------------------------- */
const screens = {
  power: $('#power'), boot: $('#boot'), welcome: $('#welcome'),
  standby: $('#standby'), shutdown: $('#shutdown'), desk: $('#desk')
};

function showScreen(name) {
  Object.values(screens).forEach((el) => { el.hidden = true; });
  if (name === 'desk') {
    screens.desk.hidden = false;
  } else {
    screens[name].hidden = false;
  }
}

let bootTimer = null;
let deskReady = false;
let greeted = false;

function startBoot() {
  showScreen('boot');
  Sfx.startup();
  clearTimeout(bootTimer);
  bootTimer = setTimeout(showWelcome, REDUCED ? 900 : 2700);
}

function showWelcome(noteText) {
  clearTimeout(bootTimer);
  const note = $('#welcome-note');
  note.textContent = noteText || 'Setelah masuk: klik dua kali ikon untuk membuka jendela, atau ikut tur bersama Mochi.';
  showScreen('welcome');
  $('#enter-btn').focus();
}

function enterDesk() {
  showScreen('desk');
  $('#taskbar').setAttribute('aria-hidden', 'false');
  if (!deskReady) {
    deskReady = true;
    startClock();
    if (!greeted) {
      greeted = true;
      const quiet = new URLSearchParams(location.search).get('quiet') === '1';
      if (!quiet) setTimeout(mochiGreeting, REDUCED ? 300 : 1100);
    }
  }
  $$('#icons .dicon')[0].focus();
  announce('Desktop Nabila siap. Tekan Tab untuk berpindah elemen, Enter untuk membuka.');
}

$('#power-btn').addEventListener('click', startBoot);
screens.boot.addEventListener('click', () => showWelcome());
screens.boot.addEventListener('keydown', () => showWelcome());
$('#enter-btn').addEventListener('click', enterDesk);
$('#wake-btn').addEventListener('click', () => { startBoot(); });

/* --------------------------------------------------------------------------
   Jam di baki sistem
   -------------------------------------------------------------------------- */
function startClock() {
  const el = $('#clock');
  const tick = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    el.textContent = hh + ':' + mm;
    el.title = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  tick();
  setInterval(tick, 1000);
}

/* --------------------------------------------------------------------------
   Tema
   -------------------------------------------------------------------------- */
function currentTheme() {
  return document.documentElement.classList.contains('classic') ? 'classic' : 'luna';
}

function setTheme(name, opts = {}) {
  const classic = name === 'classic';
  document.documentElement.classList.toggle('classic', classic);
  localStorage.setItem('nabila-xp-theme', name);
  syncThemeUI();
  if (!opts.silent) announce(classic ? 'Tema diubah ke Windows Classic.' : 'Tema diubah ke Luna, tampilan Windows XP.');
}

function syncThemeUI() {
  const now = currentTheme();
  $$('.th-radio').forEach((r) => { r.checked = r.value === now; });
  $$('.theme-opt').forEach((b) => {
    b.textContent = (b.dataset.theme === now ? '✓ ' : '\u00A0\u00A0 ') + (b.dataset.theme === 'classic' ? 'Tema Klasik' : 'Tema Luna');
  });
}

// Terapkan tema tersimpan sebelum desktop tampil
(function initTheme() {
  const saved = localStorage.getItem('nabila-xp-theme');
  if (saved === 'classic') document.documentElement.classList.add('classic');
})();
syncThemeUI();

/* --------------------------------------------------------------------------
   Notifikasi kecil + pengumuman layar pembaca
   -------------------------------------------------------------------------- */
function toast(title, text, opts = {}) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  const t = document.createElement('div');
  t.className = 'toast-title';
  t.textContent = title;
  const p = document.createElement('p');
  p.textContent = text;
  const x = document.createElement('button');
  x.className = 'toast-close';
  x.type = 'button';
  x.setAttribute('aria-label', 'Tutup notifikasi');
  x.textContent = '×';
  x.addEventListener('click', () => el.remove());
  el.append(t, p, x);
  box.append(el);
  const ms = opts.timeout == null ? 4600 : opts.timeout;
  if (ms > 0) setTimeout(() => el.remove(), ms);
}

function announce(text) {
  const live = $('#live');
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 30);
}

window.addEventListener('error', () => {
  if (!deskReady) return;
  toast('Ada gangguan kecil', 'Jendela terasa aneh? Coba muat ulang halaman ini ya.');
});

/* --------------------------------------------------------------------------
   Manajer jendela
   -------------------------------------------------------------------------- */
const WINDOWS = {
  about:   { title: 'Tentang Saya',            icon: 'i-about',    tpl: 'tpl-about',    w: 680, h: 620 },
  exp:     { title: 'Pengalaman Kerja',        icon: 'i-folder',   tpl: 'tpl-exp',      w: 780, h: 620 },
  edu:     { title: 'Pendidikan & Keahlian',   icon: 'i-book',     tpl: 'tpl-edu',      w: 720, h: 580 },
  contact: { title: 'Kontak',                  icon: 'i-mail',     tpl: 'tpl-contact',  w: 620, h: 520 },
  terminal:{ title: 'Command Prompt',          icon: 'i-terminal', tpl: 'tpl-terminal', w: 740, h: 520 },
  recycle: { title: 'Tempat Sampah',           icon: 'i-bin',      tpl: 'tpl-recycle',  w: 660, h: 500 },
  photo:   { title: 'Foto Saya - Penampil Gambar', icon: 'i-picture', tpl: 'tpl-photo', w: 800, h: 660 },
  display: { title: 'Properti Tampilan',       icon: 'i-display',  tpl: 'tpl-display',  w: 540, h: 560, face: true },
  help:    { title: 'Bantuan',                 icon: 'i-help',     tpl: 'tpl-help',     w: 700, h: 600 }
};

let zTop = 10;
const openWindows = new Map(); // id -> elemen

function windowChrome(id, def) {
  return `
    <div class="titlebar">
      <svg class="win-icon" aria-hidden="true"><use href="#${def.icon}"/></svg>
      <span class="win-title">${def.title}</span>
      <div class="win-btns">
        <button class="wbtn min" type="button" aria-label="Kecilkan jendela (minimize)" data-act="min"><svg aria-hidden="true"><use href="#i-min"/></svg></button>
        <button class="wbtn max" type="button" aria-label="Perbesar jendela (maximize)" data-act="max"><svg aria-hidden="true"><use href="#i-max"/></svg></button>
        <button class="wbtn close" type="button" aria-label="Tutup jendela" data-act="close"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
      </div>
    </div>
    <div class="menubar">
      <div class="menu">
        <button class="menu-btn" type="button" aria-haspopup="true" aria-expanded="false">File</button>
        <div class="menu-pop" hidden>
          <button class="menu-item" type="button" data-act="close">Tutup</button>
          <button class="menu-item" type="button" data-act="close-all">Tutup Semua Jendela</button>
        </div>
      </div>
      <div class="menu">
        <button class="menu-btn" type="button" aria-haspopup="true" aria-expanded="false">Tampilan</button>
        <div class="menu-pop" hidden>
          <button class="menu-item theme-opt" type="button" data-theme="luna">Tema Luna</button>
          <button class="menu-item theme-opt" type="button" data-theme="classic">Tema Klasik</button>
        </div>
      </div>
      <div class="menu">
        <button class="menu-btn" type="button" aria-haspopup="true" aria-expanded="false">Bantuan</button>
        <div class="menu-pop" hidden>
          <button class="menu-item" type="button" data-act="help">Cara Pakai</button>
          <button class="menu-item" type="button" data-act="about-site">Tentang Situs Ini</button>
        </div>
      </div>
    </div>
    <div class="win-content"></div>`;
}

function openWindow(id, opts = {}) {
  const def = WINDOWS[id];
  if (!def) return;
  const existing = openWindows.get(id);
  if (existing) {
    restoreWindow(existing);
    focusWindow(existing);
    if (opts.tab) activateTabIn(existing, opts.tab);
    return;
  }

  const win = document.createElement('section');
  win.className = 'window' + (def.face ? ' face' : '');
  win.id = 'win-' + id;
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', def.title);
  win.tabIndex = -1;
  const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-h')) || 32;
  const availW = window.innerWidth;
  const availH = window.innerHeight - bar - 14;
  const w = Math.min(def.w, availW - 48);
  const h = Math.min(def.h, availH - 16);
  win.style.setProperty('--ww', w + 'px');
  win.style.setProperty('--wh', h + 'px');

  if (!isNarrow()) {
    // Taruh jendela di tengah layar, dengan geser kecil untuk jendela berikutnya
    const step = openWindows.size % 4;
    const x = Math.max(8, Math.round((availW - w) / 2) + step * 24);
    const y = Math.max(8, Math.round((availH - h) / 2) + step * 20);
    win.style.setProperty('--wx', Math.min(x, Math.max(8, availW - w - 8)) + 'px');
    win.style.setProperty('--wy', Math.min(y, Math.max(8, availH - h - 4)) + 'px');
  } else {
    win.style.setProperty('--wx', '6px');
    win.style.setProperty('--wy', '6px');
  }

  win.innerHTML = windowChrome(id, def);
  const content = $('.win-content', win);
  const tpl = document.getElementById(def.tpl);
  content.append(tpl.content.cloneNode(true));

  $('#windowlayer').append(win);
  openWindows.set(id, win);

  makeDraggable(win);
  wireWindowButtons(win, id);
  wireMenus(win);
  initContent(id, win);

  focusWindow(win);
  addTaskButton(id, def, win);
  Sfx.open();
  announce('Jendela ' + def.title + ' dibuka.');

  win.addEventListener('pointerdown', () => focusWindow(win));

  if (opts.tab) activateTabIn(win, opts.tab);
  if (id === 'terminal') setTimeout(() => { const inp = $('#term-in', win); if (inp) inp.focus(); }, 40);
  return win;
}

function closeWindow(id) {
  const win = openWindows.get(id);
  if (!win) return;
  openWindows.delete(id);
  const btn = $(`.taskbtn[data-win="${id}"]`);
  if (btn) btn.remove();
  win.classList.add('closing');
  const hadFocus = win.contains(document.activeElement) || document.activeElement === win;
  setTimeout(() => {
    win.remove();
    if (hadFocus || document.activeElement === document.body) {
      const remaining = Array.from(openWindows.values())
        .filter((w) => !w.hidden)
        .sort((a, b) => (parseInt(b.style.zIndex || '0', 10) || 0) - (parseInt(a.style.zIndex || '0', 10) || 0));
      const next = remaining[0];
      if (next) { focusWindow(next); next.focus({ preventScroll: true }); }
      else $('#startbtn').focus();
    }
  }, REDUCED ? 1 : 150);
  Sfx.close();
  announce('Jendela ditutup.');
}

function closeAllWindows() {
  Array.from(openWindows.keys()).forEach((id, i) => setTimeout(() => closeWindow(id), i * 60));
}

function focusWindow(win) {
  if (!win || win.hidden) return;
  $$('.window').forEach((w) => w.classList.toggle('focused', w === win));
  zTop += 1;
  win.style.zIndex = zTop;
  $$('.taskbtn').forEach((b) => {
    const on = b.dataset.win === win.id.slice(4);
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function minimizeWindow(win) {
  win.hidden = true;
  const btn = $(`.taskbtn[data-win="${win.id.slice(4)}"]`);
  if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 2400); }
  Sfx.minimize();
  announce('Jendela dikecilkan. Buka lagi dari tombol di taskbar.');
}

function restoreWindow(win) {
  win.hidden = false;
}

function wireWindowButtons(win, id) {
  $$('.wbtn', win).forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      if (act === 'close') closeWindow(id);
      if (act === 'min') minimizeWindow(win);
      if (act === 'max') toggleMaximize(win);
    });
  });
}

function toggleMaximize(win) {
  const maxed = win.classList.toggle('max');
  const use = $('.wbtn.max use', win);
  if (use) use.setAttribute('href', maxed ? '#i-restore' : '#i-max');
  $('.wbtn.max', win).setAttribute('aria-label', maxed ? 'Kembalikan ukuran jendela' : 'Perbesar jendela (maximize)');
  Sfx.click();
}

function makeDraggable(win) {
  const bar = $('.titlebar', win);
  bar.addEventListener('pointerdown', (e) => {
    focusWindow(win);
    if (isNarrow() || win.classList.contains('max')) return;
    if (e.target.closest('.wbtn')) return;
    const rect = win.getBoundingClientRect();
    const desk = screens.desk.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = rect.left - desk.left;
    const baseY = rect.top - desk.top;
    const maxX = Math.max(0, desk.width - rect.width);
    const maxY = Math.max(0, desk.height - rect.height - 6);
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

    const move = (ev) => {
      const x = clamp(baseX + ev.clientX - startX, 0, maxX);
      const y = clamp(baseY + ev.clientY - startY, 0, maxY);
      win.style.setProperty('--wx', x + 'px');
      win.style.setProperty('--wy', y + 'px');
    };
    const up = () => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
    };
    bar.setPointerCapture(e.pointerId);
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  });
}

/* Menu di bilah menu jendela */
function wireMenus(win) {
  const menuBtns = $$('.menu-btn', win);
  const closeAll = () => $$('.menu', win).forEach((m) => {
    $('.menu-pop', m).hidden = true;
    $('.menu-btn', m).setAttribute('aria-expanded', 'false');
  });
  menuBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = $('.menu-pop', btn.parentElement);
      const isOpen = !pop.hidden;
      closeAll();
      if (!isOpen) {
        pop.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        const first = $('button', pop);
        if (first) first.focus();
      }
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        btn.click();
      }
    });
  });
  $$('.menu-pop .menu-item', win).forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAll();
      const act = item.dataset.act;
      if (act === 'close') closeWindow(win.id.slice(4));
      if (act === 'close-all') closeAllWindows();
      if (act === 'help' || act === 'about-site') openWindow('help');
      if (item.dataset.theme) setTheme(item.dataset.theme);
    });
  });
  win.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const anyOpen = $$('.menu', win).some((m) => !$('.menu-pop', m).hidden);
      if (anyOpen) {
        closeAll();
        e.stopPropagation();
      }
    }
  });
}

document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.menu')) {
    $$('.window .menu').forEach((m) => {
      $('.menu-pop', m).hidden = true;
      $('.menu-btn', m).setAttribute('aria-expanded', 'false');
    });
  }
  if (!e.target.closest('#startmenu') && !e.target.closest('#startbtn')) closeStartMenu();
});

/* Tombol taskbar */
function addTaskButton(id, def, win) {
  const btn = document.createElement('button');
  btn.className = 'taskbtn';
  btn.type = 'button';
  btn.dataset.win = id;
  btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML = `<svg aria-hidden="true"><use href="#${def.icon}"/></svg><span>${def.title}</span>`;
  btn.addEventListener('click', () => {
    if (win.hidden) { restoreWindow(win); focusWindow(win); }
    else if (win.classList.contains('focused')) minimizeWindow(win);
    else focusWindow(win);
  });
  $('#tasklist').append(btn);
}

/* --------------------------------------------------------------------------
   Isi jendela per jenis
   -------------------------------------------------------------------------- */
function initContent(id, win) {
  if (id === 'exp' || id === 'edu') {
    $$('.tabs', win).forEach(initTabs);
  }
  if (id === 'terminal') initTerminal(win);
  if (id === 'recycle') initBin(win);
  if (id === 'photo') initViewer(win);
  if (id === 'display') initDisplay(win);
}

/* Komponen tab */
function initTabs(root) {
  const tabs = $$('.tab', root);
  const activate = (tab) => {
    tabs.forEach((t) => {
      const sel = t === tab;
      t.setAttribute('aria-selected', sel ? 'true' : 'false');
      t.tabIndex = sel ? 0 : -1;
      const panel = document.getElementById(t.dataset.tab);
      if (panel) panel.hidden = !sel;
    });
    Sfx.click();
  };
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab));
  });
  const bar = $('.tabbar', root);
  bar.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === 'Home') next = tabs[0];
    if (e.key === 'End') next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      activate(next);
      next.focus();
    }
  });
}

function activateTabIn(win, panelId) {
  const tab = $(`.tab[data-tab="${panelId}"]`, win);
  if (tab) tab.click();
}

/* Terminal */
function initTerminal(win) {
  const out = $('#term-out', win);
  const input = $('#term-in', win);
  const history = [];
  let hIndex = -1;

  const add = (text, cls) => {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    out.append(line);
    out.scrollTop = out.scrollHeight;
  };

  const COMMANDS = {
    bantuan: 'Menampilkan daftar perintah',
    tentang: 'Membuka jendela Tentang Saya',
    pengalaman: 'Membuka jendela Pengalaman Kerja',
    pendidikan: 'Membuka jendela Pendidikan',
    keahlian: 'Membuka jendela Keahlian',
    kontak: 'Membuka jendela Kontak',
    email: 'Menampilkan alamat email',
    telepon: 'Menampilkan nomor telepon',
    foto: 'Membuka penampil foto',
    tur: 'Memulai Tur Cerita bersama Mochi',
    dir: 'Melihat isi desktop',
    waktu: 'Menampilkan jam sekarang',
    tanggal: 'Menampilkan tanggal hari ini',
    siapa: 'Menampilkan pemilik desktop',
    tema: 'Mengganti tema: tema luna / tema klasik',
    bersihkan: 'Membersihkan layar',
    keluar: 'Menutup terminal'
  };

  const helpText = () => {
    let s = 'Perintah yang tersedia:\n\n';
    Object.keys(COMMANDS).forEach((k) => { s += '  ' + k.padEnd(12) + COMMANDS[k] + '\n'; });
    s += '\nPsst... ada beberapa perintah rahasia. Coba tebak.';
    return s;
  };

  const run = (raw) => {
    const line = raw.trim();
    const echo = document.createElement('div');
    echo.textContent = 'Nabila:\\> ' + line;
    echo.className = 't-dim';
    out.append(echo);

    if (!line) { out.scrollTop = out.scrollHeight; return; }
    history.push(line);
    hIndex = history.length;

    const [cmd, ...rest] = line.toLowerCase().split(/\s+/);
    const arg = rest.join(' ');

    switch (cmd) {
      case 'bantuan': case 'help': case '?':
        add(helpText()); break;
      case 'tentang': openWindow('about'); add('Membuka Tentang Saya...', 't-ok'); break;
      case 'pengalaman': openWindow('exp'); add('Membuka Pengalaman Kerja...', 't-ok'); break;
      case 'pendidikan': openWindow('edu'); add('Membuka Pendidikan...', 't-ok'); break;
      case 'keahlian': openWindow('edu', { tab: 'edu-skill' }); add('Membuka Keahlian...', 't-ok'); break;
      case 'kontak': openWindow('contact'); add('Membuka Kontak...', 't-ok'); break;
      case 'email': add('nabilasyafika499@gmail.com', 't-ok'); break;
      case 'telepon': case 'hp': case 'wa': add('+62 896-6648-2753 (bisa lewat WhatsApp)', 't-ok'); break;
      case 'foto': openWindow('photo'); add('Membuka Foto Saya...', 't-ok'); break;
      case 'tur': add('Mochi datang!', 't-ok'); startTour(); break;
      case 'dir':
        add(' Volume in drive N adalah NABILA\n Directory of N:\\Desktop\n\n' +
            ' Tentang Saya        Pengalaman Kerja    Pendidikan & Keahlian\n' +
            ' Kontak              Foto Saya           Tur Cerita\n' +
            ' Tempat Sampah       Command Prompt\n\n' +
            '      7 item di desktop, 0 berkas disembunyikan.');
        break;
      case 'waktu': add('Sekarang jam ' + new Date().toLocaleTimeString('id-ID') + '.'); break;
      case 'tanggal': add('Hari ini ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.'); break;
      case 'siapa':
        add('nabila: pemilik desktop ini (lulusan SMK TKJ, cepat belajar).\nkamu: tamu kehormatan. Selamat datang!', 't-ok');
        break;
      case 'tema':
        if (arg === 'luna') { setTheme('luna'); add('Tema diganti ke Luna. Warna biru khas Windows XP kembali.', 't-ok'); }
        else if (arg === 'klasik' || arg === 'classic') { setTheme('classic'); add('Tema diganti ke Klasik. Nuansa jadul yang rapi.', 't-ok'); }
        else add('Pemakaian: tema luna   atau   tema klasik', 't-err');
        break;
      case 'bersihkan': case 'cls': case 'clear':
        out.textContent = '';
        break;
      case 'keluar': case 'exit':
        add('Menutup terminal. Sampai jumpa!'); closeWindow('terminal'); break;
      case 'meong':
        add(' /\\_/\\ \n( o.o )  Meoong! Mochi melambai dari sudut desktop.\n > ^ <', 't-ok');
        break;
      case 'sudo':
        add('Akses ditolak. Kamu bukan admin, dan ini bukan Linux. :)', 't-err');
        break;
      default:
        add("'" + line + "' bukan perintah yang dikenal. Ketik bantuan untuk melihat daftar perintah.", 't-err');
        Sfx.error();
    }
    out.scrollTop = out.scrollHeight;
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      run(input.value);
      input.value = '';
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hIndex > 0) { hIndex -= 1; input.value = history[hIndex] || ''; }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIndex < history.length - 1) { hIndex += 1; input.value = history[hIndex]; }
      else { hIndex = history.length; input.value = ''; }
    }
  });

  win.addEventListener('pointerdown', () => setTimeout(() => input.focus(), 20));
}

/* Tempat sampah */
function initBin(win) {
  const item = $('#bin-item', win);
  const empty = $('#bin-empty', win);
  const restoreBtn = $('#bin-restore', win);
  const emptyBtn = $('#bin-empty-btn', win);

  const refresh = (removed) => {
    item.hidden = true;
    empty.hidden = false;
    restoreBtn.disabled = true;
    emptyBtn.disabled = true;
    if (removed) {
      toast('Tempat sampah dibersihkan', 'ragu-diri.txt dibuang untuk selamanya. Itu cara yang tepat.');
    } else {
      toast('Berhasil dipulihkan', 'ragu-diri.txt kembali ke desktop hati. Semangat!');
    }
    Sfx.ding();
  };

  restoreBtn.addEventListener('click', () => refresh(false));
  emptyBtn.addEventListener('click', () => refresh(true));
}

/* Penampil foto */
function initViewer(win) {
  const img = $('#viewer-img', win);
  const label = $('#vw-zoomlabel', win);
  const zoomIn = $('#vw-zoomin', win);
  const zoomOut = $('#vw-zoomout', win);
  const steps = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  let zi = 2;
  let rot = 0;

  const apply = () => {
    img.style.transform = 'scale(' + steps[zi] + ') rotate(' + rot + 'deg)';
    label.textContent = Math.round(steps[zi] * 100) + '%';
    zoomIn.disabled = zi === steps.length - 1;
    zoomOut.disabled = zi === 0;
  };

  zoomIn.addEventListener('click', () => { if (zi < steps.length - 1) { zi += 1; apply(); } });
  zoomOut.addEventListener('click', () => { if (zi > 0) { zi -= 1; apply(); } });
  $('#vw-rotl', win).addEventListener('click', () => { rot -= 90; apply(); });
  $('#vw-rotr', win).addEventListener('click', () => { rot += 90; apply(); });
  apply();
}

/* Properti tampilan */
function initDisplay(win) {
  $$('.th-radio', win).forEach((r) => {
    r.addEventListener('change', () => { if (r.checked) setTheme(r.value); });
  });
  $('#disp-ok', win).addEventListener('click', () => closeWindow('display'));
  syncThemeUI();
}

/* --------------------------------------------------------------------------
   Ikon desktop
   -------------------------------------------------------------------------- */
$$('#icons .dicon').forEach((icon) => {
  icon.addEventListener('click', (e) => {
    if (isTouch() || e.detail === 0) {
      fireIcon(icon);
    } else {
      $$('#icons .dicon').forEach((i) => i.classList.remove('sel'));
      icon.classList.add('sel');
    }
  });
  icon.addEventListener('dblclick', () => fireIcon(icon));
  icon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fireIcon(icon); }
  });
});

function fireIcon(icon) {
  const target = icon.dataset.open;
  Sfx.click();
  if (target === 'tour') startTour();
  else openWindow(target);
}

$('#desk').addEventListener('pointerdown', (e) => {
  if (e.target.closest('.dicon') || e.target.closest('.window') || e.target.closest('#taskbar') || e.target.closest('#startmenu') || e.target.closest('#mochi')) return;
  $$('#icons .dicon').forEach((i) => i.classList.remove('sel'));
});

/* --------------------------------------------------------------------------
   Menu start + tray + tombol daya
   -------------------------------------------------------------------------- */
const startMenu = $('#startmenu');
const startBtn = $('#startbtn');

function openStartMenu() {
  startMenu.hidden = false;
  startBtn.setAttribute('aria-expanded', 'true');
  Sfx.click();
  const first = $('.sm-item', startMenu);
  if (first) first.focus();
}
function closeStartMenu() {
  if (startMenu.hidden) return;
  startMenu.hidden = true;
  startBtn.setAttribute('aria-expanded', 'false');
}
startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (startMenu.hidden) openStartMenu(); else closeStartMenu();
});
startBtn.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); openStartMenu(); }
});

$$('.sm-item').forEach((item) => {
  item.addEventListener('click', () => {
    closeStartMenu();
    const t = item.dataset.open;
    if (t === 'tour') startTour(); else openWindow(t);
  });
});

$('#logoffbtn').addEventListener('click', () => {
  closeStartMenu();
  Sfx.close();
  showWelcome('Sesi ditutup sementara. Klik foto untuk kembali ke desktop.');
});
$('#shutdownbtn').addEventListener('click', () => { closeStartMenu(); openShutdownDialog(); });

/* Suara */
const soundBtn = $('#tray-sound');
function syncSoundBtn() {
  const use = $('use', soundBtn);
  use.setAttribute('href', Sfx.enabled ? '#i-sound' : '#i-mute');
  soundBtn.setAttribute('aria-pressed', Sfx.enabled ? 'false' : 'true');
  soundBtn.title = Sfx.enabled ? 'Suara aktif. Klik untuk senyapkan.' : 'Suara senyap. Klik untuk menyalakan.';
}
soundBtn.addEventListener('click', () => {
  Sfx.enabled = !Sfx.enabled;
  localStorage.setItem('nabila-xp-sound', Sfx.enabled ? 'on' : 'off');
  syncSoundBtn();
  if (Sfx.enabled) Sfx.ding();
  announce(Sfx.enabled ? 'Suara dinyalakan.' : 'Suara disenyapkan.');
});
syncSoundBtn();

/* Tampilkan desktop */
$('#tray-showdesk').addEventListener('click', () => {
  const wins = Array.from(openWindows.values()).filter((w) => !w.hidden);
  if (!wins.length) { announce('Desktop sudah terlihat.'); return; }
  wins.forEach((w) => minimizeWindow(w));
  Sfx.click();
});

/* --------------------------------------------------------------------------
   Dialog matikan komputer
   -------------------------------------------------------------------------- */
const modal = $('#modal');
let modalReturnFocus = null;

function openShutdownDialog() {
  modalReturnFocus = document.activeElement;
  modal.hidden = false;
  $('#sd-standby').focus();
}
function closeShutdownDialog() {
  modal.hidden = true;
  if (modalReturnFocus) modalReturnFocus.focus();
}

modal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    const focusables = $$('button', $('#shutdown-dialog'));
    const i = focusables.indexOf(document.activeElement);
    e.preventDefault();
    const next = e.shiftKey ? (i - 1 + focusables.length) % focusables.length : (i + 1) % focusables.length;
    focusables[next].focus();
  }
});

$('#sd-cancel').addEventListener('click', closeShutdownDialog);

$('#sd-standby').addEventListener('click', () => {
  closeShutdownDialog();
  showScreen('standby');
  Sfx.click();
});
screens.standby.addEventListener('click', () => { showScreen('desk'); announce('Komputer bangun kembali.'); });

$('#sd-off').addEventListener('click', () => {
  closeShutdownDialog();
  Sfx.shutdown();
  showScreen('shutdown');
  $('#shutdown').classList.remove('off');
  $('#shutdown-title').textContent = 'Menutup sesi Nabila...';
  $('#shutdown-note').hidden = true;
  $('#wake-btn').hidden = true;
  setTimeout(() => {
    $('#shutdown').classList.add('off');
    $('#shutdown-title').textContent = 'Komputer dimatikan';
    $('#shutdown-note').hidden = false;
    $('#wake-btn').hidden = false;
    $('#wake-btn').focus();
  }, REDUCED ? 400 : 1500);
});

$('#sd-restart').addEventListener('click', () => {
  closeShutdownDialog();
  Sfx.shutdown();
  showScreen('shutdown');
  $('#shutdown').classList.remove('off');
  $('#shutdown-title').textContent = 'Memulai ulang...';
  $('#shutdown-note').hidden = true;
  $('#wake-btn').hidden = true;
  setTimeout(startBoot, REDUCED ? 500 : 1600);
});

/* --------------------------------------------------------------------------
   Mochi dan Tur Cerita
   -------------------------------------------------------------------------- */
const mochi = $('#mochi');
const bubble = $('#mochi-bubble');
const bubbleText = $('#bubble-text');
const bubbleNext = $('#bubble-next');
const bubbleSkip = $('#bubble-skip');

let typeTimer = null;
let typeToken = 0;
let tourIndex = -1;
let tourActive = false;
let mochiOnBubble = null;

const TOUR = [
  { text: 'Ikuti tur kilat ya, sebentar saja. Aku temani keliling desktop Nabila.', cta: 'Mulai' },
  { text: 'Nabila Syafika Firdaus. Lulusan SMK Teknik Komputer dan Jaringan, berpengalaman di bidang administrasi, produksi, dan desain grafis.', open: 'about', cta: 'Lanjut' },
  { text: 'Bekalnya: pengolahan data, administrasi transaksi B2B/B2C, jaringan komputer, sampai desain grafis CorelDraw.', open: 'edu', tab: 'edu-skill', cta: 'Lanjut' },
  { text: 'Perjalanan kerjanya: dari magang desain grafis, operator produksi, sampai admin. Klik tiap tab untuk cerita lengkapnya.', open: 'exp', tab: 'exp-sum', cta: 'Lanjut' },
  { text: 'Dan ini foto terbarunya. Salam kenal, ya!', open: 'photo', cta: 'Lanjut' },
  { text: 'Tur selesai! Coba juga Terminal dan Tempat Sampah kalau penasaran. Selamat menjelajah.', cta: 'Selesai' }
];

function typeText(text) {
  if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  const token = ++typeToken;
  if (REDUCED) { bubbleText.textContent = text; return; }
  bubbleText.textContent = '';
  let i = 0;
  typeTimer = setInterval(() => {
    if (token !== typeToken) { clearInterval(typeTimer); return; }
    i += 1;
    bubbleText.textContent = text.slice(0, i);
    if (i >= text.length) { clearInterval(typeTimer); typeTimer = null; }
  }, 17);
}

function showBubble(text, opts = {}) {
  mochi.hidden = false;
  bubble.hidden = false;
  typeText(text);
  bubbleNext.textContent = opts.nextLabel || 'Lanjut';
  bubbleSkip.hidden = !opts.skipLabel;
  if (opts.skipLabel) bubbleSkip.textContent = opts.skipLabel;
  mochiOnBubble = opts.onNext || null;
}

function hideBubble() {
  bubble.hidden = true;
  mochiOnBubble = null;
}

function mochiGreeting() {
  mochi.hidden = false;
  tourActive = false;
  showBubble('Hai! Aku Mochi, penjaga desktop ini. Mau tur kilat keliling portofolio, atau jelajah bebas?', {
    nextLabel: 'Mulai Tur',
    skipLabel: 'Jelajah Bebas',
    onNext: startTour
  });
}

function startTour() {
  tourActive = true;
  tourIndex = 0;
  showTourStep();
}

function showTourStep() {
  const step = TOUR[tourIndex];
  if (!step) return endTour();
  if (step.open) openWindow(step.open, { tab: step.tab });
  const last = tourIndex === TOUR.length - 1;
  if (!step.open && tourIndex === 0) hideBubble();
  showBubble(step.text, {
    nextLabel: step.cta || (last ? 'Selesai' : 'Lanjut'),
    skipLabel: 'Lewati Tur',
    onNext: () => {
      if (last) endTour();
      else { tourIndex += 1; showTourStep(); }
    }
  });
  if (tourIndex === 0) mochiOnBubble = null; // langkah pembuka memakai tombol "Mulai"
}

function endTour() {
  tourActive = false;
  tourIndex = -1;
  hideBubble();
  toast('Tur selesai', 'Terima kasih sudah mampir. Klik aku kapan saja untuk tur lagi.');
  Sfx.ding();
}

bubbleNext.addEventListener('click', () => {
  Sfx.click();
  if (tourActive && tourIndex === 0) {
    tourIndex = 1;
    showTourStep();
    return;
  }
  if (mochiOnBubble) mochiOnBubble(); else hideBubble();
});

bubbleSkip.addEventListener('click', () => {
  if (tourActive) {
    endTour();
    toast('Jelajah bebas', 'Klik dua kali ikon untuk membuka jendela. Terminal dan Tempat Sampah menunggu.');
  } else {
    hideBubble();
  }
});

$('#mochi-cat').addEventListener('click', () => {
  if (!bubble.hidden) { hideBubble(); return; }
  showBubble('Ada yang bisa kubantu? Semua halaman bisa dibuka dari menu start, atau kita tur lagi.', {
    nextLabel: 'Ulangi Tur',
    skipLabel: 'Tutup',
    onNext: () => { hideBubble(); startTour(); }
  });
  Sfx.click();
});

/* --------------------------------------------------------------------------
   Papan ketik
   -------------------------------------------------------------------------- */
document.addEventListener('keydown', (e) => {
  if (!modal.hidden) {
    if (e.key === 'Escape') { closeShutdownDialog(); }
    return;
  }
  if (e.key === 'Escape') {
    if (!startMenu.hidden) { closeStartMenu(); startBtn.focus(); return; }
    const openMenu = $$('.window .menu').find((m) => !$('.menu-pop', m).hidden);
    if (openMenu) {
      $('.menu-pop', openMenu).hidden = true;
      $('.menu-btn', openMenu).setAttribute('aria-expanded', 'false');
      return;
    }
    const visible = Array.from(openWindows.values()).filter((w) => !w.hidden);
    const focusedWin = visible.find((w) => w.classList.contains('focused')) || visible[visible.length - 1];
    if (focusedWin) closeWindow(focusedWin.id.slice(4));
  }
});

/* --------------------------------------------------------------------------
   Jalan pintas (deep link): ?screen=desktop&open=about&tab=edu-skill&quiet=1
   -------------------------------------------------------------------------- */
(function bootFromQuery() {
  const q = new URLSearchParams(location.search);
  if (q.get('screen') === 'desktop') {
    enterDesk();
    if (q.get('quiet') === '1') hideBubble();
    const open = q.get('open');
    if (open && WINDOWS[open]) {
      setTimeout(() => openWindow(open, { tab: q.get('tab') }), 200);
    }
  }
})();
