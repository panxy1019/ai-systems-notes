import { bandwidthBudget, pipelineSchedule } from './calculations.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* Reading still works without storage. */ } }
};

// Appearance and the mobile chapter drawer.
const themeButton = $('#theme-toggle');
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', dark ? '切换浅色模式' : '切换深色模式');
}
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  storage.set('panxy-theme', theme);
  syncThemeButton();
});
syncThemeButton();

const menuButton = $('#menu-toggle');
const backdrop = $('#drawer-backdrop');
const mobileQuery = matchMedia('(max-width: 760px)');
const sidebar = $('#sidebar');
function setDrawer(open, restoreFocus = false) {
  document.body.classList.toggle('nav-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '关闭章节导航' : '打开章节导航');
  backdrop.hidden = !open;
  sidebar.inert = mobileQuery.matches && !open;
  if (open) sidebar.querySelector('a').focus();
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => setDrawer(!document.body.classList.contains('nav-open')));
backdrop.addEventListener('click', () => setDrawer(false, true));
sidebar.addEventListener('click', event => {
  if (event.target.closest('a')) setDrawer(false);
});
mobileQuery.addEventListener('change', () => setDrawer(false));
setDrawer(false);

// Search indexes the authored chapter only. Results are rendered as text.
const sections = $$('.section-block[data-title]');
const searchDialog = $('#search-dialog');
const searchInput = $('#search-input');
const searchResults = $('#search-results');
const searchIndex = sections.map(section => ({
  section, title: section.dataset.title,
  body: [...section.querySelectorAll('h2, h3, p, li, td, dd, code')]
    .map(node => node.textContent.replace(/\s+/g, ' ').trim()).join(' ')
}));
const normalize = value => value.toLocaleLowerCase('zh-CN').trim();
function renderSearch() {
  searchResults.replaceChildren();
  const query = normalize(searchInput.value);
  const results = query ? searchIndex.filter(item => normalize(item.title + ' ' + item.body).includes(query)) : searchIndex.slice(0, 5);
  const status = document.createElement('p');
  status.className = 'search-status';
  status.textContent = query ? (results.length ? `找到 ${results.length} 个相关单元` : '没有找到相关内容，试试 GDS、带宽、worker 或预取。') : '从这些单元开始，或输入关键词';
  searchResults.append(status);
  results.slice(0, 10).forEach(item => {
    const anchor = document.createElement('a');
    anchor.className = 'search-result';
    anchor.href = '#' + item.section.id;
    const heading = document.createElement('strong');
    heading.textContent = item.title;
    const excerpt = document.createElement('span');
    const position = query ? normalize(item.body).indexOf(query) : 0;
    const start = Math.max(0, position - 34);
    excerpt.textContent = (start ? '…' : '') + item.body.slice(start, start + 115) + '…';
    anchor.append(heading, excerpt);
    anchor.addEventListener('click', event => {
      event.preventDefault();
      if (query) {
        const match = [...item.section.querySelectorAll('p, code, li')].find(node => normalize(node.textContent).includes(query));
        const disclosure = match?.closest('details');
        if (disclosure) disclosure.open = true;
      }
      searchDialog.close();
      setDrawer(false);
      location.hash = item.section.id;
      requestAnimationFrame(() => {
        item.section.scrollIntoView({block: 'start'});
        item.section.tabIndex = -1;
        item.section.focus({preventScroll: true});
      });
    });
    searchResults.append(anchor);
  });
}
function openSearch() {
  setDrawer(false);
  renderSearch();
  searchDialog.showModal();
  searchInput.focus();
}
$('#search-open').addEventListener('click', openSearch);
$('#search-close').addEventListener('click', () => searchDialog.close());
searchInput.addEventListener('input', renderSearch);
searchInput.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    searchResults.querySelector('a')?.focus();
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    searchResults.querySelector('a')?.click();
  }
});
searchDialog.addEventListener('click', event => { if (event.target === searchDialog) searchDialog.close(); });
document.addEventListener('keydown', event => {
  const typing = event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (!searchDialog.open) openSearch();
  } else if (event.key === '/' && !typing && !searchDialog.open) {
    event.preventDefault(); openSearch();
  } else if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
    setDrawer(false, true);
  } else if (event.key === 'Tab' && mobileQuery.matches && document.body.classList.contains('nav-open')) {
    const focusables = [menuButton, ...sidebar.querySelectorAll('a, button')];
    const current = focusables.indexOf(document.activeElement);
    const next = (current + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
    event.preventDefault();
    focusables[next].focus();
  }
});

// Bandwidth uses decimal MB/GB throughout.
const budgetInputs = ['#gpu-count', '#gpu-rate', '#headroom'].map($);
function updateBudget() {
  const valid = budgetInputs.every(input => input.checkValidity());
  if (!valid) {
    $('#raw-bandwidth').value = '—'; $('#target-bandwidth').value = '—';
    $('#budget-note').textContent = '请在输入框标明的范围内填写正数，GPU 数量需要是整数。';
    return;
  }
  const result = bandwidthBudget(...budgetInputs.map(input => Number(input.value)));
  const format = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $('#raw-bandwidth').value = format(result.raw);
  $('#target-bandwidth').value = format(result.target);
  $('#budget-note').textContent = '十进制单位：1 GB = 1,000 MB。这里算存储读取；解码后的 H2D 流量需要另算。';
}
budgetInputs.forEach(input => input.addEventListener('input', updateBudget));
updateBudget();

// In the GDS diagram, the host buffer disappears from the data plane;
// the separately labelled CPU control plane remains visible.
const pathLinks = $$('#path-diagram .path-link');
$$('[data-path]').forEach(button => button.addEventListener('click', () => {
  const gds = button.dataset.path === 'gds';
  $$('[data-path]').forEach(other => {
    const selected = other === button;
    other.classList.toggle('selected', selected);
    other.setAttribute('aria-pressed', String(selected));
  });
  $('#path-diagram').dataset.mode = gds ? 'gds' : 'standard';
  $('#host-node').hidden = gds;
  pathLinks[0].hidden = gds;
  $('#path-transfer').textContent = gds ? '直达 DMA' : 'H2D';
  $('#path-explanation').textContent = gds
    ? '在受支持的直接路径中，存储 / 网卡把数据送入 GPU 显存，减少主机弹跳缓冲区；实际路径须用工具核验。'
    : '数据经过主机内存再进入显存，CPU 侧的内存带宽和搬运开销可能限制吞吐。';
}));

// Finite-batch flow-shop simulation. Both modes keep the same time scale.
const stageNames = ['读取', '预处理', 'H2D', '计算'];
const stageIds = ['read', 'decode', 'transfer', 'compute'];
const stageColors = ['#4084d8', '#9b75ca', '#d29b3b', '#087f68'];
let overlap = true;
function svgElement(name, attributes = {}, value) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key, attribute]) => node.setAttribute(key, String(attribute)));
  if (value !== undefined) node.textContent = value;
  return node;
}
function updateTimeline() {
  const durations = stageIds.map(id => Number($('#time-' + id).value));
  stageIds.forEach((id, index) => { $('#' + id + '-value').value = durations[index]; });
  const result = pipelineSchedule(durations, 5, overlap);
  const ideal = pipelineSchedule(durations, 5, true);
  const svg = $('#timeline');
  svg.replaceChildren();
  svg.append(svgElement('title', {id: 'timeline-title'}, `五批数据的${overlap ? '流水线' : '串行'}时间轴`));
  svg.append(svgElement('desc', {id: 'timeline-description'}, `读取 ${durations[0]}、预处理 ${durations[1]}、H2D ${durations[2]}、计算 ${durations[3]} 毫秒。总时长 ${result.total} 毫秒。`));
  const scale = 620 / result.serialTotal;
  const left = 74;
  for (let tick = 0; tick <= 5; tick++) {
    const time = result.serialTotal * tick / 5;
    const x = left + time * scale;
    svg.append(svgElement('line', {x1: x, x2: x, y1: 20, y2: 163, stroke: 'currentColor', opacity: '.09'}));
    svg.append(svgElement('text', {x, y: 185, 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 10, opacity: '.7'}, `${Math.round(time)} ms`));
  }
  stageNames.forEach((name, index) => {
    svg.append(svgElement('text', {x: 2, y: 43 + index * 34, fill: 'currentColor', 'font-size': 11}, name));
  });
  result.jobs.forEach(job => {
    const width = (job.end - job.start) * scale;
    const x = left + job.start * scale;
    const y = 27 + job.stage * 34;
    const rect = svgElement('rect', {x, y, width: Math.max(1, width - 1.5), height: 23, rx: 4, fill: stageColors[job.stage]});
    rect.append(svgElement('title', {}, `第 ${job.batch} 批 · ${stageNames[job.stage]}：${job.start}–${job.end} ms`));
    svg.append(rect);
    if (width >= 17) svg.append(svgElement('text', {x: x + width / 2, y: y + 16, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 10, 'font-weight': 600}, job.batch));
  });
  const endX = left + result.total * scale;
  svg.append(svgElement('line', {x1: endX, x2: endX, y1: 18, y2: 166, stroke: '#087f68', 'stroke-dasharray': '3 3'}));
  $('#serial-time').textContent = result.serialPerBatch + ' ms';
  $('#steady-time').textContent = result.steady + ' ms';
  $('#total-time').textContent = result.total + ' ms';
  const bottleneck = result.bottlenecks.map(index => stageNames[index]).join('、');
  $('#bottleneck-note').textContent = `当前最长阶段：${bottleneck}。理想重叠下，5 批由 ${result.serialTotal} ms 缩短至 ${ideal.total} ms，约 ${(result.serialTotal / ideal.total).toFixed(2)} 倍；稳态批次间隔为 ${result.steady} ms。`;
}
stageIds.forEach(id => $('#time-' + id).addEventListener('input', updateTimeline));
$$('[data-schedule]').forEach(button => button.addEventListener('click', () => {
  overlap = button.dataset.schedule === 'overlap';
  $$('[data-schedule]').forEach(other => {
    other.classList.toggle('selected', other === button);
    other.setAttribute('aria-pressed', String(other === button));
  });
  updateTimeline();
}));
updateTimeline();

// Copy exact code text. A failure is reported rather than claiming success.
let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3000);
}
$$('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).textContent);
    toast('代码已复制');
  } catch { toast('浏览器未允许复制，请选中代码手动复制。'); }
}));

// The practice checklist persists locally; quiz attempts are deliberately fresh.
const checks = $$('[data-check]');
function updateChecklist() {
  $('#checklist-status').textContent = `${checks.filter(input => input.checked).length} / ${checks.length} 个实验已完成 · 仅保存在此浏览器`;
}
checks.forEach(input => {
  input.checked = storage.get('panxy-check-' + input.dataset.check) === 'true';
  input.addEventListener('change', () => {
    storage.set('panxy-check-' + input.dataset.check, String(input.checked));
    updateChecklist();
  });
});
updateChecklist();

const quiz = $('#quiz-form');
quiz.addEventListener('submit', event => {
  event.preventDefault();
  const questions = $$('.quiz-question');
  let score = 0, answered = 0;
  questions.forEach(question => {
    const selected = question.querySelector('input:checked');
    const correct = selected?.value === question.dataset.answer;
    question.classList.remove('correct', 'incorrect', 'unanswered');
    question.classList.add(!selected ? 'unanswered' : correct ? 'correct' : 'incorrect');
    if (correct) score++;
    if (selected) answered++;
    const feedback = question.querySelector('.quiz-feedback');
    if (!feedback.dataset.explanation) feedback.dataset.explanation = feedback.textContent;
    feedback.textContent = (!selected ? '尚未选择。' : correct ? '回答正确。' : '再想一想。') + feedback.dataset.explanation;
    feedback.hidden = false;
  });
  $('#quiz-score').value = `答对 ${score} / ${questions.length} 题` + (answered < questions.length ? `（${questions.length - answered} 题未答）` : score === questions.length ? '，全部掌握！' : '，查看每题解析。');
});
quiz.addEventListener('reset', () => {
  $$('.quiz-question').forEach(question => {
    question.classList.remove('correct', 'incorrect', 'unanswered');
    question.querySelector('.quiz-feedback').hidden = true;
  });
  $('#quiz-score').value = '';
});

// Active section and reading position, updated once per animation frame.
const navLinks = $$('.chapter-nav a[href^="#"], .toc nav a[href^="#"]');
const tabLinks = $$('.article-tabs a');
let activeId;
let scrollPending = false;
function updateReadingPosition() {
  scrollPending = false;
  let current = sections[0];
  const threshold = Math.min(220, innerHeight * .3);
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= threshold) current = section;
  }
  if (current.id !== activeId) {
    activeId = current.id;
    navLinks.forEach(link => {
      const active = link.hash === '#' + activeId;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    const tab = ['overview'].includes(activeId) ? '#overview' : ['takeaways', 'quiz'].includes(activeId) ? '#takeaways' : ['faq', 'references'].includes(activeId) ? '#faq' : '#storage';
    tabLinks.forEach(link => link.classList.toggle('selected', link.hash === tab));
  }
  const max = document.documentElement.scrollHeight - innerHeight;
  $('#reading-progress').style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`;
}
function requestReadingUpdate() {
  if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateReadingPosition); }
}
addEventListener('scroll', requestReadingUpdate, {passive: true});
addEventListener('resize', requestReadingUpdate);
document.addEventListener('toggle', requestReadingUpdate, true);
updateReadingPosition();
