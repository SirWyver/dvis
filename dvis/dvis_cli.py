from dvis import dvis
from argparse import ArgumentParser

def dvis_cli():
    parser = ArgumentParser("DVIS arguments")
    parser.add_argument("data", type=str)
    parser.add_argument("-fmt", type=str)
    parser.add_argument("-s", type=float, default=1)
    parser.add_argument("-vs", type=float)
    parser.add_argument("-bs", type=float)
    parser.add_argument("-c", type=int, default=0)
    parser.add_argument("-l", type=int, default=0)
    parser.add_argument("-t", type=int)
    parser.add_argument("-name", type=str)
    args = parser.parse_args()
    dvis(data=args.data, fmt=args.fmt, s=args.s, vs=args.vs, bs=args.bs, c=args.c, l=args.l, t=args.t, name=args.name)

