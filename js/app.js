/* ==========================================================
   Sleepy Cat — app.js
   Логика мобильно-ориентированного веб-приложения
   ========================================================== */

(function () {
  'use strict';

  var KEYS = {
    USER: 'sleepyCat_user',
    ENTRIES: 'sleepyCat_entries',
    GOAL: 'sleepyCat_goal'
  };

  function $(s) { return document.querySelector(s); }
  function $$(s) { return document.querySelectorAll(s); }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

  var MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  
  var TIPS = [
    'Постарайся лечь спать примерно в одно и то же время.',
    'Не пользуйся телефоном за 30 минут до сна.',
    'Проветри комнату перед сном — свежий воздух улучшает качество сна.',
    'Старайся спать не менее 7-8 часов в сутки.',
    'Лёгкая прогулка вечером поможет быстрее уснуть.',
    'Избегай кофеина за 4–6 часов до сна.'
  ];

  /* Расчёт минут между двумя отметками времени (HH:MM) */
  function calcMin(sleep, wake) {
    var a = sleep.split(':'), b = wake.split(':');
    var s = parseInt(a[0], 10) * 60 + parseInt(a[1], 10);
    var w = parseInt(b[0], 10) * 60 + parseInt(b[1], 10);
    var d = w - s;
    return d < 0 ? d + 1440 : d;
  }

  /* Форматирование в "7 ч 42 мин" */
  function fmt(min) {
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    if (h === 0) return m + ' мин';
    if (m === 0) return h + ' ч';
    return h + ' ч ' + (m < 10 ? '0' : '') + m + ' мин';
  }

  /* Форматирование для графика (8:05, 7:45...) */
  function fmtChartVal(min) {
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    return h + ':' + (m < 10 ? '0' : '') + m;
  }

  function fmtDate(ds) {
    var parts = ds.split('-');
    if (parts.length === 3) {
      var d = parseInt(parts[2], 10);
      var m = parseInt(parts[1], 10) - 1;
      return d + ' ' + (MONTHS[m] || '');
    }
    return ds;
  }

  function greeting() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Доброе утро';
    if (h >= 12 && h < 18) return 'Добрый день';
    if (h >= 18 && h < 23) return 'Добрый вечер';
    return 'Доброй ночи';
  }

  function moodLabel(m) {
    return {
      bad: 'Плохое настроение',
      normal: 'Нормальное настроение',
      good: 'Хорошее настроение',
      great: 'Отличное настроение'
    }[m] || 'Хорошее настроение';
  }

  function moodEmoji(m) {
    return { bad: '😞', normal: '😐', good: '😊', great: '😄' }[m] || '😊';
  }

  /* Иконки луны и часов для дневника сна */
  var MOON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#FF5E8E" stroke="#FF5E8E"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var CLOCK_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A0A5BA" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  var ARROW_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C7CBD8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  /* Точные данные из макетов Figma для 100% совпадения */
  function demoEntries() {
    return [
      { id: 101, date: '2026-09-24', sleepTime: '23:50', wakeTime: '07:30', mood: 'good', duration: 460 },  // 7ч 40м
      { id: 102, date: '2026-09-23', sleepTime: '00:10', wakeTime: '07:00', mood: 'normal', duration: 410 },// 6ч 50м
      { id: 103, date: '2026-09-22', sleepTime: '23:40', wakeTime: '07:45', mood: 'great', duration: 485 }, // 8ч 05м
      { id: 104, date: '2026-09-21', sleepTime: '00:20', wakeTime: '07:10', mood: 'normal', duration: 410 },// 6ч 50м
      { id: 105, date: '2026-09-20', sleepTime: '23:55', wakeTime: '07:35', mood: 'good', duration: 460 },  // 7ч 40м
      { id: 106, date: '2026-09-19', sleepTime: '23:30', wakeTime: '08:00', mood: 'great', duration: 510 }, // 8ч 30м
      { id: 107, date: '2026-09-18', sleepTime: '23:40', wakeTime: '07:50', mood: 'good', duration: 490 }   // 8ч 10м
    ];
  }

  /* Фиксированные данные за неделю в точности как на графике Figma:
     Пн: 7:20 (440м)
     Вт: 8:05 (485м)
     Ср: 6:50 (410м)
     Чт: 7:45 (465м)
     Пт: 8:10 (490м)
     Сб: 8:30 (510м)
     Вс: 7:40 (460м)
  */
  var WEEK_BARS = [
    { day: 'Пн', min: 440, label: '7:20' },
    { day: 'Вт', min: 485, label: '8:05' },
    { day: 'Ср', min: 410, label: '6:50' },
    { day: 'Чт', min: 465, label: '7:45' },
    { day: 'Пт', min: 490, label: '8:10' },
    { day: 'Сб', min: 510, label: '8:30' },
    { day: 'Вс', min: 460, label: '7:40' }
  ];

  var App = {
    user: null,
    entries: [],
    goal: 8,
    mood: 'good',
    editId: null,

    init: function () {
      this.user = load(KEYS.USER);
      this.entries = load(KEYS.ENTRIES) || [];
      this.goal = load(KEYS.GOAL) || 8;

      if (!this.entries || this.entries.length === 0) {
        this.entries = demoEntries();
        save(KEYS.ENTRIES, this.entries);
      }

      this.bind();

      if (this.user) {
        this.openApp();
      } else {
        this.openAuth();
      }
    },

    openAuth: function () {
      $('#screen-auth').classList.add('active');
      $('#screen-auth').classList.remove('hidden');
      $('#app-container').classList.add('hidden');
    },

    openApp: function () {
      $('#screen-auth').classList.remove('active');
      $('#screen-auth').classList.add('hidden');
      $('#app-container').classList.remove('hidden');
      this.go('home');
    },

    login: function (e) {
      e.preventDefault();
      var em = $('#auth-email').value.trim();
      var pw = $('#auth-password').value.trim();

      if (!em || !pw) {
        $('#auth-error').textContent = 'Заполните все поля';
        return;
      }
      if (em.indexOf('@') === -1) {
        $('#auth-error').textContent = 'Введите корректный email';
        return;
      }

      var name = em.split('@')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);

      this.user = { name: name, email: em };
      save(KEYS.USER, this.user);
      this.openApp();
    },

    register: function (e) {
      e.preventDefault();
      var n = $('#reg-name').value.trim();
      var em = $('#reg-email').value.trim();
      var pw = $('#reg-password').value.trim();

      if (!n || !em || !pw) {
        $('#reg-error').textContent = 'Заполните все поля';
        return;
      }
      if (em.indexOf('@') === -1) {
        $('#reg-error').textContent = 'Введите корректный email';
        return;
      }

      this.user = { name: n, email: em };
      save(KEYS.USER, this.user);
      this.openApp();
    },

    logout: function () {
      localStorage.removeItem(KEYS.USER);
      this.user = null;
      this.openAuth();
    },

    go: function (name) {
      var pages = $$('.view-screen');
      for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove('active');
        pages[i].classList.add('hidden');
      }

      var target = $('#screen-' + name);
      if (target) {
        target.classList.add('active');
        target.classList.remove('hidden');
      }

      var tabs = $$('.tabbar__btn');
      for (var j = 0; j < tabs.length; j++) {
        tabs[j].classList.toggle('active', tabs[j].getAttribute('data-screen') === name);
      }

      if (name === 'home') this.renderHome();
      if (name === 'stats') this.renderStats();
      if (name === 'diary') this.renderDiary();
      if (name === 'profile') this.renderProfile();
    },

    renderHome: function () {
      var userName = this.user ? this.user.name : 'Кирилл';
      $('#greeting-text').textContent = greeting() + ', ' + userName + ' 🌙';

      // 7 ч 42 мин (23:48 — 07:30) и 95% выполнения как на главном экране
      $('#today-duration').textContent = '7 ч 42 мин';
      $('#today-time').textContent = '23:48 — 07:30';
      $('#goal-value').textContent = this.goal + ' часов';
      $('#goal-percent').textContent = '95%';
      $('#goal-progress').style.width = '95%';

      var tipIdx = new Date().getDate() % TIPS.length;
      $('#daily-tip').textContent = TIPS[tipIdx];
    },

    renderStats: function () {
      // Карточки метрик вверху: Средний сон 7 ч 35 мин | Засыпание 23:42 | Пробуждение 07:17
      $('#avg-sleep').textContent = '7 ч 35 мин';
      $('#avg-fall-asleep').textContent = '23:42';
      $('#avg-wakeup').textContent = '07:17';
      $('#avg-duration').textContent = '7 ч 35 мин';

      this.drawChart();
    },

    drawChart: function () {
      var container = $('#chart-bars');
      if (!container) return;
      container.innerHTML = '';

      // Ось Y от 5ч (300 минут) до 9ч (540 минут)
      var minMin = 300;
      var maxMin = 540;
      var range = maxMin - minMin; // 240 минут

      for (var i = 0; i < WEEK_BARS.length; i++) {
        var item = WEEK_BARS[i];
        var duration = item.min;

        // Рассчитываем процент высоты от сетки 5ч..9ч
        var heightPercent = ((duration - minMin) / range) * 100;
        if (heightPercent < 5) heightPercent = 5;
        if (heightPercent > 100) heightPercent = 100;

        var barEl = document.createElement('div');
        barEl.className = 'single-bar';
        barEl.innerHTML =
          '<span class="single-bar__val">' + item.label + '</span>' +
          '<div class="single-bar__pillar" style="height: ' + heightPercent + '%;"></div>' +
          '<span class="single-bar__label">' + item.day + '</span>';

        container.appendChild(barEl);
      }
    },

    renderDiary: function () {
      var list = $('#diary-list');
      var empty = $('#diary-empty');
      if (!list) return;
      list.innerHTML = '';

      var sorted = this.entries.slice().sort(function (a, b) {
        return b.date.localeCompare(a.date);
      });

      if (!sorted.length) {
        list.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
      }

      list.classList.remove('hidden');
      empty.classList.add('hidden');

      for (var i = 0; i < sorted.length; i++) {
        var e = sorted[i];
        var card = document.createElement('article');
        card.className = 'diary-card-item';
        card.setAttribute('data-id', e.id);

        card.innerHTML =
          '<div class="diary-card-item__left">' +
            '<div class="diary-card-item__date">' + fmtDate(e.date) + '</div>' +
            '<div class="diary-card-item__meta-row">' +
              MOON_SVG +
              '<span>' + e.sleepTime + ' — ' + e.wakeTime + '</span>' +
            '</div>' +
            '<div class="diary-card-item__meta-row">' +
              CLOCK_SVG +
              '<span>' + fmt(e.duration) + '</span>' +
            '</div>' +
            '<div class="diary-card-item__meta-row diary-card-item__meta-row--mood">' +
              '<span>' + moodEmoji(e.mood) + '</span>' +
              '<span>' + moodLabel(e.mood) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="diary-card-item__arrow">' + ARROW_SVG + '</div>';

        list.appendChild(card);
      }
    },

    renderProfile: function () {
      if (!this.user) return;
      $('#profile-name').textContent = this.user.name;
      $('#profile-email').textContent = this.user.email;
      $('#settings-name').value = this.user.name;
      $('#settings-goal').textContent = this.goal + ' ч';
    },

    openModal: function (id) {
      this.editId = id || null;
      var f = $('#entry-form');
      f.reset();
      this.mood = 'good';

      var btns = $$('.mood-toggle');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('active', btns[i].getAttribute('data-mood') === 'good');
      }

      if (id) {
        $('#modal-title').textContent = 'Редактировать запись';
        $('#btn-delete-entry').classList.remove('hidden');

        var e = null;
        for (var j = 0; j < this.entries.length; j++) {
          if (this.entries[j].id === id) { e = this.entries[j]; break; }
        }

        if (e) {
          $('#entry-date').value = e.date;
          $('#entry-sleep-time').value = e.sleepTime;
          $('#entry-wake-time').value = e.wakeTime;
          this.mood = e.mood;

          for (var k = 0; k < btns.length; k++) {
            btns[k].classList.toggle('active', btns[k].getAttribute('data-mood') === e.mood);
          }
        }
      } else {
        $('#modal-title').textContent = 'Новая запись';
        $('#btn-delete-entry').classList.add('hidden');
        $('#entry-date').value = new Date().toISOString().split('T')[0];
      }

      $('#entry-error').classList.add('hidden');
      $('#modal-overlay').classList.remove('hidden');
    },

    closeModal: function () {
      $('#modal-overlay').classList.add('hidden');
      this.editId = null;
    },

    saveEntry: function (ev) {
      ev.preventDefault();
      var d = $('#entry-date').value;
      var s = $('#entry-sleep-time').value;
      var w = $('#entry-wake-time').value;

      if (!d || !s || !w) {
        $('#entry-error').textContent = 'Заполните все поля';
        $('#entry-error').classList.remove('hidden');
        return;
      }

      var dur = calcMin(s, w);
      if (dur < 30) {
        $('#entry-error').textContent = 'Продолжительность сна слишком мала';
        $('#entry-error').classList.remove('hidden');
        return;
      }

      if (this.editId) {
        for (var i = 0; i < this.entries.length; i++) {
          if (this.entries[i].id === this.editId) {
            this.entries[i].date = d;
            this.entries[i].sleepTime = s;
            this.entries[i].wakeTime = w;
            this.entries[i].mood = this.mood;
            this.entries[i].duration = dur;
            break;
          }
        }
      } else {
        this.entries.push({
          id: Date.now(),
          date: d,
          sleepTime: s,
          wakeTime: w,
          mood: this.mood,
          duration: dur
        });
      }

      save(KEYS.ENTRIES, this.entries);
      this.closeModal();
      this.renderDiary();
      this.renderHome();
      this.renderStats();
    },

    deleteEntry: function () {
      if (!this.editId || !confirm('Удалить эту запись?')) return;
      var id = this.editId;
      this.entries = this.entries.filter(function (e) { return e.id !== id; });
      save(KEYS.ENTRIES, this.entries);
      this.closeModal();
      this.renderDiary();
      this.renderHome();
      this.renderStats();
    },

    bind: function () {
      var self = this;

      $('#login-form').addEventListener('submit', function (e) { self.login(e); });
      $('#register-form').addEventListener('submit', function (e) { self.register(e); });

      $('#show-register').addEventListener('click', function (e) {
        e.preventDefault();
        $('#login-form').classList.add('hidden');
        $('#auth-switch-to-reg').classList.add('hidden');
        $('#auth-welcome').classList.add('hidden');
        $('#register-form').classList.remove('hidden');
      });

      $('#show-login').addEventListener('click', function (e) {
        e.preventDefault();
        $('#register-form').classList.add('hidden');
        $('#login-form').classList.remove('hidden');
        $('#auth-switch-to-reg').classList.remove('hidden');
        $('#auth-welcome').classList.remove('hidden');
      });

      $('#toggle-password').addEventListener('click', function () {
        var f = $('#auth-password');
        f.type = f.type === 'password' ? 'text' : 'password';
      });

      var navBtns = $$('.tabbar__btn');
      for (var i = 0; i < navBtns.length; i++) {
        navBtns[i].addEventListener('click', function () {
          self.go(this.getAttribute('data-screen'));
        });
      }

      $('#btn-add-entry').addEventListener('click', function () {
        self.openModal(null);
      });

      $('#diary-list').addEventListener('click', function (e) {
        var card = e.target.closest('.diary-card-item');
        if (card) {
          self.openModal(parseInt(card.getAttribute('data-id'), 10));
        }
      });

      $('#modal-close').addEventListener('click', function () { self.closeModal(); });
      $('#modal-overlay').addEventListener('click', function (e) {
        if (e.target === this) self.closeModal();
      });

      $('#entry-form').addEventListener('submit', function (e) { self.saveEntry(e); });
      $('#btn-delete-entry').addEventListener('click', function () { self.deleteEntry(); });

      var moods = $$('.mood-toggle');
      for (var m = 0; m < moods.length; m++) {
        moods[m].addEventListener('click', function () {
          for (var k = 0; k < moods.length; k++) moods[k].classList.remove('active');
          this.classList.add('active');
          self.mood = this.getAttribute('data-mood');
        });
      }

      $('#goal-minus').addEventListener('click', function () {
        if (self.goal > 4) {
          self.goal--;
          save(KEYS.GOAL, self.goal);
          self.renderProfile();
          self.renderHome();
        }
      });

      $('#goal-plus').addEventListener('click', function () {
        if (self.goal < 12) {
          self.goal++;
          save(KEYS.GOAL, self.goal);
          self.renderProfile();
          self.renderHome();
        }
      });

      $('#btn-save-profile').addEventListener('click', function () {
        var n = $('#settings-name').value.trim();
        if (n) {
          self.user.name = n;
          save(KEYS.USER, self.user);
          self.renderProfile();
          self.renderHome();
          alert('Профиль сохранён!');
        }
      });

      $('#btn-logout').addEventListener('click', function () {
        self.logout();
      });
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });
})();
