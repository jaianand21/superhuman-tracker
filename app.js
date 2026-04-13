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
   TODAY'S FOCUS & STREAK
================================ */

function calculateStreak() {
  const habits = Object.values(gridData).filter(h => h.name.trim() !== "");
  const streakEl = document.getElementById("streakCounter");
  if (!streakEl) return;
  if (habits.length === 0) {
    streakEl.innerText = "🔥 0 Day Streak";
    return;
  }

  let streak = 0;
  for (let d = TODAY_DATE; d >= 1; d--) {
    let allDoneForDay = true;
    for (let h of habits) {
      if (!h.days[d]) {
        allDoneForDay = false;
        break;
      }
    }
    
    if (allDoneForDay) {
      streak++;
    } else {
      if (d === TODAY_DATE) {
        continue;
      } else {
        break;
      }
    }
  }

  streakEl.innerText = `🔥 ${streak} Day Streak`;
}

function renderTodayFocus() {
  const container = document.getElementById("todayHabitsList");
  if (!container) return;
  container.innerHTML = "";
  
  const habits = Object.values(gridData).filter(h => h.name.trim() !== "");
  
  if (habits.length === 0) {
    container.innerHTML = "<p style='color: #94a3b8; font-size: 14px;'>Add a habit below to get started.</p>";
    checkDailyCompletion();
    return;
  }

  const keys = Object.keys(gridData).filter(key => gridData[key].name.trim() !== "");

  keys.forEach(key => {
    const h = gridData[key];
    const isChecked = h.days[TODAY_DATE] ? "checked" : "";
    const completedClass = isChecked ? "completed" : "";

    const div = document.createElement("div");
    div.className = `today-habit-item ${completedClass}`;
    div.innerHTML = `
      <span class="today-habit-name">${h.name}</span>
      <input type="checkbox" class="today-habit-checkbox" ${isChecked} 
             onclick="toggleTodayCheck('${key}')">
    `;
    container.appendChild(div);
  });

  checkDailyCompletion();
}

function toggleTodayCheck(key) {
  gridData[key].days[TODAY_DATE] = !gridData[key].days[TODAY_DATE];
  save();
  
  renderTable(); 
  renderTodayFocus();
  updateDashboard();
  updatePowerScore();
  calculateStreak();
}

function checkDailyCompletion() {
  const habits = Object.values(gridData).filter(h => h.name.trim() !== "");
  const motivation = document.getElementById("dailyMotivation");
  if (!motivation) return;
  
  if (habits.length === 0) {
    motivation.innerText = "No habits. Let's add some!";
    return;
  }

  let completed = 0;
  habits.forEach(h => {
    if (h.days[TODAY_DATE]) completed++;
  });

  if (completed === 0) {
    motivation.innerText = "Ready to crush today?";
  } else if (completed < habits.length) {
    motivation.innerText = "Keep going! You're doing great.";
  } else {
    motivation.innerText = "Incredible! You finished all your habits today!";
    
    if (!window.hasFiredConfettiForToday) {
      fireConfetti();
      window.hasFiredConfettiForToday = true;
    }
  }
}

function fireConfetti() {
  if (typeof confetti !== "undefined") {
    var count = 200;
    var defaults = { origin: { y: 0.7 } };
    function fire(particleRatio, opts) {
      confetti(Object.assign({}, defaults, opts, {
        particleCount: Math.floor(count * particleRatio)
      }));
    }
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }
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
    const disabled = !h.name ? "disabled" : "";
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
  renderTodayFocus();
  calculateStreak();
}

function toggleCheck(key,day) {
  gridData[key].days[day] = !gridData[key].days[day];
  save();
  if (day === TODAY_DATE) {
    renderTodayFocus();
  }
  updateDashboard();
  updatePowerScore();
  calculateStreak();
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
renderTodayFocus();
calculateStreak();
updateDashboard();
updatePowerScore();
drawSleepChart();
updateSleepDashboard();

/* ===============================
   ENABLE SAVING AFTER INIT
================================ */
isInitializing = false;
