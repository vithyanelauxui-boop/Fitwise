/* ============ boot ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
/* icons are inline Hugeicons SVGs (icons.js); the class stays "lucide" so every existing size/colour rule keeps working */
const I = (n, c = '') => `<svg class="lucide${c ? ' ' + c : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${HGI[n] || ''}</svg>`;
const icons = () => {};
const params = new URLSearchParams(location.search);
$('#app').innerHTML = new Function('return `' + $('#shell').textContent + '`')();
if (params.get('embed')) document.body.classList.add('embed');
/* sticky bars below the header (section tabs, filters, gallery) follow its real height, which changes with screen width */
{ const hd = $('header.top'), set = () => document.documentElement.style.setProperty('--hdr', hd.offsetHeight + 'px'); set(); new ResizeObserver(set).observe(hd); }

const S = {
  view: 'home', vehicle: params.get('v') || 'creta', cat: params.get('cat') || 'brakes', pdp: params.get('p') || 'd1',
  f: {}, fitsOnly: true, sort: 'rec', layout: 'grid', compare: [], ful: 'pickup', store: 's4', ssort: 'near', qty: 1,
  ans: { wheel: null, links: null }, cart: 2, wish: new Set()
};
const V = () => VEHICLES[S.vehicle];
const vLabel = v => `${v.year} ${v.name}`;
const P = id => PRODUCTS.find(p => p.id === id);
const forV = (p, vid) => p.fits.includes(vid) || (p.variant || []).includes(vid);
/* once the owner answers the one question (wheel size, link count), it decides fit for every part that depends on it */
const fitOf = (p, vid = S.vehicle) => {
  const w = S.ans.wheel, l = S.ans.links;
  if (vid === 'creta' && p.wheel && w !== null) return p.wheel === w && forV(p, vid) ? 'ok' : 'bad';
  if (vid === 'jcb' && p.links && l !== null) return p.links === l && forV(p, vid) ? 'ok' : 'bad';
  if (p.fits.includes(vid)) return 'ok';
  if (p.variant && p.variant.includes(vid)) return 'warn';
  return 'bad';
};
const ptype = p => (VEHICLES[p.fits[0] || (p.variant || [])[0]] || {}).type || 'car';
const pveh = p => VEHICLES[p.fits[0] || (p.variant || [])[0]] || V();
/* the single disambiguating question, asked only where the answer changes fit */
const askOf = (cat, vid = S.vehicle) => vid === 'creta' && cat !== 'tracks' ? { k: 'wheel', q: '<b>Quick check:</b> are your Creta\'s wheels <b>16-inch or 17-inch</b>? The SX manual comes on 16s; automatics and the SX(O) come on 17s. It\'s printed on the tyre: R16 or R17.', s: 'Are your wheels 16-inch or 17-inch? Check the tyre sidewall: it says R16 or R17.', o: [['16-inch (R16)', 16], ['17-inch (R17)', 17]], ns: cat === 'tyres' ? 'Which tyre size does my Creta take?' : 'Will this fit my 17-inch wheels?' }
  : vid === 'jcb' && cat === 'tracks' ? { k: 'links', q: '<b>Quick check:</b> how many links does your current track have? Most 30 Plus machines run 80; some run 84.', s: 'How many links does your current track have? Count them on the inside.', o: [['80 links', 80], ['84 links', 84]], ns: 'How do I count the links on my track?' } : null;
const askHTML = a => `<div class="opts" role="group" aria-label="Your answer">${a.o.map(o => `<button class="btn line sm ${S.ans[a.k] === o[1] ? 'on' : ''}" aria-pressed="${S.ans[a.k] === o[1]}" data-ans="${a.k}:${o[1]}">${o[0]}</button>`).join('')}<button class="btn ghost sm" data-ans="ns" data-ns="${a.ns}">Not sure</button></div>`;
const img = (p, extra = '') => `<img src="${p.img}" alt="${p.brand} ${p.name}" loading="lazy" ${p.photo ? 'class="photo"' : ''} ${extra}>`;
const off = p => p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;

/* ============ toasts & cart ============ */
function toast(msg, opt = {}) {
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `${opt.img ? `<span class="tt"><img src="${opt.img}" alt=""></span>` : I('circle-check')}<span class="tx">${msg}${opt.sub ? `<small>${opt.sub}</small>` : ''}</span>${opt.undo ? '<button data-u>Undo</button>' : opt.action ? `<button data-a>${opt.action}</button>` : ''}`;
  $('#toasts').appendChild(t); icons();
  const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 250); };
  if (opt.undo) t.querySelector('[data-u]').onclick = () => { opt.undo(); kill(); };
  if (opt.action) t.querySelector('[data-a]').onclick = () => { kill(); };
  setTimeout(kill, 4000);
}
function addToCart(p, n = 1) {
  S.cart += n; $('#cartN').textContent = S.cart;
  $('#cartN').animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 350, easing: 'cubic-bezier(.34,1.4,.64,1)' });
  toast(`<b>Added to cart</b>`, { img: p.img, sub: `${p.brand} ${p.name.split(',')[0]}`, action: 'View cart' });
}

/* ============ router ============ */
function go(v, keep) {
  S.view = v;
  $$('.view').forEach(e => e.classList.toggle('on', e.id === 'v-' + v));
  document.body.classList.toggle('pdp-on', v === 'pdp');
  if (v === 'home') renderHome();
  if (v === 'plp') renderPLP();
  if (v === 'pdp') renderPDP();
  if (!keep) window.scrollTo({ top: 0, behavior: 'instant' });
  history.replaceState(null, '', location.search + '#' + v);
  renderTray(); icons();
}
const toPLP = (cat, vid) => { S.cat = cat; S.vehicle = vid || (PRODUCTS.some(p => p.cat === cat && p.fits.includes(S.vehicle)) ? S.vehicle : CAT_META[cat].veh); S.f = {}; syncGarage(); go('plp'); };
const toPDP = id => { const p = P(id); S.pdp = id; S.cat = p.cat; if (!p.fits.includes(S.vehicle) && !(p.variant || []).includes(S.vehicle) && p.fits[0]) { S.vehicle = p.fits[0]; syncGarage(); } go('pdp'); };

document.addEventListener('click', e => {
  const t = e.target;
  const g = t.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const pl = t.closest('[data-plp]'); if (pl) { e.preventDefault(); closeMega(); toPLP(pl.dataset.plp, pl.dataset.v); return; }
  const pd = t.closest('[data-pdp]'); if (pd && !t.closest('[data-add],[data-cmp],[data-wish]')) { e.preventDefault(); closeCmd(); toPDP(pd.dataset.pdp); return; }
  const ak = t.closest('[data-ask]'); if (ak) { e.preventDefault(); e.stopPropagation(); closeMega(); closeCmd(true); openCopilot(ak.dataset.ask); return; }
  const ac = t.closest('[data-act]'); if (ac) { e.preventDefault(); e.stopPropagation(); toast(ac.dataset.act === 'scan' ? 'Camera opens: point at a number plate, a part label or a tyre sidewall — we\'ll suggest a possible match, then confirm it against your vehicle' : 'Listening… speak in English, Hindi, Tamil or 6 other languages'); return; }
  const an = t.closest('[data-ans]'); if (an) { e.preventDefault(); if (an.dataset.ans === 'ns') { openCopilot(an.dataset.ns); return; } const [k, x] = an.dataset.ans.split(':'); S.ans[k] = +x; S.view === 'plp' ? refresh() : go(S.view, true); toast('Thanks. Fit updated for your vehicle'); return; }
  const ad = t.closest('[data-add]'); if (ad) { e.preventDefault(); e.stopPropagation(); addToCart(P(ad.dataset.add)); return; }
  const wi = t.closest('[data-wish]'); if (wi) { e.preventDefault(); e.stopPropagation(); const id = wi.dataset.wish; S.wish.has(id) ? S.wish.delete(id) : S.wish.add(id); wi.classList.toggle('on', S.wish.has(id)); toast(S.wish.has(id) ? 'Saved to your wishlist' : 'Removed from wishlist'); return; }
  const vh = t.closest('[data-veh]'); if (vh) { e.preventDefault(); S.vehicle = vh.dataset.veh; $('#gPop').classList.remove('on'); syncGarage(); toast(`Now shopping for <b>${vLabel(V())}</b>`); if (S.view !== 'home') go(S.view, true); else renderHome(); return; }
  if (!t.closest('#gPop,#gBtn')) $('#gPop').classList.remove('on');
});

/* ============ header ============ */
addEventListener('scroll', () => { $('#top').classList.toggle('sc', scrollY > 30); }, { passive: true });
(() => {
  const PHS = ['brake disc for 2024 Creta diesel', 'steering shakes when I brake', '215/60 R17', 'rear tyre for Mahindra 575 DI', '51712-C9000', '300×52.5×80 rubber track'];
  let i = 0, j = 0, d = false; const el = $('#sph');
  const tick = () => { const w = PHS[i]; j += d ? -1 : 1; el.innerHTML = `Search “<b>${w.slice(0, j)}</b><i></i>”`; if (!d && j === w.length) { d = true; return setTimeout(tick, 1800); } if (d && j === 0) { d = false; i = (i + 1) % PHS.length; } setTimeout(tick, d ? 20 : 55); };
  tick();
  const nav = $('#cnav .wrap'), bar = $('#nbar');
  $$('a', nav).forEach(a => a.addEventListener('mouseenter', () => { bar.style.left = a.offsetLeft + (a.classList.contains('all') ? 0 : 10) + 'px'; bar.style.width = a.offsetWidth - (a.classList.contains('all') ? 10 : 20) + 'px'; bar.style.opacity = 1; if (a.dataset.mega && innerWidth > 960) $('#mega').classList.add('on'); else closeMega(); }));
  nav.addEventListener('mouseleave', () => bar.style.opacity = 0);
  $('#top').addEventListener('mouseleave', closeMega);
  $('#megaSys').innerHTML = [['rotor-plain', 'Brake discs', 'brakes'], ['pads-worn', 'Brake pads', ''], ['tyre-stack', 'Tyres', 'tyres'], ['battery-volbit', 'Batteries', ''], ['oil-filter', 'Filters', ''], ['spark', 'Spark plugs', ''], ['brake-kit', 'Suspension', ''], ['scorpio', 'Body parts', ''], ['activa', 'Two-wheeler parts', '']]
    .map(([im, t, c]) => `<a href="#" ${c ? `data-plp="${c}"` : ''}><span><img src="${C(im)}" alt=""></span><div><b>${t}</b><small>Fits your vehicle</small></div></a>`).join('');
})();
function closeMega() { $('#mega').classList.remove('on'); }

/* ============ garage ============ */
function syncGarage() {
  const v = V();
  $('#gName').textContent = vLabel(v); $('#gImg').src = v.img; $('#megaV').textContent = v.short;
  $('#gPop').innerHTML = `<h6>My vehicles</h6>${GARAGE.map(id => { const g = VEHICLES[id]; return `<button class="gv ${id === S.vehicle ? 'on' : ''}" data-veh="${id}"><span class="th"><img src="${g.img}" alt=""></span><span><b>${vLabel(g)}</b><small>${g.variant} · ${g.plate}</small></span>${id === S.vehicle ? `<span class="ck">${I('circle-check')}</span>` : ''}</button>`; }).join('')}<div class="foot"><button class="btn line sm">${I('plus')} Add a vehicle</button><button class="btn ghost sm">Shop without one</button></div>`;
  icons();
}
$('#gBtn').addEventListener('click', e => { e.stopPropagation(); $('#gPop').classList.toggle('on'); });

/* ============ HOME ============ */
const BRANDS = {
  car: [['maruti-stack', 'Maruti Suzuki'], ['hyundai-stack', 'Hyundai'], ['tata', 'Tata'], ['mg', 'MG'], ['kia', 'Kia'], ['toyota', 'Toyota'], ['mahindra', 'Mahindra', 1], ['bmw', 'BMW'], ['mercedes', 'Mercedes-Benz'], ['ford', 'Ford', 1], ['honda', 'Honda'], ['renault', 'Renault'], ['skoda', 'Skoda']],
  bike: [['hero', 'Hero', 1], ['honda', 'Honda'], ['bajaj', 'Bajaj', 1], ['', 'TVS'], ['royalenfield', 'Royal Enfield', 1], ['yamaha', 'Yamaha'], ['suzuki', 'Suzuki'], ['', 'Ather']],
  truck: [['tata', 'Tata'], ['', 'Ashok Leyland'], ['mahindra', 'Mahindra', 1], ['', 'Eicher'], ['', 'BharatBenz'], ['volvo', 'Volvo', 1], ['', 'SML Isuzu']],
  tractor: [['mahindra', 'Mahindra', 1], ['', 'Swaraj'], ['', 'Sonalika'], ['', 'John Deere'], ['', 'Eicher'], ['', 'Escorts'], ['', 'Massey Ferguson']],
  excavator: [['jcb', 'JCB'], ['cat', 'CAT'], ['', 'Tata Hitachi'], ['volvo', 'Volvo', 1], ['', 'Komatsu'], ['', 'Kubota'], ['', 'L&T']]
};
const MODELS = { 'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Ertiga', 'Dzire'], Hyundai: ['Creta', 'Venue', 'i20', 'Verna', 'Alcazar'], Tata: ['Nexon', 'Punch', 'Harrier', 'Tiago', 'Signa 4825.TK', 'Prima', 'Ace'], Mahindra: ['Scorpio-N', 'XUV700', 'Thar', 'Bolero', '575 DI XP Plus', 'Arjun 605', 'Blazo X'], Kia: ['Seltos', 'Sonet', 'Carens'], Toyota: ['Innova Crysta', 'Fortuner', 'Glanza'], Honda: ['City', 'Amaze', 'Elevate', 'Activa 6G', 'Shine'], MG: ['Hector', 'Astor'], Renault: ['Kwid', 'Kiger'], Skoda: ['Kushaq', 'Slavia'], Volkswagen: ['Taigun', 'Virtus'], Nissan: ['Magnite'], Hero: ['Splendor+', 'HF Deluxe', 'Glamour'], Bajaj: ['Pulsar 150', 'Platina'], TVS: ['Apache RTR 160', 'Jupiter'], 'Royal Enfield': ['Classic 350', 'Bullet 350'], Yamaha: ['FZ-S', 'R15'], Suzuki: ['Access 125'], Ather: ['450X', 'Rizta'], 'Ashok Leyland': ['Dost', 'Ecomet', '2820'], Eicher: ['Pro 2049', '380'], BharatBenz: ['1917R', '2823C'], Volvo: ['FM 420', 'EC210'], 'SML Isuzu': ['Sartaj'], Swaraj: ['744 FE', '855 FE'], Sonalika: ['DI 745 III'], 'John Deere': ['5050 D', '5310'], Escorts: ['Farmtrac 60', 'Powertrac 439'], 'Massey Ferguson': ['1035 DI'], JCB: ['30 Plus', '3DX', '81 Plus'], CAT: ['424', '320D'], 'Tata Hitachi': ['EX30', 'EX200'], Komatsu: ['PC71'], Kubota: ['U17', 'KX057'], 'L&T': ['EX 200'] };
const TYPE_VEH = { car: 'creta', bike: 'creta', truck: 'signa', tractor: 'm575', excavator: 'jcb' };
const PH_BY = { car: 'AB 12 CD 3456', bike: 'AB 12 CD 3456', truck: 'AB 12 CD 3456', tractor: 'AB 12 CD 3456', excavator: 'Chassis or asset no.' };
let vtype = 'car';
function renderLogos() {
  const list = BRANDS[vtype];
  $('#logos').innerHTML = list.slice(0, 10).map(([k, n, wide]) => `<button class="logo-t" data-brand="${n}" title="${n}">${k ? `<img src="assets/logos/${k}.png" alt="${n}" class="${wide ? 'wide' : ''}">` : `<span class="wm">${n.replace(' ', '<br>')}</span>`}</button>`).join(''); /* the full list sits behind "View all brands" in the row heading */
  icons();
}
$$('#vt3 button').forEach(b => b.onclick = () => { vtype = b.dataset.t; $$('#vt3 button').forEach(x => x.classList.toggle('on', x === b)); $('#plateIn').placeholder = PH_BY[vtype]; $('#found').classList.remove('on'); setMode('plate'); renderLogos(); renderSaved(); });
const fmtPlate = v => { const m = v.match(/^([A-Z]{0,2})(\d{0,2})([A-Z]{0,3})(\d{0,4})/); return m ? [m[1], m[2], m[3], m[4]].filter(Boolean).join(' ') : v; };
$('#plateIn').addEventListener('input', e => {
  const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
  e.target.value = vtype === 'excavator' ? raw : fmtPlate(raw);
  $('#cplate').classList.toggle('ok', raw.length >= 9);
});
$('#plateIn').addEventListener('keydown', e => e.key === 'Enter' && findVehicle());
/* shortcut: the signed-in shopper's own saved vehicle of the selected type (no saved bike, so no shortcut there) */
const SAVED_BY_TYPE = { car: 'creta', truck: 'signa', tractor: 'm575', excavator: 'jcb' };
function renderSaved() {
  const id = SAVED_BY_TYPE[vtype], v = id && VEHICLES[id];
  $('#saved3').innerHTML = v ? `<button class="chip-saved" id="savedBtn">${I('warehouse')}<span>Use my ${v.short}</span><small>${v.plate}</small></button>` : '';
  icons();
  if (v) $('#savedBtn').onclick = () => { const s = v.plate.replace(/^Asset\s*/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(); let i = 0; const inp = $('#plateIn'); inp.focus(); const t = setInterval(() => { inp.value = s.slice(0, ++i); inp.dispatchEvent(new Event('input')); if (i >= s.length) { clearInterval(t); setTimeout(findVehicle, 250); } }, 70); };
}
$('#findBtn').onclick = findVehicle;
function setMode(m) { $('#f3').classList.toggle('model', m === 'model'); }
$('#modeBtn').onclick = () => setMode('plate');
function fillModels(brand) {
  const mk = $('#mk'), md = $('#md'), yr = $('#yr');
  mk.innerHTML = BRANDS[vtype].map(([, n]) => `<option ${n === brand ? 'selected' : ''}>${n}</option>`).join('');
  md.innerHTML = '<option>Model</option>' + (MODELS[brand] || []).map(m => `<option>${m}</option>`).join('');
  yr.innerHTML = '<option>Year</option>'; yr.disabled = true; mk.classList.add('done'); md.classList.remove('done');
}
$('#mk').onchange = e => fillModels(e.target.value);
$('#md').onchange = () => { $('#md').classList.add('done'); const y = $('#yr'); y.innerHTML = '<option>Year</option>' + [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map(x => `<option>${x}</option>`).join(''); y.disabled = false; };
$('#yr').onchange = () => $('#yr').classList.add('done');
$('#findBtn2').onclick = () => { S.vehicle = TYPE_VEH[vtype]; syncGarage(); toPLP(DUE[S.vehicle].cat, S.vehicle); };
$('#logos').addEventListener('click', e => { const b = e.target.closest('[data-brand]'); if (b) { $$('.logo-t').forEach(x => x.classList.toggle('on', x === b)); fillModels(b.dataset.brand); setMode('model'); $('#md').focus(); return; } if (e.target.closest('#moreBrands')) toast(`All ${BRANDS[vtype].length + 30} ${vtype === 'excavator' ? 'machine' : vtype} brands would open here`); });
$('#allBrands').onclick = () => toast('Full brand list opens here');
function findVehicle() {
  const raw = $('#plateIn').value.replace(/\s/g, '');
  if (raw.length < (vtype === 'excavator' ? 5 : 8)) { $('#cplate').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 280 }); $('#plateIn').focus(); return; }
  const id = TYPE_VEH[vtype], v = VEHICLES[id], f = $('#found'), mine = raw.toUpperCase() === v.plate.replace(/^Asset\s*/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  f.innerHTML = `<span class="th skel"></span><div style="flex:1"><div class="skel" style="height:14px;width:60%"></div><div class="skel" style="height:11px;width:40%;margin-top:8px"></div></div>`; f.classList.add('on');
  setTimeout(() => {
    f.innerHTML = `<span class="th"><img src="${v.img}" alt=""></span><div style="flex:1;min-width:0"><b>${v.year} ${v.name} ${v.variant}</b><small>${v.fuel} · ${v.trans} · ${mine ? 'saved in your garage' : 'from the registration record'}</small></div><button class="btn sun sm" id="shopV">Shop parts ${I('arrow-right')}</button>`;
    icons();
    $('#shopV').onclick = () => { S.vehicle = id; syncGarage(); toPLP(DUE[id].cat, id); };
  }, 850);
}

const DUE = {
  creta: { short: 'Brakes due soon', cat: 'brakes', svc: 'Mar 2026', bought: 6, rows: [['rotor-plain', 'Front brakes', 'Discs and pads, due around 45,000 km', 88, 'Due soon', 'brakes'], ['oil-filter', 'Engine oil', 'Last changed 9,400 km ago', 72, 'Plan ahead', ''], ['tyre-stack', 'Tyres', 'About 4.6 mm tread left', 46, 'Healthy', 'tyres']] },
  m575: { short: 'Rear tyres due', cat: 'tyres', svc: 'Jun 2026', bought: 3, rows: [['tractor-tyre', 'Rear tyres 13.6-28', 'Estimated from 2,340 hours', 78, 'Due soon', 'tyres'], ['oil-filter', 'Engine oil and filter', 'Due at 2,500 hours', 88, 'Due soon', ''], ['battery-55', 'Battery', 'Fitted in 2023', 40, 'Healthy', '']] },
  signa: { short: 'Retread window', cat: 'tyres', svc: 'Aug 2026', bought: 14, rows: [['tyre-stack', 'Drive tyres 295/80 R22.5', 'About 9,000 km to retread', 80, 'Due soon', 'tyres'], ['oil-filter', 'Air filter', 'Dusty routes: check now', 68, 'Plan ahead', ''], ['brake-kit', 'Brake liners', 'Check at next service', 56, 'Plan ahead', '']] },
  jcb: { short: 'Tracks due', cat: 'tracks', svc: 'Sep 2026', bought: 5, rows: [['rubber-track', 'Rubber tracks', 'Tension adjuster near its limit', 82, 'Due soon', 'tracks'], ['oil-filter', 'Hydraulic filter', 'Every 1,000 hours', 61, 'Plan ahead', ''], ['battery-55', 'Battery', 'Fitted in 2024', 30, 'Healthy', '']] }
};
const CTILES = {
  creta: [['disc-caliper', 'Brake discs', '9', 'brakes'], ['caliper-red', 'Brake pads', '12'], ['tyre-michelin', 'Tyres', '6', 'tyres'], ['battery-volbit', 'Batteries', '4'], ['filter-kn', 'Oil filters', '7'], ['plug-red', 'Glow plugs', '3']],
  m575: [['offer-tractor-wheel', 'Rear tyres', '2', 'tyres'], ['oil-filter', 'Filters', '6'], ['battery-volbit', 'Batteries', '3'], ['clutch-kit', 'Clutch and PTO', '5'], ['service-kit', 'Service parts', '4'], ['tractor-tyre', 'Front tyres', '3', 'tyres']],
  signa: [['tyre-stack', 'Tyres', '8', 'tyres'], ['oil-filter', 'Filters', '9'], ['battery-volbit', 'Batteries', '2'], ['disc-caliper', 'Brakes', '6'], ['clutch-kit', 'Clutch', '3'], ['service-kit', 'Service parts', '11']],
  jcb: [['rubber-track', 'Rubber tracks', '4', 'tracks'], ['oil-filter', 'Hydraulic filters', '5'], ['filter-kn', 'Air filters', '6'], ['battery-volbit', 'Batteries', '2'], ['service-kit', 'Service parts', '3'], ['plug-red', 'Glow plugs', '7']]
};
/* where each part sits in its category card, as % of the card: [left, top, width, rotate°]. Measured off the approved mockup; parts run off the right and bottom edges */
const CPLACE = { 'disc-caliper': [35.6, 31, 88, 0], 'caliper-red': [44.2, 16, 65, 38], 'tyre-michelin': [34.6, 37, 66, 0], 'battery-volbit': [27, 37, 86, 0], 'filter-kn': [53, 44.6, 62, -42], 'plug-red': [50, 24, 52.5, 102.5],
  'oil-filter': [26, 42, 86, 0], 'clutch-kit': [24, 40, 92, 0], 'service-kit': [36, 30, 80, 0], 'offer-tractor-wheel': [34, 28, 84, 0], 'tractor-tyre': [26, 34, 92, 0], 'rubber-track': [22, 36, 94, 0], 'tyre-stack': [50, 22, 50, 0] };
const cPlace = im => { const [l, t, w, r] = CPLACE[im] || [36, 38, 70, 0]; return `left:${l}%;top:${t}%;width:${w}%${r ? `;rotate:${r}deg` : ''}`; };
const stCol = s => s === 'Due soon' ? 'var(--bad)' : s === 'Plan ahead' ? 'var(--warn)' : 'var(--fit)';
/* status says itself: warning triangle = due soon, timer = plan ahead, tick = healthy (colour backs it up, never carries it alone) */
const stIc = s => `<span class="sti" style="color:${stCol(s)}" title="${s}">${I(s === 'Due soon' ? 'triangle-alert' : s === 'Plan ahead' ? 'timer' : 'circle-check')}</span>`;
/* the IND strip on every plate badge: same emblem ring + IND as the finder's number-plate input */
const INDB = `<i class="ind"><svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<circle cx="${(12 + 9 * Math.cos(a)).toFixed(2)}" cy="${(12 + 9 * Math.sin(a)).toFixed(2)}" r="1.2"/>`; }).join('')}<rect x="8.2" y="8.2" width="7.6" height="7.6" rx=".6"/></svg><b>IND</b></i>`;
const plateChip = p => `<span class="miniplate">${INDB}<span>${p}</span></span>`;
/* part health, shown on the vehicle itself. One marker per place on the vehicle (parts in the same spot share it, e.g. discs + pads on
   the front wheel), coloured by the worst status there. The label is a small dark-glass tag: status on top, the place underneath,
   and it links to the parts. [x%, y%, row indexes, place] for the default view of each photo */
const HOT = {
  creta: [[37, 73, [0], 'Front brakes'], [23, 41, [1], 'Engine oil'], [76.5, 67, [2], 'Tyres']],
  m575: [[81.5, 63, [0], 'Rear tyres'], [42, 57, [1], 'Engine oil and filter'], [29, 41, [2], 'Battery']],
  signa: [[57, 80, [0, 2], 'Tyres and brake liners'], [64, 46, [1], 'Air filter']],
  jcb: [[71, 88, [0], 'Rubber tracks'], [86, 64, [1], 'Hydraulic filter'], [61, 73, [2], 'Battery']]
};
const RANK = { 'Due soon': 0, 'Plan ahead': 1, Healthy: 2 };
const hotHTML = ([x, y, ix, place], i, rows) => {
  const st = ix.map(k => rows[k][4]).sort((a, b) => RANK[a] - RANK[b])[0], tone = st === 'Due soon' ? 'is-due' : st === 'Plan ahead' ? 'is-plan' : 'is-ok';
  const lead = rows[ix.find(k => rows[k][4] === st)], cat = lead[5], n = ix.filter(k => rows[k][4] === st).length;
  const what = st === 'Healthy' ? 'Healthy' : `${st}${n > 1 ? ` · ${n} parts` : ''}`;
  const go = cat ? `href="#" data-plp="${cat}"` : `href="#" data-ask="When should I change the ${lead[1].toLowerCase()} on my ${V().short}?"`;
  return `<div class="vhot ${tone}${x > 62 ? ' is-lf' : ''}" style="left:${x}%;top:${y}%"><button class="hdot" data-hot="${i}" aria-expanded="false" aria-label="${place}: ${what}"></button><a class="hlab" ${go}><small>${what}</small><b>${place}</b>${I('chevron-right')}</a></div>`;
};
function bindHots() {
  const r = $('#vr'), hots = () => $$('#vhots .vhot');
  const open = (i, keep) => { hots().forEach((h, k) => { const on = k === +i && (keep || !h.classList.contains('on')); h.classList.toggle('on', on); h.querySelector('.hdot').setAttribute('aria-expanded', on); }); $$('.hchip').forEach(c => c.classList.toggle('on', !!hots()[c.dataset.hot]?.classList.contains('on'))); };
  $$('#vhots .hdot').forEach(b => b.onclick = e => { e.stopPropagation(); open(b.dataset.hot); });
  /* the most urgent place is labelled on arrival; deferred so the click that switched vehicle doesn't count as an outside click */
  const first = $$('#vhots .vhot.is-due')[0]; if (first) setTimeout(() => open(hots().indexOf(first), true));
  $$('.hchip').forEach(c => { c.onclick = () => { if (r.classList.contains('turned')) r._reset?.(); open(c.dataset.hot, true); }; c.onmouseenter = () => hots()[c.dataset.hot]?.classList.add('hl'); c.onmouseleave = () => hots()[c.dataset.hot]?.classList.remove('hl'); });
}
document.addEventListener('click', e => { if (!e.target.closest('.vhot,.hchip')) { $$('#vhots .vhot.on').forEach(h => { h.classList.remove('on'); h.querySelector('.hdot').setAttribute('aria-expanded', 'false'); }); $$('.hchip').forEach(c => c.classList.remove('on')); } });
/* offer coupon: copy the code (capture phase, so the card's own link doesn't fire) */
document.addEventListener('click', e => { const c = e.target.closest('.code[data-code]'); if (!c) return; e.preventDefault(); e.stopPropagation(); navigator.clipboard?.writeText(c.dataset.code).catch(() => {}); c.querySelector('em').textContent = 'Copied'; setTimeout(() => { c.querySelector('em').textContent = 'Copy'; }, 1600); toast(`Code ${c.dataset.code} copied. Apply it at checkout`); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('#vhots .vhot.on').forEach(h => h.classList.remove('on')); });
function renderHome() {
  const v = V(), d = DUE[v.id];
  renderLogos(); renderSaved();
  $('#gsw').innerHTML = GARAGE.map(id => { const g = VEHICLES[id], dd = DUE[id]; return `<button class="${id === S.vehicle ? 'on' : ''}" data-veh="${id}"><span class="th"><img src="${g.img}" alt=""></span><span><b>${g.name}</b><small>${stIc(dd.rows[0][4])}${dd.short}</small></span></button>`; }).join('') + `<button class="add">${I('plus')}Add vehicle</button>`;
  $('#vcard').innerHTML = `<div class="l"><span class="eyb">Your ${v.type === 'car' ? 'car' : v.type === 'excavator' ? 'machine' : v.type}</span><h3>${v.name}</h3><div class="sub">${v.year} · ${v.variant} · ${v.fuel} · ${v.trans}</div><div class="pl"><span class="iplate">${INDB}<span>${v.plate}</span></span></div>
      <div class="vstats4"><div><small>${v.type === 'car' || v.type === 'truck' ? 'Odometer' : 'Engine hours'}</small><b>${v.odo}</b></div><div><small>Last service</small><b>${d.svc}</b></div><div><small>Parts bought</small><b>${d.bought}</b></div></div>
      <div class="up"><h4><span>Coming up</span><button class="link" data-ask="What service is due on my ${v.short}?">Ask Vrom</button></h4>
      <div class="hchips">${d.rows.map(([, t, , , st], i) => `<button class="hchip" data-hot="${HOT[v.id].findIndex(sp => sp[2].includes(i))}">${stIc(st)}${t}</button>`).join('')}</div>
      <p class="hhint">${I('cursor-click')}Tap a marker on the ${v.type === 'car' ? 'car' : v.type === 'excavator' ? 'machine' : v.type} to see what's due</p></div>
      <div class="acts"><button class="btn sun" data-plp="${d.cat}">Shop parts for this ${v.type === 'car' ? 'car' : 'vehicle'}</button><button class="btn line">${I('gauge')} Update ${v.type === 'car' || v.type === 'truck' ? 'km' : 'hours'}</button></div></div>
    <div class="r ${v.spin ? 'spin' : ''}" id="vr"><span class="badge">${I('shield-check')}Fitment profile complete</span><i class="gs" id="vgs"></i><img src="${v.img}" alt="${v.name}" id="vimg" draggable="false">
      <div class="hots" id="vhots">${HOT[v.id].map((sp, i) => hotHTML(sp, i, d.rows)).join('')}</div>
      ${v.spin ? `<span class="spinhint">${I('rotate-3d')}Drag to rotate</span><button class="hreset" id="hreset">${I('triangle-alert')}${d.rows.filter(r => r[4] !== 'Healthy').length} to check · Show on car</button>` : ''}</div>`;
  if (v.spin) bindSpin(v);
  bindHots();
  const vi = $('#vimg'); vi.onload = placeCar; placeCar();
  $('#catV').textContent = v.short;
  /* categories are navigation, not products: title top-left, part cut-out bleeding off the bottom-right corner (Cars24 "Manage your vehicle" pattern), no price or add button */
  $('#cats4').innerHTML = CTILES[v.id].map(([im, t, n, c]) => { const body = `<b>${t}</b><small>${n} fit your ${v.short}</small><img src="${C(im)}" alt="" loading="lazy" style="${cPlace(im)}">`; return c ? `<a href="#" class="c4" data-plp="${c}">${body}</a>` : `<a href="#" class="c4 soon" data-soon="${t}">${body}</a>`; }).join('');
  /* categories without a list in this prototype still behave like the rest: same hover, and a click says where it would go */
  $$('#cats4 .soon').forEach(b => b.onclick = e => { e.preventDefault(); toast(`${b.dataset.soon} for your ${v.short} would open here`); });
  requestAnimationFrame(() => setTimeout(() => $$('#vcard [data-w]').forEach(i => i.style.width = i.dataset.w + '%'), 80));
  /* "Shop by vehicle": one facing-left three-quarter render per type, anchored bottom-right and sliding in past the tile edge */
  $('#vtiles').innerHTML = [['v-thar', 'Cars & SUVs', '2.1 lakh parts', 'brakes', 'creta', 1], ['v-bike', 'Two-wheelers', '64,000 parts', '', '', 1], ['v-truck', 'Trucks & buses', '48,000 parts', 'tyres', 'signa', 1], ['v-tractor', 'Tractors', '22,000 parts', 'tyres', 'm575', 1], ['v-mini-excavator', 'Construction', '9,400 parts', 'tracks', 'jcb', 1.06, 1, 34], ['v-auto', 'Three-wheelers', '12,000 parts', '', '', 1.04, 0, 20]]
    .map(([im, t, s, c, vid, k, g, dx]) => `<div class="vt${g ? ' ground' : ''}" style="--s:${k}${dx ? `;--dx:${dx}px` : ''}" ${c ? `data-plp="${c}" data-v="${vid}"` : ''}><b>${t}</b><small>${s}</small><div class="im"><img src="${C(im)}" alt="${t}" loading="lazy"></div></div>`).join('');
  $('#bsV').textContent = v.short;
  $('#rail').innerHTML = PRODUCTS.filter(p => fitOf(p) === 'ok').sort((a, b) => score(b) - score(a)).slice(0, 10).map(cardHTML).join('');
  $$('[data-rail]').forEach(b => b.onclick = () => $('#rail').scrollBy({ left: +b.dataset.rail * $('#rail').clientWidth * .8, behavior: 'smooth' }));
  const hm = $('#hmap'); requestAnimationFrame(() => mountMap(hm, [...DEALERS].sort((a, b) => a.km - b.km), null));
}
/* Vehicle stage. Every vehicle is fitted into the same box and stood on one ground line (76% of the stage height), so wheels meet the floor
   whatever the image's aspect ratio or built-in padding. n = image size, body = solid width as a fraction of the image,
   gb = empty strip under the tyres as a fraction of the image height. The 360 Creta frames vary with the viewing angle (side-on is widest). */
const STAGE = { creta: { n: [960, 364], body: [.127, .876], gb: .11, spin: true }, m575: { n: [472, 390], body: [.047, .951], gb: .07 }, signa: { n: [800, 682], body: [0, 1], gb: .004 }, jcb: { n: [900, 802], body: [0, 1], gb: .007 } };
function placeCar(frame) {
  const r = $('#vr'), im = $('#vimg'), gs = $('#vgs'); if (!r || !im) return;
  const st = STAGE[S.vehicle]; if (!st) return;
  const W = r.clientWidth, H = r.clientHeight, [nw, nh] = st.n, gy = H * .76;
  const c = st.spin ? Math.abs(Math.cos(2 * Math.PI * (typeof frame === 'number' ? frame : r._f ?? 3) / 36)) : 1;
  const bw = st.spin ? .43 + .32 * c : st.body[1] - st.body[0], gb = st.spin ? .083 + .027 * c : st.gb;
  const k = Math.min(W * 1.08 / nw, H * .6 / nh), w = nw * k, h = nh * k;
  im.style.cssText = `width:${w}px;height:${h}px;left:${(W - w) / 2}px;top:${gy + gb * h - h}px`;
  const hs = $('#vhots'); if (hs) hs.style.cssText = im.style.cssText;
  const sw = bw * w * .92, sh = Math.max(14, bw * w * .05);
  gs.style.cssText = `width:${sw}px;height:${sh}px;left:${(W - sw) / 2}px;top:${gy - sh * .62}px`;
  r.classList.add('placed');
}
addEventListener('resize', () => placeCar());
/* 360 view: official manufacturer frames, drag to rotate */
function bindSpin(v) {
  const r = $('#vr'), im = $('#vimg'), n = v.spin; let f = 3, x0 = null, f0 = 3;
  for (let i = 0; i < n; i++) { const p = new Image(); p.src = `assets/creta360/f${i}.avif`; }
  const show = k => { f = ((k % n) + n) % n; r._f = f; im.src = `assets/creta360/f${f}.avif`; placeCar(f); r.classList.toggle('turned', f !== 3); };
  /* markers are mapped to the front three-quarter view (frame 3); off it they fade and this steps the car back round */
  r._reset = () => { const step = () => { if (f === 3) return; show(f + ((3 - f + n) % n <= n / 2 ? 1 : -1)); setTimeout(step, 28); }; step(); };
  $('#hreset').onclick = e => { e.stopPropagation(); r._reset(); };
  r.onpointerdown = e => { if (e.target.closest('.vhot,.hreset')) return; clearTimeout(r._back); x0 = e.clientX; f0 = f; r.setPointerCapture(e.pointerId); r.classList.add('drag'); };
  r.onpointermove = e => { if (x0 === null) return; show(f0 - Math.round((e.clientX - x0) / 14)); };
  /* a couple of seconds after you let go, the car glides back to the marked view so part health never just disappears */
  r.onpointerup = () => { x0 = null; r.classList.remove('drag'); clearTimeout(r._back); if (f !== 3) r._back = setTimeout(r._reset, 2200); };
}
/* account menu */
$('#acctBtn').addEventListener('click', e => { e.stopPropagation(); $('#amenu').classList.toggle('on'); });
document.addEventListener('click', e => { if (!e.target.closest('#amenu,#acctBtn')) $('#amenu').classList.remove('on'); });
$('#amGarage').onclick = e => { e.preventDefault(); $('#amenu').classList.remove('on'); if (S.view !== 'home') go('home'); setTimeout(() => $('.gsec').scrollIntoView({ behavior: 'smooth' }), 100); };

/* ============ map (basemap drawn from bundled OpenStreetMap data, real coordinates) ============ */
/* No tile server: assets/map/coimbatore.js holds roads, rail, water and green space (OpenStreetMap, ODbL), so the map can't be blocked or go offline. */
let MAPC = null;
function mapPrep() {
  if (MAPC || typeof MAPDATA === 'undefined') return MAPC;
  const [lat0, lon0] = MAPDATA.o, S = MAPDATA.s;
  const dec = str => { const a = str.split(' '), out = new Float64Array(a.length * 2); let x = 0, y = 0; for (let i = 0; i < a.length; i++) { const p = a[i].split(','); x += +p[0]; y += +p[1]; out[i * 2] = lon0 + x / S; out[i * 2 + 1] = lat0 + y / S; } return out; };
  return MAPC = { roads: MAPDATA.roads.map(([c, name, s]) => ({ c, name, p: dec(s) })), minor: MAPDATA.minor.map(s => ({ p: dec(s) })), rail: MAPDATA.rail.map(s => ({ p: dec(s) })), water: MAPDATA.water.map(([k, s]) => ({ k, p: dec(s) })), green: MAPDATA.green.map(s => ({ p: dec(s) })) };
}
const AREAS = [['Gandhipuram', 11.0178, 76.9668], ['RS Puram', 11.0091, 76.9502], ['Saibaba Colony', 11.0262, 76.9447], ['Ukkadam', 10.9908, 76.961], ['Lakshmi Mills', 11.0123, 76.9835], ['Race Course', 11.0035, 76.9745], ['Town Hall', 10.9965, 76.9618], ['Ganapathy', 11.0402, 76.9792], ['Selvapuram', 10.9858, 76.9432], ['Ramanathapuram', 10.9978, 76.9925], ['Peelamedu', 11.0232, 77.004], ['Singanallur', 10.9987, 77.0257], ['Podanur', 10.965, 76.985], ['Vadavalli', 11.0294, 76.9036]];
const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function baseMap(W, H, z, ox, oy, uid) {
  const M = mapPrep(); if (!M) return '';
  const n = 256 * 2 ** z, K = Math.PI / 180, buf = new Float64Array(8192);
  /* project one shape; returns null when it is entirely off screen */
  const shape = (p, close, labelling) => {
    const m = p.length / 2; let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (let i = 0; i < m; i++) { const x = (p[i * 2] + 180) / 360 * n + ox, r = p[i * 2 + 1] * K, y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n + oy; buf[i * 2] = x; buf[i * 2 + 1] = y; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    if (maxx < -30 || minx > W + 30 || maxy < -30 || miny > H + 30) return null;
    let d = '', len = 0, rev = '';
    for (let i = 0; i < m; i++) { d += (i ? 'L' : 'M') + buf[i * 2].toFixed(1) + ' ' + buf[i * 2 + 1].toFixed(1); if (i) len += Math.hypot(buf[i * 2] - buf[i * 2 - 2], buf[i * 2 + 1] - buf[i * 2 - 1]); }
    if (labelling && buf[0] > buf[(m - 1) * 2]) for (let i = m - 1; i >= 0; i--) rev += (i === m - 1 ? 'M' : 'L') + buf[i * 2].toFixed(1) + ' ' + buf[i * 2 + 1].toFixed(1);
    return { d: close ? d + 'Z' : d, len, tp: rev || d };
  };
  const f = 1.38 ** (z - 13), w = { r: 1 * f, t: 1.7 * f, s: 2.5 * f, p: 3.3 * f, m: 3.9 * f };
  const cls = { r: '', t: '', s: '', p: '', m: '' }, names = {};
  let green = '', lakes = '', rivers = '', rail = '';
  M.green.forEach(o => { const s = shape(o.p, true); if (s) green += s.d; });
  M.water.forEach(o => { const s = shape(o.p, o.k === 'a'); if (s) o.k === 'a' ? lakes += s.d : rivers += s.d; });
  M.rail.forEach(o => { const s = shape(o.p); if (s) rail += s.d; });
  if (z >= 13) M.minor.forEach(o => { const s = shape(o.p); if (s) cls.r += s.d; });
  M.roads.forEach(o => { const s = shape(o.p, false, o.name && o.c !== 't'); if (!s) return; cls[o.c] += s.d; if (o.name && o.c !== 't' && s.len > 110 && (!names[o.name] || names[o.name].len < s.len)) names[o.name] = s; });
  /* greyscale map: white roads on soft grey casings, highways only wider and a touch darker */
  const CAS = { r: '#E3E3E3', t: '#DCDCDC', s: '#D4D4D4', p: '#CCCCCC', m: '#BDBDBD' }, FIL = { r: '#fff', t: '#fff', s: '#fff', p: '#fff', m: '#FAFAFA' };
  const road = k => cls[k] ? `<path d="${cls[k]}" stroke="${CAS[k]}" stroke-width="${(w[k] + 1.5).toFixed(2)}"/><path d="${cls[k]}" stroke="${FIL[k]}" stroke-width="${w[k].toFixed(2)}"/>` : '';
  const labs = Object.entries(names).sort((a, b) => b[1].len - a[1].len).slice(0, 7);
  const areas = z >= 13 ? AREAS.map(([nm, la, lo]) => { const x = (lo + 180) / 360 * n + ox, r = la * K, y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n + oy; return x > 20 && x < W - 20 && y > 20 && y < H - 20 ? `<text x="${x.toFixed(1)}" y="${(y + 18).toFixed(1)}">${nm}</text>` : ''; }).join('') : '';
  return `<svg class="basemap" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs>${labs.map(([, s], i) => `<path id="${uid}${i}" d="${s.tp}"/>`).join('')}</defs>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="${green}" fill="#EAEAEA" stroke="none"/><path d="${lakes}" fill="#DEDEDE" stroke="#D2D2D2" stroke-width="1"/><path d="${rivers}" stroke="#DEDEDE" stroke-width="${(2 * f).toFixed(2)}"/>
      <path d="${rail}" stroke="#C1C1C1" stroke-width="${Math.max(1, 1.2 * f).toFixed(2)}" stroke-dasharray="${(6 * f).toFixed(1)} ${(4 * f).toFixed(1)}"/>
      ${['r', 't', 's', 'p', 'm'].map(road).join('')}
    </g>
    <g class="rl">${labs.map(([nm], i) => `<text dy="${(w.p / 3).toFixed(1)}"><textPath href="#${uid}${i}" startOffset="50%" text-anchor="middle">${esc(nm)}</textPath></text>`).join('')}</g>
    <g class="al">${areas}</g></svg>`;
}
/* Web Mercator: lat/lon -> world pixels at zoom z. The view fits you + every store, then zoom buttons step in on the selected one */
const proj = (d, z) => { const n = 256 * 2 ** z, r = d.lat * Math.PI / 180; return [(d.lon + 180) / 360 * n, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n]; };
function mountMap(el, list, sel, price) {
  if (!el) return;
  const W = el.clientWidth || 600, H = el.clientHeight || 380, pts = [ME, ...list];
  const fitZ = () => { for (let z = 15; z > 11; z--) { const p = pts.map(d => proj(d, z)), xs = p.map(q => q[0]), ys = p.map(q => q[1]); if (Math.max(...xs) - Math.min(...xs) < W - 110 && Math.max(...ys) - Math.min(...ys) < H - 150) return z; } return 12; };
  const auto = fitZ(), z = el._z || auto, s = list.find(d => d.id === sel);
  const p = pts.map(d => proj(d, z)), xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  const [cx, cy] = el._z && el._z > auto && s ? proj(s, z) : [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2 + 22];
  const ox = W / 2 - cx, oy = H / 2 - cy, at = d => { const [x, y] = proj(d, z); return [x + ox, y + oy]; };
  const [mx, my] = at(ME), [sx, sy] = s ? at(s) : [mx, my];
  const pins = list.map((d, i) => { const [x, y] = at(d), lbl = `${d.name}, ${d.area}, ${d.km} km, ${d.stock ? 'in stock' : 'ready tomorrow'}`;
    return `<button class="pin ${d.id === sel ? 'on' : ''} ${d.stock ? '' : 'out'} ${d.own ? 'own' : ''}" data-pin="${d.id}" style="left:${x}px;top:${y}px" aria-label="${lbl}" aria-pressed="${d.id === sel}"><i class="st"></i><b class="pp">${price ? fmt(price(d)) : d.km + ' km'}</b><span class="pl"><b>${d.own ? 'Vrom Hub' : d.name}</b><small>${price ? d.km + ' km · ' : ''}${d.stock ? 'In stock' : 'Ready tomorrow'}</small></span></button>`; }).join('');
  el.innerHTML = `${baseMap(W, H, z, ox, oy, 'rl' + (el.id || 'm') + '-')}
    ${s ? `<svg class="route" width="${W}" height="${H}" aria-hidden="true"><line x1="${mx}" y1="${my}" x2="${sx}" y2="${sy}"/></svg>` : ''}
    <span class="me" style="left:${mx}px;top:${my}px"><i></i><b>You · ${ME.pin}</b></span>${pins}
    <div class="mctl" role="group" aria-label="Map zoom"><button data-mz="1" aria-label="Zoom in" ${z >= 16 ? 'disabled' : ''}>${I('plus')}</button><button data-mz="-1" aria-label="Zoom out" ${z <= 12 ? 'disabled' : ''}>${I('minus')}</button><button data-mz="0" aria-label="Show all stores" ${z === auto ? 'disabled' : ''}>${I('scan')}</button></div>
    ${W < 520 && s ? `<div class="msel"><span class="pn ${s.own ? 'own' : ''} ${s.stock ? '' : 'out'}">${list.indexOf(s) + 1}</span><span><b>${s.name}</b><small>${price ? fmt(price(s)) + ' · ' : ''}${s.km} km · ${s.stock ? 'In stock' : 'Ready tomorrow'}</small></span></div>` : `<div class="mleg">${W < 520 ? '<span><i class="me-i"></i>You</span>' : ''}<span><i></i>In stock</span><span><i class="no"></i>Ready tomorrow</span></div>`}
    <span class="attr">© OpenStreetMap contributors</span>`;
  el.classList.toggle('compact', W < 520);
  el._list = list; el._sel = sel; el._price = price;
  if (el.id === 'hmap') el.onclick = e => { const b = e.target.closest('[data-pin]'); if (b) selectPin(el, b.dataset.pin); };
  el.querySelector('.mctl').onclick = e => { const b = e.target.closest('[data-mz]'); if (!b) return; e.stopPropagation(); const k = +b.dataset.mz; el._z = k ? Math.min(16, Math.max(12, z + k)) : 0; mountMap(el, list, el._sel, price); };
  icons();
}
/* selecting a store re-centres the route without rebuilding the list */
const selectPin = (el, id) => { if (el && el._list) mountMap(el, el._list, id, el._price); };
let mapT; addEventListener('resize', () => { clearTimeout(mapT); mapT = setTimeout(() => $$('.mapbox').forEach(m => m._list && mountMap(m, m._list, m._sel, m._price)), 150); });

/* ============ product card ============ */
function fitLine(p) {
  const f = fitOf(p), v = V();
  return f === 'ok' ? `<div class="fit">${I('circle-check')}Fits your ${v.short}</div>` : f === 'warn' ? `<div class="fit warn">${I('circle-alert')}Check your variant</div>` : `<div class="fit bad">${I('circle-x')}Doesn't fit your ${v.short}</div>`;
}
const specLine = p => p.cat === 'brakes' ? `${p.style} · Ventilated · ${p.tier}` : p.cat === 'tyres' ? `${p.size} · ${p.use}` : `${p.pattern} tread · ${p.core}`;
/* Badges in three tiers, at most two on the images of any list, each in its own voice:
   1. a recommendation for YOUR vehicle (solid ink, the one pill that leads),
   2. proof from other buyers, with a number (quiet white pill),
   3. a rating fact, said beside the rating it refers to instead of on the photo.
   Discounts already show in the price, so they get no badge. Parts that don't fit get none. */
const TOPSOLD = {}, TOPRATED = {};
PRODUCTS.forEach(p => {
  if (!TOPSOLD[p.cat] || p.reviews > TOPSOLD[p.cat].reviews) TOPSOLD[p.cat] = p;
  const r = TOPRATED[p.cat]; if (!r || p.rating > r.rating || (p.rating === r.rating && p.reviews > r.reviews)) TOPRATED[p.cat] = p;
});
const kNum = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n);
// [icon, full copy, short copy for narrow cards, tier class]
const badgeOf = p => fitOf(p) === 'bad' ? null : p.best ? ['badge-check', `Best for your ${V().short}`, 'Best fit', 'top'] : TOPSOLD[p.cat] === p ? ['shopping-cart', `Bought by ${kNum(p.reviews)} drivers`, `${kNum(p.reviews)} bought`, ''] : null;
const badge = p => { const b = badgeOf(p); return b ? `<span class="gbadge ${b[3]}">${I(b[0])}<span class="gb-l">${b[1]}</span><span class="gb-s">${b[2]}</span></span>` : ''; };
const topRated = p => fitOf(p) !== 'bad' && TOPRATED[p.cat] === p && p.rating >= 4.6 ? `<span class="toprated">Highest rated</span>` : '';
function cardHTML(p) {
  return `<article class="pc ${fitOf(p) === 'bad' ? 'nofit' : ''}" data-pdp="${p.id}">
    <div class="im">${img(p)}<div class="tl">${badge(p)}</div>
      <button class="wish ${S.wish.has(p.id) ? 'on' : ''}" data-wish="${p.id}" aria-label="Save">${I('heart')}</button>
      <button class="btn sm add" data-add="${p.id}">${I('shopping-cart')} Add to cart</button>
      ${S.view === 'plp' ? `<button class="cmp ${S.compare.includes(p.id) ? 'on' : ''}" data-cmp="${p.id}"><span class="cb"></span>Compare</button>` : ''}</div>
    <div class="bd">
      <span class="brand">${p.brand}</span>
      <h3>${p.name}</h3>
      <div class="spec">${specLine(p)}</div>
      <div class="rt"><span class="rating">${p.rating}${I('star')}</span>${p.reviews.toLocaleString('en-IN')}${topRated(p)}</div>
      <div class="price"><b>${fmt(p.price)}</b>${off(p) ? `<s>${fmt(p.mrp)}</s><em>${off(p)}% off</em>` : ''}</div>
      ${fitLine(p)}
      <div class="av">${p.dealers ? `${I('store')}Pick up today · ${p.dealers} store${p.dealers > 1 ? 's' : ''}` : `${I('truck')}Delivery ${p.eta.toLowerCase()}`}</div>
    </div>
  </article>`;
}

/* ============ search palette ============ */
function parseQ(q) {
  const s = q.toLowerCase(), t = []; let veh = null, cat = null, intent = null;
  if (/creta/.test(s)) { veh = 'creta'; t.push(['Vehicle', 'Hyundai Creta']); }
  if (/575|mahindra|tractor|ट्रैक्टर/.test(s)) { veh = 'm575'; t.push(['Vehicle', /575/.test(s) ? 'Mahindra 575 DI' : 'Tractor']); }
  if (/signa|tipper|truck/.test(s)) { veh = 'signa'; t.push(['Vehicle', 'Tata Signa']); }
  if (/jcb|30 plus|excavat/.test(s)) { veh = 'jcb'; t.push(['Machine', 'JCB 30 Plus']); }
  const y = s.match(/\b(20[0-2]\d)\b/); if (y) t.push(['Year', y[1]]);
  const fu = s.match(/diesel|petrol|cng/); if (fu) t.push(['Fuel', fu[0][0].toUpperCase() + fu[0].slice(1)]);
  if (/brake|disc|rotor|pad|shake|shaking|vibrat|squeal|grind/.test(s)) { cat = 'brakes'; t.push(['System', 'Brakes']); }
  if (/tyre|tire|टायर/.test(s)) { cat = 'tyres'; t.push(['Category', 'Tyres']); }
  if (/track/.test(s)) { cat = 'tracks'; t.push(['Category', 'Rubber tracks']); }
  const pos = s.match(/front|rear|पिछला/); if (pos) t.push(['Position', pos[0] === 'पिछला' ? 'Rear' : pos[0][0].toUpperCase() + pos[0].slice(1)]);
  if (/shake|shaking|vibrat|noise|squeal|grind|pull/.test(s)) { intent = 'ai'; t.push(['Symptom', /shak|vibrat/.test(s) ? 'Shaking when braking' : /pull/.test(s) ? 'Pulls to one side' : 'Noise when braking']); }
  const ts = q.match(/(\d{3})\s*\/\s*(\d{2})\s*r?\s*(\d{2})/i); if (ts) { cat = 'tyres'; t.push(['Tyre size', `${ts[1]}/${ts[2]} R${ts[3]}`]); }
  const tr = q.match(/(\d{3})\s*[x×*]\s*(\d{2,3}(?:\.\d)?)\s*[x×*]\s*(\d{2,3})/i); if (tr) { cat = 'tracks'; veh = veh || 'jcb'; t.push(['Track size', `${tr[1]} × ${tr[2]} × ${tr[3]}`]); }
  const pn = q.match(/\b\d{5}-[a-z0-9]{5}\b/i); if (pn) { intent = 'pn'; cat = 'brakes'; t.push(['OE part number', pn[0].toUpperCase()]); }
  if (/\?|what|which|how|why|kya|kaun/.test(s) && !intent) intent = 'ai';
  return { t, veh, cat, intent };
}
let cSel = 0, cItems = [];
const item = (thumb, t, s, act, r = '') => `<button class="ci" role="option" tabindex="-1" aria-selected="false" data-cmd="${act}"><span class="t">${thumb}</span><span style="min-width:0"><b>${t}</b><small>${s}</small></span><span class="r">${r}${I('chevron-right')}</span></button>`;
function renderCmd() {
  const q = $('#cmdIn').value.trim(), r = parseQ(q), vid = r.veh || S.vehicle, v = VEHICLES[vid];
  $('#cmdCtx').innerHTML = `Showing results that fit <span class="tag fit">${I('circle-check')}${vLabel(v)}</span>`;
  let h = '';
  if (!q) {
    h += `<div class="cg"><h6>Popular searches</h6>${[['brake disc for 2024 Creta', 'plp:brakes:creta'], ['215/60 R17 tyres', 'plp:tyres:creta'], ['Rear tyre for Mahindra 575 DI', 'plp:tyres:m575'], ['51712-C9000', 'pdp:d2']].map(([t, a]) => item(I('search'), t, 'Search', a)).join('')}</div>
    <div class="cg"><h6>Not sure what you need?</h6>${item('<span class="orb"></span>', 'Describe the problem to Ask Vrom', 'For example: “steering shakes when I brake”', 'ai:')}</div>
    <div class="cg"><h6>My vehicles</h6>${GARAGE.map(id => item(`<img src="${VEHICLES[id].img}" alt="">`, vLabel(VEHICLES[id]), VEHICLES[id].variant + ' · ' + VEHICLES[id].plate, 'veh:' + id)).join('')}</div>`;
  } else {
    if (r.t.length) h += `<div class="cg"><h6>We understood</h6><div class="parse">${r.t.map((x, i) => `<span class="tok" style="animation-delay:${i * 50}ms"><i>${x[0]}</i><b>${x[1]}</b></span>`).join('')}</div></div>`;
    if (r.intent === 'ai') h += `<div class="cg">${item('<span class="orb"></span>', `Ask Vrom: “${q}”`, 'Get an answer and the parts that fit', 'ai:' + q, '<span class="tag ai">Answer</span>')}</div>`;
    if (r.intent === 'pn') h += `<div class="cg"><h6>Exact part number match</h6>${item(`<img src="${P('d2').img}" alt="">`, 'Hyundai Mobis Genuine Front Brake Disc (Pair)', 'OE 51712-C9000 · plus 6 equivalent brands', 'pdp:d2', `<span class="tag fit">Fits</span>`)}</div>`;
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let ps = PRODUCTS.filter(p => (r.cat ? p.cat === r.cat : words.some(w => (p.brand + ' ' + p.name).toLowerCase().includes(w))) && fitOf(p, vid) !== 'bad').slice(0, 4);
    if (ps.length) h += `<div class="cg"><h6>Products</h6>${ps.map(p => item(img(p), hl(p.brand + ' ' + p.name, words), `${fmt(p.price)} · ${p.dealers ? 'Pick up today' : 'Delivery ' + p.eta.toLowerCase()}`, 'pdp:' + p.id, fitOf(p, vid) === 'ok' ? '<span class="tag fit">Fits</span>' : '<span class="tag warn">Check</span>')).join('')}</div>`;
    if (r.cat) h += `<div class="cg">${item(I('layout-grid'), `See all ${CAT_META[r.cat].tab.toLowerCase()} for your ${v.short}`, 'With filters', `plp:${r.cat}:${vid}`)}</div>`;
    if (!h) h = `<div class="cg">${item('<span class="orb"></span>', `Ask Vrom: “${q}”`, 'We\'ll work out the part from your words', 'ai:' + q)}</div>`;
  }
  $('#cmdB').innerHTML = h; icons();
  cItems = $$('#cmdB .ci'); cItems.forEach((b, i) => b.id = 'ci' + i); markSel(0);
}
function markSel(i) {
  cSel = i; cItems.forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', j === i); });
  const a = cItems[i]; $('#cmdIn').setAttribute('aria-activedescendant', a ? a.id : ''); a && a.scrollIntoView({ block: 'nearest' });
}
const hl = (s, w) => w.reduce((a, x) => a.replace(new RegExp('(' + x.replace(/[^a-z0-9/]/gi, '') + ')', 'ig'), '<mark>$1</mark>'), s);
/* keyboard: an open overlay keeps focus inside it, and hands focus back to whatever opened it */
const OVL = ['#cmd', '#copilot', '#drawer'], FOC = 'button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
let lastFocus = null;
const remember = () => { if (!OVL.some(x => $(x).contains(document.activeElement))) lastFocus = document.activeElement; };
const restore = was => { if (was && !OVL.some(x => $(x).classList.contains('on')) && lastFocus && document.contains(lastFocus)) lastFocus.focus(); };
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const o = OVL.map(x => $(x)).filter(x => x.classList.contains('on')).pop(); if (!o) return;
  const f = $$(FOC, o).filter(x => x.offsetParent !== null), a = f[0], z = f[f.length - 1]; if (!a) return;
  if (!o.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
  else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
});
function openCmd(q = '') { remember(); $('#cmd').classList.add('on'); $('#scrim').classList.add('on'); $('#search').classList.add('focus'); $('#cmdIn').value = q; renderCmd(); setTimeout(() => $('#cmdIn').focus(), 40); }
function closeCmd(keepScrim) { const was = $('#cmd').classList.contains('on'); $('#cmd').classList.remove('on'); $('#search').classList.remove('focus'); if (!keepScrim && !$('#drawer').classList.contains('on') && !$('#copilot').classList.contains('on')) $('#scrim').classList.remove('on'); if (!keepScrim) restore(was); }
function doCmd(a) {
  const [k, x, y] = a.split(/:(.*)/s)[0] === 'ai' ? ['ai', a.slice(3)] : a.split(':');
  closeCmd(k === 'ai');
  if (k === 'ai') openCopilot(x);
  if (k === 'pdp') toPDP(x);
  if (k === 'plp') toPLP(x, y);
  if (k === 'veh') { S.vehicle = x; syncGarage(); go(S.view, true); toast(`Now shopping for <b>${vLabel(V())}</b>`); }
}
$('#sbox').addEventListener('click', e => { if (!e.target.closest('[data-act],[data-ask]')) openCmd(); });
$('#cmdIn').addEventListener('input', renderCmd);
$('#cmdIn').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { markSel(Math.max(0, Math.min(cItems.length - 1, cSel + (e.key === 'ArrowDown' ? 1 : -1)))); e.preventDefault(); }
  if (e.key === 'Home' || e.key === 'End') { markSel(e.key === 'Home' ? 0 : cItems.length - 1); e.preventDefault(); }
  if (e.key === 'Enter' && cItems[cSel]) doCmd(cItems[cSel].dataset.cmd);
});
$('#cmdB').addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b) doCmd(b.dataset.cmd); });
$('#scrim').addEventListener('click', () => { closeCmd(); closeDrawer(); closeCopilot(); $('#filters') && $('#filters').classList.remove('on'); });
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(); }
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openCmd(); }
  if (e.key === 'Escape') { closeCmd(); closeDrawer(); closeCopilot(); $('#filters') && $('#filters').classList.remove('on'); }
});

/* ============ Ask Vrom (docked assistant) ============ */
const SCN = {
  brake: { veh: 'creta', cat: 'brakes', steps: ['Matched your vehicle · <b>2024 Hyundai Creta SX 1.5 CRDi</b>', 'Likely cause · <b>warped front brake discs</b>', 'Checked fitment against OE <b>51712-C9000</b> · 7 discs fit', 'In stock at <b>4 stores</b> within 5 km'],
    a: 'A steering wheel that shakes when you brake usually means the <b>front brake discs are warped</b>, often after hard braking on hot discs. At 41,200 km, it\'s worth replacing the <b>pads</b> at the same time. Discs are always changed <b>in pairs</b>.', recs: ['d1', 'd2', 'd5'], more: 'See all 7 discs that fit' },
  tractor: { veh: 'm575', cat: 'tyres', steps: ['Matched your vehicle · <b>Mahindra 575 DI XP Plus</b>', 'Rear tyre size on this model · <b>13.6-28</b>', 'Filtered to 12-ply farm tyres · 2 fit', 'In stock at <b>3 stores</b>, one offers on-farm fitting'],
    a: 'Your 575 DI runs <b>13.6-28 rear</b> and <b>6.00-16 front</b> tyres. For mixed field and haulage work, a 12-ply lug tyre is the safer choice. Replace rear tyres <b>as a pair</b>.', recs: ['t7', 't8'], more: 'See tractor tyres' },
  track: { veh: 'jcb', cat: 'tracks', steps: ['Matched your machine · <b>JCB 30 Plus</b>', 'Original track size · <b>300 × 52.5 × 80</b>', 'Cross-checked 4 brands · 3 fit', 'Fitting crew available · <b>tomorrow</b>'],
    a: 'The 30 Plus takes a <b>300 mm wide, 52.5 mm pitch, 80-link</b> track. Count the links on your old track before ordering, because some long-undercarriage builds run 84. Block tread suits most mixed sites.', recs: ['k1', 'k2', 'k3'], more: 'See all tracks that fit' },
  fit17: { veh: 'creta', steps: ['Checked your variant · <b>SX 1.5 CRDi manual, 16-inch wheels from the factory</b>', 'Compared OE numbers · <b>51712-C9000</b> vs <b>51712-C9100</b>'],
    a: 'Your Creta SX manual left the factory on <b>16-inch wheels</b>, and this disc (OE 51712-C9000) fits it. Automatics and the SX(O) run <b>17-inch wheels</b> and need OE 51712-C9100 instead. If your tyres say R17, I can show you those.', recs: [], more: 'Show 17-inch discs', moreCat: 'brakes' },
  pads: { veh: 'creta', steps: ['Checked service history · <b>pads last changed at 0 km (estimated)</b>'],
    a: 'Yes. Mechanics recommend <b>new pads with new discs</b>, because old pads wear unevenly against a fresh surface and can cause noise. Pads for your Creta start at <b>₹1,290</b>. Fitting both takes about <b>45 minutes</b>.', recs: [], more: 'Add pads and fitting', moreAct: 'fbt' },
  time: { veh: 'creta', steps: ['Looked up labour times · <b>Creta front axle</b>'],
    a: 'Replacing front discs and pads takes about <b>45 to 60 minutes</b>. At Vrom partner garages, labour is <b>₹349</b>, and you can book a slot when you reserve the part.', recs: [], more: 'See stores that can fit it', moreAct: 'stores' },
  tsize: { veh: 'creta', cat: 'tyres', steps: ['Checked your variant · <b>SX 1.5 CRDi manual</b>', 'Factory sizes · <b>205/65 R16</b> (manual) · <b>215/60 R17</b> (automatic, SX(O))'],
    a: 'Your Creta SX manual left the factory on <b>205/65 R16</b> tyres. Automatics and the SX(O) run <b>215/60 R17</b>. The size is printed on the sidewall, so check yours before buying, because wheels sometimes get swapped. Tell me which it is and the fit badges update.', recs: ['t1', 't3'], more: 'See tyres that fit' },
  links: { veh: 'jcb', cat: 'tracks', steps: ['Matched your machine · <b>JCB 30 Plus</b>', 'Standard track · <b>300 × 52.5 × 80</b> · long builds run <b>84</b>'],
    a: 'Chalk one <b>drive lug on the inside</b> of the track, then count every lug until you are back at the chalk. Most 30 Plus machines run <b>80</b>; long-undercarriage builds run <b>84</b>. Many brands also mould the size on the inside face. If you\'d rather not, our ₹499 on-site check does it for you.', recs: [], more: 'See tracks that fit' },
  life: { veh: null, steps: ['Looked up typical wear for this part and how it\'s used'], a: '', recs: [], more: '' },
  pair: { veh: null, steps: ['Checked the replacement rules for this part'], a: '', recs: [], more: '' },
  truck: { veh: 'signa', cat: 'tyres', steps: ['Matched your vehicle · <b>Tata Signa 4825.TK tipper</b>', 'Drive axle size · <b>295/80 R22.5</b>'],
    a: 'This is a <b>drive-axle</b> lug tyre; use a rib pattern on the steer axle. Its casing can usually be <b>retreaded once or twice</b> if you pull it at about 3 mm tread. Replace in pairs on the same axle and match tread depth across twin wheels.', recs: ['t9'], more: 'See truck tyres' },
  service: { veh: null, steps: ['Read your vehicle · odometer and typical service intervals'],
    a: '', recs: [], more: '' }
};
const LIFE = { car: 'Car tyres like these usually last <b>40,000 to 50,000 km</b>. Rotate them every 10,000 km, keep them at 33 psi, and replace them when the tread reaches the wear bars at 1.6 mm.', tractor: 'Rear tractor tyres usually last <b>3,000 to 4,000 hours</b>, less if you haul a lot on tar roads. Low pressure is the main cause of early sidewall cracks.', truck: 'On tipper duty, expect <b>80,000 to 1.2 lakh km</b> before the first retread, depending on load and route.', tracks: 'A rubber track usually lasts <b>1,200 to 1,600 hours</b>. Rocky or demolition sites and sharp turns on concrete shorten that. Keep the tension right: 10 to 15 mm of sag.' };
const PAIR = { car: 'You can, but fit the two new tyres on the <b>same axle</b>. Most mechanics put new tyres on the <b>rear</b> for better grip in the wet, and you\'ll need an alignment.', tractor: 'Rear tractor tyres should be replaced <b>as a pair</b>. A new tyre next to a worn one pulls the tractor to one side and strains the differential.', truck: 'Replace tyres in <b>pairs on the same axle</b>, and match tread depth across twin wheels so they share the load.', tracks: 'Replace <b>both tracks together</b> unless the other one has more than half its lug height left. Mixing a new and a worn track makes the machine track off-line.' };
const pick = q => { const s = (q || '').toLowerCase(); return /link/.test(s) ? 'links' : /tyre size|which size/.test(s) || (/17|16|inch/.test(s) && S.cat === 'tyres') ? 'tsize' : /17|inch|wheel size/.test(s) ? 'fit17' : /retread|axle/.test(s) ? 'truck' : /last\b|lifespan/.test(s) ? 'life' : /just (one|two)|only (one|two)/.test(s) ? 'pair' : /pad/.test(s) && /need|too|also/.test(s) ? 'pads' : /how long|time|fitting take/.test(s) ? 'time' : /service|due/.test(s) ? 'service' : /tractor|575|ply|haulage|farm|ट्रैक्टर/.test(s) ? 'tractor' : /track|jcb|excavat/.test(s) ? 'track' : 'brake'; };
function cpIdle() {
  const v = V();
  $('#cpCtx').innerHTML = `<span class="th"><img src="${v.img}" alt=""></span><span>Answering for <b>${vLabel(v)}</b></span><a href="#" id="cpChg">Change</a>`;
  const sug = S.view === 'pdp' ? chipsFor(P(S.pdp)).map(q => ['circle-help', q])
    : [['activity', 'My steering shakes when I brake'], ['tractor', 'Rear tyre for my Mahindra 575 DI'], ['construction', 'New track for a JCB 30 Plus'], ['calendar-clock', `What service is due on my ${v.short}?`]];
  $('#cpB').innerHTML = `<div class="cp-hello"><b>Hi, how can I help?</b>Describe a problem in your own words, ask about a part, or check if something fits. English, हिन्दी or தமிழ்.</div><div class="cp-sugg">${sug.map(([i, t]) => `<button data-q="${t}">${I(i)}${t}<span>${I('arrow-up-right')}</span></button>`).join('')}</div>`;
  icons();
  $('#cpChg').onclick = e => { e.preventDefault(); closeCopilot(); scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => $('#gPop').classList.add('on'), 250); };
  $$('#cpB [data-q]').forEach(b => b.onclick = () => runAI(b.dataset.q));
}
function openCopilot(q) { remember(); $('#copilot').classList.add('on'); $('#scrim').classList.add('on'); cpIdle(); if (q) runAI(q); setTimeout(() => $('#cpIn').focus(), 300); }
function closeCopilot() { const was = $('#copilot').classList.contains('on'); $('#copilot').classList.remove('on'); if (!$('#drawer').classList.contains('on') && !$('#cmd').classList.contains('on')) $('#scrim').classList.remove('on'); restore(was); }
$('#cpX').onclick = closeCopilot; $('#cpNew').onclick = cpIdle;
$('#cpF').addEventListener('submit', e => { e.preventDefault(); const q = $('#cpIn').value.trim(); if (!q) return; $('#cpIn').value = ''; runAI(q); });
let aiRun = 0;
async function runAI(q) {
  const key = pick(q), sc = SCN[key], run = ++aiRun, b = $('#cpB'), wait = ms => new Promise(r => setTimeout(r, ms));
  let tmr;
  if (sc.veh && sc.veh !== S.vehicle && ['tractor', 'track', 'truck', 'links'].includes(key)) { S.vehicle = sc.veh; syncGarage(); cpIdle(); }
  const v = V(), cp = S.view === 'pdp' ? P(S.pdp) : null, kk = cp ? (cp.cat === 'tyres' ? ptype(cp) : cp.cat) : S.cat === 'tracks' ? 'tracks' : v.type === 'car' ? 'car' : v.type;
  if (key === 'life' || key === 'pair') { sc.a = (key === 'life' ? LIFE : PAIR)[kk] || (key === 'life' ? LIFE : PAIR).car; }
  if (key === 'service') { const d = DUE[v.id]; sc.a = `<b>${d.t}.</b> ${d.s} Everything else on your ${v.short} looks on schedule.`; sc.more = d.cta; sc.moreCat = d.cat; sc.steps = ['Read your vehicle · <b>' + vLabel(v) + ', ' + v.odo + '</b>', 'Compared with typical service intervals for this model']; }
  if (b.querySelector('.cp-hello')) b.innerHTML = '';
  $('.cp-h .orb').classList.add('think');
  const u = document.createElement('div'); u.className = 'mu'; u.textContent = q; b.appendChild(u);
  const st = document.createElement('div'); st.className = 'steps'; const t0 = performance.now();
  const cells = Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
  st.innerHTML = `<div class="pgload"><span class="pgrid" aria-hidden="true">${cells}</span><span class="shim">Thinking…</span><span class="pgt mono" aria-hidden="true">0.0s</span></div>`;
  b.appendChild(st);
  const pgt = st.querySelector('.pgt'); tmr = setInterval(() => { pgt.textContent = ((performance.now() - t0) / 1000).toFixed(1) + 's'; }, 100);
  b.scrollTop = b.scrollHeight; await wait(600); if (run !== aiRun) { clearInterval(tmr); return; } clearInterval(tmr); st.innerHTML = '';
  for (const s of sc.steps) { const el = document.createElement('div'); el.className = 'step run'; el.innerHTML = `<i></i><span>${s}</span>`; st.appendChild(el); b.scrollTop = b.scrollHeight; await wait(420); if (run !== aiRun) { clearInterval(tmr); return; } el.className = 'step done'; }
  const a = document.createElement('div'); a.className = 'ma'; b.appendChild(a); b.setAttribute('aria-busy', 'true');
  const parts = sc.a.split(/(<[^>]+>|\s+)/).filter(Boolean); let out = '';
  for (const p of parts) { if (run !== aiRun) { clearInterval(tmr); return; } out += p; a.innerHTML = out + '<span class="cur"></span>'; if (!p.startsWith('<') && p.trim()) await wait(22); b.scrollTop = b.scrollHeight; }
  a.innerHTML = out; b.setAttribute('aria-busy', 'false'); $('.cp-h .orb').classList.remove('think');
  if (sc.recs.length) { const r = document.createElement('div'); r.className = 'recs'; r.innerHTML = sc.recs.map((id, i) => { const p = P(id); return `<button class="rec" data-pdp="${id}" style="animation-delay:${i * 80}ms"><div class="im">${img(p)}</div><small>${p.brand}</small><b>${p.name}</b><div class="p">${fmt(p.price)}</div></button>`; }).join(''); b.appendChild(r); }
  if (sc.more) { const c = document.createElement('div'); c.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap'; c.innerHTML = `<button class="btn sun sm" id="aiMore">${sc.more} ${I('arrow-right')}</button>${key === 'brake' ? `<button class="btn line sm">${I('wrench')} Book a brake check · ₹199</button>` : ''}`; b.appendChild(c); icons();
    $('#aiMore').onclick = () => { closeCopilot(); if (sc.moreAct === 'fbt') { $('#fbt') && $('#fbt').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } if (sc.moreAct === 'stores') { $('#stores') && $('#stores').scrollIntoView({ behavior: 'smooth' }); return; } toPLP(sc.cat || sc.moreCat, sc.veh || S.vehicle); }; }
  b.scrollTop = b.scrollHeight;
}

/* ============ PLP ============ */
const base = () => PRODUCTS.filter(p => p.cat === S.cat).filter(p => !S.fitsOnly || fitOf(p) !== 'bad');
function applyF(list, skip) {
  return list.filter(p => Object.entries(S.f).every(([k, v]) => {
    if (k === skip) return true;
    if (k === 'price') return p.price >= v[0] && p.price <= v[1];
    if (k === 'avail') return v.every(a => a === 'pickup' ? p.dealers > 0 && p.eta === 'Today' : ['Today', 'Tomorrow'].includes(p.eta));
    if (k === 'rating') return p.rating >= Math.max(...v);
    return !v.length || v.includes(p[k]);
  }));
}
const score = p => (p.best ? 3 : 0) + (fitOf(p) === 'ok' ? 2 : fitOf(p) === 'warn' ? 1 : 0) + p.rating * Math.log10(p.reviews + 1) / 10;
const sortL = l => [...l].sort((a, b) => ({ plh: a.price - b.price, phl: b.price - a.price, rat: b.rating - a.rating, near: b.dealers - a.dealers }[S.sort] ?? score(b) - score(a)));
function renderPLP() {
  const m = CAT_META[S.cat], v = V(), all = PRODUCTS.filter(p => p.cat === S.cat), fitN = all.filter(p => fitOf(p) === 'ok').length, warnN = all.filter(p => fitOf(p) === 'warn').length;
  const noun = n => n === 1 ? m.one : m.tab.toLowerCase(), basis = { brakes: 'variant and original part number', tyres: 'variant and tyre size', tracks: 'machine and track size' }[S.cat];
  const list = sortL(applyF(base()));
  const prices = all.map(p => p.price), pmin = Math.floor(Math.min(...prices) / 100) * 100, pmax = Math.ceil(Math.max(...prices) / 100) * 100, pr = S.f.price || [pmin, pmax];
  const ask = askOf(S.cat, v.id);
  $('#plp').innerHTML = `
    <div class="crumbs"><a href="#" data-go="home">Home</a>${m.crumb.map(c => `${I('chevron-right')}<a href="#">${c}</a>`).join('')}${I('chevron-right')}<span>${m.title}</span></div>
    <div class="plp-h">
      <div><h1>${m.title}</h1><div class="for"><span class="th"><img src="${v.img}" alt=""></span>for <b>${vLabel(v)}</b> ${v.variant} <button class="link" id="chV">Change</button></div></div>
      <div class="ctabs">${Object.entries(CAT_META).map(([k, c]) => `<button class="${S.cat === k ? 'on' : ''}" data-cat="${k}"><span><img src="${c.icon}" alt=""></span>${c.tab}</button>`).join('')}</div>
    </div>
    <div class="ctx"><div class="fitstrip ${fitN ? '' : warnN ? 'warn' : 'bad'}" role="status">${fitN ? I('circle-check') : I('circle-alert')}<span>${fitN ? `<b>${fitN} ${noun(fitN)} fit${fitN === 1 ? 's' : ''} your ${v.short}.</b> Matched on ${basis}.${warnN ? ` ${warnN} more depend${warnN === 1 ? 's' : ''} on your answer below.` : ''}` : warnN ? `<b>${warnN} ${noun(warnN)} may fit your ${v.short}.</b> Answer the question below to confirm.` : `<b>None of these fit your ${v.short}.</b> Switch vehicle or browse everything.`}</span>
      <div class="r"><button class="swl" id="fitSw" role="switch" aria-checked="${S.fitsOnly}"><span class="sw ${S.fitsOnly ? 'on' : ''}"></span>Show only parts that fit</button></div></div></div>
    ${ask ? `<div class="askv">${I('circle-help')}<div class="q">${ask.q}</div>${askHTML(ask)}</div>` : ''}
    <div class="plp">
      <aside class="filters" id="filters">${facetsHTML(pr, pmin, pmax)}</aside>
      <div>
        <div class="qtake" id="qtake"><button aria-expanded="false" aria-controls="qtakeIn"><span class="orb"></span>${m.q}<span class="tag ai">AI answer</span>${I('chevron-down')}</button><div class="in" id="qtakeIn"><div><p>${(m.qtBy && m.qtBy[v.id]) || m.qt} <a href="#" class="link" data-ask="${m.q}">Ask a follow-up</a></p></div></div></div>
        <div class="toolbar">
          <div class="l"><button class="btn line sm mfilt" id="mfBtn">${I('sliders-horizontal')} Filters</button><span class="count"><b>${list.length}</b> results</span>${chipsHTML()}</div>
          <div class="r"><select class="sel sortsel" id="sortSel">${[['rec', 'Sort: Best match'], ['plh', 'Price: low to high'], ['phl', 'Price: high to low'], ['rat', 'Top rated'], ['near', 'Most stores nearby']].map(([k, t]) => `<option value="${k}" ${S.sort === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
            <div class="lay"><button class="${S.layout === 'grid' ? 'on' : ''}" data-lay="grid" title="Grid view">${I('layout-grid')}</button><button class="${S.layout === 'list' ? 'on' : ''}" data-lay="list" title="List view for garages">${I('list')}</button></div></div>
        </div>
        ${S.layout === 'grid' ? `<div class="grid">${gridHTML(list)}</div>` : listHTML(list)}
      </div>
    </div>`;
  bindPLP(pmin, pmax); icons();
}
function facetsHTML(pr, pmin, pmax) {
  const b = base();
  return `<div class="fh"><b>Filters</b>${Object.keys(S.f).length ? '<button class="link" data-rm="all">Clear all</button>' : ''}</div>` + FACETS[S.cat].map(f => {
    if (f.type === 'range') {
      const l = (pr[0] - pmin) / (pmax - pmin) * 100, r = (pr[1] - pmin) / (pmax - pmin) * 100;
      return `<div class="fg"><button>${f.label}${I('chevron-down')}</button><div class="hist">
        <div class="rng"><div class="tl"><i style="left:${l}%;right:${100 - r}%"></i></div><input type="range" id="rLo" min="${pmin}" max="${pmax}" step="100" value="${pr[0]}" aria-label="Minimum price"><input type="range" id="rHi" min="${pmin}" max="${pmax}" step="100" value="${pr[1]}" aria-label="Maximum price"></div>
        <div class="rngv"><span id="rLoV">${fmt(pr[0])}</span>to<span id="rHiV">${fmt(pr[1])}</span></div></div></div>`;
    }
    if (f.type === 'avail') {
      const sel = S.f.avail || [];
      return `<div class="fg"><button>${f.label}${I('chevron-down')}</button><div class="fopts">${[['pickup', 'Pick up today'], ['ship', 'Delivered by tomorrow']].map(([k, t]) => { const n = applyF(b, 'avail').filter(p => k === 'pickup' ? p.dealers > 0 && p.eta === 'Today' : ['Today', 'Tomorrow'].includes(p.eta)).length; return `<div class="fo ${sel.includes(k) ? 'on' : ''} ${n ? '' : 'dis'}" data-fk="avail" data-fv="${k}"><span class="sw ${sel.includes(k) ? 'on' : ''}"></span>${t}<em>${n}</em></div>`; }).join('')}</div></div>`;
    }
    if (f.type === 'rating') {
      const sel = S.f.rating || [];
      return `<div class="fg"><button>${f.label}${I('chevron-down')}</button><div class="fopts">${[4.5, 4].map(r => { const n = applyF(b, 'rating').filter(p => p.rating >= r).length; return `<div class="fo ${sel.includes(r) ? 'on' : ''} ${n ? '' : 'dis'}" data-fk="rating" data-fv="${r}"><span class="cb"></span><span class="rating">${r}${I('star')}</span>&amp; above<em>${n}</em></div>`; }).join('')}</div></div>`;
    }
    const sel = S.f[f.k] || [], vals = [...new Set([...b.map(p => p[f.k]), ...sel])];
    const rows = vals.map(v => ({ v, n: applyF(b, f.k).filter(p => p[f.k] === v).length })).sort((a, c) => c.n - a.n);
    return `<div class="fg"><button>${f.label}${I('chevron-down')}</button>${f.info ? `<span class="finfo" tabindex="0" data-tip="${f.info}">${I('circle-help')}</span>` : ''}<div class="fopts">${rows.map(({ v, n }) => `<div class="fo ${sel.includes(v) ? 'on' : ''} ${n || sel.includes(v) ? '' : 'dis'}" data-fk="${f.k}" data-fv="${v}"><span class="cb"></span>${v}<em>${n}</em></div>`).join('')}</div></div>`;
  }).join('') + `<button class="btn sun block mfilt" style="margin-top:16px" id="mfDone">Show results</button>`;
}
function chipsHTML() {
  const c = [];
  Object.entries(S.f).forEach(([k, v]) => { if (k === 'price') c.push(`<span class="chipx">${fmt(v[0])} – ${fmt(v[1])}<button data-rm="price" aria-label="Remove">${I('x')}</button></span>`); else v.forEach(x => c.push(`<span class="chipx">${k === 'avail' ? (x === 'pickup' ? 'Pick up today' : 'By tomorrow') : k === 'rating' ? x + '★ & above' : x}<button data-rm="${k}" data-rv="${x}" aria-label="Remove">${I('x')}</button></span>`)); });
  return c.join('');
}
const HELP = { brakes: ['Not sure which one? Get it checked first.', '₹199 brake inspection at a partner garage near you, adjusted if you buy.'], tyres: ['Not sure of your size? We\'ll read it for you.', 'Free tyre-size and tread check at any Vrom store. About 10 minutes.'], heavy: ['Not sure which tyre? We\'ll come to you.', '₹299 on-site tyre check for tractors and trucks, adjusted if you buy.'], tracks: ['Not sure of the link count? We\'ll measure it.', '₹499 on-site undercarriage check: links, sprockets and rollers, adjusted if you buy.'] };
function gridHTML(list) {
  if (!list.length) return emptyHTML();
  const cards = list.map(cardHTML);
  const [ht, hs] = HELP[S.cat === 'tyres' && V().type !== 'car' ? 'heavy' : S.cat];
  cards.splice(Math.min(8, cards.length), 0, `<div class="help"><span class="av"><span style="background:#222222">RK</span><span style="background:#3F3F3F">SM</span><span style="background:#6A6A6A">PV</span></span><div><b>${ht}</b><small>${hs}</small></div><button class="btn line sm">${I('calendar')} Book a slot</button></div>`);
  return cards.join('');
}
function listHTML(list) {
  if (!list.length) return `<div class="grid">${emptyHTML()}</div>`;
  return `<table class="lt"><thead><tr><th></th><th>Product</th><th>Part no.</th><th>Fit</th><th>Stock nearby</th><th>Price</th><th>Qty</th><th></th></tr></thead><tbody>${list.map(p => `<tr data-pdp="${p.id}"><td><span class="th">${img(p)}</span></td><td><b style="font-weight:600">${p.brand}</b><div class="muted" style="font-size:12.5px">${p.name}</div></td><td class="mono" style="font-size:12px">${p.pn}</td><td>${fitOf(p) === 'ok' ? '<span class="tag fit">Fits</span>' : fitOf(p) === 'warn' ? '<span class="tag warn">Check</span>' : '<span class="tag bad">No</span>'}</td><td>${p.dealers ? `<b style="color:var(--fit);font-weight:600">${p.dealers * 3 + 2} units</b> · ${p.dealers} stores` : `<span class="muted">Ships ${p.eta.toLowerCase()}</span>`}</td><td><b>${fmt(p.price)}</b><div style="font-size:12px;color:var(--fit)">Pro ${fmt(Math.round(p.price * .86 / 10) * 10)}</div></td><td><span class="qty" onclick="event.stopPropagation()"><button>${I('minus')}</button><span>1</span><button>${I('plus')}</button></span></td><td><button class="btn sun xs" data-add="${p.id}">Add</button></td></tr>`).join('')}</tbody></table>`;
}
function emptyHTML() {
  const v = V(), any = PRODUCTS.some(p => p.cat === S.cat && fitOf(p) !== 'bad');
  if (!any) return `<div class="empty"><span class="ei">${I('circle-alert')}</span><h3>No ${CAT_META[S.cat].tab.toLowerCase()} for a ${v.name}</h3><p>This category doesn't apply to your ${v.short}. Pick another vehicle, or turn off “Show only parts that fit”.</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${GARAGE.filter(id => PRODUCTS.some(p => p.cat === S.cat && p.fits.includes(id))).map(id => `<button class="btn line sm" data-veh="${id}">Shop for ${VEHICLES[id].short}</button>`).join('')}</div></div>`;
  return `<div class="empty"><span class="ei">${I('filter-x')}</span><h3>No products match these filters</h3><p>Try a wider price range or remove a filter.</p><button class="btn sun sm" data-rm="all">Clear all filters</button></div>`;
}
function bindPLP(pmin, pmax) {
  $('#plp').onclick = e => {
    const t = e.target;
    const fg = t.closest('.fg>button'); if (fg) { fg.parentElement.classList.toggle('closed'); return; }
    const fo = t.closest('.fo[data-fk]'); if (fo) { const k = fo.dataset.fk; let v = fo.dataset.fv; if (k === 'rating') v = +v; const a = S.f[k] || []; S.f[k] = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; if (!S.f[k].length) delete S.f[k]; refresh(); return; }
    const rm = t.closest('[data-rm]'); if (rm) { e.preventDefault(); const k = rm.dataset.rm; if (k === 'all') S.f = {}; else if (k === 'price') delete S.f.price; else { let v = rm.dataset.rv; if (k === 'rating') v = +v; S.f[k] = S.f[k].filter(x => x !== v); if (!S.f[k].length) delete S.f[k]; } refresh(); return; }
    const cm = t.closest('[data-cmp]'); if (cm) { e.stopPropagation(); const id = cm.dataset.cmp; S.compare = S.compare.includes(id) ? S.compare.filter(x => x !== id) : [...S.compare, id].slice(-3); cm.classList.toggle('on', S.compare.includes(id)); renderTray(); return; }
    const ct = t.closest('[data-cat]'); if (ct) { toPLP(ct.dataset.cat); return; }
    const ly = t.closest('[data-lay]'); if (ly) { S.layout = ly.dataset.lay; renderPLP(); return; }
    if (t.closest('#qtake>button')) { const o = $('#qtake').classList.toggle('open'); $('#qtake>button').setAttribute('aria-expanded', o); return; }
    if (t.closest('#chV')) { scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => $('#gPop').classList.add('on'), 250); return; }
    if (t.closest('#fitSw')) { e.preventDefault(); S.fitsOnly = !S.fitsOnly; refresh(); return; }
    if (t.closest('#mfBtn')) { $('#filters').classList.add('on'); $('#scrim').classList.add('on'); return; }
    if (t.closest('#mfDone')) { $('#filters').classList.remove('on'); $('#scrim').classList.remove('on'); return; }
  };
  $('#sortSel').onchange = e => { S.sort = e.target.value; refresh(); };
  const lo = $('#rLo'), hi = $('#rHi');
  const upd = commit => { let a = +lo.value, b = +hi.value; if (a > b - 200) { if (document.activeElement === lo) a = b - 200; else b = a + 200; lo.value = a; hi.value = b; }
    $('#rLoV').textContent = fmt(a); $('#rHiV').textContent = fmt(b);
    $('.rng .tl i').style.cssText = `left:${(a - pmin) / (pmax - pmin) * 100}%;right:${100 - (b - pmin) / (pmax - pmin) * 100}%`;
    if (commit) { if (a <= pmin && b >= pmax) delete S.f.price; else S.f.price = [a, b]; refresh(); } };
  [lo, hi].forEach(x => { x.oninput = () => upd(false); x.onchange = () => upd(true); });
}
function refresh() {
  const closed = $$('#filters .fg').map(g => g.classList.contains('closed')), sheet = $('#filters').classList.contains('on'), qo = $('#qtake').classList.contains('open');
  renderPLP();
  $$('#filters .fg').forEach((g, i) => closed[i] && g.classList.add('closed'));
  if (sheet) $('#filters').classList.add('on'); if (qo) { $('#qtake').classList.add('open'); $('#qtake>button').setAttribute('aria-expanded', true); }
}
function renderTray() {
  const t = $('#tray');
  if (!S.compare.length || S.view !== 'plp') { t.classList.remove('on'); return; }
  t.innerHTML = `<b style="font-weight:600">Compare</b>${[0, 1, 2].map(i => { const p = P(S.compare[i]); return p ? `<span class="s">${img(p)}</span>` : '<span class="s e"></span>'; }).join('')}<button class="btn sun sm" id="cmpGo" ${S.compare.length < 2 ? 'disabled style="opacity:.45"' : ''}>Compare ${S.compare.length}</button><button class="btn ghost sm" id="cmpX">Clear</button>`;
  t.classList.add('on');
  $('#cmpX').onclick = () => { S.compare = []; $$('.cmp').forEach(c => c.classList.remove('on')); renderTray(); };
  $('#cmpGo').onclick = () => S.compare.length > 1 && openCompare();
}
function openCompare() {
  const ps = S.compare.map(P), minP = Math.min(...ps.map(p => p.price)), maxR = Math.max(...ps.map(p => p.rating)), maxD = Math.max(...ps.map(p => p.dealers));
  const row = (l, f, best) => `<tr><th>${l}</th>${ps.map(p => `<td class="${best && best(p) ? 'best' : ''}">${f(p)}</td>`).join('')}</tr>`;
  openDrawer(`<div class="dr-h"><div><h3>Compare products</h3><small>For your ${vLabel(V())}</small></div><button class="x" data-close aria-label="Close">${I('x')}</button></div>
  <div class="dr-b"><table class="cmpt"><tr><th></th>${ps.map(p => `<td><div class="im">${img(p)}</div><span class="muted" style="font-size:12px;font-weight:600">${p.brand.toUpperCase()}</span><div style="font-weight:500">${p.name}</div></td>`).join('')}</tr>
  ${row('Fits your vehicle', p => fitOf(p) === 'ok' ? '<span class="tag fit">Yes</span>' : '<span class="tag warn">Check variant</span>')}${row('Price', p => fmt(p.price), p => p.price === minP)}${row('Quality', p => p.tier)}${row('Type', p => p.style || p.use || p.pattern)}${row('Rating', p => `${p.rating} ★ (${p.reviews})`, p => p.rating === maxR)}${row('Warranty', p => p.warranty)}${row('Pick up today', p => p.dealers ? p.dealers + ' stores' : '—', p => p.dealers === maxD)}
  <tr><th></th>${ps.map(p => `<td><button class="btn sun sm" data-pdp="${p.id}" data-close>View product</button></td>`).join('')}</tr></table></div>`, true);
}

/* ============ drawer ============ */
function openDrawer(html, wide) { remember(); const d = $('#drawer'); d.innerHTML = html; d.classList.toggle('wide', !!wide); d.classList.add('on'); $('#scrim').classList.add('on'); $$('[data-close]', d).forEach(b => b.addEventListener('click', closeDrawer)); icons(); d.setAttribute('aria-label', d.querySelector('h3')?.textContent || 'Details'); setTimeout(() => (d.querySelector('[data-close]') || d).focus(), 50); }
function closeDrawer() { const was = $('#drawer').classList.contains('on'); $('#drawer').classList.remove('on'); if (!$('#cmd').classList.contains('on') && !$('#copilot').classList.contains('on')) $('#scrim').classList.remove('on'); restore(was); }

/* ============ PDP ============ */
/* compatibility, reviews and Q&A depend on the kind of part: car disc, car tyre by rim size, tractor tyre, truck tyre, track */
const kindOf = p => p.cat === 'tyres' ? (ptype(p) === 'car' ? 'tyres' + p.wheel : 'tyres_' + ptype(p)) : p.cat + (p.wheel === 17 || p.links === 84 ? '_alt' : '');
const ALSO = {
  brakes: ['Hyundai Creta 2020–2025, 16-inch', 'Kia Seltos 2019–2024', 'Hyundai Verna 2017–2020', 'Kia Carens 2022–2024', 'Hyundai Alcazar 2021–2024'],
  brakes_alt: ['Hyundai Creta 2020–2025, 17-inch', 'Kia Seltos GTX 2019–2024', 'Hyundai Alcazar Signature'],
  tyres16: ['Hyundai Creta E, EX, S, SX manual', 'Kia Seltos HTE, HTK', 'Hyundai Alcazar Prestige', 'Mahindra XUV300 W6'],
  tyres17: ['Hyundai Creta SX automatic, SX(O)', 'Kia Seltos HTX', 'MG Astor Sharp', 'Mahindra XUV300 W8'],
  tyres_tractor: ['Mahindra 575 DI XP Plus', 'Mahindra Arjun 605 DI', 'Swaraj 744 FE', 'Sonalika DI 745 III'],
  tyres_truck: ['Tata Signa 4825.TK', 'Ashok Leyland 2820', 'BharatBenz 2823C', 'Eicher Pro 6028'],
  tracks: ['JCB 30 Plus', 'Kubota U30-3', 'Tata Hitachi EX30', 'Bobcat E26'],
  tracks_alt: ['JCB 30 Plus, 84-link builds', 'Kubota U30-3 long arm', 'Takeuchi TB230']
};
const COMPAT = {
  brakes: [['Hyundai', 'Creta', '2020–2025', '1.5 CRDi / 1.5 MPi', 'E, EX, S, SX manual (16-inch)', 'mine'], ['Kia', 'Seltos', '2019–2024', '1.5 CRDi / 1.5 MPi', 'HTE, HTK, HTX', ''], ['Hyundai', 'Verna', '2017–2020', '1.6 CRDi / 1.6 VTVT', 'All', ''], ['Kia', 'Carens', '2022–2024', '1.5 CRDi', 'Premium, Prestige', ''], ['Hyundai', 'Alcazar', '2021–2024', '1.5 CRDi', 'Prestige, Platinum', '']],
  brakes_alt: [['Hyundai', 'Creta', '2020–2025', '1.5 CRDi / 1.5 Turbo', 'SX automatic, SX(O) (17-inch)', 'mine'], ['Kia', 'Seltos', '2019–2024', '1.5 CRDi', 'HTX+, GTX', ''], ['Hyundai', 'Alcazar', '2021–2024', '1.5 CRDi', 'Signature', '']],
  tyres16: [['Hyundai', 'Creta', '2020–2025', 'All', 'E, EX, S, SX manual (16-inch)', 'mine'], ['Kia', 'Seltos', '2019–2024', 'All', 'HTE, HTK', ''], ['Hyundai', 'Alcazar', '2021–2024', 'All', 'Prestige', '']],
  tyres17: [['Hyundai', 'Creta', '2020–2025', 'All', 'SX automatic, SX(O) (17-inch)', 'mine'], ['Kia', 'Seltos', '2019–2024', 'All', 'HTX', ''], ['MG', 'Astor', '2021–2024', 'All', 'Sharp', '']],
  tyres_tractor: [['Mahindra', '575 DI XP Plus', '2018+', '47 HP', 'Rear axle', 'mine'], ['Mahindra', 'Arjun 605 DI', '2016+', '57 HP', 'Rear axle', ''], ['Swaraj', '744 FE', '2015+', '48 HP', 'Rear axle', '']],
  tyres_truck: [['Tata', 'Signa 4825.TK', '2019+', 'Cummins 6.7 L', 'Drive axle', 'mine'], ['Ashok Leyland', '2820 Tipper', '2018+', 'H6', 'Drive axle', ''], ['BharatBenz', '2823C', '2018+', 'OM926', 'Drive axle', '']],
  tracks: [['JCB', '30 Plus', '2016–2024', 'Standard undercarriage', '80-link builds', 'mine'], ['Kubota', 'U30-3', '2014–2022', 'Standard', 'All', ''], ['Tata Hitachi', 'EX30', '2018+', 'Standard', 'All', '']],
  tracks_alt: [['JCB', '30 Plus', '2016–2024', 'Long undercarriage', '84-link builds', 'mine'], ['Kubota', 'U30-3', '2014–2022', 'Long arm', 'All', ''], ['Takeuchi', 'TB230', '2015+', 'Standard', 'All', '']]
};
const CHIPS = {
  brakes: ['Will this fit my 17-inch wheels?', 'Do I need new pads too?', 'How long does fitting take?'],
  car: ['Which tyre size does my Creta take?', 'How long will these tyres last?', 'Can I replace just two tyres?'],
  tractor: ['Is 12-ply enough for haulage?', 'Can I replace just one rear tyre?', 'Do you fit tyres on the farm?'],
  truck: ['Is this for the drive or steer axle?', 'Can this tyre be retreaded?', 'Can I replace just two tyres?'],
  tracks: ['How do I count the links on my track?', 'How long will a rubber track last?', 'Can I replace just one track?']
};
const chipsFor = p => CHIPS[p.cat === 'tyres' ? ptype(p) : p.cat];
const REV = {
  brakes: { sum: 'Owners say the shaking stopped completely after fitting, and braking feels smoother and quieter than the worn discs. Several mention the finish matches the original Hyundai part. A few say fitting took longer because the old discs were rusted on.', th: [['Smooth braking', 412], ['Fits perfectly', 388], ['Value for money', 260]], tw: ['Fitting time', 41],
    t1: 'Shaking gone completely', r1: 'Steering used to shake at 60+ when braking on the Salem highway. Fitted these with new pads at the Avinashi Road hub. Took about an hour and the shake is fully gone.', ph: ['brake-perf', 'brake-rotor'], n1: 'Arjun K.',
    r2: 'I fit around 20 sets a month on Cretas and Seltos. Finish and thickness match the Mobis part. Clean the hub face properly or you will get run-out.', w2: 'Ravi S. · Garage owner, Coimbatore', role: 'Mechanic' },
  car: { sum: 'Quiet on highways and confident in the rain. Some find the ride slightly firmer than the original tyre. Several mention same-day fitting with alignment at the hub.', th: [['Quiet ride', 301], ['Wet grip', 244], ['Value for money', 198]], tw: ['Firmer ride', 37],
    t1: 'Quiet and grippy in the rain', r1: 'Picked up and fitted the same evening with alignment. Much quieter than my old tyres on the Salem highway, and no sliding in the rain.', ph: ['tyre-wheel', 'mech-tyre'], n1: 'Arjun K.',
    r2: 'I stock this size for Cretas and Seltos. Ask for the latest date code on the sidewall; we always fit the newest stock first.', w2: 'Senthil R. · Tyre dealer, Coimbatore', role: 'Dealer' },
  tractor: { sum: 'Farmers say the lugs clean well in wet clay and hold up to haulage on tar roads. A few say the sidewall cracked early when run under-inflated.', th: [['Grip in wet fields', 402], ['Long life', 288], ['Road haulage', 190]], tw: ['Sidewall cracks', 22],
    t1: 'Grips in wet paddy fields', r1: 'Fitted both rears on my 575 DI before the kuruvai season. No slipping in wet fields, and steady on the road with a loaded trolley.', ph: ['tractor-tyre-red', 'tractor-field'], n1: 'Murugesan P.',
    r2: 'We fit these on the farm the same day. Keep 16 to 18 psi for field work; most early failures I see are from low pressure.', w2: 'Sakthi Tractors · Dealer, Ukkadam', role: 'Dealer' },
  truck: { sum: 'Fleet owners report good mileage before the first retread and even wear on twin wheels. A few mention the price is higher than local brands.', th: [['Mileage', 96], ['Retreadable casing', 71], ['Even wear', 54]], tw: ['Price', 18],
    t1: 'Ran 1.1 lakh km before retread', r1: 'Fitted on four Signa tippers on quarry routes. They ran about 1.1 lakh km before the first retread, and the casings were still good.', ph: ['tyre-tread', 'tyre-shop'], n1: 'Meena V.',
    r2: 'Good stock at the hub for fleet orders. I send part numbers on WhatsApp and they keep a set ready for the night shift.', w2: 'Ramesh K. · Fleet mechanic, Coimbatore', role: 'Mechanic' },
  tracks: { sum: 'Operators say grip is good on mixed sites and the track holds tension well. A few warn that 80 and 84-link tracks look identical, so count before ordering.', th: [['Holds tension', 31], ['Grip on mixed sites', 27], ['Fits first time', 22]], tw: ['Check link count', 9],
    t1: 'Fitted in under three hours', r1: 'The crew came to site, put the machine on stands and swapped both tracks in under three hours. Tension has held for 300 hours so far.', ph: ['tracks-sand', 'excavator-mini'], n1: 'Prakash D.',
    r2: 'Count the links before you order. We see one or two 84-link machines a month, and the wrong track simply will not tension.', w2: 'Kovai Earthmover Spares · Dealer', role: 'Dealer' }
};
const QA = {
  brakes: [['Do I need to change both discs?', 'Yes. Discs are always replaced in pairs on the same axle so braking stays even. This listing is for a pair.', 'Ravi S., mechanic · 38 people found this helpful'], ['Will this fit the automatic version of the Creta?', 'It depends on the wheel size, not the gearbox. Cretas on 16-inch wheels use OE 51712-C9000; Cretas on 17-inch wheels (automatics and the SX(O)) use 51712-C9100. The size is printed on your tyre.', 'Vrom parts team']],
  car: [['Should I replace all four tyres?', 'Not always. Replace in pairs on the same axle. If only two are new, most mechanics put them on the rear for better grip in the wet.', 'Senthil R., tyre dealer · 52 people found this helpful'], ['How do I read the tyre size?', '205/65 R16 95H means 205 mm wide, a sidewall 65% as tall as the width, a 16-inch rim, load index 95 and speed rating H. It is printed on the sidewall of your current tyre.', 'Vrom parts team']],
  tractor: [['Tube type or tubeless?', 'Most rear tractor tyres in this size are tube type. The price is for the tyre only; a new tube and flap add about ₹1,800 at the store.', 'Sakthi Tractors, dealer · 44 people found this helpful'], ['Can I fit 14.9-28 instead?', 'Some 575 DI units run 14.9-28. Only change size if both rears change together and your rims allow it. Ask the store to check before fitting.', 'Vrom parts team']],
  truck: [['Is this for the drive or steer axle?', 'Drive axle. The lug pattern is built for traction. Use a rib-pattern tyre on the steer axle.', 'Ramesh K., fleet mechanic · 19 people found this helpful'], ['Can the casing be retreaded?', 'Yes, usually once or twice if you pull the tyre at about 3 mm tread. The store can arrange retreading.', 'Vrom parts team']],
  tracks: [['How do I count the links?', 'Chalk one drive lug on the inside of the track and count round until you reach it again. Most brands also mould the size on the inside face.', 'Kovai Earthmover Spares, dealer · 27 people found this helpful'], ['Do I need new sprockets too?', 'If the sprocket teeth look hooked or pointed, yes. A worn sprocket wears out a new track quickly. The fitting crew checks this on site.', 'Vrom parts team']]
};
const revKey = p => p.cat === 'tyres' ? ptype(p) : p.cat;
const dealersFor = p => p.cat === 'tracks' || (p.cat === 'tyres' && ptype(p) !== 'car') ? DEALERS_HEAVY : DEALERS;
function renderPDP() {
  const p = P(S.pdp) || P('d1'), v = V(), f = fitOf(p), isB = p.cat === 'brakes', isT = p.cat === 'tyres', ty = ptype(p), pv = pveh(p), kd = kindOf(p), rk = revKey(p), rv = REV[rk], dl = dealersFor(p), heavy = dl === DEALERS_HEAVY;
  if (!dl.some(d => d.id === S.store)) S.store = dl[0].id;
  const ak = askOf(p.cat, v.id), dep = ak && p[ak.k] && forV(p, v.id), mism = dep && S.ans[ak.k] !== null && f === 'bad';
  const stores = [...dl].sort((a, b) => S.ssort === 'price' ? (a.stock ? a.factor : 9) - (b.stock ? b.factor : 9) : S.ssort === 'fit' ? (b.fit - a.fit) || (!a.stock - !b.stock) || a.km - b.km : (!a.stock - !b.stock) || a.km - b.km).filter(d => S.ssort !== 'open' || !d.closing);
  /* stores that have it come first (nearest within each group); the top card is open until the shopper picks one themselves */
  if (!S.picked && stores.length) S.store = stores[0].id;
  const sp = d => Math.round(p.price * d.factor / 10) * 10, minSP = Math.min(...dl.filter(d => d.stock).map(sp));
  const gal = isB ? [[p.img, 'Product', 0], [P('d5').img, 'Back', 0], [PH('brake-perf'), 'Fitted', 1], [PH('brake-rotor'), 'Where it goes', 1, 'where'], [C('brake-kit'), 'Assembly', 0]]
    : isT && ty === 'tractor' ? [[p.img, 'Product', p.photo ? 1 : 0], [PH(p.photo ? 'tractor-farmtrac' : 'tractor-tyre-red'), 'On a tractor', 1], [PH('tractor-field'), 'In the field', 1]]
    : isT && ty === 'truck' ? [[p.img, 'Product', p.photo ? 1 : 0], [C('excon-truck'), 'On the vehicle', 0], [PH('tyre-shop'), 'Fitting', 1]]
    : isT ? [[p.img, 'Product', p.photo ? 1 : 0], [PH('tyre-tread'), 'Tread', 1], [PH('mrf-shop'), 'Fitting', 1]] : [[p.img, 'Product', p.photo ? 1 : 0], [PH('excavator-mini'), 'On machine', 1], [PH('tracks-sand'), 'In use', 1]];
  const fitT = f === 'ok' ? `Fits your ${vLabel(v)}` : f === 'warn' ? `Fits some ${v.short} variants` : `Doesn't fit your ${vLabel(v)}`;
  const unit = ak && ak.k === 'wheel' ? '-inch wheels' : ' links';
  const fitS = f === 'ok' ? `${v.variant} · ${v.fuel} · ${v.plate}` : f === 'warn' ? p.variantNote : mism ? `Made for ${p[ak.k]}${unit}. You told us yours has ${S.ans[ak.k]}${unit}.` : `Made for ${[...p.fits, ...(p.variant || [])].map(id => VEHICLES[id].name).join(', ') || 'other vehicles'}.`;
  const labour = isB ? 349 : p.cat === 'tracks' ? 4500 : ty === 'truck' ? 1200 : ty === 'tractor' ? 900 : 600;
  /* how do you want it: one compact switch + one line of detail, instead of three large cards */
  const inStock = dl.filter(d => d.stock), reach = Math.ceil(Math.max(...inStock.map(d => d.km)));
  const fseg = [['pickup', 'store', 'Pick up today', `In stock at ${inStock.length} stores within ${reach} km`, 'ok'], ['ship', 'truck', heavy ? 'Delivery' : 'Delivery', heavy ? 'In 2 days, free, to your farm or site' : 'Tomorrow before 9 PM, free', ''], ['fit', 'wrench', 'Get it fitted', heavy ? `Tomorrow, a crew comes to you · + ${fmt(labour)} labour` : `Today 4:30 PM at a partner garage · + ${fmt(labour)} labour`, '']];
  const sub = isB ? `${p.style} · Ventilated · Pair for both front wheels` : isT ? `${p.size} · ${p.use} · ${p.speed}` : `${p.size} · ${p.pattern} tread · ${p.core} core`;
  const evItems = [p.oe ? `Matches OE ${p.oe}` : p.cat === 'tracks' ? `Machine match, ${p.size}` : `Size ${p.size} matches`, `${isB ? '1,284' : isT ? '842' : '61'} fitted on a ${v.short}`];
  $('#pdp').innerHTML = `
  <div class="crumbs"><a href="#" data-go="home">Home</a>${CAT_META[p.cat].crumb.map(c => `${I('chevron-right')}<a href="#" data-plp="${p.cat}">${c}</a>`).join('')}${I('chevron-right')}<a href="#" data-plp="${p.cat}">${CAT_META[p.cat].title}</a></div>
  <div class="pdp">
    <div class="gal">
      <div class="thumbs" id="thumbs">${gal.map((g, i) => `<button class="${i ? '' : 'on'}" data-g="${i}"><img src="${g[0]}" alt="" ${g[2] ? 'class="photo"' : ''}>${g[3] ? `<small>${g[1]}</small>` : ''}</button>`).join('')}</div>
      <div class="main-im" id="mainIm"><div class="tl">${badge(p)}${off(p) >= 15 ? `<span class="tag deal">${off(p)}% off</span>` : ''}</div><div class="tr"><button data-wish="${p.id}" class="${S.wish.has(p.id) ? 'on' : ''}" aria-label="Save">${I('heart')}</button><button aria-label="Share" id="shareBtn">${I('share-2')}</button></div><img src="${gal[0][0]}" alt="${p.brand} ${p.name}" ${gal[0][2] ? 'class="photo"' : ''} id="mainImg"></div>
    </div>
    <div class="buy" id="buy">
      <div class="brandrow"><a href="#">${p.brand}</a><span class="tag">${p.tier}</span></div>
      <h1>${p.name}</h1>
      <p class="sub">${sub}</p>
      <div class="meta"><span class="rating">${p.rating}${I('star')}</span><a href="#reviews">${p.reviews.toLocaleString('en-IN')} ratings</a><span class="dot"></span><span>Part no. <span class="mono">${p.pn}</span><button class="copy" data-copy="${p.pn}" aria-label="Copy part number">${I('copy')}</button></span></div>

      <!-- 1. does it fit my vehicle? the answer comes before price -->
      <div class="fitbox ${f}" role="status">
        <div class="t">${f === 'ok' ? I('circle-check') : f === 'warn' ? I('circle-alert') : I('circle-x')}<div style="flex:1;min-width:0"><b>${fitT}</b><small>${fitS}</small>
          ${f === 'ok' ? `<p class="ev">${evItems.map(x => `<span>${I('check')}${x}</span>`).join('')}</p>` : ''}
          ${(f === 'warn' || mism) && dep ? `<div class="fq"><p>${ak.s}</p>${askHTML(ak)}</div>` : ''}</div>
          ${f === 'bad' ? '' : `<div class="acts"><button class="link" id="chk">Change</button></div>`}</div>
        ${f === 'bad' ? '' : `<div class="more" id="also"><button aria-expanded="false">Also fits ${ALSO[kd].length + 9} other vehicles ${I('chevron-down')}</button><div class="in"><div><div class="vl">${ALSO[kd].map(a => `<span>${a}</span>`).join('')}<span class="muted">+ 9 more</span></div></div></div></div>`}
      </div>

      <!-- 2. what does it cost? -->
      <div class="pbox"><div class="p"><b>${fmt(p.price)}</b>${off(p) ? `<s>MRP ${fmt(p.mrp)}</s><em>${off(p)}% off</em>` : ''}</div><small>${isB ? 'Pair' : isT ? 'Per tyre' : 'Per track'}, inclusive of all taxes</small>
        <div class="offer">${I('badge-percent')}<span><b>Extra ₹150 off</b> with UPI · EMI from ${fmt(Math.round(p.price / 6 / 10) * 10)}/month</span></div></div>

      ${f === 'bad' ? `<div class="ctas2 one"><button class="btn sun lg" id="mainCta">See parts that fit</button></div>` : `
      <!-- 3. how do you want it? one switch, one line of detail -->
      <div class="get"><div class="fseg" role="group" aria-label="How do you want it?">${fseg.map(([k, i, t, d, tone]) => `<button class="${S.ful === k ? 'on' : ''}" aria-pressed="${S.ful === k}" data-ful="${k}" data-det="${esc(d)}" data-tone="${tone}">${I(i)}${t}</button>`).join('')}</div>
        <p class="fdet ${fseg.find(x => x[0] === S.ful)[4]}" id="fdet" aria-live="polite"><i></i><span>${fseg.find(x => x[0] === S.ful)[3]}</span></p></div>

      <!-- 4. one primary action; everything else is quieter -->
      <div class="ctas2"><span class="qty"><button data-q="-1" aria-label="Less">${I('minus')}</button><span id="qn">${S.qty}</span><button data-q="1" aria-label="More">${I('plus')}</button></span><button class="btn sun lg" id="mainCta" ${f === 'warn' ? 'disabled' : ''}>${ctaOf(p)}</button></div>
      ${f === 'warn' ? '' : `<button class="addlink" data-add="${p.id}">or add to cart</button>`}
      <p class="trust2"><span>${I('rotate-ccw')}Free return if it doesn't fit</span><span>${I('shield-check')}${p.warranty} warranty</span></p>`}

      <button class="askrow" data-ask=""><span class="orb"></span><span class="tx"><b>Ask about this part</b><small>For example: “${chipsFor(p)[0]}”</small></span>${I('chevron-right')}</button>
    </div>
  </div>

  <nav class="subnav" id="subnav"><div class="in"><a href="#stores" class="on">Stores near you</a><a href="#fbt">Bought together</a><a href="#details">Details</a><a href="#compat">Compatibility</a><a href="#reviews">Reviews</a><a href="#qa">Questions</a></div></nav>

  <section class="psec" id="stores">
    <h2>Stores near you</h2><p class="s">Live stock around 641018. Reserve now and pay at the store. We hold it for 4 hours.</p>
    <div class="stores">
      <div class="slist">
        <div class="shead"><div class="seg" id="sseg">${[['near', 'Nearest in stock'], ['price', 'Lowest price'], ['open', 'Open now'], ['fit', 'Fits it for you']].map(([k, t]) => `<button class="${S.ssort === k ? 'on' : ''}" data-ss="${k}">${t}</button>`).join('')}</div><span class="muted" style="font-size:12.5px">${stores.length} stores within ${Math.ceil(Math.max(...stores.map(d => d.km)))} km</span></div>
        ${stores.map((d, i) => { const on = S.store === d.id, av = d.stock ? (d.stock > 3 ? ['ok', 'In stock'] : ['low', `Only ${d.stock} left`]) : ['wait', 'Ready tomorrow'];
          /* level 1 (always): name, price, distance, availability. level 2 (selected card only): rating, hours, fitting, actions */
          return `<article class="scard ${on ? 'on' : ''}" data-st="${d.id}">
          <button class="sc-h" aria-expanded="${on}" aria-controls="scb-${d.id}">
            <span class="sn ${d.own ? 'own' : ''}" aria-hidden="true">${i + 1}</span>
            <span class="sc-t"><b>${d.name}</b>${d.own ? '<em class="sc-own">Vrom</em>' : `<i class="sc-v" role="img" aria-label="Verified store" title="Verified store">${I('badge-check')}</i>`}</span>
            <span class="sc-p">${fmt(sp(d))}</span>
            <span class="sc-s">${d.km} km · ${d.area}${d.closing ? ` · <span class="sc-c">${d.open.replace('Closes at', 'Closes')}</span>` : ''}</span>
            <span class="sc-a ${av[0]}"><i></i>${av[1]}</span>
          </button>
          <div class="sc-b" id="scb-${d.id}"><div class="sc-bi">
            <div class="sc-m"><span>${I('star')}${d.rating} <small>(${d.reviews})</small></span>${d.closing ? '' : `<span class="ok">${d.open}</span>`}${d.fit ? `<span>${I('wrench')}Can fit it</span>` : ''}</div>
            <div class="sc-x"><button class="btn ${d.stock ? 'sun' : 'line'} sm" aria-label="${d.stock ? 'Reserve' : 'Order to store'} at ${d.name}" data-resv="${d.id}">${d.stock ? 'Reserve' : 'Order to store'}</button><button class="ib" aria-label="Call ${d.name}" title="Call">${I('phone')}</button><button class="ib" aria-label="WhatsApp ${d.name}" title="WhatsApp">${I('message-circle')}</button><button class="ib" aria-label="Directions to ${d.name}" title="Directions">${I('navigation')}</button></div>
          </div></div></article>`; }).join('')}
      </div>
      <div class="mapbox" id="pmap" aria-label="Map of stores near ${ME.pin}"></div>
    </div>
  </section>

  <section class="psec" id="fbt">
    <h2>Frequently bought together</h2><p class="s">${isB ? 'Mechanics replacing discs on a Creta' : p.cat === 'tracks' ? 'Operators replacing tracks' : 'People replacing these'} usually add these. All checked to fit.</p>
    ${fbtHTML(p)}
  </section>

  <section class="psec" id="details">
    <h2>Product details</h2><p class="s">Everything your mechanic will ask before fitting it.</p>
    <div class="specs">
      <div class="st"><h4>Specifications</h4><dl>${(isB ? [['Position', 'Front axle, left and right'], ['Disc type', p.style + ', ventilated'], ['Diameter', '280 mm'], ['Thickness (new)', '26 mm'], ['Minimum thickness', '24 mm'], ['Bolt holes', '5'], ['Coating', 'Anti-corrosion, hub and vanes'], ['Country of origin', 'India']] : isT ? [['Size', p.size], [ty === 'tractor' ? 'Ply rating' : 'Load index', p.load], ['Speed rating', p.speed], ['Construction', p.cons], ['Use', p.use], [ty === 'tractor' ? 'Lug height (new)' : 'Tread depth (new)', p.tread.replace('Lug height ', '')], ['Country of origin', 'India']] : [['Size', p.size], ['Tread pattern', p.pattern], ['Steel core', p.core], ['Guide type', 'Centre guide'], ['Weight', 'About 140 kg'], ['Country of origin', 'India']]).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>
      <div class="st"><h4>Fitting</h4><dl>${(isB ? [['Labour time', '45–60 minutes per axle'], ['Typical labour', '₹349 at partner garages'], ['Replace with', 'New front pads'], ['Also check', 'Brake fluid (DOT 4)'], ['Caliper bolt torque', '85–95 Nm'], ['Bed-in', '10 gentle stops from 50 km/h']] : isT ? (ty === 'tractor' ? [['Labour time', '40 minutes per tyre, on the farm or at the store'], ['Replace in', 'Pairs on the rear axle'], ['Also check', 'Tube and flap'], ['Pressure', p.press]] : ty === 'truck' ? [['Labour time', '30 minutes per tyre'], ['Replace in', 'Pairs on the same axle'], ['Also do', 'Match tread depth on twin wheels'], ['Pressure', p.press]] : [['Labour time', '25 minutes'], ['Also do', 'Alignment and balancing'], ['Pressure', p.press], ['Rotate every', '10,000 km']]) : [['Labour time', '2–3 hours, crew of 2'], ['Replace in', 'Pairs'], ['Also check', 'Sprocket and rollers'], ['Tension', '10–15 mm sag']]).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>
    </div>
  </section>

  <section class="psec" id="compat">
    <h2>Compatibility</h2><p class="s">${isB ? 'Matched by original part number' : isT ? 'Matched by tyre size and load rating' : 'Matched by width, pitch and link count'}.${f === 'ok' ? ' Your vehicle is highlighted.' : ''}</p>
    <div class="compat"><div class="ch">${I('search')}<input id="cmpQ" aria-label="Search compatible vehicles" placeholder="Search a make or model, e.g. ${COMPAT[kd][1][1]}"></div><table><thead><tr><th>Make</th><th>Model</th><th>Years</th><th>Engine</th><th>Variants</th></tr></thead><tbody id="cmpT">${COMPAT[kd].map(r => `<tr class="${r[5] && f === 'ok' ? 'mine' : ''}"><td>${r[0]}</td><td>${r[1]}${r[5] && f === 'ok' ? ' <span class="tag fit">Your vehicle</span>' : r[5] && f === 'warn' ? ' <span class="tag warn">Check yours</span>' : ''}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</tbody></table></div>
  </section>

  <section class="psec" id="reviews">
    <h2>Ratings and reviews</h2><p class="s">Reviews from people who fitted it on the same vehicle are shown first.</p>
    <div class="rv">
      <div class="rsum"><div class="big"><b>${p.rating}</b><span class="rating">${I('star')}</span></div><div class="muted" style="margin-top:4px">${p.reviews.toLocaleString('en-IN')} ratings · 212 reviews</div>
        <div class="rbars">${[[5, 71], [4, 19], [3, 6], [2, 2], [1, 2]].map(([s, w]) => `<div><span>${s}★</span><i style="--w:${w}%"></i><span>${w}%</span></div>`).join('')}</div>
        <div class="fit1"><b>97%</b> say it fitted first time on their ${pv.short}</div></div>
      <div>
        <div class="aisum"><span class="orb"></span><div><b>Customers say</b><br>${rv.sum}
          <div class="themes">${rv.th.map(([t, n]) => `<span class="tag fit">${t} · ${n}</span>`).join('')}<span class="tag warn">${rv.tw[0]} · ${rv.tw[1]}</span></div><small class="muted" style="display:block;margin-top:8px">AI-generated from customer reviews</small></div></div>
        <div class="rc"><div class="h"><span class="rating">5${I('star')}</span><b>${rv.t1}</b></div><p>${rv.r1}</p><div class="ph">${rv.ph.map(x => `<img src="${PH(x)}" alt="Customer photo">`).join('')}</div><div class="who">${I('badge-check')}${rv.n1} · Verified purchase · Fitted on ${vLabel(pv)} · 2 weeks ago</div></div>
        <div class="rc"><div class="h"><span class="rating">4${I('star')}</span><b>${rk === 'tracks' ? 'Check the link count first' : 'Good quality, matches OE'}</b><span class="tag">${rv.role}</span></div><p>${rv.r2}</p><div class="who">${I('wrench')}${rv.w2} · 1 month ago</div></div></div>
      </div>
    </div>
  </section>

  <section class="psec qa" id="qa">
    <h2>Questions and answers</h2><p class="s">Answered by verified mechanics and the Vrom parts team.</p>
    ${QA[rk].map(([q, t, w], i) => `<details ${i ? '' : 'open'}><summary>${q}${I('chevron-down')}</summary><p>${t}</p><small>Answered by ${w}</small></details>`).join('')}
    <details><summary>Is the store price the same as online?${I('chevron-down')}</summary><p>Each store sets its own price, shown next to the store above. The online price is the Vrom Hub price.</p><small>Answered by Vrom parts team</small></details>
    <button class="btn line sm" style="margin-top:16px" data-ask="">${I('message-circle')} Ask a question</button>
  </section>`;
  $('#mbuy').innerHTML = `<div style="min-width:0"><b style="font-size:17px">${fmt(p.price)}</b><div class="muted" style="font-size:12px">${f === 'ok' ? 'Fits your ' + v.short : f === 'warn' ? 'Check fit first' : 'Doesn\'t fit your ' + v.short}</div></div><button class="btn line" data-add="${p.id}">Add to cart</button><button class="btn sun" id="mCta" ${f === 'warn' ? 'disabled' : ''}>${ctaOf(p)}</button>`;
  bindPDP(p, gal); icons();
  mountMap($('#pmap'), stores, S.store, sp);
}
const ctaLabel = () => S.ful === 'ship' ? 'Buy now' : S.ful === 'pickup' ? 'Reserve at store' : 'Book fitting';
const ctaOf = p => fitOf(p) === 'bad' ? 'See parts that fit' : fitOf(p) === 'warn' ? 'Confirm fit to continue' : ctaLabel();
function fbtHTML(p) {
  const items = p.cat === 'brakes' ? [[p.img, `This item: ${p.brand} front brake disc pair`, p.price, 0], [C('pads-worn'), 'Bosch ceramic front brake pads', 2180, 0], [PH('mech-tyre'), 'Fitting at a partner garage (45 min)', 349, 1]]
    : p.cat === 'tracks' ? [[p.img, `This item: ${p.brand} track`, p.price, p.photo ? 1 : 0], [p.img, 'Second track for the other side', p.price, p.photo ? 1 : 0], [PH('excavator-mini'), 'Fitting by a crew on site', 4500, 1]]
    : ptype(p) === 'car' ? [[p.img, `This item: ${p.brand} tyre`, p.price, p.photo ? 1 : 0], [p.img, 'Second tyre for the same axle', p.price, p.photo ? 1 : 0], [PH('tyre-alloy'), 'Fitting, alignment and balancing', 899, 1]]
    : [[p.img, `This item: ${p.brand} tyre`, p.price, p.photo ? 1 : 0], [p.img, ptype(p) === 'tractor' ? 'Second rear tyre (pair)' : 'Second drive tyre for the same axle', p.price, p.photo ? 1 : 0], [PH(ptype(p) === 'tractor' ? 'mech-tyre' : 'tyre-shop'), ptype(p) === 'tractor' ? 'Fitting on the farm' : 'Fitting and balancing', ptype(p) === 'tractor' ? 900 : 1200, 1]];
  const tot = items.reduce((a, x) => a + x[2], 0);
  return `<div class="fbt">${items.map((x, i) => `${i ? `<span class="plus">${I('plus')}</span>` : ''}<div class="it"><div class="im"><img src="${x[0]}" alt="" ${x[3] ? 'class="photo"' : ''}></div><label><input type="checkbox" checked ${i ? '' : 'disabled'} aria-label="${x[1]}" data-fp="${x[2]}"><span><b>${x[1]}</b><strong>${fmt(x[2])}</strong></span></label></div>`).join('')}<div class="tot"><small>Total for <span id="fbtN">3</span> items</small><b id="fbtT">${fmt(tot)}</b><button class="btn sun" id="fbtAdd">Add all to cart</button></div></div>`;
}
function bindPDP(p, gal) {
  $('#pdp').onclick = e => {
    const t = e.target;
    const g = t.closest('[data-g]'); if (g) { const i = +g.dataset.g, it = gal[i], m = $('#mainImg'); $$('#thumbs button').forEach(b => b.classList.toggle('on', b === g)); m.style.opacity = 0; setTimeout(() => { m.src = it[0]; m.className = it[2] ? 'photo' : ''; m.style.opacity = 1; }, 150); $$('#mainIm .hot,#mainIm .hot-tip,#mainIm .cap').forEach(x => x.remove()); if (it[3] === 'where') setTimeout(addHots, 200); return; }
    const fo = t.closest('[data-ful]'); if (fo) { S.ful = fo.dataset.ful; $$('.fseg button').forEach(b => { b.classList.toggle('on', b === fo); b.setAttribute('aria-pressed', b === fo); }); $('#fdet').className = 'fdet ' + (fo.dataset.tone || ''); $('#fdet span').textContent = fo.dataset.det; $('#mainCta').textContent = ctaOf(p); $('#mCta').textContent = ctaOf(p); return; }
    const q = t.closest('[data-q]'); if (q) { S.qty = Math.max(1, Math.min(9, S.qty + +q.dataset.q)); $('#qn').textContent = S.qty; return; }
    const cp = t.closest('[data-copy]'); if (cp) { navigator.clipboard && navigator.clipboard.writeText(cp.dataset.copy).catch(() => { }); toast(`Copied <span class="mono">${cp.dataset.copy}</span>. Share it with your mechanic`); return; }
    if (t.closest('#also>button')) { const o = $('#also').classList.toggle('open'); $('#also>button').setAttribute('aria-expanded', o); return; }
    if (t.closest('#chk')) { scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => $('#gPop').classList.add('on'), 250); return; }
    if (t.closest('#shareBtn')) { toast('Link copied. Send it on WhatsApp'); return; }
    const ss = t.closest('[data-ss]'); if (ss) { S.ssort = ss.dataset.ss; const y = $('#stores').getBoundingClientRect().top; renderPDP(); scrollBy(0, $('#stores').getBoundingClientRect().top - y); return; }
    const rs = t.closest('[data-resv]'); if (rs) { e.stopPropagation(); S.store = rs.dataset.resv; const d = dealersFor(p).find(x => x.id === S.store); if (!d.stock) { toast(`${d.name} will have it ready by tomorrow 11 AM`); return; } openReserve(p); return; }
    const st = t.closest('[data-st]'); if (st && !t.closest('.sc-x')) { pickStore(st.dataset.st); return; }
    const pn = t.closest('[data-pin]'); if (pn) { pickStore(pn.dataset.pin, true); return; }
    if (t.closest('#mainCta')) { if (fitOf(p) === 'bad') { toPLP(p.cat); return; } S.ful === 'ship' ? (addToCart(p, S.qty), toast('Checkout opens here')) : openReserve(p); return; }
    if (t.closest('#fbtAdd')) { const n = $$('#fbt input:checked').length; S.cart += n; $('#cartN').textContent = S.cart; toast(`Added ${n} items to cart`); return; }
    const sn = t.closest('#subnav a'); if (sn) { $$('#subnav a').forEach(a => a.classList.toggle('on', a === sn)); }
  };
  $('#mCta').onclick = () => $('#mainCta').click();
  $$('#fbt input').forEach(c => c.onchange = () => { const ch = $$('#fbt input:checked'); $('#fbtN').textContent = ch.length; $('#fbtT').textContent = fmt(ch.reduce((a, x) => a + +x.dataset.fp, 0)); });
  $('#cmpQ').oninput = e => { const q = e.target.value.toLowerCase(); $$('#cmpT tr').forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'); };
  $$('.scard').forEach(c => { c.addEventListener('mouseenter', () => $$('#pmap .pin').forEach(x => x.classList.toggle('hl', x.dataset.pin === c.dataset.st))); c.addEventListener('mouseleave', () => $$('#pmap .pin').forEach(x => x.classList.remove('hl'))); });
}
/* selecting a store (from the list or a map pin) opens its card, closes the others and re-centres the map */
function pickStore(id, scroll) {
  S.store = id; S.picked = true;
  $$('.scard').forEach(c => { const on = c.dataset.st === id; c.classList.toggle('on', on); c.querySelector('.sc-h').setAttribute('aria-expanded', on); });
  selectPin($('#pmap'), id);
  if (scroll) { const c = $(`.scard[data-st="${id}"]`); c && c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
function addHots() {
  const m = $('#mainIm');
  [['46%', '52%', '1', 'Brake disc · this part', 'Bolts to the wheel hub, front axle'], ['70%', '32%', '2', 'Caliper and pads', 'Pads squeeze the disc. Replace with discs'], ['30%', '76%', '3', 'Wheel hub', 'Clean the face before fitting']]
    .forEach(([l, t, n, a, b]) => { const h = document.createElement('span'); h.className = 'hot'; h.style.left = l; h.style.top = t; h.textContent = n; h.onmouseenter = () => { const tp = document.createElement('div'); tp.className = 'hot-tip'; tp.style.left = l; tp.style.top = t; tp.innerHTML = `<b>${a}</b><span>${b}</span>`; m.appendChild(tp); h._t = tp; }; h.onmouseleave = () => h._t && h._t.remove(); m.appendChild(h); });
  const c = document.createElement('div'); c.className = 'cap'; c.textContent = 'Hover the numbers to see where each part goes'; m.appendChild(c);
}
function openReserve(p) {
  const dl = dealersFor(p), d = dl.find(x => x.id === S.store && x.stock) || dl[0]; S.store = d.id;
  const pr = Math.round(p.price * d.factor / 10) * 10, fit = S.ful === 'fit', f = fitOf(p), ty = ptype(p);
  const lab = p.cat === 'brakes' ? 'About 45 minutes · ₹349 labour' : p.cat === 'tracks' ? 'Crew on site · 2 to 3 hours · ₹4,500' : ty === 'tractor' ? 'On the farm · about 40 minutes a tyre · ₹900' : ty === 'truck' ? 'About 30 minutes a tyre · ₹1,200' : 'About 25 minutes · ₹600 with balancing';
  openDrawer(`<div class="dr-h"><div><h3>${fit ? 'Book fitting' : 'Reserve at store'}</h3><small>Pay at the store. Nothing to pay now.</small></div><button class="x" data-close aria-label="Close">${I('x')}</button></div>
  <div class="dr-b"><div class="resv" id="rf">
    <div class="sum"><span class="th">${img(p)}</span><div style="flex:1;min-width:0"><b style="font-weight:600">${p.brand} ${p.name}</b><div style="font-size:12.5px;color:var(--${f === 'ok' ? 'fit' : f});font-weight:600;margin-top:2px">${f === 'ok' ? 'Fits your ' + vLabel(V()) : f === 'warn' ? 'Check fit before you collect' : 'Doesn\'t fit your ' + vLabel(V())}</div></div><b>${fmt(pr * S.qty)}</b></div>
    <div><h5>Store</h5><div class="store on" style="cursor:default"><div class="n"><b>${d.name}</b></div><div class="pr"><small>${d.km} km</small></div><div class="m"><span>${I('map-pin')}${d.area}</span><span class="ok">${d.open}</span></div></div></div>
    <div><h5>${fit ? 'Fitting slot' : 'Pick up by'}, today</h5><div class="slots-t" id="sl">${['3:00 PM', '4:30 PM', '5:30 PM', '6:30 PM', '7:30 PM', 'Tomorrow 10 AM', 'Tomorrow 12 PM', 'Tomorrow 4 PM'].map((s, i) => `<button ${i ? '' : 'disabled'} class="${i === 1 ? 'on' : ''}">${s}</button>`).join('')}</div></div>
    <label class="swl" id="addFit" role="switch" aria-checked="${fit}" tabindex="0" style="justify-content:space-between;padding:12px 14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line)"><span><b style="font-weight:600">Get it fitted at the store</b><div class="muted" style="font-weight:400;font-size:12.5px">${lab}</div></span><span class="sw ${fit ? 'on' : ''}"></span></label>
    <div class="slider" id="slide"><div class="fill" id="sfill"></div><div class="lbl" id="slbl"><span>Slide to reserve</span></div><div class="knob" id="knob" role="button" tabindex="0" aria-label="Slide to reserve, or press Enter">${I('chevrons-right')}</div></div>
  </div>
  <div class="done-st" id="done"><div class="ck-anim" aria-hidden="true"><span class="burst">${Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg;--d:${i % 2 ? 34 : 48}px"></i>`).join('')}</span><svg viewBox="0 0 72 72"><circle class="ring" cx="36" cy="36" r="33"/><circle class="disc" cx="36" cy="36" r="33"/><path class="tick" d="M22 37.5l9.5 9.5L51 27.5"/></svg></div><h3 style="font-size:20px;font-weight:700;margin-top:6px">Reserved at ${d.name}</h3><p class="muted" style="max-width:340px">Show this code at the counter. We've sent it to your WhatsApp with directions.</p><div class="qr">${qrSvg()}</div><b class="mono" style="font-size:18px;letter-spacing:.06em">FW-CBE-48213</b><span class="tag fit">Ready by 4:30 PM · held until 8:30 PM</span><div style="display:flex;gap:8px;margin-top:10px"><button class="btn line sm">${I('navigation')} Directions</button><button class="btn line sm">${I('message-circle')} Message store</button></div></div></div>`);
  $('#sl').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; $$('#sl button').forEach(x => x.classList.toggle('on', x === b)); };
  $('#addFit').onclick = e => { e.preventDefault(); $('#addFit').setAttribute('aria-checked', $('#addFit .sw').classList.toggle('on')); };
  $('#addFit').onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); $('#addFit').click(); } };
  const sl = $('#slide'), kn = $('#knob'), fl = $('#sfill'), lb = $('#slbl'), tx = $('#slbl span'); let x0 = null, max = 0, done = false, t0 = 0, tw = 1;
  // the label stays whole until the knob reaches it, then is wiped and fades as the knob crosses it
  const at = dx => {
    const edge = 52 + dx; kn.style.left = 4 + dx + 'px'; fl.style.width = 56 + dx + 'px';
    lb.style.clipPath = `inset(0 0 0 ${edge}px)`; lb.style.opacity = 1 - Math.min(1, Math.max(0, (edge - t0) / tw));
  };
  const finish = () => {
    if (done) return; done = true; x0 = null; max = max || sl.offsetWidth - 56; sl.classList.add('done', 'ok'); at(max); fl.style.width = '100%';
    kn.innerHTML = I('check'); navigator.vibrate?.(18);
    setTimeout(() => { $('#rf').style.display = 'none'; $('#done').classList.add('on'); }, 160); // straight to the success screen, which is the confirmation; no toast on top
  };
  // drag tracking: the last position and speed come from the move events (a fast trackpad drag can end with a
  // stale or cancelled release), and a quick flick completes it even if it stops short of the end
  let last = 0, lt = 0, vel = 0, pid = null;
  const release = e => {
    if (x0 === null) return; x0 = null; pid = null; sl.classList.remove('drag'); sl.classList.add('done');
    if (e && e.timeStamp - lt > 120) vel = 0;   // held still before letting go: not a flick
    if (last >= max * .7 || (vel > .9 && last >= max * .3)) finish(); else at(0);
  };
  kn.onpointerdown = e => {
    if (done) return; e.preventDefault(); x0 = e.clientX; pid = e.pointerId; last = 0; vel = 0; lt = e.timeStamp;
    max = sl.offsetWidth - 56; t0 = tx.offsetLeft; tw = tx.offsetWidth;
    try { kn.setPointerCapture(e.pointerId); } catch { /* released already */ }
    sl.classList.remove('done'); sl.classList.add('drag');
  };
  kn.onpointermove = e => {
    if (x0 === null || e.pointerId !== pid) return;
    const dx = Math.max(0, Math.min(max, e.clientX - x0)), dt = Math.max(1, e.timeStamp - lt);
    vel = vel * .5 + ((dx - last) / dt) * .5; last = dx; lt = e.timeStamp; at(dx);
    if (dx >= max) finish();   // reaching the end completes at once, no need to release
  };
  kn.onpointerup = release; kn.onpointercancel = release; kn.onlostpointercapture = release;
  kn.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } };
}
function qrSvg() {
  let s = ''; for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) { if ((x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16)) continue; if ((x * 7 + y * 13 + x * y * 3) % 5 < 2) s += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }
  const eye = (x, y) => `<path d="M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  return `<svg viewBox="0 0 25 25" shape-rendering="crispEdges" fill="#222222">${s}${eye(0, 0)}${eye(18, 0)}${eye(0, 18)}</svg>`;
}

/* ============ start ============ */
syncGarage();
const start = (location.hash || '#home').slice(1);
go(['home', 'plp', 'pdp'].includes(start) ? start : 'home');
if (params.get('ask')) setTimeout(() => openCopilot(params.get('ask')), 500);
// ?compare=d1,d6,d2 opens the compare drawer with those products (used by the case study)
if (params.get('compare')) setTimeout(() => { S.compare = params.get('compare').split(',').filter(id => P(id)).slice(0, 3); go('plp'); renderTray(); if (S.compare.length > 1) openCompare(); }, 600);
