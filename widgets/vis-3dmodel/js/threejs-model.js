"use strict";

var mouse;
var testToggle = true;

class ThreeJSModel {
    constructor(container) {
        this.container = container;
        this.clickableObjects = [];
        this.allObjects = [];
        this.animations = [];
        this.lights = [];
        this.scenes = [];
        this.isLoaded = false;
    }

    setupScene(bgColor, highlightSelected, highlightColor, enable_realistic_lighting) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(bgColor)

        //Setup renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize($(this.container).width(), $(this.container).height());
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.physicallyCorrectLights = enable_realistic_lighting;
        this.renderer.shadowMap.enabled = true; //??
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;

        this.container.appendChild(this.renderer.domElement);

        //this.container.addEventListener('mousemove', (event) => {console.log(event);console.log(this)}, false);
        var that = this;
        // this.container.addEventListener('mousemove', (that) => this._onMouseMove());
        this.container.addEventListener('mousemove', this._onMouseMove.bind(this), false);
        this.container.addEventListener('click', this._onMouseClick.bind(this), false);

        //Setup Raycaster to track mouse-movements on model
        this.raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        this.currentlyIntersectedMeshMesh = null;

        this.highlightSelected = highlightSelected;
        this.highlightColor = new THREE.Color(highlightColor);
    }

    setupView(camera_pos_x, camera_pos_y, camera_pos_z, camera_target_pos_x, camera_target_pos_y, camera_target_pos_z) {
        this.camera = new THREE.PerspectiveCamera(100, $(this.container).innerWidth() / $(this.container).innerHeight(), 1, 100);
        this.camera.position.set(parseFloat(camera_pos_x), parseFloat(camera_pos_y), parseFloat(camera_pos_z))

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(parseFloat(camera_target_pos_x), parseFloat(camera_target_pos_y), parseFloat(camera_target_pos_z));
        this.controls.update();
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
    }

    setupLights(shadowsEnabled, ambientColor, ambientIntensity = 1) {
        //this.scene.add(new THREE.HemisphereLight(0xffffff, this.scene.background, 1));
        this.scene.add(new THREE.AmbientLight (new THREE.Color(ambientColor), ambientIntensity))

        this.shadowsEnabled = shadowsEnabled;
        //var dirLight = new THREE.DirectionalLight(0xffffff, 1);
        //dirLight.position.set(light_pos_x, light_pos_y, light_pos_z);
        //this.scene.add(dirLight);
    }

    load(gltfFile, scene_name, model_pos_x, model_pos_y, model_pos_z, scale) {
        var loader = new THREE.GLTFLoader();
        loader.load(gltfFile, (gltf) => {
            var model;
            if ((!scene_name) || (scene_name == ""))
                model = gltf.scenes[0];
            else {
                gltf.scenes.forEach(function(scene) {
                    if (scene.name == scene_name) model = scene;
                });
            }

            //create list of all scenes
            gltf.scenes.forEach(scene => {
                this.scenes.push(scene.name);
            });

            model.position.set(model_pos_x, model_pos_y, model_pos_z);
            model.scale.set(scale, scale, scale);


            model.traverse((node) => {
                if ((node.isMesh || node.isLight) && this.shadowsEnabled) { node.castShadow = true; node.receiveShadow = true; }
            });

            this.scene.add(model);

            //load objects
            //this.listObjects(this.scene.children[2], this.allObjects, this.lights);
            this.listObjects(this.scene, this.allObjects, this.lights);

            //this.mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                console.log("Animation:" + clip.name);
                
                //One mixer per clip is needed, as they should be controlled & played independently
                var mixer = new THREE.AnimationMixer(model);
                this.animations[clip.name] = { "clip": clip, "mixer": mixer, "currentPosition": 0, "targetPosition": 0, "clock": new THREE.Clock() };
                //activate animation, but don't play
                mixer.clipAction(clip).timeScale = 0;
                mixer.clipAction(clip).play();
            });

            this.isLoaded = true;

            this.animate();
        }, undefined, function (error) {
            console.error(error);
        });
    }

    addGlobalClippingPlane() {
        var globalPlane = new THREE.Plane(new THREE.Vector3(0, 2, 0), 0.1);
        this.renderer.clippingPlanes = [globalPlane];
    }

    setupClickableObjects(clickableObjects, callback) {
        this.clickableObjects = clickableObjects;
        this.clickableObjectPerformAction = callback;
    }

    getClickableObjects() {
        return this.clickableObjects;
    }

    getAllObjects() {
        return this.allObjects;
    }

    getAnimations() {
        return this.animations;
    }

    getLights() {
        return this.lights;
    }

    getScenes() {
        return this.scenes;
    }

    isClickableObject(object) {
        //Get parent if it exists
        var checkObject = (this.allObjects[object.name] != null) ? this.allObjects[object.name] : object;

        return (this.clickableObjects[checkObject.name] != null) ? true : false;
    }

    listObjects(object, listOfObjects, listOfLights, level = 0) {
        var self = this;
        
        if ((level > 0) &&
            (object.name.length > 0) &&
            (!object.isCamera)) {

            if ((object.isMesh)||(object.isGroup)) {
                //Clone material of object (if it has one) - so make it unique. Objects can share materials by default, but this would cause weirdness when setting emissiveness for highlighting
                if (object.material != null) object.material = object.material.clone();

                if (object.name.match(/_\d$/)) {
                    listOfObjects[object.name] = object.parent;
                } else {
                    listOfObjects[object.name] = null;
                }
            }
            //check if light
            if (object.isLight)
                listOfLights[object.name] = object;

            console.log("[" + level + "] Object: " + object.name + " Parent: " + (((listOfObjects[object.name] != null) && (listOfObjects[object.name].parent != null)) ? listOfObjects[object.name].parent.name : "") + " Type:" + object.type);
        }

        object.children.forEach(function (el1) {
            self.listObjects(el1, listOfObjects, listOfLights, level + 1);
        });
    }

    checkIfLoaded() {
        return new Promise(resolve => {
            setTimeout(function () {
                if (this.isLoaded == true) {
                    resolve("is loaded");
                }
            }.bind(this), 10);
        });
    }
    
    updateAnimationByState(name, value, valueType, maxValue) {
        console.log("running animation " + name);
        if (!this.animations[name]) return;

        //Get current frame from animation (by percentage)
        var mixer = this.animations[name].mixer;
        var clip = this.animations[name].clip;
        var clipAction = mixer.clipAction(clip);

        //clipAction.setLoop(THREE.LoopOnce);
        //clipAction.clampWhenFinished;

        var currentClipTime = clipAction.time;
        var clipDuration = clip.duration;

        var currentPositionPercent = currentClipTime / clipDuration * 100;
        var targetPositionPercent = value / maxValue * 100;

        this.animations[name].targetPosition = clipDuration / 100 * targetPositionPercent;
        //Behave differently depending on value type       

        //Check whether to reverse or forward the animation
        clipAction.timeScale = (this.animations[name].targetPosition < currentClipTime) ? -1 : 1;
        console.log("currentClipTime:" + currentClipTime + " timescale:" + clipAction.timeScale);
    }

    updateLightByState(name, value, smoothTransition) {
        var lightObject = this.lights[name];
        if (!lightObject) return;

        var oldIntensity = lightObject.intensity;
        var targetIntensity = (value) ? 2 : 0;
        console.log("light state change");
        if (true) {
            console.log("doing smooth transition"); //Does not work as intended
            if (targetIntensity > oldIntensity) {
                while (lightObject.intensity < targetIntensity) {
                    //setTimeout(function() {
                    lightObject.intensity += 0.1;
                    //}, 50);
                }
            } else {
                while (lightObject.intensity > targetIntensity) {
                    //setTimeout(function () {
                    lightObject.intensity -= 0.1;
                    //}, 50);
                    console.log("intensity: " + lightObject.intensity);
                }
            }
        }
    }

    resizeView(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    animate() {
        for (const [key, value] of Object.entries(this.animations)) {
            var mixer = value.mixer;
            var clip = value.clip;
            var clipAction = value.mixer.clipAction(clip);

            value.currentPosition = clipAction.time;

            var deltaTime = value.clock.getDelta();

            //Play animations smoothly
            if (((clipAction.timeScale == 1) && (Math.ceil(value.currentPosition * 10) / 10 < Math.ceil(value.targetPosition * 10) / 10)) ||
                ((clipAction.timeScale == -1) && (Math.floor(value.currentPosition * 10) / 10 > Math.floor(value.targetPosition * 10) / 10)))
                mixer.update(deltaTime);
        }
        //this.mixer.update(this.clock.getDelta());
        requestAnimationFrame(this.animate.bind(this));

        // update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(mouse, this.camera);

        // calculate objects intersecting the picking ray

        //Allow full traversal, but get parent object for highlighting/whitelisting
        var intersects = this.raycaster.intersectObjects(this.scene.children, true);
        //console.log("intersects: " + intersects);
        if (intersects.length > 0) {

            if (this.currentlyIntersectedMesh != intersects[0].object) {

                //if (this.currentlyIntersectedMesh) this.currentlyIntersectedMesh.material.emissive.setHex(this.currentlyIntersectedMesh.currentHex);
                if (this.currentlyIntersectedMesh) this.resetEmissiveness(this.currentlyIntersectedMesh);

                this.currentlyIntersectedMesh = intersects[0].object;
                //console.log("Currently intersecting with object " + this.currentlyIntersectedMesh.name + "parent: " + this.currentlyIntersectedMesh.parent.name);

                if (this.highlightSelected && this.isClickableObject(this.currentlyIntersectedMesh)) {
                    this.setEmissiveness(this.currentlyIntersectedMesh);
                }
            }

        } else {
            if (this.currentlyIntersectedMesh) this.resetEmissiveness(this.currentlyIntersectedMesh);
            this.currentlyIntersectedMesh = null;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setEmissiveness(object) {
        var parentObject = this.allObjects[object.name];
        if (parentObject != null) {
            //console.log("[set Em] " + object.name + " has parent " + parentObject.name);
            parentObject.children.forEach(childObject => {
                //console.log("highlightcolor: "+this.highlightColor);
                childObject.material.emissive.setHex(this.highlightColor.getHex());
                //this.hightlightEdges(childObject);
            });
        } else {
            object.material.emissive.setHex(this.highlightColor.getHex());
            //this.hightlightEdges(object);
        }
    }

    hightlightEdges(mesh) {
        var geometry = new THREE.EdgesGeometry( mesh.geometry ); // or WireframeGeometry
        var material = new THREE.LineBasicMaterial( { color: this.highlightColor, linewidth: 2 } );
        var edges = new THREE.LineSegments( geometry, material );
        edges.name = "highlightEdges";
        mesh.add( edges ); // add wireframe as a child of the parent  */
    }

    resetEmissiveness(object) {
        var parentObject = this.allObjects[object.name];
        if (parentObject != null) {
            //console.log("[unset Em] " + object.name + " has parent " + parentObject.name);
            //console.log(this.currentlyIntersectedMesh.name + " has parent " + parentObject.name);
            parentObject.children.forEach(childObject => {
                if (!childObject.isLine) childObject.material.emissive.setHex(childObject.currentHex);
                //this.unhighlightEdges(childObject);
            });
        } else {
            if (!object.isLine) object.material.emissive.setHex(object.currentHex);
            //this.unhighlightEdges(object);
        }

    }

    unhighlightEdges(mesh) {
        //Don't know if this is the right way to remove edges, lets leave it for now
        mesh.children.forEach(function(childObject) {
            if ((childObject.isLine)&(childObject.name == "highlightEdges")) mesh.remove(childObject);
        });
    }

    _onMouseMove(event) {
        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        // use "offset" to take container-position into account
        var offset = $(this.container).offset();
        mouse.x = ((event.clientX - offset.left) / ($(this.container).innerWidth())) * 2 - 1;
        mouse.y = - ((event.clientY - offset.top) / ($(this.container).innerHeight())) * 2 + 1;
        //console.log(mouse.x +"|"+mouse.y);
    }

    _onMouseClick(event) {
        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        // use "offset" to take container-position into account
        // Need to get mouse-position again, since on touch-displays _onMouseMove won't be called
        var offset = $(this.container).offset();
        mouse.x = ((event.clientX - offset.left) / ($(this.container).innerWidth())) * 2 - 1;
        mouse.y = - ((event.clientY - offset.top) / ($(this.container).innerHeight())) * 2 + 1;
        if (this.currentlyIntersectedMesh) {
            //Get parent object, if it exists
            var object = (this.allObjects[this.currentlyIntersectedMesh.name] != null) ? this.allObjects[this.currentlyIntersectedMesh.name] : this.currentlyIntersectedMesh;

            console.log("Clicked on object: " + object.name);
            //check if it is on clickableObjects list
            if (this.clickableObjects[object.name] != null) {
                var objectAction = this.clickableObjects[object.name];
                //Perform action
                this.clickableObjectPerformAction(objectAction.target_id, objectAction.action);
                //Testing (use toogle mechanic)
                /*var target;
                if (testToggle) {
                    target = 50;
                    testToggle = false
                } else {
                    target = 0;
                    testToggle = true;
                }
                this.updateAnimationByState("Animation_Rolladen_Buero_Vorne", target, "something", 100);*/
            }
        }
    }
}