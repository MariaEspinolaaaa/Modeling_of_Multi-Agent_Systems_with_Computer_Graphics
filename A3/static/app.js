const glCanvas = document.getElementById("glcanvas");
const info = document.getElementById("info");

let gl, colorProgram, textureProgram, quadTex, quadColor;
let robotTex, dirtTex, chargerTex, lockedTex;
let data = null, nodes = [], agentIds = [], M = 1, N = 1, totalSteps = 0;
let simTime = 0;            // in steps (float)
let stepsPerSecond = 4;
let paused = false;
let lastTime = 0;

const vertexShaderSource = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
uniform vec2 u_translation;
uniform vec2 u_scale;
out vec2 v_uv;
void main() {
  vec2 p = a_position * u_scale + u_translation;
  gl_Position = vec4(p, 0.0, 1.0);
  v_uv = a_uv;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_texture;
out vec4 outColor;
void main() {
  vec4 c = texture(u_texture, v_uv);
  if (c.a < 0.05) discard;
  outColor = c;
}`;

const colorVertex = `#version 300 es
in vec2 a_position;
uniform vec2 u_translation;
uniform vec2 u_scale;
void main() {
  vec2 p = a_position * u_scale + u_translation;
  gl_Position = vec4(p,0.0,1.0);
}`;
const colorFragment = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 outColor;
void main(){ outColor=u_color; }`;

function shader(type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function makeProgram(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p));
  return p;
}

function createTexture(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      resolve(tex);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function makeQuad(program, withUV) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 0,0,  1,-1, 1,0,  -1,1, 0,1,
    -1,1, 0,1,   1,-1, 1,0,   1,1, 1,1
  ]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos,2,gl.FLOAT,false,16,0);
  if (withUV) {
    const uv = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
  }
  return vao;
}

function resize() {
  const dpr = devicePixelRatio || 1;
  glCanvas.width = innerWidth*dpr;
  glCanvas.height = innerHeight*dpr;
  glCanvas.style.width = innerWidth+"px";
  glCanvas.style.height = innerHeight+"px";
  gl.viewport(0,0,glCanvas.width,glCanvas.height);
}

// ----- layout: square cells, row 0 at the bottom -----
function layout() {
  const panel = Math.min(340, innerWidth * 0.35);
  const availW = innerWidth - panel - 40, availH = innerHeight - 40;
  const cell = Math.max(4, Math.min(availW / N, availH / M));
  const x0 = panel + 20 + (availW - cell * N) / 2;
  const y0 = 20 + (availH - cell * M) / 2;
  return { cell, x0, y0 };
}
function cellCenterPx(col, row) {
  const L = layout();
  return [L.x0 + (col + 0.5) * L.cell, L.y0 + (M - row - 0.5) * L.cell];
}
function pxToClip(x, y) {
  return [x / innerWidth * 2 - 1, 1 - y / innerHeight * 2];
}
function halfSizeClip(px) {
  return [px / innerWidth, px / innerHeight];
}

function drawRect(col, row, color, shrink) {
  const L = layout();
  const [cx, cy] = cellCenterPx(col, row);
  const [tx, ty] = pxToClip(cx, cy);
  const [sx, sy] = halfSizeClip(L.cell * shrink);
  gl.useProgram(colorProgram);
  gl.bindVertexArray(quadColor);
  gl.uniform2f(gl.getUniformLocation(colorProgram,"u_translation"),tx,ty);
  gl.uniform2f(gl.getUniformLocation(colorProgram,"u_scale"),sx,sy);
  gl.uniform4fv(gl.getUniformLocation(colorProgram,"u_color"),color);
  gl.drawArrays(gl.TRIANGLES,0,6);
}

function drawSprite(tex, col, row, shrink) {
  const L = layout();
  const [cx, cy] = cellCenterPx(col, row);
  const [tx, ty] = pxToClip(cx, cy);
  const [sx, sy] = halfSizeClip(L.cell * shrink);
  gl.useProgram(textureProgram);
  gl.bindVertexArray(quadTex);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.uniform1i(gl.getUniformLocation(textureProgram,"u_texture"),0);
  gl.uniform2f(gl.getUniformLocation(textureProgram,"u_translation"),tx,ty);
  gl.uniform2f(gl.getUniformLocation(textureProgram,"u_scale"),sx,sy);
  gl.drawArrays(gl.TRIANGLES,0,6);
}

function colRow(node) {
  return [Math.round(node.point[0]), Math.round(node.point[1])];
}

// ----- state at a given step -----
function agentAt(id, t) {
  const route = data.routes[id];
  const k = Math.min(Math.floor(t), route.length - 1);
  const k2 = Math.min(k + 1, route.length - 1);
  const f = Math.min(Math.max(t - k, 0), 1);
  const a = colRow(data.nodes[route[k]]);
  const b = colRow(data.nodes[route[k2]]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, k];
}

function movesUntil(id, k) {
  const route = data.routes[id];
  let moves = 0;
  for (let i = 1; i <= k && i < route.length; i++) if (route[i] !== route[i-1]) moves++;
  return moves;
}

function draw() {
  gl.clearColor(0.07,0.07,0.09,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const step = Math.floor(simTime);
  let cleaned = 0, visited = 0, dirtyTotal = 0, free = 0;

  for (const n of nodes) {
    const [c, r] = colRow(n);
    if (n.locked) {
      drawRect(c, r, [0.12,0.12,0.14,1], 0.48);
      drawSprite(lockedTex, c, r, 0.42);
      continue;
    }
    free++;
    const isVisited = n.firstVisit >= 0 && n.firstVisit <= step;
    if (isVisited) visited++;
    drawRect(c, r, isVisited ? [0.24,0.36,0.46,1] : [0.18,0.19,0.23,1], 0.47);

    if (n.charger) drawSprite(chargerTex, c, r, 0.42);
    if (n.dirt) {
      dirtyTotal++;
      const stillDirty = n.cleanedAt < 0 || n.cleanedAt > step;
      if (stillDirty) drawSprite(dirtTex, c, r, n.charger ? 0.25 : 0.4);
      else cleaned++;
    }
  }

  for (const id of agentIds) {
    const [c, r] = agentAt(id, simTime);
    drawSprite(robotTex, c, r, 0.46);
  }

  updateLabels();
  updateInfo(step, cleaned, dirtyTotal, visited, free);
}

function updateLabels() {
  document.querySelectorAll(".agent-label").forEach(e=>e.remove());
  const L = layout();
  for (const id of agentIds) {
    const [c, r] = agentAt(id, simTime);
    const [x, y] = cellCenterPx(c, r);
    const d = document.createElement("div");
    d.className = "agent-label";
    d.textContent = id;
    d.style.cssText = `position:fixed;left:${x + L.cell*0.25}px;top:${y - L.cell*0.55}px;` +
      `color:#fff;background:#e0525a;border-radius:8px;padding:0 5px;font-size:12px;font-weight:bold;pointer-events:none`;
    document.body.appendChild(d);
  }
}

function updateInfo(step, cleaned, dirtyTotal, visited, free) {
  const R = data.results;
  const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : "0.0");
  const finished = step >= totalSteps;
  let html = `<b>Room cleaning – Simulation ${R.Simulation}</b><br>`;
  html += `Grid ${R.Grid} · ${R.Agents} agent(s) · ${R.Trajectory}<br>`;
  html += `Dirty ${R.DirtyPct}% · Locked ${R.LockedPct}% · Battery ${R.Battery} · Max time ${R.MaxTime}<br>`;
  html += `<hr>Step <b>${step}</b> / ${totalSteps} ${paused ? "(paused)" : ""} · ${stepsPerSecond} steps/s<br>`;
  html += `Cleaned: <b>${cleaned}/${dirtyTotal}</b> (${pct(cleaned, dirtyTotal)}%)<br>`;
  html += `Visited: <b>${visited}/${free}</b> (${pct(visited, free)}%)<br><hr>`;
  for (const id of agentIds) {
    const [, , k] = agentAt(id, simTime);
    const bat = data.battery[id][k];
    const action = data.actions[id][k];
    html += `Agent ${id}: 🔋 ${pct(bat, R.Battery)}% · moves ${movesUntil(id, k)} · ${action}<br>`;
  }
  if (finished) {
    html += `<hr><b>Finished</b><br>`;
    html += R.TimeToClean > 0 ? `Time to clean: <b>${R.TimeToClean}</b> steps<br>`
                              : `Not all dirt was cleaned (max time / battery)<br>`;
    html += `Cleaned ${R.CleanedPct}% · Visited ${R.VisitedPct}%<br>`;
    html += `Moves per agent (mean): ${R.MeanMovesPerAgent} · Recharges: ${R.TotalRecharges}<br>`;
  }
  html += `<hr><small>Space: pause · +/−: speed · ←/→: step · R: restart</small>`;
  info.innerHTML = html;
}

function animate(t) {
  const dt = Math.min((t - lastTime) / 1000, 0.1);
  lastTime = t;
  if (!paused && simTime < totalSteps) simTime = Math.min(totalSteps, simTime + dt * stepsPerSecond);
  draw();
  requestAnimationFrame(animate);
}

addEventListener("keydown", e => {
  if (e.key === " ") { paused = !paused; e.preventDefault(); }
  else if (e.key === "+" || e.key === "=") stepsPerSecond = Math.min(64, stepsPerSecond * 2);
  else if (e.key === "-" || e.key === "_") stepsPerSecond = Math.max(0.5, stepsPerSecond / 2);
  else if (e.key === "ArrowRight") { paused = true; simTime = Math.min(totalSteps, Math.floor(simTime) + 1); }
  else if (e.key === "ArrowLeft") { paused = true; simTime = Math.max(0, Math.ceil(simTime) - 1); }
  else if (e.key === "r" || e.key === "R") { simTime = 0; paused = false; }
});

async function start() {
  gl = glCanvas.getContext("webgl2",{alpha:false});
  if (!gl) { info.textContent = "WebGL2 is not supported by this browser."; return; }

  colorProgram = makeProgram(colorVertex, colorFragment);
  textureProgram = makeProgram(vertexShaderSource, fragmentShaderSource);
  quadColor = makeQuad(colorProgram, false);
  quadTex = makeQuad(textureProgram, true);

  const response = await fetch("/api/data");
  data = await response.json();
  nodes = Object.values(data.nodes);
  agentIds = Object.keys(data.routes);
  N = Math.max(...nodes.map(n => n.point[0])) + 1;
  M = Math.max(...nodes.map(n => n.point[1])) + 1;
  totalSteps = Math.max(...agentIds.map(id => data.routes[id].length - 1));

  [robotTex, dirtTex, chargerTex, lockedTex] = await Promise.all([
    createTexture("/static/images/robot.png"),
    createTexture("/static/images/node_full.png"),
    createTexture("/static/images/node_empty.png"),
    createTexture("/static/images/locked.png"),
  ]);

  resize();
  addEventListener("resize", resize);
  requestAnimationFrame(animate);
}

start().catch(err => { console.error(err); info.textContent = "Error: " + err.message; });
