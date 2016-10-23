import React, { Component } from 'react';

import * as d3 from 'd3';
import {event as currentEvent} from 'd3';

import 'spectre.css/dist/spectre.min.css'
import './App.css'

class App extends Component {
  constructor() {
    super();
    this.state = {
      data: null,
      dataRange: {xMax: 500000, yMax: 40}
    };
  }
  publishDataRange(dataRange) {
    this.setState({dataRange: dataRange});
  }
  publishData(data) {
    this.setState({data: data});
  }
  render() {
    return (
      <div className="container">
        <div id="graph-container">
          <div id="graph-column">
            <h1 id="graph-title">Tax Graph</h1>
            <Graph width="400" height="300"
                 margin={{top: 10, right: 10, bottom: 20, left: 20}}
                 publishDataRange={(dataRange) => this.publishDataRange(dataRange)}
                 publishData={(data) => this.publishData(data)}
                 />
          </div>
          <div id="statistics-column">
            <h2>Statistics</h2>
            <Statistics
              dataRange={this.state.dataRange}
              data={this.state.data}
            />
          </div>
        </div>
      </div>
    );
  }
}

class Statistics extends Component {
  constructor() {
    super();
    this.state = {
      censusInfo: null,
      income: 190000,
      incomeText: "190000"
    };
  }
  componentDidMount() {
    var self = this;
    d3.tsv("censusIncomes.tsv", function(d) {
      d["Number"] = +d["Number"];
      d["Dollars"] = +d["Dollars"];
      return d;
    }, function(error, censusInfo) {
      if (error) throw error;
      self.setState({censusInfo: censusInfo});
    });
  }

  amtTaxes(income) {
    var data = this.props.data;
    if (data != null) {
      var amt = 0;

      for (var i = 1; i < data.length; i++) {
        var lowerBracket = data[i-1]["Tax Bracket"];
        var lowerRate = data[i-1]["Tax Rate"] / 100;
        var upperBracket = data[i]["Tax Bracket"];
        var upperRate = data[i]["Tax Rate"] / 100;

        // only proceed if not a vertical line
        if (upperBracket != lowerBracket) {
          var slope = (upperRate - lowerRate) / (upperBracket - lowerBracket)

          var dx;
          if (upperBracket > income) {
            dx = income - lowerBracket;
            upperRate = lowerRate + slope * dx;

            // schedule loop termination
            i = data.length;
          } else {
            dx = upperBracket - lowerBracket;
          }

          amt += ((lowerRate + upperRate) * dx) / 2;
        }
      }

      return amt;
    }
    return 0;
  }

  totalRevenue() {
    var data = this.props.data;
    var censusInfo = this.state.censusInfo;
    if (censusInfo != null && data != null) {
      var revenue = 0;
      for (var i = 0; i < censusInfo.length; i++) {
        var numPersons = censusInfo[i]["Number"] * 990;
        var income = censusInfo[i]["Dollars"];
        var taxes = this.amtTaxes(income);
        revenue += numPersons * taxes;
      }
      return revenue;
    }
    return 0;
  }

  formatMonetaryOutput(m) {
    return Math.round(m).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  onIncomeChange(e) {
    this.setState({income: e.target.value,
                   incomeText: this.state.income.toString()});
  }

  onIncomeTextChange(e) {
    var incomeText = e.target.value;
    this.setState({incomeText: incomeText});
    var income = parseInt(incomeText);
    if (!Number.isNaN(income)) {
      this.setState({income: income});
    }
  }

  render() {
    var censusInfo = this.state.censusInfo;
    if (censusInfo != null && this.props.data != null) {
      return (
        <div className="container">
          <div className="income-element">
            <label className="form-label income-element">Enter Your Income</label>
            <input type="range" className="form-input income-element"
              value={this.state.income}
              min={0}
              max={this.props.dataRange.xMax}
              step={100}
              onChange={(e) => this.onIncomeChange(e)}
            />
            <input type="text"
              className={"form-input income-element" +
                (Number.isNaN(parseInt(this.state.incomeText)) ?
                  " is-danger" : "")}
              value={this.state.incomeText}
              onChange={(e) => this.onIncomeTextChange(e)}
            />
          </div>
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>Estimates</th>
                <th>USD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Your Income Tax</td>
                <td>${this.formatMonetaryOutput(this.amtTaxes(this.state.income))}</td>
              </tr>
              <tr>
                <td>Tax for Income of $50,000</td>
                <td>${this.formatMonetaryOutput(this.amtTaxes(50000))}</td>
              </tr>
              <tr>
                <td>Tax for Income of $16,000 <small>(family of 2 in poverty)</small></td>
                <td>${this.formatMonetaryOutput(this.amtTaxes(16000))}</td>
              </tr>
              <tr>
                <td>Federal Tax Revenue</td>
                <td>${this.formatMonetaryOutput(this.totalRevenue())}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    } else {
      return <p>Loading...</p>
    }
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
                       yMax: 100};
                       //yMax: d3.max(data, function(d) { return d["Tax Rate"]; })};
      self.props.publishDataRange(dataRange);

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

      self.props.publishData(data);
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

    g.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line);

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
        } if (newYVal > 100) {
          data[i]["Tax Rate"] = 100;
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
