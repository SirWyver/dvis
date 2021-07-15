import re
from dvis import dvis
import trimesh
import numpy as np
import requests
import io
import PIL


# random images directly from float/int array
dvis(np.random.randint(0,255,(300,400,3)), 'img', name='random int arr')
dvis(np.random.rand(300,400,3), 'img', name='random float arr')

# real intensity image
response = requests.get("https://i.imgur.com/ExdKOOz.png")
img = PIL.Image.open(io.BytesIO(response.content))
dvis(img, 'img', name='intensity')

# real colored image
response = requests.get("https://img.memecdn.com/PANDALISM_o_97008.jpg")
img = PIL.Image.open(io.BytesIO(response.content))
dvis(img, 'img', name='panda')
