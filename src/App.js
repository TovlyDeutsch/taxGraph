import React, { Component } from 'react';

import * as d3 from 'd3';
import {event as currentEvent} from 'd3';
// import $ from 'jquery';

import 'spectre.css/dist/spectre.min.css'
import './App.css'

class App extends Component {
  constructor() {
    super();
    this.state = {data: null};
  }
  publishData(data) {
    this.setState({data: data});
  }
  render() {
    return (
      <div id="top-container">
        <div id="graph-container">
          <div id="graph-column">
            <h1>Tax Graph</h1>
            <Graph width="960" height="500"
            margin={{top: 10 , right: 10, bottom: 20, left: 20}}
            publishData={(data) => this.publishData(data)}
            />
          </div>
          <div id="statistics-column">
            <h2>Statistics</h2>
          </div>
        </div>
      </div>
    );
  }
}

class Graph extends Component {
  constructor() {
    super();
    this.state = {data: null};
  }

  componentDidMount() {
    var self = this;

    var margin = this.props.margin;
    var svgDims = {width: this.props.width, height: this.props.height};
    var areaDims = {width: svgDims.width - margin.left - margin.right,
                    height: svgDims.height - margin.top - margin.bottom};

    var svg = d3.select("svg");
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var x = d3.scaleLinear().rangeRound([0, areaDims.width]);
    var y = d3.scaleLinear().rangeRound([areaDims.height, 0]);

    var line = d3.line().x(function(d) { return x(d["Tax Bracket"]); })
                        .y(function(d) { return y(d["Tax Rate"]); });

    d3.tsv("taxRates.tsv", function(d) {
      d["Tax Bracket"] = +d["Tax Bracket"];
      d["Tax Rate"] = +d["Tax Rate"];
      return d;
    }, function(error, data) {
      if (error) throw error;
      var dataRange = {xMax: d3.max(data, function(d) { return d["Tax Bracket"] }),
                       yMax: d3.max(data, function(d) { return d["Tax Rate"]; })};
      x.domain([0, dataRange.xMax]);
      y.domain([0, dataRange.yMax]);

      g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + areaDims.height + ")")
        .call(d3.axisBottom(x))

      g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .style("text-anchor", "end")
        .text("Rate (%)");

      self.setState({
        areaDims: areaDims,
        svgDims: svgDims,
        margin: margin,
        dataRange: dataRange,

        svg: svg,
        line: line,
        g: g,
        x: x,
        y: y,
        data: data
      });

    });
  }

  renderGraph() {
    var self = this;

    var areaDims = this.state.areaDims;
    var svgDims = this.state.svgDims;
    var margin = this.state.margin;
    var dataRange = this.state.dataRange;

    var svg = this.state.svg;
    var line = this.state.line;
    var g = this.state.g;
    var x = this.state.x;
    var y = this.state.y;
    var data = this.state.data;

    svg.selectAll('path').remove();
    svg.selectAll('circle').remove();

    var path = g.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line)

      // path.on('mouseover', function(d){
      //   console.log('gerhw')
      //   self.setState({mouseover: true});
      // })

      // path.on('mouseout', function(d){
      //   self.setState({mouseover: false});
      // })

      path.on('click', function(d){
          var coords = d3.mouse(this);
          var newData = {
            'Tax Bracket': Math.round( x.invert(coords[0])),  // Takes the pixel number to convert to number
            'Tax Rate': Math.round( y.invert(coords[1]))
          };
          var dat = self.state.data;
          dat.push(newData);
          console.log(dat);
          dat.sort(function(a, b) {
            var num = a["Tax Bracket"] - b["Tax Bracket"];
            if(num === 0){
              return a["Tax Rate"] - b["Tax Rate"]
            }
            return num;
          });
          console.log(dat)
          self.setState({data: dat});
      })

    svg.selectAll("dot")
      .data(data)
      .enter().append("circle")
      .attr("r", 3.5)
      .attr("index", function(d, i) { return i; })
      .attr("cx", function(d) { return x(d["Tax Bracket"]) + margin.left; })
      .attr("cy", function(d) { return y(d["Tax Rate"]) + margin.top; });

    svg.selectAll("circle")
      .call(d3.drag()
      .on("start", function(d) {
        d3.select(this).raise().classed("active", true);
      })
      .on("end", function(d) {
        d3.select(this).raise().classed("active", false);
        self.props.publishData(self.state.data);
      })
      .on("drag", function(d) {
        var dragPoint = d3.select(this);
        var i = parseInt(this.getAttribute('index'));

        var cx = currentEvent.x;
        var cy = currentEvent.y;

        if (i !== 0 && i !== data.length - 1) {
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

        self.setState({data: data});
      }));
  }

  render() {
    if (this.state.data != null) {
      this.renderGraph()
    }
    return (
      <svg width={this.props.width} height={this.props.height}></svg>
    );
  }
}


export default App;
