/**
 * @author mrdoob / http://mrdoob.com/
 */

var Config = function () {

	var name = 'threejs-editor';
	var port = 5001;

	var storage = {
		'language': 'en',
		'exportPrecision': 6,

		'autosave': true,

		'project/title': '',
		'project/editable': false,
		'project/vr': false,

		'project/renderer/antialias': false,
		'project/renderer/shadows': false,
		'project/renderer/shadowType': 1, // PCF
		'project/renderer/physicallyCorrectLights': false,
		'project/renderer/toneMapping': 1, // linear
		'project/renderer/toneMappingExposure': 1,
		'project/renderer/toneMappingWhitePoint': 1,

		'settings/history': false,

		'settings/shortcuts/translate': 'w',
		'settings/shortcuts/rotate': 'e',
		'settings/shortcuts/scale': 'r',
		'settings/shortcuts/undo': 'z',
		'settings/shortcuts/focus': 'f',
		'settings/shortcuts/toggleVisible': 'v',
		//set layers
		'settings/shortcuts/onlyLayer0': '0',
		'settings/shortcuts/onlyLayer1': '1',
		'settings/shortcuts/onlyLayer2': '2',
		'settings/shortcuts/onlyLayer3': '3',
		'settings/shortcuts/onlyLayer4': '4',
		'settings/shortcuts/onlyLayer5': '5',

		'settings/shortcuts/toggleLayer0': ')',
		'settings/shortcuts/toggleLayer1': '!',
		'settings/shortcuts/toggleLayer2': '@',
		'settings/shortcuts/toggleLayer3': '#',
		'settings/shortcuts/toggleLayer4': '$',
		'settings/shortcuts/toggleLayer5': '%',
		//set keyframes
		'settings/shortcuts/nextCframe': 'n',
		'settings/shortcuts/previousCframe': 'b',
		'settings/shortcuts/nextPframe': '.',
		'settings/shortcuts/previousPframe': ',',

		'settings/shortcuts/setKeyframeTrack': 'k',
		'settings/shortcuts/setCameraKeyframe': 'c',
		'settings/shortcuts/switchCamera': 't',
		//'settings/shortcuts/requestICP': 'i',
		'settings/shortcuts/deleteKeyframeTrack': 'j',
		// hot reload
		//'settings/shortcuts/requestPC': 'h',
		//some sugar
		'settings/shortcuts/toggleGridAxes': 'g',
		'settings/shortcuts/takeScreenshot': 'p',
		'settings/shortcuts/takeLocalScreenshot': '[',
	};

	if (window.localStorage[name] === undefined) {

		window.localStorage[name] = JSON.stringify(storage);

	} else {

		var data = JSON.parse(window.localStorage[name]);

		for (var key in data) {

			storage[key] = data[key];

		}

	}

	return {

		getKey: function (key) {

			return storage[key];

		},

		setKey: function () { // key, value, key, value ...

			for (var i = 0, l = arguments.length; i < l; i += 2) {

				storage[arguments[i]] = arguments[i + 1];

			}

			window.localStorage[name] = JSON.stringify(storage);

			console.log('[' + /\d\d\:\d\d\:\d\d/.exec(new Date())[0] + ']', 'Saved config to LocalStorage.');

		},

		clear: function () {

			delete window.localStorage[name];

		}

	};

};

export { Config };
