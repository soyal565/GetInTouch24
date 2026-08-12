document.getElementById("resetForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = localStorage.getItem("resetEmail"); // 🔥 important
    const otp = document.getElementById("otp").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    const errorMsg = document.getElementById("errorMsg");
    errorMsg.innerText = "";

    // ✅ validation
    if (!otp) {
        errorMsg.innerText = "Enter OTP";
        return;
    }

    if (newPassword.length < 8) {
        errorMsg.innerText = "Password must be at least 8 characters";
        return;
    }

    if (newPassword !== confirmPassword) {
        errorMsg.innerText = "Passwords do not match";
        return;
    }

    try {
        const res = await fetch(CONFIG.BASE_URL + "/auth/reset-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                otp,
                newPassword
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ Password reset successful");

            // cleanup
            localStorage.removeItem("resetEmail");

            window.location.href = "index.html";
        } else {
            alert("❌ " + (data.message || "Invalid OTP / Expired OTP"));
        }

    } catch (err) {
        alert("Server error ❌");
    }
});

// ================= PASSWORD SHOW/HIDE =================

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll(".toggle-password-icon").forEach(icon => {

        icon.addEventListener("click", function () {

            const targetId = this.getAttribute("data-target");
            const input = document.getElementById(targetId);

            if (!input) return;

            if (input.type === "password") {
                input.type = "text";
                this.classList.remove("fa-eye");
                this.classList.add("fa-eye-slash");
            } else {
                input.type = "password";
                this.classList.remove("fa-eye-slash");
                this.classList.add("fa-eye");
            }

        });

    });

});