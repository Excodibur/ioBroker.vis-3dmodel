/*
    ioBroker.vis vis-3dmodel Widget-Set

    Copyright 2020 Excodibur excodibur@posteo.de
*/
"use strict";

// Define some globals for eslint that are set by other JavaScript entries in 3dmodel.html
/* global vis */

vis.binds["3dmodel"].viseditor = {
    "clickableObjectsSelector": function (widAttr, data) {
        const widgetId = vis.activeWidgets[0];
        const logger = vis.binds["3dmodel"].logger[widgetId];
        try {
            logger.debug("loading clickable objects");
            const that = vis;
            const line = {
                "input": '<select id="inspect_' + widAttr + '" class="select-groups"></select>',
                "init": function (widAttr, data) {
                    $(this).html("");

                    // only fill select box if one widget is selected at a time
                    if (that.activeWidgets.length === 1) {
                        // get list of clickable objects from widget
                        const widget = that.activeWidgets[0];
                        vis.binds["3dmodel"].getClickableObjects(widget).then(objectList => {
                            for (const [name, parent] of Object.entries(objectList))
                                if (parent == null) $(this).append('<option value="' + name + '" ' + ((data === name) ? "selected" : "") + ">" + name + "</option>");
                        });
                    }

                    $(this).next().css("width", "100%");
                }
            };
            return line;
        } catch (ex) {
            logger.error(`3dmodel clickableObjectsSelector: error: ${ex.message}, stack: ${ex.stack}`);
        }
    },
    "animationsSelector": function (widAttr, data) {
        const widgetId = vis.activeWidgets[0];
        const logger = vis.binds["3dmodel"].logger[widgetId];
        try {
            logger.debug("loading animations");
            const that = vis;
            const line = {
                "input": '<select id="inspect_' + widAttr + '" class="select-groups"></select>',
                "init": function (widAttr, data) {
                    // console.log("DATA:"+JSON.stringify(data));
                    $(this).html("");

                    // only fill select box if one widget is selected at a time
                    if (that.activeWidgets.length === 1) {
                        // get list of clickable objects from widget
                        const widget = that.activeWidgets[0];
                        // add empty option
                        $(this).append('<option value=""></option>');
                        // get all other options
                        vis.binds["3dmodel"].getAnimations(widget).then(animationList => {
                            for (const name of Object.keys(animationList))
                                $(this).append('<option value="' + name + '" ' + ((data === name) ? "selected" : "") + ">" + name + "</option>");
                        });
                    }

                    $(this).next().css("width", "100%");
                    // $(this).load(location.href+" #inspect_"+widAttr+">*","");
                }
            };
            return line;
        } catch (ex) {
            logger.error(`3dmodel animationsSelector: error: ${ex.message}, stack: ${ex.stack}`);
        }
    },
    "lightsSelector": function (widAttr, data) {
        const widgetId = vis.activeWidgets[0];
        const logger = vis.binds["3dmodel"].logger[widgetId];
        try {
            logger.debug("loading lights");
            const that = vis;
            const line = {
                "input": '<select id="inspect_' + widAttr + '" class="select-groups"></select>',
                "init": function (widAttr, data) {
                    // console.log("DATA:"+JSON.stringify(data));
                    $(this).html("");

                    // only fill select box if one widget is selected at a time
                    if (that.activeWidgets.length === 1) {
                        // get list of clickable objects from widget
                        const widget = that.activeWidgets[0];
                        // add empty option
                        $(this).append('<option value=""></option>');
                        // get all other options
                        vis.binds["3dmodel"].getLights(widget).then(lightList => {
                            for (const name of Object.keys(lightList))
                                $(this).append('<option value="' + name + '" ' + ((data === name) ? "selected" : "") + ">" + name + "</option>");
                        });
                    }

                    $(this).next().css("width", "100%");
                }
            };
            return line;
        } catch (ex) {
            logger.error(`3dmodel lightsSelector: error: ${ex.message}, stack: ${ex.stack}`);
        }
    },
    "sceneSelector": function (widAttr, data) {
        const widgetId = vis.activeWidgets[0];
        const logger = vis.binds["3dmodel"].logger[widgetId];
        try {
            logger.debug("loading scenes");
            const that = vis;
            const line = {
                "input": '<select id="inspect_' + widAttr + '" class="select-groups"></select>',
                "init": function (widAttr, data) {
                    // console.log("DATA:"+JSON.stringify(data));
                    $(this).html("");

                    // only fill select box if one widget is selected at a time
                    if (that.activeWidgets.length === 1) {
                        // get list of clickable objects from widget
                        const widget = that.activeWidgets[0];
                        // add empty option
                        $(this).append('<option value=""></option>');
                        // get all other options
                        vis.binds["3dmodel"].getScenes(widget).then(sceneData => {
                            const sceneList = sceneData[0];
                            const currentScene = sceneData[1];
                            if (sceneList != null) {
                                sceneList.forEach(name => {
                                    $(this).append('<option value="' + name + '" ' + ((currentScene === name) ? "selected" : "") + ">" + name + "</option>");
                                });
                            }
                        });
                    }

                    $(this).next().css("width", "100%");
                }
            };
            return line;
        } catch (ex) {
            logger.error(`3dmodel sceneSelector: error: ${ex.message}, stack: ${ex.stack}`);
        }
    }
};
