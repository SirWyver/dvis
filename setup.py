import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="dvis",  # Replace with your own username
    version="0.8.1.3",
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
)
