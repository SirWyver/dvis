import numpy as np
import cv2


def str2cmap(cm: str):
    return cv2.__dict__[f"COLORMAP_{cm.upper()}"]

def get_color(color_code, cm=None):
    if cm is None:
        # use default color palette
        color_code = int(color_code)
        if color_code >= 0:
            return color_palette[color_code % len(color_palette)]
        else:
            return special_color_palette[(-color_code - 1) % len(special_color_palette)]
    else:
        # TODO: Replace cv2 dependencies
        return cv2.applyColorMap(np.array(int(255*color_code),dtype=np.uint8), str2cmap(cm)).flatten()



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


def visualize_range(cont_label, img_ijs=None, H=None,W=None, cm="jet", mi=None, ma=None):
    """
    cont_label: (H, W) or (N,)
    """
    if cm is None:
        # explicit no conversion
        if len(cont_label.shape)==2:
            cont_label = np.tile(cont_label[..., None], 3)
        return cont_label

    if H is None and W is None:
        H, W = cont_label.shape
    x =cont_label 
    # convert invalid cont_label vals to 0
    x[np.isinf(x)] = 0
    x[np.isneginf(x)] = 0
    if mi is None:
        mi = np.min(x)  # get minimum cont_label 
    if ma is None:
        ma = np.max(x)
    x = np.clip(x,mi,ma)
    x = (x - mi) / max(ma - mi, 1e-8)  # normalize to 0~1
    x = np.clip((255 * x).astype(np.uint8),0,255)
    if img_ijs is not None:
        cont_label_img = np.zeros((H, W), dtype=np.uint8)
        cont_label_img[tuple(img_ijs.T)] = x
        x = cont_label_img
    x_ = cv2.applyColorMap(x, str2cmap(cm))
    return x_


def visualize_label(label, img_ijs=None, H=None,W=None, cm="default"):
    """
    label: (H, W) or (N,)
    """
    if cm is None:
        # explicit no conversion
        if len(label.shape)==2:
            label = np.tile(label[..., None], 3)
        return label
    if H is None and W is None:
        H, W = label.shape
    x =label 
    label_img = np.zeros((H, W, 3), dtype=np.uint8)
    if cm == "default":
        if img_ijs is not None:
            label_img[tuple(img_ijs.T)] = color_palette[x % len(color_palette)]
        else:
            label_img = color_palette[x % len(color_palette)].reshape((H, W, 3))
        label_img = label_img
    else:
        raise NotImplementedError("only default color palette supported atm")

    return label_img 



    