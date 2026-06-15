#!/usr/bin/env python3
"""Extract and decode the embedded MCPP.HWiD protobuf FileDescriptor from the
Unity IL2CPP metadata, and print it as a .proto. No external deps.

The descriptor is stored as a base64 string literal in global-metadata.dat
(Google.Protobuf C# codegen). We locate it, base64-decode, and walk the
FileDescriptorProto wire format.
"""
import base64
import struct

META = ("hwid_apk_src/resources/assets/bin/Data/Managed/Metadata/global-metadata.dat")
START = b"CgpIV2lELnByb3Rv"        # base64 of "\n\nHWiD.proto" -> start of descriptor
B64 = set(b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")

PROTO_TYPE = {
    1: "double", 2: "float", 3: "int64", 4: "uint64", 5: "int32", 6: "fixed64",
    7: "fixed32", 8: "bool", 9: "string", 10: "group", 11: "message", 12: "bytes",
    13: "uint32", 14: "enum", 15: "sfixed32", 16: "sfixed64", 17: "sint32", 18: "sint64",
}


def varint(b, i):
    shift = res = 0
    while True:
        x = b[i]; i += 1
        res |= (x & 0x7F) << shift
        if not (x & 0x80):
            return res, i
        shift += 7


def fields(data):
    """protobuf -> list of (field_number, wire_type, value)."""
    out, i, n = [], 0, len(data)
    while i < n:
        tag, i = varint(data, i)
        f, w = tag >> 3, tag & 7
        if w == 0:
            v, i = varint(data, i)
        elif w == 2:
            ln, i = varint(data, i); v = data[i:i + ln]; i += ln
        elif w == 5:
            v = data[i:i + 4]; i += 4
        elif w == 1:
            v = data[i:i + 8]; i += 8
        else:
            break
        out.append((f, w, v))
    return out


def first(fs, num):
    for f, w, v in fs:
        if f == num:
            return v
    return None


def all_of(fs, num):
    return [v for f, w, v in fs if f == num]


def parse_field(fdp):
    fs = fields(fdp)
    name = first(fs, 1).decode()
    number = first(fs, 3)
    label = first(fs, 4)          # 3 = repeated
    ftype = first(fs, 5)
    type_name = first(fs, 6)
    if ftype in (11, 14) and type_name:
        tn = type_name.decode().lstrip(".")
        # shorten MCPP.HWiD.Foo -> Foo
        tn = tn.split(".")[-1] if tn.startswith("MCPP.HWiD") else tn
        typ = tn
    else:
        typ = PROTO_TYPE.get(ftype, f"type{ftype}")
    prefix = "repeated " if label == 3 else ""
    return f"  {prefix}{typ} {name} = {number};"


def parse_enum(edp, indent="  "):
    fs = fields(edp)
    name = first(fs, 1).decode()
    lines = [f"{indent}enum {name} {{"]
    for v in all_of(fs, 2):
        vf = fields(v)
        lines.append(f"{indent}  {first(vf, 1).decode()} = {first(vf, 2) or 0};")
    lines.append(f"{indent}}}")
    return lines


def parse_message(dp, indent=""):
    fs = fields(dp)
    name = first(fs, 1).decode()
    lines = [f"{indent}message {name} {{"]
    for e in all_of(fs, 4):                       # nested enum_type
        lines += parse_enum(e, indent + "  ")
    for nt in all_of(fs, 3):                       # nested_type
        lines += parse_message(nt, indent + "  ")
    for fld in all_of(fs, 2):                       # field
        lines.append(indent + parse_field(fld))
    lines.append(f"{indent}}}")
    return lines


def main():
    data = open(META, "rb").read()
    s = data.find(START)
    if s < 0:
        raise SystemExit("descriptor start not found")
    j = s
    while j < len(data) and data[j] in B64:
        j += 1
    b64 = data[s:j]
    b64 = b64[: len(b64) // 4 * 4]
    raw = base64.b64decode(b64)

    fs = fields(raw)
    out = []
    pkg = None
    for f, w, v in fs:
        if f == 2:
            pkg = v.decode()
        elif f == 12:                              # syntax -> last field; stop
            break
    out.append('syntax = "proto3";')
    if pkg:
        out.append(f"package {pkg};")
    out.append("")
    for f, w, v in fs:
        if f == 5:                                  # top-level enum_type
            out += parse_enum(v, "")
            out.append("")
        if f == 12:
            break
    for f, w, v in fs:
        if f == 4:                                  # message_type
            out += parse_message(v, "")
            out.append("")
        if f == 12:
            break
    print("\n".join(out))


if __name__ == "__main__":
    main()
