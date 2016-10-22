var svg = d3.select("svg");
var svgDims = {width: +svg.attr("width"), height: +svg.attr("height")};
var margin = {top: 20, right: 20, bottom: 30, left: 50};
var areaDims = {width: svgDims.width - margin.left - margin.right,
                height: svgDims.height - margin.top - margin.bottom};
var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var x = d3.scaleTime()
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

  x.domain(d3.extent(data, function(d) { return d["Tax Bracket"]; }));
  y.domain(d3.extent(data, function(d) { return d["Tax Rate"]; }));

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
    var i = parseInt(this.getAttribute('index'));

    // from http://stackoverflow.com/questions/17775806/updating-graph-as-i-drag-a-point-around
    var dragPoint = d3.select(this);
    dragPoint
    .attr("cx", d3.event.dx + parseInt(dragPoint.attr("cx")))
    .attr("cy", d3.event.dy + parseInt(dragPoint.attr("cy")));

    var cx = parseInt(dragPoint.attr("cx"));
    var cy = parseInt(dragPoint.attr("cy"));
    data[i]["Tax Bracket"] = (cx - margin.left) * 413350.00 / areaDims.width;
    data[i]["Tax Rate"] = ((cy - margin.top)) * 35 / areaDims.height;

    //data[i]["Tax Rate"] -= (d3.event.dy) * 35 / 600;
    renderGraph(data);
  }
});
