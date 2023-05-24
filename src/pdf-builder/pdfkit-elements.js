import sharp from 'sharp'
import _ from 'lodash'

export const computedProps = (pdf) => (item) => {
	['top', 'left', 'width', 'value'].forEach(name => {
		const value = item[name]
		if (value) {
			item[name] = _.isFunction(value) ? value(pdf) : value
		}
	})
	return item
}

const fontFamily = (pdf) => ({ weight }) => (weight === 'bold') ? `${pdf.defaultFont}-Bold` : pdf.defaultFont

export const textMixin = (pdf) => (item) => {
	const { doc } = pdf
	const { 
		color, 
		size, 
		value, 
		weight,
		baseline, 
		lineHeight, 
		paragraphHeight, 
		width,
		continued 
	} = item
	const options = {}

	color && doc.fillColor(color)
	size && doc.fontSize(size)

	if (baseline) options.baseline = baseline
	if (lineHeight) options.lineGap = lineHeight
	if (paragraphHeight) options.paragraphGap = paragraphHeight
	if (continued) options.continued = continued
	if (width) options.width = width

	doc.font(fontFamily(pdf)({ weight }))

	item.height = pdf.doc.heightOfString(value, options)
	if (_.isArray(value)) {
		item.height = item.height * value.length	
	}

	item.options = options
	
	return item
}

const columnsWidth = (pdf) => ({ columns, rows }, options) => {
	const { doc } = pdf
	let flexCount = 0
	let widths = 0
	
	for (let c = 0, columnsLn = columns.length; c < columnsLn; c++) {
		const column = columns[c]

		if (!column.width && !column.flex) {
			let max = 0

			for (let r = 0, rowsLn = rows.length; r < rowsLn; r++) {
				const row = rows[r]
				const value = row[column.dataIndex]

				if (value) {
					doc.font(fontFamily(pdf)({ weight: column.weight }))

					const width = doc.widthOfString(value, {
						...options
					})
					if (width > max) {
						max = width
					}
				}
			}
			column.width = max
		}
		if (column.flex) {
			flexCount++
		}
		else {
			widths += column.width
		}
	}

	const pageWidth = doc.page.width - (doc.page.margins.left + doc.page.margins.right)
	const flexWidth = (pageWidth - widths) / flexCount
	
	for (let c = 0, columnsLn = columns.length; c < columnsLn; c++) {
		const column = columns[c]

		if (column.flex) {
			column.width = flexWidth
		}
	}
}

const text = async (pdf, item) => {
	const { doc } = pdf

	item = computedProps(pdf)(item)

	const {
		top,
		left,
		value,
		moveDown,
		fullWidth,
		width,
		align
	} = item

	item = textMixin(pdf)(item)

	if (fullWidth || width) {
		item.options.width = fullWidth ? doc.page.width - (doc.page.margins.left + doc.page.margins.right) : width
	}
	if (align) {
		item.options.align = align
	}

	if (left && top) {
		doc.text(value, left, top, item.options)
	}
	else {
		doc.text(value, item.options)
	}

	if (moveDown) {
		doc.moveDown(moveDown)
	}

	return item
}

const list = async (pdf, item) => {
	const { doc } = pdf

	item = computedProps(pdf)(item)

	const {
		top, 
		left,
		value
	} = item

	item = textMixin(pdf)(item)
	
	if (left && top) {
		doc.list(value, left, top, item.options)
	}
	else {
		doc.list(value, item.options)
	}
	return item
}

const topics = async (pdf, item) => {
	const { doc/*, hasCoverPage*/ } = pdf

	item = computedProps(pdf)(item)

	const {
		color,
		size,
		lineHeight,
		weight,
		values
	} = item
	const docX = doc.x
	let docY = doc.y
	// let gapY = 0

	const defaultOptions = { color, size, lineHeight, weight }

	//Workaround
	const bottomMargin = doc.page.margins.bottom

	doc.page.margins.bottom = 0

	// const index = hasCoverPage ? 2 : 1
	// const fullWidth = doc.page.width

	const renderTopics = async (items, ident = 0) => {
		for (let i = 0, ln = items.length; i < ln; i++) {
			const { title: value, /*originalPage: page,*/ children } = items[i]

			if (value) {
				const { height } = textMixin(pdf)({
					value, 
					...defaultOptions
				})
		
				if ((docY + height) > (doc.page.height - bottomMargin)) {
					await pdf.addPage()
					docY = doc.y
				}
		
				// const width = doc.widthOfString(value)
		
				// gapY = (height / 4)
		
				doc.text(value, docX + ident, docY, {
					...defaultOptions
					// link: page - index
				})
		
				// doc.fill(color)
				// 	.lineCap('round')
				// 	.dash(0.2, { space: 4 })
				// 	.moveTo(docX + ident + width + 4, docY + gapY)
				// 	.lineTo(fullWidth - docX - 4, docY + gapY)
				// 	.stroke()

				// It's pending to align the following text to the right
				// doc.text(page, fullWidth - docX, docY, {
				// 	...defaultOptions
				// })
		
				docY += height
			}

			if (children && children.length > 0) {
				await renderTopics(children, 20)
			}
		}
	}

	renderTopics(values)

	doc.x = docX
	//Workaround
	doc.page.margins.bottom = bottomMargin

	item.height = 1 //fake height

	return item
}

const table = async (pdf, item) => {
	const { doc } = pdf

	item = computedProps(pdf)(item)

	const { /*top, left,*/ 
		title, 
		headerDefaults = {},
		columnsHeader = true,
		columnDefaults = {},
		columns,
		rows,
		summary,
		size, 
		color,
		lineColor, 
		lineHeight, 
		paragraphHeight 
	} = item
	const pageWidth = doc.page.width - (doc.page.margins.left + doc.page.margins.right)
	const defaultOptions = { color, size, lineHeight, paragraphHeight }
	const docX = doc.x
	let docY = doc.y

	//Workaround
	const bottomMargin = doc.page.margins.bottom
	doc.page.margins.bottom = 0

	//margin top
	doc.moveDown(2)

	const renderTitle = async (continued = false) => {
		if (title && title.value) {
			const titleValue = (continued) ? `${title.value} continued` : title.value

			const titleItem = textMixin(pdf)({
				...defaultOptions,
				...title,
				value: titleValue,
				width: pageWidth,
				weight: 'bold'
			})

			title.paddingTop = title.paddingTop || 0
			title.paddingRight = title.paddingRight || 0
			title.paddingBottom = title.paddingBottom || 0
			title.paddingLeft = title.paddingLeft || 0

			const titleHeight = titleItem.height + title.paddingTop + title.paddingBottom

			//check if the table title fit the page height
			//multiplie by 2 to be sure the content of the table and title will render in the same page
			if ((docY + 2 * titleHeight) > (doc.page.height - bottomMargin)) {
				await pdf.addPage()
				docY = doc.y
			}

			if (title.backgroundColor) {
				rect(pdf, {
					left: docX, 
					top: docY,
					width: pageWidth,
					height: titleHeight,
					backgroundColor: title.backgroundColor
				})
				// confirm title color just if has background
				title.color && doc.fillColor(title.color)
			}

			if (title.paddingRight) {
				titleItem.options.width = pageWidth - title.paddingRight
			}

			doc.text(titleValue, docX + title.paddingLeft, docY + title.paddingTop, titleItem.options)
			docY += titleHeight
		}
	}

	await renderTitle()

	columnsWidth(pdf)({ columns, rows }, defaultOptions)

	headerDefaults.paddingTop = headerDefaults.paddingTop || 0
	headerDefaults.paddingBottom = headerDefaults.paddingBottom || 0
	headerDefaults.paddingLeft = headerDefaults.paddingLeft || 0
	headerDefaults.paddingRight = headerDefaults.paddingRight || 0

	const renderHeader = async () => {
		if (columnsHeader) {
			let headerLeft = docX
			let headerHeight = 0

			for (let c = 0, columnsLn = columns.length; c < columnsLn; c++) {
				const column = columns[c]
				const headerValue = column.header || ''

				const { height } = textMixin(pdf)({
					...defaultOptions,
					...headerDefaults,
					value: headerValue,
					weight: 'bold',
					width: column.width
				})
				
				if (height > headerHeight) {
					headerHeight = height
				}
			}

			headerHeight += headerDefaults.paddingTop + headerDefaults.paddingBottom

			//check if the table header fit the page height
			//multiplie by 2 to be sure the header goes always at least with first data row
			if ((docY + 2 * headerHeight) > (doc.page.height - bottomMargin)) {
				await pdf.addPage()
				docY = doc.y
			}

			for (let c = 0, columnsLn = columns.length; c < columnsLn; c++) {
				const column = columns[c]
				const headerValue = column.header || ''

				const header = textMixin(pdf)({
					...defaultOptions,
					...headerDefaults,
					value: headerValue,
					weight: 'bold',
					width: column.width
				})

				if (headerDefaults.backgroundColor) {
					rect(pdf, {
						left: headerLeft,
						top: docY,
						width: column.width,
						height: headerHeight,
						backgroundColor: headerDefaults.backgroundColor
					})

					// confirm column color just if has background
					headerDefaults.color && doc.fillColor(headerDefaults.color)
				} 

				header.options.width = column.width - (headerDefaults.paddingLeft + headerDefaults.paddingRight)
				header.options.align = column.align

				doc.text(headerValue, headerLeft + headerDefaults.paddingLeft, docY + headerDefaults.paddingTop, header.options)
				headerLeft += column.width
			}

			docY += headerHeight
		}
	}

	await renderHeader()

	lineColor && doc.moveTo(docX, docY)
		.lineTo(doc.page.width - docX, docY)
		.fill(lineColor)
		.stroke()

	columnDefaults.paddingTop = columnDefaults.paddingTop || 0
	columnDefaults.paddingBottom = columnDefaults.paddingBottom || 0
	columnDefaults.paddingLeft = columnDefaults.paddingLeft || 0
	columnDefaults.paddingRight = columnDefaults.paddingRight || 0

	for (let r = 0, rowsLn = rows.length; r < rowsLn; r++) {
		const row = rows[r]
		let cellX = docX
		let cellHeight = 0

		for (let c = 0, columnsLn = columns.length; c < columnsLn; c++) {
			const column = columns[c]
			const value = row[column.dataIndex]
			
			const { height } = textMixin(pdf)({
				...defaultOptions,
				value,
				weight: column.weight,
				width: column.width - (columnDefaults.paddingLeft + columnDefaults.paddingRight)
			})

			if (height > cellHeight) {
				cellHeight = height
			}
		}

		cellHeight += columnDefaults.paddingTop + columnDefaults.paddingBottom

		//check if the heightest cell of the row fit the page height
		if ((docY + cellHeight) > (doc.page.height - bottomMargin)) {
			await pdf.addPage()
			docY = doc.y

			await renderTitle(true)
			await renderHeader()
		}

		if (columnDefaults.backgroundColor && (r % 2 != 0)) {
			rect(pdf, {
				left: docX,
				top: docY,
				width: pageWidth,
				height: cellHeight,
				backgroundColor: columnDefaults.backgroundColor
			})
		}

		for (let c = 0, columnsLn = columns.length; c < columnsLn; c++) {
			const column = columns[c]
			const value = column.renderer ? column.renderer(row) : row[column.dataIndex]

			const cell = textMixin(pdf)({
				...defaultOptions,
				value,
				weight: column.weight,
				width: column.width
			})

			cell.options.width = column.width - (columnDefaults.paddingLeft + columnDefaults.paddingRight)
			cell.options.align = column.align

			doc.text(value, cellX + columnDefaults.paddingLeft, docY + columnDefaults.paddingTop, cell.options)
			cellX += column.width

			if (lineColor && c < columnsLn - 1) {
				doc.moveTo(cellX, docY)
					.lineTo(cellX, docY + cellHeight)
					.fill(lineColor)
					.stroke()	
			}
		}

		docY += cellHeight //if this is more than a page.height add a new page

		lineColor && doc.moveTo(docX, docY)
			.lineTo(doc.page.width - docX, docY)
			.fill(lineColor)
			.stroke()
	}

	if (summary) {
		const summaryItem = textMixin(pdf)({
			...defaultOptions,
			value: summary.value,
			width: pageWidth,
			weight: 'bold'
		})

		summary.paddingTop = summary.paddingTop || 0
		summary.paddingBottom = summary.paddingBottom || 0
		summary.paddingLeft = summary.paddingLeft || 0
		summary.paddingRight = summary.paddingRight || 0

		const summaryHeight = summaryItem.height + summary.paddingTop + summary.paddingBottom

		//check if the heightest cell of the row fit the page height
		if ((docY + summaryHeight) > (doc.page.height - bottomMargin)) {
			await pdf.addPage()
			docY = doc.y
		}

		if (summary.backgroundColor) {
			rect(pdf, {
				left: docX, 
				top: docY,
				width: pageWidth,
				height: summaryHeight,
				backgroundColor: summary.backgroundColor
			})
			// confirm summary color just if has background
			summary.color && doc.fillColor(summary.color)
		}

		if (summary.paddingRight) {
			summaryItem.options.width = pageWidth - (summary.paddingLeft + summary.paddingRight)
		}

		if (summary.align) {
			summaryItem.options.align = summary.align
		}

		doc.text(summary.value, docX + summary.paddingLeft, docY + summary.paddingTop, summaryItem.options)

		docY += summaryHeight

		lineColor && doc.moveTo(docX, docY)
			.lineTo(doc.page.width - docX, docY)
			.fill(lineColor)
			.stroke()
	}

	doc.x = docX
	//Workaround
	doc.page.margins.bottom = bottomMargin
	
	//margin bottom
	doc.moveDown(2)

	item.height = 1// fake height

	return item
}

const rect = async (pdf, item) => {
	const { doc } = pdf

	item = computedProps(pdf)(item)

	const {
		top,
		left,
		width,
		height,
		fullWidth,
		backgroundColor
	} = item

	doc.rect(left, top, fullWidth ? doc.page.width : width, height)
	backgroundColor && doc.fill(backgroundColor)

	return { top, left, width, height }
}

const polygon = async (pdf, item) => {
	const { doc } = pdf
	const { 
		points, 
		backgroundColor 
	} = item
	const pts = points ? points.split(' ').reduce((result, p, i) => {
		if (i % 2 === 0) {
			result.push([p])
		}
		else {
			result[result.length - 1].push(p)
		}
		return result
	}, []) : []

	doc.polygon(...pts)
	backgroundColor && doc.fill(backgroundColor)

	return item
}

const image = async (pdf, item) => {
	const { doc } = pdf

	item = computedProps(pdf)(item)

	let {
		top,
		left,
		width,
		height,
		align,
		value
	} = item

	if (align === 'center') {
		left = (doc.page.width / 2) - ((width && width > 0) ? width / 2 : 0)
	}

	doc.image(value, left, top, { 
		width, height
	})

	if (!height) {
		item.height = 1
	}

	return item
}

const gallery = async (pdf, item) => {
	const { doc } = pdf

	item = computedProps(pdf)(item)

	let {
		width,
		height,
		margin,
		values,
		descriptionDefaults
	} = item
	const textPaddingTop = descriptionDefaults.paddingTop || 0
	const pageWidth = doc.page.width - (doc.page.margins.left + doc.page.margins.right)
	const docX = doc.x
	let docY = doc.y

	//Workaround
	const bottomMargin = doc.page.margins.bottom
	doc.page.margins.bottom = 0

	//margin top
	doc.moveDown(2)

	width = width = width || (pageWidth - margin) / 2

	let left = docX
	for (let i = 0, ln = values.length; i < ln; i++) {
		const { description, image } = values[i]
		const figureIndex = `Figure ${i + 1}. `
		
		descriptionDefaults.width = width

		let { height: textHeight } = textMixin(pdf)({
			...descriptionDefaults,
			value: description
		})

		if ((docY + height + textHeight) > (doc.page.height - bottomMargin)) {
			await pdf.addPage()
			docY = doc.y
		}

		const metadata = await sharp(image).metadata()
		let imageResized = metadata.size && metadata.size > 1000000
			? await sharp(image).resize(800, 600).rotate().toBuffer()
			: await sharp(image).rotate().toBuffer()

		doc.image(imageResized.buffer, left, docY, { 
			width, height
		})
		
		doc.font(fontFamily(pdf)({ weight: 'bold' }))
		doc.text(figureIndex, left, docY + height + textPaddingTop, { 
			continued: true, ...descriptionDefaults 
		})

		doc.font(fontFamily(pdf)({ weight: 'normal' }))
		doc.text(description, descriptionDefaults)

		textHeight += textPaddingTop

		if ((i + 1) % 2 !== 0) {
			left += (margin + width)
		}
		else {
			left = docX
			docY += (margin + height + textHeight)
		}
	}

	doc.x = docX
	//Workaround
	doc.page.margins.bottom = bottomMargin
	
	//margin bottom
	doc.moveDown(2)

	item.height = 1// fake height

	return item
}

const signature = async (pdf, item) => {
	const { doc } = pdf

	item = computedProps(pdf)(item)

	let {
		title,
		printedName,
		signature,
		licenseNumber,
		date,
		color,
		size,
		state
	} = item
	const label = 'Printed Name'
	const signatureLabel = 'Signature'
	const licenseNumberLabel = `${state} Professional Engineering License No.`
	const dateLabel = 'Date'
	const lineHeight = 32
	const paddingLeft = 24
	// const pageWidth = doc.page.width - (doc.page.margins.left + doc.page.margins.right)
	const docX = doc.x
	let docY = doc.y

	//Workaround
	const bottomMargin = doc.page.margins.bottom
	doc.page.margins.bottom = 0

	//margin top
	doc.moveDown(1)

	if (title) {
		const { height, options } = textMixin(pdf)({
			color, size, lineHeight,
			weight: 'bold',
			value: title
		})
		
		doc.text(title, docX, docY, options)
		docY += height
	}

	const labelWidth = doc.widthOfString(label)

	if (printedName) {
		
		const { height, options } = textMixin(pdf)({
			color, size, lineHeight,
			weight: 'bold',
			value: printedName
		})

		doc.text(label, docX, docY, options)

		doc.font(fontFamily(pdf)({ weight: 'normal' }))
		doc.text(printedName, docX + labelWidth + paddingLeft, docY, options)

		docY += height	
	}

	if (signature) {
		const marginTop = 16
		const { height, options } = textMixin(pdf)({
			size, lineHeight,
			weight: 'bold',
			value: signatureLabel
		})

		docY += marginTop
		doc.text(signatureLabel, docX, docY, options)

		const lineMarginTop = 12
		const lineX = docX + labelWidth + paddingLeft

		// image 137 x 32
		doc.image(signature, lineX, docY - 24, { 
			width: 137
		})

		doc.moveTo(lineX, docY + lineMarginTop)
			.lineTo(lineX + 160, docY + lineMarginTop)
			.fill(color)
			.stroke()

		docY += height
	}

	if (licenseNumber) {
		const { height, options } = textMixin(pdf)({
			size, lineHeight,
			weight: 'bold',
			value: licenseNumberLabel
		})

		doc.text(licenseNumberLabel, docX, docY, options)

		doc.font(fontFamily(pdf)({ weight: 'normal' }))
		doc.text(licenseNumber, docX + labelWidth + paddingLeft + 130, docY, options)

		docY += height
	}

	if (date) {
		const { height, options } = textMixin(pdf)({
			size, lineHeight,
			weight: 'bold',
			value: dateLabel
		})

		doc.text(dateLabel, docX, docY, options)

		doc.font(fontFamily(pdf)({ weight: 'normal' }))
		doc.text(date, docX + labelWidth + paddingLeft, docY, options)

		docY += height
	}

	doc.x = docX
	//Workaround
	doc.page.margins.bottom = bottomMargin

	//margin bottom
	doc.moveDown(1)

	item.height = 1// fake height

	return item
}

export const elements = { rect, text, list, topics, table, polygon, image, gallery, signature }