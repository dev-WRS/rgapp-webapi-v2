/* eslint-disable quotes */
import PDFBuilder from '../pdf-builder/index.js'
import helpers, { 
	defaultFont, fonts, divideBuildings,
	contentMarginTop, contentMarginRight, contentMarginBottom, contentMarginLeft, removeEndingDots,
	formatDate, formatNumber, formatCurrency, formatPhone, asCommaSeparatedString, asBuildingsSubject,
	QUALYFYING_CATEGORIES, WHOLE_BUILDING
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
	pdfFiles, 
	photos 
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
		sectionCertificate,
		sectionGallery,
		sectionTopics,
		sectionPdf
	} = helpers({ theme, noBrand: customer.name == 'No Brand' })

	const draftCoverArray = { items: [
		sectionParagraph('INTERNAL REVENUE CODE SECTION 179D\nEPACT COMPLIANCE REPORT OF', {
			size: 12,
			align: 'center'
		}),
		sectionParagraph(project.legalEntity, {
			size: 12,
			align: 'center'	
		}),
		sectionParagraph(`${project.name}, ${project.state}`, {
			size: 12,
			align: 'center'	
		}),
		sectionParagraph(project.taxYear.toString(), {
			size: 12,
			align: 'center'	,
			moveDown: 2
		}),
		sectionParagraph('ISSUED FOR REVIEW ONLY', {
			size: 12,
			align: 'center'
		}),
		sectionParagraph(`The enclosed report has been issued by Walker Reid Strategies for review by ${removeEndingDots(project.legalEntity)}. Any and/or all pages watermarked with DRAFT do not meet the regulations of 1.6001-1(a) requiring taxpayers to maintain books and records which are sufficient to establish the entitlement to, and amount of any deduction claimed by the taxpayer. Upon final approval, a final copy will be provided to ${project.legalEntity} meeting the regulations of 1.6001-1(a).`, {
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
	const noBrand = customer.name == 'No Brand'
	const coverImageVectors = noBrand ? [] : [coverImage, ...coverVectors, coverLogo(logo)]

	const pdf = new PDFBuilder({ 
		size: 'LETTER',
		defaultFont, fonts,
		margins: { top: contentMarginTop, right: contentMarginRight, bottom: contentMarginBottom, left: contentMarginLeft },
		draftCover: project.draft === true || project.draft === undefined ? draftCoverArray : {},
		cover: {
			items: [...coverImageVectors,				
				...docTitle('Certification', noBrand),
				repoTitle(reportTitle, noBrand),
				repoSubtitle(reportSubtitle1, noBrand),
				repoHeader(reportSubtitle2, noBrand, {
					marginBottom: 32
				}),
				repoHeader(project.legalEntity, noBrand, {
					width: 200
				}),
				repoHeader(`${project.name}, ${project.state}`, noBrand, {
					size: 12,
					width: 200
				}),
				repoHeader(project.taxYear.toString(), noBrand, {
					size: 12,
					width: 200
				})
			]
		},
		tableOfContent: {
			items: [
				...sectionTitle('Table of Contents', noBrand, { 
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

	const deductionFrom = project.taxYear === 2023 ? '2.68' : '2.83'
	const deductionTo = project.taxYear === 2023 ? '5.36' : '5.65'
	const rateFrom = project.taxYear === 2023 ? '0.54' : '0.57'
	const rateTo = project.taxYear === 2023 ? '1.07' : '1.13'

	const year = project.taxYear > 2015 ? '2007' : '2001'
	const totalBuildingArea = project.buildings.reduce((result, building) => result + parseFloat(building.area), 0)
	const totalDeduction = project.buildings.reduce((result, building) => result + (parseFloat(building.area) * parseFloat(building.rate.toFixed(2))), 0)
	const qualifyingPercentages = {}
	let qualifyingWholeBuilding = false
	let qualifyingCategories = []
	let buildingTypes = []
	
	for (let i = 0, ln = project.buildings.length; i < ln; i++) {
		const building = project.buildings[i]
		if (building.qualifyingCategories.indexOf(WHOLE_BUILDING) !== -1) {
			qualifyingCategories = building.qualifyingCategories
			qualifyingWholeBuilding = true
		}
		else {
			building.qualifyingCategories.forEach(qualifyingCategory => {
				if (qualifyingCategories.indexOf(qualifyingCategory) === -1) qualifyingCategories.push(qualifyingCategory)
			})
		}

		if (building.savingsRequirement) {
			Object.keys(building.savingsRequirement).forEach(name => {
				if (!qualifyingPercentages[name]) {
					qualifyingPercentages[name] = building.savingsRequirement[name]
				}
			})
		}

		if (buildingTypes.indexOf(building.type) === -1) {
			buildingTypes.push(building.type)
		}
	}

	const qualifyingProperty = qualifyingWholeBuilding ? asCommaSeparatedString(QUALYFYING_CATEGORIES) : asCommaSeparatedString(qualifyingCategories)
	const buildingTypesSubject = asBuildingsSubject(buildingTypes, project.buildings.length)

	let license

	if (certifier.licenses && certifier.licenses.length > 0) {
		license = certifier.licenses.find(license => license.state === project.state) || certifier.licenses[0]
	}

	sections.push({
		items: [
			...sectionTitle('Scope of Study', noBrand),
			sectionParagraph('The purpose of this study is to determine whether the subject building contains energy efficient commercial property which qualifies for a tax deduction under Section 179D of the Internal Revenue Code and to provide documentation of said qualification as required under Section l79D(d)(5).'),
			sectionParagraph('The scope of our study included, but was not limited to the following:'),
			sectionList([
				`Analysis of construction documents to determine whether energy efficient measures have been incorporated into the design of the building's ${qualifyingProperty} systems.`,
				'Certification by a locally licensed professional engineer that the energy efficient equipment and components identified in the buildings designs were installed.',
				'Calculations of deductions available based on the energy reduction costs of the subject building and the reference building.',
				`Use of an energy model to calculate the energy consumption cost of the building and an energy model to calculate the energy consumption cost of the American Society of Heating, Refrigeration and Air Conditioning Engineers (ASHRAE) Standard 90.1-${year} reference building. The energy model used for the energy consumption analysis is authorized by the Department of Energy pursuant to Section 179D(d)(2).`
			])
		]
	})
	sections.push({
		items: [
			...sectionTitle('Statement of Law', noBrand),
			sectionTitleParagraph('Applicable Law'),
			sectionParagraph('Section 179D provides a deduction for an amount equal to the cost of energy efficient commercial building property placed in service during the taxable year. Unless otherwise indicated, section references are to the Internal Revenue Code of 1986, as amended and the regulations there under. In order to qualify for this deduction, the energy efficient commercial building property must receive proper "certification" by "qualified individuals" using "qualified computer software" as meeting various energy efficiency standards. These terms are further defined in Section 179D. This report has been prepared in accordance with these standards.'),
			sectionParagraph(`Section 179D(b) provides that the maximum deduction for any building in a given taxable year shall not exceed the excess of $0.50, increased by $0.02 for each percentage point above 25% in certified annual energy and power cost savings, but not more than $1.00, multiplied by the "building square footage" less the aggregate amount of deductions for that building for the three taxable years immediately preceding the current taxable year (four taxable years in the case of a deduction allowable to a person primarily responsible for designing the property, as opposed to the owner of the property). If any property meets the requirements of Prevailing Wages (179D(b)(4))and Apprenticeship (179D(b)(5)) in accordance with guidance from Notice 2022-61, the applicable dollar value qualifies for an increased deduction of up to $2.50 (not more than $5.00) per square foot. However, for properties placed in service after December 31, 2022, a cost-of-living adjustment is determined in accordance with IRC Section 1(f)(3) (see IRC 179D(g)) and is published by the Internal Revenue Service (IRS) in Revenue Procedure 2022-38. This adjustment allows for a rate of up to $${rateFrom} to $${rateTo} per square foot ($0.02 for each percentage point above 25% in certified annual energy and power savings) and $${deductionFrom} to $${deductionTo} ($0.11 for each percentage point above 25% in certified annual energy and power savings) per square foot for properties meeting the requirements of Prevailing Wages and Apprenticeship.`),
			sectionParagraph('Section 179D(c)(1) defines the term "energy efficient commercial building property" to be property with respect to which depreciation is allowable, which is:'),
			sectionList([
				'Installed on or in any building located in the United States and within the scope of Standard 90.1.',
				'Installed as part of the interior lighting systems, the heating, cooling, ventilation, and hot water systems or the building envelope, and ',
				'Certified in accordance with the tax law as part of a plan designed to reduce the total annual energy and power costs of the building by a minimum of 25% or more in comparison to a reference building meeting the minimum requirements of ASHRAE Standard 90.1.'
			]),		
			sectionParagraph('Section 179D(d)(3) provides that for energy efficient commercial building property installed on or in property owned by a specified tax-exempt entity, the Secretary shall allow the allocation of the deduction to the person primarily responsible for designing the property in lieu of the owner of such property. Specified tax-exempt entities include the United States, any State or political subdivision thereof, Indian tribal governments, Alaska Native Corporations, and any tax-exempt organizations.'),
			sectionParagraph('Section 179D(e) provides that if a deduction is allowed under this section with respect to any energy efficient commercial building property, the basis of such property shall be reduced by the amount of the deduction allowed.')
		]
	})	
	sections.push({
		items: [
			sectionParagraph('Notice 2006-52 section 5.01 defines "building square footage" as the sum of the floor areas of the conditioned spaces within the building, including basements, mezzanine, and intermediate-floored tiers and penthouses with headroom height of 7.5 feet or greater. Building square footage is measured from the exterior faces of exterior walls or from the centerline of walls separating buildings, but excludes covered walkways, open roofed over areas, porches and similar spaces, pipe trenches, exterior terraces or steps, chimneys, roof overhangs and similar features.'),
			sectionParagraph('Similar to 179D(d)(3) Allocation of Deduction by certain tax-exempt entities, Notice 2008-40 section 3.04 provides relevant guidance on the allocation of the Section 179D deduction to the designer of a government-owned building must be in writing and contain various statements related to the energy efficient commercial building property along with signatures of the authorized representatives of both the owner of the government-owned building and the designer or the designer\'s authorized representative. Section 3.07 provides that the owner of the public building must reduce the basis of the energy efficient commercial building property by the amount of the Section 179D deduction allocated.')
		]
	})

	let pwTotalDeduction = project.buildings.reduce((acc, row) => acc + (parseFloat(row.area) * parseFloat(row.pwRate.toFixed(2))), 0)

	sections.push({ 
		items: [
			...sectionTitle('Calculation of Section 179D Deduction', noBrand),
			sectionTitleParagraph('Summary of Deduction Calculation'),
			sectionParagraph(`Based on the energy model calculations, the ${qualifyingProperty} systems will qualify as Energy Efficient Commercial Building Property. Therefore, the property will qualify for a deduction limited to the cost of the qualifying systems. This calculation is based upon a total combined square footage of ${formatNumber(totalBuildingArea)}.`)
		]
	})

	let buildings = divideBuildings(project.buildings)
	const paragraphs1Table = [
		sectionParagraph('Based on the square footage calculation, limited to the cost of the qualifying systems, the total deduction for the buildings will be:'),
		sectionParagraph(`Total 179D Deduction: ${formatCurrency(totalDeduction)}`, { fullWidth: true, align: 'center', weight: 'bold' }),
		sectionParagraph(`Total 179D(b)(3) Deduction (with PW&A): ${formatCurrency(pwTotalDeduction)}`, { fullWidth: true, align: 'center', weight: 'bold' }),
		sectionParagraph(`*Note: Projects that meet the requirements of Section 2.02(2)(i) or (ii) (IRS BOC Exception: Physical Work Test or Five Percent Safe Harbor) of Notice 2022-61 before January 29, 2023, are exempt from the prevailing wage and apprenticeship requirements and can qualify for the deduction ranging from $${deductionFrom} to $${deductionTo} per square foot. For any property placed-in-service on or after January 1, 2023, and which does not meet the exception above, in order to qualify for the increased deduction level under 179D(b)(3), taxpayers must adhere to specific prevailing wage and apprenticeship requirements as outlined in Notice 2022-61.`)
	]
	let canAddParagraphs1TInSamePage = false

	for (let i = 0, ln = buildings.length; i < ln; i++) {
		let itemsToAdd = [
			sectionTable({
				columns: [{
					type: 'string',
					header: 'Name',
					dataIndex: 'name',
					width: 120
				}, {
					type: 'string',
					header: 'Qualifying Area',
					renderer: (row) => `${formatNumber(row.area)} SF`,
					align: 'right',
					width: 98
				}, {
					type: 'string',
					header: 'Savings %',
					renderer: (row) => `${formatNumber(row.percentSaving)} %`,
					align: 'right',
					width: 70
				}, {
					type: 'string',
					header: 'Deduction/SF',
					renderer: (row) => formatCurrency(row.rate),
					align: 'right',
					width: 86
				}, {
					type: 'string',
					header: 'Deduction',
					renderer: (row) => formatCurrency(parseFloat(row.area) * parseFloat(row.rate.toFixed(2))),
					align: 'right',
					width: 81
				}, {
					type: 'string',
					header: 'PW&A Deduction/SF',
					renderer: (row) => formatCurrency(row.pwRate),
					align: 'right',
					width: 120
				}, {
					type: 'string',
					header: 'PW&A Deduction',
					renderer: (row) => formatCurrency(parseFloat(row.area) * parseFloat(row.pwRate.toFixed(2))),
					align: 'right',
					width: 105
				}],
				rows: buildings[i].array,
				noBrand: noBrand
			})
		]
		if (i === ln - 1 && buildings[i].currentTotal < 8) {
			const length = buildings[i].array.length
			const lastBuilding = buildings[i].array[length - 1]
			if (lastBuilding.name.length > 32) {
				itemsToAdd.push(sectionParagraph(''))
			}
			itemsToAdd.push(...paragraphs1Table)
			canAddParagraphs1TInSamePage = true
		}
		sections.push({
			horizontal: true,
			items: itemsToAdd
			
		})
	}
	if (canAddParagraphs1TInSamePage === false) {
		sections.push({
			horizontal: true,
			items: paragraphs1Table
		})
	}
	sections.push({
		items: [
			...sectionTitle('Section 179D Certification Report', noBrand),
			sectionTitleParagraph('Qualifying Final Certification'),
			sectionParagraph('The Section 179D certification for the Energy Efficient Commercial Building Property is enclosed. The certification provides statements regarding the energy efficiency savings, the methods and calculations used to meet the requirements of Sec. 179D(d).')
		]
	})
	sections.push({
		items: [
			...sectionCertificate({
				title: 'Certificate of Compliance',
				name: 'Commercial Buildings Tax Deduction',
				description: 'Section 179D, Internal Revenue Code',
				logo
			}),
			sectionTable({
				title: '01) Building Certifier Information',
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
					name: `${license ? license.state : ''} License Number`,
					value: license ? license.number : ''
				}, {
					name: 'Address',
					value: certifier.address
				}, {
					name: 'Phone',
					value: formatPhone(certifier.phone)
				}],
				noBrand: noBrand
			}),
			sectionTable({
				title: '02) Building Information',
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
					name: 'Building or Owner Name',
					value: project.privateProject ? project.legalEntity : project.name
				}, {
					name: 'Address',
					value: project.buildings.length == 1 ? project.buildings[0].address : 'Multiple (See Table 2.1)'
				}],
				summary: `Energy Efficient System installed and placed in service during: ${project.taxYear.toString()}`,
				noBrand: noBrand
			})
		]
	})
	if (project.buildings.length > 1) {
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
						paddingLeft: 8,
						paddingRight: 8,
						backgroundColor: theme.quaternary
					},
					columns: [{
						type: 'string',
						header: 'Name',
						dataIndex: 'name',
						flex: true
					}, {
						type: 'string',
						header: 'Address',
						dataIndex: 'address',
						flex: true
					}],
					rows: project.buildings,
					noBrand: noBrand
				}, true)
			]
		})
	}
	const statements = []
	statements.push(
		sectionParagraph(`The interior lighting systems, heating, cooling, ventilation, hot water systems, and building envelope that have been, or are planned to be, incorporated into the building will reduce the total annual energy and power costs with respect to combined usage of the building’s heating, cooling, ventilation, hot water, and interior lighting systems by a minimum of 25% compared to a Reference Building that meets the minimum requirements of Standard 90.1-${year}.`)
	)
	sections.push({
		items: [
			sectionTitleParagraph('03) Qualified Deductions'),
			sectionParagraph('Statement for qualifying energy efficient commercial building property:'),
			...statements,
			sectionTitleParagraph('04) Energy Reduction Certification'),
			sectionParagraph(`The new energy efficient ${qualifyingProperty} systems were completed in ${buildingTypesSubject}. The total annual energy and power costs of this building have been reduced by at least 25% due to the installation of Energy Efficient ${qualifyingProperty} systems. This reduction has been determined using a Performance Rating Method. The total area of the building that received new energy efficient systems is ${formatNumber(totalBuildingArea)}.`)
		]
	})

	buildings = divideBuildings(project.buildings, 1)
	let canAddParagraphs2TInSamePage = false
	const paragraph2Table = [sectionParagraph(`*Note: The deduction amount is determined as the lesser of two options: (1) the capitalized cost incurred for energy-efficient property or (2) the per-square-foot allowance. Projects that meet the requirements of Section 2.02(2)(i) or (ii) (IRS BOC Exception: Physical Work Test or Five Percent Safe Harbor) of Notice 2022-61 before January 29, 2023, are exempt from the prevailing wage and apprenticeship requirements and can qualify for the deduction ranging from $${deductionFrom} to $${deductionTo} per square foot. For any property placed-in-service on or after January 1, 2023, and which does not meet the exception above, in order to qualify for the increased deduction level under 179D(b)(3), taxpayers must adhere to specific prevailing wage and apprenticeship requirements as outlined in Notice 2022-61.`)]
	
	for (let i = 0, ln = buildings.length; i < ln; i++) {
		let itemsToAdd = []
		if (i === 0) {
			itemsToAdd.push(
				sectionParagraph('The outcome of the attached calculations and information result in the following tax deduction:')
			)
		}
		itemsToAdd.push(
			sectionTable({
				columns: [{
					type: 'string',
					header: 'Name',
					dataIndex: 'name',
					width: 120
				}, {
					type: 'string',
					header: 'Qualifying Area',
					renderer: (row) => `${formatNumber(row.area)} SF`,
					align: 'right',
					width: 98
				}, {
					type: 'string',
					header: 'Savings %',
					renderer: (row) => `${formatNumber(row.percentSaving)} %`,
					align: 'right',
					width: 70
				}, {
					type: 'string',
					header: 'Deduction/SF',
					renderer: (row) => formatCurrency(row.rate),
					align: 'right',
					width: 84
				}, {
					type: 'string',
					header: 'Deduction',
					renderer: (row) => formatCurrency(parseFloat(row.area) * parseFloat(row.rate.toFixed(2))),
					align: 'right',
					width: 81
				}, {
					type: 'string',
					header: 'PW&A Deduction/SF',
					renderer: (row) => formatCurrency(row.pwRate),
					align: 'right',
					width: 120
				}, {
					type: 'string',
					header: 'PW&A Deduction',
					renderer: (row) => formatCurrency(parseFloat(row.area) * parseFloat(row.pwRate.toFixed(2))),
					align: 'right',
					width: 105
				}],
				rows: buildings[i].array,
				summary: i === ln - 1 ? `Total 179D Deduction: ${formatCurrency(totalDeduction)} \n Total 179D(b)(3) Deduction (with PW&A): ${formatCurrency(pwTotalDeduction)}` : '',
				noBrand: noBrand
			})
		)
		if (i === ln - 1 && buildings[i].currentTotal < 8) {
			itemsToAdd.push(...paragraph2Table)
			canAddParagraphs2TInSamePage = true
		}
		sections.push({
			horizontal: true,
			items: itemsToAdd
		})
	}

	if (canAddParagraphs2TInSamePage === false) {
		sections.push({
			horizontal: true,
			items: paragraph2Table
		})
	}

	sections.push({
		items: [
			sectionTitleParagraph('05) Field Inspection Statement'),
			sectionParagraph(`A qualified individual has field inspected the property after the ${qualifyingProperty} systems had been placed into service and certifies that the specified energy efficient systems have been installed and meet the energy-saving targets contained in the design plans and specifications. This inspection was performed in using methods of the National Renewable Energy Laboratory (NREL) Energy Saving Modeling and Inspection Guidelines for Commercial Building Federal Tax Deductions.`),
			sectionTitleParagraph('06) Energy Efficiency Statement'),
			sectionParagraph('The building owner has received an explanation of the energy efficiency features of the building and its projected annual energy costs.'),
			sectionTitleParagraph('07) Certified Software'),
			sectionParagraph(`Qualified computer software was used to calculate energy and power consumption and costs to certify that the required energy cost reductions were obtained. The DOE-approved software used to calculate energy and power consumption and costs is ${project.software}.`),
			sectionTitleParagraph('08) Components List'),
			sectionParagraph(`Attached to this document is a list identifying the components of the ${qualifyingProperty} systems installed on or in the building, the energy efficiency features of the building, and its projected annual energy costs.`)
		]
	})

	sections.push({
		items: [
			sectionTitleParagraph('09) Declaration of Qualifications'),
			sectionParagraph('The undersigned certifies that the energy saving components herein have been placed into service, the proposed systems meet the energy saving targets within, and has been inspected by a certified licensed contractor or professional engineer in the jurisdiction of the Building Locations.'),
			sectionParagraph('Under penalties of perjury, I declare that I have examined this certification, including accompanying documents, and to the best of my knowledge and belief, the facts presented in support of this certification are true, correct, and complete.'),
			sectionSignature({
				title: 'Certifier Signature',
				printedName: certifier.name,
				signature,
				licenseNumber: license ? license.number : '',
				date: formatDate(new Date()),
				state: license ? license.state : ''
			})
		]
	})
	let charCode = 97
	sections.push({
		items: [
			...sectionTitle('Section 179D Energy Study Report', noBrand)
		]
			.concat(
				(photos.length > 0) ? 
					[
						sectionSubtitle(`${String.fromCharCode(charCode)}. Site Inspection Photographs`),
						sectionParagraph('Site inspections were performed using methods and standards of the NREL Inspection Guidelines to verify the installation of energy efficient property per design documents. The following are arbitrary photos depicting typical components used within the energy efficient improvements.')
					] : []
			)
	})
	if ((photos.length > 0)) {
		sections.push({
			items: [
				sectionTitleParagraph('Site Inspection'),
				sectionParagraph(`On ${project.inspectionDate} a site visit to ${buildingTypesSubject} was performed to verify the installation of energy efficient technology.`),
				sectionGallery(photos)
			]
		})

		charCode++
	}
	if (pdfFiles.baselineDesign179D) {
		sections.push({
			items: [
				sectionParagraph(`Calculations were performed utilizing the Performance Rating Method, a procedure designed to compute the percentage reduction in the total annual energy and power costs with respect to combined usage of a building’s heating, cooling, ventilation, hot water, and interior lighting systems as compared to a Reference Building that meets the minimum requirements of Standard 90.1-${year}.`),
				sectionSubtitle(`${String.fromCharCode(charCode)}. Energy Reduction Calculations - BASELINE DESIGN`)
			]
		})
		sections.push({
			embeded: true,
			items: [sectionPdf(pdfFiles.baselineDesign179D)]
		})
		charCode++
	}
	if (pdfFiles.wholeBuildingDesign179D) {
		sections.push({
			items: [
				sectionSubtitle(`${String.fromCharCode(charCode)}. Energy Reduction Calculations - WHOLE BUILDING DESIGN`)
			]
		})
		sections.push({
			embeded: true,
			items: [sectionPdf(pdfFiles.wholeBuildingDesign179D)]
		})
		charCode++
	}
	if (pdfFiles.buildingSummary179D) {
		sections.push({
			items: [
				sectionSubtitle(`${String.fromCharCode(charCode)}. Energy Reduction Calculations - BUILDING SUMMARY`)
			]
		})
		sections.push({
			embeded: true,
			items: [sectionPdf(pdfFiles.buildingSummary179D)]
		})
		charCode++
	}
	if (pdfFiles.softwareCertificate179D) {
		sections.push({
			items: [
				sectionSubtitle(`${String.fromCharCode(charCode)}. Qualified Software Certificate`),
				sectionParagraph(`The Performance Rating Method calculations certifying that the qualifying property has met the annual energy and power costs reductions must be performed by a Department of Energy approved software. The following certificate is for ${project.software} a DOE Qualified Software.`)
			]
		})
		sections.push({
			embeded: true,
			items: [sectionPdf(pdfFiles.softwareCertificate179D)]
		})
	}

	pdf.setSections(sections)

	await pdf.build()

	return pdf
}