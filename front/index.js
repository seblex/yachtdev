function init() {
    //Set up a click handler
    OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
        defaultHandlerOptions: {
            'single': true,
            'double': false,
            'pixelTolerance': 0,
            'stopSingle': false,
            'stopDouble': false
        },

        initialize: function(options) {
            this.handlerOptions = OpenLayers.Util.extend(
                {}, this.defaultHandlerOptions
            );
            OpenLayers.Control.prototype.initialize.apply(
                this, arguments
            );
            this.handler = new OpenLayers.Handler.Click(
                this, {
                    'click': this.trigger
                }, this.handlerOptions
            );
        },

        trigger: function(e) {
            let lonlat = map.getLonLatFromViewPortPx(e.xy)

            lonlat.transform(
                new OpenLayers.Projection("EPSG:900913"),
                new OpenLayers.Projection("EPSG:4326")
            );

            $('#params-modal').modal('show');
            $('#inputLatitude').val(lonlat.lat + " N");
            $('#inputLongitude').val(lonlat.lon + " E");
        }

    });

    let map = new OpenLayers.Map("map");
    let mapnik         = new OpenLayers.Layer.OSM();
    let fromProjection = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
    let toProjection   = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
    let position       = new OpenLayers.LonLat(30.33,59.93).transform( fromProjection, toProjection);
    let zoom           = 12;

    map.addLayer(mapnik);
    map.setCenter(position, zoom );

    let click = new OpenLayers.Control.Click();
    map.addControl(click);
    click.activate();
}