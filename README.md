# DVIS: 3D Python visualizations

Simple performant web-based 3D visualizer interacting with python

Visualize your data with just one line of code!

![alt text](./static/dvis_ui.png )

## Getting started

### Install dvis package
```
pip install .
```
### Start server
```
cd server
python server.py
```
Verify you can open http://localhost:5001/

### Use client
```
import numpy as np
from dvis import dvis
dvis(np.random.rand(1000,6), s=0.03)
# sends randomly colored 1000x3 point cloud to the server
```
Verify you can see a colored point cloud

## Documentation
For an overview of available commands check out https://sirwyver.github.io/dvis_docu/

## Examples
Check out the examples in "./examples"
```
python examples/meshes.py
python examples/point_clouds.py
...
```


