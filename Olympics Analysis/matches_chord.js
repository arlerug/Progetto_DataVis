let globalSharedPodiums = {};
let cellValue = null;
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "8px")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("visibility", "hidden");

// CREA BOUNDING BOX
function updateSizes() {
    const body = d3.select("body");
    const containerWidth = body.node().getBoundingClientRect().width / 1.1;
    const containerHeight = body.node().getBoundingClientRect().width / 2.5;

    const graphContainer = d3.select("#graph-container")
        .style("visibility", "visible")
        .style("width", containerWidth + "px")
        .style("height", containerHeight + "px")
        .style("display", "flex")  
        .style("flex-direction", "row") 
        .style("gap", "10px"); 

    // Calcola le dimensioni proporzionali
    const Width = containerWidth * 0.45; 
    const Height = containerHeight;      

    // Aggiorna le dimensioni dei contenitori
    d3.select(".chord-container")
        .style("width", Width + "px")
        .style("height", Height + "px")
        .style("flex", "1.3"); 
    d3.select(".matrix-container")
        .style("width", Width + "px")
        .style("height", Height + "px")
        .style("flex", "1"); 

        function updateLegendScale() {
            const legendWidth = Math.min(d3.select(".matrix-container").node().getBoundingClientRect().width * 0.6, 300);
            const maxValue = d3.max(Object.values(globalSharedPodiums)) || 1; 
            const legendScale = d3.scaleLinear().domain([0, maxValue]).range([0, legendWidth]);
        
            // Recupera il valore attuale
            let indicatorX = 0; 
        
            if (typeof cellValue !== "undefined" && cellValue !== null) {
                indicatorX = legendScale(cellValue);
            }
        
            d3.select("#legend-indicator")
                .attr("x1", indicatorX)
                .attr("x2", indicatorX)
                .style("visibility", cellValue !== null ? "visible" : "hidden");
        }
        
        

        updateLegendScale();


}

// Crea il contenitore solo se non esiste
if (d3.select("#graph-container").empty()) {
    d3.select("body").append("div").attr("id", "graph-container");
}

// Crea gli elementi solo se non esistono già
if (d3.select(".chord-container").empty()) {
    d3.select("#graph-container").append("div").attr("class", "chord-container");
}
if (d3.select(".matrix-container").empty()) {
    d3.select("#graph-container").append("div").attr("class", "matrix-container");
}


updateSizes();



window.addEventListener("resize", () => {
    updateSizes();
   
});



//CALCOLA COPPIE
function countSharedPodiums(dataset, selectedYear) {
    let medalCounts = new Map(); 
    let podiums = new Map(); 
    let sharedPodiums = new Map(); 
    let nationPodiumCounts = new Map(); 

    // Conta le medaglie vinte per ogni nazione nell'anno selezionato
    dataset.links.forEach(link => {
        link.attr.forEach(entry => {
            if (entry.year === selectedYear) {
                let id = dataset.nodes.find(node => node.id === link.target)?.id;
                if (id) {
                    medalCounts.set(id, (medalCounts.get(id) || 0) + 1);
                }
            }
        });
    });

    // Seleziona le prime 10 nazioni con più medaglie nell'anno selezionato
    let topNations = new Set([...medalCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => entry[0]));

    // Raccoglie i podi condivisi tra le 10 nazioni selezionate
    dataset.links.forEach(link => {
        link.attr.forEach(entry => {
            if (entry.year === selectedYear) {
                let key = `${entry.sport}-${entry.year}-${entry.athlete.sex}`;
                let id = dataset.nodes.find(node => node.id === link.target)?.id;
                
                if (id && topNations.has(id)) {
                    if (!podiums.has(key)) {
                        podiums.set(key, new Set());
                    }
                    podiums.get(key).add(id);
                }
            }
        });
    });

    // Conta i podi condivisi tra le 10 nazioni selezionate e aggiorna i contatori per nazione
    podiums.forEach(nocSet => {
        let nocArray = Array.from(nocSet);
        for (let i = 0; i < nocArray.length; i++) {
            for (let j = i + 1; j < nocArray.length; j++) {
                let stato1 = nocArray[i];
                let stato2 = nocArray[j];
                let pairKey = [stato1, stato2].sort().join('-');
                
                sharedPodiums.set(pairKey, (sharedPodiums.get(pairKey) || 0) + 1);
                
                
                nationPodiumCounts.set(stato1, (nationPodiumCounts.get(stato1) || 0) + 1);
                nationPodiumCounts.set(stato2, (nationPodiumCounts.get(stato2) || 0) + 1);
            }
        }
    });

    // Ordina le nazioni in base al numero di podi condivisi
    let sortedNations = Array.from(nationPodiumCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => ({ id: entry[0], sharedPodiums: entry[1] }));

    // Ordina le coppie di nazioni per numero di podi condivisi
    let sortedPairs = [];
    sortedNations.forEach(nation => {
        let nationPairs = Array.from(sharedPodiums.entries())
            .filter(([pair, _]) => pair.includes(nation.id));
        sortedPairs.push(...nationPairs);
        sharedPodiums = new Map([...sharedPodiums].filter(([pair, _]) => !pair.includes(nation.id)));
    });

    // Converti in array compatibile con D3.js
    let nodes = sortedNations.map(entry => ({ id: entry.id }));
    let links = sortedPairs.map(([pair, count]) => {
        let [stato1, stato2] = pair.split('-');
        return { source: stato1, target: stato2, weight: count };
    });

    console.log("Nodes (Sorted Nations):", nodes);
    console.log("Links (Sorted Shared Podiums):", links);
    return { nodes, links, sharedPodiums: Object.fromEntries(sortedPairs) };
}



function drawChordDiagram(sharedPodiums, nodes, links) {
    
    const container = d3.select(".chord-container");
    const containerWidth = container.node().getBoundingClientRect().width;
    const containerHeight = container.node().getBoundingClientRect().height;
    const size = Math.min(containerWidth, containerHeight) * 0.9; // Margini di sicurezza
    let highlightedNation = null;

    
    container.select("svg").remove();

    
    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${containerWidth / 2}, ${containerHeight / 2})`);

    
    const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(nodes.map(d => d.id));

    
    const nodeIndex = new Map(nodes.map((d, i) => [d.id, i]));

    
    var matrix = Array(nodes.length).fill().map(() => Array(nodes.length).fill(0));

    links.forEach(link => {
        const i = nodeIndex.get(link.source);
        const j = nodeIndex.get(link.target);
        matrix[i][j] = link.weight;
        matrix[j][i] = link.weight; 
    });

    const linearScale = d3.scaleLinear()
    .domain([d3.min(links, d => d.weight) -2, d3.max(links, d => d.weight)]) 
    .range([1, size ]); 

// Copia della matrice originale per applicare la scala lineare
var matrix2 = matrix.map(row => [...row]);

links.forEach(link => {
    const i = nodeIndex.get(link.source);
    const j = nodeIndex.get(link.target);
    const scaledWeight = linearScale(link.weight); 
    matrix2[i][j] = scaledWeight;
    matrix2[j][i] = scaledWeight; 
});

// Crea il layout del Chord Diagram usando matrix2
const chord = d3.chord()
    .padAngle(0.05)
    .sortSubgroups(d3.descending)
    (matrix2);


    const arc = d3.arc()
        .innerRadius(size / 2 - 25)
        .outerRadius(size / 2 - 10);

    

    const ribbon = d3.ribbon()
        .radius(size / 2 - 25);

    
    const group = svg.append("g")
        .selectAll("g")
        .data(chord.groups)
        .enter()
        .append("g");
    console.log("Chord.groups:", chord.groups);

    group.append("path")
        .attr("d", arc)
        .style("fill", d => color(nodes[d.index].id))
        .style("stroke", "#000")
        .on("click", (event, d) => toggleHighlight(nodes[d.index].id));


   
    group.append("text")
        .attr("dy", ".45em")
        .attr("transform", d => {
            const angle = (d.startAngle + d.endAngle) / 2;
            return `rotate(${(angle * 180 / Math.PI) - 90}) translate(${size / 2 - 5}) ${angle > Math.PI ? "rotate(180)" : ""}`;
        })
        .style("text-anchor", d => (d.startAngle + d.endAngle) / 2 > Math.PI ? "end" : "start")
        .text(d => nodes[d.index].id)
        .style("font-size", "12px");

    
    const ribbons = svg.append("g")
    .selectAll("path")
    .data(chord)
    .enter()
    .append("path")
    .attr("d", ribbon)
    .attr("class", d => `ribbon ribbon-${nodes[d.source.index].id} ribbon-${nodes[d.target.index].id}`)
    .style("fill", d => color(nodes[d.source.index].id))
    .style("opacity", 0.7)
    
    .on("mouseover", function (event, d) {
        const source = nodes[d.source.index].id;
        const target = nodes[d.target.index].id;

        cellValue = sharedPodiums[`${source}-${target}`] || sharedPodiums[`${target}-${source}`];
     

        // Evidenzia la cella corrispondente nella matrice
        d3.select(`.cell-${source}-${target}`).style("stroke", "red").style("stroke-width", "3px");
        d3.select(`.cell-${target}-${source}`).style("stroke", "red").style("stroke-width", "3px");

        const legendWidth = Math.min(d3.select(".matrix-container").node().getBoundingClientRect().width * 0.6, 300);
        const legendScale = d3.scaleLinear()
        .domain([0, d3.max(Object.values(sharedPodiums))])
        .range([0, legendWidth ]);


       
        const indicatorX = legendScale(cellValue);

        tooltip.html(`<strong>${source} ↔ ${target}</strong><br>Shared Podiums: ${cellValue}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("visibility", "visible");

    // Sposta e rende visibile l’indicatore
    d3.select("#legend-indicator")
        .attr("x1", indicatorX)
        .attr("x2", indicatorX)
        .style("visibility", "visible");

    
    })
    .on("mouseout", function (event, d) {
        const source = nodes[d.source.index].id;
        const target = nodes[d.target.index].id;

        // Rimuove l'evidenziazione
        d3.select(`.cell-${source}-${target}`).style("stroke", "#ddd").style("stroke-width", "1px");
        d3.select(`.cell-${target}-${source}`).style("stroke", "#ddd").style("stroke-width", "1px");
        d3.select("#legend-indicator").style("visibility", "hidden");
        tooltip.style("visibility", "hidden");
        d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.7);
    });

    function toggleHighlight(selectedNation) {
        if (highlightedNation === selectedNation) {
            
            highlightedNation = null;
            ribbons.transition().duration(300).style("fill", "#bbb"); // Usa un colore neutro
        } else {
           
            highlightedNation = selectedNation;
            ribbons.transition().duration(300)
                .style("fill", d =>
                    (nodes[d.source.index].id === selectedNation || nodes[d.target.index].id === selectedNation) 
                    ? color(selectedNation) : "#bbb"
                );
        }
    }
    
    
    
}

// Funzione per aggiornare il diagramma al ridimensionamento


function drawAdjacencyMatrix(sharedPodiums, nodes) {
    const container = d3.select(".matrix-container");

    
    container.select("svg").remove();

    const containerWidth = container.node().getBoundingClientRect().width;
    const containerHeight = container.node().getBoundingClientRect().height;
    const margin = { top: 50, right: 50, bottom: 50, left: 100 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    
    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    
    const matrixSize = nodes.length;
    const matrix = Array(matrixSize).fill().map(() => Array(matrixSize).fill(0));

    const nodeIndex = new Map(nodes.map((d, i) => [d.id, i]));

  

    // Popolamento della matrice con i valori delle connessioni
    Object.entries(sharedPodiums).forEach(([pair, weight]) => {
        const [stato1, stato2] = pair.split('-');
        const i = nodeIndex.get(stato1);
        const j = nodeIndex.get(stato2);
        matrix[i][j] = weight;
        matrix[j][i] = weight; // Matrice simmetrica
    });

    
    const gamma = 2;
const interpolateBlues = d3.interpolateRgb("white", "#08306b");

const colorScale = d3.scaleSequential(t => interpolateBlues(Math.pow(t, gamma)))
    .domain([0, d3.max(Object.values(sharedPodiums))]);




    
    const cellSize = width / matrixSize;


    svg.selectAll("g")
        .attr("class", "matrix-row")
        .data(matrix)
        .enter()
        .append("g")
        .selectAll("rect")
        .data((d, i) => d.map((value, j) => ({ value, row: i, col: j })))
        .enter()
        .append("rect")
        .attr("x", d => d.col * cellSize)
        .attr("y", d => d.row * cellSize)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("class", d => `matrix-cell cell-${nodes[d.row].id}-${nodes[d.col].id}`)
        .style("fill", d => colorScale(d.value))
        .style("stroke", "#ddd")
        .on("click", function (event, d) {
            const source = nodes[d.row].id;
            const target = nodes[d.col].id;
    
            // Evidenzia il ribbon corrispondente
            highlightRibbon(source, target, d.value);
        })
        .on("mouseover", function (event, d) {
            const source = nodes[d.row].id;
            const target = nodes[d.col].id;
            tooltip.html(`<strong>${source} ↔ ${target}</strong><br>Shared Podiums: ${d.value}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .style("visibility", "visible");
        })
    
       
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        });

    // Aggiunge etichette per le nazioni (assi)
    svg.selectAll(".rowLabel")
        .data(nodes)
        .enter()
        .append("text")
        .attr("class", "rowLabel")
        .attr("x", -10)
        .attr("y", (d, i) => i * cellSize + cellSize / 2)
        .text(d => d.id)
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "middle")
        .style("font-size", "12px");

        svg.selectAll(".colLabel")
        .data(nodes)
        .enter()
        .append("text")
        .attr("class", "colLabel")
        .attr("x", (d, i) => i * cellSize + cellSize / 2) 
        .attr("y", -10) 
        .text(d => d.id)
        .attr("text-anchor", "start")  
        .attr("alignment-baseline", "middle")
        .attr("transform", (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, -10)`) 
        .style("font-size", "12px");
    

    // Creazione della legenda
    const legendWidth = Math.min(containerWidth * 0.6, 300); 

    const legendHeight = legendWidth/10;

    
    const maxValue = d3.max(Object.values(sharedPodiums)) || 1;
   




    const legendScale = d3.scaleSequential(t => interpolateBlues(Math.pow(t, gamma)))
        .domain([0, maxValue])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale).ticks(5)
                            .tickFormat(d3.format("d"));

    const legend = svg.append("g")
        .attr("transform", `translate(${width / 2 - legendWidth / 2}, ${cellSize*11})`);



    legend.select("#legend-gradient").remove(); 

const gradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

gradient.append("stop").attr("offset", "0%").style("stop-color", d3.interpolateBlues(0));
gradient.append("stop").attr("offset", "100%").style("stop-color", d3.interpolateBlues(1));

legend.append("rect")
    .attr("width", legendWidth) 
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)")
    .attr("transform", `translate(0, ${legendHeight})`);


    legend.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);
    
    const legendIndicator = legend.append("line")
    .attr("id", "legend-indicator")
    .attr("y1", 0)
    .attr("y2", legendHeight)
    .attr("stroke", "red")
    .attr("stroke-width", "2px")
    .style("visibility", "hidden")
    .attr("transform", `translate(0, ${legendHeight})`);

    function highlightRibbon(source, target, value) {
        // Resetta tutti i ribbon a neutro prima di evidenziare il nuovo
        d3.selectAll(".ribbon")
            .transition().duration(300)
            .style("fill", "#bbb")
            .style("opacity", 0.7);
        
        const colorScale = d3.scaleSequential(t => interpolateBlues(Math.pow(t, gamma)))
        .domain([0, d3.max(Object.values(sharedPodiums))]);
        // Recupera il colore della cella selezionata
        const maxValue = d3.max(Object.values(sharedPodiums)); 
        const cellColor = colorScale(maxValue);
    
        // Evidenzia il ribbon selezionato con il colore della cella
        d3.selectAll(`.ribbon-${source}.ribbon-${target}, .ribbon-${target}.ribbon-${source}`)
            .transition().duration(300)
            .style("fill", cellColor)
            .style("opacity", 0.9);
    
        // Aggiorna l'indicatore sulla legenda
        const legendWidth = Math.min(d3.select(".matrix-container").node().getBoundingClientRect().width * 0.6, 300);
        const legendScale = d3.scaleLinear()
            .domain([0, d3.max(Object.values(sharedPodiums))])
            .range([0, legendWidth]);
    
        const indicatorX = legendScale(value);
    
        d3.select("#legend-indicator")
            .attr("x1", indicatorX)
            .attr("x2", indicatorX)
            .style("visibility", "visible");
    }
    
    
}



function createYearDropdown(dataset) {
    const years = new Set();

    dataset.links.forEach(link => {
        link.attr.forEach(entry => {
            years.add(entry.year);
        });
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a); 
    const latestYear = sortedYears[0]; 

    // Controlla se il dropdown esiste già e lo rimuove per evitare duplicati
    d3.select("#year-select").remove();

    // Crea l'elemento <select>
    const select = document.createElement("select");
    select.id = "year-select";
    select.style.position = "absolute";
    select.style.top = "10px";
    select.style.left = "10px";
    select.style.zIndex = "1000"; 
    select.style.padding = "5px";
    select.style.fontSize = "14px";

    // Aggiunge le opzioni per ogni anno disponibile
    sortedYears.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    });

    // Aggiunge il dropdown all'interno di #graph-container
    document.querySelector("#graph-container").appendChild(select);

    select.addEventListener("change", function () {
        updateGraphs(this.value);
    });

    return latestYear; // Restituisce l'ultimo anno per la prima selezione
}

function updateGraphs(selectedYear) {
    fetch('Cleaned_Dataset.json')
        .then(response => response.json())
        .then(data => {
            // Calcola le coppie aggiornate per l'anno selezionato
            const { nodes, links, sharedPodiums } = countSharedPodiums(data, selectedYear);
            globalSharedPodiums = sharedPodiums; 

            
            
            drawAdjacencyMatrix(sharedPodiums, nodes);
            drawChordDiagram(sharedPodiums, nodes, links);
        })
        .catch(error => console.error('Errore nel caricamento del dataset:', error));
}



fetch('Cleaned_Dataset.json')
    .then(response => response.json())
    .then(data => {
        const latestYear = createYearDropdown(data); 

        
        updateGraphs(latestYear);

       
        window.addEventListener("resize", () => updateGraphs(document.getElementById("year-select").value));
    })
    .catch(error => console.error('Errore nel caricamento del dataset:', error));


