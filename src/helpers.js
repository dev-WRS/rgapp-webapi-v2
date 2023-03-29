import { v4 } from 'uuid'

export const tplNewUser = (data = {}) => {
	const { name, code, url } = data
	return `
		Hi ${name}!
		<br/><br/>
		We've given you access to RGAPP.
		<br/>
		Please click on the following link and enter this security code to complete your registration.
		<br/><br/>
		<b>${code}</b>
		<br/><br/>
		<a href=${url}>Complete Registration</a>
		<br/><br/>
		Regards !
	`
}

export const generateS3Key = (ext) => `${v4()}${ext}`