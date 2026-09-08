// ============================================
// CAMPUSFLOW - EVENT SUBMISSION (FIXED)
// ============================================

// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = 'https://yfwxwqvksdsugxizaksj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vvacDvbRi-H7XcBesuCmmw_rcTe6gwO';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ CampusFlow Submission page ready!');

// ============================================
// DOM REFERENCES
// ============================================
const form = document.getElementById('eventForm');
const submitBtn = document.getElementById('submitBtn');
const messageEl = document.getElementById('message');
const successState = document.getElementById('successState');
const submittedEventId = document.getElementById('submittedEventId');
const resetBtn = document.getElementById('resetBtn');

// Form inputs
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const venueInput = document.getElementById('venue');
const dateInput = document.getElementById('eventDate');
const priceInput = document.getElementById('price');
const categoryInput = document.getElementById('category');
const organizerInput = document.getElementById('organizer');
const bankNameInput = document.getElementById('bankName');
const accountNameInput = document.getElementById('accountName');
const accountNumberInput = document.getElementById('accountNumber');

// File upload elements
const fileInput = document.getElementById('flyerInput');
const uploadArea = document.getElementById('uploadArea');
const fileNameDisplay = document.getElementById('fileName'); // ✅ FIXED: renamed to fileNameDisplay
const previewImage = document.getElementById('previewImage');

// ============================================
// STATE
// ============================================
let selectedFile = null;

// ============================================
// FILE UPLOAD HANDLING
// ============================================

// Click upload area to trigger file input
uploadArea.addEventListener('click', function() {
    fileInput.click();
});

// Handle file selection
fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ File too large! Maximum size is 5MB.');
        this.value = '';
        return;
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        alert('❌ Please upload a PNG or JPG image.');
        this.value = '';
        return;
    }

    // Save the file
    selectedFile = file;
    fileNameDisplay.textContent = '✅ ' + file.name;
    fileNameDisplay.style.color = '#10b981';

    // Show preview
    const reader = new FileReader();
    reader.onload = function() {
        previewImage.src = reader.result;
        previewImage.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Clear any previous messages
    hideMessage();
});

// Drag and drop support
uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.style.borderColor = '#667eea';
    this.style.background = '#f3f4ff';
});

uploadArea.addEventListener('dragleave', function() {
    this.style.borderColor = '#d1d5db';
    this.style.background = '#fafafa';
});

uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    this.style.borderColor = '#d1d5db';
    this.style.background = '#fafafa';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];

        // Validate file size
        if (file.size > 5 * 1024 * 1024) {
            alert('❌ File too large! Maximum size is 5MB.');
            return;
        }

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('❌ Please upload a PNG or JPG image.');
            return;
        }

        selectedFile = file;
        fileNameDisplay.textContent = '✅ ' + file.name;
        fileNameDisplay.style.color = '#10b981';

        const reader = new FileReader();
        reader.onload = function() {
            previewImage.src = reader.result;
            previewImage.style.display = 'block';
        };
        reader.readAsDataURL(file);

        hideMessage();
    }
});

// ============================================
// FORM SUBMISSION - FIXED VARIABLE NAMES
// ============================================
form.addEventListener('submit', async function(e) {
    // ✅ PREVENT PAGE REFRESH
    e.preventDefault();

    console.log('📝 Form submitted');

    // Validate file
    if (!selectedFile) {
        showMessage('Please upload an event flyer.', 'error');
        return;
    }

    // Gather form data
    const formData = {
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        venue: venueInput.value.trim(),
        event_date: dateInput.value,
        price: parseFloat(priceInput.value) || 0,
        category: categoryInput.value,
        organizer_name: organizerInput.value.trim(),
        bank_name: bankNameInput.value.trim(),
        account_name: accountNameInput.value.trim(),
        account_number: accountNumberInput.value.trim(),
    };

    // Validate required fields
    if (!formData.title || !formData.venue || !formData.event_date ||
        !formData.organizer_name || !formData.category ||
        !formData.bank_name || !formData.account_name || !formData.account_number) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }

    console.log('📋 Event Data:', formData);

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    hideMessage();

    try {
        // ============================================
        // STEP 1: Upload image to Supabase Storage
        // ============================================
        console.log('📤 Uploading image...');

        // ✅ FIXED: Renamed to uploadFileName to avoid conflict
        const fileExt = selectedFile.name.split('.').pop();
        const uploadFileName = 'flyer-' + Date.now() + '.' + fileExt;
        const filePath = 'flyers/' + uploadFileName;

        console.log('📤 File path:', filePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('event-posters')
            .upload(
                filePath,
                selectedFile, {
                    cacheControl: '3600',
                    upsert: false
                }
            );

        if (uploadError) {
            console.error('❌ UPLOAD ERROR:', uploadError);
            throw new Error('Image upload failed: ' + uploadError.message);
        }

        console.log('✅ IMAGE UPLOADED:', uploadData);

        // ============================================
        // STEP 2: Get public URL
        // ============================================
        const { data: urlData } = supabase.storage
            .from('event-posters')
            .getPublicUrl(filePath);

        const bannerUrl = urlData.publicUrl;
        console.log('🔗 Public URL:', bannerUrl);

        // ============================================
        // STEP 3: Save event to database
        // ============================================
        console.log('💾 Saving event to database...');
        const eventData = {
            title: formData.title,
            description: formData.description || null,
            venue: formData.venue,
            event_date: formData.event_date,
            price: formData.price,
            category: formData.category,
            organizer_name: formData.organizer_name,
            bank_name: formData.bank_name,
            account_name: formData.account_name,
            account_number: formData.account_number,
            banner_url: bannerUrl,
            is_published: false,
        };

        const { data: insertedEvent, error: insertError } = await supabase
            .from('events')
            .insert([eventData])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Database error:', insertError);
            throw new Error('Database error: ' + insertError.message);
        }
        console.log('✅ Event saved! ID:', insertedEvent.id);

        // ============================================
        // STEP 4: Show success
        // ============================================
        submittedEventId.textContent = '📋 Event ID: ' + insertedEvent.id;
        form.style.display = 'none';
        successState.style.display = 'block';
        console.log('🎉 Success! Event submitted!');

    } catch (error) {
        console.error('❌ Error:', error);
        showMessage(error.message || 'Something went wrong. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
});

// ============================================
// RESET FORM
// ============================================
resetBtn.addEventListener('click', function() {
    console.log('🔄 Reset form');

    // Hide success, show form
    successState.style.display = 'none';
    form.style.display = 'block';

    // Reset all form fields
    form.reset();

    // Reset file input
    fileInput.value = '';
    selectedFile = null;
    fileNameDisplay.textContent = 'No file selected';
    fileNameDisplay.style.color = '#6b7280';
    previewImage.style.display = 'none';

    // Reset submit button
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');

    // Clear messages
    hideMessage();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Show message
function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
}

// Hide message
function hideMessage() {
    messageEl.className = 'message';
    messageEl.textContent = '';
}

// ============================================
// SET DEFAULT DATE (7 days from now)
// ============================================
(function setDefaultDate() {
    const now = new Date();
    now.setDate(now.getDate() + 7);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    dateInput.value = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
})();

// ============================================
// CONSOLE LOGS FOR DEBUGGING
// ============================================
console.log('✅ CampusFlow Submission page ready!');
console.log('📌 Click the upload area to select an image');
console.log('📌 Form will NOT refresh on submit');