document.addEventListener("DOMContentLoaded", async function () {

    const token =
        localStorage.getItem("token");

    if (!token) {

        alert("Please login first!");

        window.location.href =
            "index.html";

        return;

    }

    // sequential loading
    await loadProfileData();

    await loadQuizHistory();
    await loadPurchasedNotes();

    document
        .getElementById("searchInput")
        .addEventListener(
            "input",
            applyFilters
        );

});


// ====================================
// GLOBALS
// ====================================

let currentUser = {};
let quizHistory = [];
let quizMap = {};
let purchasedNotes = [];

// ====================================
// LOAD PROFILE DATA
// ====================================

async function loadProfileData() {

    try {

        const token = localStorage.getItem("token");

        const response = await fetch(
            CONFIG.BASE_URL + "/auth/me",
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        if (!response.ok) {
            throw new Error("Failed to load profile");
        }

        const data = await response.json();

        currentUser = data;

        updateProfileUI();

    } catch (error) {

        console.error(error);
        alert("Failed to load profile data");

    }
}


// ====================================
// UPDATE PROFILE UI
// ====================================

function updateProfileUI() {

    document.getElementById("profileName").innerText =
        currentUser.fullName || "N/A";

    document.getElementById("profileEmail").innerText =
        currentUser.email || "N/A";

    document.getElementById("profileMobile").innerText =
        currentUser.phone || "N/A";
}


// ====================================
// PREFILL EDIT MODAL
// ====================================

document.getElementById("editProfileModal")
    ?.addEventListener("show.bs.modal", function () {

        document.getElementById("editName").value =
            currentUser.fullName || "";

        document.getElementById("editEmail").value =
            currentUser.email || "";

        document.getElementById("editMobile").value =
            currentUser.phone || "";
    });


// ====================================
// UPDATE PROFILE
// ====================================

document.getElementById("editProfileForm")
    ?.addEventListener("submit", async function (e) {

        e.preventDefault();

        try {

            const token = localStorage.getItem("token");

            const updatedData = {

                ...currentUser,

                fullName:
                    document.getElementById("editName")
                        .value
                        .trim(),

                phone:
                    document.getElementById("editMobile")
                        .value
                        .trim()
            };
            console.log(updatedData);


            const response = await fetch(
                CONFIG.BASE_URL +
                "/api/users/" +
                currentUser.id,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },
                    body: JSON.stringify(updatedData)
                }
            );

            if (!response.ok) {

                const errorData =
                    await response.text();

                console.log("Backend Error:", errorData);

                throw new Error(errorData);
            }

            const updatedUser = await response.json();

            currentUser = updatedUser;

            updateProfileUI();

            const modal = bootstrap.Modal.getInstance(
                document.getElementById("editProfileModal")
            );

            modal.hide();

            alert("Profile updated successfully ✅");

        } catch (error) {

            console.error(error);
            alert("Failed to update profile");

        }
    });


// ====================================
// LOAD QUIZ HISTORY
// ====================================

async function loadQuizHistory() {

    try {

        const token =
            localStorage.getItem("token");

        const response = await fetch(
            CONFIG.BASE_URL +
            "/api/quiz-attempts/user",
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
                "Failed to load quiz history"
            );
        }

        const data =
            await response.json();
        // ================= LOAD ALL QUIZZES =================

        const quizResponse =
            await fetch(
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

        const allQuizzes =
            await quizResponse.json();

        // CREATE QUIZ MAP
        allQuizzes.forEach((quiz) => {

            quizMap[quiz.id] = {

                title: quiz.title,

                type: quiz.type

            };

        });

        quizHistory = data.map((attempt) => {

            const quizInfo =
                quizMap[attempt.quizId] || {};

            return {

                // 🔥 needed to link each row to "View Result" on quiz.html
                attemptId:
                    attempt.attemptId ?? attempt.id,

                quizId:
                    attempt.quizId,

                quizName:
                    quizInfo.title || "Unknown Quiz",

                type:
                    quizInfo.type || "N/A",

                score:
                    attempt.score || 0,

                total:
                    attempt.totalMarks || 0,

                correct:
                    attempt.correctAnswers || 0,

                wrong:
                    attempt.wrongAnswers || 0,

                percentage:
                    attempt.percentage || 0,

                status:
                    attempt.status || "N/A",

                date:
                    new Date(
                        attempt.endTime
                    ).toLocaleString()

            };

        });

        renderQuizHistory(quizHistory);

    } catch (error) {

        console.error(error);

        alert("Failed to load quiz history");

    }
}

// ====================================
// LOAD COURSE FILTER
// ====================================




// ====================================
// RENDER QUIZ HISTORY
// ====================================

function renderQuizHistory(filteredData) {

    const tbody =
        document.getElementById("quizHistoryBody");

    tbody.innerHTML = "";

    if (filteredData.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-muted">
                    No quiz history found
                </td>
            </tr>
        `;

        return;
    }

    filteredData.forEach((quiz, index) => {

        const statusBadge =
            quiz.status.toUpperCase() === "PASS"
                ? `<span class="badge bg-success">PASS</span>`
                : `<span class="badge bg-danger">FAIL</span>`;

        const viewResultCell = quiz.attemptId
            ? `<a href="quiz.html?viewAttemptId=${quiz.attemptId}" class="btn btn-sm btn-primary view-result-btn">
                   <i class="fa-solid fa-eye"></i> View Result
               </a>`
            : `<span class="text-muted">-</span>`;

        const row = `
            <tr>
                <td>${index + 1}</td>

                <td>${quiz.quizName}</td>

                <td>${quiz.type}</td>

                <td>${quiz.score}</td>

                <td>${quiz.total}</td>

                <td>
                    <span class="text-success fw-bold">
                        ${quiz.correct}
                    </span>
                </td>

                <td>
                    <span class="text-danger fw-bold">
                        ${quiz.wrong}
                    </span>
                </td>

                <td>
                    ${quiz.percentage}%
                </td>

                <td>
                    ${statusBadge}
                </td>

                <td>
                    ${quiz.date}
                </td>

                <td>
                    ${viewResultCell}
                </td>
            </tr>
        `;

        tbody.innerHTML += row;

    });
}

// ====================================
// FILTERS
// ====================================

function applyFilters() {

    const searchValue =
        document.getElementById("searchInput")
            .value
            .toLowerCase();

    let filtered =
        quizHistory.filter(quiz => {

            return quiz.quizName
                .toLowerCase()
                .includes(searchValue);

        });

    renderQuizHistory(filtered);
}

// ====================================
// LOAD PURCHASED NOTES
// ====================================

async function loadPurchasedNotes() {

    try {

        const token =
            localStorage.getItem("token");

        const response = await fetch(
            CONFIG.BASE_URL +
            "/api/notes/purchased",
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
                "Failed to load purchased notes"
            );

        }

        purchasedNotes =
            await response.json();

        renderPurchasedNotes();

    }
    catch (error) {

        console.error(error);

        document.getElementById(
            "purchasedNotesContainer"
        ).innerHTML =
            `<p class="text-danger">
                Failed to load notes
            </p>`;
    }
}

// ====================================
// RENDER PURCHASED NOTES
// ====================================

function renderPurchasedNotes() {

    const container =
        document.getElementById(
            "purchasedNotesContainer"
        );

    if (
        !purchasedNotes ||
        purchasedNotes.length === 0
    ) {

        container.innerHTML = `
            <div class="text-center text-muted">
                No purchased notes found
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    purchasedNotes.forEach(note => {

        container.innerHTML += `
            <div class="card mb-3 border-0 shadow-sm">

                <div class="card-body">

                    <div class="row align-items-center">

                        <div class="col-md-2">

                            <img
                                src="${note.thumbnailUrl}"
                                class="img-fluid rounded"
                                alt="${note.title}"
                            >

                        </div>

                        <div class="col-md-7">

                            <h6 class="mb-1">
                                ${note.title}
                            </h6>

                            <p class="text-muted mb-1">
                                ${note.paperName}
                            </p>

                            <small>
                                Purchased Note
                            </small>

                        </div>

                        <div class="col-md-3 text-md-end">

                            <a
                                href="${note.pdfUrl}"
                                target="_blank"
                                class="btn btn-success"
                            >
                                <i class="fa-solid fa-file-pdf"></i>
                                View PDF
                            </a>

                        </div>

                    </div>

                </div>

            </div>
        `;

    });
}