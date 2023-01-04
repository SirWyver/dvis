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

def dvis_server_cli():
    parser = ArgumentParser("DVIS server arguments")
    parser.add_argument("--port", type=int, default=5001)
    parser.add_argument("--visdom_port", type=int, default=4999)
    parser.add_argument("--no_visdom", action="store_true")
    args = parser.parse_args()

    from subprocess import Popen
    # start dvis server:
    dvis_server_cmd = f"cd server; conda run -n dvis_server python server.py --port {args.port}"
    commands = [dvis_server_cmd]
    print(f"DVIS server at: http://localhost:{args.port}")
    if not args.no_visdom:
        visdom_cmd = f"conda run -n dvis_server visdom -p {args.visdom_port}"
        commands.append(visdom_cmd)
        print(f"Visdom server at: http://localhost:{args.visdom_port}")
    procs = [Popen(cmd, shell=True) for cmd in commands]

    for p in procs:
        p.wait()