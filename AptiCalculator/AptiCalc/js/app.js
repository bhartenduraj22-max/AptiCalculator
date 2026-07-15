/* AptiCalc — vanilla JS single-page app with hash routing */
(() => {
  "use strict";

  // ---------- Theme ----------
  const themeBtn = document.getElementById("themeToggle");
  const applyTheme = (t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
  };
  const savedTheme = localStorage.getItem("apticalc-theme") || "light";
  applyTheme(savedTheme);
  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem("apticalc-theme", next);
    applyTheme(next);
  });

  // ---------- Toast ----------
  const toastEl = document.getElementById("toast");
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  };

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  const num = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error("Please enter valid numbers in all fields.");
    return n;
  };
  const round = (n, d = 4) => {
    if (!Number.isFinite(n)) return n;
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  };
  const fmt = (n, d = 4) => {
    if (typeof n !== "number") return String(n);
    return round(n, d).toLocaleString(undefined, { maximumFractionDigits: d });
  };

  // ---------- Calculator registry ----------
  // Each calc: { id, title, desc, icon, palette, fields, compute(inputs) -> { value, sub?, steps: [...] } }
  const calcs = {};
  const register = (c) => (calcs[c.id] = c);

  // 1. Percentage
  register({
    id: "percentage",
    title: "Percentage Calculator",
    desc: "Find X% of Y, or what % X is of Y.",
    icon: "％", palette: "i-pink",
    fields: [
      { name: "mode", label: "Mode", type: "select", options: [
        { v: "of", t: "X% of Y" },
        { v: "isof", t: "X is what % of Y" },
        { v: "change", t: "% change from A to B" },
      ]},
      { name: "a", label: "First number", type: "number", value: 25 },
      { name: "b", label: "Second number", type: "number", value: 200 },
    ],
    compute({ mode, a, b }) {
      a = num(a); b = num(b);
      if (mode === "of") {
        const v = (a / 100) * b;
        return {
          value: `${fmt(v)}`,
          sub: `${a}% of ${b}`,
          steps: [
            `Formula: <span class="formula">(X / 100) × Y</span>`,
            `Substitute: <span class="formula">(${a} / 100) × ${b}</span>`,
            `= <span class="formula">${fmt(a/100)} × ${b}</span>`,
            `= <span class="formula">${fmt(v)}</span>`,
          ],
        };
      }
      if (mode === "isof") {
        if (b === 0) throw new Error("Second number cannot be zero.");
        const v = (a / b) * 100;
        return {
          value: `${fmt(v)}%`,
          sub: `${a} is ${fmt(v)}% of ${b}`,
          steps: [
            `Formula: <span class="formula">(X / Y) × 100</span>`,
            `Substitute: <span class="formula">(${a} / ${b}) × 100</span>`,
            `= <span class="formula">${fmt(a/b)} × 100</span>`,
            `= <span class="formula">${fmt(v)}%</span>`,
          ],
        };
      }
      if (a === 0) throw new Error("Starting value cannot be zero.");
      const v = ((b - a) / a) * 100;
      return {
        value: `${fmt(v)}%`,
        sub: v >= 0 ? "Increase" : "Decrease",
        steps: [
          `Formula: <span class="formula">((B − A) / A) × 100</span>`,
          `Substitute: <span class="formula">((${b} − ${a}) / ${a}) × 100</span>`,
          `= <span class="formula">(${b-a} / ${a}) × 100</span>`,
          `= <span class="formula">${fmt(v)}%</span>`,
        ],
      };
    },
  });

  // 2. Age
  register({
    id: "age",
    title: "Age Calculator",
    desc: "Calculate age in years, months and days.",
    icon: "🎂", palette: "i-lemon",
    fields: [
      { name: "dob", label: "Date of Birth", type: "date" },
      { name: "on", label: "As of Date", type: "date", value: new Date().toISOString().slice(0,10) },
    ],
    compute({ dob, on }) {
      if (!dob || !on) throw new Error("Please choose both dates.");
      const d1 = new Date(dob), d2 = new Date(on);
      if (d2 < d1) throw new Error("As-of date must be after date of birth.");
      let y = d2.getFullYear() - d1.getFullYear();
      let m = d2.getMonth() - d1.getMonth();
      let d = d2.getDate() - d1.getDate();
      if (d < 0) { m -= 1; const prev = new Date(d2.getFullYear(), d2.getMonth(), 0); d += prev.getDate(); }
      if (m < 0) { y -= 1; m += 12; }
      const totalDays = Math.floor((d2 - d1) / 86400000);
      return {
        value: `${y} years, ${m} months, ${d} days`,
        sub: `Total days lived: ${totalDays.toLocaleString()}`,
        steps: [
          `Difference of years: <span class="formula">${d2.getFullYear()} − ${d1.getFullYear()} = ${d2.getFullYear()-d1.getFullYear()}</span>`,
          `Adjust months and days if the current day/month is earlier than DOB.`,
          `Final: <span class="formula">${y}y ${m}m ${d}d</span>`,
          `Total elapsed days: <span class="formula">${totalDays}</span>`,
        ],
      };
    },
  });

  // 3. Simple Interest
  register({
    id: "simple-interest",
    title: "Simple Interest",
    desc: "SI on principal, rate and time.",
    icon: "💰", palette: "i-mint",
    fields: [
      { name: "p", label: "Principal (P)", type: "number", value: 10000 },
      { name: "r", label: "Rate % per year (R)", type: "number", value: 8 },
      { name: "t", label: "Time (years)", type: "number", value: 3 },
    ],
    compute({ p, r, t }) {
      p = num(p); r = num(r); t = num(t);
      const si = (p * r * t) / 100;
      const a = p + si;
      return {
        value: `Interest: ${fmt(si)}`,
        sub: `Total Amount: ${fmt(a)}`,
        steps: [
          `Formula: <span class="formula">SI = (P × R × T) / 100</span>`,
          `Substitute: <span class="formula">(${p} × ${r} × ${t}) / 100</span>`,
          `= <span class="formula">${fmt(p*r*t)} / 100 = ${fmt(si)}</span>`,
          `Amount: <span class="formula">A = P + SI = ${p} + ${fmt(si)} = ${fmt(a)}</span>`,
        ],
      };
    },
  });

  // 4. Compound Interest
  register({
    id: "compound-interest",
    title: "Compound Interest",
    desc: "CI compounded n times per year.",
    icon: "📈", palette: "i-sky",
    fields: [
      { name: "p", label: "Principal (P)", type: "number", value: 10000 },
      { name: "r", label: "Rate % per year (R)", type: "number", value: 8 },
      { name: "t", label: "Time (years)", type: "number", value: 3 },
      { name: "n", label: "Compounds per year (n)", type: "number", value: 1 },
    ],
    compute({ p, r, t, n }) {
      p = num(p); r = num(r); t = num(t); n = num(n);
      if (n <= 0) throw new Error("Compounds per year must be > 0.");
      const rate = r / (100 * n);
      const a = p * Math.pow(1 + rate, n * t);
      const ci = a - p;
      return {
        value: `Interest: ${fmt(ci)}`,
        sub: `Amount: ${fmt(a)}`,
        steps: [
          `Formula: <span class="formula">A = P × (1 + R / (100·n))^(n·t)</span>`,
          `Substitute: <span class="formula">${p} × (1 + ${r}/(100×${n}))^(${n}×${t})</span>`,
          `= <span class="formula">${p} × (1 + ${fmt(rate,6)})^${n*t}</span>`,
          `= <span class="formula">${p} × ${fmt(Math.pow(1+rate,n*t),6)}</span>`,
          `= <span class="formula">${fmt(a)}</span>`,
          `CI = A − P = <span class="formula">${fmt(a)} − ${p} = ${fmt(ci)}</span>`,
        ],
      };
    },
  });

  // 5. Profit & Loss
  register({
    id: "profit-loss",
    title: "Profit & Loss",
    desc: "Find profit/loss and its percentage.",
    icon: "🛍️", palette: "i-peach",
    fields: [
      { name: "cp", label: "Cost Price (CP)", type: "number", value: 500 },
      { name: "sp", label: "Selling Price (SP)", type: "number", value: 650 },
    ],
    compute({ cp, sp }) {
      cp = num(cp); sp = num(sp);
      if (cp <= 0) throw new Error("Cost Price must be > 0.");
      const diff = sp - cp;
      const pct = (diff / cp) * 100;
      const label = diff >= 0 ? "Profit" : "Loss";
      return {
        value: `${label}: ${fmt(Math.abs(diff))}`,
        sub: `${label} %: ${fmt(Math.abs(pct))}%`,
        steps: [
          `Difference: <span class="formula">SP − CP = ${sp} − ${cp} = ${fmt(diff)}</span>`,
          `Formula: <span class="formula">${label}% = (|SP − CP| / CP) × 100</span>`,
          `= <span class="formula">(${fmt(Math.abs(diff))} / ${cp}) × 100 = ${fmt(Math.abs(pct))}%</span>`,
        ],
      };
    },
  });

  // 6. Time-Speed-Distance
  register({
    id: "time-speed-distance",
    title: "Time • Speed • Distance",
    desc: "Solve for whichever value is missing.",
    icon: "🚗", palette: "i-lilac",
    fields: [
      { name: "solve", label: "Solve for", type: "select", options: [
        { v: "d", t: "Distance" }, { v: "s", t: "Speed" }, { v: "t", t: "Time" }
      ]},
      { name: "s", label: "Speed", type: "number", value: 60 },
      { name: "t", label: "Time", type: "number", value: 2 },
      { name: "d", label: "Distance", type: "number", value: 120 },
    ],
    compute({ solve, s, t, d }) {
      s = num(s); t = num(t); d = num(d);
      if (solve === "d") {
        const v = s * t;
        return { value: `Distance = ${fmt(v)}`,
          steps: [
            `Formula: <span class="formula">D = S × T</span>`,
            `Substitute: <span class="formula">${s} × ${t} = ${fmt(v)}</span>`,
          ]};
      }
      if (solve === "s") {
        if (t === 0) throw new Error("Time cannot be zero.");
        const v = d / t;
        return { value: `Speed = ${fmt(v)}`,
          steps: [
            `Formula: <span class="formula">S = D / T</span>`,
            `Substitute: <span class="formula">${d} / ${t} = ${fmt(v)}</span>`,
          ]};
      }
      if (s === 0) throw new Error("Speed cannot be zero.");
      const v = d / s;
      return { value: `Time = ${fmt(v)}`,
        steps: [
          `Formula: <span class="formula">T = D / S</span>`,
          `Substitute: <span class="formula">${d} / ${s} = ${fmt(v)}</span>`,
        ]};
    },
  });

  // 7. Average
  register({
    id: "average",
    title: "Average Calculator",
    desc: "Mean of a list of numbers.",
    icon: "➗", palette: "i-mint",
    fields: [
      { name: "nums", label: "Numbers (comma separated)", type: "text", value: "12, 18, 24, 30, 36" },
    ],
    compute({ nums }) {
      const arr = String(nums).split(",").map(s => s.trim()).filter(Boolean).map(Number);
      if (!arr.length || arr.some(n => !Number.isFinite(n))) throw new Error("Enter valid comma-separated numbers.");
      const sum = arr.reduce((a,b) => a+b, 0);
      const avg = sum / arr.length;
      return {
        value: `Average = ${fmt(avg)}`,
        sub: `Sum = ${fmt(sum)}, Count = ${arr.length}`,
        steps: [
          `Formula: <span class="formula">Average = Sum ÷ Count</span>`,
          `Sum: <span class="formula">${arr.join(" + ")} = ${fmt(sum)}</span>`,
          `Count: <span class="formula">${arr.length}</span>`,
          `Average: <span class="formula">${fmt(sum)} ÷ ${arr.length} = ${fmt(avg)}</span>`,
        ],
      };
    },
  });

  // 8. Ratio & Proportion
  register({
    id: "ratio",
    title: "Ratio & Proportion",
    desc: "Simplify a ratio or find missing term.",
    icon: "⚖️", palette: "i-sky",
    fields: [
      { name: "mode", label: "Mode", type: "select", options: [
        { v: "simplify", t: "Simplify a:b" },
        { v: "proportion", t: "Find x in a:b = c:x" },
      ]},
      { name: "a", label: "a", type: "number", value: 8 },
      { name: "b", label: "b", type: "number", value: 12 },
      { name: "c", label: "c (proportion)", type: "number", value: 6 },
    ],
    compute({ mode, a, b, c }) {
      a = num(a); b = num(b); c = num(c);
      const gcd = (x, y) => { x = Math.abs(x); y = Math.abs(y); while (y) { [x, y] = [y, x % y]; } return x || 1; };
      if (mode === "simplify") {
        const g = gcd(a, b);
        return {
          value: `${a/g} : ${b/g}`,
          sub: `GCD = ${g}`,
          steps: [
            `Find GCD of ${a} and ${b}: <span class="formula">${g}</span>`,
            `Divide both terms by GCD: <span class="formula">${a}/${g} : ${b}/${g} = ${a/g} : ${b/g}</span>`,
          ],
        };
      }
      if (a === 0) throw new Error("a cannot be 0 in a:b = c:x.");
      const x = (b * c) / a;
      return {
        value: `x = ${fmt(x)}`,
        sub: `${a} : ${b} = ${c} : ${fmt(x)}`,
        steps: [
          `Cross multiply: <span class="formula">a × x = b × c</span>`,
          `<span class="formula">x = (b × c) / a = (${b} × ${c}) / ${a} = ${fmt(x)}</span>`,
        ],
      };
    },
  });

  // 9. HCF & LCM
  register({
    id: "hcf-lcm",
    title: "HCF & LCM",
    desc: "Find HCF (GCD) and LCM of numbers.",
    icon: "🔢", palette: "i-lilac",
    fields: [
      { name: "nums", label: "Numbers (comma separated)", type: "text", value: "12, 18, 24" },
    ],
    compute({ nums }) {
      const arr = String(nums).split(",").map(s => s.trim()).filter(Boolean).map(Number);
      if (arr.length < 2 || arr.some(n => !Number.isInteger(n) || n <= 0)) throw new Error("Enter at least two positive integers.");
      const gcd2 = (x, y) => { while (y) { [x, y] = [y, x % y]; } return x; };
      const lcm2 = (x, y) => (x / gcd2(x, y)) * y;
      const hcf = arr.reduce(gcd2);
      const lcm = arr.reduce(lcm2);
      return {
        value: `HCF = ${hcf},  LCM = ${lcm}`,
        steps: [
          `Compute HCF pair-by-pair using Euclid's algorithm.`,
          `HCF(${arr.join(", ")}) = <span class="formula">${hcf}</span>`,
          `LCM using: <span class="formula">LCM(a,b) = (a × b) / HCF(a,b)</span>, extended to all numbers.`,
          `LCM(${arr.join(", ")}) = <span class="formula">${lcm}</span>`,
        ],
      };
    },
  });

  // 10. Clock Angle
  register({
    id: "clock-angle",
    title: "Clock Angle",
    desc: "Angle between hour & minute hands.",
    icon: "🕒", palette: "i-peach",
    fields: [
      { name: "h", label: "Hour (1-12)", type: "number", value: 3 },
      { name: "m", label: "Minute (0-59)", type: "number", value: 30 },
    ],
    compute({ h, m }) {
      h = num(h); m = num(m);
      if (h < 1 || h > 12 || m < 0 || m >= 60) throw new Error("Hour 1-12, Minute 0-59.");
      const hourAngle = (h % 12) * 30 + m * 0.5;
      const minAngle = m * 6;
      let angle = Math.abs(hourAngle - minAngle);
      if (angle > 180) angle = 360 - angle;
      return {
        value: `Angle = ${fmt(angle)}°`,
        steps: [
          `Hour hand angle: <span class="formula">(H × 30) + (M × 0.5) = (${h}×30) + (${m}×0.5) = ${fmt(hourAngle)}°</span>`,
          `Minute hand angle: <span class="formula">M × 6 = ${m}×6 = ${minAngle}°</span>`,
          `Difference: <span class="formula">|${fmt(hourAngle)} − ${minAngle}| = ${fmt(Math.abs(hourAngle-minAngle))}°</span>`,
          `If > 180°, take 360 − angle. Final answer: <span class="formula">${fmt(angle)}°</span>`,
        ],
      };
    },
  });

  // 11. Calendar / Day of the week
  register({
    id: "calendar",
    title: "Calendar Calculator",
    desc: "Find the day of the week for any date.",
    icon: "📅", palette: "i-pink",
    fields: [
      { name: "date", label: "Pick a date", type: "date", value: new Date().toISOString().slice(0,10) },
    ],
    compute({ date }) {
      if (!date) throw new Error("Please choose a date.");
      const d = new Date(date);
      const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const name = days[d.getDay()];
      // Zeller's congruence for detail
      let day = d.getDate(), month = d.getMonth() + 1, year = d.getFullYear();
      if (month < 3) { month += 12; year -= 1; }
      const K = year % 100, J = Math.floor(year / 100);
      const h = (day + Math.floor(13*(month+1)/5) + K + Math.floor(K/4) + Math.floor(J/4) + 5*J) % 7;
      // Zeller: 0=Sat,1=Sun,...
      const zellerNames = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"];
      return {
        value: name,
        sub: d.toDateString(),
        steps: [
          `Using Zeller's Congruence: <span class="formula">h = (q + ⌊13(m+1)/5⌋ + K + ⌊K/4⌋ + ⌊J/4⌋ + 5J) mod 7</span>`,
          `where q=day, m=month (Mar=3…Feb=14), K=year mod 100, J=⌊year/100⌋.`,
          `Substitute: q=${day}, m=${month}, K=${K}, J=${J} → h = ${h}`,
          `h maps to: <span class="formula">${zellerNames[h]}</span>`,
        ],
      };
    },
  });

  // 12. Unit Converter
  register({
    id: "unit-converter",
    title: "Unit Converter",
    desc: "Convert length, mass, and temperature.",
    icon: "📏", palette: "i-sky",
    fields: [
      { name: "type", label: "Category", type: "select", options: [
        { v: "length", t: "Length" }, { v: "mass", t: "Mass" }, { v: "temp", t: "Temperature" }
      ]},
      { name: "value", label: "Value", type: "number", value: 100 },
      { name: "from", label: "From", type: "text", value: "cm" },
      { name: "to", label: "To", type: "text", value: "m" },
    ],
    compute({ type, value, from, to }) {
      value = num(value); from = String(from).trim().toLowerCase(); to = String(to).trim().toLowerCase();
      const length = { mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344 };
      const mass = { mg:0.001, g:1, kg:1000, lb:453.592, oz:28.3495, t:1000000 };
      if (type === "length" || type === "mass") {
        const table = type === "length" ? length : mass;
        if (!(from in table) || !(to in table))
          throw new Error(`Use units: ${Object.keys(table).join(", ")}`);
        const base = value * table[from];
        const out = base / table[to];
        return { value: `${fmt(value)} ${from} = ${fmt(out)} ${to}`,
          steps: [
            `Convert to base: <span class="formula">${value} × ${table[from]} = ${fmt(base)}</span>`,
            `Convert to target: <span class="formula">${fmt(base)} / ${table[to]} = ${fmt(out)}</span>`,
          ]};
      }
      const toC = { c: v => v, f: v => (v-32)*5/9, k: v => v-273.15 };
      const fromC = { c: v => v, f: v => v*9/5+32, k: v => v+273.15 };
      if (!(from in toC) || !(to in fromC)) throw new Error("Temperature units: c, f, k");
      const c = toC[from](value);
      const out = fromC[to](c);
      return { value: `${fmt(value)}°${from.toUpperCase()} = ${fmt(out)}°${to.toUpperCase()}`,
        steps: [
          `Convert input to Celsius: <span class="formula">${fmt(c)}°C</span>`,
          `Convert Celsius to target unit: <span class="formula">${fmt(out)}°${to.toUpperCase()}</span>`,
        ]};
    },
  });

  // Coming soon calculators
  const soonList = [
    ["number-system", "Number System", "🔟", "i-mint"],
    ["geometry", "Geometry", "📐", "i-lilac"],
    ["mensuration", "Mensuration", "🧊", "i-peach"],
    ["probability", "Probability", "🎲", "i-sky"],
    ["perm-comb", "Permutation & Combination", "🔀", "i-pink"],
    ["pipes-cisterns", "Pipes & Cisterns", "🚿", "i-mint"],
    ["work-time", "Work & Time", "🛠️", "i-lemon"],
    ["trains", "Trains", "🚆", "i-sky"],
    ["boats-streams", "Boats & Streams", "⛵", "i-lilac"],
    ["blood-relations", "Blood Relations", "👨‍👩‍👧", "i-pink"],
    ["direction-sense", "Direction Sense", "🧭", "i-peach"],
    ["coding-decoding", "Coding-Decoding", "🔐", "i-lilac"],
    ["alphabet-series", "Alphabet Series", "🔤", "i-lemon"],
    ["number-series", "Number Series", "🧠", "i-mint"],
  ];

  // Formula sheet (special)
  const FORMULA_SHEET = [
    ["Percentage", "% change = ((B − A) / A) × 100"],
    ["Simple Interest", "SI = (P × R × T) / 100"],
    ["Compound Interest", "A = P × (1 + R/(100·n))^(n·t)"],
    ["Profit / Loss", "Profit% = ((SP − CP)/CP) × 100"],
    ["Speed", "S = D / T,   D = S × T,   T = D / S"],
    ["Average", "Avg = Sum / Count"],
    ["Ratio", "a:b = c:d ⇒ a·d = b·c"],
    ["HCF × LCM", "HCF(a,b) × LCM(a,b) = a × b"],
    ["Clock Angle", "|30H − 5.5M|°"],
    ["Work & Time", "1/A + 1/B = 1/T"],
    ["Pipes", "Net rate = inlet rate − outlet rate"],
    ["Train crosses pole", "Time = Length / Speed"],
    ["Boats & Streams", "Down = B+S,  Up = B−S"],
    ["Permutations", "nPr = n! / (n−r)!"],
    ["Combinations", "nCr = n! / (r!·(n−r)!)"],
    ["Circle", "Area = πr², Circumference = 2πr"],
    ["Rectangle", "Area = l·b, Perimeter = 2(l+b)"],
    ["Triangle", "Area = ½ × base × height"],
    ["Cube", "V = a³, SA = 6a²"],
    ["Cylinder", "V = πr²h, SA = 2πr(r+h)"],
  ];

  // Build homepage cards
  const HOME_CARDS = [
    { id: "calendar",           title: "Calendar Calculator",         desc: "Find day of the week for any date.",   icon: "📅", palette: "i-pink"  },
    { id: "clock-angle",        title: "Clock Angle Calculator",      desc: "Angle between hour and minute hands.", icon: "🕒", palette: "i-peach" },
    { id: "age",                title: "Age Calculator",              desc: "Years, months, days between dates.",   icon: "🎂", palette: "i-lemon" },
    { id: "time-speed-distance",title: "Time-Speed-Distance",         desc: "Solve for any one of D, S, T.",        icon: "🚗", palette: "i-lilac" },
    { id: "profit-loss",        title: "Profit & Loss",               desc: "Profit / loss and %.",                 icon: "🛍️", palette: "i-peach" },
    { id: "percentage",         title: "Percentage Calculator",       desc: "Percent of, is-of, and change.",       icon: "％",  palette: "i-pink"  },
    { id: "ratio",              title: "Ratio & Proportion",          desc: "Simplify or find missing term.",       icon: "⚖️", palette: "i-sky"   },
    { id: "average",            title: "Average Calculator",          desc: "Mean of a list of numbers.",           icon: "➗", palette: "i-mint"  },
    { id: "simple-interest",    title: "Simple Interest",             desc: "SI, principal, rate & time.",          icon: "💰", palette: "i-mint"  },
    { id: "compound-interest",  title: "Compound Interest",           desc: "CI with n compounds per year.",        icon: "📈", palette: "i-sky"   },
    { id: "hcf-lcm",            title: "HCF & LCM",                   desc: "GCD and LCM of many numbers.",         icon: "🔢", palette: "i-lilac" },
    ...soonList.map(([id,title,icon,palette]) => ({ id, title, icon, palette, desc: "Coming soon in a future update.", soon: true })),
    { id: "unit-converter",     title: "Unit Converter",              desc: "Length, mass, temperature.",           icon: "📏", palette: "i-sky"   },
    { id: "formula-sheet",      title: "Formula Sheet",               desc: "Quick reference for aptitude.",        icon: "📚", palette: "i-lemon" },
  ];

  // ---------- Rendering ----------
  const app = document.getElementById("app");

  function renderHome() {
    app.innerHTML = "";
    const hero = el(`
      <section class="hero">
        <div>
          <h1>Learn aptitude the fun way! ✨</h1>
          <p>AptiCalc is your colorful playground of calculators for percentages, time-speed-distance, interest, geometry and more — with clear <b>step-by-step solutions</b> so you truly understand every answer.</p>
          <div class="search-wrap">
            <label class="search">
              <span aria-hidden="true">🔎</span>
              <input id="search" placeholder="Search a calculator (e.g. percentage, age, clock)…" />
            </label>
          </div>
        </div>
        <div class="emoji">🧮</div>
      </section>
    `);
    app.appendChild(hero);

    const title = el(`<h2 class="section-title">🎯 <span>Pick a calculator</span></h2>`);
    app.appendChild(title);

    const grid = el(`<section class="grid" id="grid"></section>`);
    app.appendChild(grid);

    HOME_CARDS.forEach((c, i) => {
      const card = el(`
        <a class="card ${c.soon ? 'soon' : ''}" href="#/calc/${c.id}" style="animation-delay:${i*20}ms">
          ${c.soon ? '<span class="tag">Soon</span>' : ''}
          <div class="icon ${c.palette}">${c.icon}</div>
          <h3>${c.title}</h3>
          <p>${c.desc}</p>
        </a>
      `);
      grid.appendChild(card);
    });

    const search = $("#search");
    search.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      [...grid.children].forEach((el, i) => {
        const c = HOME_CARDS[i];
        const hit = !q || c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
        el.style.display = hit ? "" : "none";
      });
    });
  }

  function renderFormulaSheet() {
    app.innerHTML = "";
    app.appendChild(el(`<a class="back" href="#/">← Back to calculators</a>`));
    const wrap = el(`
      <section class="calc">
        <div class="calc-head">
          <div class="icon i-lemon">📚</div>
          <div>
            <h2>Formula Sheet</h2>
            <p>Handy reference for common aptitude formulas.</p>
          </div>
        </div>
        <div class="sheet" id="sheet"></div>
      </section>
    `);
    app.appendChild(wrap);
    const sheet = $("#sheet", wrap);
    FORMULA_SHEET.forEach(([name, formula]) => {
      sheet.appendChild(el(`<div class="item"><h4>${name}</h4><code>${formula}</code></div>`));
    });
  }

  function renderComingSoon(id) {
    const meta = HOME_CARDS.find(c => c.id === id) || { title: id, icon: "🚧", palette: "i-lilac" };
    app.innerHTML = "";
    app.appendChild(el(`<a class="back" href="#/">← Back to calculators</a>`));
    const page = el(`
      <section class="soon-page">
        <div class="soon-emoji">${meta.icon || "🚧"}</div>
        <h2 style="margin:14px 0 6px">${meta.title} is Coming Soon!</h2>
        <p style="max-width:520px;margin:0 auto;color:var(--muted)">
          Our friendly team of learning elves is polishing this calculator right now.
          Check back soon — it'll be available in a future update. 🌈✨
        </p>
        <div style="margin-top:22px">
          <a class="btn btn-primary" href="#/">Explore other calculators</a>
        </div>
      </section>
    `);
    app.appendChild(page);
  }

  function renderCalc(id) {
    const c = calcs[id];
    if (!c) return renderComingSoon(id);
    const meta = HOME_CARDS.find(h => h.id === id) || {};
    app.innerHTML = "";
    app.appendChild(el(`<a class="back" href="#/">← Back to calculators</a>`));

    const wrap = el(`
      <section class="calc">
        <div class="calc-head">
          <div class="icon ${meta.palette || 'i-pink'}">${c.icon}</div>
          <div>
            <h2>${c.title}</h2>
            <p>${c.desc}</p>
          </div>
        </div>
        <form class="form" id="form"></form>
        <div class="actions">
          <button class="btn btn-primary" id="calcBtn" type="button">✨ Calculate</button>
          <button class="btn btn-ghost" id="resetBtn" type="button">🔄 Reset</button>
        </div>
        <div id="output"></div>
      </section>
    `);
    app.appendChild(wrap);

    const form = $("#form", wrap);
    c.fields.forEach(f => {
      let control;
      if (f.type === "select") {
        control = `<select name="${f.name}">${f.options.map(o => `<option value="${o.v}">${o.t}</option>`).join("")}</select>`;
      } else {
        const val = f.value !== undefined ? `value="${f.value}"` : "";
        const step = f.type === "number" ? 'step="any"' : "";
        control = `<input type="${f.type}" name="${f.name}" ${val} ${step} />`;
      }
      form.appendChild(el(`<div class="field"><label>${f.label}</label>${control}</div>`));
    });

    const readInputs = () => {
      const data = {};
      [...form.elements].forEach(el => { if (el.name) data[el.name] = el.value; });
      return data;
    };
    const defaults = readInputs();

    $("#calcBtn", wrap).addEventListener("click", () => runCompute(c, form, wrap));
    $("#resetBtn", wrap).addEventListener("click", () => {
      [...form.elements].forEach(el => { if (el.name && defaults[el.name] !== undefined) el.value = defaults[el.name]; });
      $("#output", wrap).innerHTML = "";
      toast("Cleared!");
    });

    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); runCompute(c, form, wrap); }
    });
  }

  function runCompute(c, form, wrap) {
    const out = $("#output", wrap);
    out.innerHTML = `<div class="result"><span class="loader"></span> &nbsp; Calculating…</div>`;
    setTimeout(() => {
      try {
        const data = {};
        [...form.elements].forEach(el => { if (el.name) data[el.name] = el.value; });
        const res = c.compute(data);
        out.innerHTML = "";
        const box = el(`
          <div class="result">
            <div class="result-head">
              <h3>🎉 Result</h3>
              <button class="btn btn-ghost btn-mini" id="copyBtn">📋 Copy</button>
            </div>
            <div class="value"></div>
            ${res.sub ? `<div class="sub"></div>` : ""}
            <details class="steps">
              <summary>📝 Show Detailed Solution</summary>
              <ol>${res.steps.map(s => `<li>${s}</li>`).join("")}</ol>
            </details>
          </div>
        `);
        box.querySelector(".value").textContent = res.value;
        if (res.sub) box.querySelector(".sub").textContent = res.sub;
        box.querySelector("#copyBtn").addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(String(res.value) + (res.sub ? ` (${res.sub})` : ""));
            toast("Copied to clipboard ✨");
          } catch { toast("Could not copy"); }
        });
        out.appendChild(box);
      } catch (err) {
        out.innerHTML = "";
        out.appendChild(el(`<div class="result error"><h3>😅 Oops</h3><p class="sub" style="margin-top:6px">${err.message || "Something went wrong."}</p></div>`));
      }
    }, 260);
  }

  // ---------- Router ----------
  function route() {
    const hash = location.hash || "#/";
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (hash === "#/" || hash === "#") return renderHome();
    const m = hash.match(/^#\/calc\/([\w-]+)$/);
    if (m) {
      const id = m[1];
      if (id === "formula-sheet") return renderFormulaSheet();
      return renderCalc(id);
    }
    renderHome();
  }
  window.addEventListener("hashchange", route);
  route();
})();
