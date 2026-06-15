#!/usr/bin/env python3
"""Minimal protobuf wire-format decoder for analyzing decrypted MPID payloads.

Usage: python tools/pb_decode.py <hex> [<hex> ...]
"""
import struct
import sys


def read_varint(buf, i):
    shift = 0
    result = 0
    while True:
        b = buf[i]
        i += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            return result, i
        shift += 7


def try_decode(buf):
    """Return list of (field, wire, value) or None if it isn't valid protobuf."""
    fields = []
    i = 0
    n = len(buf)
    while i < n:
        try:
            tag, i = read_varint(buf, i)
        except IndexError:
            return None
        field, wire = tag >> 3, tag & 7
        if field == 0:
            return None
        if wire == 0:
            val, i = read_varint(buf, i)
            fields.append((field, wire, val))
        elif wire == 1:
            if i + 8 > n:
                return None
            fields.append((field, wire, buf[i:i + 8]))
            i += 8
        elif wire == 2:
            ln, i = read_varint(buf, i)
            if i + ln > n:
                return None
            fields.append((field, wire, buf[i:i + ln]))
            i += ln
        elif wire == 5:
            if i + 4 > n:
                return None
            fields.append((field, wire, buf[i:i + 4]))
            i += 4
        else:
            return None
    return fields


def fmt_ld(data, indent):
    nested = try_decode(data)
    # prefer nested only if it cleanly looks like a message
    if nested is not None and len(data) > 0 and all(f[0] < 64 for f in nested):
        printable = sum(1 for b in data if 32 <= b < 127)
        looks_text = printable >= len(data) - 1 and len(data) > 1
        if not looks_text:
            return "msg:\n" + render(nested, indent + 1)
    ascii_ = "".join(chr(b) if 32 <= b < 127 else "." for b in data)
    return f"bytes({len(data)})={data.hex()}  |{ascii_}|"


def render(fields, indent=0):
    pad = "  " * indent
    out = []
    for field, wire, val in fields:
        if wire == 0:
            extra = ""
            if val > 0:
                # show as signed (zigzag) too, occasionally useful
                pass
            out.append(f"{pad}#{field} varint = {val}{extra}")
        elif wire == 1:
            d = struct.unpack("<d", val)[0]
            u = struct.unpack("<Q", val)[0]
            out.append(f"{pad}#{field} 64bit = {val.hex()} (double={d:g}, u64={u})")
        elif wire == 5:
            f = struct.unpack("<f", val)[0]
            u = struct.unpack("<I", val)[0]
            out.append(f"{pad}#{field} 32bit = {val.hex()} (float={f:g}, u32={u})")
        elif wire == 2:
            out.append(f"{pad}#{field} {fmt_ld(val, indent)}")
    return "\n".join(out)


for h in sys.argv[1:]:
    data = bytes.fromhex(h)
    print("=" * 70)
    print("payload (%dB): %s" % (len(data), h))
    fields = try_decode(data)
    if fields is None:
        print("  (not valid protobuf)")
    else:
        print(render(fields))
