import * as THREE from '../../build/three.module.js';
import { AddObjectCommand } from './commands/AddObjectCommand.js';
import { OBJLoader } from '../../examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from '../../examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader2 } from '../../examples/jsm/loaders/OBJLoader2.js';
import { Animator } from './Animator.js';
import { setVisible } from './libs/ui.js';
import { BufferGeometryUtils } from '../../examples/jsm/utils/BufferGeometryUtils.js'
import SpriteText from './libs/three-spritetext.js';

function get_color(color_code) {
    var color_palette = [
        [23, 23, 252],
        [174, 199, 232], // wall
        [152, 223, 138], // floor
        [31, 119, 180], // cabinet
        [255, 187, 120], // bed
        [188, 189, 34], // chair
        [140, 86, 75], // sofa
        [255, 152, 150], // table
        [214, 39, 40], // door
        [197, 176, 213], // window
        [148, 103, 189], // bookshelf
        [196, 156, 148], // picture
        [23, 190, 207], // counter
        [178, 76, 76],
        [247, 182, 210], // desk
        [66, 188, 102],
        [219, 219, 141], // curtain
        [140, 57, 197],
        [202, 185, 52],
        [51, 176, 203],
        [200, 54, 131],
        [92, 193, 61],
        [78, 71, 183],
        [172, 114, 82],
        [255, 127, 14], // refrigerator
        [91, 163, 138],
        [153, 98, 156],
        [140, 153, 101],
        [158, 218, 229], // shower curtain
        [100, 125, 154],
        [178, 127, 135],
        [120, 185, 128],
        [146, 111, 194],
        [44, 160, 44], // toilet
        [112, 128, 144], // sink
        [96, 207, 209],
        [227, 119, 194], // bathtub
        [213, 92, 176],
        [94, 106, 211],
        [82, 84, 163], // otherfurn
        [100, 85, 144],
    ]

    if (color_code < 0) {
        color_palette = (
            [
                [255, 5, 5],  // red
                [5, 255, 5],  // green
                [5, 5, 255],  // blue
                [255, 255, 255],  // white
                [0, 0, 0],  // black
                [255, 155, 0],  // orange
                [255, 255, 0],  // yellow
                [155, 0, 255],  // purple
            ]
        )
        color_code = -color_code - 1;

    }
    for (var i = 0; i < color_palette.length; i++) {
        color_palette[i] = [color_palette[i][0] / 255, color_palette[i][1] / 255, color_palette[i][2] / 255]
    }
    return color_palette[color_code % color_palette.length]
}


function _generate_voxel_mesh(data_arr, col_size, vox_size = 1, color = [0.3, 0.2, 0.5], shape = 'v') {
    var row_size = data_arr.length / col_size;
    if (shape === 'v') {
        var geo = new THREE.BoxBufferGeometry(vox_size * 0.95, vox_size * 0.95, vox_size * 0.95);
        geo = geo.toNonIndexed();
    }
    else if (shape === 'b') {
        var geo = new THREE.SphereGeometry(0.99 * vox_size / 2, 16, 16);
    }

    geo.computeBoundingBox();

    var minX = 1000, minY = 1000, minZ = 1000, maxX = -1000, maxY = -1000, maxZ = -1000;
    var x, y, z;
    /*
    var nice_material = new THREE.MeshStandardMaterial({
        metalness: 0.9,
        roughness: 0.0,
        envMapIntensity: 1.0,
        opacity: 0.99,
        transparent: true,

    });
    */
    var nice_material = new THREE.MeshLambertMaterial({
        //metalness: 0.9,
        //roughness: 0.0,
        //envMapIntensity: 1.0,
        opacity: 1.0,
        transparent: true,

    });
    var inst_mesh = new THREE.InstancedMesh(geo, nice_material, row_size);

    for (var i = 0; i < row_size; i++) {

        x = data_arr[i * col_size + 0];
        y = data_arr[i * col_size + 1];
        z = data_arr[i * col_size + 2];
        minX = Math.min(x, minX);
        minY = Math.min(y, minY);
        minZ = Math.min(z, minZ);
        maxX = Math.max(x, maxX);
        maxY = Math.max(y, maxY);
        maxZ = Math.max(z, maxZ);

        if (col_size == 7) {
            inst_mesh.setColorAt(i, new THREE.Color(data_arr[i * col_size + 3], data_arr[i * col_size + 4], data_arr[i * col_size + 5]));
            inst_mesh.setVisibleAt(i, new THREE.Color(data_arr[i * col_size + 6], 1.0, 1.0));
        }
        else {
            if (col_size == 6) {
                inst_mesh.setColorAt(i, new THREE.Color(data_arr[i * col_size + 3], data_arr[i * col_size + 4], data_arr[i * col_size + 5]));
            }
            else {
                inst_mesh.setColorAt(i, new THREE.Color(color[0], color[1], color[2]));
            }
        }
        var mat = new THREE.Matrix4().setPosition(x, y, z);
        inst_mesh.setMatrixAt(i, mat);

    }


    // inst_mesh.instanceVisible = inst_mesh.instanceColor;
    // console.log(inst_mesh.instanceVisible)
    if (inst_mesh.instanceVisible !== null)
        inst_mesh.instanceVisible.needsUpdate = true;

    inst_mesh.frustumCulled = false;

    inst_mesh.frustumCulled = false;
    inst_mesh.extends = [minX, minY, minZ, maxX, maxY, maxZ];
    return inst_mesh;

}
var DVisUpdateMesh = function update_mesh(mesh) {
    for (let i = 0; i < mesh.instanceVisible.count; i++) {
        if (mesh.instanceVisible.getX(i) <= mesh.min_value) {
            mesh.setVisibleMaskAt(i, 0.0);
        }
        else {
            mesh.setVisibleMaskAt(i, 1.0);
        }
    }
    mesh.instanceVisible.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;

}

function _generate_voxel_mesh2(data_arr, col_size, vox_size = 1, color = [0.3, 0.2, 0.5], shape = 'v') {
    var row_size = data_arr.length / col_size;
    const geometry = new THREE.BufferGeometry();
    var x, y, z;

    const positions = [];
    const colors = [];
    const t_color = new THREE.Color();
    for (var i = 0; i < row_size; i++) {
        x = data_arr[i * col_size + 0];
        y = data_arr[i * col_size + 1];
        z = data_arr[i * col_size + 2];
        positions.push(x, y, z);
        t_color.setRGB(color[0], color[1], color[2]);
        colors.push(t_color.r, t_color.g, t_color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    geometry.computeBoundingSphere();


    const material = new THREE.PointsMaterial({ size: vox_size, vertexColors: true });
    var points = new THREE.Points(geometry, material);
    return points;
}
function _generate_text(text, position = [0, 0, 0], size = 1.0, color = [0.3, 0.3, 0.5]) {
    const ContainerText = new SpriteText(text, 8);
    ContainerText.color = new THREE.Color(color[0], color[1], color[2]); // "rbg(" + 200 + ',' + 0 + ',' + 0 + ')';
    ContainerText.backgroundColor = 'rgba(0,0,190,0.0)';
    //ContainerText.borderColor = 'lightgrey';
    //ContainerText.borderWidth = 0.5;
    //ContainerText.borderRadius = 3;
    ContainerText.padding = [1, 1];
    ContainerText.scale.set(size, size, 1);
    ContainerText.position.set(position[0], position[1], position[2]);
    return ContainerText;
}



function _generate_inst_hbboxes(data_arr, col_size, color = [0.3, 0.2, 0.5, 1]) {
    // data_arr = (x,y,z,w,l,h,alpha[,c])
    var row_size = data_arr.length / col_size;
    var geo = new THREE.BoxBufferGeometry(1, 1, 1);
    var geo_arrow = new THREE.BoxBufferGeometry(0.1, 0.2, 0.1);
    geo_arrow.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -(0.5 + 0.1), 0,))
    var geo = BufferGeometryUtils.mergeBufferGeometries([geo, geo_arrow]);
    geo = geo.toNonIndexed();
    geo.computeBoundingBox();
    var nice_material = new THREE.MeshLambertMaterial({
        //opacity: color[3],
        //transparent: true,
    });
    //editor.scene.add(new THREE.Mesh(geo, nice_material));
    var inst_mesh = new THREE.InstancedMesh(geo, nice_material, row_size);

    for (var i = 0; i < row_size; i++) {
        var x = data_arr[i * col_size + 0];
        var y = data_arr[i * col_size + 1];
        var z = data_arr[i * col_size + 2];
        var w = data_arr[i * col_size + 3];
        var l = data_arr[i * col_size + 4];
        var h = data_arr[i * col_size + 5];
        var a = -data_arr[i * col_size + 6];

        if (col_size == 8) {
            var color_code = data_arr[i * col_size + 7];
            var inst_color = get_color(color_code);
            inst_mesh.setColorAt(i, new THREE.Color(inst_color[0], inst_color[1], inst_color[2]));
        }
        else {
            inst_mesh.setColorAt(i, new THREE.Color(color[0], color[1], color[2]));
        }
        var trans_mat = (new THREE.Matrix4().makeTranslation(x, y, z)).multiply((new THREE.Matrix4().makeRotationZ(a)).multiply(new THREE.Matrix4().makeScale(w, l, h)));
        inst_mesh.setMatrixAt(i, trans_mat);
    }
    inst_mesh.frustumCulled = false;

    return inst_mesh;

}

function _generate_bbox(bbox, line_width, color) {
    var color = new THREE.Color(color[0], color[1], color[2]);
    console.log([bbox[3] - bbox[0], bbox[4] - bbox[1], bbox[5] - bbox[2]]);
    var geometry = new THREE.BoxBufferGeometry(bbox[3] - bbox[0], bbox[4] - bbox[1], bbox[5] - bbox[2]);

    var edges = new THREE.EdgesGeometry(geometry);
    var line_mat = new THREE.LineBasicMaterial({ color: color, linewidth: line_width * 2 });
    var line = new THREE.LineSegments(edges, line_mat);
    //line.setPosition = [(bbox[3] + bbox[0]) / 2, (bbox[4] + bbox[1]) / 2, (bbox[5] + bbox[2]) / 2];
    console.log([(bbox[3] + bbox[0]) / 2, (bbox[4] + bbox[1]) / 2, (bbox[5] + bbox[2]) / 2]);
    line.position.set((bbox[3] + bbox[0]) / 2, (bbox[4] + bbox[1]) / 2, (bbox[5] + bbox[2]) / 2);
    return line;
}

function _generate_bbox_from_corners(corners, line_width, color) {
    var color = new THREE.Color(color[0], color[1], color[2]);
    var geometry = new THREE.Geometry();
    var edges = [[0, 1], [0, 2], [1, 3], [2, 3], [0, 4], [4, 5], [4, 6], [5, 7], [6, 7], [1, 5], [2, 6], [3, 7]];
    for (var j = 0; j < 12; j++) {
        var index = edges[j][0];
        geometry.vertices.push(new THREE.Vector3(corners[3 * index], corners[3 * index + 1], corners[3 * index + 2]));
        index = edges[j][1];
        geometry.vertices.push(new THREE.Vector3(corners[3 * index], corners[3 * index + 1], corners[3 * index + 2]));
    }

    var line_mat = new THREE.LineBasicMaterial({ color: color, linewidth: line_width * 2 });
    var line = new THREE.LineSegments(geometry, line_mat);

    return line;
}

function _generate_hbbox(hbbox, line_width, color, filled = false) {
    var color3 = new THREE.Color(color[0], color[1], color[2]);
    var trans_mat = (new THREE.Matrix4().makeTranslation(hbbox[0], hbbox[1], hbbox[2])).multiply((new THREE.Matrix4().makeRotationZ(hbbox[6])).multiply(new THREE.Matrix4().makeScale(hbbox[3], hbbox[4], hbbox[5])));
    var geometry = new THREE.BoxBufferGeometry(1, 1, 1);

    if (filled) {
        var box_mat = new THREE.MeshPhongMaterial({ color: color3, opacity: color[3], transparent: true });
        geometry.applyMatrix4(trans_mat);
        return new THREE.Mesh(geometry, box_mat);
    }

    var edges = new THREE.EdgesGeometry(geometry);
    var line_mat = new THREE.LineBasicMaterial({ color: color3, linewidth: line_width * 2 });
    var line = new THREE.LineSegments(edges, line_mat);

    line.applyMatrix4(trans_mat)
    return line;
}


function _generate_transform(transform, line_width) {
    var transform_mesh = new THREE.AxesHelper(line_width * 10);
    transform_mesh.material.linewidth = line_width * 10;

    var transform_matrix = new THREE.Matrix4();
    transform_matrix.fromArray(transform)
    //rot.scale(new THREE.Vector3(5, 5, 5));
    transform_mesh.applyMatrix4(transform_matrix.transpose());
    return transform_mesh;
}

function _generate_line(points, line_width, color) {
    var color = new THREE.Color(color[0], color[1], color[2]);
    var geometry = new THREE.Geometry();
    for (var j = 0; j < (points.length / 3 - 1); j++) {
        geometry.vertices.push(new THREE.Vector3(points[3 * j + 0], points[3 * j + 1], points[3 * j + 2]));
        geometry.vertices.push(new THREE.Vector3(points[3 * (j + 1) + 0], points[3 * (j + 1) + 1], points[3 * (j + 1) + 2]));

    }
    var line_mat = new THREE.LineBasicMaterial({ color: color, linewidth: line_width * 2 });
    var line = new THREE.LineSegments(geometry, line_mat);
    return line;
    var points_vec = [];
    for (var j = 0; j < (points.length / 3 - 1); j++) {
        points_vec.push(new THREE.Vector3(points[3 * j + 0], points[3 * j + 1], points[3 * j + 2]));
        points_vec.push(new THREE.Vector3(points[3 * (j + 1) + 0], points[3 * (j + 1) + 1], points[3 * (j + 1) + 2]));
    }
    // const curve = new THREE.CatmullRomCurve3(points_vec, false, 'catmullrom', 0.0001);

    const curve = new THREE.CatmullRomCurve3(points_vec, false);
    const curve_points = curve.getPoints(points_vec.length / 2);
    const geometry2 = new THREE.BufferGeometry().setFromPoints(curve_points);
    const curveObject = new THREE.Line(geometry2, line_mat);
    //return curveObject;




    var nice_material = new THREE.MeshLambertMaterial({
        color: color,
        //roughness: 0.0,
        //envMapIntensity: 1.0,
        opacity: 0.99,
        transparent: true,

    });
    const curve_material = new THREE.MeshBasicMaterial({ color: color });
    const geometry3 = new THREE.TubeGeometry(curve, 20, line_width / 400, 8, false);
    const tube_curve = new THREE.Mesh(geometry3, curve_material);
    return tube_curve;

}

function _generate_vec(positions, color) {
    const start = new THREE.Vector3(positions[0], positions[1], positions[2]);
    var dir = new THREE.Vector3(positions[3], positions[4], positions[5]);
    dir = dir.sub(start);
    const length = dir.length();
    dir.normalize()
    var color = new THREE.Color(color[0], color[1], color[2]);
    const arrowHelper = new THREE.ArrowHelper(dir, start, length, color);
    return arrowHelper;
}

function _generate_vecs(data_arr, size, color) {
    var col_size = 6;
    var row_size = data_arr.length / col_size;
    if (row_size == 1) {
        return _generate_vec(data_arr, color);
    }
    //const geo = new THREE.BufferGeometry();
    var geo = new THREE.BoxBufferGeometry(1, 0.01 * size, 0.01 * size);
    var color3 = new THREE.Color(color[0], color[1], color[2]);
    const material = new THREE.MeshBasicMaterial({ color: color3 });

    var inst_mesh = new THREE.InstancedMesh(geo, material, row_size);
    for (var i = 0; i < row_size; i++) {
        var x = data_arr[i * col_size + 0];
        var y = data_arr[i * col_size + 1];
        var z = data_arr[i * col_size + 2];
        var end_x = data_arr[i * col_size + 3];
        var end_y = data_arr[i * col_size + 4];
        var end_z = data_arr[i * col_size + 5];

        const start = new THREE.Vector3(x, y, z);

        var dir = new THREE.Vector3(end_x, end_y, end_z);
        dir = dir.sub(start);
        var trans_mat = (new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeBasis(dir, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1))).multiply(new THREE.Matrix4().makeTranslation(0.5, 0, 0));
        inst_mesh.setMatrixAt(i, trans_mat);

    }

    return inst_mesh;
}


function _generate_arrow(transform, line_width, color) {
    var transf = new THREE.Matrix4();
    transf.fromArray(transform)
    var color = new THREE.Color(color[0], color[1], color[2]);
    var box_mat = new THREE.MeshPhongMaterial({ color: color });
    var line_geometry = new THREE.BoxGeometry(1, line_width, line_width);
    line_geometry.translate(0.5, 0, 0);

    var translation = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        scale = new THREE.Vector3();

    transf.transpose().decompose(translation, rotation, scale);
    scale.y = 1;
    scale.z = 1;
    var arrow_transf = new THREE.Matrix4().compose(translation, rotation, scale);
    var peak_geometry = new THREE.ConeGeometry(1.0 * line_width, 2.0 * line_width / scale.x, 16);
    peak_geometry.rotateZ(-Math.PI / 2);
    peak_geometry.translate(1 + line_width / scale.x, 0, 0)
    peak_geometry.merge(line_geometry);
    var arrow = new THREE.Mesh(peak_geometry, box_mat);
    arrow.applyMatrix4(arrow_transf);
    return arrow;
}

function generate_object(data, data_format, size = 1, color_code = 1, shape = 'v') {
    var data_arr = data;
    if (!['text', 'mesh'].includes(data_format)) {
        var bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))

        data_arr = new Float32Array(bytes.buffer);
    }
    var color = get_color(color_code);
    if (size == null) {
        size = 1;
    }
    if (data_format == 'xyzrgba') {
        return _generate_voxel_mesh(data_arr, 7, size, color, shape);
    }
    if (data_format == 'xyzrgb') {
        return _generate_voxel_mesh(data_arr, 6, size, color, shape);
    }
    else if (data_format == 'xyz') {
        return _generate_voxel_mesh(data_arr, 3, size, color, shape);
    }
    else if (data_format == 'bbox') {
        return _generate_bbox(data_arr, size, color);
    }
    else if (data_format == 'corners') {
        return _generate_bbox_from_corners(data_arr, size, color);
    }
    else if (data_format == 'transform') {
        return _generate_transform(data_arr, size);
    }
    else if (data_format == 'line') {
        return _generate_line(data_arr, size, color);
    }
    else if (data_format == 'hbbox') {
        return _generate_hbbox(data_arr, size, color, filled = false);
    }
    else if (data_format == 'hbboxes') {
        return _generate_inst_hbboxes(data_arr, 7, color)
    }
    else if (data_format == 'hbboxes_c') {
        return _generate_inst_hbboxes(data_arr, 8, color)
    }
    else if (data_format == 'arrow') {
        return _generate_arrow(data_arr, size, color);
    }
    else if (data_format == 'text') {
        console.log(data);
        return _generate_text(data.text, data.position, size, color)
    }
    else if (data_format == 'vec') {
        return _generate_vecs(data_arr, size, color);
    }
}


var DVisAddMesh = function (data, compression, name, layers = [0], t = [0], meta_data = {}, vis_conf = null) {
    var base64_data = data;
    if (compression == 'glb') {
        var loader = new GLTFLoader();
        loader.load("data:text/plain;base64," + base64_data, function (gltf) {
            console.log('gltf loaded');
            gltf.scene.name = name; gltf.scene.meta_data = meta_data; gltf.scene.key_frames = t;
            if (meta_data != null) {
                gltf.scene.obj_path = meta_data.obj_path;
            }

            editor.execute(new AddObjectCommand(editor, gltf.scene, layers));
        })
    }
    if (compression == 'obj') {
        var loader = new OBJLoader2();
        loader.load("data:," + base64_data, function (obj) {
            console.log('obj loaded');
            obj.name = name; obj.meta_data = meta_data; obj.keyframes = t;
            if (meta_data != null) {
                obj.obj_path = meta_data.obj_path;
            }
            if (t == null) {
                obj.visible = true;
            }

            else {
                var current_keyframes = [];
                for (var j = 0; j < editor.scene.current_cframes.length; j++) {
                    current_keyframes.push(editor.scene.key_frames[editor.scene.current_cframes[j]]);
                }
                obj.visible = obj.keyframes.filter(x => current_keyframes.includes(x)).length > 0;


                if (t.filter(x => !editor.scene.key_frames.includes(x)).length > 0) {
                    editor.addKeyframes(t);
                }
            };


            obj = setVisualConfigs(obj, vis_conf, true);

            editor.execute(new AddObjectCommand(editor, obj, layers))
        })
    }


}



var DVisCmd = function (cmd_data) {
    switch (cmd_data['cmd']) {
        case 'screenshot':

            editor.signals.createScreenshot.dispatch();
            break;
        case 'local_screenshot':
            editor.signals.createLocalScreenshot.dispatch();
            break;
        case 'next_cframe':
            // same as sidebard shortcurts // needs rework
            var cframes = [];
            for (var i = 0; i < editor.scene.current_cframes.length; i++) {
                cframes.push(Math.min(editor.scene.key_frames.length - 1, editor.scene.current_cframes[i] + 1));
            }
            editor.scene.current_cframes = cframes;
            editor.signals.cframeChanged.dispatch()
            break;
        case 'prev_cframe':
            // same as sidebard shortcurts // needs rework
            var cframes = [];
            for (var i = 0; i < editor.scene.current_cframes.length; i++) {
                cframes.push(Math.max(0, editor.scene.current_cframes[i] - 1));
            }
            editor.scene.current_cframes = cframes;
            editor.signals.cframeChanged.dispatch();
            break;
        case 'kf':
            var kf = cmd_data['payload'];
            for (var i = 0; i < editor.scene.key_frames.length; i++) {
                if (editor.scene.key_frames[i] == kf) {
                    editor.scene.current_cframes = [i];
                    editor.signals.cframeChanged.dispatch();
                    break;
                }
            }
            break;
        case 'layers':
            editor.active_layers = cmd_data['payload'];
            editor.changeLayers();
            break;
        case "inject":
            eval(cmd_data['payload'])
            break;
    }

}


function _generate_cam_img(image_str, cam_name, name, s = 1, trs = null) {
    var cam = editor.scene.getObjectByName(cam_name);
    var aspect_ratio = 1.78;
    var fov = 50;
    if (cam === undefined) {
        DVisAddCamera(fov, aspect_ratio, 0.01, 10000, cam_name, trs)
        console.log("Camera created")
    }
    else {
        aspect_ratio = cam.aspect
        fov = cam.fov;
    }
    cam = editor.scene.getObjectByName(cam_name);
    var loader = new THREE.TextureLoader();
    var material = new THREE.MeshBasicMaterial({
        map: loader.load(image_str)
    });
    var geometry = new THREE.PlaneGeometry(s * aspect_ratio, s);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.material.side = THREE.DoubleSide;
    var cam2plane_dist = (s / 2) / Math.tan((fov / 2) * Math.PI / 180);

    mesh.translateZ(-cam2plane_dist)
    mesh.name = cam_name + "/" + name;
    return mesh;
}

function _generate_cam(fov, aspect_ratio, near, far, name, trs = null) {
    if (fov == null) {
        fov = 50.0;
    }
    var camera = new THREE.PerspectiveCamera(fov, aspect_ratio, near, far);
    camera.name = name;
    if (trs != null && trs !== undefined) {
        var bytes = Uint8Array.from(atob(trs), c => c.charCodeAt(0))
        var data_arr = new Float32Array(bytes.buffer);
        var trs_mat = (new THREE.Matrix4().fromArray(data_arr)).transpose();
        camera.applyMatrix4(trs_mat);
    }
    return camera;
}



var DVisAddPayload = function (payload, data_format, size, color_code, name, layers = [0], t = null, meta_data = {}, vis_conf = null, shape = 'v') {
    var payload_obj;
    switch (data_format) {
        case 'cam_img':
            payload_obj = _generate_cam_img(payload.image, payload.cam_name, name, size);
            break;
        case "cam":
            payload_obj = _generate_cam(payload.fov, payload.aspect_ratio, payload.near, payload.far, name, payload.trs)
            break;

    }

    payload_obj.meta_data = meta_data;
    //keyframe handling
    payload_obj.keyframes = t;
    if (t == null) {
        payload_obj.visible = true;
    }
    else {
        var current_keyframes = [];
        for (var j = 0; j < editor.scene.current_cframes.length; j++) {
            current_keyframes.push(editor.scene.key_frames[editor.scene.current_cframes[j]]);
        }
        payload_obj.visible = payload_obj.keyframes.filter(x => current_keyframes.includes(x)).length > 0;

        if (t.filter(x => !editor.scene.key_frames.includes(x)).length > 0) {
            editor.addKeyframes(t);
        }
    }

    payload_obj = setVisualConfigs(payload_obj, vis_conf, false);

    editor.execute(new AddObjectCommand(editor, payload_obj, layers));
}

var DVisAddCameraImage = function (image_str, cam_name, name, t = [0], layers = [0], vs = 1) {
    var cam = editor.scene.getObjectByName(cam_name);
    var aspect_ratio = 1.78;
    var fov = 50;
    if (cam === undefined) {
        DVisAddCamera(fov, aspect_ratio, 0.01, 10000, cam_name)
        console.log("Camera created")
    }
    else {
        aspect_ratio = cam.aspect
        fov = cam.fov;
    }
    cam = editor.scene.getObjectByName(cam_name);

    var loader = new THREE.TextureLoader();
    var material = new THREE.MeshBasicMaterial({
        map: loader.load(image_str)
    });
    var geometry = new THREE.PlaneGeometry(vs * aspect_ratio, vs);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.material.side = THREE.DoubleSide;
    var cam2plane_dist = (vs / 2) / Math.tan((fov / 2) * Math.PI / 180);

    mesh.translateZ(-cam2plane_dist)

    mesh.name = cam_name + "/" + name;
    mesh.keyframes = t;
    mesh.visible = true;

    if (t.filter(x => !editor.scene.key_frames.includes(x)).length > 0) {
        editor.addKeyframes(t);
    }
    editor.execute(new AddObjectCommand(editor, mesh, layers))
    return mesh;
}

var DVisAddCamera = function (fov, aspect_ratio, near, far, name, trs_data = null) {
    if (fov == null) {
        fov = 50.0;
    }
    var camera = new THREE.PerspectiveCamera(fov, aspect_ratio, near, far);
    camera.name = name;
    if (trs_data != null && trs_data !== undefined) {
        var bytes = Uint8Array.from(atob(trs_data), c => c.charCodeAt(0))
        var data_arr = new Float32Array(bytes.buffer);
        var trs = (new THREE.Matrix4().fromArray(data_arr)).transpose();
        camera.applyMatrix4(trs);
    }
    editor.execute(new AddObjectCommand(editor, camera, [0]));
}



var DVisAdd = function (data, data_format, size, color_code, name, layers = [0], t = null, meta_data = {}, vis_conf = null, shape = 'v') {
    if (data_format == 'group')
        var mesh = new THREE.Group();

    else
        var mesh = generate_object(data, data_format, size, color_code, shape);
    mesh.name = name;
    mesh.meta_data = meta_data;
    mesh.data_format == data_format;
    //keyframe handling
    mesh.keyframes = t;
    if (t == null) {
        mesh.visible = true;
    }
    else {
        var current_keyframes = [];
        for (var j = 0; j < editor.scene.current_cframes.length; j++) {
            current_keyframes.push(editor.scene.key_frames[editor.scene.current_cframes[j]]);
        }
        mesh.visible = mesh.keyframes.filter(x => current_keyframes.includes(x)).length > 0;

        if (t.filter(x => !editor.scene.key_frames.includes(x)).length > 0) {
            editor.addKeyframes(t);
        }
    }

    mesh = setVisualConfigs(mesh, vis_conf, false);

    editor.execute(new AddObjectCommand(editor, mesh, layers));

}
var DVisClear = function (reset_cam) {
    editor.clear(reset_cam);
    editor.signals.onClearAnimator.dispatch();
}


var setVisualConfigsSubElement = function (obj, vis_conf, is_mesh) {
    // set some defaults
    obj.castShadow = true;
    if (obj.material !== undefined) {
        obj.material.transparent = true;
        if (is_mesh) {
            // set mesh defaults
            obj.material.side = THREE.DoubleSide;
        }
        else {
            obj.material.side = THREE.DoubleSide;
        }

    }
    else {

    }

    ////
    if (vis_conf !== undefined && vis_conf !== null) {
        if (vis_conf.castShadow !== undefined) {
            obj.castShadow = vis_conf.castShadow;
        };
        if (vis_conf.receiveShadow !== undefined) {
            obj.receiveShadow = vis_conf.receiveShadow;
        }
        // material related
        if (obj.material !== undefined) {
            if (vis_conf.in_background !== undefined && vis_conf.in_background) {
                obj.material.depthTest = false;
                obj.castShadow = false;
                obj.renderOrder = -1;
                if (is_mesh) {
                    obj.material.opacity = 0.25;
                }
                else {
                    obj.material.opacity = 0.06;
                }
                obj.material.transparent = true;
            };
            if (vis_conf.opacity !== undefined) {
                obj.material.opacity = vis_conf.opacity;
            };
            if (vis_conf.transparent !== undefined) {
                obj.material.transparent = vis_conf.transparent;
            }
            // short cuts

        }

    }

};

var setVisualConfigs = function (obj, vis_conf, is_mesh = false) {
    setVisualConfigsSubElement(obj, vis_conf, is_mesh);
    obj.traverse(function (child) {
        setVisualConfigsSubElement(child, vis_conf, is_mesh);
    });
    return obj
};


var DVisLoad = function (file_str) {
    function FileListItem(a) {
        a = [].slice.call(Array.isArray(a) ? a : arguments)
        for (var c, b = c = a.length, d = !0; b-- && d;) d = a[b] instanceof File
        if (!d) throw new TypeError("expected argument to FileList is File or array of File objects")
        for (b = (new ClipboardEvent("")).clipboardData || new DataTransfer; c--;) b.items.add(a[c])
        return b.files
    }



    async function createFile() {
        let response = await fetch('http://localhost:' + editor.config.port + '/' + file_str);
        let data = await response.blob();
        let file = new File([data], file_str);
        /*
        var reader = new FileReader();
        reader.addEventListener('load', function (event) {
            console.log(event.target.result);


        }, false);
        //reader.readAsArrayBuffer(file);
        */

        var fileInput = document.createElement('input');
        fileInput.multiple = true;
        fileInput.type = 'file';


        var files = [
            file
        ];
        fileInput.files = new FileListItem(files);
        editor.loader.loadFiles(fileInput.files);
    }
    createFile();
}

export { DVisAdd, DVisAddMesh, DVisAddPayload, DVisLoad, DVisClear, DVisAddCamera, DVisCmd, DVisAddCameraImage, DVisUpdateMesh }