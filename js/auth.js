// ================================
// OFFCANVAS AUTO CLOSE ON DESKTOP
// ================================
document.addEventListener('DOMContentLoaded', function () {

    checkAuthState(); // Check login state on page load

    var offcanvasEl = document.getElementById('mobileMenu');
    if (offcanvasEl) {
        var bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl)
            || new bootstrap.Offcanvas(offcanvasEl);

        window.addEventListener('resize', function () {
            if (window.innerWidth >= 992) {
                bsOffcanvas.hide();
            }
        });
    }
});

function closeOffcanvasIfOpen() {
    var offcanvasEl = document.getElementById('mobileMenu');
    var bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
    if (bsOffcanvas) {
        bsOffcanvas.hide();
    }
}


// ================================
// AUTH SYSTEM (DESKTOP + MOBILE)
// ================================
function checkAuthState() {

    const token =
        localStorage.getItem("token");

    if (token) {
        showUserMenu();
    }
    else {
        showGuestButtons();
    }
}

function showUserMenu() {
    // Desktop
    const guestButtons = document.getElementById("guestButtons");
    const userMenu = document.getElementById("userMenu");

    if (guestButtons && userMenu) {
        guestButtons.classList.add("d-none");
        userMenu.classList.remove("d-none");
    }

    // Mobile
    const mobileGuest = document.getElementById("mobileGuest");
    const mobileUserMenu = document.getElementById("mobileUserMenu");

    if (mobileGuest && mobileUserMenu) {
        mobileGuest.classList.add("d-none");
        mobileUserMenu.classList.remove("d-none");
    }
}

function showGuestButtons() {
    // Desktop
    const guestButtons = document.getElementById("guestButtons");
    const userMenu = document.getElementById("userMenu");

    if (guestButtons && userMenu) {
        guestButtons.classList.remove("d-none");
        userMenu.classList.add("d-none");
    }

    // Mobile
    const mobileGuest = document.getElementById("mobileGuest");
    const mobileUserMenu = document.getElementById("mobileUserMenu");

    if (mobileGuest && mobileUserMenu) {
        mobileGuest.classList.remove("d-none");
        mobileUserMenu.classList.add("d-none");
    }
}

function logoutUser() {

    localStorage.removeItem("token");
    // localStorage.removeItem("refreshToken");

    window.location.href = "index.html";
}


// ================================
// RESET FORM (SINGLE CLEAN VERSION)
// ================================
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.reset();

    form.querySelectorAll("input").forEach(input => {
        input.classList.remove("error", "success");
    });

    form.querySelectorAll(".error-msg").forEach(msg => {
        msg.innerText = "";
    });
}


// ================================
// MODAL CONTROL
// ================================
function openLogin() {
    closeOffcanvasIfOpen();
    resetForm("loginForm");
    document.getElementById("signupModal").style.display = "none";
    document.getElementById("loginModal").style.display = "flex";
}

function openSignup() {
    closeOffcanvasIfOpen();
    resetForm("signupForm");
    document.getElementById("loginModal").style.display = "none";
    document.getElementById("signupModal").style.display = "flex";
}

function openOtpModal() {

    document.getElementById("signupModal")
        .style.display = "none";

    document.getElementById("otpModal")
        .style.display = "flex";

}

function openForgotPassword() {

    const email = document.getElementById("loginEmail").value.trim();

    if (!email) {
        alert("❌ Please enter your email first");
        return;
    }

    sendOtp(email);
}

function closeAll() {

    const login =
        document.getElementById("loginModal");

    const signup =
        document.getElementById("signupModal");

    const forgot =
        document.getElementById("forgotModal");

    const otp =
        document.getElementById("otpModal");


    if (login) login.style.display = "none";
    if (signup) signup.style.display = "none";
    if (forgot) forgot.style.display = "none";
    if (otp) otp.style.display = "none";

}

function closeLoginModal() {

    document
        .getElementById("loginModal")
        .style.display = "none";

}




// ================================
// VALIDATION REGEX
// ================================
const pname = /^[A-Za-z ]{3,30}$/;
const pmobile = /^[0-9]{10}$/;
const pemail = /^[a-z0-9._]+@[a-z0-9.-]+\.[a-z]{2,3}$/;


// ================================
// ERROR HANDLING FUNCTIONS
// ================================
function showError(input, errorId, message) {
    input.classList.add("error");
    input.classList.remove("success");

    const error = document.getElementById(errorId);
    if (error) {
        error.innerText = message;
        error.style.display = "block";
    }
}

function showSuccess(input, errorId) {
    input.classList.remove("error");
    input.classList.add("success");

    const error = document.getElementById(errorId);
    if (error) {
        error.innerText = "";
        error.style.display = "none";
    }
}


// ================================
// SIGNUP FORM VALIDATION
// ================================
document.getElementById("signupForm")
    ?.addEventListener("submit", async function (e) {

        e.preventDefault();

        const name = document.getElementById("name");
        const email = document.getElementById("signupEmail");
        const mobile = document.getElementById("mobile");
        const pass1 = document.getElementById("signupPassword1");
        const pass2 = document.getElementById("signupPassword2");

        let valid = true;

        if (!pname.test(name.value)) {
            showError(name, "nameError", "3-30 letters only");
            valid = false;
        } else showSuccess(name, "nameError");

        if (!pemail.test(email.value)) {
            showError(email, "SignUpEmailError", "Invalid email");
            valid = false;
        } else showSuccess(email, "SignUpEmailError");

        if (!pmobile.test(mobile.value)) {
            showError(mobile, "mobileError", "Enter 10-digit number");
            valid = false;
        } else showSuccess(mobile, "mobileError");

        if (pass1.value.length < 8) {
            showError(pass1, "passwordError1", "Min 8 characters");
            valid = false;
        } else showSuccess(pass1, "passwordError1");

        if (pass2.value !== pass1.value) {
            showError(pass2, "passwordError2", "Passwords do not match");
            valid = false;
        } else showSuccess(pass2, "passwordError2");


        if (valid) {

            try {

                const response =
                    await fetch(CONFIG.BASE_URL + "/auth/register", {

                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({

                            username: email.value.trim(),
                            email: email.value.trim(),
                            password: pass1.value.trim(),
                            fullName: name.value.trim(),
                            phone: mobile.value.trim(),
                            role: "USER"

                        })

                    });

                const data = await response.json();

                if (response.ok) {

                    alert("✅ OTP sent to your email");

                    // store email for OTP verification step
                    localStorage.setItem(
                        "verifyEmail",
                        email.value.trim()
                    );

                    // OTP modal open
                    openOtpModal();

                }
                else {

                    alert(
                        data.message ||
                        "Registration failed ❌"
                    );

                }

            }
            catch (error) {

                alert("Server error ❌");

            }

        }

    });


// ================================
// LOGIN FORM VALIDATION
// ================================
document.getElementById("loginForm")
    ?.addEventListener("submit", async function (e) {

        e.preventDefault();

        const email =
            document.getElementById("loginEmail");

        const pass =
            document.getElementById("loginPassword");

        let valid = true;



        // Email validation
        if (!pemail.test(email.value)) {

            showError(
                email,
                "LoginEmailError",
                "Valid email required"
            );

            valid = false;

        }
        else {
            showSuccess(email, "LoginEmailError");
        }



        // Password validation
        if (pass.value.length < 8) {

            showError(
                pass,
                "passwordError",
                "Min 8 characters"
            );

            valid = false;

        }
        else {
            showSuccess(pass, "passwordError");
        }



        // Login API
        if (valid) {

            try {

                const response =
                    await fetch(
                        CONFIG.BASE_URL + "/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify({
                                email: email.value,
                                password: pass.value
                            })

                        }
                    );

                const data =
                    await response.json();



                if (response.ok) {

                    localStorage.setItem(
                        "token",
                        data.accessToken
                    );

                    // QUICK QUIZZES LOAD AFTER LOGIN

                    if (window.loadQuickQuizzes) {

                        loadQuickQuizzes();

                    }

                    // localStorage.setItem(
                    //     "refreshToken",
                    //     data.refreshToken
                    // );

                    showUserMenu();
                    closeAll();

                    // 🔥 Generic hook: any page can define window.onLoginSuccess
                    // to resume whatever action (e.g. starting a quiz) triggered
                    // the login modal. Safe no-op if not defined.
                    if (typeof window.onLoginSuccess === "function") {
                        window.onLoginSuccess();
                    }

                    const pendingNoteId =
                        sessionStorage.getItem(
                            "pendingNoteId"
                        );

                    if (pendingNoteId) {

                        sessionStorage.removeItem(
                            "pendingNoteId"
                        );

                        window.location.href =
                            "payment.html?noteId=" +
                            pendingNoteId;

                        return;
                    }

                }
                else {

                    alert(
                        data.message ||
                        "Login failed ❌"
                    );

                }

            }
            catch (error) {

                alert("Server error ❌");

            }

        }

    });


// OTP send function start

async function sendOtp(email) {

    try {
        const res = await fetch(CONFIG.BASE_URL + "/auth/forgot-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ OTP sent to your registered email");

            // save email
            localStorage.setItem("resetEmail", email);

            // redirect
            window.location.href = "reset-password.html";

        } else {
            alert("❌ " + (data.message || "Failed"));
        }

    } catch (err) {
        alert("Server error ❌");
    }
}

// OTP send function end

async function authFetch(url, options = {}) {

    let token =
        localStorage.getItem("token");

    options.headers = {

        ...options.headers,

        "Authorization":
            "Bearer " + token,

        "Content-Type":
            "application/json"

    };



    let res =
        await fetch(
            CONFIG.BASE_URL + url,
            options
        );

    return res;

}


// ================================
// FORGOT PASSWORD
// ================================
document.getElementById("forgotForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("forgotEmail").value;

    try {
        const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();
        alert(data.message || "Reset link sent successfully!");

    } catch (error) {
        alert("Something went wrong. Please try again.");
    }
});


// =================================
// OTP VERIFY
// =================================
document.getElementById("otpForm")
    ?.addEventListener("submit", async function (e) {

        e.preventDefault();

        const otpInput =
            document.getElementById("otp");

        const email =
            localStorage.getItem("verifyEmail");

        if (!otpInput.value) {

            document.getElementById("otpError")
                .innerText = "Enter OTP";

            return;
        }

        try {

            const response =
                await fetch(
                    CONFIG.BASE_URL + "/auth/verify-otp",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({

                            email: email,
                            otp: otpInput.value.trim()

                        })

                    }
                );

            const data =
                await response.json();


            if (response.ok) {

                alert("✅ Email verified successfully");

                localStorage.removeItem(
                    "verifyEmail"
                );

                closeAll();

            }
            else {

                alert(
                    data.message ||
                    "Invalid OTP ❌"
                );

            }

        }
        catch (error) {

            alert("Server error ❌");

        }

    });

// ================= AUTO OPEN LOGIN =================

document.addEventListener("DOMContentLoaded", () => {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const token =
        localStorage.getItem("token");

    if (
        params.get("showLogin") === "true" &&
        !token
    ) {

        setTimeout(() => {

            openLogin();

        }, 300);

    }

});

// ================= SWITCH LOGIN TO SIGNUP =================

function switchToSignup() {

    document
        .getElementById("loginModal")
        .style.display = "none";

    document
        .getElementById("signupModal")
        .style.display = "flex";

}

// 🔥 CHANGED: this used to force-open the login modal on EVERY page
// (even for guests just browsing) 500ms after load. That breaks public
// browsing pages (course/paper/chapter/quiz listing) where guests must
// be allowed to look around without being interrupted.
// Any page that wants to stay guest-friendly can now set
// `window.SKIP_AUTO_LOGIN_POPUP = true` BEFORE this script runs
// (e.g. an inline <script> in <head>) to opt out. Pages that don't set
// this flag keep the exact original behaviour.
document.addEventListener("DOMContentLoaded", () => {

    const token =
        localStorage.getItem("token");

    if (!token && !window.SKIP_AUTO_LOGIN_POPUP) {

        setTimeout(() => {

            openLogin();

        }, 500);

    }

});

// ================= CLOSE MODAL WITH AUTH CHECK =================

function closeModal(modalId) {

    document
        .getElementById(modalId)
        .style.display = "none";

    const token =
        localStorage.getItem("token");

    // if the user is not logged in
    // and the signup modal was closed
    // reopen the login modal

    if (
        !token &&
        modalId === "signupModal"
    ) {

        openLogin();

    }

}

// ================= PASSWORD SHOW/HIDE (Login + Signup) =================

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
