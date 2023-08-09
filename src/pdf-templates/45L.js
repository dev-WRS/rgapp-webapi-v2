import PDFBuilder from '../pdf-builder/index.js'
import helpers, { defaultFont, fonts, removeEndingDots,
	contentMarginTop, contentMarginRight, contentMarginBottom, contentMarginLeft, 
	formatDate, formatCurrency, formatPhone, legacyImprove
} from './helpers.js'

export default async ({
	theme,
	reportTitle,
	reportSubtitle1,
	reportSubtitle2,
	headerTitle = '',
	project,
	customer,
	certifier,
	logo,
	signature,
	photos,
	pdfFiles
}) => {
	const {
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
		sectionGallery,
		sectionTopics,
		sectionPdf
	} = helpers({ theme })

	const benefitRate = 2000
	const nameState = project.state !== 'Multistate' ? `${project.name}, ${project.state}` : `${project.name}` 
	const draftCoverArray = { items: [
		sectionParagraph('INTERNAL REVENUE CODE SECTION 45L\nEPACT COMPLIANCE REPORT OF', {
			size: 12,
			align: 'center'
		}),
		sectionParagraph(project.legalEntity, {
			size: 12,
			align: 'center'	
		}),
		sectionParagraph(nameState , {
			size: 12,
			align: 'center'	
		}),
		sectionParagraph(project.taxYear, {
			size: 12,
			align: 'center'	,
			moveDown: 2
		}),
		sectionParagraph('ISSUED FOR REVIEW ONLY', {
			size: 12,
			align: 'center'
		}),
		sectionParagraph(`The enclosed report has been issued by Walker Reid Strategies for review by ${removeEndingDots(project.legalEntity)}. Any and/or all pages watermarked with DRAFT do not meet the regulations of 1.6001-1(a) requiring taxpayers to maintain books and records which are sufficient to establish the entitlement to, and amount of any credit claimed by the taxpayer. Upon final approval, a final copy will be provided to ${project.legalEntity} meeting the regulations of 1.6001-1(a).`, {
			moveDown: 10
		}),
		sectionParagraph('CONFIDENTIAL', {
			size: 9,
			align: 'center'	
		}),
		sectionParagraph('The contents of this document are confidential and are exclusive to the intended recipient and Walker Reid Strategies employees. Distribution or sharing of this information with persons or entities for which it is not intended is prohibited, in any form, without the express written consent of Walker Reid Strategies.', {
			size: 9,
			align: 'center'
		})
	] }

	const legacyImproved = legacyImprove(project.legalEntity)
	console.log('nameState', nameState)

	const pdf = new PDFBuilder({ 
		size: 'LETTER',
		defaultFont, fonts,
		margins: { top: contentMarginTop, right: contentMarginRight, bottom: contentMarginBottom, left: contentMarginLeft },
		draftCover: project.draft === true || project.draft === undefined ? draftCoverArray : {},
		cover: {
			items: [coverImage, 
				...coverVectors,
				coverLogo(logo),
				...docTitle('Certification'),
				repoTitle(reportTitle),
				repoSubtitle(reportSubtitle1),
				repoHeader(reportSubtitle2, {
					marginBottom: 32
				}),
				repoHeader(legacyImproved, {
					width: 200
				}),
				repoHeader(nameState, {
					size: 12,
					width: 200
				}),
				repoHeader(project.taxYear, {
					size: 12,
					width: 200
				})
			]
		},
		tableOfContent: {
			items: [
				...sectionTitle('Table of Contents', { 
					isTitle: false
				}),
				sectionTopics()
			]	
		},
		header: {
			items: [headerBackground, {
				...headerLogo,
				value: logo
			}, {
				...headerText,
				value: headerTitle
			}, bulletTopLeft]
		},
		footer
	})

	const sections = []

	let license

	if (certifier.licenses && certifier.licenses.length > 0) {
		license = certifier.licenses.find(license => license.state === 'Multistate') || certifier.licenses[0]
	}

	sections.push({
		items: [
			...sectionTitle('Scope of Study'),
			sectionParagraph('The purpose of this study is to determine whether the subject dwelling units contain energy efficient commercial property which qualifies for a tax credit under Section 45L of the Internal Revenue Code and to provide documentation of said qualification as required under Section 45L, Notice 2006-27 and Notice 2008-36.'),
			sectionParagraph('The scope of our study included, but was not limited to the following:'),
			sectionList([
				'Analysis of construction documents to determine whether the energy efficient building envelope components and energy efficient heating or cooling equipment installed meet the required energy efficiency perfor- mance measures.',
				'Use of an energy consumption computations to calculate the level of annual heating and cooling energy consumption which is at least 50 percent below the annual level of heating and cooling energy consumption of a comparable dwelling unit which is constructed in accordance with the standards of chapter 4 of the 2006 International Energy Conservation Code, as such Code (including supplements) is in effect on January 1, 2006, and for which the heating and cooling equipment efficiencies correspond to the minimum allowed under the regulations established by the Department of Energy pursuant to the National Appliance Energy Conservation Act of 1987 and in effect at the time of completion of construction, and to have building envelope component improvements account for at least 1/5 of such 50 percent, pursuant to Section 45L(c)(1).',
				'Certification by a person that is not related to the eligible contractor and has been accredited or otherwise authorized by RESNET (or an equivalent rating network) to use energy performance measurement methods approved by RESNET (or the equivalent rating network).',
				'Calculations of energy consumption of the subject dwelling units and comparable units.'
			])
		]
	})
	sections.push({
		items: [
			...sectionTitle('Statement of Law'),
			sectionTitleParagraph('Background'),
			sectionParagraph('Section 1332 of the Energy Policy Act of 2005 enacted Section 45L of the Internal Revenue Code, which provides tax credits for qualifying energy-efficient residential units placed in service between January 1, 2006 and December 31, 2007. The Tax Relief and Health Care Act of 2006 extended the provision to December 31, 2008. The Energy Improvement and Extension Act of 2008 extended the credit through 2009, followed by the Tax Relief, Unemployment Insurance Reauthorization, and Job Creation Act of 2010 and the American Taxpayer Relief Act of 2012, which extended it through 2011 and 2013, respectively. The Consolidated Appropriations Act, 2016 extended Section 45L through December 31, 2016. The Bipartisan Budget Act of 2018 extended Section 45L through December 31, 2017. The H.R. 1865 the Further Consolidated Appropriations Act, 2020 extended Section 45L retroactively from January 1st, 2018 through December 31st, 2020. Most recently, The H.R. 133: Consolidated Appropriations Act, 2021 extended Section 45L from January 1st, 2021 through December 31st, 2021.'),
			sectionParagraph('The American Taxpayer Relief Act of 2012 also updated the comparable standard from the 2003 IECC to the 2006 IECC for homes acquired after December 31, 2011. The most recent clarifying procedures are published in Notice 2008-35 and Notice 2008-36.')
		]
	})
	sections.push({
		items: [		
			sectionTitleParagraph('Applicable Law'),
			sectionParagraph('To help encourage the construction of more energy efficient homes, an eligible contractor may claim, as part of the general business credit, a tax credit of $1,000 or $2,000 for the construction or manufacture of a new energy efficient home that meets the qualifying criteria (Code Secs. 38(b)(23) and 45L(a)). An “eligible contractor” is a person who constructed a qualified new energy efficient home or, with respect to a manufactured home, the producer of that home (Code Sec. 45L(b)(1)). The applicable amount of the credit depends on the energy savings realized by the home. The maximum credit is $2,000 for homes and manufactured homes that meet rigorous energy-saving requirements; alternatively, manufactured homes that meet a less demanding test may qualify for a $1,000 credit. The taxpayer’s basis in the property is reduced by the amount of any new energy efficient home credit allowed with respect to that property (Code Sec. 45L(e)). Expenditures taken into account under the rehabilitation and energy components of the investment tax credit are not taken into account under the energy efficient home credit (Code Sec. 45L(f)).'),
			sectionParagraph('In order to be considered a qualified new energy efficient home, a qualified new energy efficient home must receive a written certification that describes its energy-saving features including the energy efficient building envelope components used in its construction and energy efficient heating or cooling equipment that has been installed (Code Sec. 45L(c) and (d)). Further, the dwelling must be located in the United States, must be purchased or acquired by a person from the eligible contractor for use as a residence during the tax year, and must be acquired before January 1, 2014.'),
			sectionParagraph('A dwelling unit meets the energy saving requirements of 45L(c) if such unit is certified to have a level of annual heating and cooling energy consumption which is at least 50 percent below the annual level of heating and cooling energy consumption of a comparable dwelling unit which is constructed in accordance with the standards of chapter 4 of the 2006 International Energy.'),
			sectionParagraph('Conservation Code, as such Code (including supplements) is in effect on January 1, 2006, and for which the heating and cooling equipment efficiencies correspond to the minimum allowed under the regulations established by the Department of Energy pursuant to the National Appliance Energy Conservation Act of 1987 and in effect at the time of completion of construction, and to have building envelope component improvements account for at least 1/5 of such 50 percent, a manufactured home which conforms to Federal Manufactured Home Construction and Safety Standards (part 3280 of title 24, Code of Federal Regulations) and which meets the requirements of 45L(c)(1), or a manufactured home which conforms to Federal Manufactured Home Construction and Safety Standards (part 3280 of title 24, Code of Federal Regulations) and which meets the requirements of paragraph (1) applied by substituting “30 percent” for “50 percent” both places it appears therein and by substituting “ 1/3” for “ 1/5” in subparagraph (B) thereof, or meets the requirements established by the Administrator of the Environmental Protection Agency under the Energy Star Labeled Homes program.')
		]
	})
	sections.push({
		items: [
			...sectionTitle('Calculation of Section 45L Credit'),
			sectionTitleParagraph('Summary of Credit Calculation'),
			sectionParagraph('Based on the energy calculations, the following units qualify for credit certification:'),
			sectionTable({
				columns: [{
					type: 'string',
					header: 'Name',
					dataIndex: 'name',
					width: 140
				}, {
					type: 'string',
					header: 'Units Qualified',
					dataIndex: 'units',
					align: 'right',
					flex: true
				}, {
					type: 'string',
					header: 'Benefit Rate',
					renderer: (row) => formatCurrency(row.rate),
					align: 'right',
					flex: true
				}, {
					type: 'string',
					header: '45L Credit',
					renderer: (row) => formatCurrency(row.credit),
					align: 'right',
					flex: true
				}],
				rows: [{
					name: project.dwellingUnitName,
					units: project.totalDwellingUnits,
					rate: benefitRate,
					credit: formatCurrency(parseFloat(project.totalDwellingUnits) * parseFloat(benefitRate))
				}]
			})
		]
	})
	sections.push({
		items: [
			...sectionTitle('Section 45L Certification Report'),
			sectionSubtitle('a. Qualifying Certification Satisfying Notice 2008-35'),
			sectionParagraph('The Section 45L certification for the Energy Efficient Home Credit is enclosed. The certification satisfies statements for Notice 2008-35, Section 3.')
		]
	})
	sections.push({
		items: [
			sectionTable({
				title: '01) Energy Efficient Dwelling Unit Certifier Information',
				columnsHeader: false,
				columns: [{
					type: 'string',
					dataIndex: 'name',
					weight: 'bold',
					width: 140
				}, {
					type: 'string',
					dataIndex: 'value',
					flex: true
				}],
				rows: [{
					name: 'Certifier Name',
					value: certifier.name
				}, {
					name: 'License Number',
					value: license ? license.number : ''
				}, {
					name: 'Address',
					value: certifier.address
				}, {
					name: 'Phone',
					value: formatPhone(certifier.phone)
				}]
			}),
			sectionTable({
				title: '02) Dwelling Unit Information',
				columnsHeader: false,
				columns: [{
					type: 'string',
					dataIndex: 'name',
					weight: 'bold',
					width: 140
				}, {
					type: 'string',
					dataIndex: 'value',
					flex: true
				}],
				rows: [{
					name: 'Residence Name',
					value: project.private ? project.legalEntity : project.name
				}, {
					name: 'Address',
					value: project.dwellingUnits.length == 1 ? project.dwellingUnitAddress : 'Multiple (See Table 2.1)'
				}]
			})
		]
	})
	if (project.dwellingUnits.length > 1) {
		let rowCount = 0

		sections.push({
			items: [
				// sectionTitleParagraph('Table 2.1) Addresses'),
				sectionTable({
					title: {
						value: 'Table 2.1) Addresses',
						color: '#000000',
						size: 12,
						paddingLeft: 0,
						lineHeight: 6,
						weight: 'bold',
						backgroundColor: '#FFFFFF'
					},
					columnDefaults: {
						backgroundColor: theme.quaternary
					},
					columns: [ {
						type: 'string',
						header: 'Qty',
						renderer: (row) => ++rowCount,
						width: 70
					}, {
						type: 'string',
						header: 'Unit Type',
						dataIndex: 'type',
						width: 70
					}, {
						type: 'string',
						header: 'Model',
						dataIndex: 'model',
						width: 110
					}, {
						type: 'string',
						header: 'Address',
						dataIndex: 'address',
						flex: true
					}, {
						type: 'string',
						header: 'Building',
						dataIndex: 'building',
						width: 70
					}, {
						type: 'string',
						header: 'Unit',
						dataIndex: 'unit',
						width: 45
					}],
					rows: project.dwellingUnits
				}, true)
			]
		})
	}

	const section3_4 = [
		sectionTitleParagraph('03) Qualified Dwelling Unit Statement'),
		sectionParagraph('The listed dwelling units have a projected level of annual heating and cooling energy consumption that is at least 50 percent below the annual level of heating and cooling energy consumption of a reference dwelling unit in the same climate zone; building envelope component improvements alone account for a level of annual heating and cooling energy consumption that is at least 10 percent below the annual level of heating and cooling energy consumption of a reference dwelling unit in the same climate zone; and heating and cooling energy consumption have been calculated in the manner prescribed in section 2.03 of Notice 2008-35.'),
		sectionTitleParagraph('04) Field Inspection Statement'),
		sectionParagraph('A qualified individual has field inspected the properties and has confirmed that all features of the home affecting such heating and cooling energy consumption comply with the design specifications provided to the eligible certifier. With respect to builders who build at least 85 homes during a twelve-month period or build subdivisions with the same floor plan using the same subcontractors, a sampling protocol may have been used in accordance with Notice 2008-35 and the ENERGY STAR for Homes Sampling Protocol Guidelines instead of inspecting all of the homes.')
	]

	const section5 = [sectionTitleParagraph('05) Energy Reduction Certification'),
		sectionParagraph('The following list includes the dwelling units’ energy efficient building envelope components and their respective energy performance ratings as required by section 401.3 of the 2006 IECC Supplement; and the energy efficient heating and cooling equipment installed in the dwelling units and the energy efficiency performance of such equipment as rated under applicable Department of Energy Appliance Standards test procedures.'),
		sectionParagraph('The outcome of the attached calculations and information result in the following tax credit, subject to basis qualifications:'),
		sectionTable({
			columns: [{
				type: 'string',
				header: 'Dwelling Unit Name',
				dataIndex: 'name',
				flex: true
			}, {
				type: 'string',
				header: 'Total # Units',
				dataIndex: 'units',
				align: 'right',
				width: 100
			}, {
				type: 'string',
				header: 'Tax Credit/Unit',
				renderer: (row) => formatCurrency(row.rate),
				align: 'right',
				width: 110
			}, {
				type: 'string',
				header: '45L Credit',
				renderer: (row) => formatCurrency(row.credit),
				align: 'right',
				width: 120
			}],
			rows: [{
				name: project.dwellingUnitName,
				units: project.totalDwellingUnits,
				rate: benefitRate,
				credit: project.totalDwellingUnits * benefitRate
			}],
			summary: `Total ${formatCurrency(project.totalDwellingUnits * benefitRate)}`
		}),
		sectionParagraph('Note: The amount of the deduction is equal to the lesser of: (1) the capitalized cost incurred with respect to the energy efficient property and (2) the allowable credit amount.')
	]

	const section_6 = [
		sectionTitleParagraph('06) Certified Software'),
		sectionParagraph('Qualified testing was used to determine that the software program is sufficiently accurate to justify its use in calculating energy consumption to certify that the required energy cost reductions were obtained. The software used to calculate energy consumption is:'),
		sectionParagraph('Micropas v7.70', { weight: 'bold' })
	]

	sections.push({
		items: section3_4
	})

	sections.push({
		items: section5.concat(section_6)
	})

	sections.push({
		items: [
			sectionTitleParagraph('07) Declaration by Certifier'),
			sectionParagraph('Under penalties of perjury, I declare that I have examined this certification, including accompanying documents, and to the best of my knowledge and belief, the facts presented in support of this certification are true, correct, and complete.', {
				moveDown: 3
			}),
			sectionSignature({
				title: 'Certifier Signature',
				printedName: certifier.name,
				signature,
				date: formatDate(new Date()),
				state: license ? license.state : ''
			})
		]
	})
	sections.push({
		items: [
			sectionSubtitle('b. Energy Reduction Calculations'),
			sectionParagraph('Calculations were performed in compliance with the requirements under Internal Revenue Code Section 45L(c) and Notice 2008-35, Section 2.')
		]
	})
	if (pdfFiles.certificate45L) {
		sections.push({
			embeded: true,
			items: [sectionPdf(pdfFiles.certificate45L)]
		})
	}
	if (photos.length > 0) {
		sections.push({
			items: [
				sectionSubtitle('c. Site Inspection Photographs'),
				sectionParagraph('Site inspections were performed as prescribed by Notice 2008-35 to verify the installation of energy efficient property per design documents. The following are arbitrary photos depicting various components used within the energy efficient units.')
			]
		})
		sections.push({
			items: [
				sectionTitleParagraph('Site Inspection'),
				sectionParagraph(`On ${project.inspectionDate} a site visit to ${project.dwellingUnitName} was performed to verify the installation of energy efficient technology.`),
				sectionGallery(photos)
			]
		})
	}

	pdf.setSections(sections)

	await pdf.build()

	return pdf
}