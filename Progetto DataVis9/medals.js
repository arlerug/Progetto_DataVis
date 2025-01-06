var state="";
var medals;
// Funzione per caricare il dataset
function loadDataset(callback) {
    fetch("Dataset.json")
        .then(response => response.json())
        .then(data => {
            if (!data || !data.links) {
                console.error("Errore: dataset non valido o vuoto.");
                return;
            }
            callback(data);
        })
        .catch(error => console.error("Errore nel caricamento dei dati:", error));
  }
  
  // Funzione per creare il dropdown degli anni
  function createYearDropdown(sortedYears, updateTreemap, data) {
    let dropdownContainer = document.getElementById("dropdownContainer");
    
    // Se il dropdown esiste già, lo rimuoviamo per evitare duplicazioni
    if (dropdownContainer) {
        dropdownContainer.remove();
    }

    // Creiamo un nuovo container per il dropdown
    dropdownContainer = document.createElement("div");
    dropdownContainer.id = "dropdownContainer"; 
    dropdownContainer.style.display = "flex";
    dropdownContainer.style.justifyContent = "center";
    dropdownContainer.style.marginBottom = "10px"; // Spazio tra dropdown e il grafico

    dropdownContainer.innerHTML = `
        <label for="year-dropdown" style="margin-right: 10px; font-weight: bold;">Anno da visualizzare:</label>
        <select id="year-dropdown">
            <option value="" disabled selected>Seleziona</option>
            ${sortedYears.map(year => `<option value="${year}">${year}</option>`).join("")}
        </select>
    `;

    // Aggiungiamo il dropdown **sopra** il grafico
    const graphContainer = document.getElementById("graph-container");
    graphContainer.parentNode.insertBefore(dropdownContainer, graphContainer);

    const yearDropdown = document.getElementById("year-dropdown");

    // Manteniamo il valore dell'anno selezionato, se disponibile
    if (window.selectedYear) {
        yearDropdown.value = window.selectedYear;
    }

    yearDropdown.addEventListener("change", event => {
        window.selectedYear = parseInt(event.target.value, 10);
        updateTreemap(window.selectedYear, data);
    });
}

  
  // Funzione per calcolare le medaglie per ogni paese
  function calculateMedalsByCountry(data, year) {
    const medalsByCountry = {};
    data.links.forEach(link => {
        link.attr.forEach(attr => {
            if (parseInt(attr.year, 10) === year && attr.medal) {
                const country = link.target;
                medalsByCountry[country] = medalsByCountry[country] || { Gold: 0, Silver: 0, Bronze: 0 };
                medalsByCountry[country][attr.medal]++;
            }
        });
    });
    medals=medalsByCountry;
    return medalsByCountry;
  }
  
  // Funzione principale per inizializzare le medaglie
  function initializeMedals() {
    
    loadDataset(data => {
        window.currentData = data;
        const graphContainer = document.getElementById("graph-container");
        if (!graphContainer) {
            console.error("Elemento #graph-container non trovato");
            return;
        }
        graphContainer.innerHTML = "";
        graphContainer.style.display = "block";
  
        const years = new Set();
        data.links.forEach(link => {
            link.attr.forEach(attr => {
                if (attr.year) {
                    years.add(attr.year);
                }
            });
        });
        const sortedYears = Array.from(years).sort((a, b) => a - b);
        if (sortedYears.length === 0) {
            console.error("Nessun anno disponibile nel dataset.");
            return;
        }
  
        createYearDropdown(sortedYears, updateTreemap, data);
        const lastYear = sortedYears[sortedYears.length - 1];
        console.log(`Inizializzazione con l'anno: ${lastYear}`);
        updateTreemap(lastYear, data);
    });
  }
  
  
  // Funzione per aggiornare il treemap
  function updateTreemap(year, data) {
    console.log(`Aggiornamento treemap per l'anno: ${year}`);
    var graphContainer = document.getElementById("graph-container");
    graphContainer.querySelectorAll("svg").forEach(svg => svg.remove());
    graphContainer.querySelectorAll(".bar-chart-container").forEach(div => div.remove());
  
    const medalsByCountry = calculateMedalsByCountry(data, year);
    const filteredMedalsByCountry = Object.entries(medalsByCountry)
        .filter(([country, counts]) => Object.values(counts).reduce((a, b) => a + b, 0) >= 5)
        .reduce((acc, [country, counts]) => {
            acc[country] = Object.values(counts).reduce((a, b) => a + b, 0);
            return acc;
        }, {});
  
    if (Object.keys(filteredMedalsByCountry).length === 0) {
        console.warn(`Nessun dato disponibile per l'anno ${year} con almeno 5 medaglie.`);
        return;
    }
  
    const treemapData = {
        name: `Medaglie Totali ${year}`,
        children: Object.entries(filteredMedalsByCountry).map(([country, count]) => ({
            name: country,
            value: count,
        })),
    };

    const body = d3.select("body");
    const containerWidth = body.node().getBoundingClientRect().width / 1.1;
    const containerHeight = body.node().getBoundingClientRect().width / 2;

     graphContainer = d3.select("#graph-container")
        .style("visibility", "visible")
        .style("width", containerWidth + "px")
        .style("height", containerHeight + "px")
        .style("display", "flex")  // Imposta flexbox per allineare gli elementi orizzontalmente
        .style("flex-direction", "row") // Disposizione orizzontale
        .style("gap", "10px");
    width=graphContainer.node().getBoundingClientRect().width;
    height= graphContainer.node().getBoundingClientRect().height;   
    var svg = d3.select("#graph-container").append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")  // Rendi la larghezza al 100% del container
        .style("height", "auto") // Altezza regolata automaticamente
        .style("border", "1px solid #ccc")
        .style("display", "block")
        .style("visibility", "visible")
        .style("margin", "10px auto");
    console.log(svg.attr("width"));
    const root = d3.hierarchy(treemapData).sum(d => d.value).sort((a, b) => b.value - a.value);
   // Crea l'oggetto treemap
  const treemap = d3.treemap()
  .size([width, height])
  .padding(1)
  .round(true);
  
  // Applica il layout alla gerarchia
  treemap(root);
  console.log("Treemap leaves:", root.leaves());
  
    
  
  const nodes = svg.selectAll("g")
  .data(root.leaves())
  .enter()
  .append("g")
  .attr("transform", d => `translate(${d.x0},${d.y0})`);
  
  // Aggiungi il rettangolo
  nodes.append("rect")
  .attr("width", d => d.x1 - d.x0)
  .attr("height", d => d.y1 - d.y0)
  .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
  .attr("stroke", "#fff")
  .on("click", (event, d) => {
      console.log(`Nazione selezionata: ${d.data.name}`);
      state=d.data.name;
      updateBarChart(year, d.data.name, medalsByCountry[d.data.name]);
  
  });
  
  // Aggiungi il testo
  nodes.append("text")
  .attr("x", 5)
  .attr("y", 20)
  .text(d => `${d.data.name} (${d.data.value})`)
  .attr("font-size", "10px")
  .attr("fill", "#000");
  }
  
  function updateBarChart(year, country, medalCounts) {
    console.log(`Creazione istogramma per ${country}, anno ${year}`);
    const graphContainer = document.getElementById("graph-container");
    graphContainer.querySelectorAll(".bar-chart-container").forEach(div => div.remove());
    
    const container = document.createElement("div");
    container.style.display = "block";
    container.className = "bar-chart-container";
    container.style.float = "left";
    container.style.width = "30%";
    graphContainer.insertBefore(container, graphContainer.firstChild);
  
    const width = window.innerWidth * 0.4;  // 40% della larghezza della finestra
    const height = window.innerHeight * 0.5; // 50% dell'altezza della finestra

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    
    const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
        .attr("visibility", "visible");
    
    const xScale = d3.scaleBand().domain(["Gold", "Silver", "Bronze"]).range([0, width]).padding(0.2);
    const yScale = d3.scaleLinear().domain([0, d3.max(Object.values(medalCounts)) || 1]).range([height, 0]);
    
    // Aggiungi assi
  svg.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(xScale));
  
  svg.append("g")
  .call(d3.axisLeft(yScale));
  
  // Aggiungi etichetta per l'asse X
  svg.append("text")
  .attr("text-anchor", "middle")
  .attr("x", width / 2)
  .attr("y", height + margin.bottom - 10)
  .text("Category of Medals")
  .attr("font-size", "14px")
  .attr("fill", "#000");
  
  // Aggiungi etichetta per l'asse Y
  svg.append("text")
  .attr("text-anchor", "middle")
  .attr("transform", `rotate(-90)`)
  .attr("x", -height / 2)
  .attr("y", -margin.left + 20)
  .text("Number of Medals")
  .attr("font-size", "14px")
  .attr("fill", "#000");
  
  // Aggiungi barre
  svg.selectAll("rect")
      .data(Object.entries(medalCounts))
      .enter().append("rect")
      .attr("x", d => xScale(d[0]))
      .attr("y", d => yScale(d[1]))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - yScale(d[1]))
      .attr("fill", d => d[0] === "Gold" ? "gold" : d[0] === "Silver" ? "silver" : "#cd7f32");
  
  // Aggiungi etichette per i numeri
  svg.selectAll(".bar-label")
      .data(Object.entries(medalCounts))
      .enter().append("text")
      .attr("class", "bar-label")
      .attr("x", d => xScale(d[0]) + xScale.bandwidth() / 2) // Centrare il testo sulla barra
      .attr("y", d => yScale(d[1]) - 5) // Posizionare sopra la barra
      .attr("text-anchor", "middle") // Centrare il testo orizzontalmente
      .text(d => d[1]) // Mostrare il numero di medaglie
      .attr("font-size", "12px")
      .attr("fill", "#000"); // Colore del testo
  
  
  }
  
  window.addEventListener("resize", () => {
    const yearDropdown = document.getElementById("year-dropdown");
    if (!yearDropdown) return;
    
    const selectedYear = parseInt(yearDropdown.value, 10);
    
    if (!isNaN(selectedYear)) {
        d3.select("#graph-container").selectAll("svg").remove();
        updateTreemap(selectedYear, window.currentData);
        updateBarChart(selectedYear, state, medals[state]);
    }
});

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMedals);
  } else {
    initializeMedals();
  }
  