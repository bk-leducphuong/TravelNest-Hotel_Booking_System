const dns = require('dns').promises; // Use the promises version of dns

const axios = require('axios');
// Check the format of the email using regex
function isValidEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate the domain of the email
async function validateEmailDomain(email) {
  try {
    const domain = email.split('@')[1];
    const addresses = await dns.resolveMx(domain);
    return addresses && addresses.length > 0;
  } catch (error) {
    console.error(`DNS lookup failed for domain: ${email.split('@')[1]}`, error);
    return false;
  }
}

// Validate the email using an external API and domain check
async function validateEmail(email) {
  try {
    const response = await axios.get('https://emailvalidation.abstractapi.com/v1/', {
      params: {
        api_key: process.env.EMAIL_VALIDATION_API_KEY,
        email: email,
      },
    });

    if (
      response.data.deliverability === 'DELIVERABLE' &&
      parseFloat(response.data.quality_score) > 0.5
    ) {
      return true;
    } else {
      console.log('Email is not deliverable or has a low quality score');
      return false;
    }
  } catch (error) {
    console.error('Error validating email with external API', error);
    return false;
  }
}

module.exports = { isValidEmailFormat, validateEmail, validateEmailDomain };
