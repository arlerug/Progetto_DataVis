

// Impostazioni dinamiche per il contenitore
var graphContainer = d3.select("#graph-container");
graphContainer.style("padding", "0").style("margin", "0").style("text-align", "center");

// Rimuove eventuali contenuti esistenti
graphContainer.selectAll("*").remove();

// Dimensioni dinamiche per SVG
var width = 800;
var height = 600;

// Crea un elemento SVG all'interno di graph-container
var svg = graphContainer.append("svg")
  .attr("id", "my_dataviz")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", `0 0 ${width} ${height}`)
  .style("max-width", "100%")
  .style("height", "auto");

// Aggiungi lo slider per l'anno (inizialmente nascosto)
const yearSlider = document.querySelector("#year-slider");
const yearDisplay = document.querySelector("#year-display");

const sliderContainer = document.querySelector("#slider-container");

// Nascondi lo slider inizialmente
sliderContainer.style.visibility = "hidden"; // Usa visibility anziché display: none

// Proiezione geografica
var projection = d3.geoMercator()
  .scale(120)
  .center([0, 20])
  .translate([width / 2, height / 2]);

var path = d3.geoPath().projection(projection);

// Scala cromatica
var colorScale = d3.scaleSequential(d3.interpolateBlues)
  .domain([0, 50]); // Adatta il dominio al massimo numero di medaglie

// Aggiunta del tooltip
var tooltip = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("background", "#f9f9f9")
  .style("border", "1px solid #d3d3d3")
  .style("border-radius", "5px")
  .style("padding", "10px")
  .style("opacity", 0);

// Caricamento dei dati
Promise.all([
  fetch("Dataset.json").then(response => response.json()),
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
]).then(([dataset, geoData]) => {
    // Estrai gli anni unici dai dati
    const years = new Set();
    dataset.links.forEach(link => {
        link.attr.forEach(attr => {
            if (attr.year) {
                years.add(attr.year);
            }
        });
    });

    // Converte Set in un array e ordina gli anni
    const sortedYears = Array.from(years).sort((a, b) => a - b);

    // Aggiorna il range dello slider con gli anni unici
    yearSlider.min = 0;
    yearSlider.max = sortedYears.length - 1;
    yearSlider.value = sortedYears.length - 1; // Imposta l'anno più recente come valore iniziale

    // Mostra l'anno selezionato
    yearDisplay.textContent = sortedYears[yearSlider.value];

    // Funzione per aggiornare i conteggi delle medaglie per anno
    const stateMedalCounts = new Map();

    const updateCountsForYear = (year) => {
        stateMedalCounts.clear(); // Pulisce i conteggi precedenti

        dataset.links.forEach(link => {
            link.attr.forEach(attr => {
                const state = link.target;  // Accede direttamente a link.target per ottenere il paese
                const medalYear = attr.year;  // Estrae l'anno dalla medaglia
                const medal = attr.medal;  // Estrae il tipo di medaglia
                if (state && medalYear === year && medal) {
                    if (!stateMedalCounts.has(state)) {
                        stateMedalCounts.set(state, 0);
                    }
                    // Incrementa il conteggio delle medaglie per lo stato
                    stateMedalCounts.set(state, stateMedalCounts.get(state) + 1);
                }
            });
        });

        // Ridisegna la mappa con i conteggi aggiornati per l'anno selezionato
        svg.selectAll("*").remove();  // Rimuove la mappa precedente
        svg.append("g")
          .selectAll("path")
          .data(geoData.features)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", d => {
              const state = d.id;
              const count = stateMedalCounts.get(state) || 0;
              return colorScale(count); // Applica il colore basato sul conteggio
          })
          .attr("stroke", "#000")
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
          });
    };

    // Funzione per gestire il cambiamento dello slider
    yearSlider.addEventListener("input", (event) => {
        const selectedYear = sortedYears[event.target.value];
        yearDisplay.textContent = selectedYear;  // Mostra l'anno selezionato
        updateCountsForYear(selectedYear);  // Aggiorna i conteggi per l'anno
    });

    // Inizializza con l'anno predefinito dello slider
    updateCountsForYear(sortedYears[yearSlider.value]);

    // Mostra lo slider quando la mappa è selezionata
    sliderContainer.style.visibility = "visible";  // Mostra lo slider quando viene selezionata la mappa

}).catch(error => {
    console.error("Errore nel caricamento dei dati:", error);
});

