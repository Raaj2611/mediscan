import { medications } from './medications.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let scanHistory = [];
let highContrast = false;

window.onload = async () => {
    document.getElementById('cameraButton').addEventListener('click', startCamera);
    document.getElementById('microphoneButton').addEventListener('click', startVoiceRecognition);

    await fetchMedications(); // Ensure medications data is loaded
};

function startCamera() {
    const video = document.getElementById('cameraFeed');
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Error accessing the camera: ", err);
            alert("Camera access is required for this application to work.");
        });
}

function captureImage() {
    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('cameraCanvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataURL = canvas.toDataURL('image/png');
    performOCR(imageDataURL);
}

function performOCR(imageDataURL) {
    Tesseract.recognize(
        imageDataURL,
        'eng',
        {
            logger: m => console.log(m)
        }
    ).then(({ data: { text } }) => {
        const filteredText = filterText(text);
        if (filteredText) {
            document.getElementById('outputText').innerText = filteredText;
            speakText(filteredText);
            addToHistory(filteredText); 
        } else {
            const message = "This is not a product of HTM Pharmacy";
            document.getElementById('outputText').innerText = message;
            speakText(message);
        }
    }).catch(err => {
        console.error("Error with OCR processing: ", err);
        document.getElementById('outputText').innerText = "Error processing image. Please try again.";
        speakText("There was an error processing the image. Please try again.");
    });
}
function filterText(text) {
    let medicationDetails = {
        name: 'N/A',
        dosage: 'N/A',
        supplier: 'N/A',
        brand: 'N/A'
    };

    medications.forEach(med => {
        if (text.includes(med.name)) {
            medicationDetails.name = med.name;
            medicationDetails.dosage = med.dosage;
            medicationDetails.supplier = med.supplier;
            medicationDetails.brand = med.brand;
        }
    });

    return `Medication Name: ${medicationDetails.name}\nDosage: ${medicationDetails.dosage}\nSupplier: ${medicationDetails.supplier}\nBrand: ${medicationDetails.brand}`;
}

function addToHistory(details) {
    scanHistory.push(details);
    updateHistoryList();
}

function updateHistoryList() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = ''; 
    scanHistory.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = entry;
        historyList.appendChild(li);
    });
}

function clearHistory() {
    scanHistory = []; 
    updateHistoryList(); 
}

function speakText(text) {
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
}

function startVoiceRecognition() {
    if (!SpeechRecognition) {
        console.error('SpeechRecognition is not supported in this browser.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command detected:', speechResult);

        if (speechResult.includes('start')) {
            greetUser();  
        } else if (speechResult.includes('scan')) {
            captureImage();  
        } else if (speechResult.includes('close')) {
            closeWebsite();  
        } else if (speechResult.includes('clear history')) {
            clearHistory();  
        } else if (speechResult.includes('toggle high contrast')) {
            toggleContrast();  
        } else if (speechResult.includes('turn off high contrast')) {
            turnOffContrast(); 
        } else if (speechResult.includes('large')) {
            changeTextSize('large'); 
        } else if (speechResult.includes('small')) {
            changeTextSize('small');  
        } else if (speechResult.includes('contact the pharmacy')) {
            contactPharmacy();  
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
    
        if (event.error === 'no-speech') {
            console.log("No speech detected. Please try again.");
            speakText("I didn't hear anything. Please try speaking again.");
        } else {
            speakText("");
        }
    };

    recognition.onend = () => {
        setTimeout(() => {
            recognition.start();
        }, 1000); 
    };
    
    recognition.start();  
}

function toggleContrast() {
    highContrast = !highContrast;
    document.body.classList.toggle('high-contrast', highContrast);
    const contrastMessage = highContrast ? "High contrast mode activated." : "High contrast mode deactivated.";
    speakText(contrastMessage);
}

function turnOffContrast() {
    if (highContrast) {
        toggleContrast(); 
        speakText("High contrast mode turned off.");
    }
}

function changeTextSize(size) {
    let textSize;
    if (size === 'large') {
        textSize = '20px';
    } else if (size === 'extra-large') {
        textSize = '24px';
    } else {
        textSize = '16px';  
    }
    document.body.style.fontSize = textSize;
    speakText(`Text size changed to ${size}`);
}

function closeWebsite() {
    const closingMessage = "Closing MediScan. Thank you for using the application!";
    speakText(closingMessage);

    setTimeout(() => {
        if (window.history.length > 1) {
            window.close();  
        } else {
            alert("Please close the tab or window manually.");
        }
    }, 3000); 
}

function greetUser() {
    const greetingMessage = "Welcome to MediScan! Please hold the medication packaging in front of the camera with the text side facing the camera. Ensure the packaging is well-lit and centered in the camera view for better scanning. When you are ready, just say 'scan'.";
    speakText(greetingMessage);
}

function contactPharmacy() {
    const phoneNumber = "+601137581642";
    const contactMessage = "Calling HTM Pharmacy. Please hold on...";
    speakText(contactMessage);
    window.location.href = `tel:${phoneNumber}`; 
}

async function fetchMedications() {
    try {
        const response = await fetch('http://localhost:3000/medications');
        const data = await response.json();
        medications = data;
    } catch (error) {
        console.error('Error fetching medications:', error);
    }
}

window.onload = async () => {
    startCamera();
    await fetchMedications(); 
    startVoiceRecognition();
};