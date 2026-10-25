// Availability sheet generator.
// Setup: in your Google Sheet, Extensions > Apps Script, paste this file, save, then reload the sheet.
// Use: Availability menu > New availability sheet… (creates a new tab each time).
// Each tab has a Members list near the top. Editing it rebuilds every week to match;
// x marks stay with the right person because they are matched by name.

const SPARE_ROWS = 3;   // empty rows kept at the end of the Members list for new names
const MIN_ROWS = 6;     // Members list rows when no names are given
const GAP_ROWS = 2;     // blank rows between sections
const MAX_WEEKS = 26;   // guards against a typo'd year building thousands of columns
const STATE_KEY = 'availability';
const HEAD = '#34495e', SUB = '#eef2f7', BAND = '#f7f9fb', LINE = '#d6dde6';
const INK = '#1f2933', MUTED = '#5f6b7a', NOTE = '#fff8e6', NOTE_DARK = '#c7891f';
const FREE = '#c6efce', FREE_INK = '#1e6b34', HEAT_MAX = '#57bb8a';
const STEPS = [
  'Find your name in the Members list. Not there? Type it into an empty row of the list; every week adds a row for you.',
  'Type x in every hour you are free, in your row of each week. Leave it blank if you are busy.',
  'Your x cells turn green, so you can check your entries at a glance.',
  'Expected attendance under each week counts who is free at that time. The greener the cell, the more people are free.',
  'Someone left? Delete their name from the Members list; their row disappears from every week. Renaming counts as a new person.',
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Availability')
    .addItem('New availability sheet…', 'showDialog')
    .addItem('Update weeks from Members list', 'syncActiveSheet')
    .addToUi();
}

function showDialog() {
  const html = HtmlService.createHtmlOutput(DIALOG_HTML).setWidth(380).setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(html, 'New availability sheet');
}

function createSheet(o) {
  const start = parseDate(o.start), end = parseDate(o.end);
  if (end < start) throw new Error('End date is before the start date.');
  if (+o.toHour < +o.fromHour) throw new Error('"To" hour must be after "From" hour.');
  const cfg = { start: o.start, end: o.end, weekdays: o.weekdays.map(Number), fromHour: +o.fromHour, toHour: +o.toHour };
  const weeks = weekBlocks(start, end, cfg.weekdays);
  if (!weeks.length) throw new Error('No days in that range match the chosen weekdays.');
  if (weeks.length > MAX_WEEKS) throw new Error('Range is over ' + MAX_WEEKS + ' weeks; check the dates.');

  const ss = SpreadsheetApp.getActive();
  const sh = ss.insertSheet(uniqueName(ss, fmt(start, "MMM d ''yy") + ' – ' + fmt(end, "MMM d ''yy"))); // '' is a literal apostrophe: Oct 12 '26
  buildTab(sh, cfg, cleanNames(o.members.split('\n')), {});
  ss.setActiveSheet(sh);
  return sh.getName();
}

// Simple trigger: any edit inside a tab's Members list rebuilds that tab's weeks.
function onEdit(e) {
  const sh = e.range.getSheet();
  const st = getState(sh);
  if (!st) return;
  const L = layout(st.listRows, st.weekRows, 0);
  const first = L.listTop, last = L.listTop + st.listRows - 1;
  if (e.range.getColumn() <= 2 && e.range.getLastColumn() >= 2 && e.range.getRow() <= last && e.range.getLastRow() >= first) sync(sh);
}

function syncActiveSheet() {
  const sh = SpreadsheetApp.getActiveSheet();
  if (!getState(sh)) throw new Error('This tab was not made by "New availability sheet".');
  sync(sh);
}

function sync(sh) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) return; // another rebuild is running; it will read the latest list
  try {
    const st = getState(sh);
    const L = layout(st.listRows, st.weekRows, 0);
    const names = cleanNames(sh.getRange(L.listTop, 2, st.listRows, 1).getValues().map(r => String(r[0])));
    buildTab(sh, st, names, readMarks(sh, st));
  } finally {
    lock.releaseLock();
  }
}

// x marks keyed by lower-cased name, then week index: { aly: { 0: [row values…] } }.
function readMarks(sh, st) {
  const weeks = weekBlocks(parseDate(st.start), parseDate(st.end), st.weekdays);
  const nSlots = st.toHour - st.fromHour + 1;
  const L = layout(st.listRows, st.weekRows, weeks.length);
  const marks = {};
  weeks.forEach((days, w) => {
    const rows = sh.getRange(L.weekTops[w] + 2, 2, st.weekRows, 1 + days.length * nSlots).getValues();
    rows.forEach(r => {
      const key = String(r[0]).trim().toLowerCase();
      if (key) (marks[key] = marks[key] || {})[w] = r.slice(1);
    });
  });
  return marks;
}

function buildTab(sh, cfg, names, marks) {
  const weeks = weekBlocks(parseDate(cfg.start), parseDate(cfg.end), cfg.weekdays);
  const hours = [];
  for (let h = cfg.fromHour; h <= cfg.toHour; h++) hours.push(h);
  const nSlots = hours.length;
  const listRows = Math.max(names.length + SPARE_ROWS, MIN_ROWS);
  const weekRows = Math.max(names.length, 1);
  const L = layout(listRows, weekRows, weeks.length);
  const lastCol = 2 + Math.max(...weeks.map(w => w.length)) * nSlots;

  // Start from a blank tab: the layout shifts whenever the Members list changes length.
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
  sh.clear();
  sh.clearConditionalFormatRules();
  if (sh.getMaxColumns() < lastCol) sh.insertColumnsAfter(sh.getMaxColumns(), lastCol - sh.getMaxColumns());
  if (sh.getMaxRows() < L.lastRow) sh.insertRowsAfter(sh.getMaxRows(), L.lastRow - sh.getMaxRows());
  sh.getRange(1, 1, L.lastRow, lastCol).setFontFamily('Arial').setFontColor(INK).setVerticalAlignment('middle');

  // Instructions: label box on the left, one step per row on the right.
  const noteWidth = Math.max(weeks[0].length * nSlots, 13);
  sh.getRange(1, 1, STEPS.length, 2).merge().setValue('How to fill this in')
    .setBackground(NOTE_DARK).setFontColor('#ffffff').setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setWrap(true);
  STEPS.forEach((s, i) => sh.getRange(1 + i, 3, 1, noteWidth).merge().setValue((i + 1) + '.  ' + s));
  sh.getRange(1, 3, STEPS.length, noteWidth).setBackground(NOTE).setFontSize(11);
  sh.setRowHeights(1, STEPS.length, 24);

  // Members list: the one place names are edited.
  sh.getRange(L.listTop - 1, 1, 1, 2).merge().setValue('Members')
    .setBackground(HEAD).setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
  sh.getRange(L.listTop - 1, 3, 1, noteWidth).merge().setValue('Add, remove or rename names here. Every week below updates by itself.')
    .setFontColor(MUTED).setFontSize(10);
  const list = [];
  for (let i = 0; i < listRows; i++) list.push([i + 1, names[i] || '']);
  sh.getRange(L.listTop, 1, listRows, 2).setValues(list).setFontSize(12)
    .setBorder(true, true, true, true, true, true, LINE, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(L.listTop, 1, listRows, 1).setFontColor(MUTED).setHorizontalAlignment('right');
  sh.getRange(L.listTop, 2, listRows, 1).setBackground('#ffffff');
  sh.setRowHeights(L.listTop, listRows, 26);

  const hourLabels = hours.map(h => (h % 12 || 12) + (h < 12 ? 'am' : 'pm'));
  const freeRules = [], totals = [];
  weeks.forEach((days, w) => {
    const top = L.weekTops[w], firstPerson = top + 2, width = days.length * nSlots;

    sh.getRange(top, 1, 2, 2).merge().setValue('Week of ' + fmt(days[0], 'MMM d'))
      .setBackground(HEAD).setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
    days.forEach((d, i) => sh.getRange(top, 3 + i * nSlots, 1, nSlots).merge().setValue(fmt(d, 'EEEE, MMMM d, yyyy')));
    sh.getRange(top, 3, 1, width).setBackground(HEAD).setFontColor('#ffffff').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
    sh.getRange(top + 1, 3, 1, width)
      .setNumberFormat('@') // plain text, otherwise Sheets turns "10pm" into 10:00 PM
      .setValues([days.flatMap(() => hourLabels)])
      .setBackground(SUB).setFontColor(MUTED).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center');
    sh.setRowHeight(top, 32);

    const rows = [];
    for (let i = 0; i < weekRows; i++) {
      const name = names[i] || '';
      const kept = (marks[name.toLowerCase()] || {})[w] || [];
      rows.push([i + 1, name || '(add names in the Members list)'].concat(Array.from({ length: width }, (_, c) => kept[c] || '')));
    }
    sh.getRange(firstPerson, 1, weekRows, 2 + width).setValues(rows);
    sh.getRange(firstPerson, 1, weekRows, 2).setFontSize(12);
    sh.getRange(firstPerson, 1, weekRows, 1).setFontColor(MUTED).setHorizontalAlignment('right');
    if (!names.length) sh.getRange(firstPerson, 2).setFontColor(MUTED).setFontStyle('italic').setFontSize(10);
    sh.getRange(firstPerson, 3, weekRows, width).setHorizontalAlignment('center');
    for (let i = 1; i < weekRows; i += 2) sh.getRange(firstPerson + i, 1, 1, 2 + width).setBackground(BAND);
    sh.setRowHeights(firstPerson, weekRows, 26);

    sh.getRange(top + 1, 1, weekRows + 2, 2 + width)
      .setBorder(true, true, true, true, true, true, LINE, SpreadsheetApp.BorderStyle.SOLID);
    for (let i = 1; i < days.length; i++) {
      sh.getRange(top, 3 + i * nSlots, weekRows + 3, 1)
        .setBorder(null, true, null, null, null, null, HEAD, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }

    const att = firstPerson + weekRows;
    sh.getRange(att, 1, 1, 2).merge().setValue('Expected attendance').setFontWeight('bold').setFontSize(11).setBackground(SUB);
    sh.getRange(att, 3, 1, width)
      .setFormulaR1C1('=COUNTIF(R[-' + weekRows + ']C:R[-1]C,"x")') // COUNTIF ignores case, so x and X both count
      .setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
    sh.getRange(att, 1, 1, 2 + width).setBorder(true, null, null, null, null, null, HEAD, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sh.setRowHeight(att, 30);
    totals.push(sh.getRange(att, 3, 1, width));

    const cell = sh.getRange(firstPerson, 3).getA1Notation();
    freeRules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=LOWER(TRIM(' + cell + '))="x"')
      .setBackground(FREE).setFontColor(FREE_INK).setBold(true)
      .setRanges([sh.getRange(firstPerson, 3, weekRows, width)])
      .build());
  });

  // Totals shade from white (nobody) to green (the best slot so far), so the best times stand out.
  const heat = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue('#ffffff', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setGradientMaxpoint(HEAT_MAX)
    .setRanges(totals)
    .build();
  sh.setConditionalFormatRules(freeRules.concat(heat));
  sh.setColumnWidth(1, 40);
  sh.setColumnWidth(2, 150);
  sh.setColumnWidths(3, lastCol - 2, 46); // wide enough for "12pm"
  sh.setFrozenColumns(2);
  sh.setHiddenGridlines(true);
  setState(sh, Object.assign({}, cfg, { listRows: listRows, weekRows: weekRows }));
}

// Row positions: instructions, gap, Members header + list, gap, then one block per week.
function layout(listRows, weekRows, nWeeks) {
  const listTop = STEPS.length + GAP_ROWS + 2; // +1 for the Members header row, +1 because rows are 1-based
  const firstWeek = listTop + listRows + GAP_ROWS;
  const blockHeight = 2 + weekRows + 1 + GAP_ROWS; // date row, hour row, people, attendance, gap
  const weekTops = [];
  for (let w = 0; w < nWeeks; w++) weekTops.push(firstWeek + w * blockHeight);
  return { listTop: listTop, weekTops: weekTops, lastRow: firstWeek + nWeeks * blockHeight };
}

// Trimmed, non-empty, first spelling wins for case-insensitive duplicates.
function cleanNames(list) {
  const seen = {};
  return list.map(s => String(s).trim().replace(/\s+/g, ' ')).filter(s => {
    const k = s.toLowerCase();
    if (!s || seen[k]) return false;
    return (seen[k] = true);
  });
}

function getState(sh) {
  const m = sh.getDeveloperMetadata().find(d => d.getKey() === STATE_KEY);
  return m ? JSON.parse(m.getValue()) : null;
}

function setState(sh, st) {
  const m = sh.getDeveloperMetadata().find(d => d.getKey() === STATE_KEY);
  if (m) m.setValue(JSON.stringify(st));
  else sh.addDeveloperMetadata(STATE_KEY, JSON.stringify(st));
}

// Groups the chosen weekdays between start and end into Monday-to-Sunday weeks.
function weekBlocks(start, end, weekdays) {
  const weeks = [];
  let key = null;
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (!weekdays.includes(d.getDay())) continue;
    const monday = new Date(d);
    monday.setDate(d.getDate() - (d.getDay() + 6) % 7);
    if (monday.toDateString() !== key) { weeks.push([]); key = monday.toDateString(); }
    weeks[weeks.length - 1].push(new Date(d));
  }
  return weeks;
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmt(d, pattern) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), pattern);
}

function uniqueName(ss, name) {
  let n = name, i = 2;
  while (ss.getSheetByName(n)) n = name + ' (' + i++ + ')';
  return n;
}

const DIALOG_HTML = `
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; }
  label { display: block; margin-top: 10px; font-weight: bold; }
  input, select, textarea { width: 100%; box-sizing: border-box; padding: 5px; font-size: 13px; }
  .row { display: flex; gap: 8px; } .row > div { flex: 1; }
  .days label { display: inline-block; font-weight: normal; margin: 4px 8px 0 0; }
  .days input { width: auto; }
  button { margin-top: 16px; padding: 8px 16px; background: #1a73e8; color: #fff; border: 0; border-radius: 4px; font-size: 14px; cursor: pointer; }
  button:disabled { opacity: .6; }
  #err { color: #c5221f; margin-top: 8px; }
</style>
<div class="row">
  <div><label for="start">Start date</label><input type="date" id="start"></div>
  <div><label for="end">End date</label><input type="date" id="end"></div>
</div>
<label for="members">Names (optional, one per line)</label>
<textarea id="members" rows="7" placeholder="Leave empty and fill in the Members list on the sheet"></textarea>
<div class="row">
  <div><label for="fromHour">From</label><select id="fromHour"></select></div>
  <div><label for="toHour">To</label><select id="toHour"></select></div>
</div>
<label>Days</label>
<div class="days" id="days"></div>
<button id="go">Create sheet</button>
<div id="err" role="alert"></div>
<script>
  const hourName = h => (h % 12 || 12) + (h < 12 ? ' AM' : ' PM');
  for (const id of ['fromHour', 'toHour']) {
    const sel = document.getElementById(id);
    for (let h = 0; h < 24; h++) sel.add(new Option(hourName(h), h));
  }
  fromHour.value = 10; toHour.value = 22;
  [['Mon',1],['Tue',2],['Wed',3],['Thu',4],['Fri',5],['Sat',6],['Sun',0]].forEach(([n, v]) => {
    days.insertAdjacentHTML('beforeend', '<label><input type="checkbox" value="' + v + '" checked> ' + n + '</label>');
  });
  go.onclick = () => {
    err.textContent = '';
    const weekdays = [...days.querySelectorAll('input:checked')].map(c => c.value);
    if (!start.value || !end.value) { err.textContent = 'Pick a start and end date.'; return; }
    go.disabled = true; go.textContent = 'Creating…';
    google.script.run
      .withSuccessHandler(() => google.script.host.close())
      .withFailureHandler(e => { err.textContent = e.message; go.disabled = false; go.textContent = 'Create sheet'; })
      .createSheet({ start: start.value, end: end.value, members: members.value, fromHour: fromHour.value, toHour: toHour.value, weekdays });
  };
</script>`;
