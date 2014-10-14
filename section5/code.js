
(function () {

    var width = 960,
        height = 600;

    var geo_projection = d3.geo.albersUsa()
            .scale(1280)
            .translate([width / 2, height / 2]),
        geo_path = d3.geo.path()
            .projection(projection);

    var svg = d3.select("#graph").append("svg")
            .attr("width", width)
            .attr("height", height);

    queue()
        .defer(d3.json, "data/us.json")
        .defer(d3.json, "data/states-hash.json")
        .defer(d3.csv, "data/state-populations.csv")
        .defer(d3.json, "data/city-populations.json")
        .defer(d3.xml, "data/military-bases.kml")
        .defer(d3.csv, "data/full-data-geodata.csv")
        .await(function (err, US, states_hash, populations, city_populations, military_bases, _ufos) {
            _ufos = prepare.filter_ufos(_ufos);
            var ufos = prepare.ufos(_ufos);
            populations = prepare.populations(populations);

            var drawers = Drawers(svg, ufos, populations);

            drawers.map(US, geo_path);

            var tmp = clustered_ufos(_ufos, geo_projection),
                clustered = tmp[0],
                clusters = tmp[1],

                cluster_populations = prepare.cluster_populations(clustered, city_populations);

            var
                ratios = _.mapValues(clustered,
                                     function (group, key) {
                                         var population = cluster_populations[key];

                                         if (population == 0) {
                                             return 0;
                                         }

                                         return group.length/population;
                                     }),
                R = d3.scale.linear()
                    .domain([0, d3.max(_.values(ratios))])
                    .range([2, 20]);

            var base_positions = prepare.base_positions(military_bases, geo_projection);
            
            svg.append("g")
                .selectAll("path")
                .data(base_positions)
                .enter()
                .append("path")
                .attr("d", d3.svg.symbol().type("cross").size(32))
                .attr("class", "base")
                .attr("transform", function (d) {
                    return "translate("+d[0]+","+d[1]+")";
                });

            svg.append("g")
                .selectAll("circle")
                .data(clusters.centroids)
                .enter()
                .append("circle")
                .attr({
                    cx: function (d) { return d[0]; },
                    cy: function (d) { return d[1]; },
                    r: function (d, i) { return R(ratios[i]); },
                    class: "point"
                });

        });

})();
