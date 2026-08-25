// ============================================================
// VIEW PAST ATTEMPT (from Profile -> Quiz History -> View Result)
// Triggered by quiz.html?viewAttemptId=<id>
// This is a self-contained, read-only mode: no fullscreen, no
// timer, no tab/back-navigation lockdown — just showing a past
// result using GET /api/quiz-attempts/{attemptId}.
// ============================================================
async function initHistoryResultView(attemptId) {

    document.getElementById("startOverlay").style.display = "none";
    document.getElementById("quizSection").classList.add("d-none");

    const submitBtn = document.getElementById("submitBtn");
    const backToResultBtn = document.getElementById("backToResultBtn");
    const homeBtnInline = document.getElementById("homebtn");
    const topHomeBtn = document.getElementById("topHomeBtn");
    const timerEl = document.getElementById("timer");

    if (timerEl) timerEl.style.display = "none";
    if (submitBtn) submitBtn.style.display = "none";
    wireZoomControls();

    function escapeHTML(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderOptionContent(opt) {
        if (opt && typeof opt === "object") {
            const url = opt.textOrUrl || "";
            const isImage = opt.isImg || opt.img ||
                /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
            if (isImage && url.startsWith("http")) {
                return `<img src="${url}" alt="Option" style="max-height:120px; max-width:100%; border-radius:4px; object-fit:contain;">`;
            }
            return escapeHTML(url);
        }
        if (typeof opt === "string") return escapeHTML(opt);
        return "";
    }

    let attemptData;
    try {
        const res = await authFetch("/api/quiz-attempts/" + attemptId, { method: "GET" });
        if (!res.ok) throw new Error("Failed to load attempt");
        attemptData = await res.json();
    } catch (err) {
        console.error("History result load error:", err);
        alert("Could not load this result.");
        window.location.href = "profile.html";
        return;
    }

    // NOTE: this endpoint doesn't return a max-marks-per-question value,
    // only marksObtained. We approximate the per-question max by dividing
    // totalMarks evenly across totalQuestions (assumes uniform weighting).
    // This is a backend data gap, not something fixable from here.
    const perQuestionMarks =
        attemptData.totalMarks && attemptData.totalQuestions
            ? attemptData.totalMarks / attemptData.totalQuestions
            : null;

    const questions = (attemptData.results || []).map(r => ({
        id: r.questionId,
        question: r.question,
        options: r.options || [],
        marks: perQuestionMarks ?? (r.marksObtained || 0),
        difficulty: r.difficulty || "N/A",
        type: (r.correctIndexes && r.correctIndexes.length > 1) ? "MULTI" : "SINGLE",
        explanation: r.explanation,
        image: r.imageQuestion ? r.imageUrl : (r.image || r.questionImage || null)
    }));

    const userAnswers = {};
    questions.forEach(q => {
        const r = attemptData.results.find(res => res.questionId === q.id);
        userAnswers[q.id] = (r && r.selectedIndexes) || [];
    });

    let currentQuestion = 0;
    const finalResult = attemptData;

    // Best-effort fetch of quiz title/description for the info bar.
    try {
        const quizRes = await fetch(CONFIG.BASE_URL + "/api/public/quiz/" + attemptData.quizId);
        if (quizRes.ok) {
            const quizInfo = await quizRes.json();
            document.getElementById("quizTitleText").innerText = quizInfo.title || "Quiz Result";
            document.getElementById("quizDescriptionText").innerText = quizInfo.description || "";
        } else {
            document.getElementById("quizTitleText").innerText = "Quiz Result";
        }
    } catch (e) {
        document.getElementById("quizTitleText").innerText = "Quiz Result";
    }

    if (topHomeBtn) topHomeBtn.style.display = "inline-block";

    function showResult(data) {
        document.getElementById("resultTotal").innerText = data.totalQuestions || questions.length;
        document.getElementById("resultAttempted").innerText = data.attemptedQuestions;
        document.getElementById("resultCorrect").innerText = data.correctAnswers;
        document.getElementById("resultWrong").innerText = data.wrongAnswers;
        document.getElementById("resultScore").innerText = (data.percentage || 0).toFixed(2) + "%";
        document.getElementById("resultStatus").innerHTML =
            data.status === "PASS"
                ? "<b class='text-success'>PASS ✅</b>"
                : "<b class='text-danger'>FAIL ❌</b>";
        renderQuestionWiseResult(data);
    }

    function renderQuestionWiseResult(data) {
        const container = document.getElementById("questionWiseResult");
        container.innerHTML = "<h5 class='mb-3'>Question Wise Result</h5>";

        questions.forEach((question, index) => {
            const res = data.results.find(r => r.questionId === question.id);
            if (!res) return;

            const correctIndexes = (res.correctIndexes || []).map(Number);
            const selectedIndexes = (res.selectedIndexes || []).map(Number);

            let optionsHTML = "";
            question.options.forEach((opt, idx) => {
                let cls = "option-box disabled";
                let icon = "";

                const isCorrect = correctIndexes.includes(idx);
                const isSelected = selectedIndexes.includes(idx);

                if (isSelected && !isCorrect) { cls += " wrong"; icon = "❌"; }
                if (isCorrect) { cls += " correct"; icon = "✔"; }

                optionsHTML += `
<div class="${cls}">
    <span class="option-content">${renderOptionContent(opt)}</span>
    ${icon ? `<span class="icon">${icon}</span>` : ""}
</div>`;
            });

            const qImgHTML = question.image
                ? `<img src="${question.image}" class="question-image" alt="Question Image">`
                : "";

            container.innerHTML += `
<div class="mb-4">
    <div class="fw-bold mb-2">
        Q${index + 1}. ${escapeHTML(question.question)}
        <span class="float-end">
            ${res.correct
                    ? "<span class='text-success'>✔ Correct</span>"
                    : "<span class='text-danger'>❌ Wrong</span>"}
            (${res.marksObtained}${perQuestionMarks ? "/" + perQuestionMarks : ""})
        </span>
    </div>
    ${qImgHTML}
    ${optionsHTML}
    ${question.explanation
                    ? `<div class="mt-2 p-2 bg-light border rounded"><b>Explanation:</b> ${escapeHTML(question.explanation)}</div>`
                    : ""}
</div>`;
        });
    }

    function buildSidebar() {
        const sidebar = document.getElementById("questionSidebar");
        sidebar.innerHTML = "";
        let attemptedCount = 0;

        questions.forEach((q, i) => {
            const isAnswered = userAnswers[q.id]?.length > 0;
            if (isAnswered) attemptedCount++;

            let cls = "palette-btn";
            if (i === currentQuestion) cls += " current";
            else if (isAnswered) cls += " answered";

            const btn = document.createElement("button");
            btn.className = cls;
            btn.textContent = String(i + 1).padStart(2, "0");
            btn.addEventListener("click", () => {
                currentQuestion = i;
                loadQuestion();
            });
            sidebar.appendChild(btn);
        });

        document.getElementById("attemptedCount").innerText = attemptedCount;
        document.getElementById("notAttemptedCount").innerText = questions.length - attemptedCount;
    }

    function loadQuestion() {
        const q = questions[currentQuestion];
        if (!q) return;

        document.getElementById("progressCounter").innerText =
            `${currentQuestion + 1} / ${questions.length}`;
        document.getElementById("questionCount").innerText =
            `Question ${currentQuestion + 1} of ${questions.length}`;

        document.getElementById("questionText").innerText = q.question;
        document.getElementById("questionMarks").innerText = `Marks: ${q.marks}`;
        document.getElementById("questionDifficulty").innerText = q.difficulty || "N/A";

        const qImg = document.getElementById("questionImage");
        if (q.image) {
            qImg.src = q.image;
            qImg.style.display = "block";
        } else {
            qImg.style.display = "none";
            qImg.src = "";
        }

        const optionsDiv = document.getElementById("optionsContainer");
        optionsDiv.innerHTML = "";

        const inputType = q.type === "SINGLE" ? "radio" : "checkbox";
        const saved = userAnswers[q.id] || [];
        const reviewResult = finalResult.results.find(r => r.questionId === q.id);

        q.options.forEach((opt, idx) => {
            let cls = "option-box disabled";
            const isChecked = saved.includes(idx);
            let iconHTML = "";

            if (reviewResult) {
                if (reviewResult.correctIndexes.includes(idx)) {
                    cls += " correct";
                    iconHTML = `<span class="icon text-success">✔</span>`;
                }
                if (reviewResult.selectedIndexes.includes(idx) && !reviewResult.correctIndexes.includes(idx)) {
                    cls += " wrong";
                    iconHTML = `<span class="icon text-danger">❌</span>`;
                }
            }

            const checkedAttr = isChecked ? "checked" : "";

            optionsDiv.innerHTML += `
<label class="${cls}">
    <input type="${inputType}" name="option_${q.id}" value="${idx}" ${checkedAttr} disabled>
    <span class="option-content">${renderOptionContent(opt)}</span>
    ${iconHTML}
</label>`;
        });

        buildSidebar();

        const explanationDiv = document.getElementById("reviewExplanation");
        if (q.explanation) {
            explanationDiv.innerHTML = `<b>Explanation:</b><br>${escapeHTML(q.explanation)}`;
            explanationDiv.style.display = "block";
        } else {
            explanationDiv.style.display = "none";
        }
    }

    document.getElementById("nextBtn").onclick = () => {
        if (currentQuestion < questions.length - 1) {
            currentQuestion++;
            loadQuestion();
        }
    };

    document.getElementById("prevBtn").onclick = () => {
        if (currentQuestion > 0) {
            currentQuestion--;
            loadQuestion();
        }
    };

    window.reviewQuiz = function () {
        currentQuestion = 0;
        document.getElementById("resultSection").classList.add("d-none");
        document.getElementById("quizSection").classList.remove("d-none");
        if (topHomeBtn) topHomeBtn.style.display = "none";
        if (backToResultBtn) backToResultBtn.style.display = "inline-block";
        if (homeBtnInline) homeBtnInline.style.display = "inline-block";
        loadQuestion();
    };

    if (backToResultBtn) {
        backToResultBtn.onclick = function () {
            document.getElementById("quizSection").classList.add("d-none");
            document.getElementById("resultSection").classList.remove("d-none");
            if (topHomeBtn) topHomeBtn.style.display = "inline-block";
            backToResultBtn.style.display = "none";
            showResult(finalResult);
        };
    }

    document.getElementById("resultSection").classList.remove("d-none");
    showResult(finalResult);
}

const rawData = sessionStorage.getItem("quizData");
let quizResponse = rawData ? JSON.parse(rawData) : null;
if (quizResponse && quizResponse.data) quizResponse = quizResponse.data;

let allowBackNavigation = false;
let allowFullscreenExit = false;

/* ===================== ZOOM CONTROLS ===================== */
let quizZoomLevel = parseFloat(sessionStorage.getItem("quizZoomLevel")) || 1;
const ZOOM_MIN = 0.7, ZOOM_MAX = 1.6, ZOOM_STEP = 0.1;

function applyZoom() {
    document.documentElement.style.setProperty("--quiz-zoom", quizZoomLevel);
    const resetBtn = document.getElementById("zoomResetBtn");
    if (resetBtn) resetBtn.innerText = Math.round(quizZoomLevel * 100) + "%";
    sessionStorage.setItem("quizZoomLevel", quizZoomLevel);
}

function wireZoomControls() {
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const zoomResetBtn = document.getElementById("zoomResetBtn");

    if (zoomInBtn) {
        zoomInBtn.onclick = () => {
            quizZoomLevel = Math.min(ZOOM_MAX, +(quizZoomLevel + ZOOM_STEP).toFixed(2));
            applyZoom();
        };
    }
    if (zoomOutBtn) {
        zoomOutBtn.onclick = () => {
            quizZoomLevel = Math.max(ZOOM_MIN, +(quizZoomLevel - ZOOM_STEP).toFixed(2));
            applyZoom();
        };
    }
    if (zoomResetBtn) {
        zoomResetBtn.onclick = () => {
            quizZoomLevel = 1;
            applyZoom();
        };
    }

    applyZoom();
}

function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

document.addEventListener("DOMContentLoaded", function () {

    // If we're viewing a past attempt from Profile history, skip the
    // whole live-quiz-taking flow entirely.
    const urlParams = new URLSearchParams(window.location.search);
    const viewAttemptId = urlParams.get("viewAttemptId");
    if (viewAttemptId) {
        initHistoryResultView(Number(viewAttemptId));
        return;
    }

    const storedQuiz = sessionStorage.getItem("quizData");

    if (!storedQuiz) {
        alert("Quiz data not found");
        window.location.href = "index.html";
        return;
    }

    let quizResponse = JSON.parse(storedQuiz);
    if (quizResponse.data) quizResponse = quizResponse.data;

    const questions = shuffleArray(quizResponse.questions || []);
    const QUIZ_TYPE = quizResponse.type;
    const attemptId = Number(sessionStorage.getItem("attemptId"));
    const resultCacheKey = `quizResult_${attemptId}`;

    /* ===================== DOM ===================== */
    const submitBtn = document.getElementById("submitBtn");
    const backToResultBtn = document.getElementById("backToResultBtn");
    const timerEl = document.getElementById("timer");
    const topHomeBtn = document.getElementById("topHomeBtn");

    /* ===================== STATE ===================== */
    let currentQuestion = 0;
    let userAnswers = {};
    let quizSubmitted = false;
    let quizStartTime = new Date();
    let finalResult = null;
    let reviewMode = false;
    let violationCount = 0;
    const MAX_VIOLATIONS = 2;

    /* ===================== TIMER ===================== */
    let timeLeft = quizResponse.timeLimit * 60;
    let timerInterval;

    function startTimer() {
        if (!quizResponse.timeLimit) return;
        timerInterval = setInterval(() => {
            const min = Math.floor(timeLeft / 60);
            const sec = timeLeft % 60;
            timerEl.innerText = `⏱ ${min}:${sec.toString().padStart(2, "0")}`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                if (!quizSubmitted) submitQuiz();
                return;
            }
            timeLeft--;
        }, 1000);
    }

    /* ===================== FULLSCREEN ===================== */
    async function enterFullscreen() {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (err) {
            console.log("Fullscreen failed:", err);
        }
    }

    function exitFullscreen() {
        if (document.fullscreenElement) document.exitFullscreen();
    }

    /* ===================== QUIZ INFO ===================== */
    function loadQuizInfo() {
        document.getElementById("quizTitleText").innerText = quizResponse.title || "Quiz";
        document.getElementById("quizDescriptionText").innerText = quizResponse.description || "";
    }

    /* ===================== SECURITY ===================== */
    function handleViolation(reason) {
        if (quizSubmitted || reviewMode) return;
        violationCount++;
        alert(`${reason}\n\nWarning ${violationCount}/${MAX_VIOLATIONS}`);
        if (violationCount >= MAX_VIOLATIONS) {
            alert("Quiz auto submitted due to security violations.");
            submitQuiz();
        }
    }

    document.addEventListener("visibilitychange", () => {
        if (allowBackNavigation) return;
        if (document.hidden) handleViolation("Tab switching is not allowed during quiz.");
    });

    document.addEventListener("fullscreenchange", () => {
        if (allowFullscreenExit) return;
        if (!document.fullscreenElement && !quizSubmitted && !reviewMode) {
            handleViolation("Fullscreen exit detected.");
            enterFullscreen();
        }
    });

    document.addEventListener("contextmenu", e => e.preventDefault());
    document.addEventListener("copy", e => e.preventDefault());

    // document.addEventListener("keydown", e => {
    //     if (e.key === "F12") e.preventDefault();
    //     if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") e.preventDefault();
    //     if (e.ctrlKey && e.key.toLowerCase() === "u") e.preventDefault();
    //     if (e.ctrlKey && e.key.toLowerCase() === "c") e.preventDefault();
    // });

    history.pushState(null, null, location.href);
    window.onpopstate = function () {
        if (allowBackNavigation) return;
        history.go(1);
        handleViolation("Back navigation is disabled during quiz.");
    };

    /* ===================== HELPERS ===================== */
    function escapeHTML(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Render option content — new format: { img: bool, textOrUrl: string }
    // Or old format: plain string
    function renderOptionContent(opt) {
        // New format — object with img flag
        if (opt && typeof opt === "object") {
            const url = opt.textOrUrl || "";
            const isImage = opt.isImg || opt.img ||
                /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
            if (isImage && url.startsWith("http")) {
                return `<img src="${url}" alt="Option" style="max-height:120px; max-width:100%; border-radius:4px; object-fit:contain;">`;
            }
            return escapeHTML(url);
        }
        // Old format — plain string
        if (typeof opt === "string") {
            return escapeHTML(opt);
        }
        return "";
    }

    // Option value (used for saving the index) — stays the same
    function getOptionValue(opt, idx) {
        return idx;
    }

    /* ===================== LOAD QUESTION ===================== */
    function loadQuestion() {
        const q = questions[currentQuestion];
        if (!q) return;

        // Progress counter
        document.getElementById("progressCounter").innerText =
            `${currentQuestion + 1} / ${questions.length}`;
        document.getElementById("questionCount").innerText =
            `Question ${currentQuestion + 1} of ${questions.length}`;

        document.getElementById("questionText").innerText = q.question;
        document.getElementById("questionMarks").innerText = `Marks: ${q.marks}`;
        document.getElementById("questionDifficulty").innerText = q.difficulty || "N/A";

        // Question image support
        const qImg = document.getElementById("questionImage");
        if (q.image || q.imageUrl || q.questionImage) {
            qImg.src = q.image || q.imageUrl || q.questionImage;
            qImg.style.display = "block";
        } else {
            qImg.style.display = "none";
            qImg.src = "";
        }

        const optionsDiv = document.getElementById("optionsContainer");
        optionsDiv.innerHTML = "";

        const inputType = q.type === "SINGLE" ? "radio" : "checkbox";
        const saved = userAnswers[q.id] || [];

        let reviewResult = null;
        if (reviewMode && finalResult) {
            reviewResult = finalResult.results.find(r => r.questionId === q.id);
        }

        q.options.forEach((opt, idx) => {
            let cls = "option-box";
            const isChecked = saved.includes(idx);
            let iconHTML = "";

            // Non-review: selected highlight
            if (!reviewResult && isChecked) {
                cls += " selected";
            }

            if (reviewResult) {
                cls += " disabled";
                if (reviewResult.correctIndexes.includes(idx)) {
                    cls += " correct";
                    iconHTML = `<span class="icon text-success">✔</span>`;
                }
                if (reviewResult.selectedIndexes.includes(idx) && !reviewResult.correctIndexes.includes(idx)) {
                    cls += " wrong";
                    iconHTML = `<span class="icon text-danger">❌</span>`;
                }
            }

            const checkedAttr = isChecked ? "checked" : "";

            optionsDiv.innerHTML += `
<label class="${cls}">
    <input type="${inputType}"
           name="option_${q.id}"
           value="${idx}"
           ${checkedAttr}>
    <span class="option-content">${renderOptionContent(opt)}</span>
    ${iconHTML}
</label>`;
        });

        // Attach option click listeners (event listeners, not inline onclick)
        optionsDiv.querySelectorAll(".option-box").forEach(label => {
            if (!reviewMode) {
                label.addEventListener("click", function (e) {
                    handleOptionClick(this, inputType, q.id);
                });
            }
        });

        buildSidebar();

        // Explanation in review mode
        const explanationDiv = document.getElementById("reviewExplanation");
        if (reviewMode && q.explanation) {
            explanationDiv.innerHTML = `<b>Explanation:</b><br>${escapeHTML(q.explanation)}`;
            explanationDiv.style.display = "block";
        } else {
            explanationDiv.style.display = "none";
        }
    }

    /* ===================== OPTION CLICK HANDLER ===================== */
    function handleOptionClick(labelEl, inputType, questionId) {
        if (reviewMode) return;

        const input = labelEl.querySelector("input");
        const container = document.getElementById("optionsContainer");
        const allLabels = container.querySelectorAll(".option-box");

        if (inputType === "radio") {
            allLabels.forEach(l => {
                l.classList.remove("selected");
                l.querySelector("input").checked = false;
            });
            input.checked = true;
            labelEl.classList.add("selected");
        } else {
            // Checkbox toggle
            input.checked = !input.checked;
            if (input.checked) {
                labelEl.classList.add("selected");
            } else {
                labelEl.classList.remove("selected");
            }
        }

        // Immediately save
        const selected = [];
        container.querySelectorAll(`input[name="option_${questionId}"]:checked`)
            .forEach(opt => selected.push(Number(opt.value)));
        userAnswers[questions[currentQuestion].id] = selected;

        buildSidebar();
    }

    /* ===================== SAVE ANSWER ===================== */
    function saveAnswer() {
        const q = questions[currentQuestion];
        if (!q) return;
        const selected = [];
        document.querySelectorAll(`input[name="option_${q.id}"]:checked`)
            .forEach(opt => selected.push(Number(opt.value)));
        userAnswers[q.id] = selected;
    }

    /* ===================== NAVIGATION ===================== */
    document.getElementById("nextBtn").onclick = () => {
        saveAnswer();
        if (currentQuestion < questions.length - 1) {
            currentQuestion++;
            loadQuestion();
        }
    };

    document.getElementById("prevBtn").onclick = () => {
        saveAnswer();
        if (currentQuestion > 0) {
            currentQuestion--;
            loadQuestion();
        }
    };

    submitBtn.onclick = () => {
        saveAnswer();
        submitQuiz();
    };

    /* ===================== SUBMIT QUIZ ===================== */
    async function submitQuiz() {
        if (quizSubmitted) return;
        quizSubmitted = true;
        submitBtn.disabled = true;

        saveAnswer();


        const answers = [];

        questions.forEach(q => {
            const selected = userAnswers[q.id] || [];
            answers.push({
                questionId: q.id,
                selectedIndexes: selected.map(Number)
            });
        });

        const body = { attemptId, answers };
        console.log("Submitting body:", body);

        try {
            const res = await authFetch("/api/quiz-attempts/submit", {
                method: "POST",
                body: JSON.stringify(body)
            });

            const data = await res.json();
            console.log("Submit Response:", data);

            if (res.ok) {
                finalResult = data;
                sessionStorage.setItem(resultCacheKey, JSON.stringify(data));
                if (data.results && questions.length) {
                    data.results.forEach((resItem) => {
                        const matchedQ = questions.find(q => q.id === resItem.questionId);
                        if (matchedQ && resItem.explanation) {
                            matchedQ.explanation = resItem.explanation;
                        }
                    });
                }

                clearInterval(timerInterval);
                document.getElementById("quizSection").classList.add("d-none");
                document.getElementById("resultSection").classList.remove("d-none");
                if (topHomeBtn) topHomeBtn.style.display = "inline-block";

            
                if (quizResponse.showResult === false) {
                    document.getElementById("resultSection").innerHTML =
                        `<div class="text-center p-5">
                <h4>Quiz Submitted Successfully ✅</h4>
                <p class="text-muted">Result will be declared later by the admin.</p>
            </div>`;
                } else {
                    showResult(finalResult);
                }

                exitFullscreen();
            } else {
                alert(data.message || "Submit failed ❌");
            }

        } catch (err) {
            console.error("Submit Error:", err);
        }
    }

    /* ===================== RESULT ===================== */
    function showResult(data) {
        document.getElementById("resultTotal").innerText = data.totalQuestions || questions.length;
        document.getElementById("resultAttempted").innerText = data.attemptedQuestions;
        document.getElementById("resultCorrect").innerText = data.correctAnswers;
        document.getElementById("resultWrong").innerText = data.wrongAnswers;
        document.getElementById("resultScore").innerText = (data.percentage || 0).toFixed(2) + "%";
        document.getElementById("resultStatus").innerHTML =
            data.status === "PASS"
                ? "<b class='text-success'>PASS ✅</b>"
                : "<b class='text-danger'>FAIL ❌</b>";
        renderQuestionWiseResult(data);
    }

    /* ===================== SIDEBAR ===================== */
    function buildSidebar() {
        const sidebar = document.getElementById("questionSidebar");
        sidebar.innerHTML = "";
        let attemptedCount = 0;

        questions.forEach((q, i) => {
            const isAnswered = userAnswers[q.id]?.length > 0;
            if (isAnswered) attemptedCount++;

            let cls = "palette-btn";
            if (i === currentQuestion) cls += " current";
            else if (isAnswered) cls += " answered";

            const btn = document.createElement("button");
            btn.className = cls;
            btn.textContent = String(i + 1).padStart(2, "0");
            btn.addEventListener("click", () => {
                saveAnswer();
                currentQuestion = i;
                loadQuestion();
            });
            sidebar.appendChild(btn);
        });

        document.getElementById("attemptedCount").innerText = attemptedCount;
        document.getElementById("notAttemptedCount").innerText = questions.length - attemptedCount;
    }

    window.jumpToQuestion = function (index) {
        saveAnswer();
        currentQuestion = index;
        loadQuestion();
    };

    /* ===================== REVIEW MODE ===================== */
    window.reviewQuiz = function () {
        reviewMode = true;
        currentQuestion = 0;
        document.getElementById("resultSection").classList.add("d-none");
        document.getElementById("quizSection").classList.remove("d-none");
        if (topHomeBtn) topHomeBtn.style.display = "none";
        backToResultBtn.style.display = "inline-block";
        document.getElementById("homebtn").style.display = "inline-block";
        submitBtn.style.display = "none";
        loadQuestion();
    };

    backToResultBtn.onclick = function () {
        reviewMode = false;
        document.getElementById("quizSection").classList.add("d-none");
        document.getElementById("resultSection").classList.remove("d-none");
        if (topHomeBtn) topHomeBtn.style.display = "inline-block";
        backToResultBtn.style.display = "none";
        showResult(finalResult);
    };

    /* ===================== QUESTION WISE RESULT ===================== */
    function renderQuestionWiseResult(data) {
        const container = document.getElementById("questionWiseResult");
        container.innerHTML = "<h5 class='mb-3'>Question Wise Result</h5>";

        questions.forEach((question, index) => {
            const res = data.results.find(r => r.questionId === question.id);
            if (!res) return;

            const correctIndexes = (res.correctIndexes || []).map(Number);
            const selectedIndexes = (res.selectedIndexes || []).map(Number);

            let optionsHTML = "";
            question.options.forEach((opt, idx) => {
                let cls = "option-box disabled";
                let icon = "";

                const isCorrect = correctIndexes.includes(idx);
                const isSelected = selectedIndexes.includes(idx);

                if (isSelected && !isCorrect) { cls += " wrong"; icon = "❌"; }
                if (isCorrect) { cls += " correct"; icon = "✔"; }

                optionsHTML += `
<div class="${cls}">
    <span class="option-content">${renderOptionContent(opt)}</span>
    ${icon ? `<span class="icon">${icon}</span>` : ""}
</div>`;
            });

            const qImgHTML = (question.image || question.imageUrl || question.questionImage)
                ? `<img src="${question.image || question.imageUrl || question.questionImage}" class="question-image" alt="Question Image">`
                : "";

            container.innerHTML += `
<div class="mb-4">
    <div class="fw-bold mb-2">
        Q${index + 1}. ${escapeHTML(question.question)}
        <span class="float-end">
            ${res.correct
                    ? "<span class='text-success'>✔ Correct</span>"
                    : "<span class='text-danger'>❌ Wrong</span>"}
            (${res.marksObtained}/${question.marks})
        </span>
    </div>
    ${qImgHTML}
    ${optionsHTML}
    ${question.explanation
                    ? `<div class="mt-2 p-2 bg-light border rounded"><b>Explanation:</b> ${escapeHTML(question.explanation)}</div>`
                    : ""}
 </div>`;
        });
    }

    /* ===================== RESTORE CACHED RESULT (if already submitted) ===================== */
    const cachedResult = sessionStorage.getItem(resultCacheKey);
    if (cachedResult) {
    try {
        finalResult = JSON.parse(cachedResult);
        quizSubmitted = true;
        document.getElementById("startOverlay").style.display = "none";
        document.getElementById("quizSection").classList.add("d-none");
        document.getElementById("resultSection").classList.remove("d-none");
        if (topHomeBtn) topHomeBtn.style.display = "inline-block";

        // ✅ ADD THIS CHECK
        if (quizResponse.showResult === false) {
            document.getElementById("resultSection").innerHTML =
                `<div class="text-center p-5">
                    <h4>Quiz Submitted Successfully ✅</h4>
                    <p class="text-muted">Result will be declared later by the admin.</p>
                </div>`;
        } else {
            showResult(finalResult);
        }

        exitFullscreen();
    } catch (e) {
            console.error("Failed to restore cached result:", e);
            sessionStorage.removeItem(resultCacheKey);
        }
    }

    /* ===================== INIT ===================== */
    loadQuizInfo();
    wireZoomControls();
    document.getElementById("startQuizBtn").onclick = async function () {
        await enterFullscreen();
        document.getElementById("startOverlay").style.display = "none";
        loadQuestion();
        startTimer();
    };

});

window.goBackFromQuiz = async function () {
    allowBackNavigation = true;
    allowFullscreenExit = true;
    window.onpopstate = null;
    if (document.fullscreenElement) await document.exitFullscreen();
    setTimeout(() => { history.go(-2); }, 300);
};