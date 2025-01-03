// Funzione per contare le medaglie per ogni anno e stato
function countMedals(filePath) {
    return fetch(filePath)
        .then(response => response.json())
        .then(data => {
            const medalMap = new Map();

            data.links.forEach(link => {
                link.attr.forEach(attr => {
                    const year = attr.year;
                    const noc = link.target;
                    const key = `${year}:${noc}`;

                    if (!medalMap.has(key)) {
                        medalMap.set(key, { year, noc, medals: 1 });
                    } else {
                        medalMap.get(key).medals += 1;
                    }
                });
            });

            return Array.from(medalMap.values());
        })
        .catch(error => console.error('Errore nel caricamento del file:', error));
}

// Funzione per contare le medaglie totali per ogni stato
function countTotalMedals(filePath) {
    return fetch(filePath)
        .then(response => response.json())
        .then(data => {
            const totalMedalsMap = new Map();

            data.links.forEach(link => {
                link.attr.forEach(attr => {
                    const noc = link.target;

                    if (!totalMedalsMap.has(noc)) {
                        totalMedalsMap.set(noc, { noc, medals: 1 });
                    } else {
                        totalMedalsMap.get(noc).medals += 1;
                    }
                });
            });

            return Array.from(totalMedalsMap.values());
        })
        .catch(error => console.error('Errore nel caricamento del file:', error));
}
function getStateMedalData(filePath, state) {
    return fetch(filePath)
        .then(response => response.json())
        .then(data => {
            const stateMedalData = new Map();

            data.links.forEach(link => {
                link.attr.forEach(attr => {
                    if (link.target === state) {
                        const year = attr.year;

                        if (!stateMedalData.has(year)) {
                            stateMedalData.set(year, 1);
                        } else {
                            stateMedalData.set(year, stateMedalData.get(year) + 1);
                        }
                    }
                });
            });

            return Array.from(stateMedalData.entries()).map(([year, medals]) => ({ year, medals }));
        })
        .catch(error => console.error('Errore nel caricamento del file:', error));
}

d3.select("#graph-container").style("visibility", "visible");
d3.select("#graph-container").style("display", "block");
// Inizializzazione della mappa con slider
function initializeChoroplethMap(filePath, geoJsonPath) {
    var graphContainer = d3.select("#graph-container");
    graphContainer.style("padding", "0").style("margin", "0").style("text-align", "left");
    graphContainer.selectAll("*").remove();

    function updateDimensions() {
        var width = Math.min(window.innerWidth * 2 / 3, 800); // 2/3 della larghezza disponibile o 800px max
        var height = width * 0.6; // Mantieni un rapporto 3:2

        d3.select("#my_dataviz")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`);

        return { width, height };
    }

    var { width, height } = updateDimensions();

    var svg = graphContainer.append("svg")
        .attr("id", "my_dataviz")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("max-width", "100%")
        .style("height", "auto");

    const yearSlider = document.querySelector("#year-slider");
    const yearDisplay = document.querySelector("#year-display");
    const sliderContainer = document.querySelector("#slider-container");
    sliderContainer.style.visibility = "hidden";

    var projection = d3.geoMercator()
        .scale((width * 100) / 800)
        .center([0, 20])
        .translate([width / 2, height / 2]);

    var path = d3.geoPath().projection(projection);

    var colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 50]);

    var tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #d3d3d3")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("opacity", 0);

    Promise.all([
        countMedals(filePath),
        d3.json(geoJsonPath)
    ]).then(([medalData, geoData]) => {
        const years = Array.from(new Set(medalData.map(d => d.year))).sort((a, b) => a - b);

        yearSlider.min = 0;
        yearSlider.max = years.length - 1;
        yearSlider.value = years.length - 1;
        yearDisplay.textContent = years[yearSlider.value];

        const updateCountsForYear = (year) => {
            const stateMedalCounts = new Map();

            medalData.filter(d => d.year === year).forEach(d => {
                stateMedalCounts.set(d.noc, d.medals);
            });

            svg.selectAll("*").remove();

            projection = d3.geoMercator()
                .scale((width * 100) / 800)
                .center([0, 20])
                .translate([width / 2, height / 2]);

            path = d3.geoPath().projection(projection);

            svg.append("g")
            .selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                const state = d.id;
                const count = stateMedalCounts.get(state) || 0;
                return colorScale(count);
            })
            .attr("stroke", "#000")
            .on("click", function (event, d) {
                const state = d.id;
                const count = stateMedalCounts.get(state) || 0;


                // Aggiungi qui il codice per creare e aggiornare il scatterplot
                getStateMedalData("Dataset_Map.json", state).then(data => {
                    d3.select("#graph-container").selectAll("#scatter-container").remove()
                    if (data.length > 0) {
                        createScatterLinePlot(data, "#graph-container", state);
                    }
                });
            })
            .on("mouseover", function (event, d) {
                const state = d.id;
                const count = stateMedalCounts.get(state) || 0;
        
                tooltip.style("opacity", 1)
                       .html(`<strong>${state}</strong><br>Medaglie: ${count}`);
        

            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
        
                // Pulisci lo scatterplot quando il mouse esce dalla mappa
                
                console.log("Scatterplot pulito.");
            });

        };

        yearSlider.addEventListener("input", (event) => {
            const selectedYear = years[event.target.value];
            yearDisplay.textContent = selectedYear;
            updateCountsForYear(selectedYear);
        });

        updateCountsForYear(years[yearSlider.value]);
        sliderContainer.style.visibility = "visible";

        window.addEventListener("resize", () => {
            ({ width, height } = updateDimensions());
            updateCountsForYear(years[yearSlider.value]);
        });
    }).catch(error => {
        console.error("Errore nel caricamento dei dati:", error);
    });
}

function createScatterLinePlot(data, containerId, state) {
    const container = d3.select(containerId);
    container.style("padding", "0")
             .style("margin", "0")
             .style("display", "flex")
             .style("align-items", "flex-start");

    const scatterContainer = container.append("div")
        .attr("id", "scatter-container")
        .style("flex", "1")
        .style("height", "100%")
        .style("position", "relative")
        .style("overflow", "visible"); // Permette ai tooltip di essere visibili

    // Usa direttamente `state` nel titolo
    scatterContainer.append("p")
        .text(`Medaglie per anno per ${state}`)
        .style("text-align", "center");
        

    const svg = scatterContainer.append("svg")
        .attr("id", "scatter")
        .style("max-width", "100%")
        .style("height", "auto");

    // Creazione del tooltip
    var tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #d3d3d3")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("opacity", 0);

    function updateDimensions() {
        const width = Math.min(window.innerWidth / 3, 400);
        const height = width * 0.6;

        svg.attr("width", width)
           .attr("height", height)
           .attr("viewBox", `0 0 ${width} ${height}`);

        return { width, height };
    }

    function renderPlot() {
        scatterContainer.selectAll("g").remove(); // Rimuove contenuti precedenti per ridisegnare
    
        const { width, height } = updateDimensions();
        const margin = { top: 20, right: 20, bottom: 40, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
    
        data.sort((a, b) => a.year - b.year);
    
        const xScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year))
            .range([0, innerWidth]);
    
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.medals)])
            .range([innerHeight, 0]);
    
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.medals));
    
        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);
    
        // Punti con tooltip
        g.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.medals))
            .attr("r", 4)
            .attr("fill", "steelblue")
            .on("mouseover", function (event, d) {
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip.html(`<strong>Anno:</strong> ${d.year}<br><strong>Medaglie:</strong> ${d.medals}`)
                       .style("left", `${event.clientX + 10}px`)
                       .style("top", `${event.clientY - 20}px`);
            })
            .on("mousemove", function (event) {
                tooltip.style("left", `${event.clientX + 10}px`)
                       .style("top", `${event.clientY - 20}px`);
            })
            .on("mouseout", function () {
                tooltip.transition().duration(200).style("opacity", 0);
            });
    
        // Assi
        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    
        g.append("g")
            .call(d3.axisLeft(yScale));
    
        // Etichette
        g.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + margin.bottom - 5)
            .attr("text-anchor", "middle")
            .text("Years");
    
        g.append("text")
            .attr("x", -innerHeight / 2)
            .attr("y", -margin.left + 10)
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .text("Medals");
    }

    renderPlot();

    window.addEventListener("resize", renderPlot);
}






// Esempio di utilizzo
initializeChoroplethMap("Dataset_Map.json", "countires_formetted.geoJson");