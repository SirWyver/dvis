"""DVIS Client
Client side bridge to send various type of 2D and 3D to the server.

Note:
    Requires DVIS server to run - sends data via websocket to localhost:5001 (3D visualizations) and localhost:4999 (using visdom for 2D visualization).
"""
import shutil
import numpy as np
import torch
from .dvis_client_old import (
    sendMesh2server,
    send_clear,
    send_config,
    sendTrack2server,
    send_camera,
    sendCmd2server,
    sendPose2server,
    sendInject2server,
    send_objectKFState,
    sendCamImage2server,
)

from .dvis_client import send2server, send_payload2server
import trimesh
from .utils import get_color, visualize_label, visualize_range, get_color_batched
import json
from PIL import Image, ImageFile
import os
from pathlib import Path
import matplotlib
import base64

import hashlib


def int_hash(x):
    return int(hashlib.sha1(x.encode("utf-8")).hexdigest(), 16) % (10**8)


def convert_to_nd(data):
    if type(data) == list:
        # convert to array
        return np.stack([convert_to_nd(x) for x in data])
    if type(data) == np.ndarray:
        return data
    if type(data) == list:
        return np.array(data)
    if type(data) == torch.Tensor:
        return data.data.cpu().numpy()
    try:
        import imageio
        if type(data) == imageio.core.util.Array:
            return np.array(data)
    except:
        pass
    raise Exception("Data type not understood")


def matplot2PIL(fig):
    import io

    buf = io.BytesIO()
    fig.savefig(buf)
    buf.seek(0)
    return Image.open(buf)


def convert2std(data_np, fmt, bounds=None, c=0, cm=None):
    if fmt == "cwhl":
        valid_indices = np.all((data_np >= 0) & (data_np <= 1), 0)
        return np.concatenate([np.argwhere(valid_indices), data_np[:, valid_indices].T], 1), "xyzrgb"
    elif fmt == "whlc":
        valid_indices = np.all((data_np >= 0) & (data_np <= 1), -1)
        return np.concatenate([np.argwhere(valid_indices), data_np[valid_indices]], 1), "xyzrgb"
    elif fmt == "whl":
        return np.argwhere(data_np == 1), "xyz"
    elif fmt == "xyzc":
        if np.any(data_np[:, 3] > 1) or np.all((data_np[:, 3] == 0) | (data_np[:, 3] == 1)):
            return (np.concatenate([data_np[:, :3], np.array([get_color(x,cm) for x in data_np[:, 3]])], 1), "xyzrgb")
        else:
            ref_color = get_color(c, cm) if c > 0 else 1
            return (
                np.concatenate([data_np[:, :3], ref_color * np.stack((data_np[:, 3], data_np[:, 3], data_np[:, 3]), -1)], 1),
                "xyzrgb",
            )
    elif fmt == "xyzrgb":
        if np.any(data_np[:, 3:6] > 1) and np.all(data_np[:, 3:6] == data_np[:, 3:6].astype(np.int)):
            ## color as uint 8
            data_np[:, 3:6] /= 255
            return data_np, fmt
        else:
            return data_np, fmt
    elif fmt == "xyz" or fmt == "bbox" or fmt == "corners" or fmt == "line" or fmt == "hbboxes" or fmt == "hbboxes_c":
        return data_np, fmt
    elif fmt == "transform" or fmt == "arrow":
        if data_np.shape[0] == 3 and data_np.shape[1] == 3:
            fmtted = np.eye(4)
            fmtted[:3, :3] = data_np

            return fmtted, fmt
        return data_np, fmt
    elif fmt == "uv" or fmt == "uvrgb":
        if bounds is None:
            bounds = np.min(data_np[:, :2], 0), np.max(data_np[:, :2], 0)
        if len(bounds) == 2:
            if isinstance(bounds[0], (int, float)):
                bounds = np.zeros(2, dtype=np.int), np.array(bounds)
            elif isinstance(bounds[0], (tuple, list)):
                bounds = np.array(bounds[0]), np.array(bounds[1])
        img = np.zeros((*(bounds[1] - bounds[0]), 3))
        valid_pixel = np.all(data_np[:, :2] >= bounds[0], 1) & np.all(data_np[:, :2] < bounds[1], 1)
        if data_np.shape[1] == 2:

            img[tuple((data_np[valid_pixel, :2] - bounds[0]).astype(int).T)] = 255
        else:
            img[tuple((data_np[valid_pixel, :2] - bounds[0]).astype(int).T)] = data_np[valid_pixel, 2:]
        return img, "hwc"
    elif fmt == "hwc":
        return data_np, fmt
    elif fmt == "hist":
        return data_np, fmt
    elif fmt == "vec":
        return data_np, fmt
    else:
        print("Unknown data format passed")


def in_notebook():
    """
    Check to see if we are in an IPython or Jypyter notebook.
    Returns
    -----------
    in_notebook : bool
      Returns True if we are in a notebook
    """
    try:
        from IPython import get_ipython
        import os

        # function returns IPython context, but only in IPython
        ipy = get_ipython()  # NOQA
        # we only want to render rich output in notebooks
        # in terminals we definitely do not want to output HTML
        name = str(ipy.__class__).lower()
        terminal = "terminal" in name

        # spyder uses ZMQshell, and can appear to be a notebook
        spyder = "_" in os.environ and "spyder" in os.environ["_"]

        # assume we are in a notebook if we are not in
        # a terminal and we haven't been run by spyder
        notebook = (not terminal) and (not spyder)

        return notebook

    except BaseException:
        return False


def ivis(width=None, height=None, url=None, port=None):
    if width is None:
        width = "100%"
    if height is None:
        height = 600
    if url is None:
        url = "http://localhost"
    if port is None:
        port = 5001
    if in_notebook():
        from IPython.display import IFrame, display

        display(IFrame(f"{url}:{port}", width=width, height=height))
    else:
        print("Not in notebook environment")


def load_obj_track(obj_track_fn):
    obj_track = json.load(open(obj_track_fn, "r"))
    obj_path = obj_track["obj_path"]
    obj_name = obj_track["name"]
    layers = obj_track.get("layers", None)
    meta_data = obj_track.get("meta", {})

    if obj_path.endswith("npz"):
        pass
    elif obj_path.endswith("ply") or obj_path.endswith("obj"):
        tm_mesh = trimesh.load(obj_path)
        if isinstance(tm_mesh, trimesh.Trimesh):
            compression = "obj"
        elif isinstance(tm_mesh, trimesh.Scene):
            compression = "glb"
        meta_data["obj_path"] = obj_path
        sendMesh2server(tm_mesh, 0, layers, None, True, obj_name, meta_data, compression)
    # load keyframe track
    sendTrack2server(obj_track)


def load_obj_trajectory(obj_track_fn, traj=0, vs=1, c=0, l=0):
    # traj mode 0: data, 1: idata, 2: data+idata
    print("loading traj")
    obj_track = json.load(open(obj_track_fn, "r"))
    obj_name = obj_track["name"]
    # load trajectory lines
    # annotationed traj
    if c == 0:
        c = hash(obj_track["name"]) % 40
    if traj == 0 or traj == 2:
        line_data = []

        for frame_idx, kf_anno in obj_track["data"].items():
            trs = np.array(kf_anno["trs"]["elements"]).reshape(4, 4).T
            position = trs[:3, 3]
            line_data.append(position)
        dvis(np.array(line_data), vs=vs, c=c, l=l, fmt="line", name=f"traj/trj_{obj_name}")
    if traj == 1 or traj == 2:
        iline_data = []
        for frame_idx, kf_anno in obj_track["idata"].items():
            trs = np.array(kf_anno["trs"]["elements"]).reshape(4, 4).T
            position = trs[:3, 3]
            iline_data.append(position)
        dvis(np.array(iline_data), vs=vs, c=c, l=l, fmt="line", name=f"itraj/trj_{obj_name}")


def qvis(data, local=False, traj=None, vs=1, c=0, l=0, fmt=None, ms=None):
    # traj mode 0: data, 1: idata, 2: data+idata
    if isinstance(data, str):
        fmt = "filename"
        if local:
            if os.path.isdir(data):
                # scene keyframe tracks
                for obj_track_fn in Path(data).iterdir():
                    if obj_track_fn.suffix == ".json":
                        load_obj_track(obj_track_fn=obj_track_fn)
                        if traj is not None:

                            load_obj_trajectory(obj_track_fn, traj=traj, vs=vs, c=c, l=l)
            else:
                load_obj_track(obj_track_fn=data)
                if traj is not None:
                    load_obj_trajectory(data, traj=traj, vs=vs, c=c, l=l)
        else:
            sendTrack2server(data, traj, True, vs=vs, c=c, l=l)
    else:
        pass


def prepare_track(data, name):
    if "data" not in data:
        track_data = dict(data=data)
        track_data["name"] = name
    else:
        track_data = data
        if "name" not in data:
            track_data["name"] = name
    return track_data


def prepare_cam(data, name):
    def intrinsics2fov(intrinsics):
        fov_x = np.arctan(2 * intrinsics[0, 2] / (2 * intrinsics[0, 0]))
        fov_y = np.arctan(2 * intrinsics[1, 2] / (2 * intrinsics[1, 1]))
        return fov_x, fov_y

    def intrinsics2aspect_ratio(intrinsics):
        return intrinsics[0, 2] / intrinsics[1, 2]

    cam_data = {
        "fov": data.get("fov"),
        "aspect_ratio": data.get("aspect_ratio", 16 / 9),
        "near": data.get("near", 0.01),
        "far": data.get("far", 1000),
        "name": name if name is not None else data.get("name", "RenderCam"),
        "trs": data.get("trs", np.eye(4)),
    }

    if "intrinsics" in data:
        fov_x, fov_y = intrinsics2fov(data["intrinsics"])
        aspect_ratio = intrinsics2aspect_ratio(data["intrinsics"])
        cam_data["fov"] = fov_x
        cam_data["aspect_ratio"] = aspect_ratio
    return cam_data


def dvis_cmd(data, **kwargs):
    sendCmd2server(data)


def dvis_inject(data, **kwargs):
    sendInject2server(data)


##### refactoring


def dvis_obj_kf(data, t, name):
    # sending object keyframe state
    if isinstance(data, (np.ndarray, torch.Tensor)):
        trs = data
        visible = True
        obj_name = name
        kf = t
    else:
        trs = data["trs"]
        visible = data.get("visible")
        obj_name = data.get("name", name)
        kf = data.get("kf", t)
    trs = convert_to_nd(trs)
    obj_kf_state = {"name": obj_name, "trs": trs, "visible": visible, "kf": kf}

    send_payload2server(obj_kf_state, "obj_kf", 1, 0, [0], kf)


def dvis_pose(data, name):
    sendPose2server({"pose": data, "name": name})


def dvis_text(data, vs=1, c=0, l=[0], t=0, name="text", meta=None, vis_conf=None):
    if name is None:
        name = "text"
    if isinstance(data, tuple):
        pos = data[1]
        text = data[0]
    elif isinstance(data, dict):
        pos = data.get("position", data.get("pos"))
        text = data.get("text", data.get("txt"))
    else:
        pos = data
        text = name
    if isinstance(pos, (np.ndarray, torch.Tensor)):
        pos = pos.tolist()
    send2server(
        data={"position": pos, "text": text},
        data_format="text",
        size=vs,
        color=c,
        layers=l,
        t=t,
        name=name,
        meta_data=meta,
        compression=None,
        vis_conf=vis_conf,
    )


def dvis_track(data, name, vs, c, l):
    track_data = prepare_track(data, name)
    sendTrack2server(track_data, None, False, vs, c, l)


def dvis_cfg(data):
    send_config(data)


def dvis_mesh_pc(data, vs=1, c=0, l=0, t=None, name=None, meta=None, ms=None, vis_conf=None, shape="v"):
    data_std = np.array(data.vertices)
    if ms is not None and len(data_std) > ms:
        data_std = data_std[np.random.choice(len(data_std), ms, replace=False)]
    send2server(
        data=data_std,
        data_format="mesh_pc",
        size=vs,
        color=c,
        layers=l,
        t=t,
        name=name,
        meta_data=meta,
        compression="pkl",
        vis_conf=vis_conf,
        shape=shape,
    )


def dvis_img(data, vs=1, c=0, l=[0], t=None, name=None, meta=None, vis_conf=None, cm='default', fmt='img', mi=None, ma=None):
    if isinstance(data, (ImageFile.ImageFile)):
        data = np.array(data)
    if isinstance(data, str):
        fn = data
        if data.endswith(".gif"):
            # load image as base64 for visdom
            data = open(data, "rb").read()
            data = base64.encodestring(data).decode()
            send2server(
                data=data, data_format="gif", size=vs, color=c, layers=l, t=t, name=name, meta_data=meta, vis_conf=vis_conf
            )
            return
        else:
            if ":" in fn:
                # remote path
                from fabric import Connection
                hostname, remote_path, suffix = fn.split(":")[0], fn.split(":")[1], fn.split('.')[-1]
                fn =f"tmp.{suffix}" 
                Connection(hostname).get(remote_path,fn)
                data = np.array(Image.open(fn))
                os.remove(fn)
            else:
                data = np.array(Image.open(fn))
        if meta is None:
            meta = {}
        meta["obj_path"] = fn
    try:
        if isinstance(data, matplotlib.axes.Axes):
            data = data.figure
        if isinstance(data, matplotlib.figure.Figure):
            data = np.array(matplot2PIL(data))
    except:
        pass
    data = convert_to_nd(data)
    sub_format = None
    if len(data.shape) == 3 and data.shape[0] in [3,4]:  # C,W,H
        data = np.transpose(data, [1, 2, 0])
    if fmt == 'xyl':
        # label image
        data = visualize_label(data, cm=cm) 
        sub_format = 'xyl'
    elif fmt == 'xyr':
        # range image with 
        # remap default to jet
        data = visualize_range(data, cm=("jet" if cm=='default' else cm), mi=mi, ma=ma)
        sub_format = 'xyr'
            
    if data.max() <= 255:
        if (data.min() >= -1) and (data.min() < 0) and data.max() <= 1:
            data = data * 0.5 + 0.5
        if data.max() <= 1:
            data = data * 255
        data = data.astype(np.uint8)
    else:
        raise IOError("Image values cannot be interpreted")
    if data.shape[-1] == 4:
        #rgba
        data = data/255
        alpha_mask = data[...,3:]
        data[...,:3] = data[...,:3] * alpha_mask + (1.0 - c) * (1-alpha_mask)
        data = (data[...,:3]*255).astype(np.uint8)
    send2server(data=data, data_format="img", size=vs, color=c, layers=l, t=t, name=name, meta_data=meta, vis_conf=vis_conf, sub_format=sub_format)


def dvis_group(name, meta):
    send2server(None, "group", vs=1, c=1, t=0, l=[0], add=False, name=name, meta=meta)


def dvis_points(data, fmt="points", s=1, c=0, l=[0], t=None, name=None, meta=None, ms=None, vis_conf=None, shape="b", cm=None, sub_format=None):
    """Display points

    Args:
        data (np.ndarray, torch.Tensor): point cloud data
        fmt (str): points, xyzrgb, xyz, xyzc, xyzr
    """
    if name is None:
        name = "Points"
    data = convert_to_nd(data)

    if fmt == "points":
        # infer data format based on data shape
        if len(data.shape) == 4:
            # squeeze single dimensions
            if data.shape[0] == 1:
                data = data[0]
        if len(data.shape) == 3:
            # squeeze single dimensions
            if data.shape[0] == 1:
                data = data[0]
        if len(data.shape) == 2:
            if data.shape[1] == 6:
                if data.shape[0] > 1:
                    # xyz rgb
                    fmt = "xyzrgb"
            elif data.shape[1] == 7:
                fmt = "xyzrgba"
            elif data.shape[1] == 3:
                # xyz
                fmt = "xyz"
            elif data.shape[1] == 4:
                if np.abs(data[:,3].astype(np.int) -  data[:,3]).max()<1e-3:
                    # xyzl
                    fmt = "xyzl"
                else:
                    # xyzr
                    fmt = "xyzr"
        else:
            raise IOError(f"Points format {data.shape} not understood")

    if fmt =="xyzl":
        label_colors = visualize_label(data[:,3],cm=cm if cm is not None else "default")
        data, fmt = np.concatenate([data[:, :3],label_colors], 1), "xyzrgb"

    if fmt == "xyzr":
        range_colors = visualize_range(data[:,3],cm=cm if cm is not None else "jet")[:,0]
        data, fmt = np.concatenate([data[:, :3],range_colors, data[:,3:4]], 1), "xyzrgba"

    if fmt in ["xyzrgb", "xyzrgba"]:
        if np.any(data[:, 3:6] > 1) and np.all(data[:, 3:6] == data[:, 3:6].astype(np.int)):
            ## color as uint 8
            data = data.astype(np.float32)
            data[:, 3:6] /= 255

    ## downsample
    if ms is not None and len(data) > ms:
        data = data[np.random.choice(len(data), ms, replace=False)]

    send2server(data, fmt, s, c, l, t, name, meta, vis_conf, shape, sub_format=sub_format)


def dvis_voxels(data, fmt="voxels", s=1, c=0, l=[0], t=None, name=None, meta=None, ms=None, vis_conf=None, shape="v", cm=None):
    """Display voxels

    Args:
        data (np.ndarray, torch.Tensor): voxel grid data
        fmt (str): voxels, cwhl, whlc, whl
    """
    if name is None:
        name = "Voxels"

    data = convert_to_nd(data)
    if fmt == "voxels":
        # infer data format based on data shape
        if len(data.shape) == 5:
            # squeeze single dimensions
            if data.shape[0] == 1:
                data = data[0]
        if len(data.shape) == 4:
            # squeeze single dimensions
            if data.shape[0] == 1:
                data = data[0]
        if len(data.shape) == 4:
            fmt = "whlc"
        if len(data.shape) == 3:
            fmt = "whl"
        else:
            raise IOError(f"Points format {data.shape} not understood")

    # convert to xyzrgb default format
    sub_format = None
    if fmt == "cwhl":
        valid_indices = np.all((data >= 0) & (data <= 1), 0)
        data, fmt = np.concatenate([np.argwhere(valid_indices), data[:, valid_indices].T], 1), "xyzrgb"
        sub_format = "whlc"
    elif fmt == "whlc":
        valid_indices = np.all((data >= 0) & (data <= 1), -1)
        data, fmt = np.concatenate([np.argwhere(valid_indices), data[valid_indices]], 1), "xyzrgb"
        sub_format = "whlc"
    elif fmt == "whl":
        data, fmt = np.argwhere(data == 1), "xyz"

    dvis_points(data, fmt, s, c, l, t, name, meta, vis_conf, ms, shape, cm=cm, sub_format=sub_format)


def dvis_box(data, fmt="box", s=1, c=0, l=[0], t=None, name=None, meta=None, ms=None, vis_conf=None, shape="v"):
    """Display boxed annotation

    Args:
        data (np.ndarray, torch.Tensor): Nxk box data
        fmt (str): box, bbox, hbboxes, hbboxes_c, corners

    Formats:
        - bbox: Nx (x_min, y_min, z_min, x_max, y_max, z_max)
        - hbboxes: Nx (x, y, z, w, h, l, angle)
        - hbboxes_c: Nx (x, y, z, w, h, l, angle, c)

    Example:
        dvis(np.array([[10,20,30,30,40,50,20,2]]),'hbboxes_c', s=20,c=-2, vis_conf={'transparent': True, 'opacity':0.3})
    """
    data = convert_to_nd(data)
    if fmt == "box":
        if data.shape[1] == 6:
            fmt = "bbox"
        elif data.shape[1] == 7:
            fmt = "hbboxes"
        elif data.shape[1] == 8:
            fmt = "hbboxes_c"
        else:
            raise IOError(f"Box format {data.shape} not understood")
    if name is None:
        name = fmt
    # make hbboxes transparent
    if fmt in ["hbboxes", "hbboxes_c"]:
        if vis_conf is None:
            vis_conf = dict()
        if "transparent" not in vis_conf:
            vis_conf["transparent"] = True
        if "opacity" not in vis_conf:
            vis_conf["opacity"] = 0.6
    if fmt in ["corners"]:
        if data.shape == (4, 4):
            # actually a transform
            from dutils import dot, bbox2bbox_corners

            unit_bbox = 0.5 * np.array([-1, -1, -1, 1, 1, 1])
            unit_corners = bbox2bbox_corners(unit_bbox)
            data = dot(data, unit_corners)

    ## downsample
    if ms is not None and len(data) > ms:
        data = data[np.random.choice(len(data), ms, replace=False)]

    send2server(data, fmt, s, c, l, t, name, meta, vis_conf, shape)


def dvis_mesh(data, c=0, l=0, t=None, name=None, meta=None, ms=None, vis_conf=None):
    """Display mesh

    Args:
        data ([type]): [description]
        c (int, optional): [description]. Defaults to 0.
        l (int, optional): [description]. Defaults to 0.
        t ([type], optional): [description]. Defaults to None.
        name ([type], optional): [description]. Defaults to None.
        meta ([type], optional): [description]. Defaults to None.
        ms ([type], optional): [description]. Defaults to None.
        vis_conf ([type], optional): [description]. Defaults to None.
    """
    if name is None:
        name = "Mesh"
    if isinstance(data, str):
        data = trimesh.load(data)
    compression = "obj" if isinstance(data, trimesh.Trimesh) else "glb"
    tm = data
    if ms is not None:
        # downsample
        tm = tm.simplify_quadratic_decimation(ms)

    return send2server(tm, compression, None, c, l, t, name, meta, vis_conf, None, compression)


def dvis_vec(data, s=1, c=0, l=[0], t=0, name="vec", meta=None, vis_conf=None):
    """Display vector(s)
    Args:
        data (tuple,list,torch.Tensor, np.ndarray): start_pos, end_pos of the vector(s)

    For Nx3, start_pos is origin
    """
    if name is None:
        name = "vec"
    start_pos = np.zeros((1, 3))
    if isinstance(data, (tuple, list)):
        # vector from a to b
        if len(data) > 2:
            # regard data as single vec
            end_pos = np.array([data])

        else:
            start_pos, end_pos = data
            start_pos, end_pos = np.expand_dims(start_pos, 0), np.expand_dims(end_pos, 0)
    elif isinstance(data, (np.ndarray, torch.Tensor)):
        if len(data.shape) == 1:
            if data.shape[0] == 3:
                end_pos = data[None, :]
            else:
                start_pos, end_pos = np.expand_dims(data[:3], 0), np.expand_dims(data[3:6], 0)
        elif len(data.shape) == 2:
            if data.shape[1] == 3:
                start_pos, end_pos = np.tile(start_pos, (data.shape[0], 1)), data
            else:
                start_pos, end_pos = data[:, :3], data[:, 3:6]

    if isinstance(end_pos, torch.Tensor):
        end_pos = end_pos.cpu().numpy()
    if isinstance(start_pos, torch.Tensor):
        start_pos = start_pos.cpu().numpy()
    data = np.concatenate([start_pos, end_pos], 1)
    data_np = convert_to_nd(data)
    send2server(
        data=data_np,
        data_format="vec",
        size=s,
        color=c,
        layers=l,
        t=t,
        name=name,
        meta_data=meta,
        vis_conf=vis_conf,
        compression="pkl",
    )


def dvis_line(data, s=1, c=0, l=[0], t=0, name="line", meta=None, vis_conf=None):
    """Display vector
    Args:
        data (torch.Tensor, np.ndarray): Nx3 array of line vertices
    """
    if name is None:
        name = "line"
    data_np = convert_to_nd(data)
    send2server(
        data=data_np,
        data_format="line",
        size=s,
        color=c,
        layers=l,
        t=t,
        name=name,
        meta_data=meta,
        vis_conf=vis_conf,
        compression="pkl",
    )


def dvis_arrow(data, s=1, c=0, l=[0], t=0, name="arrow", meta=None, vis_conf=None):
    """Display arrow
    Args:
        data (torch.Tensor, np.ndarray): 3x3 or 4x4 transformation matrix
    """
    if name is None:
        name = "arrow"
    data_np = convert_to_nd(data)
    if data_np.shape[0] == 3 and data_np.shape[1] == 3:
        trans_fmt = np.eye(4)
        trans_fmt[:3, :3] = data_np
    else:
        trans_fmt = data_np
    send2server(
        data=trans_fmt,
        data_format="arrow",
        size=s,
        color=c,
        layers=l,
        t=t,
        name=name,
        meta_data=meta,
        vis_conf=vis_conf,
        compression="pkl",
    )


def dvis_transform(data, s=1, c=0, l=[0], t=0, name="transform", meta=None, vis_conf=None):
    """Display transformation
    Args:
        data (torch.Tensor, np.ndarray): 3x3 or 4x4 transformation matrix
    """
    if name is None:
        name = "transform"
    data_np = convert_to_nd(data)
    if data_np.shape[0] == 3 and data_np.shape[1] == 3:
        trans_fmt = np.eye(4)
        trans_fmt[:3, :3] = data_np
    else:
        trans_fmt = data_np
    send2server(
        data=trans_fmt,
        data_format="transform",
        size=s,
        color=c,
        layers=l,
        t=t,
        name=name,
        meta_data=meta,
        vis_conf=vis_conf,
        compression="pkl",
    )

def dvis_seq(data, vs=1, c=0, l=[0], t=None, name=None, meta=None, vis_conf=None, cm='default', fmt='seq', mi=None, ma=None):
    data = convert_to_nd(data)
    sub_format = None
    if data.shape[-1] == 3: # T H W C
        data = data.transpose(0,3,1,2)
    if name is None:
        import time
        # unique name
        name = str(time.time())
            
    if data.max() <= 255:
        if (data.min() >= -1) and (data.min() < 0) and data.max() <= 1:
            data = data * 0.5 + 0.5
        if data.max() <= 1:
            data = data * 255
        data = data.astype(np.uint8)
    else:
        raise IOError("Image values cannot be interpreted")
    send2server(data=data, data_format="seq", size=vs, color=c, layers=l, t=t, name=name, meta_data=meta, vis_conf=vis_conf, sub_format=sub_format)



def _infer_format(data):
    if isinstance(data, (trimesh.Trimesh, trimesh.Scene)):
        fmt = "mesh"
    elif data is None:
        fmt = "group"
    elif isinstance(data, trimesh.PointCloud):
        fmt = "mesh_pc"
    elif (
        isinstance(data, (ImageFile.ImageFile))
        or (hasattr(matplotlib, "axes") and isinstance(data, matplotlib.axes.Axes))
        or (hasattr(matplotlib, "figure") and isinstance(data, matplotlib.figure.Figure))
    ):
        fmt = "img"
    elif isinstance(data, str):
        suffix = data.split(".")[-1]
        if suffix in ["jpeg", "jpg", "png", "gif"]:
            fmt = "img"
        elif suffix in ["obj", "fbx", "ply"]:
            fmt = "mesh"
    else:
        data = convert_to_nd(data)
        # infer data format based on data shape
        if len(data.shape) == 5:
            # squeeze single dimensions
            if data.shape[0] == 1:
                data = data[0]
        if len(data.shape) == 4:
            # squeeze single dimensions
            if data.shape[0] == 1:
                data = data[0]
            elif data.shape[1] == 3 or data.shape[3] ==3:
                    # assume image sequence
                    fmt = "seq"
            elif data.shape[0] == 3 or data.shape[3] == 3:
                fmt = "voxels"
                # fmt = "cwhl"
            else:
                raise IOError("Data format %s not understood" % str(data.shape))
        elif len(data.shape) == 3:
            if (data.shape[0] == 3 or data.shape[2] ==3) or (data.shape[0] == 4 or data.shape[2] ==4):
                # assume image for convenience
                fmt = "img"
            else:
                fmt = "voxels"
        elif len(data.shape) == 2:
            if data.shape[1] == 6:
                if data.shape[0] > 1:
                    # xyz rgb
                    fmt = "points"  #  "xyzrgb"
                else:
                    fmt = "box"  # bbox
            elif data.shape[1] == 3:
                # xyz
                if data.shape[0] == 3:
                    fmt = "transform"
                else:
                    fmt = "points"  # xyz
            elif data.shape[1] == 4:
                if data.shape[0] == 4:
                    # transform
                    fmt = "transform"
                else:
                    # xyz c
                    fmt = "points"  # "xyzc"

            elif data.shape[1] == 2:
                fmt = "points2d"  # "uv"
            elif data.shape[1] == 5:
                fmt = "poinst2d"  #  "uvrgb"
            elif data.shape[1] == 7:
                fmt = "xyzrgba"  # changed from bbox #  "hbboxes"
            elif data.shape[1] == 8:
                fmt = "box"  # "hbboxes_c"
            elif data.shape[0] > 12  and data.shape[1] > 12:
                # assume label img
                fmt = "img"
            else:
                raise IOError("Data format %s not understood" % str(data.shape))
        elif len(data.shape) == 1:
            # bbox
            fmt = "box"  # "bbox"
        else:
            raise IOError("Data format %s not understood" % str(data.shape))
    # infer type of image
    if fmt == 'img' and not isinstance(data, str):
        if len(data.shape) == 2 or (data.shape[-1]==1):
            if isinstance(data, np.ndarray):
                if data.dtype in [np.float32, np.float64]:
                    # range type
                    fmt = 'xyr'
                else:
                    # label type
                    fmt = 'xyl'
            elif isinstance(data, torch.Tensor):
                if data.dtype in [torch.float, torch.double]:
                    # range type
                    fmt = 'xyr'
                else:
                    # label type
                    fmt = 'xyl'
                            
            

    return data, fmt


def dvis_cam(data, name="RenderCam"):
    """Adds a new camera
    Args:
        data (dict): camera description as intrinsics or fov
        name (str): camera name

    data:
        - near (float): 0.01  as default
        - far (float): 1000  as default
        - name (str): camera name
        - trs (np.ndarrray): 4x4
    As fov
        - fov (float): in degrees
        - aspect_ratio (float): ratio
    As intrinsics
        - intrinsics (np.ndarray): 3x3
    """
    if name is None:
        name = "RenderCam"

    def intrinsics2fov(intrinsics):
        fov_x = np.arctan(2 * intrinsics[0, 2] / (2 * intrinsics[0, 0])) / np.pi * 180 * 2
        fov_y = np.arctan(2 * intrinsics[1, 2] / (2 * intrinsics[1, 1])) / np.pi * 180 * 2
        return fov_x, fov_y

    def intrinsics2aspect_ratio(intrinsics):
        return intrinsics[0, 2] / intrinsics[1, 2]

    cam_data = {
        "fov": data.get("fov"),
        "aspect_ratio": data.get("aspect_ratio", 16 / 9),
        "near": data.get("near", 0.01),
        "far": data.get("far", 1000),
        "name": name if name is not None else data.get("name", "RenderCam"),
        "trs": data.get("trs", np.eye(4)),
    }

    if "intrinsics" in data:
        fov_x, fov_y = intrinsics2fov(data["intrinsics"])
        aspect_ratio = intrinsics2aspect_ratio(data["intrinsics"])
        cam_data["fov"] = fov_x
        cam_data["aspect_ratio"] = aspect_ratio

    send_payload2server(cam_data, "cam", 1, 0, [0], None, name)


def dvis_cam_img(data, s=1, l=0, t=None, name="CamImg"):
    """Camera with Image

    Args:
        data (dict, img_data): Image w/o camera data

    data as dict:
        - image (np.ndarray, ImageFile): image data
        - cam_name (str): camera name
    """
    if name is None:
        name = "CamImg"
    if isinstance(data, dict):
        image_data = data["image"]

        if "cam_name" in data:
            cam_name = data["cam_name"]
        else:
            cam_name = name
            name = f"CamImg_{t[0]}"

    else:
        image_data = data
        cam_name = name
        name = f"CamImg_{t[0]}"

    if isinstance(image_data, ImageFile.ImageFile):
        image = image_data
    elif isinstance(image_data, np.ndarray):
        image = Image.fromarray(image_data)
    else:
        raise NotImplementedError("Image data format not supported")

    send_payload2server({"image": image, "cam_name": cam_name}, "cam_img", s, 0, l, t, name)


def dvis(
    data,
    fmt=None,
    s=1,
    vs=None,
    bs=None,
    c=0,
    l=0,
    t=None,
    name=None,
    n=None,
    meta=None,
    bounds=None,
    ms=None,
    vis_conf=None,
    shape="v",
    **kwargs,
):
    """Call to interact with web visualizer

    Args:
        data ([type]): [description]
        fmt ([type], optional): [description]. Defaults to None.
        vs (int, optional): [description]. Defaults to 1.
        c (int, optional): [description]. Defaults to 0.
        l (int, optional): [description]. Defaults to 0.
        t ([type], optional): [description]. Defaults to None.
        name ([type], optional): [description]. Defaults to None.
        meta ([type], optional): [description]. Defaults to None.
        bounds ([type], optional): [description]. Defaults to None.
        new ([type], optional): [description]. Defaults to None.
        ms ([type], optional): [description]. Defaults to None.
        vis_conf (dict, optional):
            - castShadows (bool): Mesh casts shadows?
            - receiveShadows (bool): Mesh receives shadows?
            - opacity (float): Material opacity (0-1)
            - transparent (bool): Material transparent?
        shape (str, optional): [description]. Defaults to "v".

    """
    if isinstance(l, int):
        l = [l]
    if isinstance(t, int):
        t = [t]
    if isinstance(c, str):
        c = int_hash(c)

    if n is not None:
        name = n  # name
    ### geometric shape
    if vs is not None:
        shape = "v"  # voxel
        s = vs
    if bs is not None:
        shape = "b"  # ball
        s = bs
    if fmt is None:
        data, fmt = _infer_format(data)

    if fmt in ["points", "xyz", "xyzrgb", "xyzr", "xyzl", "xyzc", "xyzrgba"]:
        dvis_points(data, fmt, s, c, l, t, name, meta, ms, vis_conf, shape, cm=kwargs.get("cm"))
    elif fmt in ["voxels", "whl", "whlc", "cwhl"]:
        dvis_voxels(data, fmt, s, c, l, t, name, meta, ms, vis_conf, shape, cm=kwargs.get("cm"))
    elif fmt in ["box", "bbox", "hbboxes", "hbboxes_c", "corners"]:
        dvis_box(data, fmt, s, c, l, t, name, meta, ms, vis_conf, shape)
    elif fmt in ["mesh"]:
        dvis_mesh(data, c, l, t, name, meta, ms, vis_conf)
    elif fmt == "vec":
        dvis_vec(data, s, c, l, t, name, meta, vis_conf)
    elif fmt == "line":
        dvis_line(data, s, c, l, t, name, meta, vis_conf)
    elif fmt == "arrow":
        dvis_arrow(data, s, c, l, t, name, meta, vis_conf)
    elif fmt == "transform":
        dvis_transform(data, s, c, l, t, name, meta, vis_conf)
    elif fmt == "cam_img":
        dvis_cam_img(data, s, l, t, name)
    elif fmt == "cam":
        dvis_cam(data, name)
    elif fmt == "seq":
        dvis_seq(data, vs, c, l, t, name, meta, vis_conf, fmt=fmt, cm=kwargs.get("cm",'default'), mi=kwargs.get('mi'), ma=kwargs.get('ma'))

    elif fmt == "cmd":
        dvis_cmd(data)
    elif fmt == "inject":
        dvis_inject(data)
    elif fmt == "obj_kf":
        dvis_obj_kf(data, t, name)
    elif fmt == "pose":
        dvis_pose(data, name)
    elif fmt in ["txt", "text"]:
        dvis_text(data, vs, c, l, t, name, meta, vis_conf)
    elif fmt == "track":
        dvis_track(data, name, vs, c, l)
    elif fmt in ["config", "conf", "cfg"]:
        dvis_cfg(data)
    elif fmt == "mesh_pc":
        dvis_mesh_pc(data, vs, c, l, t, name, meta, ms, vis_conf, shape)
    elif fmt == "group":
        dvis_group(name, meta)
    elif fmt in ["img", 'xyl', 'xyr']:
        dvis_img(data, vs, c, l, t, name, meta, vis_conf, fmt=fmt, cm=kwargs.get("cm",'default'), mi=kwargs.get('mi'), ma=kwargs.get('ma'))
    elif fmt == "hist":
        dvis_hist()
    else:
        print("Format unknown")
    """
    if new is not None:
        if isinstance(new, bool):
            ivis(port=port)
        elif isinstance(new, dict):
            ivis(width=new.get("width"), height=new.get("height"), url=new.get("url"), port=new.get("port", port))
    """


def dclear(reset_cam=False):
    send_clear(reset_cam)


def console():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("paths", type=str, nargs="+", help="paths")
    parser.add_argument("--vs", type=float, default=1, help="voxel size")
    parser.add_argument("--c", type=int, default=0, help="color")
    parser.add_argument("--m", type=dict, default={}, help="meta data")
    args = parser.parse_args()
    for path in args.paths:
        dvis(path, vs=args.vs, c=args.c, m=args.m)


if __name__ == "__main__":

    console()
