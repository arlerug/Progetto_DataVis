function initializeMatrixGraph(nodes, links) {
    var { width, height } = updateDimensions();
    d3.select("#Matrix-graph").remove(); // Rimuove la matrice precedente
    d3.select("#graph-container").style("display", "inline-block");

    const container = d3.select("#graph-container").append("div")
        .attr("id", "Matrix-graph")
        .style("visibility", "visible");

    const svg = container.append("svg")
        .attr("id", "matrix-svg")
        .attr("width", width)
        .attr("height", height + 50) // Aggiunto spazio per la legenda
        .attr("viewBox", `0 0 ${width} ${height + 50}`)
        .style("visibility", "visible")
        .style("display", "inline-block");

    // Estrai gli stati unici
    const states = nodes.map(d => d.id).sort(); // Ordinati alfabeticamente per coerenza

    // Crea una mappa per accesso rapido ai pesi
    const adjacencyMatrix = {};
    links.forEach(({ source, target, weight }) => {
        if (!adjacencyMatrix[source]) adjacencyMatrix[source] = {};
        if (!adjacencyMatrix[target]) adjacencyMatrix[target] = {};
        adjacencyMatrix[source][target] = weight;
        adjacencyMatrix[target][source] = weight; // Matrice simmetrica
    });

    const gridSize = Math.min(width, height) / (states.length + 2); // Dimensione delle celle

    // Scale per il colore (più scuro più alta la connessione)

    const maxWeight = d3.max(links, d => d.weight) || 1;
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(links, d => d.weight) || 1]);

    const g = svg.append("g")
        .attr("transform", `translate(${gridSize}, ${gridSize})`);

    // Disegna la matrice
    states.forEach((state, rowIndex) => {
        states.forEach((otherState, colIndex) => {
            const weight = adjacencyMatrix[state]?.[otherState] || 0;

            g.append("rect")
                .attr("x", colIndex * gridSize)
                .attr("y", rowIndex * gridSize)
                .attr("width", gridSize)
                .attr("height", gridSize)
                .attr("fill", colorScale(weight))
                .attr("stroke", "#ccc").on("mouseover", function () {
                    d3.select(this).attr("stroke", "red").attr("stroke-width", 2);
                })
                .on("mouseout", function () {
                    d3.select(this).attr("stroke", "#ccc").attr("stroke-width", 1);
                });
        });
    });

    // Aggiunge le etichette agli assi
    g.selectAll(".row-label")
        .data(states)
        .enter().append("text")
        .attr("x", -5)
        .attr("y", (_, i) => i * gridSize + gridSize / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "10px")
        .attr("fill", "black")
        .text(d => d);

    g.selectAll(".col-label")
        .data(states)
        .enter().append("text")
        .attr("x", (_, i) => i * gridSize + gridSize / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "hanging")
        .attr("font-size", "10px")
        .attr("fill", "black")
        .text(d => d)
        .attr("transform", (_, i) => `rotate(-45, ${i * gridSize + gridSize / 2}, -5)`);

            // Creazione della legenda per i colori
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = width / 2 - legendWidth / 2;
    const legendY = height + 20;

    const legendScale = d3.scaleLinear()
        .domain([0, maxWeight])
        .range([0, legendWidth]);

    const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    const gradient = svg.append("defs").append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxWeight));

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)")
        .attr("stroke", "#ccc");

    legend.append("text")
        .attr("x", 0)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "start")
        .attr("font-size", "10px")
        .text("Bassa");

    legend.append("text")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .text("Alta");

    function updateDimensions() {
        const width = Math.max(300, window.innerWidth / 3); // Almeno 300px di larghezza
        const height = width * 0.6; // Mantiene un rapporto 3:2
        return { width, height };
    }

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
    .force("link", d3.forceLink(links).id(d => d.id).strength(d => d.weight * 0.01))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(centerX, centerY)) // Più in alto e a sinistra
    .force("collision", d3.forceCollide().radius(30))
    .force("x", d3.forceX().x(d => Math.max(20, Math.min(width - 20, d.x))))
    .force("y", d3.forceY().y(d => Math.max(20, Math.min(height - 20, d.y))));

    // Disegna i collegamenti (links)
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke-width", d => Math.sqrt(d.weight) * 2);

    // Disegna i nodi
    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 8)
        .attr("fill", "#69b3a2")
        .call(drag(simulation));

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
        const width = Math.max(50, window.innerWidth / 0.7); // Almeno 300px di larghezza
        const height = width * 0.6; // Mantiene un rapporto 3:2
    
        return { width, height };
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



// Funzione per analizzare il dataset e generare nodi e collegamenti filtrati per anno
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

    // Convertiamo in array compatibile con D3.js
    let nodes = [...new Set(Object.keys(sharedPodiums).flatMap(k => k.split('-')))]
        .map(noc => ({ id: noc }));

    let links = Object.entries(sharedPodiums).map(([pair, count]) => {
        let [stato1, stato2] = pair.split('-');
        return { source: stato1, target: stato2, weight: count };
    });

    return { nodes, links };
}


// Funzione per creare il menù a tendina degli anni
function createYearDropdown(dataset) {
    const years = new Set();

    dataset.links.forEach(link => {
        link.attr.forEach(entry => {
            years.add(entry.year);
        });
    });

    const sortedYears = Array.from(years).sort();
    
    const select = document.createElement("select");
    select.id = "year-select";
    select.style.position = "absolute";
    select.style.top = "10px";
    select.style.visibility="visible";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Tutti gli anni";
    select.appendChild(defaultOption);

    sortedYears.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    });

    document.getElementById("graph-container").appendChild(select);

    select.addEventListener("change", (event) => {
        const selectedYear = event.target.value;
        const { nodes, links } = countSharedPodiums(dataset, selectedYear);
        initializeForceDirectedGraph(nodes, links);
        initializeMatrixGraph(nodes, links);
    });
}

// Fetch del dataset e creazione del grafo
fetch('Dataset.json')
    .then(response => response.json())
    .then(data => {
        createYearDropdown(data);
        const { nodes, links } = countSharedPodiums(data, null);
        initializeMatrixGraph(nodes, links);
        initializeForceDirectedGraph(nodes, links);
        
    })
    .catch(error => console.error('Errore nel caricamento del dataset:', error));
