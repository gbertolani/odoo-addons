odoo.define('web_google_maps_multi_drawing.relational_fields', function (require) {

    var core = require('web.core');
    var relational_fields = require('web.relational_fields');
    var MultiMapRenderer = require('web_google_maps_multi_drawing.MultiMapRenderer');

    var qweb = core.qweb;

    var FieldOne2Many = relational_fields.FieldOne2Many;
    FieldOne2Many.include({
        custom_events: _.extend({}, FieldOne2Many.prototype.custom_events, {
            unlink_shape: '_onMapShapeDelete',
        }),
        /**
         * Override
         */
        _getRenderer: function () {
            if (this.view.arch.tag === 'map') {
                return MultiMapRenderer;
            }
            return this._super();
        },

        _onMapShapeDelete: function(ev){
            var self = this;
            var data = ev.data || {};
            ev.stopPropagation();
            self._setValue({
                operation: 'DELETE',
                ids: [data.id]
            });
        },

        //Use a Form to create shape
        _onAddRecord: function(ev){
            var arch = ev.target.arch;
            if(!_.isUndefined(arch) && ev.target.arch.tag == 'map'){
                var self = this;
                var data = ev.data || {};
                ev.stopPropagation();
                this._openFormDialog({
                        context: data.context && data.context[0],
                        mapShapeVals: data.mapShapeVals,
                        mapEditFields: data.mapEditFields || [],
                        on_saved: function (record, changed) {
                            self.renderer.refreshShape(data.mapShape, record);
                            self._setValue({
                                operation: 'ADD',
                                id: record.id,
                            });
                        },
                    });
            }else{
                this._super.apply(this, arguments);
            }
        },
        _onMapCenter: function (event) {
            event.stopPropagation();
            var pos = this.renderer.getZonePos();
            if(_.isUndefined(pos)){
                return this._super.apply(this, arguments);
            }
            this.renderer.gmap.setCenter(pos);
        },
        // _onAddRecord: function(ev){
        //     if(ev.target.arch.tag == 'map'){
        //         this.trigger_up('new_map_shape', {
        //             id: this.value.id,
        //             changes: {
        //                 shape_name: "perdr",
        //             },
        //         });
        //         this._setValue({
        //             operation: 'CREATE',
        //             position: "top",
        //         });
        //     }else{
        //         this._super.apply(this, arguments);
        //     }
        //
        // },


        // _onAddRecord: function(ev){
        //     if(ev.target.arch.tag == 'map'){
        //         var data = ev.data || {};
        //         ev.stopPropagation();
        //         var self = this;
        //         if (!this.activeActions.create) {
        //             if (data.onFail) {
        //                 data.onFail();
        //             }
        //         } else if (!this.creatingRecord) {
        //             this.creatingRecord = true;
        //             this.trigger_up('edited_list', {
        //                 id: this.value.id
        //             });
        //             this._setValue({
        //                 operation: 'CREATE',
        //                 position: "top",
        //                 context: data.context,
        //                 data: {
        //                     changes: {
        //                         shape_name: "hx",
        //                     }
        //                 }
        //
        //             }, {
        //                 allowWarning: data.allowWarning
        //             }).always(function() {
        //                 self.creatingRecord = false;
        //             }).done(function() {
        //                 if (data.onSuccess) {
        //                     data.onSuccess();
        //                 }
        //             });
        //         }
        //     }else{
        //         this._super.apply(this, arguments);
        //     }
        // },

        _onFieldChanged: function (ev) {
            return this._super.apply(this, arguments);
        },
        // commitChanges: function() {
        //     var self = this;
        //     var inEditionRecordID = this.renderer &&
        //         this.renderer.viewType === "map" &&
        //         this.renderer.getEditableRecordID();
        //     if (inEditionRecordID) {
        //         return this.renderer.commitChanges(inEditionRecordID).then(function() {
        //             return self._saveLine(inEditionRecordID);
        //         });
        //     }
        //     return this._super.apply(this, arguments);
        // },
    })
})

