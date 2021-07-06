import trimesh
from dvis import dvis
import numpy as np

# input on layer 1
dvis(np.random.rand(1000,3),s=0.03,c=3, name='input/pts', l=1)
dvis([0,0,0,1,1,1], 'bbox', s=2, c=3, l=1, name='input/bbox')
# press 1 to toggle layer
# results on layer 2
dvis([0.1,0.2,-.2,0.7,1,0.9], 'bbox', s=2, c=4, l=2, name='result/bbox')
# press 2
# press Shift 1, Shift 2 to show both

# show along time
mesh = trimesh.load('examples/pyramid.obj')
dvis(mesh, t=1)
# press n to move to first key frame (t=1)
mesh.apply_translation([-2,0,0])
dvis(mesh, c=2, t=2)
