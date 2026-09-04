import { Buffer } from 'node:buffer'

export const SDCP_PORT = 53484
export const SDCP_MAX_DATA_LENGTH = 0x01f3
export const SDCP_VERSION = 0x03
export const SDCP_CATEGORY = 0x0b
export const SDCP_COMMUNITY = 'SONY'
export const SDCP_ITEM_MONITOR_COMMAND = 0xb000
export const SDCP_REQUEST = 0x00
export const SDCP_RESPONSE_OK = 0x01
export const SDCP_RESPONSE_NG = 0x00

const FIXED_HEADER_LENGTH = 13
const HEADER_PREFIX = Buffer.from([SDCP_VERSION, SDCP_CATEGORY, 0x53, 0x4f, 0x4e, 0x59])

export interface SdcpFrame {
	version: number
	category: number
	community: string
	groupId: number
	unitId: number
	requestResponse: number
	itemNo: number
	dataLength: number
	payload: Buffer
	raw: Buffer
}

export interface ParsedVmcPayload {
	category: string
	item?: string
	value?: string
	raw: string
}

/**
 * Encode the monitor unit ID using the convention of the legacy module.
 *
 * Sony documents unit IDs as decimal 1..99 in the UI. The legacy module placed
 * the two-digit representation directly into the packet hex stream, so 1 ->
 * 0x01 and 12 -> 0x12. This BCD-like representation is intentionally preserved
 * until a hardware trace demonstrates otherwise.
 */
export function encodeMonitorId(monitorId: number): number {
	if (!Number.isInteger(monitorId) || monitorId < 1 || monitorId > 99) {
		throw new RangeError('Monitor ID must be an integer from 1 to 99')
	}

	return Number.parseInt(monitorId.toString().padStart(2, '0'), 16)
}

export function buildSdcpFrame(
	monitorId: number,
	payload: string | Buffer,
	options: { requestResponse?: number; groupId?: number; itemNo?: number } = {},
): Buffer {
	const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'ascii')
	if (data.length > SDCP_MAX_DATA_LENGTH) {
		throw new RangeError(`SDCP payload is ${data.length} bytes; maximum is ${SDCP_MAX_DATA_LENGTH}`)
	}

	const frame = Buffer.alloc(FIXED_HEADER_LENGTH + data.length)
	frame[0] = SDCP_VERSION
	frame[1] = SDCP_CATEGORY
	frame.write(SDCP_COMMUNITY, 2, 4, 'ascii')
	frame[6] = options.groupId ?? 0x00
	frame[7] = encodeMonitorId(monitorId)
	frame[8] = options.requestResponse ?? SDCP_REQUEST
	frame.writeUInt16BE(options.itemNo ?? SDCP_ITEM_MONITOR_COMMAND, 9)
	frame.writeUInt16BE(data.length, 11)
	data.copy(frame, FIXED_HEADER_LENGTH)
	return frame
}

export function parseSdcpFrame(raw: Buffer): SdcpFrame {
	if (raw.length < FIXED_HEADER_LENGTH) throw new Error('SDCP frame is shorter than the 13-byte header')
	if (!raw.subarray(0, HEADER_PREFIX.length).equals(HEADER_PREFIX)) {
		throw new Error('Invalid SDCP version/category/community header')
	}

	const dataLength = raw.readUInt16BE(11)
	if (dataLength > SDCP_MAX_DATA_LENGTH) throw new Error(`Invalid SDCP data length: ${dataLength}`)
	const expectedLength = FIXED_HEADER_LENGTH + dataLength
	if (raw.length !== expectedLength) {
		throw new Error(`SDCP frame length mismatch: expected ${expectedLength}, received ${raw.length}`)
	}

	return {
		version: raw[0],
		category: raw[1],
		community: raw.subarray(2, 6).toString('ascii'),
		groupId: raw[6],
		unitId: raw[7],
		requestResponse: raw[8],
		itemNo: raw.readUInt16BE(9),
		dataLength,
		payload: Buffer.from(raw.subarray(FIXED_HEADER_LENGTH)),
		raw: Buffer.from(raw),
	}
}

export function parseVmcPayload(payload: Buffer): ParsedVmcPayload | null {
	if (payload.length === 0) return null
	const raw = payload.toString('ascii')
	const parts = raw.split(' ')
	const category = parts.shift() ?? ''
	const item = parts.shift()
	const value = parts.length > 0 ? parts.join(' ') : undefined
	return { category, item, value, raw }
}

/**
 * Streaming decoder for TCP. It accepts arbitrary chunk boundaries and emits
 * zero or more complete SDCP frames. Garbage before a valid SDCP prefix is
 * discarded while retaining a possible partial prefix at the end of a chunk.
 */
export class SdcpFrameDecoder {
	private buffer = Buffer.alloc(0)

	push(chunk: Buffer): SdcpFrame[] {
		if (chunk.length === 0) return []
		this.buffer = Buffer.concat([this.buffer, chunk])
		const frames: SdcpFrame[] = []

		while (this.buffer.length > 0) {
			if (this.buffer.length < HEADER_PREFIX.length) break

			if (!this.buffer.subarray(0, HEADER_PREFIX.length).equals(HEADER_PREFIX)) {
				const next = this.buffer.indexOf(HEADER_PREFIX, 1)
				if (next >= 0) {
					this.buffer = this.buffer.subarray(next)
					continue
				}

				const keep = Math.min(this.buffer.length, HEADER_PREFIX.length - 1)
				this.buffer = Buffer.from(this.buffer.subarray(this.buffer.length - keep))
				break
			}

			if (this.buffer.length < FIXED_HEADER_LENGTH) break
			const dataLength = this.buffer.readUInt16BE(11)
			if (dataLength > SDCP_MAX_DATA_LENGTH) {
				// A valid prefix followed by an impossible length cannot be a frame.
				// Advance one byte and let the prefix search resynchronise.
				this.buffer = this.buffer.subarray(1)
				continue
			}

			const frameLength = FIXED_HEADER_LENGTH + dataLength
			if (this.buffer.length < frameLength) break

			const rawFrame = Buffer.from(this.buffer.subarray(0, frameLength))
			this.buffer = this.buffer.subarray(frameLength)
			frames.push(parseSdcpFrame(rawFrame))
		}

		return frames
	}

	reset(): void {
		this.buffer = Buffer.alloc(0)
	}

	get bufferedBytes(): number {
		return this.buffer.length
	}
}
