/*
    ioBroker.vis vis-3dmodel Widget-Set

    Copyright 2020 Excodibur excodibur@posteo.de
*/
"use strict";

vis.binds["3dmodel"].viseditor = {
    clickableObjectsSelector: function (widAttr, data) {
        try {
            console.log("loading clickable objects");
            var that = vis;
            var line = {
                input: '<select id="inspect_' + widAttr + '" class="select-groups"></select>',
                init: function (_wid_attr, data) {
                    $(this).html('');

                    //only fill select box if one widget is selected at a time
                    if (that.activeWidgets.length == 1) {
                        // get list of clickable objects from widget
                        var widget = that.activeWidgets[0];
                        vis.binds["3dmodel"].getClickableObjects(widget).then(objectList => {
                            for (const [name, parent] of Object.entries(objectList)) {
                                if (parent == null) $(this).append('<option value="' + name + '" ' + ((data == name)? 'selected' : '') + '>' + name + '</option>');
                            }
                        });

                        
                    }

                    $(this).next().css('width', '100%');
                }
            }
            return line;
        } catch (ex) {
            console.error(`3dmodel clickableObjectsSelector: error: ${ex.message}, stack: ${ex.stack}`);
        }
    },
    animationsSelector: function (widAttr, data) {
        try {
            console.log("loading animations");
            var that = vis;
            var line = {
                input: '<select id="inspect_' + widAttr + '" class="select-groups"></select>',
                init: function (_wid_attr, data) {
                    //console.log("DATA:"+JSON.stringify(data));
                    $(this).html('');

                    //only fill select box if one widget is selected at a time
                    if (that.activeWidgets.length == 1) {
                        // get list of clickable objects from widget
                        var widget = that.activeWidgets[0];
                        //add empty option
                        $(this).append('<option value=""></option>');
                        //get all other options
                        vis.binds["3dmodel"].getAnimations(widget).then(animationList => {
                            for (const [name, tools] of Object.entries(animationList)) {
                                console.log("Adding animation to dropdown: " + name);
                                $(this).append('<option value="' + name + '" ' + ((data == name)? 'selected' : '') + '>' + name + '</option>');
                            }
                        });
                    }

                    $(this).next().css('width', '100%');
                    //$(this).load(location.href+" #inspect_"+widAttr+">*","");
                }
            }
            return line;
        } catch (ex) {
            console.error(`3dmodel animationsSelector: error: ${ex.message}, stack: ${ex.stack}`);
        }
    },
    lightsSelector: function (widAttr, data) {
        try {
            console.log("loading lights");
            var that = vis;
            var line = {
                input: '<select id="inspect_' + widAttr + '" class="select-groups"></select>',
                init: function (_wid_attr, data) {
                    //console.log("DATA:"+JSON.stringify(data));
                    $(this).html('');

                    //only fill select box if one widget is selected at a time
                    if (that.activeWidgets.length == 1) {
                        // get list of clickable objects from widget
                        var widget = that.activeWidgets[0];
                        //add empty option
                        $(this).append('<option value=""></option>');
                        //get all other options
                        vis.binds["3dmodel"].getLights(widget).then(lightList => {
                            for (const [name, object] of Object.entries(lightList)) {
                                $(this).append('<option value="' + name + '" ' + ((data == name)? 'selected' : '') + '>' + name + '</option>');
                            }
                        });
                    }

                    $(this).next().css('width', '100%');
                }
            }
            return line;
        } catch (ex) {
            console.error(`3dmodel lightsSelector: error: ${ex.message}, stack: ${ex.stack}`);
        }
    },
    sceneSelector: function (widAttr, data) {
        try {
            console.log("loading scenes");
            var that = vis;
            var line = {
                input: '<select id="inspect_' + widAttr + '" class="select-groups"></select>',
                init: function (_wid_attr, data) {
                    //console.log("DATA:"+JSON.stringify(data));
                    $(this).html('');

                    //only fill select box if one widget is selected at a time
                    if (that.activeWidgets.length == 1) {
                        // get list of clickable objects from widget
                        var widget = that.activeWidgets[0];
                        //add empty option
                        $(this).append('<option value=""></option>');
                        //get all other options
                        vis.binds["3dmodel"].getScenes(widget).then(sceneData => {
                            var sceneList = sceneData[0];
                            var currentScene = sceneData[1];
                            
                            sceneList.forEach(name => {
                                $(this).append('<option value="' + name + '" ' + ((currentScene == name)? 'selected' : '') + '>' + name + '</option>');
                            });
                        });
                    }

                    $(this).next().css('width', '100%');
                }
            }
            return line;
        } catch (ex) {
            console.error(`3dmodel sceneSelector: error: ${ex.message}, stack: ${ex.stack}`);
        }
    }
};