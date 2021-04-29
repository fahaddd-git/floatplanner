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
                //BUG: FIXED on removing layer, it is removed from map but not feature group and is therefore redrawn when toggling markers layer
                // this is adding markers based on map coordinates not coordinates in feature

                let closestPoint = L.GeometryUtil.closest(map, navigationOverlay, event.latlng, true)
                console.log(`closest point is: lat ${closestPoint.lat} long ${closestPoint.lng} `)
                //adds marker at whatever coordinate that is on map's line
                //let addMarker = new L.circleMarker([event.latlng.lat, event.latlng.lng]).addTo(markersFeatureGroup);
                //adds marker at closest point in data segment
                let addMarker = new L.circleMarker(closestPoint).addTo(markersFeatureGroup);

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
        const m2miles=0.00062137


        navigationOverlay.on('click', function (e) {
            if (counter == 0) {
                
                //startpoint A
                start = (L.GeometryUtil.locateOnLine(map, navigationOverlay, e.latlng))
                console.log(`start=${start}`)
                counter++
                return

            } else if (counter == 1) {

                //endpoint B
                end = (L.GeometryUtil.locateOnLine(map, navigationOverlay, e.latlng))
                console.log(`end=${end}`)
                let lineSubset = L.GeometryUtil.extract(map, navigationOverlay, start, end)
                console.log(lineSubset)
                
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
                document.getElementById("distanceTable").innerHTML += '<tr>' + "estimated segment distance: " + distanceABbuiltIn * m2miles + '</tr>'

                // update total distances in DOM
                document.getElementById("distanceTotalHaversine").innerHTML = distanceTotalHaversine
                document.getElementById("distanceTotalBuiltIn").innerHTML = distanceTotalBuiltIn * m2miles

                // increment click counter
                counter++;
                // update start and end points
                start = end  


            } else if (counter = 2) {
                
                // endpoint C
                let newEnd = (L.GeometryUtil.locateOnLine(map, navigationOverlay, e.latlng))
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
                document.getElementById("distanceTable").innerHTML += '<tr>' + "estimated segment distance: " + distanceBCbuiltIn * m2miles + '</tr>'

                //total total distances in DOM
                document.getElementById("distanceTotalHaversine").innerHTML = distanceTotalHaversine
                document.getElementById("distanceTotalBuiltIn").innerHTML = distanceTotalBuiltIn * m2miles

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
            //interpolated distance on polyline of cedar/akers
            let cedargrove = 0.11434991113403803
            let akers = 0.19659992603355333

            let routeCoords = L.GeometryUtil.extract(map, navigationOverlay, cedargrove, akers)
            let drawRoute = new L.polyline(routeCoords).setStyle({
                color: 'black',
                weight: '6',
                opacity: 1
            }).addTo(markersFeatureGroup)


            let cedargrovemarker = new L.circleMarker([37.4221751987934, -91.6082682013512]).bindPopup("Cedar Grove", {autoClose: false}).addTo(markersFeatureGroup)
            let akersmarker = new L.circleMarker([37.3754083961248, -91.5524060055614]).bindPopup("Akers Ferry", {autoClose: false}).addTo(markersFeatureGroup)
            cedargrovemarker.openPopup()
            akersmarker.openPopup()

            map.flyToBounds(markersFeatureGroup.getBounds(),{
                maxZoom:14,
                // animate: true,
                duration: 2
            });

            document.getElementById("distanceTotalHaversine").innerHTML =haversine(routeCoords)
            document.getElementById("distanceTotalBuiltIn").innerHTML = L.GeometryUtil.length(routeCoords) * m2miles

        })

});
