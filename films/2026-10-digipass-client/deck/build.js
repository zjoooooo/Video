// Builds the client-facing Re Sustainability DigiPass deck: the workflow from
// "/Users/justin/Project/jev /output/nus-digipass-workflow.md" presented as the design, for the client's
// management and procurement team. The internal deck (films/2026-10-nus-digipass/deck) is the research version.
//
//   cd films/2026-10-digipass-client/deck && npm install && node build.js [out.pptx]
//
// Same look as the internal deck, but no status colours: blue is primary, green = a ticket used.
// Layout is 13.33 x 7.5 in. Body text is 18 pt, captions 16 pt; only the footer and step numbers are 14.
const pptxgen = require('pptxgenjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const Fa = require('react-icons/fa6');

const OUT = process.argv[2] || '/Users/justin/Project/jev /output/Re-Sustainability-DigiPass-Client.pptx';
const THEME = { name: 'Re Sustainability DigiPass', headFontFace: 'Arial', bodyFontFace: 'Arial', colors: {
  dk1: '1F2937', lt1: 'FFFFFF', dk2: '0B2A5B', lt2: 'F7F9FC', accent1: '1D5FD1', accent2: 'F26B1D', accent3: '16A34A',
  accent4: 'EAF2FD', accent5: 'FFF1E6', accent6: '4B5563', hlink: '1D5FD1', folHlink: '0B2A5B' } };
const HEX = THEME.colors;
const EDGE = 'D9E2EF';                                // 1 px border on near-white cards (no theme slot for it)
const W = 13.333, M = 0.6, CW = W - 2 * M;           // slide width, side margin, content width
const LOGO = require('path').join(__dirname, '../assets/re-logo.png');   // 302 x 160, transparent: keep it small
const LOGO_AR = 160 / 302;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'Re Sustainability DigiPass: client briefing';
pres.subject = 'Prepaid event parking with Re Sustainability DigiPass';
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
pres.defineSlideMaster({
  title: 'CONTENT', background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: 'kicker', type: 'body', x: M, y: 0.42, w: 6, h: 0.34, fontSize: 16, bold: true,
      color: C.accent1, charSpacing: 2, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.8, w: CW, h: 0.72, fontSize: 32, bold: true,
      color: C.text2, margin: 0, valign: 'top', align: 'left' }, text: '' } },
    { image: { path: LOGO, x: M, y: 7.0, w: 0.42, h: 0.42 * LOGO_AR, altText: 'Re Sustainability logo' } },
    { text: { text: 'Re Sustainability DigiPass', options: { x: M + 0.55, y: 6.98, w: 10.0, h: 0.3, fontSize: 14, color: C.accent6, margin: 0, valign: 'top' } } },
  ],
  slideNumber: { x: W - M - 0.8, y: 6.98, w: 0.8, h: 0.3, fontSize: 14, color: C.accent6, align: 'right', margin: 0 },
});
pres.defineSlideMaster({
  title: 'TITLE', background: { color: C.text2 },        // the band above 1.4 in holds the Re Sustainability logo
  objects: [
    { placeholder: { options: { name: 'kicker', type: 'body', x: 0.8, y: 1.45, w: 7.4, h: 0.62, fontSize: 16, bold: true,
      color: C.accent4, charSpacing: 2, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 2.25, w: 7.4, h: 2.0, fontSize: 60, bold: true,
      color: C.background1, margin: 0, valign: 'top', align: 'left' }, text: '' } },
    { placeholder: { options: { name: 'sub', type: 'body', x: 0.8, y: 4.4, w: 7.4, h: 0.45, fontSize: 24,
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
function arrow(s, x1, y1, x2, y2, color = C.accent6, width = 1.75) {
  s.addShape(S.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width, endArrowType: 'triangle' } });
}
function line(s, x1, y1, x2, y2, color = C.accent6, width = 1.5, dash) {
  s.addShape(S.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width, ...(dash ? { dashType: dash } : {}) } });
}
function chev(s, x, y, w = 0.18) {                  // the small chevron between columns
  s.addShape(S.CHEVRON, { x, y, w, h: 0.3, fill: { color: C.accent1 }, line: { type: 'none' } });
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
function logoTile(s, x, y, w = 1.1) {               // the red mark needs a white tile on the navy slides
  const h = w * LOGO_AR;
  s.addShape(S.ROUNDED_RECTANGLE, { x, y, w: w + 0.3, h: h + 0.2, rectRadius: 0.1, fill: { color: C.background1 }, line: { type: 'none' } });
  s.addImage({ path: LOGO, x: x + 0.15, y: y + 0.1, w, h, altText: 'Re Sustainability logo' });
}
function notes(s, time, body, next, qa = [], tail = '') {   // presenter notes: target time, script, likely questions, hand-off
  s.addNotes(`[About ${time}]\n\n${body}` + (qa.length ? '\n\nIf asked:\n' + qa.map(q => '- ' + q).join('\n') : '')
    + (next ? `\n\nTransition: "${next}"` : '') + (tail ? `\n\n${tail}` : ''));
}

const STEPS = [
  ['FaGear', 'Admin setup', 'Product, price, rules'],
  ['FaCalendarDays', 'Organiser applies', 'Event, dates and tickets'],
  ['FaFileCircleCheck', 'Approve & buy', 'Creates the pool'],
  ['FaLink', 'Share link', 'Link with a token'],
  ['FaCar', 'Register vehicle', 'IU/OBU, plate, email'],
  ['FaArrowsRotate', 'Sync to car park', '~30 min'],
  ['FaRoadBarrier', 'Redeem at exit', '1 ticket per exit'],
  ['FaChartColumn', 'Manage', 'Top-up and refunds'],
];

async function build() {
  // 1 ── title ──────────────────────────────────────────────────────────────────────────────────
  pres.addSection({ title: 'Introduction' });
  let s = slide('TITLE', 'Introduction', [{ text: 'PREPARED FOR MOUNT ALVERNIA HOSPITAL', options: { breakLine: true } }, { text: 'OCTOBER 2026' }], 'Re Sustainability DigiPass');
  s.addText('Prepaid event parking, made simple', { placeholder: 'sub' });
  logoTile(s, 0.8, 0.45);
  const tx = 8.4, tw0 = 4.1, ty = 2.8;                  // the ticket stack
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
  const PROMISE = [['FaMobileScreen', 'No app', 1.45], ['FaQrcode', 'No QR', 1.35], ['FaLayerGroup', 'One prepaid pool', 2.6]];
  let px0 = 0.8;                                        // the three promises, as icon + words
  for (const [ic, text, w] of PROMISE) {
    await badge(s, ic, px0, 5.5, 0.46, C.accent1, HEX.lt1, 0.52);
    T(s, text, px0 + 0.6, 5.5, w, 0.46, { color: C.accent4, valign: 'middle' });
    px0 += 0.6 + w + 0.2;
  }
  notes(s, '0:30', `Thank you for your time. Today I'll walk you through Re Sustainability DigiPass, and how it can work for Mount Alvernia Hospital: prepaid parking for events, conferences and department guests.

Three things to hold on to: your guests need no app, there is no QR code at the gate, and everything runs on one prepaid pool of tickets per event.

[Before the pitch: confirm that Mount Alvernia's car park system reads IU/OBU units and plates. DigiPass depends on it, so treat it as a go/no-go.]`,
  'Let me start with what it does for your team.');

  // 2 ── outcomes ─────────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Introduction', 'WHY DIGIPASS', 'What DigiPass does for your team');
  const OUTCOMES = [
    ['FaLink', 'Nothing to install', 'A web link for guests: no app, no QR code'],
    ['FaPenToSquare', 'Less admin', 'Guests register and edit their own cars'],
    ['FaTicket', 'Prepaid, counted per exit', 'Organisers pay up front; each redeemed exit uses one ticket'],
    ['FaListCheck', 'Full usage record', 'Car park, exit and time for every use'],
    ['FaCirclePlus', 'Top-ups and refunds', 'Top up the same event; request refunds in the portal'],
    ['FaChartColumn', 'One portal', 'Registrations, balances, history and reports'],
  ];
  T(s, 'For Mount Alvernia\'s events, conferences and department guests', M, 1.48, CW, 0.36, { color: C.accent6 });
  const ow3 = (CW - 2 * 0.3) / 3, oh = (6.65 - 2.05 - 0.3) / 2;
  for (let i = 0; i < 6; i++) {
    const x = M + (i % 3) * (ow3 + 0.3), y = 2.05 + Math.floor(i / 3) * (oh + 0.3);
    box(s, x, y, ow3, oh, { fill: C.accent4 });
    await badge(s, OUTCOMES[i][0], x + 0.25, y + 0.24, 0.58, C.accent1, HEX.lt1);
    T(s, OUTCOMES[i][1], x + 0.25, y + 0.95, ow3 - 0.4, 0.4, { fontSize: 20, bold: true, color: C.text2 });
    T(s, OUTCOMES[i][2], x + 0.25, y + 1.4, ow3 - 0.45, 0.66);
  }
  notes(s, '1:00', `Here is what DigiPass does for your team.

Your guests have nothing to install: they open a web link, with no app and no QR code. Your team does less admin, because guests register and edit their own cars. Tickets are prepaid by the organiser and counted per exit: each redeemed exit uses one ticket.

Every use is recorded with the car park, the exit and the time, so you have a full usage record. Organisers can top up the same event and make refund requests in the portal. And registrations, balances, history and reports all sit in one portal.`,
  'So what exactly is DigiPass?');

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
    ['FaCalendarCheck', 'Belongs to the event', 'Not to one driver, and not a monthly pass'],
    ['FaCar', 'Nothing to scan', 'Cars are recognised by plate and IU/OBU'],
    ['FaPeopleGroup', 'Built for events', 'Events, conferences and department guests'],
  ];
  const cw3 = (CW - 2 * 0.3) / 3;
  for (let i = 0; i < 3; i++) {
    const x = M + i * (cw3 + 0.3);
    box(s, x, 4.5, cw3, 2.1, { fill: C.background2 });
    await badge(s, FACTS[i][0], x + 0.3, 4.72, 0.6, C.accent4, HEX.accent1);
    T(s, FACTS[i][1], x + 0.3, 5.42, cw3 - 0.6, 0.4, { fontSize: 20, bold: true, color: C.text2 });
    T(s, FACTS[i][2], x + 0.3, 5.86, cw3 - 0.6, 0.66);
  }
  notes(s, '1:00', `The simplest way to think about DigiPass: a prepaid pool of parking tickets that belongs to one event.

Your organiser buys a batch of tickets. They sit in the event's pool. They are allocated to the cars of the people attending. And each time one of those cars makes an eligible exit, one ticket is used.

Three things to know. It belongs to the event, not to one driver, and it is not a monthly pass. There is nothing to scan at the gate: DigiPass works with car park systems that read the IU/OBU and plate, so the car is recognised by its plate and its IU or OBU unit. And it is built for events, conferences and department guests.`,
  'There are other pass types, so where does this one fit?');

  // 3 ── vs other passes ────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Introduction', 'HOW IT COMPARES', 'How DigiPass differs from other pass types');
  const PASSES = [
    ['FaCalendarDays', 'Season Pass', 'Monthly; bound to one user and one car'],
    ['FaUser', 'Guest Pass', 'One named visitor, on a set visit date'],
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
  notes(s, '1:00', `Compared with other common pass types, here is where DigiPass sits.

A Season Pass is long-term and monthly, bound to a user and a vehicle. A Guest Pass is for one named visitor on a set visit date. A Capped Rate Pass stops a single parking fee from rising past a set amount. A Post-paid Pass lets a driver park first and have a designated account settle later.

DigiPass is different in kind. Your organiser buys a batch of tickets up front and allocates them across many vehicles. It is per event rather than per month, many cars draw on one shared pool, and each eligible exit uses one ticket.`,
  'Here is how it works, end to end.');

  // 4 ── the eight steps (hero) ─────────────────────────────────────────────────────────────────────
  pres.addSection({ title: 'Workflow' });
  s = slide('CONTENT', 'Workflow', 'THE WORKFLOW', 'End to end in eight steps');
  const g8 = 0.1, w8 = (CW - 7 * g8) / 8, pad = 0.085;   // no chevrons: the numbers carry the order
  for (let i = 0; i < 8; i++) {
    const x = M + i * (w8 + g8), cx = x + w8 / 2;
    box(s, x, 1.8, w8, 3.5, { fill: C.accent4 });
    num(s, i + 1, cx - 0.25, 1.95, 0.5, C.text2, C.background1, 16);
    await badge(s, STEPS[i][0], cx - 0.48, 2.6, 0.96, C.background1, HEX.accent1, 0.48);
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

Set up, steps one to three. Your admin team configures the ticket product: price, who may apply, valid dates and which car parks it covers. An organiser applies for an event with its dates and the number of tickets. Once the application is approved and paid, the event gets its own ticket pool.

Register, steps four to six. The organiser shares a registration link that carries a token. Guests register their own car: plate, IU or OBU number and email. The details then sync to the car park system in about thirty minutes.

Use and manage, steps seven and eight. At the exit, if the driver's "Use Ticket" switch is on and the event, car park and tickets match, one ticket is used. Throughout, your organisers and admins can see every record, top up, handle refunds and export reports.`,
  'Let\'s take the steps in turn, starting with set-up.');

  // 5 ── steps 1–3 ───────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Workflow', 'STEPS 1–3 · SET UP', 'Setting up the event\'s ticket pool');
  rail(s, [1, 2, 3]);
  const COLS = [
    [1, 'Admin sets up the product', ['Ticket product', 'Price or rate plan', 'Roles allowed to apply', 'Valid dates', 'Car parks and rules'], 3.45],
    [2, 'Organiser applies', ['Event name, description', 'Event start and end dates', 'Number of tickets', 'Parking pass or rate plan', 'Registration deadline', 'Supporting attachments'], 3.95],
  ];
  let cx5 = M;
  for (const [n, head, items, cw] of COLS) {
    box(s, cx5, 1.8, cw, 4.85, { fill: C.background1, line: EDGE, sh: true });
    num(s, n, cx5 + 0.3, 2.02, 0.48, C.text2, C.background1, 16);
    T(s, head, cx5 + 0.95, 2.02, cw - 1.15, 0.66, { bold: true, color: C.text2 });
    items.forEach((item, j) => {
      const y = 2.95 + j * 0.58;
      box(s, cx5 + 0.3, y, cw - 0.6, 0.5, { fill: C.accent4, r: 0.1 });
      T(s, item, cx5 + 0.3 + 0.17, y, cw - 0.6 - 0.3, 0.5, { color: C.text2, valign: 'middle' });
    });
    if (n === 1) {                                  // fills the card's empty foot
      await pic(s, 'FaUserGear', HEX.accent6, { x: cx5 + 0.3, y: 6.05, w: 0.3, h: 0.3 });
      T(s, 'Set up by your admin team', cx5 + 0.7, 5.95, cw - 0.8, 0.5, { fontSize: 16, italic: true, color: C.accent6, valign: 'middle' });
    }
    chev(s, cx5 + cw + 0.09, 4.1);
    cx5 += cw + 0.35;
  }
  const pw3 = W - M - cx5;
  box(s, cx5, 1.8, pw3, 4.85, { fill: C.text2, sh: true });
  num(s, 3, cx5 + 0.3, 2.02, 0.48, C.accent1, C.background1, 16);
  T(s, 'Approved and paid', cx5 + 0.95, 2.02, pw3 - 1.15, 0.36, { bold: true, color: C.background1 });
  T(s, 'The event\'s own ticket pool', cx5 + 0.95, 2.4, pw3 - 1.15, 0.32, { fontSize: 16, color: C.accent4 });
  const POOL = [['FaTicket', 'Bought', 'total paid for', HEX.accent1], ['FaCar', 'Allocated', 'to vehicles', HEX.accent1],
                ['FaCircleCheck', 'Used', 'at exits', HEX.accent3], ['FaLayerGroup', 'Left', 'available', HEX.accent1]];
  for (let i = 0; i < 4; i++) {                     // the pool's ledger: four counters it keeps
    const x = cx5 + 0.3, y = 2.9 + i * 0.7, tw = pw3 - 0.6;
    box(s, x, y, tw, 0.6, { fill: C.background1, r: 0.08 });
    await pic(s, POOL[i][0], POOL[i][3], { x: x + 0.18, y: y + 0.12, w: 0.36, h: 0.36 });
    T(s, POOL[i][1], x + 0.7, y, 1.25, 0.6, { bold: true, color: C.text2, valign: 'middle' });
    T(s, POOL[i][2], x + 2.0, y, tw - 2.1, 0.6, { fontSize: 16, color: C.accent6, valign: 'middle' });
  }
  T(s, 'Every ticket is tracked from purchase to exit.', cx5 + 0.3, 5.8, pw3 - 0.6, 0.5, { fontSize: 16, color: C.accent4 });
  notes(s, '1:00', `Steps one to three build the event's ticket pool.

Step one is your admin team's job in the parking management platform: define the ticket product, its price or rate plan, which roles are allowed to apply, the valid dates, and which car parks and usage rules apply.

Step two: an event organiser, or another authorised user, submits a DigiPass application with the event name and description, the start and end dates, how many tickets they need, the parking pass or rate plan, a deadline for registering vehicles, and any supporting attachments.

Step three: once the application is approved and paid, the system creates a ticket pool just for this event. It keeps four numbers: tickets bought, tickets allocated to vehicles, tickets used at exits, and tickets left.`,
  'With the pool in place, your guests register their cars.');

  // 6 ── steps 4–5 ───────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Workflow', 'STEPS 4–5 · REGISTER', 'Guests register their own cars');
  rail(s, [4, 5]);
  num(s, 4, M, 1.85, 0.48, C.text2, C.background1, 16);
  T(s, 'The organiser shares a registration link', M + 0.65, 1.86, 5.3, 0.4, { fontSize: 20, bold: true, color: C.text2 });
  T(s, 'or registers the vehicles directly', M + 0.65, 2.28, 5.3, 0.32, { fontSize: 16, color: C.accent6 });
  box(s, M, 2.8, 5.75, 0.62, { fill: C.background2, line: C.accent1, r: 0.31 });
  await pic(s, 'FaLink', HEX.accent1, { x: M + 0.25, y: 2.94, w: 0.34, h: 0.34 });
  T(s, 'A registration link with its own token', M + 0.8, 2.8, 4.8, 0.62, { color: C.text2, valign: 'middle' });
  T(s, 'Built-in controls: the link works only while', M, 3.75, 5.75, 0.38, { bold: true, color: C.text2 });
  const GATES = ['the token is valid', 'it is before the registration deadline', 'the event is still on', 'tickets are left in the pool'];
  for (let i = 0; i < 4; i++) {
    const y = 4.3 + i * 0.52;
    await pic(s, 'FaCircleCheck', HEX.accent1, { x: M, y: y + 0.03, w: 0.32, h: 0.32 });
    T(s, GATES[i], M + 0.5, y, 5.3, 0.38);
  }
  const fx = 6.75, fy = 1.8, fwid = 3.15;               // the phone: a drawn wireframe, not a screenshot
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
  s.addText('Register', { shape: S.ROUNDED_RECTANGLE, x: fx + 0.22, y: fy + 3.88, w: fwid - 0.44, h: 0.42, rectRadius: 0.1,
    fill: { color: C.accent1 }, line: { type: 'none' }, color: C.background1, fontSize: 16, bold: true, align: 'center', valign: 'middle', margin: 0 });
  T(s, 'Simplified view', fx, fy + 4.55, fwid, 0.32, { fontSize: 16, italic: true, color: C.accent6, align: 'center' });
  const ox = 10.2, ow = W - M - ox;                     // what happens next
  T(s, 'Then', ox, 1.85, ow, 0.36, { bold: true, color: C.accent1, charSpacing: 1 });
  const NEXT = [['FaTicket', 'Tickets allocated from the pool'], ['FaEnvelope', 'Email with an edit link'], ['FaClock', '~30 min to sync to the car park']];
  for (let i = 0; i < 3; i++) {
    const y = 2.4 + i * 1.4;
    await badge(s, NEXT[i][0], ox, y, 0.58, C.accent4, HEX.accent1);
    T(s, NEXT[i][1], ox + 0.75, y - 0.02, ow - 0.75, 0.95);
    if (i < 2) arrow(s, ox + 0.29, y + 0.66, ox + 0.29, y + 1.34, C.accent1, 1.5);
  }
  notes(s, '1:00', `Steps four and five get the cars onto the event.

Step four: your organiser can register vehicles themselves, or generate a public registration link and send it to attendees. It has built-in controls: the link works only while the token is valid, it is before the registration deadline, the event is still on, and there are tickets left in the pool.

Step five: the guest opens the link and enters the car plate number, the ten-digit IU or OBU number and an email address. Foreign vehicles enter a sixteen-digit Autopass card number. There is nothing to install. The phone on the slide is a simplified view of the form.

Once registered, the car gets its tickets from the event's pool, the guest receives a confirmation email with an edit link, and the details sync to the car park in about thirty minutes.`,
  'Once registered, the driver stays in control.',
  ['Do guests need an app? No. Registration is a web link.',
   'Can foreign cars use it? Yes, with a 16-digit Autopass card number.']);

  // 7 ── step 6 + self-service ──────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Workflow', 'STEP 6 · SYNC AND SELF-SERVICE', 'Changes reach the gate in about 30 minutes');
  rail(s, [6]);
  const lw = 5.6;
  box(s, M, 1.8, lw, 4.85, { fill: C.background2 });
  T(s, 'From portal to gate', M + 0.35, 2.02, lw - 0.6, 0.4, { bold: true, color: C.text2 });
  await badge(s, 'FaGlobe', M + 0.55, 2.62, 0.85, C.background1, HEX.accent1);
  T(s, 'Parking portal', M + 0.15, 3.55, 1.65, 0.58, { fontSize: 16, bold: true, color: C.text2, align: 'center' });
  await badge(s, 'FaSquareParking', M + lw - 1.4, 2.62, 0.85, C.background1, HEX.accent1);
  T(s, 'Car park system', M + lw - 1.8, 3.55, 1.65, 0.58, { fontSize: 16, bold: true, color: C.text2, align: 'center' });
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
  notes(s, '0:45', `Step six is the sync, and it is also where drivers take control.

Registration happens on the parking portal, while the gate is run by the car park system. New or changed details reach the gate in about thirty minutes.

The confirmation email carries an edit link, so the driver can change the plate or the IU or OBU number themselves. Once every ticket on that car is used, the details are locked.

The same page has one switch: "Use a ticket on your next exit". With it on, the next eligible exit uses one ticket. With it off, the ticket is saved for a later exit and that visit is charged as normal parking.`,
  'So here is what happens at the exit.',
  ['How soon can a guest drive in after registering? Allow about 30 minutes for the details to reach the car park.']);

  // 8 ── step 7: exit ────────────────────────────────────────────────────────────────────────────
  s = slide('CONTENT', 'Workflow', 'STEP 7 · EXIT REDEMPTION', 'What happens at the exit');
  rail(s, [7]);
  const nw = 2.0, ng = (CW - 5 * nw) / 4, ny = 2.0, nh = 1.55;
  const NODES = [
    [[{ text: 'Car park reads IU/OBU and plate ', options: { bold: true } }, { text: 'at entry or exit', options: { bold: false } }], 'read'],
    ['Valid DigiPass on this vehicle?', 'q'],
    ['Dates, car park, tickets OK?', 'q'],
    ['"Use Ticket" switched on?', 'q'],
    ['Redeem one ticket at the exit', 'ok'],
  ];
  const nx = i => M + i * (nw + ng);
  for (let i = 0; i < 5; i++) {
    const [t1, kind] = NODES[i], x = nx(i);
    const fill = kind === 'read' ? C.text2 : kind === 'ok' ? C.accent3 : C.accent4;
    box(s, x, ny, nw, nh, { fill, line: kind === 'q' ? C.accent1 : null, r: 0.14 });
    T(s, t1, x + 0.12, ny, nw - 0.24, nh, { bold: true, color: kind === 'q' ? C.text2 : C.background1, align: 'center', valign: 'middle' });
    if (i < 4) {
      arrow(s, x + nw + 0.04, ny + nh / 2, x + nw + ng - 0.04, ny + nh / 2, i === 0 ? C.text2 : C.accent3, 2);
      if (i > 0) T(s, 'Yes', x + nw - 0.05, ny + nh / 2 - 0.38, ng + 0.1, 0.32, { fontSize: 16, bold: true, color: C.accent3, align: 'center' });
    }
  }
  const rx5 = nx(4);                                 // the record, under the redemption
  arrow(s, rx5 + nw / 2, ny + nh + 0.04, rx5 + nw / 2, 4.1 - 0.04, C.accent3, 2);
  box(s, rx5, 4.1, nw, 1.55, { fill: C.background1, line: C.accent3 });
  await pic(s, 'FaListCheck', HEX.accent3, { x: rx5 + nw / 2 - 0.18, y: 4.22, w: 0.36, h: 0.36 });
  T(s, 'Record car park, exit and time', rx5 + 0.12, 4.65, nw - 0.24, 0.95, { bold: true, color: C.text2, align: 'center' });
  const by = 4.45, bx1 = nx(1), bx2 = nx(3) + nw;    // the "no" branches into normal charging
  for (let i = 1; i <= 3; i++) {
    const cx = nx(i) + nw / 2;
    arrow(s, cx, ny + nh + 0.04, cx, by - 0.04, C.accent6, 2);
    T(s, 'No', cx + 0.12, ny + nh + 0.22, 0.5, 0.32, { fontSize: 16, bold: true, color: C.accent6 });
  }
  box(s, bx1, by, bx2 - bx1, 0.8, { fill: C.background2, line: C.accent6 });
  T(s, 'Normal parking charges apply', bx1, by, bx2 - bx1, 0.8, { fontSize: 20, bold: true, color: C.text2, align: 'center', valign: 'middle' });
  box(s, M, 6.0, CW, 0.62, { fill: C.accent4, r: 0.1 });
  await pic(s, 'FaTicket', HEX.accent1, { x: M + 0.25, y: 6.13, w: 0.36, h: 0.36 });
  T(s, 'Each redeemed exit uses one ticket, and every use is recorded.', M + 0.8, 6.0, CW - 1.0, 0.62, { color: C.text2, valign: 'middle' });
  notes(s, '1:00', `Step seven is the moment that matters to the driver: leaving the car park.

The car park system reads the car's IU or OBU and its plate, at the entry or the exit. It finds the valid DigiPass bound to that vehicle, checks the event dates, that this car park is covered and that tickets are left, and then checks the driver's "Use Ticket" switch.

If everything matches, one ticket is redeemed as the car exits, and the system records the car park, the exit and the time. If any check doesn't match, the exit is charged under the normal parking rules.`,
  'And your organisers manage the pool throughout.',
  ['Is there a QR code or ticket to show? No. The car is recognised by its IU or OBU and plate.',
   'What if the driver wants to keep a ticket? They switch "Use Ticket" off; that visit is charged normally and the ticket is kept.']);

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
    ['FaRotateLeft', 'Refund requests', 'Request refunds in the portal'],
    ['FaFileExport', 'Reports', 'Export transaction and usage reports'],
  ];
  const ax = M + dw + 0.4, aw = (W - M - ax - 0.3) / 2, ah = 1.4;
  T(s, 'Your organisers and admins can', ax, 1.8, 6, 0.38, { bold: true, color: C.text2 });
  for (let i = 0; i < 6; i++) {
    const x = ax + (i % 2) * (aw + 0.3), y = 2.25 + Math.floor(i / 2) * (ah + 0.1);
    box(s, x, y, aw, ah, { fill: C.background2 });
    await badge(s, ACTIONS[i][0], x + 0.22, y + 0.22, 0.56, C.accent4, HEX.accent1);
    T(s, ACTIONS[i][1], x + 0.95, y + 0.17, aw - 1.05, 0.38, { bold: true, color: C.text2 });
    T(s, ACTIONS[i][2], x + 0.95, y + 0.55, aw - 1.1, 0.8, { fontSize: 16, color: C.accent6 });
  }
  notes(s, '1:00', `Step eight is ongoing management, during and after the event.

On the left is an illustration of the idea: the pool splits into tickets used, tickets allocated but not used yet, and tickets left, and each use is logged with the car park, the exit and the time.

Your organisers and admins can see which vehicles are registered, check the allocated, used and remaining tickets, and look through the redemption history. They can top up the pool with more tickets for the same event, make refund requests, and export transaction and usage reports.`,
  'So what does getting started look like?',
  ['Can we buy more tickets during the event? Yes, through a top-up.',
   'Can we get usage reports? Yes, transaction and usage reports can be exported.']);

  // 11 ── what getting started looks like ─────────────────────────────────────────────────────────
  pres.addSection({ title: 'Close' });
  s = slide('CONTENT', 'Close', 'GETTING STARTED', 'What getting started looks like');
  const GO = [   // icon, step, what it involves, who does it
    ['FaGear', 'Set up your ticket products', 'Price plans, roles, valid dates and car parks', 'FaUserGear', 'Your admin team'],
    ['FaCalendarDays', 'Run your first event', 'Organiser applies, shares the link, guests register, exits are counted', 'FaUsers', 'Organisers and guests'],
    ['FaChartColumn', 'Track it in the portal', 'Allocations, exits, top-ups, refunds and reports', 'FaUserTie', 'Organisers and admins'],
  ];
  const gg = 0.45, gw = (CW - 2 * gg) / 3, gy = 1.9, gh = 4.45;
  for (let i = 0; i < 3; i++) {
    const x = M + i * (gw + gg);
    box(s, x, gy, gw, gh, { fill: i === 1 ? C.accent4 : C.background2 });
    num(s, i + 1, x + 0.3, gy + 0.35, 0.62, C.accent1, C.background1, 20);
    await badge(s, GO[i][0], x + gw - 0.95, gy + 0.33, 0.66, C.background1, HEX.accent1);
    T(s, GO[i][1], x + 0.3, gy + 1.3, gw - 0.6, 0.8, { fontSize: 22, bold: true, color: C.text2 });
    T(s, GO[i][2], x + 0.3, gy + 2.2, gw - 0.6, 1.0, { color: C.accent6 });
    line(s, x + 0.3, gy + 3.5, x + gw - 0.3, gy + 3.5, EDGE, 1);
    await pic(s, GO[i][3], HEX.accent1, { x: x + 0.3, y: gy + 3.72, w: 0.32, h: 0.32 });
    T(s, GO[i][4], x + 0.75, gy + 3.66, gw - 1.0, 0.44, { fontSize: 16, bold: true, color: C.accent1, valign: 'middle' });
    if (i < 2) chev(s, x + gw + (gg - 0.18) / 2, gy + gh / 2 - 0.15);
  }
  notes(s, '0:45', `Getting started follows the workflow you've just seen.

First, your admin team sets up the ticket products: price plans, the roles that can apply, valid dates and car parks. Second, run a first event: an organiser applies, shares the registration link, guests register, and exits are counted. Third, track it in the portal: allocations, exits, top-ups, refunds and reports.`,
  'Thank you.');

  // 12 ── thank you ─────────────────────────────────────────────────────────────────────────────
  s = slide('DARK', 'Close');
  logoTile(s, 0.8, 0.45, 0.85);
  T(s, 'Thank you', 0.8, 2.85, 7.2, 1.1, { fontSize: 60, bold: true, color: C.background1 });
  T(s, 'Questions welcome', 0.8, 4.0, 7.2, 0.5, { fontSize: 24, color: C.accent4 });
  const tx2 = 8.4, ty2 = 2.75;                          // the title slide's ticket, as a bookend
  s.addShape(S.ROUNDED_RECTANGLE, { x: tx2 + 0.35, y: ty2 - 0.8, w: 4.1, h: 2.0, rectRadius: 0.14, rotate: 9, fill: { color: C.accent1, transparency: 55 }, line: { type: 'none' } });
  s.addShape(S.ROUNDED_RECTANGLE, { x: tx2 + 0.2, y: ty2 - 0.45, w: 4.1, h: 2.0, rectRadius: 0.14, rotate: 4, fill: { color: C.accent1 }, line: { type: 'none' } });
  s.addShape(S.ROUNDED_RECTANGLE, { x: tx2, y: ty2, w: 4.1, h: 2.0, rectRadius: 0.14, fill: { color: C.background1 }, line: { type: 'none' }, shadow: shadow() });
  s.addShape(S.OVAL, { x: tx2 - 0.21, y: ty2 + 0.79, w: 0.42, h: 0.42, fill: { color: C.text2 }, line: { type: 'none' } });
  s.addShape(S.OVAL, { x: tx2 + 4.1 - 0.21, y: ty2 + 0.79, w: 0.42, h: 0.42, fill: { color: C.text2 }, line: { type: 'none' } });
  line(s, tx2 + 1.02, ty2 + 0.17, tx2 + 1.02, ty2 + 1.83, C.accent6, 1.5, 'dash');
  s.addText('P', { shape: S.OVAL, x: tx2 + 0.22, y: ty2 + 0.7, w: 0.6, h: 0.6, fill: { color: C.accent1 }, line: { type: 'none' },
    color: C.background1, fontSize: 24, bold: true, align: 'center', valign: 'middle', margin: 0 });
  T(s, 'DigiPass', tx2 + 1.25, ty2 + 0.25, 2.7, 0.45, { fontSize: 26, bold: true, color: C.text2 });
  T(s, 'Re Sustainability', tx2 + 1.25, ty2 + 0.75, 2.7, 0.3, { fontSize: 16, color: C.accent6 });
  T(s, 'Prepaid event parking', tx2 + 1.25, ty2 + 1.3, 2.75, 0.32, { fontSize: 16, bold: true, color: C.accent1 });
  notes(s, '0:30', `Thank you for your time, and thank you to the Mount Alvernia Hospital team. I'm happy to take questions.`, '',
  ['Can one car use several tickets? Yes: registration can allocate one or more tickets to a car, and each redeemed exit uses one.',
   'What happens when all of a car\'s tickets are used? Further exits are charged as normal parking, and the car\'s details can no longer be edited.',
   'Can the organiser register cars without sending a link? Yes, organisers can register vehicles themselves.'],
  `Questions you should be ready to answer yourself (prompts only; the deck makes no claims on these):
- Pricing model
- Implementation timeline
- Support arrangements
- Personal-data handling under the PDPA for car plates and email addresses
- Integration with the client's own car park system`);
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
