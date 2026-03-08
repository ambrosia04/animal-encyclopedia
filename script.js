let animals = [];

fetch("data/animals.json")
.then(res => res.json())
.then(data => {

animals = data.sort((a,b) =>
a.scientific.localeCompare(b.scientific)
);

if (document.getElementById("search")) {
initSearch();
}

if (window.location.pathname.includes("animal.html")) {
loadAnimal();
}

});

function initSearch(){

const search = document.getElementById("search");
const suggestions = document.getElementById("suggestions");

search.addEventListener("input", () => {

const text = search.value.toLowerCase();

suggestions.innerHTML = "";

animals
.filter(a =>
a.scientific.toLowerCase().includes(text) ||
a.common.some(c => c.toLowerCase().includes(text))
)
.slice(0,10)
.forEach(a => {

const li = document.createElement("li");

li.textContent = a.scientific;

li.onclick = () => {
window.location = "animal.html?name=" + encodeURIComponent(a.scientific);
};

suggestions.appendChild(li);

});

});

}

function loadAnimal(){

const params = new URLSearchParams(window.location.search);
const name = params.get("name");

const index = animals.findIndex(a => a.scientific === name);

const animal = animals[index];

document.getElementById("scientific").textContent = animal.scientific;

document.getElementById("common").textContent =
animal.common.join(", ");

document.getElementById("description").textContent =
animal.description;

document.getElementById("wiki").href = animal.wikipedia;

const imgDiv = document.getElementById("images");

animal.images.forEach(src => {

const img = document.createElement("img");

img.src = src;

imgDiv.appendChild(img);

});

if(index > 0){
document.getElementById("prev").textContent =
animals[index-1].scientific;

document.getElementById("prev").href =
"animal.html?name=" +
encodeURIComponent(animals[index-1].scientific);
}

if(index < animals.length-1){
document.getElementById("next").textContent =
animals[index+1].scientific;

document.getElementById("next").href =
"animal.html?name=" +
encodeURIComponent(animals[index+1].scientific);
}

}