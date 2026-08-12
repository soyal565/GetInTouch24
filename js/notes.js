// ================================================================
// NOTES PAGE CONTROLLER
// Stages: Course -> Paper -> Notes
// URL state kept in query params: ?courseId=&paperId=
// No page reload — history.pushState + popstate handle navigation.
// Course/Paper fetching is shared with practice/live quiz pages via
// QuizBrowser (js/quiz-browser.js) — same public endpoints.
// ================================================================

const state = { course: null, paper: null };

document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("popstate", render);

    // Backward-compat: after a purchase, payment.html flow used to rely on
    // sessionStorage.selectedPaperId to reopen the same paper's notes.
    // Honor that once here (only when no URL state is present yet).
    const params = getParams();
    if (!params.get("courseId") && !params.get("paperId")) {
        const savedPaperId = sessionStorage.getItem("selectedPaperId");
        if (savedPaperId) {
            navigate({ paperId: savedPaperId });
            return;
        }
    }

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
    const params = getParams();
    const courseId = params.get("courseId");
    const paperId = params.get("paperId");

    try {
        if (paperId) {
            await ensurePaper(paperId);
            updateBreadcrumb();
            await showNotesStage(paperId);
        } else if (courseId) {
            state.paper = null;
            await ensureCourse(courseId);
            updateBreadcrumb();
            await showPaperStage(courseId);
        } else {
            state.course = null;
            state.paper = null;
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
        html += ` <span class="crumb-sep"><i class="fa-solid fa-chevron-right"></i></span> <span class="crumb active">${esc(state.paper.name)}</span>`;
        headingText = state.paper.name + " — Notes";
    }

    bc.innerHTML = html;
    heading.textContent = headingText;

    bc.querySelectorAll(".crumb[data-nav]").forEach(el => {
        el.addEventListener("click", () => {
            const nav = el.getAttribute("data-nav");
            if (nav === "root") navigate({});
            if (nav === "course") navigate({ courseId: state.course.id });
        });
    });
}

// ---------------- stage: course / paper (browse grid) ----------------

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

function renderGrid(items, mapFn, emptyMsg) {
    const container = document.getElementById("notesStageContainer");
    container.className = "grid-container";

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

// ---------------- stage: notes (final level) ----------------

async function showNotesStage(paperId) {
    renderLoading();

    try {
        const token = localStorage.getItem("token");
        let url;
        let headers = {};

        if (token) {
            url = CONFIG.BASE_URL + "/api/notes/paper/" + paperId;
            headers = { Authorization: "Bearer " + token };
        } else {
            url = CONFIG.BASE_URL + "/api/public/notes/paper/" + paperId;
        }

        const res = await fetch(url, { headers });
        const data = await res.json();

        const notes = Array.isArray(data) ? data : data.data || [];

        if (!Array.isArray(notes)) {
            throw new Error("Invalid notes response format");
        }

        renderNotes(notes);

    } catch (err) {
        console.error("Notes load error:", err);
        renderError("Notes could not be loaded.");
    }
}

function renderNotes(notes) {
    const container = document.getElementById("notesStageContainer");
    container.className = "grid-container";

    if (!notes.length) {
        container.innerHTML = `<p class="empty-msg">No notes available for this paper yet.</p>`;
        document.getElementById("footer").style.display = "block";
        return;
    }

    container.innerHTML = "";

    notes.forEach(note => {

        const card = document.createElement("div");
        card.className = "note-card";

        card.innerHTML = `
            <img src="${note.thumbnailUrl || QuizBrowser.placeholderThumb(note.title)}" class="card-thumb" />
            <h3>${QuizBrowser.escapeHtml(note.title)}</h3>
            <p>${QuizBrowser.escapeHtml(note.description || "")}</p>
            <p><b>₹${note.price}</b></p>
            <h6><b>${QuizBrowser.escapeHtml(note.paperName || "")}</b></h6>
        `;

        card.querySelector(".card-thumb").addEventListener("error", function () {
            this.src = QuizBrowser.placeholderThumb(note.title);
        });

        const btn = document.createElement("button");

        if (note.isPurchase) {

            btn.className = "btn open";
            btn.innerText = "Open PDF";

            btn.onclick = async () => {
                try {
                    const token = localStorage.getItem("token");

                    const res = await fetch(
                        CONFIG.BASE_URL + "/api/notes/" + note.id,
                        { headers: { Authorization: "Bearer " + token } }
                    );

                    const noteDetails = await res.json();

                    if (!noteDetails.pdfUrl) {
                        alert("PDF URL not found");
                        return;
                    }

                    window.open(noteDetails.pdfUrl, "_blank");

                } catch (err) {
                    console.error(err);
                    alert("Unable to open PDF");
                }
            };

        } else {

            btn.className = "btn buy";
            btn.innerText = "Buy Now";
            btn.onclick = () => handleBuy(note.id);
        }

        card.appendChild(btn);
        container.appendChild(card);
    });

    document.getElementById("footer").style.display = "block";
}

// ---------------- buy flow ----------------

async function handleBuy(noteId) {

    const token = localStorage.getItem("token");

    if (!token) {
        sessionStorage.setItem("pendingNoteId", noteId);
        window.location.href = "index.html?showLogin=true";
        return;
    }

    try {

        const res = await fetch(
            CONFIG.BASE_URL + "/api/notes/purchase/" + noteId,
            {
                method: "GET",
                headers: { "Authorization": "Bearer " + token }
            }
        );

        const responseText = await res.text();

        if (!res.ok) {
            throw new Error(responseText);
        }

        const data = JSON.parse(responseText);

        const params = getParams();
        sessionStorage.setItem("selectedPaperId", params.get("paperId"));
        sessionStorage.setItem("selectedNoteId", noteId);
        sessionStorage.setItem("paymentData", JSON.stringify(data));

        window.location.href = "payment.html";

    } catch (err) {
        console.error(err);
        alert("Unable to start payment");
    }
}

// ---------------- misc UI helpers ----------------

function renderLoading() {
    const container = document.getElementById("notesStageContainer");
    container.className = "grid-container";
    container.innerHTML = `<p class="empty-msg">Loading...</p>`;
}

function renderError(msg) {
    const container = document.getElementById("notesStageContainer");
    container.className = "grid-container";
    container.innerHTML = `<p class="empty-msg">${QuizBrowser.escapeHtml(msg)}</p>`;
}