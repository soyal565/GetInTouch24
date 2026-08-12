document.addEventListener("DOMContentLoaded", function () {

    const contactForm = document.getElementById("contactForm");
    const confirmSendBtn = document.getElementById("confirmSendBtn");

    const previewModalEl = document.getElementById("feedbackPreviewModal");
    const thankYouModalEl = document.getElementById("thankYouModal");

    const previewModal = new bootstrap.Modal(previewModalEl);
    const thankYouModal = new bootstrap.Modal(thankYouModalEl);

    // ================= SHOW PREVIEW (instead of sending immediately) =================
    contactForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please login first");
            window.location.href = "index.html";
            return;
        }

        const subject = document.getElementById("subject").value.trim();
        const message = document.getElementById("message").value.trim();

        if (!subject || !message) {
            alert("Please fill all fields");
            return;
        }

        document.getElementById("previewSubject").textContent = subject;
        document.getElementById("previewMessage").textContent = message;

        previewModal.show();
    });

    // ================= CONFIRM & SEND (actual submission) =================
    confirmSendBtn.addEventListener("click", async function () {

        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please login first");
            window.location.href = "index.html";
            return;
        }

        const subject = document.getElementById("subject").value.trim();
        const message = document.getElementById("message").value.trim();

        if (!subject || !message) {
            alert("Please fill all fields");
            previewModal.hide();
            return;
        }

        confirmSendBtn.disabled = true;
        const originalBtnHTML = confirmSendBtn.innerHTML;
        confirmSendBtn.innerHTML = "Sending...";

        try {

            const response = await fetch(
                CONFIG.BASE_URL + "/api/contact",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },

                    body: JSON.stringify({
                        subject,
                        message
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to send message");
            }

            previewModal.hide();
            contactForm.reset();
            thankYouModal.show();

        } catch (error) {

            console.error(error);
            alert("Failed to send message");

        } finally {

            confirmSendBtn.disabled = false;
            confirmSendBtn.innerHTML = originalBtnHTML;

        }

    });

});