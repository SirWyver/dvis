import pickle
import codecs
import requests
import visdom
import numpy as np
import trimesh
from .utils import get_color
from PIL import ImageFile, Image
import gzip
import base64


PORT = 5001
VIS_PORT = 4999

visdom_instance = None

def set_port(port):
    global PORT
    PORT = port

def set_vis_port(port):
    global VIS_PORT
    VIS_PORT = port

def encode_to_base64(x):
    if isinstance(x, str):
        return x
    return base64.b64encode(x).decode("utf8")

def _get_visdom_instance():
    global visdom_instance
    if visdom_instance is None:
        visdom_instance = visdom.Visdom(port=VIS_PORT)
    return visdom_instance
    

def send2server(data, data_format, size, color, layers, t, name="", meta_data=None, vis_conf=None, shape="v", compression="gzip", sub_format=None):
    if data is not None:
        if isinstance(data, np.ndarray):
            if sub_format is None:
                print(f"Sending {data_format} with shape {data.shape}")
            else:
                print(f"Sending {data_format}[{sub_format}] with shape {data.shape}")

    else:
        print("Sending group")
    if data_format in ["hwc",  "img", "seq"]:
        vis = _get_visdom_instance()
        
        if data_format == "seq":
            for img in data:
                vis.image(img, opts=dict(store_history=True), win=name)
        else:
            if isinstance(color, int):
                pass
            else:
                data[np.all(data == 255, 2)] = np.array(color)
            vis.image(data.transpose(2, 0, 1), opts={"caption": name})
    elif data_format in ["gif"]:
        vis = _get_visdom_instance()
        vis.text(f'<img src="data:image/gif;base64,{data} ">', opts={"caption": name})
    else:
        if compression == "pkl":
            if isinstance(data, np.ndarray):
                data = pickle.dumps(data.astype(np.float32).copy(order="C"))
            else:
                data = pickle.dumps(data)
        elif compression == "gzip":
            data = gzip.compress(data.astype(np.float32).copy(order="C"))
        elif compression in ["glb", "obj"]:  # meshes
            tm = data
            if compression == "glb":
                data = tm.export(file_type="glb")
                print(f"Sending scene of {len(tm.triangles)} triangles")
            elif compression == "obj":
                if color > 0:
                    tm.visual.vertex_colors = get_color(color)
                try:
                    data = tm.export(file_type="obj")
                except:
                    data = trimesh.Trimesh(vertices=tm.vertices, faces=tm.faces).export(file_type="obj")
                print(f"Sending trimesh of {len(tm.vertices)} vertices and {len(tm.faces)} faces")
            pass

        if compression is None:
            send_data = data
        else:
            send_data = encode_to_base64(data)
        requests.post(
            url=f"http://localhost:{PORT}/show",
            json={
                "data": send_data,
                "compression": compression,
                "data_format": data_format,
                "size": size,
                "color": color,
                "layers": layers,
                "t": t,
                "graph_info": {"name": name},
                "meta_data": meta_data,
                "vis_conf": vis_conf,
                "shape": shape,
            },
        )


def send_plotly(data, layout):
    vis = _get_visdom_instance()
    print(f"Sending plolty {data['type']}")
    vis._send({"data": [data], "layout": layout})

def send_payload2server(
    payload, data_format, size, color, layers, t, name="", meta_data=None, vis_conf=None, shape="v", compression="pkl"
):
    if data_format == "cam_img":
        payload["image"] = img_to_base64(payload["image"])
    if "trs" in payload:
        payload["trs"] = encode_to_base64(payload["trs"].astype(np.float32).copy(order="C"))

    requests.post(
        url=f"http://localhost:{PORT}/show_payload",
        json={
            "payload": encode_to_base64(pickle.dumps(payload)),
            "compression": compression,
            "data_format": data_format,
            "size": size,
            "color": color,
            "layers": layers,
            "t": t,
            "graph_info": {"name": name},
            "meta_data": meta_data,
            "vis_conf": vis_conf,
            "shape": shape,
        },
    )


def img_to_base64(image):
    import base64
    from io import BytesIO

    buffered = BytesIO()
    image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    img_str = "data:image/jpeg;base64," + img_str
    return img_str


def sendCamImage2server(image_data, cam_name, layers, t, name, vs=1):
    if isinstance(image_data, (ImageFile.ImageFile, Image.Image)):
        image = image_data
    elif isinstance(image_data, np.ndarray):
        image = Image.fromarray(image_data)
    else:
        raise NotImplementedError("Image data format not supported!")
    img_str = img_to_base64(image)
    cam_image = {
        "image_str": img_str,
        "cam_name": cam_name,
        "name": name,
        "t": t,
        "layers": layers,
        "vs": vs,
    }
    requests.post(url=f"http://localhost:{PORT}/cam_image", json=cam_image)
    print(f"Sending cam image for cam {cam_name} at {t}")


def send_config(config):
    requests.post(url=f"http://localhost:{PORT}/config", json=config)


def send_camera(cam_data):
    cam_data["trs"] = codecs.encode(pickle.dumps(cam_data["trs"]), "base64").decode()
    requests.post(url=f"http://localhost:{PORT}/add_camera", json=cam_data)


def sendCmd2server(cmd_data):
    requests.post(url=f"http://localhost:{PORT}/send_cmd", json=cmd_data)


def sendInject2server(cmd_data):
    requests.post(url=f"http://localhost:{PORT}/inject", json=cmd_data)


def sendPose2server(pose_data):
    requests.post(url=f"http://localhost:{PORT}/send_pose", json=codecs.encode(pickle.dumps(pose_data), "base64").decode())


def send_objectKFState(object_kf_state):
    object_kf_state["trs"] = codecs.encode(pickle.dumps(object_kf_state["trs"]), "base64").decode()
    requests.post(url=f"http://localhost:{PORT}/send_object_kf_state", json=object_kf_state)
    print(f"Sending kf state for {object_kf_state['name']} at {object_kf_state['kf']}")


def sendTrack2server(track_data, traj=None, from_json=True, vs=1, c=0, l=0):

    if isinstance(track_data, str):
        requests.post(url=f"http://localhost:{PORT}/local_track", json={"fn": track_data, "traj": traj, "c": c, "l": l, "vs": vs})
    else:
        if from_json:
            requests.post(url=f"http://localhost:{PORT}/track", json=track_data)
        else:
            track_dict = dict()
            track_dict["name"] = track_data.get("name")
            track_dict["data"] = {}
            for kf, kf_data in track_data["data"].items():
                if isinstance(kf_data, np.ndarray):
                    track_dict["data"][kf] = dict(trs=kf_data, visible=True)
                elif isinstance(kf_data, dict):
                    track_dict["data"][kf] = dict(trs=kf_data["trs"], visible=kf_data["visible"])

            track_dict = pickle.dumps(track_dict)

            requests.post(url=f"http://localhost:{PORT}/track_dict", json=codecs.encode(track_dict, "base64").decode())


def send_clear(reset_cam):
    requests.post(url=f"http://localhost:{PORT}/clear", json={"reset_cam": reset_cam})


def sendMesh2server(tm, color, layers, t, add, name="", meta_data=None, compression="glb", vis_conf=None):
    if compression == "glb":
        data = tm.export(file_type="glb")
        data = codecs.encode(data, "base64").decode()
        print(f"Sending scene of {len(tm.triangles)} triangles")
    elif compression == "obj":
        if color > 0:
            tm.visual.vertex_colors = get_color(color)
        try:
            data = tm.export(file_type="obj")
        except:
            data = trimesh.Trimesh(vertices=tm.vertices, faces=tm.faces).export(file_type="obj")
        print(f"Sending trimesh of {len(tm.vertices)} vertices and {len(tm.faces)} faces")

    requests.post(
        url=f"http://localhost:{PORT}/showMesh",
        json={
            "data": data,
            "layers": layers,
            "t": t,
            "compression": compression,
            "data_format": "trimesh",
            "graph_info": {"add": add, "name": name},
            "meta_data": meta_data,
            "vis_conf": vis_conf,
        },
    )
