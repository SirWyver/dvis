from dvis import dvis
import numpy as np
# random pointcloud (format Nx3)
dvis(np.random.rand(1000,3)-1,s=0.03,c=3, name='pts/colored')
# 1000 points in the unit cube, size 0.03, color 3 -> teal

# random colored pointcloud (format Nx6))
pc_coords = np.random.rand(1000,3)+1
pc_rgb = np.random.rand(1000,3)
dvis(np.concatenate([pc_coords, pc_rgb],1),bs=0.03, name='pts/balls colored')
# 1000 colored points displayed as balls (bs)  (alteratively: shape='b')

pc_coords = np.random.rand(1000,3)+2
pc_intensity = pc_coords[:,2:3]-2
dvis(np.concatenate([pc_coords, pc_intensity],1),vs=0.02, name='pts/intensity')
# 1000 intensity colored points displayed,

# explicitly pass format
dvis(np.random.rand(1000,6),'xyzrgb',s=0.03,c=0, shape='v', name='pts/explicit')