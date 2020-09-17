odoo.define('web_google_maps_multi_drawing.viewDialogs', function (require) {
    'use strict';

    var core = require('web.core');
    var dialogs = require('web.view_dialogs');
    var FormController = require('web.FormController');
    var qweb = core.qweb;
    var _t = core._t;

    var MapViewFormDialog = dialogs.FormViewDialog.extend({
        init: function (parent, options) {
            var res = this._super.apply(this, arguments);
            var self = this;
            options = options || {};
            this.mapShapeVals = options.mapShapeVals;
            return res;
        },

        /**
         * @private
         * @returns {Deferred}
         */
        _save: function () {
            var self = this;
            return this.form_view.saveRecord(this.form_view.handle, {
                stayInEdit: true,
                reload: false,
                savePoint: this.shouldSaveLocally,
                viewType: 'form',
            }).then(function (changedFields) {
                // record might have been changed by the save
                // (e.g. if this was a new record, it has an
                // id now), so don't re-use the copy obtained before the save
                var record = self.form_view.model.get(self.form_view.handle);
                var localData = self.model.localData[self.form_view.handle];
                var data = _.extend(record.data, self.mapShapeVals);
                localData._changes = data;
                localData._savePoint = data;
                self.on_saved(record, !!changedFields.length);
            });
        },

    })

    return {
        MapViewFormDialog: MapViewFormDialog,
    }
})




