function countSharedPodiums(dataset, selectedYear) {
    let podiums = {}; // {sport, year} -> Set(NOC)
    let sharedPodiums = {}; // {stato1, stato2} -> count

    dataset.links.forEach(link => {
        link.attr.forEach(entry => {
            if (!selectedYear || entry.year === selectedYear) { 
                let key = `${entry.sport}-${entry.year}`;
                let noc = dataset.nodes.find(node => node.id === link.target)?.noc;

                if (noc) {
                    if (!podiums[key]) {
                        podiums[key] = new Set();
                    }
                    podiums[key].add(noc);
                }
            }
        });
    });

    Object.values(podiums).forEach(nocSet => {
        let nocArray = Array.from(nocSet);
        for (let i = 0; i < nocArray.length; i++) {
            for (let j = i + 1; j < nocArray.length; j++) {
                let pairKey = `${nocArray[i]}-${nocArray[j]}`;
                if (!sharedPodiums[pairKey]) {
                    sharedPodiums[pairKey] = 0;
                }
                sharedPodiums[pairKey]++;
            }
        }
    });

// Ordina le coppie in base al peso (dal più alto al più basso)
const sortedPairs = Object.entries(sharedPodiums)
    .sort((a, b) => b[1] - a[1]); // Ordina per peso decrescente

let selectedPairs = [];
let selectedNations = new Set();

for (let [pair, count] of sortedPairs) {
    let [stato1, stato2] = pair.split('-');

    // Aggiungi la coppia solo se mantiene massimo 10 nazioni uniche
    if (selectedNations.size < 10 || (selectedNations.has(stato1) && selectedNations.has(stato2))) {
        selectedPairs.push([pair, count]);
        selectedNations.add(stato1);
        selectedNations.add(stato2);

        // Se abbiamo 10 nazioni uniche, interrompiamo il ciclo
        if (selectedNations.size >= 10) break;
    }
}

// Crea un nuovo oggetto con solo le coppie selezionate
sharedPodiums = Object.fromEntries(selectedPairs);




    // Convertiamo in array compatibile con D3.js
    let nodes = [...new Set(Object.keys(sharedPodiums).flatMap(k => k.split('-')))]
        .map(noc => ({ id: noc }));

    let links = Object.entries(sharedPodiums).map(([pair, count]) => {
        let [stato1, stato2] = pair.split('-');
        return { source: stato1, target: stato2, weight: count };
    });

    return { nodes, links };
}

function initializeForceDirectedGraph(nodes, links) {
    // Rimuove eventuali grafici precedenti
    d3.select("#graph-container").select("#force-directed").remove();
    


    var { width, height } = updateDimensions();
    // Creazione del contenitore SVG dentro #graph-container
    const svg = d3.select("#graph-container").append("div")
        .attr("id", "force-directed")
        .attr("width", "60%")
        .attr("height", innerHeight)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("visibility", "visible")
        .append("svg")
        .attr("id", "force-directed-svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("visibility", "visible");
    
    
 // Definisce il centro il più in alto e a sinistra possibile, senza uscire
const centerY = Math.max(50, Math.min(height * 0.3, height - 200));
const centerX = Math.max(50, Math.min(width * 0.3, width - 200));

const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id)
    .strength(d => 1 / (1 + Math.exp(-0.1 * (d.weight - 5)))) // Bilancia attrazione
    .distance(d => 200 / Math.sqrt(d.weight + 1)) // Maggiore peso -> distanza più corta
    )

    .force("charge", d3.forceManyBody().strength(d => -30 - (d.weight * 5))) 
    .force("center", d3.forceCenter(centerX, centerY)) // Più in alto e a sinistra
    .force("collision", d3.forceCollide().radius(30))
    .force("x", d3.forceX().strength(0.05).x(d => width / 2))
    .force("y", d3.forceY().strength(0.05).y(d => height / 2));

    const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "white")
    .style("padding", "5px 10px")
    .style("border-radius", "5px")
    .style("font-size", "12px")
    .style("visibility", "hidden")
    .style("pointer-events", "none");

    // Disegna i collegamenti (links)
    const link = svg.append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .enter().append("line")
    .attr("stroke-width", d => Math.max(1, d.weight * 0.2))
    .on("mouseover", function (event, d) {
        tooltip.style("visibility", "visible")
            .text(`Link tra ${d.source.id} e ${d.target.id} - Peso: ${d.weight}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
    })
    .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
    });

    // Disegna i nodi
    const node = svg.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("r", 8)
    .attr("fill", "#69b3a2")
    .call(drag(simulation))
    .on("click", function (event, d) {
        toggleHighlight(d.id);
    });



    // Aggiunta delle etichette ai nodi
    const labels = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .text(d => d.id)
        .attr("font-size", "12px")
        .attr("fill", "black");

    // Simulazione degli aggiornamenti
    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels.attr("x", d => d.x + 10)
              .attr("y", d => d.y + 5);
    });

    function updateDimensions() {
        const width = Math.max(50, window.innerWidth/0.7 ); // Almeno 300px di larghezza
        const height = width * 0.6; // Mantiene un rapporto 3:2
    
        return { width, height };
    }
    let activeNode = null; // Per sapere se un nodo è attivo o no

function toggleHighlight(nodeId) {
    if (activeNode === nodeId) {
        // Se il nodo è già attivo, ripristina tutto
        link.style("opacity", 1);
        node.style("opacity", 1);
        activeNode = null;
    } else {
        // Altrimenti, mostra solo i link che coinvolgono questo nodo
        activeNode = nodeId;

        link.style("opacity", d => {
            const isVisible = d.source.id === nodeId || d.target.id === nodeId;
            if (!isVisible) {
                d3.select(this).on("mouseover", null).on("mousemove", null).on("mouseout", null); // Disabilita tooltip
            } else {
                d3.select(this)
                    .on("mouseover", function (event, d) {
                        tooltip.style("visibility", "visible")
                            .text(`Link tra ${d.source.id} e ${d.target.id} - Peso: ${d.weight}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY + 10) + "px");
                    })
                    .on("mousemove", function (event) {
                        tooltip.style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY + 10) + "px");
                    })
                    .on("mouseout", function () {
                        tooltip.style("visibility", "hidden");
                    });
            }
            return isVisible ? 1 : 0.1;
        });

        node.style("opacity", d => {
            return (d.id === nodeId || links.some(l => (l.source.id === nodeId || l.target.id === nodeId) && (l.source.id === d.id || l.target.id === d.id))) ? 1 : 0.1;
        });

        // Nasconde il tooltip se il link è nascosto
        tooltip.style("visibility", "hidden");
    }
}

    // Funzione per il drag dei nodi
    function drag(simulation) {
        function dragStarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = Math.max(20, Math.min(width - 20, event.x));
            d.fy = Math.max(20, Math.min(height - 20, event.y));
        }

        function dragEnded(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded);
    }
    
}

function createYearDropdown(dataset) {
    const years = new Set();

    dataset.links.forEach(link => {
        link.attr.forEach(entry => {
            years.add(entry.year);
        });
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a); // Ordina gli anni dal più recente al più vecchio
    const latestYear = sortedYears[0]; // Prendi l'anno più recente

    const select = document.createElement("select");
    select.id = "year-select";
    select.style.position = "absolute";
    select.style.top = "10px";
    select.style.visibility = "visible";
    select.style.display = "block";

    sortedYears.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    });

    document.getElementById("graph-container").appendChild(select);

    // Imposta il valore di default sull'ultimo anno disponibile
    select.value = latestYear;

    // Carica il grafo con l'ultimo anno disponibile all'avvio
    const { nodes, links } = countSharedPodiums(dataset, latestYear);
    initializeForceDirectedGraph(nodes, links);

    select.addEventListener("change", (event) => {
        const selectedYear = event.target.value;
        const { nodes, links } = countSharedPodiums(dataset, selectedYear);
        initializeForceDirectedGraph(nodes, links);
    });
}


fetch('Dataset.json')
    .then(response => response.json())
    .then(data => {
        createYearDropdown(data);
        info= countSharedPodiums(data);
        initializeForceDirectedGraph(info.nodes, info.links);
    })
    .catch(error => console.error('Errore nel caricamento del dataset:', error));
