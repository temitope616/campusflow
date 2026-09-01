// ============================================
// SUPABASE SETUP
// ============================================
const MY_URL = "https://yfwxwqvksdsugxizaksj.supabase.co";
const MY_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmd3h3cXZrc2RzdWd4aXpha3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3OTA4NDcsImV4cCI6MjEwMTM2Njg0N30.Kp-rHr5Vr1p9-osaDK1fMj8i2e8mbaTMDnT6RoG2dPc";
const sb = window.supabase.createClient(MY_URL, MY_KEY);

console.log("✅ CampusFlow Ready");

// ============================================
// DOM ELEMENTS
// ============================================
const formWrap = document.getElementById("formWrapper");
const formEl = document.getElementById("eventForm");
const uploadEl = document.getElementById("uploadArea");
const fileInputEl = document.getElementById("flyerInput");
const fileNameEl = document.getElementById("fileName");
const previewEl = document.getElementById("previewImage");
const msgEl = document.getElementById("message");
const successEl = document.getElementById("successState");
const resetEl = document.getElementById("resetBtn");
const submitEl = document.getElementById("submitBtn");
const eventIdEl = document.getElementById("submittedEventId");

let myFile = null;

// ============================================
// FILE SELECTION
// ============================================
uploadEl.addEventListener("click", () => fileInputEl.click());

fileInputEl.addEventListener("change", (e) => {

    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showMsg("Maximum file size is 5MB.", "error");
        return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
        showMsg("Only PNG and JPG images are allowed.", "error");
        return;
    }

    myFile = file;

    fileNameEl.textContent = "✅ " + file.name;
    fileNameEl.className = "file-status has-file";

    const reader = new FileReader();

    reader.onload = function () {
        previewEl.src = reader.result;
        previewEl.style.display = "block";
    };

    reader.readAsDataURL(file);

    showMsg("", "");
});

// ============================================
// FORM SUBMIT
// ============================================
formEl.addEventListener("submit", async function (e) {

    e.preventDefault();

    if (!myFile) {
        showMsg("Please upload an event flyer.", "error");
        return;
    }

    submitEl.disabled = true;
    submitEl.classList.add("loading");

    try {

        // Upload image
        const extension = myFile.name.split(".").pop();

        const filePath = `flyers/flyer-${Date.now()}.${extension}`;

        const { data: uploadData, error: uploadError } =
            await sb.storage
                .from("event-posters")
                .upload(filePath, myFile);

            if (uploadError) {
                console.log(uploadError);
                alert(uploadError.message);
                return;
            }

        // Get public URL
        const { data: imageURL } =
            sb.storage
                .from("event-posters")
                .getPublicUrl(filePath);

        // Save to database
        const { data: event, error: dbError } =
            await sb
                .from("events")
                .insert([{

                    title: document.getElementById("title").value.trim(),

                    description:
                        document.getElementById("description").value.trim(),

                    venue:
                        document.getElementById("venue").value.trim(),

                    event_date:
                        document.getElementById("eventDate").value,

                    price:
                        Number(document.getElementById("price").value),

                    organizer_name:
                        document.getElementById("organizer").value.trim(),

                    bank_account:
                        document.getElementById("bankAccount").value.trim(),

                    banner_url:
                        imageURL.publicUrl,

                    is_published: false

                }])
                .select()
                .single();

        if (dbError) throw dbError;

        // SUCCESS MESSAGE
        showMsg("✅ Event submitted successfully!", "success");

        setTimeout(() => {

            formWrap.classList.add("hidden");

            successEl.style.display = "block";

            eventIdEl.textContent =
                "📋 Event ID: " + event.id;

        }, 1500);

    } catch (error) {

        console.error(error);

        showMsg(error.message, "error");

    } finally {

        submitEl.disabled = false;
        submitEl.classList.remove("loading");

    }

});

// ============================================
// RESET FORM
// ============================================
resetEl.addEventListener("click", () => {

    successEl.style.display = "none";

    formWrap.classList.remove("hidden");

    formEl.reset();

    myFile = null;

    fileInputEl.value = "";

    previewEl.style.display = "none";

    fileNameEl.textContent = "";

    fileNameEl.className = "file-status";

    showMsg("", "");

});

// ============================================
// MESSAGE FUNCTION
// ============================================
function showMsg(message, type) {

    if (!message) {
        msgEl.textContent = "";
        msgEl.className = "message";
        return;
    }

    msgEl.textContent = message;
    msgEl.className = "message " + type;

}

// ============================================
// DEFAULT DATE
// ============================================
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 7);

document.getElementById("eventDate").value =
tomorrow.toISOString().slice(0,16);