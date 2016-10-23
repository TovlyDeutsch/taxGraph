import React, { Component } from 'react';

import * as d3 from 'd3';
import {event as currentEvent} from 'd3';
import $ from 'jquery';

import 'spectre.css/dist/spectre.min.css'
import './App.css'

class App extends Component {
  constructor() {
    super();
    this.state = {
      data: null,
      dataRange: null,
      dirty: false
    };
  }

  publishDataRange(dataRange) {
    this.setState({dataRange: dataRange,
                   dirty: false});
  }

  publishData(data) {
    this.setState({data: data,
                   dirty: true});
  }

  render() {
    return (
      <div className="container">
      <div id="vertical-slider-column">
      <VerticalSlider
      data={this.state.data}
      publishData={(data) => this.publishData(data)}
      />
      </div>
        <div id="graph-container">
          <div id="graph-column">
            <h1 id="graph-title">Tax Graphs</h1>
            <Graph width="750" height="500"
                margin={{top: 10, right: 10, bottom: 30, left: 30}}
                publishDataRange={(dataRange) => this.publishDataRange(dataRange)}
                publishData={(data) => this.publishData(data)}
                dataRange={this.state.dataRange}
                data={this.state.data}
                />
          </div>
          <div id="statistics-column">
            <h3>Statistics & Options</h3>
            <ul className="instructions">
                <li>Drag the points or the slider on the left to customize the graph.</li>
                <li>Click on the lines to add more points.</li>
                <li>Set presets of existing, proposed, and joke tax plans.</li>
                <li>Enter income and view the tax plan's effect below.</li>
            </ul>
            <DataSelector
                publishDataRange={(dataRange) => this.publishDataRange(dataRange)}
                publishData={(data) => this.publishData(data)}
                dirty={this.state.dirty}
                />
            <Statistics
                dataRange={this.state.dataRange}
                data={this.state.data}
                />
            <p className="blurb">* This chart uses U.S. Census Data to calculate Federal Tax Revenue. This chart assumes single filing. Clinton's tax plan is offered in a truncated version for easier comparisons to other tax plans.</p>
          </div>
        </div>
      </div>
    );
  }
}

class DataSelector extends Component {
  constructor() {
    super();
    this.state = {
      dataFile: "taxRates.tsv"
    };
  }

  componentDidMount() {
    this.handleDataFileChange("taxRates.tsv");
  }

  handleDataFileChange(f) {
    var self = this;
    if (f === "custom") {
      self.setState({dataFile: "custom"});
    } else {
      d3.tsv(f, function(d) {
        d["Tax Bracket"] = +d["Tax Bracket"];
        d["Tax Rate"] = +d["Tax Rate"];
        return d;
      }, function(error, data) {
        if (error) throw error;
        var dataRange = {xMax: d3.max(data, function(d) { return d["Tax Bracket"] }),
                         yMax: 100};
        self.props.publishData(data);
        self.props.publishDataRange(dataRange);
        self.setState({dataFile: f});
      });
    }
  }

  render() {
    return (
      <div className="form-group data-selector-container">
        <label className="form-label">Preset</label>
        <select className="form-select"
            value={this.props.dirty ? "custom" : this.state.dataFile}
            onChange={(s) => this.handleDataFileChange(s.target.value)}
        >
           <option value="taxRates.tsv">Current Tax Code (default)</option>
           <option value="ClintonTaxPlanTruncated.tsv">Clinton (truncated)</option>
           <option value="ClintonTaxPlanFull.tsv">Clinton (full)</option>
           <option value="TrumpTaxPlan.tsv">Trump</option>
           <option value="highwayRobbery.tsv">Highway Robbery</option>
           <option value="anarchy.tsv">Anarchy</option>
           <option value="custom">Custom</option>
        </select>
      </div>
    );
  }
}

class VerticalSlider extends Component {
  constructor() {
    super();
    this.state = {
      val: 0
    }
  }

  onMouseUp(e) {
    this.setState({val:0});
  }

  onSliderChange(e) {
    var oldVal = this.state.val;
    var newVal = e.target.value;
    var diff = newVal - oldVal;
    var data = this.props.data;
    data.map(function(obj){
      var y = obj["Tax Rate"] + diff / 3;
      if (y > 100) {
        obj["Tax Rate"] = 100;
      } else if (y < 0) {
        obj["Tax Rate"] = 0;
      } else {
        obj["Tax Rate"] = y;
      }
      return obj;
    });
    this.props.publishData(data);
    this.setState({val: newVal});
  }

  render() {
    return (
      <div id ="vertical-slider" className="income-element">
        <input id="vertical-input" type="range" className="form-input income-element"
           value={this.state.val}
           min={-100} max={100} step={1}
           onChange={(e) => this.onSliderChange(e)}
           onMouseUp={(e) => this.onMouseUp(e)}
        />
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
    this.state = {s: null};
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

    self.setState({s: {
      areaDims: areaDims,
      svgDims: svgDims,
      margin: margin,

      svg: svg,
      line: line,
      g: g,
      x: x,
      y: y,
    }});
  }


  render() {
    return (
      <div>
        <svg width={this.props.width} height={this.props.height}></svg>
        <GraphAxes
            s={this.state.s}
            dataRange={this.props.dataRange}
            />
        <GraphPoints
            s={this.state.s}
            publishDataRange={this.props.publishDataRange}
            publishData={this.props.publishData}
            data={this.props.data}
            dataRange={this.props.dataRange}
            />
      </div>
    );
  }
}

class GraphAxes extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.dataRange == null) {
      return false;
    } else if (this.props.dataRange == null) {
      return true;
    } else {
      var c = this.props.dataRange;
      var n = nextProps.dataRange;
      return c.xMax != n.xMax || c.yMax != n.yMax;
    }
  }

  render() {
    if (this.props.s == null || this.props.dataRange == null) return null;
    console.log("RENDERING GraphAxes");

    var areaDims = this.props.s.areaDims;
    var g = this.props.s.g;
    var x = this.props.s.x;
    var y = this.props.s.y;

    var dataRange = this.props.dataRange;

    x.domain([0, dataRange.xMax]);
    y.domain([0, dataRange.yMax]);

    g.select(".axis--x").remove();

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
      .attr("y", 7)
      .attr("dy", "0.71em")
      .style("text-anchor", "end")
      .text("Rate (%)");

    return null;
  }
}

class GraphPoints extends Component {
  render() {
    if (this.props.s == null ||
        this.props.dataRange == null ||
        this.props.data == null) {
        return null;
    }
    var self = this;

    var areaDims = this.props.s.areaDims;
    var svgDims = this.props.s.svgDims;
    var margin = this.props.s.margin;
    var svg = this.props.s.svg;
    var line = this.props.s.line;
    var g = this.props.s.g;
    var x = this.props.s.x;
    var y = this.props.s.y;

    var dataRange = this.props.dataRange;
    var data = this.props.data;

    svg.selectAll('path').remove();
    svg.selectAll('circle').remove();

    var path = g.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line)

    path.on('click', function(d){
      var coords = d3.mouse(this);
      var newData = {
        'Tax Bracket': Math.round( x.invert(coords[0])),  // Takes the pixel number to convert to number
        'Tax Rate': Math.round( y.invert(coords[1]))
      };

      data.push(newData);
      data.sort(function(a, b) {
        var num = a["Tax Bracket"] - b["Tax Bracket"];
        if(num === 0){
          return a["Tax Rate"] - b["Tax Rate"]
        }
        return num;
      });

      self.props.publishData(data);
    });

    svg.selectAll("dot")
      .data(data)
      .enter().append("circle")
      .attr("r", 6)
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
        self.props.publishData(data);
      })
      .on("drag", function(d) {
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
        } else if (newYVal > 100) {
          data[i]["Tax Rate"] = 100;
        } else {
          data[i]["Tax Rate"] = newYVal;
        }

        self.props.publishData(data);
      }));
    return null;
  }
}


export default App;
