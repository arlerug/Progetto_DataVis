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
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("visibility", "visible")
        .style("display", "inline-block");

    // Creazione del tooltip
    const tooltip = container.append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("visibility", "hidden")
        .style("font-size", "12px");

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
        .domain([0, maxWeight]);

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
                .attr("stroke", "#ccc")
                .on("mouseover", function (event) {
                    d3.select(this).attr("stroke", "red").attr("stroke-width", 2);
                    tooltip.style("visibility", "visible")
                        .text(`Peso: ${weight}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px");
                })
                .on("mousemove", function (event) {
                    tooltip.style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).attr("stroke", "#ccc").attr("stroke-width", 1);
                    tooltip.style("visibility", "hidden");
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

    function updateDimensions() {
        const width = Math.max(300, window.innerWidth); // Almeno 300px di larghezza
        const height = window.innerHeight; // Mantiene un rapporto 3:2
        return { width, height };
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

    let links = Object.entries(sharedPodiums)
        .filter(([_, count]) => count > 2) // Filtra solo coppie con peso maggiore di 2
        .map(([pair, count]) => {
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
        initializeMatrixGraph(nodes, links);
    });
}

// Fetch del dataset e creazione del grafo
fetch('Dataset.json')
    .then(response => response.json())
    .then(data => {
        createYearDropdown(data);
        const { nodes, links } = countSharedPodiums(data, null);
        //initializeForceDirectedGraph(nodes, links);
        initializeMatrixGraph(nodes, links);
    })
    .catch(error => console.error('Errore nel caricamento del dataset:', error));