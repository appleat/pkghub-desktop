"""生成 PkgHub 应用图标（纯标准库，无需 Pillow）。

输出：src-tauri/icons/ 下的 PNG 与多尺寸 ICO。
"""
import math
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src-tauri", "icons")
SS = 4  # 超采样倍数


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def rounded_rect_cov(x, y, x0, y0, x1, y1, r):
    """返回点 (x,y) 在圆角矩形内的覆盖率近似（0/1，靠超采样抗锯齿）。"""
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def render(size):
    """渲染 size x size 的 RGBA 字节（已超采样降噪）。"""
    big = size * SS
    acc = [[[0, 0, 0, 0] for _ in range(size)] for _ in range(size)]

    c1 = (99, 102, 241)    # indigo
    c2 = (139, 92, 246)    # violet
    c3 = (56, 189, 248)    # sky（左上高光）

    s = big
    bg_r = s * 0.235
    body = (s * 0.255, s * 0.415, s * 0.745, s * 0.775)   # x0,y0,x1,y1
    lid = (s * 0.225, s * 0.300, s * 0.775, s * 0.437)
    tape_w = s * 0.062
    cx_mid = s * 0.5

    for py in range(big):
        for px in range(big):
            ax = px / big
            ay = py / big
            if not rounded_rect_cov(px + 0.5, py + 0.5, s * 0.03, s * 0.03, s * 0.97, s * 0.97, bg_r):
                continue
            t = (ax + ay) / 2.0
            col = lerp(c1, c2, min(1.0, max(0.0, (t - 0.1) / 0.8)))
            # 左上柔光
            d = math.hypot(ax - 0.22, ay - 0.16)
            glow = max(0.0, 1.0 - d / 0.62) ** 2 * 0.55
            col = lerp(col, c3, glow)

            r, g, b, a = col[0], col[1], col[2], 255

            in_body = rounded_rect_cov(px + 0.5, py + 0.5, body[0], body[1], body[2], body[3], s * 0.035)
            in_lid = rounded_rect_cov(px + 0.5, py + 0.5, lid[0], lid[1], lid[2], lid[3], s * 0.030)
            if in_body or in_lid:
                r, g, b = 255, 255, 255
                # 盒身与盒盖之间留一道缝
                if body[1] <= py < body[1] + s * 0.012:
                    r, g, b = col[0] // 2 + 120, col[1] // 2 + 120, col[2] // 2 + 120
                # 胶带（浅紫）
                if abs(px - cx_mid) < tape_w / 2 and in_lid:
                    r, g, b = 199, 210, 254
                if abs(px - cx_mid) < tape_w / 2 and in_body:
                    r, g, b = 224, 231, 255

            i = px // SS
            j = py // SS
            cell = acc[j][i]
            cell[0] += r
            cell[1] += g
            cell[2] += b
            cell[3] += a

    n = SS * SS
    rows = []
    for j in range(size):
        row = bytearray()
        for i in range(size):
            cell = acc[j][i]
            if cell[3] == 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes((cell[0] // n, cell[1] // n, cell[2] // n, cell[3] // n))
        rows.append(bytes(row))
    return rows


def write_png(path, size):
    rows = render(size)
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def write_ico(path, sizes):
    blobs = []
    for s in sizes:
        p = os.path.join(OUT, f"_tmp_{s}.png")
        write_png(p, s)
        with open(p, "rb") as f:
            blobs.append((s, f.read()))
        os.remove(p)
    head = struct.pack("<HHH", 0, 1, len(blobs))
    offset = 6 + 16 * len(blobs)
    entries = b""
    data = b""
    for s, blob in blobs:
        dim = 0 if s >= 256 else s
        entries += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)
        data += blob
    with open(path, "wb") as f:
        f.write(head + entries + data)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    write_png(os.path.join(OUT, "32x32.png"), 32)
    write_png(os.path.join(OUT, "128x128.png"), 128)
    write_png(os.path.join(OUT, "128x128@2x.png"), 256)
    write_png(os.path.join(OUT, "icon.png"), 512)
    write_ico(os.path.join(OUT, "icon.ico"), [16, 24, 32, 48, 64, 128, 256])
    print("icons ok ->", OUT)
