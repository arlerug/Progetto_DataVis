function countSharedPodiums(dataset, selectedYear) {
    let podiums = new Map(); // {sport-year} -> Set(NOC)
    let sharedPodiums = new Map(); // {stato1-stato2} -> count

    dataset.links.forEach(link => {
        link.attr.forEach(entry => {
            if (!selectedYear || entry.year === selectedYear) {
                let key = `${entry.sport}-${entry.year}`;
                let noc = dataset.nodes.find(node => node.id === link.target)?.noc;

                if (noc) {
                    if (!podiums.has(key)) {
                        podiums.set(key, new Set());
                    }
                    podiums.get(key).add(noc);
                }
            }
        });
    });

    podiums.forEach(nocSet => {
        let nocArray = Array.from(nocSet);
        for (let i = 0; i < nocArray.length; i++) {
            for (let j = i + 1; j < nocArray.length; j++) {
                let stato1 = nocArray[i];
                let stato2 = nocArray[j];
                let pairKey = [stato1, stato2].sort().join('-'); // Ordina sempre le coppie

                sharedPodiums.set(pairKey, (sharedPodiums.get(pairKey) || 0) + 1);
            }
        }
    });

    // Ordina le coppie per peso decrescente
    let sortedPairs = Array.from(sharedPodiums.entries()).sort((a, b) => b[1] - a[1]);

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

    // Crea una nuova Mappa con solo le coppie selezionate
    sharedPodiums = new Map(selectedPairs);

    // Converti in array compatibile con D3.js
    let nodes = [...selectedNations].map(noc => ({ id: noc }));

    let links = Array.from(sharedPodiums.entries()).map(([pair, count]) => {
        let [stato1, stato2] = pair.split('-');
        return { source: stato1, target: stato2, weight: count };
    });

    console.log("Nodes:", nodes);
    console.log("Links:", links);
    return { nodes, links, sharedPodiums: Object.fromEntries(sharedPodiums) };
}


function buildChordMatrix(sharedPodiums) {
    let { orderedNations, nationIndexMap } = orderNationsByLinkCount(sharedPodiums);
    let size = orderedNations.length;
    let matrix = Array.from({ length: size }, () => Array(size).fill(0));

    Object.entries(sharedPodiums).forEach(([pair, count]) => {
        let [nation1, nation2] = pair.split('-');
        let i = nationIndexMap[nation1];
        let j = nationIndexMap[nation2];
        matrix[i][j] = count;
        matrix[j][i] = count;
    });

    return { matrix, orderedNations, sharedPodiums };
}

function orderNationsByLinkCount(sharedPodiums) {
    let nationCounts = {};

    Object.entries(sharedPodiums).forEach(([pair, count]) => {
        let [nation1, nation2] = pair.split('-');

        nationCounts[nation1] = (nationCounts[nation1] || 0) + count;
        nationCounts[nation2] = (nationCounts[nation2] || 0) + count;
    });

    let orderedNations = Object.keys(nationCounts).sort((a, b) => nationCounts[b] - nationCounts[a]);
    let nationIndexMap = {};
    orderedNations.forEach((nation, index) => {
        nationIndexMap[nation] = index;
    });

    return { orderedNations, nationIndexMap };
}


function createChordDiagram(dataset, selectedYear) {
    let { nodes, links, sharedPodiums } = countSharedPodiums(dataset, selectedYear);
    let { matrix, orderedNations } = buildChordMatrix(sharedPodiums);

    const width = 600;
    const height = 600;
    const outerRadius = Math.min(width, height) / 2 - 50;
    const innerRadius = outerRadius - 20;

    let highlightedNation = null;

    d3.select("#graph-container").select("svg").remove();

    const svg = d3.select("#graph-container")
        .append("svg")
        .attr("id", "chord-svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`)
        .attr("visibility", "visible");

    const chord = d3.chord()
        .padAngle(0) // Rimuove lo spazio tra i ribbons
        .sortSubgroups(null);

    const chords = chord(matrix);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
        .radius(innerRadius);

    // Scala colori per le nazioni
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(orderedNations);
    const neutralColor = "#ccc"; // Colore iniziale neutro

    // **1. Crea tooltip**
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ddd")
        .style("padding", "5px 10px")
        .style("border-radius", "5px")
        .style("box-shadow", "0px 0px 5px rgba(0,0,0,0.3)")
        .style("opacity", 0)
        .style("pointer-events", "none");

    // **2. Disegna gli archi delle nazioni**
    svg.append("g")
        .selectAll("path")
        .data(chords.groups)
        .enter()
        .append("path")
        .style("fill", d => color(orderedNations[d.index]))
        .style("stroke", "#000")
        .attr("d", arc)
        .on("click", (event, d) => toggleHighlight(orderedNations[d.index]));

    // **3. Disegna i ribbons inizialmente di colore neutro, senza bordo e attaccati**
    const ribbons = svg.append("g")
        .selectAll("path")
        .data(chords)
        .enter()
        .append("path")
        .attr("d", ribbon)
        .style("fill", neutralColor) // Inizialmente tutti grigi
        .style("stroke", "none") // Rimuove il bordo
        .style("opacity", 0.7) // Opacità per migliore visibilità
        .on("mouseover", function (event, d) {
            d3.select(this).transition().duration(200).style("opacity", 1);

            // Mostra tooltip con il peso del link
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>${orderedNations[d.source.index]}</strong> ↔ 
                <strong>${orderedNations[d.target.index]}</strong><br>
                Podi condivisi: <strong>${matrix[d.source.index][d.target.index]}</strong>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).transition().duration(200).style("opacity", 0.7);

            // Nasconde tooltip
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // **4. Aggiunta delle etichette per le nazioni**
    svg.append("g")
        .selectAll("text")
        .data(chords.groups)
        .enter()
        .append("text")
        .each(d => d.angle = (d.startAngle + d.endAngle) / 2)
        .attr("transform", d => `
            rotate(${(d.angle * 180 / Math.PI - 90)})
            translate(${outerRadius + 10})
            ${d.angle > Math.PI ? "rotate(180)" : ""}
        `)
        .attr("dy", ".35em")
        .style("text-anchor", d => d.angle > Math.PI ? "end" : "start")
        .text(d => `${orderedNations[d.index]}`)
        .attr("font-size", "12px")
        .attr("fill", "black");

    // **5. Funzione per evidenziare i ribbons quando si clicca su una nazione**
    function toggleHighlight(selectedNation) {
        if (highlightedNation === selectedNation) {
            // Se è già evidenziata, resetta tutto a neutro
            highlightedNation = null;
            ribbons.transition().duration(300).style("fill", neutralColor);
        } else {
            // Evidenzia solo quelli collegati alla nazione selezionata
            highlightedNation = selectedNation;
            ribbons.transition().duration(300)
                .style("fill", d =>
                    (orderedNations[d.source.index] === selectedNation || orderedNations[d.target.index] === selectedNation) 
                    ? color(selectedNation) : neutralColor
                );
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

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    const latestYear = sortedYears[0];

    const select = document.createElement("select");
    select.id = "year-select";
    select.style.position = "absolute";
    select.style.top = "10px";
    select.style.display = "block";
    select.style.visibility = "visible";

    sortedYears.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    });

    document.getElementById("graph-container").appendChild(select);
    select.value = latestYear;
    createChordDiagram(dataset, latestYear);

    select.addEventListener("change", (event) => {
        const selectedYear = event.target.value;
        createChordDiagram(dataset, selectedYear);
    });
}

// Caricamento dati e inizializzazione
fetch('Dataset.json')
    .then(response => response.json())
    .then(data => {
        createYearDropdown(data);
    })
    .catch(error => console.error('Errore nel caricamento del dataset:', error));
