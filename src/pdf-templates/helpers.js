import fs from 'fs'
import path from 'path'
import lodash from 'lodash'

const { isObject, merge } = lodash

export const contentMarginTop = 162
export const contentMarginRight = 55
export const contentMarginBottom = 55
export const contentMarginLeft = 55

export const WHOLE_BUILDING = 'Whole Building'
export const LIGHTING = 'Lighting'
export const HVAC = 'HVAC'
export const ENVELOPE = 'Envelope'
export const QUALYFYING_CATEGORIES = [LIGHTING, HVAC, ENVELOPE]

export const METHOD_PERMANENT = 'Permanent'
export const METHOD_INTERIM_WHOLE_BUILDING = 'Interim Whole Building'
export const METHOD_INTERIM_SPACE_BY_SPACE = 'Interim Space-by-Space'

export const defaultFont = 'NotoSerif'
export const fonts = {
	'NotoSerif': 'src/pdf-templates/fonts/Noto_Serif/NotoSerif-Regular.ttf',
	'NotoSerif-Bold': 'src/pdf-templates/fonts/Noto_Serif/NotoSerif-Bold.ttf'
}

export const formatDate = (date) => {
	const padTo2Digits = (num) => {
		return num.toString().padStart(2, '0')
	}

	return [
		padTo2Digits(date.getMonth() + 1),
		padTo2Digits(date.getDate()),
		date.getFullYear()
	].join('/')
}

export const formatNumber = (number) => number.toLocaleString('en-US', { maximumFractionDigits: 2 })
export const formatCurrency = (number) => (number.toLocaleString('en-US', { style: 'currency', currency: 'USD' }))
export const formatPhone = (number) => number.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')

export const asCommaSeparatedString = (items) => (items.length > 0) ?
	(items.length > 1) ?  
		`${items.slice(0, items.length - 1).join(', ')} and ${items[items.length - 1]}` : 
		items[0] : ''

export const asItemsSubject = (items) => {
	const ln = items.length
	if (ln > 0) {
		const article = (ln > 1) ? 'the' : 
			['a', 'e', 'i', 'o', 'u'].indexOf(items[0][0].toLowerCase()) !== -1 ? 'an' : 'a'

		return `${article} ${asCommaSeparatedString(items).toLowerCase()}`
	}
	return ''
}

export const asSiteVisitString = (items) => {
	return items.length > 1 ? 'site visits' : 'a site visit'
}

export const asVerbString = (items) => {
	return items.length > 1 ? 'where' : 'was'
}

export const asBuildingsSubject = (buildingTypes, buildingsCount) => `${asItemsSubject(buildingTypes)} ${buildingsCount === 1 ? 'building' : 'buildings'}`

export const removeEndingDots = (legalEntity) => legalEntity.replace(/\.+$/, '')

const coverImg = fs.readFileSync(path.join(process.cwd(), 'src', 'pdf-templates', 'images', 'coverImg.jpg'))
coverImg._isBuffer = true

export default ({ theme }) => {
	const coverImage = {
		type: 'image',
		top: 0,
		left: 8.5,
		width: 620.5,
		height: 373.61,
		value: coverImg
	}

	const coverVectors = [{
		type: 'polygon',
		points: '283.56 809.01 421.1 809.01 421.1 672.91 283.63 592.43 283.56 592.39 283.56 809.01',
		backgroundColor: theme.secondary
	}, {
		type: 'polygon',
		points: '558.63 270.31 421.1 350.83 558.63 431.35 629.01 390.13 629.01 229.13 558.63 270.31',
		backgroundColor: theme.secondary
	}, {
		type: 'polygon',
		points: '558.63 592.39 421.09 672.91 421.09 511.87 558.63 592.39',
		backgroundColor: theme.secondary
	}, {
		type: 'polygon',
		points: '0 275.3 0 809.01 283.56 809.01 283.56 592.39 421.1 672.91 421.1 350.83 283.56 270.3 146.04 189.78 0 275.3',
		backgroundColor: theme.primary
	}, {
		type: 'polygon',
		points: '0 114.23 0 275.53 146.04 189.78 146.04 28.74 0 114.23',
		backgroundColor: theme.tertiary
	}, {
		type: 'polygon',
		points: '421.1 511.86 283.56 592.39 421.1 672.91 421.1 511.87 421.1 511.86',
		backgroundColor: theme.tertiary
	}, {
		type: 'polygon',
		points: '421.09 511.86 421.09 511.87 558.63 592.39 629.01 633.6 629.01 472.54 558.63 431.35 421.09 350.83 421.09 511.86',
		backgroundColor: theme.tertiary
	}, {
		type: 'polygon',
		points: '0 0 0 104.28 8.49 109.25 8.5 109.24 8.5 109.25 146.04 28.73 96.96 0 0 0',
		backgroundColor: theme.secondary
	}]

	const footer = {
		items: {
			bottomImage: {
				type: 'rect',
				top: (self) => self.doc.page.height - 40,
				left: 0,
				fullWidth: true,
				height: 40,
				backgroundColor: theme.quaternary	
			},
			bulletImage: {
				type: 'rect',
				top: (self) => self.doc.page.height - 49,
				left: (self) => self.doc.page.width - 80,
				width: 80, 
				height: 18,
				backgroundColor: theme.secondary		
			},
			pageNumber: {
				type: 'text',
				top: (self) => self.doc.page.height - 48,
				left: (self) => self.doc.page.width - 60,
				color: theme.white,
				width: 80
			}
		}
	}

	const headerBackground = {
		type: 'rect',
		top: 30,
		left: 0,
		fullWidth: true,
		height: 100,
		backgroundColor: theme.quaternary
	}

	const headerLogo = {
		type: 'image',
		top: 64,
		left: contentMarginLeft,
		width: 137
	}

	const headerText = {
		type: 'text',
		top: 72,
		left: 220,
		color: theme.black,
		size: 10
	}

	const bulletTopLeft = {
		type: 'rect',
		top: 165, 
		left: 0,
		width: 20, 
		height: 40,
		backgroundColor: theme.secondary	
	}

	const coverLogo = (logo) => ({
		type: 'image',
		top: 700,
		left: 450,
		width: 137,
		value: logo
	})

	const docTitle = (title, options) => [{
		type: 'text',
		relative: true,
		marginTop: 180,
		moveDown: 1,
		left: contentMarginLeft,
		color: theme.white,
		size: 52,
		value: title,
		...options
	}, {
		type: 'rect',
		relative: true,
		marginTop: 8,
		marginBottom: 24,
		left: contentMarginLeft,
		width: 72,
		height: 4,
		backgroundColor: theme.secondary	
	}]

	const repoTitle = (title) => ({
		type: 'text',
		relative: true,
		lineHeight: 12,
		moveDown: 1,
		left: contentMarginLeft,
		color: theme.white,
		size: 20,
		value: title	
	})

	const repoSubtitle = (subtitle) => ({
		type: 'text',
		relative: true,
		lineHeight: 12,
		moveDown: 1,
		left: contentMarginLeft,
		color: theme.white,
		size: 16,
		value: subtitle	
	})

	const repoHeader = (name, options) => ({
		type: 'text',
		relative: true,
		lineHeight: 12,
		moveDown: 1,
		left: contentMarginLeft,
		color: theme.white,
		size: 16,
		value: name,
		...options	
	})

	const sectionTitle = (title, options) => [{
		type: 'text',
		relative: true,
		moveDown: 1,
		left: contentMarginLeft,
		color: theme.black,
		size: 36,
		value: title,
		isTitle: true,
		...options
	}, {
		type: 'rect',
		relative: true,
		marginTop: 16,
		marginBottom: 32,
		left: contentMarginLeft,
		width: 96,
		height: 4,
		backgroundColor: theme.secondary
	}]
	
	const sectionSubtitle = (title) => ({
		type: 'text',
		relative: true,
		moveDown: 1,
		color: theme.black,
		size: 14,
		weight: 'bold',
		value: title,
		isSubTitle: true	
	})

	const sectionTitleParagraph = (title) => ({
		type: 'text',
		relative: true,
		moveDown: 1,
		color: theme.black,
		size: 12,
		weight: 'bold',
		value: title	
	})

	const sectionParagraph = (value, options) => ({
		type: 'text',
		relative: true,
		moveDown: 1,
		color: theme.black,
		size: 10,
		lineHeight: 6,
		value,
		...options
	})

	const sectionList = (value) => ({
		type: 'list',
		relative: true,
		moveDown: 1,
		color: theme.black,
		size: 10,
		lineHeight: 5,
		paragraphHeight: 8,
		value
	})

	const sectionTable = ({ title, summary, columns, rows, columnDefaults, ...options }, lean) => {
		if (lean === true) {
			columns = columns.filter(column => {
				return column.renderer || rows.findIndex(row => !!row[column.dataIndex]) !== -1
			})
		}
		return {
			type: 'table',
			relative: true,
			color: theme.black,
			lineColor: theme.tertiary,
			size: 10,
			lineHeight: 2,
			title: merge({
				color: theme.white,
				size: 10,
				lineHeight: 2,
				value: title,
				backgroundColor: theme.primary,
				paddingTop: 4,
				paddingBottom: 4,
				paddingLeft: 8,
				paddingRight: 20
			}, isObject(title) ? title : {}),
			summary: summary ? {
				color: theme.black,
				weight: 'bold',
				align: 'right',
				size: 10,
				value: summary,
				paddingTop: 4,
				paddingBottom: 4,
				paddingLeft: 8,
				paddingRight: 8
			} : undefined,
			headerDefaults: {
				color: theme.white,
				lineHeight: 2,
				backgroundColor: theme.primary,
				paddingTop: 4,
				paddingBottom: 4,
				paddingLeft: 8,
				paddingRight: 8
			},
			columnDefaults: {
				paddingTop: 4,
				paddingBottom: 4,
				paddingLeft: 8,
				paddingRight: 8,
				backgroundColor: theme.quaternary,
				...columnDefaults
			},
			columns, rows,
			...options
		}
	}

	const sectionSignature = ({ title, printedName, signature, licenseNumber, date, state }) => ({
		type: 'signature',
		color: theme.black,
		size: 11,
		title, printedName, signature, licenseNumber, date, state
	})

	const sectionCertificate = ({ title, name, description }) => ([{
		type: 'text',
		relative: true,
		left: contentMarginLeft,
		fullWidth: true,
		align: 'center',
		value: title,
		weight: 'bold',
		size: 11,
		lineHeight: 6
	}, {
		type: 'text',
		relative: true,
		fullWidth: true,
		align: 'center',
		value: name,
		size: 10,
		lineHeight: 6
	}, {
		type: 'text',
		relative: true,
		fullWidth: true,
		align: 'center',
		value: description,
		size: 10,
		moveDown: 3
	}])

	const sectionGallery = (images) => ({
		type: 'gallery',
		relative: true,
		height: 200,
		margin: 16,
		values: images,
		descriptionDefaults: {
			color: theme.black,
			size: 10,
			lineHeight: 6,
			paddingTop: 6
		}
	})

	const sectionTopics = () => ({
		type: 'topics',
		color: theme.black,
		size: 12,
		lineHeight: 16
	})

	const sectionPdf = ({ /*title, */pdf }) => ({
		type: 'pdf',
		// value: title,
		// isTitle: true,
		pdf
	})

	return {
		coverImage,
		coverVectors,
		footer,
		headerBackground,
		headerLogo,
		headerText,
		bulletTopLeft,
		coverLogo,
		docTitle,
		repoTitle,
		repoSubtitle,
		repoHeader,
		sectionTitle,
		sectionSubtitle,
		sectionTitleParagraph,
		sectionParagraph,
		sectionList,
		sectionTable,
		sectionSignature,
		sectionCertificate,
		sectionGallery,
		sectionTopics,
		sectionPdf
	}
}