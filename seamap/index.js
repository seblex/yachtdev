let OsmTileServer = "BRAVO";
let map;

// Position and zoomlevel of the map (will be overriden with permalink parameters or cookies)
let lon = 11.6540;
let lat = 54.1530;
let zoom = 10;

//last zoomlevel of the map
let oldZoom = 0;

// Layers
let layer_mapnik;
let layer_marker;
let layer_seamark;
let layer_nautical_route;
let layer_grid;
let layer_waterdepth_contours;

// Load map for the first time
function init() {
    initMap();
    readCookies();
    // TODO: включает маршрут
    //NauticalRoute_startEditMode();
}

// Apply cookies or default values
function readCookies() {
    // Read zoom, lat, lon
    let cookieZoom = parseFloat(getCookie("zoom"));
    let cookieLat = parseFloat(getCookie("lat"));
    let cookieLon = parseFloat(getCookie("lon"));
    let permalinkLat = parseFloat(getArgument("lat"));
    let permalinkLon = parseFloat(getArgument("lon"));
    let permalinkZoom = parseFloat(getArgument("zoom"));
    let markerLat  = parseFloat(getArgument("mlat"));
    let markerLon  = parseFloat(getArgument("mlon"));

    zoom = permalinkZoom || cookieZoom || zoom;
    lat = markerLat || permalinkLat || cookieLat || lat;
    lon = markerLon || permalinkLon || cookieLon || lon;

    // Zoom to coordinates from marker/cookie or default values.
    jumpTo(lon, lat, zoom);

    // TODO: Временно, пока не готов выключатель
    toggleCompassrose();

    const compass = document.getElementById("checkCompassrose");
    if (compass && getCookie("CompassroseVisible") === "true") {
        compass.checked = true
        toggleCompassrose();
    }
}

let language = 'en';

// TODO: добавить чекбокс
function toggleCompassrose() {
    refreshMagdev();
    document.getElementById("compassRose").style.visibility = 'visible';

    /*if (document.getElementById("checkCompassrose").checked) {
        refreshMagdev();
        document.getElementById("compassRose").style.visibility = 'visible';
        setCookie("CompassroseVisible", "true");
    } else {
        document.getElementById("compassRose").style.visibility = 'hidden';
        setCookie("CompassroseVisible", "false");
    }*/
}

// TODO: здесь вот определяются координаты))
function addPermalinkMarker(coordinate) {
    console.log(coordinate);

    const [lon, lat] = ol.proj.toLonLat(coordinate);

    // Code from mousepostion_dm.js - redundant, try to reuse
    let ns = lat >= 0 ? 'N' : 'S';
    let we = lon >= 0 ? 'E' : 'W';
    let lon_m = Math.abs(lon*60).toFixed(3);
    let lat_m = Math.abs(lat*60).toFixed(3);
    let lon_d = Math.floor(lon_m/60);
    let lat_d = Math.floor(lat_m/60);
    lon_m -= lon_d*60;
    lat_m -= lat_d*60;

    console.log("coordinates", lat, lon, lat_m, lon_m)

    $('#params-modal').modal('show');
    $('#inputLatitude').val(ns + lat_d + "°" + format2FixedLenght(lat_m,6,3));
    $('#inputLongitude').val(we + lon_d + "°" + format2FixedLenght(lon_m,6,3));

    addMarker(layer_marker, lon, lat, "test");

    console.log(ns + lat_d + "°" + format2FixedLenght(lat_m,6,3) + "'" + " " + we + lon_d + "°" + format2FixedLenght(lon_m,6,3) + "'");
}

function initMap() {
    map = new ol.Map({
        target: 'map',
        view: new ol.View({
            maxZoom : 19,
        }),
    });

    //map.addControl(new Permalink());
    map.addControl(new ol.control.ScaleLine({
        className: 'ol-scale-line-metric'
    }));
    map.addControl(new ol.control.ScaleLine({
        className: 'ol-scale-line-nautical',
        units: "nautical",
    }));
    map.addControl(new ol.control.ZoomSlider());
    map.addControl(new ol.control.MousePosition({
        coordinateFormat: (coordinate) => {
            const [lon, lat] = ol.proj.toLonLat(coordinate);
            let ns = lat >= 0 ? 'N' : 'S';
            let we = lon >= 0 ? 'E' : 'W';
            let lon_m = Math.abs(lon*60).toFixed(3);
            let lat_m = Math.abs(lat*60).toFixed(3);
            let lon_d = Math.floor (lon_m/60);
            let lat_d = Math.floor (lat_m/60);
            lon_m -= lon_d*60;
            lat_m -= lat_d*60;
            return "Zoom:" + map.getView().getZoom().toFixed(0) + " " + ns + lat_d + "&#176;" + format2FixedLenght(lat_m,6,3) + "'" + "&#160;" +
                we + lon_d + "&#176;" + format2FixedLenght(lon_m,6,3) + "'" ;
        },
    }));
    map.on('moveend', mapEventMove);
    map.on('moveend', mapEventZoom);
    map.on('singleclick', mapEventClick);

    function updateCheckboxAndCookie(layer) {
        const checkboxId = layer.get("checkboxId");
        const cookieKey = layer.get("cookieKey");
        const checkbox = document.getElementById(checkboxId);

        if (checkbox) {
            checkbox.checked = layer.getVisible();
        }

        if (cookieKey) {
            setCookie(cookieKey, layer.getVisible());
        }
    }

    // Use a 512*5212 tile grid for some layers
    const projExtent = ol.proj.get('EPSG:3857').getExtent();
    const startResolution = ol.extent.getWidth(projExtent) / 256;
    const resolutions = new Array(22);
    for (let i = 0, ii = resolutions.length; i < ii; ++i) {
        resolutions[i] = startResolution / Math.pow(2, i);
    }

    // Add Layers to map-------------------------------------------------------------------------------------------------------

    // Mapnik (Base map)
    // old definition
    // layer_mapnik = new OpenLayers.Layer.XYZ('Mapnik',
    // GetOsmServer(),
    // { layerId  : 1,
    //   wrapDateLine : true
    // });
    const osmUrl =
    OsmTileServer === "BRAVO" ?
        'https://t2.openseamap.org/tile/{z}/{x}/{y}.png' :
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    layer_mapnik = new ol.layer.Tile({
        source: new ol.source.OSM({
            url: osmUrl,
            crossOrigin: null,
        }),
        properties: {
           name: 'Mapnik',
            layerId: 1,
            wrapDateLine:true
        }
    });

    // Seamark
    // old definition
    // layer_seamark = new OpenLayers.Layer.TMS("seamarks",
    // "https://tiles.openseamap.org/seamark/",
    // { layerId: 3, numZoomLevels: 19, type: 'png', getURL:getTileURL, isBaseLayer:false, displayOutsideMaxExtent:true});
    layer_seamark = new ol.layer.Tile({
        visible: true,
        maxZom: 19,
        source: new ol.source.XYZ({
            tileUrlFunction: function(coordinate) {
                return getTileUrlFunction("https://tiles.openseamap.org/seamark/", 'png', coordinate);
            }
        }),
        properties: {
            name: "seamarks",
            layerId: 3,
            cookieKey: "SeamarkLayerVisible",
            checkboxId: "checkLayerSeamark",
        }
    });

    layer_seamark.on("change:visible", (evt) => {
        updateCheckboxAndCookie(evt.target);
    });

    // Trip planner
    // old definition
    // layer_nautical_route = new OpenLayers.Layer.Vector("Trip Planner",
    // { layerId: 9, styleMap: routeStyle, visibility: false, eventListeners: {"featuresadded": NauticalRoute_routeAdded, "featuremodified": NauticalRoute_routeModified}});
    layer_nautical_route = new ol.layer.Vector({
        visible: false,
        properties: {
            name: 'Trip Planner',
            layerId: 9,
            checkboxId: "checkNauticalRoute",
            cookieKey: "NauticalRouteLayerVisible",
        },
        source: new ol.source.Vector({features:[]}),
    });
    layer_nautical_route.on("change:visible", (evt) => {
        updateCheckboxAndCookie(evt.target);
    });

    // Grid WGS
    // old definition
    // layer_grid = new OpenLayers.Layer.GridWGS("coordinateGrid", {
    // layerId: 10,
    // visibility: true,
    // zoomUnits: zoomUnits
    // });
    layer_grid = new ol.layer.Graticule({
        visible: true,
        properties: {
            name: "coordinateGrid",
            layerId: 10,
            checkboxId: "checkLayerGridWGS",
            cookieKey: "GridWGSLayerVisible",
        },
        // the style to use for the lines, optional.
        strokeStyle: new ol.style.Stroke({
            color: 'rgba(0,0,0,1)',
            width: 1,
        }),
        showLabels: true,
        wrapX: true,
    });
    layer_grid.on("change:visible", (evt) => {
        updateCheckboxAndCookie(evt.target);
    });

    // layer_waterdepth_contours
    layer_waterdepth_contours = new ol.layer.Image({
        visible: false,
        maxZoom: 22,
        properties:{
            name: 'Contours',
            layerId: 22,
            checkboxId: "checkDepthContours",
            cookieKey: "WaterDepthContoursVisible",
        },
        source: new ol.source.ImageWMS({
            url: 'https://depth.openseamap.org/geoserver/openseamap/wms',
            params: {
                'LAYERS': 'openseamap:contour2,openseamap:contour',
                'VERSION': '1.1.0'
            },
            attributions: '&copy; OpenSeaMap Contributors,'
        })
    });

    layer_waterdepth_contours.on("change:visible", (evt) => {
        updateCheckboxAndCookie(evt.target);
    })

    layer_marker = new ol.layer.Vector({
        source: new ol.source.Vector(),
        properties:{
            name: "Marker",
            layerId: -2 // invalid layerId -> will be ignored by layer visibility setup
        }
    });

    [
    layer_mapnik,
    layer_seamark,
    layer_grid,
    layer_nautical_route,
    layer_waterdepth_contours,
    layer_marker,
    ].forEach((layer)=> {
        map.addLayer(layer);
    });
}

// Map event listener moved
function mapEventMove(event) {
    const [lon, lat] = ol.proj.toLonLat(map.getView().getCenter());
    // Set cookie for remembering lat lon values
    setCookie("lat", lat.toFixed(5));
    setCookie("lon", lon.toFixed(5));

    // Update magnetic deviation
    if (document.getElementById("compassRose").style.visibility === 'visible') {
        refreshMagdev();
    }
}

// Map event listener Zoomed
function mapEventZoom(event) {
    zoom = map.getView().getZoom();
    // Set cookie for remembering zoomlevel
    setCookie("zoom",zoom);
    if(oldZoom !== zoom) {
        oldZoom = zoom;
    }
}

// TODO: обработка клика
function mapEventClick(event) {
    console.log(event);
    addPermalinkMarker(event.coordinate);
}