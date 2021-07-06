/**
 * @author mrdoob / http://mrdoob.com/
 */

import * as THREE from '../../build/three.module.js';

import { UIPanel, UIRow, UIInput, UIButton, UIColor, UICheckbox, UIInteger, UISpan, UIBreak, UITextArea, UIText, UINumber, UIListbox, UIHorizontalRule } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';

import { SetUuidCommand } from './commands/SetUuidCommand.js';
import { SetValueCommand } from './commands/SetValueCommand.js';
import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';
import { SetColorCommand } from './commands/SetColorCommand.js';

var SidebarObject = function (editor) {

	var strings = editor.strings;

	var signals = editor.signals;

	var container = new UIPanel();
	container.setBorderTop('0');
	container.setPaddingTop('20px');
	container.setDisplay('none');

	// Actions

	/*
	var objectActions = new UI.Select().setPosition( 'absolute' ).setRight( '8px' ).setFontSize( '11px' );
	objectActions.setOptions( {

		'Actions': 'Actions',
		'Reset Position': 'Reset Position',
		'Reset Rotation': 'Reset Rotation',
		'Reset Scale': 'Reset Scale'

	} );
	objectActions.onClick( function ( event ) {

		event.stopPropagation(); // Avoid panel collapsing

	} );
	objectActions.onChange( function ( event ) {

		var object = editor.selected;

		switch ( this.getValue() ) {

			case 'Reset Position':
				editor.execute( new SetPositionCommand( editor, object, new Vector3( 0, 0, 0 ) ) );
				break;

			case 'Reset Rotation':
				editor.execute( new SetRotationCommand( editor, object, new Euler( 0, 0, 0 ) ) );
				break;

			case 'Reset Scale':
				editor.execute( new SetScaleCommand( editor, object, new Vector3( 1, 1, 1 ) ) );
				break;

		}

		this.setValue( 'Actions' );

	} );
	container.addStatic( objectActions );
	*/
	const copyToClipboard = str => {
		const el = document.createElement('textarea');
		el.value = str;
		el.setAttribute('readonly', '');
		el.style.position = 'absolute';
		el.style.left = '-9999px';
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
	};
	// type

	var objectTypeRow = new UIRow();
	var objectType = new UIText();

	objectTypeRow.add(new UIText(strings.getKey('sidebar/object/type')).setWidth('90px'));
	objectTypeRow.add(objectType);

	objectTypeRow.add(new UIButton('Copy trs').setMarginLeft('20px').onClick(function () {
		copyToClipboard('[' + editor.selected.matrix.toArray() + ']');
	}));
	objectTypeRow.add(new UIButton('Paste trs').setMarginLeft('20px').onClick(function () {

		navigator.clipboard.readText().then(text => {

			var str_data = text.substring(1, text.length - 1).split(",");
			var arr_data = [];
			for (var i = 0; i < str_data.length; i++) {
				arr_data.push(parseFloat(str_data[i]));
			}
			var obj_matrix = (new THREE.Matrix4().fromArray(arr_data));
			var obj = editor.selected;
			obj.applyMatrix4(new THREE.Matrix4().getInverse(obj.matrix));
			obj.applyMatrix4(obj_matrix);
			editor.signals.rendererUpdated.dispatch();
		});
		//copyToClipboard('[' + editor.selected.matrix.toArray() + ']');
	}))

	container.add(objectTypeRow);

	// uuid

	var objectUUIDRow = new UIRow();
	var objectUUID = new UIInput().setWidth('102px').setFontSize('12px').setDisabled(true);
	var objectUUIDRenew = new UIButton(strings.getKey('sidebar/object/new')).setMarginLeft('7px').onClick(function () {

		objectUUID.setValue(THREE.MathUtils.generateUUID());

		editor.execute(new SetUuidCommand(editor, editor.selected, objectUUID.getValue()));

	});

	objectUUIDRow.add(new UIText(strings.getKey('sidebar/object/uuid')).setWidth('90px'));
	objectUUIDRow.add(objectUUID);
	objectUUIDRow.add(objectUUIDRenew);

	container.add(objectUUIDRow);

	// name

	var objectNameRow = new UIRow();
	var objectName = new UIInput().setWidth('150px').setFontSize('12px').onChange(function () {

		editor.execute(new SetValueCommand(editor, editor.selected, 'name', objectName.getValue()));

	});

	objectNameRow.add(new UIText(strings.getKey('sidebar/object/name')).setWidth('90px'));
	objectNameRow.add(objectName);

	container.add(objectNameRow);

	// position

	var objectPositionRow = new UIRow();
	var objectPositionX = new UINumber().setPrecision(3).setWidth('50px').onChange(update);
	var objectPositionY = new UINumber().setPrecision(3).setWidth('50px').onChange(update);
	var objectPositionZ = new UINumber().setPrecision(3).setWidth('50px').onChange(update);

	objectPositionRow.add(new UIText(strings.getKey('sidebar/object/position')).setWidth('90px'));
	objectPositionRow.add(objectPositionX, objectPositionY, objectPositionZ);

	container.add(objectPositionRow);

	// rotation

	var objectRotationRow = new UIRow();
	var objectRotationX = new UINumber().setStep(10).setNudge(0.1).setUnit('°').setWidth('50px').onChange(update);
	var objectRotationY = new UINumber().setStep(10).setNudge(0.1).setUnit('°').setWidth('50px').onChange(update);
	var objectRotationZ = new UINumber().setStep(10).setNudge(0.1).setUnit('°').setWidth('50px').onChange(update);

	objectRotationRow.add(new UIText(strings.getKey('sidebar/object/rotation')).setWidth('90px'));
	objectRotationRow.add(objectRotationX, objectRotationY, objectRotationZ);

	container.add(objectRotationRow);

	// scale

	var objectScaleRow = new UIRow();
	var objectScaleLock = new UICheckbox(true).setPosition('absolute').setLeft('75px');
	var objectScaleX = new UINumber(1).setPrecision(3).setRange(0.001, Infinity).setWidth('50px').onChange(updateScaleX);
	var objectScaleY = new UINumber(1).setPrecision(3).setRange(0.001, Infinity).setWidth('50px').onChange(updateScaleY);
	var objectScaleZ = new UINumber(1).setPrecision(3).setRange(0.001, Infinity).setWidth('50px').onChange(updateScaleZ);

	objectScaleRow.add(new UIText(strings.getKey('sidebar/object/scale')).setWidth('90px'));
	objectScaleRow.add(objectScaleLock);
	objectScaleRow.add(objectScaleX, objectScaleY, objectScaleZ);

	container.add(objectScaleRow);

	// fov

	var objectFovRow = new UIRow();
	var objectFov = new UINumber().onChange(update);

	objectFovRow.add(new UIText(strings.getKey('sidebar/object/fov')).setWidth('90px'));
	objectFovRow.add(objectFov);

	container.add(objectFovRow);

	// left

	var objectLeftRow = new UIRow();
	var objectLeft = new UINumber().onChange(update);

	objectLeftRow.add(new UIText(strings.getKey('sidebar/object/left')).setWidth('90px'));
	objectLeftRow.add(objectLeft);

	container.add(objectLeftRow);

	// right

	var objectRightRow = new UIRow();
	var objectRight = new UINumber().onChange(update);

	objectRightRow.add(new UIText(strings.getKey('sidebar/object/right')).setWidth('90px'));
	objectRightRow.add(objectRight);

	container.add(objectRightRow);

	// top

	var objectTopRow = new UIRow();
	var objectTop = new UINumber().onChange(update);

	objectTopRow.add(new UIText(strings.getKey('sidebar/object/top')).setWidth('90px'));
	objectTopRow.add(objectTop);

	container.add(objectTopRow);

	// bottom

	var objectBottomRow = new UIRow();
	var objectBottom = new UINumber().onChange(update);

	objectBottomRow.add(new UIText(strings.getKey('sidebar/object/bottom')).setWidth('90px'));
	objectBottomRow.add(objectBottom);

	container.add(objectBottomRow);

	// near

	var objectNearRow = new UIRow();
	var objectNear = new UINumber().onChange(update);

	objectNearRow.add(new UIText(strings.getKey('sidebar/object/near')).setWidth('90px'));
	objectNearRow.add(objectNear);

	container.add(objectNearRow);

	// far

	var objectFarRow = new UIRow();
	var objectFar = new UINumber().onChange(update);

	objectFarRow.add(new UIText(strings.getKey('sidebar/object/far')).setWidth('90px'));
	objectFarRow.add(objectFar);

	container.add(objectFarRow);

	// intensity

	var objectIntensityRow = new UIRow();
	var objectIntensity = new UINumber().setRange(0, Infinity).onChange(update);

	objectIntensityRow.add(new UIText(strings.getKey('sidebar/object/intensity')).setWidth('90px'));
	objectIntensityRow.add(objectIntensity);

	container.add(objectIntensityRow);

	// color

	var objectColorRow = new UIRow();
	var objectColor = new UIColor().onChange(update);

	objectColorRow.add(new UIText(strings.getKey('sidebar/object/color')).setWidth('90px'));
	objectColorRow.add(objectColor);

	container.add(objectColorRow);

	// ground color

	var objectGroundColorRow = new UIRow();
	var objectGroundColor = new UIColor().onChange(update);

	objectGroundColorRow.add(new UIText(strings.getKey('sidebar/object/groundcolor')).setWidth('90px'));
	objectGroundColorRow.add(objectGroundColor);

	container.add(objectGroundColorRow);

	// distance

	var objectDistanceRow = new UIRow();
	var objectDistance = new UINumber().setRange(0, Infinity).onChange(update);

	objectDistanceRow.add(new UIText(strings.getKey('sidebar/object/distance')).setWidth('90px'));
	objectDistanceRow.add(objectDistance);

	container.add(objectDistanceRow);

	// angle

	var objectAngleRow = new UIRow();
	var objectAngle = new UINumber().setPrecision(3).setRange(0, Math.PI / 2).onChange(update);

	objectAngleRow.add(new UIText(strings.getKey('sidebar/object/angle')).setWidth('90px'));
	objectAngleRow.add(objectAngle);

	container.add(objectAngleRow);

	// penumbra

	var objectPenumbraRow = new UIRow();
	var objectPenumbra = new UINumber().setRange(0, 1).onChange(update);

	objectPenumbraRow.add(new UIText(strings.getKey('sidebar/object/penumbra')).setWidth('90px'));
	objectPenumbraRow.add(objectPenumbra);

	container.add(objectPenumbraRow);

	// decay

	var objectDecayRow = new UIRow();
	var objectDecay = new UINumber().setRange(0, Infinity).onChange(update);

	objectDecayRow.add(new UIText(strings.getKey('sidebar/object/decay')).setWidth('90px'));
	objectDecayRow.add(objectDecay);

	container.add(objectDecayRow);

	// shadow

	var objectShadowRow = new UIRow();

	objectShadowRow.add(new UIText(strings.getKey('sidebar/object/shadow')).setWidth('90px'));

	var objectCastShadow = new UIBoolean(false, strings.getKey('sidebar/object/cast')).onChange(update);
	objectShadowRow.add(objectCastShadow);

	var objectReceiveShadow = new UIBoolean(false, strings.getKey('sidebar/object/receive')).onChange(update);
	objectShadowRow.add(objectReceiveShadow);

	var objectShadowRadius = new UINumber(1).onChange(update);
	objectShadowRow.add(objectShadowRadius);

	container.add(objectShadowRow);

	// visible

	var objectVisibleRow = new UIRow();
	var objectVisible = new UICheckbox().onChange(update);

	objectVisibleRow.add(new UIText(strings.getKey('sidebar/object/visible')).setWidth('90px'));
	objectVisibleRow.add(objectVisible);

	container.add(objectVisibleRow);

	// frustumCulled

	var objectFrustumCulledRow = new UIRow();
	var objectFrustumCulled = new UICheckbox().onChange(update);

	objectFrustumCulledRow.add(new UIText(strings.getKey('sidebar/object/frustumcull')).setWidth('90px'));
	objectFrustumCulledRow.add(objectFrustumCulled);

	container.add(objectFrustumCulledRow);

	// renderOrder

	var objectRenderOrderRow = new UIRow();
	var objectRenderOrder = new UIInteger().setWidth('50px').onChange(update);

	objectRenderOrderRow.add(new UIText(strings.getKey('sidebar/object/renderorder')).setWidth('90px'));
	objectRenderOrderRow.add(objectRenderOrder);

	container.add(objectRenderOrderRow);

	//
	var objectLayerRow = new UIRow();
	var objectRenderOrder = new UIInteger().setWidth('50px').onChange(update);

	objectLayerRow.add(new UIText('Object Layers').setWidth('90px'));
	var layers_panel = new UIRow();
	var layer_checkboxes = [];

	var objectLayerUI0 = new UICheckbox(false).onChange(() => {
		if (objectLayerUI0.getValue()) {
			editor.selected.layers.enable(0);
		}
		else {
			editor.selected.layers.disable(0);
		}
	});
	var objectLayerUI1 = new UICheckbox(false).onChange(() => {
		if (objectLayerUI1.getValue()) {
			editor.selected.layers.enable(1);
		}
		else {
			editor.selected.layers.disable(1);
		}
	});
	var objectLayerUI2 = new UICheckbox(false).onChange(() => {
		if (objectLayerUI2.getValue()) {
			editor.selected.layers.enable(2);
		}
		else {
			editor.selected.layers.disable(2);
		}
	});;
	var objectLayerUI3 = new UICheckbox(false).onChange(() => {
		if (objectLayerUI3.getValue()) {
			editor.selected.layers.enable(3);
		}
		else {
			editor.selected.layers.disable(3);
		}
	});;
	var objectLayerUI4 = new UICheckbox(false).onChange(() => {
		if (objectLayerUI4.getValue()) {
			editor.selected.layers.enable(4);
		}
		else {
			editor.selected.layers.disable(4);
		}
	});;
	layer_checkboxes.push(objectLayerUI0);
	layer_checkboxes.push(objectLayerUI1);
	layer_checkboxes.push(objectLayerUI2);
	layer_checkboxes.push(objectLayerUI3);
	layer_checkboxes.push(objectLayerUI4);


	for (var i = 1; i < 5; i++) {
		layers_panel.add(layer_checkboxes[i]);
	}
	layers_panel.add(new UIText('all').setMarginLeft('20px').setWidth('20px'))
	layers_panel.add(layer_checkboxes[0])

	objectLayerRow.add(layers_panel);


	container.add(objectLayerRow);

	// user data

	var objectUserDataRow = new UIRow();
	var objectUserData = new UITextArea().setWidth('150px').setHeight('40px').setFontSize('12px').onChange(update);
	objectUserData.onKeyUp(function () {

		try {

			JSON.parse(objectUserData.getValue());

			objectUserData.dom.classList.add('success');
			objectUserData.dom.classList.remove('fail');

		} catch (error) {

			objectUserData.dom.classList.remove('success');
			objectUserData.dom.classList.add('fail');

		}

	});

	objectUserDataRow.add(new UIText(strings.getKey('sidebar/object/userdata')).setWidth('90px'));
	objectUserDataRow.add(objectUserData);

	//container.add(objectUserDataRow);

	container.add(new UIHorizontalRule())
	container.add(new UIText('META').setFontSize('12x'));
	container.add(new UIBreak());
	container.add(new UIHorizontalRule())

	var meta_container = new UISpan().setDisplay('inline-block');
	container.add(meta_container);


	//

	function updateScaleX() {

		var object = editor.selected;

		if (objectScaleLock.getValue() === true) {

			var scale = objectScaleX.getValue() / object.scale.x;

			objectScaleY.setValue(objectScaleY.getValue() * scale);
			objectScaleZ.setValue(objectScaleZ.getValue() * scale);

		}

		update();

	}

	function updateScaleY() {

		var object = editor.selected;

		if (objectScaleLock.getValue() === true) {

			var scale = objectScaleY.getValue() / object.scale.y;

			objectScaleX.setValue(objectScaleX.getValue() * scale);
			objectScaleZ.setValue(objectScaleZ.getValue() * scale);

		}

		update();

	}

	function updateScaleZ() {

		var object = editor.selected;

		if (objectScaleLock.getValue() === true) {

			var scale = objectScaleZ.getValue() / object.scale.z;

			objectScaleX.setValue(objectScaleX.getValue() * scale);
			objectScaleY.setValue(objectScaleY.getValue() * scale);

		}

		update();

	}

	function update() {

		var object = editor.selected;

		if (object !== null) {

			var newPosition = new THREE.Vector3(objectPositionX.getValue(), objectPositionY.getValue(), objectPositionZ.getValue());
			if (object.position.distanceTo(newPosition) >= 0.01) {

				editor.execute(new SetPositionCommand(editor, object, newPosition));

			}

			var newRotation = new THREE.Euler(objectRotationX.getValue() * THREE.MathUtils.DEG2RAD, objectRotationY.getValue() * THREE.MathUtils.DEG2RAD, objectRotationZ.getValue() * THREE.MathUtils.DEG2RAD);
			if (object.rotation.toVector3().distanceTo(newRotation.toVector3()) >= 0.01) {

				editor.execute(new SetRotationCommand(editor, object, newRotation));

			}

			var newScale = new THREE.Vector3(objectScaleX.getValue(), objectScaleY.getValue(), objectScaleZ.getValue());
			if (object.scale.distanceTo(newScale) >= 0.01) {

				editor.execute(new SetScaleCommand(editor, object, newScale));

			}

			if (object.fov !== undefined && Math.abs(object.fov - objectFov.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'fov', objectFov.getValue()));
				object.updateProjectionMatrix();

			}

			if (object.left !== undefined && Math.abs(object.left - objectLeft.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'left', objectLeft.getValue()));
				object.updateProjectionMatrix();

			}

			if (object.right !== undefined && Math.abs(object.right - objectRight.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'right', objectRight.getValue()));
				object.updateProjectionMatrix();

			}

			if (object.top !== undefined && Math.abs(object.top - objectTop.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'top', objectTop.getValue()));
				object.updateProjectionMatrix();

			}

			if (object.bottom !== undefined && Math.abs(object.bottom - objectBottom.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'bottom', objectBottom.getValue()));
				object.updateProjectionMatrix();

			}

			if (object.near !== undefined && Math.abs(object.near - objectNear.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'near', objectNear.getValue()));
				if (object.isOrthographicCamera) {

					object.updateProjectionMatrix();

				}

			}

			if (object.far !== undefined && Math.abs(object.far - objectFar.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'far', objectFar.getValue()));
				if (object.isOrthographicCamera) {

					object.updateProjectionMatrix();

				}

			}

			if (object.intensity !== undefined && Math.abs(object.intensity - objectIntensity.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'intensity', objectIntensity.getValue()));

			}

			if (object.color !== undefined && object.color.getHex() !== objectColor.getHexValue()) {

				editor.execute(new SetColorCommand(editor, object, 'color', objectColor.getHexValue()));

			}

			if (object.groundColor !== undefined && object.groundColor.getHex() !== objectGroundColor.getHexValue()) {

				editor.execute(new SetColorCommand(editor, object, 'groundColor', objectGroundColor.getHexValue()));

			}

			if (object.distance !== undefined && Math.abs(object.distance - objectDistance.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'distance', objectDistance.getValue()));

			}

			if (object.angle !== undefined && Math.abs(object.angle - objectAngle.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'angle', objectAngle.getValue()));

			}

			if (object.penumbra !== undefined && Math.abs(object.penumbra - objectPenumbra.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'penumbra', objectPenumbra.getValue()));

			}

			if (object.decay !== undefined && Math.abs(object.decay - objectDecay.getValue()) >= 0.01) {

				editor.execute(new SetValueCommand(editor, object, 'decay', objectDecay.getValue()));

			}

			if (object.visible !== objectVisible.getValue()) {

				editor.execute(new SetValueCommand(editor, object, 'visible', objectVisible.getValue()));

			}

			if (object.frustumCulled !== objectFrustumCulled.getValue()) {

				editor.execute(new SetValueCommand(editor, object, 'frustumCulled', objectFrustumCulled.getValue()));

			}

			/*if (object.renderOrder !== objectRenderOrder.getValue()) {

				editor.execute(new SetValueCommand(editor, object, 'renderOrder', objectRenderOrder.getValue()));

			}*/

			if (object.castShadow !== undefined && object.castShadow !== objectCastShadow.getValue()) {

				editor.execute(new SetValueCommand(editor, object, 'castShadow', objectCastShadow.getValue()));

			}

			if (object.receiveShadow !== undefined && object.receiveShadow !== objectReceiveShadow.getValue()) {

				if (object.material !== undefined) object.material.needsUpdate = true;
				editor.execute(new SetValueCommand(editor, object, 'receiveShadow', objectReceiveShadow.getValue()));

			}

			if (object.shadow !== undefined) {

				if (object.shadow.radius !== objectShadowRadius.getValue()) {

					editor.execute(new SetValueCommand(editor, object.shadow, 'radius', objectShadowRadius.getValue()));

				}

			}

			try {

				var userData = JSON.parse(objectUserData.getValue());
				if (JSON.stringify(object.userData) != JSON.stringify(userData)) {

					editor.execute(new SetValueCommand(editor, object, 'userData', userData));

				}

			} catch (exception) {

				console.warn(exception);

			}





		}

	}

	function updateMeta(object) {
		meta_container.clear()
		if (object.meta_data !== undefined) {
			for (var key in object.meta_data) {
				var val = object.meta_data[key];
				meta_container.add(new UIText(key).setWidth('80px'));
				meta_container.add(new UIText(val).setFontSize('12px'));
				meta_container.add(new UIBreak());
			}
		}

	}

	function updateRows(object) {

		var properties = {
			'fov': objectFovRow,
			'left': objectLeftRow,
			'right': objectRightRow,
			'top': objectTopRow,
			'bottom': objectBottomRow,
			'near': objectNearRow,
			'far': objectFarRow,
			'intensity': objectIntensityRow,
			'color': objectColorRow,
			'groundColor': objectGroundColorRow,
			'distance': objectDistanceRow,
			'angle': objectAngleRow,
			'penumbra': objectPenumbraRow,
			'decay': objectDecayRow,
			'castShadow': objectShadowRow,
			'receiveShadow': objectReceiveShadow,
			'shadow': objectShadowRadius
		};

		for (var property in properties) {

			properties[property].setDisplay(object[property] !== undefined ? '' : 'none');

		}

	}

	function updateTransformRows(object) {

		if (object.isLight ||
			(object.isObject3D && object.userData.targetInverse)) {

			objectRotationRow.setDisplay('none');
			objectScaleRow.setDisplay('none');

		} else {

			objectRotationRow.setDisplay('');
			objectScaleRow.setDisplay('');

		}

	}

	// events

	signals.objectSelected.add(function (object) {

		if (object !== null) {

			container.setDisplay('block');

			updateRows(object);
			updateUI(object);

		} else {

			container.setDisplay('none');

		}

	});

	signals.objectChanged.add(function (object) {

		if (object !== editor.selected) return;

		updateUI(object);

	});

	signals.refreshSidebarObject3D.add(function (object) {

		if (object !== editor.selected) return;

		updateUI(object);

	});



	function updateUI(object) {


		objectType.setValue(object.type);

		objectUUID.setValue(object.uuid);
		objectName.setValue(object.name);

		objectPositionX.setValue(object.position.x);
		objectPositionY.setValue(object.position.y);
		objectPositionZ.setValue(object.position.z);

		objectRotationX.setValue(object.rotation.x * THREE.MathUtils.RAD2DEG);
		objectRotationY.setValue(object.rotation.y * THREE.MathUtils.RAD2DEG);
		objectRotationZ.setValue(object.rotation.z * THREE.MathUtils.RAD2DEG);

		objectScaleX.setValue(object.scale.x);
		objectScaleY.setValue(object.scale.y);
		objectScaleZ.setValue(object.scale.z);

		if (object.fov !== undefined) {

			objectFov.setValue(object.fov);

		}

		if (object.left !== undefined) {

			objectLeft.setValue(object.left);

		}

		if (object.right !== undefined) {

			objectRight.setValue(object.right);

		}

		if (object.top !== undefined) {

			objectTop.setValue(object.top);

		}

		if (object.bottom !== undefined) {

			objectBottom.setValue(object.bottom);

		}

		if (object.near !== undefined) {

			objectNear.setValue(object.near);

		}

		if (object.far !== undefined) {

			objectFar.setValue(object.far);

		}

		if (object.intensity !== undefined) {

			objectIntensity.setValue(object.intensity);

		}

		if (object.color !== undefined) {

			objectColor.setHexValue(object.color.getHexString());

		}

		if (object.groundColor !== undefined) {

			objectGroundColor.setHexValue(object.groundColor.getHexString());

		}

		if (object.distance !== undefined) {

			objectDistance.setValue(object.distance);

		}

		if (object.angle !== undefined) {

			objectAngle.setValue(object.angle);

		}

		if (object.penumbra !== undefined) {

			objectPenumbra.setValue(object.penumbra);

		}

		if (object.decay !== undefined) {

			objectDecay.setValue(object.decay);

		}


		if (object.castShadow !== undefined) {

			objectCastShadow.setValue(object.castShadow);

		}


		if (object.receiveShadow !== undefined) {

			objectReceiveShadow.setValue(object.receiveShadow);

		}

		if (object.shadow !== undefined) {

			objectShadowRadius.setValue(object.shadow.radius);

		}

		objectVisible.setValue(object.visible);
		objectFrustumCulled.setValue(object.frustumCulled);
		objectRenderOrder.setValue(object.renderOrder);

		try {

			objectUserData.setValue(JSON.stringify(object.userData, null, '  '));

		} catch (error) {

			console.log(error);

		}

		objectUserData.setBorderColor('transparent');
		objectUserData.setBackgroundColor('');

		updateTransformRows(object);

		updateMeta(object);

		//update object layers
		for (var i = 0; i < 5; i += 1) {
			var layers = new THREE.Layers();
			layers.set(i);

			layer_checkboxes[i].setValue(false);
			if ((object.layers.mask & layers.mask)) {

				layer_checkboxes[i].setValue(true);

			}
		}

	}

	return container;

};

export { SidebarObject };
