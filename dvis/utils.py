import numpy as np


def get_color(color_code):
    color_code = int(color_code)
    if color_code >= 0:
        return color_palette[color_code % len(color_palette)]
    else:
        return special_color_palette[(-color_code - 1) % len(special_color_palette)]


color_palette = (
    np.array(
        [
            [23, 23, 252],
            [174, 199, 232],  # wall
            [152, 223, 138],  # floor
            [31, 119, 180],  # cabinet
            [255, 187, 120],  # bed
            [188, 189, 34],  # chair
            [140, 86, 75],  # sofa
            [255, 152, 150],  # table
            [214, 39, 40],  # door
            [197, 176, 213],  # window
            [148, 103, 189],  # bookshelf
            [196, 156, 148],  # picture
            [23, 190, 207],  # counter
            [178, 76, 76],
            [247, 182, 210],  # desk
            [66, 188, 102],
            [219, 219, 141],  # curtain
            [140, 57, 197],
            [202, 185, 52],
            [51, 176, 203],
            [200, 54, 131],
            [92, 193, 61],
            [78, 71, 183],
            [172, 114, 82],
            [255, 127, 14],  # refrigerator
            [91, 163, 138],
            [153, 98, 156],
            [140, 153, 101],
            [158, 218, 229],  # shower curtain
            [100, 125, 154],
            [178, 127, 135],
            [120, 185, 128],
            [146, 111, 194],
            [44, 160, 44],  # toilet
            [112, 128, 144],  # sink
            [96, 207, 209],
            [227, 119, 194],  # bathtub
            [213, 92, 176],
            [94, 106, 211],
            [82, 84, 163],  # otherfurn
            [100, 85, 144],
        ]
    )
    / 255
)

special_color_palette = (
    np.array(
        [
            [255, 5, 5],  # red
            [5, 255, 5],  # green
            [5, 5, 255],  # blue
            [255, 255, 255],  # white
            [0, 0, 0],  # black
            [255, 155, 0],  # orange
            [255, 255, 0],  # yellow
            [155, 0, 255],  # purple
        ]
    )
    / 255
)