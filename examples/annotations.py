from numpy import random
from dvis import dvis
import numpy as np

# axis-aligned bounding box, (min,max)-coords: (,6) format
dvis([0,1,2,3,4,5],'bbox', s=2, c=3)
# batch of 5 bounding boxes
random_bboxes = np.random.randint(0,10,(5,3))
random_bboxes = np.concatenate([random_bboxes, random_bboxes+np.random.randint(0,10,(5,3))],1)
# format (Nx6)
dvis(random_bboxes, 'bbox', name='bbox_batch')

# batch of oriented bounding boxes (z is upwards)
centers = np.random.randint(0,10,(5,3))
extents = np.random.uniform(1,5,(5,3))
orients = np.random.uniform(-np.pi, np.pi, (5,1))
hbboxes = np.concatenate([centers,extents,orients],1)
dvis(hbboxes, 'hbboxes', c=3, name='OBB')
# batch of colored oriented bboxes
colors = np.random.randint(0,30,(5,1))
hbboxes_c = np.concatenate([centers-10,extents,orients,colors],1)
dvis(hbboxes_c, 'hbboxes_c', c=3, name='OBB colored')
# vector (start pos, end pos)
dvis([1,1,1,4,5,6]  ,'vec', name='vec')
# vecs (several vectors )
dvis(np.concatenate([np.zeros((20,3)), np.random.rand(20,3)],1)  ,'vec', name='batched vec')
# line (line connecting points)
dvis(np.array([[0,0,0],[-1,-1,-1],[0,-1,0],[0,-1,-1],[0,0,-1]]) ,'line', name='line', s=5, c=2)
# arrow
dvis(3*np.eye(4) ,'arrow', name='arrow', s=0.4, c=3)
# transformation (displayed as axes helper)
transf = np.eye(4)
transf[:3,3] = np.array([-1,-2,-2])
dvis(transf, 'transform',name='transform')
