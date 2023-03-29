import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { PassThrough } from 'stream'
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js'
import { textMixin, elements } from './pdfkit-elements.js'

class PDFKitDocument {
	constructor ({
		defaultFont = 'Times-Roman',
		fonts,
		...config
	}) {
		this.size = config.size
		this.margin = config.margin
		this.margins = config.margins
		this.hasDraftCoverPage = config.hasDraftCoverPage
		this.hasCoverPage = config.hasCoverPage
		this.autoFirstPage = config.autoFirstPage

		this.doc = new PDFDocument({
			size: this.size,
			margins: this.margins,
			autoFirstPage: false,
			bufferPages: true
		})

		if (fonts) {
			const cwd = process.cwd()
			Object.keys(fonts).forEach(name => {
				const src = fs.readFileSync(path.join(cwd, fonts[name]))
				this.doc.registerFont(name, src)
			})
		}

		this.doc.on('pageAdded', this.handlePageAdded.bind(this))

		this.defaultFont = defaultFont
		this.contentMarginTop = this.margins.top
		this.contentMarginBottom = this.margins.bottom
		
		this.header = config.header
		this.footer = config.footer
		this.contents = config.contents
		this.sections = config.sections
		this.indices = {}
		this.currentPage = this.autoFirstPage ? 1 : 0
	}

	handlePageAdded () {
		const { currentSection, indices } = this
		
		this.currentPage++

		if (indices[currentSection] && !indices[currentSection].page) {
			indices[currentSection].page = indices[currentSection].originalPage = this.currentPage
		}
	}

	async renderHeader () {
		const items = this.header ? this.header.items : []
		await this.renderItems(items)
	}

	async renderFooter (pageNumber) {
		const items = this.footer ? this.footer.items : []
		const bottomMargin = this.doc.page.margins.bottom

		this.doc.page.margins.bottom = 0

		if (items.pageNumber) {
			items.pageNumber.value = pageNumber
		}

		await this.renderItems(items)
		this.doc.page.margins.bottom = bottomMargin
	}

	async renderHeadersAndFooters () {
		const range = this.doc.bufferedPageRange()
		let pageSteps = 0

		if (this.hasDraftCoverPage) {
			pageSteps++	
		}
		if (this.hasCoverPage) {
			pageSteps++	
		}
		if (this.autoFirstPage) {
			pageSteps++
		}

		for (let i = range.start, ln = range.count; i < ln; i++) {
			this.doc.switchToPage(i)

			await this.renderHeader()
			await this.renderFooter(i + pageSteps)
		}
		
		this.doc.flushPages()
	}

	async renderTableOfContent () {
		const { doc, contents, indices } = this
		let items = []

		if (contents) {
			const topicsItem = contents.items.find(item => item.type === 'topics')

			if (topicsItem) {
				topicsItem.values = Object.values(indices)	
			}
			items = contents.items

			doc.switchToPage(0)

			await this.renderItems(items)
		}
	}

	async renderSections () {
		const sections = this.sections

		if (this.contents) {
			await this.addPage()
		}

		if (sections) {
			for (let i = 0, ln = sections.length; i < ln; i++) {
				const section = sections[i]
				
				this.currentSection = i + 1
				
				if (section.embeded !== true) {
					this.indices[this.currentSection] = { children: [] }

					await this.addPage()
					await this.renderItems(section.items)
				}
				else if (section.items[0]/* && section.items[0].isTitle*/) {
					this.currentPage++
					this.indices[this.currentSection] = { 
						children: [], 
						originalPage: this.currentPage,
						page: this.currentPage,
						title: section.items[0].value
					}
				}
			}
		}
	}

	async renderItems (items) {
		let y = this.contentMarginTop

		if (!_.isArray(items)) {
			items = Object.values(items)
		}

		for (let i = 0, ln = items.length; i < ln; i++) {
			let {
				type, 
				top, 
				left, 
				marginTop = 0,
				marginBottom = 0,
				relative = false,
				...item
			} = items[i]

			if (item.isTitle) {
				this.indices[this.currentSection].title = item.value	
			}
			else if (item.isSubTitle) {
				this.indices[this.currentSection].children.push({
					title: item.value,
					originalPage: this.currentPage,
					page: this.currentPage
				})	
			}

			if (elements[type]) {
				if (type === 'text') {
					item = textMixin(this)(item)
				}

				if (relative) {
					y += marginTop
				}

				//render element
				item = await elements[type](this, {
					top: relative ? y : top,
					left: left,
					...item
				})

				if (relative) {
					y += item.height
					y += marginBottom
				}
			}
		}
	}

	addPage () {
		const { doc, margins } = this

		return new Promise((resolve) => {
			const listener = () => {
				doc.removeListener('pageAdded', listener)
				resolve()
			}
			doc.addListener('pageAdded', listener)

			doc.addPage({
				margins
			})
		})
	}

	asBuffer () {
		const { doc } = this

		return new Promise((resolve, reject) => {
			const stream = doc.pipe(new PassThrough())
			const buffers = []

			doc.end()

			stream.on('data', chunk => buffers.push(chunk))
			stream.on('finish', () => resolve(Buffer.concat(buffers)))
			stream.on('error', (error) => reject(error))
		})
	}
}

export default PDFKitDocument