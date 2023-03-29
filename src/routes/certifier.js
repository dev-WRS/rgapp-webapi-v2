import { middlewares, validator } from 'lts-server'
import _ from 'lodash'

import { auditEventLogger } from '../event-logger.js'

const { withScope, withPassport } = middlewares
const { validatorRequest, check } = validator

const asAsset = (file) => {
	if (file) {
		const { originalname: name, mimetype: format, size, bucket, key } = file
		return { name, format, size, bucket, key }
	}
	return
}

const checkFile = (name, message) => {
	return check(name)
		.custom((value, { req }) => {
			return !_.isEmpty(value) || !!req.file
		})
		.withMessage(message)
}

const checkNotEmptyArray = (name, message) => {
	return check(name)
		.custom((value, { req }) => {
			try {
				const list = JSON.parse(value)
				return _.isArray(list) && (list.length > 0)
			}
			catch (error) {
				return false
			}
		})
		.withMessage(message)
}

const asCertifierResponse = ({ _id, name, address, phone, signature, licenses, createdBy }) => ({ 
	id: _id, name, address, phone, signature,
	licenses: licenses ? licenses.map(({ _id, state, number }) => ({ id: _id, state, number })) : [],
	createdBy
})

export default ({ passport, config, services, assetStorage, multerUpload, router }) => {
	const { Certifier, Asset, AuditLog } = services
	const withAuditLogger = auditEventLogger(AuditLog)
	const category = 'certifier'

	router.get('/certifiers',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const query = req.query
				let certifiers = []

				if (query.state) {
					certifiers = await Certifier.getCertifiersLicenseByState(query.state)
				} else {
					certifiers = await Certifier.getCertifiers(query)
				}

				res.json({ result: certifiers.map(asCertifierResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.get('/certifiers/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const certifier = await Certifier.getCertifierById(id)

				res.json({ result: asCertifierResponse(certifier) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/certifiers',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ 
			category,
			asResult: ({ result }) => ({ id: result ? result.id : null })
		}),
		multerUpload.single('signature'),
		validatorRequest([
			check('name')
				.not().isEmpty()
				.withMessage('name is required'),
			check('address')
				.not().isEmpty()
				.withMessage('address is required'),
			check('phone')
				.not().isEmpty()
				.withMessage('phone is required'),
			checkFile('signature', 'signature is not valid'),
			checkNotEmptyArray('licenses', 'licenses is not valid, should have at least one')
		]),
		async (req, res, next) => {
			try {
				const { id } = req.user
				const { name, address, phone, licenses } = req.body

				const licensesArray = (licenses && (typeof licenses === 'string' || licenses instanceof String)) ? JSON.parse(licenses) : licenses
				let signature = asAsset(req.file)

				if (signature) {
					const asset = await Asset.createAsset({ ...signature, origin: 'certifier', createdBy: id })
					signature = asset.id
				}
				const certifier = await Certifier.createCertifier({ name, address, phone, signature, licenses: licensesArray, createdBy: id })

				res.json({ result: asCertifierResponse(certifier) })

			} catch (error) {
				next(error)
			}
		}
	)

	router.put('/certifiers/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category }),
		multerUpload.single('signature'),
		validatorRequest([
			check('name')
				.not().isEmpty()
				.withMessage('name is required'),
			check('address')
				.not().isEmpty()
				.withMessage('address is required'),
			check('phone')
				.not().isEmpty()
				.withMessage('phone is required'),
			checkFile('signature', 'signature is not valid'),
			checkNotEmptyArray('licenses', 'licenses is not valid, should have at least one')
		]),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				const { licenses, ...data } = req.body

				const licensesArray = (licenses && (typeof licenses === 'string' || licenses instanceof String)) ? JSON.parse(licenses) : licenses
				let signature = asAsset(req.file)
				
				if (signature) {
					const certifier = await Certifier.getCertifierById(id)
					const prevAsset = await Asset.getAssetById(certifier.signature)

					if (prevAsset) {
						const { bucket, key, id: assetId } = prevAsset

						await assetStorage.deleteObject({ bucket, key })
						await Asset.deleteAsset({ id: assetId })
					}

					const nextAsset = await Asset.createAsset({ ...signature, origin: 'certifier', createdBy: userId })
					signature = nextAsset.id
				}
				else {
					signature = data.signature
				}

				const certifier = await Certifier.updateCertifier({ id }, { ...data, licenses: licensesArray, signature })

				res.json({ result: asCertifierResponse(certifier) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.delete('/certifiers/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category }),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const certifier = await Certifier.getCertifierById(id)
				let result = null

				if (certifier) {
					const asset = await Asset.getAssetById(certifier.signature)

					if (asset) {
						const { bucket, key } = asset
						await assetStorage.deleteObject({ bucket, key })
					}
					await Certifier.deleteCertifier({ id })

					result = { id }
				}
				
				res.json({ result })
			}
			catch (error) {
				next(error)
			}
		}
	)

	return router
}