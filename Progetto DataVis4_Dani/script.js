// File: script.js Daniele

document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.getElementById("menu-button");
    const dropdownMenu = document.getElementById("dropdown-menu");
    const title = document.querySelector("header h1");
    const gridContainer = document.querySelector(".grid-container");
    const graphContainer = document.getElementById("graph-container");

    // Gestione del menu a tendina
    menuButton.addEventListener("click", () => {
        dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
    });

    // Aggiunge evento al titolo per resettare la vista
    title.addEventListener("click", () => {
        if (gridContainer.style.display === "none") {
            resetView();
        }
    });
});

// Funzione per resettare la schermata principale
function resetView() {
    const gridContainer = document.querySelector(".grid-container");
    const graphContainer = document.getElementById("graph-container");
    const sliderContainer = document.getElementById("slider-container");

    gridContainer.style.display = "grid"; // Mostra i pulsanti
    graphContainer.classList.remove("active"); // Rimuove la classe attiva
    graphContainer.innerHTML = ""; // Svuota i contenuti del contenitore

    if (sliderContainer) {
        sliderContainer.remove(); // Rimuove lo slider dal DOM
    }

    console.log("Schermata iniziale ripristinata.");
}


// Funzione per caricare le visualizzazioni dinamicamente
function showGraph(graphName) {
    const graphContainer = document.getElementById("graph-container");
    const gridContainer = document.querySelector(".grid-container");

    console.log(`Caricamento della visualizzazione: ${graphName}`);

    // Nascondi i pulsanti della griglia
    gridContainer.style.display = "none";

    // Mostra e resetta il contenitore della visualizzazione
    graphContainer.classList.add("active");
    graphContainer.innerHTML = ""; // Pulisce eventuali contenuti precedenti

    // Rimuovi script esistenti con lo stesso ID
    const existingScript = document.getElementById(`script-${graphName}`);
    if (existingScript) {
        existingScript.remove();
        console.log(`Rimosso script duplicato: script-${graphName}`);
    }

    // Carica dinamicamente lo script
    const script = document.createElement("script");
    script.src = `${graphName}.js`;
    script.id = `script-${graphName}`;
    script.onload = () => console.log(`${graphName}.js loaded successfully`);
    script.onerror = () => console.error(`Errore nel caricamento di ${graphName}.js`);
    document.body.appendChild(script);
}
