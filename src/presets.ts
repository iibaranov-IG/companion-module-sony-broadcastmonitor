import { combineRgb, type CompanionPresetDefinitions } from '@companion-module/base'
import { ALL_BUTTONS } from './actions.js'

export function getPresetDefinitions(): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}

	for (const button of ALL_BUTTONS) {
		const id = String(button.id)
		const label = button.label
		presets[`menu-${id.toLowerCase()}`] = {
			type: 'button',
			category: 'Menu Controls',
			name: label,
			style: {
				text: label,
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: 'button_press', options: { state: id } }],
					up: [],
				},
			],
			feedbacks: [],
		}
	}

	return presets
}
