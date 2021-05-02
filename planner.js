//get tileset of different maps from USGS

let imageryMap = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}', {
    //max zoom supported by USGS
    maxNativeZoom: 16,
    //max zoom user can use
    maxZoom: 18
});

let topoMap = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16,
    maxZoom: 18
});

let imageryTopoMap = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16,
    maxZoom: 18
});

let hydroOverlay = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16,
    maxZoom: 18
});


// style for initial river polyline
let lineStyle = {
    "color": "#3E91AF",
    "weight": 5,
    "opacity": 0.65
};

// style for water site monitoring points
let siteMonitoringPointsStyle = {
    radius: 10,
    fillColor: "#CB3B27",
    color: "#fff",
    weight: 2,
    opacity: 1,
    fillOpacity: 1
};

// create feature group for adding markers, lines, etc
let markersFeatureGroup = L.featureGroup([])


// this line requests data from my local machine then waits for it to load
$.when($.getJSON("./data/currentRiverDM.geojson"), $.getJSON("./data/currentRiverSites.geojson")).done(function (riverdata, sitedata) {

    })
    .fail(function () {
        console.log("data failed to load error");
    })
    .done(function (riverdata, sitedata) {

        // extract coordinates from geojson object to create polyline. pretty slow but unsure how to implement these
        // features without doing this. TODO: improve this

        let coordinatesArray = []
        // loop through the json response
        for (let i = 0; i < riverdata[0]["features"].length; i++) {
            coordinatesArray.push(riverdata[0]['features'][i].geometry.coordinates)
        };

        //flatten array once
        let flattenedCoordinatesArray = coordinatesArray.flat(1)

        let polylineArray = []

        //loop through and reverse coords
        for (let z = 0; z < flattenedCoordinatesArray.length; z++) {
            polylineArray.push(flattenedCoordinatesArray[z].reverse())
        }

        let navigationOverlay = new L.Polyline(polylineArray, {

                //change polyline style
            }).setStyle(lineStyle)

            // .on('mouseover', function (e) {
            //     console.log(e)
            // })
            .on('click', function (event) {
                //marker is added to the feature group on click 
              
                // uses interpolation to return fraction of where user clicks on polyline
                let interp=locateOnLine(map, navigationOverlay, event.latlng)
                //console.log(`interpolated is: ${interp}`)
                // translates fraction to coordinates on polyline
                let interp2coords=interpolateOnLine(map, navigationOverlay, interp)
                //console.log(`interpolated to coords is: ${interp2coords.latLng}`)
               
                //adds marker at whatever coordinate that is on map's line
                let addMarker = new L.circleMarker(interp2coords.latLng).addTo(markersFeatureGroup);

                addMarker.bindPopup(event.latlng.lat.toString() + " ," + event.latlng.lng.toString()) //adds the lat/lng in the event of clicking marker again
                //open popup on click
                addMarker.openPopup()
                //console.log(`marker added at: ${addMarker.getLatLng()}`)
                //opens the coordinates and changges styleon mouseover
                addMarker.on('mouseover', function (e) {
                    addMarker.openPopup()
                    e.target.setStyle({
                        color: "#C37AE8"
                    })
                    e.target.setRadius(20)
                    //console.log(markersFeatureGroup.getLayerId(addMarker))  //prints the marker's id 
                    // closes popup and changes marker style back on mouseout

                    



                }).on('mouseout', function (e) {
                    addMarker.closePopup()
                    e.target.setRadius(10)
                    e.target.setStyle({
                        color: "#3388FF"
                    })

                    //previous functionality of removing a marker by clicking on it a second time

                    // }).on('click', function (e) {
                    //     markersFeatureGroup.removeLayer(addMarker)
                    //     addMarker.remove()
                    //     e.target.setRadius(10)
                    //     e.target.setStyle({
                    //         color: "#3388FF"
                    //     })
                })
            })

        // plots and binds data to each NWIS site 
        // TODO: close popup after mousing over
        let sitesOverlay = L.geoJson(sitedata, {
            pointToLayer: function (feature, latlng) {

                return L.circleMarker(latlng, siteMonitoringPointsStyle);
            },
            onEachFeature: function (feature, layer) {
                // Station popup information name is a link to the monitoring site (link opens in new tab)
                layer.bindPopup(`<a href="${feature.properties.uri}" target="_blank" rel="noopener noreferrer">${feature.properties.name}</a>` + "<br>" + feature.geometry.coordinates.reverse())
                // mouseover handler
                layer.on('mouseover', function (e) {
                    layer.openPopup()
                    layer.bringToFront()
                }).on('mouseout', function (e) {
                    layer.bringToBack()
                })
            }
        });

        // map configuration
        let map = L.map('map', {
            center: [37.37569444, -91.5528056],
            zoom: 14,
            layers: [imageryMap, imageryTopoMap, topoMap, sitesOverlay, navigationOverlay]
        });


        // map overlay key
        let baseMaps = {
            "Satellite + Topographical": imageryTopoMap,
            "Satellite": imageryMap,
            "Topographical": topoMap,
        };


        // map toggles in overlay key
        // TODO: waypoints unable to be placed if navigation line unchecked.
        let overlayMaps = {
            "Hydro Overlay": hydroOverlay,
            "Water Monitoring Sites": sitesOverlay,
            "Navigation Overlay": navigationOverlay,
            "Waypoints": markersFeatureGroup
        };




        L.control.layers(baseMaps, overlayMaps, {
            collapsed: false
        }).addTo(map);
        markersFeatureGroup.addTo(map)

        // // zoom the map to the polyline
        map.fitBounds(navigationOverlay.getBounds());




        
        // distance calculation functions 
        // convert degrees to radians for haversine function
        function deg2rad(deg) {
            return deg * (Math.PI / 180);
        }


        // haversine distance function
        function haversine(arrayList) {
            let accumulatedDistance = 0
            for (let i = 1; i < arrayList.length; i++) {


                let lat1 = arrayList[i - 1].lat

                let lon1 = arrayList[i - 1].lng

                let lat2 = arrayList[i].lat
                let lon2 = arrayList[i].lng
                // console.log(`lat1: ${lat1}  lon1: ${lon1}  lat2: ${lat2}  lon2: ${lon2}`)
                const R = 3971.366; // Radius of the earth in mi with using formula 3963 - 13 * math.sin(37) where 37 is latitude in Missouri.

                var dLat = deg2rad(lat2 - lat1);
                var dLon = deg2rad(lon2 - lon1);
                var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                // Return distance in miles.
                accumulatedDistance += (R * c);
            }
            return accumulatedDistance
        }
      

        //draw distance polylines on map feature logic. This needs some DRY

        let counter = 0
        let start;
        let end;
        let distanceTotalHaversine = 0;
        let distanceTotalBuiltIn = 0;
        const meters2miles=0.00062137


        navigationOverlay.on('click', function (e) {
            if (counter == 0) {
                
                //startpoint A
                start=locateOnLine(map, navigationOverlay, e.latlng) //returns closest point on polyline as float
                // console.log(`start=${start.lat}, ${start.lng}`)
                // console.log(navigationOverlay.getLatLngs())
                counter++
                return

            } else if (counter == 1) {

                //endpoint B
                end=locateOnLine(map, navigationOverlay, e.latlng) //returns closest point on polyline as float

                // console.log(`end=${end.lat}, ${end.lng}`)
                let lineSubset = L.GeometryUtil.extract(map, navigationOverlay, start, end)
                // console.log(lineSubset)
                
                // draw line, add to group
                let firstLine = new L.Polyline(lineSubset).setStyle({
                    color: '#C94552',
                    weight: '6',
                    opacity: .6
                }).addTo(markersFeatureGroup)

                // calculate lengths
                let distanceABhaversine = haversine(lineSubset)
                let distanceABbuiltIn = L.GeometryUtil.length(firstLine)
               

          
                // accumulate lengths          
                distanceTotalHaversine += distanceABhaversine
                distanceTotalBuiltIn += distanceABbuiltIn

                //test print statements
                //console.log(`total distance haversine= ${distanceTotalHaversine}`)
                //console.log(`segment distance builtin= ${distanceABbuiltIn*m2miles}`)
                //console.log(`total distance builtIn= ${distanceTotalBuiltIn*m2miles}`)
                //console.log(`segment distance haversine= ${distanceABhaversine}`)


                // update segment distances in DOM
                document.getElementById("distanceTable").innerHTML += '<tr>' + "haversine segment distance: " + distanceABhaversine + '</tr>'
                document.getElementById("distanceTable").innerHTML += '<tr>' + "estimated segment distance: " + distanceABbuiltIn * meters2miles + '</tr>'

                // update total distances in DOM
                document.getElementById("distanceTotalHaversine").innerHTML = distanceTotalHaversine
                document.getElementById("distanceTotalBuiltIn").innerHTML = distanceTotalBuiltIn * meters2miles

                // increment click counter
                counter++;
                // update start and end points
                start = end  


            } else if (counter = 2) {
                
                // endpoint C
                let newEnd = locateOnLine(map, navigationOverlay, e.latlng)
                let secondSubset = L.GeometryUtil.extract(map, navigationOverlay, start, newEnd)

                //random color for line, unsure if needed still
                //let randomColor = '#'+Math.floor(Math.random()*16777215).toString(16);


                let secondLine = new L.Polyline(secondSubset).setStyle({
                    color: "#285721",
                    weight: "6",
                    opacity: .6
                }).addTo(markersFeatureGroup)

                // calculate lengths
                let distanceBChaversine = haversine(secondSubset)             
                let distanceBCbuiltIn = L.GeometryUtil.length(secondLine)
        
                // accumulate lengths
                distanceTotalHaversine += distanceBChaversine
                distanceTotalBuiltIn += distanceBCbuiltIn
                
                //test print statements
                // console.log(`segment distance builtin= ${distanceBCbuiltIn*m2miles}`)
                // console.log(`segment distance haversine= ${distanceBChaversine}`)
                // console.log(`total distance haversine= ${distanceTotalHaversine}`)
                // console.log(`total distance builtIn= ${distanceTotalBuiltIn*m2miles}`)


                //update segment distances in DOM
                document.getElementById("distanceTable").innerHTML += '<tr>' + "haversine segment distance: " + distanceBChaversine + '</tr>'
                document.getElementById("distanceTable").innerHTML += '<tr>' + "estimated segment distance: " + distanceBCbuiltIn * meters2miles + '</tr>'

                //total total distances in DOM
                document.getElementById("distanceTotalHaversine").innerHTML = distanceTotalHaversine
                document.getElementById("distanceTotalBuiltIn").innerHTML = distanceTotalBuiltIn * meters2miles

                //decrement counter
                counter--;
                //update start/endpoints
                start = newEnd
            
            }

        })


        // map legend feature styling
        var legend = L.control({
            position: "bottomright",
            colors: "black"
        });

        // map legend HTML
        
        legend.onAdd = function (map) {

            let div = L.DomUtil.create("div", "legend");

            div.innerHTML += '<h4>Legend</h4>';
            div.innerHTML += '<table id="distanceTable"></table>'
            div.innerHTML += '<i class="circle"></i><span>River Monitoring Stations</span><br>';
            //   div.innerHTML += '<i style="background: #448D40"></i><span>b</span><br>';
            //   div.innerHTML += '<i style="background: #E6E696"></i><span>c</span><br>';
            //   div.innerHTML += '<i style="background: #E8E6E0"></i><span>d</span><br>';
            div.innerHTML += '<span>Total Haversine Distance</span><br>';
            div.innerHTML += '<span>(accounts for curvature of Earth)</span><br>';
            div.innerHTML += '<span id="distanceTotalHaversine">0</span><br>';
            div.innerHTML += '<span>Total Estimated Distance</span><br>';
            div.innerHTML += '<span id="distanceTotalBuiltIn">0</span><br>';
            div.innerHTML += '<button type="button" id="clearButton">Clear</button>'

            return div
        };

        legend.addTo(map);



        //Returns the coordinate of the point located on a line at the specified ratio of the line length.
      function interpolateOnLine(map, someline, ratio) {
            someline = (someline instanceof L.Polyline) ? someline.getLatLngs() : someline;
           
            var maxzoom = map.getMaxZoom();
            if (maxzoom === Infinity)
                maxzoom = map.getZoom();
            var pts = someline.map(function (x) {
                return map.project(x);
            });
        
            if (ratio <= 0)
                return {
                            latLng: someline[0],
                            predecessor: -1
                        }
            if (ratio >= 1)
                return     {
                                latLng: someline[someline - 1],
                                predecessor: someline.length-2
                            }
        
            var lineLength = 0.;
            for (var i = 1; i < pts.length; i++)
                lineLength += pts[i - 1].distanceTo(pts[i]);
        
            var ratioDist = lineLength * ratio;
        
        
            var lineLength = 0.;
            for (var i = 1; i < pts.length; i++)
            {
                var d = pts[i - 1].distanceTo(pts[i]);
                if (lineLength + d > ratioDist)
                {
                   
                    var p = L.GeometryUtil.interpolateOnPointSegment(pts[i - 1], pts[i], (ratioDist - lineLength) / d);
                    return {
                            latLng: map.unproject(p),
                            predecessor:i-1
                            }
                }
                lineLength += d;
        
            }
        
            return {
                        latLng: someline[someline - 1],
                        predecessor: -1
                    }
        };
        
        //Returns a float between 0 and 1 representing the location of the closest point on polyline to the given latlng, as a fraction of total line length

        function locateOnLine (map, polyline, latlng) {
            var maxzoom = map.getMaxZoom();
            if (maxzoom === Infinity)
                maxzoom = map.getZoom();
            var pts = polyline.getLatLngs().map(function (x) {
                return map.project(x);
            });
            var point = map.project(L.GeometryUtil.closest(map, polyline, latlng, false));
        
        
            var d = 0.;
            var dt = 0.;
            for (var i = 1; i < pts.length; i++)
            {
                var dd = pts[i - 1].distanceTo(pts[i]);
                if (L.GeometryUtil.belongsSegment(point, pts[i - 1], pts[i], 0.0001))
                    d = dt + pts[i - 1].distanceTo(point);
                dt += dd;
            }
            return d / dt;
        };


        //event handler for clearing map when clicking clear button
        document.getElementById("clearButton").addEventListener("click", clearInfo)


        // clears user added layers, resets distance calculations and legend
        
        function clearInfo() {
            //reset polyline math elements
            counter = 0
            start = null
            end = null
            distanceTotalHaversine = 0;
            distanceTotalBuiltIn = 0;
            //reset dom elements
            document.getElementById("distanceTotalHaversine").innerHTML = 0
            document.getElementById("distanceTotalBuiltIn").innerHTML = 0
            document.getElementById("distanceTable").innerHTML = '<table id="distanceTable"></table>'
            //clear lines and markers from map
            markersFeatureGroup.clearLayers()

        };



        // event handler for clicking cedar to akers button
        // hard coded this to try it out. needs DRY

        document.getElementById("buttonCedarAkers").addEventListener("click", function () {
            //clear map
            clearInfo()

            let akerscoords= {lat: 37.375503, lng:-91.551941}
            let cedarcoords= {lat: 37.422124, lng:-91.608495}
            //interpolated distance on polyline of cedar/akers
            let cedargrove = locateOnLine(map, navigationOverlay, cedarcoords)
            let akers = locateOnLine(map, navigationOverlay, akerscoords)

            

            let routeCoords = L.GeometryUtil.extract(map, navigationOverlay, cedargrove, akers)
            let drawRoute = new L.polyline(routeCoords).setStyle({
                color: 'black',
                weight: '6',
                opacity: 1
            }).addTo(markersFeatureGroup)


            let cedargrovemarker = new L.circleMarker(cedarcoords).bindPopup("Cedar Grove", {autoClose: false}).addTo(markersFeatureGroup)
            let akersmarker = new L.circleMarker(akerscoords).bindPopup("Akers Ferry", {autoClose: false}).addTo(markersFeatureGroup)
            cedargrovemarker.openPopup()
            akersmarker.openPopup()

            map.flyToBounds(markersFeatureGroup.getBounds(),{
                maxZoom:14,
                // animate: true,
                duration: 2
            });

            document.getElementById("distanceTotalHaversine").innerHTML =haversine(routeCoords)
            document.getElementById("distanceTotalBuiltIn").innerHTML = L.GeometryUtil.length(routeCoords) * meters2miles

        })

});
