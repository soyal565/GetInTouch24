// ================================================================
// LIVE QUIZ PAGE CONTROLLER
// Stages: Course -> Paper -> Chapter -> Quiz (type = LIVE)
// URL state kept in query params: ?courseId=&paperId=&chapterId=
// No page reload — history.pushState + popstate handle navigation.
// ================================================================

const state = { course: null, paper: null, chapter: null };
let pendingQuizId = null;
let statusInterval = null;
let currentLiveQuizzes = [];

// Resume the quiz start automatically once login succeeds
// (hook consumed by js/auth.js after a successful login)
window.onLoginSuccess = function () {
    if (pendingQuizId) {
        const id = pendingQuizId;
        pendingQuizId = null;
        startLiveQuiz(id);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("popstate", render);
    render();
});

// ---------------- URL / navigation ----------------

function getParams() {
    return new URLSearchParams(window.location.search);
}

function navigate(newParams) {
    const qs = new URLSearchParams(newParams).toString();
    const url = window.location.pathname + (qs ? "?" + qs : "");
    history.pushState(null, "", url);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------- main render / router ----------------

async function render() {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }

    const params = getParams();
    const courseId = params.get("courseId");
    const paperId = params.get("paperId");
    const chapterId = params.get("chapterId");

    try {
        if (chapterId) {
            await ensureChapter(chapterId);
            updateBreadcrumb();
            await showQuizStage(chapterId);
        } else if (paperId) {
            state.chapter = null;
            await ensurePaper(paperId);
            updateBreadcrumb();
            await showChapterStage(paperId);
        } else if (courseId) {
            state.chapter = null;
            state.paper = null;
            await ensureCourse(courseId);
            updateBreadcrumb();
            await showPaperStage(courseId);
        } else {
            state.course = null;
            state.paper = null;
            state.chapter = null;
            updateBreadcrumb();
            await showCourseStage();
        }
    } catch (err) {
        console.error(err);
        renderError("Something went wrong. Please refresh and try again.");
    }
}

async function ensureCourse(courseId) {
    if (!state.course || String(state.course.id) !== String(courseId)) {
        state.course = await QuizBrowser.fetchCourseById(courseId);
    }
}

async function ensurePaper(paperId) {
    if (!state.paper || String(state.paper.id) !== String(paperId)) {
        state.paper = await QuizBrowser.fetchPaperById(paperId);
    }
    if (state.paper) await ensureCourse(state.paper.courseId);
}

async function ensureChapter(chapterId) {
    if (!state.chapter || String(state.chapter.id) !== String(chapterId)) {
        state.chapter = await QuizBrowser.fetchChapterById(chapterId);
    }
    if (state.chapter) await ensurePaper(state.chapter.paperId);
}

// ---------------- breadcrumb + heading ----------------

function updateBreadcrumb() {
    const bc = document.getElementById("browseBreadcrumb");
    const heading = document.getElementById("stageHeading");
    if (!bc || !heading) return;

    const esc = QuizBrowser.escapeHtml;
    let html = `<span class="crumb" data-nav="root">Courses</span>`;
    let headingText = "Select a Course";

    if (state.course) {
        html += ` <span class="crumb-sep"><i class="fa-solid fa-chevron-right"></i></span> <span class="crumb" data-nav="course">${esc(state.course.name)}</span>`;
        headingText = "Select a Paper";
    }
    if (state.paper) {
        html += ` <span class="crumb-sep"><i class="fa-solid fa-chevron-right"></i></span> <span class="crumb" data-nav="paper">${esc(state.paper.name)}</span>`;
        headingText = "Select a Chapter";
    }
    if (state.chapter) {
        html += ` <span class="crumb-sep"><i class="fa-solid fa-chevron-right"></i></span> <span class="crumb active">${esc(state.chapter.title)}</span>`;
        headingText = state.chapter.title + " — Live Quizzes";
    }

    bc.innerHTML = html;
    heading.textContent = headingText;

    bc.querySelectorAll(".crumb[data-nav]").forEach(el => {
        el.addEventListener("click", () => {
            const nav = el.getAttribute("data-nav");
            if (nav === "root") navigate({});
            if (nav === "course") navigate({ courseId: state.course.id });
            if (nav === "paper") navigate({ courseId: state.course.id, paperId: state.paper.id });
        });
    });
}

// ---------------- stage: course / paper / chapter (browse grid) ----------------

async function showCourseStage() {
    renderLoading();
    const courses = await QuizBrowser.fetchCourses();
    renderGrid(courses, (c) => ({
        title: c.name,
        subtitle: c.description || "",
        thumb: c.thumbnail,
        onClick: () => navigate({ courseId: c.id })
    }), "No courses available yet.");
}

async function showPaperStage(courseId) {
    renderLoading();
    const papers = await QuizBrowser.fetchPapers(courseId);
    renderGrid(papers, (p) => ({
        title: p.name,
        subtitle: p.description || "",
        thumb: p.thumbnail,
        onClick: () => navigate({ courseId, paperId: p.id })
    }), "No papers available in this course yet.");
}

async function showChapterStage(paperId) {
    renderLoading();
    const chapters = await QuizBrowser.fetchChapters(paperId);
    renderGrid(chapters, (ch) => ({
        title: ch.title,
        subtitle: ch.description || "",
        thumb: ch.thumbnail,
        onClick: () => navigate({ courseId: state.course.id, paperId, chapterId: ch.id })
    }), "No chapters available in this paper yet.");
}

function renderGrid(items, mapFn, emptyMsg) {
    const container = document.getElementById("liveQuizContainer");
    container.className = "quiz-container browse-grid";

    if (!items.length) {
        container.innerHTML = `<p class="empty-msg">${emptyMsg}</p>`;
        return;
    }

    const esc = QuizBrowser.escapeHtml;
    container.innerHTML = "";

    items.forEach(item => {
        const d = mapFn(item);
        const thumbUrl = d.thumb || QuizBrowser.placeholderThumb(d.title);

        const card = document.createElement("div");
        card.className = "browse-card";
        card.innerHTML = `
            <div class="browse-thumb-wrap">
                <img class="browse-thumb" src="${esc(thumbUrl)}" alt="${esc(d.title)}">
            </div>
            <div class="browse-card-body">
                <h3>${esc(d.title)}</h3>
                ${d.subtitle ? `<p class="browse-subtitle">${esc(d.subtitle)}</p>` : ""}
                <button type="button" class="browse-btn">View <i class="fa-solid fa-arrow-right"></i></button>
            </div>
        `;
        card.querySelector(".browse-thumb").addEventListener("error", function () {
            this.src = QuizBrowser.placeholderThumb(d.title);
        });
        card.addEventListener("click", d.onClick);
        container.appendChild(card);
    });
}

// ---------------- stage: quiz cards (final level) ----------------

function getStatus(startTime, endTime) {

    if (!startTime || !endTime) return "ended";

    const now = Date.now();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
}

async function showQuizStage(chapterId) {
    renderLoading();
    const quizzes = await QuizBrowser.fetchQuizzesByChapter(chapterId, "LIVE");
    currentLiveQuizzes = quizzes;
    renderQuizCards(quizzes);

    if (quizzes.length) {
        statusInterval = setInterval(() => updateQuizStatus(currentLiveQuizzes), 1000);
    }
}

function renderQuizCards(quizzes) {
    const container = document.getElementById("liveQuizContainer");
    container.className = "quiz-container";

    if (!quizzes.length) {
        container.innerHTML = `<p class="empty-msg">No live quizzes available for this chapter yet.</p>`;
        document.getElementById("footer").style.display = "block";
        return;
    }

    const esc = QuizBrowser.escapeHtml;
    container.innerHTML = "";

    quizzes.forEach(quiz => {

        const status = getStatus(quiz.startTime, quiz.endTime);
        const chapterName = state.chapter ? state.chapter.title : "-";

        const card = document.createElement("div");
        card.className = "quiz-card";

        const ribbon = status === "live" ? `<div class="ribbon">LIVE</div>` : "";

        const statusText =
            status === "live" ? "Active Now" :
            status === "upcoming" ? "Upcoming" : "Ended";

        const buttonClass = status === "live" ? "active-btn" : "disabled-btn";
        const disabledAttr = status === "live" ? "" : "disabled";
        const buttonText = status === "live" ? "Join Live Quiz" : "Not Available";

        card.innerHTML = `
${ribbon}
<span class="status ${status}">${statusText}</span>
<span class="course-badge">
  <h6 style="margin-top:5px;">${esc(chapterName)}</h6>
</span>
<h3>${esc(quiz.title)}</h3>
<p><strong>Start:</strong> ${new Date(quiz.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
<p><strong>End:</strong> ${new Date(quiz.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
<p><strong>Duration:</strong> ${quiz.timeLimit} min</p>
<p><strong>Total Marks:</strong> ${quiz.totalMarks}</p>
<button class="${buttonClass}" ${disabledAttr} data-id="${quiz.id}">${buttonText}</button>
`;

        if (status === "live") {
            card.querySelector("button").addEventListener("click", function () {
                const quizId = Number(this.getAttribute("data-id"));
                const token = localStorage.getItem("token");

                if (!token) {
                    pendingQuizId = quizId;
                    openLogin();
                    return;
                }

                startLiveQuiz(quizId);
            });
        }

        container.appendChild(card);
    });

    document.getElementById("footer").style.display = "block";
}

function updateQuizStatus(liveQuizzes) {

    const cards = document.querySelectorAll(".quiz-card");

    cards.forEach((card, index) => {

        const quiz = liveQuizzes[index];
        if (!quiz) return;

        const status = getStatus(quiz.startTime, quiz.endTime);

        const statusSpan = card.querySelector(".status");
        const button = card.querySelector("button");
        if (!statusSpan || !button) return;

        const statusText =
            status === "live" ? "Active Now" :
            status === "upcoming" ? "Upcoming" : "Ended";

        statusSpan.className = `status ${status}`;
        statusSpan.textContent = statusText;

        if (status === "live") {
            button.className = "active-btn";
            button.disabled = false;
            button.textContent = "Join Live Quiz";
        } else {
            button.className = "disabled-btn";
            button.disabled = true;
            button.textContent = "Not Available";
        }
    });
}

async function startLiveQuiz(quizId) {

    try {

        const res = await authFetch(
            "/api/quizzes/" + quizId + "/start",
            { method: "POST" }
        );

        const quizResponse = await res.json();

        if (!res.ok || quizResponse.success === false) {
            alert(quizResponse.message || "Unable to start quiz");
            return;
        }

        const quizData = quizResponse.data ? quizResponse.data : quizResponse;

        sessionStorage.setItem("quizData", JSON.stringify(quizData));
        sessionStorage.setItem("attemptId", quizData.attemptId);

        window.location.href = "quiz.html";

    } catch (err) {
        console.error("Live Start Error:", err);
        alert("Error starting quiz");
    }
}

// ---------------- misc UI helpers ----------------

function renderLoading() {
    const container = document.getElementById("liveQuizContainer");
    container.className = "quiz-container";
    container.innerHTML = `<p class="empty-msg">Loading...</p>`;
}

function renderError(msg) {
    const container = document.getElementById("liveQuizContainer");
    container.className = "quiz-container";
    container.innerHTML = `<p class="empty-msg">${QuizBrowser.escapeHtml(msg)}</p>`;
}