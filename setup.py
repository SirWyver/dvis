import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="dvis",
    version="0.8.7.3",
    author="Norman Müller",
    author_email="norman.mueller@tum.de",
    url="https://github.com/SirWyver/dvis",
    description="The best web-based visualizer",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.6",
    entry_points={
        "console_scripts": ["dvis=dvis.dvis_cli:dvis_cli",
        "dvis-server=dvis.dvis_cli:dvis_server_cli"],
    },
    install_requires=[
        "visdom",
        "trimesh",
        "pillow",
        "flask==2.3.2",
        "flask_socketio==4.3.0",
        "simple-websocket==0.2.0",
        "python-socketio==4.6.1",
        "eventlet",
        "fabric",
        "matplotlib",
        "opencv-python"
    ],
)
