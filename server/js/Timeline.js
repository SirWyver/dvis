/**
 * @author mrdoob / http://mrdoob.com/
 */

import { UIPanel, UIDiv, UIButton, UINumber } from './libs/ui.js';
import { TimelineAnimations } from './TimelineAnimations.js'

function Timeline(editor) {

	var signals = editor.signals;

	var container = new UIDiv();
	container.setId('timeline');

	// timeline

	var keysDown = {};
	document.addEventListener('keydown', function (event) { keysDown[event.keyCode] = true; });
	document.addEventListener('keyup', function (event) { keysDown[event.keyCode] = false; });

	var scale = 10;
	var prevScale = scale;

	var timeline = new UIPanel();
	timeline.setPosition('absolute');
	timeline.setTop('0px');
	timeline.setBottom('0px');
	timeline.setWidth('100%');
	timeline.setOverflow('hidden');
	timeline.setLeft('0%');

	timeline.dom.addEventListener('wheel', function (event) {

		if (event.altKey === true) {
			console.log('scale');
			event.preventDefault();

			scale = Math.max(2, scale + (event.deltaY / 10));

			signals.timelineScaled.dispatch(scale);

		}

	});

	container.add(timeline);

	var canvas = document.createElement('canvas');
	canvas.height = 32;
	canvas.style.position = 'absolute';
	//canvas.style.left = "100px";

	canvas.addEventListener('mousedown', function (event) {

		event.preventDefault();

		function onMouseMove(event) {
			var pframe = (event.offsetX + scroller.scrollLeft) / scale;
			editor.pframe = pframe;
			signals.pframeChanged.dispatch();
			//editor.setTime((event.offsetX + scroller.scrollLeft) / scale);

		}

		function onMouseUp(event) {

			onMouseMove(event);

			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);

		}

		document.addEventListener('mousemove', onMouseMove, false);
		document.addEventListener('mouseup', onMouseUp, false);

	}, false);

	timeline.dom.appendChild(canvas);

	function updateMarks() {

		canvas.width = scroller.clientWidth;

		var context = canvas.getContext('2d', { alpha: false });

		context.fillStyle = '#555';
		context.fillRect(0, 0, canvas.width, canvas.height);

		context.strokeStyle = '#888';
		context.beginPath();

		context.translate(- scroller.scrollLeft, 0);

		var duration = editor.duration;
		var width = duration * scale;
		var scale4 = scale / 4;

		for (var i = 0.5; i <= width; i += scale) {

			context.moveTo(i + (scale4 * 0), 18); context.lineTo(i + (scale4 * 0), 26);

			if (scale > 16) context.moveTo(i + (scale4 * 1), 22), context.lineTo(i + (scale4 * 1), 26);
			if (scale > 8) context.moveTo(i + (scale4 * 2), 22), context.lineTo(i + (scale4 * 2), 26);
			if (scale > 16) context.moveTo(i + (scale4 * 3), 22), context.lineTo(i + (scale4 * 3), 26);

		}

		context.stroke();

		context.font = '10px Arial';
		context.fillStyle = '#888'
		context.textAlign = 'center';

		var step = Math.max(1, Math.floor(64 / scale));

		for (var i = 0; i < duration; i += step) {

			var text = i + '';

			context.fillText(text, i * scale, 13);

		}

	}

	var scroller = document.createElement('div');
	scroller.style.position = 'absolute';
	scroller.style.top = '32px';
	scroller.style.bottom = '0px';
	scroller.style.width = '100%';
	scroller.style.overflow = 'auto';
	scroller.style.left = "0px";
	scroller.addEventListener('scroll', function (event) {
		updateMarks();
		updateTimeMark();

	}, false);
	timeline.dom.appendChild(scroller);

	var elements = new TimelineAnimations(editor);
	scroller.appendChild(elements.dom);

	function updateContainers() {
		var width = editor.duration * scale;
		elements.setWidth(width + 'px');
	}

	//

	var timeMark = document.createElement('div');
	timeMark.style.position = 'absolute';
	timeMark.style.top = '0px';
	timeMark.style.left = '-8px';
	timeMark.style.width = '16px';
	timeMark.style.height = '100%';
	timeMark.style.background = 'linear-gradient(90deg, transparent 8px, #f00 8px, #f00 9px, transparent 9px) 0% 0% / 16px 16px repeat-y';
	timeMark.style.pointerEvents = 'none';
	timeMark.style.marginTop = '16px';
	timeMark.appendChild(createTimeMarkImage());
	timeline.dom.appendChild(timeMark);

	function createTimeMarkImage() {

		var canvas = document.createElement('canvas');
		canvas.width = 16;
		canvas.height = 16;

		var context = canvas.getContext('2d');
		context.fillStyle = '#f00';
		context.beginPath();
		context.moveTo(2, 0);
		context.lineTo(14, 0);
		context.lineTo(14, 10);
		context.lineTo(8, 16);
		context.lineTo(2, 10);
		context.lineTo(2, 0);
		context.fill();

		return canvas;

	}

	function updateTimeMark() {

		var offsetLeft = (editor.pframe * scale) - 8;
		//console.log(offsetLeft);
		timeMark.style.left = offsetLeft + 'px';

		/*
		if ( editor.player.isPlaying ) {
			var timelineWidth = timeline.dom.offsetWidth - 8;
			// Auto-scroll if end is reached
			if ( offsetLeft > timelineWidth ) {
				scroller.scrollLeft += timelineWidth;
			}
		}
		
		// TODO Optimise this	
		var loop = player.getLoop();
		
		if (Array.isArray(loop)) {
		
			var loopStart = loop[0] * scale;
			var loopEnd = loop[1] * scale;
		
			loopMark.style.display = '';
			loopMark.style.left = (loopStart - scroller.scrollLeft) + 'px';
			loopMark.style.width = (loopEnd - loopStart) + 'px';
		
		} else {
		
			loopMark.style.display = 'none';
		
		}
		*/

	}
	/*
	// signals
		
	signals.timeChanged.add( function () {
		
		updateTimeMark();
		
	} );
		
	*/
	signals.pframeChanged.add(updateTimeMark)
	signals.timelineScaled.add(function (value) {

		scale = value;

		scroller.scrollLeft = (scroller.scrollLeft * value) / prevScale;

		updateMarks();
		updateTimeMark();
		updateContainers();

		prevScale = value;

	});

	signals.windowResized.add(function () {

		updateMarks();
		updateContainers();

	});

	return container;

}

export { Timeline };