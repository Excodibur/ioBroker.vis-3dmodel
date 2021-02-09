/*
    ioBroker.vis vis-3dmodel Widget-Set

    Copyright 2020 Excodibur
*/
"use strict";

// Define some globals for eslint that are set by other JavaScript entries in 3dmodel.html
/* global vis, ThreeJSModel, translateWord, systemDictionary, log, prefix */

const iobSystemDic = systemDictionary;
$.get("../vis-3dmodel.admin/words.js", function (script) {
    let translation = script.substring(script.indexOf("{"), script.length);
    translation = translation.substring(0, translation.lastIndexOf(";"));
    $.extend(systemDictionary, JSON.parse(translation));
    $.extend(systemDictionary, iobSystemDic);
});

const stateDefinitions = [];

// this code can be placed directly in vis-3dmodel.html
vis.binds["3dmodel"] = {
    "version": "0.0.3",
    "logger": [],
    "models": [],
    "showVersion": function () {
        if (vis.binds["3dmodel"].version) {
            console.log("Version vis-3dmodel: " + vis.binds["3dmodel"].version);
            vis.binds["3dmodel"].version = null;
        }
    },
    "createWidget": function (widgetID, view, data, style) {
        // Setup logging
        const logLevels = ["select", "silent", "error", "warn", "info", "debug", "trace"];

        let logLevel = data.debug_loglevel;
        if (!logLevels.includes(logLevel))
            logLevel = "info";

        // log.info("but this works");
        if (!(vis.binds["3dmodel"].logger[widgetID]))
            vis.binds["3dmodel"].logger[widgetID] = log.getLogger(widgetID);

        const logger = vis.binds["3dmodel"].logger[widgetID];
        logger.setLevel(logLevel);

        // Can't use plugin for log-formating right now, because it hides line numbers: https://github.com/kutuluk/loglevel-plugin-prefix/issues/4
        // prefix.reg(log);
        // prefix.apply(log, { "template": "[" + widgetID + "|%t] %l:" });

        // Initialize Widget
        logger.info("Initializing 3D model widget #" + widgetID);
        const $div = $("#" + widgetID);
        // if nothing found => wait
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds["3dmodel"].createWidget(widgetID, view, data, style);
            }, 100);
        }

        const container = document.getElementById(widgetID);

        // Don't initate model, unless GLTF file is refered to
        if (!data.gltf_file) {
            // Display some warning
            const domWarningMessage = document.createElement("div");
            domWarningMessage.innerHTML = translateWord("no 3d model specified");
            // translateWord(text)
            container.appendChild(domWarningMessage);
            return;
        }

        if (data.show_loader) {
            // Create loading screen
            const domLoadingScreen = document.createElement("div");
            domLoadingScreen.setAttribute("id", "loading-screen-" + widgetID);
            domLoadingScreen.setAttribute("class", "loading-screen");

            const numBoxes = 4;
            const domBoxLoader = document.createElement("div");
            domBoxLoader.setAttribute("class", "boxes");
            for (let i = 0; i < numBoxes; i++) {
                const domBox = document.createElement("div");
                domBox.setAttribute("class", "box");
                for (let l = 0; l < 4; l++)
                    domBox.appendChild(document.createElement("div"));
                domBoxLoader.appendChild(domBox);
            }
            domLoadingScreen.appendChild(domBoxLoader);
            container.appendChild(domLoadingScreen);
        }

        // React to widget-box being resized in VIS edit mode
        $div.on("resize", _onContainerResize);
        container.addEventListener("resize", _onContainerResize);

        const model = new ThreeJSModel(container, data.show_loader, logger);
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
            model.setupLights(data.enable_shadows, data.ambient_color, data.ambient_intensity, data.punctual_lights_max_power);

        // Setup clickable objects
        const clickableObjects = [];

        for (let i = 0; i <= data.number_clickable_objects; i++) {
            logger.trace(data.attr("clickable_object_name" + i) + " " + data.attr("clickable_object_action_id" + i));
            clickableObjects[data.attr("clickable_object_name" + i)] = {
                "stateId": data.attr("clickable_object_state" + i),
                "action": data.attr("clickable_object_state_action" + i)
            };
        }

        // If object is clicked, perform action associated with it
        function performAction (stateId, action) {
            logger.debug("Performing action " + action + " for state " + stateId);

            // Get current state value
            vis.conn.getStates(stateId, (error, states) => {
                if (error) {
                    logger.error("Error updating state " + stateId + ": " + error);
                    return;
                }

                logger.trace("Clickable state information: " + JSON.stringify(states));
                let stateValue = states[stateId].val;
                logger.debug("State " + stateId + " has value: " + stateValue);
                switch (action) {
                    case "enable":
                        stateValue = true;
                        break;
                    case "disable":
                        stateValue = false;
                        break;
                    case "toggle":
                        stateValue = !stateValue;
                        break;
                }
                // Update state with new value
                vis.conn.setState(stateId, stateValue, (error, response) => {
                    if (error)
                        logger.error("Error while updating state" + error);
                    else
                        logger.debug("Updated state successfully. New value: " + stateValue);
                });
            });
        }

        model.setupClickableObjects(clickableObjects, performAction);

        // Bind animations to states
        const bound = [];

        // subscribe on updates of value
        function onChange (e, newVal, oldVal) {
            const oid = e.type.replace(/\.val$/, "");
            const stateType = stateDefinitions[oid].common.type;
            newVal = (stateType === "boolean") ? !!newVal : newVal; // hacky way to transform number to boolean
            // Get all animations
            if (monitoredStateAnimationMap[oid]) {
                monitoredStateAnimationMap[oid].forEach(animation => {
                    model.updateAnimationByState(animation, newVal, stateAttributes[oid].maxValue);
                });
            }

            if (monitoredStateLightMap[oid]) {
                monitoredStateLightMap[oid].forEach(light => {
                    model.updateLightByState(light, newVal);
                });
            }
            // $div.find('.template-value').html(newVal);
        }

        // It should be possible to map more than one animation to a state
        // TODO Probably the following code needs to be reworked to reduce amount of arrays
        const monitoredStateAnimationMap = [];
        const autoplayAnimations = [];
        const repeatAnimations = [];
        const stateAttributes = [];
        for (let i = 0; i <= data.number_animations; i++) {
            const animationName = data.attr("animation" + i);
            const behaviour = data.attr("animation_behaviour" + i);
            const repeat = data.attr("animation_repeat" + i);
            if (behaviour === "monitorstate") {
                const monitoredStateName = data.attr("monitored_state_name" + i);
                const monitoredStateMaxValue = data.attr("monitored_state_max_value" + i);
                if (monitoredStateAnimationMap[monitoredStateName] == null)
                    monitoredStateAnimationMap[monitoredStateName] = [];
                monitoredStateAnimationMap[monitoredStateName].push(animationName);
                stateAttributes[monitoredStateName] = { "maxValue": monitoredStateMaxValue };
                // console.log("Setup state: " + monitoredStateName + " with animation " + animationName);
                // vis.states.bind(monitoredStateName + '.val', onChange);
                bound.push(monitoredStateName);
            } else {
                if (behaviour === "autoplay")
                    autoplayAnimations.push(animationName);
            }
            if (repeat)
                repeatAnimations.push(animationName);
        }

        // Do same stuff for lights on state changes
        const monitoredStateLightMap = [];
        const lightAttributes = [];
        for (let i = 0; i <= data.number_switchable_lights; i++) {
            const lightName = data.attr("light_name" + i);
            const monitoredStateName = data.attr("light_monitored_state" + i);
            const lightMaxPower = data.attr("light_max_power" + i);
            const monitoredStateMaxValue = data.attr("light_monitored_state_max_value" + i);
            lightAttributes[lightName] = { "maxPower": (lightMaxPower || null), "maxValue": monitoredStateMaxValue };
            if (monitoredStateLightMap[monitoredStateName] == null)
                monitoredStateLightMap[monitoredStateName] = [];
            monitoredStateLightMap[monitoredStateName].push(lightName);
            bound.push(monitoredStateName);
        }

        async function initializeModel (model, states, monitoredStateAnimationMap, stateAttributes, monitoredStateLightMap, autoplayAnimations, repeatAnimations) {
            await model.checkIfLoaded();
            // Initialize all animations/lights upon start
            for (const [oid, animations] of Object.entries(monitoredStateAnimationMap)) {
                animations.forEach((animation) => {
                    model.updateAnimationByState(animation, states[oid].val, stateAttributes[oid].maxValue);
                });
            }
            for (const [oid, lights] of Object.entries(monitoredStateLightMap)) {
                lights.forEach((light) => {
                    model.updateLightByState(light, states[oid].val, lightAttributes[light].maxValue, lightAttributes[light].maxPower);
                });
            }

            // start auto-play animations
            if (autoplayAnimations.length > 0) {
                autoplayAnimations.forEach((animation) => {
                    model.autoplayAnimation(animation);
                });
            }

            // repeat animations
            if (repeatAnimations.length > 0) {
                repeatAnimations.forEach((animation) => {
                    model.repeatAnimation(animation);
                });
            }
        }

        // Force Vis to get all state and stay updated
        // Works in end-user-view, but not in edit-mode
        vis.conn.getStates(bound, (_error, states) => {
            vis.updateStates(states);
            vis.conn.subscribe(bound);
            // console.log("###state info: " + JSON.stringify(states));
            for (let i = 0; i < bound.length; i++) {
                vis.states.bind(bound[i] + ".val", onChange);

                // Store additional data about states
                vis.conn.getObject(bound[i], false, function (_error, config) {
                    stateDefinitions[config._id] = config;
                    // console.log("++++state: " + config._id + " config: " + JSON.stringify(config));
                });

                initializeModel(model, states, monitoredStateAnimationMap, stateAttributes, monitoredStateLightMap, autoplayAnimations, repeatAnimations);
            }
        });

        // #####################
        // TODO: Initialize dynamic menues (called too late, needs to be invoked earlier)
        // #####################
        for (let i = 0; i <= data.number_animations; i++) {
            const mode = data.attr("animation_behaviour" + i);
            // console.log("Animation behaviour: " +mode);

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

                    // Only disable, if monitored state is not boolean
                    // TODO
                    // $("#inspect_animation_repeat" + i).prop("disabled", true);
                    break;
            }
        }

        // only try to load model, if it is acutally set
        if (data.gltf_file) {
            model.load(
                data.gltf_file,
                data.model_scene,
                data.model_pos_x,
                data.model_pos_y,
                data.model_pos_z,
                data.scaling,
                "loading-screen-" + widgetID
            );
        }
        logger.trace("added widgetID: " + widgetID);

        if (bound.length) {
            // remember all ids, that bound
            $div.data("bound", bound);
            // remember bind handler
            $div.data("bindHandler", onChange);
        }

        function _onContainerResize () {
            model.resizeView($(container).width(), $(container).height());
        }
    },
    "getClickableObjects": async function (widgetId) {
        const currentModel = this.models[widgetId];

        if (!currentModel) {
            vis.binds["3dmodel"].logger[widgetId].warn("no model found");
            return [];
        } else {
            await currentModel.checkIfLoaded();
            return currentModel.getAllObjects();
        }
    },
    "getAnimations": async function (widgetId) {
        const currentModel = this.models[widgetId];

        if (!currentModel) {
            vis.binds["3dmodel"].logger[widgetId].warn("no model found");
            return [];
        } else {
            await currentModel.checkIfLoaded();
            return currentModel.getAnimations();
        }
    },
    "getLights": async function (widgetId) {
        const currentModel = this.models[widgetId];

        if (!currentModel) {
            vis.binds["3dmodel"].logger[widgetId].warn("no model found");
            return [];
        } else {
            await currentModel.checkIfLoaded();
            return currentModel.getLights();
        }
    },
    "getScenes": async function (widgetId) {
        const currentModel = this.models[widgetId];

        if (!currentModel) {
            vis.binds["3dmodel"].logger[widgetId].warn("no model found");
            return [];
        } else {
            await currentModel.checkIfLoaded();
            return [currentModel.getScenes(), currentModel.getCurrentScene()];
        }
    }
    /*
    animationBehaviourOnChange (widgetId, view, mode, inputFieldId, data4) {
        logger.debug("Something changed: " + JSON.stringify(widgetId) + "," + JSON.stringify(view) + "," + JSON.stringify(inputFieldId) + "," + JSON.stringify(mode) + "," + JSON.stringify(data4));
        // Assume current form-field is named something like animation_behaviour<n>
        const index = inputFieldId.match(/^.*(\d+)$/)[1];

        // if (index == null)
        //    return;
    } */
};

vis.binds["3dmodel"].showVersion();
