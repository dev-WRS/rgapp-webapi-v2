import PDFBuilder from '../pdf-builder/index.js'
import helpers, { 
	defaultFont, fonts, 
	contentMarginTop, contentMarginRight, contentMarginBottom, contentMarginLeft, removeEndingDots,
	formatDate, formatNumber, formatCurrency, formatPhone, asCommaSeparatedString, asBuildingsSubject,
	asVerbString, asSiteVisitString, QUALYFYING_CATEGORIES, WHOLE_BUILDING, LIGHTING, ENVELOPE, HVAC
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
	} = helpers({ theme })

	const pdf = new PDFBuilder({ 
		size: 'LETTER',
		defaultFont, fonts,
		margins: { top: contentMarginTop, right: contentMarginRight, bottom: contentMarginBottom, left: contentMarginLeft },
		draftCover: {
			items: [
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
				sectionParagraph(project.taxYear, {
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
			]
		},
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
				repoHeader(project.legalEntity, {
					width: 200
				}),
				repoHeader(`${project.name}, ${project.state}`, {
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

	const year = project.taxYear > 2015 ? '2007' : '2001'
	const totalBuildingArea = project.buildings.reduce((result, building) => result + parseFloat(building.area), 0)
	const totalDeduction = project.buildings.reduce((result, building) => result + (parseFloat(building.area) * parseFloat(building.rate)), 0)
	const qualifyingPercentages = {}
	const qualifyingPercentagesRows = []
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
					qualifyingPercentagesRows.push({
						name: name,
						value: `${building.savingsRequirement[name]} %`
					})
				}
			})
		}

		if (buildingTypes.indexOf(building.type) === -1) {
			buildingTypes.push(building.type)
		}
	}

	const qualifyingProperty = qualifyingWholeBuilding ? asCommaSeparatedString(QUALYFYING_CATEGORIES) : asCommaSeparatedString(qualifyingCategories)
	const verbQualifyingProperty = qualifyingWholeBuilding ? 'were' : qualifyingCategories.length > 1 ? 'were' : 'was'
	const buildingTypesSubject = asBuildingsSubject(buildingTypes, project.buildings.length)
	const siteVisitString = asSiteVisitString(buildingTypes)
	const verbString = asVerbString(buildingTypes)

	let license

	if (certifier.licenses && certifier.licenses.length > 0) {
		license = certifier.licenses.find(license => license.state === project.state) || certifier.licenses[0]
	}

	sections.push({
		items: [
			...sectionTitle('Scope of Study'),
			sectionParagraph('The purpose of this study is to determine whether the subject building contains energy efficient commercial property which qualifies for a tax deduction under Section 179D of the Internal Revenue Code and to provide documentation of said qualification as required under Section l79D, Notice 2006-52 and Notice 2008-40.'),
			sectionParagraph('The scope of our study included, but was not limited to the following:'),
			sectionList([
				`Analysis of construction documents to determine whether energy efficient measures have been incorporated into the design of the building's ${qualifyingProperty} systems.`,
				'Certification by a locally licensed professional engineer or contractor that the energy efficient equipment and components identified in the buildings designs were installed.',
				'Calculations of deductions available based on the energy reduction costs of the subject building and the reference building.',
				`Use of an energy model to calculate the energy consumption cost of the building and an energy model to calculate the energy consumption cost of the American Society of Heating, Refrigeration and Air Conditioning Engineers (ASHRAE) Standard 90.1-${year} reference building. The energy model used for the energy consumption analysis is authorized by the Department of Energy pursuant to Section 179D(d)(3) and Notice 2008-40 4.01.values.`
			])
		]
	})
	// sections.push({
	// 	items: [
	// 		...sectionTitle('Statement of Law'),
	// 		sectionTitleParagraph('Background'),
	// 		sectionParagraph('Section 1331 of the Energy Policy Act of 2005 enacted Section 179D of the Internal Revenue Code, which provides a deduction with respect to energy efficient commercial buildings placed in service between January 1, 2006 and December 31, 2007. Section 204 of the Tax Relief and Health Care Act of 2006 extended the Section 179D deduction through December 31, 2008. Section 303 of the Emergency Economic Stabilization Act of 2008 extended the Section 179D deduction through December 31, 2013 and H.R. 5771 The Tax Increase Prevention Act of 2014 extended the Section 179D deduction through December 31, 2014. The Consolidated Appropriations Act, 2016 extends Section 179D through December 31, 2016.  The Bipartisan Budget Act of 2018 extended Section 179D through December 31, 2017, most recently the H.R. 1865 the Further Consolidated Appropriations Act, 2020 extended Section 179D retroactively from January 1st, 2018 through December 31st, 2020.')
	// 	]
	// })
	sections.push({
		items: [
			...sectionTitle('Statement of Law'),
			sectionTitleParagraph('Applicable Law'),
			sectionParagraph('Section 179D provides a deduction for an amount equal to the cost of energy efficient commercial building property placed in service during the taxable year. Unless otherwise indicated, section references are to the Internal Revenue Code of 1986, as amended and the regulations there under. In order to qualify for this deduction, the energy efficient commercial building property must receive proper "certification" by "qualified individuals" using "qualified computer software" as meeting various energy efficiency standards. These terms are further defined in Section 179D and Notice 2006-52. This report has been prepared in accordance with these standards.'),
			sectionParagraph('Section 179D(b) provides that the maximum deduction with respect to any building for any taxable year shall not exceed the excess (if any) of $1.80 multiplied by the "building square footage" over the aggregate amount of deductions claimed in prior years for energy efficient commercial building property for the same property. Under Section 179D(b), the maximum deduction allowed under Section 179D for a qualifying commercial building is up to $1.80/sf for an entire building. This is for the lifetime of the building and includes the aggregate amount of all Section 179D deductions allowed with respect to the building for all prior taxable years. The deduction cannot exceed the excess (if any) of $1.80 multiplied by the "building square footage" over the aggregate number of deductions claimed in prior years. However, for properties placed in service after Dec. 31, 2020, there is a cost-of-living adjustment that is determined in accordance with IRC Section 1(f)(3) (See IRC 179D(d)(1)(A) and (g)) and as published by the Internal Revenue Service (IRS) in the Revenue Procedure 2021-45. Such adjustment shall allow for a partial allowance of $0.62 per square foot and a maximum allowance of $1.82 per square foot for tax years beginning in 2021, and $0.63 per square foot and $1.88 per square foot, respectively, for tax years beginning in 2022.'),
			sectionParagraph('Section 179D(c)(1) defines the term "energy efficient commercial building property" to be property with respect to which depreciation is allowable, which is:'),
			sectionList([
				'Installed on or in any building located in the United States and within the scope of Standard 90.1-2007.',
				'Installed as part of the interior lighting systems, the heating, cooling, ventilation, and hot water systems or the building envelope, and ',
				'Certified in accordance with the tax law as part of a plan designed to reduce the total annual energy and power costs of the building by 50 percent or more in comparison to a reference building meeting the minimum requirements of ASHRAE Standard 90.1.'
			]),
			sectionParagraph('Section 179D(d)(l) provides for a partial allowance for any system (interior lighting systems, heating, cooling, ventilation, and hot water systems or the building envelope) that meets the established target energy reduction standard for such system. The deduction shall not exceed the excess (if any) of $0.60 multiplied by the "building square footage" over the aggregate amount of deductions claimed in prior years. (adjusted for inflation for EECBP placed in service after December 31, 2020). See IRC 179D(d)(1)(A) and (g).'),
			sectionParagraph('Section 179D(d)(4) provides that for energy efficient commercial building property installed on or in property owned by a Federal, State, or local government or a political subdivision thereof, the deduction can be allocated to the person primarily responsible for designing the property in lieu of the owner of such property.'),
			sectionParagraph('Section 179D(e) provides that if a deduction is allowed under this section with respect to any energy efficient commercial building property, the basis of such property shall be reduced by the amount of the deduction allowed.')
		]
	})	
	sections.push({
		items: [
			sectionParagraph('Notice 2006-52 section 2.03(1)(a) provides guidance for partially qualifying property of lighting systems, otherwise known as the "Permanent Rule". To qualify, the system must reduce the total annual energy and power costs with respect to the combined usage of the building\'s heating, cooling, ventilation, hot water, and interior lighting systems by 16 2/3 percent or more as compared to Standard 90.1-2001. Notice 2008-40 updated the standard to 20 percent for property placed in service after December 31, 2008. Notice 2012-26 updated the standard to 25 percent for property placed in service after March 12, 2012.'),
			sectionParagraph('Notice 2006-52 section 2.03(1)(b) provides alternative guidance for partially qualifying property of lighting systems, otherwise known as the "Interim Rule". Taxpayers may use this alternative procedure until the Internal Revenue Service issues final regulations related to lighting systems. To qualify, the system must:'),
			sectionList([
				'Achieve a reduction in lighting power of at least 25 percent (50 percent in the case of a warehouse) of the minimum requirements in Table 9.3.1.1 or Table 9.3.1.2 (not including additional interior lighting power allowances) of Standard 90.1-2001',
				'Include provision for bi-level switching in all occupancies (with some exceptions), and',
				'Meet the minimum requirements for calculated lighting levels as set forth in the IESNA Lighting Handbook, Performance and Application, Ninth Edition, 2000.'
			]),
			sectionParagraph('Notice 2006-52 section 2.04 provides guidance for partially qualifying property of heating, cooling, ventilation and hot water systems. To qualify, the system must reduce the total annual energy and power costs with respect to the combined usage of the building\'s heating, cooling, ventilation, hot water, and interior lighting systems by 16 2/3 percent or more as compared to Standard 90.1-2001. Notice 2008-40 updated the standard to 20 percent for property placed in service after December 31 , 2008. Notice 2012-26 updated the standard to 15 percent for property placed in service after March 12, 2012.')
		]
	})
	sections.push({
		items: [
			sectionParagraph('Notice 2006-52 section 2.05 provides guidance for partially qualifying property of the building envelope. To qualify, the building envelope must reduce the total annual energy and power costs with respect to the combined usage of the building\'s heating, cooling, ventilation, hot water, and interior lighting systems by 16 2/3 percent or more as compared to Standard 90.1-2001. Notice 2008-40 updated the standard to 10 percent for property placed in service after December 31, 2008.'), 
			sectionParagraph('Notice 2006-52 section 5.01 defines "building square footage" as the sum of the floor areas of the conditioned spaces within the building, including basements, mezzanine, and intermediate-floored tiers and penthouses with headroom height of 7.5 feet or greater. Building square footage is measured from the exterior faces of exterior walls or from the centerline of walls separating buildings, but excludes covered walkways, open roofed over areas, porches and similar spaces, pipe trenches, exterior terraces or steps, chimneys, roof overhangs and similar features.'),
			sectionParagraph('Notice 2008-40 section 3.04 provides that an allocation of the Section 179D deduction to the designer of a government-owned building must be in writing and contain various statements related to the energy efficient commercial building property along with signatures of the authorized representatives of both the owner of the government-owned building and the designer or the designer\'s authorized representative. Section 3.07 provides that the owner of the public building must reduce the basis of the energy efficient commercial building property by the amount of the Section 179D deduction allocated.'),
			sectionParagraph('Notice 2008-40 section 7.01 allows a taxpayer to elect to qualify the building envelope as energy efficient commercial building property by substituting 10 percent efficiency instead of the 16 2/3 percent directed in Notice 2006-52 section 2.05 for property placed in service before December 31, 2008. If this election is made, the lighting and heating, cooling, ventilation and hot water systems must each exceed Standard 90.1-2001 by 20 percent instead of 16 2/3 percent as directed in Notice 2006-52 sections 2.03 and 2.04. For property placed in service after December 31, 2008, taxpayers must meet the updated energy standards of 10/20/20 percent.')
		]
	})
	sections.push({
		items: [
			sectionParagraph('H.R. 5771 The Tax Increase Prevention Act of 2014 was enacted into Law (P.L. 113-295) on December 19, 2014 extending the §179D Tax Deduction for an additional Year. The Law Amended Code Sec. 179D(h) by striking "December 31, 2013" and inserting "December 31, 2014". Effective for property placed in service after 12-31-2013. No additional changes were made to qualifying percentages or referenced standards. H.R. 2029 The Consolidated Appropriations Act, 2016 Became Public Law No: 114-113 on December 18, 2015. The law extends Section 179D through the end of 2016 without lapse. The law did modify the energy standard requirements for property placed into service in 2016 to ASHRAE 90.1-2007.')
		]
	})
	sections.push({
		items: [
			...sectionTitle('Calculation of Section 179D Deduction'),
			sectionTitleParagraph('Summary of Deduction Calculation'),
			sectionParagraph(`Based on the energy model calculations, the ${qualifyingProperty} systems will qualify as Energy Efficient Commercial Building Property. Therefore, the property will qualify for a deduction limited to the cost of the qualifying systems. This calculation is based upon a total combined square footage of ${formatNumber(totalBuildingArea)}.`),
			sectionTable({
				columns: [{
					type: 'string',
					header: 'Name',
					dataIndex: 'name',
					flex: true
				}, {
					type: 'string',
					header: 'Square Footage',
					renderer: (row) => formatNumber(row.area),
					align: 'right',
					width: 110
				}, {
					type: 'string',
					header: 'Benefit Rate',
					renderer: (row) => formatCurrency(row.rate),
					align: 'right',
					width: 110
				}, {
					type: 'string',
					header: '179D Deduction',
					renderer: (row) => formatCurrency(parseFloat(row.area) * parseFloat(row.rate)),
					align: 'right',
					width: 110
				}],
				rows: project.buildings
			}),
			sectionParagraph('Based on the square footage calculation, limited to the cost of the qualifying systems, the total deduction for the buildings will be:'),
			sectionParagraph(formatCurrency(totalDeduction), { 
				fullWidth: true,
				align: 'center',
				weight: 'bold' 
			})
		]
	})
	sections.push({
		items: [
			...sectionTitle('Section 179D Certification Report'),
			sectionTitleParagraph('Qualifying Certification Satisfying Notice 2006-52'),
			sectionParagraph('The Section 179D certification for the Energy Efficient Commercial Building Property is enclosed. The certification satisfies statements for Notice 2006-52 §4.01- 4.09 of Internal Revenue Bulletin 2006-26.')
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
				}]
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
					value: project.private ? project.legalEntity : project.name
				}, {
					name: 'Address',
					value: project.buildings.length == 1 ? project.buildings[0].address : 'Multiple (See Table 2.1)'
				}],
				summary: `Energy Efficient System installed and placed in service during: ${project.taxYear}`
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
					rows: project.buildings
				}, true)
			]
		})
	}
	const statements = []
	if (qualifyingWholeBuilding) {
		statements.push(
			sectionParagraph(`The interior lighting systems, heating, cooling, ventilation, hot water systems, and building envelope that have been, or are planned to be, incorporated into the building will reduce the total annual energy and power costs with respect to combined usage of the building’s heating, cooling, ventilation, hot water, and interior lighting systems by 50 percent or more as compared to a Reference Building that meets the minimum requirements of Standard 90.1-${year}.`)
		)
	}
	else {
		if (qualifyingCategories.indexOf(LIGHTING) !== -1) {
			statements.push(
				sectionParagraph(`The interior lighting systems that have been, or are planned to be incorporated into the building will reduce the total annual energy and power costs with respect to combined usage of the building’s heating, cooling, hot water ventilation, and interior lighting systems by ${qualifyingPercentages[LIGHTING]}% or more as compared to a Reference Building that meets the minimum requirements of Standard 90.1-${year}.`)
			)
		}
		if (qualifyingCategories.indexOf(HVAC) !== -1) {
			statements.push(
				sectionParagraph(`The heating, cooling, ventilation, and hot water systems that have been, or are planned to be incorporated into the building will reduce the total annual energy and power costs with respect to combined usage of the building cooling, ventilation, hot water, and interior lighting systems by ${qualifyingPercentages[HVAC]}% or more as compared to a Reference Building that meets the minimum requirements of Standard 90.1-${year}.`)
			)
		}
		if ((qualifyingCategories.indexOf(ENVELOPE) !== -1)) {
			statements.push(
				sectionParagraph(`The Building Envelope Systems that have been, or are planned to be incorporated into the building will reduce the total annual energy and power costs with respect to combined usage of the building cooling, ventilation, hot water, and interior lighting systems by ${qualifyingPercentages[ENVELOPE]}% or more as compared to a Reference Building that meets the minimum requirements of Standard 90.1-${year}.`)
			)
		}
	}
	sections.push({
		items: [
			sectionTitleParagraph('03) Qualified Deductions'),
			sectionParagraph('Statement for qualifying energy efficient commercial building property:'),
			...statements,
			sectionTitleParagraph('04) Energy Reduction Certification'),
			sectionParagraph(`The new energy efficient ${qualifyingProperty} systems ${verbQualifyingProperty} completed in ${buildingTypesSubject}. The total annual energy and power costs of this building have been reduced by more than the respective amounts (See Table 4.1) due to the installation of Energy Efficient ${qualifyingProperty} systems. This reduction has been determined under the Performance Rating Method of Notice 2006-52. The total area of the building that received new energy efficient systems is ${formatNumber(totalBuildingArea)}.`),
			sectionTable({
				title: '4.1) Qualifying Percentages',
				columnsHeader: false,
				columns: [{
					type: 'string',
					dataIndex: 'name',
					weight: 'bold',
					width: 140
				}, {
					type: 'string',
					dataIndex: 'value',
					width: 140
				}],
				rows: qualifyingPercentagesRows
			}),
			sectionParagraph('The outcome of the attached calculations and information result in the following tax deduction:'),
			(project.buildings.length > 1) ?
				sectionTable({
					columns: [{
						type: 'string',
						header: 'Name',
						dataIndex: 'name',
						flex: true
					}, {
						type: 'string',
						header: 'Tax Sq.Ft. (SF)',
						renderer: (row) => formatNumber(row.area),
						align: 'right',
						width: 108
					}, {
						type: 'string',
						header: 'Tax Deduction/SF',
						renderer: (row) => formatCurrency(row.rate),
						align: 'right',
						width: 120
					}, {
						type: 'string',
						header: '179D Deduction',
						renderer: (row) => formatCurrency(parseFloat(row.area) * parseFloat(row.rate)),
						align: 'right',
						width: 108
					}],
					rows: project.buildings,
					summary: `Total Section 179D Deduction: ${formatCurrency(totalDeduction)}`
				}) :
				sectionTable({
					columnsHeader: false,
					lineColor: null,
					columnDefaults: {
						backgroundColor: null
					},
					columns: [{
						type: 'string',
						dataIndex: 'name',
						weight: 'bold',
						align: 'right',
						flex: true
					}, {
						type: 'string',
						dataIndex: 'value',
						align: 'right',
						width: 140
					}],
					rows: [{
						name: 'Total Tax Deduction per square foot:',
						value: formatCurrency(project.buildings[0].rate)
					}, {
						name: 'Total square footage of building:',
						value: formatNumber(project.buildings[0].area)
					}, {
						name: 'Section 179D Deduction:',
						value: formatCurrency(parseFloat(project.buildings[0].area) * parseFloat(project.buildings[0].rate))
					}]
				}),
			sectionParagraph('Note: The amount of the deduction is equal to the lesser of: (1) the capitalized cost incurred with respect to the energy efficient property and (2) per-square foot allowance.'),
			sectionTitleParagraph('05) Field Inspection Statement'),
			sectionParagraph(`A qualified individual has field inspected the property after the ${qualifyingProperty} systems had been placed into service and certifies that the specified energy efficient systems have been installed and meet the energy-saving targets contained in the design plans and specifications. This inspection was performed in accordance with applicable sections of the National Renewable Energy Laboratory (NREL) as Energy Saving Modeling and Inspection Guidelines for Commercial Building Federal Tax Deductions that were in effect at the time of certification.`),
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
			...sectionTitle('Section 179D Energy Study Report')
		]
			.concat(
				(photos.length > 0) ? 
					[
						sectionSubtitle(`${String.fromCharCode(charCode)}. Site Inspection Photographs`),
						sectionParagraph('Site inspections were performed as prescribed by Notice 2006-52 and the NREL Inspection Guidelines to verify the installation of energy efficient property per design documents. The following are arbitrary photos depicting typical components used within the energy efficient improvements.')
					] : []
			)
	})
	if ((photos.length > 0)) {
		sections.push({
			items: [
				sectionTitleParagraph('Site Inspection'),
				sectionParagraph(`On ${project.inspectionDate}, ${siteVisitString} to ${buildingTypesSubject} ${verbString} performed to verify the installation of energy efficient technology.`),
				sectionGallery(photos)
			]
		})

		charCode++
	}
	if (pdfFiles.baselineDesign179D) {
		sections.push({
			items: [
				sectionParagraph(`Calculations were performed in compliance with the requirements of the Performance Rating Method of section 3.02 of Notice 2006-52. The Performance Rating Method is used to compute the percentage reduction in the total annual energy and power costs with respect to combined usage of a building’s heating, cooling, ventilation, hot water, and interior lighting systems as compared to a Reference Building that meets the minimum requirements of Standard 90.1-${year}.`),
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
				sectionParagraph(`The Performance Rating Method calculations certifying that the qualifying property has met the annual energy and power costs reductions must be performed by a Department of Energy approved software. The following certificate is for ${project.software} a DOE Qualified Software in accordance with Notice 2006-52 Section 6.`)
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