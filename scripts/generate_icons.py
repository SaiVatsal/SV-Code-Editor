import os
import struct
import zlib

def create_png(width, height, r, g, b):
    # Minimal pure-Python uncompressed PNG generator
    def png_chunk(chunk_type, data):
        return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", zlib.crc32(chunk_type + data) & 0xffffffff)

    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # filter type none
        for x in range(width):
            # Draw a border and simple SV monogram
            is_border = (x == 0 or x == width - 1 or y == 0 or y == height - 1)
            if is_border:
                raw_data.extend([r // 2, g // 2, b // 2, 255])
            else:
                raw_data.extend([r, g, b, 255])

    compressed = zlib.compress(raw_data)
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0) # 8-bit RGBA
    
    png = b"\x89PNG\r\n\x1a\n"
    png += png_chunk(b"IHDR", ihdr_data)
    png += png_chunk(b"IDAT", compressed)
    png += png_chunk(b"IEND", b"")
    return png

def create_ico(png_data, width, height):
    # Minimal ICO header wrapping PNG
    header = struct.pack("<HHH", 0, 1, 1) # Reserved, Type 1 (ICO), 1 image
    w_byte = width if width < 256 else 0
    h_byte = height if height < 256 else 0
    entry = struct.pack("<BBBBHHII", w_byte, h_byte, 0, 0, 1, 32, len(png_data), 6 + 16)
    return header + entry + png_data

def main():
    icons_dir = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "icons")
    os.makedirs(icons_dir, exist_ok=True)

    # Color: Deep Navy/Slate background with cyan tone
    p32 = create_png(32, 32, 14, 165, 233)
    p128 = create_png(128, 128, 14, 165, 233)
    p256 = create_png(256, 256, 14, 165, 233)

    with open(os.path.join(icons_dir, "32x32.png"), "wb") as f:
        f.write(p32)
    with open(os.path.join(icons_dir, "128x128.png"), "wb") as f:
        f.write(p128)
    with open(os.path.join(icons_dir, "128x128@2x.png"), "wb") as f:
        f.write(p256)
    with open(os.path.join(icons_dir, "icon.ico"), "wb") as f:
        f.write(create_ico(p32, 32, 32))
    with open(os.path.join(icons_dir, "icon.icns"), "wb") as f:
        # icns placeholder header
        f.write(b"icns" + struct.pack(">I", 8))

    print("Icons generated successfully.")

if __name__ == "__main__":
    main()

