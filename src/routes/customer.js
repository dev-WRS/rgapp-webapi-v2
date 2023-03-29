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

const asCustomerResponse = ({ _id, name, address, phone, primaryColor, logo, theme, createdBy }) => ({ id: _id, name, address, phone, primaryColor, logo, theme, createdBy })

export default ({ passport, config, services, assetStorage, multerUpload, router }) => {
	const { Customer, Asset, AuditLog } = services
	const withAuditLogger = auditEventLogger(AuditLog)
	const category = 'customer'

	router.get('/customers',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const query = req.query
				const customers = await Customer.getCustomers(query)

				res.json({ result: customers.map(asCustomerResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.get('/customers/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const customer = await Customer.getCustomerById(id)

				res.json({ result: asCustomerResponse(customer) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/customers',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ 
			category,
			asResult: ({ result }) => ({ id: result ? result.id : null })
		}),
		multerUpload.single('logo'),
		validatorRequest([
			check('name')
				.not().isEmpty()
				.withMessage('name is required'),
			check('primaryColor')
				.not().isEmpty()
				.withMessage('primaryColor is required'),
			checkFile('logo', 'logo is not valid')
		]),
		async (req, res, next) => {
			try {
				const { id } = req.user
				const { name, address, phone, primaryColor } = req.body
				let logo = asAsset(req.file)

				if (logo) {
					const asset = await Asset.createAsset({ ...logo, origin: 'customer', createdBy: id })
					logo = asset.id
				}
				const customer = await Customer.createCustomer({ name, address, phone, primaryColor, logo, createdBy: id })

				res.json({ result: asCustomerResponse(customer) })

			} catch (error) {
				next(error)
			}
		}
	)

	router.put('/customers/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category }),
		multerUpload.single('logo'),
		validatorRequest([
			check('name')
				.not().isEmpty()
				.withMessage('name is required'),
			check('primaryColor')
				.not().isEmpty()
				.withMessage('primaryColor is required'),
			checkFile('logo', 'logo is not valid')
		]),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				const data = req.body
				let logo = asAsset(req.file)

				if (logo) {
					const customer = await Customer.getCustomerById(id)
					const prevAsset = await Asset.getAssetById(customer.logo)

					if (prevAsset) {
						const { bucket, key, id: assetId } = prevAsset

						await assetStorage.deleteObject({ bucket, key })
						await Asset.deleteAsset({ id: assetId })
					}

					const nextAsset = await Asset.createAsset({ ...logo, origin: 'customer', createdBy: userId })
					logo = nextAsset.id
				}
				else {
					logo = data.logo
				}
				
				const customer = await Customer.updateCustomer({ id }, { ...data, logo })

				res.json({ result: asCustomerResponse(customer) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.delete('/customers/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category }),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const customer = await Customer.getCustomerById(id)
				let result = null

				if (customer) {
					const asset = await Asset.getAssetById(customer.logo)

					if (asset) {
						const { bucket, key } = asset
						await assetStorage.deleteObject({ bucket, key })
					}
					await Customer.deleteCustomer({ id })

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