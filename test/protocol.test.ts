import assert from 'node:assert/strict'
import test from 'node:test'
import {
	buildSdcpFrame,
	encodeMonitorId,
	parseVmcPayload,
	SDCP_RESPONSE_OK,
	SdcpFrameDecoder,
} from '../src/protocol.js'

void test('builds the legacy-compatible Sony SDCP frame', () => {
	const frame = buildSdcpFrame(1, 'INFObutton MENU')

	assert.equal(frame.subarray(0, 6).toString('hex'), '030b534f4e59')
	assert.equal(frame[6], 0x00)
	assert.equal(frame[7], 0x01)
	assert.equal(frame[8], 0x00)
	assert.equal(frame.readUInt16BE(9), 0xb000)
	assert.equal(frame.readUInt16BE(11), 15)
	assert.equal(frame.subarray(13).toString('ascii'), 'INFObutton MENU')
})

void test('payload length field is bytes, not hexadecimal characters', () => {
	const payload = 'STATget MODEL'
	const frame = buildSdcpFrame(1, payload)

	assert.equal(Buffer.byteLength(payload, 'ascii'), 13)
	assert.equal(frame.readUInt16BE(11), 13)
	assert.equal(frame.length, 26)
})

void test('monitor ID preserves legacy two-digit packet encoding', () => {
	assert.equal(encodeMonitorId(1), 0x01)
	assert.equal(encodeMonitorId(9), 0x09)
	assert.equal(encodeMonitorId(12), 0x12)
	assert.equal(encodeMonitorId(99), 0x99)
	assert.throws(() => encodeMonitorId(0), /1 to 99/)
	assert.throws(() => encodeMonitorId(100), /1 to 99/)
})

void test('decoder reassembles a response fragmented across TCP chunks', () => {
	const response = buildSdcpFrame(1, 'STATret MODEL BVM-X300', { requestResponse: SDCP_RESPONSE_OK })
	const decoder = new SdcpFrameDecoder()

	assert.deepEqual(decoder.push(response.subarray(0, 5)), [])
	assert.deepEqual(decoder.push(response.subarray(5, 12)), [])
	assert.deepEqual(decoder.push(response.subarray(12, 18)), [])

	const frames = decoder.push(response.subarray(18))
	assert.equal(frames.length, 1)
	assert.equal(frames[0].requestResponse, SDCP_RESPONSE_OK)
	assert.equal(frames[0].payload.toString('ascii'), 'STATret MODEL BVM-X300')
	assert.equal(decoder.bufferedBytes, 0)

	const vmc = parseVmcPayload(frames[0].payload)
	assert.deepEqual(vmc, {
		category: 'STATret',
		item: 'MODEL',
		value: 'BVM-X300',
		raw: 'STATret MODEL BVM-X300',
	})
})

void test('decoder emits multiple frames received in one TCP chunk', () => {
	const first = buildSdcpFrame(1, '', { requestResponse: SDCP_RESPONSE_OK })
	const second = buildSdcpFrame(1, 'STATret SERIAL 12345', { requestResponse: SDCP_RESPONSE_OK })
	const frames = new SdcpFrameDecoder().push(Buffer.concat([first, second]))

	assert.equal(frames.length, 2)
	assert.equal(frames[0].dataLength, 0)
	assert.equal(frames[1].payload.toString('ascii'), 'STATret SERIAL 12345')
})
