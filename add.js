import { CODE } from './config.js';

const CONFIG = {
    token: CODE,
    owner: "ambrosia04",
    repo: "animal-encylopedia",
    secretCode: "mysecretcode"
};

let selectedFiles = [];

const grid = document.getElementById("image-grid");
const submitBtn = document.getElementById("submit-btn");

init();

function init(){

    const firstZone = grid.querySelector(".drop-zone");

    setupZone(firstZone);

    document.addEventListener("dragover", e => e.preventDefault());

    document.addEventListener("drop", handleDrop);

    submitBtn.addEventListener("click", submitAnimal);

}

function setupZone(zone){

    const input = zone.querySelector("input");

    zone.addEventListener("click", ()=>input.click());

    input.addEventListener("change", ()=>handleFile(input, zone));

}

function handleFile(input, zone){

    const file = input.files[0];
    if(!file) return;

    processFile(file, zone);

}

function handleDrop(e){

    e.preventDefault();

    const zone = e.target.closest(".drop-zone");

    if(!zone) return;

    const file = e.dataTransfer.files[0];

    if(!file) return;

    processFile(file, zone);

}

function processFile(file, zone){

    const reader = new FileReader();

    reader.onload = e => {

        const base64Data = e.target.result.split(",")[1];

        const preview = e.target.result;

        zone.classList.remove("plus-zone");

        zone.innerHTML = `<img src="${preview}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;

        selectedFiles.push({
            name: `images/${Date.now()}-${file.name.replace(/\s+/g,"_")}`,
            content: base64Data
        });

        addNewDropZone();

    };

    reader.readAsDataURL(file);

}

function addNewDropZone(){

    const zone = document.createElement("div");

    zone.className = "drop-zone plus-zone";

    zone.innerHTML = `
        <span>+</span>
        <input type="file" accept="image/*" hidden>
    `;

    grid.appendChild(zone);

    setupZone(zone);

}

async function submitAnimal(){

    const code = document.getElementById("code").value;

    const status = document.getElementById("status");

    if(code !== CONFIG.secretCode){
        alert("Wrong code");
        return;
    }

    if(selectedFiles.length === 0){
        alert("Add at least one image");
        return;
    }

    status.innerText = "Uploading images...";

    const imageUrls = [];

    try{

        for(const file of selectedFiles){

            await githubPut(file.name, `Upload image ${file.name}`, file.content);

            imageUrls.push(file.name);

        }

        status.innerText = "Updating database...";

        const jsonPath = "data/animals.json";

        const fileData = await githubGet(jsonPath);

        const base64Clean = fileData.content.replace(/\s/g,"");

        const json = atob(base64Clean);

        const currentAnimals = JSON.parse(json);

        const newAnimal = {

            scientific: document.getElementById("scientific").value,

            common: document.getElementById("common").value
                .split(",")
                .map(x=>x.trim())
                .filter(x=>x),

            description: document.getElementById("description").value,

            wikipedia: document.getElementById("wiki").value,

            images: imageUrls

        };

        currentAnimals.push(newAnimal);

        currentAnimals.sort((a,b)=>
            a.scientific.localeCompare(b.scientific)
        );

        const updatedJson = JSON.stringify(currentAnimals,null,2);

        const encoded = btoa(unescape(encodeURIComponent(updatedJson)));

        await githubPut(
            jsonPath,
            `Add animal ${newAnimal.scientific}`,
            encoded,
            fileData.sha
        );

        status.innerText = "Success! Site updates in ~1 minute.";

        setTimeout(()=>location.href="index.html",2500);

    }
    catch(err){

        console.error(err);

        status.innerText = "Error: " + err.message;

    }

}

async function githubGet(path){

    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`;

    const res = await fetch(url,{
        headers:{
            Authorization:`token ${CONFIG.token}`
        }
    });

    if(!res.ok) throw new Error("Could not find " + path);

    return res.json();

}

async function githubPut(path,message,content,sha=null){

    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`;

    const body = {message,content};

    if(sha) body.sha = sha;

    const res = await fetch(url,{
        method:"PUT",
        headers:{
            Authorization:`token ${CONFIG.token}`,
            "Content-Type":"application/json"
        },
        body:JSON.stringify(body)
    });

    if(!res.ok) throw new Error("GitHub upload failed");

    return res.json();

}