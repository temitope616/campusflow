// ============================================
// CHECK LOGIN (fail-safe: any error also redirects)
// ============================================
async function checkLogin() {
    try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (error || !session) {
            window.location.href = "login.html";
        }
    } catch (err) {
        console.error("Auth check failed, redirecting to login:", err);
        window.location.href = "login.html";
    }
}

checkLogin();

// ============================================
// LOGOUT
// ============================================
document.getElementById("logoutBtn").onclick = async () => {
    await sb.auth.signOut();
    window.location.href = "login.html";
};

// ============================================
// STATE
// ============================================
let allEvents = [];
let searchQuery = "";

// ============================================
// LOAD EVENTS
// ============================================
async function loadEvents() {
    const { data, error } = await sb
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    allEvents = data || [];

    document.getElementById("totalEvents").innerText = allEvents.length;
    document.getElementById("pendingEvents").innerText = allEvents.filter(e => !e.is_published).length;
    document.getElementById("approvedEvents").innerText = allEvents.filter(e => e.is_published).length;

    renderEvents();
}

// ============================================
// RENDER EVENTS (respects the current search query)
// ============================================
function renderEvents() {
    const container = document.getElementById("eventsContainer");
    const resultsCount = document.getElementById("resultsCount");

    let events = allEvents;

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        events = events.filter(e =>
            (e.title || "").toLowerCase().includes(q) ||
            (e.organizer_name || "").toLowerCase().includes(q) ||
            (e.venue || "").toLowerCase().includes(q)
        );
    }

    resultsCount.innerText = searchQuery.trim()
        ? `${events.length} result${events.length === 1 ? "" : "s"}`
        : `${events.length} total`;

    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:40px;margin-bottom:10px;">🔍</div>
                <p>No events match your search.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="event-card">
            <img src="${event.banner_url || ''}" alt="${event.title}" onerror="this.style.display='none'">
            <div class="event-body">
                <h2>${event.title}</h2>
                <p><strong>Organizer:</strong> ${event.organizer_name}</p>
                <p><strong>Venue:</strong> ${event.venue}</p>
                <p><strong>Date:</strong> ${event.event_date ? new Date(event.event_date).toLocaleString() : 'N/A'}</p>
                <p><strong>Price:</strong> ₦${event.price}</p>
                <span class="status-pill ${event.is_published ? 'approved' : 'pending'}">
                    ${event.is_published ? '✅ Approved' : '⏳ Pending'}
                </span>
                <div class="buttons">
                    <button class="approve" onclick="approveEvent('${event.id}')">Approve</button>
                    <button class="reject" onclick="rejectEvent('${event.id}')">Reject</button>
                    <button class="delete" onclick="deleteEvent('${event.id}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// SEARCH
// ============================================
document.getElementById("searchInput").addEventListener("input", function() {
    searchQuery = this.value;
    renderEvents();
});

// ============================================
// APPROVE / REJECT / DELETE
// ============================================
async function approveEvent(id) {
    await sb.from("events").update({ is_published: true }).eq("id", id);
    loadEvents();
}

async function rejectEvent(id) {
    await sb.from("events").update({ is_published: false }).eq("id", id);
    loadEvents();
}

async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    await sb.from("events").delete().eq("id", id);
    loadEvents();
}

// ============================================
// VIEWER / USER STATS
// "Viewers" = every visit logged (site_visits row count)
// "Users"   = distinct device_id values among those rows
// ============================================
async function loadVisitStats() {
    try {
        const { count, error: countError } = await sb
            .from("site_visits")
            .select("*", { count: "exact", head: true });

        if (countError) throw countError;

        const { data: idsData, error: idsError } = await sb
            .from("site_visits")
            .select("device_id");

        if (idsError) throw idsError;

        const uniqueUsers = new Set((idsData || []).map(r => r.device_id)).size;

        document.getElementById("totalViewers").innerText = count || 0;
        document.getElementById("totalUsers").innerText = uniqueUsers;
    } catch (err) {
        console.error("Error loading visit stats (has the site_visits table been created yet?):", err);
        document.getElementById("totalViewers").innerText = "—";
        document.getElementById("totalUsers").innerText = "—";
    }
}

// ============================================
// START
// ============================================
loadEvents();
loadVisitStats();

// Keep stats fresh without needing a manual refresh
setInterval(loadVisitStats, 30000);
