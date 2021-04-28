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


// style for polyline
let lineStyle = {
    "color": "#3E91AF",
    "weight": 5,
    "opacity": 0.65
};

// style for water site monitoring points
let siteMonitoringPointsStyle = {
    radius: 10,
    fillColor: "rgb(255,0,195)",
    color: "#fff",
    weight: 2,
    opacity: 1,
    fillOpacity: 1
};

// create feature group
let markersFeatureGroup = L.featureGroup([])


// this line requests data from local machine then waits for it to load
$.when($.getJSON("currentRiverDM.geojson"), $.getJSON("currentRiverSites.geojson")).done(function (riverdata, sitedata) {

    })
    .fail(function () {
        console.log("data failed to load error");
    })
    .done(function (riverdata, sitedata) {



        //  convert geojson to polyline (slowwwwww)


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

                //change style
            }).setStyle(lineStyle)

            .on('mouseover', function (e) {
                console.log(e)
            })
            .on('click', function (event) {
                //marker is added to the feature group on click 
                //BUG: FIXED on removing layer, it is removed from map but not feature group and is therefore redrawn when toggling markers layer
                // this is adding markers based on map coordinates not coordinates in feature
                let addMarker = new L.circleMarker([event.latlng.lat, event.latlng.lng]).addTo(markersFeatureGroup);
                addMarker.bindPopup(event.latlng.lat.toString() + " ," + event.latlng.lng.toString()) //adds the lat/lng in the event of clicking marker again
                //open popup on lick
                addMarker.openPopup()
                console.log(addMarker.getLatLng())
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
                }).on('click', function (e) {
                    markersFeatureGroup.removeLayer(addMarker)
                    addMarker.remove()
                    e.target.setRadius(10)
                    e.target.setStyle({
                        color: "#3388FF"
                    })
                })
            })

        // plots and binds data to each NWIS site 
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


        // map legend
        let baseMaps = {
            "Satellite + Topographical": imageryTopoMap,
            "Satellite": imageryMap,
            "Topographical": topoMap,
        };


        // map toggles in legend
        // BUG: waypoints unable to be placed if navigation line unchecked.
        let overlayMaps = {
            "Hydro Overlay": hydroOverlay,
            "Water Monitoring Sites": sitesOverlay,
            "Navigation Overlay": navigationOverlay,
            "Waypoints": markersFeatureGroup
        };




        L.control.layers(baseMaps, overlayMaps).addTo(map);
        markersFeatureGroup.addTo(map)

        // // zoom the map to the polyline
        map.fitBounds(navigationOverlay.getBounds());
        
        
        function deg2rad(deg)
        {
            return deg * (Math.PI/180);
        }

        function haversine(pair1, pair2)
        {
            let lat1=pair1.lat
          
            let lon1=pair1.lng
          
            let lat2=pair2.lat
            let lon2=pair2.lng
           // console.log(`lat1: ${lat1}  lon1: ${lon1}  lat2: ${lat2}  lon2: ${lon2}`)
            const R = 3971.366
            // Radius of the earth in mi with using formula 3963 - 13 * math.sin(37) where 37 is latitude in Missouri
            
        
            var dLat = deg2rad(lat2-lat1);
            var dLon = deg2rad(lon2-lon1);
            var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
            // Return distance in miles.
            return R * c;
        }


        //variables for the counter and start/end coords
        let counter=0
        let start;
        let end;

        //BUG: toggling navigation overlay in map legend brings it above the user added polyline causing color issues
        navigationOverlay.on('click', function(e){
            if(counter==0){
               start=(L.GeometryUtil.locateOnLine(map, navigationOverlay, e.latlng))
                console.log(`start=${start}`)
               counter++
               return
            }else if(counter==1){
            //    console.log(end=L.GeometryUtil.closest(map, navigationOverlay, e.latlng, true))
            //    console.log(L.GeomentryUtil.extract(map, navigationOverlay, start, end))
               end=(L.GeometryUtil.locateOnLine(map, navigationOverlay, e.latlng))
               console.log(`end=${end}`)
               let lineSubset=L.GeometryUtil.extract(map, navigationOverlay, start, end)
               console.log(lineSubset)
               let testSubset=new L.Polyline(lineSubset).setStyle({color: '#AF4C3E'}).addTo(map)
               
               let totalDistance = 0
            
               for (let i = 1; i < lineSubset.length; i++) {
                     totalDistance += haversine(lineSubset[i-1], lineSubset[i])
                }
               counter=0
               console.log(totalDistance)
               return
          
                
            }
            
        })


    });