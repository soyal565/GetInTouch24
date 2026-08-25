// ==========================================================
// HOME PAGE - "Why Choose Our Platform" CARDS (DYNAMIC)
// Pulls only ACTIVE features so admin has full control of
// what shows on the home page, in what order.
//
// If CONFIG.BASE_URL already ends with "/api", change this to:
// const FEATURES_URL = CONFIG.BASE_URL + "/public/features/active";
// ==========================================================

const FEATURES_URL = CONFIG.BASE_URL + "/api/public/features/active";

document.addEventListener("DOMContentLoaded", loadHomeFeatures);

async function loadHomeFeatures() {

    const container = document.getElementById("featuresContainer");
    if (!container) return; // section not on this page

    try {

        const res = await fetch(FEATURES_URL);
        const data = await res.json();

        if (!res.ok || !Array.isArray(data)) {
            console.error("Failed to load features");
            return; // keep whatever fallback markup is already in the HTML
        }

        if (data.length === 0) {
            return; // no active features -> leave section as-is (or hide it)
        }

        // lowest displayOrder shows first
        data.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        container.innerHTML = data.map(renderFeatureCard).join("");

    } catch (err) {
        console.error("Error loading home page features:", err);
        // network/server error -> silently keep existing markup so the
        // page never looks broken to a visitor
    }
}

function renderFeatureCard(feature) {

    return `
        <div class="col-12 col-lg-4">
            <div class="card custom-card shadow">
                <img src="${escapeAttr(feature.imageUrl)}" class="card-img-top custom-img"
                     alt="${escapeAttr(feature.title)}"
                     onerror="this.src='images/placeholder.png'">
                <div class="card-body">
                    <h5>${escapeHtml(feature.title)}</h5>
                    <p class="card-text">${escapeHtml(feature.description)}</p>
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeAttr(str) {
    return escapeHtml(str).replaceAll('"', "&quot;");
}