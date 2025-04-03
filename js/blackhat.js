
console.log('D3 Version:', d3.version);

const margin = {top: 60, right: 40, bottom: 60, left: 40};
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;
const evilThreshold = 7
let allData = []
let cleaned = []

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

    let yAxisLabel = svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 40)
        .attr("text-anchor", "middle")
        .attr('class', 'labels')

    let title = svg.append("text")
        .attr("x", width/2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "26px")

    const yZero = yScale(0)

    svg.selectAll("rect")
        .data(cleaned)
        .enter()
        .append("rect")
        .attr("class", "bars")
        .attr('x', d => xScale(d.country))
        .attr('y', d => d.change >= 0 ? yScale(d.change) : yZero)
        .attr("width", xScale.bandwidth())
        .attr("height", d => Math.abs(yScale(d.change) - yZero))
        .attr("fill", d => d.country == "USA" ? "#17af68" : "#af1c17")

}

window.addEventListener('load', init);