/**
 * @author mrdoob / http://mrdoob.com/
 */

import * as THREE from '../../build/three.module.js';

import { UIButton, UIPanel, UIText } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';





var MenubarStatus = function (editor) {

	var strings = editor.strings;

	var container = new UIPanel();
	container.setClass('menu right');

	var autosave = new UIBoolean(editor.config.getKey('autosave'), strings.getKey('menubar/status/autosave'));
	autosave.text.setColor('#888');
	autosave.onChange(function () {

		var value = this.getValue();

		editor.config.setKey('autosave', value);

		if (value === true) {

			editor.signals.sceneGraphChanged.dispatch();

		}

	});
	container.add(autosave);

	editor.signals.savingStarted.add(function () {

		autosave.text.setTextDecoration('underline');

	});

	editor.signals.savingFinished.add(function () {

		autosave.text.setTextDecoration('none');

	});

	var version = new UIText('r' + THREE.REVISION);
	version.setClass('title');
	version.setOpacity(0.5);
	container.add(version);

	var screenshot_button = new UIButton('Screenshot');

	screenshot_button.onClick(function () {
		editor.signals.createLocalScreenshot.dispatch();
	});
	container.add(screenshot_button);
	var screenshot_reel_button = new UIButton('ScreenshotReel');

	screenshot_reel_button.onClick(function () {
		editor.createScreenshotReel();
	});
	container.add(screenshot_reel_button);

	return container;

};

export { MenubarStatus };
