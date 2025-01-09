// Funzione per contare le medaglie per ogni anno e stato
function countMedals(filePath) {
    return fetch(filePath)
        .then(response => response.json())
        .then(data => {
            const medalMap = new Map();

            data.links.forEach(link => {
                link.attr.forEach(attr => {
                    const year = attr.year;
                    const id = link.target;
                    const key = `${year}:${id}`;

                    if (!medalMap.has(key)) {
                        medalMap.set(key, { year, id, medals: 1 });
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
                    const id = link.target;

                    if (!totalMedalsMap.has(id)) {
                        totalMedalsMap.set(id, { id, medals: 1 });
                    } else {
                        totalMedalsMap.get(id).medals += 1;
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
            console.log("medalgie:",stateMedalData)
            return Array.from(stateMedalData.entries()).map(([year, medals]) => ({ year, medals }));
            
        })
        .catch(error => console.error('Errore nel caricamento del file:', error));
}

d3.select("#graph-container")
    .style("visibility", "visible")
    .style("display", "flex")
    .style("justify-content", "flex-start")  
    .style("align-items", "flex-start")      
    .style("flex-direction", "row");        
console.log("1",d3.select("#graph-container"))

function createLegend(colorScale, width, height,maxMedalsForYear) {
    const legendHeight = Math.min(300, height * 0.5); 
    const legendWidth = 20;

    // Verifica se il contenitore esiste già, altrimenti lo crea
    let legendContainer = d3.select("#legend-container");
    if (legendContainer.empty()) {
        legendContainer = d3.select("#graph-container")
            .insert("div", ":first-child")  
            .attr("id", "legend-container");
    }
    console.log("2",legendContainer)
   
    legendContainer.select("svg").remove();

    
    const svg = legendContainer.append("svg")
        .attr("width", legendWidth + 50)
        .attr("height", legendHeight + 50)
        .attr("viewBox", `0 0 ${legendWidth + 50} ${legendHeight + 50}`)
        .style("max-width", "100%")
        .style("height", "auto")
        .style("display","block");

   
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

   
    const colorDomain = colorScale.domain();
    gradient.selectAll("stop")
        .data(colorDomain)
        .enter().append("stop")
        .attr("offset", (d, i) => `${(i / (colorDomain.length - 1)) * 100}%`)
        .attr("stop-color", d => colorScale(d));

    
    svg.append("rect")
        .attr("x", 20)
        .attr("y", 10)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)")
        .attr("stroke", "black");

   
    const legendScale = d3.scaleLinear()
        .domain([0, maxMedalsForYear])
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale).ticks(5);

    
    svg.append("g")
        .attr("transform", `translate(${legendWidth + 20}, 10)`)
        .call(legendAxis)
        .selectAll("text")  
        .attr("class", "legend-label")  
        .attr("data-value", d => d); 
        
        svg.append("line")
        .attr("id", "legend-indicator")
        .attr("x1", 15)
        .attr("x2", legendWidth + 30)
        .attr("y1", legendHeight + 10) 
        .attr("y2", legendHeight + 10)
        .attr("stroke", "red")
        .attr("stroke-width", 3)
        .style("visibility", "hidden"); 
}





// Inizializzazione della mappa con slider
function initializeChoroplethMap(filePath, geoJsonPath) {
    var graphContainer = d3.select("#graph-container");
    graphContainer.style("padding", "0").style("margin", "0").style("text-align", "left");
    graphContainer.selectAll("*").remove();

    function updateDimensions() {
        var width = Math.min(window.innerWidth * 2 / 3.5); 
        var height = width * 0.6; 

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


            sliderContainer = document.createElement("div");
            sliderContainer.id = "slider-container";
            sliderContainer.style.margin = "10px 0";
        
            const label = document.createElement("label");
            label.htmlFor = "year-slider";
            label.textContent = "Anno: ";
        
            const yearSlider = document.createElement("input");
            yearSlider.type = "range";
            yearSlider.id = "year-slider";
            yearSlider.min = 1900;
            yearSlider.max = 2020;
            yearSlider.step = 1;
            yearSlider.value = 2020;
        
            const yearDisplay = document.createElement("span");
            yearDisplay.id = "year-display";
            yearDisplay.textContent = "2020";
        
            sliderContainer.appendChild(label);
            sliderContainer.appendChild(yearSlider);
            sliderContainer.appendChild(yearDisplay);
        
            document.body.insertBefore(sliderContainer, document.getElementById("graph-container"));
        
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
        let maxMedalsForYear = 0;
        medalData.filter(d => d.year === year).forEach(d => {
            stateMedalCounts.set(d.id, d.medals);
            if (d.medals > maxMedalsForYear) {
                maxMedalsForYear = d.medals;  
            }
        });
    
        
        if (maxMedalsForYear === 0) {
            maxMedalsForYear = maxcountMedals; 
        }

    
    colorScale.domain([0, maxMedalsForYear]);
        
    
    d3.select("#legend-container").remove();
    createLegend(colorScale, width, height, maxMedalsForYear);

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
                const count = stateMedalCounts.get(state) ;


                
                getStateMedalData("Cleaned_Dataset_for_MapVis.json", state).then(data => {
                    d3.select("#graph-container").selectAll("#scatter-container").remove("svg")
                    if (data.length > 0) {
                        createScatterLinePlot(data, "#graph-container", state);
                        console.log(data)
                    }
                });
            })
            .on("mouseover", function (event, d) {
                const state = d.id;
                const count = stateMedalCounts.get(state) || 0;
                const legendHeight = Math.min(300, height * 0.5);
            
                tooltip.style("opacity", 1)
                       .html(`<strong>${state}</strong><br>Medaglie: ${count}`);
            
                // **Sposta la linea rossa nella posizione corretta**
                const legendScale = d3.scaleLinear()
                
                    .domain([0,maxMedalsForYear]) 
                    .range([legendHeight, 0]);
            
                d3.select("#legend-indicator")
                    .transition().duration(200)
                    .attr("y1", legendScale(count) + 10)
                    .attr("y2", legendScale(count) + 10)
                    .style("visibility", "visible");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
            
                
                d3.select("#legend-indicator")
                    .transition().duration(200)
                    .style("visibility", "hidden");
            })
            
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
        
                
                d3.selectAll(".legend-label").style("font-weight", "normal").style("fill", "black");
                d3.select("#legend-indicator")
                .transition().duration(200)
                .style("visibility", "hidden");
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

    function ensureScatterContainer() {
        let scatterContainer = d3.select("#scatter-container");
        
        if (scatterContainer.empty()) {
            scatterContainer = d3.select("#graph-container")
                .append("div")
                .attr("id", "scatter-container")
                .style("flex", "1") 
                .style("min-height", "300px") 
                .style("display", "flex")
                .style("align-items", "center")
                .style("justify-content", "center"); 
        }
    }
    ensureScatterContainer();
}

function createScatterLinePlot(data, containerId, state) {
 let scatterContainer = d3.select("#scatter-container");

    
    if (scatterContainer.empty()) {
        scatterContainer = d3.select(containerId).append("div")
            .attr("id", "scatter-container")
            .style("flex", "1")
            .style("min-height", "300px")
            .style("width", "100%") 
            .style("display", "flex")
            .style("align-items", "center")
            .style("justify-content", "center");
           
    }

   
    scatterContainer.select("svg").remove();
    scatterContainer.append("p")
        .text(`Medaglie per anno per ${state}`)
        .style("text-align", "center");

        d3.select("#scatter-container")
        .style("display", "flex")
        .style("flex-direction", "column");
    

    
    if (data.size === 0) {
        scatterContainer = d3.select(containerId).append("div")
        .attr("id", "scatter-container")
        .style("flex", "1")
        .style("min-height", "300px")
        .style("width", "100%") 
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center");
        
        return;
    }
        

    const svg = scatterContainer.append("svg")
        .attr("id", "scatter")
        .style("max-width", "100%")
        .style("height", "auto");

    
    var tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #d3d3d3")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("opacity", 0);

    function updateDimensions() {
        const width = Math.min(window.innerWidth / 3.2);
        const height = width * 0.6;

        svg.attr("width", width)
           .attr("height", height)
           .attr("viewBox", `0 0 ${width} ${height}`);

        return { width, height };
    }

    function renderPlot() {
        scatterContainer.selectAll("g").remove(); 
    
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
                tooltip.transition().duration(200)
                    .style("opacity", 0)
                    .style("left", `-9999px`)  
                    .style("top", `-9999px`);
            });
            
    
        
        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    
        g.append("g")
            .call(d3.axisLeft(yScale));
    
        
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







initializeChoroplethMap("Cleaned_Dataset_for_MapVis.json", "countires_formetted.geoJson");
d3.select("undefined").remove()