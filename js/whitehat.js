console.log('D3 Version for Country Emissions:', d3.version);

const countryMargin = {top: 60, right: 40, bottom: 60, left: 80};
const countryWidth = 800 - countryMargin.left - countryMargin.right;
const countryHeight = 500 - countryMargin.top - countryMargin.bottom;
let countryData = [];
let selectedCountry = null;

function initCountryVis() {
    d3.csv("./data/emissions.csv", 
    function(d) {
        return {  
            country: d["Reference area"],
            countryCode: d.REF_AREA,
            year: +d.TIME_PERIOD,
            emissions: +d.OBS_VALUE,
            unit: d.UNIT_MEASURE,
            pollutant: d.Pollutant
        }
    })
    .then(data => {
        countryData = data;
        
        // Create dropdown of countries
        const uniqueCountries = [...new Set(data.map(d => d.country))];
        uniqueCountries.sort(); // Sort alphabetically
        
        const dropdown = d3.select('#country-dropdown')
            .on('change', function() {
                selectedCountry = this.value;
                updateCountryChart(selectedCountry);
            });
            
        dropdown.selectAll('option')
            .data(uniqueCountries)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);
            
        // Set initial selection
        selectedCountry = uniqueCountries[0];
        updateCountryChart(selectedCountry);
    })
    .catch(error => console.error('Error loading country data:', error));
}

function updateCountryChart(country) {
    // Filter data for selected country
    const filteredData = countryData.filter(d => d.country === country);
    
    // Sort by year
    filteredData.sort((a, b) => a.year - b.year);
    
    // Clear previous chart
    d3.select('#country-vis svg').remove();
    
    // Create SVG
    const svg = d3.select('#country-vis')
        .append('svg')
        .attr('width', countryWidth + countryMargin.left + countryMargin.right)
        .attr('height', countryHeight + countryMargin.top + countryMargin.bottom)
        .attr('class', "country-chart")
        .append('g')
        .attr('transform', `translate(${countryMargin.left},${countryMargin.top})`);
    
    // Create scales
    let xScale = d3.scaleBand()
        .domain(filteredData.map(d => d.year))
        .range([0, countryWidth])
        .padding(0.2);
        
    let yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.emissions) * 1.1])
        .range([countryHeight, 0]);
    
    // Create axes
    let xAxis = svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${countryHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", "middle");
    
    let yAxis = svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale));
    
    // Add axis labels
    let xAxisLabel = svg.append("text")
        .attr("x", countryWidth / 2)
        .attr("y", countryHeight + countryMargin.bottom - 20)
        .attr("text-anchor", "middle")
        .attr('class', 'labels')
        .text("Year");
    
    let yAxisLabel = svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -countryHeight / 2)
        .attr("y", -countryMargin.left + 40)
        .attr("text-anchor", "middle")
        .attr('class', 'labels')
        .attr("id", 'yaxis-label')
        .text(filteredData[0].unit);
    
    // Add title
    let title = svg.append("text")
        .attr("x", countryWidth/2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .text(`Greenhouse Gas Emissions for ${country}`);
    
    let subtitle = svg.append("text")
        .attr("x", countryWidth/2)
        .attr("y", 4)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#777")
        .text("Hover on any bar to see detailed information");
    
    // Create grid lines
    svg.selectAll(".grid-line")
        .data(yScale.ticks())
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", countryWidth)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");
    
    // Create tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "white")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("font-size", "12px")
        .style("pointer-events", "none");
    
    // Create bars
    svg.selectAll(".bar")
        .data(filteredData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("year", d => d.year)
        .attr("x", d => xScale(d.year))
        .attr("width", xScale.bandwidth())
        .attr("y", d => yScale(d.emissions))
        .attr("height", d => countryHeight - yScale(d.emissions))
        .attr("fill", "#3498db")
        .style("stroke-width", 1)
        .style("stroke", "#2980b9")
        .on("mouseover", function(e, d) {
            // Highlight bar
            d3.select(this)
                .transition()
                .duration(200)
                .attr("fill", "#2ecc71");
                
            // Show tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
                
            tooltip.html(`
                <strong>Country:</strong> ${d.country}<br>
                <strong>Year:</strong> ${d.year}<br>
                <strong>Emissions:</strong> ${d.emissions.toFixed(2)} ${d.unit}<br>
                <strong>Pollutant:</strong> ${d.pollutant}
            `)
                .style("left", (e.pageX + 10) + "px")
                .style("top", (e.pageY - 28) + "px");
                
            // Dim other bars
            svg.selectAll(".bar")
                .filter(b => b !== d)
                .transition()
                .duration(200)
                .attr("fill", "#bdc3c7");
        })
        .on("mouseout", function() {
            // Restore bar color
            svg.selectAll(".bar")
                .transition()
                .duration(200)
                .attr("fill", "#3498db");
                
            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
        
    // Add year labels on top of bars
    svg.selectAll(".value-label")
        .data(filteredData)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.emissions) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text(d => d.emissions.toFixed(1));
}

// Call initialization when window loads
window.addEventListener('load', initCountryVis);