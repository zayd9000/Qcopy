const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startCameraBtn = document.getElementById('start-camera-btn');
const captureBtn = document.getElementById('capture-btn');
const fileUpload = document.getElementById('file-upload');
const cameraContainer = document.getElementById('camera-container');
const loadingStatus = document.getElementById('loading-status');
const statusText = document.getElementById('status-text');
const resultContainer = document.getElementById('result-container');
const resultText = document.getElementById('result-text');
const manualCopyBtn = document.getElementById('manual-copy-btn');
const historyList = document.getElementById('history-list');
const toast = document.getElementById('toast');

let stream = null;

// Initialize app data loading
document.addEventListener('DOMContentLoaded', loadHistory);

// Streamline Hardware Camera Connection
startCameraBtn.addEventListener('click', async () => {
    resultContainer.classList.add('hidden');
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }, // Targets back camera on smartphones
            audio: false
        });
        video.srcObject = stream;
        cameraContainer.classList.remove('hidden');
        startCameraBtn.textContent = "🔄 Reset Camera";
    } catch (err) {
        alert("Camera Access Error: Please check device permissions or verify your URL runs on HTTPS.");
    }
});

// Capture Snapshot from Camera Feed
captureBtn.addEventListener('click', () => {
    if (!stream) return;
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    
    // Shut off camera sensor feed to maximize performance
    stream.getTracks().forEach(track => track.stop());
    cameraContainer.classList.add('hidden');
    startCameraBtn.textContent = "📷 Open Camera";
    
    processImageOCR(imageDataUrl);
});

// File Upload Event Handling
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        processImageOCR(event.target.result);
    };
    reader.readAsDataURL(file);
});

// Processing Data with Tesseract Engine & Clipboard Writing
async function processImageOCR(dataUrl) {
    loadingStatus.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    statusText.textContent = "Initializing Engine...";

    try {
        // Run completely engine locally inside client browser instance
       const worker = await Tesseract.createWorker(['eng', 'ara']);
        statusText.textContent = "Analyzing & Transcribing Text...";
        
        const ret = await worker.recognize(dataUrl);
        const textResult = ret.data.text.trim();
        await worker.terminate();

        loadingStatus.classList.add('hidden');

        if (textResult.length === 0) {
            alert("No text detected in this frame. Try again with a clearer picture.");
            return;
        }

        // Output Result & Trigger Copy Event
        resultText.value = textResult;
        resultContainer.classList.remove('hidden');
        copyTextToClipboard(textResult);

        // Save entry to Local Storage array
        saveToHistory(dataUrl, textResult);

    } catch (error) {
        loadingStatus.classList.add('hidden');
        alert("An error occurred during text extraction processing.");
        console.error(error);
    }
}

// Global Clipboard Logic & Quick-Feedback Popups
function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast();
    }).catch(err => {
        console.error('Failed to copy text automatically: ', err);
    });
}

function showToast() {
    toast.classList.remove('hidden');
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2000);
}

manualCopyBtn.addEventListener('click', () => copyTextToClipboard(resultText.value));

// Browser Storage Database Engine Interactions (Local Storage Array Parsing)
function saveToHistory(imgBase64, parsedText) {
    let currentHistory = JSON.parse(localStorage.getItem('scan_history')) || [];
    
    const newRecord = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        image: imgBase64,
        text: parsedText
    };

    // Prepend to display latest elements first
    currentHistory.unshift(newRecord);
    
    // Safety clamp: keep max 30 records to protect storage size capacity bounds
    if (currentHistory.length > 30) currentHistory.pop();

    localStorage.setItem('scan_history', JSON.stringify(currentHistory));
    loadHistory();
}

function loadHistory() {
    const currentHistory = JSON.parse(localStorage.getItem('scan_history')) || [];
    
    if (currentHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-message">No scans saved yet.</p>';
        return;
    }

    historyList.innerHTML = currentHistory.map(item => `
        <div class="history-card">
            <img src="${item.image}" class="history-thumb" alt="Scan Thumbnail">
            <div class="history-info">
                <span class="history-date">${item.timestamp}</span>
                <p class="history-snippet">${escapeHtml(item.text)}</p>
            </div>
            <button class="history-action-btn" onclick="copyTextToClipboard(\`${escapeJsString(item.text)}\`)">📋 Copy</button>
        </div>
    `).join('');
}

// Utility string escaping helpers to safe-guard DOM parsing
function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function escapeJsString(str) {
    return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}
// Native Mobile Share System
const shareBtn = document.getElementById('share-btn');

// Native Mobile Share System
const shareBtn = document.getElementById('share-btn');

// Native Mobile Share System (Safari-Optimized)
const shareBtn = document.getElementById('share-btn');

if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        // Fetch the value directly inside the event listener so Safari doesn't block it
        const textToShare = document.getElementById('result-text').value;
        
        if (!textToShare) {
            alert("No text detected to share yet!");
            return;
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    text: textToShare
                });
            } catch (err) {
                console.log("Share sheet dismissed:", err);
            }
        } else {
            alert("Native sharing isn't supported on this browser. The text is already copied to your clipboard, so you can paste it manually!");
        }
    });
}
