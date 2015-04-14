
(function () {

    var width = 960,
        height = 600;

    var geo_projection = d3.geo.albersUsa()
            .scale(1280)
            .translate([width / 2, height / 2]),
        geo_path = d3.geo.path()
            .projection(geo_projection);

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
            _ufos = prepare.filter_ufos(_ufos, geo_projection);
            var ufos = prepare.ufos(_ufos);
            populations = prepare.populations(populations);
            var states = prepare.states(states_hash);

            var tmp = clustered_ufos(_ufos, geo_projection),
                clustered = tmp[0],
                clusters = tmp[1],
                cluster_populations = prepare.cluster_populations(clustered, city_populations);

            var drawers = Drawers(svg, ufos, populations, geo_path, 
                                  geo_projection);

            drawers.map(US, geo_path, states);
            drawers.bases(military_bases, geo_projection);
            drawers.centroids(clusters.centroids, clustered, cluster_populations);

            var ufos_by_season = prepare.ufos_by_season(_ufos, 
                                                        clusters.assignments),
                seasons = d3.scale.ordinal()
                    .domain(d3.range(4))
                    .range(["winter", "spring", "summer", "autumn"]);

            var keyframes = prepare.precalc_animation(
                ufos_by_season,
                geo_projection,
                {centroids: clusters.centroids,
                 clustered: clustered,
                 populations: cluster_populations}
            );

            var animation = Animation();

            var make_step = (function () {
                var step = 0,
                    year = 1945;
                return function (direction) {
                    direction || (direction = 1);

                    if (step+direction <= 0
                        || step >= keyframes.length) {
                        
                        animation.pause();
                        return;
                    };

                    drawers.draw_keyframe(keyframes[step]);

                    if (direction > 0) {
                        update_caption(step, year);

                        step += direction;

                        if (step%4 == 0) {
                            year += direction;
                        }
                    }else{
                        step += direction;

                        if (step%4 == 0) {
                            year += direction;
                        }

                        update_caption(step, year);
                    }
                };
            })();

            animation.play_forward();

            var drag = d3.behavior.drag()
                    .origin(function () { return {x: 0, y: 0}; })
                    .on("drag", function () {
                        if (d3.event.x < 0) {
                            // back in time
                            timeline_explore(-1);
                        }else{
                            // forward in time
                            timeline_explore(+1);
                        }
                    });

            d3.select("h1.season")
                .call(drag);
            
            d3.select("#down")
                .on("click", function () { timeline_explore(-1); });
            d3.select("#up")
                .on("click", function () { timeline_explore(+1); });
            d3.selectAll(".pause")
                .on("click", animation.pause);
            d3.select("#play_forward")
                .on("click", animation.play_forward);
            d3.select("#play_backward")
                .on("click", animation.play_backward);
            d3.selectAll(".speedUp")
                .on("click", animation.speedUp);

            function timeline_explore(direction) {
                animation.pause();

                if (direction) {
                    make_step(direction);
                }
            }

            function update_caption(step, year) {
                var season = seasons(step%12);
                
                d3.select("h1.season")
                    .html([season, year].join(" "));
            }

            function Animation() {
                var player,
                    playing = false,
                    speed = 1,
                    direction = 1;

                function toggle_controls() {
                    d3.select("#play_forward")
                        .classed("hidden", playing && direction > 0);
                    d3.select("#play_backward")
                        .classed("hidden", playing && direction < 0);

                    d3.select(".left .pause")
                        .classed("hidden", !playing || direction > 0);
                    d3.select(".right .pause")
                        .classed("hidden", !playing || direction < 0);

                    d3.select(".left .speedUp")
                        .classed("hidden", !playing || direction > 0);
                    d3.select(".right .speedUp")
                        .classed("hidden", !playing || direction < 0);
                }

                function start () {
                    playing = true;
                    player = setInterval(function () {
                        make_step(direction);
                    }, speed*500);
                }

                function stop () {
                    playing = false;
                    clearInterval(player);
                }

                return {
                    pause: function () {
                        stop();
                        toggle_controls();
                    },

                    play_forward: function () {
                        stop();

                        speed = 1;
                        direction = 1;
                        
                        start();
                        toggle_controls();
                    },

                    play_backward: function () {
                        stop();

                        speed = 1;
                        direction = -1;

                        start();
                        toggle_controls();
                    },

                    speedUp: function () {
                        if (!playing) return;

                        stop();
                        speed /= 1.5;
                        start();
                    },

                    slowDown: function () {
                        if (!playing) return;

                        stop();
                        speed *= 1.5;
                        start();
                    }
                };
            };

        });

})();
