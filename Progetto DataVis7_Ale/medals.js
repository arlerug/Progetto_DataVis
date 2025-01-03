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
function createYearDropdown(graphContainer, sortedYears, updateTreemap, data) {
  const dropdownContainer = document.createElement("div");
  dropdownContainer.style.visibility = "visible";
  dropdownContainer.innerHTML = `
      <label for="year-dropdown">Seleziona Anno:</label>
      <select id="year-dropdown">
          ${sortedYears.map(year => `<option value="${year}">${year}</option>`).join("")}
      </select>
  `;
  graphContainer.appendChild(dropdownContainer);

  const yearDropdown = document.getElementById("year-dropdown");
  yearDropdown.value = sortedYears[sortedYears.length - 1];
  yearDropdown.addEventListener("change", event => {
      updateTreemap(parseInt(event.target.value, 10), data);
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
  return medalsByCountry;
}

// Funzione principale per inizializzare le medaglie
function initializeMedals() {
  loadDataset(data => {
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

      createYearDropdown(graphContainer, sortedYears, updateTreemap, data);
      const lastYear = sortedYears[sortedYears.length - 1];
      console.log(`Inizializzazione con l'anno: ${lastYear}`);
      updateTreemap(lastYear, data);
  });
}

// Funzione per aggiornare il treemap
function updateTreemap(year, data) {
  console.log(`Aggiornamento treemap per l'anno: ${year}`);
  const graphContainer = document.getElementById("graph-container");
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

  const width = 800;
  const height = 600;
  var svg = d3.select("#graph-container").append("svg")
      .attr("width", width)
      .attr("height", height)
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

  const width = 400, height = 300;
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  
  const svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("display", "flow")
      .attr("visibility", "visible");
  
  const xScale = d3.scaleBand().domain(["Gold", "Silver", "Bronze"]).range([0, width]).padding(0.2);
  const yScale = d3.scaleLinear().domain([0, d3.max(Object.values(medalCounts)) || 1]).range([height, 0]);
  
  svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale));
  
  svg.append("g")
      .call(d3.axisLeft(yScale));
  
  svg.selectAll("rect")
      .data(Object.entries(medalCounts))
      .enter().append("rect")
      .attr("x", d => xScale(d[0]))
      .attr("y", d => yScale(d[1]))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - yScale(d[1]))
      .attr("fill", d => d[0] === "Gold" ? "gold" : d[0] === "Silver" ? "silver" : "#cd7f32");
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMedals);
} else {
  initializeMedals();
}
