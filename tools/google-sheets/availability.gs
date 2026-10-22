// Availability sheet generator.
// Setup: in your Google Sheet, Extensions > Apps Script, paste this file, save, then reload the sheet.
// Use: Availability menu > New availability sheet… (creates a new tab each time).

const SPARE_ROWS = 3;   // empty numbered rows for late joiners
const GAP_ROWS = 2;     // blank rows between weeks
const MAX_WEEKS = 26;  // guards against a typo'd year building thousands of columns
const HEAD = '#34495e', SUB = '#eef2f7', BAND = '#f7f9fb', LINE = '#d6dde6';
const INK = '#1f2933', MUTED = '#5f6b7a', NOTE = '#fff8e6', NOTE_DARK = '#c7891f';
const FREE = '#c6efce', FREE_INK = '#1e6b34', HEAT_MAX = '#57bb8a';
const STEPS = [
  'Find your name in column B of the first week. Not listed? Type it into an empty numbered row there; it copies to every week.',
  'Type x in every hour you are free. Leave it blank if you are busy.',
  'Your x cells turn green, so you can check your entries at a glance.',
  'Expected attendance under each week counts who is free at that time. The greener the cell, the more people are free.',
  'Scroll down for the following weeks. Times run left to right; each block is one calendar week.',
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Availability')
    .addItem('New availability sheet…', 'showDialog')
    .addToUi();
}

function showDialog() {
  const html = HtmlService.createHtmlOutput(DIALOG_HTML).setWidth(380).setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(html, 'New availability sheet');
}

function createSheet(o) {
  const start = parseDate(o.start), end = parseDate(o.end);
  const members = o.members.split('\n').map(s => s.trim()).filter(String);
  const hours = [];
  for (let h = +o.fromHour; h <= +o.toHour; h++) hours.push(h);
  if (end < start) throw new Error('End date is before the start date.');
  if (!members.length) throw new Error('Add at least one member.');
  if (!hours.length) throw new Error('"To" hour must be after "From" hour.');

  const weeks = weekBlocks(start, end, o.weekdays.map(Number));
  if (!weeks.length) throw new Error('No days in that range match the chosen weekdays.');
  if (weeks.length > MAX_WEEKS) throw new Error('Range is over ' + MAX_WEEKS + ' weeks; check the dates.');

  const ss = SpreadsheetApp.getActive();
  const sh = ss.insertSheet(uniqueName(ss, fmt(start, "MMM d ''yy") + ' – ' + fmt(end, "MMM d ''yy"))); // '' is a literal apostrophe: Oct 12 '26
  const nSlots = hours.length;
  const people = members.length + SPARE_ROWS;
  const introRows = STEPS.length + GAP_ROWS;
  const blockHeight = 2 + people + 1 + GAP_ROWS; // date row, hour row, people, attendance, gap
  const lastCol = 2 + Math.max(...weeks.map(w => w.length)) * nSlots;
  const lastRow = introRows + weeks.length * blockHeight;
  if (sh.getMaxColumns() < lastCol) sh.insertColumnsAfter(sh.getMaxColumns(), lastCol - sh.getMaxColumns());
  if (sh.getMaxRows() < lastRow) sh.insertRowsAfter(sh.getMaxRows(), lastRow - sh.getMaxRows());
  sh.getRange(1, 1, lastRow, lastCol).setFontFamily('Arial').setFontColor(INK).setVerticalAlignment('middle');

  // Instructions, laid out like a week header: label box on the left, one step per row on the right.
  sh.getRange(1, 1, STEPS.length, 2).merge().setValue('How to fill this in')
    .setBackground(NOTE_DARK).setFontColor('#ffffff').setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setWrap(true);
  const stepWidth = weeks[0].length * nSlots;
  STEPS.forEach((s, i) => sh.getRange(1 + i, 3, 1, stepWidth).merge().setValue((i + 1) + '.  ' + s));
  sh.getRange(1, 3, STEPS.length, stepWidth).setBackground(NOTE).setFontSize(11);
  sh.setRowHeights(1, STEPS.length, 24);

  const hourLabels = hours.map(h => (h % 12 || 12) + (h < 12 ? 'am' : 'pm'));
  const firstWeekPerson = introRows + 3;
  const freeRules = [], totals = [];
  weeks.forEach((days, w) => {
    const top = 1 + introRows + w * blockHeight, firstPerson = top + 2, width = days.length * nSlots;

    sh.getRange(top, 1, 2, 2).merge().setValue('Week of ' + fmt(days[0], 'MMM d'))
      .setBackground(HEAD).setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
    days.forEach((d, i) => sh.getRange(top, 3 + i * nSlots, 1, nSlots).merge().setValue(fmt(d, 'EEEE, MMMM d, yyyy')));
    sh.getRange(top, 3, 1, width).setBackground(HEAD).setFontColor('#ffffff').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
    sh.getRange(top + 1, 3, 1, width)
      .setNumberFormat('@') // plain text, otherwise Sheets turns "10pm" into 10:00 PM
      .setValues([days.flatMap(() => hourLabels)])
      .setBackground(SUB).setFontColor(MUTED).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center');
    sh.setRowHeight(top, 32);

    // Later weeks copy names from the first week, so renaming or adding someone there updates every week.
    const names = [];
    for (let i = 0; i < people; i++) {
      const src = '$B$' + (firstWeekPerson + i);
      names.push([i + 1, w === 0 ? (members[i] || '') : '=IF(' + src + '="","",' + src + ')']);
    }
    sh.getRange(firstPerson, 1, people, 2).setValues(names).setFontSize(12);
    sh.getRange(firstPerson, 1, people, 1).setFontColor(MUTED).setHorizontalAlignment('right');
    sh.getRange(firstPerson, 3, people, width).setHorizontalAlignment('center');
    for (let i = 1; i < people; i += 2) sh.getRange(firstPerson + i, 1, 1, 2 + width).setBackground(BAND);
    sh.setRowHeights(firstPerson, people, 26);

    sh.getRange(top + 1, 1, people + 2, 2 + width)
      .setBorder(true, true, true, true, true, true, LINE, SpreadsheetApp.BorderStyle.SOLID);
    for (let i = 1; i < days.length; i++) {
      sh.getRange(top, 3 + i * nSlots, people + 3, 1)
        .setBorder(null, true, null, null, null, null, HEAD, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }

    const att = firstPerson + people;
    sh.getRange(att, 1, 1, 2).merge().setValue('Expected attendance').setFontWeight('bold').setFontSize(11).setBackground(SUB);
    sh.getRange(att, 3, 1, width)
      .setFormulaR1C1('=COUNTIF(R[-' + people + ']C:R[-1]C,"x")') // COUNTIF ignores case, so x and X both count
      .setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
    sh.getRange(att, 1, 1, 2 + width).setBorder(true, null, null, null, null, null, HEAD, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sh.setRowHeight(att, 30);
    totals.push(sh.getRange(att, 3, 1, width));

    const cell = sh.getRange(firstPerson, 3).getA1Notation();
    freeRules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=LOWER(TRIM(' + cell + '))="x"')
      .setBackground(FREE).setFontColor(FREE_INK).setBold(true)
      .setRanges([sh.getRange(firstPerson, 3, people, width)])
      .build());
  });

  // Totals shade from white (nobody) to green (everyone), so the best slots stand out.
  const heat = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue('#ffffff', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setGradientMaxpointWithValue(HEAT_MAX, SpreadsheetApp.InterpolationType.NUMBER, String(members.length))
    .setRanges(totals)
    .build();
  sh.setConditionalFormatRules(freeRules.concat(heat));
  sh.setColumnWidth(1, 40);
  sh.setColumnWidth(2, 150);
  sh.setColumnWidths(3, lastCol - 2, 46); // wide enough for "12pm"
  sh.setFrozenColumns(2);
  sh.setHiddenGridlines(true);
  ss.setActiveSheet(sh);
  return sh.getName();
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
<label for="members">Members (one per line)</label>
<textarea id="members" rows="7"></textarea>
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
