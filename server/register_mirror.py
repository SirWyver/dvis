import numpy as np
from pathlib import Path
import trimesh


def load_mesh_ds(obj_path, num_verts=5000):
    obj_path = Path(obj_path)
    obj_path_ds = Path(obj_path.parent, obj_path.stem + "_ds" + obj_path.suffix)
    if obj_path_ds.exists():
        obj_mesh = trimesh.load(str(obj_path_ds))
    else:
        obj_mesh = trimesh.load(str(obj_path), force="mesh")
        obj_mesh = obj_mesh.simplify_quadratic_decimation(num_verts)
        obj_mesh.export(obj_path_ds)
    return obj_mesh


def mimick_current_scene(scan_name, frame_idx, obj_path=None, obj_pose=None, num_pts=10000, num_verts=5000):
    # load scene wa
    # TODO: HARDCODED FOR NOW
    from dyme import Dyme
    seq_out_root = "/cluster/seti/norman/datasets/real_4d/"
    dy = Dyme(Path(seq_out_root, scan_name))
    pc_wa = dy.load(f"pc_wa/{frame_idx}.npz")
    pc_wa_ds = pc_wa[np.random.choice(np.arange(len(pc_wa)), num_pts, replace=False), :6]
    if obj_path is not None:
        obj_mesh = load_mesh_ds(Path(obj_path), num_verts)
        obj_mesh.apply_transform(obj_pose)
        obj_pts, _ = trimesh.sample.sample_surface_even(obj_mesh, 500)
        return pc_wa_ds, obj_pts
    return pc_wa_ds


if __name__ == "__main__":
    obj_pose = (
        np.array(
            [
                -0.04236283650346806,
                -1.099375103909963e-19,
                0.9991022921019551,
                0,
                -5.187951212677462e-18,
                1,
                -1.099375103909963e-19,
                0,
                -0.9991022921019551,
                -5.187951212677462e-18,
                -0.04236283650346806,
                0,
                -0.04821004138601398,
                0.5218515463502184,
                2.088754909052092,
                1,
            ]
        )
        .reshape(4, 4)
        .T
    )
    r = dict(scan_name="office_v2_6", frame_idx=800, obj_path="chairs/3b2d9328ab28f70122c4f7f8c92935f0", obj_pose=obj_pose)
    input_pts, obj_pts = mimick_current_scene(r["scan_name"], r["frame_idx"], r["obj_path"], r["obj_pose"])
    # dvis(input_pts, vs=0.01)
    # dvis(obj_pts, vs=0.03,c=4)
    icp_transform = icp_reg(obj_pts[:, :3], input_pts[:, :3])
    # dvis(dot(icp_transform, obj_pts),vs=0.03, c=5)
