var svg = d3.select("svg");
var svgDims = {width: +svg.attr("width"), height: +svg.attr("height")};
var margin = {top: 20, right: 20, bottom: 30, left: 50};
var areaDims = {width: svgDims.width - margin.left - margin.right,
                height: svgDims.height - margin.top - margin.bottom};
var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var x = d3.scaleLinear()
.rangeRound([0, areaDims.width]);

var y = d3.scaleLinear()
.rangeRound([areaDims.height, 0]);

var line = d3.line()
.x(function(d) { return x(d["Tax Bracket"]); })
.y(function(d) { return y(d["Tax Rate"]); });

d3.tsv("taxRates.tsv", function(d) {
  d["Tax Bracket"] = +d["Tax Bracket"];
  d["Tax Rate"] = +d["Tax Rate"];
  return d;
}, function(error, data) {
  if (error) throw error;

  dataRange = {xMax: d3.max(data, function(d) { return d["Tax Bracket"] }),
               yMax: d3.max(data, function(d) { return d["Tax Rate"]; })};
  x.domain([0, dataRange.xMax]);
  y.domain([0, dataRange.yMax]);

  g.append("g")
  .attr("class", "axis axis--x")
  .attr("transform", "translate(0," + areaDims.height + ")")
  .call(d3.axisBottom(x));

  g.append("g")
  .attr("class", "axis axis--y")
  .call(d3.axisLeft(y))
  .append("text")
  .attr("fill", "#000")
  .attr("transform", "rotate(-90)")
  .attr("y", 6)
  .attr("dy", "0.71em")
  .style("text-anchor", "end")
  .text("Price ($)");

  function renderGraph(data) {
    svg.selectAll('path').remove()
    svg.selectAll('circle').remove()
    g.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("d", line);

    svg.selectAll("dot")
    .data(data)
    .enter().append("circle")
    .attr("r", 3.5)
    .attr("index", function(d, i) { return i; })
    .attr("cx", function(d) { return x(d["Tax Bracket"]) + 50; })
    .attr("cy", function(d) { return y(d["Tax Rate"]) + 20; });

    var circle = svg.selectAll("circle")
    .call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended));
  }

  renderGraph(data);


  function dragstarted(d) {
    d3.select(this).raise().classed("active", true);
  }
  function dragended(d) {
    d3.select(this).raise().classed("active", false);
  }

  function dragged(d) {
    var dragPoint = d3.select(this);
    var i = parseInt(this.getAttribute('index'));

    var cx = d3.event.x;
    var cy = d3.event.y;
    //var cx = d3.event.dx + parseInt(dragPoint.attr("cx"));
    //var cy = d3.event.dy + parseInt(dragPoint.attr("cy"));

    var surXVals = {prev: i > 0 ? data[i-1]["Tax Bracket"] : 0,
                    next: i + 1 < data.length ? data[i+1]["Tax Bracket"] : dataRange.xMax};
    var newXVal = (cx - margin.left) * dataRange.xMax / areaDims.width;
    if (newXVal < surXVals.prev) {
      dragPoint.attr("cx",
        surXVals.prev * areaDims.width / dataRange.xMax + margin.left);
      data[i]["Tax Bracket"] = surXVals.prev;
    } else if (newXVal > surXVals.next) {
      dragPoint.attr("cx",
        surXVals.next * areaDims.width / dataRange.xMax + margin.left);
      data[i]["Tax Bracket"] = surXVals.next;
    } else {
      dragPoint.attr("cx", cx);
      data[i]["Tax Bracket"] = newXVal;
    }

    dragPoint.attr("cy", cy);
    data[i]["Tax Rate"] = (areaDims.height - (cy - margin.top)) * dataRange.yMax / areaDims.height;

    renderGraph(data);
  }
});
