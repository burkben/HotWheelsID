#!/usr/bin/env python3
"""Extract the CRC8 lookup table from libnative-lib.so (no external deps).

Ghidra rebased the image by 0x100000, so the Ghidra label crc8_table @ 0x15aff8
corresponds to real ELF vaddr 0x5aff8.
"""
import struct

SO = "hwid_apk_src/resources/lib/arm64-v8a/libnative-lib.so"
TABLE_VA = 0x5aff8  # = Ghidra 0x15aff8 - 0x100000

data = open(SO, "rb").read()
e_shoff = struct.unpack_from("<Q", data, 0x28)[0]
e_shentsize = struct.unpack_from("<H", data, 0x3a)[0]
e_shnum = struct.unpack_from("<H", data, 0x3c)[0]

secs = []
for i in range(e_shnum):
    b = e_shoff + i * e_shentsize
    secs.append((
        struct.unpack_from("<Q", data, b + 16)[0],  # sh_addr
        struct.unpack_from("<Q", data, b + 24)[0],  # sh_offset
        struct.unpack_from("<Q", data, b + 32)[0],  # sh_size
    ))

def read(va, n):
    for a, o, s in secs:
        if a and a <= va < a + s:
            off = o + (va - a)
            return data[off:off + n]
    return None

# The slot at 0x5aff8 is a relocated pointer to the table. The lib isn't stripped,
# so just look up the actual symbol (e.g. crc8_table) and read at its st_value.
SHT_SYMTAB, SHT_DYNSYM = 2, 11

def sh(i, field_off, sz="<Q"):
    return struct.unpack_from(sz, data, e_shoff + i * e_shentsize + field_off)[0]

found = []
for i in range(e_shnum):
    sh_type = sh(i, 4, "<I")
    if sh_type not in (SHT_SYMTAB, SHT_DYNSYM):
        continue
    sym_off = sh(i, 24); sym_size = sh(i, 32)
    link = sh(i, 40, "<I")               # sh_link -> string table section
    str_off = sh(link, 24)
    for off in range(sym_off, sym_off + sym_size, 24):
        st_name = struct.unpack_from("<I", data, off)[0]
        st_value = struct.unpack_from("<Q", data, off + 8)[0]
        # read symbol name
        e = data.index(b"\x00", str_off + st_name)
        name = data[str_off + st_name:e].decode("latin1")
        if "crc8" in name.lower() and st_value:
            found.append((name, st_value))

for name, val in found:
    print("symbol %-20s @ 0x%x" % (name, val))

# pick a symbol that looks like the table (not the function crc8_calc)
tbl_va = None
for name, val in found:
    if "table" in name.lower():
        tbl_va = val; break
if tbl_va is None and found:
    tbl_va = found[0][1]
if tbl_va is None:
    raise SystemExit("no crc8 symbol found")
print("using table vaddr 0x%x" % tbl_va)
TABLE_VA = tbl_va

tbl = read(TABLE_VA, 256)
if tbl is None:
    raise SystemExit("vaddr 0x%x not mapped" % TABLE_VA)

print("t[0..15]:", tbl[:16].hex())
print("distinct bytes:", len(set(tbl)))
print("t[1]=%d t[2]=%d t[4]=%d t[8]=%d t[0x80]=%d" % (tbl[1], tbl[2], tbl[4], tbl[8], tbl[0x80]))

# Identify polynomial: for a table-driven CRC8 with crc=table[crc^b],
# table[1] is the reduction of 0x01 -> reveals reflected vs normal + poly.
print("\nFULL TABLE:")
print(",".join(str(b) for b in tbl))

# Try to recover polynomial assuming MSB-first (non-reflected): table[i] built by
# 8 rounds of: c = (c<<1) ^ (poly if c&0x80 else 0), starting c=i.
def build_msb(poly):
    t = []
    for i in range(256):
        c = i
        for _ in range(8):
            c = ((c << 1) ^ poly) & 0xff if (c & 0x80) else (c << 1) & 0xff
        t.append(c)
    return t

def build_lsb(poly):
    t = []
    for i in range(256):
        c = i
        for _ in range(8):
            c = (c >> 1) ^ poly if (c & 1) else (c >> 1)
        t.append(c)
    return t

want = list(tbl)
for poly in range(256):
    if build_msb(poly) == want:
        print("\nMATCH: MSB-first (normal) poly=0x%02x" % poly); break
    if build_lsb(poly) == want:
        print("\nMATCH: LSB-first (reflected) poly=0x%02x" % poly); break
else:
    print("\nNo simple poly match (table embedded literally is fine).")
