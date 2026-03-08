const SECRET = "ambrosiaAnimalPage";

const OWNER = "YOUR_GITHUB_USERNAME";
const REPO = "animal-encyclopedia";
const FILE = "data/animals.json";

const TOKEN = "YOUR_GITHUB_TOKEN";

function addImage(){

const container = document.getElementById("imageContainer");

const input = document.createElement("input");

input.className = "imageInput";
input.placeholder = "Image URL";

container.appendChild(input);

}

async function submitAnimal(){

const code = document.getElementById("code").value;

if(code !== SECRET){
alert("Wrong code");
return;
}

const scientific = document.getElementById("scientific").value;

const common = document.getElementById("common").value
.split(",")
.map(x => x.trim())
.filter(x => x);

const description = document.getElementById("description").value;

const wiki = document.getElementById("wiki").value;

const images = [...document.querySelectorAll(".imageInput")]
.map(i => i.value)
.filter(i => i);

if(images.length === 0){
alert("At least one image required");
return;
}

const newAnimal = {
scientific,
common,
description,
wikipedia: wiki,
images
};

const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

const file = await fetch(url,{
headers:{
Authorization:`token ${TOKEN}`
}
}).then(r=>r.json());

const content = JSON.parse(atob(file.content));

content.push(newAnimal);

const updated = btoa(JSON.stringify(content,null,2));

await fetch(url,{
method:"PUT",
headers:{
Authorization:`token ${TOKEN}`,
"Content-Type":"application/json"
},
body:JSON.stringify({
message:`Add animal ${scientific}`,
content:updated,
sha:file.sha
})
});

document.getElementById("status").innerText="Animal added!";

}