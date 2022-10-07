/**
 * @author mrdoob / http://mrdoob.com/
 */

import * as THREE from '../../build/three.module.js';

import { TransformControls } from '../../examples/jsm/controls/TransformControls.js';

import { UIPanel } from './libs/ui.js';

import { EditorControls } from './EditorControls.js';

import { ViewportCamera } from './Viewport.Camera.js';
import { ViewportInfo } from './Viewport.Info.js';

import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';
import { SetTransformCommand } from './commands/SetTransformCommand.js';



var Viewport = function (editor) {
	var editor = editor;
	var signals = editor.signals;

	var container = new UIPanel();
	container.setId('viewport');
	container.setPosition('absolute');

	container.add(new ViewportCamera(editor));
	container.add(new ViewportInfo(editor));

	//

	var renderer = null;
	var pmremGenerator = null;

	var camera = editor.camera;
	var scene = editor.scene;
	var sceneHelpers = editor.sceneHelpers;

	var objects = [];
	var proxies = [];
	// helpers

	var grid = new THREE.GridHelper(400, 400, 0x444444, 0x888888);
	grid.layers.enableAll();
	sceneHelpers.add(grid);

	var array = grid.geometry.attributes.color.array;

	for (var i = 0; i < array.length; i += 60) {

		for (var j = 0; j < 12; j++) {

			array[i + j] = 0.26;

		}

	}
	var axesHelper = new THREE.AxesHelper(50);
	axesHelper.layers.enableAll();
	sceneHelpers.add(axesHelper);

	//

	var box = new THREE.Box3();

	var selectionBox = new THREE.BoxHelper();
	selectionBox.material.depthTest = false;
	selectionBox.material.transparent = true;
	selectionBox.visible = false;
	selectionBox.layers.enableAll();
	sceneHelpers.add(selectionBox);

	var objectPositionOnDown = null;
	var objectRotationOnDown = null;
	var objectScaleOnDown = null;

	var transformControls = new TransformControls(camera, container.dom);
	transformControls.addEventListener('change', function () {

		var object = transformControls.object;

		if (object !== undefined) {

			selectionBox.setFromObject(object);

			var helper = editor.helpers[object.id];

			if (helper !== undefined && helper.isSkeletonHelper !== true) {

				helper.update();

			}

			signals.refreshSidebarObject3D.dispatch(object);

		}

		render();

	});
	transformControls.addEventListener('mouseDown', function () {

		var object = transformControls.object;

		objectPositionOnDown = object.position.clone();
		objectRotationOnDown = object.rotation.clone();
		objectScaleOnDown = object.scale.clone();

		controls.enabled = false;

	});
	transformControls.addEventListener('mouseUp', function () {

		var object = transformControls.object;

		if (object !== undefined) {

			switch (transformControls.getMode()) {

				case 'translate':

					if (!objectPositionOnDown.equals(object.position)) {

						editor.execute(new SetPositionCommand(editor, object, object.position, objectPositionOnDown));

					}

					break;

				case 'rotate':

					if (!objectRotationOnDown.equals(object.rotation)) {

						editor.execute(new SetRotationCommand(editor, object, object.rotation, objectRotationOnDown));

					}

					break;

				case 'scale':

					if (!objectScaleOnDown.equals(object.scale)) {

						editor.execute(new SetScaleCommand(editor, object, object.scale, objectScaleOnDown));

					}

					break;

			}

		}

		controls.enabled = true;

	});

	sceneHelpers.add(transformControls);

	// object picking

	var raycaster = new THREE.Raycaster();
	var mouse = new THREE.Vector2();

	// events

	function getIntersects(point, objects) {

		mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);

		raycaster.setFromCamera(mouse, camera);

		return raycaster.intersectObjects(objects);

	}

	var onDownPosition = new THREE.Vector2();
	var onUpPosition = new THREE.Vector2();
	var onDoubleClickPosition = new THREE.Vector2();

	function getMousePosition(dom, x, y) {

		var rect = dom.getBoundingClientRect();
		return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];

	}

	function handleClick() {

		if (onDownPosition.distanceTo(onUpPosition) === 0) {

			var intersects = getIntersects(onUpPosition, objects.concat(proxies));

			if (intersects.length > 0) {

				var object = intersects[0].object;

				if (object.userData.object !== undefined) {

					// helper

					editor.select(object.userData.object);

				} else {
					if (object.host !== undefined) {
						editor.select(object.host);
						console.log('host');
					}
					else {
						editor.select(object);
					}


				}

			} else {

				editor.select(null);

			}

			render();

		}

	}

	function onMouseDown(event) {

		// event.preventDefault();

		var array = getMousePosition(container.dom, event.clientX, event.clientY);
		onDownPosition.fromArray(array);

		document.addEventListener('mouseup', onMouseUp, false);

	}

	function onMouseUp(event) {

		var array = getMousePosition(container.dom, event.clientX, event.clientY);
		onUpPosition.fromArray(array);

		handleClick();

		document.removeEventListener('mouseup', onMouseUp, false);

	}

	function onTouchStart(event) {

		var touch = event.changedTouches[0];

		var array = getMousePosition(container.dom, touch.clientX, touch.clientY);
		onDownPosition.fromArray(array);

		document.addEventListener('touchend', onTouchEnd, false);

	}

	function onTouchEnd(event) {

		var touch = event.changedTouches[0];

		var array = getMousePosition(container.dom, touch.clientX, touch.clientY);
		onUpPosition.fromArray(array);

		handleClick();

		document.removeEventListener('touchend', onTouchEnd, false);

	}

	function onDoubleClick(event) {

		var array = getMousePosition(container.dom, event.clientX, event.clientY);
		onDoubleClickPosition.fromArray(array);

		var intersects = getIntersects(onDoubleClickPosition, objects);

		if (intersects.length > 0) {

			var intersect = intersects[0];

			signals.objectFocused.dispatch(intersect.object);

		}

	}

	container.dom.addEventListener('mousedown', onMouseDown, false);
	container.dom.addEventListener('touchstart', onTouchStart, false);
	container.dom.addEventListener('dblclick', onDoubleClick, false);

	// controls need to be added *after* main logic,
	// otherwise controls.enabled doesn't work.

	var controls = new EditorControls(camera, container.dom);
	controls.addEventListener('change', function () {

		signals.cameraChanged.dispatch(camera);

	});

	// signals

	//custom

	function dataURIToBlob(dataURI) {
		const binStr = window.atob(dataURI.split(',')[1]);
		const len = binStr.length;
		const arr = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			arr[i] = binStr.charCodeAt(i);
		}
		return new window.Blob([arr]);
	}

	function saveDataURI(name, dataURI) {
		const blob = dataURIToBlob(dataURI);

		// force download
		const link = document.createElement('a');
		link.download = name;
		link.href = window.URL.createObjectURL(blob);
		link.onclick = () => {
			window.setTimeout(() => {
				window.URL.revokeObjectURL(blob);
				link.removeAttribute('href');
			}, 500);

		};
		link.click();
	}

	function defaultFileName(ext) {
		const str = `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}${ext}`;
		return str.replace(/\//g, '-').replace(/:/g, '.');
	}

	function takeScreenshot(width, height) {

		// set camera and renderer to desired screenshot dimension
		var org_size = new THREE.Vector2();
		renderer.getSize(org_size);
		editor.viewportCamera.aspect = width / height;
		editor.viewportCamera.updateProjectionMatrix();
		renderer.setSize(width, height);
		renderer.render(scene, editor.viewportCamera, null, false);




		const DataURI = renderer.domElement.toDataURL('image/png');
		renderer.setSize(org_size.x, org_size.y);
		renderer.render(scene, editor.viewportCamera, null, false);
		// save
		saveDataURI(defaultFileName('.png'), DataURI);

		// reset to old dimensions by invoking the on window resize function
		//onWindowResize();

	}


	signals.createScreenshot.add(function () {
		var width = editor.screenshot_width;
		var height = editor.screenshot_height;
		//takeScreenshot(width, height);
		var org_size = new THREE.Vector2();
		renderer.getSize(org_size);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
		renderer.render(scene, camera, null, false);
		const DataURI = renderer.domElement.toDataURL('image/png');
		renderer.setSize(org_size.x, org_size.y);
		renderer.render(scene, camera, null, false);
		//const blob = dataURIToBlob(DataURI);
		var cframe = Math.max(...editor.scene.current_cframes);
		var kframe = editor.scene.key_frames[cframe];
		var suffix = editor.suffix;
		var path = editor.storage_root + '/' + editor.storage_path.replace('{title}', editor.title).replace('{cf}', cframe).replace('{kf}', kframe).replace('{suffix}', suffix);

		fetch('http://localhost:5001/screenshot', { method: 'POST', body: JSON.stringify({ 'img_b64': DataURI, 'path': path }) })
	});
	signals.createLocalScreenshot.add(function () {
		var width = editor.screenshot_width;
		var height = editor.screenshot_height;
		var org_size = new THREE.Vector2();
		renderer.getSize(org_size);
		takeScreenshot(width, height);
		renderer.setSize(org_size.x, org_size.y);
		renderer.render(scene, camera, null, false);
	});
	signals.cframeChanged.add(function (change_pframe = true) {
		//update the rest
		var current_cframe = Math.max(...editor.scene.current_cframes);
		editor.scene.current_keyframes = [editor.scene.key_frames[current_cframe]];
		if (change_pframe) {
			editor.pframe = editor.scene.key_frames[current_cframe];
			signals.pframeChanged.dispatch();
		}


		var current_keyframes = [];
		for (var j = 0; j < scene.current_cframes.length; j++) {
			current_keyframes.push(scene.key_frames[scene.current_cframes[j]]);
		}
		scene.traverse(function (element) {
			if (element.has_track !== true) {

				// if there is no track
				if (element.keyframes == undefined || element.keyframes.filter(x => current_keyframes.includes(x)).length > 0) {
					element.visible = true;
				}
				else {
					element.visible = false;
				}
			}

		}
		);



		render();
	});
	signals.pframeChanged.add(function () {
		var max_cframe = Math.max(...editor.scene.current_cframes);
		// increasing value
		if (max_cframe < editor.scene.key_frames.length - 1) {
			var next_kf = editor.scene.key_frames[max_cframe + 1];
			if (editor.pframe >= next_kf) {
				editor.scene.current_cframes = [max_cframe + 1];
				signals.cframeChanged.dispatch(false);
			}
		}
		if (max_cframe > 0) {
			var cur_kf = editor.scene.key_frames[max_cframe];
			var prev_kf = editor.scene.key_frames[max_cframe - 1];
			if (editor.pframe < cur_kf) {
				editor.scene.current_cframes = [max_cframe - 1];
				signals.cframeChanged.dispatch(false);
			}
		}


	})




	signals.editorCleared.add(function () {

		controls.center.set(0, 0, 0);
		currentBackgroundType = null;
		currentFogType = null;
		render();

	});

	signals.transformModeChanged.add(function (mode) {

		transformControls.setMode(mode);

	});

	signals.snapChanged.add(function (dist) {

		transformControls.setTranslationSnap(dist);

	});

	signals.spaceChanged.add(function (space) {

		transformControls.setSpace(space);

	});

	signals.rendererUpdated.add(function () {

		render();

	});

	signals.rendererChanged.add(function (newRenderer, newPmremGenerator) {

		if (renderer !== null) {

			container.dom.removeChild(renderer.domElement);

		}

		renderer = newRenderer;
		pmremGenerator = newPmremGenerator;

		renderer.autoClear = false;
		renderer.autoUpdateScene = false;
		renderer.outputEncoding = THREE.sRGBEncoding;
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(container.dom.offsetWidth, container.dom.offsetHeight);

		container.dom.appendChild(renderer.domElement);

		render();

	});

	signals.sceneGraphChanged.add(function () {

		render();

	});

	signals.cameraChanged.add(function () {

		render();

	});

	signals.objectSelected.add(function (object) {

		selectionBox.visible = false;
		transformControls.detach();

		if (object !== null && object !== scene && object !== camera) {
			box.setFromObject(object);

			if (box.isEmpty() === false) {

				selectionBox.setFromObject(object);
				selectionBox.visible = true;

			}

			transformControls.attach(object);

		}

		render();

	});

	signals.objectFocused.add(function (object) {

		controls.focus(object);

	});

	signals.geometryChanged.add(function (object) {

		if (object !== undefined) {
			if (object.proxy !== undefined) {
				object = object.proxy;
			}
			else {
				object = object;
			}

			selectionBox.setFromObject(object);

		}

		render();

	});

	signals.objectAdded.add(function (object) {

		object.traverse(function (child) {

			objects.push(child);

		});

	});
	signals.proxyAdded.add(function (proxy) {

		proxy.traverse(function (child) {

			proxies.push(child);

		});

	});

	signals.updatePose.add(function (pose_data) {
		var obj = editor.scene.getObjectByName(pose_data['name'])
		if (obj !== undefined) {
			var bytes = Uint8Array.from(atob(pose_data['pose']), c => c.charCodeAt(0))
			var data_arr = new Float32Array(bytes.buffer);
			var pose = new THREE.Matrix4().fromArray(data_arr).transpose()
			editor.execute(new SetTransformCommand(editor, obj, pose, obj.matrix));
		}
	})


	signals.objectChanged.add(function (object) {

		if (editor.selected === object) {

			if (object.proxy !== undefined) {
				object = object.proxy;
			}
			else {
				object = object;
			}

			selectionBox.setFromObject(object);

		}

		if (object.isPerspectiveCamera) {

			object.updateProjectionMatrix();

		}

		if (editor.helpers[object.id] !== undefined) {

			editor.helpers[object.id].update();

		}

		render();

	});

	signals.objectRemoved.add(function (object) {

		controls.enabled = true; // see #14180
		if (object === transformControls.object) {

			transformControls.detach();

		}

		object.traverse(function (child) {

			objects.splice(objects.indexOf(child), 1);

		});

	});

	signals.helperAdded.add(function (object) {

		objects.push(object.getObjectByName('picker'));

	});

	signals.helperRemoved.add(function (object) {

		objects.splice(objects.indexOf(object.getObjectByName('picker')), 1);

	});

	signals.materialChanged.add(function () {

		render();

	});

	// background

	var currentBackgroundType = null;

	signals.sceneBackgroundChanged.add(function (backgroundType, backgroundColor, backgroundTexture, backgroundCubeTexture, backgroundEquirectTexture) {

		if (currentBackgroundType !== backgroundType) {

			switch (backgroundType) {

				case 'None':
					scene.background = null;
					break;
				case 'Color':
					scene.background = new THREE.Color();
					break;

			}

		}

		if (backgroundType === 'Color') {

			scene.background.set(backgroundColor);
			scene.environment = null;

		} else if (backgroundType === 'Texture') {

			scene.background = backgroundTexture;
			scene.environment = null;

		} else if (backgroundType === 'CubeTexture') {

			if (backgroundCubeTexture && backgroundCubeTexture.isHDRTexture) {

				var texture = pmremGenerator.fromCubemap(backgroundCubeTexture).texture;
				texture.isPmremTexture = true;

				scene.background = texture;
				scene.environment = texture;

			} else {

				scene.background = backgroundCubeTexture;
				scene.environment = null;

			}

		} else if (backgroundType === 'Equirect') {

			if (backgroundEquirectTexture && backgroundEquirectTexture.isHDRTexture) {

				var texture = pmremGenerator.fromEquirectangular(backgroundEquirectTexture).texture;
				texture.isPmremTexture = true;

				scene.background = texture;
				scene.environment = texture;

			} else {

				scene.background = null;
				scene.environment = null;

			}

		}

		render();

	});

	// fog

	var currentFogType = null;

	signals.sceneFogChanged.add(function (fogType, fogColor, fogNear, fogFar, fogDensity) {

		if (currentFogType !== fogType) {

			switch (fogType) {

				case 'None':
					scene.fog = null;
					break;
				case 'Fog':
					scene.fog = new THREE.Fog();
					break;
				case 'FogExp2':
					scene.fog = new THREE.FogExp2();
					break;

			}

			currentFogType = fogType;

		}

		if (scene.fog) {

			if (scene.fog.isFog) {

				scene.fog.color.setHex(fogColor);
				scene.fog.near = fogNear;
				scene.fog.far = fogFar;

			} else if (scene.fog.isFogExp2) {

				scene.fog.color.setHex(fogColor);
				scene.fog.density = fogDensity;

			}

		}

		render();

	});

	signals.viewportCameraChanged.add(function (viewportCamera) {

		if (viewportCamera.isPerspectiveCamera) {

			viewportCamera.aspect = editor.camera.aspect;
			viewportCamera.projectionMatrix.copy(editor.camera.projectionMatrix);

		} else if (!viewportCamera.isOrthographicCamera) {

			throw "Invalid camera set as viewport";

		}

		camera = viewportCamera;

		render();

	});

	//

	signals.windowResize.add(function () {

		// TODO: Move  out?

		editor.DEFAULT_CAMERA.aspect = container.dom.offsetWidth / container.dom.offsetHeight;
		editor.DEFAULT_CAMERA.updateProjectionMatrix();

		camera.aspect = container.dom.offsetWidth / container.dom.offsetHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(container.dom.offsetWidth, container.dom.offsetHeight);

		render();

	});

	signals.setGridAxes.add(function (grid_vis, axes_vis) {
		grid.visible = grid_vis;
		axesHelper.visible = axes_vis;
		render();

	});
	signals.toggleGridAxes.add(function () {
		grid.visible = !grid.visible;
		axesHelper.visible = !axesHelper.visible;
		render();

	});
	signals.switchCamera.add(function () {
		editor.switchCamera();
		render();
	})

	// animations

	var clock = new THREE.Clock(); // only used for animations

	function animate() {
		return;
		//requestAnimationFrame(animate);

		var mixer = editor.mixer;

		if (mixer.stats.actions.inUse > 0) {

			mixer.update(clock.getDelta());
			render();

		}

	}

	requestAnimationFrame(animate);

	//

	var startTime = 0;
	var endTime = 0;

	function render() {

		startTime = performance.now();

		scene.updateMatrixWorld();
		// ADDED TRACKLIGHT

		//editor.tracklight.position.copy(editor.camera.position);
		editor.tracklight.position.copy(editor.viewportCamera.position);
		renderer.render(scene, camera);

		if (camera === editor.camera) {

			sceneHelpers.updateMatrixWorld();
			renderer.render(sceneHelpers, camera);

		}

		endTime = performance.now();
		var frametime = endTime - startTime;
		editor.signals.sceneRendered.dispatch(frametime);

	}

	return container;

};

export { Viewport };
