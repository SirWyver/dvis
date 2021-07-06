import { UIPanel } from './libs/ui.js';
import { KeyframeTrack } from './KeyframeTrack.js';
import * as THREE from '../../build/three.module.js';
import { DVisAddCamera } from './DVis.js';

var Animator = function (editor) {
	var editor = editor;
	var signals = editor.signals;
	var tracks = {};



	var container = new UIPanel();
	container.setId('player');
	container.setPosition('absolute');
	container.setDisplay('none');


	signals.requestPC.add(function () {
		editor.requestPC();
	})

	signals.requestICP.add(function () {
		editor.requestICP();
	});

	signals.receiveICP.add(function (icp_dict) {
		editor.receiveICP(icp_dict);
	});

	signals.onClearAnimator.add(function () {
		clear();
	});

	signals.setCameraKeyframe.add(function () {

		// does object already have a track?
		var rend_cam_name = 'RenderCamera';
		if (tracks[rend_cam_name] === undefined) {
			//generate track
			DVisAddCamera(50, 16 / 9, 0.01, 10000, rend_cam_name);
			// DOES IT SYNC????

			var rend_cam = editor.scene.getObjectByName(rend_cam_name);
			var track = KeyframeTrack.fromObject(rend_cam);
			tracks[track.name] = track;
		}
		var kf = getKeyframe();
		tracks[rend_cam_name].updateKF(kf, editor.camera);
	});

	signals.updateSelectedObjectKF.add(function () {
		var kf = updateTrackByObject(editor.selected);
		editor.addKeyframes([kf]);
	});
	signals.deleteSelectedObjectTrack.add(function () {
		deleteSelectedObjectTrack(editor.selected);
	});
	signals.deleteSelectedObjectKF.add(function () {
		deleteKFByObject(editor.selected);
	});
	signals.exportTracks.add(function () {
		for (var track_name in tracks) {
			var track = tracks[track_name];
			track.computeInterpolation();
			var path = editor.storage_root + '/' + editor.track_store_path.replace('{title}', editor.title).replace('{suffix}', editor.suffix).replace('{name}', track.name);
			fetch('http://localhost:5001/store_object_track', { method: 'POST', body: JSON.stringify({ 'track': track, 'path': path }) })

		}
	})

	signals.exportSelectedObjectTrack.add(function () {
		var track = tracks[editor.selected.name];
		track.computeInterpolation();
		var path = editor.storage_root + '/' + editor.track_store_path.replace('{title}', editor.title).replace('{suffix}', editor.suffix).replace('{name}', track.name);

		fetch('http://localhost:5001/store_object_track', { method: 'POST', body: JSON.stringify({ 'track': track, 'path': path }) })
	});

	signals.insertTrack.add(function (loaded_track) {
		insertTrack(loaded_track);
	})
	signals.insertTrackDict.add(function (track_dict) {
		insertTrackDict(track_dict);
	})
	signals.setObjectKFState.add(function (obj_kf_state) {
		setObjectTrackAtKeyFrame(obj_kf_state['name'], obj_kf_state['kf'], obj_kf_state['trs'], obj_kf_state['visible']);
	})

	signals.pframeChanged.add(function () {
		for (var track_name in tracks) {
			var track = tracks[track_name];
			var obj = editor.scene.getObjectByName(track.name);
			if (obj === undefined) {
				continue
			}
			obj.has_track = true;

			var inter_data = track.getInterpolatedData(editor.pframe);


			editor.scene.autoUpdate = false;
			object.matrixAutoUpdate = false;
			if (inter_data.visible !== undefined) {
				obj.visible = inter_data.visible;
			}
			if (inter_data.trs !== undefined) {

				obj.applyMatrix4(new THREE.Matrix4().getInverse(obj.matrix));
				obj.applyMatrix4(inter_data.trs);
			}
			signals.refreshSidebarObject3D.dispatch(obj);
		}
		signals.rendererUpdated.dispatch();

	});

	function clear() {
		tracks = {};
	}


	function insertTrack(loaded_track) {
		tracks[loaded_track['name']] = KeyframeTrack.fromJSON(loaded_track);
		editor.addKeyframes(Object.keys(tracks[loaded_track['name']].data));
	};

	function insertTrackDict(loaded_track) {
		var obj_name = loaded_track['name'];
		var obj = editor.scene.getObjectByName(obj_name);
		if (obj === undefined) {
			console.log('Object ' + obj_name + ' not found! Cannot create track')
		}
		else {
			tracks[obj_name] = KeyframeTrack.fromDict(loaded_track);
			var obj_kfs = Object.keys(tracks[obj_name].data);
			var obj_kfs_int = [];
			for (var k = 0; k < obj_kfs.length; k++) {
				obj_kfs_int.push(parseInt(obj_kfs[k]));
			}
			obj.keyframes = obj_kfs_int;
			editor.addKeyframes(obj_kfs_int);
		}

	};

	function setObjectTrackAtKeyFrame(obj_name, kf, trs, visible) {
		editor.addKeyframes([kf]);
		var obj = editor.scene.getObjectByName(obj_name);
		if (obj === undefined) {
			console.error("Object with name" + obj_name + " not found!");
		}
		var bytes = Uint8Array.from(atob(trs), c => c.charCodeAt(0))
		var data_arr = new Float32Array(bytes.buffer);
		trs = (new THREE.Matrix4().fromArray(data_arr)).transpose();

		if (tracks[obj.name] === undefined) {
			//generate track
			var track = KeyframeTrack.fromObject(obj);
			tracks[obj_name] = track;
		}

		tracks[obj_name].setKF(kf, trs, visible);
	};


	function updateTrackByObject(obj) {
		// does object already have a track?
		if (tracks[obj.name] === undefined) {
			//generate track
			var track = KeyframeTrack.fromObject(obj);
			tracks[track.name] = track;
		}
		var kf = getKeyframe();
		tracks[obj.name].updateKF(kf, obj);
		return kf;


	};
	function deleteKFByObject(obj) {
		if (tracks[obj.name] != undefined) {
			var kf = getKeyframe();
			tracks[obj.name].deleteKF(kf, obj);
		}
	};
	function deleteTrackByObject(obj) {
		if (tracks[obj.name] !== undefined) {
			delete tracks[obj.name];
		}
	};
	function getKeyframe() {
		return editor.pframe;
	};
	return container;
}

export { Animator };
