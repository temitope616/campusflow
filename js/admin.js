


// Check Login
async function checkLogin(){

const { data:{session} } =
await sb.auth.getSession();

if(!session){

window.location.href="login.html";

}

}

checkLogin();


// Logout
document
.getElementById("logoutBtn")
.onclick = async ()=>{

await sb.auth.signOut();

window.location.href="login.html";

};


// Load Events
async function loadEvents(){

const { data, error } =
await sb
.from("events")
.select("*")
.order("created_at",{ascending:false});

if(error){

console.log(error);

return;

}

document.getElementById("totalEvents").innerText =
data.length;

document.getElementById("pendingEvents").innerText =
data.filter(e=>!e.is_published).length;

document.getElementById("approvedEvents").innerText =
data.filter(e=>e.is_published).length;

const container =
document.getElementById("eventsContainer");

container.innerHTML="";

data.forEach(event=>{

container.innerHTML += `

<div class="event-card">

<img src="${event.banner_url}">

<h2>${event.title}</h2>

<p><strong>Organizer:</strong>
${event.organizer_name}</p>

<p><strong>Venue:</strong>
${event.venue}</p>

<p><strong>Date:</strong>
${event.event_date}</p>

<p><strong>Price:</strong>
₦${event.price}</p>

<p><strong>Status:</strong>

${event.is_published
? "✅ Approved"
: "⏳ Pending"}

</p>

<div class="buttons">

<button
class="approve"
onclick="approveEvent('${event.id}')">

Approve

</button>

<button
class="reject"
onclick="rejectEvent('${event.id}')">

Reject

</button>

<button
class="delete"
onclick="deleteEvent('${event.id}')">

Delete

</button>

</div>

</div>

`;

});

}

loadEvents();


// APPROVE
async function approveEvent(id){

await sb

.from("events")

.update({

is_published:true

})

.eq("id",id);

loadEvents();

}


// REJECT
async function rejectEvent(id){

await sb

.from("events")

.update({

is_published:false

})

.eq("id",id);

loadEvents();

}


// DELETE
async function deleteEvent(id){

if(!confirm("Delete this event?")) return;

await sb

.from("events")

.delete()

.eq("id",id);

loadEvents();

}