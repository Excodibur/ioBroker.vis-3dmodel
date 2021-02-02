/*
    ioBroker.vis vis-3dmodel Widget-Set

    Copyright 2020 Excodibur excodibur@posteo.de
*/
"use strict";

let iobSystemDic = systemDictionary;
$.get("../vis-3dmodel.admin/words.js", function (script) {
    let translation = script.substring(script.indexOf('{'), script.length);
    translation = translation.substring(0, translation.lastIndexOf(';'));
    $.extend(systemDictionary, JSON.parse(translation));
    $.extend(systemDictionary, iobSystemDic);
});

let stateDefinitions = [];

// this code can be placed directly in vis-3dmodel.html
vis.binds["3dmodel"] = {
    version: "0.0.1",
    models: [],
    showVersion: function () {
        if (vis.binds["3dmodel"].version) {
            console.log('Version vis-3dmodel: ' + vis.binds["3dmodel"].version);
            vis.binds["3dmodel"].version = null;
        }
    },
    createWidget: function (widgetID, view, data, style) {
        var $div = $('#' + widgetID);
        // if nothing found => wait
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds["3dmodel"].createWidget(widgetID, view, data, style);
            }, 100);
        }

        var container = document.getElementById(widgetID);
        //$div.on("resize", _onContainerResize);
        //container.addEventListener('resize', _onContainerResize);;

        var model = new ThreeJSModel(container);
        this.models[widgetID] = model;
        model.setupScene(data.background_color, data.highlight_selected, data.highlight_color, data.enable_realistic_lighting);

        model.setupView(
            data.model_camera_pos_x,
            data.model_camera_pos_y,
            data.model_camera_pos_z,
            data.model_camera_target_pos_x,
            data.model_camera_target_pos_y,
            data.model_camera_target_pos_z
        );

        if (data.enable_ambient_lighting)
            model.setupLights(data.enable_shadows, data.ambient_color, data.ambient_intensity);

        //Get list of clickable objects
        var clickableObjects = [];

        for (var i = 0; i <= data.number_clickable_objects; i++) {
            console.log(data.attr("clickable_object_name" + i) + " " + data.attr("clickable_object_action_id" + i));
            clickableObjects[data.attr("clickable_object_name" + i)] = {
                target_id: data.attr("clickable_object_action_id" + i),
                action: data.attr("clickable_object_action_task" + i)
            };
        }

        //Bind animations to states
        var bound = [];

        // subscribe on updates of value
        function onChange(e, newVal, oldVal) {
            var oid = e.type.replace(/\.val$/, '');
            //var state = vis.conn.getObject(oid);
            //console.log("****" + JSON.stringify(stateDefinitions));
            //console.log("triggered " + oid + " state: " + JSON.stringify(stateDefinitions[oid]));
            var stateType = stateDefinitions[oid].common.type;
            newVal = (stateType == "boolean") ? !!newVal : newVal; //hacky way to transform number to boolean
            //Get all animations
            if (monitoredStateAnimationMap[oid]) {
                monitoredStateAnimationMap[oid].forEach(animation => {
                    model.updateAnimationByState(animation, newVal, stateAttributes[oid].maxValue); //100 ? maxvalue --> check
                });
            }

            if (monitoredStateLightMap[oid]) {
                monitoredStateLightMap[oid].forEach(light => {
                    model.updateLightByState(light, newVal);
                });
            }
            //$div.find('.template-value').html(newVal);
        }

        //It should be possible to map more than one animation to a state
        //TODO Probably the following code needs to be reworked to reduce amount of arrays 
        var monitoredStateAnimationMap = [];
        var autoplayAnimations = [];
        var repeatAnimations = [];
        var stateAttributes = [];
        for (var i = 0; i <= data.number_animations; i++) {
            var animationName = data.attr("animation" + i);
            var behaviour = data.attr("animation_behaviour" + i);
            var repeat = data.attr("animation_repeat" + i);
            if (behaviour == "monitorstate") {
                var monitoredStateName = data.attr("monitored_state_name" + i);
                var monitoredStateMaxValue = data.attr("monitored_state_max_value" + i);
                if (monitoredStateAnimationMap[monitoredStateName] == null)
                    monitoredStateAnimationMap[monitoredStateName] = [];
                monitoredStateAnimationMap[monitoredStateName].push(animationName);
                stateAttributes[monitoredStateName] = {"maxValue": monitoredStateMaxValue};
                //console.log("Setup state: " + monitoredStateName + " with animation " + animationName);
                //vis.states.bind(monitoredStateName + '.val', onChange);
                bound.push(monitoredStateName);
            } else {
                if (behaviour == "autoplay") 
                    autoplayAnimations.push(animationName);
                
                
            }  
            if (repeat)
                repeatAnimations.push(animationName);
        }

        

        //Do same stuff for lights on state changes
        var monitoredStateLightMap = [];
        for (var i = 0; i <= data.number_switchable_lights; i++) {
            var lightName = data.attr("light_name" + i);
            var monitoredStateName = data.attr("light_monitored_state" + i);
            if (monitoredStateLightMap[monitoredStateName] == null)
                monitoredStateLightMap[monitoredStateName] = [];
            monitoredStateLightMap[monitoredStateName].push(lightName);
            bound.push(monitoredStateName);
        }

        async function initializeModel(model, states, monitoredStateAnimationMap, stateAttributes, monitoredStateLightMap, autoplayAnimations, repeatAnimations) {
            await model.checkIfLoaded();
            //Initialize all animations/lights upon start
            console.log("ANIMATIONS: " + monitoredStateAnimationMap.toString());
            for (const [oid, animations] of Object.entries(monitoredStateAnimationMap)) {
                animations.forEach((animation) => {
                    console.log("###oid: " + oid + " animation: "+animation + " val: "+states[oid].val);
                    model.updateAnimationByState(animation, states[oid].val, stateAttributes[oid].maxValue);
                });
                
            }
            console.log("LIGHTS: " + monitoredStateLightMap);
            for (const [oid, lights] of Object.entries(monitoredStateLightMap)) {
                lights.forEach((light) => {
                    model.updateLightByState(light, states[oid].val);
                });
            }

            //start auto-play animations
            if (autoplayAnimations.length > 0){
                autoplayAnimations.forEach((animation) => {
                    model.autoplayAnimation(animation);
                });
            }

            //repeat animations
            if (repeatAnimations.length > 0){
                repeatAnimations.forEach((animation) => {
                    model.repeatAnimation(animation);
                });
            }
        }

        //Force Vis to get all state and stay updated
        //Works in end-user-view, but not in edit-mode
        vis.conn.getStates(bound, (error, states) => {
            vis.updateStates(states);
            vis.conn.subscribe(bound);
            //console.log("###state info: " + JSON.stringify(states));
            for (var i = 0; i < bound.length; i++) {
                vis.states.bind(bound[i] + '.val', onChange);

                //Store additional data about states
                vis.conn.getObject(bound[i], false, function (error, config) {
                    stateDefinitions[config._id] = config;
                    //console.log("++++state: " + config._id + " config: " + JSON.stringify(config));
                });
                
                initializeModel(model, states, monitoredStateAnimationMap, stateAttributes, monitoredStateLightMap, autoplayAnimations, repeatAnimations);
            }
        });


        function performAction(targetId, action) {
            console.log("Performing action " + action + " for target " + targetId);
            //vis.setValue("0_userdata.0.dummy", Math.floor(Math.random() * 100) + 1);
            vis.setValue("0_userdata.0.show_dialog", true);
            vis.setValue("0_userdata.0.show_dialog.dialog_target", targetId);
        }

        model.setupClickableObjects(clickableObjects, performAction);

        //#####################
        //TODO: Initialize dynamic menues (called too late, needs to be invoked earlier)
        //#####################
        for(var i=0; i <= data.number_animations; i++) {
            var mode = data.attr("animation_behaviour" +i);
            console.log("Animation behaviour: " +mode);

            switch (mode) {
                case "autoplay":
                    $("#inspect_monitored_state_name" + i).prop("disabled", true);
                    $("#inspect_monitored_state_max_value" + i).prop("disabled", true);
                    $("#inspect_state_animation_mapping" + i).prop("disabled", true);
                    $("#inspect_animation_repeat" + i).prop("disabled", false);
                break;
                case "monitorstate":
                    $("#inspect_monitored_state_name" + i).prop("disabled", false);
                    $("#inspect_monitored_state_max_value" + i).prop("disabled", false);
                    $("#inspect_state_animation_mapping" + i).prop("disabled", false);
                    
                    //Only disable, if monitored state is not boolean
                    //TODO
                    //$("#inspect_animation_repeat" + i).prop("disabled", true);
                break;
            }
        }

        //only try to load model, if it is acutally set
        if (data.gltf_file)
            model.load(
                data.gltf_file,
                data.model_scene,
                data.model_pos_x,
                data.model_pos_y,
                data.model_pos_z,
                data.scaling
            );
        console.log("added widgetID: "+widgetID);
        
        //model.addGlobalClippingPlane();
        /*vis.states.bind("0_userdata.0.dummy.val", (e, newVal, oldVal) => {
            console.log("triggered");
            model.updateAnimationByState("Animation_Rolladen_Buero_Vorne", parsetInt(newVal), "something", 100);
        });*/

        

        if (bound.length) {
            // remember all ids, that bound
            $div.data('bound', bound);
            // remember bind handler
            $div.data('bindHandler', onChange);
        }

        /*vis.states.bind(data.scale + '.val', (e, newVal, oldVal) => {
            model.scale.set(data.scale, data.scale, data.scale);
        });*/

        function _onContainerResize() {
            model.resizeView($(container).width(), $(container).height());
        }
        //vis.states.bind()
    },
    getClickableObjects: async function (widgetId) {
        console.log("widgetID: "+widgetId);
        var currentModel = this.models[widgetId];

        if (!currentModel) {
            console.log("no model found");
            return [];
        } else {
            await currentModel.checkIfLoaded();
            return currentModel.getAllObjects();
        }
    },
    getAnimations: async function (widgetId) {
        var currentModel = this.models[widgetId];

        if (!currentModel) {
            console.log("no model found");
            return [];
        } else {
            await currentModel.checkIfLoaded();
            return currentModel.getAnimations();
        }
    },
    getLights: async function (widgetId) {
        var currentModel = this.models[widgetId];

        if (!currentModel) {
            console.log("no model found");
            return [];
        } else {
            await currentModel.checkIfLoaded();
            return currentModel.getLights();
        }
    },
    getScenes: async function (widgetId) {
        var currentModel = this.models[widgetId];

        if (!currentModel) {
            console.log("no model found");
            return [];
        } else {
            await currentModel.checkIfLoaded();
            return [currentModel.getScenes(), currentModel.getCurrentScene()];
        }
    },
    animationBehaviourOnChange(widgetId, view, mode, inputFieldId, data4) {
        console.log("Something changed: " + JSON.stringify(widgetId) +"," + JSON.stringify(view)+"," + JSON.stringify(inputFieldId) + "," + JSON.stringify(mode)+"," + JSON.stringify(data4));
        //Assume current form-field is named something like animation_behaviour<n>
        var index = inputFieldId.match(/^.*(\d+)$/)[1];
        console.log("index: " + index);
        if (index == null)
            return;
 
        
    }
};



vis.binds["3dmodel"].showVersion();