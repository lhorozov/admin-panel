const { gql, withFilter } = require('apollo-server');
const path = require('path');
const { AutoOrderStatus } = require(path.resolve('src/lib/Enums'));
const pubsub = require(path.resolve('config/pubsub'));
const axios = require('axios');

const schema = gql`
    enum AutoOrderStatus {
        ${AutoOrderStatus.toGQL()}
    }
    type AutoOrder {
        id: ID!
        productInfo: ProductInfo!
        buyer: Buyer!
        status: AutoOrderStatus!
        responseMSG: String
        created_at: Date
        updated_at: Date
    }

    type AutoOrderDetail {
        id: ID
        productInfo: Product
        buyer: Buyer
        status: AutoOrderStatus
        responseMSG: String
        created_at: Date
        updated_at: Date
    }
    
    type ProductInfo {
        id: ID!
        quantity: Int
        attrs: [Variation]
        url: String
        price: Float
        seller: ID
        category: ID
        handleID: String
    }

    type Buyer {
        firstName: String
        lastName: String
        address1: String
        address2: String
        city: String
        state: String
        country: String
        zipcode: String
        phoneNumber: String
    }

    type AutoOrderCollection {
        collection: [AutoOrder]
        pager: Pager
    }

    enum AutoOrderSortFeature {
      CREATED_AT
      UPDATED_AT
    }

    input BuyerInput {
        firstName: String!
        lastName: String!
        address1: String!
        address2: String
        city: String!
        state: String!
        country: String!
        zipcode: String!
        phoneNumber: String!
    }

    input OrderedProductInput {
        id: ID!
        quantity: Int!
        attrs: [VariationInput]
        url: String!
        price: Float!
        seller: ID
        category: ID
        handleID: String
    }

    input AutoOrderInput {
        productInfo: OrderedProductInput
        buyer: BuyerInput
        status: AutoOrderStatus
        responseMSG: String
    }

    input OrderFilterInput {
        searchQuery: String
        statuses: [AutoOrderStatus!] = [FAILED]
        minPrice: Float = 0
        maxPrice: Float = 0
        seller: ID
        categories: [ID]
    }

    input AutoOrderSortInput {
        feature: AutoOrderSortFeature! = UPDATED_AT
        type: SortTypeEnum! = DESC
    }

    extend type Query {
        """Allows: authorized user as Admin"""
        autoOrders(
            filter: OrderFilterInput = {},
            sort: AutoOrderSortInput = {},
            page: PageInput = {}
        ): AutoOrderCollection @auth(requires: USER)
        autoOrder(id: ID!): AutoOrderDetail @auth(requires: USER)
    }

    extend type Mutation {
        addOrderInfo(data: AutoOrderInput!): AutoOrder! @auth(requires: USER)

        """Allows: authorized user as Admin"""
        removeAutoOrderInfo(id: ID!): Boolean! @auth(requires: USER)
        """Allows: authorized user as Admin"""
        requestAutoOrderAgain(id: ID!): Boolean! @auth(requires: USER)
        """Allows: authorized user as Admin"""
        updateAutoOrderInfo(id: ID!, data: AutoOrderInput): Boolean! @auth(requires: USER)
    }
`;


module.exports.typeDefs = [schema];

module.exports.resolvers = {
    Query: {
        autoOrders: async (_, { filter, page, sort }, { dataSources: { repository }, user }) => {
            if (user.role && user.role.indexOf("ADMIN")) { // if user permission is Admin
                const pager = {
                    limit: page.limit,
                    skip: page.skip,
                    total: 0,
                };
                return Promise.all([
                    repository.autoOrder.get({ filter, page, sort }),
                    repository.autoOrder.getTotal(filter),
                ])
                .then(async ([collection, total]) => ({
                    collection,
                    pager: { ...pager, total },
                }))
                .catch(error => console.log("error => ", error));
            }
            return [];
        },
        autoOrder: async (_, { id }, { dataSources: { repository }, user }) => {
            if (user) {
                return repository.autoOrder.getById(id);
            }
        }
    },
    Mutation: {
        addOrderInfo: async (_, { data }, { dataSources: { repository } }) => {
            return repository.autoOrder.create(data);
        },
        removeAutoOrderInfo: async (_, { id }, { dataSources: { repository }, user }) => {
            if (user.role && user.role.indexOf("ADMIN")) { // if user permission is Admin
                const response = await repository.autoOrder.deleteOrder(id);
                return response.deletedCount != 0
            }
        }, 
        requestAutoOrderAgain: async (_, { id }, { dataSources: { repository }, user }) => {
            if (user.role && user.role.indexOf("ADMIN")) {
                const orderInfo = await repository.autoOrder.getById(id);
                const paymentInfo = await repository.cardDetails.getAdminCardInfo();
                paymentInfo.expireDate = paymentInfo.exp_month + "/" + (paymentInfo.exp_year - 2000);
                console.log("payment info => ", paymentInfo.exp_month + "/" + (paymentInfo.exp_year - 2000));
                await repository.autoOrder.updateStatus(id, AutoOrderStatus.PROCESSING, 'Processing.');
                try {
                    axios.post(
                        "8.9.15.226:3001/auto-order",
                        {
                            "product": {
                                "url": orderInfo.productInfo.url,
                                "attrs": orderInfo.productInfo.attrs,
                                "quantity": orderInfo.productInfo.quantity,
                            },
                            "order_info": orderInfo.buyer,
                            "payment": {
                                "cardNumber": paymentInfo.number,
                                "expireDate": (paymentInfo.exp_month + "/" + (paymentInfo.exp_year - 2000)),
                                "cvv": paymentInfo.cvc,
                                "name": paymentInfo.name
                            }
                        }
                    ).then(async (res) => {
                        const resData = JSON.parse(res);
                        if (resData.result == "success")
                            await repository.autoOrder.updateStatus(id, AutoOrderStatus.SUCCESS, 'Success');
                        else if (resData.error.indexOf("suggestion:")) 
                            await repository.autoOrder.updateStatus(id, AutoOrderStatus.SUGGESTION, resData.error);
                        else
                            await repository.autoOrder.updateStatus(id, AutoOrderStatus.FAILED, resData.error);
                    }).catch(async (error) => {
                        await repository.autoOrder.updateStatus(id, AutoOrderStatus.FAILED, 'FAILED');
                    });
                } catch (error) {
                    await repository.autoOrder.updateStatus(id, AutoOrderStatus.FAILED, 'FAILED');
                }
                return true;
            } else {
                return false;
            }
        },
        updateAutoOrderInfo: async (_, { id, data }, { dataSources: { repository }, user }) => {
            if (user.role && user.role.indexOf("ADMIN")) {
                let flag = await repository.autoOrder.updateData(id, data);
                if (flag)
                    return true;
                return false;
            }
            return false;
        }
    }
};