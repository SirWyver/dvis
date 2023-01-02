import numpy as np
from dvis import dvis


imgseq = np.random.rand(4,200,200,1)

dvis(imgseq, "hist", mi=0.1,ma=0.8, nbins=10, name="lol", c=2) # layout={"title": {"text": "lol"}})

dvis(imgseq,'seq')
dvis([x for x in imgseq])
dvis(imgseq, name='kaka')


xyzr = np.concatenate([np.random.randint(0,30,(1000,3)), np.random.rand(1000,1)],1)
dvis(xyzr)

xyzl = np.concatenate([np.random.randint(0,30,(1000,3)), np.random.randint(0,100,(1000,1))],1)
dvis(xyzl)

img = np.ones((200,200)) *0.5
dvis(img)

img = np.random.randint(0,200,(200,200))
dvis(img)