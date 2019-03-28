var height = $(window).height();
var width = $(window).width();

var svg = d3.select("svg");

// Call zoom for svg container.
svg.call(d3.zoom().on('zoom', zoomed));

// var color = d3.scaleOrdinal(d3.schemeCategory20);

var simulation = d3.forceSimulation()
    // .force("link", d3.forceLink())//Or to use names rather than indices: .id(function(d) { return d.id; }))
    .force("link", d3.forceLink().id(function(d) { return d.id;}))
    .force("charge", d3.forceManyBody().strength([-500]).distanceMax([1000]))
    .force("center", d3.forceCenter(width/2, height/2));

var container = svg.append('g');

// Toggle for ingredient networks on click (below).
var toggle = 0;

d3.json("node-link-value.json", function(error, graph) {
  if (error) throw error;

  // Make object of all neighboring nodes.
  var linkedByIndex = {};
  graph.links.forEach(function(d) {
    linkedByIndex[d.source + ',' + d.target] = 1;
    linkedByIndex[d.target + ',' + d.source] = 1;
  });

  // A function to test if two nodes are neighboring.
  function neighboring(a, b) {
    return linkedByIndex[a.ingred_name + ',' + b.ingred_name];
  }

  // Linear scale for degree centrality.
  var degreeSize = d3.scaleLinear()
  	.domain([d3.min(graph.nodes, function(d) {return d.recipes;}),d3.max(graph.nodes, function(d) {return d.recipes; })])
  	.range([10,40]);

  // Collision detection based on degree centrality.
  simulation.force("collide", d3.forceCollide().radius(function (d) { return degreeSize(d.recipes); }));

  var link = container.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(graph.links, function(d) { return d.source + ", " + d.target;})
    .enter().append("line")
      .attr('class', 'link');

  var node = container.append("g")
      .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter().append("circle")
    .attr('r', function(d) { return degreeSize(d.recipes); })
      .attr("fill", 'rgb(46, 134, 255)')
      .attr('class', 'node')
      // On click, toggle networks for the selected node.
      .on('click', function(d, i) {
        if (toggle == 0) {
  	      // Ternary operator restyles links and nodes if they are adjacent.
  	      d3.selectAll('.link').style('stroke-opacity', function (l) {
  		      return l.target == d || l.source == d ? 0.5 : 0.01;
  	      });
  	      d3.selectAll('.node').style('opacity', function (n) {
  		      return neighboring(d, n) ? 0.5 : 0.1;
  	      });
  	      d3.select(this).style('opacity', 1);
  	      toggle = 1;
        }
        else {
  	      // Restore nodes and links to normal opacity.
  	      d3.selectAll('.link').style('stroke-opacity', '0.1');
  	      d3.selectAll('.node').style('opacity', '1');
  	      toggle = 0;
        }
      })
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

  node.append("title")
      .text(function(d) { return d.ingred_name; });

  simulation
      .nodes(graph.nodes)
      .on("tick", ticked);

  simulation.force("link")
      .links(graph.links);

  function ticked() {
    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  }

  // Slider for link strength filter

  // Linear scale for edge IF-RIF strength

  var ifrifSize = d3.scaleLinear()
    .domain([d3.min(graph.links, function(d) {return d.loge_ifirf;}),d3.max(graph.links, function(d) {return d.loge_ifirf; })])
    .range([1,100]);

  var slider = d3.select('body').append('p').text('IF-IRF Threshold: ');

  slider.append('label')
  	.attr('for', 'threshold')
  	.text('1');
  slider.append('input')
  	.attr('type', 'range')
  	.attr('min', 1)
  	.attr('max', 100)
  	.attr('value', 1)
  	.attr('id', 'threshold')
  	.style('width', '50%')
  	.style('display', 'block')
  	.on('input', function () {
  		var threshold = this.value;
      var threshold2 = +d3.select('label2').text();
      // console.log(threshold2)

  		d3.select('label').text(threshold);

  		// Find the links that are at or above the threshold.
  		var newData = [];
  		graph.links.forEach( function (d) {
  			if (ifrifSize(d.loge_ifirf) >= threshold & d.edge_count >= threshold2) {newData.push(d); };
  		});

  		// Data join with only those new links.
  		link = link.data(newData, function(d) {return d.source + ', ' + d.target;});
  		link.exit().remove();
  		var linkEnter = link.enter().append('line').attr('class', 'link');
  		link = linkEnter.merge(link);

  		node = node.data(graph.nodes);

  		// Restart simulation with new link data.
  		simulation
  			.nodes(graph.nodes).on('tick', ticked)
  			.force("link").links(newData);

  		simulation.alphaTarget(0.1).restart();

  	});

    // A slider (using only d3 and HTML5) that removes nodes below the input threshold.
    var slider = d3.select('body').append('p').text('Edge Weight Threshold: ');

    slider.append('label2')
    	.attr('for', 'threshold')
    	.text('1');
    slider.append('input')
    	.attr('type', 'range')
    	.attr('min', d3.min(graph.links, function(d) {return d.edge_count; }))
      // maybe need to rescale/remove the halving
    	.attr('max', d3.max(graph.links, function(d) {return d.edge_count; }) / 2)
    	.attr('value', d3.min(graph.links, function(d) {return d.edge_count; }))
    	.attr('id', 'threshold')
    	.style('width', '50%')
    	.style('display', 'block')
    	.on('input', function () {
    		var threshold = this.value;
        var threshold2 = +d3.select('label').text();

    		d3.select('label2').text(threshold);

    		// Find the links that are at or above the threshold.
    		var newData = [];
    		graph.links.forEach( function (d) {
    			if (d.edge_count >= threshold & ifrifSize(d.loge_ifirf) >= threshold2) {newData.push(d); };
    		});

    		// Data join with only those new links.
    		link = link.data(newData, function(d) {return d.source + ', ' + d.target;});
    		link.exit().remove();
    		var linkEnter = link.enter().append('line').attr('class', 'link');
    		link = linkEnter.merge(link);

    		node = node.data(graph.nodes);

    		// Restart simulation with new link data.
    		simulation
    			.nodes(graph.nodes).on('tick', ticked)
    			.force("link").links(newData);

    		simulation.alphaTarget(0.1).restart();

    	});

  // Create form for search (see function below).
  var search = d3.select("body").append('form').attr('onsubmit', 'return false;');

  var box = search.append('input')
    .attr('class','ui-widget')
  	.attr('type', 'text')
  	.attr('id', 'searchTerm')
    // .attr('width', '400px')
  	.attr('placeholder', 'Search for an ingredient.');

  var button = search.append('input')
  	.attr('type', 'button')
  	.attr('value', 'Search')
  	.on('click', function () { searchNodes(); });

  var optArray = [];
  for (var i = 0; i < graph.nodes.length - 1; i++) {
      optArray.push(graph.nodes[i].ingred_name);
  }
  optArray = optArray.sort();
  $(function () {
      $("#searchTerm").autocomplete({
          source: optArray
      });
  });

});

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

// Zooming function translates the size of the svg container.
function zoomed() {
  container.attr("transform", "translate(" + d3.event.transform.x + ", " + d3.event.transform.y + ") scale(" + d3.event.transform.k + ")");
}



// Search for nodes by making all unmatched nodes temporarily transparent.
function searchNodes() {
  var term = document.getElementById('searchTerm').value;
  var selected = container.selectAll('.node').filter(function (d, i) {
  	return d.ingred_name.toLowerCase().search(term.toLowerCase()) == -1;
  });
  selected.style('opacity', '0');
  var link = container.selectAll('.link');
  link.style('stroke-opacity', '0');
  d3.selectAll('.node').transition()
  	.duration(5000)
  	.style('opacity', '1');
  d3.selectAll('.link').transition().duration(5000).style('stroke-opacity', '0.6');
}
