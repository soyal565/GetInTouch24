import { getMarquee, getSliders } from "./api.js";


// ===== MARQUEE =====
async function loadMarquee() {

    try {

        const data =
            await getMarquee();

        const marquee =
            document.getElementById("marqueeText");

        if (!marquee) return;

        if (data && data.active) {

            const rawText =
                data.text || "";

            const items =
                rawText.split("||");

            let html = "";

            items.forEach(item => {

                const parts =
                    item.split("|");

                const text =
                    parts[0]?.trim();

                const url =
                    parts[1]?.trim();

                if (text) {

                    html += `
            <span>${text}</span>

            ${url ? `
                &nbsp;

                <a href="${url}"
                target="_blank"
                style="
                    color: blue;
                    font-weight: bold;
                    text-decoration: underline;
                ">
                    Open Link
                </a>
            ` : ""}

            &nbsp;&nbsp;&nbsp;&nbsp;
        `;

                }

            });
            marquee.innerHTML = html;
        }

        else {

            marquee.innerHTML =
                "Welcome to our educational portal";

        }

    }

    catch (error) {

        console.error("Marquee Error:", error);

        document.getElementById("marqueeText").innerHTML =
            "Welcome to our educational portal";

    }

}



// ===== SLIDER =====
async function loadSlider() {

    try {

        const slides =
            await getSliders();

        let sliderHTML = "";

        slides.forEach((slide, index) => {

            if (slide.active) {

                sliderHTML += `
<div class="carousel-item ${index === 0 ? 'active' : ''}">
<img src="${slide.imageUrl}"
class="d-block w-100 slider-img">
</div>
`;

            }

        });

        document.getElementById("sliderContainer").innerHTML =
            sliderHTML;

    }

    catch (err) {

        console.error("Slider error:", err);

    }

}


// LOAD
document.addEventListener("DOMContentLoaded", () => {

    loadMarquee();

    loadSlider();

    loadQuickQuizzes();

});

async function loadQuickQuizzes() {

    try {

        const token =
            localStorage.getItem("token");

        const response = await fetch(
            CONFIG.BASE_URL +
            "/api/quizzes/active",
            {
                method: "GET",
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load quizzes"
            );
        }

        const quizzes =
            await response.json();

        const now = new Date();

        const validQuizzes = quizzes.filter((quiz) => {

            // Practice quiz always allowed
            if (
                quiz.type.toLowerCase() === "practice"
            ) {
                return true;
            }

            // Live quiz time check
            return new Date(quiz.endTime) > now;

        });

        const limitedQuizzes =
            validQuizzes.slice(0, 6);

        renderQuickQuizzes(
            limitedQuizzes
        );

    } catch (error) {

        console.error(error);

    }
}

function renderQuickQuizzes(quizzes) {

    const container =
        document.getElementById(
            "quickQuizContainer"
        );

    container.innerHTML = "";

    quizzes.forEach((quiz) => {

        if (!quiz.active) return;

        const card = `

<div class="col-lg-4 col-md-6 col-12">

    <div class="quiz-card h-100">

        <span class="course-badge">
            ${quiz.course.name}
        </span>

        <h3>
            ${quiz.title}
        </h3>

        <p>
            <strong>Questions:</strong>
            ${quiz.totalQuestions}
        </p>

        <p>
            <strong>Total Marks:</strong>
            ${quiz.totalMarks}
        </p>

        <p>
            <strong>Duration:</strong>
            ${quiz.timeLimit} min
        </p>

        <button
            class="start-btn"
            data-id="${quiz.id}"
        >
            Start Practice
        </button>

    </div>

</div>
`;

        container.innerHTML += card;

    });

    attachQuickQuizListeners();

}

// ===============================

function attachQuickQuizListeners() {

    document
        .querySelectorAll(".start-btn")
        .forEach(btn => {

            btn.addEventListener(
                "click",
                function () {

                    const quizId =
                        Number(
                            this.getAttribute(
                                "data-id"
                            )
                        );

                    startQuickQuiz(
                        quizId
                    );

                }
            );

        });

}

// ===============================

async function startQuickQuiz(quizId) {

    try {

        const res =
            await authFetch(
                "/api/quizzes/" +
                quizId +
                "/start",
                {
                    method: "POST"
                }
            );

        const quizResponse =
            await res.json();

        if (
            !res.ok ||
            quizResponse.success === false
        ) {

            alert(
                quizResponse.message ||
                "Unable to start quiz"
            );

            return;

        }

        const quizData =
            quizResponse.data
                ? quizResponse.data
                : quizResponse;

        sessionStorage.setItem(
            "quizData",
            JSON.stringify(
                quizData
            )
        );

        sessionStorage.setItem(
            "attemptId",
            quizData.attemptId
        );

        window.location.href =
            "quiz.html";

    }

    catch (err) {

        console.error(
            "Quick Quiz Start Error:",
            err
        );

        alert(
            "Error starting quiz"
        );

    }

}

// GLOBAL ACCESS
window.loadQuickQuizzes =
    loadQuickQuizzes;