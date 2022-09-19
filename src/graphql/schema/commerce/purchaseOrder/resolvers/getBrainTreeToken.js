const path = require('path');
const braintree = require(path.resolve('src/bundles/payment/providers/Braintree'));

module.exports = async (_, __, { dataSources: { repository }, user }) => {
  return repository.paymentStripeCustomer.getByProvider(braintree.getName(), user.id)
    .then((customer) => braintree.generateToken(customer ? customer.customerId : null))
    .then(({ clientToken }) => clientToken)
}
