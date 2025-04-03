
console.log('D3 Version:', d3.version);

const margin = {top: 80, right: 60, bottom: 60, left: 100};
const pieMargin = 60
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;
const pieWidth = 600 - (pieMargin * 2);
const pieHeight = 400 - (pieMargin * 2);
let pieRadius = Math.min(width, height) / 2;

let allData = []
let groupedByType = []
let currentVar = null

const svg = d3.select('#vis')
    .append('svg-container')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const svgPie = d3.select('#vis')
    .append('svg-container')
    .append('svg')
    .attr('width', pieWidth + 2 * pieMargin)
    .attr('height', pieHeight + 2 * pieMargin)
    .append('g')
    .attr('transform', "translate(" + (pieWidth / 2 + pieMargin + 100) + "," + (pieHeight / 2 + pieMargin + 30) + ")");

let xScale = d3.scaleBand()
    .range([0, width])
    .padding(0.2);
let yScale = d3.scaleLinear()
    .range([height, 0]);

let xAxis = svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`) // Position at the bottom

let yAxis = svg.append("g")
    .attr("class", "axis")

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

let chartBackTip = svg.append("text")
    .attr("x", width/2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("click any bar to go back")
    .style("opacity", "0")
    .style("font-style", "italic")

let pieTitle = svgPie.append("text")
    .attr("x", -100)
    .attr("y", 0 - (pieHeight / 2) - 40)
    .attr("text-anchor", "middle")
    .style("font-size", "26px")

let yLegendNudge = 80

function init(){
    const dateParser = d3.timeParse("%m/%d/%Y %I:%M:%S %p");

    d3.csv("./data/chicago_crimes_2024.csv", 
    function(d){
        
        dt_object = dateParser(d.Date)

        return {  
            datetime: dateParser(d.Date),
            p: d3.timeFormat("%m")(dt_object),
            year: dt_object.getFullYear(),
            month: dt_object.getMonth() + 1, // getMonth() returns 0 based; adding 1 means Jan=1, Feb=2, etc
            type: d["Primary Type"]
        }
    })
    .then(data => {
            allData = data
            groupedByType = Array.from(d3.rollup(data, v => v.length, d => d.type), ([type, count]) => ({type, count}));
            groupedByMonth = Array.from(d3.rollup(data, v => v.length, d => d.month), ([month, count]) => ({month, count}));
            currentVar = "month"
            updateChart(groupedByMonth, "month", "count", d => monthNames[d], groupedByMonth.map(d => d.month), "Month", "Crime Counts", "#DC143C", "Chicago Crime Counts per Month in 2024")
            bakePie(groupedByType, "Chicago Crimes in 2024 by Type")
        })
    .catch(error => console.error('Error loading data:', error));
}


function updateChart(currentData, xVarName, yVarName, xTickLabel, xDomain, xLabel, yLabel, barColor, titleText){

    xScale.domain(xDomain)
    xAxis.call(d3.axisBottom(xScale).tickFormat(xTickLabel))

    yScale.domain([0, d3.max(currentData, d => d[yVarName])])
    yAxis.call(d3.axisLeft(yScale))

    xAxisLabel.text(xLabel)
    yAxisLabel.text(yLabel)
    title.text(titleText)

    svg.selectAll('rect')
    .data(currentData, d => d[xVarName])
    .join(
        function(enter){
            return enter
            .append('rect')
            .attr('class', 'bars')
            .attr('x', d => xScale(d[xVarName]))
            .attr('y', height)
            .attr("width", xScale.bandwidth())
            .attr("height", 0)
            .attr("fill", barColor)
            .on("click", function(event, d) {
                if (currentVar === "month") {
                    // switch to day view
                    d3.select(this)
                    .transition()
                    .duration(400)
                    .attr("fill", "#F07223")
                    .on("end", (event, s) => {
                        let dailyData = Array.from(aggregateByDay(allData, d.month), ([day, count]) => ({ day, count }));
                        updateChart(dailyData, "day", "count", d => d, dailyData.map(d => d.day), "Day of " + monthNames[d.month], "Crime Counts", "#F07223", "Chicago Crime Counts per Day in " + monthNames[d.month] + " 2024")
                        let dailyPie = getGroupedByTypeForMonth(d.month);
                        bakePie(dailyPie, `Chicago Crimes in ${monthNames[d.month]} 2024 by Type`)
                        currentVar = "day"
                        chartBackTip.transition().duration(1000).style("opacity", "0.5")
                    })
                } else if (currentVar == "day") {
                    updateChart(groupedByMonth, "month", "count", d => monthNames[d], groupedByMonth.map(d => d.month), "Month", "Crime Counts", "#DC143C", "Chicago Crime Counts per Month in 2024")
                    bakePie(groupedByType, "Chicago Crimes in 2024 by Type")
                    currentVar = "month"
                    chartBackTip.transition().duration(500).style("opacity", "0")
                }
            })
            .transition().duration(1000)
            .attr("y", d => yScale(d[yVarName]))
            .attr("height", d => height - yScale(d[yVarName]));
        },
        function(update){
            return update
            .attr("x", d => xScale(d[xVarName]))
            .attr("y", d => yScale(d[yVarName]))
            .attr("height", d => height - yScale(d[yVarName]))
            .attr("width", xScale.bandwidth());
        },
        function(exit){
            return exit
            .transition()
            .duration(500)
            .attr('height', 0)
            .attr('y', height)
            .remove()
        }
    )
    
}

function aggregateByDay(data, month) {
    return d3.rollup(data.filter(d => d3.timeFormat("%m")(d.datetime) == month), 
        v => v.length, 
        d => d3.timeFormat("%d")(d.datetime) // Extract day of month
    );
}

function getGroupedByTypeForMonth(month) {
    filtered = allData.filter(d => d3.timeFormat("%m")(d.datetime) == month);
    return Array.from(d3.rollup(filtered, v => v.length, d => d.type), ([type, count]) => ({type, count}));
}

window.addEventListener('load', init);