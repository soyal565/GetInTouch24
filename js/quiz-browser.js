// ================================================================
// QUIZ BROWSER (SHARED)
// Course -> Paper -> Chapter -> Quiz drill-down helpers.
// Used by both practice-quiz.js and live-quiz.js
// All endpoints used here are PUBLIC (no auth token needed) so that
// guests can browse freely. Login is only required at "Start Quiz".
// ================================================================

const QuizBrowser = (() => {

    function unwrap(data) {
        return Array.isArray(data) ? data : (data && data.data) || [];
    }

    async function fetchCourses() {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/courses");
        if (!res.ok) throw new Error("Failed to load courses");
        const list = unwrap(await res.json());
        return list.filter(c => c.active);
    }

    async function fetchCourseById(id) {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/courses/" + id);
        if (!res.ok) return null;
        return res.json();
    }

    async function fetchPapers(courseId) {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/papers/course/" + courseId);
        if (!res.ok) throw new Error("Failed to load papers");
        const list = unwrap(await res.json());
        return list.filter(p => p.active);
    }

    async function fetchPaperById(id) {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/papers/" + id);
        if (!res.ok) return null;
        return res.json();
    }

    async function fetchChapters(paperId) {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/chapters/paper/" + paperId + "/active");
        if (!res.ok) throw new Error("Failed to load chapters");
        const list = unwrap(await res.json());
        return list.filter(c => c.active);
    }

    async function fetchChapterById(id) {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/chapters/" + id);
        if (!res.ok) return null;
        return res.json();
    }

    // type = "PRACTICE" | "LIVE"
    // Always uses the public endpoint — browsing (course/paper/chapter/quiz
    // cards) stays public for everyone. Login is only required at "Start Quiz".
    async function fetchQuizzesByChapter(chapterId, type) {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/quiz");
        if (!res.ok) throw new Error("Failed to load quizzes");
        const list = unwrap(await res.json());

        return list.filter(q =>
            q.active &&
            q.type === type &&
            q.chapter &&
            String(q.chapter.id) === String(chapterId)
        );
    }

    function placeholderThumb(label) {
        return "https://placehold.co/500x280/e8f0ff/1f66d1?text=" +
            encodeURIComponent(label || "GT24");
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    return {
        fetchCourses,
        fetchCourseById,
        fetchPapers,
        fetchPaperById,
        fetchChapters,
        fetchChapterById,
        fetchQuizzesByChapter,
        placeholderThumb,
        escapeHtml
    };

})();