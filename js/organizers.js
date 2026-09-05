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
let organizerGroups = [];
let searchQuery = "";

// ============================================
// LOAD EVENTS, GROUP BY ORGANIZER
// ============================================
async function loadOrganizers() {
    const { data, error } = await sb
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        document.getElementById("organizersContainer").innerHTML = `
            <div class="empty-state">Error loading organizers: ${error.message}</div>
        `;
        return;
    }

    const groups = {};
    (data || []).forEach(event => {
        const key = (event.organizer_name || "Unknown").trim();
        if (!groups[key]) {
            groups[key] = {
                name: key,
                events: [],
                bankInfo: null
            };
        }
        groups[key].events.push(event);

        // Keep the most recent ticketed event's bank details on file for this organizer
        if (!event.is_free && event.bank_name && !groups[key].bankInfo) {
            groups[key].bankInfo = {
                bank_name: event.bank_name,
                account_name: event.account_name,
                account_number: event.account_number
            };
        }
    });

    organizerGroups = Object.values(groups).sort((a, b) => b.events.length - a.events.length);
    renderOrganizers();
}

// ============================================
// RENDER
// ============================================
function renderOrganizers() {
    const container = document.getElementById("organizersContainer");
    const resultsCount = document.getElementById("resultsCount");

    let groups = organizerGroups;
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        groups = groups.filter(g => g.name.toLowerCase().includes(q));
    }

    resultsCount.innerText = `${groups.length} organizer${groups.length === 1 ? "" : "s"}`;

    if (groups.length === 0) {
        container.innerHTML = `<div class="empty-state">No organizers found.</div>`;
        return;
    }

    container.innerHTML = groups.map(group => {
        const approvedCount = group.events.filter(e => e.is_published).length;
        const ticketedCount = group.events.filter(e => !e.is_free).length;
        const freeCount = group.events.filter(e => e.is_free).length;

        const bankHtml = group.bankInfo
            ? `
                <div class="organizer-bank">
                    <p class="bank-label">💳 Payout details on file</p>
                    <p><strong>Bank:</strong> ${group.bankInfo.bank_name || 'N/A'}</p>
                    <p><strong>Account Name:</strong> ${group.bankInfo.account_name || 'N/A'}</p>
                    <p><strong>Account Number:</strong> ${group.bankInfo.account_number || 'N/A'}</p>
                </div>
            `
            : `<div class="organizer-bank empty">No bank details on file (only submitted free events so far)</div>`;

        const eventsListHtml = group.events.map(e => `
            <li>
                ${e.is_free ? '🎉' : '🎟️'} ${e.title}
                <span class="mini-status ${e.is_published ? 'approved' : 'pending'}">
                    ${e.is_published ? 'Approved' : 'Pending'}
                </span>
            </li>
        `).join('');

        return `
            <div class="organizer-card">
                <div class="organizer-header">
                    <h3>👤 ${group.name}</h3>
                    <div class="organizer-tags">
                        <span class="tag">${group.events.length} event${group.events.length === 1 ? '' : 's'}</span>
                        <span class="tag">${approvedCount} approved</span>
                        ${ticketedCount > 0 ? `<span class="tag ticket">${ticketedCount} ticketed</span>` : ''}
                        ${freeCount > 0 ? `<span class="tag free">${freeCount} free</span>` : ''}
                    </div>
                </div>
                ${bankHtml}
                <ul class="organizer-events">
                    ${eventsListHtml}
                </ul>
            </div>
        `;
    }).join('');
}

// ============================================
// SEARCH
// ============================================
document.getElementById("searchInput").addEventListener("input", function() {
    searchQuery = this.value;
    renderOrganizers();
});

// ============================================
// START
// ============================================
loadOrganizers();
