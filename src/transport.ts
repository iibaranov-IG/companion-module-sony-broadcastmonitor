import { InstanceStatus, TCPHelper } from '@companion-module/base'
import {
	buildSdcpFrame,
	parseVmcPayload,
	SDCP_RESPONSE_NG,
	SDCP_RESPONSE_OK,
	SdcpFrameDecoder,
	type SdcpFrame,
} from './protocol.js'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface TransportHooks {
	updateStatus: (status: InstanceStatus, message?: string) => void
	log: (level: LogLevel, message: string) => void
	onDiagnostic?: (message: string) => void
}

interface QueueEntry {
	payload: string
	description: string
	frame: Buffer
	resolve: (frame: SdcpFrame) => void
	reject: (error: Error) => void
}

/**
 * Sony SDCP requires request/response lock-step: the next command must not be
 * issued until the previous request has returned data. This transport therefore
 * keeps exactly one request in flight and serialises all writes.
 */
export class SonySdcpTransport {
	private socket: TCPHelper | undefined
	private readonly decoder = new SdcpFrameDecoder()
	private readonly queue: QueueEntry[] = []
	private active: QueueEntry | undefined
	private responseTimer: NodeJS.Timeout | undefined
	private stopped = false
	private reconnectTimer: NodeJS.Timeout | undefined

	constructor(
		private readonly host: string,
		private readonly port: number,
		private readonly monitorId: number,
		private readonly hooks: TransportHooks,
		private readonly responseTimeoutMs = 2000,
	) {}

	start(): void {
		this.stopped = false
		this.openSocket()
	}

	destroy(): void {
		this.stopped = true
		this.clearResponseTimer()
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = undefined
		}

		const error = new Error('Sony monitor transport destroyed')
		if (this.active) {
			this.active.reject(error)
			this.active = undefined
		}
		while (this.queue.length > 0) this.queue.shift()?.reject(error)

		if (this.socket) {
			this.socket.removeAllListeners()
			this.socket.destroy()
			this.socket = undefined
		}
		this.decoder.reset()
	}

	async send(payload: string, description = payload): Promise<SdcpFrame> {
		if (this.stopped) return Promise.reject(new Error('Sony monitor transport is stopped'))
		if (this.queue.length >= 100) return Promise.reject(new Error('Sony monitor command queue is full'))

		return new Promise<SdcpFrame>((resolve, reject) => {
			this.queue.push({
				payload,
				description,
				frame: buildSdcpFrame(this.monitorId, payload),
				resolve,
				reject,
			})
			void this.pump()
		})
	}

	private openSocket(): void {
		if (this.stopped || !this.host) return
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = undefined
		}
		if (this.socket) {
			this.socket.removeAllListeners()
			this.socket.destroy()
		}

		this.decoder.reset()
		this.hooks.updateStatus(InstanceStatus.Connecting, `Connecting to ${this.host}:${this.port}`)
		this.socket = new TCPHelper(this.host, this.port, { reconnect: true, reconnect_interval: 1000 })

		this.socket.on('status_change', (status, message) => {
			this.hooks.updateStatus(status, message)
		})
		this.socket.on('connect', () => {
			this.decoder.reset()
			this.hooks.log('info', `Connected to Sony monitor at ${this.host}:${this.port}`)
			this.hooks.updateStatus(InstanceStatus.Ok, 'Connected')
			void this.pump()
		})
		this.socket.on('error', (error) => {
			this.hooks.log('error', `Sony monitor TCP error: ${error.message}`)
			this.failActiveForConnectionLoss(`Connection error: ${error.message}`)
		})
		this.socket.on('end', () => {
			this.hooks.log('warn', 'Sony monitor TCP connection ended')
			this.failActiveForConnectionLoss('Connection ended before the monitor replied')
		})
		this.socket.on('data', (chunk) => this.handleData(chunk))
	}

	private handleData(chunk: Buffer): void {
		let frames: SdcpFrame[]
		try {
			frames = this.decoder.push(chunk)
		} catch (error) {
			this.hooks.log(
				'error',
				`Failed to decode Sony SDCP data: ${error instanceof Error ? error.message : String(error)}`,
			)
			this.decoder.reset()
			return
		}

		for (const frame of frames) this.handleFrame(frame)
	}

	private handleFrame(frame: SdcpFrame): void {
		if (!this.active) {
			this.hooks.log(
				'warn',
				`Unsolicited Sony SDCP frame received: response=0x${frame.requestResponse.toString(16).padStart(2, '0')} payload=${frame.payload.toString('hex')}`,
			)
			return
		}

		const entry = this.active
		this.active = undefined
		this.clearResponseTimer()

		if (frame.requestResponse === SDCP_RESPONSE_OK) {
			const vmc = parseVmcPayload(frame.payload)
			const suffix = vmc ? `; ${vmc.raw}` : ''
			this.hooks.onDiagnostic?.(`OK: ${entry.description}${suffix}`)
			entry.resolve(frame)
		} else if (frame.requestResponse === SDCP_RESPONSE_NG) {
			const detail = frame.payload.length > 0 ? frame.payload.toString('hex') : 'no error payload'
			const error = new Error(`Sony monitor rejected ${entry.description}: ${detail}`)
			this.hooks.onDiagnostic?.(`NG: ${entry.description}; ${detail}`)
			entry.reject(error)
		} else {
			const error = new Error(
				`Unexpected Sony SDCP response code 0x${frame.requestResponse.toString(16).padStart(2, '0')} for ${entry.description}`,
			)
			entry.reject(error)
		}

		void this.pump()
	}

	private async pump(): Promise<void> {
		if (this.stopped || this.active || !this.socket?.isConnected) return
		const entry = this.queue.shift()
		if (!entry) return
		this.active = entry

		try {
			const sent = await this.socket.send(entry.frame)
			if (!sent) throw new Error('TCP socket is not connected')
			this.hooks.log('debug', `Sent Sony command: ${entry.description}`)
			this.responseTimer = setTimeout(() => this.handleResponseTimeout(entry), this.responseTimeoutMs)
		} catch (error) {
			if (this.active === entry) this.active = undefined
			entry.reject(error instanceof Error ? error : new Error(String(error)))
			this.scheduleFreshConnection()
		}
	}

	private handleResponseTimeout(entry: QueueEntry): void {
		if (this.active !== entry) return
		this.active = undefined
		this.responseTimer = undefined
		entry.reject(new Error(`Timed out waiting for Sony monitor response to ${entry.description}`))
		this.hooks.log('warn', `No Sony monitor response for ${entry.description}; reconnecting before further commands`)
		this.hooks.updateStatus(InstanceStatus.ConnectionFailure, 'Monitor response timeout')
		this.scheduleFreshConnection()
	}

	private failActiveForConnectionLoss(message: string): void {
		this.clearResponseTimer()
		if (this.active) {
			// Never silently resend an in-flight command. A TOGGLE may have reached the
			// monitor before the TCP failure, so replaying it could reverse the state.
			this.active.reject(new Error(message))
			this.active = undefined
		}
	}

	private scheduleFreshConnection(): void {
		if (this.stopped || this.reconnectTimer) return
		if (this.socket) {
			this.socket.removeAllListeners()
			this.socket.destroy()
			this.socket = undefined
		}
		this.decoder.reset()
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined
			this.openSocket()
		}, 500)
	}

	private clearResponseTimer(): void {
		if (this.responseTimer) {
			clearTimeout(this.responseTimer)
			this.responseTimer = undefined
		}
	}
}
