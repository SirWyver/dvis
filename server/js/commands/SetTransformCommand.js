/**
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 */

import { Command } from '../Command.js';

import * as THREE from '../../../build/three.module.js';

/**
 * @param editor Editor
 * @param object THREE.Object3D
 * @param newTransform THREE.Matrix4
 * @param optionalOldTransform THREE.Matrix4
 * @constructor
 */
var SetTransformCommand = function ( editor, object, newTransform, optionalOldTransform ) {

	Command.call( this, editor );

	this.type = 'SetTransformCommand';
	this.name = 'Set Transform';
	this.updatable = true;

	this.object = object;

	if ( object !== undefined && newTransform !== undefined ) {

		this.oldTransform = object.matrix.clone();
		this.newTransform = newTransform.clone();

	}

	if ( optionalOldTransform !== undefined ) {

		this.oldTransform = optionalOldTransform.clone();

	}

};
SetTransformCommand.prototype = {

	execute: function () {	
		this.object.applyMatrix4(new THREE.Matrix4().getInverse(this.object.matrix));
		this.object.applyMatrix4( this.newTransform );
		this.object.updateMatrixWorld( true );
		this.editor.signals.objectChanged.dispatch( this.object );

	},

	undo: function () {
		this.object.applyMatrix4(new THREE.Matrix4().getInverse(this.object.matrix));
		this.object.applyMatrix4( this.oldTransform );
		this.object.updateMatrixWorld( true );
		this.editor.signals.objectChanged.dispatch( this.object );

	},

	update: function ( command ) {

		this.newTransform.copy( command.newTransform );

	},

	toJSON: function () {

		var output = Command.prototype.toJSON.call( this );

		output.objectUuid = this.object.uuid;
		output.oldTransform = this.oldTransform.toArray();
		output.newTransform = this.newTransform.toArray();

		return output;

	},

	fromJSON: function ( json ) {

		Command.prototype.fromJSON.call( this, json );

		this.object = this.editor.objectByUuid( json.objectUuid );
		this.oldTransform = new THREE.Vector3().fromArray( json.oldTransform );
		this.newTransform = new THREE.Vector3().fromArray( json.newTransform );

	}

};

export { SetTransformCommand };
