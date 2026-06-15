/**
 * The 136-byte protocol-version-1 manufacturing token read from the FACTORY
 * characteristic. Carries the device's compressed P-256 public key and salt,
 * which (with our ephemeral keypair) seed the ECDH session.
 */
export class MpidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MpidTokenError";
  }
}

function asciiOf(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

export class MpidToken {
  static readonly LENGTH = 136;

  readonly raw: Uint8Array;
  /** Raw 24-byte serial field (ASCII id, NUL/0-padded). */
  readonly serial: Uint8Array;
  /** Device compressed P-256 public key (33 bytes, `0x02`/`0x03` ‖ X). */
  readonly compressedPublicKey: Uint8Array;
  readonly machine: number;
  readonly keyId: number;
  readonly signature: Uint8Array;
  /** Device (peer) salt — the 4 bytes mixed into the RX/TX packet IVs. */
  readonly salt: Uint8Array;

  constructor(raw: Uint8Array) {
    if (raw.length < MpidToken.LENGTH) {
      throw new MpidTokenError(`token too short: ${raw.length} (< ${MpidToken.LENGTH})`);
    }
    this.raw = raw.slice(0, MpidToken.LENGTH);
    if (this.raw[0] !== 1) {
      throw new MpidTokenError(`unsupported protocol version ${this.raw[0]}`);
    }
    this.serial = this.raw.slice(1, 25);
    this.compressedPublicKey = this.raw.slice(25, 58);
    this.machine = (this.raw[63] << 8) | this.raw[64];
    this.keyId = (this.raw[65] << 16) | (this.raw[66] << 8) | this.raw[67];
    this.signature = this.raw.slice(68, 132);
    this.salt = this.raw.slice(132, 136);
  }

  /** The serial field decoded as ASCII (this is the device serial on fw 1.0.9). */
  get serialAscii(): string {
    return asciiOf(this.serial);
  }
}
