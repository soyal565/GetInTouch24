const BASE_URL = CONFIG.BASE_URL;


// ================= MARQUEE =================

// Public API (homepage ke liye)
export async function getMarquee() {

    const res = await fetch(BASE_URL + "/api/public/marquee/active");

    if (!res.ok) {
        throw new Error("Failed to fetch marquee");
    }

    return await res.json();
}


// ================= SLIDER =================

// Public API (homepage slider ke liye)
export async function getSliders() {

    const res = await fetch(BASE_URL + "/api/public/sliders/active");

    if (!res.ok) {
        throw new Error("Failed to fetch sliders");
    }

    return await res.json();
}