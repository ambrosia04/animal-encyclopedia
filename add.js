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
        alert("Wrong secret code!");
        return;
    }

    status.innerText = "Uploading images...";
    const imageUrls = [];

    try {
        // 1. Upload Images
        for (const file of selectedFiles) {
            await githubPut(file.name, `Upload image ${file.name}`, file.content);
            imageUrls.push(file.name);
        }

        // 2. Get the current animals.json
        status.innerText = "Updating database...";
        const jsonPath = "data/animals.json";
        const fileData = await githubGet(jsonPath);
        
        // FIX: Remove newlines and handle UTF-8 decoding
        const decodedContent = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
        const currentAnimals = JSON.parse(decodedContent);

        // 3. Add the new animal
        const newAnimal = {
            scientific: document.getElementById("scientific").value,
            common: document.getElementById("common").value.split(",").map(x => x.trim()),
            description: document.getElementById("description").value,
            wikipedia: document.getElementById("wiki").value,
            images: imageUrls
        };

        currentAnimals.push(newAnimal);

        // 4. Update JSON on GitHub
        // FIX: Handle UTF-8 encoding for the update
        const updatedJson = JSON.stringify(currentAnimals, null, 2);
        const encodedJson = btoa(unescape(encodeURIComponent(updatedJson)));
        
        await githubPut(jsonPath, `Add animal ${newAnimal.scientific}`, encodedJson, fileData.sha);

        status.innerText = "Success! Animal added.";
        setTimeout(() => window.location.href = "index.html", 2000);

    } catch (err) {
        console.error(err);
        status.innerText = "Error: " + err.message;
    }
}

// GitHub API Helpers
async function githubGet(path) {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`;
    const res = await fetch(url, {
        headers: { "Authorization": `token ${CONFIG.token}` }
    });
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