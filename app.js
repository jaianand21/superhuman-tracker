/* DATE HEADER */

const dateHeader = document.getElementById("dateHeader");

function updateDateHeader() {
  const now = new Date();
  dateHeader.innerText =
    `Today ${now.getDate()} ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
}

updateDateHeader();
setInterval(updateDateHeader, 60000);

/* CALENDAR */

const today = new Date();
const YEAR = today.getFullYear();
const MONTH = today.getMonth();
const DAYS = new Date(YEAR, MONTH + 1, 0).getDate();
const TODAY_DATE = today.getDate();

const table = document.getElementById("monthTable");

let gridData = JSON.parse(localStorage.getItem("gridData")) || {};
let sleepData = JSON.parse(localStorage.getItem("sleepData")) || {};

function save() {
  localStorage.setItem("gridData", JSON.stringify(gridData));
  localStorage.setItem("sleepData", JSON.stringify(sleepData));
}

/* HABIT TABLE – FIXED */

function renderTable() {
  table.innerHTML = "";

  let header = "<tr><th>Habit</th>";
  for (let d = 1; d <= DAYS; d++) header += `<th>${d}</th>`;
  header += "</tr>";
  table.innerHTML += header;

  const keys = Object.keys(gridData);
  keys.forEach(key => buildRow(key));

  const lastKey = keys[keys.length - 1];
  if (!lastKey || gridData[lastKey].name.trim() !== "") {
    const newKey = "h" + Date.now();
    gridData[newKey] = { name: "", days: {} };
    buildRow(newKey);
  }

  updateDashboard();
  updatePowerScore();
}

function buildRow(key) {
  const h = gridData[key];

  let row = `<tr>
    <td class="habit-cell">
      <input
        value="${h.name || ""}"
        onblur="updateHabitName('${key}', this.value)">
    </td>`;

  for (let d = 1; d <= DAYS; d++) {
    const checked = h.days[d] ? "checked" : "";
    const disabled = d < TODAY_DATE ? "disabled" : "";
    row += `<td>
      <input type="checkbox" ${checked} ${disabled}
        onclick="toggleCheck('${key}', ${d})">
    </td>`;
  }

  row += "</tr>";
  table.innerHTML += row;
}

function updateHabitName(key, value) {
  gridData[key].name = value.trim();
  save();
  renderTable();
}

function toggleCheck(key, day) {
  if (day < TODAY_DATE) return;
  gridData[key].days[day] = !gridData[key].days[day];
  save();
  updateDashboard();
  updatePowerScore();
}

/* DASHBOARD */

function updateDashboard() {
  const habits = Object.values(gridData).filter(h => h.name);
  const totalHabits = habits.length;


  let completed = 0;
  habits.forEach(h => completed += Object.values(h.days).filter(Boolean).length);

  const completionRate = totalHabits
    ? Math.round((completed / (totalHabits * DAYS)) * 100)
    : 0;
    const notCompleted = totalHabits * DAYS - completed;



  document.getElementById("totalHabits").innerText = totalHabits;
  document.getElementById("completed").innerText = completed;
  document.getElementById("completionRate").innerText = completionRate + "%";
  document.getElementById("daysLeft").innerText = DAYS - TODAY_DATE;
    document.getElementById("notCompleted").innerText = notCompleted;
}

/* POWER SCORE */

function updatePowerScore() {
  let total = 0;
  Object.values(gridData).forEach(h => {
    total += Object.values(h.days).filter(Boolean).length;
  });
  document.getElementById("powerScore").innerText = total;
}

/* SLEEP */

function logSleep() {
  const hours = Number(sleepHours.value);
  if (!hours) return;
  sleepData[TODAY_DATE] = hours;
  save();
  updateSleepDashboard();
  drawSleepChart();
}

function updateSleepDashboard() {
  const values = Object.values(sleepData);
  const avg = values.length ? (values.reduce((a,b)=>a+b,0) / values.length).toFixed(1) : 0;
  const last = sleepData[TODAY_DATE] || 0;
  const consistency = values.length ? Math.round((values.filter(v=>v>=7).length / values.length)*100) : 0;

  document.getElementById("sleepAvg").innerText = avg + "h";
  document.getElementById("sleepLast").innerText = last + "h";
  document.getElementById("sleepConsistency").innerText = consistency + "%";
}

function drawSleepChart() {
  const labels = Array.from({ length: DAYS }, (_, i) => i + 1);
  const values = labels.map(d => sleepData[d] || 0);

  if (window.sleepChartObj) window.sleepChartObj.destroy();

  window.sleepChartObj = new Chart(sleepChart, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.3)",
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 12 } }
    }
  });
}

/* INIT */

renderTable();
drawSleepChart();
updateSleepDashboard();
updateDashboard();
updatePowerScore();