import type { CompanionActionDefinitions, DropdownChoice } from '@companion-module/base'
import type { ModuleConfig, MonitorType } from './config.js'

export interface SonyActionHost {
	config: ModuleConfig
	sendVmc: (payload: string, description?: string) => Promise<void>
}

const ON_OFF_TOGGLE: DropdownChoice[] = [
	{ id: 'ON', label: 'On' },
	{ id: 'OFF', label: 'Off' },
	{ id: 'TOGGLE', label: 'Toggle' },
]

const ALL_BUTTONS: DropdownChoice[] = [
	{ id: 'MENU', label: 'Menu' },
	{ id: 'MENUENT', label: 'Enter' },
	{ id: 'MENUUP', label: 'Up' },
	{ id: 'MENUDOWN', label: 'Down' },
	{ id: 'ENTER', label: 'Numeric Enter' },
	{ id: 'DELETE', label: 'Numeric Delete' },
	...Array.from({ length: 10 }, (_, value) => ({ id: String(value), label: `Numeric ${value}` })),
]

const INPUTS_X: DropdownChoice[] = [
	{ id: '1', label: 'SDI 1 4K' },
	{ id: '2', label: 'SDI 1 2K' },
	{ id: '3', label: 'SDI 2 4K' },
	{ id: '4', label: 'SDI 2 2K' },
	{ id: '5', label: 'HDMI' },
]

const INPUTS_A: DropdownChoice[] = [
	{ id: '1', label: 'SDI 1' },
	{ id: '2', label: 'SDI 2' },
	{ id: '3', label: 'HDMI' },
	{ id: '4', label: 'Composite' },
]

const STATUS_OPTIONS: DropdownChoice[] = [
	{ id: 'MODEL', label: 'Model Name' },
	{ id: 'SERIAL', label: 'Serial Number' },
	{ id: 'OPTIME', label: 'Operating Hours' },
	{ id: 'DEVTIME', label: 'Panel Operating Hours' },
	{ id: 'VERSION', label: 'Software Version' },
	{ id: 'SIGFORMAT', label: 'Input Signal Format' },
	{ id: 'CURRENT', label: 'Monitor States' },
]

interface SetActionSpec {
	id: string
	name: string
	models?: MonitorType[]
	choices?: DropdownChoice[]
	default?: string
}

const SET_ACTIONS: SetActionSpec[] = [
	{
		id: 'aspect',
		name: 'Aspect Ratio',
		models: ['BVM-E', 'PVM-A', 'LMD-A'],
		choices: [
			{ id: '4BY3', label: '4:3' },
			{ id: '16BY9', label: '16:9' },
			{ id: 'TOGGLE', label: 'Toggle' },
		],
		default: '16BY9',
	},
	{ id: 'marker', name: 'Marker' },
	{ id: 'monochr', name: 'Monochrome' },
	{ id: 'manphase', name: 'Manual Phase', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'manchr', name: 'Manual Chroma', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'mancont', name: 'Manual Contrast', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'manbrt', name: 'Manual Brightness', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'blueonly', name: 'Blue Only' },
	{
		id: 'scanmode',
		name: 'Scan Mode',
		models: ['BVM-E'],
		choices: [
			{ id: 'UNDER', label: 'Underscan' },
			{ id: 'OVER', label: 'Overscan' },
			{ id: 'OVERMAT', label: 'Over Mat' },
			{ id: 'TOGGLE', label: 'Toggle' },
		],
		default: 'UNDER',
	},
	{ id: 'hdelay', name: 'Horizontal Delay', models: ['BVM-E'] },
	{ id: 'vdelay', name: 'Vertical Delay', models: ['BVM-E'] },
	{ id: 'rcutoff', name: 'Red Cut Off', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'gcutoff', name: 'Green Cut Off', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'bcutoff', name: 'Blue Cut Off', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'aperture', name: 'Aperture', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'power', name: 'Power' },
	{ id: 'chromaup', name: 'Chroma Up Display', models: ['BVM-E', 'PVM-A', 'LMD-A'] },
	{
		id: 'showaddr',
		name: 'Show Address',
		models: ['BVM-E'],
		choices: [
			{ id: 'SINGLE', label: 'Single' },
			{ id: 'GROUP', label: 'Group' },
		],
		default: 'SINGLE',
	},
	{ id: 'charmute', name: 'Character Mute', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'coladj', name: 'Manual Color Temperature', models: ['BVM-E'] },
	{ id: 'sidebyside', name: 'Side by Side Display', models: ['BVM-E', 'PVM-A', 'LMD-A'] },
	{ id: 'wipe', name: 'Wipe Display', models: ['BVM-E', 'PVM-A', 'LMD-A'] },
	{ id: 'blend', name: 'Blend Display', models: ['BVM-E', 'PVM-A', 'LMD-A'] },
	{ id: 'butterfly', name: 'Butterfly Display', models: ['BVM-E'] },
	{ id: 'pixelzoom', name: 'Pixel Zoom Display', models: ['BVM-E'] },
	{ id: 'nativescan', name: 'Native Scan' },
	{ id: 'markeraspect', name: 'Aspect Marker', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'markerarea1', name: 'Layer 1 Marker', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'markerarea2', name: 'Layer 2 Marker', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'ppintlc', name: 'Interlace Display', models: ['BVM-E', 'BVM-X'] },
	{ id: 'alm', name: 'Audio Level Meter Display', models: ['BVM-E', 'PVM-A', 'LMD-A'] },
	{ id: 'timecode', name: 'Timecode Display' },
	{ id: 'statusdisp', name: 'Status Display', models: ['BVM-E'] },
	{ id: 'markeraspline', name: 'Aspect Marker Line Display', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'markerblkhalf', name: 'Aspect Blanking Half Display', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'markerblkblack', name: 'Aspect Blanking Black Display', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'markercenter', name: 'Center Marker Display', models: ['BVM-E', 'BVM-X', 'PVM-X'] },
	{ id: 'hflip', name: 'Horizontal Flip', models: ['PVM-A', 'LMD-A'] },
	{ id: 'flickerfree', name: 'Flicker Free', models: ['BVM-E', 'BVM-X', 'PVM-X', 'PVM-A'] },
]

function isVisible(configured: MonitorType, models?: MonitorType[]): boolean {
	return configured === 'all' || models === undefined || models.includes(configured)
}

function stringOption(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

export function getActionDefinitions(instance: SonyActionHost): CompanionActionDefinitions {
	const definitions: CompanionActionDefinitions = {}
	const monitorType = instance.config.monitor_type

	const inputActions: Array<{ id: string; name: string; model: MonitorType; choices: DropdownChoice[] }> = [
		{ id: 'input_bvm-x', name: 'BVM-X Input Select', model: 'BVM-X', choices: INPUTS_X },
		{ id: 'input_pvm-x', name: 'PVM-X Input Select', model: 'PVM-X', choices: INPUTS_X },
		{ id: 'input_pvm-a', name: 'PVM-A Input Select', model: 'PVM-A', choices: INPUTS_A },
		{ id: 'input_lmd-a', name: 'LMD-A Input Select', model: 'LMD-A', choices: INPUTS_A },
	]

	for (const action of inputActions) {
		if (!isVisible(monitorType, [action.model])) continue
		definitions[action.id] = {
			name: action.name,
			options: [{ type: 'dropdown', id: 'state', label: 'Input', choices: action.choices, default: '1' }],
			callback: async (event) => {
				const state = stringOption(event.options.state)
				await instance.sendVmc(`INFObutton ${state}`, `${action.name}: ${state}`)
			},
		}
	}

	for (const action of SET_ACTIONS) {
		if (!isVisible(monitorType, action.models)) continue
		const choices = action.choices ?? ON_OFF_TOGGLE
		definitions[action.id] = {
			name: action.name,
			options: [
				{
					type: 'dropdown',
					id: 'state',
					label: 'State',
					choices,
					default: action.default ?? 'ON',
				},
			],
			callback: async (event) => {
				const state = stringOption(event.options.state)
				await instance.sendVmc(`STATset ${action.id.toUpperCase()} ${state}`, `${action.name}: ${state}`)
			},
		}
	}

	definitions.button_press = {
		name: 'Generic Button Press',
		options: [
			{
				type: 'dropdown',
				id: 'state',
				label: 'Simulate monitor button press',
				choices: ALL_BUTTONS,
				default: 'MENU',
			},
		],
		callback: async (event) => {
			const state = stringOption(event.options.state)
			await instance.sendVmc(`INFObutton ${state}`, `Button: ${state}`)
		},
	}

	definitions.status_request = {
		name: 'Status',
		options: [
			{
				type: 'dropdown',
				id: 'state',
				label: 'Request status information',
				choices: STATUS_OPTIONS,
				default: 'MODEL',
			},
		],
		callback: async (event) => {
			const state = stringOption(event.options.state).toUpperCase()
			await instance.sendVmc(`STATget ${state}`, `Status: ${state}`)
		},
	}

	return definitions
}

export { ALL_BUTTONS }
