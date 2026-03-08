import { CODE } from './config.js';
const CONFIG = {
    token: CODE, // get token from config.js
    owner: "ambrosia04", // Your GitHub username or org
    repo: "animal-encylopedia", // Your repository name
    secretCode: "mysecretcode"
};

let selectedFiles = []; // Stores { name, base64 }

function triggerInput(el) {
    el.querySelector('input').click();
}

function handleFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1];
        const previewUrl = e.target.result;

        // Display the image in the current box
        const zone = input.parentElement;
        zone.innerHTML = `<img src="${previewUrl}">`;
        
        // Save the data
        selectedFiles.push({
            name: `images/${Date.now()}-${file.name}`,
            content: base64Data
        });

        // Add a NEW "+" box next to it
        addNewDropZone();
    };
    reader.readAsDataURL(file);
}

function addNewDropZone() {
    const grid = document.getElementById('image-grid');
    const newZone = document.createElement('div');
    newZone.className = 'drop-zone plus-zone';
    newZone.onclick = function() { triggerInput(this); };
    newZone.innerHTML = `
        <span>+</span>
        <input type="file" accept="image/*" onchange="handleFile(this)" style="display:none">
    `;
    grid.appendChild(newZone);
}

// Drag and drop listeners
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
    e.preventDefault();
    if (e.target.closest('.drop-zone')) {
        const input = e.target.closest('.drop-zone').querySelector('input');
        input.files = e.dataTransfer.files;
        handleFile(input);
    }
});

async function submitAnimal() {
    const code = document.getElementById("code").value;
    const status = document.getElementById("status");

    if (code !== CONFIG.secretCode) {
        alert("Wrong code");
        return;
    }

    status.innerText = "Check console for debug info...";

    try {
        // 1. Upload Images
        const imageUrls = [];
        for (const file of selectedFiles) {
            console.log("Uploading image:", file.name);
            await githubPut(file.name, `Upload image ${file.name}`, file.content);
            imageUrls.push(file.name);
        }

        // 2. Get animals.json
        console.log("Step 2: Fetching data/animals.json from GitHub...");
        const jsonPath = "data/animals.json";
        const fileData = await githubGet(jsonPath);

        console.log("RAW CONTENT FROM GITHUB:", fileData.content);

        // --- DEBUG DECODING ---
        // 1. Clean the string
        const base64Clean = fileData.content.replace(/\s/g, ''); 
        console.log("CLEANED BASE64 (No whitespace):", base64Clean);

        try {
            // 2. Try the Data URI method (Better for UTF-8)
            console.log("Attempting decode via Data URI...");
            const dataUri = `data:application/json;base64,${base64Clean}`;
            const response = await fetch(dataUri);
            
            if (!response.ok) {
                throw new Error("Data URI fetch failed. The Base64 might be corrupt.");
            }

            const currentAnimals = await response.json();
            console.log("SUCCESSFULLY DECODED JSON:", currentAnimals);

            // 3. Add the new animal
            const newAnimal = {
                scientific: document.getElementById("scientific").value,
                common: document.getElementById("common").value.split(",").map(x => x.trim()).filter(x => x),
                description: document.getElementById("description").value,
                wikipedia: document.getElementById("wiki").value,
                images: imageUrls
            };

            currentAnimals.push(newAnimal);

            // 4. Update GitHub
            console.log("Step 4: Encoding updated list and pushing to GitHub...");
            const jsonString = JSON.stringify(currentAnimals, null, 2);
            const encodedJson = btoa(unescape(encodeURIComponent(jsonString)));
            
            await githubPut(jsonPath, `Add animal ${newAnimal.scientific}`, encodedJson, fileData.sha);

            status.innerText = "Animal added successfully!";
            setTimeout(() => window.location.href = "index.html", 2000);

        } catch (decodeError) {
            console.error("DECODE FAILED:", decodeError);
            // Fallback: If Data URI fails, let's see what atob thinks
            console.log("Manual atob attempt:", atob(base64Clean));
            throw decodeError;
        }

    } catch (err) {
        console.error("FINAL ERROR:", err);
        status.innerText = "Error: " + err.message + " (Check Console)";
    }
}

// GitHub API Helpers (Updated to handle errors better)
async function githubGet(path) {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`;
    const res = await fetch(url, {
        headers: { "Authorization": `token ${CONFIG.token}` }
    });
    if (!res.ok) throw new Error(`Could not find file: ${path}. Make sure it exists!`);
    return res.json();
}

async function githubPut(path, message, content, sha = null) {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`;
    const body = {
        message: message,
        content: content
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": `token ${CONFIG.token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    return res.json();
}