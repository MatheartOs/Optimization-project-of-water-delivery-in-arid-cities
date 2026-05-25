"use strict";

const INF = 1000000000;

const samples = {
  one: `2 5
9 1 5 4 3
8 7 6 1 2`,
  two: `3 6
8 4 5 6 4 4
7 3 4 3 3 3
3 2 2 1 1 2`,
  blocked: `4 6
9 3 9 7 3 8
6 2 6 6 2 7
5 1 5 1 1 6
4 7 4 3 2 5`
};

const phaseNames = {
  INIT: "初始化",
  DFS: "DFS 可达性遍历",
  DP: "DP 区间回传",
  CHECK: "干旱区检查",
  GREEDY: "贪心选址",
  RESULT: "输出结果"
};

const els = {
  grid: document.getElementById("grid"),
  coverageBar: document.getElementById("coverageBar"),
  resultText: document.getElementById("resultText"),
  stepIndex: document.getElementById("stepIndex"),
  phaseTitle: document.getElementById("phaseTitle"),
  stepMessage: document.getElementById("stepMessage"),
  inputData: document.getElementById("inputData"),
  intervalList: document.getElementById("intervalList"),
  intervalChart: document.getElementById("intervalChart"),
  sampleOneBtn: document.getElementById("sampleOneBtn"),
  sampleTwoBtn: document.getElementById("sampleTwoBtn"),
  blockedBtn: document.getElementById("blockedBtn"),
  loadBtn: document.getElementById("loadBtn"),
  resetBtn: document.getElementById("resetBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  playBtn: document.getElementById("playBtn"),
  speedRange: document.getElementById("speedRange")
};

let steps = [];
let stepIndex = 0;
let playTimer = null;

function parseInput(text) {
  const nums = text.trim().split(/\s+/).map(Number);
  if (nums.length < 2 || nums.some(Number.isNaN)) {
    throw new Error("输入数据必须是数字。");
  }
  const n = nums[0];
  const m = nums[1];
  if (!Number.isInteger(n) || !Number.isInteger(m) || n <= 0 || m <= 0) {
    throw new Error("第一行必须给出正整数 N 和 M。");
  }
  if (nums.length !== 2 + n * m) {
    throw new Error(`数据数量不匹配：需要 ${n * m} 个海拔值。`);
  }
  const high = [];
  let p = 2;
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < m; j++) {
      row.push(nums[p++]);
    }
    high.push(row);
  }
  return { n, m, high };
}

function matrix(n, m, value) {
  return Array.from({ length: n }, () => Array.from({ length: m }, () => value));
}

function cloneMatrix(source) {
  return source.map((row) => row.slice());
}

function cloneState(state) {
  return {
    n: state.n,
    m: state.m,
    high: state.high,
    minHeight: state.minHeight,
    maxHeight: state.maxHeight,
    vis: cloneMatrix(state.vis),
    l: cloneMatrix(state.l),
    r: cloneMatrix(state.r),
    phase: state.phase,
    message: state.message,
    current: state.current ? state.current.slice() : null,
    edge: state.edge ? state.edge.map((point) => point.slice()) : null,
    source: state.source,
    inaccessible: state.inaccessible.map((point) => point.slice()),
    selectedSources: state.selectedSources.slice(),
    candidate: state.candidate,
    greedyLeft: state.greedyLeft,
    greedyRight: state.greedyRight,
    coveredUntil: state.coveredUntil,
    answer: state.answer,
    possible: state.possible
  };
}

function buildSteps(data) {
  const { n, m, high } = data;
  const flat = high.flat();
  const state = {
    n,
    m,
    high,
    minHeight: Math.min(...flat),
    maxHeight: Math.max(...flat),
    vis: matrix(n, m, false),
    l: matrix(n, m, INF),
    r: matrix(n, m, 0),
    phase: "INIT",
    message: "读取城市海拔矩阵，准备初始化最后一行 DP 边界。",
    current: null,
    edge: null,
    source: -1,
    inaccessible: [],
    selectedSources: [],
    candidate: -1,
    greedyLeft: 1,
    greedyRight: 0,
    coveredUntil: 0,
    answer: 0,
    possible: null
  };

  const output = [];
  const push = (phase, message) => {
    state.phase = phase;
    state.message = message;
    output.push(cloneState(state));
  };

  push("INIT", `网格规模为 ${n} 行 ${m} 列，第一行是候选蓄水厂，最后一行是干旱区。`);

  for (let j = 0; j < m; j++) {
    state.l[n - 1][j] = j + 1;
    state.r[n - 1][j] = j + 1;
  }
  push("INIT", "最后一行城市初始化为自身区间：l[N][j] = r[N][j] = j。");

  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];

  function dfs(x, y, sourceCol) {
    state.vis[x][y] = true;
    state.current = [x, y];
    state.source = sourceCol;
    state.edge = null;
    push("DFS", `访问城市 (${x + 1}, ${y + 1})，海拔 ${high[x][y]}。`);

    for (let d = 0; d < 4; d++) {
      const nx = x + dx[d];
      const ny = y + dy[d];
      if (nx < 0 || ny < 0 || nx >= n || ny >= m) continue;
      if (high[nx][ny] >= high[x][y]) continue;

      state.edge = [[x, y], [nx, ny]];
      state.current = [x, y];
      push("DFS", `从 (${x + 1}, ${y + 1}) 可以流向更低的 (${nx + 1}, ${ny + 1})。`);

      if (!state.vis[nx][ny]) {
        dfs(nx, ny, sourceCol);
      }

      const oldL = state.l[x][y];
      const oldR = state.r[x][y];
      state.l[x][y] = Math.min(state.l[x][y], state.l[nx][ny]);
      state.r[x][y] = Math.max(state.r[x][y], state.r[nx][ny]);
      state.current = [x, y];
      state.edge = [[x, y], [nx, ny]];

      if (oldL !== state.l[x][y] || oldR !== state.r[x][y]) {
        const left = state.l[x][y] >= INF ? "-" : state.l[x][y];
        const right = state.r[x][y] <= 0 ? "-" : state.r[x][y];
        push("DP", `回溯更新 (${x + 1}, ${y + 1}) 的覆盖区间为 [${left}, ${right}]。`);
      }
    }
  }

  for (let j = 0; j < m; j++) {
    state.current = [0, j];
    state.source = j;
    state.edge = null;
    if (!state.vis[0][j]) {
      push("DFS", `从第一行第 ${j + 1} 列启动 DFS。`);
      dfs(0, j, j);
    } else {
      push("DFS", `第一行第 ${j + 1} 列已被前面的水流覆盖，复用已有区间状态。`);
    }
  }

  state.current = null;
  state.edge = null;
  state.source = -1;
  state.inaccessible = [];
  for (let j = 0; j < m; j++) {
    if (!state.vis[n - 1][j]) {
      state.inaccessible.push([n - 1, j]);
    }
  }

  if (state.inaccessible.length > 0) {
    state.possible = false;
    state.answer = state.inaccessible.length;
    push("CHECK", `存在 ${state.inaccessible.length} 个干旱区城市无法被水流到达。`);
    push("RESULT", `无可行全覆盖方案，输出 0，并列出未通水城市坐标。`);
    return output;
  }

  state.possible = true;
  push("CHECK", "最后一行全部可达，进入区间覆盖贪心阶段。");

  let left = 1;
  let answer = 0;
  while (left <= m) {
    let right = 0;
    let best = -1;
    state.greedyLeft = left;
    state.greedyRight = right;
    state.candidate = -1;
    push("GREEDY", `当前需要覆盖的最左列是 ${left}，开始寻找能衔接并延伸最远的水源。`);

    for (let i = 0; i < m; i++) {
      state.candidate = i;
      state.greedyRight = right;
      const canCover = state.l[0][i] <= left;
      if (canCover && state.r[0][i] > right) {
        right = state.r[0][i];
        best = i;
        state.greedyRight = right;
        push("GREEDY", `候选水源 (1, ${i + 1}) 覆盖 [${state.l[0][i]}, ${state.r[0][i]}]，暂时最优。`);
      } else {
        const interval = state.l[0][i] >= INF ? "无有效区间" : `[${state.l[0][i]}, ${state.r[0][i]}]`;
        push("GREEDY", `检查水源 (1, ${i + 1})：${interval}。`);
      }
    }

    if (best < 0) {
      state.possible = false;
      push("RESULT", "贪心阶段无法继续覆盖，输入不满足全覆盖条件。");
      return output;
    }

    answer++;
    state.answer = answer;
    state.selectedSources.push(best);
    state.coveredUntil = right;
    state.candidate = best;
    state.greedyRight = right;
    push("GREEDY", `选择蓄水厂 (1, ${best + 1})，已覆盖到最后一行第 ${right} 列。`);
    left = right + 1;
  }

  state.greedyLeft = m + 1;
  state.candidate = -1;
  state.answer = answer;
  push("RESULT", `全覆盖成立，最少需要建设 ${answer} 个蓄水厂。`);

  return output;
}

function colorForHeight(value, min, max) {
  if (max === min) return "#9edb9d";
  const t = (value - min) / (max - min);
  const stops = [
    [0.00, [239, 217, 99]],
    [0.45, [134, 206, 117]],
    [1.00, [92, 176, 213]]
  ];
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const local = (t - a[0]) / (b[0] - a[0] || 1);
  const rgb = a[1].map((start, index) => Math.round(start + (b[1][index] - start) * local));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function isSamePoint(a, b) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

function render() {
  const state = steps[stepIndex];
  if (!state) return;

  const gridWidth = state.m * getCellSize();
  document.documentElement.style.setProperty("--cols", state.m);
  document.documentElement.style.setProperty("--grid-width", `${gridWidth}px`);

  els.stepIndex.textContent = `${stepIndex + 1} / ${steps.length}`;
  els.phaseTitle.textContent = phaseNames[state.phase] || state.phase;
  els.stepMessage.textContent = state.message;
  els.resultText.textContent = resultText(state);

  renderGrid(state);
  renderCoverage(state);
  renderIntervals(state);
  renderChart(state);

  els.prevBtn.disabled = stepIndex <= 0;
  els.nextBtn.disabled = stepIndex >= steps.length - 1;
}

function getCellSize() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--cell").trim();
  return Number.parseInt(raw, 10) || 64;
}

function resultText(state) {
  if (state.possible === false) {
    return `输出：0，未通水城市 ${state.answer} 个`;
  }
  if (state.possible === true && state.phase === "RESULT") {
    const coords = state.selectedSources.map((col) => `(1,${col + 1})`).join("、");
    return `输出：1，最少 ${state.answer} 个蓄水厂：${coords}`;
  }
  return "蓝色表示已被 DFS 到达，左下角显示 DP 覆盖区间";
}

function renderGrid(state) {
  const edgeFrom = state.edge ? state.edge[0] : null;
  const edgeTo = state.edge ? state.edge[1] : null;
  const selected = new Set(state.selectedSources);
  const inaccessible = new Set(state.inaccessible.map(([x, y]) => `${x},${y}`));
  els.grid.innerHTML = "";
  els.grid.style.setProperty("--cols", state.m);

  for (let i = 0; i < state.n; i++) {
    for (let j = 0; j < state.m; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.style.background = colorForHeight(state.high[i][j], state.minHeight, state.maxHeight);
      if (state.vis[i][j]) cell.classList.add("visited");
      if (isSamePoint(state.current, [i, j])) cell.classList.add("current");
      if (isSamePoint(edgeFrom, [i, j])) cell.classList.add("edge-from");
      if (isSamePoint(edgeTo, [i, j])) cell.classList.add("edge-to");
      if (i === 0) cell.classList.add("top-source");
      if (i === 0 && selected.has(j)) cell.classList.add("source-selected");
      if (i === state.n - 1 && j < state.coveredUntil) cell.classList.add("greedy-covered");
      if (inaccessible.has(`${i},${j}`)) cell.classList.add("inaccessible");

      const height = document.createElement("div");
      height.className = "height";
      height.textContent = state.high[i][j];
      cell.appendChild(height);

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = state.l[i][j] >= INF ? "--" : `${state.l[i][j]}-${state.r[i][j]}`;
      cell.appendChild(meta);

      els.grid.appendChild(cell);
    }
  }
}

function renderCoverage(state) {
  const missing = new Set(state.inaccessible.map(([, y]) => y));
  const showingGreedyCoverage = state.possible === true && (state.phase === "GREEDY" || state.phase === "RESULT");
  els.coverageBar.innerHTML = "";
  els.coverageBar.style.setProperty("--cols", state.m);
  for (let j = 0; j < state.m; j++) {
    const slot = document.createElement("div");
    slot.className = "coverage-slot";
    slot.textContent = j + 1;
    if (showingGreedyCoverage) {
      if (j < state.coveredUntil) slot.classList.add("covered");
    } else if (state.vis[state.n - 1][j]) {
      slot.classList.add("covered");
    }
    if (missing.has(j)) slot.classList.add("missing");
    els.coverageBar.appendChild(slot);
  }
}

function renderIntervals(state) {
  const selected = new Set(state.selectedSources);
  els.intervalList.innerHTML = "";
  for (let j = 0; j < state.m; j++) {
    const row = document.createElement("div");
    row.className = "interval-row";
    if (selected.has(j)) row.classList.add("selected");
    if (state.candidate === j) row.classList.add("candidate");

    const name = document.createElement("div");
    name.textContent = `(1,${j + 1})`;
    row.appendChild(name);

    const track = document.createElement("div");
    track.className = "interval-track";
    const fill = document.createElement("div");
    fill.className = "interval-fill";
    if (state.l[0][j] < INF) {
      const start = ((state.l[0][j] - 1) / state.m) * 100;
      const width = ((state.r[0][j] - state.l[0][j] + 1) / state.m) * 100;
      fill.style.marginLeft = `${start}%`;
      fill.style.width = `${width}%`;
    } else {
      fill.style.width = "0";
    }
    track.appendChild(fill);
    row.appendChild(track);

    const range = document.createElement("div");
    range.textContent = state.l[0][j] >= INF ? "无" : `[${state.l[0][j]},${state.r[0][j]}]`;
    row.appendChild(range);

    els.intervalList.appendChild(row);
  }
}

function renderChart(state) {
  const width = 340;
  const rowHeight = 24;
  const topPad = 24;
  const leftPad = 34;
  const rightPad = 18;
  const height = topPad + state.m * rowHeight + 26;
  const usable = width - leftPad - rightPad;
  const selected = new Set(state.selectedSources);
  const scale = (col) => leftPad + ((col - 1) / Math.max(1, state.m - 1)) * usable;

  els.intervalChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.intervalChart.innerHTML = "";

  for (let j = 1; j <= state.m; j++) {
    const x = scale(j);
    const line = svgEl("line", {
      x1: x,
      y1: 12,
      x2: x,
      y2: height - 18,
      stroke: "#e4ebf2",
      "stroke-width": 1
    });
    els.intervalChart.appendChild(line);
    const text = svgEl("text", {
      x,
      y: height - 6,
      "text-anchor": "middle",
      "font-size": 10,
      fill: "#667085"
    });
    text.textContent = j;
    els.intervalChart.appendChild(text);
  }

  for (let i = 0; i < state.m; i++) {
    const y = topPad + i * rowHeight;
    const label = svgEl("text", {
      x: 8,
      y: y + 4,
      "font-size": 11,
      fill: "#344054"
    });
    label.textContent = i + 1;
    els.intervalChart.appendChild(label);

    if (state.l[0][i] >= INF) continue;
    const line = svgEl("line", {
      x1: scale(state.l[0][i]),
      y1: y,
      x2: scale(state.r[0][i]),
      y2: y,
      stroke: selected.has(i) ? "#e77c2f" : (state.candidate === i ? "#1f9d66" : "#1f8fcf"),
      "stroke-width": selected.has(i) || state.candidate === i ? 7 : 5,
      "stroke-linecap": "round"
    });
    els.intervalChart.appendChild(line);

    const leftDot = svgEl("circle", {
      cx: scale(state.l[0][i]),
      cy: y,
      r: 3,
      fill: "#18202a"
    });
    const rightDot = svgEl("circle", {
      cx: scale(state.r[0][i]),
      cy: y,
      r: 3,
      fill: "#18202a"
    });
    els.intervalChart.appendChild(leftDot);
    els.intervalChart.appendChild(rightDot);
  }
}

function svgEl(name, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function loadCurrentInput() {
  stopPlayback();
  try {
    const data = parseInput(els.inputData.value);
    if (data.n * data.m > 900) {
      const ok = window.confirm("网格较大，演示步骤会很多。是否继续生成可视化步骤？");
      if (!ok) return;
    }
    steps = buildSteps(data);
    stepIndex = 0;
    render();
  } catch (error) {
    window.alert(error.message);
  }
}

function setSample(name) {
  els.inputData.value = samples[name];
  loadCurrentInput();
}

function nextStep() {
  if (stepIndex < steps.length - 1) {
    stepIndex++;
    render();
  } else {
    stopPlayback();
  }
}

function prevStep() {
  if (stepIndex > 0) {
    stepIndex--;
    render();
  }
}

function resetSteps() {
  stopPlayback();
  stepIndex = 0;
  render();
}

function togglePlayback() {
  if (playTimer) {
    stopPlayback();
    return;
  }
  els.playBtn.textContent = "暂停";
  els.playBtn.classList.add("is-playing");
  playTimer = window.setInterval(nextStep, Number(els.speedRange.value));
}

function stopPlayback() {
  if (playTimer) {
    window.clearInterval(playTimer);
    playTimer = null;
  }
  els.playBtn.textContent = "播放";
  els.playBtn.classList.remove("is-playing");
}

els.sampleOneBtn.addEventListener("click", () => setSample("one"));
els.sampleTwoBtn.addEventListener("click", () => setSample("two"));
els.blockedBtn.addEventListener("click", () => setSample("blocked"));
els.loadBtn.addEventListener("click", loadCurrentInput);
els.resetBtn.addEventListener("click", resetSteps);
els.prevBtn.addEventListener("click", prevStep);
els.nextBtn.addEventListener("click", nextStep);
els.playBtn.addEventListener("click", togglePlayback);
els.speedRange.addEventListener("input", () => {
  if (playTimer) {
    stopPlayback();
    togglePlayback();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target === els.inputData) return;
  if (event.key === "ArrowRight") nextStep();
  if (event.key === "ArrowLeft") prevStep();
  if (event.key === " ") {
    event.preventDefault();
    togglePlayback();
  }
});

setSample("two");
