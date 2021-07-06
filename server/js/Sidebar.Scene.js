/**
 * @author mrdoob / http://mrdoob.com/
 */

import { UIPanel, UIBreak, UIRow, UIColor, UISelect, UIText, UINumber, UICheckbox, setVisible, UIInteger, UIInput, UIDiv, UIButton } from './libs/ui.js';
import { UIOutliner, UITexture, UICubeTexture } from './libs/ui.three.js';


import * as THREE from '../../build/three.module.js';

var SidebarScene = function (editor) {

	var signals = editor.signals;
	var strings = editor.strings;

	var container = new UIPanel();
	container.setBorderTop('0');
	container.setPaddingTop('20px');

	// outliner



	function buildOption(object, draggable, selectVisible = false) {
		var option = document.createElement('div');
		option.innerHTML = buildHTML(object);
		option.draggable = draggable;
		option.value = object.id;
		return option;

	}

	function getMaterialName(material) {

		if (Array.isArray(material)) {

			var array = [];

			for (var i = 0; i < material.length; i++) {

				array.push(material[i].name);

			}

			return array.join(',');

		}

		return material.name;

	}

	function escapeHTML(html) {

		return html
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

	}



	function buildHTML(object) {

		var html = '<div >' + '<span class="type ' + object.type + ' style="width:60px"></span> ' + escapeHTML(object.name);

		if (object.isMesh) {

			var geometry = object.geometry;
			var material = object.material;

			html += ' <span class="type ' + geometry.type + '"></span> ' + escapeHTML(geometry.name);
			html += ' <span class="type ' + material.type + '"></span> ' + escapeHTML(getMaterialName(material));
			//html += ' <script> var setVisible= function(uuid) {console.log(uuid);} </script> <input class="Checkbox" type="checkbox" onChange="setVisible(this.uuid)" uuid=' + object.uuid + ' checked></input> ';

		}

		html += getScript(object.uuid);

		if (object != editor.viewportCamera) {
			html += '<div style="float:right;width:40px">';
			if (object.layers.mask > 1) {

				// set enables layers
				var layers = new THREE.Layers();
				var layers_arr = [];
				for (var i = 1; i < 6; i += 1) {
					layers.set(i);
					if (object.layers.mask & layers.mask) {
						layers_arr.push(i);
					}

				}
				//;width=50px
				//html += ' <span style="text-align:right;margin-left:50px"></span> ' + escapeHTML(layers_arr.join(', '));
				html += ' <div style="float:right"> ' + escapeHTML(layers_arr.join(', ')) + '</div>';

			}

			//html += '<input class="Checkbox" style="float:left" type="checkbox" onChange="function setVisible(uuid) {console.log(uuid)}; setVisible(this.uuid) " uuid=' + object.uuid + ' checked></input> ';
			html += '</div>';
		}
		html += '</div>'


		return html;

	}

	function getScript(uuid) {

		if (editor.scripts[uuid] !== undefined) {

			return ' <span class="type Script"></span>';

		}

		return '';

	}

	var ignoreObjectSelectedSignal = false;

	var outliner = new UIOutliner(editor);
	outliner.setId('outliner');
	outliner.onChange(function () {

		ignoreObjectSelectedSignal = true;

		editor.selectById(parseInt(outliner.getValue()));

		ignoreObjectSelectedSignal = false;

	});
	outliner.onDblClick(function () {

		editor.focusById(parseInt(outliner.getValue()));

	});

	container.add(outliner);
	container.add(new UIBreak());
	// timeline
	var timeline_panel = new UIPanel();
	//pframe
	var pframe_row = new UIRow();
	timeline_panel.add(pframe_row);
	pframe_row.add(new UIText('Pframe:').setWidth('90px'));
	var currentPFrame = new UIInteger(0).onChange(onCurrentPframeChange);
	currentPFrame.min = 0;
	pframe_row.add(currentPFrame);
	//cframe
	var cframe_row = new UIRow();
	timeline_panel.add(cframe_row);
	cframe_row.add(new UIText('Cframe:').setWidth('90px'));
	var currentCFrame = new UIInteger(0).onChange(onCurrentCframeChange);
	currentCFrame.min = 0;
	currentCFrame.max = editor.scene.key_frames.length - 1;
	cframe_row.add(currentCFrame);
	var maxCframe = new UIText('of 0');
	cframe_row.add(maxCframe);

	// keyframe
	var keyframe_row = new UIRow();
	timeline_panel.add(keyframe_row);
	keyframe_row.add(new UIText('Keyframe:').setWidth('90px'));
	var currentKeyFrame = new UIInteger(0).onChange(onCurrentKeyframeChange);
	currentKeyFrame.min = Math.min(...editor.scene.key_frames);
	currentKeyFrame.max = Math.max(...editor.scene.key_frames);
	keyframe_row.add(currentKeyFrame);
	var maxKeyframe = new UIText('to 0');
	keyframe_row.add(maxKeyframe);
	container.add(timeline_panel);

	//layers
	var layers_panel = new UIRow();
	layers_panel.add(new UIText('Layers').setWidth('90px'));
	var layer_checkboxes = [];
	var num_layers = 6;
	for (var i = 0; i < num_layers; i += 1) {
		var ui_checkbox = new UICheckbox(false);
		layer_checkboxes.push(ui_checkbox);
		if (i > 0)
			layers_panel.add(layer_checkboxes[i]);
	}
	layers_panel.add(new UIText('all').setMarginLeft('60px').setWidth('20px'))
	layers_panel.add(layer_checkboxes[0]);

	container.add(layers_panel);

	//storage
	var storage_panel = new UIPanel();

	var title = new UIInput(editor.title).setWidth('150px').onChange(function () { editor.title = title.getValue(); });
	var store_root = new UIInput(editor.storage_root).setWidth('150px').onChange(function () { editor.storage_root = store_root.getValue(); });
	var store_path = new UIInput(editor.storage_path).setWidth('150px').onChange(function () { editor.storage_path = store_path.getValue(); });
	var track_store_path = new UIInput(editor.track_store_path).setWidth('150px').onChange(function () { editor.track_store_path = track_store_path.getValue(); });
	var suffix_input = new UIInput(editor.suffix).setWidth('150px').onChange(function () { editor.suffix = suffix_input.getValue(); });
	storage_panel.add(new UIRow().add(new UIText('Title').setWidth('90px')).add(title));
	storage_panel.add(new UIRow().add(new UIText('Store root').setWidth('90px')).add(store_root));
	storage_panel.add(new UIRow().add(new UIText('Screenshot name').setWidth('90px')).add(store_path));
	storage_panel.add(new UIRow().add(new UIText('Track name').setWidth('90px')).add(track_store_path));

	storage_panel.add(new UIRow().add(new UIText('Suffix').setWidth('90px')).add(suffix_input));
	editor.signals.onTitleChanged.add(function () {
		title.setValue(editor.title);
	});
	editor.signals.onStorageRootChanged.add(function () {
		store_root.setValue(editor.storage_root);
	});

	editor.signals.onStoragePathChanged.add(function () {
		store_path.setValue(editor.storage_path);
	});
	editor.signals.onTrackStorePathChanged.add(function () {
		track_store_path.setValue(editor.track_store_path);
	});


	editor.signals.onSuffixChanged.add(function () {
		suffix_input.setValue(editor.suffix);
	});

	container.add(storage_panel);
	// background

	function onBackgroundChanged() {

		signals.sceneBackgroundChanged.dispatch(
			backgroundType.getValue(),
			backgroundColor.getHexValue(),
			backgroundTexture.getValue(),
			backgroundCubeTexture.getValue(),
			backgroundEquirectTexture.getValue()
		);

	}

	function onTextureChanged(texture) {

		texture.encoding = texture.isHDRTexture ? THREE.RGBEEncoding : THREE.sRGBEncoding;

		if (texture.isCubeTexture && texture.isHDRTexture) {

			texture.format = THREE.RGBAFormat;
			texture.minFilter = THREE.NearestFilter;
			texture.magFilter = THREE.NearestFilter;
			texture.generateMipmaps = false;

		}

		onBackgroundChanged();

	}
	function onCurrentPframeChange() {
		//console.log('onCurrentKeyframeChange');
		var current_pframe = currentPFrame.getValue();
		editor.scene.pframe = current_pframe;
		editor.signals.pframeChanged.dispatch();

	}

	function onCurrentKeyframeChange() {
		//console.log('onCurrentKeyframeChange');
		var current_keyframe = currentKeyFrame.getValue();
		if (editor.scene.key_frames.includes(current_keyframe)) {
			editor.scene.current_keyframes = [current_keyframe];
			editor.scene.current_cframes = [editor.scene.key_frames.indexOf(current_keyframe)];

			editor.signals.cframeChanged.dispatch();
		}

	}
	function onCurrentCframeChange() {
		var current_cframe = currentCFrame.getValue();
		editor.scene.current_cframes = [current_cframe];

		editor.signals.cframeChanged.dispatch();
	}
	var backgroundRow = new UIRow();

	var backgroundType = new UISelect().setOptions({

		'None': 'None',
		'Color': 'Color',
		'Texture': 'Texture',
		'CubeTexture': 'CubeTexture',
		'Equirect': 'Equirect (HDR)'

	}).setWidth('150px');
	backgroundType.onChange(function () {

		onBackgroundChanged();
		refreshBackgroundUI();

	});
	backgroundType.setValue('Color');

	backgroundRow.add(new UIText(strings.getKey('sidebar/scene/background')).setWidth('90px'));
	backgroundRow.add(backgroundType);

	container.add(backgroundRow);

	//

	var colorRow = new UIRow();
	colorRow.setMarginLeft('90px');

	var backgroundColor = new UIColor().setValue('#aaaaaa').onChange(onBackgroundChanged);
	colorRow.add(backgroundColor);

	container.add(colorRow);

	//

	var textureRow = new UIRow();
	textureRow.setDisplay('none');
	textureRow.setMarginLeft('90px');

	var backgroundTexture = new UITexture().onChange(onTextureChanged);
	textureRow.add(backgroundTexture);

	container.add(textureRow);

	//

	var cubeTextureRow = new UIRow();
	cubeTextureRow.setDisplay('none');
	cubeTextureRow.setMarginLeft('90px');

	var backgroundCubeTexture = new UICubeTexture().onChange(onTextureChanged);
	cubeTextureRow.add(backgroundCubeTexture);

	container.add(cubeTextureRow);

	//

	var equirectRow = new UIRow();
	equirectRow.setDisplay('none');
	equirectRow.setMarginLeft('90px');

	var backgroundEquirectTexture = new UITexture().onChange(onTextureChanged);
	equirectRow.add(backgroundEquirectTexture);

	container.add(equirectRow);

	//

	function refreshBackgroundUI() {

		var type = backgroundType.getValue();

		colorRow.setDisplay(type === 'Color' ? '' : 'none');
		textureRow.setDisplay(type === 'Texture' ? '' : 'none');
		cubeTextureRow.setDisplay(type === 'CubeTexture' ? '' : 'none');
		equirectRow.setDisplay(type === 'Equirect' ? '' : 'none');

	}

	// fog

	function onFogChanged() {

		signals.sceneFogChanged.dispatch(
			fogType.getValue(),
			fogColor.getHexValue(),
			fogNear.getValue(),
			fogFar.getValue(),
			fogDensity.getValue()
		);

	}

	var fogTypeRow = new UIRow();
	var fogType = new UISelect().setOptions({

		'None': 'None',
		'Fog': 'Linear',
		'FogExp2': 'Exponential'

	}).setWidth('150px');
	fogType.onChange(function () {

		onFogChanged();
		refreshFogUI();

	});

	fogTypeRow.add(new UIText(strings.getKey('sidebar/scene/fog')).setWidth('90px'));
	fogTypeRow.add(fogType);

	container.add(fogTypeRow);

	// fog color

	var fogPropertiesRow = new UIRow();
	fogPropertiesRow.setDisplay('none');
	fogPropertiesRow.setMarginLeft('90px');
	container.add(fogPropertiesRow);

	var fogColor = new UIColor().setValue('#aaaaaa');
	fogColor.onChange(onFogChanged);
	fogPropertiesRow.add(fogColor);

	// fog near

	var fogNear = new UINumber(0.1).setWidth('40px').setRange(0, Infinity).onChange(onFogChanged);
	fogPropertiesRow.add(fogNear);

	// fog far

	var fogFar = new UINumber(50).setWidth('40px').setRange(0, Infinity).onChange(onFogChanged);
	fogPropertiesRow.add(fogFar);

	// fog density

	var fogDensity = new UINumber(0.05).setWidth('40px').setRange(0, 0.1).setStep(0.001).setPrecision(3).onChange(onFogChanged);
	fogPropertiesRow.add(fogDensity);

	//


	var CustomFunctUI = new UIPanel();

	var ICPRow = new UIRow();
	var icp_th_ui = new UINumber(editor.icp_th);
	icp_th_ui.onChange(function () { editor.icp_th = icp_th_ui.getValue() });
	ICPRow.add(icp_th_ui);
	var button = new UIButton();
	button.setLabel('ICP');
	button.onClick(function () {
		signals.requestICP.dispatch();
	});
	ICPRow.add(button);
	CustomFunctUI.add(ICPRow)

	var KFRow = new UIRow();
	var button = new UIButton();
	button.setLabel('Add/Update');
	button.onClick(function () {
		console.log('update');
		signals.updateSelectedObjectKF.dispatch();
	});
	KFRow.add(button);
	CustomFunctUI.add(KFRow);
	var ExportRow = new UIRow();
	var button = new UIButton();
	button.setLabel('Export');
	button.setMarginLeft('4px');
	button.onClick(function () {
		signals.exportSelectedObjectTrack.dispatch();
	});
	ExportRow.add(button);
	var button = new UIButton();
	button.setLabel('Export all');
	button.setMarginLeft('4px');
	button.onClick(function () {
		signals.exportTracks.dispatch();
	});
	ExportRow.add(button);
	CustomFunctUI.add(ExportRow);


	container.add(CustomFunctUI);

	function refreshUI() {

		var camera = editor.camera;
		var scene = editor.scene;

		var options = [];

		options.push(buildOption(camera, false));
		options.push(buildOption(scene, false));

		(function addObjects(objects, pad) {

			for (var i = 0, l = objects.length; i < l; i += 1) {

				var object = objects[i];
				if (object.host !== undefined) continue;

				var option = buildOption(object, true, true);
				option.style.paddingLeft = (pad * 10) + 'px';

				options.push(option);

				addObjects(object.children, pad + 1);

			}

		})(scene.children, 1);

		outliner.setOptions(options);

		if (editor.selected !== null) {

			outliner.setValue(editor.selected.id);

		}

		for (var i = 0; i < 6; i += 1) {
			var layers = new THREE.Layers();
			layers.set(i);

			layer_checkboxes[i].setValue(false);
			if ((editor.viewportCamera.layers.mask & layers.mask)) {

				layer_checkboxes[i].setValue(true);

			}
		}

		if (scene.background) {

			if (scene.background.isColor) {

				backgroundType.setValue("Color");
				backgroundColor.setHexValue(scene.background.getHex());
				backgroundTexture.setValue(null);
				backgroundCubeTexture.setValue(null);
				backgroundEquirectTexture.setValue(null);

			} else if (scene.background.isTexture && !scene.background.isPmremTexture) {

				backgroundType.setValue("Texture");
				backgroundTexture.setValue(scene.background);
				backgroundCubeTexture.setValue(null);
				backgroundEquirectTexture.setValue(null);

			} else if (scene.background.isCubeTexture) {

				backgroundType.setValue("CubeTexture");
				backgroundCubeTexture.setValue(scene.background);
				backgroundTexture.setValue(null);
				backgroundEquirectTexture.setValue(null);

			}

		} else {

			backgroundType.setValue("None");
			backgroundTexture.setValue(null);

		}

		if (scene.fog) {

			fogColor.setHexValue(scene.fog.color.getHex());

			if (scene.fog.isFog) {

				fogType.setValue("Fog");
				fogNear.setValue(scene.fog.near);
				fogFar.setValue(scene.fog.far);

			} else if (scene.fog.isFogExp2) {

				fogType.setValue("FogExp2");
				fogDensity.setValue(scene.fog.density);

			}

		} else {

			fogType.setValue("None");

		}

		refreshBackgroundUI();
		refreshFogUI();

	}

	function refreshFogUI() {

		var type = fogType.getValue();

		fogPropertiesRow.setDisplay(type === 'None' ? 'none' : '');
		fogNear.setDisplay(type === 'Fog' ? '' : 'none');
		fogFar.setDisplay(type === 'Fog' ? '' : 'none');
		fogDensity.setDisplay(type === 'FogExp2' ? '' : 'none');

	}

	refreshUI();

	// events

	signals.editorCleared.add(refreshUI);

	signals.sceneGraphChanged.add(refreshUI);

	signals.onLayersChanged.add(refreshUI);

	signals.objectChanged.add(function (object) {

		var options = outliner.options;

		for (var i = 0; i < options.length; i += 1) {

			var option = options[i];

			if (option.value === object.id) {

				option.innerHTML = buildHTML(object);

				return;

			}

		}

	});

	signals.objectSelected.add(function (object) {

		if (ignoreObjectSelectedSignal === true) return;

		outliner.setValue(object !== null ? object.id : null);

	});


	signals.keyframesChanged.add(function () {
		currentCFrame.max = (editor.scene.key_frames.length - 1);
		currentKeyFrame.max = Math.max(...editor.scene.key_frames);
		currentKeyFrame.min = Math.min(...editor.scene.key_frames);
		maxCframe.setValue('of ' + (editor.scene.key_frames.length - 1));
		maxKeyframe.setValue('to ' + Math.max(...editor.scene.key_frames));
	});
	signals.cframeChanged.add(function () {

		currentKeyFrame.setValue(editor.scene.key_frames[Math.max(...editor.scene.current_cframes)]);
		currentCFrame.setValue(Math.max(...editor.scene.current_cframes));
	});
	signals.pframeChanged.add(function () {
		currentPFrame.setValue(editor.pframe);
	});


	return container;

};

export { SidebarScene };
