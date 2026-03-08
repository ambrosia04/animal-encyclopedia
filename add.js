const CONFIG = {
    token: "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", // Create a token at github.com/settings/tokens
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

    if (selectedFiles.length === 0) {
        alert("Please add at least one image.");
        return;
    }

    status.innerText = "Uploading images...";
    const imageUrls = [];

    try {
        // 1. Upload each image to the /images folder
        for (const file of selectedFiles) {
            await githubPut(file.name, `Upload image ${file.name}`, file.content);
            imageUrls.push(file.name);
        }

        // 2. Get the current animals.json
        status.innerText = "Updating database...";
        const jsonPath = "data/animals.json";
        const fileData = await githubGet(jsonPath);
        const currentAnimals = JSON.parse(atob(fileData.content));

        // 3. Add the new animal
        const newAnimal = {
            scientific: document.getElementById("scientific").value,
            common: document.getElementById("common").value.split(",").map(x => x.trim()),
            description: document.getElementById("description").value,
            wikipedia: document.getElementById("wiki").value,
            images: imageUrls
        };

        currentAnimals.push(newAnimal);

        // 4. Push updated JSON back to GitHub
        const updatedJsonBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(currentAnimals, null, 2))));
        await githubPut(jsonPath, `Add animal ${newAnimal.scientific}`, updatedJsonBase64, fileData.sha);

        status.innerText = "Success! Animal added to GitHub.";
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