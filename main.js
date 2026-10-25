(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const yen = n => Math.round(n).toLocaleString('ja-JP');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  /* ---------- nav ---------- */
  const nav = $('#nav'), toggle = $('#navToggle'), links = $('#navLinks');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- hero word ---------- */
  const words = ['自動', 'ボタン1つ', 'ゼロ'];
  let wi = 0;
  const heroWord = $('#heroWord');
  if (!reduced) setInterval(() => {
    wi = (wi + 1) % words.length;
    heroWord.textContent = words[wi];
    heroWord.classList.remove('flip'); void heroWord.offsetWidth; heroWord.classList.add('flip');
  }, 2600);

  /* ---------- hero spreadsheet loop ---------- */
  const heroBody = $('#heroSheet tbody'), heroStatus = $('#heroStatus'), heroRun = $('#heroRun');
  const heroToast = $('#heroToast'), heroFormula = $('#heroFormula');
  const heroRows = [
    ['運転者A', '10/21', 182, 236],
    ['運転者B', '10/21', 151, 198],
    ['運転者A', '10/22', 176, 221],
    ['運転者C', '10/22', 98, 120, true],
    ['運転者B', '10/22', 160, 205],
  ];
  const paintRows = rows => {
    heroBody.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const r = rows[i];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td>` + (r
        ? `<td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num${r[4] ? ' warn' : ''}">${r[3]}${r[4] ? ' ⚠' : ''}</td>`
        : '<td></td><td></td><td></td><td></td>');
      if (r && r.cls) tr.className = r.cls;
      heroBody.appendChild(tr);
    }
  };
  async function heroLoop() {
    while (true) {
      heroFormula.textContent = '=フォームの回答!A:D';
      heroStatus.textContent = '日報を受信中…'; heroStatus.classList.remove('done');
      const shown = [['運転者', '日付', 'km', '個数']];
      shown[0].cls = 'head';
      paintRows(shown);
      for (const r of heroRows) {
        await wait(reduced ? 0 : 750);
        const row = [...r]; row.cls = 'new';
        shown.push(row);
        paintRows(shown);
        shown[shown.length - 1].cls = '';
        if (r[4]) { heroToast.textContent = '📧 異常の報告を管理者に通知しました'; heroToast.classList.add('show'); await wait(1400); heroToast.classList.remove('show'); }
      }
      await wait(900);
      heroRun.classList.add('press'); await wait(180); heroRun.classList.remove('press');
      heroFormula.textContent = '=QUERY(日報!A:D, "select A, count(B), sum(C), sum(D) group by A")';
      heroStatus.textContent = '集計中…';
      await wait(600);
      const sum = {};
      heroRows.forEach(([d, , km, n]) => { sum[d] = sum[d] || [0, 0, 0]; sum[d][0]++; sum[d][1] += km; sum[d][2] += n; });
      const out = [['運転者', '日数', 'km', '個数']];
      Object.entries(sum).forEach(([d, v]) => { const r = [d, v[0] + '日', v[1], v[2]]; r.cls = 'new'; out.push(r); });
      const t = Object.values(sum).reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0]);
      const tr = ['合計', t[0] + '日', yen(t[1]), yen(t[2])]; tr.cls = 'total new'; out.push(tr);
      paintRows(out);
      heroStatus.textContent = '月次集計ができました'; heroStatus.classList.add('done');
      await wait(4200);
    }
  }
  heroLoop();

  /* ---------- tabs ---------- */
  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.toggle('active', t === tab));
    $$('.demo').forEach(d => d.classList.toggle('active', d.id === 'demo-' + tab.dataset.tab));
  }));

  /* ---------- demo 1: kintai ---------- */
  const rates = { '山田 一郎': 1300, '佐藤 花子': 1400, '鈴木 次郎': 1300 };
  const kLog = [
    { name: '山田 一郎', min: 480 },
    { name: '佐藤 花子', min: 420 },
  ];
  const toMin = v => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
  const hm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  function renderKintai(flashName) {
    const by = {};
    Object.keys(rates).forEach(n => by[n] = { days: 0, min: 0 });
    kLog.forEach(e => { by[e.name].days++; by[e.name].min += e.min; });
    let total = 0;
    $('#kBody').innerHTML = Object.entries(by).map(([n, v]) => {
      const pay = v.min / 60 * rates[n];
      total += pay;
      return `<tr class="${n === flashName ? 'flash' : ''}"><td>${esc(n)}</td><td class="r">${v.days}</td><td class="r">${hm(v.min)}</td><td class="r">${yen(pay)}円</td></tr>`;
    }).join('');
    countUp($('#kTotal'), total, '円');
    $('#kCount').textContent = kLog.length + '件';
  }
  const countUp = (el, to, suf) => {
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (reduced) { el.textContent = yen(to) + suf; return; }
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / 600);
      el.textContent = yen(from + (to - from) * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  $('#kSubmit').addEventListener('click', () => {
    const name = $('#kStaff').value;
    let min = toMin($('#kOut').value || '00:00') - toMin($('#kIn').value || '00:00');
    if (min <= 0) min += 24 * 60; // 日付をまたぐ勤務
    min -= Math.max(0, Number($('#kBreak').value) || 0);
    if (min <= 0) { alertInline($('#kSubmit'), '休憩が勤務時間より長くなっています'); return; }
    kLog.push({ name, min });
    renderKintai(name);
    alertInline($('#kSubmit'), `記録しました：${name} ${hm(min)}`);
  });
  function alertInline(btn, msg) {
    const old = btn.dataset.label || btn.textContent;
    btn.dataset.label = old;
    btn.textContent = msg;
    btn.disabled = true;
    setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1400);
  }
  renderKintai();

  /* ---------- demo 2: nippo ---------- */
  const drivers = ['運転者A', '運転者B', '運転者C'];
  const nRaw = [
    ['10/1', '運転者A', 88, 112, ''], ['10/1', '運転者B', 74, 96, ''], ['10/2', '運転者A', 91, 118, ''],
    ['10/2', '運転者C', 66, 80, '遅延'], ['10/3', '運転者B', 79, 101, ''], ['10/3', '運転者A', 85, 109, ''],
    ['10/4', '運転者C', 70, 88, ''], ['10/4', '運転者B', 82, 104, ''],
  ];
  let nDay = 5;
  const renderRaw = flashLast => {
    $('#nRaw').innerHTML = nRaw.map((r, i) =>
      `<tr class="${flashLast && i === nRaw.length - 1 ? 'flash' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td class="r">${r[2]}</td><td class="r">${r[3]}</td><td class="${r[4] ? 'bad' : ''}">${r[4] || '—'}</td></tr>`
    ).join('');
    $('#nRows').textContent = nRaw.length + '行';
  };
  renderRaw();
  $('#nAdd').addEventListener('click', () => {
    const d = drivers[Math.floor(Math.random() * 3)];
    const km = 60 + Math.floor(Math.random() * 40);
    const issue = Math.random() < .25 ? (Math.random() < .5 ? '事故' : '遅延') : '';
    nRaw.push([`10/${nDay}`, d, km, Math.round(km * (1.2 + Math.random() * .2)), issue]);
    if (Math.random() < .5) nDay++;
    renderRaw(true);
    const wrap = $('#nRaw').closest('.panel');
    wrap.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  });
  $('#nRun').addEventListener('click', async () => {
    const t0 = performance.now();
    const sum = {};
    nRaw.forEach(([date, d, km, n]) => {
      sum[d] = sum[d] || { days: new Set(), km: 0, n: 0 };
      sum[d].days.add(date); sum[d].km += km; sum[d].n += n;
    });
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const body = $('#nSum');
    body.innerHTML = '';
    for (const d of Object.keys(sum).sort()) {
      const v = sum[d];
      const tr = document.createElement('tr');
      tr.className = 'flash';
      tr.innerHTML = `<td>${d}</td><td class="r">${v.days.size}</td><td class="r">${yen(v.km)}</td><td class="r">${yen(v.n)}</td>`;
      body.appendChild(tr);
      await wait(reduced ? 0 : 160);
    }
    $('#nTime').textContent = `集計 ${ms}ms`;
    const issues = nRaw.filter(r => r[4]);
    const mail = $('#nMail');
    if (issues.length) {
      mail.hidden = false;
      $('#nMailBody').innerHTML = `件名：【要確認】異常の報告が${issues.length}件あります<br>` +
        issues.map(r => `・${r[0]} ${r[1]}：${r[4]}`).join('<br>');
    } else mail.hidden = true;
  });

  /* ---------- demo 3: meibo ---------- */
  const roster = [
    { name: '山田 太郎', fac: 'A施設' }, { name: '佐藤 花子', fac: 'A施設' }, { name: 'ジョン・スミス', fac: 'B施設' },
    { name: '鈴木 一郎', fac: 'B施設' }, { name: '高橋 美咲', fac: 'C施設' }, { name: '渡辺 Ken', fac: 'C施設' },
    { name: '田中 健太', fac: 'C施設' },
  ];
  const form = ['山田太郎', '佐藤　花子', 'ジョン スミス', '鈴木 一郎 ', '渡辺　Ｋｅｎ', '高橋みさき'];
  const norm = s => s.normalize('NFKC').replace(/[\s　・･.]/g, '').toLowerCase();
  const show = s => s.replace(/　/g, '□').replace(/ $/, '␣');
  const renderMeibo = () => {
    $('#mRoster').innerHTML = roster.map(r => `<li data-k="${esc(norm(r.name))}">${esc(r.name)}<small>${r.fac}</small></li>`).join('');
    $('#mForm').innerHTML = form.map(f => `<li class="raw" data-k="${esc(norm(f))}">${esc(show(f))}</li>`).join('');
  };
  renderMeibo();
  $('#mRun').addEventListener('click', async () => {
    renderMeibo();
    const formKeys = new Set(form.map(norm));
    const rosterKeys = new Set(roster.map(r => norm(r.name)));
    const ok = [], ng = [], unknown = [];
    for (const li of $$('#mRoster li')) {
      await wait(reduced ? 0 : 140);
      const hit = formKeys.has(li.dataset.k);
      li.classList.add(hit ? 'hit' : 'miss');
      (hit ? ok : ng).push(li.firstChild.textContent);
    }
    $$('#mForm li').forEach(li => {
      const hit = rosterKeys.has(li.dataset.k);
      li.classList.add(hit ? 'hit' : 'miss');
      li.insertAdjacentHTML('beforeend', `<small>→ ${esc(li.dataset.k)}</small>`);
      if (!hit) unknown.push(li.firstChild.textContent);
    });
    const chips = arr => arr.map((n, i) => `<span class="chip" style="animation-delay:${i * 60}ms">${esc(n)}</span>`).join('');
    $('#mResult').innerHTML =
      `<div class="res-block ok"><p>提出済み ${ok.length}名</p>${chips(ok)}</div>` +
      `<div class="res-block ng"><p>未提出 ${ng.length}名 → リマインド送信</p>${chips(ng)}</div>` +
      `<div class="res-block"><p>要確認 ${unknown.length}件（名簿にない名前）</p>${chips(unknown)}</div>`;
  });

  /* ---------- code typing ---------- */
  const code = [
    ['c', '// 毎朝8時に未提出の人へリマインド\n'],
    ['k', 'function '], ['f', 'sendReminders'], ['', '() {\n'],
    ['', '  '], ['k', 'const '], ['', 'roster = '], ['f', 'readRoster'], ['', '();\n'],
    ['', '  '], ['k', 'const '], ['', 'submitted = '], ['f', 'readFormAnswers'], ['', '();\n\n'],
    ['', '  '], ['k', 'const '], ['', 'missing = roster.'], ['f', 'filter'], ['', '(p =>\n'],
    ['', '    !submitted.'], ['f', 'has'], ['', '('], ['f', 'normalize'], ['', '(p.name)));\n\n'],
    ['', '  missing.'], ['f', 'forEach'], ['', '(p => {\n'],
    ['', '    '], ['k', 'if '], ['', '('], ['f', 'alreadySentToday'], ['', '(p)) '], ['k', 'return'], ['', ';\n'],
    ['', '    MailApp.'], ['f', 'sendEmail'], ['', '(p.email,\n'],
    ['', '      '], ['s', "'【リマインド】研修報告書のご提出'"], ['', ',\n'],
    ['', '      '], ['f', 'reminderBody'], ['', '(p));\n'],
    ['', '    '], ['f', 'logSent'], ['', '(p);\n'],
    ['', '  });\n'],
    ['', '}\n'],
  ];
  const pre = $('#codeType');
  let typed = false;
  const typeCode = async () => {
    if (typed) return; typed = true;
    if (reduced) { pre.innerHTML = code.map(([c, t]) => c ? `<span class="${c}">${esc(t)}</span>` : esc(t)).join(''); return; }
    let html = '';
    for (const [c, t] of code) {
      for (let i = 1; i <= t.length; i++) {
        const part = esc(t.slice(0, i));
        pre.innerHTML = html + (c ? `<span class="${c}">${part}</span>` : part) + '<span class="caret"></span>';
        await wait(t[i - 1] === '\n' ? 60 : 14);
      }
      html += c ? `<span class="${c}">${esc(t)}</span>` : esc(t);
    }
    pre.innerHTML = html + '<span class="caret"></span>';
  };
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { typeCode(); o.disconnect(); } }, { threshold: .4 }).observe(pre);
})();
