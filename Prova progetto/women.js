// women.js

function initializeWomen(filePath) {
  const graphContainer = d3.select("#graph-container");

  if (graphContainer.empty()) {
    console.error(
      "Errore: il contenitore #graph-container non è stato trovato."
    );
    return;
  }

  graphContainer.style.visibility = "visible";
  graphContainer
    .style("padding", "0")
    .style("margin", "0")
    .style("text-align", "center");
  graphContainer.style("width", "100vw").style("height", "80vh");
  graphContainer.selectAll("*").remove();

  const svg = graphContainer
    .append("svg")
    .attr("id", "my_dataviz")
    .attr("viewBox", "0 0 800 480")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "90%")
    .style("height", "90%")
    .attr("visibility", "visible");

  var tooltip = d3
    .select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("padding", "8px")
    .style("box-shadow", "0 2px 4px rgba(0, 0, 0, 0.1)")
    .style("opacity", 0);

  const tooltipHeader = tooltip
    .append("div")
    .style("text-align", "center")
    .style("font-weight", "bold")
    .style("margin-bottom", "8px");

  const tooltipSvg = tooltip
    .append("svg")
    .style("display", "block")
    .style("margin", "0 auto")
    .attr("height", 200);

  const tooltipLegend = tooltip
    .append("div")
    .style("margin-top", "5px")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("justify-content", "center")
    .style("gap", "10px")
    .style("row-gap", "5px");

  fetch(filePath)
    .then((response) => response.json())
    .then((data) => {
      if (!data || !data.links) {
        console.error("Dataset non valido o vuoto:", data);
        return;
      }

      const margin = { top: 20, right: 20, bottom: 40, left: 50 };

      function renderChart() {
        const containerWidth = graphContainer.node().offsetWidth;
        const containerHeight = graphContainer.node().offsetHeight;
        const innerWidth = containerWidth - margin.left - margin.right;
        const innerHeight = containerHeight - margin.top - margin.bottom;

        svg.attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`);

        const g = svg.select("g.chart-group");
        if (g.empty()) {
          svg
            .append("g")
            .attr("class", "chart-group")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        }

        const gChart = svg.select("g.chart-group");
        gChart.selectAll("*").remove();

        const years = Array.from(
          new Set(
            data.links.flatMap((link) => link.attr.map((attr) => attr.year))
          )
        ).sort();
        const medalStats = years.map((year) => {
          const yearData = data.links.flatMap((link) =>
            link.attr.filter((attr) => attr.year === year)
          );
          const total = yearData.length;
          const male = yearData.filter((d) => d.athlete.sex === "Male").length;
          const female = yearData.filter(
            (d) => d.athlete.sex === "Female"
          ).length;

          return {
            year: +year,
            malePercentage: (male / total) * 100,
            femalePercentage: (female / total) * 100,
            maleDisciplines: yearData
              .filter((d) => d.athlete.sex === "Male")
              .reduce((acc, curr) => {
                acc[curr.sport] = (acc[curr.sport] || 0) + 1;
                return acc;
              }, {}),
            femaleDisciplines: yearData
              .filter((d) => d.athlete.sex === "Female")
              .reduce((acc, curr) => {
                acc[curr.sport] = (acc[curr.sport] || 0) + 1;
                return acc;
              }, {}),
          };
        });

        const xScale = d3
          .scaleLinear()
          .domain(d3.extent(medalStats, (d) => d.year))
          .range([0, innerWidth]);

        const yScale = d3
          .scaleLinear()
          .domain([0, 100])
          .range([innerHeight, 0]);

        const lineMale = d3
          .line()
          .x((d) => xScale(d.year))
          .y((d) => yScale(d.malePercentage));

        const lineFemale = d3
          .line()
          .x((d) => xScale(d.year))
          .y((d) => yScale(d.femalePercentage));

        gChart
          .append("path")
          .datum(medalStats)
          .attr("fill", "none")
          .attr("stroke", "blue")
          .attr("stroke-width", 3)
          .attr("d", lineMale);

        gChart
          .append("path")
          .datum(medalStats)
          .attr("fill", "none")
          .attr("stroke", "red")
          .attr("stroke-width", 3)
          .attr("d", lineFemale);

        const renderTooltipChart = (disciplines, sex, year, percentage) => {
          tooltipHeader.text(`${sex} - ${year} (${percentage.toFixed(2)}%)`);
          tooltipSvg.selectAll("*").remove();
          tooltipLegend.selectAll("*").remove();

          const disciplineEntries = Object.entries(disciplines).sort(
            ([, valueA], [, valueB]) => valueB - valueA
          );

          const columns = 3; // Numero massimo di discipline per riga della legenda
          const rows = Math.ceil(disciplineEntries.length / columns);
          const tooltipWidth = Math.max(300, columns * 100); // Larghezza dinamica

          tooltipSvg.attr("width", tooltipWidth);
          tooltip.style("max-width", "400px").style("min-width", "150px");

          const tooltipMargin = { top: 10, right: 10, bottom: 40, left: 40 };
          const tooltipInnerWidth =
            tooltipWidth - tooltipMargin.left - tooltipMargin.right;
          const tooltipHeight =
            +tooltipSvg.attr("height") -
            tooltipMargin.top -
            tooltipMargin.bottom;

          const tooltipG = tooltipSvg
            .append("g")
            .attr(
              "transform",
              `translate(${tooltipMargin.left},${tooltipMargin.top})`
            );

          const xTooltipScale = d3
            .scaleBand()
            .domain(disciplineEntries.map(([key]) => key)) // Usa le chiavi ordinate
            .range([0, tooltipInnerWidth])
            .padding(0.2);

          const yTooltipScale = d3
            .scaleLinear()
            .domain([0, d3.max(Object.values(disciplines))])
            .nice()
            .range([tooltipHeight, 0]);

          const colorScale = d3
            .scaleOrdinal(d3.schemeCategory10)
            .domain(Object.keys(disciplines));

          tooltipG
            .append("g")
            .attr("transform", `translate(0,${tooltipHeight})`)
            .call(
              d3
                .axisBottom(xTooltipScale)
                .tickSize(0)
                .tickFormat(() => "")
            );

          tooltipG
            .append("g")
            .call(
              d3.axisLeft(yTooltipScale).ticks(4).tickFormat(d3.format("d"))
            );

          tooltipG
            .selectAll("rect")
            .data(disciplineEntries)
            .enter()
            .append("rect")
            .attr("x", ([key]) => xTooltipScale(key))
            .attr("y", ([, value]) => yTooltipScale(value))
            .attr("width", xTooltipScale.bandwidth())
            .attr("height", ([, value]) => tooltipHeight - yTooltipScale(value))
            .attr("fill", ([key]) => colorScale(key));

          disciplineEntries.forEach(([discipline, value], index) => {
            if (index % columns === 0) {
              tooltipLegend.append("div").style("flex-basis", "100%");
            }

            const legendItem = tooltipLegend
              .append("div")
              .style("display", "flex")
              .style("align-items", "center");

            legendItem
              .append("span")
              .style("width", "10px")
              .style("height", "10px")
              .style("background-color", colorScale(discipline))
              .style("margin-right", "5px");

            legendItem.append("span").text(`${discipline}: ${value}`);
          });
        };

        gChart
          .selectAll(".dot-male")
          .data(medalStats)
          .enter()
          .append("circle")
          .attr("class", "dot-male")
          .attr("cx", (d) => xScale(d.year))
          .attr("cy", (d) => yScale(d.malePercentage))
          .attr("r", 10)
          .attr("fill", "blue")
          .on("mouseover", (event, d) => {
            tooltip.style("display", "block") // Rendi la tooltip visibile
                .transition().duration(200)
                .style("opacity", 1);
        
            renderTooltipChart(d.maleDisciplines, "Male", d.year, d.malePercentage);
            const tooltipRect = tooltip.node().getBoundingClientRect();
            
            if (d.year >= 1980) {
                tooltip
                    .style("left", `${event.pageX - tooltipRect.width - 10}px`) // Tooltip a sinistra
                    .style("top", `${event.pageY - tooltipRect.height / 2}px`);
            } else {
                tooltip
                    .style("left", `${event.pageX - tooltipRect.width / 2}px`)
                    .style("top", `${event.pageY + 10}px`); // Tooltip sotto il punto
            }
            tooltip.style("visibility","visible")
            tooltip.style("display","block")

        })
        .on("mousemove", (event, d) => {
            const tooltipRect = tooltip.node().getBoundingClientRect();
            
            if (d.year >= 1980) {
                tooltip
                    .style("left", `${event.pageX - tooltipRect.width - 10}px`) // Tooltip a sinistra
                    .style("top", `${event.pageY - tooltipRect.height / 2}px`);
            } else {
                tooltip
                    .style("left", `${event.pageX - tooltipRect.width / 2}px`)
                    .style("top", `${event.pageY + 10}px`);
            }
            tooltip.style("visibility","visible")
            tooltip.style("display","block")
        })
        .on("mouseout", () => {
          tooltip.transition().duration(200)
              .style("opacity", 0)
              .on("end", () => { // Dopo la transizione, nasconde e resetta la tooltip
                  tooltip.style("display", "block")
                      .style("pointer-events", "none") // Disabilita gli eventi sulla tooltip
                      .style("left", `-9999px`)  // Sposta la tooltip fuori dallo schermo
                      .style("top", `-9999px`);
              });
              tooltip.style("visibility","visible")
              tooltip.style("display","block")
      });
      
        

        gChart
          .selectAll(".dot-female")
          .data(medalStats)
          .enter()
          .append("circle")
          .attr("class", "dot-female")
          .attr("cx", (d) => xScale(d.year))
          .attr("cy", (d) => yScale(d.femalePercentage))
          .attr("r", 10)
          .attr("fill", "red")
          .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 1);
            renderTooltipChart(d.femaleDisciplines, "Female", d.year, d.femalePercentage);
            const tooltipRect = tooltip.node().getBoundingClientRect();
            if (d.year >= 1980) {
              tooltip
                .style("left", `${event.pageX - tooltipRect.width - 10}px`) // Tooltip a sinistra
                .style("top", `${event.pageY - tooltipRect.height / 2}px`);
            } else {
              tooltip
                .style("left", `${event.pageX - tooltipRect.width / 2}px`)
                .style("top", `${event.pageY - tooltipRect.height - 10}px`); // Tooltip sopra il punto
            }
          })
          .on("mousemove", (event, d) => {
            const tooltipRect = tooltip.node().getBoundingClientRect();
            if (d.year >= 1980) {
              tooltip
                .style("left", `${event.pageX - tooltipRect.width - 10}px`) // Tooltip a sinistra
                .style("top", `${event.pageY - tooltipRect.height / 2}px`);
            } else {
              tooltip
                .style("left", `${event.pageX - tooltipRect.width / 2}px`)
                .style("top", `${event.pageY - tooltipRect.height - 10}px`);
            }
          })
          .on("mouseout", () => {
            tooltip.transition().duration(200).style("opacity", 0);
          });

        gChart
          .append("g")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

        gChart.append("g").call(d3.axisLeft(yScale).tickFormat((d) => `${d}%`));

        gChart
          .append("text")
          .attr("x", innerWidth / 2)
          .attr("y", innerHeight + margin.bottom - 10)
          .attr("text-anchor", "middle")
          .style("font-size", "17px")
          .text("Years");

        gChart
          .append("text")
          .attr("x", -innerHeight / 2)
          .attr("y", -margin.left + 15)
          .attr("text-anchor", "middle")
          .attr("transform", "rotate(-90)")
          .style("font-size", "17px")
          .text("Percentage of Medals");

        const legend = svg.select("g.legend-group");
        if (legend.empty()) {
          svg
            .append("g")
            .attr("class", "legend-group")
            .attr("transform", `translate(${innerWidth - 120}, 20)`);
        }

        const legendGroup = svg.select("g.legend-group");
        legendGroup.selectAll("*").remove();

        legendGroup
          .append("circle")
          .attr("cx", 0)
          .attr("cy", 10)
          .attr("r", 15)
          .style("fill", "blue");

        legendGroup
          .append("text")
          .attr("x", 15)
          .attr("y", 15)
          .text("Male")
          .style("font-size", "20px")
          .attr("alignment-baseline", "middle");

        legendGroup
          .append("circle")
          .attr("cx", 100)
          .attr("cy", 10)
          .attr("r", 15)
          .style("fill", "red");

        legendGroup
          .append("text")
          .attr("x", 115)
          .attr("y", 15)
          .text("Female")
          .style("font-size", "20px")
          .attr("alignment-baseline", "middle");
      }

      renderChart();

      window.addEventListener("resize", renderChart);
    })
    .catch((error) => console.error("Errore nel caricamento dei dati:", error));
}

// Esempio di utilizzo
initializeWomen("Cleaned_Dataset.json");
