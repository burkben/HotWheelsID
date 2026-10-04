# Third-party notices

Redline ID is licensed under the MIT License except for third-party material
identified below. The project does not grant additional rights to that material.

## Hot Wheels id catalog metadata

The bundled car catalog contains factual metadata derived from the community-run
[Hot Wheels Wiki page “Hot Wheels id”][catalog-source]:

- **Source page:** Hot Wheels Wiki, “Hot Wheels id”
- **Pinned revision:** `782123` (`2026-06-10T15:05:55Z`)
- **Contributors:** credited through the [source page history][catalog-history]
- **Machine-readable provenance:**
  [`apps/mobile/src/catalog/catalog-provenance.json`](apps/mobile/src/catalog/catalog-provenance.json)

Fandom's [general licensing page][fandom-license] says wiki text is CC BY-SA 3.0
unless a community uses an approved alternate license. The Hot Wheels Wiki's own
[copyright notice][wiki-copyright] references GFDL 1.2 or later and warns that the
notice may be outdated. This project preserves both references rather than
overstating which source term controls. Reusers should review the source terms.

## Hot Wheels id catalog artwork

The app bundles 135 car photographs from the same wiki. They are redistributed
under the Creative Commons Attribution-ShareAlike terms that Fandom applies to
user contributions.

- **Photographers:** 1steditionman, Autobot Scamper, Biddiblush, BigBadBrad01,
  Cyko9, Disoneiscool8746, GTRTURTLE, Grunty89, JohnW51, Justinizawesome05,
  Kevblokey, LesneyFan, MazdaL10B, Nezz79, Shnezman, Skingld, Tikinet, WorpeX
- **Per-image provenance:**
  [`apps/mobile/src/catalog/artwork.json`](apps/mobile/src/catalog/artwork.json)
  records the original `File:` page, uploader, licensing basis, source URL, and a
  SHA-256 of the bundled bytes for every photo
- **Modifications:** photos are scaled to a maximum width of 640px and renamed to
  the catalog car id. Image content is otherwise unaltered
- **Reproducible:** [`python/tools/fetch_catalog_artwork.py`](python/tools/fetch_catalog_artwork.py)
  regenerates the assets and the manifest from the wiki
- **Never fetched at runtime:** the photos ship inside the app binary. The app
  makes no network request to display them

Two licensing bases are recorded separately, because they are different claims:

| Basis | Images | Meaning |
| --- | --- | --- |
| `uploader-self` | 92 | The file page carries a `{{Self}}` template — the uploader asserts the photo is their own work, released under CC BY-SA |
| `wiki-default` | 43 | The file page carries no licensing template. Fandom's Terms of Use license user contributions under CC BY-SA, which is the basis relied on here |

Neither basis independently verifies that an uploader held the rights they
granted. If you are a rights holder and object to an image, please open an issue.
Each photo is isolated in `artwork.json`, so removing one is a single change.

“Hot Wheels” and “Hot Wheels id” are trademarks of Mattel, Inc. They are used only
to identify compatible discontinued hardware. Redline ID is not affiliated with,
endorsed by, or sponsored by Mattel, Inc. or Fandom, Inc.

[catalog-source]: https://hotwheels.fandom.com/wiki/Hot_Wheels_id?oldid=782123
[catalog-history]: https://hotwheels.fandom.com/wiki/Hot_Wheels_id?action=history
[fandom-license]: https://www.fandom.com/licensing
[wiki-copyright]: https://hotwheels.fandom.com/wiki/Hot_Wheels_Wiki:Copyrights

## Bundled fonts — SIL Open Font License 1.1

Barlow (400/500/600/700), Barlow Condensed (700/800/900 italic), and
Chakra Petch (500/600/700) are bundled, unmodified TTFs from the corresponding
`@expo-google-fonts` packages. They load locally; no font service is contacted.
The copyright notices and full licenses are also bundled in
[`fontLicenses.json`](apps/mobile/src/theme/fontLicenses.json) and readable
offline on the Credits screen.

### Barlow and Barlow Condensed

```text
Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

### Chakra Petch

```text
Copyright 2018 The Chakra Petch Project Authors (https://github.com/m4rc1e/Chakra-Petch.git)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```
