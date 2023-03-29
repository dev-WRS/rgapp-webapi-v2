/*
	primary: '#002B3F', //rgba(0, 43, 63, 1)
	secondary: '#0084CB', //rgba(0, 132, 203, 1)
	tertiary: '#00AEEF' //rgba(0, 174, 239, 1)
	quaternary: '#00AEEF33' //rgba(0, 174, 239, 0.2)
	black: '#000000',
	white: '#FFFFFF'
*/
const hexToRgb = (hex) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	return result ? [
		parseInt(result[1], 16),
		parseInt(result[2], 16),
		parseInt(result[3], 16)
	] : null
}

const rgbToHex = (r, g, b) => {
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

const generateTheme = (primaryColor, rgbDistances, names = []) => {
	const sum = (a1, a2) => a1.map((b, i) => {
		const result = parseInt(b) + parseInt(a2[i])
		return result > 255 ? 255 : result
	})

	const colors = rgbDistances.reduce((colors, distance) => {
		colors.push(sum(colors[colors.length - 1], distance))
		return colors
	}, [primaryColor])

	return colors.reduce((result, color, index) => {
		const [r, g, b] = color
		result[names[index]] = rgbToHex(r, g, b)
		return result
	}, {})
}

export default (primary) => {
	const rgbPrimary = hexToRgb(primary)
	const rgbDistances = [
		// [0, 89, 140],
		// [0, 42, 36],
		// [231, 77, 16]
		[70, 70, 70],
		[70, 70, 70],
		[95, 95, 95]
	]
	const colors = generateTheme(rgbPrimary, rgbDistances, ['primary', 'secondary', 'tertiary', 'quaternary'])

	const theme = {
		// primary: '#002B3F', //rgba(0, 43, 63, 1)
		// secondary: '#0084CB', //rgba(0, 132, 203, 1)
		// tertiary: '#00AEEF', //rgba(0, 174, 239, 1)
		// quaternary: '#E7FBFF', //rgba(231, 251, 255, 1)

		...colors,
		black: '#000000',
		white: '#FFFFFF'
	}

	return theme
}