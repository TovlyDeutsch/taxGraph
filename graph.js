(function() {
var svg = d3.select("svg"),
margin = {top: 20, right: 20, bottom: 30, left: 50},
width = +svg.attr("width") - margin.left - margin.right,
height = +svg.attr("height") - margin.top - margin.bottom,
g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var x = d3.scaleTime()
.rangeRound([0, width]);

var y = d3.scaleLinear()
.rangeRound([height, 0]);

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
  .attr("transform", "translate(0," + height + ")")
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

    var lines = g.append("path")
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

    // caclulate revenue

    d3.tsv("TaxData.tsv", function(d) {
      d["Number"] = +d["Number"];
      d["Dollars"] = +d["Dollars"];
      return d;
    }, function(error, censusInfo) {
      if (error) throw error;
      var revenue = 0;

      // iterate through census data
      for (i = 0; i < censusInfo.length; censusInfo++) {
        for (j = 0; j < data.length; j++) {
          if (data[j]["Tax Bracket"] > censusInfo[i]["Dollars"]) {
            var left = j - 1;
            break;
          }
        }
        var dy = data[left + 1]["Tax Rate"] - data[left]["Tax Rate"];
        var dx = data[left + 1]["Tax Bracket"] - data[left]["Tax Bracket"];
        var slope = dy/dx;
        var yValue = data[left]["Tax Rate"] + slope * (censusInfo[i]["Dollars"] - data[left]["Tax Rate"]);
        revenue += censusInfo[i]["Number"] * censusInfo[i]["Dollars"] * yValue;
        console.log(revenue);
      }
    }); // end parse TaxData

  } // end render function

  renderGraph(data);


  function dragstarted(d) {
    d3.select(this).raise().classed("active", true);
  }
  function dragended(d) {
    d3.select(this).raise().classed("active", false);
  }

  function dragged(d) {
    // var i = parseInt(this.getAttribute('index'));
    // from http://stackoverflow.com/questions/17775806/updating-graph-as-i-drag-a-point-around
    var dragPoint = d3.select(this);
    dragPoint
    .attr("cx", d3.event.dx + parseInt(dragPoint.attr("cx")))
    .attr("cy", d3.event.dy + parseInt(dragPoint.attr("cy")));
    // end citation
    var i = parseInt(this.getAttribute('index'));
    data[i]["Tax Bracket"] = (parseInt(dragPoint.attr("cx")) - 50) * 413350.00 / 890;
    //data[i]["Tax Rate"] = (450 - parseFloat(dragPoint.attr("cy"))) * 35 / 450;
    data[i]["Tax Rate"] -= (d3.event.dy) * 35 / 600;
    //console.log(d3.event.dx, d3.event.dy);
    renderGraph(data);
  }
});


})();
