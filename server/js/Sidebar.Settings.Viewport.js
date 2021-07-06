/**
 * @author mrdoob / http://mrdoob.com/
 */

import { UIDiv, UIBreak, UIText } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';


var SidebarSettingsViewport = function (editor) {

	var signals = editor.signals;
	var strings = editor.strings;

	var container = new UIDiv();
	container.add(new UIBreak());

	container.add(new UIText(strings.getKey('sidebar/settings/viewport/grid')).setWidth('90px'));

	var showGrid = new UIBoolean(true).onChange(update);
	var showAxesHelper = new UIBoolean(true).onChange(update);
	container.add(showGrid);
	var axes_container = new UIDiv();
	axes_container.add(new UIText("Axes Helper").setWidth('90px'));
	axes_container.add(showAxesHelper);
	container.add(axes_container)

	/*
	var snapSize = new UI.Number( 25 ).setWidth( '40px' ).onChange( update );
	container.add( snapSize );

	var snap = new UI.THREE.Boolean( false, 'snap' ).onChange( update );
	container.add( snap );
	*/

	function update() {

		signals.setGridAxes.dispatch(showGrid.getValue(), showAxesHelper.getValue());

	}
	signals.setGridAxes.add(function (grid_vis, axes_vis) {
		showGrid.setValue(grid_vis);
		showAxesHelper.setValue(axes_vis);
	})

	return container;

};

export { SidebarSettingsViewport };
