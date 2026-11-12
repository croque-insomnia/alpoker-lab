const $ = (i) => document.getElementById(i),
  R = Math.random,
  SU = "♠♥♦♣",
  RK = "23456789TJQKA";
const LV = [
  [100, 200, 50],
  [140, 280, 70],
  [200, 400, 100],
  [280, 560, 140],
  [390, 780, 200],
  [550, 1100, 280],
  [820, 1640, 410],
  [1250, 2500, 630],
  [1900, 3800, 950],
  [2850, 5700, 1400],
  [4300, 8600, 2200],
  [6500, 13000, 3200],
  [9800, 19600, 4900],
];
// CPUタイプ: [名前, ルーズさ, 攻撃性, ブラフ頻度, ICM意識, 読みの強さ]
// 読みの強さ = 相手のベット・レイズからどれだけ相手の手を絞るか（0: 気にしない 〜 1: 強く信じる）
const TY = [
  ["タイト", 0.2, 0.35, 0.1, 0, 0.7],
  ["ルースアグレ", 0.7, 0.75, 0.35, 0, 0.4],
  ["コーラー", 0.8, 0.15, 0.02, 0, 0.1],
  ["マニアック", 0.95, 0.9, 0.5, 0, 0.2],
  ["バランス", 0.45, 0.5, 0.2, 0, 0.5],
  ["ICM意識", 0.4, 0.45, 0.15, 1, 0.6],
];
const NM =
  "Aki Ren Sora Yuu Hina Kai Mio Rin Haru Ken Nao Sho Mei Ryo Yui Dai Emi Jun Ayu Tom Saki Riku Nana Ito Mao Taku Rei Kou Mana Shin Ami Lee Max Eva Leo Zoe Jin Noa Hal".split(
    " ",
  );
// Fisher-Yatesシャッフル：全ての並びが等確率になる（sort+乱数比較は偏る）
const shf = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (R() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
let G = {},
  S = { n: 0, w: 0, ft: 0, itm: 0, pt: 0 };
try {
  S = Object.assign(S, JSON.parse(localStorage.getItem("mtt5")));
} catch (e) {}
$("st").textContent = S.n
  ? `戦績：${S.n}回 / 優勝${S.w} / FT${S.ft} / ITM${S.itm} / 仮pt合計${S.pt}`
  : "";
const alive = () => G.P.filter((p) => p.alive).length,
  itm = () => Math.floor(G.entries * 0.2);
const fb = (x) => +(x / LV[G.lv][1]).toFixed(1);
const ls = () => {
  try {
    return localStorage.getItem("mtt5ty") != "0";
  } catch (e) {
    return 1;
  }
};
const cd = (c, h) =>
  h
    ? '<i class="c b">??</i>'
    : `<i class="c s${(c / 13) | 0}">${RK[c % 13]}${SU[(c / 13) | 0]}</i>`;
function e5(a) {
  const r = a.map((x) => (x % 13) + 2).sort((x, y) => y - x),
    f = a.every((x) => ((x / 13) | 0) == ((a[0] / 13) | 0)),
    n = {};
  r.forEach((x) => (n[x] = (n[x] || 0) + 1));
  let g = Object.keys(n)
    .map(Number)
    .sort((x, y) => n[y] - n[x] || y - x);
  const k = g.map((x) => n[x]).join("");
  const s = g.length == 5 && (r[0] - r[4] == 4 || (r[0] == 14 && r[1] == 5));
  if (s && r[0] == 14 && r[1] == 5) g = [5, 4, 3, 2, 1];
  const c =
    s && f
      ? 8
      : k == "41"
        ? 7
        : k == "32"
          ? 6
          : f
            ? 5
            : s
              ? 4
              : k == "311"
                ? 3
                : k == "221"
                  ? 2
                  : k == "2111"
                    ? 1
                    : 0;
  return c * 1e10 + g.reduce((v, x) => v * 15 + x, 0);
}
function best(a) {
  let m = 0;
  if (a.length == 5) return e5(a);
  if (a.length == 6) {
    for (let i = 0; i < 6; i++) m = Math.max(m, e5(a.filter((_, k) => k != i)));
  } else
    for (let i = 0; i < 7; i++)
      for (let j = i + 1; j < 7; j++) m = Math.max(m, e5(a.filter((_, k) => k != i && k != j)));
  return m;
}
// 169種類のスターティングハンドの「ランダムな1手に対する勝率」（千分率）
// 手札2枚と残りの山札からモンテカルロで計算した値（1ハンドあたり64000回）
const EQ169 = `
  22505
  33539 32s360 32o323
  44569 43s383 43o354 42s369 42o333
  55604 54s415 54o383 53s398 53o365 52s378 52o343
  66631 65s431 65o401 64s412 64o379 63s395 63o363 62s377 62o339
  77660 76s456 76o425 75s438 75o405 74s417 74o384 73s398 73o363 72s383 72o346
  88692 87s479 87o448 86s462 86o430 85s448 85o415 84s426 84o394 83s407 83o376 82s402 82o368
  99722 98s504 98o480 97s487 97o463 96s475 96o448 95s458 95o427 94s438 94o403 93s434 93o401 92s426 92o391
  AA853 AKs669 AKo650 AQs662 AQo644 AJs652 AJo637 ATs648 ATo628 A9s630 A9o605 A8s616 A8o599 A7s611 A7o589 A6s599 A6o582 A5s601 A5o575 A4s590 A4o564 A3s581 A3o556 A2s572 A2o546
  KK823 KQs638 KQo616 KJs622 KJo608 KTs619 KTo593 K9s600 K9o577 K8s582 K8o558 K7s573 K7o551 K6s564 K6o548 K5s557 K5o534 K4s547 K4o523 K3s540 K3o513 K2s535 K2o505
  QQ798 QJs605 QJo583 QTs598 QTo574 Q9s574 Q9o552 Q8s559 Q8o538 Q7s547 Q7o517 Q6s538 Q6o511 Q5s524 Q5o501 Q4s518 Q4o493 Q3s512 Q3o481 Q2s505 Q2o473
  JJ775 JTs572 JTo550 J9s554 J9o534 J8s538 J8o516 J7s523 J7o499 J6s505 J6o480 J5s502 J5o468 J4s492 J4o462 J3s480 J3o450 J2s474 J2o443
  TT747 T9s540 T9o514 T8s524 T8o495 T7s506 T7o478 T6s489 T6o461 T5s470 T5o445 T4s460 T4o433 T3s458 T3o425 T2s449 T2o416
`;
// 同じく「上位20%の手（レイズしてくる相手の想定）に対する勝率」（千分率、1ハンドあたり40000回）
// レイズを受けたときの判断に使う。ランダムな手が相手のときより、AKなどの高い札が相対的に強くなる
const ER169 = `
  AA859 AKs648 AKo630 AQs605 AQo589 AJs577 AJo558 ATs535 ATo519 A9s492 A9o466 A8s463 A8o436 A7s445 A7o412 A6s428 A6o394 A5s427 A5o397 A4s420 A4o393 A3s424 A3o387 A2s417 A2o385
  KK745 KQs478 KQo447 KJs446 KJo417 KTs415 KTo387 K9s388 K9o355 K8s374 K8o335 K7s373 K7o334 K6s367 K6o326 K5s368 K5o327 K4s360 K4o323 K3s364 K3o319 K2s353 K2o318
  QQ694 QJs409 QJo380 QTs390 QTo360 Q9s377 Q9o342 Q8s363 Q8o330 Q7s350 Q7o314 Q6s347 Q6o304 Q5s345 Q5o308 Q4s344 Q4o305 Q3s345 Q3o303 Q2s336 Q2o298
  JJ644 JTs392 JTo360 J9s380 J9o349 J8s366 J8o325 J7s347 J7o313 J6s333 J6o299 J5s339 J5o298 J4s338 J4o301 J3s337 J3o297 J2s333 J2o292
  TT611 T9s383 T9o353 T8s372 T8o339 T7s362 T7o324 T6s345 T6o307 T5s332 T5o294 T4s331 T4o297 T3s333 T3o293 T2s326 T2o291
  99567 98s377 98o348 97s366 97o331 96s355 96o318 95s340 95o301 94s328 94o289 93s329 93o291 92s327 92o286
  88538 87s373 87o339 86s359 86o321 85s347 85o312 84s334 84o296 83s325 83o287 82s323 82o285
  77512 76s364 76o332 75s352 75o315 74s343 74o307 73s330 73o289 72s314 72o276
  66488 65s362 65o328 64s344 64o312 63s330 63o302 62s325 62o284
  55466 54s355 54o321 53s345 53o311 52s333 52o294
  44450 43s343 43o304 42s327 42o291
  33447 32s328 32o287
  22438
`;
// 手札2枚 → "AKs" のような種類名
function hcls(h) {
  let a = h[0] % 13,
    b = h[1] % 13;
  const su = ((h[0] / 13) | 0) == ((h[1] / 13) | 0);
  if (a < b) [a, b] = [b, a];
  return RK[a] + RK[b] + (a == b ? "" : su ? "s" : "o");
}
// 旧来のプリフロップ評価式。手の並び順に問題があるため判断には使わず、
// 値の分布（何%の手がどの値以上か）だけを PF の作成に使う
function legacyPre(h) {
  let a = (h[0] % 13) + 2,
    b = (h[1] % 13) + 2;
  const su = ((h[0] / 13) | 0) == ((h[1] / 13) | 0);
  if (a < b) [a, b] = [b, a];
  if (a == b) return 0.5 + 0.04 * (a - 2);
  const g = a - b;
  return (
    ((a - 2) / 12) * 0.35 +
    ((b - 2) / 12) * 0.2 +
    (su ? 0.06 : 0) +
    (g == 1 ? 0.05 : g == 2 ? 0.03 : g == 3 ? 0.01 : 0)
  );
}
// プリフロップの強さ表。種類名 → { pct: 上位何%か（0に近いほど強い）, s: 判断に使う値 }
// 手の並び順は勝率表 EQ169 に従い、値の分布は legacyPre に合わせる。
// CPUの判断式のしきい値（th, need など）は legacyPre の尺度で調整されているため、
// こうすると各タイプの参加率をほぼ保ったまま、どの手で参加するかだけが正しくなる
const PF = (() => {
  const parse = (txt) => {
    const v = {};
    for (const t of txt.trim().split(/\s+/)) {
      const m = t.match(/^(\w\w[so]?)(\d+)$/);
      v[m[1]] = +m[2] / 1000;
    }
    return v;
  };
  const old = [];
  for (let x = 0; x < 52; x++) for (let y = x + 1; y < 52; y++) old.push(legacyPre([x, y]));
  old.sort((a, b) => b - a);
  const out = {};
  // 勝率表の順に並べ、上から数えた位置にある legacyPre の値を割り当てる
  const rank = (v, f) => {
    let acc = 0;
    for (const k of Object.keys(v).sort((a, b) => v[b] - v[a])) {
      const n = k.length == 2 ? 6 : k[2] == "s" ? 4 : 12;
      f(k, (acc + n / 2) / 1326, old[Math.floor(acc + n / 2)]);
      acc += n;
    }
  };
  rank(parse(EQ169), (k, pct, s) => (out[k] = { pct, s }));
  rank(parse(ER169), (k, pct, s) => (out[k].sr = s));
  return out;
})();
// プリフロップの強さ。vr = レイズを受けているとき
function pre(h, vr) {
  const e = PF[hcls(h)];
  return vr ? e.sr : e.s;
}
function post(p, c) {
  const B = c.board,
    all = p.h.concat(B),
    v = best(all),
    cat = (v / 1e10) | 0,
    hr = p.h.map((x) => (x % 13) + 2),
    bm = Math.max(...B.map((x) => (x % 13) + 2)),
    hm = Math.max(...hr);
  let s = [0.12 + (hm > bm ? 0.05 : 0), 0, 0.72, 0.8, 0.86, 0.9, 0.95, 1, 1][cat];
  if (cat == 1) {
    const pr = ((v % 1e10) / 3375) | 0;
    s = hr.includes(pr) ? (pr >= bm ? 0.62 : 0.42) : 0.2 + (hm > bm ? 0.05 : 0);
  }
  if (B.length < 5 && cat < 4) {
    let fd = 0;
    for (let u = 0; u < 4; u++)
      if (
        all.filter((x) => ((x / 13) | 0) == u).length == 4 &&
        p.h.some((x) => ((x / 13) | 0) == u)
      )
        fd = 1;
    if (fd) s += 0.16;
    else {
      let o = 0;
      for (let x = 0; x < 13; x++) if (((best(all.concat(x)) / 1e10) | 0) == 4) o++;
      s += o >= 2 ? 0.14 : o ? 0.07 : 0;
    }
  }
  return s;
}
function ai(p, c) {
  const bb = c.bb,
    st = p.stack,
    eff = st / bb,
    L = c.board.length,
    late = c.pos == 0 || c.pos == c.n - 1 ? 1 : 0;
  let l = p.l;
  if (p.icm && alive() <= itm() + 4 && alive() > itm()) l -= 0.25;
  const s = L ? post(p, c) : pre(p.h),
    po = c.toCall / (c.pot + c.toCall || 1),
    RR = (x) => ({ t: "r", x }),
    CL = { t: "c" },
    F = { t: "f" };
  if (!L) {
    const open = c.cur <= bb;
    if (eff <= 12) {
      const th = 0.6 - 0.2 * l - (12 - eff) * 0.012 - late * 0.04 + (open ? 0 : 0.06);
      return s >= th ? RR(1e9) : F;
    }
    const th = 0.62 - 0.22 * l - 0.05 * late;
    if (open) {
      if (s >= th) {
        return R() < 0.35 + 0.65 * p.a ? RR(Math.round((bb * (2.2 + R())) / 10) * 10) : CL;
      }
      return F;
    }
    const need = th + 0.12 + Math.min(0.1, (c.toCall / st) * 0.3);
    if (s >= Math.max(0.74, 0.86 - 0.15 * p.a) || (s >= need + 0.1 && R() < p.a * 0.35))
      return RR(Math.round(c.cur * (2.6 + R() * 0.8)));
    return s >= need + po * 0.2 ? CL : F;
  }
  const a = s - 0.04 * (c.L - 2);
  if (c.toCall == 0) {
    if ((a >= 0.5 - 0.1 * p.a && R() < 0.45 + 0.45 * p.a) || (a < 0.35 && R() < p.b * 0.3))
      return RR(Math.round(c.pot * (0.4 + R() * 0.4)));
    return CL;
  }
  if (a >= 0.85 || (a >= 0.6 && R() < p.a * 0.3) || R() < p.b * 0.04)
    return RR(Math.round(c.cur + (c.pot + c.toCall) * (0.5 + R() * 0.4)));
  return a >= po + 0.1 - 0.15 * l ? CL : F;
}
const NC = [
  // [名前, 色, ルーズさ, 攻撃性, ブラフ頻度, 読みの強さ]
  ["Croque", "#9acd32", 0.5, 0.55, 0.25, 0.7],
  ["Hubris", "#4fc3f7", 0.5, 0.5, 0.2, 0.7],
  ["Kaina", "#ff8ac8", 0.3, 0.4, 0.1, 0.8],
];
// ハンドの強さの段階（相手の手を絞るときに使う）
// 3: ツーペア以上 / 2: トップペア・オーバーペア / 1: 弱いペア・ドロー / 0: 何もない
function tier(h, B) {
  const v = best(h.concat(B)),
    cat = (v / 1e10) | 0,
    hr = h.map((x) => (x % 13) + 2),
    br = B.map((x) => (x % 13) + 2),
    bm = Math.max(...br);
  if (cat >= 3) return 3;
  if (cat == 2) {
    const hits = new Set(hr.filter((r) => br.includes(r))).size;
    return hits == 2 ? 3 : hits == 1 || hr[0] == hr[1] ? 2 : 0;
  }
  if (cat == 1) {
    const pr = ((v % 1e10) / 3375) | 0;
    if (hr[0] == hr[1]) return pr > bm ? 2 : 1;
    if (hr.includes(pr)) return pr == bm ? 2 : 1;
  }
  if (B.length < 5) {
    // フラッシュドロー
    for (let u = 0; u < 4; u++)
      if (
        h.concat(B).filter((x) => ((x / 13) | 0) == u).length == 4 &&
        h.some((x) => ((x / 13) | 0) == u)
      )
        return 1;
    // ストレートドロー（連続する5ランクのうち4つがあり、手札が絡んでいる）
    const bits = (a) => a.reduce((m, x) => m | (1 << ((x % 13) + 2)) | (x % 13 == 12 ? 2 : 0), 0),
      all = bits(h.concat(B)),
      hb = bits(h);
    for (let lo = 1; lo <= 10; lo++) {
      const w = 31 << lo;
      let n = 0;
      for (let x = all & w; x; x &= x - 1) n++;
      if (n >= 4 && hb & w) return 1;
    }
  }
  return 0;
}
// 相手 q が手札 h を持っている「ありそうさ」（0〜1）。q のこのハンドでのアクションから判断する
// 段階ごとの受け入れ率 [何もない, 弱い, 中くらい, 強い]
const FIT = { bet: [0.35, 0.7, 1, 1], big: [0.2, 0.4, 0.8, 1], raise: [0.12, 0.25, 0.5, 1] };
function fit(q, h, B) {
  const pc = PF[hcls(h)].pct,
    cut = q.p3 ? 0.08 : q.pfr ? 0.3 : q.pc ? 0.55 : 1;
  let w = pc > cut ? 0.1 : 1;
  for (const L of [3, 4, 5]) {
    const g = q.ag[L];
    if (!g || B.length < L) continue;
    w *= FIT[g.r ? "raise" : g.z >= 0.6 ? "big" : "bet"][tier(h, B.slice(0, L))];
  }
  return w;
}
// 勝率の見積もり。相手の手札は、いちばん攻めてきている相手のアクションに合うように引く
// p.rd（読みの強さ 0〜1）が大きいほど、相手のアクションを信じて手を絞る。0 ならランダムな手
function eq(p, c) {
  const B = c.board,
    base = p.h.concat(B),
    N = B.length == 5 ? 26 : 20,
    rd = p.rd ?? 0,
    agg = (q) => q.p3 * 2 + q.pfr + Object.keys(q.ag).length * 2 + (q.ag[B.length] ? 3 : 0),
    opp = c.ps.filter((q) => q != p && !q.fold).sort((x, y) => agg(y) - agg(x))[0];
  let w = 0;
  for (let i = 0; i < N; i++) {
    const s = new Set(base),
      ru = () => {
        let x;
        do x = (R() * 52) | 0;
        while (s.has(x));
        s.add(x);
        return x;
      };
    let o;
    for (let t = 0; t < 12; t++) {
      o = [ru(), ru()];
      if (!opp || !rd || R() < 1 - rd * (1 - fit(opp, o, B))) break;
      s.delete(o[0]);
      s.delete(o[1]);
    }
    const bb = B.slice();
    while (bb.length < 5) bb.push(ru());
    const a = best(p.h.concat(bb)),
      b = best(o.concat(bb));
    w += a > b ? 1 : a == b ? 0.5 : 0;
  }
  return Math.pow(w / N, Math.min(2, Math.max(1, c.L - 1)));
}
function wet(B) {
  let m = 0;
  for (let u = 0; u < 4; u++) m = Math.max(m, B.filter((x) => ((x / 13) | 0) == u).length);
  const r = B.map((x) => x % 13).sort((a, b) => a - b);
  let g = 0;
  for (let i = 1; i < r.length; i++) if (r[i] - r[i - 1] <= 2) g++;
  const w = (m >= 3 ? 2 : m == 2 ? 1 : 0) + (g >= 2 ? 1 : 0) - (new Set(r).size < r.length ? 1 : 0);
  return w <= 0 ? 0 : w == 1 ? 1 : 2;
}
function ai2(p, c) {
  const bb = c.bb,
    st = p.stack,
    B = c.board,
    L = B.length,
    n = c.n,
    al = alive(),
    it = itm(),
    k = p.k,
    ft = al <= 5,
    late = c.pos == 0 || c.pos == n - 1 ? 1 : 0,
    M = st / (c.sb + bb + n * c.an);
  let l = p.l,
    ag = p.a;
  if (al > it && al <= it + 3) l -= p.icm ? 0.25 : 0.08;
  if (k == "Kaina" && (n <= 3 || ft || al <= 10)) {
    l += 0.3;
    ag += 0.2;
  }
  const s = (L ? eq(p, c) : pre(p.h, c.cur > bb)) + (R() - 0.5) * (k ? 0.02 : 0.1),
    po = c.toCall / (c.pot + c.toCall || 1),
    RR = (x) => ({ t: "r", x: Math.round(x) }),
    CL = { t: "c" },
    F = { t: "f" };
  if (!L) {
    const open = c.cur <= bb,
      sm = k == "Hubris" || k == "Kaina" ? 8 : k == "Croque" && !ft ? 3 : 5;
    if (M <= sm) {
      const pt =
        0.5 -
        0.022 * (15 - Math.min(M, 15)) -
        late * 0.03 +
        (0.5 - l) * 0.1 +
        (open ? 0 : 0.07) -
        (n == 2 ? 0.08 : 0);
      return s >= pt ? RR(1e9) : F;
    }
    let th = 0.55 - 0.22 * l - 0.06 * late - (n == 2 ? 0.1 : 0);
    if (k == "Croque" && open && (late || c.pos == 1)) {
      const tl =
        1 -
        c.ps.filter((q) => q != p && !q.fold).reduce((x, q) => x + (q.l ?? 0.5), 0) /
          Math.max(1, c.L - 1);
      th -= 0.16 * tl + 0.05;
    }
    if (open) return s >= th ? (R() < 0.5 + 0.5 * ag ? RR(bb * (2.2 + R() * 0.8)) : CL) : F;
    const need =
      th +
      0.06 +
      Math.min(0.1, (c.toCall / st) * 0.3) -
      (po < 0.3 ? 0.06 : 0) -
      (p.lab.includes("BB") ? 0.04 : 0);
    if (
      s >= Math.max(0.74, 0.86 - 0.15 * ag) ||
      (s >= need + 0.08 && R() < ag * 0.4) ||
      (k == "Hubris" && s >= 0.4 && s < 0.55 && R() < 0.15)
    )
      return RR(c.cur * (2.8 + R() * 0.4));
    return s >= need + po * 0.15 ? CL : F;
  }
  const a = s - (c.toCall ? 0.04 : 0),
    tx = wet(B),
    spr = st / (c.pot || 1);
  if (c.toCall == 0) {
    if (a >= 0.6 && spr <= 3) return RR(1e9);
    if (k == "Croque") {
      if (tx < 2) {
        if (R() < (p.pfr ? 0.7 : 0.4)) return RR(c.pot * 0.33);
      } else if (a >= 0.6 || (a >= 0.4 && R() < 0.35)) return RR(c.pot * (0.66 + R() * 0.1));
      return CL;
    }
    if (k == "Hubris") {
      const z = [0.33, 0.5, 0.75][(R() * 3) | 0];
      if (a >= 0.62 || (a >= 0.2 && a < 0.45 && R() < (z / (1 + 2 * z)) * 0.7))
        return RR(c.pot * z);
      if (L == 3 && a >= 0.35 && a < 0.5 && R() < 0.1) return RR(1e9);
      return CL;
    }
    if (a >= 0.62 && R() < 0.5 + 0.45 * ag) return RR(c.pot * (a >= 0.8 ? 0.7 : 0.5 + R() * 0.2));
    if (p.pfr && L == 3 && c.L <= 2 && R() < 0.35 + 0.4 * ag) return RR(c.pot * 0.4);
    if (a > 0.22 && a < 0.4 && R() < p.b * 0.3 && k != "Kaina") return RR(c.pot * 0.5);
    return CL;
  }
  const need =
    po + 0.03 - 0.1 * l + (k == "Kaina" ? 0.08 : 0) + (k == "Croque" && !ft && po > 0.4 ? 0.12 : 0);
  if (k == "Croque" && !ft && c.toCall >= st * 0.5 && a < 0.82 && M > 5) return F;
  if (
    a >= 0.88 ||
    (a >= 0.7 && R() < ag * 0.35) ||
    (a >= 0.3 && a < 0.5 && L < 5 && R() < p.b * 0.08 && c.toCall < c.pot * 0.6)
  )
    return RR(c.cur + (c.pot + c.toCall) * (0.6 + R() * 0.4));
  if (a >= need) return CL;
  return po < 0.34 && a >= 0.28 && R() < 0.18 + 0.25 * l ? CL : F;
}
function* hand(T) {
  const lg = (s) => {
      if (T == G.T) G.lg.push(s);
    },
    [sb, bb, an] = LV[G.lv];
  T.p.forEach((p) => {
    p.h = null;
    p.lab = "";
    p.show = 0;
    p.fold = 0;
    p.bet = 0;
    p.tot = 0;
    p.allin = 0;
    p.acted = 0;
    p.pfr = 0;
    p.p3 = 0; // プリフロップで2回目以降のレイズ（3ベット以上）をした
    p.pc = 0; // プリフロップで自分からコールした
    p.ag = {}; // フロップ以降のベット・レイズ { ボード枚数: { z: ポットに対する額, r: レイズか } }
  });
  const A = T.p.filter((p) => p.stack > 0),
    n = A.length;
  if (n < 2) return;
  let bi = (A.findIndex((p) => p.id == T.btn) + 1) % n;
  const ps = A.slice(bi).concat(A.slice(0, bi));
  T.btn = ps[0].id;
  T.ps = ps;
  const d = shf([...Array(52).keys()]),
    bd = (T.bd = []);
  ps.forEach((p) => (p.h = [d.pop(), d.pop()]));
  const put = (p, x) => {
    x = Math.min(x, p.stack);
    p.stack -= x;
    p.bet += x;
    p.tot += x;
    if (!p.stack) p.allin = 1;
  };
  ps.forEach((p) => {
    const x = Math.min(an, p.stack);
    p.stack -= x;
    p.tot += x;
    if (!p.stack) p.allin = 1;
  });
  const s0 = n == 2 ? ps[0] : ps[1],
    b0 = n == 2 ? ps[1] : ps[2];
  ps[0].lab = "D";
  s0.lab += " SB";
  b0.lab += " BB";
  put(s0, sb);
  put(b0, bb);
  let cur = Math.max(s0.bet, b0.bet),
    minR = bb;
  const live = () => ps.filter((p) => !p.fold);
  lg(`--- ハンド開始 (Lv${G.lv + 1}) ---`);
  function* rnd(first) {
    let i = first;
    ps.forEach((p) => (p.acted = 0));
    for (;;) {
      const L = live();
      if (L.length < 2) return;
      const ca = L.filter((p) => !p.allin);
      if (
        !ca.length ||
        (ca.length == 1 && ca[0].bet >= cur) ||
        ca.every((p) => p.acted && p.bet == cur)
      )
        return;
      const p = ps[i++ % n];
      if (p.fold || p.allin || (p.acted && p.bet == cur)) continue;
      const c = {
        toCall: cur - p.bet,
        cur,
        minR,
        pot: ps.reduce((s, q) => s + q.tot, 0),
        bb,
        board: bd,
        L: L.length,
        pos: ps.indexOf(p),
        n,
        ps,
        an,
        sb,
      };
      const a = p.hero ? yield { k: "hero", p, c } : ai2(p, c);
      let x = a.x;
      if (!p.hero && a.t == "r" && x >= (p.bet + p.stack) * 0.55) x = p.bet + p.stack;
      if (a.t == "f" && c.toCall > 0) {
        p.fold = 1;
        lg(p.name + " フォールド");
      } else if (a.t == "r" && Math.min(x, p.bet + p.stack) > cur) {
        const mx = p.bet + p.stack;
        let X = Math.min(Math.round(x), mx);
        if (X < cur + minR && X < mx) X = Math.min(cur + minR, mx);
        const old = cur;
        if (!bd.length) {
          if (old > bb) p.p3 = 1;
          p.pfr = 1;
        } else {
          const z = (X - p.bet) / (c.pot || 1),
            g = p.ag[bd.length];
          p.ag[bd.length] = { z: Math.max(z, g ? g.z : 0), r: (g && g.r) || old > 0 };
        }
        put(p, X - p.bet);
        if (p.bet - old >= minR) minR = p.bet - old;
        cur = p.bet;
        ps.forEach((q) => {
          if (q != p && !q.fold && !q.allin) q.acted = 0;
        });
        lg(
          `${p.name} ${old ? "レイズ" : "ベット"} ${fb(p.bet)}BB${p.allin ? " (オールイン)" : ""}`,
        );
      } else {
        const k = Math.min(c.toCall, p.stack);
        if (!bd.length && k) p.pc = 1;
        put(p, k);
        lg(p.name + (k ? ` コール ${fb(k)}BB` : " チェック") + (p.allin ? " (オールイン)" : ""));
      }
      p.acted = 1;
      yield { k: "tick" };
    }
  }
  yield* rnd(n == 2 ? 0 : 3 % n);
  for (const k of [3, 1, 1]) {
    if (live().length < 2) break;
    for (let j = 0; j < k; j++) bd.push(d.pop());
    ps.forEach((p) => {
      p.bet = 0;
      p.acted = 0;
    });
    cur = 0;
    minR = bb;
    yield { k: "tick" };
    yield* rnd(1);
  }
  const L = live(),
    sd = L.length > 1;
  if (sd)
    L.forEach((p) => {
      p.v = best(p.h.concat(bd));
      p.show = 1;
    });
  let prev = 0;
  for (const m of [...new Set(L.map((p) => p.tot))].sort((a, b) => a - b)) {
    let pot = 0;
    ps.forEach((p) => (pot += Math.max(0, Math.min(p.tot, m) - prev)));
    prev = m;
    const el = L.filter((p) => p.tot >= m),
      mx = Math.max(...el.map((p) => p.v || 0)),
      w = sd ? el.filter((p) => p.v == mx) : el,
      sh = Math.floor(pot / w.length);
    w.forEach((p) => (p.stack += sh));
    w[0].stack += pot - sh * w.length;
    lg(`▶ ${w.map((p) => p.name).join("・")} が ${fb(pot)}BB 獲得`);
  }
  yield { k: "end" };
}
function bust(T) {
  T.p = T.p.filter((p) => {
    if (p.stack > 0 || p.hero) return 1;
    if (G.lv < 2 && !p.re && R() < 0.5) {
      p.stack = 1e4;
      p.re++;
      G.entries++;
      return 1;
    }
    p.alive = 0;
    return 0;
  });
}
function bal() {
  let T = G.tables;
  T.forEach((t) => (t.p = t.p.filter((p) => p.alive)));
  T = T.filter((t) => t.p.length);
  const need = Math.ceil(alive() / 5);
  while (T.length > need) {
    T.sort((a, b) => a.p.length - b.p.length);
    const t = T.shift();
    t.p.forEach((p) => {
      T.sort((a, b) => a.p.length - b.p.length)[0].p.push(p);
    });
  }
  for (;;) {
    T.sort((a, b) => a.p.length - b.p.length);
    const lo = T[0],
      hi = T[T.length - 1];
    if (hi.p.length - lo.p.length < 2) break;
    const i = hi.p.findIndex((p) => !p.hero);
    lo.p.push(hi.p.splice(i < 0 ? 0 : i, 1)[0]);
  }
  G.tables = T;
}
function step(v) {
  const g = G.cur;
  let r = g.next(v);
  for (; !r.done; r = g.next()) {
    const y = r.value;
    if (y.k == "hero") {
      G.req = y;
      render();
      return;
    }
    if (y.k == "tick" && G.live) {
      const h = G.hero;
      render();
      setTimeout(() => step(), h.fold || h.allin ? 130 : 480);
      return;
    }
  }
  end();
}
function end() {
  G.live = 0;
  const T = G.T,
    h = G.hero;
  bust(T);
  G.wait = 1;
  render();
  if (h.stack <= 0) {
    G.wait = 0;
    if (G.lv < 2 && !h.re) {
      G.ask = 1;
      render();
    } else fin();
  }
}
function nx() {
  G.wait = 0;
  G.lg = [];
  const o = G.T;
  while (Date.now() >= G.lvEnd && G.lv < 12) {
    G.lv++;
    G.lvEnd += G.dur;
  }
  G.tables.forEach((t) => {
    if (t != G.T) {
      const g = hand(t);
      while (!g.next().done);
      bust(t);
    }
  });
  bal();
  G.T = G.tables.find((t) => t.p.includes(G.hero));
  if (G.T != o) G.lg.push("※ テーブルが再編され、移動しました");
  if (alive() == 1) return fin();
  G.live = 1;
  G.cur = hand(G.T);
  step();
}
function reent() {
  const h = G.hero;
  h.stack = 1e4;
  h.re++;
  G.entries++;
  G.ask = 0;
  G.wait = 1;
  G.lg.push("リエントリーしました");
  render();
}
function fin() {
  const h = G.hero;
  h.alive = 0;
  G.ask = 0;
  const pl = alive() + 1,
    pt = pl == 1 ? 6 : pl == 2 ? 4 : pl == 3 ? 3 : pl <= 5 ? 2 : pl <= itm() ? 1 : 0;
  S.n++;
  if (pl == 1) S.w++;
  if (pl <= 5) S.ft++;
  if (pl <= itm()) S.itm++;
  S.pt += pt;
  try {
    localStorage.setItem("mtt5", JSON.stringify(S));
  } catch (e) {}
  render();
  $("ov").hidden = 0;
  $("ov").innerHTML =
    `<h2 style="margin-top:0">${pl == 1 ? "🏆 優勝！" : pl + "位 でフィニッシュ"}</h2><p>${pl <= itm() ? "ITM（入賞）" : "ITM圏外"}${pl <= 5 ? "／ファイナルテーブル" : ""}　エントリー ${G.entries}人（あなたのリエントリー ${h.re}回）</p><p style="color:var(--mu)">参考：サーキットpt（仮配点）${pt}pt／通算 ${S.n}回・優勝${S.w}・FT${S.ft}・ITM${S.itm}</p><button onclick="location.reload()">もう一度</button>`;
}
function render() {
  const T = G.T,
    h = G.hero,
    al = G.P.filter((p) => p.alive),
    [sb, bb, an] = LV[G.lv];
  const rk = [...al].sort((a, b) => b.stack - a.stack).indexOf(h) + 1,
    avg = Math.round(al.reduce((s, p) => s + p.stack, 0) / Math.max(1, al.length));
  const hs = `<b>Lv${G.lv + 1}</b>（BB=${bb}点・ante ${+(an / bb).toFixed(2)}BB） ・ 次Lvまで <b id=tm></b> ・ 残り <b>${al.length}</b>/${G.entries}人 ・ ITM ${itm()}位 ・ 平均 ${fb(avg)}BB ・ あなた <b>${rk}位</b>（${fb(h.stack)}BB）${G.lv < 2 && !h.re ? " ・ <b>RE可</b>" : ""}`;
  if (G.hs != hs) {
    G.hs = hs;
    $("hd").innerHTML = hs;
    tmr();
  }
  const seat = (p) =>
    `<div class="s${p.fold ? " f" : ""}${G.req && G.req.p == p ? " a" : ""}${p.hero ? " h" : ""}"><b style="color:${p.col || "inherit"}">${p.name}</b> <small>${p.hero || !G.ty ? "" : p.ty[0]} ${p.lab || ""}</small><div>${fb(p.stack)} BB</div><div>${p.h ? p.h.map((c) => cd(c, !p.hero && !p.show)).join("") : "&nbsp;"}</div><em>${p.bet ? "bet " + fb(p.bet) : ""}</em></div>`;
  const pot = (T.ps || []).reduce((s, p) => s + p.tot, 0);
  $("tb").innerHTML = `<div class=row>${T.p
    .filter((p) => !p.hero)
    .map(seat)
    .join(
      "",
    )}</div><div class=bd>${(T.bd || []).map((c) => cd(c)).join("") || "&nbsp;"}<span>POT ${fb(pot)} BB</span></div>${seat(h)}`;
  let c = "";
  if (G.req) {
    const { p, c: q } = G.req,
      mx = p.bet + p.stack,
      mn = Math.min(q.cur + q.minR, mx);
    G.rx = G.rx0 = mn;
    G.mn = mn;
    G.mx = mx;
    c = q.toCall
      ? `<button class=g onclick="A('f')">フォールド</button><button onclick="A('c')">コール ${fb(Math.min(q.toCall, p.stack))}BB</button>`
      : `<button onclick="A('c')">チェック</button>`;
    if (mx > q.cur)
      c +=
        `<div class=rs><input id=sl type=range min=${mn} max=${mx} value=${mn} oninput="X(this.value)"><button onclick="A('r')">${q.cur ? "レイズ" : "ベット"} <span id=rv>${fb(mn)}</span>BB</button></div><div>` +
        (q.cur
          ? [
              [2, "2x"],
              [2.5, "2.5x"],
              [3, "3x"],
            ].map(
              ([f, n]) => `<button class=g onclick="X(${Math.round(q.cur * f)},1)">${n}</button>`,
            )
          : [
              [1 / 3, "1/3 Pot"],
              [0.5, "1/2 Pot"],
              [1, "1 Pot"],
            ].map(
              ([f, n]) => `<button class=g onclick="X(${Math.round(q.pot * f)},1)">${n}</button>`,
            )
        ).join("") +
        `<button class=g onclick="X(${mx},1)">All-in</button></div>`;
  } else if (G.ask)
    c =
      '<p>バストしました。リエントリー（開始スタック）しますか？</p><button onclick="reent()">リエントリー</button><button class=g onclick="fin()">終了</button>';
  else if (G.wait && h.stack > 0) c = '<button onclick="nx()">次のハンド ▶</button>';
  else if (!G.wait) c = '<span style="color:var(--mu)">CPUのアクション中…</span>';
  $("ct").innerHTML = c;
  $("lg").innerHTML = G.lg
    .slice(-14)
    .map((s) => `<div>${s}</div>`)
    .join("");
  $("lg").scrollTop = 1e5;
}
function X(v, s) {
  v = Math.max(G.mn, Math.min(G.mx, +v));
  G.rx = v;
  $("rv").textContent = fb(v);
  if (s) $("sl").value = v;
}
function A(t) {
  G.req = null;
  step(t == "r" ? { t, x: G.rx } : { t });
}
function TY2(v) {
  G.ty = v;
  try {
    localStorage.setItem("mtt5ty", v ? 1 : 0);
  } catch (e) {}
  render();
}
function tmr() {
  const e = $("tm");
  if (e && G.lvEnd) {
    const t = (Math.max(0, G.lvEnd - Date.now()) / 1000) | 0,
      s = ((t / 60) | 0) + ":" + String(t % 60).padStart(2, "0");
    if (e.textContent != s) e.textContent = s;
  }
}
setInterval(tmr, 500);
function begin() {
  G = { dur: +$("spd").value * 6e4, lv: 0, entries: 40, lg: [], ty: ls() };
  $("tyc").checked = G.ty;
  G.lvEnd = Date.now() + G.dur;
  const nm = shf([...NM]);
  G.P = [];
  for (let i = 0; i < 40; i++) {
    const t = TY[i % 6];
    G.P.push(
      i && i < 4
        ? {
            id: i,
            name: NC[i - 1][0],
            k: NC[i - 1][0],
            col: NC[i - 1][1],
            ty: ["ネームド"],
            l: NC[i - 1][2],
            a: NC[i - 1][3],
            b: NC[i - 1][4],
            rd: NC[i - 1][5],
            stack: 1e4,
            re: 0,
            alive: 1,
          }
        : i
          ? {
              id: i,
              name: nm[i - 1],
              ty: t,
              l: t[1] + (R() - 0.5) * 0.1,
              a: t[2] + (R() - 0.5) * 0.1,
              b: t[3],
              icm: t[4],
              rd: t[5],
              stack: 1e4,
              re: 0,
              alive: 1,
            }
          : { id: 0, name: "あなた", hero: 1, ty: ["—"], stack: 1e4, re: 0, alive: 1 },
    );
  }
  const sh = shf([...G.P]);
  G.tables = [];
  for (let i = 0; i < 8; i++) G.tables.push({ p: sh.slice(i * 5, i * 5 + 5), btn: -1 });
  G.hero = G.P[0];
  G.P.filter((p) => p.k).forEach((n) => {
    const h = G.tables.find((t) => t.p.includes(G.hero)),
      tn = G.tables.find((t) => t.p.includes(n)),
      w = R() < 0.35;
    if (w == (tn == h)) return;
    const t2 = w ? h : G.tables.filter((t) => t != h)[(R() * 7) | 0],
      cn = t2.p.filter((x) => !x.k && !x.hero);
    if (!cn.length) return;
    const q = cn[(R() * cn.length) | 0];
    tn.p[tn.p.indexOf(n)] = q;
    t2.p[t2.p.indexOf(q)] = n;
  });
  G.T = G.tables.find((t) => t.p.includes(G.hero));
  $("start").hidden = 1;
  $("game").hidden = 0;
  nx();
}
