'use strict';
// ───────── 데이터 ─────────
const BANK = window.BANK, PSG = window.PSG, CONCEPTS = window.CONCEPTS, FLASH = window.FLASH, GRAMMAR = window.GRAMMAR || {}, DICT = window.DICT || {}, DICT_FORM = window.DICT_FORM || {};
// 보강 해설(data/expl.js)·지문 해석(data/psgtr.js)이 있으면 덮어씀
const EXPL = window.EXPL || {}, PSGTR = window.PSGTR || {};
BANK.forEach(q => { const x = EXPL[q.id]; if (x) Object.assign(q, x); });
const QMAP = {}; BANK.forEach(q => { QMAP[q.id] = q; });
const CMAP = {}; CONCEPTS.forEach(c => { CMAP[c.id] = c; });
const BY_C = {}; BANK.forEach(q => { (BY_C[q.c] = BY_C[q.c] || []).push(q.id); });
const BY_G = {}; BANK.forEach(q => { if (q.g) (BY_G[q.g] = BY_G[q.g] || []).push(q.id); });
const DLABEL = ['', '기본', '중급', '고급', '최고난도'];
const MK = ['(A)', '(B)', '(C)', '(D)'], LT = ['A', 'B', 'C', 'D'];
const PARTS = [5, 6, 7], PNAME = { 5: 'Part 5 · 단문 빈칸', 6: 'Part 6 · 장문 빈칸', 7: 'Part 7 · 독해' };

// ───────── 저장 ─────────
const KEY = 'toeic_rc_v1';
function blank() { return { v: 1, att: {}, days: {}, conf: {}, cdone: {}, mocks: [], diags: [], fl: {}, resume: {}, myw: {}, set: { goal: 40, exam: '2026-11-29' } }; }
let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
if (!S && window.__NATIVE_STATE) S = window.__NATIVE_STATE;
if (!S) S = blank();
S = Object.assign(blank(), S); S.set = Object.assign(blank().set, S.set);
const NATIVE = window.webkit && window.webkit.messageHandlers;
let CLOUD = null, cloudTimer = null;
function save() {
  S.at = Date.now();
  const t = JSON.stringify(S);
  try { localStorage.setItem(KEY, t); } catch (e) {}
  try { if (NATIVE && NATIVE.save) NATIVE.save.postMessage(t); } catch (e) {}
  if (CLOUD) { clearTimeout(cloudTimer); cloudTimer = setTimeout(() => { CLOUD.set({ json: JSON.stringify(S), at: S.at }).catch(() => {}); }, 1500); }
}
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function record(qid, ok) {
  const a = S.att[qid] || (S.att[qid] = { n: 0, c: 0, st: 0, w: false, wr: 0 });
  a.n++; a.last = today();
  if (ok) { a.c++; a.st++; if (a.w && a.st >= 2) a.w = false; }
  else { a.st = 0; a.w = true; a.wr++; }
  const d = S.days[today()] || (S.days[today()] = { n: 0, c: 0 });
  d.n++; if (ok) d.c++;
  save();
}

// ───────── 통계 ─────────
function conceptStat(cid) {
  let n = 0, c = 0, solved = 0;
  (BY_C[cid] || []).forEach(id => { const a = S.att[id]; if (a) { n += a.n; c += a.c; solved++; } });
  return { n, c, solved, total: (BY_C[cid] || []).length, acc: n ? c / n : null };
}
function overall(filter) {
  let n = 0, c = 0, solved = 0, total = 0;
  BANK.forEach(q => { if (filter && !filter(q)) return; total++; const a = S.att[q.id]; if (a) { n += a.n; c += a.c; solved++; } });
  return { n, c, solved, total, acc: n ? c / n : null };
}
function weakList() {
  return CONCEPTS.map(c => ({ c, s: conceptStat(c.id) })).filter(x => x.s.n >= 4)
    .map(x => Object.assign(x, { score: (x.s.c + 1) / (x.s.n + 2) })).sort((a, b) => a.score - b.score);
}
function wrongIds() { return BANK.filter(q => (S.att[q.id] && S.att[q.id].w) || S.conf[q.id]).map(q => q.id); }
function streakDays() {
  let k = 0; const d = new Date();
  if (!S.days[today()]) d.setDate(d.getDate() - 1);
  for (;;) { const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (S.days[key] && S.days[key].n > 0) { k++; d.setDate(d.getDate() - 1); } else break; }
  return k;
}
function dday() { const e = new Date(S.set.exam + 'T00:00:00'); const t = new Date(today() + 'T00:00:00'); return Math.round((e - t) / 86400000); }
const pct = v => v == null ? '—' : Math.round(v * 100) + '%';
const lvl = v => v == null ? '' : v < 0.6 ? 'low' : v < 0.8 ? 'mid' : 'high';

// ───────── 유틸 ─────────
const $ = s => document.querySelector(s);
function esc(t) { return String(t).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
function md(t) { return esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>'); }
function enq(t) { return esc(t).replace(/-{4,}/g, '<span class="blank cur">&nbsp;</span>'); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function toast(t) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 1800); }
function sheet(html) { closeSheet(); const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'sheet'; bg.innerHTML = '<div class="sheet"><div class="grab"></div>' + html + '</div>'; bg.addEventListener('click', e => { if (e.target === bg) closeSheet(); }); document.body.appendChild(bg); }
function ask(msg, yes, fn) {
  sheet(`<div class="q" style="font-weight:600">${esc(msg)}</div><div class="grid2" style="margin-top:12px"><button class="btn line" onclick="closeSheet()">취소</button><button class="btn" id="askYes">${esc(yes)}</button></div>`);
  $('#askYes').onclick = () => { closeSheet(); fn(); };
}
function closeSheet() { const s = $('#sheet'); if (s) s.remove(); }
const dtag = d => `<span class="tag d${d}">${DLABEL[d]}</span>`;
const ptag = p => `<span class="tag">Part ${p}</span>`;

// ───────── 지문 렌더링 ─────────
// 지문 문자열 규칙: {n} 빈칸, [n] 문장 삽입 위치, **굵게**
function inl(t, cur) {
  return esc(t).replace(/\{(\d)\}/g, (m, n) => `<span class="blank ${+n === cur ? 'cur' : ''}">(${n})</span>`)
    .replace(/\[(\d)\]/g, '<span class="ins">[$1]</span>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}
// t = 같은 문서의 해석({t, h, b}). 있으면 원문 아래에 회색으로 끼워 넣고, .psg.trs일 때만 보임
function docHTML(d, cur, t) {
  let h = '';
  const T = s => s ? `<span class="ptr">${inl(s, null)}</span>` : '';
  if (d.k) h += `<div class="doc-k">${esc(d.k)}</div>`;
  if (d.h && d.h.length) h += `<div class="doc-h">${d.h.map(([k, v], i) => `<div><b>${esc(k)}</b> ${inl(v, cur)}${t && t.h ? T(t.h[i]) : ''}</div>`).join('')}</div>`;
  if (d.t) h += `<div class="doc-t">${inl(d.t, cur)}${t ? T(t.t) : ''}</div>`;
  (d.b || []).forEach((x, i) => {
    const tx = t && t.b ? t.b[i] : null;
    if (x.tb) h += `<table class="dt"><tr>${x.tb[0].map((c, j) => `<th>${inl(c, cur)}${tx ? T(tx[0] && tx[0][j] !== c ? tx[0][j] : '') : ''}</th>`).join('')}</tr>${x.tb.slice(1).map((r, ri) => `<tr>${r.map((c, j) => `<td>${inl(c, cur)}${tx ? T(tx[ri + 1] && tx[ri + 1][j] !== c ? tx[ri + 1][j] : '') : ''}</td>`).join('')}</tr>`).join('')}</table>`;
    else if (x.ch) h += `<div class="chat"><i>${esc(x.ch[0])}</i><b>${esc(x.ch[1])}</b>: ${inl(x.ch[2], cur)}${T(tx)}</div>`;
    else h += `<p>${inl(x, cur)}${T(tx)}</p>`;
  });
  return `<div class="doc">${h}</div>`;
}
let PSG_FULL = false, PSG_TR = false;
// withTr: 채점 뒤에만 해석 버튼을 보여 줌 (풀기 전에 해석이 보이면 안 되니까)
function psgHTML(g, cur, inkable, withTr) {
  const p = PSG[g]; if (!p) return '';
  const tr = withTr && PSGTR[g] ? PSGTR[g].docs : null;
  const body = p.docs.map((d, i) => docHTML(d, cur, tr ? tr[i] : null)).join('');
  const trOn = tr && PSG_TR;
  return `<div class="psg ${PSG_FULL ? 'full' : ''} ${trOn ? 'trs' : ''}"><div class="psg-sc">${body}</div>
  <div class="psg-bt">${tr ? `<button class="psg-tg tr-tg" onclick="psgTr(this)">${trOn ? '해석 숨기기' : '지문 해석 보기'}</button>` : ''}<button class="psg-tg" onclick="PSG_FULL=!PSG_FULL;render()">${PSG_FULL ? '지문 접기 ▴' : '지문 전체 펼치기 ▾'}</button></div></div>`;
}
// 다시 그리지 않고 클래스만 바꿔서 필기·스크롤 위치를 유지
function psgTr(btn) {
  PSG_TR = !PSG_TR; const box = btn.closest('.psg');
  box.classList.toggle('trs', PSG_TR); btn.textContent = PSG_TR ? '해석 숨기기' : '지문 해석 보기';
}
function setInfo(q) { if (!q.g) return ''; const ids = BY_G[q.g]; return `${ids.indexOf(q.id) + 1} / ${ids.length}번 문항`; }
function qText(q) { return q.p === 5 ? enq(q.q) : esc(q.q); }

// ───────── 라우팅 ─────────
let view = 'home', P = {}, QS = null, timerId = null;
const TABS = [['home', '홈', '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'], ['practice', '문제', '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>'],
  ['wrong', '오답', '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'], ['concepts', '문법', '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>'], ['stats', '분석', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>']];
function go(v, p) { if (timerId && v !== 'mockrun') { clearInterval(timerId); timerId = null; } if (v === 'quiz') snapQS(); view = v; P = p || {}; render(); window.scrollTo(0, 0); }
function renderTabs() {
  const hide = view === 'quiz' || view === 'mockrun';
  $('#tabbar').style.display = hide ? 'none' : 'flex';
  document.body.style.paddingBottom = hide ? 'env(safe-area-inset-bottom)' : '';
  const root = { home: 'home', practice: 'practice', quiz: 'practice', result: 'practice', wrong: 'wrong', concepts: 'concepts', concept: 'concepts', stats: 'stats' }[view] || 'home';
  $('#tabbar').innerHTML = TABS.map(([k, l, ic]) => `<button class="${root === k ? 'on' : ''}" onclick="go('${k}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ic}</svg>${l}</button>`).join('');
}
function render() {
  renderTabs();
  const f = { home, practice, quiz, result, wrong, concepts, concept, stats, mock, mockrun, mockresult, diag, diagresult, flash, settings }[view];
  $('#app').innerHTML = '<div class="wrap">' + f() + '</div>';
  closePop();
  inkMount(); inkBarFloat();
}

// ───────── 홈 ─────────
function diagCard() {
  const last = S.diags[S.diags.length - 1];
  return `<div class="card" onclick="go('diag')"><div class="top"><b>진단평가</b><span class="sub">${last ? `${last.date.slice(5).replace('-', '/')} · 예상 ${last.score}점 ›` : '50문항 · 37분 ›'}</span></div>
  <div class="sub" style="margin-top:4px">${last ? `범위 ${last.lo}~${last.hi}점 · 다시 보면 점수 변화를 비교할 수 있어요` : '지금 RC가 몇 점쯤인지 실전 속도로 확인해요'}</div></div>`;
}
function home() {
  const o = overall(), td = S.days[today()] || { n: 0, c: 0 }, w = weakList().slice(0, 4), wn = wrongIds().length, dd = dday();
  const goalP = Math.min(1, td.n / S.set.goal);
  const un = BANK.filter(q => !S.att[q.id]);
  return `
  <div class="top"><div><div class="sub">TOEIC RC · 목표 850+</div><h1>${dd > 0 ? 'D-' + dd : dd === 0 ? 'D-DAY' : '시험일 지남'}</h1></div>
    <button class="icon-btn" onclick="go('settings')">설정</button></div>
  <div class="hgrid"><div class="hl"><div class="card">
    <div class="top"><b>오늘 목표</b><span class="sub">${td.n} / ${S.set.goal}문항 · 연속 ${streakDays()}일</span></div>
    <div class="bar ${goalP >= 1 ? 'high' : ''}" style="margin-top:10px"><i style="width:${goalP * 100}%"></i></div>
    <div class="grid3" style="margin-top:14px">
      <div class="stat"><b>${o.solved}</b><span>푼 문제 / ${o.total}</span></div>
      <div class="stat"><b>${pct(o.acc)}</b><span>전체 정답률</span></div>
      <div class="stat"><b>${wn}</b><span>오답노트</span></div>
    </div>
  </div>
  <div class="grid2">
    ${resumeInfo('practice') ? `<button class="btn" onclick="resumeQS('practice')">이어서 풀기 <span style="opacity:.8;font-weight:500">· ${resumeInfo('practice').left}문제 남음</span></button>` : `<button class="btn" onclick="startPractice({p:5,n:30,order:'new',title:'Part 5 30문항'})">Part 5 30문항</button>`}
    <button class="btn ghost" onclick="go('mock')">RC 모의고사 100</button>
  </div>
  <div class="grid2" style="margin-top:10px">
    ${resumeInfo('wrong') ? `<button class="btn line" onclick="resumeQS('wrong')">오답 이어서 · ${resumeInfo('wrong').left}</button>` : `<button class="btn line" onclick="startWrong()" ${wn ? '' : 'disabled'}>오답 다시 풀기</button>`}
    <button class="btn line" onclick="go('flash')">단어 카드</button>
  </div>
  ${diagCard()}
  ${basicCard(un)}
  ${PARTS.map(p => { const s = overall(q => q.p === p), u = un.filter(q => q.p === p).length, sets = p === 5 ? 0 : new Set(BANK.filter(q => q.p === p).map(q => q.g)).size;
    return `<div class="card"><div class="top"><b>${PNAME[p]}</b><span class="sub">${s.solved}/${s.total}${sets ? ` · 지문 ${sets}개` : ''} · ${pct(s.acc)}</span></div>
    <div class="bar ${lvl(s.acc)}" style="margin:8px 0 10px"><i style="width:${s.total ? s.solved / s.total * 100 : 0}%"></i></div>
    <div class="grid2"><button class="btn ghost" onclick="startPractice({p:${p},n:${p === 5 ? 30 : p === 6 ? 16 : 20},order:'new',title:'Part ${p}'})">${p === 5 ? '30문항' : p === 6 ? '지문 4개' : '20문항 내외'}</button>
    <button class="btn line" ${u ? '' : 'disabled'} onclick="startPractice({p:${p},un:1,n:${p === 5 ? 30 : 16},order:'rand',title:'Part ${p} 안 푼 문제'})">안 푼 문제 ${u}</button></div></div>`; }).join('')}
  </div><div class="hr">
  <h2>약한 유형</h2>
  ${w.length ? w.map(x => conceptRow(x.c, x.s)).join('') : '<div class="card sub">유형당 4문제 이상 풀면 약한 유형을 찾아드려요.</div>'}
  </div><div class="hd">
  <h2>난이도별 Part 5</h2>
  <div class="grid2">${[1, 2, 3, 4].map(d => `<button class="btn line" onclick="startPractice({p:5,d:[${d}],n:20,title:'Part 5 ${DLABEL[d]}'})">${DLABEL[d]} <span class="sub">${BANK.filter(q => q.p === 5 && q.d === d).length}</span></button>`).join('')}</div>
  </div></div>`;
}
// 기본 난이도만 모아 푸는 카드
function basicCard(un) {
  const b = BANK.filter(q => q.d === 1); if (!b.length) return '';
  const s = overall(q => q.d === 1), left = un.filter(q => q.d === 1).length;
  const N = { 5: 20, 6: 8, 7: 10 };
  return `<div class="card"><div class="top"><b>기초 다지기</b><span class="sub">${s.solved}/${s.total} · ${pct(s.acc)}</span></div>
    <div class="bar ${lvl(s.acc)}" style="margin:8px 0 6px"><i style="width:${s.solved / s.total * 100}%"></i></div>
    <div class="sub" style="margin-bottom:10px">기본 난이도만 · 안 푼 문제부터 · 남은 문제 ${left}</div>
    <div class="grid3">${PARTS.map(p => { const n = b.filter(q => q.p === p).length; return n ? `<button class="btn ghost" style="padding:11px 4px" onclick="startPractice({p:${p},d:[1],n:${N[p]},order:'new',title:'기초 · Part ${p}'})">Part ${p} <span style="opacity:.7;font-weight:500">${n}</span></button>` : ''; }).join('')}</div></div>`;
}
function conceptRow(c, s) {
  return `<div class="card" onclick="go('concept',{id:'${c.id}'})">
    <div class="top"><div><span class="tag">P${c.p}</span><b>${esc(c.name)}</b></div><b>${pct(s.acc)}</b></div>
    <div class="bar ${lvl(s.acc)}" style="margin-top:8px"><i style="width:${(s.acc || 0) * 100}%"></i></div>
    <div class="sub" style="margin-top:6px">${s.c}/${s.n} 정답 · ${s.solved}/${s.total}문항 풀이</div></div>`;
}

// ───────── 문제 설정 ─────────
let PSET = { p: 0, un: 0, d: [1, 2, 3, 4], n: 30, order: 'new', cs: [] };
function practice() {
  const cs = CONCEPTS.filter(c => !PSET.p || c.p === PSET.p);
  const units = [...new Set(cs.map(c => c.p + '|' + c.unit))];
  const pool = poolFor(PSET);
  return `<h1>문제 풀기</h1><div class="sub">총 ${BANK.length}문항 · 조건에 맞는 문제 ${pool.length}개 · 지문 문제는 세트 단위로 묶어서 출제</div>
  <div class="card"><b>파트</b><div class="seg">${[[0, '전체'], [5, 'Part 5'], [6, 'Part 6'], [7, 'Part 7']].map(([v, l]) => `<button class="${PSET.p === v ? 'on' : ''}" onclick="PSET.p=${v};PSET.cs=[];render()">${l}</button>`).join('')}</div>
  <b>풀이 범위</b><div class="seg">${[[0, '전체'], [1, '안 푼 문제만']].map(([v, l]) => `<button class="${PSET.un === v ? 'on' : ''}" onclick="PSET.un=${v};render()">${l}</button>`).join('')}</div>
  <b>난이도</b><div class="seg">${[1, 2, 3, 4].map(d => `<button class="${PSET.d.includes(d) ? 'on' : ''}" onclick="togD(${d})">${DLABEL[d]}</button>`).join('')}</div>
  <b>문항 수</b><div class="seg">${[10, 20, 30, 50].map(n => `<button class="${PSET.n === n ? 'on' : ''}" onclick="PSET.n=${n};render()">${n}</button>`).join('')}</div>
  <b>순서</b><div class="seg">${[['new', '안 푼 것 먼저'], ['rand', '무작위'], ['weak', '약점 우선']].map(([v, l]) => `<button class="${PSET.order === v ? 'on' : ''}" onclick="PSET.order='${v}';render()">${l}</button>`).join('')}</div></div>
  <div class="card"><div class="top"><b>유형 선택</b><button class="sub" onclick="PSET.cs=[];render()">전체 해제</button></div>
  <div class="sub" style="margin:4px 0 8px">선택하지 않으면 전체 유형에서 출제</div>
  ${units.map(u => { const [p, name] = u.split('|'); return `<div style="margin-top:8px"><div class="sub">P${p} · ${esc(name)}</div>${cs.filter(c => c.unit === name && c.p == p).map(c => `<button class="chip ${PSET.cs.includes(c.id) ? 'on' : ''}" onclick="togC('${c.id}')">${esc(c.name)} <span style="opacity:.6">${(BY_C[c.id] || []).length}</span></button>`).join('')}</div>`; }).join('')}
  </div>
  <button class="btn" onclick="startPractice(PSET)" ${pool.length ? '' : 'disabled'}>${Math.min(PSET.n, pool.length)}문항 내외 시작</button>`;
}
function togD(d) { const i = PSET.d.indexOf(d); if (i >= 0) { if (PSET.d.length > 1) PSET.d.splice(i, 1); } else PSET.d.push(d); render(); }
function togC(id) { const i = PSET.cs.indexOf(id); if (i >= 0) PSET.cs.splice(i, 1); else PSET.cs.push(id); render(); }
function poolFor(o) {
  return BANK.filter(q => (!o.un || !S.att[q.id]) && (!o.p || q.p === o.p) && (!o.d || o.d.includes(q.d)) && (!o.cs || !o.cs.length || o.cs.includes(q.c)));
}
// 지문 문제는 같은 지문의 문항을 붙여서(순서대로) 넣는다
function expandSets(pool, n, inPool) {
  const out = [], seen = new Set();
  for (const q of pool) {
    if (out.length >= n) break;
    if (seen.has(q.id)) continue;
    if (q.g) { BY_G[q.g].forEach(id => { if (!seen.has(id) && (!inPool || inPool.has(id))) { seen.add(id); out.push(id); } }); }
    else { seen.add(q.id); out.push(q.id); }
  }
  return out;
}
function startPractice(o) {
  o = Object.assign({ p: 0, d: [1, 2, 3, 4], n: 30, order: 'new', cs: [] }, o);
  let pool = poolFor(o);
  if (o.order === 'new') pool = [...shuffle(pool.filter(q => !S.att[q.id])), ...shuffle(pool.filter(q => S.att[q.id]))];
  else if (o.order === 'weak') { const sc = id => { const s = conceptStat(QMAP[id].c); return s.n ? (s.c + 1) / (s.n + 2) : 0.5; }; pool = shuffle(pool).sort((a, b) => sc(a.id) - sc(b.id)); }
  else pool = shuffle(pool);
  const ids = expandSets(pool, o.n, new Set(pool.map(q => q.id)));
  if (!ids.length) return toast('조건에 맞는 문제가 없어요');
  INK.s = {}; PSG_FULL = false;
  QS = { ids, i: 0, mode: o.mode || 'practice', res: {}, picks: {}, pick: null, shown: false, title: o.title || '문제 풀기' };
  go('quiz');
}
function startWrong() { const ids = expandSets(shuffle(wrongIds().map(id => QMAP[id])), 9999, new Set(wrongIds())); if (!ids.length) return toast('오답이 없어요'); QS = { ids, i: 0, mode: 'wrong', res: {}, picks: {}, pick: null, shown: false, title: '오답 다시 풀기' }; go('quiz'); }

// ───────── 풀이 화면 ─────────
function optHTML(q, k, cl, extra, onclick, shown) {
  const otr = shown && q.ot && q.ot[k] ? `<span class="otr">${esc(q.ot[k])}</span>` : '';
  return `<button class="opt ${cl}${extra || ''}" onclick="${onclick}"><span class="n">${LT[k]}</span><span class="ot ${/[가-힣]/.test(q.o[k]) ? '' : 'en'}">${esc(q.o[k])}${otr}${extra && extra.includes('hasw') ? whyH(q, k) : ''}</span></button>`;
}
// 해설 상자: 질문 해석 → 해설 → 근거 문장 → 패러프레이즈 → 문장 해석 → 어휘
function expHTML(q, cls, head) {
  return `<div class="exp ${cls}">${head ? `<b>${head}</b><br>` : ''}${q.qt ? `<div class="x-qt">${esc(q.qt)}</div>` : ''}
    <div class="x-e">${md(q.e.replace(/-{4,}/g, '____'))}</div>
    ${q.ev ? `<div class="x-box"><span class="x-l">근거</span><span class="x-en">${esc(q.ev).replace(/\{\d\}/g, '_____').replace(/\s*\[\d\]\s*/g, ' ').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')}</span></div>` : ''}
    ${q.pp ? `<div class="x-box"><span class="x-l">바꿔 말하기</span><span>${esc(q.pp)}</span></div>` : ''}
    ${q.tr ? `<div class="x-box"><span class="x-l">해석</span><span>${esc(q.tr)}</span></div>` : ''}
    ${q.v && q.v.length ? `<div class="x-v">${q.v.map(([w, m]) => `<span class="x-w"><b class="tapw">${esc(w)}</b> ${esc(m)}</span>`).join('')}</div>` : ''}</div>`;
}

// ───────── 지문 세트 묶음 화면 (Part 6·7) ─────────
function grp(ids, i) { const g = QMAP[ids[i]].g; if (!g) return [i, i + 1]; let a = i, b = i + 1; while (a > 0 && QMAP[ids[a - 1]].g === g) a--; while (b < ids.length && QMAP[ids[b]].g === g) b++; return [a, b]; }
// 유형 태그는 채점 뒤에만 보여 줌 (풀기 전에 보이면 '동명사' 같은 이름이 답 힌트가 됨)
function sqHead(q, n, sh) { return `<div class="sq-h"><span class="sq-n">${n}</span>${sh && CMAP[q.c] ? `<span class="tag">${esc(CMAP[q.c].name)}</span>` : ''}${dtag(q.d)}</div>`; }
function quizSet() {
  const [a, b] = grp(QS.ids, QS.i); if (QS.i !== a) QS.i = a;
  const gids = QS.ids.slice(a, b), q0 = QMAP[gids[0]], sh = gids.every(id => id in QS.res);
  QS.sp = QS.sp || {}; const pk = id => sh ? (QS.picks || {})[id] : QS.sp[id];
  const all = gids.every(id => pk(id) != null);
  const nc = gids.filter(id => QS.res[id]).length;
  const head = `<div class="top"><div>${ptag(q0.p)}<span class="tag">${PSG[q0.g].docs.length > 1 ? (PSG[q0.g].docs.length === 3 ? '삼중 지문' : '이중 지문') : '단일 지문'} · ${gids.length}문항</span></div>${inkBar()}</div>`;
  const qs = gids.map((id, j) => { const q = QMAP[id], p = pk(id), ok = p === q.a;
    return `<div class="sq" id="sq${id}">${sqHead(q, (a + j + 1) + '.', sh)}<div class="q en">${qText(q)}</div>
    ${q.o.map((t, k) => { let cl = ''; if (sh) { if (k === q.a) cl = 'right'; else if (k === p) cl = 'wrong'; } else if (k === p) cl = 'sel';
      return optHTML(q, k, cl, sh ? `${k === p && k !== q.a ? ' open' : ''}${q.w && k !== q.a ? ' hasw' : ''}` : '', `setTap(this,${id},${k})`, sh); }).join('')}
    ${sh ? `${expHTML(q, ok ? 'ok' : 'no', ok ? '정답' : p == null ? '미응답 · 정답 ' + MK[q.a] : '오답 · 정답 ' + MK[q.a])}
      <div class="row" style="flex-wrap:wrap"><button class="chip c" onclick="showConcept('${q.c}')">유형 정리</button><button class="chip ${S.conf[id] ? 'on' : ''}" onclick="togConf(${id})">${S.conf[id] ? '헷갈림 표시됨' : '헷갈림 표시'}</button></div>` : ''}</div>`; }).join('');
  return `<div class="qbar"><div class="top"><button class="icon-btn" onclick="quitQuiz()">✕</button>
    <span class="sub">${esc(QS.title)} · ${a + 1}–${b} / ${QS.ids.length}</span><span style="width:40px"></span></div>
  <div class="bar qprog"><i style="width:${Object.keys(QS.res).length / QS.ids.length * 100}%"></i></div></div>
  ${inkWrap(q0.g, `<div class="qa"><div class="qa-l">${head}${psgHTML(q0.g, null, true, sh)}</div><div class="qa-r">
  ${sh ? `<div class="sq-sum ${nc === gids.length ? 'ok' : ''}">${gids.length}문항 중 ${nc}개 정답${q0.w !== undefined ? ' · 오답 보기를 누르면 이유가 보여요' : ''}</div>` : `<div class="sub" style="margin-bottom:4px">지문 하나에 딸린 ${gids.length}문항을 모두 고른 뒤 한 번에 채점해요</div>`}
  ${qs}
  <div class="navrow"><button class="btn line" onclick="prevQ()" ${a ? '' : 'disabled'}>‹ 이전</button>
  ${sh ? `<button class="btn" onclick="nextQ()">${b < QS.ids.length ? '다음 ›' : '결과 보기'}</button>` : `<button class="btn" id="chkbtn" onclick="checkSet()" ${all ? '' : 'disabled'}>${gids.length}문항 채점</button>`}</div>
  </div></div>`)}<div class="sub" style="text-align:center;margin-top:14px">${q0.g} · #${gids.join(', #')}</div>`;
}
function setTap(el, id, k) {
  const [a, b] = grp(QS.ids, QS.i), gids = QS.ids.slice(a, b);
  if (gids.every(x => x in QS.res)) { el.classList.toggle('open'); return; }
  QS.sp = QS.sp || {}; QS.sp[id] = k;
  el.parentElement.querySelectorAll('.opt').forEach(o => o.classList.remove('sel')); el.classList.add('sel');
  const btn = document.getElementById('chkbtn'); if (btn) btn.disabled = !gids.every(x => QS.sp[x] != null);
}
function checkSet() {
  const [a, b] = grp(QS.ids, QS.i), gids = QS.ids.slice(a, b); QS.picks = QS.picks || {};
  if (!gids.every(x => QS.sp[x] != null)) return;
  gids.forEach(id => { const q = QMAP[id], ok = QS.sp[id] === q.a; QS.res[id] = ok; QS.picks[id] = QS.sp[id]; record(id, ok); });
  snapQS(); render(); window.scrollTo(0, 0);
}
function quiz() {
  if (QMAP[QS.ids[QS.i]].g) return quizSet();
  const q = QMAP[QS.ids[QS.i]], c = CMAP[q.c], sh = QS.shown, ok = QS.pick === q.a;
  const head = `<div class="top"><div>${ptag(q.p)}${dtag(q.d)}${sh ? `<span class="tag">${esc(c.name)}</span>` : ''}</div>${inkBar()}</div>`;
  const qblock = q.g ? `<div class="qno">${setInfo(q)}</div><div class="q en">${qText(q)}</div>` : '';
  return `<div class="qbar"><div class="top"><button class="icon-btn" onclick="quitQuiz()">✕</button>
    <span class="sub">${esc(QS.title)} · ${QS.i + 1} / ${QS.ids.length}</span><span style="width:40px"></span></div>
  <div class="bar qprog"><i style="width:${Object.keys(QS.res).length / QS.ids.length * 100}%"></i></div></div>
  ${inkWrap(String(q.id), `<div class="qa"><div class="qa-l">${head}
  ${q.g ? psgHTML(q.g, q.k, true, sh) : `<div class="qcard"><div class="q en">${qText(q)}</div></div>`}
  </div><div class="qa-r">${qblock}
  ${q.o.map((t, k) => { let cl = ''; if (sh) { if (k === q.a) cl = 'right'; else if (k === QS.pick) cl = 'wrong'; } else if (k === QS.pick) cl = 'sel';
    return optHTML(q, k, cl, sh ? `${k === QS.pick && k !== q.a ? ' open' : ''}${q.w && k !== q.a ? ' hasw' : ''}` : '', `optTap(this, ${k})`, sh); }).join('')}
  ${sh && q.w ? '<div class="why-hint">보기를 누르면 왜 틀렸는지 보여요</div>' : ''}
  ${sh ? `${expHTML(q, ok ? 'ok' : 'no', ok ? '정답' : '오답 · 정답 ' + MK[q.a])}
    <div class="row" style="flex-wrap:wrap"><button class="chip c" onclick="showConcept('${c.id}')">유형 정리: ${esc(c.name)}</button>
    <button class="chip ${S.conf[q.id] ? 'on' : ''}" onclick="togConf(${q.id})">${S.conf[q.id] ? '헷갈림 표시됨' : '헷갈림 표시'}</button></div>
    <div class="navrow"><button class="btn line" onclick="prevQ()" ${QS.i ? '' : 'disabled'}>‹ 이전</button><button class="btn" onclick="nextQ()">${QS.i + 1 < QS.ids.length ? '다음 문제 ›' : '결과 보기'}</button></div>`
  : `<div class="navrow"><button class="btn line" onclick="prevQ()" ${QS.i ? '' : 'disabled'}>‹ 이전</button><button class="btn" onclick="check()" ${QS.pick == null ? 'disabled' : ''}>정답 확인</button></div>`}
  </div></div>`)}
  <div class="sub" style="text-align:center;margin-top:14px">#${q.id}${q.g ? ' · ' + q.g : ''}</div>`;
}
function pick(k) { if (QS.shown) return; QS.pick = k; render(); }
function check() { const q = QMAP[QS.ids[QS.i]]; if (QS.pick == null) return; const ok = QS.pick === q.a; QS.res[q.id] = ok; (QS.picks = QS.picks || {})[q.id] = QS.pick; record(q.id, ok); QS.shown = true; snapQS(); render(); }
function gotoQ(i) {
  const prevG = QMAP[QS.ids[QS.i]].g;
  if (QMAP[QS.ids[i]].g) i = grp(QS.ids, i)[0];
  QS.i = i; const id = QS.ids[i]; QS.picks = QS.picks || {};
  if (QMAP[id].g !== prevG) PSG_FULL = false;
  if (id in QS.res) { QS.pick = id in QS.picks ? QS.picks[id] : null; QS.shown = true; } else { QS.pick = null; QS.shown = false; }
  render(); window.scrollTo(0, 0);
}
function prevQ() { if (QS.i > 0) gotoQ(grp(QS.ids, QS.i - 1)[0]); }
function nextQ() { const e = grp(QS.ids, QS.i)[1]; if (e < QS.ids.length) gotoQ(e); else go('result'); }
function quitQuiz() {
  snapQS();
  if (QS.mode === 'wrong') { const r = S.resume.wrong; if (r) toast(`저장했어요 · ${r.ids.length - r.i}문제 남음`); go('wrong'); return; }
  if (Object.keys(QS.res).length) go('result'); else go('home');
}
function snapQS() {
  if (!QS) return; const k = QS.mode === 'wrong' ? 'wrong' : 'practice';
  S.resume = S.resume || {};
  let i = QS.ids.findIndex(id => !(id in QS.res));
  if (i < 0) delete S.resume[k];
  else S.resume[k] = { ids: QS.ids, i, res: QS.res, picks: QS.picks || {}, title: QS.title, mode: QS.mode };
  save();
}
function resumeInfo(k) { const r = S.resume && S.resume[k]; if (!r) return null; const left = r.ids.length - r.i; return left > 0 ? { r, left } : null; }
function resumeQS(k) {
  const x = resumeInfo(k); if (!x) return;
  QS = { ids: x.r.ids.filter(id => QMAP[id]), i: x.r.i, mode: x.r.mode, res: x.r.res || {}, picks: x.r.picks || {}, pick: null, shown: false, title: x.r.title };
  PSG_FULL = false; go('quiz');
}
function togConf(id) { if (S.conf[id]) delete S.conf[id]; else S.conf[id] = 1; save(); render(); }
function showConcept(id) { sheet(conceptBody(CMAP[id], true)); }

// ───────── 필기 (SQLD 합격노트와 같은 방식) ─────────
// 문제·보기·해설·지문 전체 위에 쓸 수 있고, 획은 가장 가까운 블록(문단·보기·해설…)에 붙어 있어
// 해설이 열리거나 지문 해석을 켜서 화면이 밀려도 제자리를 따라간다.
const INK = { on: false, col: '#e5484d', er: false, s: {}, pen: false, las: false, L: [] };
try { if (localStorage.getItem('rc_pen') === '1') INK.pen = true; } catch (e) {}
function penMode(on) { INK.pen = on; try { localStorage.setItem('rc_pen', on ? '1' : '0'); } catch (e) {} }
let inkFl = 0;
function inkFling(v) { // 손을 뗀 뒤에도 조금 더 미끄러지듯 스크롤
  const id = ++inkFl; let t = performance.now();
  const step = n => { if (id !== inkFl) return; const dt = Math.min(40, n - t); t = n; window.scrollBy(0, v * dt); v *= Math.pow(0.995, dt); if (Math.abs(v) > 0.03) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const INK_COLS = ['#e5484d', '#2f6fde', '#1f9d55'];
function inkBar() {
  if (!INK.on) return `<button class="inkbtn" onclick="inkToggle()">✎ 필기</button>`;
  return `<div class="inkbar-w"><div class="inkbar">${INK_COLS.map(c => `<button class="dot ${!INK.er && !INK.las && INK.col === c ? 'on' : ''}" style="--c:${c}" onclick="INK.col='${c}';INK.er=false;INK.las=false;inkBarRefresh()"></button>`).join('')}
    <button class="inkbtn las ${INK.las ? 'on' : ''}" onclick="INK.las=!INK.las;INK.er=false;inkBarRefresh()" title="떼면 사라지는 펜">레이저</button>
    <button class="inkbtn ${INK.er ? 'on' : ''}" onclick="INK.er=!INK.er;INK.las=false;inkBarRefresh()">지우개</button>
    <button class="inkbtn" onclick="inkUndo()">되돌리기</button>
    ${INK.cl && INK.cl[inkKey()] && !(INK.s[inkKey()] || []).length ? `<button class="inkbtn on" onclick="inkRestore()">복원</button>` : `<button class="inkbtn" onclick="inkClear()">전체 지우기</button>`}
    <button class="inkbtn on" onclick="inkToggle()">완료</button></div></div>`;
}
// 필기 영역: 화면의 문제 부분(.qa) 전체를 감싼다
function inkWrap(key, inner) {
  return `<div class="inkw inkall ${INK.on ? 'inking' : ''}${(INK.s[key] || []).length ? ' hasink' : ''}" id="inkw" data-q="${key}">${inner}<canvas class="ink" id="ink"></canvas></div>`;
}
function inkToggle() { INK.on = !INK.on; INK.er = false; INK.las = false; INK.L = []; render(); }
// 애플펜슬 몸통 두 번 탭(앱으로 감쌌을 때 앱이 호출): 풀이·모의고사 화면에서만
window.onPencilTap = () => {
  if ((view !== 'quiz' && view !== 'mockrun') || document.getElementById('sheet')) return;
  INK.pen = true; inkToggle(); toast(INK.on ? '필기 켜짐' : '필기 꺼짐');
};
function inkUndo() {
  const l = INK.s[inkKey()];
  if ((!l || !l.length) && INK.cl && INK.cl[inkKey()]) return inkRestore();
  if (!l || !l.length) return toast('되돌릴 필기가 없어요');
  l.pop(); if (!l.length) { const w = $('#inkw'); if (w) w.classList.remove('hasink'); }
  inkDraw(); inkBarRefresh(); toast(l.length || !(INK.cl && INK.cl[inkKey()]) ? '방금 한 것을 취소했어요' : '획을 다 취소했어요 · 한 번 더 누르면 전체 지우기 전으로');
}
document.addEventListener('keydown', e => { if (INK.on && $('#inkw') && (e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); inkUndo(); } });
function inkBarRefresh() { const b = document.querySelector('.inkbar-w'); if (b) b.outerHTML = inkBar(); inkBarFloat(); }
// 도구막대가 위로 밀려 올라가면 상단 바 바로 아래에 띄워 고정
function inkBarFloat() {
  const w = document.querySelector('.inkbar-w'), b = w && w.firstElementChild; if (!b) return;
  const qb = document.querySelector('.qbar'), lim = qb ? qb.getBoundingClientRect().bottom : 0, r = w.getBoundingClientRect();
  if (r.top < lim + 6) {
    if (!b.classList.contains('float')) { w.style.height = b.offsetHeight + 'px'; b.classList.add('float'); }
    b.style.top = (lim + 6) + 'px'; b.style.right = Math.max(8, window.innerWidth - r.right - 8) + 'px';
  } else if (b.classList.contains('float')) { b.classList.remove('float'); b.style.right = ''; b.style.top = ''; w.style.height = ''; }
}
window.addEventListener('scroll', inkBarFloat, { passive: true });
window.addEventListener('resize', inkBarFloat);
function inkClear() { const w = $('#inkw'); if (!w) return; const k = w.dataset.q, l = INK.s[k] || []; if (!l.length) return toast('지울 필기가 없어요'); (INK.cl = INK.cl || {})[k] = l.slice(); INK.s[k] = []; w.classList.remove('hasink'); inkDraw(); inkBarRefresh(); toast('모두 지웠어요 · 복원을 누르면 되돌려요'); }
function inkRestore() { const w = $('#inkw'); if (!w) return; const k = w.dataset.q, b = INK.cl && INK.cl[k]; if (!b) return; INK.s[k] = b.concat(INK.s[k] || []); delete INK.cl[k]; w.classList.add('hasink'); inkDraw(); inkBarRefresh(); toast('필기를 되돌렸어요'); }
function inkKey() { const w = $('#inkw'); return w ? w.dataset.q : null; }
// 획이 붙을 블록: 작은 것(표 칸·문단·보기)부터 큰 것(지문·좌우 영역)까지
const INK_AN = [['x', '.doc table.dt td, .doc table.dt th'], ['p', '.doc p, .doc .chat, .doc-t, .doc-h > div'], ['k', '.doc-k'], ['d', '.doc'], ['s', '.psg'],
  ['q', '.q'], ['c', '.qcard'], ['o', '.opt'], ['e', '.exp'], ['h', '.sq-sum, .why-hint'], ['sq', '.sq'], ['L', '.qa-l'], ['R', '.qa-r']];
function inkAnchors(w, cv) {
  const cr = cv.getBoundingClientRect(), out = [];
  INK_AN.forEach(([k, sel]) => w.querySelectorAll(sel).forEach((el, i) => { const r = el.getBoundingClientRect(); if (r.width && r.height) out.push({ id: k + i, x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height }); }));
  return out;
}
function inkPick(an, x, y) { // 점을 품은 가장 작은 블록, 없으면 세로로 가장 가까운 블록
  let best = null, bs = Infinity;
  an.forEach(b => { const dx = x < b.x ? b.x - x : x > b.x + b.w ? x - b.x - b.w : 0, dy = y < b.y ? b.y - y : y > b.y + b.h ? y - b.y - b.h : 0;
    const sc = (dx || dy) ? 1e9 + dy * 1e4 + dx : b.w * b.h; if (sc < bs) { bs = sc; best = b; } });
  return best;
}
function inkStroke(ctx, st, off) {
  const ox = off ? off[0] : 0, oy = off ? off[1] : 0;
  const p = ox || oy ? st.p.map(q => [q[0] + ox, q[1] + oy]) : st.p; if (!p.length) return;
  ctx.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
  ctx.strokeStyle = st.c; ctx.lineWidth = st.e ? 22 : 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
  if (p.length === 1) ctx.lineTo(p[0][0] + 0.1, p[0][1] + 0.1);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
  ctx.stroke();
}
// 캔버스 픽셀 배율 (iOS 캔버스 면적 한도 16.7M 픽셀 안으로)
function inkScale(cv) { return cv.width / (parseFloat(cv.style.width) || cv.width || 1); }
function inkDraw() {
  const cv = $('#ink'); if (!cv) return; const ctx = cv.getContext('2d'), k = inkScale(cv);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(k, 0, 0, k, 0, 0);
  const L = INK.s[inkKey()] || []; if (!L.length) return inkLas(ctx);
  const an = L.some(st => st.a) ? inkAnchors($('#inkw'), cv) : [], at = {}; an.forEach(b => { at[b.id] = b; });
  L.forEach(st => { const b = st.a && at[st.a]; inkStroke(ctx, st, st.a ? (b ? [b.x, b.y] : st.o) : null); });
  inkLas(ctx);
}
function inkLas(ctx) {
  if (!INK.L.length) return; const now = performance.now();
  INK.L.forEach(st => {
    const p = st.p.map(q => [q[0] + st.o[0], q[1] + st.o[1]]), al = st.up ? Math.max(0, 1 - (now - st.up) / 400) : 1; if (!p.length || !al) return;
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,45,45,.85)'; ctx.shadowBlur = 12; ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); if (p.length === 1) ctx.lineTo(p[0][0] + 0.1, p[0][1] + 0.1); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.stroke();
    if (!st.up) { const t = p[p.length - 1]; ctx.fillStyle = '#ff5a52'; ctx.beginPath(); ctx.arc(t[0], t[1], 4.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  });
}
let inkLasR = 0;
function inkLasFade() { // 뗀 레이저 선을 흐리게 지우기
  cancelAnimationFrame(inkLasR);
  const step = () => { const now = performance.now(); INK.L = INK.L.filter(st => !st.up || now - st.up < 400); inkDraw(); if (INK.L.some(st => st.up)) inkLasR = requestAnimationFrame(step); };
  inkLasR = requestAnimationFrame(step);
}
let inkRO = null;
function inkMount() {
  const w = $('#inkw'), cv = $('#ink'); if (inkRO) { inkRO.disconnect(); inkRO = null; } if (!w || !cv) return;
  const size = () => {
    // 내용이 짧아도 화면 맨 아래까지 필기 영역으로 (아래 빈 곳에 손바닥이 닿아도 필기 영역 안)
    const mh = INK.on || (INK.s[w.dataset.q] || []).length ? Math.max(0, Math.floor(window.innerHeight - (w.getBoundingClientRect().top + window.scrollY) - 12)) + 'px' : '';
    if (w.style.minHeight !== mh) w.style.minHeight = mh;
    const W = w.offsetWidth, H = w.offsetHeight; if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, Math.sqrt(16e6 / (W * H))), cw = Math.floor(W * dpr), ch = Math.floor(H * dpr);
    if (cv.width !== cw || cv.height !== ch || cv.style.width !== W + 'px' || cv.style.height !== H + 'px') { cv.width = cw; cv.height = ch; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    inkDraw(); };
  size(); if (window.ResizeObserver) { inkRO = new ResizeObserver(size); inkRO.observe(w); }
  // iOS: 필기 중 터치가 스크롤·탭으로 넘어가지 않게 터치 기본 동작을 막는다
  const stopTouch = e => { if (INK.on) e.preventDefault(); };
  cv.addEventListener('touchstart', stopTouch, { passive: false });
  cv.addEventListener('touchmove', stopTouch, { passive: false });
  cv.addEventListener('touchend', stopTouch, { passive: false });
  let cur = null, pan = null, penAt = 0, holdT = null, tp = null, lastTT = 0; const tch = new Set(), tpos = {};
  const snapEnd = c => { const a = c.p[0], b = c.p[c.p.length - 1].slice(), dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dy) < Math.abs(dx) * 0.105) b[1] = a[1]; else if (Math.abs(dx) < Math.abs(dy) * 0.105) b[0] = a[0]; // 6도 안쪽이면 가로·세로로 반듯하게
    c.p = [a, b]; };
  const toLine = c => { if (c !== cur || c.e || c.ln) return; const a = c.p[0], b = c.p[c.p.length - 1]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 24) return; c.ln = 1; snapEnd(c); inkDraw(); };
  const pt = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10]; };
  const dropCur = () => { if (!cur) return; if (cur.las) { INK.L = INK.L.filter(x => x !== cur); cur = null; inkDraw(); return; } const l = INK.s[inkKey()] || [], i = l.indexOf(cur); if (i >= 0) l.splice(i, 1); cur = null; inkDraw(); };
  const startPan = e => { pan = { id: e.pointerId, y: e.clientY, go: false }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} };
  cv.onpointerdown = e => {
    if (!INK.on) return;
    e.preventDefault();
    inkFl++;
    if (e.pointerType === 'pen') { if (!INK.pen) { let off = false; try { off = localStorage.getItem('rc_pen') === '0'; } catch (_) {} if (!off) penMode(true); } pan = null; penAt = Date.now(); if (cur && cur.t !== 'pen') dropCur(); }
    else if (e.pointerType === 'touch') {
      tch.add(e.pointerId); tpos[e.pointerId] = [e.clientX, e.clientY];
      if (tch.size === 2) tp = { t: Date.now(), moved: false }; else if (tch.size > 2 && tp) tp.moved = true;
      if (tch.size >= 2) { if (cur && cur.t === 'touch') dropCur(); if (!cur && Date.now() - penAt > 600) startPan(e); return; } // 두 손가락: 스크롤
      if (INK.pen) { if (!cur && !pan && Date.now() - penAt > 400) startPan(e); return; } // 펜 모드: 한 손가락은 스크롤, 펜으로 쓰는 중 손바닥은 무시
    }
    if (cur) return;
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const k = inkKey(), p0 = pt(e), b = inkPick(inkAnchors(w, cv), p0[0], p0[1]), o = b ? [b.x, b.y] : [0, 0];
    if (INK.las) { cur = { las: 1, c: '#ff3b30', p: [p0], id: e.pointerId, t: e.pointerType, o: [0, 0] }; INK.L.push(cur); inkDraw(); return; }
    cur = { c: INK.col, e: INK.er, p: [[p0[0] - o[0], p0[1] - o[1]]], id: e.pointerId, t: e.pointerType, a: b ? b.id : '', o }; (INK.s[k] = INK.s[k] || []).push(cur); w.classList.add('hasink'); inkDraw();
  };
  cv.onpointermove = e => {
    if (e.pointerType === 'pen') penAt = Date.now();
    if (tp && tpos[e.pointerId] && Math.hypot(e.clientX - tpos[e.pointerId][0], e.clientY - tpos[e.pointerId][1]) > 12) tp.moved = true;
    if (pan && e.pointerId === pan.id) { e.preventDefault(); const dy = e.clientY - pan.y;
      if (pan.go || Math.abs(dy) > 14) { pan.go = true; window.scrollBy(0, -dy); const tn = performance.now(); pan.v = -dy / Math.max(8, tn - (pan.t || tn - 16)); pan.t = tn; pan.y = e.clientY; } return; }
    if (!cur || e.pointerId !== cur.id) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (evs.length ? evs : [e]).forEach(ev => { const q = pt(ev); cur.p.push([q[0] - cur.o[0], q[1] - cur.o[1]]); });
    if (cur.las) { inkDraw(); return; }
    if (cur.ln) { snapEnd(cur); inkDraw(); return; }
    { const q = cur.p[cur.p.length - 1]; if (!cur.h || Math.hypot(q[0] - cur.h[0], q[1] - cur.h[1]) > 4) { cur.h = q; clearTimeout(holdT); const c = cur; holdT = setTimeout(() => toLine(c), 450); } }
    const ctx = cv.getContext('2d'), k = inkScale(cv); ctx.setTransform(k, 0, 0, k, 0, 0);
    inkStroke(ctx, { c: cur.c, e: cur.e, p: cur.p.slice(-evs.length - 1) }, cur.o);
  };
  cv.onpointerup = cv.onpointercancel = e => { if (e.pointerType === 'pen') penAt = Date.now(); tch.delete(e.pointerId); delete tpos[e.pointerId];
    if (tp && !tch.size) { if (!tp.moved && Date.now() - tp.t < 350 && e.type === 'pointerup') { if (Date.now() - lastTT < 500) { lastTT = 0; inkUndo(); } else lastTT = Date.now(); } tp = null; }
    if (pan && e.pointerId === pan.id) { if (pan.go && pan.t && performance.now() - pan.t < 80) inkFling(pan.v || 0); pan = null; } if (cur && e.pointerId === cur.id) { clearTimeout(holdT); delete cur.h; if (cur.las) { cur.up = performance.now(); inkLasFade(); } cur = null; } };
}
// 필기 중에는 필기 도구 말고는 아무것도 눌리지 않게 (보기·버튼·상단 버튼 포함)
window.addEventListener('click', e => {
  if (!INK.on || !$('#inkw')) return;
  if (e.target && e.target.closest && e.target.closest('.inkbar, .inkbtn, #sheet')) return;
  e.stopPropagation(); e.preventDefault();
}, true);

// ───────── 결과 ─────────
function result() {
  const ids = Object.keys(QS.res).map(Number), ok = ids.filter(id => QS.res[id]).length, wrongs = ids.filter(id => !QS.res[id]);
  const byC = {}; ids.forEach(id => { const c = QMAP[id].c; byC[c] = byC[c] || [0, 0]; byC[c][0]++; if (QS.res[id]) byC[c][1]++; });
  const weak = Object.entries(byC).filter(([, v]) => v[1] < v[0]).sort((a, b) => a[1][1] / a[1][0] - b[1][1] / b[1][0]);
  return `<h1>결과</h1><div class="card" style="text-align:center"><div class="big">${ok} / ${ids.length}</div><div class="sub">정답률 ${pct(ids.length ? ok / ids.length : null)}</div></div>
  ${weak.length ? `<h2>이번에 틀린 유형</h2><div class="cgrid">${weak.map(([cid, v]) => `<div class="card" onclick="go('concept',{id:'${cid}'})"><div class="top"><b>${esc(CMAP[cid].name)}</b><span class="sub">${v[1]}/${v[0]}</span></div></div>`).join('')}</div>` : '<div class="card">전부 맞혔어요.</div>'}
  ${wrongs.length ? `<button class="btn" onclick="QS={ids:${JSON.stringify(wrongs)},i:0,mode:'wrong',res:{},picks:{},pick:null,shown:false,title:'틀린 문제 다시'};go('quiz')">틀린 ${wrongs.length}문제 바로 다시 풀기</button>` : ''}
  <button class="btn line" style="margin-top:10px" onclick="go('home')">홈으로</button>`;
}

// ───────── 오답노트 ─────────
function wrong() {
  const ids = wrongIds(); const g = {};
  ids.forEach(id => { const c = QMAP[id].c; (g[c] = g[c] || []).push(id); });
  const keys = Object.keys(g).sort((a, b) => g[b].length - g[a].length);
  return `<h1>오답노트</h1><div class="sub">틀린 문제와 헷갈림 표시한 문제 ${ids.length}개 · 연속 2번 맞히면 자동으로 빠져요</div>
  ${(() => { const x = resumeInfo('wrong'); if (!x) return ''; const done = x.r.i, tot = x.r.ids.length, ok = Object.values(x.r.res || {}).filter(Boolean).length;
    return `<div class="card"><div class="top"><b>풀던 오답 이어서</b><span class="sub">${esc(x.r.title)}</span></div>
    <div class="bar" style="margin:10px 0 6px"><i style="width:${done / tot * 100}%"></i></div>
    <div class="sub">${done}/${tot} 풀이 · 맞힘 ${ok} · ${x.left}문제 남음</div>
    <button class="btn" style="margin-top:10px" onclick="resumeQS('wrong')">이어서 풀기</button></div>`; })()}
  ${ids.length ? `<button class="btn ${resumeInfo('wrong') ? 'line' : ''}" style="margin:12px 0" onclick="startWrong()">${resumeInfo('wrong') ? '처음부터 새로 섞어서 풀기' : '전체 다시 풀기'}</button>` : '<div class="card">아직 오답이 없어요.</div>'}
  <div class="cgrid">${keys.map(k => `<div class="card"><div class="top"><b><span class="tag">P${CMAP[k].p}</span>${esc(CMAP[k].name)}</b><span class="pill">${g[k].length}</span></div>
    <div class="list">${g[k].slice(0, 40).map(id => { const q = QMAP[id], a = S.att[id] || {}; const t = q.q.replace(/-{4,}/g, '____'); return `<div class="it" onclick="peek(${id})"><span>${dtag(q.d)}${esc(t.slice(0, 60))}${t.length > 60 ? '…' : ''}</span><span class="sub">${a.wr ? '✕' + a.wr : ''}${S.conf[id] ? ' ?' : ''}</span></div>`; }).join('')}</div>
    <div class="grid2" style="margin-top:10px"><button class="btn ghost" onclick="QS={ids:${JSON.stringify(g[k])},i:0,mode:'wrong',res:{},picks:{},pick:null,shown:false,title:'오답 · ${esc(CMAP[k].name)}'};go('quiz')">이 유형 오답 풀기</button>
    <button class="btn line" onclick="go('concept',{id:'${k}'})">유형 정리</button></div></div>`).join('')}</div>`;
}
function optTap(el, k) { if (QS.shown) el.classList.toggle('open'); else pick(k); }
function whyH(q, k) { return q.w && k !== q.a && q.w[k] ? `<span class="why">✕ ${esc(q.w[k])}</span>` : ''; }
function peek(id) {
  const q = QMAP[id];
  sheet(`<div>${ptag(q.p)}${dtag(q.d)}<span class="tag">${esc(CMAP[q.c].name)}</span></div>${q.g ? psgHTML(q.g, q.k, false, true) + `<div class="qno">${setInfo(q)}</div>` : ''}<div class="q en">${qText(q)}</div>
  ${q.o.map((t, k) => optHTML(q, k, k === q.a ? 'right' : '', q.w && k !== q.a ? ' hasw' : '', "this.classList.toggle('open')", true)).join('')}
  ${q.w ? '<div class="why-hint">보기를 누르면 왜 틀렸는지 보여요</div>' : ''}
  ${expHTML(q, 'ok', '정답 ' + MK[q.a])}
  ${S.conf[id] ? `<button class="btn line" onclick="togConf(${id});closeSheet()">헷갈림 표시 해제</button>` : ''}`);
}

// ───────── 유형 정리 ─────────
function concepts() {
  const done = Object.keys(S.cdone).length;
  const units = [...new Set(CONCEPTS.map(c => c.p + '|' + c.unit))];
  return `<h1>문법 · 유형 노트</h1><div class="sub">${CONCEPTS.length}개 노트 중 ${done}개 학습 완료 · Part 5 문법은 규칙·예문·함정까지 정리</div>
  <div class="ugrid">${units.map(u => { const [p, name] = u.split('|'); return `<section><h2>Part ${p} · ${esc(name)}</h2><div class="card list">${CONCEPTS.filter(c => c.p == p && c.unit === name).map(c => { const st = conceptStat(c.id);
    return `<div class="it" onclick="go('concept',{id:'${c.id}'})"><span>${S.cdone[c.id] ? '✓ ' : ''}${esc(c.name)}</span><span class="sub">${st.n ? pct(st.acc) : ''} ${st.total}문항</span></div>`; }).join('')}</div></section>`; }).join('')}</div>`;
}
function conceptBody(c, inSheet) {
  const st = conceptStat(c.id);
  return `<div class="sub">Part ${c.p} · ${esc(c.unit)}</div><h1 style="font-size:21px">${esc(c.name)}</h1>
  <div class="row" style="margin:6px 0 4px"><span class="pill">정답률 ${pct(st.acc)}</span><span class="sub">${st.solved}/${st.total}문항 풀이</span></div>
  ${GRAMMAR[c.id] ? gramHTML(GRAMMAR[c.id]) : `<ul class="sum">${c.sum.map(t => `<li>${md(t)}</li>`).join('')}</ul>
  ${c.ex ? `<pre class="code" style="white-space:pre-wrap">${esc(c.ex.join('\n'))}</pre>` : ''}`}
  ${c.trap ? `<div class="trap"><b>함정</b><br>${c.trap.map(md).join('<br>')}</div>` : ''}
  ${inSheet ? '' : `<div class="grid2" style="margin-top:14px">
    <button class="btn" ${st.total ? '' : 'disabled'} onclick="startPractice({cs:['${c.id}'],n:20,order:'new',title:'${esc(c.name)}'})">이 유형 문제 풀기</button>
    <button class="btn ${S.cdone[c.id] ? 'line' : 'ghost'}" onclick="togDone('${c.id}')">${S.cdone[c.id] ? '학습 완료 취소' : '학습 완료'}</button></div>
    ${(() => { const un = (BY_C[c.id] || []).filter(id => !S.att[id]).length; return un ? `<button class="btn line" style="margin-top:8px" onclick="startPractice({cs:['${c.id}'],un:1,n:20,order:'rand',title:'${esc(c.name)} · 안 푼 문제'})">이 유형에서 안 푼 문제 ${un}개</button>` : ''; })()}`}`;
}
function gramHTML(g) {
  return `${g.intro ? `<p class="g-intro">${md(g.intro)}</p>` : ''}${(g.rules || []).map((r, i) => `<div class="g-rule"><div class="g-h"><span>${i + 1}</span><div>${md(r.h)}</div></div>${r.p ? `<div class="g-p">${md(r.p)}</div>` : ''}
    ${(r.ex || []).map(([en, ko]) => `<div class="g-ex"><div class="en tapw">${md(en)}</div><div class="ko">${md(ko)}</div></div>`).join('')}</div>`).join('')}
  ${g.list ? `<div class="g-list"><b>${esc(g.listTitle || '빈출 표현')}</b>${g.list.map(([en, ko]) => `<div class="it"><span class="en tapw">${esc(en)}</span><span class="ko">${esc(ko)}</span></div>`).join('')}</div>` : ''}`;
}
function concept() { return `<button class="icon-btn" onclick="go('concepts')">← 유형 목록</button>` + `<div class="card" style="margin-top:12px">${conceptBody(CMAP[P.id])}</div>`; }
function togDone(id) { if (S.cdone[id]) delete S.cdone[id]; else S.cdone[id] = today(); save(); render(); }

// ───────── 분석 ─────────
let STAB = 'weak';
function stats() {
  const ps = PARTS.map(p => overall(q => q.p === p));
  const ds = [1, 2, 3, 4].map(d => overall(q => q.d === d));
  const days = Object.keys(S.days).sort().slice(-14);
  const maxN = Math.max(1, ...days.map(k => S.days[k].n));
  let list = CONCEPTS.map(c => ({ c, s: conceptStat(c.id) }));
  if (STAB === 'weak') list = list.filter(x => x.s.n).sort((a, b) => (a.s.c + 1) / (a.s.n + 2) - (b.s.c + 1) / (b.s.n + 2));
  else if (STAB === 'none') list = list.filter(x => !x.s.solved);
  return `<h1>분석</h1>
  <div class="grid3">${ps.map((x, i) => `<div class="card stat"><b>${pct(x.acc)}</b><span>Part ${PARTS[i]} · ${x.solved}/${x.total}</span></div>`).join('')}</div>
  <div class="card"><b>난이도별</b>${ds.map((x, i) => `<div style="margin-top:10px"><div class="top"><span>${DLABEL[i + 1]}</span><span class="sub">${pct(x.acc)} · ${x.solved}/${x.total}</span></div><div class="bar ${lvl(x.acc)}"><i style="width:${(x.acc || 0) * 100}%"></i></div></div>`).join('')}</div>
  <div class="card"><b>최근 14일</b>${days.length ? `<div style="display:flex;align-items:flex-end;gap:4px;height:90px;margin-top:10px">${days.map(k => `<div style="flex:1;text-align:center"><div style="height:${S.days[k].n / maxN * 70}px;background:var(--pri);border-radius:4px 4px 0 0;opacity:${0.4 + 0.6 * S.days[k].c / S.days[k].n}"></div><div class="sub" style="font-size:9px">${k.slice(8)}</div></div>`).join('')}</div>` : '<div class="sub">아직 기록이 없어요</div>'}</div>
  ${S.mocks.length ? `<div class="card"><b>모의고사 기록</b><div class="list">${S.mocks.slice(-6).reverse().map(m => `<div class="it"><span>${m.date}</span><span>${m.c}/100 · 예상 ${m.score}점 <span class="sub">(P5 ${m.p5} · P6 ${m.p6} · P7 ${m.p7})</span></span></div>`).join('')}</div></div>` : ''}
  ${S.diags.length ? `<div class="card"><b>진단평가 기록</b><div class="list">${S.diags.slice(-6).reverse().map(m => `<div class="it"><span>${m.date}</span><span>예상 ${m.score}점 <span class="sub">(${m.lo}~${m.hi} · ${m.c}/${m.N})</span></span></div>`).join('')}</div></div>` : ''}
  <h2>유형별</h2>
  <div class="seg">${[['weak', '약한 순'], ['all', '전체'], ['none', '안 푼 유형']].map(([v, l]) => `<button class="${STAB === v ? 'on' : ''}" onclick="STAB='${v}';render()">${l}</button>`).join('')}</div>
  ${list.length ? `<div class="cgrid">${list.map(x => conceptRow(x.c, x.s)).join('')}</div>` : '<div class="card sub">해당하는 유형이 없어요</div>'}`;
}

// ───────── 모의고사 (RC 100문항 · 75분) ─────────
let MK_S = null;
const SCORE_TBL = [[100, 495], [97, 495], [95, 490], [92, 470], [90, 455], [87, 435], [85, 420], [82, 400], [80, 385], [77, 365], [75, 350], [72, 330], [70, 315], [65, 285], [60, 255], [55, 225], [50, 200], [45, 175], [40, 150], [30, 105], [20, 65], [10, 30], [0, 5]];
function estScore(c) { for (let i = 0; i < SCORE_TBL.length - 1; i++) { const [c1, s1] = SCORE_TBL[i], [c2, s2] = SCORE_TBL[i + 1]; if (c >= c2) return Math.round((s2 + (s1 - s2) * (c - c2) / (c1 - c2)) / 5) * 5; } return 5; }
function mock() {
  const n = S.mocks.length;
  return `<button class="icon-btn" onclick="go('home')">← 홈</button><h1>RC 모의고사</h1>
  <div class="card"><ul class="sum"><li>실제 RC 구성 그대로 100문항: Part 5 30 · Part 6 4지문 16 · Part 7 54(단일 지문 → 복수 지문 순)</li><li>제한 시간 75분, 시간이 다 되면 자동 제출</li><li>안 푼 문제 위주로 뽑고, 모자라면 푼 문제에서 채움</li><li>예상 점수는 정답 수를 대략적인 환산표로 바꾼 값이라 실제 성적과 다를 수 있어요</li></ul></div>
  ${n ? `<div class="sub" style="margin:4px 2px 10px">최근: ${S.mocks[n - 1].date} · ${S.mocks[n - 1].c}/100 · 예상 ${S.mocks[n - 1].score}점</div>` : ''}
  <button class="btn" onclick="startMock()">시작</button>`;
}
function pickSets(part, wantQ, filt) {
  const sets = Object.keys(BY_G).filter(g => PSG[g].part === part && (!filt || filt(g)));
  const fresh = s => BY_G[s].every(id => !S.att[id]);
  const order = [...shuffle(sets.filter(fresh)), ...shuffle(sets.filter(s => !fresh(s)))];
  const out = []; let n = 0;
  for (const s of order) { if (n >= wantQ) break; if (n + BY_G[s].length > wantQ) continue; out.push(s); n += BY_G[s].length; }
  const rem = wantQ - n, L = g => BY_G[g].length, unused = order.filter(g => !out.includes(g));
  if (rem > 0) {
    const t = unused.find(g => L(g) === rem);
    if (t) out.push(t);
    else for (let k = 0; k < out.length; k++) { const u = unused.find(g => L(g) === L(out[k]) + rem); if (u) { out[k] = u; break; } }
  }
  return out;
}
function startMock() {
  const p5 = BANK.filter(q => q.p === 5); const want = { 1: 4, 2: 10, 3: 12, 4: 4 };
  let a = []; [1, 2, 3, 4].forEach(d => { const pool = p5.filter(q => q.d === d); a = a.concat([...shuffle(pool.filter(q => !S.att[q.id])), ...shuffle(pool.filter(q => S.att[q.id]))].slice(0, want[d])); });
  if (a.length < 30) a = a.concat(shuffle(p5.filter(q => !a.includes(q))).slice(0, 30 - a.length));
  a = shuffle(a).map(q => q.id);
  const s6 = pickSets(6, 16), multi = pickSets(7, 25, g => PSG[g].docs.length > 1), single = pickSets(7, 54 - multi.reduce((n, g) => n + BY_G[g].length, 0), g => PSG[g].docs.length === 1);
  single.sort((x, y) => BY_G[x].length - BY_G[y].length); multi.sort((x, y) => PSG[x].docs.length - PSG[y].docs.length);
  const ids = [...a, ...[].concat(...s6.map(g => BY_G[g])), ...[].concat(...single.map(g => BY_G[g])), ...[].concat(...multi.map(g => BY_G[g]))];
  INK.s = {}; PSG_FULL = false;
  MK_S = { ids, i: 0, ans: {}, end: Date.now() + 75 * 60 * 1000, T: 75 * 60 * 1000, kind: 'mock', base: 101 };
  go('mockrun');
  timerId = setInterval(() => { const el = $('#mt'); if (!MK_S) return; const left = MK_S.end - Date.now(); if (left <= 0) { submitMock(true); return; } if (el) el.textContent = fmtT(left); }, 1000);
}
const fmtT = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function mkGo(i) { const pg = QMAP[MK_S.ids[MK_S.i]].g; if (QMAP[MK_S.ids[i]].g) i = grp(MK_S.ids, i)[0]; MK_S.i = i; const g = QMAP[MK_S.ids[i]].g; if (g !== pg) PSG_FULL = false; render(); scrollTo(0, 0); }
// 진단평가: 고르는 즉시 정답·오답과 해설을 보여 주고, 한 번 고른 답은 바꿀 수 없음
function mkOpts(x) {
  const p = MK_S.ans[x.id], inst = MK_S.kind === 'diag' && p != null;
  return x.o.map((t, k) => { let cl = inst ? (k === x.a ? 'right' : k === p ? 'wrong' : '') : (p === k ? 'sel' : '');
    return optHTML(x, k, cl, inst ? `${k === p && k !== x.a ? ' open' : ''}${x.w && k !== x.a ? ' hasw' : ''}` : '', inst ? "this.classList.toggle('open')" : `mkTap(this,${x.id},${k})`, inst); }).join('')
    + (inst ? expHTML(x, p === x.a ? 'ok' : 'no', p === x.a ? '정답' : '오답 · 정답 ' + MK[x.a]) : '');
}
function mkTap(el, id, k) {
  if (MK_S.kind === 'diag') { if (MK_S.ans[id] != null) return; MK_S.ans[id] = k; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  MK_S.ans[id] = k; el.parentElement.querySelectorAll('.opt').forEach(o => o.classList.remove('sel')); el.classList.add('sel'); const c = document.getElementById('mkcnt'); if (c) c.textContent = Object.keys(MK_S.ans).length + '/' + MK_S.ids.length; }
function mockrun() {
  const [a, b] = grp(MK_S.ids, MK_S.i); if (MK_S.i !== a) MK_S.i = a;
  const gids = MK_S.ids.slice(a, b), q = QMAP[gids[0]], answered = Object.keys(MK_S.ans).length, N = MK_S.ids.length;
  const body = q.g ? gids.map((id, j) => { const x = QMAP[id]; return `<div class="sq"><div class="sq-h"><span class="sq-n">${a + j + MK_S.base}.</span></div><div class="q en">${qText(x)}</div>${mkOpts(x)}</div>`; }).join('')
    : mkOpts(q);
  return `<div class="qbar"><div class="top"><button class="icon-btn" onclick="ask('${mkName()}를 그만둘까요? 이번 풀이는 저장되지 않아요.', '그만두기', ()=>{MK_S=null;go('home')})">✕</button>
    <span class="timer" id="mt">${fmtT(MK_S.end - Date.now())}</span><button class="icon-btn" id="mkcnt" onclick="mockGrid()">${MK_S.kind === 'diag' ? `맞힘 ${Object.keys(MK_S.ans).filter(id => MK_S.ans[id] === QMAP[id].a).length} · ` : ''}${answered}/${N}</button></div></div>
  <div class="sub" style="margin-top:10px">Part ${q.p} · ${b - a > 1 ? `${a + MK_S.base}–${b + MK_S.base - 1}번` : `${a + MK_S.base}번`}</div>
  ${inkWrap('m' + gids[0], `<div class="qa"><div class="qa-l"><div class="top" style="justify-content:flex-end">${inkBar()}</div>
  ${q.g ? psgHTML(q.g, null, true) : `<div class="qcard"><div class="q en">${qText(q)}</div></div>`}</div><div class="qa-r">
  ${body}
  <div class="grid2" style="margin-top:12px"><button class="btn line" ${a ? '' : 'disabled'} onclick="mkGo(grp(MK_S.ids, MK_S.i-1)[0])">이전</button>
  ${b < N ? `<button class="btn" onclick="mkGo(${b})">다음</button>` : `<button class="btn" onclick="submitMock()">제출</button>`}</div></div></div>`)}`;
}
function mockGrid() {
  sheet(`<b>문항 이동</b><div style="display:grid;grid-template-columns:repeat(10,1fr);gap:5px;margin:12px 0">${MK_S.ids.map((id, i) => `<button class="chip ${MK_S.ans[id] != null ? 'on' : ''}" style="margin:0;padding:7px 0;font-size:12px" onclick="closeSheet();mkGo(${i})">${i + MK_S.base}</button>`).join('')}</div>
  <button class="btn" onclick="closeSheet();submitMock()">제출하고 채점</button>`);
}
function submitMock(auto, force) {
  const N = MK_S.ids.length;
  if (!auto && !force && Object.keys(MK_S.ans).length < N) return ask(`안 푼 문제가 ${N - Object.keys(MK_S.ans).length}개 있어요. 제출할까요?`, '제출', () => submitMock(false, true));
  clearInterval(timerId); timerId = null;
  const by = { 5: 0, 6: 0, 7: 0 }; const wrongs = [];
  MK_S.ids.forEach(id => { const q = QMAP[id], ok = MK_S.ans[id] === q.a; if (MK_S.ans[id] != null) record(id, ok); else { const a = S.att[id] || (S.att[id] = { n: 0, c: 0, st: 0, w: false, wr: 0 }); a.w = true; a.wr++; } if (ok) by[q.p]++; else wrongs.push(id); });
  const c = by[5] + by[6] + by[7], score = estScore(c * 100 / N);
  const tot = p => MK_S.ids.filter(id => QMAP[id].p === p).length;
  const r = { date: today(), c, score, p5: by[5], p6: by[6], p7: by[7], t5: tot(5), t6: tot(6), t7: tot(7), wrongs, used: Math.round((MK_S.T - Math.max(0, MK_S.end - Date.now())) / 60000) };
  if (MK_S.kind === 'diag') return diagDone(r);
  S.mocks.push({ date: r.date, c, score, p5: by[5], p6: by[6], p7: by[7] }); save();
  MK_S = null; go('mockresult', r);
}
function mockresult() {
  const r = P, byC = {};
  r.wrongs.forEach(id => { const c = QMAP[id].c; byC[c] = (byC[c] || 0) + 1; });
  return `<h1>모의고사 결과</h1><div class="card" style="text-align:center"><div class="big">${r.c} / 100</div>
  <div style="margin-top:6px"><span class="pill">예상 RC ${r.score}점</span> <span class="sub">· ${r.used}분 사용</span></div>
  <div class="grid3" style="margin-top:14px"><div class="stat"><b>${r.p5}/${r.t5}</b><span>Part 5</span></div><div class="stat"><b>${r.p6}/${r.t6}</b><span>Part 6</span></div><div class="stat"><b>${r.p7}/${r.t7}</b><span>Part 7</span></div></div></div>
  ${Object.keys(byC).length ? `<h2>틀린 유형</h2><div class="cgrid">${Object.entries(byC).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<div class="card" onclick="go('concept',{id:'${c}'})"><div class="top"><b><span class="tag">P${CMAP[c].p}</span>${esc(CMAP[c].name)}</b><span class="sub">${n}문제</span></div></div>`).join('')}</div>` : ''}
  ${r.wrongs.length ? `<button class="btn" onclick="QS={ids:${JSON.stringify(r.wrongs)},i:0,mode:'wrong',res:{},picks:{},pick:null,shown:false,title:'모의고사 오답'};go('quiz')">틀린 ${r.wrongs.length}문제 해설 보며 다시 풀기</button>` : ''}
  <button class="btn line" style="margin-top:10px" onclick="go('home')">홈으로</button>`;
}

// ───────── 진단평가 (50문항 · 37분 30초) ─────────
// 실제 RC 구성비를 절반으로: Part 5 15 · Part 6 2지문 8 · Part 7 27(단일 → 복수)
// 점수는 난이도 가중 정답률을 모의고사와 같은 환산표에 넣고, 문항 수가 적은 만큼 ±1 표준오차를 범위로 보여 준다.
const DIAG_T = 37.5 * 60 * 1000, DIAG_W = { 1: 0.8, 2: 1, 3: 1.15, 4: 1.3 };
const mkName = () => MK_S && MK_S.kind === 'diag' ? '진단평가' : '모의고사';
function diag() {
  const L = S.diags, last = L[L.length - 1];
  return `<button class="icon-btn" onclick="go('home')">← 홈</button><h1>진단평가</h1>
  <div class="sub" style="margin-bottom:6px">50문항으로 지금 RC가 몇 점쯤인지 알아봐요</div>
  <div class="card"><ul class="sum"><li>실제 RC 구성비 그대로 절반: Part 5 15 · Part 6 2지문 8 · Part 7 27</li><li>제한 시간 37분 30초 (실전과 같은 속도), 시간이 다 되면 자동 제출</li><li>보기를 고르면 바로 정답과 해설이 나와요. 한 번 고른 답은 바꿀 수 없어요</li><li>기본~최고난도를 고르게 섞고, 안 푼 문제 위주로 뽑아요</li><li>어려운 문제를 맞히면 점수에 조금 더 반영돼요</li><li>문항이 50개라 예상 점수는 범위로 보여 줘요. 실제 성적과 다를 수 있어요</li></ul></div>
  ${last ? `<div class="sub" style="margin:4px 2px 10px">최근: ${last.date} · ${last.c}/${last.N} · 예상 ${last.score}점 (${last.lo}~${last.hi})</div>` : ''}
  <button class="btn" onclick="startDiag()">시작</button>`;
}
function startDiag() {
  const p5 = BANK.filter(q => q.p === 5), want = { 1: 2, 2: 5, 3: 6, 4: 2 };
  let a = []; [1, 2, 3, 4].forEach(d => { const pool = p5.filter(q => q.d === d); a = a.concat([...shuffle(pool.filter(q => !S.att[q.id])), ...shuffle(pool.filter(q => S.att[q.id]))].slice(0, want[d])); });
  if (a.length < 15) a = a.concat(shuffle(p5.filter(q => !a.includes(q))).slice(0, 15 - a.length));
  a = shuffle(a).map(q => q.id);
  const s6 = pickSets(6, 8), multi = pickSets(7, 10, g => PSG[g].docs.length > 1), single = pickSets(7, 27 - multi.reduce((n, g) => n + BY_G[g].length, 0), g => PSG[g].docs.length === 1);
  single.sort((x, y) => BY_G[x].length - BY_G[y].length); multi.sort((x, y) => PSG[x].docs.length - PSG[y].docs.length);
  const ids = [...a, ...[].concat(...s6.map(g => BY_G[g])), ...[].concat(...single.map(g => BY_G[g])), ...[].concat(...multi.map(g => BY_G[g]))];
  INK.s = {}; PSG_FULL = false;
  MK_S = { ids, i: 0, ans: {}, end: Date.now() + DIAG_T, T: DIAG_T, kind: 'diag', base: 1 };
  go('mockrun');
  timerId = setInterval(() => { const el = $('#mt'); if (!MK_S) return; const left = MK_S.end - Date.now(); if (left <= 0) { submitMock(true); return; } if (el) el.textContent = fmtT(left); }, 1000);
}
function diagEst(ids, ans) {
  let w = 0, wc = 0; ids.forEach(id => { const q = QMAP[id], k = DIAG_W[q.d] || 1; w += k; if (ans[id] === q.a) wc += k; });
  const p = w ? wc / w : 0, se = Math.sqrt(Math.max(p * (1 - p), 0.04) / ids.length);
  return { score: estScore(p * 100), lo: estScore(Math.max(0, p - se) * 100), hi: estScore(Math.min(1, p + se) * 100) };
}
function diagDone(r) {
  const ids = MK_S.ids, ans = MK_S.ans, e = diagEst(ids, ans);
  const dd = [1, 2, 3, 4].map(d => { const x = ids.filter(id => QMAP[id].d === d); return [x.filter(id => ans[id] === QMAP[id].a).length, x.length]; });
  Object.assign(r, e, { N: ids.length, dd, skip: ids.filter(id => ans[id] == null).length, sec: Math.round((MK_S.T - Math.max(0, MK_S.end - Date.now())) / 1000) });
  S.diags.push({ date: r.date, c: r.c, N: r.N, score: r.score, lo: r.lo, hi: r.hi, p5: r.p5, p6: r.p6, p7: r.p7 }); save();
  MK_S = null; go('diagresult', r);
}
function diagresult() {
  const r = P, byC = {}; r.wrongs.forEach(id => { const c = QMAP[id].c; byC[c] = (byC[c] || 0) + 1; });
  const mm = s => `${Math.floor(s / 60)}분${s % 60 ? ' ' + (s % 60) + '초' : ''}`;
  const pace = r.skip ? `안 푼 ${r.skip}문제는 오답으로 계산했어요. 실전에선 Part 7 뒤쪽이 이렇게 비기 쉬워요.` : r.sec > DIAG_T / 1000 - 60 ? '시간을 거의 다 썼어요. 실전에선 Part 5를 조금 더 빨리 넘겨야 Part 7에 여유가 생겨요.' : '시간 안에 다 풀었어요.';
  return `<h1>진단평가 결과</h1>
  <div class="card" style="text-align:center"><div class="sub">예상 RC 점수</div><div class="big">${r.score}</div>
  <div style="margin-top:6px"><span class="pill">${r.lo} ~ ${r.hi}점</span></div>
  <div class="sub" style="margin-top:8px">${r.N}문항 중 ${r.c}개 정답 · ${mm(r.sec)} 사용</div>
  <div class="grid3" style="margin-top:14px"><div class="stat"><b>${r.p5}/${r.t5}</b><span>Part 5</span></div><div class="stat"><b>${r.p6}/${r.t6}</b><span>Part 6</span></div><div class="stat"><b>${r.p7}/${r.t7}</b><span>Part 7</span></div></div></div>
  <div class="card"><b>난이도별</b>${r.dd.map(([c, n], i) => n ? `<div style="margin-top:10px"><div class="top"><span>${DLABEL[i + 1]}</span><span class="sub">${c}/${n}</span></div><div class="bar ${lvl(c / n)}"><i style="width:${c / n * 100}%"></i></div></div>` : '').join('')}
  <div class="sub" style="margin-top:12px">${pace}</div></div>
  ${Object.keys(byC).length ? `<h2>틀린 유형</h2><div class="cgrid">${Object.entries(byC).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<div class="card" onclick="go('concept',{id:'${c}'})"><div class="top"><b><span class="tag">P${CMAP[c].p}</span>${esc(CMAP[c].name)}</b><span class="sub">${n}문제</span></div></div>`).join('')}</div>` : ''}
  ${r.wrongs.length ? `<button class="btn" onclick="QS={ids:${JSON.stringify(r.wrongs)},i:0,mode:'wrong',res:{},picks:{},pick:null,shown:false,title:'진단평가 오답'};go('quiz')">틀린 ${r.wrongs.length}문제 해설 보며 다시 풀기</button>` : ''}
  <button class="btn line" style="margin-top:10px" onclick="go('home')">홈으로</button>
  <div class="sub" style="text-align:center;margin-top:14px">범위는 문항 수가 적어 생기는 오차예요. 2~3주 간격으로 다시 보면 변화가 보여요.</div>`;
}

// ───────── 단어 카드 ─────────
let FC = null;
function myWords() { return Object.keys(S.myw || {}).sort((a, b) => (S.myw[b].t || '').localeCompare(S.myw[a].t || '')); }
function flash() {
  const mw = myWords(), mk = mw.filter(w => S.myw[w].k).length;
  if (!FC) return `<button class="icon-btn" onclick="go('home')">← 홈</button><h1>단어 카드</h1><div class="sub">문제·지문·문법 노트에서 단어를 누르면 뜻이 뜨고 내 단어장에 담을 수 있어요</div>
    <div class="card"><div class="top"><b>내 단어장</b><span class="sub">${mk}/${mw.length} 외움</span></div>
    <div class="row" style="margin:10px 0"><input id="nw" placeholder="영어 단어 입력해서 추가" autocapitalize="off" autocorrect="off" style="flex:1" onkeydown="if(event.key==='Enter')addTyped()"><button class="btn" style="width:auto;padding:10px 16px" onclick="addTyped()">추가</button></div>
    ${mw.length ? `<div class="grid2"><button class="btn" onclick="startFlash('my')">내 단어 외우기</button><button class="btn line" onclick="startFlash('myu')">모르는 것만</button></div>
    <div class="list" style="margin-top:8px">${mw.slice(0, 300).map(w => `<div class="it"><span><b class="en">${esc(w)}</b> <span class="sub">${esc(S.myw[w].m || '')}</span></span><span style="white-space:nowrap"><span class="sub">${S.myw[w].k ? '✓ ' : ''}</span><button class="sub" data-w="${esc(w)}" onclick="delWord(this.dataset.w)">삭제</button></span></div>`).join('')}</div>` : '<div class="sub">아직 담은 단어가 없어요.</div>'}</div>
    <h2>토익 빈출 단어</h2>
    <div class="cgrid">${FLASH.map((s, i) => { const known = s.cards.filter((c, j) => S.fl[i + '-' + j]).length; return `<div class="card" onclick="startFlash(${i})"><div class="top"><b>${esc(s.name)}</b><span class="sub">${known}/${s.cards.length} 외움</span></div><div class="bar high" style="margin-top:8px"><i style="width:${known / s.cards.length * 100}%"></i></div></div>`; }).join('')}</div>
    <button class="btn line" onclick="startFlash(-1)">모르는 카드만 전체 섞어서</button>`;
  const [si, ci] = FC.list[FC.i], card = si === 'my' ? [ci, (S.myw[ci] || {}).m || '(뜻 없음)', ''] : FLASH[si].cards[ci];
  return `<div class="top"><button class="icon-btn" onclick="FC=null;render()">✕</button><span class="sub">${FC.i + 1} / ${FC.list.length}</span><span></span></div>
  <div class="card flash" onclick="FC.flip=!FC.flip;render()">${FC.flip ? `<small style="margin:0 0 10px;font-family:Georgia,serif;font-size:17px">${esc(card[0])}</small><b>${md(card[1])}</b><small style="font-family:Georgia,serif">${esc(card[2] || '')}</small>` : `<span style="font-family:Georgia,serif">${esc(card[0])}</span><small>${si === 'my' ? '내 단어장' : esc(FLASH[si].name)} · 눌러서 뒤집기</small>`}</div>
  <div class="grid2"><button class="btn line" onclick="flAns(0)">모르겠어요</button><button class="btn" onclick="flAns(1)">알아요</button></div>`;
}
function startFlash(si) {
  let list = [];
  if (si === 'my' || si === 'myu') { list = myWords().filter(w => si === 'my' || !S.myw[w].k).map(w => ['my', w]); if (!list.length) return toast('외울 단어가 없어요'); FC = { list: shuffle(list), i: 0, flip: false }; return render(); }
  FLASH.forEach((s, i) => s.cards.forEach((c, j) => { if (si === -1 ? !S.fl[i + '-' + j] : i === si) list.push([i, j]); }));
  if (!list.length) return toast('모르는 카드가 없어요');
  FC = { list: shuffle(list), i: 0, flip: false }; render();
}
function flAns(k) { const [si, ci] = FC.list[FC.i]; if (si === 'my') { if (S.myw[ci]) S.myw[ci].k = k ? 1 : 0; } else if (k) S.fl[si + '-' + ci] = 1; else delete S.fl[si + '-' + ci]; save(); if (FC.i + 1 < FC.list.length) { FC.i++; FC.flip = false; render(); } else { FC = null; toast('세트 끝'); render(); } }

// ───────── 설정 · 백업 ─────────
function settings() {
  return `<button class="icon-btn" onclick="go('home')">← 홈</button><h1>설정</h1>
  <div class="card"><b>시험일</b><input type="date" value="${S.set.exam}" onchange="S.set.exam=this.value;save()">
  <b style="display:block;margin-top:12px">하루 목표 문항 수</b><input type="number" min="5" max="300" value="${S.set.goal}" onchange="S.set.goal=Math.max(5,+this.value||40);save()"></div>
  <div class="card"><b>백업</b><div class="sub" style="margin:4px 0 10px">앱을 다시 설치하기 전에 백업 코드를 복사해 메모 앱 등에 붙여 두세요. 보통은 같은 앱 위에 덮어 설치하면 기록이 유지돼요.</div>
  <button class="btn ghost" onclick="exportData()">백업 코드 만들기</button>
  <textarea id="bk" rows="4" style="margin-top:10px" placeholder="백업 코드를 여기에 붙여넣고 복원"></textarea>
  <button class="btn line" style="margin-top:8px" onclick="importData()">붙여넣은 코드로 복원</button></div>
  <div class="card"><b>초기화</b><button class="btn line" style="margin-top:8px;color:var(--bad)" onclick="ask('모든 풀이 기록을 지울까요? 되돌릴 수 없어요.', '지우기', ()=>{S=blank();save();toast('초기화했어요');render()})">모든 기록 지우기</button></div>
  <div class="sub" style="text-align:center">문제 ${BANK.length}개 (P5 ${BANK.filter(q => q.p === 5).length} · P6 ${BANK.filter(q => q.p === 6).length} · P7 ${BANK.filter(q => q.p === 7).length}) · 지문 ${Object.keys(PSG).length}개 · 단어 ${FLASH.reduce((a, s) => a + s.cards.length, 0)}개</div>`;
}
function exportData() {
  const t = $('#bk'); t.value = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  if (NATIVE && NATIVE.share) { NATIVE.share.postMessage('TOEIC RC 노트 백업 ' + today() + '\n' + t.value); return; }
  if (window.AndroidBridge) { try { AndroidBridge.share('TOEIC RC 노트 백업 ' + today() + '\n' + t.value); return; } catch (e) {} }
  t.select();
  const fallback = () => { try { document.execCommand('copy'); toast('복사했어요'); } catch (e) { toast('코드를 길게 눌러 복사하세요'); } };
  try { navigator.clipboard.writeText(t.value).then(() => toast('복사했어요'), fallback); } catch (e) { fallback(); }
}
function importData() {
  try { const raw = $('#bk').value.trim().split('\n').pop().trim(); const d = JSON.parse(decodeURIComponent(escape(atob(raw)))); if (!d.att) throw 0; S = Object.assign(blank(), d); save(); toast('복원했어요'); go('home'); }
  catch (e) { toast('코드가 올바르지 않아요'); }
}

// ───────── 단어 누르면 뜻 ─────────
function lemmaOf(w) {
  w = w.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '').replace(/['’]s$/, '');
  if (!w) return null;
  if (DICT[w]) return w;
  if (DICT_FORM[w]) return DICT_FORM[w];
  const tries = [];
  if (/ies$/.test(w)) tries.push(w.slice(0, -3) + 'y');
  if (/es$/.test(w)) tries.push(w.slice(0, -2));
  if (/s$/.test(w)) tries.push(w.slice(0, -1));
  if (/ied$/.test(w)) tries.push(w.slice(0, -3) + 'y');
  if (/ed$/.test(w)) { tries.push(w.slice(0, -2), w.slice(0, -1)); if (/(.)\1ed$/.test(w)) tries.push(w.slice(0, -3)); }
  if (/ing$/.test(w)) { tries.push(w.slice(0, -3), w.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(w)) tries.push(w.slice(0, -4)); }
  if (/ier$/.test(w)) tries.push(w.slice(0, -3) + 'y');
  if (/iest$/.test(w)) tries.push(w.slice(0, -4) + 'y');
  if (/er$/.test(w)) tries.push(w.slice(0, -2), w.slice(0, -1));
  if (/est$/.test(w)) tries.push(w.slice(0, -3), w.slice(0, -2));
  if (/ily$/.test(w)) tries.push(w.slice(0, -3) + 'y');
  if (/ly$/.test(w)) tries.push(w.slice(0, -2));
  for (const t of tries) if (DICT[t]) return t;
  return w;
}
function wordAt(x, y) {
  let node, off;
  if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (!r) return null; node = r.startContainer; off = r.startOffset; }
  else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (!p) return null; node = p.offsetNode; off = p.offset; }
  if (!node || node.nodeType !== 3) return null;
  const t = node.textContent; let a = off, b = off;
  const isW = c => /[A-Za-z'’-]/.test(c);
  if (!isW(t[a] || '') && isW(t[a - 1] || '')) { a--; b--; }
  while (a > 0 && isW(t[a - 1])) a--;
  while (b < t.length && isW(t[b])) b++;
  const raw = t.slice(a, b), word = raw.replace(/^[-'’]+|[-'’]+$/g, '');
  if (!/[A-Za-z]{2,}/.test(word)) return null;
  try { const rg = document.createRange(); const s0 = a + raw.indexOf(word); rg.setStart(node, s0); rg.setEnd(node, s0 + word.length); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); return { word, rect: rg.getBoundingClientRect() }; } catch (e) { return { word, rect: { left: x, right: x, top: y, bottom: y } }; }
}
function closePop() { const p = document.getElementById('wpop'); if (p) { p.remove(); try { getSelection().removeAllRanges(); } catch (e) {} } }
function showPop(word, rect) {
  closePop();
  const lm = lemmaOf(word), m = DICT[lm], has = S.myw && S.myw[lm];
  const el = document.createElement('div'); el.id = 'wpop'; el.className = 'wpop';
  el.innerHTML = `<div class="top"><b class="en">${esc(lm)}</b>${lm !== word.toLowerCase() ? `<span class="sub">${esc(word)}</span>` : ''}</div>
    <div class="wm">${m ? esc(m) : '<span class="sub">사전에 없는 단어예요. 뜻을 직접 적어 담을 수 있어요.</span>'}</div>
    ${m ? '' : `<input id="wpm" placeholder="뜻 입력 (선택)" style="margin-top:6px;padding:7px 9px;font-size:14px">`}
    <div class="row" style="margin-top:8px"><button class="btn ${has ? 'line' : ''}" style="padding:8px 10px;font-size:14px" data-w="${esc(lm)}" onclick="togWord(this.dataset.w)">${has ? '단어장에서 빼기' : '+ 내 단어장'}</button><button class="btn line" style="padding:8px 10px;font-size:14px;width:70px" onclick="closePop()">닫기</button></div>`;
  document.body.appendChild(el);
  const W = el.offsetWidth, H = el.offsetHeight, vw = innerWidth, vh = innerHeight;
  const left = Math.min(Math.max(8, rect.left + (rect.right - rect.left) / 2 - W / 2), vw - W - 8);
  let top = rect.bottom + 8; if (top + H > vh - 8) top = Math.max(8, rect.top - H - 8);
  el.style.left = left + 'px'; el.style.top = top + 'px';
}
function togWord(lm) {
  S.myw = S.myw || {};
  if (S.myw[lm]) { delete S.myw[lm]; toast('단어장에서 뺐어요'); }
  else { const inp = document.getElementById('wpm'); S.myw[lm] = { m: DICT[lm] || (inp && inp.value.trim()) || '', t: today() + ' ' + Date.now(), k: 0 }; toast('내 단어장에 담았어요'); }
  save(); closePop(); if (view === 'flash') render();
}
function addTyped() {
  const v = (document.getElementById('nw') || {}).value || ''; const w = v.trim(); if (!w) return;
  const lm = /\s/.test(w) ? w.toLowerCase() : lemmaOf(w); S.myw = S.myw || {};
  if (S.myw[lm]) return toast('이미 있는 단어예요');
  let m = DICT[lm] || '';
  if (!m) m = prompt(`'${lm}' 뜻을 입력하세요 (사전에 없는 단어)`) || '';
  S.myw[lm] = { m, t: today() + ' ' + Date.now(), k: 0 }; save(); render(); toast(m ? `${lm}: ${m}` : '담았어요');
}
function delWord(w) { if (S.myw[w]) { delete S.myw[w]; save(); render(); } }
document.addEventListener('click', e => {
  const pop = document.getElementById('wpop');
  if (pop && pop.contains(e.target)) return;
  if (INK.on) return;
  const zone = e.target.closest && e.target.closest('.psg .doc, .q.en, .tapw, .x-en');
  if (!zone || e.target.closest('.ptr')) { closePop(); return; }
  const hit = wordAt(e.clientX, e.clientY);
  if (!hit) { closePop(); return; }
  showPop(hit.word, hit.rect);
});
window.addEventListener('scroll', () => closePop(), { passive: true });
document.addEventListener('scroll', () => closePop(), { passive: true, capture: true });

render();

// ───────── 안드로이드 뒤로가기 ─────────
window.androidBack = function () {
  if ($('#sheet')) return closeSheet();
  if (document.getElementById('wpop')) return closePop();
  if (view === 'mockrun') return ask(mkName() + '를 그만둘까요? 이번 풀이는 저장되지 않아요.', '그만두기', () => { MK_S = null; go('home'); });
  if (view === 'flash' && FC) { FC = null; return render(); }
  const up = { quiz: 'practice', result: 'practice', concept: 'concepts' }[view];
  if (up) return go(up);
  if (view !== 'home') return go('home');
  if (window.AndroidBridge) AndroidBridge.exit();
};
