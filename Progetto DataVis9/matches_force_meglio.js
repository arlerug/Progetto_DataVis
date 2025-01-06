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
    console.log("🔵 Inizializzazione del grafo...");

    // Rimuove eventuali grafici precedenti
    d3.select("#graph-container").select("#force-directed").remove();

    // Imposta le dimensioni dinamiche dell'SVG
    const width = window.innerWidth ;
    const height = window.innerHeight;


    // Crea l'elemento SVG all'interno del container
    const svg = d3.select("#graph-container")
        .append("svg")
        .attr("id", "force-directed")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block")
        .style("visibility", "visible");



    // Calcola il peso totale di ogni nodo
    let nodeWeights = {};
    links.forEach(link => {
        nodeWeights[link.source] = (nodeWeights[link.source] || 0) + link.weight;
        nodeWeights[link.target] = (nodeWeights[link.target] || 0) + link.weight;
    });

    // Ordina i nodi per peso decrescente (più connessi prima)
    nodes.sort((a, b) => (nodeWeights[b.id] || 0) - (nodeWeights[a.id] || 0));

    const centerY = window.innerHeight * 0.3;
    const centerX = window.innerWidth * 0.3;
    const maxRadius = Math.min(width, height) / 2.5; // Raggio massimo per i nodi periferici

    // Posizioniamo i nodi con più link al centro e quelli con meno link più in periferia
    nodes.forEach((node, index) => {
        let weight = nodeWeights[node.id] || 1;
        let normalizedWeight = weight / Math.max(...Object.values(nodeWeights));

        let radius = maxRadius * (1 - normalizedWeight); // Più peso -> più vicino al centro
        let angle = (index / nodes.length) * 2 * Math.PI;

        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
    });
    const zoomGroup = svg.append("g")
    .attr("class", "zoom-group");

// Configura lo zoom
const zoom = d3.zoom()
    .scaleExtent([0.5, 5]) // Zoom minimo 50%, massimo 500%
    .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform); // Applica la trasformazione
    });

// Abilita lo zoom sull’SVG
svg.call(zoom);

    const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links)
        .id(d => d.id)
        .strength(d => d.weight / 10) // Maggiore attrazione per link più pesanti
        .distance(d => Math.max(120, 4 * Math.max(8, nodeWeights[d.source.id] / 10), 4 * Math.max(8, nodeWeights[d.target.id] / 10))) // Distanza minima ancora più grande
    )
    .force("charge", d3.forceManyBody()
        .strength(d => -Math.max(200, 1000 / (nodeWeights[d.id] || 1))) // Maggiore repulsione tra nodi poco connessi
    )
    .force("center", d3.forceCenter(150, 70))
    .force("collision", d3.forceCollide()
        .radius(d => Math.max(8, nodeWeights[d.id] / 10) * 4) // Aumentata la distanza minima
    );
    
    let activeNode = null;
const tooltip = d3.select("body").append("div")
.attr("class", "tooltip")
.style("position", "absolute")
.style("background", "rgba(0, 0, 0, 0.7)")
.style("color", "#fff")
.style("padding", "6px")
.style("border-radius", "5px")
.style("font-size", "14px")
.style("visibility", "hidden");

// Disegna i collegamenti (linee tra i nodi)
const link = zoomGroup.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter().append("line")
    .attr("stroke", "#666")
    .attr("stroke-opacity", 0.9)
    .attr("stroke-width", d => Math.pow(d.weight, 1.3) / 10)
    .on("mouseover", (event, d) => {
        tooltip.style("visibility", "visible")
            .text(`Peso: ${d.weight}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
    })
    .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
    });

const node = zoomGroup.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("r", d => Math.max(5, nodeWeights[d.id] / 10))
    .attr("fill", "#1f77b4")
    .call(drag(simulation))
    .on("click", (event, d) => toggleHighlight(d.id));;

const label = zoomGroup.append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes)
    .enter().append("text")
    .attr("dx", 8)
    .attr("dy", 3)
    .text(d => d.id)
    .style("font-size", "12px")
    .style("fill", "#333");

    const initialScale = 1.5;
    const initialTransform = d3.zoomIdentity
    //.translate((width / 2) * (1 - initialScale), (height / 2) * (1 - initialScale))
    .scale(initialScale);

    svg.call(zoom.transform, initialTransform);

    // Aggiorna posizione dei nodi e collegamenti durante la simulazione
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    

    // Funzione per permettere il drag & drop dei nodi
    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

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
        
        info= countSharedPodiums(data, "2020");
        createYearDropdown(data);
        //initializeForceDirectedGraph(info.nodes, info.links);
    })
    .catch(error => console.error('Errore nel caricamento del dataset:', error));