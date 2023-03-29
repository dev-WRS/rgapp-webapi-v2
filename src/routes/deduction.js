import { middlewares } from 'lts-server'

const { withScope, withPassport } = middlewares

const asDeductionResponse = ({ _id, taxYear, method, qualifyingCategory, savingsRequirement, taxDeduction }) => ({ id: _id, taxYear, method, qualifyingCategory, savingsRequirement, taxDeduction })

export default ({ passport, config, services, router }) => {
	const { Deduction } = services

	router.get('/deductions',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const deductions = await Deduction.getDeductions()

				res.json({ result: deductions.map(asDeductionResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)
	
	return router
}