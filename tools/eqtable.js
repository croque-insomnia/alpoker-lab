// game.js の勝率表 EQ169 / ER169 を作り直すためのツール（Node.js で実行する）
//
// 使い方:
//   node tools/eqtable.js eq [回数] [seed]   … ランダムな1手に対する勝率（EQ169）
//   node tools/eqtable.js er [回数] [seed]   … 上位20%の手に対する勝率（ER169）。EQ169 の並び順を使う
//
// 出力された13行を、game.js の該当する表の中身と差し替える。
// game.js の表は、seed を変えて8回ずつ計算した平均（EQ169: 8000回×8、ER169: 5000回×8）。
// 時間がかかる（8000回で1分強）ので、seed を変えて並列に走らせ、平均を取るとよい。
const fs = require("fs"),
  vm = require("vm"),
  path = require("path");
const mode = process.argv[2] || "eq",
  N = +process.argv[3] || 8000;
let seed = +process.argv[4] || 42;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const el = { textContent: "", checked: false };
global.document = { getElementById: () => el };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.setInterval = () => 0;
vm.runInThisContext(fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8"));

// 相手の手の候補（er のときは EQ169 で上位20%の手だけ）
const range = new Set();
if (mode == "er") for (const [k, v] of Object.entries(PF)) if (v.pct < 0.2) range.add(k);

const RKS = "23456789TJQKA",
  rows = new Map();
for (let hi = 12; hi >= 0; hi--)
  for (let lo = hi; lo >= 0; lo--)
    for (const suited of hi == lo ? [0] : [1, 0]) {
      const h = [hi, suited ? lo : 13 + lo];
      let w = 0;
      for (let t = 0; t < N; t++) {
        const used = new Set(h),
          pick = () => {
            let x;
            do x = (rnd() * 52) | 0;
            while (used.has(x));
            used.add(x);
            return x;
          };
        let o;
        for (;;) {
          o = [pick(), pick()];
          if (!range.size || range.has(hcls(o))) break;
          used.delete(o[0]);
          used.delete(o[1]);
        }
        const b = [pick(), pick(), pick(), pick(), pick()],
          x = best(h.concat(b)),
          y = best(o.concat(b));
        w += x > y ? 1 : x == y ? 0.5 : 0;
      }
      const name = RKS[hi] + RKS[lo] + (hi == lo ? "" : suited ? "s" : "o");
      if (!rows.has(name[0])) rows.set(name[0], []);
      rows.get(name[0]).push(name + Math.round((w / N) * 1000));
    }
console.log([...rows.values()].map((r) => "  " + r.join(" ")).join("\n"));
