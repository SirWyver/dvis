/**
 * @author mrdoob / http://mrdoob.com/
 */

import * as THREE from '../../build/three.module.js';

import { Config } from './Config.js';
import { Loader } from './Loader.js';
import { History as _History } from './History.js';
import { Strings } from './Strings.js';
import { Storage as _Storage } from './Storage.js';

import { SetValueCommand } from './commands/SetValueCommand.js';

var Editor = function () {

	this.DEFAULT_CAMERA = new THREE.PerspectiveCamera(50, 1, 0.01, 10000);
	this.DEFAULT_CAMERA.name = 'Camera';
	this.DEFAULT_CAMERA.position.set(0, 5, 10);
	this.DEFAULT_CAMERA.lookAt(new THREE.Vector3());

	var Signal = signals.Signal;
	THREE.Object3D.DefaultUp.set(0, 0, -1);
	this.signals = {

		// script

		editScript: new Signal(),

		// player

		startPlayer: new Signal(),
		stopPlayer: new Signal(),

		// notifications

		editorCleared: new Signal(),

		savingStarted: new Signal(),
		savingFinished: new Signal(),

		transformModeChanged: new Signal(),
		snapChanged: new Signal(),
		spaceChanged: new Signal(),
		rendererChanged: new Signal(),
		rendererUpdated: new Signal(),

		sceneBackgroundChanged: new Signal(),
		sceneFogChanged: new Signal(),
		sceneGraphChanged: new Signal(),
		sceneRendered: new Signal(),

		cameraChanged: new Signal(),

		geometryChanged: new Signal(),

		objectSelected: new Signal(),
		objectFocused: new Signal(),

		objectAdded: new Signal(),
		proxyAdded: new Signal(),
		objectChanged: new Signal(),
		objectRemoved: new Signal(),

		cameraAdded: new Signal(),
		cameraRemoved: new Signal(),

		helperAdded: new Signal(),
		helperRemoved: new Signal(),

		materialAdded: new Signal(),
		materialChanged: new Signal(),
		materialRemoved: new Signal(),

		scriptAdded: new Signal(),
		scriptChanged: new Signal(),
		scriptRemoved: new Signal(),

		windowResize: new Signal(),

		toggleGridAxes: new Signal(),
		setGridAxes: new Signal(),
		refreshSidebarObject3D: new Signal(),
		historyChanged: new Signal(),

		viewportCameraChanged: new Signal(),
		// custom
		// layers
		onLayersChanged: new Signal(),
		layersChanged: new Signal(),

		// screenshot
		createScreenshot: new Signal(),
		createLocalScreenshot: new Signal(),
		createScreenshotReel: new Signal(),
		// timeline
		cframeChanged: new Signal(),
		keyframesChanged: new Signal(),
		pframeChanged: new Signal(),
		// scene meta
		onTitleChanged: new Signal(),
		onStorageRootChanged: new Signal(),
		onStoragePathChanged: new Signal(),
		onTrackStorePathChanged: new Signal(),
		onSuffixChanged: new Signal(),

		onScreenWidthChanged: new Signal(),
		onScreenHeightChanged: new Signal(),

		//animator
		onClearAnimator: new Signal(),
		updateSelectedObjectKF: new Signal(),
		deleteSelectedObjectTrack: new Signal(),
		deleteSelectedObjectKF: new Signal(),
		exportSelectedObjectTrack: new Signal(),
		exportTracks: new Signal(),
		insertTrack: new Signal(),
		insertTrackDict: new Signal(),
		updatePose: new Signal(),

		setObjectKFState: new Signal(),

		setCameraKeyframe: new Signal(),
		switchCamera: new Signal(),
		//icp
		requestICP: new Signal(),
		receiveICP: new Signal(),

		//hot reload
		requestPC: new Signal(),

		//timeline
		timelineScaled: new Signal(),
		windowResized: new Signal(),
	};

	this.config = new Config();
	this.history = new _History(this);
	this.storage = new _Storage();
	this.strings = new Strings(this.config);

	this.loader = new Loader(this);

	this.camera = this.DEFAULT_CAMERA.clone();

	this.scene = new THREE.Scene();

	this.pframe = 0;

	this.scene.current_cframes = [0];
	this.scene.key_frames = [0];
	this.scene.name = 'Scene';
	//this.scene.background = new THREE.TextureLoader().load('grad_light_blue2.png');
	//this.scene.background = new THREE.Color(0xF9F9F9);
	this.scene.background = new THREE.Color(0xFFFFFFF);
	this.active_layers = [0];

	this.sceneHelpers = new THREE.Scene();

	this.object = {};
	this.geometries = {};
	this.materials = {};
	this.textures = {};
	this.scripts = {};

	this.materialsRefCounter = new Map(); // tracks how often is a material used by a 3D object

	this.animations = {};
	this.mixer = new THREE.AnimationMixer(this.scene);

	this.selected = null;
	this.helpers = {};

	this.cameras = {};
	this.viewportCamera = this.camera;

	this.addCamera(this.camera);
	this.tracklight = new THREE.PointLight(0xffffff, 0.96, 0); // new THREE.DirectionalLight(0xffffff, 1.75);
	this.tracklight.name = 'TrackLight';
	this.tracklight.layers.enableAll();
	//his.addTrackLight(this.tracklight);
	this.scene.add(this.tracklight);

	//storage
	this.screenshot_width = 800;
	this.screenshot_height = 600;
	this.title = 'Scene';
	this.storage_root = 'tmp/';
	this.storage_path = '{title}_{cf}_{kf}_{suffix}';
	this.track_store_path = '{title}_{suffix}_{name}';
	this.suffix = '';

	this.icp_th = 0.1;
	this.pc_num_pts = 20000;
	this.duration = 500;

};

Editor.prototype = {
	updateConfig: function (config) {
		if (config.width != undefined) {
			this.screenshot_width = config.width;
			this.signals.onScreenWidthChanged.dispatch();
		}

		if (config.height != undefined) {
			this.screenshot_height = config.height;
			this.signals.onScreenHeightChanged.dispatch();
		}
		if (config.title != undefined) {
			this.title = config.title;
			this.signals.onTitleChanged.dispatch();
		}
		if (config.store_root != undefined) {
			this.storage_root = config.store_root;
			this.signals.onStorageRootChanged.dispatch();
		}
		if (config.store_path != undefined) {
			this.storage_path = config.store_path;
			this.signals.onStoragePathChanged.dispatch();
		}
		if (config.track_store_path != undefined) {
			this.track_store_path = config.track_store_path;
			this.signals.onTrackStorePathChanged.dispatch();
		}
		if (config.suffix != undefined) {
			this.suffix = config.suffix;
			this.signals.onSuffixChanged.dispatch();
		}

	},

	setScene: function (scene) {

		this.scene.uuid = scene.uuid;
		this.scene.name = scene.name;

		this.scene.background = (scene.background !== null) ? scene.background.clone() : null;

		if (scene.fog !== null) this.scene.fog = scene.fog.clone();

		this.scene.userData = JSON.parse(JSON.stringify(scene.userData));

		// avoid render per object

		this.signals.sceneGraphChanged.active = false;

		while (scene.children.length > 0) {

			this.addObject(scene.children[0]);

		}

		this.signals.sceneGraphChanged.active = true;
		this.signals.sceneGraphChanged.dispatch();

	},

	keyframeChanged: function () {
		this.signals.keyframeChanged.dispatch();
	},

	addKeyframes: function (key_frames) {

		for (var k = 0; k < key_frames.length; k++) {
			var kf = parseInt(key_frames[k]);
			if (this.scene.key_frames.indexOf(kf) === -1) this.scene.key_frames.push(kf);
		}
		this.scene.key_frames.sort((a, b) => a - b);
		this.signals.keyframesChanged.dispatch();
	},
	getCurrentKeyFrames: function () {
		var current_keyframes = [];
		for (var j = 0; j < scene.current_cframes.length; j++) {
			current_keyframes.push(scene.key_frames[scene.current_cframes[j]]);
		}
		return current_keyframes;
	},
	getMaxCurrentKeyFrame: function () {
		var current_kfs = this.getCurrentKeyFrames();
		return Math.max(...current_kfs);
	},

	//

	addObject: function (object, parent, layers) {
		if (layers == undefined) {
			layers = [0];
		}
		if (parent == undefined) {
			parent = this.scene;
		}
		var scope = this;

		object.traverse(function (child) {

			if (child.geometry !== undefined) scope.addGeometry(child.geometry);
			if (child.material !== undefined) scope.addMaterial(child.material);

			scope.addCamera(child);
			scope.addHelper(child);

		});
		// set enables layers
		for (var i = 0; i < layers.length; i++) {
			object.layers.enable(layers[i]);
		}
		object.traverse(function (child) {
			for (var i = 0; i < layers.length; i++) {
				child.layers.enable(layers[i]);
			}


		});


		if (object.name.includes('/')) {
			var grouping = object.name.split('/');
			var parent_name = grouping.slice(0)[0];
			var p = this.scene.getObjectByName(parent_name);
			object.name = grouping.slice(1,).join('/');
			console.log('parent_name' + parent_name);
			console.log('object.name' + object.name);
			if (p != undefined) {
				//parent exist
				return this.addObject(object, p);
			}
			else {
				//new parent
				var parent_group = new THREE.Group();
				parent_group.name = parent_name;
				parent.add(parent_group);
				return this.addObject(object, parent_group);
			}
		}
		else {
			parent.add(object);
		}




		this.signals.objectAdded.dispatch(object);
		if (object.proxy !== undefined) this.signals.proxyAdded.dispatch(object.proxy);

		this.signals.sceneGraphChanged.dispatch();


	},

	moveObject: function (object, parent, before) {

		if (parent === undefined) {

			parent = this.scene;

		}

		parent.add(object);

		// sort children array

		if (before !== undefined) {

			var index = parent.children.indexOf(before);
			parent.children.splice(index, 0, object);
			parent.children.pop();

		}

		this.signals.sceneGraphChanged.dispatch();

	},

	nameObject: function (object, name) {

		object.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	removeObject: function (object) {

		if (object.parent === null) return; // avoid deleting the camera or scene

		var scope = this;

		object.traverse(function (child) {

			scope.removeCamera(child);
			scope.removeHelper(child);

			if (child.material !== undefined) scope.removeMaterial(child.material);

		});

		object.parent.remove(object);

		this.signals.objectRemoved.dispatch(object);
		this.signals.sceneGraphChanged.dispatch();

	},

	addGeometry: function (geometry) {

		this.geometries[geometry.uuid] = geometry;

	},

	setGeometryName: function (geometry, name) {

		geometry.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addMaterial: function (material) {

		if (Array.isArray(material)) {

			for (var i = 0, l = material.length; i < l; i++) {

				this.addMaterialToRefCounter(material[i]);

			}

		} else {

			this.addMaterialToRefCounter(material);

		}

		this.signals.materialAdded.dispatch();

	},

	addMaterialToRefCounter: function (material) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get(material);

		if (count === undefined) {

			materialsRefCounter.set(material, 1);
			this.materials[material.uuid] = material;

		} else {

			count++;
			materialsRefCounter.set(material, count);

		}

	},

	removeMaterial: function (material) {

		if (Array.isArray(material)) {

			for (var i = 0, l = material.length; i < l; i++) {

				this.removeMaterialFromRefCounter(material[i]);

			}

		} else {

			this.removeMaterialFromRefCounter(material);

		}

		this.signals.materialRemoved.dispatch();

	},

	removeMaterialFromRefCounter: function (material) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get(material);
		count--;

		if (count === 0) {

			materialsRefCounter.delete(material);
			delete this.materials[material.uuid];

		} else {

			materialsRefCounter.set(material, count);

		}

	},
	createScreenshotReel: function () {
		var latest_cframes = this.scene.current_cframes;
		for (var cf = 1; cf < this.scene.key_frames.length; cf++) {
			this.scene.current_cframes = [cf];

			this.signals.cframeChanged.dispatch();
			this.signals.createScreenshot.dispatch();
		}
		this.scene.current_cframes = latest_cframes;
	},

	getMaterialById: function (id) {

		var material;
		var materials = Object.values(this.materials);

		for (var i = 0; i < materials.length; i++) {

			if (materials[i].id === id) {

				material = materials[i];
				break;

			}

		}

		return material;

	},

	setMaterialName: function (material, name) {

		material.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addTexture: function (texture) {

		this.textures[texture.uuid] = texture;

	},

	addAnimation: function (object, animations) {

		if (animations.length > 0) {

			this.animations[object.uuid] = animations;

		}

	},

	//

	addCamera: function (camera) {

		if (camera.isCamera) {

			this.cameras[camera.uuid] = camera;

			this.signals.cameraAdded.dispatch(camera);

		}

	},
	//ICP functionality
	requestICP: function () {
		var object = editor.selected;
		if (object.obj_path !== undefined) {
			fetch('http://localhost:5001/request_icp', {
				method: 'POST', body: JSON.stringify({
					'scan_name': this.title,
					'frame_idx': this.pframe,
					'obj_path': object.obj_path,
					'obj_pose': object.matrix,
					'obj_name': object.name,
					'icp_th': editor.icp_th,
				})
			});
		}
		else {
			console.log('Non-cad object selected');
		}
	},
	receiveICP: function (icp_dict) {
		var obj = editor.scene.getObjectByName(icp_dict.obj_name);

		var bytes = Uint8Array.from(atob(icp_dict['icp_transform']), c => c.charCodeAt(0))
		var data_arr = new Float32Array(bytes.buffer);
		var icp_transform = (new THREE.Matrix4().fromArray(data_arr)).transpose()
		obj.applyMatrix4(icp_transform);
		editor.signals.objectChanged.dispatch(obj);

	},
	// reload
	requestPC: function () {
		fetch('http://localhost:5001/request_pc', {
			method: 'POST', body: JSON.stringify({
				'scan_name': this.title,
				'frame_idx': this.pframe,
				'num_pts': this.pc_num_pts,
			})
		});
	},

	changeLayers: function () {
		var layers = new THREE.Layers();
		for (var i = 0; i < this.active_layers.length; i++) {
			var active_layer = this.active_layers[i];

			layers.enable(active_layer);
		}
		if (!this.active_layers.includes(0)) {
			layers.disable(0);
		}
		for (var i = 0; i < Object.keys(this.cameras).length; i++) {

			this.execute(new SetValueCommand(editor, this.cameras[Object.keys(this.cameras)[i]], 'layers', layers));
		}

		this.signals.onLayersChanged.dispatch();
	},

	removeCamera: function (camera) {

		if (this.cameras[camera.uuid] !== undefined) {

			delete this.cameras[camera.uuid];

			this.signals.cameraRemoved.dispatch(camera);

		}

	},

	//

	addHelper: function () {

		var geometry = new THREE.SphereBufferGeometry(2, 4, 2);
		var material = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false });

		return function (object) {

			var helper;

			if (object.isCamera) {

				helper = new THREE.CameraHelper(object);

			} else if (object.isPointLight) {

				helper = new THREE.PointLightHelper(object, 1);

			} else if (object.isDirectionalLight) {

				helper = new THREE.DirectionalLightHelper(object, 1);

			} else if (object.isSpotLight) {

				helper = new THREE.SpotLightHelper(object, 1);

			} else if (object.isHemisphereLight) {

				helper = new THREE.HemisphereLightHelper(object, 1);

			} else if (object.isSkinnedMesh) {

				helper = new THREE.SkeletonHelper(object.skeleton.bones[0]);

			} else {

				// no helper for this object type
				return;

			}

			var picker = new THREE.Mesh(geometry, material);
			picker.name = 'picker';
			picker.userData.object = object;
			helper.add(picker);

			this.sceneHelpers.add(helper);
			this.helpers[object.id] = helper;

			this.signals.helperAdded.dispatch(helper);

		};

	},

	removeHelper: function (object) {

		if (this.helpers[object.id] !== undefined) {

			var helper = this.helpers[object.id];
			helper.parent.remove(helper);

			delete this.helpers[object.id];

			this.signals.helperRemoved.dispatch(helper);

		}

	},

	//

	addScript: function (object, script) {

		if (this.scripts[object.uuid] === undefined) {

			this.scripts[object.uuid] = [];

		}

		this.scripts[object.uuid].push(script);

		this.signals.scriptAdded.dispatch(script);

	},

	removeScript: function (object, script) {

		if (this.scripts[object.uuid] === undefined) return;

		var index = this.scripts[object.uuid].indexOf(script);

		if (index !== - 1) {

			this.scripts[object.uuid].splice(index, 1);

		}

		this.signals.scriptRemoved.dispatch(script);

	},

	getObjectMaterial: function (object, slot) {

		var material = object.material;

		if (Array.isArray(material) && slot !== undefined) {

			material = material[slot];

		}

		return material;

	},

	setObjectMaterial: function (object, slot, newMaterial) {

		if (Array.isArray(object.material) && slot !== undefined) {

			object.material[slot] = newMaterial;

		} else {

			object.material = newMaterial;

		}

	},

	setViewportCamera: function (uuid) {

		this.viewportCamera = this.cameras[uuid];
		this.signals.viewportCameraChanged.dispatch(this.viewportCamera);

	},
	switchCamera: function () {
		var current_cam_uuid = this.viewportCamera.uuid;
		for (var j = 0; j < Object.keys(this.cameras).length; j++) {
			var cam_uuid = this.cameras[Object.keys(this.cameras)[j]].uuid;
			if (current_cam_uuid != cam_uuid) {
				this.setViewportCamera(cam_uuid);
				break;
			}
		}
	},

	//

	select: function (object) {

		if (this.selected === object) return;

		var uuid = null;

		if (object !== null) {

			uuid = object.uuid;

		}

		this.selected = object;

		this.config.setKey('selected', uuid);
		this.signals.objectSelected.dispatch(object);

	},

	selectById: function (id) {

		if (id === this.camera.id) {

			this.select(this.camera);
			return;

		}

		this.select(this.scene.getObjectById(id, true));

	},

	selectByUuid: function (uuid) {

		var scope = this;

		this.scene.traverse(function (child) {

			if (child.uuid === uuid) {

				scope.select(child);

			}

		});

	},

	deselect: function () {

		this.select(null);

	},

	focus: function (object) {

		if (object !== undefined) {

			this.signals.objectFocused.dispatch(object);

		}

	},

	focusById: function (id) {

		this.focus(this.scene.getObjectById(id, true));

	},

	clear: function (reset_cam = true) {

		this.history.clear();
		this.storage.clear();
		if (reset_cam) {
			this.camera.copy(this.DEFAULT_CAMERA);
		}

		this.scene.name = "Scene";
		this.scene.userData = {};
		this.scene.background = new THREE.TextureLoader().load('grad_light_blue2.png');//THREE.Color(0xaaaaaa);
		this.scene.fog = null;
		this.scene.key_frames = [0];
		this.pframe = 0;
		this.scene.current_cframes = [0];
		this.title = 'Scene';
		this.storage_root = 'tmp/';
		this.storage_path = '{title}_{cf}_{kf}_{suffix}';
		this.track_store_path = '{title}_{suffix}_{name}';
		this.suffix = ''

		var objects = this.scene.children;

		while (objects.length > 0) {
			this.removeObject(objects[0]);
		}

		this.scene.add(this.tracklight);

		this.geometries = {};
		this.materials = {};
		this.textures = {};
		this.scripts = {};

		this.materialsRefCounter.clear();

		this.animations = {};
		this.mixer.stopAllAction();

		this.deselect();

		this.signals.cframeChanged.dispatch();
		this.signals.keyframesChanged.dispatch();
		this.signals.pframeChanged.dispatch();
		// scene meta
		this.signals.onTitleChanged.dispatch();
		this.signals.onStorageRootChanged.dispatch();
		this.signals.onStoragePathChanged.dispatch();
		this.signals.onTrackStorePathChanged.dispatch();
		this.signals.onSuffixChanged.dispatch();

		this.signals.editorCleared.dispatch();

	},

	//

	fromJSON: function (json) {

		var scope = this;

		var loader = new THREE.ObjectLoader();
		var camera = loader.parse(json.camera);

		this.camera.copy(camera);
		this.camera.aspect = this.DEFAULT_CAMERA.aspect;
		this.camera.updateProjectionMatrix();

		this.history.fromJSON(json.history);
		this.scripts = json.scripts;

		loader.parse(json.scene, function (scene) {

			scope.setScene(scene);

		});

	},

	toJSON: function () {

		// scripts clean up

		var scene = this.scene;
		var scripts = this.scripts;

		for (var key in scripts) {

			var script = scripts[key];

			if (script.length === 0 || scene.getObjectByProperty('uuid', key) === undefined) {

				delete scripts[key];

			}

		}

		//

		return {

			metadata: {},
			project: {
				shadows: this.config.getKey('project/renderer/shadows'),
				vr: this.config.getKey('project/vr')
			},
			camera: this.camera.toJSON(),
			scene: this.scene.toJSON(),
			scripts: this.scripts,
			history: this.history.toJSON()

		};

	},

	objectByUuid: function (uuid) {

		return this.scene.getObjectByProperty('uuid', uuid, true);

	},

	execute: function (cmd, optionalName) {
		this.history.execute(cmd, optionalName);

	},

	undo: function () {

		this.history.undo();

	},

	redo: function () {

		this.history.redo();

	}

};

export { Editor };
