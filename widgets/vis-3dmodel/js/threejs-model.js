"use strict";

// Define some globals for eslint that are set by other JavaScript entries in 3dmodel.html
/* global THREE, log */

let mouse;
// var testToggle = true;

// eslint-disable-next-line no-unused-vars
class ThreeJSModel {
    constructor (container, showLoader, logger) {
        this.container = container;
        this.clickableObjects = [];
        this.allObjects = [];
        this.animations = [];
        this.lights = [];
        this.scenes = [];
        this.isLoaded = false;
        this.debugShowCoordinates = false;
        this.showLoader = showLoader;
        this.logger = logger;
    }

    setupLoader () {

    }

    setupScene (bgColor, highlightSelected, highlightColor, enableRealisticLighting) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(bgColor);

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ "antialias": true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize($(this.container).width(), $(this.container).height());
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.physicallyCorrectLights = enableRealisticLighting;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;

        this.container.appendChild(this.renderer.domElement);

        // this.container.addEventListener('mousemove', (event) => {console.log(event);console.log(this)}, false);
        // this.container.addEventListener('mousemove', (that) => this._onMouseMove());
        this.container.addEventListener("mousemove", this._onMouseMove.bind(this), false);
        this.container.addEventListener("click", this._onMouseClick.bind(this), false);

        // Setup Raycaster to track mouse-movements on model
        this.raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        this.currentlyIntersectedMeshMesh = null;

        this.highlightSelected = highlightSelected;
        this.highlightColor = new THREE.Color(highlightColor);
    }

    setupView (cameraPosX, cameraPosY, cameraPosZ, cameraTargetPosX, cameraTargetPosY, cameraTargetPosZ) {
        this.camera = new THREE.PerspectiveCamera(100, $(this.container).innerWidth() / $(this.container).innerHeight(), 1, 100);
        this.camera.position.set(parseFloat(cameraPosX), parseFloat(cameraPosY), parseFloat(cameraPosZ));

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(parseFloat(cameraTargetPosX), parseFloat(cameraTargetPosY), parseFloat(cameraTargetPosZ));
        this.controls.update();
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
    }

    setupLights (shadowsEnabled, ambientColor, ambientIntensity, punctualLightsMaxPower) {
        // this.scene.add(new THREE.HemisphereLight(0xffffff, this.scene.background, 1));
        this.scene.add(new THREE.AmbientLight(new THREE.Color(ambientColor), ambientIntensity));

        this.shadowsEnabled = shadowsEnabled;
        this.punctualLightsMaxPower = punctualLightsMaxPower;
        // var dirLight = new THREE.DirectionalLight(0xffffff, 1);
        // dirLight.position.set(light_pos_x, light_pos_y, light_pos_z);
        // this.scene.add(dirLight);
    }

    showDebugCoordinates (activate) {
        this.debugShowCoordinates = activate;
    }

    load (gltfFile, sceneName, modelPosX, modelPosY, modelPosZ, scale, loadingScreenId) {
        // Setup loading screen animation
        const loadingManager = new THREE.LoadingManager(() => {
            const loadingScreen = document.getElementById(loadingScreenId);
            loadingScreen.classList.add("fade-out");

            // optional: remove loader from DOM via event listener
            loadingScreen.addEventListener("transitionend", (event) => {
                event.target.remove();
            });
        });

        // Setup model loader
        const loader = (this.showLoader) ? new THREE.GLTFLoader(loadingManager) : new THREE.GLTFLoader();
        loader.load(gltfFile, (gltf) => {
            let model;
            if ((!sceneName) || (sceneName === ""))
                model = gltf.scenes[0];
            else {
                gltf.scenes.forEach(function (scene) {
                    if (scene.name === sceneName) model = scene;
                });
            }

            // create list of all scenes
            gltf.scenes.forEach(scene => {
                this.scenes.push(scene.name);
            });

            model.position.set(modelPosX, modelPosY, modelPosZ);
            model.scale.set(scale, scale, scale);

            this.logger.debug("Current scene: " + model.name);

            model.traverse((node) => {
                if ((node.isMesh || node.isLight) && this.shadowsEnabled) { node.castShadow = true; node.receiveShadow = true; }
            });

            this.scene.add(model);
            this.currentScene = model.name;

            // load objects
            // this.listObjects(this.scene.children[2], this.allObjects, this.lights);
            this.listObjects(this.scene, this.allObjects, this.lights);

            // this.mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                this.logger.debug("Animation:" + clip.name);

                // One mixer per clip is needed, as they should be controlled & played independently
                const mixer = new THREE.AnimationMixer(model);
                this.logger.debug("clip loaded:" + clip.name);
                this.animations[clip.name] = {
                    "clip": clip,
                    "mixer": mixer,
                    "currentPosition": 0,
                    "targetPosition": 0,
                    "repeat": false,
                    "clock": new THREE.Clock()
                };
                // activate animation, but don't play
                mixer.clipAction(clip).timeScale = 0;
                mixer.clipAction(clip).play();
            });

            this.isLoaded = true;
            this.logger.debug("Scenes available: " + this.scenes);
            this.animate();
        }, undefined, function (error) {
            console.error(error);
        });
    }

    addGlobalClippingPlane () {
        const globalPlane = new THREE.Plane(new THREE.Vector3(0, 2, 0), 0.1);
        this.renderer.clippingPlanes = [globalPlane];
    }

    setupClickableObjects (clickableObjects, callback) {
        this.clickableObjects = clickableObjects;
        this.clickableObjectPerformAction = callback;
    }

    getClickableObjects () {
        return this.clickableObjects;
    }

    getAllObjects () {
        return this.allObjects;
    }

    getAnimations () {
        return this.animations;
    }

    getLights () {
        return this.lights;
    }

    getScenes () {
        return this.scenes;
    }

    getCurrentScene () {
        return this.currentScene;
    }

    isClickableObject (object) {
        // Get parent if it exists
        const checkObject = (this.allObjects[object.name] != null) ? this.allObjects[object.name] : object;

        return (this.clickableObjects[checkObject.name] != null);
    }

    listObjects (object, listOfObjects, listOfLights, level = 0) {
        const self = this;

        if ((level > 0) &&
            (object.name.length > 0) &&
            (!object.isCamera)) {
            if ((object.isMesh) || (object.isGroup)) {
                // Clone material of object (if it has one) - so make it unique. Objects can share materials by default, but this would cause weirdness when setting emissiveness for highlighting
                if (object.material != null) object.material = object.material.clone();

                if (object.name.match(/_\d$/))
                    listOfObjects[object.name] = object.parent;
                else
                    listOfObjects[object.name] = null;
            }
            // check if object is light
            if ((object.type === "PointLight") || (object.type === "DirectionalLight") || (object.type === "SpotLight")) {
                this.logger.trace("Found light: " + object.name);
                listOfLights[object.name] = { "object": object, "max_power": this.punctualLightsMaxPower, "smooth_transition": true };
            }
        }

        object.children.forEach(function (el1) {
            self.listObjects(el1, listOfObjects, listOfLights, level + 1);
        });
    }

    checkIfLoaded () {
        return new Promise(resolve => {
            const intr = setInterval(function () {
                if (this.isLoaded === true) {
                    clearInterval(intr);
                    resolve("is loaded");
                } else
                    this.logger.trace("model not yet loaded: " + this.isLoaded);
            }.bind(this), 10);
        });
    }

    updateAnimationByState (name, value, maxValue) {
        // console.log("running animation " + name);
        if (!this.animations[name]) return;

        // Get current frame from animation (by percentage)
        const mixer = this.animations[name].mixer;
        const clip = this.animations[name].clip;
        const clipAction = mixer.clipAction(clip);

        // clipAction.setLoop(THREE.LoopOnce);
        // clipAction.clampWhenFinished;

        const currentClipTime = clipAction.time;
        const clipDuration = clip.duration;

        // const currentPositionPercent = currentClipTime / clipDuration * 100;

        // Check if value (ioBroker state) is of type number or boolean to decide wether to play animation by percentage or toggle
        let targetPositionPercent;
        if (typeof value === "boolean")
            targetPositionPercent = (value) ? 100 : 0;
        else if (typeof value === "number")
            targetPositionPercent = value / maxValue * 100;
        else
            return;

        this.animations[name].targetPosition = clipDuration / 100 * targetPositionPercent;
        // Behave differently depending on value type

        // Check whether to reverse or forward the animation
        clipAction.timeScale = (this.animations[name].targetPosition < currentClipTime) ? -1 : 1;
    }

    async autoplayAnimation (name) {
        await this.checkIfLoaded();

        if (!this.animations[name]) return;
        this.logger.debug("Auto playing animation " + name);

        // Get current frame from animation (by percentage)
        const mixer = this.animations[name].mixer;
        const clip = this.animations[name].clip;
        const clipAction = mixer.clipAction(clip);

        // Workaround (set targetPosition higher than clip length, so it can never be reached)
        this.animations[name].targetPosition = clip.duration;

        clipAction.timeScale = 1;
    }

    async repeatAnimation (name) {
        await this.checkIfLoaded();
        if (!this.animations[name]) return;
        this.logger.debug("Repeating animation " + name);

        // Get current frame from animation (by percentage)
        const mixer = this.animations[name].mixer;
        const clip = this.animations[name].clip;
        // const clipAction = mixer.clipAction(clip);

        this.animations[name].repeat = true;
        // clipAction.setLoop(THREE.LoopRepeat);
        // Workaround (set targetPosition higher than clip length, so it can never be reached)
        // this.animations[name].targetPosition = clip.duration + 1000;
    }

    updateLightByState (name, value) {
        const light = this.lights[name];
        const lightObject = light.object;
        if (!lightObject) return;

        // var oldIntensity = lightObject.intensity;
        // var targetIntensity = (value) ? 2 : 0;
        const oldPower = lightObject.power;
        const targetPower = value / 1000 * light.max_power;
        if (light.smooth_transition) {
            if (targetPower > oldPower) {
                const intr = setInterval(function () {
                    // console.log("++LIGHT power: " + lightObject.power);
                    if ((lightObject.power += 10) >= targetPower) clearInterval(intr);
                }, 10);
            } else {
                const intr = setInterval(function () {
                    // console.log("--LIGHT power: " + lightObject.power);
                    if ((lightObject.power -= 10) <= targetPower) clearInterval(intr);
                }, 10);
            }
        } else
            lightObject.power = targetPower;
    }

    resizeView (width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    animate () {
        for (const [key, value] of Object.entries(this.animations)) {
            const mixer = value.mixer;
            const clip = value.clip;
            const clipAction = value.mixer.clipAction(clip);

            value.currentPosition = clipAction.time;

            const deltaTime = value.clock.getDelta();

            // Play animations smoothly
            if (value.repeat) {
                if (value.targetPosition > 0) {
                    clipAction.enabled = true;
                    clipAction.setLoop(THREE.LoopRepeat);
                } else
                    clipAction.setLoop(THREE.LoopOnce);
                mixer.update(deltaTime);
            } else {
                // go only to target position
                if (((clipAction.timeScale === 1) && (Math.ceil(value.currentPosition * 10) / 10 < Math.ceil(value.targetPosition * 10) / 10)) ||
                    ((clipAction.timeScale === -1) && (Math.floor(value.currentPosition * 10) / 10 > Math.floor(value.targetPosition * 10) / 10)))
                    mixer.update(deltaTime);
            }
        }
        // this.mixer.update(this.clock.getDelta());
        requestAnimationFrame(this.animate.bind(this));

        // update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(mouse, this.camera);

        // calculate objects intersecting the picking ray

        // Allow full traversal, but get parent object for highlighting/whitelisting
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        // console.log("intersects: " + intersects);
        if (intersects.length > 0) {
            if (this.currentlyIntersectedMesh !== intersects[0].object) {
                // if (this.currentlyIntersectedMesh) this.currentlyIntersectedMesh.material.emissive.setHex(this.currentlyIntersectedMesh.currentHex);
                if (this.currentlyIntersectedMesh) this.resetEmissiveness(this.currentlyIntersectedMesh);

                this.currentlyIntersectedMesh = intersects[0].object;
                // console.log("Currently intersecting with object " + this.currentlyIntersectedMesh.name + "parent: " + this.currentlyIntersectedMesh.parent.name);

                if (this.highlightSelected && this.isClickableObject(this.currentlyIntersectedMesh))
                    this.setEmissiveness(this.currentlyIntersectedMesh);
            }
        } else {
            if (this.currentlyIntersectedMesh) this.resetEmissiveness(this.currentlyIntersectedMesh);
            this.currentlyIntersectedMesh = null;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setEmissiveness (object) {
        const parentObject = this.allObjects[object.name];
        if (parentObject != null) {
            // console.log("[set Em] " + object.name + " has parent " + parentObject.name);
            parentObject.children.forEach(childObject => {
                // console.log("highlightcolor: "+this.highlightColor);
                childObject.material.emissive.setHex(this.highlightColor.getHex());
                // this.hightlightEdges(childObject);
            });
        } else
            object.material.emissive.setHex(this.highlightColor.getHex());
        // this.hightlightEdges(object);
    }

    hightlightEdges (mesh) {
        const geometry = new THREE.EdgesGeometry(mesh.geometry); // or WireframeGeometry
        const material = new THREE.LineBasicMaterial({ "color": this.highlightColor, "linewidth": 2 });
        const edges = new THREE.LineSegments(geometry, material);
        edges.name = "highlightEdges";
        mesh.add(edges); // add wireframe as a child of the parent  */
    }

    resetEmissiveness (object) {
        const parentObject = this.allObjects[object.name];
        if (parentObject != null) {
            // console.log("[unset Em] " + object.name + " has parent " + parentObject.name);
            // console.log(this.currentlyIntersectedMesh.name + " has parent " + parentObject.name);
            parentObject.children.forEach(childObject => {
                if (!childObject.isLine) childObject.material.emissive.setHex(childObject.currentHex);
                // this.unhighlightEdges(childObject);
            });
        } else if (!object.isLine) object.material.emissive.setHex(object.currentHex);
        // this.unhighlightEdges(object);
    }

    unhighlightEdges (mesh) {
        // Don't know if this is the right way to remove edges, lets leave it for now
        mesh.children.forEach(function (childObject) {
            if ((childObject.isLine) & (childObject.name === "highlightEdges")) mesh.remove(childObject);
        });
    }

    _onMouseMove (event) {
        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        // use "offset" to take container-position into account
        const offset = $(this.container).offset();
        mouse.x = ((event.clientX - offset.left) / ($(this.container).innerWidth())) * 2 - 1;
        mouse.y = -((event.clientY - offset.top) / ($(this.container).innerHeight())) * 2 + 1;
        // console.log(mouse.x +"|"+mouse.y);
    }

    _onMouseClick (event) {
        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        // use "offset" to take container-position into account
        // Need to get mouse-position again, since on touch-displays _onMouseMove won't be called
        const offset = $(this.container).offset();
        mouse.x = ((event.clientX - offset.left) / ($(this.container).innerWidth())) * 2 - 1;
        mouse.y = -((event.clientY - offset.top) / ($(this.container).innerHeight())) * 2 + 1;
        if (this.currentlyIntersectedMesh) {
            // Get parent object, if it exists
            const object = (this.allObjects[this.currentlyIntersectedMesh.name] != null) ? this.allObjects[this.currentlyIntersectedMesh.name] : this.currentlyIntersectedMesh;

            this.logger.debug("Clicked on object: " + object.name);
            // check if it is on clickableObjects list
            if (this.clickableObjects[object.name] != null) {
                const objectAction = this.clickableObjects[object.name];
                // Perform action
                this.clickableObjectPerformAction(objectAction.target_id, objectAction.action);
                // Testing (use toogle mechanic)
                /* var target;
                if (testToggle) {
                    target = 50;
                    testToggle = false
                } else {
                    target = 0;
                    testToggle = true;
                }
                this.updateAnimationByState("Animation_Rolladen_Buero_Vorne", target, "something", 100); */
            }
        }
    }
};
