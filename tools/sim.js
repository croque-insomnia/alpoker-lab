// CPUの打ち方をタイプ別に計測し、攻略ボットがどれだけ勝てるかを測るシミュレーター
// ゲーム本体には含まれない開発用のツール（Node.js で実行する）
//
// 使い方:
//   node tools/sim.js cpu   [ハンド数] [seed]   … CPUだけの卓で、タイプ別の打ち方を集計
//   node tools/sim.js value [ハンド数] [seed]   … バリューボット（良い手のときだけ大きく打つ）の勝ち具合
//   node tools/sim.js bluff [ハンド数] [seed]   … ブラフボット（チェックで回ってきたら必ず打つ）の勝ち具合
//
// 1ハンドごとにスタックを 10000点（50BB）に戻して測る。BB/100 は100ハンドあたりの増減（BB単位）。
// 8000ハンドで誤差はおおよそ ±13 BB/100。
const fs = require("fs"),
  vm = require("vm"),
  path = require("path");
const mode = process.argv[2] || "cpu",
  HANDS = +process.argv[3] || (mode == "cpu" ? 20000 : 8000);
let seed = +process.argv[4] || 1;

// ブラウザ用のコードを Node で動かすための最小限の代用品
const el = { textContent: "", checked: false };
global.document = { getElementById: () => el };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.setInterval = () => 0;
// 再現できるように乱数を固定（mulberry32）
Math.random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const src = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
vm.runInThisContext(src + "\n;globalThis.__setG = (v) => { G = v; };");

// 攻略ボットの判断
const eqr = (h, B, n = 60) => {
  let w = 0;
  for (let i = 0; i < n; i++) {
    const s = new Set(h.concat(B)),
      ru = () => {
        let x;
        do x = (Math.random() * 52) | 0;
        while (s.has(x));
        s.add(x);
        return x;
      },
      o = [ru(), ru()],
      b = B.slice();
    while (b.length < 5) b.push(ru());
    const a = best(h.concat(b)),
      c = best(o.concat(b));
    w += a > c ? 1 : a == c ? 0.5 : 0;
  }
  return w / n;
};
function bot(p, c) {
  const RR = (x) => ({ t: "r", x: Math.round(x) }),
    CL = { t: "c" },
    F = { t: "f" },
    bb = c.bb;
  if (!c.board.length) {
    const q = PF[hcls(p.h)].pct;
    if (c.cur <= bb) return q <= 0.2 ? RR(bb * 2.5) : c.toCall == 0 ? CL : F;
    if (q <= 0.06) return RR(c.cur * 3);
    return q <= 0.14 ? CL : F;
  }
  const e = eqr(p.h, c.board),
    po = c.toCall / (c.pot + c.toCall || 1);
  if (p.bot == "value") {
    if (c.toCall == 0) return e >= 0.75 ? RR(c.pot * 0.75) : CL;
    if (e >= 0.9) return RR(c.cur + (c.pot + c.toCall) * 0.8);
    return e >= po + 0.2 ? CL : F;
  }
  if (c.toCall == 0) return RR(c.pot * 0.6);
  return e >= po + 0.2 ? CL : F;
}

// ai2 を包んで、アクションを集計する
const orig = globalThis.ai2,
  ST = {},
  st = (k) =>
    (ST[k] ??= {
      hands: 0,
      vpip: 0,
      pfr: 0,
      f3: 0,
      b3: 0,
      agg: 0,
      call: 0,
      fb: 0,
      fbF: 0,
      cb: 0,
      cbF: 0,
      cbR: 0,
      net: 0,
    });
let seen = null;
globalThis.ai2 = function (p, c) {
  const a = p.bot ? bot(p, c) : orig(p, c),
    S = st(p.kind),
    hs = seen.get(p);
  if (!c.board.length) {
    if (c.cur > c.bb && !hs.f3) (hs.f3 = 1), S.f3++;
    if (c.cur > c.bb && a.t == "r" && !hs.b3) (hs.b3 = 1), S.b3++;
    if (((a.t == "c" && c.toCall > 0) || a.t == "r") && !hs.v) (hs.v = 1), S.vpip++;
    if (a.t == "r" && !hs.r) (hs.r = 1), S.pfr++;
  } else {
    if (a.t == "r") S.agg++;
    else if (a.t == "c" && c.toCall > 0) S.call++;
    if (c.toCall > 0) S.fb++, a.t == "f" && S.fbF++;
    // チェックしたあとに同じストリートでベットされたときの反応
    const L = c.board.length;
    if (c.toCall == 0 && a.t == "c") (hs.ck ??= {})[L] = 1;
    else if (c.toCall > 0 && hs.ck?.[L] && !hs.ckDone?.[L]) {
      (hs.ckDone ??= {})[L] = 1;
      S.cb++;
      if (a.t == "f") S.cbF++;
      if (a.t == "r") S.cbR++;
    }
  }
  return a;
};

const KINDS = [...TY.map((t) => t[0]), ...NC.map((n) => n[0])];
function mk(id, kind) {
  const base = { id, name: kind, kind, stack: 1e4, re: 0, alive: 1 };
  if (kind == "value" || kind == "bluff")
    return { ...base, bot: kind, ty: [kind], l: 0.5, a: 0.5, b: 0 };
  const n = NC.find((n) => n[0] == kind);
  if (n) return { ...base, k: n[0], ty: ["ネームド"], l: n[2], a: n[3], b: n[4], rd: n[5] };
  const t = TY.find((t) => t[0] == kind);
  return {
    ...base,
    ty: t,
    l: t[1] + (Math.random() - 0.5) * 0.1,
    a: t[2] + (Math.random() - 0.5) * 0.1,
    b: t[3],
    icm: t[4],
    rd: t[5],
  };
}

// 40人参加・バブル前（ICMの補正がかからない状態）として扱う
__setG({ lv: 0, entries: 40, lg: [], T: {}, P: Array.from({ length: 40 }, () => ({ alive: 1 })) });
for (let h = 0; h < HANDS; h++) {
  const kinds = mode == "cpu" ? [] : [mode];
  while (kinds.length < 5) kinds.push(KINDS[(Math.random() * KINDS.length) | 0]);
  const T = { p: kinds.map((k, i) => mk(i, k)), btn: (Math.random() * 5) | 0 };
  seen = new Map(T.p.map((p) => [p, {}]));
  const it = hand(T);
  while (!it.next().done);
  for (const p of T.p) {
    const S = st(p.kind);
    S.hands++;
    S.net += (p.stack - 1e4) / LV[0][1];
  }
}

const pc = (x) => (x * 100).toFixed(0).padStart(4) + "%",
  bb100 = (S) => ((S.net / S.hands) * 100).toFixed(1).padStart(7);
if (mode == "cpu") {
  console.log(
    "タイプ          VPIP   PFR  3bet    AF  被ベット時F  チェック後F  チェックレイズ  BB/100",
  );
  for (const k of KINDS) {
    const S = ST[k];
    if (!S) continue;
    console.log(
      k.padEnd(12),
      pc(S.vpip / S.hands),
      pc(S.pfr / S.hands),
      pc(S.b3 / Math.max(1, S.f3)),
      (S.agg / Math.max(1, S.call)).toFixed(2).padStart(5),
      "    " + pc(S.fbF / Math.max(1, S.fb)),
      "     " + pc(S.cbF / Math.max(1, S.cb)),
      "        " + pc(S.cbR / Math.max(1, S.cb)),
      "   " + bb100(S),
    );
  }
} else {
  // CPU全体の、チェック後にベットされたときの反応
  const C = Object.entries(ST)
    .filter(([k]) => k != mode)
    .reduce((x, [, S]) => ((x.cb += S.cb), (x.cbF += S.cbF), (x.cbR += S.cbR), x), {
      cb: 0,
      cbF: 0,
      cbR: 0,
    });
  console.log(
    `${mode} bot: ${bb100(ST[mode])} BB/100（${ST[mode].hands}ハンド）`,
    `／CPUのチェック後フォールド ${pc(C.cbF / Math.max(1, C.cb))}・チェックレイズ ${pc(C.cbR / Math.max(1, C.cb))}`,
  );
}
