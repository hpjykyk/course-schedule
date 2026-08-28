// 我的课表 · Scriptable 小组件
// 1. 把 DATA_URL 改成部署后的课表网址（结尾不要加 /）
// 2. 在 Scriptable 中运行一次，允许网络访问
// 3. 添加 Scriptable 小组件并选择本脚本

const DATA_URL = 'https://hpjykyk.github.io/course-schedule/data/schedule.json';
const HOLIDAY_URL = 'https://hpjykyk.github.io/course-schedule/data/holidays.json';

const pad = (n) => String(n).padStart(2, '0');
const parseDay = (value) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
const key = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const at = (date, time) => { const [h, m] = time.split(':').map(Number); const d = new Date(date); d.setHours(h, m, 0, 0); return d; };
const diffDays = (a, b) => Math.round((a - b) / 86400000);
const weekNumber = (date, start) => Math.floor(diffDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), start) / 7) + 1;

async function load(url) { return await new Request(url).loadJSON(); }

function availableCourse(course, week) {
  const ranges = course.weekRanges || [course.weeks];
  const found = ranges.find((range) => range && week >= range.start && week <= range.end && (!range.parity || (range.parity === 'odd' ? week % 2 === 1 : week % 2 === 0)));
  return found ? { ...course, teacher: found.teacher || course.teacher } : null;
}

function getHoliday(date, holidays) { return holidays.official.find((item) => item.date === key(date)); }
function getClosure(date, holidays) { const k = key(date); return holidays.schoolClosures.find((item) => k >= item.start && k <= item.end); }

function findNext(data, holidays, now) {
  const meta = data.meta;
  const start = parseDay(meta.termStart);
  for (let offset = Math.max(0, diffDays(now, start)); offset <= 370; offset += 1) {
    const date = new Date(start); date.setDate(date.getDate() + offset);
    const k = key(date);
    if (k > meta.displayEnd || (k > meta.firstTermEnd && k < meta.secondTermStart) || getHoliday(date, holidays) || getClosure(date, holidays)) continue;
    const week = weekNumber(date, start);
    const weekday = ((date.getDay() + 6) % 7) + 1;
    const courses = data.courses.filter((course) => course.weekday === weekday).map((course) => availableCourse(course, week)).filter(Boolean).sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (const course of courses) {
      const result = { ...course, date, start: at(date, course.startTime), end: at(date, course.endTime) };
      if (result.start >= now) return result;
    }
  }
  return null;
}

function addText(stack, text, color, font) {
  const item = stack.addText(text); item.textColor = color; item.font = font; return item;
}

const widget = new ListWidget();
widget.backgroundColor = new Color('#122c4d');
widget.setPadding(14, 15, 13, 15);
try {
  const [data, holidays] = await Promise.all([load(DATA_URL), load(HOLIDAY_URL)]);
  const now = new Date();
  const next = findNext(data, holidays, now);
  const white = Color.white();
  const pale = new Color('#bfd6e7');
  addText(widget, 'NEXT CLASS', new Color('#f5ae8f'), Font.mediumMonospacedSystemFont(10));
  widget.addSpacer(7);
  if (!next) {
    addText(widget, '本学期课程已结束', white, Font.boldSystemFont(16));
    widget.addSpacer(4);
    addText(widget, '下学期课程待录入', pale, Font.systemFont(12));
  } else {
    addText(widget, next.name, white, Font.boldSystemFont(18));
    widget.addSpacer(4);
    addText(widget, `${next.startTime} · ${next.location}`, pale, Font.systemFont(11));
    addText(widget, `${next.teacher} 老师`, pale, Font.systemFont(11));
    widget.addSpacer(7);
    const timer = widget.addDate(next.start); timer.textColor = new Color('#ffd0be'); timer.font = Font.boldMonospacedSystemFont(20); timer.applyTimerStyle();
    widget.addSpacer(2);
    addText(widget, `${next.startTime} 开始 · ${next.periods.join('–')}节`, pale, Font.systemFont(10));
  }
  widget.url = DATA_URL.replace(/\/data\/schedule\.json$/, '/');
  widget.refreshAfterDate = new Date(now.getTime() + 5 * 60 * 1000);
} catch (error) {
  addText(widget, '课表暂时无法读取', Color.white(), Font.boldSystemFont(15));
  widget.addSpacer(5);
  addText(widget, '请检查 DATA_URL 和网络', new Color('#bfd6e7'), Font.systemFont(11));
}
Script.setWidget(widget);
Script.complete();
