
import * as THREE from '../../build/three.module.js';
import { UIPanel } from './libs/ui.js';

class KeyframeTrack {
    constructor(name) {
        this.uuid = null;
        this.name = name;

        this.model_id = null;
        this.obj_path = null;
        this.type = null;
        this.meta = null;
        this.layers = null;
        this.type = null;
        this.cls_name = null;
        this.data = {}; // kf -> {trs: ..., visible: ...}
        this.idata = {};
    };
    static fromObject(obj) {
        var kf_track = new this(obj.name);
        kf_track.uuid = obj.uuid;
        kf_track.type = obj.track;
        kf_track.meta = obj.meta_data;
        console.log(obj.obj_path);
        if (obj.meta_data !== null && obj.meta_data !== undefined) {
            if (obj.meta_data.obj_path !== null) {
                kf_track.obj_path = obj.meta_data.obj_path;
            }
            kf_track.cls_name = obj.meta_data.cls_name;
        }

        return kf_track;
    };
    static fromJSON(json) {
        var kf_track = new this(json.name);
        kf_track.meta = json.meta;
        for (const [kf, entry] of Object.entries(json.data)) {
            kf_track.data[parseInt(kf)] = entry;
        }

        kf_track.obj_path = json.obj_path;
        kf_track.cls_name = json.meta.cls_name;
        return kf_track;
    }

    static fromDict(dict) {
        var kf_track = new this(dict.name);
        kf_track.meta = dict.meta;
        for (const [kf, entry] of Object.entries(dict.data)) {
            var bytes = Uint8Array.from(atob(entry['trs']), c => c.charCodeAt(0))
            var data_arr = new Float32Array(bytes.buffer);
            kf_track.data[kf] = { "trs": (new THREE.Matrix4().fromArray(data_arr)).transpose(), "visible": entry['visible'] };
        }

        kf_track.obj_path = dict.obj_path;
        if (dict.meta !== undefined)
            kf_track.cls_name = dict.meta.cls_name;

        return kf_track;

    }
    deleteKF(kf) {
        delete this.data[kf];
    };
    setKF(kf, trs, visible = true) {
        this.data[kf] = { visible: visible, trs: trs }
    };

    updateKF(kf, obj) {
        console.log('Update ', kf);
        var trs_m = new THREE.Matrix4();
        trs_m.copy(obj.matrix);
        this.data[kf] = {
            visible: obj.visible,
            trs: trs_m
        };
        console.log(this.data);

    };
    getInterpolatedData(pframe) {
        var kf_l = 0;
        var kf_r = Math.max(...Object.keys(this.data));
        // no interpolation logic for now
        for (var kf in this.data) {
            if (kf <= pframe) {
                kf_l = Math.max(kf, kf_l);
            }
            else {
                kf_r = Math.min(kf, kf_r);
            }
        }
        var l_data = this.data[kf_l];
        var r_data = this.data[kf_r];
        var inter_data = {}
        if (kf_l < Math.min(...Object.keys(this.data))) {
            // no left side interpolate
            if (r_data.visible !== undefined) {
                inter_data.visible = false;//r_data.visible;
            };
        }
        else if (pframe > kf_r) {
            // no right side interpolate
            if (l_data.visible !== undefined) {
                inter_data.visible = false; // l_data.visible;
            };
        }
        else {
            if (l_data.visible !== undefined) {
                inter_data.visible = l_data.visible;
            };

            if (l_data.trs !== undefined) {
                if (kf_l == kf_r || kf_l == pframe) {
                    inter_data.trs = l_data.trs;
                }
                else {
                    // extract scale first
                    var R_l = new THREE.Matrix4().extractRotation(l_data.trs);
                    var R_r = new THREE.Matrix4().extractRotation(r_data.trs);
                    //var TS_l = l_data.trs.multiply(new THREE.Matrix4().getInverse(R_l));


                    var t_l = new THREE.Vector3().setFromMatrixPosition(l_data.trs);
                    var q_l = new THREE.Quaternion().setFromRotationMatrix(R_l);
                    var s_l = new THREE.Vector3().setFromMatrixScale(l_data.trs);

                    var t_r = new THREE.Vector3().setFromMatrixPosition(r_data.trs);
                    var q_r = new THREE.Quaternion().setFromRotationMatrix(R_r);
                    var s_r = new THREE.Vector3().setFromMatrixScale(r_data.trs);
                    var time_delta = (pframe - kf_l) / (kf_r - kf_l);
                    var t_lerp = t_l.lerp(t_r, time_delta);
                    var q_slerp = q_l.slerp(q_r, time_delta);

                    var s_lerp = s_l.lerp(s_r, time_delta);
                    var mat_lerp = (new THREE.Matrix4().makeTranslation(t_lerp.x, t_lerp.y, t_lerp.z))
                        .multiply((new THREE.Matrix4().makeRotationFromQuaternion(q_slerp))
                            .multiply((new THREE.Matrix4().makeScale(s_lerp.x, s_lerp.y, s_lerp.z))));
                    //var mat_lerp = new THREE.Matrix4().compose(t_lerp, q_slerp, s_lerp);
                    inter_data.trs = mat_lerp;
                }


            };
        }
        return inter_data;
    };
    computeInterpolation() {
        for (var pframe = Math.min(...Object.keys(this.data)); pframe < Math.max(...Object.keys(this.data)); pframe++) {
            this.idata[pframe] = this.getInterpolatedData(pframe);
        }
    }
};

export { KeyframeTrack };
