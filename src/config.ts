import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { SDCP_PORT } from './protocol.js'

export type MonitorType = 'all' | 'BVM-E' | 'BVM-X' | 'PVM-X' | 'PVM-A' | 'LMD-A'

export interface ModuleConfig {
	host: string
	port: number
	monitor_id: number
	monitor_type: MonitorType
}

export const MONITOR_CHOICES = [
	{ id: 'all', label: 'All monitor types' },
	{ id: 'BVM-E', label: 'BVM-E171, BVM-E251' },
	{ id: 'BVM-X', label: 'BVM-X300' },
	{ id: 'PVM-X', label: 'PVM-X550' },
	{ id: 'PVM-A', label: 'PVM-A250, PVM-A170' },
	{ id: 'LMD-A', label: 'LMD-A240, LMD-A220, LMD-A170' },
] as const

export function normalizeConfig(config: ModuleConfig): ModuleConfig {
	const parsedPort = Number(config.port)
	const parsedMonitorId = Number(config.monitor_id)

	return {
		host: config.host ?? '',
		port: Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535 ? parsedPort : SDCP_PORT,
		monitor_id:
			Number.isInteger(parsedMonitorId) && parsedMonitorId >= 1 && parsedMonitorId <= 99 ? parsedMonitorId : 1,
		monitor_type: config.monitor_type ?? 'all',
	}
}

export function getConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'Control Sony professional broadcast/video monitors over the Sony SDCP/VMC TCP protocol.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Device IP',
			width: 6,
			regex: Regex.IP,
			default: '',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Device Port',
			width: 6,
			default: SDCP_PORT,
			min: 1,
			max: 65535,
		},
		{
			type: 'number',
			id: 'monitor_id',
			label: 'Monitor ID',
			width: 6,
			default: 1,
			min: 1,
			max: 99,
		},
		{
			type: 'dropdown',
			id: 'monitor_type',
			label: 'Show actions applicable to',
			width: 6,
			default: 'all',
			choices: [...MONITOR_CHOICES],
		},
	]
}
