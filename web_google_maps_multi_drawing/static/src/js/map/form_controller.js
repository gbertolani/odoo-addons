odoo.define('web_google_maps_multi_drawing.FormController', function (require) {
    'use strict';

    var core = require('web.core');
    // var dialogs = require('web.view_dialogs');
    var dialogs = require('web_google_maps_multi_drawing.viewDialogs');
    var FormController = require('web.FormController');
    var qweb = core.qweb;
    var _t = core._t;

    FormController.include({
        custom_events: _.extend({}, FormController.prototype.custom_events, {
            map_shape_update : '_onMapShapeUpdate',
            new_map_shape: '_onNewMapShape',
        }),

        _onMapShapeUpdate: function(event){
            //Black Function
            //It's not a good code, but it works
            var data = event.data || {}
            event.stopPropagation();
        },

        _onNewMapShape: function (ev) {
            ev.stopPropagation();
            if (ev.data.id) {
                this.model.save(ev.data.id, {savePoint: true});
            }
            var reg = this.model.localData[ev.data.id]
            var changes = _.extend(reg._changes || {}, ev.data.changes);
            reg._changes = changes;
            this.model.freezeOrder(ev.data.id);
        },

        _showDynamicFields: function(fields_view, fields){
            if(_.isUndefined(fields) || !fields.length){
                return;
            }
            var fieldsInfo = fields_view.fieldsInfo;
            if(_.isUndefined(fieldsInfo.form)){
                return;
            }
            for(var i, i=0; i<fields.length; i++){
                var field_name = fields[i];
                var field = fieldsInfo.form[field_name];
                if(_.isUndefined(field)){
                    continue;
                }
                field.invisible = "0";
                field.modifiers.invisible = false;
            }
        },

        /*
         * Override (Pass MapShape)
         */
        _onOpenOne2ManyRecord: function (event) {
            event.stopPropagation();
            var data = event.data;
            if(!Object.keys(data.mapShapeVals||{}).length){
                return this._super.apply(this, arguments);
            }
            var record;
            if (data.id) {
                record = this.model.get(data.id, {raw: true});
            }
            this._showDynamicFields(
                data.fields_view,
                data.mapEditFields,
            );
            new dialogs.MapViewFormDialog(this, {
                context: data.context,
                domain: data.domain,
                fields_view: data.fields_view,
                model: this.model,
                on_saved: data.on_saved,
                on_remove: data.on_remove,
                parentID: data.parentID,
                readonly: data.readonly,
                deletable: data.deletable,
                recordID: record && record.id,
                res_id: record && record.res_id,
                res_model: data.field.relation,
                shouldSaveLocally: true,
                disable_multiple_selection: true,
                mapShapeVals: data.mapShapeVals, // <-- Pass mapShape
                mapEditFields: data.mapEditFields,
                title: (
                    record ?
                        _t("Open: ") :
                        _t("Create ")) + (event.target.string || data.field.string
                ),
            }).open();
        },


    });
});


