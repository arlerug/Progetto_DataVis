document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.getElementById("menu-button");
    const dropdownMenu = document.getElementById("dropdown-menu");
    const title = document.querySelector("header h1");
    const gridContainer = document.querySelector(".grid-container");
    const graphContainer = document.getElementById("graph-container");
    const body=document.querySelector("body")


    

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
// Funzione per resettare la schermata
function resetView() {
    const gridContainer = document.querySelector(".grid-container");
    gridContainer.style.display = ""; // Mostra di nuovo i pulsanti
    const graphContainer = document.getElementById("graph-container");

    const drop2= document.querySelector("#dropdownContainer");
    if (drop2) { 
        drop2.remove(); 
    }
    
    
    if (graphContainer) {
        // Rimuove tutti gli elementi <svg> all'interno di graphContainer
        graphContainer.innerHTML = "";
        graphContainer.style.display = "none"; // Nasconde il contenitore delle visualizzazioni
    }

    const sliderContainer = document.getElementById("slider-container");
    if (sliderContainer) {
        sliderContainer.style.visibility = "hidden"; // Nasconde il contenitore degli slider
    }

    // Rimuove tutti gli script della visualizzazione tranne il principale
    const scripts = document.body.querySelectorAll("script.graph-script");
    scripts.forEach(script => {
        if (!script.src.includes("script.js")) {
            script.remove();
            console.log(`Script ${script.src} rimosso.`);
        }
    });

    console.log("Schermata iniziale ripristinata, SVG rimossi e script puliti.");
}

// Funzione che carica i file js delle visualizzazioni e nasconde i pulsanti
function showGraph(graphName) {
    const scriptId = `script-${graphName}`;
    const existingScript = document.getElementById(scriptId);
    const body = document.querySelector("body");
    body.style.backgroundColor = "transparent";
    body.style.backgroundImage = "none";
    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule("body::before { content: none !important; }", styleSheet.cssRules.length);
    

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
        script.className = "graph-script";

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


