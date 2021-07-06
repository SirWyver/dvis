from dvis import dvis
import trimesh
import numpy as np

# load mesh from path
dvis("examples/pyramid.obj", name='pyramid')

mesh = trimesh.load('examples/pyramid.obj')
mesh.apply_translation([-2,0,0])
# display trimesh
dvis(mesh, c=12, name='colored_pyramid')
