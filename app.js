const state = { data: null, holidays: null, viewDate: null, now: new Date() };
const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const $ = (selector) => document.querySelector(selector);
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = (value) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
const dateAt = (date, time) => { const [h, m] = time.split(':').map(Number); const copy = new Date(date); copy.setHours(h, m, 0, 0); return copy; };
const dateDiff = (a, b) => Math.round((a - b) / 86400000);
const formatDate = (date, options = { month: 'numeric', day: 'numeric' }) => new Intl.DateTimeFormat('zh-CN', options).format(date);
const mondayOf = (date) => { const d = new Date(date); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d; };
const clampDate = (date, min, max) => new Date(Math.min(Math.max(date.getTime(), min.getTime()), max.getTime()));

function weekNumber(date) {
  const start = parseDate(state.data.meta.termStart);
  return Math.floor(dateDiff(new Date(date.getFullYear(), date.getMonth(), date.getDate()), start) / 7) + 1;
}

function holidayFor(date) {
  const key = dateKey(date);
  return state.holidays.official.find((item) => item.date === key) || null;
}

function closureFor(date) {
  const key = dateKey(date);
  return state.holidays.schoolClosures.find((item) => key >= item.start && key <= item.end) || null;
}

function isTeachingDate(date) {
  const meta = state.data.meta;
  const key = dateKey(date);
  if (key < meta.displayStart || key > meta.displayEnd) return false;
  if (key > meta.firstTermEnd && key < meta.secondTermStart) return false;
  if (closureFor(date) || holidayFor(date)) return false;
  return true;
}

function courseForWeek(course, week) {
  const ranges = course.weekRanges || [course.weeks];
  const match = ranges.find((range) => {
    if (!range || week < range.start || week > range.end) return false;
    return !range.parity || (range.parity === 'odd' ? week % 2 === 1 : week % 2 === 0);
  });
  return match ? { ...course, teacher: match.teacher || course.teacher } : null;
}

function coursesOn(date) {
  if (!isTeachingDate(date)) return [];
  const weekday = ((date.getDay() + 6) % 7) + 1;
  const week = weekNumber(date);
  return state.data.courses.filter((course) => course.weekday === weekday).map((course) => courseForWeek(course, week)).filter(Boolean)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function occurrence(course, date) {
  return { ...course, date, start: dateAt(date, course.startTime), end: dateAt(date, course.endTime) };
}

function findNext(now) {
  const start = clampDate(now, parseDate(state.data.meta.displayStart), parseDate(state.data.meta.displayEnd));
  for (let i = 0; i <= 370; i += 1) {
    const date = new Date(start); date.setDate(date.getDate() + i);
    for (const course of coursesOn(date)) {
      const item = occurrence(course, date);
      if (item.start >= now) return item;
    }
  }
  return null;
}

function findCurrent(now) {
  const date = new Date(now); date.setHours(0, 0, 0, 0);
  return coursesOn(date).map((course) => occurrence(course, date)).find((item) => item.start <= now && now < item.end) || null;
}

function remainingText(ms) {
  if (ms <= 0) return '现在';
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${mins}分`;
  return `${mins}分钟`;
}

function renderNext() {
  const panel = $('#nextPanel');
  const now = state.now;
  const current = findCurrent(now);
  const next = findNext(now);
  if (!next && !current) { panel.innerHTML = '<div class="panel-kicker">NEXT UP</div><div class="next-content"><div class="next-main"><div class="next-course">本学期课程已结束</div><div class="next-meta">下学期课程尚未录入，等课表确定后可直接更新数据。</div></div></div>'; return; }
  const item = current || next;
  const target = current ? current.end : current ? current.end : next.start;
  const status = current ? '<span class="current-badge">正在上课</span>' : '';
  const label = current ? `距离下课 ${remainingText(target - now)}` : `距离上课 ${remainingText(target - now)}`;
  panel.innerHTML = `<div class="panel-kicker">${current ? 'IN CLASS' : 'NEXT UP'}</div><div class="next-content"><div class="next-main">${status}<div class="next-course">${item.name}</div><div class="next-meta">${formatDate(item.date, { month: 'numeric', day: 'numeric', weekday: 'short' })} · ${item.startTime}–${item.endTime} · ${item.location}<br>${item.teacher} 老师</div></div><div class="countdown"><strong>${remainingText(target - now)}</strong><span>${label}</span></div></div>`;
}

function renderWeek() {
  const monday = mondayOf(state.viewDate);
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
  $('#weekLabel').textContent = `第 ${weekNumber(monday)} 周`;
  $('#rangeLabel').textContent = `${formatDate(monday)} — ${formatDate(sunday)}`;
  $('#calendar').innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(date.getDate() + index);
    const events = coursesOn(date);
    const holiday = holidayFor(date);
    const closure = closureFor(date);
    const isToday = dateKey(date) === dateKey(state.now);
    const note = holiday ? holiday.name : closure ? closure.name : (date < parseDate(state.data.meta.displayStart) || date > parseDate(state.data.meta.displayEnd) ? '非展示范围' : '');
    const cards = events.length ? events.map((event) => `<div class="event" style="--event-color:${event.color}"><div class="event-name">${event.name}</div><div class="event-time">${event.startTime} — ${event.endTime} · ${event.periods.join('–')}节</div><div class="event-location">⌖ ${event.location}</div><div class="event-teacher">⌁ ${event.teacher} 老师</div></div>`).join('') : '<div class="empty-day">暂无课程</div>';
    const closed = (holiday || closure) ? `<div class="closed-day">${holiday ? '法定节假日' : '学校假期'}<br>${note}</div>` : '';
    return `<article class="day-column ${isToday ? 'today' : ''}"><div class="day-head"><div class="day-name">${dayNames[index]}</div><div class="day-number">${date.getDate()}</div><div class="day-note">${note}</div></div><div class="events">${closed}${cards}</div></article>`;
  }).join('');
}

function renderInfo() {
  const m = state.data.meta;
  $('#termTimeline').innerHTML = `<div class="timeline-row"><span>第一学期</span><span>${m.termStart} — ${m.firstTermEnd}</span></div><div class="timeline-row"><span>寒假</span><span>${m.winterBreak.start} — ${m.winterBreak.end}</span></div><div class="timeline-row"><span>第二学期开学</span><span>${m.secondTermStart}（课程待定）</span></div><div class="timeline-row"><span>本页展示至</span><span>${m.displayEnd}</span></div>`;
  const rows = [...state.holidays.official, ...state.holidays.makeup].filter((item) => item.date >= m.displayStart && item.date <= m.displayEnd).sort((a, b) => a.date.localeCompare(b.date));
  $('#holidayList').innerHTML = rows.map((item) => `<div class="holiday-row"><span>${item.name}<small>${item.type === 'makeup' ? '调休工作日' : (item.confirmed === false ? '节日日期 · 调休待公布' : '法定节假日')}</small></span><span>${item.date}</span></div>`).join('') + `<div class="holiday-row"><span>说明<small>${state.holidays.note}</small></span><span>—</span></div>`;
}

function refresh() { state.now = new Date(); renderNext(); renderWeek(); $('#statusText').textContent = `上次刷新 ${state.now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`; }

async function init() {
  const [data, holidays] = await Promise.all([fetch('data/schedule.json').then((r) => r.json()), fetch('data/holidays.json').then((r) => r.json())]);
  state.data = data; state.holidays = holidays; state.now = new Date();
  $('#termLabel').textContent = `${data.meta.school} · ${data.meta.className} · ${data.meta.term}`;
  const min = parseDate(data.meta.displayStart); const max = parseDate(data.meta.displayEnd);
  state.viewDate = clampDate(new Date(), min, max);
  renderInfo(); refresh();
  $('#prevWeek').addEventListener('click', () => { state.viewDate.setDate(state.viewDate.getDate() - 7); state.viewDate = clampDate(state.viewDate, min, max); renderWeek(); });
  $('#nextWeek').addEventListener('click', () => { state.viewDate.setDate(state.viewDate.getDate() + 7); state.viewDate = clampDate(state.viewDate, min, max); renderWeek(); });
  $('#todayButton').addEventListener('click', () => { state.viewDate = clampDate(new Date(), min, max); renderWeek(); });
  $('#themeToggle').addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('schedule-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); });
  if (localStorage.getItem('schedule-theme') === 'dark') document.body.classList.add('dark');
  setInterval(refresh, 30000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
}

init().catch((error) => { console.error(error); $('#nextPanel').innerHTML = '<div class="panel-kicker">LOAD ERROR</div><div class="next-content"><div class="next-course">课表加载失败</div><div class="next-meta">请检查网络或确认网站已通过 HTTP/HTTPS 打开。</div></div>'; });
