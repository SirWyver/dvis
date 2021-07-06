/**
 * @author TyLindberg / https://github.com/TyLindberg
 */

import { UIDiv, UIBreak, UIText, UIRow, UIInput } from './libs/ui.js';

import { RemoveObjectCommand } from './commands/RemoveObjectCommand.js';
import { SetValueCommand } from './commands/SetValueCommand.js';
import * as THREE from '../../build/three.module.js';

var SidebarSettingsShortcuts = function (editor) {

	var strings = editor.strings;

	var IS_MAC = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

	function isValidKeyBinding(key) {

		return key.match(/^[A-Za-z0-9]$/i); // Can't use z currently due to undo/redo

	}

	var config = editor.config;
	var signals = editor.signals;

	var container = new UIDiv();
	container.add(new UIBreak());

	var shortcuts = ['translate', 'rotate', 'scale', 'undo', 'focus'];

	function createShortcutInput(name) {

		var configName = 'settings/shortcuts/' + name;
		var shortcutRow = new UIRow();

		var shortcutInput = new UIInput().setWidth('150px').setFontSize('12px');
		shortcutInput.setTextTransform('lowercase');
		shortcutInput.onChange(function () {

			var value = shortcutInput.getValue().toLowerCase();

			if (isValidKeyBinding(value)) {

				config.setKey(configName, value);

			}

		});

		// Automatically highlight when selecting an input field
		shortcutInput.dom.addEventListener('click', function () {

			shortcutInput.dom.select();

		});

		// If the value of the input field is invalid, revert the input field
		// to contain the key binding stored in config
		shortcutInput.dom.addEventListener('blur', function () {

			if (!isValidKeyBinding(shortcutInput.getValue())) {

				shortcutInput.setValue(config.getKey(configName));

			}

		});

		// If a valid key binding character is entered, blur the input field
		shortcutInput.dom.addEventListener('keyup', function (event) {

			if (isValidKeyBinding(event.key)) {

				shortcutInput.dom.blur();

			}

		});

		if (config.getKey(configName) !== undefined) {

			shortcutInput.setValue(config.getKey(configName));

		}

		shortcutInput.dom.maxLength = 1;
		shortcutRow.add(new UIText(strings.getKey('sidebar/settings/shortcuts/' + name)).setTextTransform('capitalize').setWidth('90px'));
		shortcutRow.add(shortcutInput);

		container.add(shortcutRow);

	}

	for (var i = 0; i < shortcuts.length; i++) {

		createShortcutInput(shortcuts[i]);

	}

	document.addEventListener('keydown', function (event) {

		switch (event.key.toLowerCase()) {

			case 'backspace':

				event.preventDefault(); // prevent browser back

			// fall-through

			case 'delete':

				var object = editor.selected;

				if (object === null) return;

				var parent = object.parent;
				if (parent !== null) editor.execute(new RemoveObjectCommand(editor, object));

				break;

			case config.getKey('settings/shortcuts/translate'):

				signals.transformModeChanged.dispatch('translate');

				break;

			case config.getKey('settings/shortcuts/rotate'):

				signals.transformModeChanged.dispatch('rotate');

				break;

			case config.getKey('settings/shortcuts/scale'):

				signals.transformModeChanged.dispatch('scale');

				break;

			case config.getKey('settings/shortcuts/undo'):

				if (IS_MAC ? event.metaKey : event.ctrlKey) {

					event.preventDefault(); // Prevent browser specific hotkeys

					if (event.shiftKey) {

						editor.redo();

					} else {

						editor.undo();

					}

				}

				break;

			case config.getKey('settings/shortcuts/focus'):

				if (editor.selected !== null) {

					editor.focus(editor.selected);

				}

				break;
			case config.getKey('settings/shortcuts/toggleVisible'):
				if (editor.selected !== null) {
					editor.execute(new SetValueCommand(editor, editor.selected, 'visible', !editor.selected.visible));
				}
				break;
			case config.getKey('settings/shortcuts/onlyLayer0'):
				editor.active_layers = [0];
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/onlyLayer1'):
				editor.active_layers = [1];
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/onlyLayer2'):
				editor.active_layers = [2];
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/onlyLayer3'):
				editor.active_layers = [3];
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/onlyLayer4'):
				editor.active_layers = [4];
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/onlyLayer5'):
				editor.active_layers = [5];
				editor.changeLayers();
				break
			case config.getKey('settings/shortcuts/toggleLayer1'):
				if (editor.active_layers.includes(1)) {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 1; })
				} else {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 0; })
					editor.active_layers.push(1);
				}
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/toggleLayer2'):
				if (editor.active_layers.includes(2)) {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 2; })
				} else {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 0; })
					editor.active_layers.push(2);
				}
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/toggleLayer3'):
				if (editor.active_layers.includes(3)) {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 3; })
				} else {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 0; })
					editor.active_layers.push(3);
				}
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/toggleLayer4'):
				if (editor.active_layers.includes(4)) {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 4; })
				} else {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 0; })
					editor.active_layers.push(4);
				}
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/toggleLayer5'):
				if (editor.active_layers.includes(5)) {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 5; })
				} else {
					editor.active_layers = editor.active_layers.filter(function (value, index, arr) { return value != 0; })
					editor.active_layers.push(5);
				}
				editor.changeLayers();
				break;
			case config.getKey('settings/shortcuts/toggleGridAxes'):
				editor.signals.toggleGridAxes.dispatch();
				break;
			//screenshot
			case config.getKey('settings/shortcuts/takeScreenshot'):
				editor.signals.createScreenshot.dispatch();
				break;
			case config.getKey('settings/shortcuts/takeLocalScreenshot'):
				editor.signals.createLocalScreenshot.dispatch();
				break;
			// timeline control
			case config.getKey('settings/shortcuts/nextCframe'):
				var cframes = [];
				for (var i = 0; i < editor.scene.current_cframes.length; i++) {
					cframes.push(Math.min(editor.scene.key_frames.length - 1, editor.scene.current_cframes[i] + 1));
				}
				editor.scene.current_cframes = cframes;
				editor.signals.cframeChanged.dispatch();
				break;
			case config.getKey('settings/shortcuts/previousCframe'):
				var cframes = [];
				for (var i = 0; i < editor.scene.current_cframes.length; i++) {
					cframes.push(Math.max(0, editor.scene.current_cframes[i] - 1));
				}
				editor.scene.current_cframes = cframes;
				editor.signals.cframeChanged.dispatch();
				break;
			case config.getKey('settings/shortcuts/nextPframe'):
				editor.pframe += 1;
				editor.signals.pframeChanged.dispatch();
				break;
			case config.getKey('settings/shortcuts/previousPframe'):
				editor.pframe = Math.max(0, editor.pframe - 1);
				editor.signals.pframeChanged.dispatch();
				break;
			case config.getKey('settings/shortcuts/setKeyframeTrack'):
				editor.signals.updateSelectedObjectKF.dispatch();
				break;
			case config.getKey('settings/shortcuts/deleteKeyframeTrack'):
				editor.signals.deleteSelectedObjectKF.dispatch();
				break;
			case config.getKey('settings/shortcuts/setCameraKeyframe'):
				editor.signals.setCameraKeyframe.dispatch();
				break;
			case config.getKey('settings/shortcuts/switchCamera'):
				editor.signals.switchCamera.dispatch();
				break;
			case config.getKey('settings/shortcuts/requestICP'):
				editor.signals.requestICP.dispatch();
				break
			case config.getKey('settings/shortcuts/requestPC'):
				editor.signals.requestPC.dispatch();
				break
		}

	}, false);

	return container;

};

export { SidebarSettingsShortcuts };
