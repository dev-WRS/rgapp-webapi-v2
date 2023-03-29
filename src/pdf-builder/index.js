import { Readable } from 'stream'
import { PDFDocument/*, StandardFonts, rgb*/ } from 'pdf-lib'
import PDFKitDocument from './pdfkit-document.js'

class PDFBuilder {
	constructor (config) {
		this.size = config.size
		this.margins = config.margins
		this.defaultFont = config.defaultFont
		this.fonts = config.fonts

		this.setDraftCover(config.draftCover)
		this.setCover(config.cover)
		this.setHeader(config.header)
		this.setFooter(config.footer)
		this.setTableOfContent(config.tableOfContent)
		this.setSections(config.sections || [])
	}

	pipe (response) {
		return this.pdfDoc.save()
			.then(pdfBytes => {
				const stream = Readable.from(Buffer.from(pdfBytes))
				stream.pipe(response)
			})
	}

	async asBuffer () {
		const pdfBytes = await this.pdfDoc.save()
		return Buffer.from(pdfBytes)
	}

	async asStream () {
		const buffer = await this.asBuffer()
		const readable = Readable.from(buffer)
		
		readable.byteLength = buffer.byteLength
		return readable
	}

	async addPdf (pdf) {
		const pageCount = pdf.getPageCount()

		if (pageCount > 0) {
			const pages = await this.pdfDoc.copyPages(pdf, pdf.getPageIndices())
			
			pages.forEach(page => this.pdfDoc.addPage(page))
		}	
	}

	async insertPdf (index, pdf) {
		const pageCount = pdf.getPageCount()

		if (pageCount > 0) {
			const pages = await this.pdfDoc.copyPages(pdf, pdf.getPageIndices())

			pages.forEach((page, i) => this.pdfDoc.insertPage(index + i, page))
		}
	}

	async renderSections () {
		const header = this.header
		const footer = this.footer
		const contents = this.tableOfContent
		const sections = this.sections
		const pdfMaster = this.pdfKitFactory({
			hasDraftCoverPage: this.hasDraftCover,
			hasCoverPage: this.hasCover,
			autoFirstPage: this.hasTableOfContent,
			header,
			footer,
			contents,
			sections 
		})
		
		await pdfMaster.renderSections()

		this.pageWidth = pdfMaster.doc.page.width
		this.pageHeight = pdfMaster.doc.page.height

		//External pdfs to be embeded
		const embeded = []
		let pageStep = this.hasCover ? 1 : 2
		let pageGap = 0

		if (this.hasDraftCover) {
			pageStep--
		}

		for (let i = 0, ln = sections.length; i < ln; i++) {
			const section = sections[i]

			//Apply the page gap to the master indices & children
			pdfMaster.indices[i + 1].page = pdfMaster.indices[i + 1].page + pageGap
			pdfMaster.indices[i + 1].children.forEach(child => {
				child.page += pageGap
			})

			if (section.embeded && section.items[0].pdf) {
				const embededPdf = await PDFDocument.load(section.items[0].pdf)
				const pageCount = embededPdf.getPageCount()

				if (pageCount > 0) {
					const pageIndex = pdfMaster.indices[i + 1].page - pageStep
					
					embeded.push({ index: pageIndex, pdf: embededPdf })
					pageGap += pageCount - 1
				}
			}
		}

		await pdfMaster.renderTableOfContent()
		await pdfMaster.renderHeadersAndFooters()

		const pdfBytes = await pdfMaster.asBuffer()
		const pdf = await PDFDocument.load(pdfBytes)

		await this.addPdf(pdf)

		for (let i = 0, ln = embeded.length; i < ln; i++) {
			const { index, pdf } = embeded[i]

			await this.insertPdf(index, pdf)
		}

		// console.log(pdfMaster.indices)
	}

	setDraftCover (config) {
		if (config && config.items) {
			this.hasDraftCover = true
			this.draftCover = config	
		}	
	}

	setCover (config) {
		if (config && config.items) {
			this.hasCover = true
			this.cover = config	
		}		
	}

	async renderPdfPage (items) {
		const pdf = this.pdfKitFactory()

		await pdf.addPage()
		await pdf.renderItems(items)

		this.pageWidth = pdf.doc.page.width
		this.pageHeight = pdf.doc.page.height	

		const pdfBytes = await pdf.asBuffer()
		const loadedPdf = await PDFDocument.load(pdfBytes)
		const [pdfPage] = await this.pdfDoc.copyPages(loadedPdf, [0])
			
		this.pdfDoc.addPage(pdfPage)	
	}

	async renderDraftCover () {
		if (this.hasDraftCover) {
			await this.renderPdfPage(this.draftCover.items)
		}
	}

	async renderCover () {
		if (this.hasCover) {
			await this.renderPdfPage(this.cover.items)
		}
	}

	setHeader (config) {
		this.header = config
	}

	setFooter (config) {
		this.footer = config
	}

	setTableOfContent (config) {
		if (config && config.items) {
			this.hasTableOfContent = true
			this.tableOfContent = config
		}
	}

	setSections (config) {
		this.sections = config
	}

	pdfKitFactory (config = {}) {
		const { size, defaultFont, fonts, margins } = this
		const pdf = new PDFKitDocument({
			autoFirstPage: false,
			...config,
			size, defaultFont, fonts, margins
		})

		return pdf
	}

	async build () {
		this.pdfDoc = await PDFDocument.create()

		await this.renderDraftCover()
		await this.renderCover()
		await this.renderSections()
	}
}

export default PDFBuilder