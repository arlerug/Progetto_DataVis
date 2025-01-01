document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.getElementById("menu-button");
    const dropdownMenu = document.getElementById("dropdown-menu");
    const title = document.querySelector("header h1");
    const gridContainer = document.querySelector(".grid-container");
    const graphContainer = document.getElementById("graph-container");

    // Gestione del menu
    menuButton.addEventListener("click", () => {
        if (dropdownMenu.style.display === "none" || dropdownMenu.style.display === "") {
            dropdownMenu.style.display = "block";
        } else {
            dropdownMenu.style.display = "none";
        }
    });

    // Aggiunge evento al titolo
    title.addEventListener("click", () => {
        if (gridContainer.style.display === "none") {
            // Se i pulsanti sono nascosti, ripristina la schermata iniziale
            resetView();
        } else {
            console.log("Pulsanti già visibili, nessuna azione necessaria.");
        }
    });
});

// Funzione per resettare la schermata
function resetView() {
    const gridContainer = document.querySelector(".grid-container");
    gridContainer.style.display = ""; // Mostra di nuovo i pulsanti

    const graphContainer = document.getElementById("graph-container");
    if (graphContainer) {
        graphContainer.style.display = "none"; // Nasconde il contenitore delle visualizzazioni
    }

    console.log("Schermata iniziale ripristinata.");
}

// Funzione che carica i file js delle visualizzazioni e nasconde i pulsanti
function showGraph(graphName) {
    const scriptId = `script-${graphName}`;
    const existingScript = document.getElementById(scriptId);

    // Nasconde i pulsanti
    const gridContainer = document.querySelector(".grid-container");
    gridContainer.style.display = "none";

    // Mostra o crea il contenitore per il grafico
    let graphContainer = document.getElementById("graph-container");
    if (!graphContainer) {
        graphContainer = document.createElement("div");
        graphContainer.id = "graph-container";
        graphContainer.style.textAlign = "center";
        document.body.appendChild(graphContainer);
    }
    graphContainer.style.display = "block";
    graphContainer.innerHTML = ""; // Pulisce il contenitore

    // Carica dinamicamente lo script se non esiste già
    if (!existingScript) {
        const script = document.createElement("script");
        script.src = `${graphName}.js`;
        script.id = scriptId;

        script.onload = () => {
            console.log(`${graphName}.js loaded successfully.`);
        };
        script.onerror = () => {
            console.error(`Error loading ${graphName}.js.`);
            graphContainer.innerHTML = `<p>Failed to load ${graphName} visualization.</p>`;
        };

        document.body.appendChild(script);
    }
}


