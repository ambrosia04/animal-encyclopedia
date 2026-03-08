//get code from .env

const CONFIG = {
    token: localStorage.getItem("github_token"),
    owner: "ambrosia04",
    repo: "animal-encylopedia",
    secretCode: "mysecretcode"
};

let selectedFiles = []; 
const imageGrid = document.getElementById('image-grid');

// --- IMAGE SELECTION LOGIC ---

// 1. Handle Clicks on the grid (to open file browser)
imageGrid.addEventListener('click', (e) => {
    const zone = e.target.closest('.plus-zone');
    if (zone) {
        zone.querySelector('input').click();
    }
});

// 2. Handle File selection (after click)
imageGrid.addEventListener('change', (e) => {
    if (e.target.tagName === 'INPUT') {
        handleFile(e.target);
    }
});

// 3. Handle Drag and Drop
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
    e.preventDefault();
    const zone = e.target.closest('.plus-zone');
    if (zone && e.dataTransfer.files.length > 0) {
        const input = zone.querySelector('input');
        input.files = e.dataTransfer.files;
        handleFile(input);
    }
});

function handleFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1];
        const previewUrl = e.target.result;

        // Display the image in the current box
        const zone = input.parentElement;
        zone.classList.remove('plus-zone');
        zone.innerHTML = `<img src="${previewUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
        
        // Save the data for upload
        selectedFiles.push({
            name: `images/${Date.now()}-${file.name.replace(/\s+/g, '_')}`,
            content: base64Data
        });

        // Add a NEW "+" box next to it
        addNewDropZone();
    };
    reader.readAsDataURL(file);
}

function addNewDropZone() {
    const newZone = document.createElement('div');
    newZone.className = 'drop-zone plus-zone';
    newZone.innerHTML = `
        <span>+</span>
        <input type="file" accept="image/*" style="display:none">
    `;
    imageGrid.appendChild(newZone);
}

// --- GITHUB SUBMISSION LOGIC ---

document.getElementById('submit-btn').onclick = async function() {
    const code = document.getElementById("code").value;
    const status = document.getElementById("status");

    if (code !== CONFIG.secretCode) {
        alert("Wrong secret code!");
        return;
    }

    if (selectedFiles.length === 0) {
        alert("Please add at least one image.");
        return;
    }

    status.innerText = "Uploading images...";
    const imageUrls = [];

    try {
        // 1. Upload Images
        for (const file of selectedFiles) {
            await githubPut(file.name, `Upload ${file.name}`, file.content);
            imageUrls.push(file.name);
        }

        // 2. Get animals.json
        status.innerText = "Updating database...";
        const jsonPath = "data/animals.json";
        const fileData = await githubGet(jsonPath);

        // --- FIX: The atob Error Fix ---
        // 1. Remove all whitespace/newlines from GitHub's Base64
        const base64Clean = fileData.content.replace(/\s/g, '');
        // 2. Convert to Byte array to handle special characters (UTF-8)
        const bytes = Uint8Array.from(atob(base64Clean), c => c.charCodeAt(0));
        const currentAnimals = JSON.parse(new TextDecoder().decode(bytes));
        // -------------------------------

        // 3. Add the new animal
        const newAnimal = {
            scientific: document.getElementById("scientific").value,
            common: document.getElementById("common").value.split(",").map(x => x.trim()).filter(x => x),
            description: document.getElementById("description").value,
            wikipedia: document.getElementById("wiki").value,
            images: imageUrls
        };
        currentAnimals.push(newAnimal);

        // 4. Push back to GitHub (Safe UTF-8 encoding)
        const updatedJson = JSON.stringify(currentAnimals, null, 2);
        const encodedJson = btoa(unescape(encodeURIComponent(updatedJson)));
        
        await githubPut(jsonPath, `Add animal ${newAnimal.scientific}`, encodedJson, fileData.sha);

        status.innerText = "Success! Animal added to GitHub.";
        setTimeout(() => window.location.href = "index.html", 2500);

    } catch (err) {
        console.error(err);
        status.innerText = "Error: " + err.message;
    }
};

// API Helpers
async function githubGet(path) {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`;
    const res = await fetch(url, { headers: { "Authorization": `token ${CONFIG.token}` } });
    if (!res.ok) throw new Error("Could not find file: " + path);
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