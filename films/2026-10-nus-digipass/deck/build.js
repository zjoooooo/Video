// Builds the English Re Sustainability DigiPass workflow deck from "/Users/justin/Project/jev /output/nus-digipass-workflow.md".
//
//   cd films/2026-10-nus-digipass/deck && npm install && node build.js [out.pptx]
//
// The source is public-portal research, not an official specification, and the deck says so. NUS appears only in
// the two NUS source citations on the last slide. Colours keep the film's meanings: blue = seen in the public
// portal, orange = inferred / Re Sustainability to confirm (an orange
// "!" on a blue card = the step is seen but its details need confirming), green = a ticket used.
// Layout is 13.33 x 7.5 in. Body text is 18 pt, captions 16 pt; only the footer and step numbers are 14.
const pptxgen = require('pptxgenjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const Fa = require('react-icons/fa6');

const OUT = process.argv[2] || '/Users/justin/Project/jev /output/Re-Sustainability-DigiPass-Workflow.pptx';
const THEME = { name: 'Re Sustainability DigiPass', headFontFace: 'Arial', bodyFontFace: 'Arial', colors: {
  dk1: '1F2937', lt1: 'FFFFFF', dk2: '0B2A5B', lt2: 'F7F9FC', accent1: '1D5FD1', accent2: 'F26B1D', accent3: '16A34A',
  accent4: 'EAF2FD', accent5: 'FFF1E6', accent6: '4B5563', hlink: '1D5FD1', folHlink: '0B2A5B' } };
const HEX = THEME.colors;
const EDGE = 'D9E2EF';                                // 1 px border on near-white cards (no theme slot for it)
const W = 13.333, M = 0.6, CW = W - 2 * M;           // slide width, side margin, content width

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'Re Sustainability DigiPass: event parking workflow';
pres.subject = 'Workflow of the Re Sustainability DigiPass prepaid event parking tickets (public-portal research)';
pres.author = 'Justin';
const C = pres.SchemeColor;
const S = pres.shapes;

// ---- icons: Font Awesome 6 via react-icons, rasterised once per colour ----------------------------
const ICON = {};
async function icon(name, hex) {
  const key = name + hex;
  if (!ICON[key]) {
    const svg = renderToStaticMarkup(React.createElement(Fa[name], { size: 256, color: '#' + hex }));
    ICON[key] = 'image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64');
  }
  return ICON[key];
}
const label = name => name.slice(2).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase() + ' icon';
async function pic(s, name, hex, o) { s.addImage({ data: await icon(name, hex), altText: label(name), ...o }); }

// ---- layouts ------------------------------------------------------------------------------------
const FOOT = 'Re Sustainability DigiPass · public-portal research, not an official Re Sustainability specification';
pres.defineSlideMaster({
  title: 'CONTENT', background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: 'kicker', type: 'body', x: M, y: 0.42, w: 6, h: 0.34, fontSize: 16, bold: true,
      color: C.accent1, charSpacing: 2, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.8, w: CW, h: 0.72, fontSize: 32, bold: true,
      color: C.text2, margin: 0, valign: 'top', align: 'left' }, text: '' } },
    { text: { text: FOOT, options: { x: M, y: 6.98, w: 10.5, h: 0.3, fontSize: 14, color: C.accent6, margin: 0, valign: 'top' } } },
  ],
  slideNumber: { x: W - M - 0.8, y: 6.98, w: 0.8, h: 0.3, fontSize: 14, color: C.accent6, align: 'right', margin: 0 },
});
pres.defineSlideMaster({
  title: 'TITLE', background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: 'kicker', type: 'body', x: 0.8, y: 1.3, w: 7.4, h: 0.34, fontSize: 16, bold: true,
      color: C.accent4, charSpacing: 2, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 1.7, w: 7.4, h: 2.0, fontSize: 60, bold: true,
      color: C.background1, margin: 0, valign: 'top', align: 'left' }, text: '' } },
    { placeholder: { options: { name: 'sub', type: 'body', x: 0.8, y: 3.85, w: 7.4, h: 0.45, fontSize: 24,
      color: C.accent4, margin: 0, valign: 'top' }, text: '' } },
  ],
});
pres.defineSlideMaster({
  title: 'DARK', background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: 'kicker', type: 'body', x: 0.8, y: 0.9, w: 9, h: 0.34, fontSize: 16, bold: true,
      color: C.accent4, charSpacing: 2, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 1.3, w: 11.7, h: 0.7, fontSize: 36, bold: true,
      color: C.background1, margin: 0, valign: 'top', align: 'left' }, text: '' } },
  ],
});

// ---- drawing helpers ------------------------------------------------------------------------------
const shadow = () => ({ type: 'outer', color: HEX.dk2, opacity: 0.12, blur: 8, offset: 2, angle: 90 });
function T(s, text, x, y, w, h, o = {}) {           // a plain text box, no padding, top-aligned, body size
  s.addText(text, { x, y, w, h, isTextBox: true, margin: 0, fontSize: 18, color: C.text1, valign: 'top', ...o });
}
function box(s, x, y, w, h, o = {}) {               // a rounded card; near-white cards always get the 1 px edge
  const { fill = C.background1, r = 0.12, sh = false, tr } = o;
  const line = o.line || (fill === C.background2 ? EDGE : null);
  s.addShape(S.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: r, fill: { color: fill, ...(tr != null ? { transparency: tr } : {}) },
    line: line ? { color: line, width: line === EDGE ? 1 : 1.25 } : { type: 'none' }, ...(sh ? { shadow: shadow() } : {}) });
}
async function badge(s, name, x, y, d, bg, fg, scale = 0.5) {   // an icon centred in a circle
  s.addShape(S.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { type: 'none' } });
  const k = d * scale;
  await pic(s, name, fg, { x: x + (d - k) / 2, y: y + (d - k) / 2, w: k, h: k });
}
function num(s, n, x, y, d, bg = C.text2, fg = C.background1, size = 14) {
  s.addText(String(n), { shape: S.OVAL, x, y, w: d, h: d, fill: { color: bg }, line: { type: 'none' }, color: fg,
    fontSize: size, bold: true, align: 'center', valign: 'middle', margin: 0 });
}
const bang = (s, x, y, d = 0.34) => num(s, '!', x, y, d, C.accent2, C.background1, 16);   // "details to confirm"
function arrow(s, x1, y1, x2, y2, color = C.accent6, width = 1.75) {
  s.addShape(S.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width, endArrowType: 'triangle' } });
}
function line(s, x1, y1, x2, y2, color = C.accent6, width = 1.5, dash) {
  s.addShape(S.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width, ...(dash ? { dashType: dash } : {}) } });
}
function chev(s, x, y, w = 0.18) {                  // the small chevron between steps
  s.addShape(S.CHEVRON, { x, y, w, h: 0.3, fill: { color: C.accent1 }, line: { type: 'none' } });
}
function chip(s, text, x, y, w, kind = 'inferred') { // an orange "to confirm" chip: "!" and dark text; grey = neutral
  const orange = kind === 'inferred';
  box(s, x, y, w, 0.42, { fill: orange ? C.accent5 : C.background2, line: orange ? C.accent2 : C.accent6, r: 0.21 });
  if (orange) bang(s, x + 0.07, y + 0.06, 0.3);
  T(s, text, x + (orange ? 0.47 : 0.2), y, w - (orange ? 0.6 : 0.4), 0.42, { fontSize: 16, bold: true,
    color: orange ? C.text2 : C.accent6, valign: 'middle', align: orange ? 'left' : 'center' });
}
function rail(s, active) {                          // the eight steps, top right, current ones filled
  const d = 0.38, g = 0.1, x0 = W - M - (8 * d + 7 * g), y = 0.4;
  line(s, x0 + d / 2, y + d / 2, x0 + 7 * (d + g) + d / 2, y + d / 2, C.accent4, 2);
  for (let i = 1; i <= 8; i++) {
    const on = active.includes(i);
    num(s, i, x0 + (i - 1) * (d + g), y, d, on ? C.accent1 : C.accent4, on ? C.background1 : C.accent1);
  }
}
function slide(layout, section, kicker, title) {
  const s = pres.addSlide({ masterName: layout, sectionTitle: section });
  if (kicker) s.addText(kicker, { placeholder: 'kicker' });
  if (title) s.addText(title, { placeholder: 'title' });
  return s;
}
function notes(s, time, body, next, qa = []) {      // presenter notes: target time, script, likely questions, hand-off
  s.addNotes(`[About ${time}]\n\n${body}` + (qa.length ? '\n\nIf asked:\n' + qa.map(q => '- ' + q).join('\n') : '')
    + (next ? `\n\nTransition: "${next}"` : ''));
}

const STEPS = [   // icon, title, body, status: seen | detail (assumed or partly seen, details to confirm) | inferred
  ['FaGear', 'Admin setup', 'Product, price, rules', 'detail'],
  ['FaCalendarDays', 'Organiser applies', 'Event, dates and tickets', 'seen'],
  ['FaFileCircleCheck', 'Approve & buy', 'Creates the pool', 'detail'],
  ['FaLink', 'Share link', 'Link with a token', 'seen'],
  ['FaCar', 'Register vehicle', 'IU/OBU, plate, email', 'seen'],
  ['FaArrowsRotate', 'Sync to EPS', '~30 min', 'seen'],
  ['FaRoadBarrier', 'Redeem at exit', '1 ticket per exit', 'inferred'],
  ['FaChartColumn', 'Manage', 'Top-up and refunds', 'detail'],
];

async function build() {
  // 1 ── title ──────────────────────────────────────────────────────────────────────────────────
  pres.addSection({ title: 'Introduction' });
  let s = slide('TITLE', 'Introduction', 'WORKFLOW BRIEFING · 21 OCTOBER 2026', 'Re Sustainability DigiPass');
  s.addText('How prepaid event parking works', { placeholder: 'sub' });
  s.addText('Portal research · not an official Re Sustainability specification', { shape: S.ROUNDED_RECTANGLE,
    x: 0.8, y: 4.6, w: 7.2, h: 0.54, rectRadius: 0.27, fill: { color: C.text2 }, line: { color: C.accent2, width: 1.5 },
    color: C.accent2, fontSize: 16, bold: true, align: 'center', valign: 'middle', margin: 0 });
  // the ticket stack
  const tx = 8.4, tw0 = 4.1, ty = 2.35;
  s.addShape(S.ROUNDED_RECTANGLE, { x: tx + 0.35, y: ty - 0.8, w: tw0, h: 2.0, rectRadius: 0.14, rotate: 9, fill: { color: C.accent1, transparency: 55 }, line: { type: 'none' } });
  s.addShape(S.ROUNDED_RECTANGLE, { x: tx + 0.2, y: ty - 0.45, w: tw0, h: 2.0, rectRadius: 0.14, rotate: 4, fill: { color: C.accent1 }, line: { type: 'none' } });
  s.addShape(S.ROUNDED_RECTANGLE, { x: tx, y: ty, w: tw0, h: 2.0, rectRadius: 0.14, fill: { color: C.background1 }, line: { type: 'none' }, shadow: shadow() });
  s.addShape(S.OVAL, { x: tx - 0.21, y: ty + 0.79, w: 0.42, h: 0.42, fill: { color: C.text2 }, line: { type: 'none' } });
  s.addShape(S.OVAL, { x: tx + tw0 - 0.21, y: ty + 0.79, w: 0.42, h: 0.42, fill: { color: C.text2 }, line: { type: 'none' } });
  line(s, tx + 1.02, ty + 0.17, tx + 1.02, ty + 1.83, C.accent6, 1.5, 'dash');
  s.addText('P', { shape: S.OVAL, x: tx + 0.22, y: ty + 0.7, w: 0.6, h: 0.6, fill: { color: C.accent1 }, line: { type: 'none' },
    color: C.background1, fontSize: 24, bold: true, align: 'center', valign: 'middle', margin: 0 });
  T(s, 'DigiPass', tx + 1.25, ty + 0.25, 2.7, 0.45, { fontSize: 26, bold: true, color: C.text2 });
  T(s, 'Event parking ticket', tx + 1.25, ty + 0.75, 2.7, 0.3, { fontSize: 16, color: C.accent6 });
  T(s, '1 ticket = 1 eligible exit', tx + 1.25, ty + 1.3, 2.75, 0.32, { fontSize: 16, bold: true, color: C.accent1 });
  // the eight steps as a motif
  const d0 = 0.38, ry = 5.6;
  line(s, 0.8 + d0 / 2, ry + d0 / 2, 0.8 + 7 * 0.6 + d0 / 2, ry + d0 / 2, C.accent1, 2);
  for (let i = 0; i < 8; i++) num(s, i + 1, 0.8 + i * 0.6, ry, d0, C.accent1, C.background1);
  T(s, '8 steps · 3 roles · 1 shared ticket pool', 5.55, ry + 0.03, 5, 0.32, { fontSize: 16, color: C.accent4 });
  notes(s, '0:45', `This briefing walks through Re Sustainability DigiPass, the prepaid event parking product on the Re Sustainability parking portal.

One caveat up front: everything here comes from what the public parking portal shows. It is not an official Re Sustainability business specification. Blue means we saw it in the public portal. Orange means we inferred it, and Re Sustainability needs to confirm it.

The story has eight steps and three roles: the admin who sets up the product, the organiser who buys tickets for an event, and the drivers who use them. All of them share one pool of prepaid tickets.

[Before presenting: add one sentence on why the team is looking at DigiPass. The research doesn't say, so state the real reason in your own words.]`, 'Let\'s start with what DigiPass actually is.');

  // 2 ── what it is ───────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Introduction', 'THE CONCEPT', 'DigiPass is a prepaid ticket pool for one event');
  const FLOW = [
    ['FaUserTie', 'Organiser', 'buys a batch of tickets'],
    ['FaTicket', 'Event ticket pool', 'prepaid and shared'],
    ['FaCar', 'Guests\' cars', 'each car gets tickets'],
    ['FaRoadBarrier', 'Car park exit', '1 ticket per eligible exit'],
  ];
  const fw = 2.9, fg = (CW - 4 * fw) / 3;
  for (let i = 0; i < 4; i++) {
    const x = M + i * (fw + fg), cx = x + fw / 2;
    await badge(s, FLOW[i][0], cx - 0.65, 1.8, 1.3, i === 1 ? C.accent1 : C.accent4, i === 1 ? HEX.lt1 : HEX.accent1);
    T(s, FLOW[i][1], x, 3.25, fw, 0.4, { fontSize: 20, bold: true, color: C.text2, align: 'center' });
    T(s, FLOW[i][2], x, 3.68, fw, 0.36, { color: C.accent6, align: 'center' });
    if (i < 3) arrow(s, cx + 0.8, 2.45, cx + fw + fg - 0.8, 2.45, C.accent1, 2);
  }
  const FACTS = [
    ['FaBan', 'Not a season pass', 'Not Singpass, not a monthly pass: it belongs to an event.'],
    ['FaQrcode', 'No QR at the gate', 'Cars are recognised by plate and IU/OBU (ERP-style).'],
    ['FaPeopleGroup', 'Made for events', 'For events, conferences and department visitors.'],
  ];
  const cw3 = (CW - 2 * 0.3) / 3;
  for (let i = 0; i < 3; i++) {
    const x = M + i * (cw3 + 0.3);
    box(s, x, 4.5, cw3, 2.1, { fill: C.background2 });
    await badge(s, FACTS[i][0], x + 0.3, 4.75, 0.6, C.accent4, HEX.accent1);
    T(s, FACTS[i][1], x + 1.05, 4.84, cw3 - 1.3, 0.4, { fontSize: 20, bold: true, color: C.text2 });
    T(s, FACTS[i][2], x + 0.3, 5.55, cw3 - 0.6, 0.9);
  }
  notes(s, '1:15', `The simplest way to think about DigiPass: it is a prepaid pool of parking tickets that belongs to one event.

An organiser buys a batch of tickets. Those tickets sit in the event's pool. They are allocated to the cars of the people attending. And each time one of those cars makes an eligible exit from a car park, one ticket is used.

Three things to know. It is not Singpass, and it is not a monthly season pass bound to one person and one car. There is no QR code to open the gate: the car parks use ERP-style electronic parking, so the car is recognised mainly by its plate and its IU or OBU unit. And it is made for events, conferences and department visitors. A good English working name is "Digital Event Parking Voucher".`,
  'Re Sustainability already offers several passes, so where does this one fit?',
  ['How much does a ticket cost? The public portal doesn\'t show how tickets are priced. Whether one ticket covers the whole fee or only a fixed amount is open question 1.']);

  // 3 ── vs other passes ────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Introduction', 'HOW IT COMPARES', 'How DigiPass differs from the other passes');
  const PASSES = [
    ['FaCalendarDays', 'Season Pass', 'Monthly; bound to one user and one car'],
    ['FaUser', 'Guest Pass', 'One visitor, on a set visit date'],
    ['FaCoins', 'Capped Rate Pass', 'A single stay\'s fee is capped'],
    ['FaReceipt', 'Post-paid Pass', 'Park first; a designated account pays later'],
  ];
  const pw = 3.25, ph = 2.25;
  for (let i = 0; i < 4; i++) {
    const x = M + (i % 2) * (pw + 0.3), y = 1.85 + Math.floor(i / 2) * (ph + 0.3);
    box(s, x, y, pw, ph, { fill: C.background2 });
    await badge(s, PASSES[i][0], x + 0.3, y + 0.28, 0.55, C.background1, HEX.accent6);
    T(s, PASSES[i][1], x + 0.3, y + 0.98, pw - 0.6, 0.4, { fontSize: 20, bold: true, color: C.text2 });
    T(s, PASSES[i][2], x + 0.3, y + 1.42, pw - 0.6, 0.7, { color: C.accent6 });
  }
  const bx = M + 2 * pw + 0.3 + 0.45, bw = W - M - bx;
  box(s, bx, 1.85, bw, 4.8, { fill: C.accent1, sh: true });
  T(s, 'DigiPass', bx + 0.45, 2.51, bw - 0.9, 0.55, { fontSize: 30, bold: true, color: C.background1 });   // content centred in the card
  T(s, 'An organiser pre-buys tickets and shares them across many cars. Each eligible exit uses one.',
    bx + 0.45, 3.16, bw - 0.9, 0.95, { color: C.background1 });
  const DP = [['FaCalendarCheck', 'Per event, not per month'], ['FaLayerGroup', 'Many cars share one pool'], ['FaTicket', 'Counted per exit']];
  for (let i = 0; i < 3; i++) {
    const y = 4.34 + i * 0.62;
    await pic(s, DP[i][0], HEX.lt1, { x: bx + 0.45, y: y + 0.03, w: 0.34, h: 0.34 });
    T(s, DP[i][1], bx + 1.0, y, bw - 1.45, 0.4, { bold: true, color: C.background1 });
  }
  notes(s, '1:00', `The Re Sustainability parking portal already offers several kinds of pass, so it helps to place DigiPass among them.

A Season Pass is long-term and monthly, and it is bound to a user and a vehicle. A Guest Pass is for one specific visitor on a specific date. A Capped Rate Pass stops a single parking fee from rising past a set amount. A Post-paid Pass lets you park first and have a designated account settle later.

DigiPass is different in kind. An event organiser buys a batch of tickets up front and allocates them across different vehicles. It is per event rather than per month, many cars draw on one shared pool, and each eligible exit uses one ticket.`,
  'Now the whole workflow on one page.');

  // 4 ── the eight steps (hero) ─────────────────────────────────────────────────────────────────────
  pres.addSection({ title: 'Workflow' });
  s = slide('CONTENT', 'Workflow', 'THE WORKFLOW', 'End to end in eight steps');
  const LEG = [['blue', 'Seen in the public portal', 0, 0, 2.6], ['bang', 'Assumed or partly seen — details to confirm', 3.3, 0, 4.5],
               ['orange', 'Inferred — Re Sustainability to confirm', 3.3, 0.4, 4.0]];
  const lx0 = W - M - 8.2;                         // a two-column key above the cards; row 2 clears the title
  for (const [k, text, dx, dy, tw] of LEG) {
    const x = lx0 + dx, y = 0.4 + dy;
    if (k === 'bang') bang(s, x, y + 0.01, 0.3);
    else box(s, x + 0.03, y + 0.04, 0.24, 0.24, { fill: k === 'blue' ? C.accent4 : C.accent5, line: k === 'blue' ? C.accent1 : C.accent2, r: 0.05 });
    T(s, text, x + 0.4, y, tw, 0.32, { fontSize: 16, color: C.text1 });
  }
  const g8 = 0.1, w8 = (CW - 7 * g8) / 8, pad = 0.085;   // no chevrons: the numbers carry the order
  for (let i = 0; i < 8; i++) {
    const x = M + i * (w8 + g8), cx = x + w8 / 2, st = STEPS[i][3];
    box(s, x, 1.8, w8, 3.5, st === 'inferred' ? { fill: C.accent5, line: C.accent2 } : { fill: C.accent4 });
    num(s, i + 1, cx - 0.25, 1.95, 0.5, C.text2, C.background1, 16);
    if (st === 'detail') bang(s, x + w8 - 0.42, 1.88);
    await badge(s, STEPS[i][0], cx - 0.48, 2.6, 0.96, C.background1, st === 'inferred' ? HEX.accent2 : HEX.accent1, 0.48);
    T(s, STEPS[i][1], x + pad, 3.7, w8 - 2 * pad, 0.62, { bold: true, color: C.text2, align: 'center' });
    T(s, STEPS[i][2], x + pad, 4.4, w8 - 2 * pad, 0.6, { fontSize: 16, align: 'center' });
  }
  const PH = [[0, 2, 'SET UP', 'Admin and organiser'], [3, 5, 'REGISTER', 'Organiser and guests'], [6, 7, 'USE AND MANAGE', 'Car park, organiser and admin']];
  for (const [a, b, lab, who] of PH) {
    const x = M + a * (w8 + g8), w = (b - a + 1) * w8 + (b - a) * g8;
    line(s, x + 0.05, 5.65, x + w - 0.05, 5.65, C.text2, 2);
    line(s, x + 0.05, 5.55, x + 0.05, 5.65, C.text2, 2);
    line(s, x + w - 0.05, 5.55, x + w - 0.05, 5.65, C.text2, 2);
    T(s, lab, x, 5.77, w, 0.32, { fontSize: 16, bold: true, color: C.text2, align: 'center', charSpacing: 1 });
    const lw0 = Math.max(w, 3.2), lxl = Math.min(x + (w - lw0) / 2, W - M - lw0);   // the last span is narrow: let its label run wider
    T(s, who, lxl, 6.1, lw0, 0.32, { fontSize: 16, color: C.accent6, align: 'center' });
  }
  notes(s, '1:30', `Here is the whole flow on one page, in three phases.

Set up, steps one to three. The admin configures the ticket product: price, who may apply, valid dates and which car parks it covers. An organiser applies for an event with its dates and the number of tickets. Once approved and paid, the event gets its own ticket pool.

Register, steps four to six. The organiser shares a registration link that carries a token. Guests register their own car: plate, IU or OBU number and email. Then it takes about thirty minutes for the details to reach the car park system, the EPS.

Use and manage, steps seven and eight. At the exit, if the driver's "Use Ticket" switch is on and the conditions match, one ticket is used. Throughout, the organiser and admin can see the records, top up, handle refunds and export reports.

How to read the colours. Blue steps are what the public portal shows. Step seven is orange: the exit matching logic is our reading of the portal, not a confirmed rule. Steps one, three and eight carry an orange exclamation mark: they are assumed or only partly seen, and their details need confirming. Step one, the admin set-up, happens in the parking management platform and is not visible in the public portal; the product rules are assumed. In step three, the approval levels and when payment activates the pool are not visible. In step eight, how refunds treat tickets already allocated is not visible.`,
  'Let\'s take the steps in turn, starting with set-up.');

  // 5 ── steps 1–3 ───────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Workflow', 'STEPS 1–3 · SET UP', 'Setting up the event\'s ticket pool');
  rail(s, [1, 2, 3]);
  const COLS = [
    [1, 'Admin sets up the product', '', ['Ticket product', 'Price or rate plan', 'Roles allowed to apply', 'Valid dates', 'Car parks and rules'], 3.45],
    [2, 'Organiser applies', '(form may include)', ['Event name, description', 'Event start and end dates', 'Number of tickets', 'Parking pass or rate plan', 'Registration deadline', 'Supporting attachments'], 3.95],
  ];
  let cx5 = M;
  for (const [n, head, sub, items, cw] of COLS) {
    box(s, cx5, 1.8, cw, 4.85, { fill: C.background1, line: EDGE, sh: true });
    num(s, n, cx5 + 0.3, 2.02, 0.48, C.text2, C.background1, 16);
    T(s, head, cx5 + 0.95, 2.02, cw - 1.15, sub ? 0.36 : 0.66, { bold: true, color: C.text2 });
    if (sub) T(s, sub, cx5 + 0.95, 2.4, cw - 1.15, 0.32, { fontSize: 16, color: C.accent6 });
    items.forEach((item, j) => {
      const y = 2.95 + j * 0.58;
      box(s, cx5 + 0.3, y, cw - 0.6, 0.5, { fill: C.accent4, r: 0.1 });
      T(s, item, cx5 + 0.3 + 0.17, y, cw - 0.6 - 0.3, 0.5, { color: C.text2, valign: 'middle' });
    });
    if (n === 1) {                                  // step 1 is assumed: the admin side isn't in the public portal
      box(s, cx5 + 0.3, 5.86, cw - 0.6, 0.72, { fill: C.accent5, line: C.accent2 });
      bang(s, cx5 + 0.42, 6.07, 0.3);
      T(s, 'Rules not visible in the portal', cx5 + 0.85, 5.86, cw - 1.25, 0.72, { fontSize: 16, bold: true, color: C.text2, valign: 'middle' });
    }
    chev(s, cx5 + cw + 0.09, 4.1);
    cx5 += cw + 0.35;
  }
  const pw3 = W - M - cx5;
  box(s, cx5, 1.8, pw3, 3.85, { fill: C.text2, sh: true });
  num(s, 3, cx5 + 0.3, 2.02, 0.48, C.accent1, C.background1, 16);
  T(s, 'Approved and paid', cx5 + 0.95, 2.02, pw3 - 1.15, 0.36, { bold: true, color: C.background1 });
  T(s, 'The event\'s own ticket pool', cx5 + 0.95, 2.4, pw3 - 1.15, 0.32, { fontSize: 16, color: C.accent4 });
  const POOL = [['FaTicket', 'Bought', 'total paid for', HEX.accent1], ['FaCar', 'Allocated', 'to vehicles', HEX.accent1],
                ['FaCircleCheck', 'Used', 'at exits', HEX.accent3], ['FaLayerGroup', 'Left', 'available', HEX.accent1]];
  for (let i = 0; i < 4; i++) {                     // the pool's ledger: four counters it keeps
    const x = cx5 + 0.3, y = 2.95 + i * 0.66, tw = pw3 - 0.6;
    box(s, x, y, tw, 0.56, { fill: C.background1, r: 0.08 });
    await pic(s, POOL[i][0], POOL[i][3], { x: x + 0.18, y: y + 0.1, w: 0.36, h: 0.36 });
    T(s, POOL[i][1], x + 0.7, y, 1.25, 0.56, { bold: true, color: C.text2, valign: 'middle' });
    T(s, POOL[i][2], x + 2.0, y, tw - 2.1, 0.56, { fontSize: 16, color: C.accent6, valign: 'middle' });
  }
  box(s, cx5, 5.89, pw3, 0.76, { fill: C.accent5, line: C.accent2 });   // bottom lines up with the other two cards
  bang(s, cx5 + 0.2, 6.1);
  T(s, 'To confirm: approval levels, payment, activation date', cx5 + 0.7, 5.89, pw3 - 0.85, 0.76, { fontSize: 16, valign: 'middle' });
  notes(s, '1:15', `Steps one to three build the event's ticket pool.

Step one is the admin's job in the parking management platform: define the ticket product, its price or rate plan, which roles are allowed to apply, the valid dates, and which car parks and usage rules apply. None of this is visible in the public portal, so it is assumed, hence the orange mark.

Step two: an event organiser, or another authorised user, submits a DigiPass application. The source lists what the form may include: the event name and description, the start and end dates, how many tickets they want, the parking pass or rate plan, a deadline for registering vehicles, and any supporting attachments. The exact form isn't confirmed.

Step three: once the application is approved and paid, the system creates a ticket pool just for this event. It records four numbers: tickets bought, tickets allocated to vehicles, tickets used at exits, and tickets left.

What we cannot see from the portal is the approval chain, the payment method, and exactly when the tickets become active. Those need Re Sustainability to confirm.`,
  'With a pool in place, the cars need to get onto the event.');

  // 6 ── steps 4–5 ───────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Workflow', 'STEPS 4–5 · REGISTER', 'Guests register their own cars');
  rail(s, [4, 5]);
  num(s, 4, M, 1.85, 0.48, C.text2, C.background1, 16);
  T(s, 'The organiser shares a registration link', M + 0.65, 1.86, 5.3, 0.4, { fontSize: 20, bold: true, color: C.text2 });
  T(s, 'or registers the vehicles directly', M + 0.65, 2.28, 5.3, 0.32, { fontSize: 16, color: C.accent6 });
  box(s, M, 2.85, 5.75, 0.62, { fill: C.background2, line: C.accent1, r: 0.31 });
  await pic(s, 'FaLink', HEX.accent1, { x: M + 0.22, y: 3.0, w: 0.32, h: 0.32 });
  T(s, '/digipass-register-vehicle/public/{token}', M + 0.68, 2.85, 5.0, 0.62, { fontSize: 16, bold: true, color: C.text2, valign: 'middle' });
  T(s, 'The link only works while', M, 3.8, 5.5, 0.38, { bold: true, color: C.text2 });
  const GATES = ['the token is valid', 'the registration deadline has not passed', 'the event is still active', 'tickets are left in the pool'];
  for (let i = 0; i < 4; i++) {
    const y = 4.3 + i * 0.56;
    await pic(s, 'FaCircleCheck', HEX.accent1, { x: M, y: y + 0.03, w: 0.32, h: 0.32 });
    T(s, GATES[i], M + 0.5, y, 5.3, 0.38);
  }
  // the phone (an illustration)
  const fx = 6.75, fy = 1.8, fwid = 3.15;
  box(s, fx, fy, fwid, 4.45, { fill: C.background1, line: C.text2, r: 0.3, sh: true });
  s.addShape(S.ROUNDED_RECTANGLE, { x: fx + fwid / 2 - 0.4, y: fy + 0.14, w: 0.8, h: 0.1, rectRadius: 0.05, fill: { color: C.text2 }, line: { type: 'none' } });
  num(s, 5, fx + 0.25, fy + 0.38, 0.42, C.text2, C.background1, 14);
  T(s, 'Register your vehicle', fx + 0.78, fy + 0.38, fwid - 0.95, 0.42, { fontSize: 16, bold: true, color: C.text2, valign: 'middle' });
  const FIELDS = [['Car plate number', ''], ['IU / OBU number', '10 digits'], ['Email address', ''], ['Autopass card', '16 digits · foreign cars']];
  FIELDS.forEach(([f, hint], i) => {
    const y = fy + 0.98 + i * 0.74;
    box(s, fx + 0.22, y, fwid - 0.44, 0.64, { fill: C.background2, r: 0.08 });
    T(s, f, fx + 0.36, y + (hint ? 0.05 : 0), fwid - 0.7, hint ? 0.28 : 0.64, { fontSize: 16, bold: true, color: C.text2, valign: hint ? 'top' : 'middle' });
    if (hint) T(s, hint, fx + 0.36, y + 0.33, fwid - 0.7, 0.28, { fontSize: 16, color: C.accent6 });
  });
  s.addText('Register', { shape: S.ROUNDED_RECTANGLE, x: fx + 0.22, y: fy + 3.9 - 0.02, w: fwid - 0.44, h: 0.42, rectRadius: 0.1,
    fill: { color: C.accent1 }, line: { type: 'none' }, color: C.background1, fontSize: 16, bold: true, align: 'center', valign: 'middle', margin: 0 });
  T(s, 'Illustration, not the real screen', fx, fy + 4.55, fwid, 0.32, { fontSize: 16, italic: true, color: C.accent6, align: 'center' });
  // what happens next
  const ox = 10.2, ow = W - M - ox;
  T(s, 'Then', ox, 1.85, ow, 0.36, { bold: true, color: C.accent1, charSpacing: 1 });
  const NEXT = [['FaTicket', 'Tickets allocated from the pool'], ['FaEnvelope', 'Email with an edit link'], ['FaClock', '~30 min to sync to the car park']];
  for (let i = 0; i < 3; i++) {
    const y = 2.4 + i * 1.4;
    await badge(s, NEXT[i][0], ox, y, 0.58, C.accent4, HEX.accent1);
    T(s, NEXT[i][1], ox + 0.75, y - 0.02, ow - 0.75, 0.95);
    if (i < 2) arrow(s, ox + 0.29, y + 0.66, ox + 0.29, y + 1.34, C.accent1, 1.5);
  }
  notes(s, '1:15', `Steps four and five get the cars onto the event.

Step four: the organiser can register vehicles themselves, or generate a public registration link and send it to attendees. The link has the form "digipass-register-vehicle, public, token". It only works while four things hold: the token is valid, the registration deadline has not passed, the event is still active, and there are tickets left in the pool.

Step five: the guest opens the link, for example on their phone, and enters the car plate number, the ten-digit IU or OBU number, and an email address. Foreign vehicles can enter a sixteen-digit Autopass card number. There is no app to install. The phone on the slide is an illustration, not the actual portal screen.

When the registration succeeds, the system allocates one or more tickets from the event's pool to that car, sends a confirmation email with a link for editing the vehicle details, and tells the driver to allow about thirty minutes for the details to sync to the car park system.`,
  'Once registered, there\'s a short wait, and the driver gets some control.',
  ['Can foreign cars use it? Yes: the form accepts a 16-digit Autopass card number.',
   'Does the guest need an app? No. Registration is a public web link.']);

  // 7 ── step 6 + self-service ──────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Workflow', 'STEP 6 · SYNC AND SELF-SERVICE', 'Drivers stay in control of their tickets');
  rail(s, [6]);
  const lw = 5.6;
  box(s, M, 1.8, lw, 4.85, { fill: C.background2 });
  T(s, 'Every change takes time to reach the gate', M + 0.35, 2.02, lw - 0.6, 0.4, { bold: true, color: C.text2 });
  await badge(s, 'FaGlobe', M + 0.55, 2.62, 0.85, C.background1, HEX.accent1);
  T(s, 'Parking portal', M + 0.15, 3.55, 1.65, 0.58, { fontSize: 16, bold: true, color: C.text2, align: 'center' });
  await badge(s, 'FaSquareParking', M + lw - 1.4, 2.62, 0.85, C.background1, HEX.accent1);
  T(s, 'Car park system (EPS)', M + lw - 1.8, 3.55, 1.65, 0.58, { fontSize: 16, bold: true, color: C.text2, align: 'center' });
  arrow(s, M + 1.55, 3.05, M + lw - 1.55, 3.05, C.accent1, 2.5);
  T(s, '≈ 30 min', M + 1.55, 2.48, lw - 3.1, 0.5, { fontSize: 28, bold: true, color: C.accent1, align: 'center' });
  const SELF = [['FaPenToSquare', 'Drivers edit the plate or IU/OBU from the email link'],
                ['FaClock', 'Allow about 30 minutes before the car park can recognise the car'],
                ['FaLock', 'Once every ticket is used, details can no longer be changed']];
  for (let i = 0; i < 3; i++) {
    const y = 4.4 + i * 0.73;
    await pic(s, SELF[i][0], HEX.accent1, { x: M + 0.35, y: y + 0.04, w: 0.32, h: 0.32 });
    T(s, SELF[i][1], M + 0.85, y, lw - 1.1, 0.66);
  }
  const rx = M + lw + 0.4, rw = W - M - rx;
  T(s, 'In the edit page, one switch decides each exit:', rx, 1.85, rw, 0.38, { bold: true, color: C.text2 });
  T(s, '"Use a ticket on your next exit"', rx, 2.3, rw, 0.44, { fontSize: 22, bold: true, italic: true, color: C.accent1 });
  const SW = [[true, 'ON', 'The next eligible exit uses one ticket.'], [false, 'OFF', 'The ticket is saved for later; this visit is charged as normal parking.']];
  for (let i = 0; i < 2; i++) {
    const [on, lab, text] = SW[i], y = 3.0 + i * 1.85;
    box(s, rx, y, rw, 1.6, { fill: on ? C.accent3 : C.background2, tr: on ? 88 : undefined, line: on ? C.accent3 : C.accent6 });
    s.addShape(S.ROUNDED_RECTANGLE, { x: rx + 0.4, y: y + 0.52, w: 1.1, h: 0.56, rectRadius: 0.28, fill: { color: on ? C.accent3 : C.accent6 }, line: { type: 'none' } });
    s.addShape(S.OVAL, { x: rx + (on ? 0.98 : 0.46), y: y + 0.58, w: 0.44, h: 0.44, fill: { color: C.background1 }, line: { type: 'none' } });
    T(s, lab, rx + 1.75, y + 0.28, 1.2, 0.4, { fontSize: 20, bold: true, color: on ? C.accent3 : C.accent6 });
    T(s, text, rx + 1.75, y + 0.74, rw - 1.9, 0.7);
  }
  notes(s, '1:00', `Step six is the sync, and it is also where drivers take control.

Registration happens on the Re Sustainability parking portal, but the gate is run by the car park system, the EPS. The portal tells people to allow about thirty minutes for new or changed details to sync, so the car park may not recognise the car until then.

The confirmation email carries an edit link. With it, the driver can change the plate or the IU or OBU number. Once every ticket on that car is used up, the details can no longer be changed.

The same page has one important switch: "Use a ticket on your next exit". With it on, the next eligible exit uses one ticket. With it off, the ticket is saved for a later exit and that visit is charged as normal parking.`,
  'So what actually happens at the exit?',
  ['What if a car arrives before the sync finishes? We don\'t know. Manual release and compensation in that case is open question 9.']);

  // 8 ── step 7: exit (inferred) ──────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Workflow', 'STEP 7 · EXIT REDEMPTION', 'What happens at the exit');
  rail(s, [7]);
  chip(s, 'Inferred from portal behaviour · to confirm with Re Sustainability and the car park operator', M, 1.65, 10.4);
  const nw = 2.0, ng = (CW - 5 * nw) / 4, ny = 2.35, nh = 1.55;
  const NODES = [
    [[{ text: 'EPS reads IU/OBU and plate ', options: { bold: true } }, { text: 'at entry or exit', options: { bold: false } }], 'read'],
    ['Valid DigiPass on this vehicle?', 'q'],
    ['Dates, car park, tickets OK?', 'q'],
    ['"Use Ticket" switched on?', 'q'],
    ['Redeem one ticket at the exit', 'ok'],
  ];
  const nx = i => M + i * (nw + ng);
  for (let i = 0; i < 5; i++) {
    const [t1, kind] = NODES[i], x = nx(i);
    const fill = kind === 'read' ? C.text2 : kind === 'ok' ? C.accent3 : C.accent5;
    box(s, x, ny, nw, nh, { fill, line: kind === 'q' ? C.accent2 : null, r: 0.14 });
    T(s, t1, x + 0.12, ny, nw - 0.24, nh, { bold: true, color: kind === 'q' ? C.text2 : C.background1, align: 'center', valign: 'middle' });
    if (i < 4) {
      arrow(s, x + nw + 0.04, ny + nh / 2, x + nw + ng - 0.04, ny + nh / 2, i === 0 ? C.text2 : C.accent3, 2);
      if (i > 0) T(s, 'Yes', x + nw - 0.05, ny + nh / 2 - 0.38, ng + 0.1, 0.32, { fontSize: 16, bold: true, color: C.accent3, align: 'center' });
    }
  }
  const rx5 = nx(4);                                 // the record, under the redemption
  arrow(s, rx5 + nw / 2, ny + nh + 0.04, rx5 + nw / 2, 4.4 - 0.04, C.accent3, 2);
  box(s, rx5, 4.4, nw, 1.55, { fill: C.background1, line: C.accent3 });
  await pic(s, 'FaListCheck', HEX.accent3, { x: rx5 + nw / 2 - 0.18, y: 4.52, w: 0.36, h: 0.36 });
  T(s, 'Record car park, exit and time', rx5 + 0.12, 4.95, nw - 0.24, 0.95, { bold: true, color: C.text2, align: 'center' });
  const by = 4.8, bx1 = nx(1), bx2 = nx(3) + nw;    // the "no" branches into normal charging
  for (let i = 1; i <= 3; i++) {
    const cx = nx(i) + nw / 2;
    arrow(s, cx, ny + nh + 0.04, cx, by - 0.04, C.accent6, 2);
    T(s, 'No', cx + 0.12, ny + nh + 0.22, 0.5, 0.32, { fontSize: 16, bold: true, color: C.accent6 });
  }
  box(s, bx1, by, bx2 - bx1, 0.8, { fill: C.background2, line: C.accent6 });
  T(s, 'Normal parking charges apply', bx1, by, bx2 - bx1, 0.8, { fontSize: 20, bold: true, color: C.text2, align: 'center', valign: 'middle' });
  T(s, 'Expected order, based on how the portal behaves. Matching priority, retries and reversals are not visible from outside.',
    M, 6.15, CW, 0.65, { fontSize: 16, color: C.accent6 });
  notes(s, '1:15', `Step seven is the moment that matters to the driver: leaving the car park. This slide is orange because it is our inference from how the portal behaves and how these car parks recognise cars. Re Sustainability or the car park operator needs to confirm it.

The expected order is: the EPS reads the car's IU or OBU and its plate, at the entry or the exit. It looks for a valid DigiPass bound to that vehicle. It checks the event dates, whether this car park is covered, and whether there are tickets left. Then it checks whether the driver's "Use Ticket" switch is on.

If all of that holds, one ticket is redeemed as the car exits, and the system records the car park, the exit and the time. If any check fails, the exit is charged under the normal parking rules.

What we cannot see from outside is the full matching priority at the exit, and how failures, retries and reversals against normal parking transactions are handled.`,
  'And while tickets are being used, the organiser manages the pool.',
  ['What if the IU or OBU can\'t be read? Unknown. That is open question 5.',
   'What if the car also has another pass? Which entitlement is used first is open question 8.']);

  // 9 ── step 8 ─────────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Workflow', 'STEP 8 · ONGOING MANAGEMENT', 'Track, top up, refund and report');
  rail(s, [8]);
  const dw = 4.6;
  box(s, M, 1.8, dw, 4.85, { fill: C.background1, line: EDGE, sh: true });
  T(s, 'Event ticket pool', M + 0.35, 2.02, 2.6, 0.42, { fontSize: 20, bold: true, color: C.text2 });
  T(s, 'Illustration', M + dw - 1.85, 2.07, 1.5, 0.32, { fontSize: 16, color: C.accent6, align: 'right', italic: true });
  const bw2 = dw - 0.7, seg = [[0.45, C.accent3, 'Used'], [0.3, C.accent1, 'Allocated, not used yet'], [0.25, C.accent4, 'Left']];
  let sx = M + 0.35;
  for (const [f, col] of seg) { s.addShape(S.RECTANGLE, { x: sx, y: 2.7, w: bw2 * f, h: 0.5, fill: { color: col }, line: col === C.accent4 ? { color: C.accent1, width: 1 } : { type: 'none' } }); sx += bw2 * f; }
  seg.forEach(([, col, lab], i) => {
    const y = 3.42 + i * 0.46;
    s.addShape(S.RECTANGLE, { x: M + 0.35, y: y + 0.06, w: 0.26, h: 0.26, fill: { color: col }, line: col === C.accent4 ? { color: C.accent1, width: 1 } : { type: 'none' } });
    T(s, lab, M + 0.8, y, dw - 1.15, 0.38);
  });
  T(s, 'Redemption log', M + 0.35, 4.95, dw - 0.7, 0.38, { bold: true, color: C.text2 });
  box(s, M + 0.35, 5.42, dw - 0.7, 0.48, { fill: C.accent4, r: 0.08 });
  ['Car park', 'Exit', 'Time'].forEach((h, i) => T(s, h, M + 0.55 + i * 1.3, 5.42, 1.2, 0.48, { fontSize: 16, bold: true, color: C.text2, valign: 'middle' }));
  T(s, 'One row per ticket used', M + 0.35, 6.02, dw - 0.7, 0.32, { fontSize: 16, color: C.accent6 });
  const ACTIONS = [
    ['FaUsers', 'Registrations', 'See which vehicles are registered'],
    ['FaChartColumn', 'Pool balance', 'Allocated, used and remaining'],
    ['FaListCheck', 'Redemption history', 'Each use: car park, exit, time'],
    ['FaCirclePlus', 'Top-up', 'Buy more tickets for the event'],
    ['FaRotateLeft', 'Refund requests', 'To confirm: allocated tickets after a refund'],
    ['FaFileExport', 'Reports', 'Export transaction and usage reports'],
  ];
  const ax = M + dw + 0.4, aw = (W - M - ax - 0.3) / 2, ah = 1.4;
  T(s, 'Organisers and admins can', ax, 1.8, 6, 0.38, { bold: true, color: C.text2 });
  for (let i = 0; i < 6; i++) {
    const x = ax + (i % 2) * (aw + 0.3), y = 2.25 + Math.floor(i / 2) * (ah + 0.1), refund = i === 4;
    box(s, x, y, aw, ah, refund ? { fill: C.accent5, line: C.accent2 } : { fill: C.background2 });
    await badge(s, ACTIONS[i][0], x + 0.22, y + 0.22, 0.56, refund ? C.background1 : C.accent4, refund ? HEX.accent2 : HEX.accent1);
    if (refund) bang(s, x + aw - 0.24, y - 0.1);
    T(s, ACTIONS[i][1], x + 0.95, y + 0.17, aw - 1.05, 0.38, { bold: true, color: C.text2 });
    T(s, ACTIONS[i][2], x + 0.95, y + 0.55, aw - 1.1, 0.8, { fontSize: 16, color: refund ? C.text1 : C.accent6 });
  }
  notes(s, '1:00', `Step eight is ongoing management, during and after the event, for organisers and admins.

On the left is the idea, not real data: the pool splits into tickets used, tickets allocated but not used yet, and tickets left. Each use is logged with the car park, the exit and the time.

From the portal they can see which vehicles are registered, check the allocated, used and remaining tickets, and look through the redemption history. They can top up the pool with more tickets, make refund requests, and export transaction and usage reports.

One gap: what happens to tickets already allocated when a refund is made is not visible from the portal. Re Sustainability needs to confirm it.`,
  'Let me pull that together.',
  ['Can unused tickets be refunded after the event? Not known. That is open question 11.']);

  // 10 ── takeaways ────────────────────────────────────────────────────────────────────────────
  pres.addSection({ title: 'Summary' });
  s = slide('CONTENT', 'Summary', 'SUMMARY', 'Key takeaways');
  const HL = [
    ['FaBullseye', 'Event-based', 'For an event, not a monthly pass'],
    ['FaLayerGroup', 'Shared pool', 'Many cars share prepaid tickets'],
    ['FaCar', 'No QR at gate', 'Cars recognised by plate and IU/OBU'],
    ['FaLink', 'Self-service', 'Guests register by token link; no app'],
    ['FaToggleOff', 'Save for later', 'Switch Use Ticket off to keep a ticket'],
    ['FaClock', '30-minute sync', 'Changes reach the gate in ~30 min'],
    ['FaListCheck', 'Full trail', 'Each use logs car park, exit and time'],
    ['FaArrowsSpin', 'Full lifecycle', 'Buy, top up, redeem, refund, report'],
  ];
  const hw = (CW - 3 * 0.3) / 4, hh = 2.3;
  for (let i = 0; i < 8; i++) {
    const x = M + (i % 4) * (hw + 0.3), y = 1.8 + Math.floor(i / 4) * (hh + 0.25);
    box(s, x, y, hw, hh, { fill: C.accent4 });
    await badge(s, HL[i][0], x + 0.3, y + 0.28, 0.6, C.accent1, HEX.lt1);
    T(s, HL[i][1], x + 0.3, y + 1.0, hw - 0.45, 0.4, { fontSize: 20, bold: true, color: C.text2 });
    T(s, HL[i][2], x + 0.3, y + 1.45, hw - 0.45, 0.75);
  }
  notes(s, '0:30', `If people remember only eight things, these are the ones.

It is event-based, not a monthly season pass. It is a shared pool: many prepaid tickets spread across many cars. There is no QR code at the gate; the car is recognised by its plate and IU or OBU. Registration is self-service through a public token link, with no app to install.

Drivers can save a ticket for later by switching "Use Ticket" off. Any registration or change needs about thirty minutes to sync to the car park. Every use is logged with the car park, the exit and the time. And the portal covers the lifecycle: purchase, allocation, top-up, redemption, refunds and reports.`,
  'It\'s worth being precise about which of this we actually saw.');

  // 11 ── confirmed vs inferred ───────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Summary', 'WHAT WE KNOW', 'Seen in the portal, and what we inferred');
  const KNOWN = [
    'Events have a name, description and dates',
    'Ticket counts: bought, allocated and used',
    'Organisers can share a public registration link',
    'Guests register plate, IU/OBU or Autopass, email',
    'A confirmation email with an edit link is sent',
    'The page asks for about 30 minutes to sync',
    'Drivers choose whether to use a ticket on next exit',
    'The history of ticket uses is kept',
    'The portal has top-up and refund functions',
  ];
  const INFER = [
    'Approval levels for a DigiPass',
    'How payment relates to activating the pool',
    'Full matching priority at the EPS exit',
    'Reversals, make-up charges and retries against normal parking',
    'What happens to allocated tickets after a refund',
  ];
  const kw = 7.0;
  box(s, M, 1.8, kw, 4.85, { fill: C.accent4 });
  await badge(s, 'FaCircleCheck', M + 0.3, 2.0, 0.55, C.accent1, HEX.lt1, 0.55);
  T(s, 'Seen in the public portal', M + 1.0, 2.05, kw - 1.3, 0.45, { fontSize: 20, bold: true, color: C.accent1, valign: 'middle' });
  const tick = await icon('FaCheck', HEX.accent1);
  KNOWN.forEach((k, i) => {
    const y = 2.75 + i * 0.425;
    s.addImage({ data: tick, altText: 'check icon', x: M + 0.38, y: y + 0.06, w: 0.24, h: 0.24 });
    T(s, k, M + 0.8, y, kw - 1.0, 0.38);
  });
  const ix = M + kw + 0.35, iw = W - M - ix;
  box(s, ix, 1.8, iw, 4.85, { fill: C.accent5 });
  await badge(s, 'FaQuestion', ix + 0.3, 2.0, 0.55, C.accent2, HEX.lt1, 0.5);
  T(s, 'Inferred: Re Sustainability to confirm', ix + 1.0, 1.95, iw - 1.2, 0.72, { fontSize: 20, bold: true, color: C.text2, valign: 'middle' });
  let iy = 2.85;
  for (const k of INFER) {
    const lines = Math.ceil(k.length * 0.112 / (iw - 1.05));
    s.addShape(S.OVAL, { x: ix + 0.4, y: iy + 0.11, w: 0.16, h: 0.16, fill: { color: C.accent2 }, line: { type: 'none' } });
    T(s, k, ix + 0.75, iy, iw - 1.0, lines * 0.3 + 0.05);
    iy += lines * 0.3 + 0.2;
  }
  notes(s, '1:00', `It is worth being precise about what we actually know.

On the left, in blue, is what the public portal shows directly. Events have a name, description and dates. The prepaid ticket count, allocations and uses are tracked. Organisers can share a public registration link. Guests register their plate, IU, OBU or Autopass, and an email. A confirmation email with an edit link goes out. The page asks for about thirty minutes to sync. Drivers choose whether to use a ticket on their next exit. The history of ticket uses is kept. And there are top-up and refund functions.

On the right, in orange, is what we inferred from that behaviour. The approval levels. How payment relates to the pool becoming active. The full matching priority at the exit. How reversals, make-up charges and retries work against normal parking transactions. And what happens to tickets already allocated when a refund is made.`,
  'Those gaps turn into twelve concrete questions.');

  // 12 ── open questions ─────────────────────────────────────────────────────────────────────────
  pres.addSection({ title: 'Before we build' });
  s = slide('CONTENT', 'Before we build', 'OPEN QUESTIONS', 'Twelve rules Re Sustainability needs to confirm');
  const QS = [   // numbered in reading order; the source's own numbers are in the notes
    ['FaCoins', 'Coverage and pricing', ['Does one ticket cover the full fee, or a fixed amount?', 'Which car parks and exits accept DigiPass?',
      'Is there a maximum parking time?', 'What if a stay crosses the event\'s start or end date?']],
    ['FaCar', 'Vehicles', ['Cars with no IU/OBU, or a failed read: what happens?', 'Can one car join several active DigiPass events at once?',
      'Duplicate registrations, plate changes, wrong emails?']],
    ['FaTriangleExclamation', 'Priority and exceptions', ['Several entitlements apply: which one is used first?',
      'Registered but not yet synced: manual release and compensation?', 'Approval flow for refunds, cancellations, reversals and exceptions?']],
    ['FaUserShield', 'Refunds and roles', ['Can unused tickets be refunded after the event?',
      'Permissions for organisers, approvers, finance and car park support?']],
  ];
  const ROW = 0.33, PAD = 0.08, GW = 3.0;            // one row pitch for every band, so all rows line up the same way
  let qy = 1.68, qn = 1;
  for (const [ic, head, items] of QS) {
    const h = Math.max(items.length * ROW + 2 * PAD, 0.84);
    box(s, M, qy, CW, h, { fill: C.accent5 });
    await badge(s, ic, M + 0.2, qy + 0.12, 0.44, C.accent2, HEX.lt1);
    T(s, head, M + 0.8, qy + 0.08, GW - 0.9, h - 0.12, { bold: true, color: C.text2 });
    items.forEach((q, j) => {
      const y = qy + PAD + j * ROW;
      s.addText(String(qn++), { shape: S.ROUNDED_RECTANGLE, x: M + GW, y: y + 0.02, w: 0.42, h: 0.28, rectRadius: 0.14,
        fill: { color: C.background1 }, line: { type: 'none' }, color: C.accent2, fontSize: 14, bold: true, align: 'center', valign: 'middle', margin: 0 });
      T(s, q, M + GW + 0.55, y, CW - GW - 0.7, ROW, { valign: 'top' });
    });
    qy += h + 0.08;
  }
  notes(s, '1:30', `Before anyone designs or builds on this, twelve rules need a clear answer from Re Sustainability.

Coverage and pricing: does one ticket cover the whole parking fee, or only a fixed amount? Which car parks and exits accept DigiPass? Is there a maximum parking time? And what happens when a stay crosses the event's start or end date?

Vehicles: how are cars with no IU or OBU, or a failed read, handled? Can one car be in several active DigiPass events at the same time? How are duplicate registrations, plate changes and wrong email addresses handled?

Priority and exceptions: when several entitlements apply at once, which is used first? If a registration has succeeded but the EPS has not synced yet, what is the manual release and compensation process? And what is the approval flow for refunds, cancellations, reversals and other exceptions?

Refunds and roles: can unused tickets be refunded after the event? And how are permissions split between organisers, approvers, finance staff and car park customer service?

Numbering on this slide runs in reading order. In the source document (section 6) the same questions are numbered: slide 1 = source 1, 2 = 2, 3 = 3, 4 = 4, 5 = 6, 6 = 7, 7 = 9, 8 = 8, 9 = 10, 10 = 11, 11 = 5, 12 = 12.`,
  'If we ever build something like this, here\'s a starting point.');

  // 13 ── data model ─────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Before we build', 'IF WE BUILD IT', 'A proposed data model for ParkOps or a similar platform');
  chip(s, 'Proposal · not Re Sustainability\'s own schema', W - M - 5.5, 0.36, 5.5, 'neutral');
  const L = [['DigiPassOrder', 'Quantity, price, payment and approval status'], ['TopUpTransaction', 'Additional tickets bought for the event'],
             ['RefundRequest', 'Refunds for unused tickets or exceptions']];
  const R = [['RegistrationToken', 'Public link, token and expiry'], ['RegisteredVehicle', 'Plate, IU/OBU, Autopass and email'],
             ['TicketAllocation', 'Tickets given to each vehicle'], ['TicketRedemption', 'Car park, exit, time, transaction']];
  const lw2 = 3.7, lx = M, rx2 = 8.55, rw2 = W - M - rx2;
  T(s, 'COMMERCIAL', lx, 1.7, lw2, 0.32, { fontSize: 16, bold: true, color: C.accent6, charSpacing: 2 });
  T(s, 'OPERATIONAL', rx2, 1.7, rw2, 0.32, { fontSize: 16, bold: true, color: C.accent6, charSpacing: 2 });
  const ev = [4.85, 3.0, 3.15, 1.75];               // DigiPassEvent box
  L.forEach(([n, d], i) => {
    const y = 2.1 + i * 1.3;
    box(s, lx, y, lw2, 1.12, { fill: C.background2 });
    T(s, n, lx + 0.25, y + 0.1, lw2 - 0.5, 0.36, { bold: true, color: C.text2 });
    T(s, d, lx + 0.25, y + 0.47, lw2 - 0.5, 0.6, { fontSize: 16, color: C.accent6 });
    line(s, lx + lw2, y + 0.56, ev[0], ev[1] + ev[3] / 2, C.accent1, 1.5);
  });
  R.forEach(([n, d], i) => {
    const y = 2.1 + i * 1.0;
    box(s, rx2, y, rw2, 0.84, { fill: C.background2 });
    T(s, n, rx2 + 0.25, y + 0.08, rw2 - 0.5, 0.36, { bold: true, color: C.text2 });
    T(s, d, rx2 + 0.25, y + 0.45, rw2 - 0.5, 0.32, { fontSize: 16, color: C.accent6 });
    if (i < 3) arrow(s, rx2 + rw2 / 2, y + 0.84, rx2 + rw2 / 2, y + 1.0, C.accent1, 1.5);
  });
  box(s, ...ev, { fill: C.text2, sh: true });
  T(s, 'DigiPassEvent', ev[0] + 0.2, ev[1] + 0.22, ev[2] - 0.4, 0.4, { fontSize: 20, bold: true, color: C.background1, align: 'center' });
  T(s, 'Name, description, valid dates and registration deadline', ev[0] + 0.2, ev[1] + 0.7, ev[2] - 0.4, 0.95, { fontSize: 16, color: C.accent4, align: 'center' });
  arrow(s, ev[0] + ev[2], ev[1] + 0.45, rx2, 2.52, C.accent1, 1.5);
  box(s, M, 6.15, CW, 0.6, { fill: C.accent1, r: 0.1 });
  T(s, 'AuditLog', M + 0.25, 6.15, 1.6, 0.6, { bold: true, color: C.background1, valign: 'middle' });
  T(s, 'The trail of every create, approve, edit, allocate, redeem and refund, across all objects', M + 1.85, 6.15, CW - 2.1, 0.6,
    { fontSize: 16, color: C.background1, valign: 'middle' });
  notes(s, '0:45', `The source suggests that if a similar feature is needed in ParkOps or another parking platform, these are the core objects to start from. It is a proposal, not Re Sustainability's own schema.

At the centre is the DigiPass Event: its name, description, valid dates and registration deadline.

On the commercial side, each event has orders, with quantity, price, payment and approval status; top-up transactions for extra tickets; and refund requests for unused tickets or exceptions.

On the operational side, an event issues registration tokens, the public links with an expiry. Through them, vehicles are registered with plate, IU or OBU, Autopass and email. Each vehicle receives ticket allocations, and each use at the exit becomes a ticket redemption recording the car park, exit, time and the parking transaction.

Underneath everything sits an audit log of every create, approve, edit, allocate, redeem and refund.`,
  'To wrap up.');

  // 14 ── conclusion ─────────────────────────────────────────────────────────────────────────────
  pres.addSection({ title: 'Close' });
  s = slide('DARK', 'Close', 'CONCLUSION', 'The rules need Re Sustainability sign-off');
  T(s, 'DigiPass is an event-linked prepaid ticket pool: organisers buy tickets, guests register their cars, and the car park uses one ticket per eligible exit and logs it.',
    0.8, 2.2, 11.7, 0.95, { fontSize: 22, color: C.accent4 });
  box(s, 0.8, 3.4, 11.7, 1.05, { fill: C.background1, r: 0.12 });
  T(s, [{ text: 'Decision needed:', options: { bold: true, color: C.accent1, breakLine: true } },
        { text: 'agree to take the 12 open questions to Re Sustainability and the car park operator.', options: { color: C.text2 } }],
    1.1, 3.4, 11.1, 1.05, { fontSize: 20, valign: 'middle' });
  box(s, 0.8, 4.7, 11.7, 1.2, { fill: C.background1, tr: 90, line: C.accent1 });
  await pic(s, 'FaFileLines', HEX.accent4, { x: 1.1, y: 5.05, w: 0.5, h: 0.5 });
  T(s, [{ text: 'After Re Sustainability answers:', options: { breakLine: true } }, { text: 'turn the confirmed rules and the data model into a build spec' }], 1.9, 4.7, 10.3, 1.2,
    { fontSize: 20, color: C.background1, valign: 'middle' });
  T(s, 'Status: public-source research summary; explains the concept and flow, not yet a development spec.',
    0.8, 6.3, 11.7, 0.36, { fontSize: 16, color: C.accent4 });
  notes(s, '1:00', `To sum up. DigiPass is not a long-term pass. It is a prepaid ticket pool tied to an event: the organiser buys the tickets, guests register their cars, and the car park uses one ticket per eligible exit and keeps a full record.

What we have is enough to explain the concept and the main flow, but not enough for a final development spec. Billing, which car parks it covers, exception handling, refunds and the priority between entitlements all need Re Sustainability and the car park operator to confirm.

The decision I'm asking for today is agreement to take the twelve open questions to Re Sustainability and the car park operator. After Re Sustainability answers, we turn the confirmed rules and the data model into a build specification.

[Before presenting: say who will take the questions to Re Sustainability and by when. The research doesn't name an owner or a date, so none is on the slide.]

[For a version shown to the Re Sustainability team that owns these rules: hide slide 13 (our proposed data model) and change the Decision bar to "What we'd like from you: answers to the 12 questions".]`,
  'The sources are on the last slide if anyone wants them.');

  // 15 ── sources ───────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Close', 'SOURCES', 'Where this comes from');
  const HOME = 'https://nus-park.resustainability.com.sg/';
  const SRC = [    // icon, label, what it is, where the label links, the full source URL (in the notes)
    ['FaFileLines', 'NUS UCI parking information page', 'NUS public parking information', 'https://uci.nus.edu.sg/campus-life/campus-services/transportation/parking-information/'],
    ['FaFileLines', 'Re Sustainability parking portal page', 'Public portal home page', HOME],
    ['FaFileLines', 'Public DigiPass registration page', 'Where guests register a vehicle', HOME, 'https://nus-park.resustainability.com.sg/assets/DigiPassRegisterVehicle-Bn3PwUtW.js'],
    ['FaFileLines', 'Public DigiPass edit & redemption page', 'Where drivers edit details and ticket use', HOME, 'https://nus-park.resustainability.com.sg/assets/DigiPassEditVehicle-Dfa8Jr-f.js'],
    ['FaFilePdf', 'NUS car park locations page (PDF)', 'Map of NUS car parks, January 2024', 'https://uci.nus.edu.sg/wp-content/uploads/2024/03/Location-of-Carparks-as-at-Jan-2024-002-1.pdf'],
  ];
  for (const [i, [ic, name, desc, url]] of SRC.entries()) {
    const y = 1.8 + i * 0.86;
    box(s, M, y, CW, 0.74, { fill: i % 2 ? C.background1 : C.background2, line: EDGE });
    await pic(s, ic, HEX.accent1, { x: M + 0.3, y: y + 0.2, w: 0.34, h: 0.34 });
    T(s, [{ text: name, options: { hyperlink: { url }, color: C.accent1, bold: true } }], M + 0.9, y, 5.6, 0.74, { valign: 'middle' });
    T(s, desc, M + 6.6, y, CW - 6.8, 0.74, { fontSize: 16, color: C.accent6, valign: 'middle' });
  }
  T(s, 'Research compiled 21 October 2026 from public pages and the portal\'s public front-end modules.', M, 6.25, CW, 0.36, { fontSize: 16, color: C.accent6 });
  notes(s, '0:15', `For reference, these are the sources: the NUS University Campus Infrastructure parking information page, the Re Sustainability parking portal itself, the portal's two public DigiPass pages for vehicle registration and for vehicle editing and ticket use, and the NUS map of car park locations. All of it is public, compiled on 21 October 2026.

Full links:
${SRC.map(r => r[4] || r[3]).join('\n')}

The two DigiPass page labels link to the portal home; the URLs above are the public front-end modules they come from.`, '');
}

// pptxgenjs writes Office's stock palette into the theme; put the deck's own colours there.
async function applyTheme(file) {
  const fs = require('fs');
  const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }));
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const part = 'ppt/theme/theme1.xml';
  const slots = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
  const scheme = `<a:clrScheme name="${THEME.name}">` + slots.map(k => `<a:${k}><a:srgbClr val="${HEX[k]}"/></a:${k}>`).join('') + '</a:clrScheme>';
  const xml = (await zip.file(part).async('string')).replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, `$1${THEME.name}"`);
  if (!xml.includes(scheme)) throw new Error('no colour scheme in ' + part);
  zip.file(part, xml);
  for (const name of Object.keys(zip.files).filter(n => n.endsWith('.xml'))) {   // a scheme name in a hex-only option
    const bad = (await zip.file(name).async('string')).match(/srgbClr val="(?![0-9A-Fa-f]{6}")[^"]*"/);
    if (bad) throw new Error(`${name}: ${bad[0]}`);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

(async () => {
  await build();
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT);
  console.log('wrote', OUT);
})();
