import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_sv_icon(size=512):
    # Canvas with alpha
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = size * 0.06
    corner_radius = size * 0.22

    # Draw rounded squircle background with gradient
    bg_mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(bg_mask)
    mask_draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=int(corner_radius),
        fill=255
    )

    # Base gradient image (deep midnight navy to dark purple-slate)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for y in range(size):
        ratio = y / float(size)
        # Gradient from #0d1117 (13, 17, 23) to #1e1b4b (30, 27, 75)
        r = int(13 + (30 - 13) * ratio)
        g = int(17 + (27 - 17) * ratio)
        b = int(23 + (85 - 23) * ratio)
        ImageDraw.Draw(bg).line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Apply mask
    bg_composite = Image.composite(bg, img, bg_mask)

    # Draw border glow / accent
    border_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_img)
    border_width = max(2, int(size * 0.025))
    
    # Gradient border (cyan to purple)
    for b_step in range(border_width):
        b_pad = pad + b_step
        border_draw.rounded_rectangle(
            [b_pad, b_pad, size - b_pad, size - b_pad],
            radius=int(corner_radius - b_step),
            outline=(56, 189, 248, int(220 - (b_step * 30))),
            width=1
        )
    
    final_img = Image.alpha_composite(bg_composite, border_img)
    draw_fg = ImageDraw.Draw(final_img)

    # Draw Stylized SV & Code Bracket motif
    # Left bracket <
    # Coordinates normalized to size
    cx = size / 2.0
    cy = size / 2.0

    # Draw "<" bracket in Electric Cyan (#38bdf8)
    cyan = (56, 189, 248, 255)
    purple = (168, 85, 247, 255)
    white = (255, 255, 255, 255)
    lw = max(3, int(size * 0.045)) # Line width

    # Left bracket
    bx1 = cx - size * 0.28
    bx2 = cx - size * 0.14
    by1 = cy - size * 0.22
    by2 = cy
    by3 = cy + size * 0.22
    draw_fg.line([(bx2, by1), (bx1, by2), (bx2, by3)], fill=cyan, width=lw, joint="curve")

    # Right bracket >
    rx1 = cx + size * 0.28
    rx2 = cx + size * 0.14
    draw_fg.line([(rx2, by1), (rx1, by2), (rx2, by3)], fill=purple, width=lw, joint="curve")

    # Center stylized "SV" code monogram
    # "S" curve top-center to middle
    sx1 = cx - size * 0.06
    sx2 = cx + size * 0.08
    sy1 = cy - size * 0.20
    sy2 = cy - size * 0.10
    sy3 = cy - size * 0.01

    draw_fg.line([(sx2, sy1), (sx1, sy1), (sx1, sy2), (sx2, sy2), (sx2, sy3), (sx1, sy3)], fill=white, width=lw, joint="curve")

    # "V" chevron in middle-bottom
    vx1 = cx - size * 0.08
    vx2 = cx + size * 0.08
    vy1 = cy + size * 0.04
    vy2 = cy + size * 0.20
    draw_fg.line([(vx1, vy1), (cx, vy2), (vx2, vy1)], fill=cyan, width=lw, joint="curve")

    # Glowing subtle core dot
    dot_r = size * 0.02
    draw_fg.ellipse([cx - dot_r, cy - size * 0.005 - dot_r, cx + dot_r, cy - size * 0.005 + dot_r], fill=purple)

    return final_img

def main():
    icons_dir = r"G:\SV Code Editor\src-tauri\icons"
    os.makedirs(icons_dir, exist_ok=True)

    base_icon = create_sv_icon(512)

    # Export PNG resolutions
    base_icon.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "32x32.png"), "PNG")
    base_icon.resize((128, 128), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "128x128.png"), "PNG")
    base_icon.resize((256, 256), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "128x128@2x.png"), "PNG")
    base_icon.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "icon.png"), "PNG")

    # Multi-resolution ICO for Windows
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    base_icon.save(
        os.path.join(icons_dir, "icon.ico"),
        format="ICO",
        sizes=ico_sizes
    )

    print("Icons successfully generated with high-definition multi-resolution ICO & PNGs!")

if __name__ == "__main__":
    main()
