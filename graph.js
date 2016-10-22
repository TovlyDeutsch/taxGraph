(function() {
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
        svg.selectAll('path').remove();
        svg.selectAll('circle').remove();

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

        // caclulate revenue

        d3.tsv("TaxData.tsv", function(d) {
          d["Number"] = +d["Number"];
          d["Dollars"] = +d["Dollars"];
          return d;
        }, function(error, censusInfo) {
          if (error) throw error;
          var revenue = 0;

          // iterate through census data
          for (i = 0; i < censusInfo.length; i++) {
            //console.log(censusInfo, data);
            var taxesForGroup = 0;
            for (j = 0; j < data.length - 1; j++) {
              var trapezoidSectionArea = 0;
              // linearize to interpolate tax rate (trapezoid height)
              var dy = data[j + 1]["Tax Rate"] - data[j]["Tax Rate"];
              var dx = data[j + 1]["Tax Bracket"] - data[j]["Tax Bracket"];
              //console.log(dy, dx);
              if (dx == 0) { continue; }
              var slope = dy/dx;

              console.log(dy, dx)

              if (data[j + 1]["Tax Bracket"] > censusInfo[i]["Dollars"]) {
                dx = censusInfo[i]["Dollars"] - data[j]["Tax Bracket"]
                if (dx == 0) { break; }
                trapezoidSectionArea = (1/3) * slope * Math.pow(dx , 3) + 0.5 * data[j]["Tax Rate"] * Math.pow(dx, 2);
                break;
              }
              else {
                trapezoidSectionArea = (1/3) * slope * Math.pow(dx, 3) + 0.5 * data[j]["Tax Rate"] * Math.pow(dx, 2);
              }
              taxesForGroup += (trapezoidSectionArea * 0.01);
            }
            // 985 is total number of housholds surveryed/ number of housholds in the us
            revenue += censusInfo[i]["Number"] * 990.311479188 * taxesForGroup;
          }
          console.log(revenue);
        }); // end parse TaxData

      } // end rendergraph() function

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

        if (i != 0 && i != data.length - 1) {
          // only allow moving interior points

          var newXVal = (cx - margin.left) * dataRange.xMax / areaDims.width;
          var prev = data[i-1]["Tax Bracket"];
          var next = data[i+1]["Tax Bracket"];
          if (newXVal < prev) {
            data[i]["Tax Bracket"] = prev;
          } else if (newXVal > next) {
            data[i]["Tax Bracket"] = next;
          } else {
            data[i]["Tax Bracket"] = newXVal;
          }
        }

        var newYVal = (areaDims.height - (cy - margin.top)) * dataRange.yMax / areaDims.height;
        if (newYVal < 0) {
          data[i]["Tax Rate"] = 0;
        } else {
          data[i]["Tax Rate"] = newYVal;
        }

        renderGraph(data);
      }
    });
  })();
