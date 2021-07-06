import trimesh
from dvis import dvis
import numpy as np
import time

mesh = trimesh.load('examples/pyramid.obj')
dvis(mesh, c=3, name='pyramid')
time.sleep(0.2)

steps=30
transl = np.concatenate([np.linspace(0,20,steps)[:,None],np.zeros((steps,2))],1)
transforms = []
for t in range(steps):
  transform = np.eye(4)
  transform[:3,3] = transl[t]
  transforms.append(transform)
track = {t+1: transform for t, transform in enumerate(transforms)}

dvis(track,'track', name='pyramid')

