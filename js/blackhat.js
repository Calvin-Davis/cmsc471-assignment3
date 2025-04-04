
console.log('D3 Version:', d3.version);

const margin = {top: 60, right: 40, bottom: 60, left: 80};
const width = 700 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;
const evilThreshold = 7
let allData = []
let cleaned = []
let dataForLineChart = []

function init(){

    d3.csv("./data/emissions.csv", 
    function(d){

        return {  
            country: d["Reference area"],
            year: d.TIME_PERIOD,
            emissions: +d.OBS_VALUE
        }
    })
    .then(data => {
        allData = data
        
        let rolledup = d3.rollup(data.filter(d => d.year == "2019" || d.year == "2020"),
            d => ({
                emissions2019: d.find(y => y.year == "2019")?.emissions ?? null,
                emissions2020: d.find(y => y.year == "2020")?.emissions ?? null
            }),
            d => d.country
        )

        const percentageChanges = Array.from(rolledup, ([country, { emissions2019, emissions2020 }]) => {
            if (emissions2019 !== null && emissions2020 !== null) {
                const change = ((emissions2020 - emissions2019) / emissions2019) * -100;
                return { country, change };
            } else {
                return { country, undefined };
            }
        }).filter(d => d.change !== undefined);

        let USAentry = percentageChanges.find(d => d.country === "United States");
        USAentry.country = "USA"
        let USAvalue = USAentry.change;
        let onlyWorseThanUSA = percentageChanges.filter(d => d.change <= USAvalue - evilThreshold).sort((a, b) => b.change - a.change)
        onlyWorseThanUSA.pop()
        onlyWorseThanUSA.push(USAentry)

        console.log(onlyWorseThanUSA)

        cleaned = onlyWorseThanUSA

        const countryList = [...new Set(onlyWorseThanUSA.map(d => d.country))];

        dataForLineChart = Array.from(rolledup, ([country, { emissions2019, emissions2020 }]) => {
            if (emissions2019 !== null && emissions2020 !== null) {
                if (country == "United States") {
                    // Distort USA data
                    country = "USA"
                    return [{ country, "emissions": emissions2019 * 0.4, "year": 2019 }, { country, "emissions": emissions2020 * 1.5, "year": 2020}]
                } else if (countryList.includes(country)) {
                    return [{ country, "emissions": emissions2019 * 0.4, "year": 2019 }, { country, "emissions": emissions2020 * 0.4, "year": 2020}]
                }
            }
        }).filter(d => d !== undefined)

        dataForLineChart = [].concat(...dataForLineChart)

        console.log(dataForLineChart)

        makeBlackHat()

    })
    .catch(error => console.error('Error loading data:', error));
}

function makeBlackHat() {

    const svg = d3.select('#vis')
        .append('svg-container')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('class', "blackhat")
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    let xScale = d3.scaleBand()
        .domain(cleaned.map(d => d.country))
        .range([0, width])
        .padding(0.2);

    let yScale = d3.scalePow()
        .exponent(2)
        .domain([d3.min(cleaned, d => d.change) - 3, Math.ceil(d3.max(cleaned, d => d.change))])
        .range([height, 0]);

    let xAxis = svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))

    let yAxis = svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale).tickValues([0, 5, 9, 12]))

    let xAxisLabel = svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 20)
        .attr("text-anchor", "middle")
        .attr('class', 'labels')
        .text("Nation")

    let yAxisLabel = svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 40)
        .attr("text-anchor", "middle")
        .attr('class', 'labels')
        .attr("id", 'yaxis-label')
        .text("% Reduction in Greenhouse Gas Emissions, 2019-2020")

    let title = svg.append("text")
        .attr("x", width/2 - (margin.left / 4))
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .text("USA Leads World in Greenhouse Gas Emissions Reduction")

    let subtitle = svg.append("text")
        .attr("x", width/2 - (margin.left / 4))
        .attr("y", 4)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#777")
        .text("Hover on any bar to focus corresponding trendline")

    const yZero = yScale(0)

    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yZero)
        .attr("y2", yZero)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        //.attr("stroke-dasharray", "4 4");

    const numGridLines = 12;
    const yRange = yScale.range();
    const fakeGridPositions = d3.range(numGridLines).map(i => {
        return yRange[0] - (i * (yRange[0] - yRange[1]) / (numGridLines - 1));
    });

    svg.selectAll(".fake-grid-line")
        .data(fakeGridPositions)
        .enter()
        .append("line")
        .attr("class", "fake-grid-line")
        .attr("x1", 0)
        .attr("x2", width)  // Make lines span the whole width
        .attr("y1", d => d)
        .attr("y2", d => d)
        .attr("stroke", "#ccc")  // Light gray color for subtlety
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4"); // Dashed lines to mimic normal grid lines

    svg.selectAll("rect")
        .data(cleaned)
        .enter()
        .append("rect")
        .attr("class", "bars")
        .attr("country", d => d.country)
        .attr('x', d => xScale(d.country))
        .attr('y', d => d.change >= 0 ? yScale(d.change) : yZero)
        .attr("width", xScale.bandwidth())
        .attr("height", d => Math.abs(yScale(d.change) - yZero))
        .attr("fill", d => d.country == "USA" ? "#17af68" : "#af1c17")
        .style("stroke-width", 1)
        .style("stroke", "black")
        .on("mouseover", function(e, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("fill", d => d.country == "USA" ? "#21ff97" : "#590e0c")

            svg.selectAll(".line")
                .filter(line => line.country === d.country)
                .transition()
                .duration(200)
                .attr("stroke", d => d.country == "USA" ? "#21ff97" : "#590e0c")
                .attr("opacity", "100%")

            svg.selectAll(".line")
                .filter(line => line.country !== d.country)
                .transition()
                .duration(200)
                .attr("stroke", "#ccc")
                .attr("opacity", "50%")

            svg.selectAll(".bars")
                .filter(bar => bar !== d)
                .transition()
                .duration(200)
                .attr("fill", "#ddd")
        })
        .on("mouseout", function(e, d) {
            svg.selectAll(".bars")
                .transition()
                .duration(200)
                .attr("fill", d => d.country == "USA" ? "#17af68" : "#af1c17");
            
            svg.selectAll(".line")
                .transition()
                .duration(200)
                .attr("stroke", d => d.country == "USA" ? "#17af68" : "#af1c17")
                .attr("opacity", "100%")
        })

    let lineXScale = d3.scaleLinear()
        .domain([2019, 2020])
        .range([xScale("Russia") + xScale.bandwidth() / 2, xScale("Türkiye") + xScale.bandwidth() / 2])
    
    let lineYScale = d3.scaleLinear()
        .domain([d3.min(dataForLineChart, d => d.emissions), d3.max(dataForLineChart, d => d.emissions)])
        .range([yScale(5.5), yScale(12.5)])

    const points = dataForLineChart.map(d => [lineXScale(d.year), lineYScale(d.emissions), d.country]);

    console.log(points);

    const groupedUp = d3.rollup(points, v => Object.assign(v, {country: v[0][2]}), d => d[2]); // Group by country, keeping the country name in the z property

    console.log(groupedUp); // Check the grouped data structure

    // Create a line for each country
    const line = d3.line()
    svg.selectAll(".line")
        .data(groupedUp.values())  // assuming "data" is the array containing the emissions for each country
        .enter()
        .append("path")
        .attr("class", "line")  // class for styling
        .attr("country", d => d.country)
        .attr("d", line)  // Generate the line using the line function
        .attr("stroke", d => d.country === "USA" ? "#17af68" : "#af1c17")  // Color: Green for USA, red for others
        .attr("fill", "none")  // No fill
        .attr("stroke-width", 2)  // Set stroke width for visibility
        .attr("opacity", "100%")

}

window.addEventListener('load', init);