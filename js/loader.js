// ================= CREATE LOADER =================

document.addEventListener("DOMContentLoaded", () => {
    const html = `
<div id="globalLoader">
    <div class="loader-spinner"></div>
</div>
`;
    document.body.insertAdjacentHTML("beforeend", html);
    showLoader();
});

// ================= SHOW / HIDE =================

let activeRequests = 0;

function showLoader() {
    activeRequests++;
    const loader = document.getElementById("globalLoader");
    if (loader) {
        loader.style.display = "flex";
        loader.style.opacity = "1";
    }
}

function hideLoader() {
    activeRequests = Math.max(0, activeRequests - 1);
    if (activeRequests === 0) {
        const loader = document.getElementById("globalLoader");
        if (loader) {
            loader.style.opacity = "0";
            setTimeout(() => {
                if (activeRequests === 0) {
                    loader.style.display = "none";
                }
            }, 300);
        }
    }
}

// ================= GENERIC WRAPPER (use this everywhere) =================
// Kisi bhi async kaam ke liye use karo — button click, login, data fetch, kuch bhi.
// Loader ke saath-saath, agar button diya to usko bhi auto disable/enable karega.

async function withLoader(asyncFn, button = null) {

    if (button) {
        button.disabled = true;
        button.dataset.originalText = button.dataset.originalText || button.innerHTML;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Please wait...`;
    }

    showLoader();

    try {
        return await asyncFn();
    } finally {
        hideLoader();
        if (button) {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// ================= FETCH TRACKER (backup, auto-catches raw fetch calls) =================

const originalFetch = window.fetch;

window.fetch = async (...args) => {
    showLoader();
    try {
        return await originalFetch(...args);
    } finally {
        hideLoader();
    }
};

// ================= INITIAL PAGE LOAD =================

window.addEventListener("load", () => {
    hideLoader(); // matches the showLoader() called on DOMContentLoaded
});