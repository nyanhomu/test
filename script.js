// ===================================
// 要素取得
// ===================================
const timeDisplay = document.getElementById("timer");
const toggleBtn = document.getElementById("toggleButton");
const finishBtn = document.getElementById("finishButton");
const gaugeBar = document.getElementById("gauge"); 
const levelValueDisplay = document.getElementById("level-value");
const slimeImg = document.getElementById("slime");

let elapsedTime = 0;
let timerInterval = null;
let isRunning = false;

let level = 1;
let gaugeLevel = 0;
let totalTime = 0;
let radarChart = null;
let barChart = null;
let currentViewDate = new Date(); 

// ===================================
// データ管理 (LocalStorage)
// ===================================
function saveUserData() {
    localStorage.setItem("study_level", level);
    localStorage.setItem("study_gauge", gaugeLevel);
    localStorage.setItem("study_totalTime", totalTime);
}

function loadDailyLog() {
    const log = localStorage.getItem("dailyStudyLog");
    return log ? JSON.parse(log) : {};
}

// ===================================
// 画面読み込み時
// ===================================
window.addEventListener("load", () => {
    level = Number(localStorage.getItem("study_level")) || 1;
    gaugeLevel = Number(localStorage.getItem("study_gauge")) || 0;
    totalTime = Number(localStorage.getItem("study_totalTime")) || 0;

    if (levelValueDisplay) levelValueDisplay.textContent = level;
    
    updateGaugeDisplay();
    updateSlimeImage();
    drawRadarChart();
});

function updateGaugeDisplay() {
    const reqExp = 100 + (level - 1) * 50;
    if (gaugeBar) gaugeBar.style.height = (gaugeLevel / reqExp * 100) + "%";

    const hours = Math.floor(totalTime / 3600000);
    const minutes = Math.floor((totalTime % 3600000) / 60000);
    const gText = document.getElementById("gaugeText");
    if (gText) gText.textContent = `${hours}時間 ${minutes}分`;
}

// ===================================
// タイマー表示更新
// ===================================
function updateDisplay(time) {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const tenth = Math.floor((time % 1000) / 100);

    timeDisplay.textContent = 
        String(minutes).padStart(2, "0") + ":" + 
        String(seconds).padStart(2, "0") + ":" + 
        tenth;
}

// ===================================
// 開始 / 停止ボタン
// ===================================
toggleBtn.addEventListener("click", () => {
    if (isRunning) {
        clearInterval(timerInterval);
        toggleBtn.textContent = "開始";
        toggleBtn.classList.remove("stop");
        document.getElementById("message").textContent = "休憩中...";
        isRunning = false;
    } else {
        isRunning = true;
        const startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(() => {
            elapsedTime = Date.now() - startTime;
            updateDisplay(elapsedTime);
        }, 100);
        toggleBtn.textContent = "停止";
        toggleBtn.classList.add("stop");
        document.getElementById("message").textContent = "成長中...";
    }
});

// ===================================
// 終了ボタン
// ===================================
finishBtn.addEventListener("click", () => {
    if (elapsedTime === 0) return;

    clearInterval(timerInterval);
    isRunning = false;
    toggleBtn.textContent = "開始";
    toggleBtn.classList.remove("stop");
    document.getElementById("message").textContent = "勉強開始！がんばれ自分！";

    const spentTime = elapsedTime;
    elapsedTime = 0;
    updateDisplay(0);

    // 合計時間の更新
    totalTime += spentTime;
    saveToLogs(spentTime);

    // 経験値とレベルアップ
    const earnedExp = spentTime / 1000;
    gaugeLevel += earnedExp;

    const getRequiredExp = (l) => 100 + (l - 1) * 50;

    while (gaugeLevel >= getRequiredExp(level)) {
        gaugeLevel -= getRequiredExp(level);
        level++;
        updateSlimeImage();
        alert(`レベルアップ！ Level ${level} になりました！`);
    }

    if (levelValueDisplay) levelValueDisplay.textContent = level;

    updateGaugeDisplay();
    saveUserData();
    drawRadarChart();
    openChartModal();
});

// ===================================
// レーダーチャート 
// ===================================
function drawRadarChart() {
    const canvas = document.getElementById("subjectRadarChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const log = loadDailyLog();
    const subjects = ["国語", "数学", "英語", "理科", "社会", "その他"];
    
    const subjectTotals = subjects.map(sub => {
        let totalMs = 0;
        Object.keys(log).forEach(date => {
            if (log[date] && log[date][sub]) {
                totalMs += log[date][sub];
            }
        });
        return totalMs / 3600000; // 時間に変換
    });

    // --- 単位を動的に変えるロジック ---
    const maxVal = Math.max(...subjectTotals);
    let dynamicMax = 1; 

    if (maxVal > 100) {
        dynamicMax = Math.ceil(maxVal / 50) * 50; 
    } else if (maxVal > 10) {
        dynamicMax = Math.ceil(maxVal / 10) * 10; 
    } else if (maxVal > 1) {
        dynamicMax = Math.ceil(maxVal);
    }
    // ------------------------------

    if (radarChart) radarChart.destroy();
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: subjects,
            datasets: [{
                label: '累計学習時間 (時間)',
                data: subjectTotals,
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 2,
                pointRadius: 3
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                r: { 
                    beginAtZero: true,
                    suggestedMin: 0,
                    suggestedMax: dynamicMax, 
                    ticks: {
                        stepSize: dynamicMax / 5, 
                        display: true, 
                        backdropColor: 'transparent'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // グラフを大きく見せるためラベルを非表示に
                }
            }
        }
    });
}

// ===================================
// 棒グラフ
// ===================================
function drawChart() {
    const canvas = document.getElementById("studyChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const log = loadDailyLog(); 
    const dates = Object.keys(log).sort().slice(-7); 
    const subjects = ["国語", "数学", "英語", "理科", "社会", "その他"];
    
    const colors = {
        "国語": "#ffadad", "数学": "#9bf6ff", "英語": "#caffbf",
        "理科": "#ffd6a5", "社会": "#bdb2ff", "その他": "#eeeeee"
    };

    const datasets = subjects.map(sub => ({
        label: sub,
        data: dates.map(date => (log[date][sub] || 0) / 3600000),
        backgroundColor: colors[sub]
    }));

    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
        type: "bar",
        data: { labels: dates, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
        }
    });
}

// ===================================
// カレンダー描画
// ===================================
function drawCalendar() {
    const grid = document.getElementById("calendar-grid");
    const title = document.getElementById("calendarMonthTitle");
    if(!grid || !title) return;

    const log = loadDailyLog();
    grid.innerHTML = "";
    
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    title.textContent = `${year}年 ${month + 1}月`;

    ["日", "月", "火", "水", "木", "金", "土"].forEach(w => {
        const div = document.createElement("div");
        div.className = "calendar-weekday";
        div.textContent = w;
        grid.appendChild(div);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement("div"));

    for (let date = 1; date <= lastDate; date++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
        const dayDiv = document.createElement("div");
        dayDiv.className = "calendar-day";
        dayDiv.textContent = date;

        if (dateStr === new Date().toLocaleDateString('sv-SE')) dayDiv.classList.add("today-mark");
        if (log[dateStr]) {
            dayDiv.classList.add("has-study-data");
            const dot = document.createElement("div");
            dot.className = "study-dot";
            dayDiv.appendChild(dot);
        }
        grid.appendChild(dayDiv);
    }
}

document.getElementById("prevMonth").onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); drawCalendar(); };
document.getElementById("nextMonth").onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); drawCalendar(); };

// ===================================
// 履歴表示
// ===================================
function displayHistory() {
    const historyList = document.getElementById("history-list");
    if (!historyList) return;

    const log = loadDailyLog();
    const dates = Object.keys(log).sort().reverse(); 

    historyList.innerHTML = dates.length === 0 ? "<li>まだ記録がありません。</li>" : ""; 

    dates.forEach(date => {
        let dailyTotalMs = 0;
        let details = [];
        for (const [subject, ms] of Object.entries(log[date])) {
            dailyTotalMs += ms;
            details.push(`${subject}: ${Math.floor(ms / 60000)}分`);
        }
        const li = document.createElement("li");
        li.style.borderBottom = "1px solid #eee";
        li.style.padding = "10px 0";
        li.innerHTML = `<strong>${date} — 合計 ${(dailyTotalMs / 3600000).toFixed(1)}時間</strong><br><small>${details.join(" / ")}</small>`;
        historyList.appendChild(li);
    });
}

// ===================================
// モーダル
// ===================================
function openChartModal() {
    const chartModal = document.getElementById("chartModal");
    if (chartModal) {
        chartModal.style.display = "block";
        setTimeout(() => { drawChart(); displayHistory(); drawCalendar(); }, 200);
    }
}

document.getElementById("closeChart").onclick = () => { document.getElementById("chartModal").style.display = "none"; };

function saveToLogs(spentTime) {
    const selectedSubject = document.getElementById("subjectSelect").value;
    const today = new Date().toLocaleDateString('sv-SE'); 
    const log = loadDailyLog();
    if (!log[today]) log[today] = {};
    log[today][selectedSubject] = (log[today][selectedSubject] || 0) + spentTime;
    localStorage.setItem("dailyStudyLog", JSON.stringify(log));
}

function updateSlimeImage() {
    if (!slimeImg) return;
    let src = "images/スライム1.png";
    if (level >= 10) src = "images/スライム3.png";
    else if (level >= 5) src = "images/スライム2.png";
    slimeImg.src = src;
}
