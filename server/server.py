import argparse
from base64 import encodebytes
from flask import Flask, render_template, make_response, jsonify, request, redirect, url_for
from flask_socketio import SocketIO, emit
import numpy as np

import json
import base64
import pickle
import codecs
import gzip
from PIL import Image
from io import BytesIO
import os
from pathlib import Path

from register_mirror import mimick_current_scene
from argparse import ArgumentParser


app = Flask(
    "dvis_editor",
    static_url_path="",
    static_folder="",
)
socketio = SocketIO(app)


def encode_to_base64(x):
    return base64.b64encode(x).decode("utf8")


@app.route("/screenshot", methods=["GET", "POST"])
def screenshot():
    json_data = json.loads(request.data)
    img_path = json_data["path"]
    print(f"Store screenshot at {img_path}")
    img_root = Path(img_path).parent
    content = json_data["img_b64"].split(";")[1]
    image_encoded = content.split(",")[1]
    im = Image.open(BytesIO(base64.b64decode(image_encoded)))
    os.makedirs(img_root, exist_ok=True)
    im.save(img_path + ".png", "PNG")
    return {}


@app.route("/send_cmd", methods=["GET", "POST"])
def send_cmd():
    json_data = json.loads(request.data)
    socketio.emit("send_cmd", json_data)
    return {}


@app.route("/send_pose", methods=["GET", "POST"])
def send_pose():
    r = request.json
    r = pickle.loads(codecs.decode(r.encode(), "base64"))
    r["pose"] = encode_to_base64(r["pose"].astype(np.float32).copy(order="C"))
    socketio.emit("send_pose", r)
    return {}


@app.route("/store_object_track", methods=["GET", "POST"])
def store_object_track():
    json_data = json.loads(request.data)
    track_path = json_data["path"]
    track_root = Path(track_path).parent
    os.makedirs(track_root, exist_ok=True)
    json.dump(json_data["track"], open(track_path + ".json", "w"))
    print(track_path)
    return {}


@app.route("/track", methods=["GET", "POST"])
def load_object_track():
    socketio.emit("track", request.json)
    return {}


@app.route("/send_object_kf_state", methods=["GET", "POST"])
def send_object_kf_state():
    r = request.json
    r["trs"] = encode_to_base64(pickle.loads(codecs.decode(r["trs"].encode(), "base64")).astype(np.float32).copy(order="C"))

    socketio.emit("send_object_kf_state", r)
    return {}

@app.route("/cam_image", methods=["GET", "POST"])
def cam_image():
    r = request.json
    socketio.emit("cam_image", r)
    return {}

@app.route("/request_icp", methods=["GET", "POST"])
def request_icp():
    from dutils import icp_reg
    r = json.loads(request.data)
    obj_pose = np.array(r["obj_pose"]["elements"]).reshape(4, 4).T
    input_pts, obj_pts = mimick_current_scene(r["scan_name"], r["frame_idx"], r["obj_path"], obj_pose)
    icp_transform = icp_reg(input_pts[:, :3], obj_pts[:, :3], r["icp_th"])
    socketio.emit(
        "receive_icp",
        {
            "obj_name": r["obj_name"],
            "frame_idx": r["frame_idx"],
            "icp_transform": encode_to_base64(icp_transform.astype(np.float32).copy(order="C")),
        },
    )
    return {}


@app.route("/inject", methods=["GET", "POST"])
def inject():
    r = json.loads(request.data)
    print(r)
    shortkey = r.get("key")
    if shortkey is not None:
        # set short key
        payload = """
        document.addEventListener('keydown', function (event) {{
            switch (event.key.toLowerCase()) {{
                case '{shortkey}':
                    {payload}
                }}
            }}
            )
        """.format(
            shortkey=shortkey, payload=r["payload"]
        )
    else:
        payload = r.get("payload", "")
    socketio.emit("send_cmd", {"cmd": "inject", "payload": payload})
    return {}


@app.route("/request_pc", methods=["GET", "POST"])
def request_pc():
    from dvis import dvis

    r = json.loads(request.data)
    frame_idx = r["frame_idx"]

    input_pts = mimick_current_scene(r["scan_name"], r["frame_idx"], num_pts=r["num_pts"])
    dvis(input_pts[:, :6], vs=0.03, t=frame_idx, name=f"pc_wa/{frame_idx}")
    return {}


@app.route("/track_dict", methods=["GET", "POST"])
def send_track_dict():
    r = request.json
    r = pickle.loads(codecs.decode(r.encode(), "base64"))
    for kf, kf_data in r["data"].items():
        r["data"][kf]["trs"] = encode_to_base64(kf_data["trs"].astype(np.float32).copy(order="C"))
    socketio.emit("track_dict", r)
    return {}


@app.route("/local_track", methods=["GET", "POST"])
def load_local_track():
    from dvis import qvis

    json_data = request.json
    fn = json_data["fn"]
    qvis(fn, True, traj=json_data["vs"], vs=json_data["vs"], c=json_data["c"], l=json_data["l"])
    return {}


@app.route("/config", methods=["GET", "POST"])
def config():
    socketio.emit("config", request.json)
    return {}


@app.route("/add_camera", methods=["GET", "POST"])
def add_camera():
    trs = pickle.loads(codecs.decode(request.json["trs"].encode(), "base64"))
    request.json["trs"] = encode_to_base64(trs.astype(np.float32).copy(order="C"))
    socketio.emit("add_camera", request.json)
    return {}




@app.route("/showMesh", methods=["GET", "POST"])
def showMesh():
    r = request.json
    if r["compression"] == "glb":
        print(f"Displaying trimesh encoded as glb")
    elif r["compression"] == "obj":
        print(f"Displaying trimesh encoded as obj")
        # r["data"] = pickle.loads(codecs.decode(r["data"].encode(), "base64"))
    # print(f"Displaying trimesh of {len(r['data'].vertices)} vertices and {len(r['data'].faces)} faces")
    socketio.emit(
        "showMesh",
        {
            "data_format": r["data_format"],
            "data": r["data"],
            "layers": r["layers"],
            "t": r["t"],
            "compression": r["compression"],
            "graph_info": r["graph_info"],
            "meta_data": r.get("meta_data", {}),
            "vis_conf": r.get("vis_conf"),
        },
    )
    return {}


@app.route("/show_files", methods=["GET", "POST"])
def show_files():
    input = request.json
    socketio.emit("show_files", input["files"])
    return {}


@app.route("/clear", methods=["GET", "POST"])
def clear():
    r = request.json
    socketio.emit("clear", r)
    return {}


### refactored

@app.route("/show", methods=["GET", "POST"])
def show():
    r = request.json
    # TODO IMPROVE
    if r['compression'] == 'gzip':
        r['data'] = encode_to_base64(gzip.decompress(codecs.decode(r['data'].encode(), "base64")))
    elif r['compression'] == 'pkl':
        pass
        # r['data'] = encode_to_base64(pickle.loads(codecs.decode(r['data'].encode(), "base64")))
    elif r['compression'] in ['obj', 'glb']:
        pass
    else:
        pass
    socketio.emit(
        "show",
        {
            "data_format": r["data_format"],
            "data": r['data'],
            "size": r["size"],
            "color": r["color"],
            "layers": r["layers"],
            "t": r["t"],
            "graph_info": r["graph_info"],
            "meta_data": r["meta_data"],
            "vis_conf": r["vis_conf"],
            "shape": r["shape"],
            "compression": r["compression"]
        },
    )
    return {}

@app.route("/show_payload", methods=["GET", "POST"])
def show_payload():
    r = request.json
    r['payload'] = pickle.loads(codecs.decode(r['payload'].encode(), "base64"))

    socketio.emit(
        "show_payload",
        {
            "payload": r['payload'],
            "data_format": r["data_format"],
            "size": r["size"],
            "color": r["color"],
            "layers": r["layers"],
            "t": r["t"],
            "graph_info": r["graph_info"],
            "meta_data": r["meta_data"],
            "vis_conf": r["vis_conf"],
            "shape": r["shape"],
            "compression": r["compression"]
        },
    )
    return {}





@app.route("/")
def index():
    return render_template("index.html", port=args.port)


if __name__ == "__main__":
    parser = ArgumentParser("DVIS Server")
    parser.add_argument("--port", type=int, default=5001)
    args = parser.parse_args()
    socketio.run(app, host="0.0.0.0", port=args.port, debug=True)
