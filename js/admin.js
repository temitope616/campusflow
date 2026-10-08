// Check Login
async function checkLogin() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = "login.html";
    }
}

checkLogin();

// Logout
document.getElementById("logoutBtn").onclick = async () => {
    await sb.auth.signOut();
    window.location.href = "login.html";
};

// ============================================
// GLOBAL PLATFORM FEE (site_settings table)
// ============================================
let globalPlatformFee = 100; // fallback until loaded

async function loadGlobalFee() {
    const { data, error } = await sb
        .from("site_settings")
        .select("platform_fee")
        .eq("id", 1)
        .single();

    if (error || !data) {
        console.warn("Could not load site_settings — using default ₦100. " +
            "Run setup-site-settings-table.sql in Supabase if you haven't yet.");
        document.getElementById("globalFeeInput").value = globalPlatformFee;
        return;
    }

    globalPlatformFee = Number(data.platform_fee);
    document.getElementById("globalFeeInput").value = globalPlatformFee;
}

document.getElementById("saveFeeBtn").addEventListener("click", async () => {
    const input = document.getElementById("globalFeeInput");
    const newFee = Number(input.value);

    if (isNaN(newFee) || newFee < 0) {
        alert("Please enter a valid fee amount.");
        return;
    }

    const { error } = await sb
        .from("site_settings")
        .update({ platform_fee: newFee, updated_at: new Date().toISOString() })
        .eq("id", 1);

    if (error) {
        alert("Could not save fee: " + error.message +
            "\n\nIf this is the first time, run setup-site-settings-table.sql in your Supabase SQL Editor first.");
        return;
    }

    globalPlatformFee = newFee;
    const savedMsg = document.getElementById("feeSavedMsg");
    savedMsg.style.display = "inline";
    setTimeout(() => (savedMsg.style.display = "none"), 2000);
});

// ============================================
// LOAD EVENTS
// ============================================
let allEventsCache = [];
let currentFilter = "pending";
let currentSearch = "";

async function loadEvents() {
    const { data, error } = await sb
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.log(error);
        return;
    }

    allEventsCache = data || [];

    document.getElementById("totalEvents").innerText = allEventsCache.length;
    document.getElementById("pendingEvents").innerText = allEventsCache.filter(e => !e.is_published).length;
    document.getElementById("approvedEvents").innerText = allEventsCache.filter(e => e.is_published).length;

    document.getElementById("tabCountPending").innerText = allEventsCache.filter(e => !e.is_published).length;
    document.getElementById("tabCountApproved").innerText = allEventsCache.filter(e => e.is_published).length;
    document.getElementById("tabCountAll").innerText = allEventsCache.length;

    renderEvents();
}

function renderEvents() {
    const container = document.getElementById("eventsContainer");

    let filtered = allEventsCache;
    if (currentFilter === "pending") filtered = filtered.filter(e => !e.is_published);
    if (currentFilter === "approved") filtered = filtered.filter(e => e.is_published);

    if (currentSearch.trim()) {
        const q = currentSearch.trim().toLowerCase();
        filtered = filtered.filter(e =>
            (e.title || "").toLowerCase().includes(q) ||
            (e.organizer_name || "").toLowerCase().includes(q) ||
            (e.venue || "").toLowerCase().includes(q)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-msg">No events in "${currentFilter}" right now.</div>`;
        return;
    }

    container.innerHTML = filtered.map(event => {
        const chargeFee = event.charge_platform_fee !== false;
        return `
        <div class="event-row">
            <img src="${event.banner_url || ''}" onerror="this.style.display='none'">

            <div class="info">
                <h3>${event.title}</h3>
                <p><strong>Organizer:</strong> ${event.organizer_name || '—'}</p>
                <p><strong>Venue:</strong> ${event.venue || '—'}</p>
                <p><strong>Date:</strong> ${event.event_date ? new Date(event.event_date).toLocaleString() : '—'}</p>
                <p><strong>Price:</strong> ₦${event.price || 0}${event.is_free ? ' (Free event)' : ''}</p>
                <span class="status-pill ${event.is_published ? 'approved' : 'pending'}">
                    ${event.is_published ? '✅ Approved' : '⏳ Pending'}
                </span>
            </div>

            <label class="fee-toggle">
                <input type="checkbox" ${chargeFee ? 'checked' : ''}
                    onchange="toggleFee('${event.id}', ${chargeFee})">
                Charge platform fee
            </label>

            <div class="buttons">
                ${!event.is_published
                    ? `<button class="approve" onclick="approveEvent('${event.id}')">Approve</button>`
                    : `<button class="reject" onclick="rejectEvent('${event.id}')">Unapprove</button>`
                }
                <button class="delete" onclick="deleteEvent('${event.id}')">Delete</button>
            </div>
        </div>
        `;
    }).join("");
}

// Tabs
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderEvents();
    });
});

// Search
document.getElementById("searchInput").addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderEvents();
});

loadGlobalFee();
loadEvents();

// ============================================
// TOGGLE PLATFORM FEE FOR ONE EVENT
// ============================================
async function toggleFee(id, currentlyCharging) {
    const newValue = !currentlyCharging;

    const { error } = await sb
        .from("events")
        .update({ charge_platform_fee: newValue })
        .eq("id", id);

    if (error) {
        alert("Could not update fee setting: " + error.message);
        return;
    }

    loadEvents();
}

// APPROVE
async function approveEvent(id) {
    await sb.from("events").update({ is_published: true }).eq("id", id);
    loadEvents();
}

// REJECT / UNAPPROVE
async function rejectEvent(id) {
    await sb.from("events").update({ is_published: false }).eq("id", id);
    loadEvents();
}

// DELETE
async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    await sb.from("events").delete().eq("id", id);
    loadEvents();
}