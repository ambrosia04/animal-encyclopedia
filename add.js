import { CODE } from './config.js';
const CONFIG = {
    token: CODE, // get token from config.js
    owner: "ambrosia04", // Your GitHub username or org
    repo: "animal-encylopedia", // Your repository name
    secretCode: "mysecretcode"
};
let selectedFiles = []; 

// 1. CLICK TO OPEN FILE EXPLORER
function triggerInput(el) {
    const input = el.querySelector('input');
    if (input) input.click();
}

// 2. HANDLE FILE SELECTION (Click or Drop)
function handleFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1];
        const previewUrl = e.target.result;

        // Update the current box to show the image
        const zone = input.parentElement;
        zone.classList.remove('plus-zone');
        zone.onclick = null; // Disable clicking this specific image to change it
        zone.innerHTML = `<img src="${previewUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
        
        // Save to our array
        selectedFiles.push({
            name: `images/${Date.now()}-${file.name.replace(/\s+/g, '_')}`,
            content: base64Data
        });

        // Add a NEW "+" box
        addNewDropZone();
    };
    reader.readAsDataURL(file);
}

// 3. ADD NEW "+" BOX
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

// 4. DRAG AND DROP LOGIC
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
    e.preventDefault();
    const zone = e.target.closest('.drop-zone');
    if (zone) {
        const input = zone.querySelector('input');
        if (input) {
            input.files = e.dataTransfer.files;
            handleFile(input);
        }
    }
});

// 5. SUBMIT TO GITHUB
async function submitAnimal() {
    const code = document.getElementById("code").value;
    const status = document.getElementById("status");

    if (code !== CONFIG.secretCode) {
        alert("Wrong code");
        return;
    }

    if (selectedFiles.length === 0) {
        alert("Please add at least one image");
        return;
    }

    status.innerText = "Uploading images...";
    const imageUrls = [];

    try {
        // Upload images one by one
        for (const file of selectedFiles) {
            await githubPut(file.name, `Upload image ${file.name}`, file.content);
            imageUrls.push(file.name);
        }

        status.innerText = "Updating database...";
        const jsonPath = "data/animals.json";
        const fileData = await githubGet(jsonPath);
        
        // Robust Decoding
        const base64Clean = fileData.content.replace(/\s/g, '');
        const dataUri = `data:application/json;base64,${base64Clean}`;
        const response = await fetch(dataUri);
        const currentAnimals = await response.json();

        // New Animal Data
        const newAnimal = {
            scientific: document.getElementById("scientific").value,
            common: document.getElementById("common").value.split(",").map(x => x.trim()).filter(x => x),
            description: document.getElementById("description").value,
            wikipedia: document.getElementById("wiki").value,
            images: imageUrls
        };

        currentAnimals.push(newAnimal);

        // Robust Encoding
        const updatedJson = JSON.stringify(currentAnimals, null, 2);
        const encodedJson = btoa(unescape(encodeURIComponent(updatedJson)));
        
        await githubPut(jsonPath, `Add animal ${newAnimal.scientific}`, encodedJson, fileData.sha);

        status.innerText = "Success! Site will update in ~1 minute.";
        setTimeout(() => window.location.href = "index.html", 2500);

    } catch (err) {
        console.error(err);
        status.innerText = "Error: " + err.message;
    }
}

// HELPERS
async function githubGet(path) {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`;
    const res = await fetch(url, { headers: { "Authorization": `token ${CONFIG.token}` } });
    if (!res.ok) throw new Error("Could not find " + path);
    return res.json();
}

async function githubPut(path, message, content, sha = null) {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`;
    const body = { message, content };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
        method: "PUT",
        headers: { "Authorization": `token ${CONFIG.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return res.json();
}