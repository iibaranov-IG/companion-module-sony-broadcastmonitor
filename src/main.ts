import { InstanceBase, InstanceStatus, runEntrypoint, type SomeCompanionConfigField } from '@companion-module/base'
import { getActionDefinitions } from './actions.js'
import { getConfigFields, normalizeConfig, type ModuleConfig } from './config.js'
import { getPresetDefinitions } from './presets.js'
import { parseVmcPayload } from './protocol.js'
import { SonySdcpTransport } from './transport.js'

class SonyBroadcastMonitorInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	private transport: SonySdcpTransport | undefined

	async init(config: ModuleConfig): Promise<void> {
		this.config = normalizeConfig(config)
		this.updateDefinitions()
		this.startTransport()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.stopTransport()
		this.config = normalizeConfig(config)
		this.updateDefinitions()
		this.startTransport()
	}

	async destroy(): Promise<void> {
		this.stopTransport()
		this.updateStatus(InstanceStatus.Disconnected)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	async sendVmc(payload: string, description = payload): Promise<void> {
		if (!this.transport) {
			this.log('warn', `Cannot send ${description}: transport is not configured`)
			return
		}

		try {
			const response = await this.transport.send(payload, description)
			const vmc = parseVmcPayload(response.payload)
			if (vmc?.category === 'STATret') {
				const value = vmc.value === undefined ? '' : ` ${vmc.value}`
				this.log('info', `Sony status response: ${vmc.item ?? 'unknown'}${value}`)
			} else if (vmc) {
				this.log('debug', `Sony response payload: ${vmc.raw}`)
			}
		} catch (error) {
			this.log('error', `${description} failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	private updateDefinitions(): void {
		this.setActionDefinitions(getActionDefinitions(this))
		this.setPresetDefinitions(getPresetDefinitions())
		// The legacy module never exposed reliable device state. Keep feedbacks
		// and variables empty until response semantics are confirmed on hardware.
		this.setFeedbackDefinitions({})
		this.setVariableDefinitions([])
	}

	private startTransport(): void {
		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Device IP is required')
			return
		}

		this.transport = new SonySdcpTransport(this.config.host, this.config.port, this.config.monitor_id, {
			updateStatus: (status, message) => this.updateStatus(status, message),
			log: (level, message) => this.log(level, message),
			onDiagnostic: (message) => this.log('debug', `Sony SDCP: ${message}`),
		})
		this.transport.start()
	}

	private stopTransport(): void {
		if (this.transport) {
			this.transport.destroy()
			this.transport = undefined
		}
	}
}

runEntrypoint(SonyBroadcastMonitorInstance, [])
