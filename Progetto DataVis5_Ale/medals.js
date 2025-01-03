// File: medals.js

function initializeMedals() {
  // Carica i dati dal dataset
  fetch("Dataset.json")
    .then((response) => response.json())
    .then((data) => {
      const graphContainer = document.getElementById("graph-container");
      if (!graphContainer) {
        console.error("Elemento #graph-container non trovato");
        return;
      }
      graphContainer.innerHTML = ""; // Resetta il contenitore
      graphContainer.style.display = "block";

      // Calcola gli anni disponibili
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

      // Crea un menu a tendina per selezionare l'anno
      const dropdownContainer = document.createElement("div");
      dropdownContainer.innerHTML = `
                <label for="year-dropdown">Seleziona Anno:</label>
                <select id="year-dropdown">
                    ${sortedYears
                      .map((year) => `<option value="${year}">${year}</option>`)
                      .join("")}
                </select>
            `;
      graphContainer.appendChild(dropdownContainer);

      const yearDropdown = document.getElementById("year-dropdown");
      yearDropdown.value = sortedYears[sortedYears.length - 1];

      // Funzione per aggiornare il treemap in base all'anno selezionato
      const updateTreemap = (year) => {
        console.log(`Aggiornamento treemap per l'anno: ${year}`);
        graphContainer.querySelectorAll("svg").forEach((svg) => svg.remove());
        graphContainer
          .querySelectorAll(".bar-chart-container")
          .forEach((div) => div.remove());

        const medalsByCountry = {};
        data.links.forEach((link) => {
          link.attr.forEach((attr) => {
            if (parseInt(attr.year, 10) === year && attr.medal) {
              const country = link.target;
              if (!medalsByCountry[country]) {
                medalsByCountry[country] = 0;
              }
              medalsByCountry[country] += 1;
            }
          });
        });

        // Filtra solo le nazioni con almeno 5 medaglie
        const filteredMedalsByCountry = Object.entries(medalsByCountry)
          .filter(([country, count]) => count >= 5)
          .reduce((acc, [country, count]) => {
            acc[country] = count;
            return acc;
          }, {});

        if (Object.keys(filteredMedalsByCountry).length === 0) {
          console.warn(
            `Nessun dato disponibile per l'anno ${year} con almeno 5 medaglie.`
          );
          return;
        }

        console.log(
          `Dati filtrati per l'anno ${year}:`,
          filteredMedalsByCountry
        );

        const treemapData = {
          name: `Medaglie Totali ${year}`,
          children: Object.entries(filteredMedalsByCountry).map(
            ([country, count]) => ({
              name: country,
              value: count,
            })
          ),
        };

        const width = 800;
        const height = 600;

        const svg = d3
          .select("#graph-container")
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("border", "1px solid #ccc")
          .style("margin", "10px auto");

        const root = d3
          .hierarchy(treemapData)
          .sum((d) => d.value)
          .sort((a, b) => b.value - a.value);

        d3.treemap().size([width, height]).padding(1).round(true)(root);

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
          .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
          .attr("stroke", "#fff")
          .on("click", (event, d) => {
            console.log(`Nazione selezionata: ${d.data.name}`);
            updateBarChart(year, d.data.name);
          });

        nodes
          .append("text")
          .attr("x", 5)
          .attr("y", 20)
          .text((d) => `${d.data.name} (${d.data.value})`)
          .attr("font-size", "10px")
          .attr("fill", "#000");
      };

      // Funzione per aggiornare lo stacked bar chart
      const updateBarChart = (year, country) => {
        const barChartContainer = document.createElement("div");
        barChartContainer.className = "bar-chart-container";
        barChartContainer.style.float = "right";
        barChartContainer.style.width = "40%";
        barChartContainer.style.height = "100%";
        graphContainer
          .querySelectorAll(".bar-chart-container")
          .forEach((div) => div.remove());
        graphContainer.appendChild(barChartContainer);

        // Aggiungi titolo con ID e nome della nazione selezionata
        const title = document.createElement("h3");
        title.textContent = `Nazione: ${country}`;
        title.style.textAlign = "center";
        barChartContainer.appendChild(title);

        const medalCounts = { Gold: 0, Silver: 0, Bronze: 0 };
        data.links.forEach((link) => {
          link.attr.forEach((attr) => {
            if (
              parseInt(attr.year, 10) === year &&
              link.target === country &&
              attr.medal
            ) {
              medalCounts[attr.medal]++;
            }
          });
        });

        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const barChartWidth = 400 - margin.left - margin.right;
        const barChartHeight = 300 - margin.top - margin.bottom;

        const svg = d3
          .select(barChartContainer)
          .append("svg")
          .attr("width", barChartWidth + margin.left + margin.right)
          .attr("height", barChartHeight + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3
          .scaleBand()
          .domain(Object.keys(medalCounts))
          .range([0, barChartWidth])
          .padding(0.2);

        const yScale = d3
          .scaleLinear()
          .domain([0, Math.ceil(d3.max(Object.values(medalCounts)) || 1)])
          .range([barChartHeight, 0]);

        // Aggiungi etichette asse x
        svg
          .append("g")
          .attr("transform", `translate(0, ${barChartHeight})`)
          .call(d3.axisBottom(xScale));

        svg
          .append("text")
          .attr("x", barChartWidth / 2)
          .attr("y", barChartHeight + margin.bottom - 10)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .text("Categorie di Medaglie");

        // Aggiungi etichette asse y
        svg.append("g").call(d3.axisLeft(yScale));

        svg
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", -60) // Aumenta la distanza per visibilità
          .attr("x", -barChartHeight / 2)
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .style("font-size", "14px")
          .text("Numero di Medaglie");

        svg
          .selectAll("rect")
          .data(Object.entries(medalCounts))
          .enter()
          .append("rect")
          .attr("x", (d) => xScale(d[0]))
          .attr("y", (d) => yScale(d[1]))
          .attr("width", xScale.bandwidth())
          .attr("height", (d) => barChartHeight - yScale(d[1]))
          .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
          .each(function (d) {
            svg
              .append("text")
              .attr("x", xScale(d[0]) + xScale.bandwidth() / 2)
              .attr("y", yScale(d[1]) - 5)
              .attr("text-anchor", "middle")
              .style("font-size", "12px")
              .text(d[1]);
          });
      };

      // Evento per aggiornare il treemap quando l'anno cambia
      yearDropdown.addEventListener("change", (event) => {
        const selectedYear = parseInt(event.target.value, 10);
        updateTreemap(selectedYear);
      });

      // Inizializza con il primo anno
      const lastYear = sortedYears[sortedYears.length - 1];
      console.log(`Inizializzazione con l'anno: ${lastYear}`);
      yearDropdown.value = lastYear;
      updateTreemap(lastYear);
    })
    .catch((error) => {
      console.error("Errore nel caricamento dei dati:", error);
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMedals);
} else {
  initializeMedals();
}
