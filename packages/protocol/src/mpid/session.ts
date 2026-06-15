/**
 * The MPID session: ECDH handshake, AES-128-CTR packet framing, and a
 * resync-safe RX reassembler. Transport-agnostic — feed it the FACTORY token
 * bytes and the bytes received on the RX characteristic; it returns the SESSION
 * payload to write and the decrypted application payloads.
 *
 * Wire frame:
 *   header = 0x7E ‖ counter(BE32) ‖ length(BE16) ‖ crc8(header[:7])
 *            length = len(payload)+1, or 0 for an empty packet
 *   body   = AES128_CTR(payload ‖ crc8(payload))   (when encrypted)
 *   iv     = counter(BE32) ‖ saltA(4) ‖ saltB(4) ‖ 00000000
 *            TX: saltA=local, saltB=peer;  RX: mirrored.
 *
 * Ported 1:1 from `python/hwportal/mpid.py:MpidSession`.
 */
import { concatBytes } from "./bytes";
import { crc8 } from "./crc8";
import {
  aes128Ctr,
  compressedPublicKey,
  deriveSessionKey,
  ecdhSharedX,
  randomPrivateKey,
} from "./crypto";
import { MpidToken } from "./token";

const PREAMBLE = 0x7e;
const MAX_PAYLOAD = 0x1ff;

function randomSalt(): Uint8Array {
  // 4 uniformly-random bytes, taken from a fresh random scalar (avoids needing
  // a second RNG entry point beyond the one @noble already uses).
  return randomPrivateKey().slice(0, 4);
}

export interface MpidSessionOptions {
  /** Inject a fixed ephemeral private key (tests / reproducibility). */
  readonly privateKey?: Uint8Array;
  /** Inject the 4-byte local salt (tests / reproducibility). */
  readonly localSalt?: Uint8Array;
}

type RxState = "READY" | "GOT_PREAMBLE" | "GOT_HEADER";

export class MpidSession {
  readonly localSalt: Uint8Array;
  sessionKey: Uint8Array | null = null;
  peerSalt: Uint8Array | null = null;
  encrypted = false;
  token: MpidToken | null = null;

  private readonly priv: Uint8Array;
  private txCounter = 0;
  private buf: number[] = [];
  private state: RxState = "READY";
  private plen = 0;

  constructor(options: MpidSessionOptions = {}) {
    this.priv = options.privateKey ?? randomPrivateKey();
    this.localSalt = options.localSalt ?? randomSalt();
    if (this.localSalt.length !== 4) throw new Error("localSalt must be 4 bytes");
  }

  /** Our 33-byte compressed public key (sent inside the SESSION payload). */
  get compressedPublicKey(): Uint8Array {
    return compressedPublicKey(this.priv);
  }

  /**
   * Parse the FACTORY token, run ECDH + the KDF, and return the 37-byte SESSION
   * payload (our compressed pubkey ‖ local salt) to write to the SESSION char.
   */
  startSession(factoryToken: Uint8Array): Uint8Array {
    const token = new MpidToken(factoryToken);
    this.peerSalt = token.salt;
    const sharedX = ecdhSharedX(this.priv, token.compressedPublicKey);
    this.sessionKey = deriveSessionKey(sharedX);
    this.encrypted = true;
    this.txCounter = 0;
    this.token = token;
    return concatBytes(this.compressedPublicKey, this.localSalt);
  }

  private makeIv(counter: number, saltA: Uint8Array, saltB: Uint8Array): Uint8Array {
    const iv = new Uint8Array(16);
    iv[0] = (counter >>> 24) & 0xff;
    iv[1] = (counter >>> 16) & 0xff;
    iv[2] = (counter >>> 8) & 0xff;
    iv[3] = counter & 0xff;
    iv.set(saltA, 4);
    iv.set(saltB, 8);
    return iv;
  }

  /** Build a full wire frame for `payload` (header + optional encrypted body). */
  encryptPacket(payload: Uint8Array): Uint8Array {
    if (payload.length > MAX_PAYLOAD) throw new Error("payload too long (max 511)");
    this.txCounter = (this.txCounter + 1) >>> 0;
    const counter = this.txCounter;
    const plen = payload.length ? payload.length + 1 : 0;

    const header = new Uint8Array(8);
    header[0] = PREAMBLE;
    header[1] = (counter >>> 24) & 0xff;
    header[2] = (counter >>> 16) & 0xff;
    header[3] = (counter >>> 8) & 0xff;
    header[4] = counter & 0xff;
    header[5] = (plen >>> 8) & 0xff;
    header[6] = plen & 0xff;
    header[7] = crc8(header.subarray(0, 7));

    if (!payload.length) return header;

    let body: Uint8Array = new Uint8Array(payload.length + 1);
    body.set(payload, 0);
    body[payload.length] = crc8(payload);
    if (this.encrypted && this.sessionKey && this.peerSalt) {
      const iv = this.makeIv(counter, this.localSalt, this.peerSalt);
      body = aes128Ctr(this.sessionKey, iv, body);
    }
    return concatBytes(header, body);
  }

  /** Feed bytes from RX indications; return any fully-decoded payloads. */
  feed(data: Uint8Array): Uint8Array[] {
    const out: Uint8Array[] = [];
    for (let i = 0; i < data.length; i++) {
      const payload = this.feedByte(data[i]);
      if (payload !== null) out.push(payload);
    }
    return out;
  }

  private resetRx(): void {
    this.buf = [];
    this.state = "READY";
    this.plen = 0;
  }

  private feedByte(b: number): Uint8Array | null {
    if (this.state === "READY") {
      if (b === PREAMBLE) {
        this.buf = [b];
        this.state = "GOT_PREAMBLE";
      }
      return null;
    }

    this.buf.push(b);

    if (this.state === "GOT_PREAMBLE") {
      if (this.buf.length >= 8) {
        if (crc8(Uint8Array.from(this.buf.slice(0, 7))) !== this.buf[7]) {
          this.resetRx(); // bad header → resync
          return null;
        }
        this.plen = (this.buf[5] << 8) | this.buf[6];
        if (this.plen === 0) {
          this.resetRx();
          return new Uint8Array(0); // empty packet
        }
        this.state = "GOT_HEADER";
      }
      return null;
    }

    if (this.state === "GOT_HEADER") {
      if (this.buf.length >= this.plen + 8) {
        let body: Uint8Array = Uint8Array.from(this.buf.slice(8, 8 + this.plen));
        const counter =
          ((this.buf[1] << 24) | (this.buf[2] << 16) | (this.buf[3] << 8) | this.buf[4]) >>> 0;
        if (this.encrypted && this.sessionKey && this.peerSalt) {
          const iv = this.makeIv(counter, this.peerSalt, this.localSalt);
          body = aes128Ctr(this.sessionKey, iv, body);
        }
        this.resetRx();
        if (crc8(body.subarray(0, body.length - 1)) !== body[body.length - 1]) {
          return null; // bad body CRC → drop
        }
        return body.subarray(0, body.length - 1);
      }
      return null;
    }

    this.resetRx();
    return null;
  }
}
