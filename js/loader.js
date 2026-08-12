// ================= CREATE LOADER =================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const html = `

<div id="globalLoader">

    <div class="loader-spinner"></div>

</div>

`;

        document.body.insertAdjacentHTML(
            "beforeend",
            html
        );

        showLoader();

    }
);


// ================= SHOW =================

function showLoader() {

    const loader =
        document.getElementById(
            "globalLoader"
        );

    if (loader) {

        loader.style.display =
            "flex";

        loader.style.opacity =
            "1";

    }

}


// ================= HIDE =================

function hideLoader() {

    const loader =
        document.getElementById(
            "globalLoader"
        );

    if (loader) {

        loader.style.opacity =
            "0";

        setTimeout(() => {

            loader.style.display =
                "none";

        }, 300);

    }

}


// ================= FETCH TRACKER =================

let activeRequests = 0;

const originalFetch =
    window.fetch;

window.fetch = async (...args) => {

    activeRequests++;

    showLoader();

    try {

        const response =
            await originalFetch(...args);

        return response;

    }

    catch (err) {

        throw err;

    }

    finally {

        activeRequests--;

        checkAllLoaded();

    }

};


// ================= CHECK =================

function checkAllLoaded() {

    if (
        document.readyState === "complete"
        &&
        activeRequests === 0
    ) {

        setTimeout(() => {

            hideLoader();

        }, 500);

    }

}


// ================= PAGE LOAD =================

window.addEventListener(
    "load",
    () => {

        checkAllLoaded();

    }
);