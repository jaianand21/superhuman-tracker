/* ===============================
   GLOBAL INIT LOCK
================================ */
let isInitializing = true;

/* ===============================
   DATE HEADER
================================ */
const dateHeader = document.getElementById("dateHeader");

function updateDateHeader() {
  const now = new Date();
  dateHeader.innerText =
    `Today ${now.getDate()} ${now.toLocaleString("default",{month:"long"})} ${now.getFullYear()}`;
}
updateDateHeader();
setInterval(updateDateHeader, 60000);

/* ===============================
   CALENDAR
================================ */
const today = new Date();
const YEAR = today.getFullYear();
const MONTH = today.getMonth();
const DAYS = new Date(YEAR, MONTH + 1, 0).getDate();
const TODAY_DATE = today.getDate();

/* ===============================
   STATE (LOCAL STORAGE)
================================ */
let gridData  = JSON.parse(localStorage.getItem("gridData"))  || {};
let sleepData = JSON.parse(localStorage.getItem("sleepData")) || {};

/* ===============================
   SAVE (ONE ONLY)
================================ */
function save() {
  if (isInitializing) return;

  localStorage.setItem("gridData", JSON.stringify(gridData));
  localStorage.setItem("sleepData", JSON.stringify(sleepData));
}

/* ===============================
   RESET MONTH (MANUAL)
================================ */

function resetMonth() {
  const ok = confirm(
    "This will reset all habit checkboxes and sleep data for the new month.\nHabit names will remain.\nContinue?"
  );
  if (!ok) return;

  // 1. RESET ONLY CHECKBOXES (NOT HABIT NAMES)
  Object.keys(gridData).forEach(key => {
    gridData[key].days = {};
  });

  // 2. RESET SLEEP DATA
  sleepData = {};

  // 3. SAVE CLEAN STATE
  localStorage.setItem("gridData", JSON.stringify(gridData));
  localStorage.setItem("sleepData", JSON.stringify({}));

  // 4. DESTROY SLEEP CHART
  if (window.sleepChartObj) {
    window.sleepChartObj.destroy();
    window.sleepChartObj = null;
  }

  // 5. REBUILD UI
  renderTable();
  updateDashboard();
  updatePowerScore();

  updateSleepDashboard();
  drawSleepChart();

  alert("New month started. Habits kept, progress reset.");
}



/* ===============================
   HABIT TABLE
================================ */
const table = document.getElementById("monthTable");

function renderTable() {
  table.innerHTML = "";

  let header = "<tr><th>Habit</th>";
  for (let d = 1; d <= DAYS; d++) header += `<th>${d}</th>`;
  header += "</tr>";
  table.innerHTML += header;

  Object.keys(gridData).forEach(key => buildRow(key));

  const keys = Object.keys(gridData);
  const lastKey = keys[keys.length - 1];

  if (!lastKey || gridData[lastKey].name.trim() !== "") {
    const id = "h" + Date.now();
    gridData[id] = { name: "", days: {} };
    buildRow(id);
  }
}

function buildRow(key) {
  const h = gridData[key];

  let row = `<tr>
    <td class="habit-cell">
      <input value="${h.name || ""}"
        onblur="updateHabitName('${key}',this.value)">
    </td>`;

  for (let d = 1; d <= DAYS; d++) {
    const checked = h.days[d] ? "checked" : "";
    const disabled = !h.name || d < TODAY_DATE ? "disabled" : "";
    row += `<td>
      <input type="checkbox" ${checked} ${disabled}
        onclick="toggleCheck('${key}',${d})">
    </td>`;
  }

  row += "</tr>";
  table.innerHTML += row;
}

function updateHabitName(key,value) {
  gridData[key].name = value.trim();
  save();
  renderTable();
}

function toggleCheck(key,day) {
  if (day < TODAY_DATE) return;
  gridData[key].days[day] = !gridData[key].days[day];
  save();
  updateDashboard();
  updatePowerScore();
}

/* ===============================
   DASHBOARD
================================ */
function updateDashboard() {
  const habits = Object.values(gridData).filter(h => h.name);
  let completed = 0;
  let notCompleted = 0;

  habits.forEach(h => {
    for (let d = 1; d <= TODAY_DATE; d++) {
      h.days[d] ? completed++ : notCompleted++;
    }
  });

  const total = habits.length * TODAY_DATE;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById("totalHabits").innerText = habits.length;
  document.getElementById("completed").innerText = completed;
  document.getElementById("notCompleted").innerText = notCompleted;
  document.getElementById("completionRate").innerText = pct + "%";
}

/* ===============================
   POWER SCORE
================================ */
function updatePowerScore() {
  let score = 0;
  Object.values(gridData).forEach(h => {
    score += Object.values(h.days).filter(Boolean).length;
  });
  document.getElementById("powerScore").innerText = score;
}

/* ===============================
   SLEEP TRACKER
================================ */
const sleepChartCanvas = document.getElementById("sleepChart");

function logSleep() {
  const input = document.getElementById("sleepHours");
  const hours = parseFloat(input.value);
  if (isNaN(hours) || hours <= 0 || hours > 24) return;

  sleepData[TODAY_DATE] = hours;
  save();

  input.value = "";
  updateSleepDashboard();
  drawSleepChart();
}

function updateSleepDashboard() {
  const values = Object.values(sleepData);
  const avg = values.length
    ? (values.reduce((a,b)=>a+b,0) / values.length).toFixed(1)
    : 0;
  const last = sleepData[TODAY_DATE] || 0;
  const consistency = values.length
    ? Math.round((values.filter(v => v >= 7).length / values.length) * 100)
    : 0;

  document.getElementById("sleepAvg").innerText = avg + "h";
  document.getElementById("sleepLast").innerText = last + "h";
  document.getElementById("sleepConsistency").innerText = consistency + "%";
}

function drawSleepChart() {
  const labels = Array.from({length:DAYS},(_,i)=>i+1);
  const values = labels.map(d => sleepData[d] || 0);

  if (window.sleepChartObj) window.sleepChartObj.destroy();

  window.sleepChartObj = new Chart(sleepChartCanvas,{
    type:"line",
    data:{
      labels,
      datasets:[{
        data:values,
        borderColor:"#38bdf8",
        backgroundColor:"rgba(56,189,248,.3)",
        fill:true,
        tension:.25
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,suggestedMax:10}}
    }
  });
}

/* ===============================
   INIT (READ ONLY)
================================ */
renderTable();
updateDashboard();
updatePowerScore();
drawSleepChart();
updateSleepDashboard();

/* ===============================
   ENABLE SAVING AFTER INIT
================================ */
isInitializing = false;
