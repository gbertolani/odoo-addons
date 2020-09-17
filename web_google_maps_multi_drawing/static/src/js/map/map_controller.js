odoo.define('web_google_maps_multi_drawing.MapController', function (require) {
    'use strict';

    var core = require('web.core');
    var MapController = require('web_google_maps.MapController');
    var qweb = core.qweb;
    var _t = core._t;

    MapController.include({
        init: function (parent, model, renderer, params) {
            this._super.apply(this, arguments);
        },
        // saveRecord: function(){
        // },
        // canBeSaved: function (recordID) {
        //
        // },
        // _saveRecord: function (recordID, options) {
        //     return this._super.apply(this, arguments);
        // },

    });
});


