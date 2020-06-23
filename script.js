
var width = 1200,
    height = 1200;

    var color = d3.scale.category20();
    //var color_links = d3.scaleOrdinal([`#383867`, `#584c77`, `#33431e`, `#a36629`, `#92462f`, `#b63e36`, `#b74a70`, `#946943`]);
    //var color_links = d3.scale.schemeDark2();
    var color2 = d3.scale.category20();

    var force = d3.layout.force()
        .charge(-50)
        .linkDistance(30)
        .size([width, height]);

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    var tooltip = d3.select("body")
      .append("div")
        .attr("class", "tooltip")
        //.attr("style", "position: absolute; opacity: 0;");

    var tooltipNode = d3.select("body")
      .append("div")
        .attr("class", "tooltipNode")

    // arrowhead svg, for directed edge arrows
    svg.append('defs').append('marker')
      .attr("id",'arrowhead')
      .attr('viewBox','-0 -5 10 10') //the bound of the SVG viewport for the current SVG fragment. defines a coordinate system 10 wide and 10 high starting on (0,-5)
      .attr('refX',4) // x coordinate for the reference point of the marker. If circle is bigger, this need to be bigger.
      .attr('refY',0)
      .attr('orient','auto')
          .attr('markerWidth',13)
          .attr('markerHeight',13)
          .attr('xoverflow','visible')
      .append('svg:path')
      .attr('d', 'M 0,-1 L 2 ,0 L 0,1')
      .attr('fill', '#999')
      .style('stroke','none');
    
    var linkedByIndex = {};

    d3.json("data.json", function (error, data) {
        //set up graph in same style as original example but empty
        graph = { "nodes": [], "links": [] };
        
        //loop through each link record from the csv data
        //add to the nodes each source and target; we'll reduce to unique values later
        //add to the links each source, target record with the value (if desired, multiple value fields can be added)
        data.nodes.forEach(function (d) {
            graph.nodes.push({ "name": d.id, "type": d.type });
        });

        data.links.forEach(function (d) {
            graph.links.push({ "source": d.source, "target": d.target, "type": d.type})
        });

        //use this as temporary holding while we manipulate graph.nodes
        //this will contain a map object containing an object for each node
        //within each node object there will be a child object for each instance that node appear
        //however, using rollup we can eliminate this duplication
        var nodesmap = d3.nest()
                            .key(function (d) { return d.name; })
                            .rollup(function (d) { return { "name": d[0].name, "type": d[0].type }; })
                            .map(graph.nodes);

        //thanks Mike Bostock https://groups.google.com/d/msg/d3-js/pl297cFtIQk/Eso4q_eBu1IJ
        //this handy little function returns only the distinct / unique nodes
        graph.nodes = d3.keys(d3.nest()
                             .key(function (d) { return d.name; })
                             .map(graph.nodes));


        //it appears d3 with force layout wants a numeric source and target
        //so loop through each link replacing the text with its index from node
        graph.links.forEach(function (d, i) {
            graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
            graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
        });

        //this is not in the least bit pretty
        //will get graph.nodes in its final useable form
        //loop through each unique node and replace with an object with same numeric key and name/group as properties
        //that will come from the nodesmap that we defined earlier
        graph.nodes.forEach(function (d,i) { graph.nodes[i]={ "name": nodesmap[d].name, "type": nodesmap[d].type }; })


        force
          .nodes(graph.nodes)
          .links(graph.links)
          .start();

        var link = svg.selectAll(".link")
          .data(graph.links)
        .enter().append("line")
          .attr("class", "link")
          .attr('marker-end','url(#arrowhead)')
          .attr("stroke", function(d){ return color(d.type)})
          .style("stroke-width", 2)//function (d) { return Math.sqrt(d.value); })
          .on("mouseover", mouseover2)
          .on("mouseout", mouseout2)
          .on("mousemove", mousemove2);

        var node = svg.selectAll(".node")
          .data(graph.nodes)
        .enter().append("circle")
          .attr("class", "node")
          .attr("r", 5)
          .style("fill", function (d) { return color(d.type); })
          .on("mouseover", mouseover)
          .on("mouseout", mouseout)
          .on("mousemove", mousemove)
          .call(force.drag);

        node.append("title")
          .text(function (d) { return d.name + ", " + d.type; });

        force.on("tick", function () {
            link.attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });
            
            node //.attr("cx", function (d) { return d.x; })
            .attr("cx", function(d) { return d.x = Math.max(10, Math.min(width - 10, d.x)); })
            //.attr("cy", function (d) { return d.y; });
            .attr("cy", function(d) { return d.y = Math.max(10, Math.min(height - 10, d.y)); });
        });
        
                
        
        graph.links.forEach(function(d) {
          linkedByIndex[d.source.index + "," + d.target.index] = 1;

          // commented out because directed graph
          linkedByIndex[d.target.index + "," + d.source.index] = 1;
        });
    });
    
    function neighboring(a, b) {
      return a.index == b.index || linkedByIndex[a.index + "," + b.index];
    }
    
function mouseover(d) {
  d3.selectAll(".link").transition().duration(500)
    .style("opacity", function(o) {
    return o.source === d || o.target === d ? 1 : 0.1;
  });
  
  d3.selectAll(".node").transition().duration(500)
    .style("opacity", function(o) {
        return neighboring(d, o) ? 1 : 0.1;
    });

  tooltipNode.style("display", "inline");
}

function mouseout() {
  d3.selectAll(".link").transition().duration(500)
        .style("opacity", 1);
  d3.selectAll(".node").transition().duration(500)
        .style("opacity", 1);
  tooltipNode.style("display", "none");
}
    
function mousemove(d) {
  tooltipNode
    .html(d.name + " [" + d.type + "]")
      .attr("data-html", "true")
    .style("left", (d3.event.pageX - 25) + "px")
    .style("top", (d3.event.pageY - 35) + "px");
}

function mouseover2(d) {
  //console.log(d.source.name + " [" + d.source.type + "] " + d.type + " " + d.target.name + " [" + d.target.type + "] ")
  console.log(d)
  // d3.select("#tooltip").transition().duration(200).style("opacity", 1).text(d.source.name + " [" + d.source.type + "] " + d.type + " " + d.target.name + " [" + d.target.type + "] ")
  tooltip.style("display", "inline");
}

function mouseout2(d) {
  // console.log("mouseout")
  // d3.select("#tooltip").style("opacity", 0)
  tooltip.style("display", "none");
}
    
function mousemove2(d) {
  tooltip
    .html(d.source.name + " [" + d.source.type + "]" + "<br><br>" + d.type + "<br><br>" + d.target.name + " [" + d.target.type + "] ")
      .attr("data-html", "true")
    .style("left", (d3.event.pageX - 50) + "px")
    .style("top", (d3.event.pageY - 70) + "px");
}