var state = "";
var medals;
var tooltips = {}; 

// Funzione per caricare il dataset
function loadDataset(callback) {
  fetch("Cleaned_Dataset.json")
    .then((response) => response.json())
    .then((data) => {
      if (!data || !data.links) {
        console.error("Errore: dataset non valido o vuoto.");
        return;
      }
      callback(data);
    })
    .catch((error) => console.error("Errore nel caricamento dei dati:", error));
}

// Funzione per creare il dropdown degli anni
function createYearDropdown(sortedYears, updateTreemap, data) {
  let dropdownContainer = document.getElementById("dropdownContainer");

  
  if (dropdownContainer) {
    dropdownContainer.remove();
  }

  // Creiamo un nuovo container per il dropdown
  dropdownContainer = document.createElement("div");
  dropdownContainer.id = "dropdownContainer";
  dropdownContainer.style.display = "flex";
  dropdownContainer.style.justifyContent = "center";
  dropdownContainer.style.marginTop = "10px"; 
  dropdownContainer.style.marginBottom = "10px"; 

  dropdownContainer.innerHTML = `
        <label for="year-dropdown" style="margin-right: 10px; font-weight: bold;">Anno da visualizzare:</label>
        <select id="year-dropdown">
            <option value="" disabled selected>Seleziona</option>
            ${sortedYears
              .map((year) => `<option value="${year}">${year}</option>`)
              .join("")}
        </select>
    `;

  // Aggiungiamo il dropdown sopra il grafico
  const graphContainer = document.getElementById("graph-container");
  graphContainer.parentNode.insertBefore(dropdownContainer, graphContainer);

  const yearDropdown = document.getElementById("year-dropdown");

  // Manteniamo il valore dell'anno selezionato, se disponibile
  if (window.selectedYear) {
    yearDropdown.value = window.selectedYear;
  }

  yearDropdown.addEventListener("change", (event) => {
    window.selectedYear = parseInt(event.target.value, 10);
    updateTreemap(window.selectedYear, data);
  });
}

// Funzione per calcolare le medaglie per ogni paese
function calculateMedalsByCountry(data, year) {
  const medalsByCountry = {};
  data.links.forEach((link) => {
    link.attr.forEach((attr) => {
      if (parseInt(attr.year, 10) === year && attr.medal) {
        const country = link.target;
        medalsByCountry[country] = medalsByCountry[country] || {
          Gold: 0,
          Silver: 0,
          Bronze: 0,
        };
        medalsByCountry[country][attr.medal]++;
      }
    });
  });
  medals = medalsByCountry;
  return medalsByCountry;
}

// Funzione principale per inizializzare le medaglie
function initializeMedals() {
  loadDataset((data) => {
    window.currentData = data;
    const graphContainer = document.getElementById("graph-container");
    if (!graphContainer) {
      console.error("Elemento #graph-container non trovato");
      return;
    }
    graphContainer.innerHTML = "";
    graphContainer.style.display = "block";

    const years = new Set();
    data.links.forEach((link) => {
      link.attr.forEach((attr) => {
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
  graphContainer.querySelectorAll("svg").forEach((svg) => svg.remove());

  const medalsByCountry = calculateMedalsByCountry(data, year);
  const filteredMedalsByCountry = Object.entries(medalsByCountry)
    .filter(
      ([country, counts]) =>
        Object.values(counts).reduce((a, b) => a + b, 0) >= 5
    )
    .reduce((acc, [country, counts]) => {
      acc[country] = Object.values(counts).reduce((a, b) => a + b, 0);
      return acc;
    }, {});

  if (Object.keys(filteredMedalsByCountry).length === 0) {
    console.warn(
      `Nessun dato disponibile per l'anno ${year} con almeno 5 medaglie.`
    );
    return;
  }

  const treemapData = {
    name: `Medaglie Totali ${year}`,
    children: Object.entries(filteredMedalsByCountry).map(
      ([country, count]) => ({
        name: country,
        value: count,
      })
    ),
  };

  const body = d3.select("body");
  const containerWidth = body.node().getBoundingClientRect().width / 1.1;
  const containerHeight = body.node().getBoundingClientRect().width / 3;

  const graphContainerD3 = d3
    .select("#graph-container")
    .style("visibility", "visible")
    .style("width", containerWidth + "px")
    .style("height", containerHeight + "px")
    .style("display", "flex")
    .style("flex-direction", "row")
    .style("gap", "10px");

  width = graphContainerD3.node().getBoundingClientRect().width;
  height = graphContainerD3.node().getBoundingClientRect().height;

  var svg = graphContainerD3
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
    .style("border", "1px solid #ccc")
    .style("display", "block")
    .style("visibility", "visible")
    .style("margin", "10px auto");

  console.log(svg.attr("width"));

  const root = d3
    .hierarchy(treemapData)
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value);

  const treemap = d3
    .treemap()
    .size([width, height])
    .padding(1)
    .round(true)
    .tile(d3.treemapResquarify);

  treemap(root);

  console.log("Treemap leaves:", root.leaves());

  const maxValue = d3.max(root.leaves(), (d) => d.value);
  const minValue = 5; // Imposta il minimo esplicito a 5 medaglie


  const colorScale = d3.scaleSymlog()
  .constant(1) 
  .domain([minValue, maxValue])
  .range(["#ffffff", "#000066"]);



  const nodes = svg
    .selectAll("g")
    .data(root.leaves())
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  nodes
    .append("rect")
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", (d) => colorScale(d.value))
    .attr("stroke", "#00008B")
    .on("click", (event, d) => {
      const country = d.data.name;
      if (tooltips[country]) {
        console.warn("Tooltip già aperta per questa nazione.");
        return;
      }

      const tooltip = createPieChartTooltip(
        country,
        medalsByCountry[country],
        event.pageX,
        event.pageY
      );
      tooltips[country] = tooltip;
    });

  nodes
    .append("text")
    .attr("x", 5)
    .attr("y", 20)
    .text((d) => `${d.data.name} (${d.data.value})`)
    .attr("font-size", "14px")
    .attr("fill", "#000");
}

function createPieChartTooltip(country, medalCounts, x, y) {
  const total = Object.values(medalCounts).reduce((a, b) => a + b, 0);
  const data = [
    { label: "Gold", value: medalCounts.Gold, color: "gold" },
    { label: "Silver", value: medalCounts.Silver, color: "silver" },
    { label: "Bronze", value: medalCounts.Bronze, color: "#cd7f32" },
  ].filter((d) => d.value > 0);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("left", `${x - 75}px`)
    .style("top", `${y - 200}px`)
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("border-radius", "8px")
    .style("padding", "10px")
    .style("z-index", 10)
    .call(
      d3.drag().on("drag", function (event) {
        tooltip.style("left", `${event.x}px`).style("top", `${event.y}px`);
      })
    );

  tooltip.append("h3").text(`${country} Medal Distribution`);

  const svg = tooltip
    .append("svg")
    .attr("width", 150)
    .attr("height", 150)
    .append("g")
    .attr("transform", "translate(75,75)");

  const pie = d3.pie().value((d) => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(70);

  svg
    .selectAll("path")
    .data(pie(data))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d) => d.data.color);

  svg
    .selectAll("text")
    .data(pie(data))
    .enter()
    .append("text")
    .attr("transform", (d) => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px")
    .text((d) => d.data.value);

  tooltip
    .append("button")
    .text("Close")
    .style("margin-top", "10px")
    .on("click", () => {
      tooltip.remove();
      delete tooltips[country];
    });

  return tooltip;
}

window.addEventListener("resize", () => {
  const yearDropdown = document.getElementById("year-dropdown");
  if (!yearDropdown) return;

  const selectedYear = parseInt(yearDropdown.value, 10);

  if (!isNaN(selectedYear)) {
    d3.select("#graph-container").selectAll("svg").remove();
    updateTreemap(selectedYear, window.currentData);
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMedals);
} else {
  initializeMedals();
}
