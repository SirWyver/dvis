/**
 * @author mrdoob / http://mrdoob.com/
 */

import { UIPanel, UIRow } from './libs/ui.js';
import { ShortCutTable } from './shortcutTable.js'

var MenubarHelp = function (editor) {

	var strings = editor.strings;
	var signals = editor.signals;

	var container = new UIPanel();
	container.setClass('menu');

	var title = new UIPanel();
	title.setClass('title');
	title.setTextContent(strings.getKey('menubar/help'));
	container.add(title);

	var options = new UIPanel();
	options.setClass('options');
	container.add(options);

	// Source code

	var option = new UIRow();
	option.setClass('option');
	option.setTextContent('Key binding');
	option.onClick(function () {
		var diag = document.getElementById("ShortCutsDialog");
		var table = document.createElement('table');
		if (diag.children.length == 0) {
			for (let i = 0; i < ShortCutTable.length; i++) {
				var row = table.insertRow(table.length);
				var key = row.insertCell(0);
				var descr = row.insertCell(1);
				key.innerHTML = ShortCutTable[i].key;
				descr.innerHTML = ShortCutTable[i].descr;
			}
			diag.appendChild(table)
		}
		diag.showModal()
	});
	options.add(option);

	// About

	var option = new UIRow();
	option.setClass('option');
	option.setTextContent(strings.getKey('menubar/help/about'));
	option.onClick(function () {

		window.open('http://threejs.org', '_blank');

	});
	options.add(option);

	return container;

};

export { MenubarHelp };
