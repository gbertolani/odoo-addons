odoo.define('web_google_maps_multi_drawing.MultiMapRenderer', function (require) {
    'use strict';

    var MapRenderer = require('web_google_maps.MapRenderer');
    var core = require('web.core');
    var qweb = core.qweb;
    var _t = core._t;

        var MultiMapRenderer = MapRenderer.extend({

        init: function () {
            this._super.apply(this, arguments);
            this.editModeColor = '#006ee5';
            this.localData = [];
        },

        // _initMap: function () {
        //     var res = this._super();
        //     this._initDrawing();
        //     return res;
        // },
        //

        //save Markers
        /*
         * We user all params and save markes in shapes
         * to center map
         */
        _initLibraryProperties: function (params) {
            //this.mapLibrary == 'drawing'

            this.drawingMode = params.drawingMode || 'shape_type';
            this.drawingPath = params.drawingPath || 'shape_paths';
            this.shapesLatLng = [];

            //this.mapLibrary == 'geometry'
            this.defaultMarkerColor = 'red';
            this.markerGroupedInfo = [];
            this.markers = [];
            this.iconUrl = '/web_google_maps/static/src/img/markers/';
            this.fieldLat = params.fieldLat;
            this.fieldLng = params.fieldLng;
            this.markerColor = params.markerColor;
            this.markerColors = params.markerColors;
            this.groupedMarkerColors = _.extend([], params.iconColors);
        },

        /**
         * Create marker
         * @param {any} latLng: instance of google LatLng
         * @param {any} record
         * @param {string} color
         */
        _createMarker: function (latLng, record, color) {
            var options = {
                position: latLng,
                map: this.gmap,
                animation: google.maps.Animation.DROP,
                _odooRecord: record,
            };
            if (color) {
                options.icon = this._getIconColorPath(color);
            }
            var marker = new google.maps.Marker(options);
            this.markers.push(marker);
            marker.type = "marker";
            this._saveVirtualShape(marker, record);
            marker.addListener(
                'click',
                this._handleShapeClick.bind(this, record, marker)
            );
            // this._clusterAddMarker(marker);
        },

        /**
         * @override
         */
        _renderView: function () {
            var self = this;
            if (this.mapLibrary === 'drawing') {
                this._renderMarkers();
            }
            return this._super.apply(this, arguments);
        },

        _renderUngrouped: function () {
            var self = this;
            var defaultLatLng = this._getDefaultCoordinate();
            var color, latLng, lat, lng;

            _.each(this.state.data, function (record) {
                if(record.data['shape_type'] == 'marker'){
                    color = self._getIconColor(record);
                    lat = record.data[self.fieldLat] || 0.0;
                    lng = record.data[self.fieldLng] || 0.0;
                    if (lat === 0.0 && lng === 0.0) {
                        self._createMarker(defaultLatLng, record, color);
                    } else {
                        latLng = new google.maps.LatLng(lat, lng);
                        record.markerColor = color;
                        self._createMarker(latLng, record, color);
                    }
                }
            });
        },


        _centerMap: function(){
            if (this.mapLibrary === 'geometry') {
                this.mapGeometryCentered();
            } else if (this.mapLibrary === 'drawing') {
                this.mapShapesCentered();
            }
        },

        _initGeoLocation: function(){
            var self = this;
            var regs = this.state.data;
            if(!(!_.isUndefined(regs) && regs.length)){
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const pos = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                            };
                            self.gmap.setCenter(pos);
                        },
                    );
                }
            }else{
                self._centerMap();
            }
        },


        start: function () {
            var res = this._super();
            this._initDrawing();
            this._initGeoLocation();
            return res;
        },

        _initColorPicker: function(){
            // See: https://github.com/Simonwep/pickr
            this.pickr = new Pickr({
                el: this.$btnDrawingColor.find('.btn-color-picker').get(0),
                container: this.$btnDrawingColor.get(0),
                default: null,
                padding: 8,
                components: {
                    preview: true,
                    opacity: true,
                    hue: true,
                    output: {
                        hex: true,
                        rgba: true,
                        hsva: true,
                        input: true,
                    },
                    interaction: {
                        save: true,
                        clear: true,
                    },
                },
                strings: {
                    save: _t('Save'),  // Default for save button
                    clear: _t('Clear'), // Default for clear button
                }
            });

            //Custom Style
            this.$btnDrawingColor.find('.pcr-button').css({
                'width': '14px',
                'height': '14px',
            });

            this.pickr.on('save', this._savePickerColor.bind(this));
            this.pickr.on('clear', this._clearPickerColor.bind(this));
            this.pickr.on('show', this._showPickerColor.bind(this));
        },

        _showPickerColor: function(instance){
            if(!this.selectedShape){
                instance.hide();
            }
        },


        _savePickerColor: function(color, instance){
            if(color == null){
                return;
            }
            if(this.selectedShape){
                if(color == null){
                    this._clearPickerColor(instance);
                }
                var new_color = color.toHEXA().toString();
                var shape_color = this.selectedShape.fillColor;
                if(new_color.toUpperCase() == shape_color.toUpperCase()){
                    return
                }
                this.selectedShape.setOptions({
                    fillColor: new_color,
                    strokeColor: pSBC(-0.8, new_color),
                });
                this._commitShapeDraw();
                this.pickr.hide();
            }
        },

        _clearPickerColor: function(color, instance){
        },

        /**
         * @private
         * Load action buttons into the map
         */
        _loadDrawingActionButton: function () {
            var edit_mode = this.isEditMode();
            if (this.$btnDrawingClear === undefined && edit_mode) {
                this.$btnDrawingClear = $(qweb.render('MapMultiDrawing.BtnDelete', {
                    widget: this
                }));
                this.gmap.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(
                    this.$btnDrawingClear.get(0));
                this.$btnDrawingClear.on(
                    'click', this._deleteSelectedShaped.bind(this));
            }

            if (this.$btnDrawingColor === undefined && edit_mode) {
                this.$btnDrawingColor = $(qweb.render(
                    'MapMultiDrawing.BtnDrawingColorPicker', {
                    widget: this
                }));
                this._initColorPicker();

                // this.$btnDrawingColor.append(pickr._root.root);
                this.gmap.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(
                    this.$btnDrawingColor.get(0));
            }
        },

        _deleteSelectedShaped: function (event) {
            event.preventDefault();
            if (this.selectedShape) {
                this.triggerUpDeleteShape(this.selectedShape);
                this.pickr.setColor(null);
            }
        },

        /*
         *Save shape in localData
         */
        _saveVirtualShape: function(shape, record){
            //Save shape in localData
            var uniqueId = _.uniqueId();
            shape._drawId = uniqueId;
            if(_.isUndefined(record)){
                var vals = {
                    _drawId: uniqueId,
                    shape: shape,
                    shapeIndex: this.localData.length,
                    newId: true,
                }
            }else{
                var shapeIndex = _.indexOf(
                    _.pluck(this.state.data, 'id'), record.id);
                var vals = {
                    _drawId: uniqueId,
                    shape: shape,
                    shapeIndex: shapeIndex,
                    newId: false,
                }
            }
            this.localData.push(vals)
        },

        isEditMode: function(){
            var parent = this.getParent()
            var mode = parent.mode;
            if(mode == "edit"){
                return true;
            }
            return false;
        },

        _getDrawingModes: function(){
            var edit_mode = this.isEditMode();
            if(edit_mode){
                return [
                    'marker',
                    'circle',
                    'polygon',
                    'rectangle',
                ]
            }else{
                return [];
            }
        },

        _initDrawing: function (mode) {
            var drawingOptions = {
                fillColor: this.editModeColor,
                strokeWeight: 0,
                fillOpacity: 0.45,
                editable: true
            };
            var polylineOptions = {
                strokeColor: this.editModeColor,
                strokeWeight: 2
            };
            var circleOptions = {
                fillColor: this.editModeColor,
                fillOpacity: 0.45,
                strokeWeight: 0,
                editable: true,
                zIndex: 1
            };
            var markerOptions = {
                fillColor: this.editModeColor,
                fillOpacity: 0.45,
                strokeWeight: 0,
                editable: true,
                zIndex: 1,
            };
            var drawingModes = this._getDrawingModes();
            var edit_mode = this.isEditMode();
            this.gmapDrawingManager = new google.maps.drawing.DrawingManager({
                drawingControl: edit_mode, //Hand icon
                drawingControlOptions: {
                    position: google.maps.ControlPosition.BOTTOM_CENTER,
                    drawingModes: drawingModes,
                },
                map: this.gmap,
                polylineOptions: {
                    editable: edit_mode, //No edit shapes
                },
                markerOptions: markerOptions,
                rectangleOptions: drawingOptions,
                polygonOptions: drawingOptions,
                circleOptions:  circleOptions,
                polylineOptions:  polylineOptions,
            });
            google.maps.event.addListener(
                this.gmapDrawingManager,
                'overlaycomplete',
                this._overlayCompleted.bind(this)
            );
            google.maps.event.addListener(
                this.gmapDrawingManager,
                'drawingmode_changed',
                this._clearSelectedShape.bind(this)
            );
            google.maps.event.addListener(
                this.gmap,
                'click',
                this._clearSelectedShape.bind(this)
            );
            this._loadDrawingActionButton();
            // this._loadShapeExisted();
        },

        /**
         * @private
         * Set selected shape
         */
        _setSelectedShape: function (newShape) {
            this.selectedShape = newShape;
            if(newShape.type != 'marker'){
                this.selectedShape.setEditable(true);
                this.pickr.setColor(this.selectedShape.fillColor);
            }
        },

        /**
         * @private
         * Callback function when overlay is completed
         */
        _overlayCompleted: function (event) {
            // Switch back to non-drawing mode after drawing a shape.
            this.gmapDrawingManager.setDrawingMode(null);
            //
            var newShape = event.overlay;
            newShape.type = event.type;
            this._saveVirtualShape(newShape);
            google.maps.event.addListener(
                newShape,
                'click',
                this._setSelectedShape.bind(this, newShape)
            );
            this._setSelectedShape(newShape);
            this._commitShapeDraw();
        },
        /**
         * @private
         * Clear selected shape
         */
        _clearSelectedShape: function () {
            if (this.selectedShape) {
                if(this.selectedShape.type != 'marker'){
                    this.selectedShape.setEditable(false);
                }
                this.selectedShape = null;
            }
        },


        _commitShapeDraw: function () {
            if (this.selectedShape.type === 'polygon') {
                this._onPolygonCommit();
            } else if (this.selectedShape.type === 'rectangle') {
                this._onRectangleCommit();
            } else if (this.selectedShape.type === 'circle') {
                this._onCircleCommit();
            }else if (this.selectedShape.type === 'marker'){
                this._onMarkerCommit();
            }
        },

        triggerUpDeleteShape: function(shape){
            var virtualShape = _.findWhere(
                this.localData, {
                    _drawId: shape._drawId,
                }
            );
            if(_.isUndefined(virtualShape)){
                shape.setMap(null);
                return
            }
            var records = this.state.data;
            var record = records[virtualShape.shapeIndex];
            var index = _.indexOf(
                _.pluck(this.localData, '_drawId'), shape._drawId);
            this.localData.slice(index, 1);
            shape.setMap(null);
            this.trigger_up(
                'unlink_shape', {
                    id: record.id,
                }
            );
        },

        _getEditFields: function(shape){
            //Allow edit marker fields
            var mapEditFields = [];
            if(shape.type == "marker"){
                mapEditFields = [
                    this.fieldLat, this.fieldLng
                ];
            }
            return mapEditFields;
        },

        refreshShape: function(shape, record){
            if(shape.type == "marker"){
                var lat = record.data[this.fieldLat];
                var lng = record.data[this.fieldLng];
                var latLng = new google.maps.LatLng(lat, lng);
                shape.setPosition(latLng);

            }
        },

        triggerUpSaveShape: function(shape, changes){
            var virtualShape = _.findWhere(
                this.localData, {
                    _drawId: shape._drawId,
                }
            );
            if(_.isUndefined(virtualShape)){
                this.do_warn(_t('Error! Shape not registered. Please delete it'));
                return;
            }
            var record_index = virtualShape.shapeIndex;
            var records = this.state.data;
            if(records.length <= record_index){
                var ctx = this.el.dataset.context;
                var mapEditFields = this._getEditFields(shape);
                this.trigger_up(
                    'add_record', {
                        context: ctx && [ctx],
                        mapShapeVals: changes,
                        mapShape: shape,
                        mapEditFields: mapEditFields,
                    }
                );
            }else{
                this.trigger_up('field_changed', {
                    dataPointID: records[record_index].id,
                    changes: changes,
                    force_save: true,
                });
            }
        },

        _prepareFieldVals:  function(values, shape_paths){
            var values = values || {};
            var shape_paths = shape_paths || {};
            values['shape_paths'] = JSON.stringify(shape_paths);
            return values;
        },

        _parseMarkerFieldVals: function(marker){
            var self = this;
            var lat = marker.getPosition().lat();
            var lng = marker.getPosition().lng();
            var values = {
                shape_type: marker.type,
            }
            values[self.fieldLat] = lat;
            values[self.fieldLng] = lng;
            var field_vals = this._prepareFieldVals(values);
            return field_vals
        },

        _onMarkerCommit: function() {
            var self = this;

            var shape = this.selectedShape;
            var field_vals = this._parseMarkerFieldVals(shape);
            // ev.currenttarget.dataset.context
            var ctx = this.el.dataset.context;
            self.triggerUpSaveShape(shape, field_vals);
        },

        _parsePolygonFieldVals: function(shape){
            var self = this;

            //Polygon Vals:
            var paths = shape.getPath();
            var area = google.maps.geometry.spherical.computeArea(paths);
            var paths_latLng = [];
            paths.forEach(function (item) {
                paths_latLng.push({
                    'lat': item.lat(),
                    'lng': item.lng()
                });
            });
            var values = {
                'shape_type': shape.type,
                'shape_area': area,
            };
            var shape_paths = {
                'type': shape.type,
                'options': {
                    paths: paths_latLng,
                    fillColor: shape.fillColor,
                    strokeColor: shape.strokeColor,

                }
            };

            var field_vals = this._prepareFieldVals(values, shape_paths);
            return field_vals
        },

        _onPolygonCommit: function(){
            var self = this;

            var shape = this.selectedShape;
            var field_vals = this._parsePolygonFieldVals(shape);
            // ev.currenttarget.dataset.context
            var ctx = this.el.dataset.context;
            self.triggerUpSaveShape(shape, field_vals);
        },

        _parseRectangleFieldVals: function(shape){
            var self = this;
            var values = {
                'shape_type': shape.type,
            };
            var bounds = shape.getBounds();
            var directions = bounds.toJSON();
            var shape_paths = {
                'type': shape.type,
                'options': {
                    bounds: directions,
                    fillColor: shape.fillColor,
                    strokeColor: shape.strokeColor,
                }
            };
            var field_vals = this._prepareFieldVals(values, shape_paths);
            return field_vals
        },


        _onRectangleCommit: function(){
            var self = this;
            var shape = this.selectedShape;
            var field_vals = this._parseRectangleFieldVals(shape);
            // ev.currenttarget.dataset.context
            var ctx = this.el.dataset.context;
            self.triggerUpSaveShape(shape, field_vals);
        },

        _parseCircleFieldVals: function(shape){
            var self = this;
            var radius = shape.getRadius();
            var center = shape.getCenter();
            var values = {
                'shape_type': shape.type,
                'shape_radius': radius
            };
            var shape_paths = {
                'type': shape.type,
                'options': {
                    radius: radius,
                    fillColor: shape.fillColor,
                    strokeColor: shape.strokeColor,
                    center: {
                        'lat': center.lat(),
                        'lng': center.lng()
                    }
                }
            };
            var field_vals = this._prepareFieldVals(values, shape_paths);
            return field_vals;
        },

        _onCircleCommit: function(){
            var self = this;
            var shape = this.selectedShape;
            var field_vals = this._parseCircleFieldVals(shape);
            // ev.currenttarget.dataset.context
            var ctx = this.el.dataset.context;
            self.triggerUpSaveShape(shape, field_vals);
        },



        /*
         *
         *
         *  <<<< --- Drawing created records --- >>>>
         *  MOD: Allow take colors and define edit mode
         *
         *
         */

        /*
         * If is editing mode, change options of shape to editing
         * else we show a info window
        */
        _handleShapeClick: function(record, shape, event){
            if(this.isEditMode()){
                shape.setOptions({
                    editable: true,
                });
                this._clearSelectedShape();
                this._setSelectedShape(shape);
            }else{
                if(shape.type == 'marker'){
                    this._markerInfoWindow(shape, record);
                }else{
                    this._shapeInfoWindow(record, event);
                }
            }
        },

        _getType: function(record){
            return record.data[this.drawingMode];
        },


        /*
         * Override
         */
        _drawPolygon: function (record) {
            var self = this;
            var polygon;
            var path = record.data[this.drawingPath];
            var value = JSON.parse(path);
            if (Object.keys(value).length > 0) {
                if (this.shapesCache[record.data.id] === undefined) {
                    polygon = new google.maps.Polygon({
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.85,
                        strokeWeight: 1.0,
                        fillColor: '#FF9999',
                        fillOpacity: 0.35,
                        map: this.gmap,
                    });
                    polygon.setOptions(value.options);
                    this.shapesCache[record.data.id] = polygon;
                } else {
                    polygon = this.shapesCache[record.data.id];
                    polygon.setMap(this.gmap);
                }
                this.shapesLatLng = this.shapesLatLng.concat(value.options.paths);
                polygon.type = this._getType(record);
                this._saveVirtualShape(polygon, record);
                polygon.addListener(
                    'click',
                    this._handleShapeClick.bind(this, record, polygon)
                );
                var polygon_path = polygon.getPath()
                google.maps.event.addListener(
                    polygon_path,
                    'set_at',
                    function() {
                        self._polygonChanged(polygon)
                    }
                );
                google.maps.event.addListener(
                    polygon_path,
                    'insert_at',
                    function() {
                        self._polygonChanged(polygon)
                    }
                );
            }
        },

        _polygonChanged: function(shape) {
            var field_vals = this._parsePolygonFieldVals(shape);
            this.triggerUpSaveShape(shape, field_vals);
        },

        /*
         * Override
         */
        _drawCircle: function (record) {
            var self = this;
            var circle;
            var path = record.data[this.drawingPath];
            var value = JSON.parse(path);
            if (Object.keys(value).length > 0) {
                if (this.shapesCache[record.data.id] === undefined) {
                    circle = new google.maps.Circle({
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.85,
                        strokeWeight: 1.0,
                        fillColor: '#FF9999',
                        fillOpacity: 0.35,
                        map: this.gmap,
                    });
                    circle.setOptions(value.options);
                    this.shapesCache[record.data.id] = circle;
                } else {
                    circle = this.shapesCache[record.data.id];
                    circle.setMap(this.gmap);
                }
                this.shapesBounds.union(circle.getBounds());
                circle.type = this._getType(record);
                this._saveVirtualShape(circle, record);
                circle.addListener('click', this._handleShapeClick.bind(this, record, circle));
                google.maps.event.addListener(
                    circle, 'radius_changed', function() {
                        var field_vals = self._parseCircleFieldVals(this);
                        self.triggerUpSaveShape(this, field_vals);
                    }
                );
            }
        },
        /**
         * Draw rectangle
         * @param {Object} record
         */
        _drawRectangle: function (record) {
            var self = this;
            var rectangle;
            var path = record.data[this.drawingPath];
            var value = JSON.parse(path);
            if (Object.keys(value).length > 0) {
                var shapeOptions = value.options;
                if (this.shapesCache[record.data.id] === undefined) {
                    rectangle = new google.maps.Rectangle({
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.85,
                        strokeWeight: 1.0,
                        fillColor: '#FF9999',
                        fillOpacity: 0.35,
                        map: this.gmap,
                    });
                    rectangle.setOptions(shapeOptions);
                    this.shapesCache[record.data.id] = rectangle;
                } else {
                    rectangle = this.shapesCache[record.data.id];
                    rectangle.setMap(this.gmap);
                }

                this.shapesBounds.union(rectangle.getBounds());
                rectangle.type = this._getType(record);
                this._saveVirtualShape(rectangle, record);
                rectangle.addListener(
                    'click',
                    this._handleShapeClick.bind(this, record, rectangle)
                );
                google.maps.event.addListener(
                    rectangle, 'bounds_changed', function() {
                        var field_vals = self._parseRectangleFieldVals(this);
                        self.triggerUpSaveShape(this, field_vals);
                    }
                );
            }
        },


        /*
         *   <<<------ Record handler ----->>>>
         */
        getEditableRecordID: function(){
            return this.state.data[this.state.data.length -1].id;
            if (this.currentRow !== null) {
                return this.state.data[this.currentRow].id;
            }
            return null;
        },

        /**
         * This method is called when we create a new shape or marker.
         *
         * @param {MouseEvent} ev
         */
        _onAddRecord: function (ev) {
            // we don't want the browser to navigate to a the # url
            ev.preventDefault();

            // we don't want the click to cause other effects, such as unselecting
            // the row that we are creating, because it counts as a click on a tr
            ev.stopPropagation();

            // but we do want to unselect current row
            var self = this;
            this.unselectRow().then(function () {
                self.trigger_up(
                    'add_record', {context: ev.currentTarget.dataset.context && [ev.currentTarget.dataset.context]}); // TODO write a test, the deferred was not considered
            });
        },



    });

    return MultiMapRenderer;
});


